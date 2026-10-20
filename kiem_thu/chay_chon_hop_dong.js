const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'JavaScript.html'), 'utf8');
const start = source.indexOf('  function onChonCongTy(callback)');
const end = source.indexOf('  function chonNguoiLapBieuGoiY', start);
const elements = {
  selCongTy: { value: 'CTY1' }, selHopDong: { innerHTML: '' },
  thongBaoSoHopDong: {}, nguoiLapBieu: {}
};
const context = {
  document: { getElementById: id => elements[id] },
  AppDataStore: { congTy: [{ MaCty: 'CTY1', NguoiLapBieu: 'A' }], hopDong: [] },
  MA_HO_SO_DANG_SUA: '', capNhatHeaderChiTietHoSo_: () => {},
  tinhTrangHopDongClient_: h => String(h.TinhTrang || 'Nháp'),
  esc: v => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const contracts = ['Đang hiệu lực', 'Nháp', 'Hết hiệu lực', 'Đã tất toán', ''].map((TinhTrang, i) => ({
  MaHD: 'HD' + i, SoHopDong: 'HD' + i, TenNganHang: 'BIDV', TinhTrang
}));
context.AppDataStore.hopDong = contracts;
context.onChonCongTy();
assert.match(elements.thongBaoSoHopDong.textContent, /1\/5 hợp đồng có thể chọn/);
assert.equal((elements.selHopDong.innerHTML.match(/ disabled/g) || []).length, 4);
assert.match(elements.selHopDong.innerHTML, /HD4.*Nháp/);
assert.equal(elements.nguoiLapBieu.value, 'A');
context.AppDataStore.hopDong = contracts.slice(1);
context.onChonCongTy();
assert.match(elements.thongBaoSoHopDong.textContent, /0\/4/);
assert.match(elements.thongBaoSoHopDong.textContent, /Hợp đồng vay → Sửa/);
context.MA_HO_SO_DANG_SUA = 'HS1';
context.onChonCongTy();
assert.doesNotMatch(elements.selHopDong.innerHTML, / disabled/);
assert.match(elements.thongBaoSoHopDong.textContent, /4\/4/);
context.AppDataStore.hopDong = [];
context.onChonCongTy();
assert.match(elements.thongBaoSoHopDong.textContent, /Chưa có hợp đồng/);
context.AppDataStore.hopDong = [{ MaHD: '"><script>', SoHopDong: '<script>', TinhTrang: 'Nháp' }];
context.onChonCongTy();
assert.doesNotMatch(elements.selHopDong.innerHTML, /<script>/);
console.log('PASS: 10 contract picker checks');
