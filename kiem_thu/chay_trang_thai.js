/* VÒNG ĐỜI HỒ SƠ & AN TOÀN DỮ LIỆU (HOSODOMAIN.gs + PORTALAUTHADAPTER.gs): máy trạng thái ở backend, revision/xung đột, khoá, sinh mã,
 * xoá mềm, nhật ký ghi dở dang + phục hồi, quy tắc tiền (danh sách bắt buộc), chế độ cổng HAK.  node kiem_thu/chay_trang_thai.js
 * LƯU Ý: chạy trên dịch vụ Apps Script GIẢ LẬP — không chứng minh hành vi LockService/Sheets thật trên Google. */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_trang_thai'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
const G = mt.__;
const kq = []; let loi = 0;
const dat = (n, t, ok, g) => { kq.push([n, t, ok ? 'ĐẠT' : 'LỖI', g || '']); if (!ok) loi++; };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
const ob = (t) => ctx.sheetToObjects_(t);
process.on('uncaughtException', (e) => { in_(); console.log('LỖI BẤT NGỜ:', e.stack.split('\n').slice(0, 5).join('\n')); process.exit(2); });
function in_() { let n = ''; kq.forEach(([a, b, c, d]) => { if (a !== n) { console.log('\n== ' + a); n = a; } console.log(`  [${c}] ${b}${c === 'LỖI' && d ? '  → ' + String(d).slice(0, 300) : ''}`); }); }

ctx.initializeSpreadsheet(); require('./gia_lap_apps_script').dangKyNguoiThuong(ctx);
const TI = require('./gia_lap_apps_script'); TI.khachHangDungRevision(ctx); // test này kiểm máy trạng thái; test revision/quy trình nằm ở chay_quy_trinh.js
const doc = (f) => fs.readFileSync(path.join(GOC, 'mau_thu', f)).toString('base64');
[['DE_NGHI_VND', 'DE_NGHI_VND.docx', 'DE_NGHI_GIAI_NGAN', 1, 999], ['UNC_VND', 'UNC_VND_1_KHOAN.docx', 'CHUNG_TU_THANH_TOAN', 1, 1], ['BANG_KE_VND', 'BANG_KE_VND.docx', 'CHUNG_TU_THANH_TOAN', 2, 999]].forEach(([ma, f, lct, tu, den]) =>
  ctx.taiMauVanBan({ maMau: ma, tenMau: 'Mẫu ' + ma, nganHang: 'BIDV', loaiTien: 'VND', loaiTaiLieu: lct, dieuKienSoDong: tu + '-' + den, tenFile: f }, doc(f)));
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', maSoThue: '0400000000', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-01', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 5000000000 });
const dong = (ten, st) => ({ tenNguoiHuong: ten, soTaiKhoan: '9' + st, taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt ' + ten, soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' });
const pl = (ma, ds, extra) => Object.assign({ maHoSo: ma, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 1000000, soTienNhanNoLanNay: ds.reduce((a, d) => a + d.soTien, 0), soGiayNhanNo: 'GNN-1', ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: ds }, extra || {});
const hs = (ma) => ctx.layHoSoTheoMa_(ma);
const nhatKy = (ma, hanhDong) => ob('NhatKyHeThong').some(x => x.MaHoSo === ma && x.HanhDong === hanhDong);

// ---------- 1. Tạo & bỏ qua trangThai từ client ----------
const a = ctx.luuHoSoGiaiNgan(pl('', [dong('A', 1000000), dong('B', 2000000)], { trangThai: 'Đã giải ngân' }));
dat('Trạng thái', 'Tạo mới luôn là Nháp, bỏ qua trangThai="Đã giải ngân" do client gửi; Revision = 1', a.trangThai === 'Nháp' && hs(a.maHoSo).TrangThai === 'Nháp' && a.revision === 1 && hs(a.maHoSo).Revision === 1);
const s2 = ctx.luuHoSoGiaiNgan(pl(a.maHoSo, [dong('A', 1000000), dong('B', 2000000)], { trangThai: 'Đã hủy', expectedRevision: 1 }));
dat('Trạng thái', 'Sửa hồ sơ Nháp với trangThai="Đã hủy" trong payload: vẫn Nháp, Revision tăng 2', s2.trangThai === 'Nháp' && s2.revision === 2 && hs(a.maHoSo).TrangThai === 'Nháp');

