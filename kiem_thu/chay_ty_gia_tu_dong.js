// Kiểm thử phân tích tỷ giá Vietcombank và ghi tự động (không gọi mạng; mẫu XML là giả định, cần đối chiếu định dạng thật).
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_ty_gia_tu_dong');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };

const mau = '<ExrateList><DateTime>Wed Oct 21 2026</DateTime><Exrate CurrencyCode="EUR" Buy="30,000.00" Transfer="30,100.00" Sell="30,300.00"/><Exrate CurrencyCode="USD" Buy="25,700.00" Transfer="25,730.00" Sell="26,000.00"/></ExrateList>';
assert.equal(ctx.phanTichTyGiaVCB_(mau), 26000);
dat('Đọc đúng giá bán USD từ dòng USD (bỏ qua EUR)');

assert.throws(() => ctx.phanTichTyGiaVCB_('<html>lỗi</html>'), /Không tìm thấy dòng USD/);
assert.throws(() => ctx.phanTichTyGiaVCB_('<ExrateList><Exrate CurrencyCode="USD" Buy="1"/></ExrateList>'), /không có giá bán/);
assert.throws(() => ctx.phanTichTyGiaVCB_('<Exrate CurrencyCode="USD" Sell="99,999,999"/>'), /không hợp lý/);
dat('Định dạng lạ hoặc số vô lý → báo lỗi, không ghi');

const r1 = ctx.ghiTyGiaTuDong_('2026-10-21', 26000);
assert.equal(r1.daCo, false);
const r2 = ctx.ghiTyGiaTuDong_('2026-10-21', 26100);
assert.equal(r2.daCo, true);
const sh = mt.__.boDuLieu.getSheetByName('TyGiaThuCong');
assert.equal(sh.g.length - 1, 1, 'không ghi trùng ngày');
dat('Ghi một dòng cho mỗi ngày, chạy lại không ghi trùng');

console.log('\nTỔNG: ' + ok + ' kiểm tra tỷ giá tự động đạt, 0 lỗi');
