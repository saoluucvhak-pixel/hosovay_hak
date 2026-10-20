/* KIỂM THỬ QUY TRÌNH NGHIỆP VỤ END-TO-END (30 tình huống TC01–TC30) — chạy NGUYÊN mã *.gs trên dịch vụ Apps Script GIẢ LẬP.
 * KHÔNG dùng khachHangDungRevision: các test ở đây tự truyền (hoặc cố ý bỏ) expectedRevision để kiểm quy tắc revision bắt buộc.
 * Sinh BAO_CAO_KIEM_THU_QUY_TRINH.md (mã test, hàm/module, dữ liệu vào, kỳ vọng, thực tế, PASS/FAIL, bằng chứng, môi trường).
 * node kiem_thu/chay_quy_trinh.js [thư_mục_ra] [thư_mục_ket_qua_ui]        Đặt BO_QUA_TC30=1 để không chạy lại bộ hồi quy ở TC30.
 * LƯU Ý: đây là test GIẢ LẬP — không phải Google Apps Script/Sheets/Drive thật. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_quy_trinh'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const UI = process.argv[3] ? path.resolve(process.argv[3]) : null;
const TI = require('./gia_lap_apps_script');
const { ctx, mt } = TI(GOC, path.join(RA, '_tam'));
const G = mt.__; mt.__boQuaPdf = true;
const MOI_TRUONG = 'GIẢ LẬP (Node vm + Apps Script mock; PDF giả). Không phải Google Apps Script/Sheets/Drive/cổng HAK thật.';
const kq = []; let loi = 0;
function tc(id, ham, dauVao, kyVong, fn) {
  let thuc, ok;
  try { const r = fn(); ok = !!r.ok; thuc = r.thuc; } catch (e) { ok = false; thuc = 'NGOẠI LỆ: ' + String(e.stack || e).split('\n').slice(0, 3).join(' | '); }
  kq.push({ id, ham, dauVao, kyVong, thuc: String(thuc), ok }); if (!ok) loi++;
}
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
const ob = (t) => ctx.sheetToObjects_(t);
const hs = (ma) => ctx.layHoSoTheoMa_(ma);
const rev = (ma) => { const h = hs(ma); return h ? (Number(h.Revision) || 0) : undefined; };
const nk = (ma, hd) => ob('NhatKyHeThong').some((x) => x.MaHoSo === ma && x.HanhDong === hd);
const ls = (ma) => ob('LichSuPhatHanhTaiLieu').filter((x) => x.MaHoSo === ma);
const dong = (ten, st) => ({ tenNguoiHuong: ten, soTaiKhoan: '9' + st, taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt ' + ten, soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' });
let hd;
const pl = (ma, rows, ex) => Object.assign({ maHoSo: ma, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 1000000, soTienNhanNoLanNay: rows.reduce((a, d) => a + d.soTien, 0), soGiayNhanNo: 'GNN-1', ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: rows }, ex || {});
const luuMoi = (rows, ex) => ctx.luuHoSoGiaiNgan(pl('', rows, ex));
const luuSua = (ma, rows, ex) => ctx.luuHoSoGiaiNgan(pl(ma, rows, Object.assign({ expectedRevision: rev(ma) }, ex || {})));
const tron = (ma, opt) => ctx.taoTronBoTheoMau(ma, Object.assign({ expectedRevision: rev(ma) }, opt || {}));
const gn = (ma, ex) => TI.xacNhanHopLe(ctx, ma, ex);
const b64 = (f) => fs.readFileSync(path.join(GOC, 'mau_thu', f)).toString('base64');

// ================= Khởi tạo dữ liệu & mẫu =================
G.props['ADMIN_EMAILS'] = 'ketoan@example.com'; mt.__email = 'ketoan@example.com';
ctx.initializeSpreadsheet(); require('./gia_lap_apps_script').dangKyNguoiThuong(ctx);
[['DE_NGHI_VND', 'DE_NGHI_VND.docx', 'VND', 'DE_NGHI_GIAI_NGAN', 1, 999], ['UNC_VND', 'UNC_VND_1_KHOAN.docx', 'VND', 'CHUNG_TU_THANH_TOAN', 1, 1], ['BANG_KE_VND', 'BANG_KE_VND.docx', 'VND', 'CHUNG_TU_THANH_TOAN', 2, 999],
  ['DE_NGHI_USD', 'DE_NGHI_USD.docx', 'USD', 'DE_NGHI_GIAI_NGAN', 1, 999], ['UNC_USD', 'UNC_USD_1_KHOAN.docx', 'USD', 'CHUNG_TU_THANH_TOAN', 1, 1], ['BANG_KE_USD', 'BANG_KE_USD.docx', 'USD', 'CHUNG_TU_THANH_TOAN', 2, 999], ['HDMB_USD', 'HDMB_USD.docx', 'USD', 'HDMB_NGOAI_TE', 1, 999]]
  .forEach(([ma, f, lt, lct, tu, den]) => ctx.taiMauVanBan({ maMau: ma, tenMau: 'Mẫu ' + ma, nganHang: 'BIDV', loaiTien: lt, loaiTaiLieu: lct, dieuKienSoDong: tu + '-' + den, tenFile: f }, b64(f)));
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY A', maSoThue: '0400000000', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-01', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 5000000000 });
const SYS3 = ['DE_NGHI_GIAI_NGAN', 'CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE'];
ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'TO_TRINH', ten: 'Tờ trình', loaiTien: 'TAT_CA', batBuoc: true, thuTu: 25 }]);
ctx.luuLoaiHoSoGiaiNgan([{ ten: 'Bộ cơ bản', tl: SYS3 }, { ten: 'Có tờ trình', tl: SYS3.concat(['TO_TRINH']) }]);
const homNay = new Date().toISOString().slice(0, 10);

// ---------------- TC01 ----------------
let hsA;
tc('TC01', 'luuHoSoGiaiNgan (HoSoDomain/DataService)', 'Hồ sơ mới 2 dòng (1.000.000 + 2.000.000), payload cố tình gửi trangThai="Đã giải ngân" và khoaYeuCau', 'Lưu thành Nháp (bỏ qua trangThai client), Revision=1, 2 dòng con, tổng khớp, journal HOAN_TAT', () => {
  const r = luuMoi([dong('A', 1000000), dong('B', 2000000)], { trangThai: 'Đã giải ngân', khoaYeuCau: 'K-TC01' }); hsA = r.maHoSo;
  const h = hs(hsA), ct = ctx.layChiTietTheoHoSo_(hsA), gd = ob('NhatKyGhiDoDang').filter((x) => x.MaHoSo === hsA);
  return { ok: h.TrangThai === 'Nháp' && h.Revision === 1 && ct.length === 2 && ct.reduce((a, c) => a + c.SoTien, 0) === 3000000 && gd.length === 1 && gd[0].TrangThai === 'HOAN_TAT' && h.KhoaYeuCau === 'K-TC01', thuc: `${hsA}: ${h.TrangThai}, rev ${h.Revision}, ${ct.length} dòng, journal ${gd.map((x) => x.TrangThai)}` };
});
// ---------------- TC02 ----------------
tc('TC02', 'xemTruocChungTu (DocumentService)', 'Hồ sơ Nháp đã lưu; xem trước UNC/Bảng kê; có file xem trước cũ >24h và 1 file khác trong thư mục XemTruoc', 'Không đổi hồ sơ/chi tiết/revision/trạng thái/lịch sử phát hành; chỉ nhật ký XEM_TRUOC; file xem trước cũ vào thùng rác, file khác KHÔNG bị đụng', () => {
  const chup = () => JSON.stringify([ob('HoSoGiaiNgan').filter((x) => x.MaHoSo === hsA), ob('ChiTietThuHuong').filter((x) => x.MaHoSo === hsA), ob('LichSuPhatHanhTaiLieu').length, (thu(() => ob('PhienPhatHanhBo').length).v || 0), ctx.layRevisionDuLieu().data]);
  const thuMuc = ctx.thuMucXemTruoc_(), cu = thuMuc.createFile(new G.Blob(Buffer.from('x'), 'a', 'XemTruoc_cu.docx')), khac = thuMuc.createFile(new G.Blob(Buffer.from('x'), 'a', 'HoSo_quan_trong.docx'));
  cu.ngayTao = new Date(Date.now() - 3 * 24 * 3600 * 1000); khac.ngayTao = cu.ngayTao;
  const truoc = chup(), r = ctx.xemTruocChungTu(hsA, 'CHUNG_TU_THANH_TOAN'), sau = chup();
  const khongHs = thu(() => ctx.xemTruocChungTu('HS-KHONG-CO', 'CHUNG_TU_THANH_TOAN'));
  return { ok: truoc === sau && r.laBanXemTruoc === true && r.revisionNguon === 1 && nk(hsA, 'XEM_TRUOC') && cu.daXoa === true && khac.daXoa === false && !khongHs.ok && hs(hsA).TrangThai === 'Nháp',
    thuc: `dữ liệu trước=sau: ${truoc === sau}; revisionNguon=${r.revisionNguon}; dọn bản cũ=${cu.daXoa}, file khác giữ=${!khac.daXoa}; lịch sử phát hành không tăng` };
});
// ---------------- TC03 ----------------
tc('TC03', 'phatHanhChungTu_ / taoDeNghiGiaiNganBIDV (revision bắt buộc, không ghi ngầm)', 'Máy A mở hồ sơ ở revision r; máy B lưu (r+1); A phát hành với r; phát hành không truyền revision', 'A bị XUNG_DOT_PHIEN_BAN, không tạo chứng từ; thiếu revision → THIEU_REVISION; phát hành đúng revision KHÔNG đổi dữ liệu/revision hồ sơ', () => {
  const r0 = luuMoi([dong('T3', 1000000)]).maHoSo, rA = rev(r0);
  luuSua(r0, [dong('T3', 1100000)]); // máy B
  const taoDuoc = () => ls(r0).filter((x) => !/-LOI$/.test(x.MaTaiLieu)).length, demLs = taoDuoc();
  const a = thu(() => ctx.taoDeNghiGiaiNganBIDV(r0, { expectedRevision: rA })), b = thu(() => ctx.taoDeNghiGiaiNganBIDV(r0, {})), c = thu(() => ctx.taoDeNghiGiaiNganBIDV(r0)), khongTao = taoDuoc() === demLs;
  const truoc = JSON.stringify([ctx.layChiTietTheoHoSo_(r0).map((x) => [x.SoTien, x.TenNguoiHuong]), hs(r0).SoTienNhanNoLanNay, rev(r0)]);
  const dung = thu(() => ctx.taoDeNghiGiaiNganBIDV(r0, { expectedRevision: rev(r0) }));
  const sau = JSON.stringify([ctx.layChiTietTheoHoSo_(r0).map((x) => [x.SoTien, x.TenNguoiHuong]), hs(r0).SoTienNhanNoLanNay, rev(r0)]);
  return { ok: !a.ok && /XUNG_DOT_PHIEN_BAN/.test(a.loi) && khongTao && !b.ok && /THIEU_REVISION/.test(b.loi) && !c.ok && /THIEU_REVISION/.test(c.loi) && dung.ok && truoc === sau, thuc: `A:${(a.loi || '').slice(0, 40)} | không rev:${(b.loi || '').slice(0, 30)} | đúng rev: ${dung.ok}; dữ liệu không đổi=${truoc === sau}; bị chặn không tạo chứng từ=${khongTao}` };
});
// ---------------- TC04 ----------------
tc('TC04', 'luuHoSoGiaiNgan — cha–con', 'Sửa hồ sơ TC01 từ 2 dòng thành 3 dòng với expectedRevision đúng', 'Chi tiết thay đúng 3 dòng, tổng cha = tổng con, revision +1, journal HOAN_TAT, đối chiếu cha–con đạt', () => {
  const r = luuSua(hsA, [dong('A', 1000000), dong('B', 2000000), dong('C', 500000)]);
  const ct = ctx.layChiTietTheoHoSo_(hsA), gd = ob('NhatKyGhiDoDang').filter((x) => x.MaHoSo === hsA);
  return { ok: r.revision === 2 && ct.length === 3 && hs(hsA).SoTienNhanNoLanNay === 3500000 && ctx.xacMinhChaCon_(hsA, 3, 3500000).length === 0 && gd.every((x) => x.TrangThai === 'HOAN_TAT'), thuc: `rev ${r.revision}; ${ct.length} dòng; tổng ${hs(hsA).SoTienNhanNoLanNay}; journal ${gd.map((x) => x.TrangThai)}` };
});
// ---------------- TC05 ----------------
tc('TC05', 'taoDeNghiGiaiNganBIDV → phatHanhChungTu_', 'Hồ sơ A (Nháp, rev 2): phát hành Văn bản đề nghị', 'Bản "Hiệu lực" có link, HashDuLieu, RevisionHoSo=2; hồ sơ vẫn Nháp; bộ chứng từ = Phát hành thiếu', () => {
  const r = thu(() => ctx.taoDeNghiGiaiNganBIDV(hsA, { expectedRevision: 2 }));
  const h = ls(hsA).filter((x) => x.LoaiTaiLieu === 'DE_NGHI_GIAI_NGAN');
  const bo = ctx.layTrangThaiBoChungTu(hsA);
  return { ok: r.ok && h.length === 1 && h[0].TrangThai === 'Hiệu lực' && !!h[0].LinkDocx && !!h[0].HashDuLieu && Number(h[0].RevisionHoSo) === 2 && hs(hsA).TrangThai === 'Nháp' && bo.trangThai === 'Phát hành thiếu', thuc: `${r.loi || ''} bản=${h.length}, rev nguồn=${h[0] && h[0].RevisionHoSo}, hồ sơ ${hs(hsA).TrangThai}, bộ "${bo.trangThai}"` };
});
// ---------------- TC06 ----------------
tc('TC06', 'taoTronBoTheoMau (DocGenerator/BoChungTu)', 'Hồ sơ A: phát hành trọn bộ (loại "Bộ cơ bản", VND → Đề nghị + Bảng kê)', 'Phiên "Đã hoàn tất" ghi revision nguồn + danh sách; bộ "Đã hoàn tất"; hồ sơ → Đã tạo hồ sơ; chứng từ cũ được dùng lại (không trùng)', () => {
  const r = thu(() => tron(hsA));
  const p = ob('PhienPhatHanhBo').filter((x) => x.MaHoSo === hsA).pop();
  return { ok: r.ok && r.v.trangThaiPhien === 'Đã hoàn tất' && r.v.trangThaiBo === 'Đã hoàn tất' && hs(hsA).TrangThai === 'Đã tạo hồ sơ' && p && Number(p.RevisionNguon) === 2 && JSON.parse(p.DaTao).length === 2 && JSON.parse(p.DaTao).some((x) => x.dungLai) && ls(hsA).filter((x) => x.LoaiTaiLieu === 'DE_NGHI_GIAI_NGAN').length === 1,
    thuc: r.ok ? `phiên ${r.v.maPhien} ${r.v.trangThaiPhien}; đã tạo ${JSON.parse(p.DaTao).map((x) => x.loaiTaiLieu + (x.dungLai ? '(dùng lại)' : ''))}; hồ sơ ${hs(hsA).TrangThai}` : r.loi };
});
// ---------------- TC07 ----------------
let hs07;
tc('TC07', 'taoTronBoTheoMau + loại tài liệu BẮT BUỘC thiếu mẫu', 'Loại "Tờ trình" bắt buộc, chưa có mẫu; hồ sơ loại "Có tờ trình"', 'Phiên "Phát hành lỗi"; hồ sơ KHÔNG sang Đã tạo hồ sơ; chứng từ khác vẫn được tạo và giữ; kiemTraDuDieuKien báo thiếu', () => {
  hs07 = luuMoi([dong('T7', 800000)], { loaiHoSoGiaiNgan: 'Có tờ trình' }).maHoSo;
  const r = thu(() => tron(hs07)), bo = ctx.layTrangThaiBoChungTu(hs07);
  return { ok: r.ok && r.v.trangThaiPhien === 'Phát hành lỗi' && hs(hs07).TrangThai === 'Nháp' && r.v.loi.some((l) => l.loaiTaiLieu === 'TO_TRINH' && l.batBuoc && /BẮT BUỘC/.test(l.loi)) && ls(hs07).filter((x) => x.TrangThai === 'Hiệu lực').length === 2 && bo.trangThai === 'Phát hành lỗi', thuc: r.ok ? `${r.v.trangThaiPhien}; lỗi: ${r.v.loi.map((l) => l.loaiTaiLieu)}; hồ sơ ${hs(hs07).TrangThai}; bộ "${bo.trangThai}"` : r.loi };
});
// ---------------- TC08 ----------------
tc('TC08', 'taoTronBoTheoMau + loại KHÔNG bắt buộc thiếu mẫu', 'Đặt "Tờ trình" không bắt buộc; hồ sơ mới loại "Có tờ trình", chưa có mẫu', 'Bộ hoàn tất, hồ sơ → Đã tạo hồ sơ; ghi rõ lý do bỏ qua trong phiên', () => {
  ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'TO_TRINH', ten: 'Tờ trình', loaiTien: 'TAT_CA', batBuoc: false, thuTu: 25 }]);
  const m = luuMoi([dong('T8', 700000)], { loaiHoSoGiaiNgan: 'Có tờ trình' }).maHoSo, r = thu(() => tron(m));
  const p = ob('PhienPhatHanhBo').filter((x) => x.MaHoSo === m).pop();
  return { ok: r.ok && r.v.trangThaiPhien === 'Đã hoàn tất' && hs(m).TrangThai === 'Đã tạo hồ sơ' && JSON.parse(p.BoQua).length === 1 && /KHÔNG bắt buộc/.test(JSON.parse(p.BoQua)[0].lyDo), thuc: r.ok ? `${r.v.trangThaiPhien}; bỏ qua: ${JSON.parse(p.BoQua).map((x) => x.loaiTaiLieu + ' – ' + x.lyDo.slice(0, 40))}` : r.loi };
});
// ---------------- TC09 ----------------
let hs09, phien09;
tc('TC09', 'taoTronBoTheoMau — lỗi ở tài liệu thứ ba', 'Tờ trình (thứ tự 25 → thứ ba) có mẫu nhưng phát hành ném lỗi (mô phỏng lỗi Drive)', 'Hai tài liệu đầu GIỮ nguyên (Hiệu lực); phiên "Phát hành lỗi"; hồ sơ vẫn Nháp; bộ "Phát hành lỗi"; không xoá gì', () => {
  ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'TO_TRINH', ten: 'Tờ trình', loaiTien: 'TAT_CA', batBuoc: true, thuTu: 25 }]);
  ctx.taiMauVanBan({ maMau: 'TT_VND', tenMau: 'Tờ trình', nganHang: 'BIDV', loaiTien: 'VND', loaiTaiLieu: 'TO_TRINH', dieuKienSoDong: '1-999', tenFile: 'DE_NGHI_VND.docx' }, b64('DE_NGHI_VND.docx'));
  hs09 = luuMoi([dong('T9', 900000)], { loaiHoSoGiaiNgan: 'Có tờ trình' }).maHoSo;
  const goc = ctx.phatHanhChungTu_; ctx.phatHanhChungTu_ = function (ma, loai) { if (loai === 'TO_TRINH') throw new Error('Mô phỏng lỗi Drive ở tài liệu thứ ba'); return goc.apply(null, arguments); };
  let r; try { r = thu(() => tron(hs09)); } finally { ctx.phatHanhChungTu_ = goc; }
  phien09 = r.ok && r.v.maPhien;
  const hl = ls(hs09).filter((x) => x.TrangThai === 'Hiệu lực').map((x) => x.LoaiTaiLieu);
  return { ok: r.ok && r.v.trangThaiPhien === 'Phát hành lỗi' && hl.length === 2 && hs(hs09).TrangThai === 'Nháp' && r.v.trangThaiBo === 'Phát hành lỗi' && r.v.loi[0].loaiTaiLieu === 'TO_TRINH', thuc: r.ok ? `đã tạo ${hl}; lỗi ${r.v.loi.map((l) => l.loaiTaiLieu)}; hồ sơ ${hs(hs09).TrangThai}; bộ "${r.v.trangThaiBo}"` : r.loi };
});
// ---------------- TC10 ----------------
tc('TC10', 'taoTronBoTheoMau — thử lại (tiếp tục / phát hành lại 1 tài liệu / phát hành lại toàn bộ)', 'Tiếp tục phiên lỗi của TC09; tiếp tục khi hồ sơ đã đổi; phát hành lại 1 tài liệu; phát hành lại toàn bộ', 'Tiếp tục: chỉ tạo phần thiếu, 2 tài liệu cũ dùng lại (không L2); hồ sơ đổi → từ chối; lại 1 tài liệu → L2 + bản cũ "Đã thay thế"; toàn bộ → phiên bản mới', () => {
  const r = thu(() => tron(hs09, { tiepTucPhien: phien09 }));
  const dung = r.ok && r.v.daTao.filter((x) => x.dungLai).length === 2 && r.v.daTao.filter((x) => !x.dungLai).map((x) => x.loaiTaiLieu).join() === 'TO_TRINH' && r.v.trangThaiPhien === 'Đã hoàn tất' && hs(hs09).TrangThai === 'Đã tạo hồ sơ' && ls(hs09).filter((x) => x.LoaiTaiLieu === 'DE_NGHI_GIAI_NGAN').length === 1;
  // tiếp tục khi hồ sơ đã đổi
  const h2 = luuMoi([dong('T10', 600000)], { loaiHoSoGiaiNgan: 'Có tờ trình' }).maHoSo;
  const goc = ctx.phatHanhChungTu_; ctx.phatHanhChungTu_ = function (ma, loai) { if (loai === 'TO_TRINH') throw new Error('lỗi mô phỏng'); return goc.apply(null, arguments); };
  let pl2; try { pl2 = tron(h2).maPhien; } finally { ctx.phatHanhChungTu_ = goc; }
  luuSua(h2, [dong('T10', 650000)]);
  const doi = thu(() => tron(h2, { tiepTucPhien: pl2 }));
  // phát hành lại 1 tài liệu + toàn bộ (trên hs09 đã Đã tạo hồ sơ)
  const mot = thu(() => ctx.taoChungTuTuyChon(hs09, 'DE_NGHI_GIAI_NGAN', { taoLai: true, expectedRevision: rev(hs09) }));
  const cu = ls(hs09).filter((x) => x.LoaiTaiLieu === 'DE_NGHI_GIAI_NGAN');
  const tatCa = thu(() => tron(hs09, { taoLai: true }));
  return { ok: dung && !doi.ok && /hồ sơ đã đổi/.test(doi.loi) && mot.ok && mot.v.soLan === 2 && cu.filter((x) => x.TrangThai === 'Đã thay thế').length === 1 && tatCa.ok && tatCa.v.cheDo === 'LAI_TOAN_BO' && tatCa.v.daTao.every((x) => !x.dungLai && x.soLan >= 2), thuc: `tiếp tục: ${dung}; hồ sơ đổi: ${(doi.loi || '').slice(0, 60)}; lại 1: L${mot.ok && mot.v.soLan}; toàn bộ: ${tatCa.ok && tatCa.v.daTao.map((x) => 'L' + x.soLan)}` };
});
// ---------------- TC11 ----------------
tc('TC11', 'chuyenHoSoVeNhap', 'Hồ sơ A (Đã tạo hồ sơ): về Nháp không truyền revision, rồi với revision đúng', 'Thiếu revision → THIEU_REVISION; đúng → Nháp, chứng từ cũ GIỮ NGUYÊN trong lịch sử, lịch sử trạng thái ghi lý do', () => {
  const dem = ls(hsA).length;
  const a = thu(() => ctx.chuyenHoSoVeNhap(hsA, 'sửa')), b = thu(() => ctx.chuyenHoSoVeNhap(hsA, 'Sửa số liệu', rev(hsA)));
  return { ok: !a.ok && /THIEU_REVISION/.test(a.loi) && b.ok && hs(hsA).TrangThai === 'Nháp' && ls(hsA).length === dem && ctx.layLichSuTrangThaiHoSo(hsA)[0].lyDo === 'Sửa số liệu', thuc: `không rev: ${(a.loi || '').slice(0, 30)}; có rev: ${b.ok}; số bản lịch sử ${dem}→${ls(hsA).length}` };
});
// ---------------- TC12 ----------------
tc('TC12', 'luuHoSoGiaiNgan sau khi đã phát hành chứng từ', 'Hồ sơ A (Nháp): đổi số tiền dòng C 500.000 → 600.000', 'Chứng từ cũ không bị xoá nhưng hiện "Hết hiệu lực do hồ sơ thay đổi"; bộ chứng từ = Hết hiệu lực; file Drive còn', () => {
  const files = ls(hsA).map((x) => x.FileIdChinh).filter(Boolean);
  luuSua(hsA, [dong('A', 1000000), dong('B', 2000000), dong('C', 600000)]);
  const lichSu = ctx.layLichSuPhatHanh(hsA), bo = ctx.layTrangThaiBoChungTu(hsA), dsCt = ctx.layDanhSachChungTuHoSo(hsA);
  return { ok: lichSu.filter((x) => x.trangThai === 'Hiệu lực').every((x) => x.hieuLuc === 'Hết hiệu lực do hồ sơ thay đổi') && bo.trangThai === 'Hết hiệu lực do hồ sơ thay đổi' && files.every((id) => !G.dsFile[id].daXoa) && dsCt.some((x) => x.trangThai === 'Hết hiệu lực'), thuc: `bộ "${bo.trangThai}"; lịch sử: ${lichSu.filter((x) => x.trangThai === 'Hiệu lực').map((x) => x.hieuLuc)}; file còn: ${files.every((id) => !G.dsFile[id].daXoa)}` };
});
// ---------------- TC13 ----------------
tc('TC13', 'kiemTraDuDieuKienGiaiNgan_ / chuyenTrangThaiHoSo_ / xacNhanGiaiNganThucTe', 'Chứng từ hết hiệu lực: (a) hồ sơ Nháp muốn sang Đã tạo hồ sơ, (b) hồ sơ Đã tạo hồ sơ bị đổi dữ liệu trực tiếp trên Sheet rồi xác nhận giải ngân', 'Cả hai bị chặn, nêu "HẾT HIỆU LỰC"; dữ liệu không đổi', () => {
  const a = thu(() => ctx.chuyenTrangThaiHoSo_(hsA, 'Đã tạo hồ sơ', 'x', { expectedRevision: rev(hsA) }));
  const m = luuMoi([dong('T13', 1200000)]).maHoSo; tron(m);
  const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), row = hs(m)._row, c = sh.g[0].indexOf('SoGiayNhanNo'), goc = sh.g[row - 1][c];
  sh.g[row - 1][c] = 'GNN-BI-SUA-TAY';
  const kt = ctx.kiemTraDieuKienGiaiNgan(m), b = thu(() => gn(m));
  sh.g[row - 1][c] = goc;
  return { ok: !a.ok && /Chưa thể chuyển sang "Đã tạo hồ sơ"/.test(a.loi) && /Hết hiệu lực/.test(a.loi) && kt.loi.some((l) => /HẾT HIỆU LỰC/.test(l)) && !b.ok && /HẾT HIỆU LỰC/.test(b.loi) && hs(m).TrangThai === 'Đã tạo hồ sơ', thuc: `(a) ${(a.loi || '').slice(0, 80)} | (b) ${(b.loi || '').slice(0, 80)}` };
});
// ---------------- TC14 ----------------
tc('TC14', 'luuHoSoGiaiNgan / capNhatThongTinPhiTienTe (xung đột)', 'Hai máy cùng đọc revision r rồi lần lượt lưu', 'Máy 1 thành công; máy 2 bị XUNG_DOT_PHIEN_BAN kèm phiên bản mới; dữ liệu máy 1 còn nguyên', () => {
  const m = luuMoi([dong('T14', 1000000)]).maHoSo, r = rev(m);
  const a = thu(() => ctx.luuHoSoGiaiNgan(pl(m, [dong('T14', 2000000)], { expectedRevision: r }))), b = thu(() => ctx.luuHoSoGiaiNgan(pl(m, [dong('T14', 3000000)], { expectedRevision: r })));
  return { ok: a.ok && !b.ok && /^XUNG_DOT_PHIEN_BAN\|2\|/.test(b.loi) && ctx.layChiTietTheoHoSo_(m)[0].SoTien === 2000000, thuc: `máy 2: ${(b.loi || '').slice(0, 70)}` };
});
// ---------------- TC15 ----------------
tc('TC15', 'Mọi hàm cập nhật hồ sơ — expectedRevision bắt buộc', 'Gọi KHÔNG truyền / truyền "abc", -1, 1.5, true / truyền đúng cho: lưu, phi tiền tệ, về Nháp, xoá mềm, khôi phục, trọn bộ, xác nhận, hủy, điều chỉnh', 'Thiếu → THIEU_REVISION; sai định dạng → REVISION_KHONG_HOP_LE; không tự lấy revision mới nhất; dữ liệu không đổi', () => {
  const m = luuMoi([dong('T15', 1000000)]).maHoSo, mx = luuMoi([dong('T15x', 1000)]).maHoSo; ctx.xoaHoSo(mx, { expectedRevision: rev(mx) });
  const goiHam = {
    luu: (x) => ctx.luuHoSoGiaiNgan(pl(m, [dong('T15', 1000000)], x === undefined ? {} : { expectedRevision: x })),
    phiTien: (x) => ctx.capNhatThongTinPhiTienTe(pl(m, [dong('T15', 1000000)], x === undefined ? {} : { expectedRevision: x })),
    veNhap: (x) => ctx.chuyenHoSoVeNhap(m, 'x', x), xoa: (x) => ctx.xoaHoSo(m, x === undefined ? {} : { expectedRevision: x }), khoiPhuc: (x) => ctx.khoiPhucHoSo(mx, x),
    tron: (x) => ctx.taoTronBoTheoMau(m, x === undefined ? {} : { expectedRevision: x }), xacNhan: (x) => ctx.xacNhanGiaiNganThucTe(m, {}, x), huy: (x) => ctx.huyGiaiNgan(m, { loaiHuy: 'NH_CHUA_THUC_HIEN', lyDo: 'x' }, x), dieuChinh: (x) => ctx.ghiNhanDieuChinhGiaiNgan(m, {}, x),
    phatHanh: (x) => ctx.taoDeNghiGiaiNganBIDV(m, x === undefined ? {} : { expectedRevision: x })
  };
  const truoc = JSON.stringify([hs(m), ctx.layChiTietTheoHoSo_(m)]), loiThieu = [], loiSai = [];
  Object.keys(goiHam).forEach((k) => {
    const a = thu(() => goiHam[k](undefined)); if (!(!a.ok && /THIEU_REVISION/.test(a.loi))) loiThieu.push(k + ':' + (a.loi || 'ok').slice(0, 50));
    ['abc', -1, 1.5, true].forEach((v) => { const b = thu(() => goiHam[k](v)); if (!(!b.ok && /REVISION_KHONG_HOP_LE/.test(b.loi))) loiSai.push(k + '(' + v + '):' + (b.loi || 'ok').slice(0, 50)); });
  });
  const dung = thu(() => goiHam.luu(rev(m)));
  return { ok: !loiThieu.length && !loiSai.length && dung.ok && JSON.stringify([hs(m), ctx.layChiTietTheoHoSo_(m)]) !== truoc, thuc: `thiếu-revision sai: [${loiThieu}]; revision-sai: [${loiSai.slice(0, 3)}]; revision đúng: ${dung.ok}` };
});
// ---------------- TC16 ----------------
tc('TC16', 'capNhatThongTinPhiTienTe — lỗi giữa chừng', 'Hồ sơ có số tiền lẻ lịch sử (1.500.000,5); đổi tên người hưởng + số GNN; ép lỗi ghi sheet ChiTietThuHuong', 'Báo lỗi; cha + con phục hồi nguyên trạng (so từng ô), revision KHÔNG tăng, số lẻ lịch sử giữ nguyên, journal DA_PHUC_HOI; lần không lỗi: ghi đủ, tiền không đổi, revision +1', () => {
  const m = luuMoi([dong('T16a', 1000000), dong('T16b', 2000000)]).maHoSo;
  const shCt = G.boDuLieu.getSheetByName('ChiTietThuHuong'), shHs = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), cS = shCt.g[0].indexOf('SoTien'), cQ = shCt.g[0].indexOf('SoTienQuyDoi'), cM = shCt.g[0].indexOf('MaHoSo');
  const dongCon = shCt.g.map((r, i) => [r, i]).filter(([r, i]) => i > 0 && r[cM] === m).map(([r]) => r);
  dongCon[1][cS] = 1500000.5; dongCon[1][cQ] = 1500000.5; shHs.g[hs(m)._row - 1][shHs.g[0].indexOf('SoTienNhanNoLanNay')] = 2500000.5;
  const chup = () => JSON.stringify([shHs.g[hs(m)._row - 1], dongCon.map((r) => r.slice())]);
  const truoc = chup(), r0 = rev(m);
  const pLoi = { maHoSo: m, expectedRevision: r0, soGiayNhanNo: 'GNN-MOI', chiTiet: [{ tenNguoiHuong: 'TÊN MỚI 1' }, { tenNguoiHuong: 'TÊN MỚI 2', soTaiKhoan: '777' }] };
  shCt.loiGhi = { conLai: 0, err: 'Mô phỏng lỗi ghi sheet con' };
  const e = thu(() => ctx.capNhatThongTinPhiTienTe(pLoi)); shCt.loiGhi = null;
  const sau = chup(), gd = ob('NhatKyGhiDoDang').filter((x) => x.MaHoSo === m);
  const ok2 = thu(() => ctx.capNhatThongTinPhiTienTe(pLoi)), con = ctx.layChiTietTheoHoSo_(m);
  return { ok: !e.ok && /giữ nguyên/.test(e.loi) && truoc === sau && rev(m) === r0 + 1 && gd.some((x) => x.TrangThai === 'DA_PHUC_HOI') && ok2.ok && con[1].SoTien === 1500000.5 && con[0].TenNguoiHuong === 'TÊN MỚI 1' && con[1].SoTaiKhoan === '777' && hs(m).SoGiayNhanNo === 'GNN-MOI' && hs(m).SoTienNhanNoLanNay === 2500000.5 && gd.filter((x) => x.TrangThai === 'DANG_GHI').length === 0, thuc: `lỗi: ${(e.loi || '').slice(0, 70)}; phục hồi nguyên trạng=${truoc === sau}; rev ${r0}→${rev(m)}; số lẻ giữ=${con[1].SoTien}; journal ${gd.map((x) => x.TrangThai)}` };
});
// ---------------- TC17 ----------------
let hs17;
tc('TC17', 'xacNhanGiaiNganThucTe', 'Hồ sơ Đã tạo hồ sơ, bộ chứng từ đủ; xác nhận NH: ngày hôm nay, tham chiếu FT-TC17, số tiền = tổng hồ sơ, bằng chứng', 'Hồ sơ → Đã giải ngân; ghi XacNhanGiaiNgan hiệu lực đủ trường; revision +1; lịch sử trạng thái có lý do; báo cáo thực tế có giao dịch', () => {
  hs17 = luuMoi([dong('T17a', 1000000), dong('T17b', 500000)]).maHoSo; tron(hs17);
  const r0 = rev(hs17), r = thu(() => TI.xacNhanHopLe(ctx, hs17, { soThamChieuNH: 'FT-TC17', taiLieuXacNhan: 'Sao kê VCB 14/10', ghiChu: 'đối chiếu OK' }));
  const x = ob('XacNhanGiaiNgan').filter((y) => y.MaHoSo === hs17);
  const bc = ctx.layBaoCaoGiaiNganThucTe('', '');
  return { ok: r.ok && hs(hs17).TrangThai === 'Đã giải ngân' && rev(hs17) === r0 + 1 && x.length === 1 && x[0].TrangThai === 'Hiệu lực' && x[0].SoThamChieuNH === 'FT-TC17' && x[0].SoTienThucTe === 1500000 && x[0].TaiLieuXacNhan === 'Sao kê VCB 14/10' && !!x[0].NguoiXacNhan && bc.ok && bc.data.dong.some((d) => d.maHoSo === hs17 && d.soTien === 1500000), thuc: r.ok ? `${hs17}: ${hs(hs17).TrangThai}, rev ${r0}→${rev(hs17)}, xác nhận ${x[0].MaXacNhan} ${x[0].SoTienThucTe} ${x[0].LoaiTien}` : r.loi };
});
// ---------------- TC18 ----------------
tc('TC18', 'xacNhanGiaiNganThucTe — thiếu/sai thông tin ngân hàng', 'Lần lượt bỏ: ngày, tham chiếu, bằng chứng; số tiền lệch (từng phần); ngày tương lai; tham chiếu trùng hồ sơ khác; sai loại tiền; hồ sơ còn Nháp', 'Mọi trường hợp bị từ chối, hồ sơ giữ "Đã tạo hồ sơ", KHÔNG ghi XacNhanGiaiNgan', () => {
  const m = luuMoi([dong('T18', 1000000)]).maHoSo; tron(m);
  const co = ob('XacNhanGiaiNgan').length, hom = homNay, r = rev(m), tong = hs(m).SoTienNhanNoLanNay;
  const hopLe = { ngayThucTe: hom, soThamChieuNH: 'FT-TC18', soTienThucTe: tong, taiLieuXacNhan: 'Sao kê' };
  const cas = { 'thiếu ngày': { ngayThucTe: '' }, 'thiếu tham chiếu': { soThamChieuNH: '' }, 'thiếu bằng chứng': { taiLieuXacNhan: '' }, 'lệch số tiền (từng phần)': { soTienThucTe: tong - 1 }, 'ngày tương lai': { ngayThucTe: '2999-01-01' }, 'ngày không tồn tại': { ngayThucTe: '2026-02-31' }, 'trùng tham chiếu': { soThamChieuNH: 'FT-TC17' }, 'sai loại tiền': { loaiTien: 'USD' }, 'số tiền không số': { soTienThucTe: 'abc' }, 'số lẻ': { soTienThucTe: '1000000,5' } };
  const sai = [];
  Object.keys(cas).forEach((k) => { const x = thu(() => ctx.xacNhanGiaiNganThucTe(m, Object.assign({}, hopLe, cas[k]), r)); if (x.ok) sai.push(k); });
  const phan = thu(() => ctx.xacNhanGiaiNganThucTe(m, Object.assign({}, hopLe, { soTienThucTe: tong - 1 }), r));
  const nhap = luuMoi([dong('T18n', 1000000)]).maHoSo, tNhap = thu(() => ctx.xacNhanGiaiNganThucTe(nhap, hopLe, rev(nhap)));
  return { ok: !sai.length && /từng phần/.test(phan.loi) && !tNhap.ok && /Đã tạo hồ sơ/.test(tNhap.loi) && hs(m).TrangThai === 'Đã tạo hồ sơ' && ob('XacNhanGiaiNgan').length === co, thuc: `được chấp nhận nhầm: [${sai}]; ${(phan.loi || '').slice(0, 70)}` };
});
// ---------------- TC19 ----------------
tc('TC19', 'huyGiaiNgan', 'Hồ sơ Đã giải ngân: hủy loại "đã thực hiện", NH thất bại không bằng chứng, không lý do, rồi hợp lệ', 'Chỉ 2 tình huống chưa/ thất bại được hủy; đã thực hiện bị từ chối kèm hướng dẫn hoàn trả/điều chỉnh; hủy hợp lệ → Đã hủy (kết thúc), xác nhận chuyển "Hủy bỏ" giữ dấu vết; chứng từ giữ', () => {
  const m = luuMoi([dong('T19', 1000000)]).maHoSo; tron(m); gn(m, { soThamChieuNH: 'FT-TC19' });
  const r = () => rev(m), dem = ls(m).length;
  const a = thu(() => ctx.huyGiaiNgan(m, { loaiHuy: 'DA_THUC_HIEN', lyDo: 'x' }, r())), b = thu(() => ctx.huyGiaiNgan(m, { loaiHuy: 'NH_BAO_THAT_BAI', lyDo: 'NH từ chối' }, r())), c = thu(() => ctx.huyGiaiNgan(m, { loaiHuy: 'NH_CHUA_THUC_HIEN', lyDo: ' ' }, r())), c2 = thu(() => ctx.huyGiaiNgan(m, 'chỉ chuỗi', r()));
  const d = thu(() => ctx.huyGiaiNgan(m, { loaiHuy: 'NH_BAO_THAT_BAI', lyDo: 'NH báo lỗi tài khoản', bangChung: 'Thông báo NH #55' }, r())), x = ob('XacNhanGiaiNgan').filter((y) => y.MaHoSo === m);
  return { ok: !a.ok && /hoàn trả|điều chỉnh/.test(a.loi) && !b.ok && /bằng chứng/.test(b.loi) && !c.ok && !c2.ok && d.ok && hs(m).TrangThai === 'Đã hủy' && x.length === 1 && x[0].TrangThai === 'Hủy bỏ' && /NH báo lỗi tài khoản/.test(x[0].GhiChu) && ls(m).length === dem && !thu(() => ctx.chuyenHoSoVeNhap(m, 'x', r())).ok, thuc: `đã thực hiện: ${(a.loi || '').slice(0, 60)}; hủy hợp lệ: ${d.ok}; xác nhận → ${x[0] && x[0].TrangThai}; chứng từ ${dem}→${ls(m).length}` };
});
// ---------------- TC20 ----------------
tc('TC20', 'ghiNhanDieuChinhGiaiNgan', 'Hồ sơ 2.000.000 đã giải ngân thực tế; NH hoàn trả 200.000 (FT-HT1); hoàn trả quá số tiền; trùng tham chiếu; thử hủy sau khi có hoàn trả', 'Hồ sơ vẫn Đã giải ngân; ròng thực tế 1.800.000; báo cáo thực tế có 2 giao dịch (2.000.000 và −200.000); hủy bị từ chối; đối soát ghi nhận điều chỉnh (thông tin) và KHÔNG báo lệch', () => {
  const m = luuMoi([dong('T20', 2000000)]).maHoSo; tron(m); gn(m, { soThamChieuNH: 'FT-TC20' });
  const ht = thu(() => ctx.ghiNhanDieuChinhGiaiNgan(m, { loai: 'HOAN_TRA', soTien: 200000, soThamChieuNH: 'FT-HT1', ngayThucTe: homNay, taiLieuXacNhan: 'Sao kê hoàn', lyDo: 'Hoàn một phần do NH tính phí' }, rev(m)));
  const qua = thu(() => ctx.ghiNhanDieuChinhGiaiNgan(m, { loai: 'HOAN_TRA', soTien: 9000000, soThamChieuNH: 'FT-HT2', ngayThucTe: homNay, taiLieuXacNhan: 'x1234', lyDo: 'quá' }, rev(m)));
  const trung = thu(() => ctx.ghiNhanDieuChinhGiaiNgan(m, { loai: 'HOAN_TRA', soTien: 1, soThamChieuNH: 'FT-HT1', ngayThucTe: homNay, taiLieuXacNhan: 'x1234', lyDo: 'trùng' }, rev(m)));
  const huy = thu(() => ctx.huyGiaiNgan(m, { loaiHuy: 'NH_BAO_THAT_BAI', lyDo: 'thử', bangChung: 'abc123' }, rev(m)));
  const bc = ctx.layBaoCaoGiaiNganThucTe('', '').data, dongM = bc.dong.filter((d) => d.maHoSo === m), ds = ctx.layBaoCaoDoiSoat().data, m2 = {}; ds.kiemTra.forEach((k) => { m2[k.ma] = k; });
  return { ok: ht.ok && ht.v.ronThucTe === 1800000 && hs(m).TrangThai === 'Đã giải ngân' && !qua.ok && !trung.ok && !huy.ok && /điều chỉnh/.test(huy.loi) && dongM.length === 2 && dongM.some((d) => d.soTien === -200000) && m2.CO_DIEU_CHINH.soLoi >= 1 && !m2.TONG_XAC_NHAN_LECH.chiTiet.some((x) => x.indexOf(m) === 0), thuc: `ròng ${ht.ok && ht.v.ronThucTe}; báo cáo ${dongM.map((d) => d.soTien)}; hủy: ${(huy.loi || '').slice(0, 60)}` };
});
// ---------------- TC21 ----------------
tc('TC21', 'xoaHoSo / khoiPhucHoSo / layDanhSachHoSoXoaMem', 'Xoá mềm hồ sơ Nháp có chứng từ; thử xoá hồ sơ Đã giải ngân; khôi phục bởi người không phải quản trị; khôi phục khi hợp đồng bị xoá; khôi phục hợp lệ', 'Xoá cần xác nhận CO_TAI_LIEU; dòng cha/con/chứng từ/file giữ; hiện trong kiểm toán; Đã giải ngân không xoá được; chỉ quản trị khôi phục (cần revision); dữ liệu không tương thích → từ chối; hợp lệ → hoạt động lại', () => {
  const m = luuMoi([dong('T21', 400000)]).maHoSo; ctx.taoDeNghiGiaiNganBIDV(m, { expectedRevision: rev(m) });
  const cc = thu(() => ctx.xoaHoSo(m, { expectedRevision: rev(m) })), xoa = thu(() => ctx.xoaHoSo(m, { expectedRevision: rev(m), xacNhanCoTaiLieu: true, lyDo: 'nhập nhầm' }));
  const raw = ob('HoSoGiaiNgan').find((h) => h.MaHoSo === m), ct = ob('ChiTietThuHuong').filter((c) => c.MaHoSo === m), fid = ls(m)[0].FileIdChinh;
  const xm = ctx.layDanhSachHoSoXoaMem(), revXoa = xm.find((x) => x.maHoSo === m).revision;
  const gnXoa = thu(() => ctx.xoaHoSo(hs17, { expectedRevision: rev(hs17) }));
  mt.__email = 'nguoila@example.com'; const kp0 = thu(() => ctx.khoiPhucHoSo(m, revXoa)); mt.__email = 'ketoan@example.com';
  const kp1 = thu(() => ctx.khoiPhucHoSo(m)), kp2 = thu(() => ctx.khoiPhucHoSo(m, revXoa + 5));
  const shHd = G.boDuLieu.getSheetByName('DM_HopDongVay'), ma = shHd.g[0].indexOf('MaHD'), goc = shHd.g[1][ma]; shHd.g[1][ma] = 'DA_DOI_MA';
  const kp3 = thu(() => ctx.khoiPhucHoSo(m, revXoa)); shHd.g[1][ma] = goc;
  const kp4 = thu(() => ctx.khoiPhucHoSo(m, revXoa));
  return { ok: !cc.ok && /^CO_TAI_LIEU\|/.test(cc.loi) && xoa.ok && raw.DaXoa === true && ct.length === 1 && !G.dsFile[fid].daXoa && !ctx.layHoSoTheoMa_(m) === false || true ? (!cc.ok && /^CO_TAI_LIEU\|/.test(cc.loi) && xoa.ok && raw.DaXoa === true && ct.length === 1 && !G.dsFile[fid].daXoa && xm.some((x) => x.maHoSo === m && x.soChungTuGiuLai >= 1) && !gnXoa.ok && !kp0.ok && /quản trị/i.test(kp0.loi) && !kp1.ok && /THIEU_REVISION/.test(kp1.loi) && !kp2.ok && /XUNG_DOT/.test(kp2.loi) && !kp3.ok && /không còn tồn tại/.test(kp3.loi) && kp4.ok && !!hs(m) && hs(m).DaXoa !== true && nk(m, 'KHOI_PHUC_HO_SO')) : false, thuc: `xoá: ${xoa.ok}; cha/con/file giữ; người thường khôi phục: ${(kp0.loi || '').slice(0, 40)}; HĐ mất: ${(kp3.loi || '').slice(0, 60)}; khôi phục hợp lệ: ${kp4.ok}` };
});
// ---------------- TC22 ----------------
tc('TC22', 'layBaoCaoGiaiNganThucTe', 'Có hồ sơ Nháp 7.777.777 và Đã tạo hồ sơ 3.333.333 (chưa NH xác nhận) cùng các hồ sơ đã giải ngân', 'Tổng VND thực tế = đúng tổng các xác nhận hiệu lực; không chứa hồ sơ Nháp / Đã tạo / Đã hủy', () => {
  const n = luuMoi([dong('T22n', 7777777)]).maHoSo, t = luuMoi([dong('T22t', 3333333)]).maHoSo; tron(t);
  const bc = ctx.layBaoCaoGiaiNganThucTe('', '').data, tongTay = ob('XacNhanGiaiNgan').filter((x) => x.TrangThai === 'Hiệu lực' && x.LoaiTien === 'VND' && hs(x.MaHoSo) && hs(x.MaHoSo).TrangThai === 'Đã giải ngân').reduce((a, x) => a + x.SoTienThucTe, 0);
  return { ok: bc.tongTheoNguyenTe.VND.tong === tongTay && !bc.dong.some((d) => d.maHoSo === n || d.maHoSo === t) && bc.dong.every((d) => hs(d.maHoSo).TrangThai === 'Đã giải ngân'), thuc: `VND thực tế ${bc.tongTheoNguyenTe.VND.tong} = tính tay ${tongTay}; Nháp/Đã tạo không có trong báo cáo` };
});
// ---------------- TC23 ----------------
tc('TC23', 'layBaoCaoGiaiNganThucTe / layBaoCaoDoiSoat (VND/USD)', 'Hồ sơ USD 25.000 × 25.810 giải ngân thực tế cùng các hồ sơ VND', 'Tổng VND và USD tách riêng; quy đổi VND của USD hiển thị riêng (645.250.000) và KHÔNG cộng vào tổng VND; đối soát tách nhóm theo loại tiền', () => {
  const u = luuMoi([Object.assign(dong('T23', 25000), { soTien: 25000 })], { loaiTien: 'USD', tyGiaBan: 25810, soTienNhanNoLanNay: 25000 }).maHoSo; tron(u); gn(u);
  const vndTruoc = ctx.layBaoCaoGiaiNganThucTe('', '').data, ds = ctx.layBaoCaoDoiSoat().data.tongHop;
  return { ok: vndTruoc.tongTheoNguyenTe.USD.tong === 25000 && vndTruoc.tongTheoNguyenTe.USD.tongQuyDoiVND === 645250000 && vndTruoc.tongTheoNguyenTe.VND.tong === ob('XacNhanGiaiNgan').filter((x) => x.TrangThai === 'Hiệu lực' && x.LoaiTien === 'VND' && hs(x.MaHoSo).TrangThai === 'Đã giải ngân').reduce((a, x) => a + x.SoTienThucTe, 0) && ds.some((g) => g.loaiTien === 'USD') && ds.every((g) => g.loaiTien === 'VND' || g.loaiTien === 'USD') && /ROUND/.test(vndTruoc.quyTacQuyDoi), thuc: `USD ${vndTruoc.tongTheoNguyenTe.USD.tong} (quy đổi ${vndTruoc.tongTheoNguyenTe.USD.tongQuyDoiVND}); VND ${vndTruoc.tongTheoNguyenTe.VND.tong}; quy tắc: ${vndTruoc.quyTacQuyDoi.slice(0, 50)}` };
});
// ---------------- TC24 ----------------
tc('TC24', 'layBaoCaoTienVay — lọc ngày', 'Hồ sơ không có ngày giải ngân; lọc khoảng ngày / chỉ thiếu ngày / ngày thực tế', 'Khoảng ngày KHÔNG mặc nhiên gồm hồ sơ thiếu ngày; chiThieuNgay chỉ liệt kê nhóm thiếu; THUC_TE loại hồ sơ chưa có xác nhận', () => {
  const t = luuMoi([dong('T24', 123000)], { ngayGiaiNgan: '' }).maHoSo, c = luuMoi([dong('T24c', 456000)], { ngayGiaiNgan: '2026-09-20' }).maHoSo;
  const tc_ = (opt, a, b) => ctx.layBaoCaoTienVay(a === undefined ? '' : a, b === undefined ? '' : b, '', '', '', true, opt).map((r) => r.maHoSo);
  const khoang = tc_(undefined, '2026-09-01', '2026-09-30'), chiThieu = tc_({ chiThieuNgay: true }), khongLoc = tc_(undefined), thucTe = tc_({ loaiNgay: 'THUC_TE' }, '2026-01-01', '2999-12-31');
  return { ok: khoang.indexOf(t) < 0 && khoang.indexOf(c) >= 0 && chiThieu.indexOf(t) >= 0 && chiThieu.indexOf(c) < 0 && khongLoc.indexOf(t) >= 0 && thucTe.indexOf(c) < 0 && thucTe.indexOf(hs17) >= 0, thuc: `khoảng ngày: thiếu-ngày ${khoang.indexOf(t) < 0 ? 'bị loại' : 'LỌT'}; chiThieuNgay: ${chiThieu.indexOf(t) >= 0}; không lọc gồm cả hai: ${khongLoc.indexOf(t) >= 0 && khongLoc.indexOf(c) >= 0}; THUC_TE chỉ hồ sơ đã xác nhận: ${thucTe.indexOf(c) < 0 && thucTe.indexOf(hs17) >= 0}` };
});
// ---------------- TC25 ----------------
tc('TC25', 'taoTronBoTheoMau + luuHoSoGiaiNgan đồng thời', 'Giữa hai tài liệu của bộ, phiên khác lưu sửa cùng hồ sơ', 'XUNG_DOT_PHIEN_BAN; phiên "Phát hành lỗi"; hồ sơ vẫn Nháp (không "Đã tạo hồ sơ"); chứng từ đã tạo hiện "Hết hiệu lực"; không trộn dữ liệu cũ/mới thành bộ hoàn tất', () => {
  const m = luuMoi([dong('T25a', 1000000), dong('T25b', 2000000)]).maHoSo;
  const goc = ctx.phatHanhChungTu_; let lan = 0;
  ctx.phatHanhChungTu_ = function () { const k = goc.apply(null, arguments); if (++lan === 1) luuSua(m, [dong('T25a', 1000000), dong('T25b', 2000000), dong('T25c', 3000000)]); return k; };
  let r; try { r = thu(() => tron(m)); } finally { ctx.phatHanhChungTu_ = goc; }
  const p = ob('PhienPhatHanhBo').filter((x) => x.MaHoSo === m).pop(), bo = ctx.layTrangThaiBoChungTu(m);
  return { ok: !r.ok && /XUNG_DOT_PHIEN_BAN/.test(r.loi) && p.TrangThai === 'Phát hành lỗi' && hs(m).TrangThai === 'Nháp' && bo.trangThai === 'Hết hiệu lực do hồ sơ thay đổi', thuc: `${(r.loi || '').slice(0, 60)}; phiên "${p.TrangThai}"; hồ sơ ${hs(m).TrangThai}; bộ "${bo.trangThai}"` };
});
// ---------------- TC26 ----------------
tc('TC26', 'kiemTraKetQuaLuu / luuHoSoGiaiNgan (mất mạng sau khi ghi)', 'Lưu hồ sơ mới & lưu sửa thành công nhưng phản hồi bị mất; client hỏi kiemTraKetQuaLuu rồi (nếu cần) gửi lại', 'Biết đã ghi (daGhi); gửi lại hồ sơ mới cùng khoaYeuCau không tạo trùng; gửi lại bản sửa với revision cũ bị XUNG_DOT (không ghi 2 lần)', () => {
  const truoc = ob('HoSoGiaiNgan').length, p = pl('', [dong('T26', 321000)], { khoaYeuCau: 'K-TC26' });
  const a = ctx.luuHoSoGiaiNgan(p); const q = ctx.kiemTraKetQuaLuu('', 'K-TC26'), b = ctx.luuHoSoGiaiNgan(p);
  const r0 = rev(a.maHoSo); luuSua(a.maHoSo, [dong('T26', 322000)]);
  const sua = ctx.kiemTraKetQuaLuu(a.maHoSo, '', r0), lai = thu(() => ctx.luuHoSoGiaiNgan(pl(a.maHoSo, [dong('T26', 322000)], { expectedRevision: r0 })));
  return { ok: q.daGhi && q.maHoSo === a.maHoSo && b.maHoSo === a.maHoSo && b.daCoTuTruoc === true && ob('HoSoGiaiNgan').length === truoc + 1 && sua.daGhi === true && !lai.ok && /XUNG_DOT/.test(lai.loi), thuc: `hồ sơ mới: daGhi=${q.daGhi}, gửi lại → ${b.maHoSo} (daCo=${b.daCoTuTruoc}); sửa: daGhi=${sua.daGhi}; gửi lại → ${(lai.loi || '').slice(0, 30)}` };
});
// ---------------- TC27 ----------------
tc('TC27', 'Gửi lại cùng yêu cầu (xác nhận, hủy, về Nháp, trọn bộ)', 'Gửi 2 lần liên tiếp: xác nhận giải ngân, hủy, chuyển về Nháp, phát hành trọn bộ', 'Lần 2 không tạo bản ghi/chứng từ trùng: xác nhận trùng bị từ chối; hủy lần 2 bị từ chối; về Nháp lần 2 xung đột; trọn bộ lần 2 dùng lại tài liệu (không L2)', () => {
  const m = luuMoi([dong('T27', 1000000)]).maHoSo; tron(m); const l1 = ls(m).length, r2 = tron(m);
  const dungLai = r2.daTao.every((x) => x.dungLai) && ls(m).length === l1;
  const r = rev(m), thongTin = { ngayThucTe: homNay, soThamChieuNH: 'FT-TC27', soTienThucTe: hs(m).SoTienNhanNoLanNay, taiLieuXacNhan: 'Sao kê NH 14/10' };
  const x1 = ctx.xacNhanGiaiNganThucTe(m, thongTin, r), x2 = thu(() => ctx.xacNhanGiaiNganThucTe(m, thongTin, r)), n = ob('XacNhanGiaiNgan').filter((y) => y.MaHoSo === m).length;
  const h1 = ctx.huyGiaiNgan(m, { loaiHuy: 'NH_CHUA_THUC_HIEN', lyDo: 'chưa chuyển' }, rev(m)), h2 = thu(() => ctx.huyGiaiNgan(m, { loaiHuy: 'NH_CHUA_THUC_HIEN', lyDo: 'chưa chuyển' }, h1.revision - 1));
  const v = luuMoi([dong('T27v', 1000)]).maHoSo; tron(v); const rv0 = rev(v); ctx.chuyenHoSoVeNhap(v, 'a', rv0); const v2 = thu(() => ctx.chuyenHoSoVeNhap(v, 'a', rv0));
  return { ok: dungLai && !x2.ok && n === 1 && !h2.ok && !v2.ok && /XUNG_DOT/.test(v2.loi), thuc: `trọn bộ lần 2 dùng lại=${dungLai}; xác nhận lần 2: ${(x2.loi || '').slice(0, 50)} (bản ghi=${n}); hủy lần 2: ${(h2.loi || '').slice(0, 40)}; về Nháp lần 2: ${(v2.loi || '').slice(0, 30)}` };
});
// ---------------- TC28 ----------------
tc('TC28', 'api() + PortalAuthAdapter (chế độ Cổng) — phân quyền API đổi trạng thái', 'Chế độ CONG_HAK; người dùng XEM, NHAP_LIEU; ẩn danh; gọi chuyển trạng thái/xác nhận/hủy/xoá/khôi phục qua api() và gọi trực tiếp', 'XEM và ẩn danh bị chặn mọi API ghi; NHAP_LIEU xác nhận/hủy được nhưng không khôi phục (quản trị); gọi trực tiếp không qua api() bị chặn', () => {
  ctx.luuNguoiDung({ email: 'xem28@x.com', vaiTro: 'XEM', trangThai: 'Hoạt động' }); ctx.luuNguoiDung({ email: 'nhap28@x.com', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' });
  const m = luuMoi([dong('T28', 1000000)]).maHoSo; tron(m);
  G.props['PORTAL_CHE_DO'] = 'CONG_HAK'; mt.__email = '';
  const pX = ctx.taoPhien_('xem28@x.com'), pN = ctx.taoPhien_('nhap28@x.com'), r = rev(m);
  const A = (p, h, a) => thu(() => ctx.api(p, h, a));
  const xem = [A(pX, 'chuyenHoSoVeNhap', [m, 'x', r]), A(pX, 'xacNhanGiaiNganThucTe', [m, {}, r]), A(pX, 'huyGiaiNgan', [m, {}, r]), A(pX, 'xoaHoSo', [m, { expectedRevision: r }]), A(pX, 'khoiPhucHoSo', [m, 1]), A(pX, 'ghiNhanDieuChinhGiaiNgan', [m, {}, r]), A(pX, 'taoTronBoTheoMau', [m, { expectedRevision: r }])];
  const an = A('', 'chuyenHoSoVeNhap', [m, 'x', r]), truc = thu(() => ctx.chuyenHoSoVeNhap(m, 'x', r)), truc2 = thu(() => ctx.xacNhanGiaiNganThucTe(m, {}, r));
  const nhapXN = A(pN, 'xacNhanGiaiNganThucTe', [m, { ngayThucTe: homNay, soThamChieuNH: 'FT-TC28', soTienThucTe: hs(m).SoTienNhanNoLanNay, taiLieuXacNhan: 'Sao kê NH 14/10' }, r]);
  const nhapKP = A(pN, 'khoiPhucHoSo', [m, 1]), nhapDoc = A(pX, 'layDuLieuKhoiTao', [{}]);
  delete G.props['PORTAL_CHE_DO']; mt.__email = 'ketoan@example.com';
  return { ok: xem.every((x) => !x.ok && /\[QUYEN\]/.test(x.loi)) && !an.ok && /\[AUTH\]/.test(an.loi) && !truc.ok && /\[AUTH\]/.test(truc.loi) && !truc2.ok && /\[AUTH\]/.test(truc2.loi) && nhapXN.ok && hs(m).TrangThai === 'Đã giải ngân' && !nhapKP.ok && /\[QUYEN\]/.test(nhapKP.loi) && nhapDoc.ok, thuc: `XEM bị chặn ${xem.filter((x) => !x.ok).length}/7; ẩn danh: ${(an.loi || '').slice(0, 30)}; trực tiếp: ${(truc.loi || '').slice(0, 30)}; NHAP_LIEU xác nhận: ${nhapXN.ok}; khôi phục: ${(nhapKP.loi || '').slice(0, 30)}; XEM đọc dữ liệu: ${nhapDoc.ok}` };
});
// ---------------- TC29 ----------------
tc('TC29', 'layRevisionDuLieu + luuHoSoGiaiNgan + phát hành (máy khác đổi dữ liệu khi form đang mở)', 'Máy A mở hồ sơ (revision r); máy B lưu; A hỏi layRevisionDuLieu rồi cố lưu / phát hành', 'A phát hiện revision miền HOSO đã tăng; lưu & phát hành của A đều bị XUNG_DOT_PHIEN_BAN kèm revision mới; dữ liệu B nguyên vẹn (kiểm tra phía giao diện: UI [TC19])', () => {
  const m = luuMoi([dong('T29', 1000000)]).maHoSo, r = rev(m), v0 = ctx.layRevisionDuLieu().data.HOSO;
  luuSua(m, [dong('T29', 1111111)]);
  const v1 = ctx.layRevisionDuLieu().data.HOSO, a = thu(() => ctx.luuHoSoGiaiNgan(pl(m, [dong('T29', 9999999)], { expectedRevision: r }))), b = thu(() => ctx.taoTronBoTheoMau(m, { expectedRevision: r }));
  return { ok: v1 > v0 && !a.ok && /XUNG_DOT_PHIEN_BAN\|2\|/.test(a.loi) && !b.ok && /XUNG_DOT/.test(b.loi) && ctx.layChiTietTheoHoSo_(m)[0].SoTien === 1111111, thuc: `revision HOSO ${v0}→${v1}; lưu: ${(a.loi || '').slice(0, 40)}; phát hành: ${(b.loi || '').slice(0, 40)}` };
});
// ---------------- TC30 ----------------
tc('TC30', 'Bộ hồi quy hiện có (chạy lại các kịch bản cũ)', 'Chạy lại: logic tiền, hồi quy, tích hợp (mẫu thử + mẫu thật), trình tạo mẫu, đóng gói, vòng đời, đồng bộ, đăng nhập (+ giao diện nếu có Playwright)', 'Tất cả thoát mã 0 (không lỗi)', () => {
  if (process.env.BO_QUA_TC30) return { ok: true, thuc: 'BỎ QUA có chủ đích (BO_QUA_TC30=1) — chạy đầy đủ qua kiem_thu/chay_tat_ca.sh' };
  const ds = ['chay_thu_logic', 'chay_hoi_quy', 'chay_tich_hop', 'chay_tich_hop_mau_that', 'chay_trinh_tao_mau', 'chay_dong_goi', 'chay_trang_thai', 'chay_dong_bo', 'chay_dang_nhap', 'chay_bao_mat'];
  try { require('playwright'); ds.push('chay_giao_dien'); } catch (e) { /* không có Playwright → bỏ qua giao diện */ }
  const kqs = ds.map((t) => { try { cp.execFileSync('node', [path.join(__dirname, t + '.js'), path.join(RA, 'hoi_quy_' + t)], { stdio: 'pipe', timeout: 900000, env: Object.assign({}, process.env, { BO_QUA_TC30: '1' }) }); return t + ':OK'; } catch (e) { return t + ':LỖI(' + e.status + ')'; } });
  return { ok: kqs.every((x) => /:OK$/.test(x)), thuc: kqs.join(' ') };
});

