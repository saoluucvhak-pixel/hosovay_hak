/* ĐỒNG BỘ DỮ LIỆU & CACHE phía máy chủ (DATASYNC.gs + revision + idempotency), chạy NGUYÊN mã *.gs trên dịch vụ Apps Script GIẢ LẬP.
 * Mỗi trường hợp ghi: dữ liệu vào, điều kiện, kỳ vọng, thực tế, PASS/FAIL. Sinh BAO_CAO_KIEM_THU_DONG_BO.md (kèm kết quả các TC giao diện
 * đọc từ <ui>/ket_qua.txt nếu có).  node kiem_thu/chay_dong_bo.js [thư_mục_ra] [thư_mục_ket_qua_ui]
 * LƯU Ý: giả lập — KHÔNG chứng minh hành vi CacheService/LockService/Sheets thật của Google. */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_dong_bo'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const UI = process.argv[3] ? path.resolve(process.argv[3]) : null;
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
const G = mt.__;
const ds = [];
let loi = 0;
function tc(id, ten, dauVao, dieuKien, kyVong, fn) {
  let thuc, ok;
  try { const r = fn(); ok = !!r.ok; thuc = r.thuc; } catch (e) { ok = false; thuc = 'NGOẠI LỆ: ' + e.message; }
  ds.push({ id, ten, dauVao, dieuKien, kyVong, thuc: String(thuc), ok }); if (!ok) loi++;
}
const rev = () => JSON.parse(JSON.stringify(ctx.layRevisionDuLieu().data));
const khoiTao = (t) => ctx.layDuLieuKhoiTao(t);
const dong = (ten, st) => ({ tenNguoiHuong: ten, soTaiKhoan: '9' + st, taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt ' + ten, soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' });
const pl = (maHD, ma, ds_, ex) => Object.assign({ maHoSo: ma, maHD, loaiTien: 'VND', duNoHienTai: 1000000, soTienNhanNoLanNay: ds_.reduce((a, d) => a + d.soTien, 0), soGiayNhanNo: 'GNN-1', ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: ds_ }, ex || {});

ctx.initializeSpreadsheet();
const TI = require('./gia_lap_apps_script'); TI.khachHangDungRevision(ctx);
const doc = (f) => fs.readFileSync(path.join(GOC, 'mau_thu', f)).toString('base64');
[['DE_NGHI_VND', 'DE_NGHI_VND.docx', 'DE_NGHI_GIAI_NGAN', 1, 999], ['UNC_VND', 'UNC_VND_1_KHOAN.docx', 'CHUNG_TU_THANH_TOAN', 1, 1], ['BANG_KE_VND', 'BANG_KE_VND.docx', 'CHUNG_TU_THANH_TOAN', 2, 999]].forEach(([ma, f, lct, tu, den]) =>
  ctx.taiMauVanBan({ maMau: ma, tenMau: 'M' + ma, nganHang: 'BIDV', loaiTien: 'VND', loaiTaiLieu: lct, dieuKienSoDong: tu + '-' + den, tenFile: f }, doc(f)));

// ---- TC2 (làm trước vì sheet đang rỗng): Sheets thực sự rỗng
mt.__sleep = 0; mt.__cacheGet = 0;
tc('TC2', 'Mở WebApp khi Sheets thực sự rỗng', 'Sheet vừa khởi tạo, không có dữ liệu', 'gọi layDuLieuKhoiTao 1 lần', 'ok=true; 4 miền rỗng; KHÔNG gọi Utilities.sleep; không đọc lại', () => {
  const r = khoiTao();
  return { ok: r.ok && r.data.congTy.length === 0 && r.data.hopDong.length === 0 && r.data.khachHang.length === 0 && r.data.hoSoGoc.length === 0 && mt.__sleep === 0 && typeof r.data.ngay === 'string',
    thuc: `ok=${r.ok}; bản ghi=${JSON.stringify(r.meta.soBanGhi)}; sleep=${mt.__sleep}; tongMs=${r.meta.tongMs}` };
});