// ---------- 2. Máy trạng thái ----------
const rv = (ma) => hs(ma).Revision;
const dnTruoc = thu(() => TI.xacNhanHopLe(ctx, a.maHoSo));
dat('Trạng thái', 'Nháp → Đã giải ngân bị chặn (phải qua Đã tạo hồ sơ)', !dnTruoc.ok && /Đã tạo hồ sơ/.test(dnTruoc.loi) && hs(a.maHoSo).TrangThai === 'Nháp', dnTruoc.loi);
const huyNhap = thu(() => ctx.huyGiaiNgan(a.maHoSo, { loaiHuy: 'NH_CHUA_THUC_HIEN', lyDo: 'x' }, rv(a.maHoSo)));
dat('Trạng thái', 'Nháp → Đã hủy bị chặn', !huyNhap.ok && hs(a.maHoSo).TrangThai === 'Nháp');
const chuaBo = thu(() => ctx.chuyenTrangThaiHoSo_(a.maHoSo, 'Đã tạo hồ sơ', 'test', { expectedRevision: rv(a.maHoSo) }));
dat('Trạng thái', 'Nháp → Đã tạo hồ sơ khi CHƯA có bộ chứng từ bắt buộc bị chặn', !chuaBo.ok && /bộ chứng từ/.test(chuaBo.loi) && hs(a.maHoSo).TrangThai === 'Nháp', chuaBo.loi);
const tronA = thu(() => ctx.taoTronBoTheoMau(a.maHoSo));
dat('Trạng thái', 'Phát hành trọn bộ đủ → Nháp → Đã tạo hồ sơ qua máy trạng thái; ghi LichSuTrangThaiHoSo + nhật ký', tronA.ok && tronA.v.trangThaiPhien === 'Đã hoàn tất' && hs(a.maHoSo).TrangThai === 'Đã tạo hồ sơ' && ctx.layLichSuTrangThaiHoSo(a.maHoSo).length === 1 && ctx.layLichSuTrangThaiHoSo(a.maHoSo)[0].tu === 'Nháp' && nhatKy(a.maHoSo, 'CHUYEN_TRANG_THAI'), tronA.loi);
const suaDaTao = thu(() => ctx.luuHoSoGiaiNgan(pl(a.maHoSo, [dong('A', 3000000)])));
dat('Trạng thái', 'Hồ sơ "Đã tạo hồ sơ" không lưu sửa được (phải về Nháp trước)', !suaDaTao.ok && /Chuyển về Nháp/.test(suaDaTao.loi));
const gnThieuTT = thu(() => ctx.xacNhanGiaiNganThucTe(a.maHoSo, {}, rv(a.maHoSo)));
dat('Điều kiện giải ngân', 'Thiếu thông tin xác nhận ngân hàng → không giải ngân được, hồ sơ giữ nguyên', !gnThieuTT.ok && /Ngày giải ngân thực tế/.test(gnThieuTT.loi) && hs(a.maHoSo).TrangThai === 'Đã tạo hồ sơ', gnThieuTT.loi);
const kt = ctx.kiemTraDieuKienGiaiNgan(a.maHoSo);
dat('Điều kiện giải ngân', 'kiemTraDieuKienGiaiNgan chỉ đọc (không đổi revision); hồ sơ đủ chứng từ → không lỗi', kt.loi.length === 0, kt.loi.join('; '));
const vn = thu(() => ctx.chuyenHoSoVeNhap(a.maHoSo, 'sửa lại'));
dat('Trạng thái', 'Đã tạo hồ sơ → Nháp hợp lệ', vn.ok && hs(a.maHoSo).TrangThai === 'Nháp' && ctx.layLichSuTrangThaiHoSo(a.maHoSo).length === 2);
// giải ngân thật
const b = ctx.luuHoSoGiaiNgan(pl('', [dong('C', 1500000)]));
const tr = thu(() => ctx.taoTronBoTheoMau(b.maHoSo));
dat('Trạng thái', 'Tạo trọn bộ chuyển Nháp → Đã tạo hồ sơ qua máy trạng thái', tr.ok && hs(b.maHoSo).TrangThai === 'Đã tạo hồ sơ' && ctx.layLichSuTrangThaiHoSo(b.maHoSo).length === 1, tr.loi);
const ktB = ctx.kiemTraDieuKienGiaiNgan(b.maHoSo);
const gn = thu(() => TI.xacNhanHopLe(ctx, b.maHoSo, { ghiChu: 'NH xác nhận' }));
dat('Điều kiện giải ngân', 'Đủ dữ liệu + chứng từ hiện hành + xác nhận ngân hàng → Đã giải ngân; lưu lý do + người', ktB.loi.length === 0 && gn.ok && hs(b.maHoSo).TrangThai === 'Đã giải ngân' && /Xác nhận giải ngân thực tế/.test(ctx.layLichSuTrangThaiHoSo(b.maHoSo)[0].lyDo), gn.loi || ktB.loi.join('; '));
const hsB = gn.ok ? b.maHoSo : null;
if (hsB) {
  dat('Trạng thái', 'Đã giải ngân không sửa/không xoá/không về Nháp', !thu(() => ctx.luuHoSoGiaiNgan(pl(hsB, [dong('C', 1500000)]))).ok && !thu(() => ctx.xoaHoSo(hsB)).ok && !thu(() => ctx.chuyenHoSoVeNhap(hsB)).ok);
  const huyKhongLyDo = thu(() => ctx.huyGiaiNgan(hsB, { loaiHuy: 'NH_CHUA_THUC_HIEN', lyDo: '  ' }, rv(hsB)));
  dat('Trạng thái', 'Hủy giải ngân bắt buộc lý do', !huyKhongLyDo.ok && /lý do/.test(huyKhongLyDo.loi) && hs(hsB).TrangThai === 'Đã giải ngân');
  const huy = thu(() => ctx.huyGiaiNgan(hsB, { loaiHuy: 'NH_BAO_THAT_BAI', lyDo: 'NH từ chối', bangChung: 'Thông báo NH 123' }, rv(hsB)));
  dat('Trạng thái', 'Đã giải ngân → Đã hủy kèm lý do; Đã hủy là trạng thái kết thúc', huy.ok && hs(hsB).TrangThai === 'Đã hủy' && /NH từ chối/.test(ctx.layLichSuTrangThaiHoSo(hsB)[0].lyDo) && !thu(() => ctx.chuyenHoSoVeNhap(hsB)).ok && !thu(() => TI.xacNhanHopLe(ctx, hsB)).ok && !thu(() => ctx.huyGiaiNgan(hsB, { loaiHuy: 'NH_BAO_THAT_BAI', lyDo: 'lại', bangChung: 'x1234' }, rv(hsB))).ok);
}

