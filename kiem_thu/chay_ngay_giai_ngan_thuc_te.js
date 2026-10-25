// NGÀY GIẢI NGÂN THỰC TẾ ≠ NGÀY TRÊN HỒ SƠ: báo cáo dư nợ theo kỳ/tại ngày phải tính từ ngày THỰC giải ngân (xác nhận ngân hàng), không từ ngày kế hoạch trên hồ sơ;
// hồ sơ lệch ngày được đánh dấu và đối soát cảnh báo. Dữ liệu LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('ngay_gn_thuc_te'), { ctx, G, hopDong, themHoSo, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const sh = (n) => G.boDuLieu.getSheetByName(n), them = (n, o) => { if (!sh(n) && n === 'XacNhanGiaiNgan') ctx.ensureSheet_(ctx.getSS_(), n, ctx.COT_XAC_NHAN_GN_); const s = sh(n); s.g.push(s.g[0].map(k => o[k] ?? '')); };
const hd = hopDong({ soHopDong: 'HD-NG', hanMucVay: 5e12 });
const xn = (ma, hs, ngayTT, tt = ctx.XN_HIEU_LUC, so = 1000000) => them('XacNhanGiaiNgan', { MaXacNhan: ma, MaHoSo: hs, LoaiBanGhi: ctx.XN_LOAI_XAC_NHAN, NgayKeHoach: '', NgayThucTe: ngayTT, SoThamChieuNH: 'REF-' + ma, SoTienThucTe: so, LoaiTien: 'VND', TrangThai: tt });
// A: hồ sơ ghi -10, thực giải ngân -3 (muộn hơn).  B: hồ sơ -10, thực -10 (khớp).  C: hồ sơ -10, chưa có xác nhận hiệu lực (xác nhận bị hủy bỏ) → dùng ngày hồ sơ.
themHoSo({ MaHoSo: 'A', MaHD: hd.maHD, SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: ngay(-10), NgayDenHan: ngay(60) }); xn('XN-A', 'A', ngay(-3));
themHoSo({ MaHoSo: 'B', MaHD: hd.maHD, SoTienNhanNoLanNay: 2000000, NgayGiaiNgan: ngay(-10), NgayDenHan: ngay(60) }); xn('XN-B', 'B', ngay(-10), ctx.XN_HIEU_LUC, 2000000);
themHoSo({ MaHoSo: 'C', MaHD: hd.maHD, SoTienNhanNoLanNay: 4000000, NgayGiaiNgan: ngay(-10), NgayDenHan: ngay(60) }); xn('XN-C', 'C', ngay(-2), ctx.XN_HUY_BO, 4000000);
const bc = (tu, den) => J(ctx.layBaoCaoDuNoTheoKy({ tuNgay: tu, denNgay: den, loaiTien: 'VND' })), dong = (r, ma) => r.rows.find(x => x.maHoSo === ma);
dat('N1. Tại ngày -5: hồ sơ A chưa giải ngân thực tế (thực giải ngân -3) → dư nợ cuối kỳ KHÔNG gồm A; B, C (không có xác nhận hiệu lực → ngày hồ sơ) vẫn có', () => {
  const r = bc(ngay(-6), ngay(-5)); assert.equal(dong(r, 'A'), undefined, 'A không được tính trước ngày thực giải ngân'); assert.equal(dong(r, 'B').cuoiKy, 2000000); assert.equal(dong(r, 'C').cuoiKy, 4000000); assert.equal(r.tong.VND.cuoiKy, 6000000);
});
dat('N2. Kỳ chứa ngày thực giải ngân: A tăng đúng kỳ -4…-2 (không tăng ở kỳ theo ngày hồ sơ), đầu kỳ 0', () => {
  const r = bc(ngay(-4), ngay(-2)), a = dong(r, 'A'); assert.equal(a.tang, 1000000); assert.equal(a.dauKy, 0); assert.equal(a.cuoiKy, 1000000);
  const truoc = bc(ngay(-12), ngay(-8)); assert.equal(dong(truoc, 'A'), undefined); assert.equal(dong(truoc, 'B').tang, 2000000);
});
dat('N3. Hồ sơ lệch ngày được đánh dấu (ngày hồ sơ + ngày thực), hồ sơ khớp/không xác nhận hiệu lực thì không; tổng kỳ có số khoản lệch', () => {
  const r = bc(ngay(-30), ngay(0)), a = dong(r, 'A'); assert.equal(a.lechNgay, true); assert.equal(a.ngayGiaiNgan, ngay(-3)); assert.equal(a.ngayGiaiNganHoSo, ngay(-10));
  assert.equal(dong(r, 'B').lechNgay, false); assert.equal(dong(r, 'C').lechNgay, false); assert.equal(r.soKhoanLechNgay, 1);
});
dat('N4. Đối soát có cảnh báo NGAY_GIAI_NGAN_LECH cho A (chỉ A), không làm tăng tổng lỗi', () => {
  let r = J(ctx.layBaoCaoDoiSoat()); r = r.data || r; const k = r.kiemTra.find(x => x.ma === 'NGAY_GIAI_NGAN_LECH'); assert.ok(k, 'thiếu mục NGAY_GIAI_NGAN_LECH'); assert.equal(k.soLoi, 1); assert.match(JSON.stringify(k.chiTiet || k), /A/);
  assert.equal(k.loai, 'THONG_TIN');
});
dat('N5. Báo cáo chỉ-đọc: không sửa dữ liệu hồ sơ/xác nhận', () => {
  const chup = () => JSON.stringify(['HoSoGiaiNgan', 'XacNhanGiaiNgan'].map(n => sh(n).g)); const t = chup(); bc(ngay(-30), ngay(0)); assert.equal(chup(), t);
});
Q.ket('ngày giải ngân thực tế trong báo cáo dư nợ');
