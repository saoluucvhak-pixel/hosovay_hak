const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const c = {};
vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../Tien.gs'), 'utf8'), c);
for (const [a, b, expected] of [
  [0, 999999983, 999999983], [999999983, 0, 999999983],
  [0, -999999983, -999999983], [999999983, -999999983, 0],
  [0.1, 0.2, 0.3], [39123.63, -0.01, 39123.62],
  [0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
]) assert.strictEqual(c.congSoTien_(a, b), expected);
const p = {loaiTien:'USD', soTienNhanNoLanNay:39123.63, duNoHienTai:0,
  usdBan:39123.63, tyGiaBan:25560, vndThucNhan:999999983,
  chiTiet:[{loaiTien:'VND', soTien:999999983}]};
assert.doesNotThrow(() => c.kiemTraTienChaCon_(p, true));
assert.doesNotThrow(() => c.kiemTraTienChaCon_({...p,
  chiTiet:[{loaiTien:'VND',soTien:500000000},{loaiTien:'VND',soTien:499999983}]}, true));
assert.throws(() => c.kiemTraTienChaCon_({...p,chiTiet:[
  {loaiTien:'VND',soTien:Number.MAX_SAFE_INTEGER},{loaiTien:'VND',soTien:1}]},false), /giới hạn an toàn/);
console.log('PASS: exact money addition, screenshot payload, split payments and overflow guard');
