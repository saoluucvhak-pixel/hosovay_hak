// Kiểm thử tỷ giá tự động bằng GOOGLEFINANCE (giả lập; chưa chạy trên Google thật). Thiết kế KHÔNG CHỜ: không flush/sleep/retry.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_ty_gia_tu_dong');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };
const gio = 3600000, T0 = 1700000000000;

// --- Hàm thuần đánh giá giá trị đọc được ---
let d = ctx.danhGiaTyGiaGoogle_(26150.4, T0, T0 + 5 * 60000);
assert.deepEqual(JSON.parse(JSON.stringify(d)), { trangThai: 'OK', ty: 26150, tuoiPhut: 5 });
assert.equal(ctx.danhGiaTyGiaGoogle_(26150, T0, T0 + 13 * gio).trangThai, 'CU');
assert.equal(ctx.danhGiaTyGiaGoogle_('Loading...', T0, T0 + 3 * 60000).trangThai, 'DANG_TINH');
assert.equal(ctx.danhGiaTyGiaGoogle_('', T0, T0 + 2 * 60000).trangThai, 'DANG_TINH');
assert.equal(ctx.danhGiaTyGiaGoogle_('#N/A', T0, T0 + 30 * 60000).trangThai, 'LOI');
assert.equal(ctx.danhGiaTyGiaGoogle_('#VALUE!', T0, T0 + 2 * gio).trangThai, 'LOI');
assert.equal(ctx.danhGiaTyGiaGoogle_(26150, 0, T0).trangThai, 'CHUA_CHUAN_BI');
assert.equal(ctx.danhGiaTyGiaGoogle_(0, T0, T0 + 20 * 60000).trangThai, 'LOI', 'số 0 không hợp lệ');
assert.equal(ctx.danhGiaTyGiaGoogle_(5, T0, T0 + 20 * 60000).trangThai, 'LOI', 'số vô lý (<1.000)');
assert.equal(ctx.danhGiaTyGiaGoogle_(true, T0, T0 + 20 * 60000).trangThai, 'LOI', 'boolean không phải tỷ giá');
dat('Đánh giá ô GOOGLEFINANCE: OK / cũ (>12 giờ) / đang tính (<10 phút) / lỗi / chưa chuẩn bị; số vô lý bị từ chối');

// --- Ghi tỷ giá ---
const r1 = ctx.ghiTyGiaTuDong_('2026-10-20', 26000);
assert.equal(r1.daCo, false);
const r2 = ctx.ghiTyGiaTuDong_('2026-10-20', 26100);
assert.equal(r2.daCo, true); assert.equal(r2.tyGiaBan, 26000, 'trả đúng giá thực sự được lưu');
const sh = mt.__.boDuLieu.getSheetByName('TyGiaThuCong');
assert.equal(sh.g.length - 1, 1, 'không ghi trùng ngày');
assert.match(String(sh.g[1][2]), /^Tự động: GOOGLEFINANCE/, 'thiếu nguồn → mặc định nguồn Google');
dat('Ghi một dòng cho mỗi ngày; chạy lại không ghi trùng và trả đúng giá đã lưu');

// --- Hàm thật ghi/đọc sheet phụ (mô phỏng Google Sheets: công thức chưa tính xong → getValue trả văn bản) ---
const bayGio0 = Date.now();
ctx.datCongThucTyGiaGoogle_(); // KHÔNG được ném lỗi, không chờ
const shG = mt.__.boDuLieu.getSheetByName('NguonTyGiaGoogle');
assert.match(String(shG.g[0][0]), /^=GOOGLEFINANCE\("CURRENCY:USDVND"\)\+0\*\d+$/); assert.ok(Number(shG.g[0][1]) >= bayGio0);
assert.equal(ctx.docTyGiaGoogle_().trangThai, 'DANG_TINH', 'ngay sau khi ghi công thức: đang tính (văn bản công thức không phải số)');
shG.g[0][0] = 26180.25; // Google tính xong
const dg = ctx.docTyGiaGoogle_(); assert.equal(dg.trangThai, 'OK'); assert.equal(dg.ty, 26180);
dat('Hàm thật: ghi công thức + thời điểm rồi kết thúc; ngay sau đó "đang tính"; khi Google có số thì "OK"');

