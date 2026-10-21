// Tài khoản trích nợ theo từng món (UNC): mặc định công ty; có thể nhập số khác hoặc để trống.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_tk_trich_no_mon');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx } = TI(root, out);
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };

// 1. Chuẩn hoá: mặc định là CONG_TY; KHAC phải có số; TRONG bỏ số
assert.deepEqual(JSON.parse(JSON.stringify(ctx.chuanHoaTkTrichNo_({}, 1))), { che: 'CONG_TY', so: '' });
assert.throws(() => ctx.chuanHoaTkTrichNo_({ tkTrichNoCheDo: 'KHAC', tkTrichNo: '' }, 1), /phải nhập/);
assert.throws(() => ctx.chuanHoaTkTrichNo_({ tkTrichNoCheDo: 'KHAC', tkTrichNo: '12' }, 1), /không hợp lệ/);
assert.throws(() => ctx.chuanHoaTkTrichNo_({ tkTrichNoCheDo: 'LA' }, 1), /không hợp lệ/);
assert.deepEqual(JSON.parse(JSON.stringify(ctx.chuanHoaTkTrichNo_({ tkTrichNoCheDo: 'TRONG', tkTrichNo: '0099' }, 1))), { che: 'TRONG', so: '' });
assert.deepEqual(JSON.parse(JSON.stringify(ctx.chuanHoaTkTrichNo_({ tkTrichNoCheDo: 'khac', tkTrichNo: ' 0011 2233 ' }, 1))), { che: 'KHAC', so: '00112233' });
dat('Chuẩn hoá: mặc định công ty; "Số khác" bắt buộc có số hợp lệ; "Để trống" bỏ số; giữ số 0 đầu');

// 2. Ánh xạ theo món trong UNC hai món
const ct = { TaiKhoanVND: '000111222333', TaiKhoanUSD: '000444555666' };
assert.equal(ctx.taiKhoanTrichNoMon_({}, 'VND', ct), '000111222333');
assert.equal(ctx.taiKhoanTrichNoMon_({}, 'USD', ct), '000444555666');
assert.equal(ctx.taiKhoanTrichNoMon_({ TkTrichNoCheDo: 'KHAC', TkTrichNo: '0099887766' }, 'VND', ct), '0099887766');
assert.equal(ctx.taiKhoanTrichNoMon_({ TkTrichNoCheDo: 'TRONG' }, 'VND', ct), '');
dat('Ánh xạ: công ty theo loại tiền; "Số khác" dùng số nhập; "Để trống" ra chuỗi rỗng');

// 3. UNC thật hai món: món 1 để trống, món 2 nhập số khác
const two = ctx.layDuLieuThuNghiem_('USD', 2);
Object.assign(two.hoSo, { PhienBanTien: 2, SoTienNhanNoLanNay: 200.5, USDBan: 100.25, VNDThucNhan: 2506250, TyGiaBan: 25000, SoTienBangChu: ctx.soTienUSDBangChu_(200.5) });
two.chiTiet[0].TkTrichNoCheDo = 'TRONG';
two.chiTiet[1].TkTrichNoCheDo = 'KHAC'; two.chiTiet[1].TkTrichNo = '0099887766';
const mon = ctx.taoBienDayDu_(two);
assert.equal(mon['MON_1.TAI_KHOAN_TRICH_NO'], '');
assert.equal(mon['MON_2.TAI_KHOAN_TRICH_NO'], '0099887766');
dat('UNC hai món: món 1 để trống, món 2 dùng số khác');

console.log('\nTỔNG: ' + ok + ' kiểm tra tài khoản trích nợ theo món đạt, 0 lỗi');
