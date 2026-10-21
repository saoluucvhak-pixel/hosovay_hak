// Tài khoản trích nợ của UNC là tùy chọn: để trống vẫn lập được chứng từ.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_tai_khoan_trich_no');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx } = TI(root, out);
// Trống hoàn toàn: không báo thiếu
assert.equal(ctx.kiemTraBatBuoc_({}, [{}], ['MON_1.TAI_KHOAN_TRICH_NO', 'MON_2.TAI_KHOAN_TRICH_NO']).length, 0);
console.log('PASS Tài khoản trích nợ để trống (món 1, món 2): không báo lỗi thiếu');
// Có điền: vẫn được nhận
assert.equal(ctx.kiemTraBatBuoc_({ 'MON_1.TAI_KHOAN_TRICH_NO': '0011223344' }, [{}], ['MON_1.TAI_KHOAN_TRICH_NO']).length, 0);
console.log('PASS Tài khoản trích nợ có điền: được nhận');
console.log('\nTỔNG: 2 kiểm tra tài khoản trích nợ đạt, 0 lỗi');