// ---------- 3. Revision / xung đột ----------
const c = ctx.luuHoSoGiaiNgan(pl('', [dong('D', 1000000)]));
const rev = hs(c.maHoSo).Revision;
const nguoi1 = thu(() => ctx.luuHoSoGiaiNgan(pl(c.maHoSo, [dong('D', 2000000)], { expectedRevision: rev })));
const nguoi2 = thu(() => ctx.luuHoSoGiaiNgan(pl(c.maHoSo, [dong('D', 3000000)], { expectedRevision: rev })));
dat('Xung đột', 'Hai người cùng sửa từ revision cũ: người 1 thành công, người 2 bị XUNG_DOT_PHIEN_BAN (không ghi đè)', nguoi1.ok && !nguoi2.ok && /^XUNG_DOT_PHIEN_BAN\|\d+\|/.test(nguoi2.loi) && ctx.layChiTietTheoHoSo_(c.maHoSo)[0].SoTien === 2000000, nguoi2.loi);
const xungXoa = thu(() => ctx.xoaHoSo(c.maHoSo, { expectedRevision: rev }));
dat('Xung đột', 'Xoá với revision cũ cũng bị từ chối', !xungXoa.ok && /XUNG_DOT_PHIEN_BAN/.test(xungXoa.loi));
const xungTT = thu(() => ctx.chuyenTrangThaiHoSo_(c.maHoSo, 'Đã tạo hồ sơ', '', { expectedRevision: rev }));
dat('Xung đột', 'Chuyển trạng thái với revision cũ bị từ chối', !xungTT.ok && /XUNG_DOT_PHIEN_BAN/.test(xungTT.loi));