// ---- TC3 công ty
const rv0 = rev();
let cty;
tc('TC3', 'Lưu công ty và kiểm tra dữ liệu liên quan', 'luuCongTy(CÔNG TY A)', 'sau lưu gọi layDuLieuKhoiTao', 'revision CONGTY +1; chỉ miền CONGTY đổi; danh sách công ty có bản ghi mới; miền khác giữ nguyên', () => {
  cty = ctx.luuCongTy({ tenCty: 'CÔNG TY A', maSoThue: '0400000000', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
  const rv1 = rev(), r = khoiTao();
  return { ok: rv1.CONGTY === rv0.CONGTY + 1 && rv1.HOPDONG === rv0.HOPDONG && rv1.HOSO === rv0.HOSO && r.data.congTy.length === 1 && r.data.congTy[0].TenCty === 'CÔNG TY A',
    thuc: `rev ${JSON.stringify(rv0)} → ${JSON.stringify(rv1)}; congTy=${r.data.congTy.length}` };
});
// cache hit/miss
tc('TC3b', 'Cache danh mục: MISS rồi HIT; ghi cache có TTL và khoá có phiên bản', 'đọc CONGTY 2 lần liên tiếp', 'không đổi dữ liệu giữa 2 lần', 'lần 1 MISS (hoặc HIT), lần 2 HIT; khoá dạng HOSOVAY:V2:ALL:CONGTY:{rev}; TTL > 0', () => {
  G.cache = G.cache; Object.keys(mt.__cacheTtl || {}).forEach(() => {});
  const a = khoiTao({ mien: ['CONGTY'] }), b = khoiTao({ mien: ['CONGTY'] });
  const k = Object.keys(mt.__cacheTtl || {}).filter(x => /^HOSOVAY:V2:ALL:CONGTY:\d+$/.test(x));
  return { ok: b.meta.cache.CONGTY === 'HIT' && k.length >= 1 && mt.__cacheTtl[k[k.length - 1]] > 0 && khoiTao({ mien: ['HOSO'] }).meta.cache.HOSO === 'BYPASS',
    thuc: `lần1=${a.meta.cache.CONGTY}, lần2=${b.meta.cache.CONGTY}; khoá=${k.join()}; hồ sơ (giao dịch)=BYPASS` };
});
tc('TC3c', 'Lưu hợp đồng KHÔNG làm mất cache của công ty (không xoá cả cache)', 'luuHopDong rồi đọc lại CONGTY', 'CONGTY không đổi', 'CONGTY vẫn HIT, HOPDONG MISS (khoá mới)', () => {
  khoiTao({ mien: ['CONGTY', 'HOPDONG'] });
  ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-X', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 1000000000 });
  const r = khoiTao({ mien: ['CONGTY', 'HOPDONG'] });
  return { ok: r.meta.cache.CONGTY === 'HIT' && r.meta.cache.HOPDONG === 'MISS', thuc: JSON.stringify(r.meta.cache) };
});

// ---- TC4 hợp đồng
let hd;
tc('TC4', 'Sửa hợp đồng và kiểm tra danh sách hồ sơ', 'luuHopDong(sửa số hợp đồng) + tạo hồ sơ', 'đọc lại hợp đồng và danh sách hồ sơ lọc', 'revision HOPDONG +1; hợp đồng mới đọc được; danh sách hồ sơ hiển thị số hợp đồng mới', () => {
  hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-01', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 5000000000 });
  const h1 = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('A', 1000000)]));
  const r0 = rev();
  ctx.luuHopDong({ maHD: hd.maHD, expectedRevision: Number(ctx.layHopDongTheoMa_(hd.maHD).Revision) || 0, maCty: cty.maCty, soHopDong: 'HD-01-SUA', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 6000000000 });
  const r1 = rev(), k = khoiTao(), loc = ctx.locDanhSachHoSo({});
  return { ok: r1.HOPDONG === r0.HOPDONG + 1 && k.data.hopDong.some(h => h.SoHopDong === 'HD-01-SUA') && loc.length === 1 && loc[0].soHopDong === 'HD-01-SUA',
    thuc: `HOPDONG ${r0.HOPDONG}→${r1.HOPDONG}; danh sách hồ sơ hiện soHopDong=${loc[0] && loc[0].soHopDong}` };
});
// ---- TC5 khách hàng
tc('TC5', 'Thêm khách hàng và kiểm tra dropdown', 'luuKhachHang(NCC A)', 'đọc lại bootstrap', 'revision KHACHHANG +1; khachHang có bản ghi mới', () => {
  const r0 = rev(); ctx.luuKhachHang({ tenKhachHang: 'NCC A', soTaiKhoan: '123', taiNganHang: 'BIDV' });
  const r1 = rev(), k = khoiTao();
  return { ok: r1.KHACHHANG === r0.KHACHHANG + 1 && k.data.khachHang.some(x => x.TenKhachHang === 'NCC A'), thuc: `KHACHHANG ${r0.KHACHHANG}→${r1.KHACHHANG}; số KH=${k.data.khachHang.length}` };
});
// ---- TC6 hồ sơ
let h2;
tc('TC6', 'Lưu hồ sơ và kiểm tra tổng quan', 'luuHoSoGiaiNgan(hồ sơ mới)', 'đọc bootstrap', 'revision HOSO +1; hoSoGoc có hồ sơ mới', () => {
  const r0 = rev(); h2 = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('B', 2000000)]));
  const r1 = rev(), k = khoiTao();
  return { ok: r1.HOSO > r0.HOSO && k.data.hoSoGoc.some(h => h.MaHoSo === h2.maHoSo) && k.meta.phienBanDoc.HOSO === r1.HOSO, thuc: `HOSO ${r0.HOSO}→${r1.HOSO}; phiên bản đọc=${k.meta.phienBanDoc.HOSO}` };
});
// ---- TC8-10 trạng thái
let h3;
tc('TC8-10', 'Chuyển Nháp / Đã giải ngân / Hủy đều đổi revision HOSO và hiển thị trong dữ liệu nạp', 'tạo trọn bộ → về Nháp → tạo lại → giải ngân → hủy', 'đọc revision sau mỗi bước', 'mỗi bước revision HOSO tăng; trạng thái trong hoSoGoc khớp', () => {
  h3 = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('C', 1500000)]));
  ctx.taoTronBoTheoMau(h3.maHoSo);
  const nhat = [];
  const buoc = (ten, f) => { const a = rev().HOSO; f(); const b = rev().HOSO; const t = khoiTao().data.hoSoGoc.find(h => h.MaHoSo === h3.maHoSo).TrangThai; nhat.push(`${ten}: ${a}→${b}, ${t}`); return b > a ? t : null; };
  const t1 = buoc('Về Nháp', () => ctx.chuyenHoSoVeNhap(h3.maHoSo, 'sửa'));
  ctx.taoTronBoTheoMau(h3.maHoSo, { taoLai: true });
  const t2 = buoc('Giải ngân', () => TI.xacNhanHopLe(ctx, h3.maHoSo));
  const t3 = buoc('Hủy', () => ctx.huyGiaiNgan(h3.maHoSo, { loaiHuy: 'NH_BAO_THAT_BAI', lyDo: 'NH từ chối', bangChung: 'TB NH 1' }, ctx.layHoSoTheoMa_(h3.maHoSo).Revision));
  return { ok: t1 === 'Nháp' && t2 === 'Đã giải ngân' && t3 === 'Đã hủy', thuc: nhat.join(' | ') };
});
// ---- TC7 xoá
tc('TC7', 'Xoá hồ sơ và kiểm tra chi tiết liên quan', 'xoaHoSo(hồ sơ Nháp, có xác nhận)', 'đọc bootstrap, chi tiết, báo cáo', 'hồ sơ biến mất khỏi danh sách/báo cáo nhưng dòng cha + chi tiết còn (xoá mềm)', () => {
  const r0 = rev(); ctx.xoaHoSo(h2.maHoSo, { xacNhanCoTaiLieu: true });
  const k = khoiTao(), raw = ctx.sheetToObjects_('HoSoGiaiNgan').find(h => h.MaHoSo === h2.maHoSo), ct = ctx.sheetToObjects_('ChiTietThuHuong').filter(c => c.MaHoSo === h2.maHoSo);
  const bc = ctx.layBaoCaoTienVay('', '', '', '', '', true);
  return { ok: rev().HOSO > r0.HOSO && !k.data.hoSoGoc.some(h => h.MaHoSo === h2.maHoSo) && raw && raw.DaXoa === true && ct.length === 1 && !bc.some(r => r.maHoSo === h2.maHoSo),
    thuc: `ẩn khỏi danh sách=${!k.data.hoSoGoc.some(h => h.MaHoSo === h2.maHoSo)}; dòng cha còn=${!!raw}; chi tiết còn=${ct.length}` };
});
// ---- TC11 hai người cùng sửa
tc('TC11', 'Hai người cùng sửa một hồ sơ', 'A và B cùng đọc hồ sơ ở revision r, lần lượt lưu', 'lưu A trước rồi B (cùng expectedRevision)', 'A thành công; B nhận XUNG_DOT_PHIEN_BAN; dữ liệu của A không bị ghi đè', () => {
  const h = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('D', 1000000)])), r = ctx.layHoSoTheoMa_(h.maHoSo).Revision;
  const a = ctx.luuHoSoGiaiNgan(pl(hd.maHD, h.maHoSo, [dong('D', 2000000)], { expectedRevision: r }));
  let b = null; try { ctx.luuHoSoGiaiNgan(pl(hd.maHD, h.maHoSo, [dong('D', 3000000)], { expectedRevision: r })); } catch (e) { b = e.message; }
  return { ok: !!a.maHoSo && /^XUNG_DOT_PHIEN_BAN/.test(b || '') && ctx.layChiTietTheoHoSo_(h.maHoSo)[0].SoTien === 2000000, thuc: `B: ${(b || '').slice(0, 60)}` };
});
// ---- TC15 hết hạn, TC16 eviction
tc('TC15', 'Cache hết hạn', 'xoá mọi khoá cache (mô phỏng hết TTL)', 'đọc CONGTY', 'MISS, vẫn trả đủ dữ liệu đúng, ghi lại cache với phiên bản hiện tại', () => {
  khoiTao({ mien: ['CONGTY'] }); Object.keys(G.cache).forEach(k => delete G.cache[k]);
  const r = khoiTao({ mien: ['CONGTY'] }), r2 = khoiTao({ mien: ['CONGTY'] });
  return { ok: r.meta.cache.CONGTY === 'MISS' && r.data.congTy.length === 1 && r2.meta.cache.CONGTY === 'HIT', thuc: `sau hết hạn=${r.meta.cache.CONGTY}, lần sau=${r2.meta.cache.CONGTY}` };
});
tc('TC16', 'Cache bị eviction / hỏng / quá lớn', 'giá trị cache hỏng (JSON sai); dữ liệu > giới hạn cache', 'đọc HOPDONG', 'JSON hỏng → MISS & trả dữ liệu đúng; quá lớn → BYPASS, không lỗi', () => {
  const k = Object.keys(G.cache).find(x => /HOPDONG/.test(x)) || (khoiTao({ mien: ['HOPDONG'] }), Object.keys(G.cache).find(x => /HOPDONG/.test(x)));
  G.cache[k] = '{khong phai json';
  const r = khoiTao({ mien: ['HOPDONG'] });
  const dung = r.meta.cache.HOPDONG === 'MISS' && r.data.hopDong.length >= 1;
  const gc = ctx.CACHE_TOI_DA_KY_TU_; ctx.eval = null;
  const lon = ctx.cacheGhi_('HOPDONG', 999, new Array(100000).fill('x'.repeat(5)));
  return { ok: dung && lon === false, thuc: `cache hỏng → ${r.meta.cache.HOPDONG}, bản ghi=${r.data.hopDong.length}; ghi dữ liệu quá lớn → ${lon === false ? 'BYPASS' : 'đã ghi?!'}` };
});
// ---- TC17 Sheets lỗi
tc('TC17', 'Google Sheets trả lỗi / sai cấu trúc', 'xoá cột MaHD khỏi tiêu đề DM_HopDongVay', 'gọi layDuLieuKhoiTao', 'ok=false, mã LOI_CAU_TRUC, thông báo nêu cột thiếu; KHÔNG trả mảng rỗng thay thế; không sleep/retry', () => {
  const sh = G.boDuLieu.getSheetByName('DM_HopDongVay'); const idx = sh.g[0].indexOf('MaHD'); const goc = sh.g[0][idx]; sh.g[0][idx] = 'XOA';
  Object.keys(G.cache).forEach(k => delete G.cache[k]); mt.__sleep = 0;
  const r = khoiTao({ boQuaCache: true }), r2 = ctx.layDanhSachHopDongDayDu.bind(null);
  let ngoaiLe = null; try { r2(); } catch (e) { ngoaiLe = e.message; }
  sh.g[0][idx] = goc;
  return { ok: r.ok === false && r.error.ma === 'LOI_CAU_TRUC' && /MaHD/.test(r.error.thongBao) && r.data === null && mt.__sleep === 0 && /thiếu cột MaHD/.test(ngoaiLe || ''), thuc: `ok=${r.ok}; ma=${r.error && r.error.ma}; "${(r.error && r.error.thongBao || '').slice(0, 70)}"; sleep=${mt.__sleep}` };
});
tc('TC17b', 'Dòng có dữ liệu nhưng thiếu khoá không biến mất âm thầm', 'thêm dòng khách hàng thiếu MaKH', 'docBangChanDoan_', 'dòng được ghi nhận trong boQua với lý do THIEU_KHOA', () => {
  const sh = G.boDuLieu.getSheetByName('DM_KhachHang'); const n = sh.g.length; const row = sh.g[0].map((h) => h === 'TenKhachHang' ? 'KHÔNG MÃ' : ''); sh.g[n] = row;
  const d = ctx.docBangChanDoan_('DM_KhachHang'); sh.g.splice(n, 1);
  return { ok: d.boQua.length === 1 && d.boQua[0].lyDo === 'THIEU_KHOA', thuc: JSON.stringify(d.boQua) };
});
// ---- TC18 mất kết nối sau khi gửi lệnh lưu (idempotency)
tc('TC18', 'Mất kết nối sau khi gửi lệnh lưu', 'client gửi lệnh tạo hồ sơ (khoaYeuCau K1), máy chủ ghi xong nhưng phản hồi mất; người dùng bấm lưu lại cùng K1', 'gửi 2 lần cùng khoaYeuCau', 'chỉ MỘT hồ sơ được tạo; lần 2 trả đúng hồ sơ đã tạo (daCoTuTruoc)', () => {
  const truoc = ctx.sheetToObjects_('HoSoGiaiNgan').length;
  const a = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('E', 1000)], { khoaYeuCau: 'K1' }));
  const b = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('E', 1000)], { khoaYeuCau: 'K1' }));
  const sau = ctx.sheetToObjects_('HoSoGiaiNgan').length;
  return { ok: a.maHoSo === b.maHoSo && b.daCoTuTruoc === true && sau === truoc + 1, thuc: `lần1=${a.maHoSo}, lần2=${b.maHoSo} (daCoTuTruoc=${b.daCoTuTruoc}); số hồ sơ +${sau - truoc}` };
});
// ---- TC20 revision đổi trong lúc tạo chứng từ
tc('TC20', 'Thay đổi hồ sơ trong lúc đang tạo chứng từ', 'giữa hai tài liệu của bộ chứng từ, một phiên khác lưu sửa cùng hồ sơ', 'taoTronBoTheoMau', 'báo XUNG_DOT_PHIEN_BAN; phiên ghi "Phát hành lỗi"; hồ sơ KHÔNG chuyển sang "Đã tạo hồ sơ"', () => {
  const h = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('F', 1000000), dong('G', 2000000)]));
  const goc = ctx.phatHanhChungTu_; let lan = 0;
  ctx.phatHanhChungTu_ = function () { const kq = goc.apply(null, arguments); if (++lan === 1) ctx.luuHoSoGiaiNgan(pl(hd.maHD, h.maHoSo, [dong('F', 1000000), dong('G', 2000000), dong('H', 3000000)])); return kq; };
  let loiTxt = null; try { ctx.taoTronBoTheoMau(h.maHoSo); } catch (e) { loiTxt = e.message; }
  ctx.phatHanhChungTu_ = goc;
  const tt = ctx.layHoSoTheoMa_(h.maHoSo).TrangThai;
  return { ok: /XUNG_DOT_PHIEN_BAN/.test(loiTxt || '') && tt === 'Nháp', thuc: `lỗi="${(loiTxt || '').slice(0, 80)}"; trạng thái=${tt}` };
});
// ---- Meta chuẩn, phạm vi cache, kiểm tra kết quả lưu, ngày hỏng, báo cáo đã hủy
tc('TC-META', 'API chuẩn hoá: ok/data/meta{requestId,revision,fetchedAt,source,isComplete}/error{retryable}', 'layDuLieuKhoiTao + một lỗi cấu trúc', 'đọc phong bì', 'đủ trường; lỗi có mã + retryable; không trả [] thay lỗi', () => {
  const r = khoiTao({ boQuaCache: true });
  const sh = G.boDuLieu.getSheetByName('DM_CongTy'); const i = sh.g[0].indexOf('MaCty'); const goc = sh.g[0][i]; sh.g[0][i] = 'X';
  const e = khoiTao({ boQuaCache: true }); sh.g[0][i] = goc;
  return { ok: r.ok && !!r.meta.requestId && typeof r.meta.revision === 'number' && !!r.meta.fetchedAt && r.meta.source === 'sheets' && r.meta.isComplete === true && r.error === null && e.ok === false && e.data === null && e.error.code === 'LOI_CAU_TRUC' && e.error.retryable === false && !!e.meta.requestId, thuc: JSON.stringify({ meta: Object.keys(r.meta), err: e.error && [e.error.code, e.error.retryable] }) };
});
// ---- TC21 khoá trùng trong Sheet không được làm sập giao diện
tc('TC21', 'Mã hợp đồng bị TRÙNG trên Sheet (vd MaHD=HD012 hai dòng)', 'sao chép nguyên một dòng hợp đồng xuống cuối Sheet', 'layDuLieuKhoiTao', 'vẫn ok; mỗi MaHD xuất hiện 1 lần (dòng đầu); meta báo TRÙNG KHOÁ kèm số dòng; dữ liệu Sheet KHÔNG bị sửa/xoá; sửa xong thì hết cảnh báo', () => {
  const sh = G.boDuLieu.getSheetByName('DM_HopDongVay'); const dem = sh.g.length;
  sh.g.push(sh.g[1].slice());
  const r = khoiTao({ mien: ['HOPDONG'], boQuaCache: true });
  const ids = r.data.hopDong.map((h) => h.MaHD), cb = (r.meta.canhBao || []).join(' | ');
  const mau = sh.g[1][sh.g[0].indexOf('MaHD')];
  const ok1 = r.ok && ids.length === new Set(ids).size && ids.filter((x) => x === mau).length === 1 && /TRÙNG KHOÁ DM_HopDongVay: MaHD=/.test(cb) && /dòng 2 và dòng/.test(cb) && r.meta.isComplete === false && sh.g.length === dem + 1;
  sh.g.pop(); const r2 = khoiTao({ mien: ['HOPDONG'], boQuaCache: true });
  return { ok: ok1 && r2.ok && !(r2.meta.canhBao || []).length && r2.meta.isComplete !== false, thuc: `ok=${r.ok}; ${ids.length} hợp đồng; cảnh báo: ${cb.slice(0, 140)}; sau khi sửa: ${(r2.meta.canhBao || []).length} cảnh báo` };
});