// ---------------- TC31 (bổ sung) ----------------
tc('TC31', 'api() + ghiLog_ (log cảnh báo xung đột revision)', 'Gọi qua api() chuyển hồ sơ về Nháp không có revision, rồi revision cũ', 'Log JSON mức WARN (không phải ERROR) với mã THIEU_REVISION / XUNG_DOT_PHIEN_BAN; lỗi vẫn trả về cho client; không lộ tham số', () => {
  const m = luuMoi([dong('T31', 900000)]).maHoSo, r0 = rev(m); luuSua(m, [dong('T31', 910000)]);
  const dongLog = [], goc = console.warn, gocE = console.error; console.warn = (x) => dongLog.push(String(x)); console.error = (x) => dongLog.push(String(x));
  let a, b; try { a = thu(() => ctx.api('', 'chuyenHoSoVeNhap', [m, 'x'])); b = thu(() => ctx.api('', 'chuyenHoSoVeNhap', [m, 'x', r0])); } finally { console.warn = goc; console.error = gocE; }
  const js = dongLog.filter((x) => x.charAt(0) === '{').map((x) => JSON.parse(x));
  return { ok: !a.ok && !b.ok && js.length === 2 && js.every((x) => x.level === 'WARN' && x.module === 'API' && x.action === 'chuyenHoSoVeNhap') && js[0].code === 'THIEU_REVISION' && js[1].code === 'XUNG_DOT_PHIEN_BAN' && dongLog.join('').indexOf('T31') < 0, thuc: js.map((x) => x.level + ':' + x.code).join(', ') };
});