// ---------- 4. Khoá ----------
G.nhatKyKhoa.tryLock = () => false;
const khoaBan = [thu(() => ctx.luuHoSoGiaiNgan(pl('', [dong('E', 1)]))), thu(() => ctx.chuyenHoSoVeNhap(c.maHoSo)), thu(() => ctx.xoaHoSo(c.maHoSo)), thu(() => ctx.luuKhachHang({ tenKhachHang: 'K', soTaiKhoan: '1', taiNganHang: 'B' })), thu(() => ctx.luuCongTy({ tenCty: 'Z' })), thu(() => ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'Q' }))];
G.nhatKyKhoa.tryLock = () => true;
dat('Khoá', 'Khoá bận: lưu hồ sơ / chuyển trạng thái / xoá / lưu KH / công ty / hợp đồng đều bị từ chối rõ ràng, không ghi gì', khoaBan.every(r => !r.ok && /thử lại/.test(r.loi)) && ob('HoSoGiaiNgan').length === 3);
let soLanLay = 0; G.nhatKyKhoa.tryLock = () => { soLanLay++; return true; };
ctx.voiKhoa_(() => ctx.voiKhoa_(() => ctx.voiKhoa_(() => 1)));
G.nhatKyKhoa.tryLock = () => true;
dat('Khoá', 'voiKhoa_ lồng nhau dùng lại khoá (chỉ lấy 1 lần, không tự khoá chết)', soLanLay === 1, 'số lần lấy = ' + soLanLay);
const laiSauLoi = thu(() => ctx.voiKhoa_(() => { throw new Error('boom'); }));
dat('Khoá', 'Sau lỗi trong khoá, khoá được nhả và lần sau dùng bình thường', !laiSauLoi.ok && ctx.voiKhoa_(() => 7) === 7);

// ---------- 5. Sinh mã ----------
const k1 = ctx.luuKhachHang({ tenKhachHang: 'K1', soTaiKhoan: '1', taiNganHang: 'B' }), k2 = ctx.luuKhachHang({ tenKhachHang: 'K2', soTaiKhoan: '2', taiNganHang: 'B' });
dat('Sinh mã', 'Hai khách hàng liên tiếp có mã khác nhau', k1.maKH !== k2.maKH);
const maTruoc = ob('HoSoGiaiNgan').map(h => h.MaHoSo);
const dMoi = ctx.luuHoSoGiaiNgan(pl('', [dong('F', 5)]));
dat('Sinh mã', 'Mã hồ sơ mới không trùng mã nào đang có', maTruoc.indexOf(dMoi.maHoSo) < 0);
// không cấp lại mã đã xoá dù dòng bị xoá khỏi Sheet: giả lập xoá cứng dòng cuối bằng tay
const shHsRaw = G.boDuLieu.getSheetByName('HoSoGiaiNgan'); const maCuoi = dMoi.maHoSo;
shHsRaw.deleteRow(shHsRaw.getLastRow());
const dKe = ctx.luuHoSoGiaiNgan(pl('', [dong('G', 6)]));
dat('Sinh mã', 'Mã của dòng bị xoá thủ công KHÔNG được cấp lại (bộ đếm bền)', dKe.maHoSo !== maCuoi, maCuoi + ' → ' + dKe.maHoSo);
const exists = thu(() => { const h = ctx.sinhMaTuDong_('HoSoGiaiNgan', 'HS', 4); return h; });
dat('Sinh mã', 'Sinh mã khi thiếu bộ đếm vẫn dựa vào cột A (không lùi)', exists.ok && ob('HoSoGiaiNgan').every(h => h.MaHoSo !== exists.v));
const soKhachHang = 'SoGiayNhanNo khác MaHoSo';
dat('Sinh mã', 'Khoá kỹ thuật (MaHoSo) tách khỏi số chứng từ nghiệp vụ (SoGiayNhanNo): hai hồ sơ cùng GNN-1 vẫn có mã khác nhau', hs(a.maHoSo).SoGiayNhanNo === hs(b.maHoSo).SoGiayNhanNo && a.maHoSo !== b.maHoSo, soKhachHang);

