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

// Dự phòng: khi Vietcombank lỗi thì dùng GOOGLEFINANCE và ghi rõ nguồn
ctx.UrlFetchApp = { fetch() { throw new Error('mất kết nối'); } };
ctx.layTyGiaGoogleFinance_ = () => 26050;
const kqDuPhong = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(kqDuPhong.nguon, 'GOOGLEFINANCE');
assert.match(String(kqDuPhong.canhBao), /Vietcombank lỗi/);
dat('Vietcombank lỗi → dùng GOOGLEFINANCE, ghi rõ nguồn và cảnh báo');

// Vietcombank đọc được → nguồn Vietcombank
ctx.UrlFetchApp = { fetch() { return { getResponseCode: () => 200, getContentText: () => mau }; } };
const kqVCB = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(kqVCB.nguon, 'Vietcombank');
assert.equal(kqVCB.tyGiaBan, 26000);
dat('Vietcombank đọc được → nguồn Vietcombank, giá bán 26.000');

// Hiển thị: đọc dòng mới nhất kèm nguồn
const hienThi = ctx.layTyGiaHienThi();
assert.ok(hienThi && hienThi.tyGiaBan > 0 && typeof hienThi.nguon === 'string');
dat('Tỷ giá hiển thị đọc được từ sheet, có nguồn');

// Chẩn đoán: đo từng bước, KHÔNG ghi vào sổ tỷ giá (chỉ chạy bước Vietcombank trong giả lập)
const soDongTruoc = mt.__.boDuLieu.getSheetByName('TyGiaThuCong').g.length;
ctx.UrlFetchApp = { fetch() { return { getResponseCode: () => 200, getContentText: () => mau }; } };
const cd1 = ctx.chanDoanTyGiaTuDong({ chiVCB: true });
assert.equal(cd1.vcb.ketQua, 'ĐỌC ĐƯỢC'); assert.equal(cd1.vcb.tyGiaBan, 26000); assert.equal(cd1.vcb.maHttp, 200); assert.equal(cd1.google, null); assert.ok(cd1.vcb.ms >= 0);
ctx.UrlFetchApp = { fetch() { return { getResponseCode: () => 403, getContentText: () => '<html>Access Denied</html>' }; } };
const cd2 = ctx.chanDoanTyGiaTuDong({ chiVCB: true });
assert.match(cd2.vcb.ketQua, /KHÔNG PHÂN TÍCH ĐƯỢC/); assert.equal(cd2.vcb.maHttp, 403); assert.match(cd2.vcb.dauNoiDung, /Access Denied/);
ctx.UrlFetchApp = { fetch() { throw new Error('Timeout'); } };
assert.match(ctx.chanDoanTyGiaTuDong({ chiVCB: true }).vcb.ketQua, /LỖI GỌI: Timeout/);
assert.equal(mt.__.boDuLieu.getSheetByName('TyGiaThuCong').g.length, soDongTruoc, 'chẩn đoán không ghi dữ liệu');
dat('Chẩn đoán tỷ giá: báo mã HTTP/nội dung đầu/kết quả phân tích/thời gian; lỗi gọi và 403 được nêu rõ; không ghi sổ');

console.log('\nTỔNG: ' + ok + ' kiểm tra tỷ giá tự động đạt, 0 lỗi');