// ---------------- Báo cáo ----------------
const uiKq = UI && fs.existsSync(path.join(UI, 'ket_qua.txt')) ? fs.readFileSync(path.join(UI, 'ket_qua.txt'), 'utf8').split('\n').filter((l) => /\[QT-TC/.test(l)) : [];
let md = '# BÁO CÁO KIỂM THỬ QUY TRÌNH NGHIỆP VỤ (TC01–TC30)\n\n> **Môi trường:** ' + MOI_TRUONG + '\n> Không có test nào ở đây chạy trên Google Apps Script thật. Mục B là test giao diện trên Chromium với `google.script.run` giả.\n\n## A. Phía máy chủ (`chay_quy_trinh.js`)\n\n';
md += '| Mã | Kết quả | Hàm/module |\n|---|---|---|\n' + kq.map((t) => `| ${t.id} | ${t.ok ? 'PASS' : 'FAIL'} | ${t.ham} |`).join('\n') + '\n\n';
kq.forEach((t) => { md += `### ${t.id} — ${t.ok ? 'PASS' : 'FAIL'}\n- Hàm/module: ${t.ham}\n- Dữ liệu đầu vào: ${t.dauVao}\n- Kết quả mong đợi: ${t.kyVong}\n- Kết quả thực tế / bằng chứng: ${t.thuc}\n- Môi trường: giả lập\n\n`; });
md += '## B. Phía giao diện (`chay_giao_dien.js`, tag [QT-TCxx])\n\n' + (uiKq.length ? uiKq.map((l) => '- ' + l.trim()).join('\n') : '_(chưa có kết quả UI kèm theo)_') + '\n';
fs.writeFileSync(path.join(RA, 'BAO_CAO_KIEM_THU_QUY_TRINH.md'), md);
kq.forEach((t) => console.log(`  [${t.ok ? 'ĐẠT' : 'LỖI'}] ${t.id} ${t.ham}${t.ok ? '' : '  → ' + t.thuc}`));
console.log(`\nTỔNG: ${kq.length} tình huống, ${kq.length - loi} đạt, ${loi} lỗi. Báo cáo: ${path.join(RA, 'BAO_CAO_KIEM_THU_QUY_TRINH.md')}`);
process.exit(loi ? 1 : 0);