// ---------- 6. Xoá mềm ----------
const x = ctx.luuHoSoGiaiNgan(pl('', [dong('H', 100)]));
const file = G.goc.createFolder('xm').createFile(new G.Blob(Buffer.from('docx'), 'a', 'ph.docx'));
ctx.ghiPhatHanh_({ MaTaiLieu: x.maHoSo + '-DE_NGHI_GIAI_NGAN-L1', MaHoSo: x.maHoSo, LoaiTaiLieu: 'DE_NGHI_GIAI_NGAN', SoLan: 1, TrangThai: 'Hiệu lực', LinkDocx: file.getUrl(), FileIdChinh: file.getId() });
const xCanXacNhan = thu(() => ctx.xoaHoSo(x.maHoSo));
dat('Xoá mềm', 'Hồ sơ đã có tài liệu phát hành: xoá phải xác nhận (CO_TAI_LIEU), chưa xoá gì', !xCanXacNhan.ok && /^CO_TAI_LIEU\|1\|/.test(xCanXacNhan.loi) && !!hs(x.maHoSo));
const dongTruoc = ob('HoSoGiaiNgan').length, chiTietTruoc = ob('ChiTietThuHuong').length;
const xoa = thu(() => ctx.xoaHoSo(x.maHoSo, { xacNhanCoTaiLieu: true, lyDo: 'nhập nhầm' }));
dat('Xoá mềm', 'Xoá mềm: ẩn khỏi danh sách/lọc/báo cáo; dòng cha + chi tiết + file Drive + lịch sử phát hành đều còn', xoa.ok && !hs(x.maHoSo) && ctx.locDanhSachHoSo({ maHoSo: x.maHoSo }).length === 0 && ob('HoSoGiaiNgan').length === dongTruoc && ob('ChiTietThuHuong').length === chiTietTruoc && ctx.layLichSuPhatHanh(x.maHoSo).length === 1 && !file.daXoa && ob('HoSoGiaiNgan').filter(h => h.MaHoSo === x.maHoSo)[0].DaXoa === true, xoa.loi);
dat('Xoá mềm', 'Nhật ký ghi xoá mềm kèm lý do; mã không bị cấp lại', nhatKy(x.maHoSo, 'XOA_MEM_HO_SO') && ctx.luuHoSoGiaiNgan(pl('', [dong('I', 1)])).maHoSo !== x.maHoSo);
const suaDaXoa = thu(() => ctx.luuHoSoGiaiNgan(pl(x.maHoSo, [dong('H', 100)])));
dat('Xoá mềm', 'Hồ sơ đã xoá mềm không sửa được', !suaDaXoa.ok);
const kp = thu(() => ctx.khoiPhucHoSo(x.maHoSo));
dat('Xoá mềm', 'Quản trị khôi phục hồ sơ đã xoá mềm', kp.ok && !!hs(x.maHoSo) && hs(x.maHoSo).DaXoa !== true);
mt.__email = 'nguoila@example.com'; G.props['ADMIN_EMAILS'] = 'ketoan@example.com';
dat('Xoá mềm', 'Người không phải quản trị không khôi phục được', !thu(() => ctx.khoiPhucHoSo(x.maHoSo)).ok);
mt.__email = 'ketoan@example.com';