// ---- TC22 chặn tạo trùng hợp đồng khi bấm lưu nhiều lần
tc('TC22', 'Bấm lưu hợp đồng MỚI nhiều lần (cùng công ty + cùng số hợp đồng)', 'luuHopDong (không có maHD) 2 lần với cùng số; rồi sửa hợp đồng có maHD; rồi số khác', 'đếm dòng DM_HopDongVay', 'lần 2 bị từ chối nêu mã đã có, không thêm dòng; sửa bằng maHD vẫn được; số khác vẫn tạo được', () => {
  const cty = ctx.layDanhSachCongTy()[0] || ctx.luuCongTy({ tenCty: 'CTY T22', maSoThue: '0400000022', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
  const maCty = cty.maCty || cty.MaCty, p = { maCty, soHopDong: 'T22/2026', ngayHopDong: '2026-10-01', tenNganHang: 'BIDV' };
  const dem = () => ctx.sheetToObjects_('DM_HopDongVay').length, d0 = dem();
  const a = ctx.luuHopDong(Object.assign({}, p)), kq2 = (() => { try { ctx.luuHopDong(Object.assign({}, p, { soHopDong: ' t22/2026 ' })); return null; } catch (e) { return e.message; } })();
  const sua = ctx.luuHopDong(Object.assign({}, p, { maHD: a.maHD, expectedRevision: Number(ctx.layHopDongTheoMa_(a.maHD).Revision) || 0, chiNhanh: 'QN' })), khac = ctx.luuHopDong(Object.assign({}, p, { soHopDong: 'T22/2026-B' }));
  return { ok: !!kq2 && kq2.indexOf(a.maHD) > 0 && sua.maHD === a.maHD && khac.maHD !== a.maHD && dem() === d0 + 2, thuc: `lần 2: ${String(kq2).slice(0, 90)}; số dòng ${d0}→${dem()}` };
});

tc('TC19', 'Cache phân vùng theo phạm vi/công ty: không dùng chung giữa phạm vi', 'danh tính phạm vi công ty A rồi B', 'đọc CONGTY', 'khoá cache khác nhau; B không thấy bản cache của A', () => {
  const goc = ctx.layDanhTinh_;
  ctx.layDanhTinh_ = () => ({ email: 'a', quyen: [], congTy: ['A'] }); khoiTao({ mien: ['CONGTY'] }); const kA = Object.keys(G.cache).filter(k => /CT-A:CONGTY/.test(k));
  ctx.layDanhTinh_ = () => ({ email: 'b', quyen: [], congTy: ['B'] }); const rB = khoiTao({ mien: ['CONGTY'] }); const kB = Object.keys(G.cache).filter(k => /CT-B:CONGTY/.test(k));
  ctx.layDanhTinh_ = goc;
  return { ok: kA.length === 1 && kB.length === 1 && rB.meta.cache.CONGTY === 'MISS', thuc: `A=${kA}; B=${kB}; lần đầu của B=${rB.meta.cache.CONGTY}` };
});
tc('TC14b', 'kiemTraKetQuaLuu: biết lệnh lưu đã ghi chưa sau khi mất kết nối', 'hồ sơ mới với khoaYeuCau; hồ sơ đã có với expectedRevision', 'hỏi trước / sau khi ghi', 'trước: daGhi=false; sau: daGhi=true + mã hồ sơ; hồ sơ đã có: revision > expected → daGhi', () => {
  const truoc = ctx.kiemTraKetQuaLuu('', 'KHOA-TEST', undefined);
  const h = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [dong('Q', 1000)], { khoaYeuCau: 'KHOA-TEST' }));
  const sau = ctx.kiemTraKetQuaLuu('', 'KHOA-TEST', undefined);
  const r0 = ctx.layHoSoTheoMa_(h.maHoSo).Revision; ctx.luuHoSoGiaiNgan(pl(hd.maHD, h.maHoSo, [dong('Q', 2000)], { expectedRevision: r0 }));
  const capNhat = ctx.kiemTraKetQuaLuu(h.maHoSo, '', r0), chua = ctx.kiemTraKetQuaLuu(h.maHoSo, '', r0 + 1);
  return { ok: truoc.daGhi === false && sau.daGhi === true && sau.maHoSo === h.maHoSo && capNhat.daGhi === true && chua.daGhi === false, thuc: JSON.stringify([truoc, sau.daGhi, capNhat.daGhi, chua.daGhi]) };
});
tc('TC17c', 'Ngày/số hỏng trong Sheet: không giả vờ thành công — isComplete=false + chỉ rõ vị trí; không cache', 'ô NgayHopDong là Date không hợp lệ, một ô số = NaN', 'layDuLieuKhoiTao', 'ok=true nhưng meta.isComplete=false, canhBao nêu miền/dòng/cột; lần sau vẫn cảnh báo (BYPASS)', () => {
  const sh = G.boDuLieu.getSheetByName('DM_HopDongVay'); const cNgay = sh.g[0].indexOf('NgayHopDong'), cHM = sh.g[0].indexOf('HanMucVay'); const cu = [sh.g[1][cNgay], sh.g[1][cHM]];
  sh.g[1][cNgay] = new Date('khong-hop-le'); sh.g[1][cHM] = NaN;
  const a = khoiTao({ mien: ['HOPDONG'] }), b = khoiTao({ mien: ['HOPDONG'] });
  sh.g[1][cNgay] = cu[0]; sh.g[1][cHM] = cu[1];
  return { ok: a.ok && a.meta.isComplete === false && a.meta.canhBao.some(x => /NgayHopDong/.test(x) && /dòng 2/.test(x)) && a.meta.canhBao.some(x => /HanMucVay/.test(x)) && b.meta.isComplete === false && b.meta.cache.HOPDONG === 'BYPASS', thuc: JSON.stringify(a.meta.canhBao) };
});
tc('TC13', 'Hủy giải ngân: báo cáo mặc định không cộng giao dịch đã hủy; đối soát tách riêng', 'hồ sơ h3 đã ở Đã hủy (từ TC8-10)', 'layBaoCaoTienVay mặc định / baoGomDaHuy / đối soát', 'mặc định không có h3; baoGomDaHuy có h3; đối soát có nhóm "Đã hủy" riêng', () => {
  const mac = ctx.layBaoCaoTienVay('', '', '', '', ''), hết = ctx.layBaoCaoTienVay('', '', '', '', '', true), ds = ctx.layBaoCaoDoiSoat().data.tongHop;
  return { ok: !mac.some(r => r.maHoSo === h3.maHoSo) && hết.some(r => r.maHoSo === h3.maHoSo) && ds.some(g => g.trangThai === 'Đã hủy'), thuc: `mặc định=${mac.length} dòng; đầy đủ=${hết.length}; nhóm đối soát: ${ds.map(g => g.trangThai + '/' + g.loaiTien).join(', ')}` };
});
tc('TC16', 'Tải lại trang: dữ liệu nạp khớp Google Sheets (so từng ID)', 'bootstrap bỏ qua cache vs đọc thẳng Sheet', 'so sánh tập mã', 'tập mã công ty/hợp đồng/khách hàng/hồ sơ(không xoá mềm) trùng khớp 100%', () => {
  const k = khoiTao({ boQuaCache: true }).data, id = (a, f) => a.map(x => x[f]).sort().join();
  const raw = (t, f, loc) => id(ctx.sheetToObjects_(t).filter(loc || (() => true)), f);
  const ok = id(k.congTy, 'MaCty') === raw('DM_CongTy', 'MaCty') && id(k.hopDong, 'MaHD') === raw('DM_HopDongVay', 'MaHD') && id(k.khachHang, 'MaKH') === raw('DM_KhachHang', 'MaKH') && id(k.hoSoGoc, 'MaHoSo') === raw('HoSoGiaiNgan', 'MaHoSo', h => !(h.DaXoa === true));
  return { ok, thuc: `${k.congTy.length} công ty, ${k.hopDong.length} hợp đồng, ${k.khachHang.length} KH, ${k.hoSoGoc.length} hồ sơ` };
});
// ---- Đối soát
tc('TC-DS1', 'Đối soát: VND và USD KHÔNG cộng lẫn; tách theo trạng thái', 'có hồ sơ VND và USD ở nhiều trạng thái', 'layBaoCaoDoiSoat', 'mỗi nhóm có loaiTien riêng; tổng VND không chứa số USD; USD có quy đổi riêng', () => {
  const u = ctx.luuHoSoGiaiNgan(pl(hd.maHD, '', [Object.assign(dong('U', 25000), { soTien: 25000 })], { loaiTien: 'USD', tyGiaBan: 25810, soTienNhanNoLanNay: 25000 }));
  const r = ctx.layBaoCaoDoiSoat();
  const usd = r.data.tongHop.filter(g => g.loaiTien === 'USD'), vnd = r.data.tongHop.filter(g => g.loaiTien === 'VND');
  const tongVndTay = ctx.docDanhSachHoSo_(false).filter(h => h.LoaiTien === 'VND').reduce((a, h) => a + (Number(h.SoTienNhanNoLanNay) || 0), 0);
  const tongVndBc = vnd.reduce((a, g) => a + g.tong, 0);
  return { ok: r.ok && usd.length >= 1 && usd[0].tong === 25000 && usd[0].tongQuyDoiVND === 645250000 && tongVndBc === tongVndTay && r.data.tongHop.every(g => g.loaiTien === 'VND' || g.loaiTien === 'USD'), thuc: `USD=${JSON.stringify(usd[0])}; tổng VND báo cáo=${tongVndBc} (tính tay ${tongVndTay})` };
});
tc('TC-DS2', 'Đối soát phát hiện: tổng lệch chi tiết, chi tiết mồ côi, hợp đồng thiếu, ghi dở dang', 'cố tình làm hỏng dữ liệu trên bản giả lập', 'layBaoCaoDoiSoat', 'mỗi loại lỗi được liệt kê; dữ liệu sạch thì tongSoLoi=0 trước khi hỏng', () => {
  const sach = ctx.layBaoCaoDoiSoat().data;
  const hs = ctx.docDanhSachHoSo_(false)[0], shHs = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), shCt = G.boDuLieu.getSheetByName('ChiTietThuHuong');
  const cTong = shHs.g[0].indexOf('SoTienNhanNoLanNay'), cHD = shHs.g[0].indexOf('MaHD');
  const tongCu = shHs.g[hs._row - 1][cTong], hdCu = shHs.g[hs._row - 1][cHD];
  shHs.g[hs._row - 1][cTong] = tongCu + 1;
  shHs.g[hs._row - 1][cHD] = 'HD-KHONG-CO';
  const n = shCt.g.length; shCt.g[n] = shCt.g[0].map((h) => h === 'MaHoSo' ? 'HS-MO-COI' : h === 'STT' ? 1 : h === 'SoTien' ? 5 : '');
  ctx.ghiDoDangBatDau_(hs.MaHoSo, false, [], []);
  const r = ctx.layBaoCaoDoiSoat().data, m = {}; r.kiemTra.forEach(k => m[k.ma] = k.soLoi);
  shHs.g[hs._row - 1][cTong] = tongCu; shHs.g[hs._row - 1][cHD] = hdCu; shCt.g.splice(n, 1);
  return { ok: sach.tongSoLoi === 0 && m.TONG_KHOP >= 1 && m.CHI_TIET_MO_COI === 1 && m.HOP_DONG_THIEU >= 1 && m.GHI_DO_DANG === 1, thuc: `sạch=${sach.tongSoLoi}; sau khi hỏng: ${JSON.stringify(m)}` };
});
// ---- phần bổ sung: cấm retry/sleep trong mã nguồn
tc('TC-RETRY', 'Không còn retry-vì-rỗng / sleep / setTimeout chữa dữ liệu trong mã nguồn', 'quét *.gs và JavaScript.html', 'tìm docCoThuLai_, tuChuaHopDongNeuRong_, Utilities.sleep, setTimeout tải lại', 'không còn (ngoại lệ: 2 setTimeout giao diện không liên quan dữ liệu)', () => {
  const gs = fs.readdirSync(GOC).filter(f => f.endsWith('.gs')).map(f => [f, fs.readFileSync(path.join(GOC, f), 'utf8')]);
  const js = fs.readFileSync(path.join(GOC, 'JavaScript.html'), 'utf8');
  const th = [];
  gs.forEach(([f, t]) => { if (/Utilities\.sleep\s*\(/.test(t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) th.push(f + ':sleep'); if (/\bdocCoThuLai_\s*\(/.test(t.replace(/\/\*[\s\S]*?\*\//g, ''))) th.push(f + ':docCoThuLai_'); });
  if (/tuChuaHopDongNeuRong_\s*\(/.test(js.replace(/\/\*[\s\S]*?\*\//g, ''))) th.push('JS:tuChua');
  const st = (js.match(/setTimeout\(/g) || []).length - (js.match(/KHÔNG có setTimeout/g) || []).length;
  return { ok: th.length === 0 && st <= 2, thuc: `vi phạm=${th.join() || 'không'}; setTimeout còn lại=${st}` };
});

// ---------- Báo cáo ----------
const uiKq = UI && fs.existsSync(path.join(UI, 'ket_qua.txt')) ? fs.readFileSync(path.join(UI, 'ket_qua.txt'), 'utf8').split('\n').filter(l => /\[TC\d+/.test(l)) : [];
let md = '# BÁO CÁO KIỂM THỬ CACHE & ĐỒNG BỘ\n\n> Chạy trên **dịch vụ Apps Script giả lập** (Node vm) và trình duyệt Chromium với `google.script.run` giả lập. **Không** phải Google Sheets/CacheService/LockService thật.\n\n## A. Phía máy chủ (`chay_dong_bo.js`)\n\n';
ds.forEach(t => { md += `### ${t.id} — ${t.ten} — **${t.ok ? 'PASS' : 'FAIL'}**\n- Dữ liệu vào: ${t.dauVao}\n- Điều kiện: ${t.dieuKien}\n- Kỳ vọng: ${t.kyVong}\n- Thực tế: ${t.thuc}\n\n`; });
md += '## B. Phía giao diện (`chay_giao_dien.js`, đọc từ kết quả thực thi)\n\n' + (uiKq.length ? uiKq.map(l => '- ' + l.trim()).join('\n') : '_(chưa có kết quả UI kèm theo)_') + '\n\n';
md += '## C. Ánh xạ 20 trường hợp\n\n| # | Nội dung | Nơi kiểm |\n|---|---|---|\n' + [
  ['1', 'Mở WebApp khi có đủ dữ liệu', 'TC3–TC6 (bootstrap có dữ liệu) + chay_hoi_quy'], ['2', 'Sheets rỗng', 'TC2 (máy chủ), TC2-UI (giao diện)'], ['3', 'Lưu công ty', 'TC3/TC3b/TC3c'], ['4', 'Sửa hợp đồng', 'TC4'], ['5', 'Thêm khách hàng', 'TC5'],
  ['6', 'Lưu hồ sơ → tổng quan', 'TC6'], ['7', 'Xoá hồ sơ', 'TC7'], ['8–10', 'Về Nháp / Đã giải ngân / Hủy', 'TC8-10'], ['11', 'Hai người cùng sửa', 'TC11 (+ chay_trang_thai)'], ['12', 'Response sai thứ tự', 'TC12 (giao diện)'],
  ['13', 'Đổi bộ lọc liên tục', 'TC13 (giao diện)'], ['14', 'Chuyển tab nhanh', 'TC14 (giao diện)'], ['15', 'Cache hết hạn', 'TC15'], ['16', 'Cache eviction', 'TC16'], ['17', 'Sheets trả lỗi', 'TC17/TC17b/TC17-UI'],
  ['18', 'Mất kết nối sau khi gửi lệnh lưu', 'TC18 (idempotency khoaYeuCau)'], ['19', 'Thay đổi trên máy này, kiểm tra từ máy khác', 'TC19 (giao diện: phát hiện revision) + TC3–6 (revision tăng)'], ['20', 'Revision đổi trong lúc tạo chứng từ', 'TC20'], ['21', 'Mã/khoá trùng trên Sheet (vd MaHD=HD012)', 'TC21'], ['22', 'Bấm lưu hợp đồng mới nhiều lần tạo dòng trùng', 'TC22']
].map(r => `| ${r[0]} | ${r[1]} | ${r[2]} |`).join('\n') + '\n\n**Giới hạn**: TC19 mô phỏng "máy thứ hai" bằng việc máy chủ trả revision mới hơn; chưa thử 2 trình duyệt thật. TC15/16 mô phỏng hết hạn/eviction bằng cách xoá khoá, không đo TTL thật của Google.\n';
fs.writeFileSync(path.join(RA, 'BAO_CAO_KIEM_THU_DONG_BO.md'), md);
ds.forEach(t => console.log(`  [${t.ok ? 'ĐẠT' : 'LỖI'}] ${t.id} ${t.ten}${t.ok ? '' : '  → ' + t.thuc}`));
console.log(`\nTỔNG: ${ds.length} trường hợp, ${ds.length - loi} đạt, ${loi} lỗi. Báo cáo: ${path.join(RA, 'BAO_CAO_KIEM_THU_DONG_BO.md')}`);
process.exit(loi ? 1 : 0);
