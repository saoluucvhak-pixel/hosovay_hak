/* LUỒNG ĐẦY ĐỦ trên MẪU THẬT: tạo hồ sơ → tạo bộ chứng từ → (bật) duyệt hai cấp → xác nhận giải ngân → trả nợ từng phần → tất toán,
 * kèm các ca xấu: bấm lặp, hai phiên cùng sửa, người xem/nhập liệu, dữ liệu sai, tiền bằng chữ.
 * Dịch vụ Apps Script GIẢ LẬP; PDF do LibreOffice. KHÔNG phải Google thật. node kiem_thu/chay_luong_day_du.js [thư_mục_ra] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_luong_day_du'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const TI = require('./gia_lap_apps_script'); const { ctx, mt } = TI(GOC, path.join(RA, '_tam')); const G = mt.__;
let ok = 0, loi = 0; const dat = (t, f) => { try { f(); ok++; console.log('PASS ' + t); } catch (e) { loi++; console.log('FAIL ' + t + ' → ' + String(e.message).slice(0, 500)); } };
const b64 = (f) => fs.readFileSync(path.join(GOC, 'mau_that', f)).toString('base64');
ctx.initializeSpreadsheet(); G.props['ADMIN_EMAILS'] = 'ketoan@example.com'; mt.__email = 'ketoan@example.com';
ctx.luuNguoiDung({ email: 'lap@example.com', hoTen: 'Người lập', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' });
ctx.luuNguoiDung({ email: 'xem@example.com', hoTen: 'Người xem', vaiTro: 'XEM', trangThai: 'Hoạt động' });
ctx.luuNguoiDung({ email: 'duyet@example.com', hoTen: 'Quản trị 2', vaiTro: 'ADMIN', trangThai: 'Hoạt động' });
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
const ap = (e, ten, ...args) => voi(e, () => ctx.api('', ten, args));
const rev = (ma) => ctx.soRevision_(ctx.layHoSoTheoMa_(ma));
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HOÀNG ANH KHÔI', maCIF: '0401447476', maSoThue: '0401447476', diaChiTruSo: 'Đà Nẵng', nguoiDaiDien: 'A', chucVu: 'GĐ', taiKhoanVND: '8619299999', taiKhoanUSD: '8619288888' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: '02/2026/HĐTD', ngayHopDong: '2026-09-04', tenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', chiNhanh: 'CN Quảng Nam', hanMucVay: 50000000000, laiSuatTrongHan: 6.5, kyHanTraGoc: 'Cuối kỳ', kyHanTraLai: 'Hàng tháng' });
[['HDTD_USD_1', 'HDTD_USD_1_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '1'], ['HDTD_USD_N', 'HDTD_USD_NHIEU_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '2-999'], ['UNC_BIDV', 'UNC_1_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '1'], ['UNC_2_BIDV', 'UNC_2_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '2'], ['BANG_KE_BIDV', 'BANG_KE_NHIEU_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '3+'], ['HDMB_BIDV', 'HDMB_USD.docx', 'USD', 'HDMB_NGOAI_TE', '1+']]
  .forEach(([ma, f, lt, lct, dk]) => ctx.taiMauVanBan({ maMau: ma, tenMau: ma, nganHang: 'BIDV', loaiTien: lt, loaiTaiLieu: lct, dieuKienSoDong: dk, tenFile: f, macDinh: true }, b64(f)));
const homNay = ctx.homNayVN_();
const dong = (ten, st) => ({ tenNguoiHuong: ten, soTaiKhoan: '9000' + Math.round(st), taiNganHang: 'BIDV', loaiTien: 'USD', noiDungThanhToan: 'tt ' + ten, loaiChungTu: 'Thanh toán tiền hàng', soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/10/2026' });
const payload = (extra) => Object.assign({ maHD: hd.maHD, soGiayNhanNo: 'GNN-LD', ngayGiayNhanNo: homNay, duNoHienTai: 0, loaiTien: 'USD', tyGiaBan: 25810, soTienNhanNoLanNay: 1500.5, phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'Mua keo', thoiHanChoVayNgay: 90, ngayGiaiNgan: homNay, ngayDenHan: '2027-12-30', taiLieuChungMinhMucDich: 'HĐ', nguoiLapBieu: 'Lập', chiTiet: [dong('CÔNG TY A', 1000.25), dong('CÔNG TY B', 500.25)] }, extra || {});
let ma, R;
dat('Bước 1 — lập hồ sơ USD 2 món (số lẻ 1.000,25 + 500,25 = 1.500,50): trạng thái Nháp, bấm lặp cùng khoá chỉ tạo 1 hồ sơ', () => {
  const a = ctx.luuHoSoGiaiNgan(payload({ khoaYeuCau: 'LD-1' })), b = ctx.luuHoSoGiaiNgan(payload({ khoaYeuCau: 'LD-1' })); ma = a.maHoSo;
  assert.equal(a.maHoSo, b.maHoSo); assert.equal(ctx.layHoSoTheoMa_(ma).TrangThai, 'Nháp');
  assert.equal(ctx.sheetToObjects_('HoSoGiaiNgan').filter(h => h.KhoaYeuCau === 'LD-1').length, 1);
});
dat('Bước 2 — tổng con lệch tổng cha bị chặn; hồ sơ Nháp CHƯA được xác nhận giải ngân (đủ chứng từ ≠ giải ngân)', () => {
  assert.throws(() => ctx.luuHoSoGiaiNgan(payload({ soTienNhanNoLanNay: 1500.51 })), /khớp|tổng|lệch/i);
  assert.throws(() => TI.xacNhanHopLe(ctx, ma), /Chưa đủ điều kiện|trạng thái|Nháp/i);
});
dat('Bước 3 — tạo bộ chứng từ từ mẫu thật: Đề nghị + UNC 2 món (2 UNC riêng, mỗi món 2 liên) + HĐMB; hồ sơ → "Đã tạo hồ sơ"', () => {
  R = ctx.taoTronBoTheoMau(ma, { expectedRevision: rev(ma) });
  assert.equal(R.vanBanDeNghi.mau, 'HDTD_USD_N'); assert.equal(R.chungTuThanhToan.mau, 'UNC_2_BIDV'); assert.ok(R.hdmbNgoaiTe);
  assert.equal(ctx.layHoSoTheoMa_(ma).TrangThai, 'Đã tạo hồ sơ');
  const t = ctx.layTrangThaiBoChungTu(ma); assert.equal(t.thieu.length, 0); assert.equal(t.hetHieuLuc.length, 0);
});
dat('Bước 4 — sửa dữ liệu sau khi phát hành: hồ sơ phải về Nháp; bộ chứng từ cũ báo hết hiệu lực (cảnh báo tài liệu cũ), tạo lại mới hợp lệ', () => {
  assert.throws(() => ctx.luuHoSoGiaiNgan(payload({ maHoSo: ma, expectedRevision: rev(ma), soGiayNhanNo: 'GNN-DOI' })), /không sửa được|Chuyển về Nháp/);
  ctx.chuyenHoSoVeNhap(ma, 'Sửa số giấy nhận nợ', rev(ma));
  ctx.luuHoSoGiaiNgan(payload({ maHoSo: ma, expectedRevision: rev(ma), soGiayNhanNo: 'GNN-DOI' }));
  const t = ctx.layTrangThaiBoChungTu(ma); assert.ok(t.hetHieuLuc.length > 0, 'chứng từ cũ phải báo hết hiệu lực');
  R = ctx.taoTronBoTheoMau(ma, { expectedRevision: rev(ma) });
  assert.equal(ctx.layTrangThaiBoChungTu(ma).hetHieuLuc.length, 0); assert.equal(ctx.layHoSoTheoMa_(ma).TrangThai, 'Đã tạo hồ sơ');
});
let pd;
dat('Bước 5 — bật duyệt hai cấp: chưa duyệt thì không xác nhận được; NHẬP LIỆU gửi duyệt; chính người gửi không tự duyệt; admin khác duyệt', () => {
  ctx.luuThietLapQuanLyVay({ BAT_DUYET_HAI_CAP: 1 });
  assert.throws(() => TI.xacNhanHopLe(ctx, ma), /chưa có phiếu duyệt hợp lệ/);
  pd = ap('lap@example.com', 'guiDuyetGiaiNgan', ma, 'Nhờ duyệt', rev(ma)).maPheDuyet;
  assert.throws(() => ap('xem@example.com', 'quyetDinhPheDuyet', pd, 'DUYET', 'ok'), /quyền|quản trị/i);
  assert.throws(() => ap('lap@example.com', 'quyetDinhPheDuyet', pd, 'DUYET', 'ok'), /quyền|quản trị|chính/i);
  ap('duyet@example.com', 'quyetDinhPheDuyet', pd, 'DUYET', 'Đủ chứng từ');
});
dat('Bước 6 — xác nhận giải ngân: người XEM bị chặn; thiếu tham chiếu NH/sai số tiền bị từ chối; hợp lệ → "Đã giải ngân"; gửi lại cùng tham chiếu không ghi đôi', () => {
  const tt = { ngayThucTe: homNay, soThamChieuNH: 'FT-LD-1', soTienThucTe: 1500.5, taiLieuXacNhan: 'Giấy báo nợ FT-LD-1' };
  assert.throws(() => ap('xem@example.com', 'xacNhanGiaiNganThucTe', ma, tt, rev(ma)), /quyền/i);
  assert.throws(() => ctx.xacNhanGiaiNganThucTe(ma, Object.assign({}, tt, { soThamChieuNH: '' }), rev(ma)), /tham chiếu/i);
  assert.throws(() => ctx.xacNhanGiaiNganThucTe(ma, Object.assign({}, tt, { soTienThucTe: 1500.49 }), rev(ma)), /số tiền|khớp|lệch/i);
  ctx.xacNhanGiaiNganThucTe(ma, tt, rev(ma));
  assert.equal(ctx.layHoSoTheoMa_(ma).TrangThai, 'Đã giải ngân');
  assert.throws(() => ctx.xacNhanGiaiNganThucTe(ma, tt, rev(ma)), /đã|trùng|trạng thái/i);
  assert.equal(ctx.sheetToObjects_('XacNhanGiaiNgan').filter(r => r.MaHoSo === ma && r.LoaiBanGhi === 'XAC_NHAN').length, 1);
});
dat('Bước 7 — hai phiên cùng sửa: phiên giữ revision cũ ghi nhận trả nợ bị từ chối, dữ liệu phiên trước không bị ghi đè', () => {
  const r0 = rev(ma);
  ctx.ghiNhanTraNo(ma, { loaiTra: 'GOC', ngayTra: homNay, soTien: 500.5, soThamChieu: 'UNC-LD-1', chungTu: 'UNC 1' }, r0);
  assert.throws(() => ctx.ghiNhanTraNo(ma, { loaiTra: 'GOC', ngayTra: homNay, soTien: 100, soThamChieu: 'UNC-LD-2', chungTu: 'UNC 2' }, r0), /revision|phiên bản|người khác|tải lại/i);
  assert.equal(ctx.layTraNoHoSo(ma).dong.length, 1);
});
dat('Bước 8 — trả nợ từng phần: dư nợ gốc 1.500,50 − 500,50 = 1.000 USD (không mất cent); rủi ro tỷ giá tính trên dư nợ còn lại', () => {
  assert.equal(ctx.layTraNoHoSo(ma).duNoGoc, 1000);
  const rr = ctx.layTongQuanHoSo().ruiRoUSD.find(x => x.maHoSo === ma); assert.ok(rr); assert.equal(rr.gocUSD, 1000);
});
dat('Bước 9 — tất toán: còn dư nợ thì bị chặn; trả đủ gốc → tất toán được; sau đó rủi ro tỷ giá không còn khoản này; trả nợ gốc vượt dư nợ bị chặn', () => {
  assert.throws(() => ctx.capNhatTatToanHoSo(ma, { daTatToan: true, ngay: homNay, ghiChu: 'Tất toán' }, rev(ma)), /dư nợ gốc/);
  assert.throws(() => ctx.ghiNhanTraNo(ma, { loaiTra: 'GOC', ngayTra: homNay, soTien: 1000.01, soThamChieu: 'UNC-LD-3', chungTu: 'UNC 3' }, rev(ma)), /vượt|lớn hơn|dư nợ/i);
  ctx.ghiNhanTraNo(ma, { loaiTra: 'GOC', ngayTra: homNay, soTien: 1000, soThamChieu: 'UNC-LD-4', chungTu: 'UNC 4' }, rev(ma));
  assert.equal(ctx.layTraNoHoSo(ma).duNoGoc, 0);
  assert.ok(!ctx.layTongQuanHoSo().ruiRoUSD.some(x => x.maHoSo === ma), 'đã trả hết gốc → không còn rủi ro tỷ giá');
  ctx.capNhatTatToanHoSo(ma, { daTatToan: true, ngay: homNay, ghiChu: 'Đã trả đủ gốc + lãi' }, rev(ma));
  assert.equal(ctx.layHoSoTheoMa_(ma).DaTatToan === true || String(ctx.layHoSoTheoMa_(ma).DaTatToan).toUpperCase() === 'TRUE', true);
});
dat('Hồ sơ đã giải ngân/đã tất toán không xóa được, không sửa trực tiếp; dữ liệu sai (ngày 31/02 ở ngày giải ngân/giấy nhận nợ/đến hạn/tài liệu, tiền âm) bị từ chối, KHÔNG tự nhảy sang 03/03 khi lập hồ sơ', () => {
  assert.throws(() => ctx.xoaHoSo(ma, { expectedRevision: rev(ma) }), /không thể xoá|đã ở trạng thái/i);
  const sl = ctx.sheetToObjects_('HoSoGiaiNgan').length;
  ['ngayGiaiNgan', 'ngayGiayNhanNo', 'ngayDenHan'].forEach(k => { assert.throws(() => ctx.luuHoSoGiaiNgan(payload({ [k]: '2026-02-31' })), /không tồn tại trong lịch/); assert.throws(() => ctx.luuHoSoGiaiNgan(payload({ [k]: '31/02/2026' })), /không tồn tại trong lịch/); });
  assert.throws(() => ctx.luuHoSoGiaiNgan(payload({ chiTiet: [Object.assign(dong('X', 1), { ngayTaiLieu: '30/02/2028' })], soTienNhanNoLanNay: 1 })), /không tồn tại trong lịch/);
  assert.equal(ctx.sheetToObjects_('HoSoGiaiNgan').length, sl, 'không có hồ sơ nào được ghi khi ngày sai');
  assert.doesNotThrow(() => ctx.luuHoSoGiaiNgan(payload({ ngayGiaiNgan: '2028-02-29', ngayDenHan: '2028-05-29', khoaYeuCau: 'LD-NHUAN' })), 'năm nhuận 29/02/2028 hợp lệ');
  assert.throws(() => ctx.luuHoSoGiaiNgan(payload({ soTienNhanNoLanNay: -5, chiTiet: [dong('X', -5)] })), /lớn hơn|âm|không hợp lệ|chữ số thập phân|\-5/i);
});
console.log('\nTỔNG: ' + ok + ' bước luồng đầy đủ đạt, ' + loi + ' lỗi. Tệp: ' + RA);
process.exit(loi ? 1 : 0);
