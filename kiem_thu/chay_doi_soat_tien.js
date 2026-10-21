// Kiểm thử: dòng thụ hưởng vượt số tiền vay phải báo lỗi đọc được (không văng lỗi định dạng), số âm hiển thị đúng dấu.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_doi_soat_tien');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx } = TI(root, out);
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };

assert.equal(ctx.formatSo_(-77639.75), '-77.639,75');
assert.equal(ctx.formatSo_(25000), '25.000');
dat('Số âm hiển thị có dấu trừ (không văng lỗi định dạng)');

let msg = '';
try {
  ctx.kiemTraTienChaCon_({ phienBanTien: 2, loaiTien: 'USD', tyGiaBan: 25000, soTienNhanNoLanNay: 100000, usdBan: 0, duNoHienTai: 100000,
    chiTiet: [{ soTien: 177639.75, loaiTien: 'USD', maChiTiet: 'CT1' }] }, true);
} catch (e) { msg = e.message; }
assert.ok(/vượt số tiền vay 77\.639,75 USD/.test(msg), 'thông báo phải nói rõ chênh lệch: ' + msg);
assert.ok(!/chỉ nhận tối đa 2 chữ số/.test(msg), 'không còn thông báo định dạng gây nhầm');
dat('Dòng thụ hưởng vượt số tiền vay: báo "vượt ... 77.639,75 USD" thay vì lỗi định dạng');

console.log('\nTỔNG: ' + ok + ' kiểm tra đối soát tiền đạt, 0 lỗi');
