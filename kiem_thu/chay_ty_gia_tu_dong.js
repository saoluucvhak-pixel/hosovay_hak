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

const r1 = ctx.ghiTyGiaTuDong_('2026-10-20', 26000);
assert.equal(r1.daCo, false);
const r2 = ctx.ghiTyGiaTuDong_('2026-10-20', 26100);
assert.equal(r2.daCo, true); assert.equal(r2.tyGiaBan, 26000, 'trả đúng giá thực sự được lưu, không phải giá mới');
const sh = mt.__.boDuLieu.getSheetByName('TyGiaThuCong');
assert.equal(sh.g.length - 1, 1, 'không ghi trùng ngày');
assert.match(String(sh.g[1][2]), /^Tự động: Vietcombank$/, 'thiếu nguồn → mặc định Vietcombank, không ghi "undefined"');
dat('Ghi một dòng cho mỗi ngày, chạy lại không ghi trùng và trả đúng giá đã lưu');

// Dự phòng: khi Vietcombank lỗi thì dùng GOOGLEFINANCE và ghi rõ nguồn (hôm nay chưa có tỷ giá)
ctx.UrlFetchApp = { fetch() { throw new Error('mất kết nối'); } };
ctx.layTyGiaGoogleFinance_ = () => 26050;
const kqDuPhong = ctx.tuDongCapNhatTyGiaVCB();
assert.match(kqDuPhong.nguon, /^GOOGLEFINANCE/);
assert.match(String(kqDuPhong.canhBao), /Vietcombank lỗi/);
assert.ok(kqDuPhong.thoiGian && kqDuPhong.thoiGian.tongMs >= 0 && 'vcbMs' in kqDuPhong.thoiGian && 'googleMs' in kqDuPhong.thoiGian, 'ghi thời gian từng bước');
dat('Vietcombank lỗi → dùng GOOGLEFINANCE, ghi rõ nguồn, cảnh báo và thời gian từng bước');

// Hôm nay đã có tỷ giá → trigger KHÔNG gọi lại mạng
let soLanGoi = 0; ctx.UrlFetchApp = { fetch() { soLanGoi++; return { getResponseCode: () => 200, getContentText: () => mau }; } };
const kqCache = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(soLanGoi, 0); assert.equal(kqCache.tyGiaBan, 26050); assert.equal(kqCache.daCo, true);
dat('Đã có tỷ giá hôm nay → không gọi Vietcombank/Google lần nữa');

// Làm mới thủ công (quản trị): ghi đè dòng TỰ ĐỘNG của hôm nay bằng giá Vietcombank
const kqLamMoi = ctx.capNhatLaiTyGiaVCB();
assert.equal(soLanGoi, 1); assert.equal(kqLamMoi.nguon, 'Vietcombank'); assert.equal(kqLamMoi.tyGiaBan, 26000); assert.equal(kqLamMoi.capNhatLai, true);
assert.equal(sh.g.length - 1, 2, 'cập nhật dòng cũ, không thêm dòng mới');
dat('Làm mới thủ công: cập nhật đúng dòng tự động của hôm nay, không tạo dòng trùng');

// Tỷ giá NHẬP TAY của hôm nay không bị ghi đè
const hdr = sh.g[0]; const dongHomNay = sh.g.find((r, i) => i > 0 && r[hdr.indexOf('NguoiGhi')] === 'TU_DONG' && String(r[hdr.indexOf('Ngay')]).slice(0, 10) !== '2026-10-20');
dongHomNay[hdr.indexOf('NguoiGhi')] = 'ketoan@example.com';
assert.throws(() => ctx.capNhatLaiTyGiaVCB(), /nhập tay; không tự ghi đè/);
assert.throws(() => ctx.tuDongCapNhatTyGiaVCB() && ctx.ghiTyGiaTuDong_(ctx.homNayVN_(), 26500, 'Vietcombank', true), /nhập tay; không tự ghi đè/);
dat('Tỷ giá nhập tay của hôm nay không bị tự động ghi đè');

// Hiển thị: đọc dòng mới nhất kèm nguồn
const hienThi = ctx.layTyGiaHienThi();
assert.ok(hienThi && hienThi.tyGiaBan > 0 && typeof hienThi.nguon === 'string');
dat('Tỷ giá hiển thị đọc được từ sheet, có nguồn');

console.log('\nTỔNG: ' + ok + ' kiểm tra tỷ giá tự động đạt, 0 lỗi');
