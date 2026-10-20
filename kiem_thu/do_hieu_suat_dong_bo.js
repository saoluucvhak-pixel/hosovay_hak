/* BENCHMARK nạp dữ liệu khi mở trang: TRƯỚC (5 lượt gọi + retry-sleep) so với SAU (1 lượt layDuLieuKhoiTao + cache).
 * node kiem_thu/do_hieu_suat_dong_bo.js <thư_mục_mã_nguồn> <truoc|sau> [soHoSo]   — in 1 dòng JSON. Giả lập: số lượt gọi/đọc Range/ms ngủ là số ĐẾM,
 * ms thực chỉ phản ánh Node, KHÔNG phải độ trễ Google. */
const fs = require('fs'), path = require('path');
const GOC = path.resolve(process.argv[2]), CHE_DO = process.argv[3], N = parseInt(process.argv[4] || '0', 10);
const THAM = path.join(__dirname, 'gia_lap_apps_script');
const { ctx, mt } = require(THAM)(GOC, '/tmp/hs_bench_' + CHE_DO + '_' + N);
const dong = (ten, st) => ({ tenNguoiHuong: ten, soTaiKhoan: '9' + st, taiNganHang: 'BIDV', noiDungThanhToan: 'tt', soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' });
ctx.initializeSpreadsheet();
if (N > 0) {
  const cty = ctx.luuCongTy({ tenCty: 'A', maSoThue: '1', nguoiDaiDien: 'A', diaChiTruSo: 'x' });
  const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'H', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 5e9, ngayHopDong: '2026-01-05' });
  for (let i = 0; i < 20; i++) ctx.luuKhachHang({ tenKhachHang: 'KH' + i, soTaiKhoan: '1' + i, taiNganHang: 'B' });
  for (let i = 0; i < N; i++) ctx.luuHoSoGiaiNgan({ maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 0, soTienNhanNoLanNay: 3000, soGiayNhanNo: 'G' + i, ngayGiaiNgan: '2026-09-15', chiTiet: [dong('X', 1000), dong('Y', 2000)] });
}
function do_(f) { mt.__soLanDocRange = 0; mt.__sleep = 0; mt.__sleepMs = 0; const t0 = process.hrtime.bigint(); const r = f(); return { ms: Number(process.hrtime.bigint() - t0) / 1e6, docRange: mt.__soLanDocRange, sleep: mt.__sleep, sleepMs: mt.__sleepMs, bytes: JSON.stringify(r).length }; }
const goi = CHE_DO === 'truoc'
  ? () => ({ luot: 5, kq: [ctx.layNgayHomNay(), ctx.layDanhSachCongTy(), ctx.layDanhSachHopDongDayDu(), ctx.layDanhSachKhachHangDayDu(), ctx.layToanBoHoSoGoc()] })
  : () => ({ luot: 1, kq: ctx.layDuLieuKhoiTao() });
const lanDau = do_(goi), lanHai = do_(goi);
console.log(JSON.stringify({ che_do: CHE_DO, soHoSo: N, lượt_gọi_máy_chủ: CHE_DO === 'truoc' ? 5 : 1, lan_dau: lanDau, lan_hai: lanHai }));