// ---------- 7. Nhật ký ghi dở dang + phục hồi ----------
const j = ctx.luuHoSoGiaiNgan(pl('', [dong('J1', 1000), dong('J2', 2000)]));
const truocJ = JSON.stringify(ctx.layChiTietTheoHoSo_(j.maHoSo).map(r => [r.STT, r.SoTien, r.TenNguoiHuong]));
const shCt = G.boDuLieu.getSheetByName('ChiTietThuHuong');
shCt.loiGhi = { conLai: 0, err: 'Mô phỏng lỗi ghi' };
const loiGhi = thu(() => ctx.luuHoSoGiaiNgan(pl(j.maHoSo, [dong('X', 5000)])));
shCt.loiGhi = null;
const gd = ob('NhatKyGhiDoDang');
dat('Ghi dở dang', 'Lỗi ghi giữa chừng: dữ liệu cũ được phục hồi ngay và nhật ký ghi DA_PHUC_HOI (không còn DANG_GHI)', !loiGhi.ok && truocJ === JSON.stringify(ctx.layChiTietTheoHoSo_(j.maHoSo).map(r => [r.STT, r.SoTien, r.TenNguoiHuong])) && gd.length > 0 && gd.every(r => r.TrangThai !== 'DANG_GHI') && gd.some(r => r.TrangThai === 'DA_PHUC_HOI'), loiGhi.loi);
// Giả lập tiến trình chết giữa chừng: ghi journal DANG_GHI + đã xoá chi tiết cũ, ghi dở bản mới, rồi dừng
const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), h0 = sh.g[0];
const rowCu = h0.map(hh => hs(j.maHoSo).hasOwnProperty(hh) ? hs(j.maHoSo)[hh] : '');
const saoLuu = ctx.layGiaTriThatCuaSheet_(shCt).filter((r, i) => i > 0 && String(r[0]) === j.maHoSo);
ctx.ghiDoDangBatDau_(j.maHoSo, false, rowCu, saoLuu);
const rows = []; ctx.layGiaTriThatCuaSheet_(shCt).forEach((r, i) => { if (i > 0 && String(r[0]) === j.maHoSo) rows.push(i + 1); });
ctx.xoaCacDongNhom_(shCt, rows.reverse());
dat('Ghi dở dang', 'Phát hiện: layGhiDoDang liệt kê lần ghi đang dở (hồ sơ J có 0 dòng chi tiết)', ctx.layGhiDoDang().length === 1 && ctx.layChiTietTheoHoSo_(j.maHoSo).length === 0);
const sauChet = thu(() => ctx.luuHoSoGiaiNgan(pl(j.maHoSo, [dong('J1', 1000), dong('J2', 2000), dong('J3', 3000)])));
dat('Ghi dở dang', 'Lần lưu kế tiếp tự phục hồi bản dở rồi ghi bản mới; không còn DANG_GHI', sauChet.ok && ctx.layChiTietTheoHoSo_(j.maHoSo).length === 3 && ctx.layGhiDoDang().length === 0 && nhatKy(j.maHoSo, 'PHUC_HOI_GHI_DO_DANG'), sauChet.loi);
// phục hồi thủ công
const j2 = ctx.luuHoSoGiaiNgan(pl('', [dong('K1', 10)]));
const saoLuu2 = ctx.layGiaTriThatCuaSheet_(shCt).filter((r, i) => i > 0 && String(r[0]) === j2.maHoSo);
const g2 = ctx.ghiDoDangBatDau_(j2.maHoSo, false, h0.map(hh => hs(j2.maHoSo)[hh] === undefined ? '' : hs(j2.maHoSo)[hh]), saoLuu2);
const pt = thu(() => ctx.phucHoiGhiDoDang(g2.id));
dat('Ghi dở dang', 'Quản trị phục hồi thủ công theo mã lần ghi', pt.ok && ctx.layGhiDoDang().length === 0 && ctx.layChiTietTheoHoSo_(j2.maHoSo).length === 1, pt.loi);
// hồ sơ MỚI chết giữa chừng → phục hồi = xoá mềm dòng cha
const g3 = ctx.ghiDoDangBatDau_('HS9999', true, [], []);
const dongGia = h0.map(hh => hh === 'MaHoSo' ? 'HS9999' : hh === 'TrangThai' ? 'Nháp' : ''); sh.g[ctx.timDongThatCuoiCung_(sh)] = dongGia;
ctx.phucHoiGhiDoDang(g3.id);
dat('Ghi dở dang', 'Hồ sơ MỚI ghi dở: phục hồi ẩn dòng cha dở (không để hồ sơ mồ côi hiện ra)', ctx.layHoSoTheoMa_('HS9999') === undefined || ctx.layHoSoTheoMa_('HS9999') === null);

// ---------- 8. Quy tắc tiền (danh sách bắt buộc) ----------
const tien = (s) => { try { return ctx.docTienNguyen_(s, 't'); } catch (e) { return 'LOI'; } };
const mn = [[0, 'Không đồng chẵn'], [1, 'Một đồng chẵn'], [10, 'Mười đồng chẵn'], [15, 'Mười lăm đồng chẵn'], [101, 'Một trăm lẻ một đồng chẵn'], [25000, 'Hai mươi lăm ngàn đồng chẵn'], [1000000, 'Một triệu đồng chẵn'], [1000000000, 'Một tỷ đồng chẵn']];
mn.forEach(([n, ky]) => { const r = ctx.soThanhChuVN(n); dat('Quy tắc tiền', `Số → chữ VND ${n}`, String(r).toLowerCase().replace(/,/g, '') === ky.toLowerCase(), r); });
dat('Quy tắc tiền', '"1.000.000" = 1000000; "25.000" = 25000; "1.005" = 1005 (KHÔNG phải 1,005)', tien('1.000.000') === 1000000 && tien('25.000') === 25000 && tien('1.005') === 1005, [tien('1.000.000'), tien('25.000'), tien('1.005')].join('|'));
dat('Quy tắc tiền', 'Số có phần thập phân bị từ chối ("1.000.000,5", "100.5")', tien('1.000.000,5') === 'LOI' && tien('100.5') === 'LOI');
const usd = ctx.soTienUSDBangChu_(25000), vnd = ctx.soThanhChuVN(25000);
dat('Quy tắc tiền', 'USD đọc "đô la Mỹ" (không "đồng"); VND đọc "đồng"', /đô la/i.test(usd) && !/đồng/i.test(usd) && /đồng/.test(vnd), usd + ' | ' + vnd);
const usdHs = thu(() => ctx.luuHoSoGiaiNgan(pl('', [Object.assign(dong('U', 25000), { soTien: 25000 })], { loaiTien: 'USD', tyGiaBan: 25810, soTienNhanNoLanNay: 25000 })));
dat('Quy tắc tiền', 'Hồ sơ USD 25.000 × 25.810: lưu số tiền nguyên + quy đổi 645.250.000, bằng chữ USD', usdHs.ok && ctx.layChiTietTheoHoSo_(usdHs.v.maHoSo)[0].SoTienQuyDoi === 645250000 && /đô la/i.test(hs(usdHs.v.maHoSo).SoTienBangChu), usdHs.loi);
const leHs = thu(() => ctx.luuHoSoGiaiNgan(pl('', [Object.assign(dong('L', 1), { soTien: '100.5' })], { soTienNhanNoLanNay: 100 })));
dat('Quy tắc tiền', 'Dòng có số lẻ bị từ chối khi lưu và KHÔNG tạo hồ sơ', !leHs.ok);

