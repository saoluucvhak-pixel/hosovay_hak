// Kiểm thử cột số tài khoản luôn là văn bản khi ghi Sheet (DataService.gs): không đổi thành số, giữ số 0 đầu.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_tai_khoan_van_ban');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
mt.__email = 'ketoan@example.com';
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };

// Sheet giả ghi lại từng vùng được đặt định dạng
function shGia() {
  const ghi = [];
  return { ghi, getRange(r, c, n, m) { return { setNumberFormat(f) { ghi.push({ r, c, n: n || 1, m: m || 1, f }); return this; } }; } };
}
const headers = ['MaKH', 'TenKhachHang', 'SoTaiKhoan', 'TaiNganHang', 'TaiKhoanVND', 'TaiKhoanUSD'];

// 1. Cột số tài khoản (SoTaiKhoan, TaiKhoanVND, TaiKhoanUSD) được đặt định dạng văn bản, cột khác thì không
const sh1 = shGia();
ctx.dinhDangVanBanCotTaiKhoan_(sh1, headers, 7, 1);
assert.deepEqual(JSON.parse(JSON.stringify(sh1.ghi)), [
  { r: 7, c: 3, n: 1, m: 1, f: '@' },
  { r: 7, c: 5, n: 1, m: 1, f: '@' },
  { r: 7, c: 6, n: 1, m: 1, f: '@' }
]);
dat('Chỉ cột SoTaiKhoan, TaiKhoanVND, TaiKhoanUSD được đặt định dạng văn bản (@) trước khi ghi');

// 2. Không có dòng nào để ghi → không đặt định dạng
const sh2 = shGia();
ctx.dinhDangVanBanCotTaiKhoan_(sh2, headers, 7, 0);
assert.equal(sh2.ghi.length, 0);
dat('Số dòng = 0 → không đụng vào Sheet');

console.log('\nTỔNG: ' + ok + ' kiểm tra định dạng văn bản cho số tài khoản đạt, 0 lỗi');