// --- Luồng trigger: dùng giả lập đọc/ghi ô để kiểm không chờ ---
let chuanBi = 0, docGia = { trangThai: 'CHUA_CHUAN_BI', ty: 0, tuoiPhut: 0 };
ctx.datCongThucTyGiaGoogle_ = () => { chuanBi++; return Date.now(); };
ctx.docTyGiaGoogle_ = () => docGia;
const k1 = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(k1.chuaCapNhat, true); assert.equal(k1.trangThaiGoogle, 'CHUA_CHUAN_BI'); assert.equal(chuanBi, 1, 'chưa chuẩn bị → chuẩn bị ngay cho lần sau');
assert.equal(sh.g.length - 1, 1, 'không ghi gì khi chưa có giá');
docGia = { trangThai: 'DANG_TINH', ty: 0, tuoiPhut: 3 };
const k2 = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(k2.chuaCapNhat, true); assert.match(k2.huongDan, /đang tính/); assert.equal(chuanBi, 1, 'đang tính → KHÔNG ghi đè công thức làm Google tính lại từ đầu');
docGia = { trangThai: 'LOI', ty: 0, tuoiPhut: 90 };
assert.equal(ctx.tuDongCapNhatTyGiaVCB().chuaCapNhat, true); assert.equal(chuanBi, 2);
docGia = { trangThai: 'CU', ty: 26111, tuoiPhut: 900 };
assert.equal(ctx.tuDongCapNhatTyGiaVCB().chuaCapNhat, true); assert.equal(chuanBi, 3); assert.equal(sh.g.length - 1, 1, 'giá cũ không được ghi');
dat('Trigger: chưa có/đang tính/lỗi/quá cũ → không ghi, không chờ; chuẩn bị lại khi cần (không khi đang tính)');
docGia = { trangThai: 'OK', ty: 30000, tuoiPhut: 5 };
const kbt = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(kbt.chuaCapNhat, true); assert.equal(kbt.trangThaiGoogle, 'BAT_THUONG'); assert.equal(sh.g.length - 1, 1, 'giá lệch >5% so với giá gần nhất không được tự ghi');
dat('Giá bất thường (lệch >5% so với tỷ giá gần nhất): không tự ghi, báo rõ lý do');
docGia = { trangThai: 'OK', ty: 26150, tuoiPhut: 20 };
{
  const js = require('fs').readFileSync(path.join(root, 'JavaScript.html'), 'utf8'), a = js.indexOf('function nhanNguonTyGia_'), b = js.indexOf('function taiTyGiaHienThi_');
  const nhan = new Function(js.slice(a, b) + ';return nhanNguonTyGia_;')();
  assert.equal(nhan('Tự động: GOOGLEFINANCE (tỷ giá thị trường Google, không phải giá bán ngân hàng) — chưa đối chiếu với ngân hàng'), 'Google');
  assert.equal(nhan('Nhập tay từ Tổng quan'), 'Nhập tay'); assert.equal(nhan(''), 'Nhập tay'); assert.equal(nhan('Tự động: Vietcombank'), 'VCB');
  assert.match(js, /nhanNguonTyGia_\(r\.nguon\)/, 'nhãn nguồn phải hiện trên thanh bên');
  dat('Thanh bên hiện nhãn nguồn tỷ giá (Google / VCB / Nhập tay)');
}
const k3 = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(k3.tyGiaBan, 26150); assert.match(k3.nguon, /^GOOGLEFINANCE/); assert.equal(k3.daCo, false); assert.equal(sh.g.length - 1, 2);
assert.match(String(sh.g[2][2]), /Tự động: GOOGLEFINANCE .*không phải giá bán ngân hàng/);
dat('Giá Google hợp lệ và mới → ghi tỷ giá hôm nay, ghi rõ nguồn là tỷ giá thị trường');
let goiThem = 0; ctx.docTyGiaGoogle_ = () => { goiThem++; return docGia; };
const k4 = ctx.tuDongCapNhatTyGiaVCB();
assert.equal(goiThem, 0); assert.equal(k4.tyGiaBan, 26150); assert.equal(k4.daCo, true);
dat('Hôm nay đã có tỷ giá → không đọc/chuẩn bị gì thêm');

// --- Làm mới thủ công (quản trị) ---
docGia = { trangThai: 'OK', ty: 26200, tuoiPhut: 2 }; ctx.docTyGiaGoogle_ = () => docGia;
const k5 = ctx.capNhatLaiTyGiaVCB();
assert.equal(k5.tyGiaBan, 26200); assert.equal(k5.capNhatLai, true); assert.equal(sh.g.length - 1, 2, 'cập nhật dòng cũ, không thêm dòng mới');
dat('Làm mới thủ công: cập nhật đúng dòng tự động của hôm nay');
const hdr = sh.g[0]; const dongHomNay = sh.g.find((r, i) => i > 0 && String(r[hdr.indexOf('Ngay')]).slice(0, 10) !== '2026-10-20');
dongHomNay[hdr.indexOf('NguoiGhi')] = 'ketoan@example.com';
assert.throws(() => ctx.capNhatLaiTyGiaVCB(), /nhập tay; không tự ghi đè/);
assert.throws(() => ctx.tuDongCapNhatTyGiaVCB() && ctx.ghiTyGiaTuDong_(ctx.homNayVN_(), 26500, 'x', true), /nhập tay; không tự ghi đè/);
dat('Tỷ giá nhập tay của hôm nay không bị tự động ghi đè');

// --- Hiển thị ---
const hienThi = ctx.layTyGiaHienThi();
assert.ok(hienThi && hienThi.tyGiaBan > 0 && typeof hienThi.nguon === 'string');
dat('Tỷ giá hiển thị đọc được từ sheet, có nguồn');

// --- Lịch ---
const trig = []; ctx.ScriptApp = { getProjectTriggers: () => [{ getHandlerFunction: () => 'tuDongCapNhatTyGiaVCB' }, { getHandlerFunction: () => 'khac' }], deleteTrigger: (t) => trig.push('xoa:' + t.getHandlerFunction()),
  newTrigger: (h) => ({ timeBased: () => ({ everyDays: () => ({ atHour: (g) => ({ create: () => trig.push('tao:' + h + '@' + g) }) }) }) }) };
ctx.taoLichTuDongTyGia();
assert.deepEqual(Array.from(trig), ['xoa:tuDongCapNhatTyGiaVCB', 'tao:chuanBiTyGiaGoogle@8', 'tao:tuDongCapNhatTyGiaVCB@9']);
dat('Lịch: thay trigger cũ bằng 2 trigger (8h chuẩn bị, 9h ghi), không đụng trigger khác');
console.log('\nTỔNG: ' + ok + ' kiểm tra tỷ giá tự động (Google) đạt, 0 lỗi');