// ---------- 9. Cổng HAK (PortalAuthAdapter) ----------
const tam = ctx.layTrangThaiQuyen();
dat('Cổng HAK', 'Chế độ mặc định TAM_GOOGLE: nêu rõ chưa xác minh bởi cổng', tam.cheDo === 'TAM_GOOGLE' && tam.daXacMinhCong === false && tam.nguon === 'TAM_GOOGLE');
G.props['PORTAL_CHE_DO'] = 'CONG_HAK'; mt.__email = 'nguoila@example.com'; // không phải ADMIN → gọi trực tiếp phải bị chặn
const cg = [null, thu(() => ctx.luuHoSoGiaiNgan(pl('', [dong('Z', 1)]))), thu(() => ctx.chuyenHoSoVeNhap(c.maHoSo)), thu(() => ctx.xoaHoSo(c.maHoSo)), thu(() => ctx.luuKhachHang({ tenKhachHang: 'K', soTaiKhoan: '1', taiNganHang: 'B' }))];
const doGet = ctx.kiemTraTruyCapWebApp_();
dat('Cổng HAK', 'Chế độ CONG_HAK: gọi trực tiếp không phiên bị chặn [AUTH]; trang vẫn hiện (chứa màn hình đăng nhập)', doGet.ok === true && cg.slice(1).every(r => !r.ok && /\[AUTH\]/.test(r.loi)), JSON.stringify(cg.map(r => r && r.loi)));
// Mọi hàm công khai mà giao diện gọi (trừ vài hàm khởi động) phải bị chặn trong chế độ CONG_HAK
const fsx = require('fs'); const clientTxt = fsx.readFileSync(path.join(GOC, 'JavaScript.html'), 'utf8') + fsx.readFileSync(path.join(GOC, 'Index.html'), 'utf8');
const goiTuClient = [...new Set([...clientTxt.matchAll(/\.\s*([A-Za-z]\w*)\s*\(/g)].map(m => m[1]))].filter(n => !['api', 'thongTinDangNhap', 'nhanPhienDangNhap', 'dangXuat'].includes(n) && typeof ctx[n] === 'function' && !n.endsWith('_') && fsx.readdirSync(GOC).some(f => f.endsWith('.gs') && new RegExp('^function ' + n + '\\(', 'm').test(fsx.readFileSync(path.join(GOC, f), 'utf8'))));
const khongChan = goiTuClient.filter(n => { try { ctx[n](); return true; } catch (e) { return !/\[AUTH\]/.test(e.message); } });
dat('Cổng HAK', 'MỌI hàm công khai giao diện gọi (' + goiTuClient.length + ' hàm) đều bị chặn ở chế độ CONG_HAK', goiTuClient.length > 40 && khongChan.length === 0, 'không chặn: ' + khongChan.join(', '));
delete G.props['PORTAL_CHE_DO'];
mt.__email = 'ketoan@example.com';
dat('Cổng HAK', 'Bỏ cấu hình → trở lại TAM_GOOGLE, gọi trực tiếp lại được', thu(() => ctx.layNgayHomNay()).ok);

in_();
console.log(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi`);
process.exit(loi ? 1 : 0);
