// Đổi tài khoản trích nợ làm dấu vân tay dữ liệu chứng từ đổi (chứng từ cũ hết hiệu lực).
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_hash_tk_trich_no');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx } = TI(root, out);
const base = () => {
  const d = ctx.layDuLieuThuNghiem_('VND', 2);
  d.chiTiet[0].TkTrichNoCheDo = 'CONG_TY';
  d.chiTiet[1].TkTrichNoCheDo = 'KHAC'; d.chiTiet[1].TkTrichNo = '001111';
  return d;
};
const h0 = ctx.hashDuLieuHoSo_(base());
let ok = 0;
const kh = (t) => { ok++; console.log('PASS ' + t); };

const d1 = base(); d1.chiTiet[1].TkTrichNo = '009999';
assert.notEqual(ctx.hashDuLieuHoSo_(d1), h0);
kh('Đổi số khác 001111 → 009999 làm đổi dấu vân tay');

const d2 = base(); d2.chiTiet[1].TkTrichNoCheDo = 'TRONG'; d2.chiTiet[1].TkTrichNo = '';
assert.notEqual(ctx.hashDuLieuHoSo_(d2), h0);
kh('Đổi sang "Để trống" làm đổi dấu vân tay');

const d3 = base(); d3.congTy.TaiKhoanVND = '000999888777';
assert.notEqual(ctx.hashDuLieuHoSo_(d3), h0);
kh('Đổi tài khoản VND của công ty làm đổi dấu vân tay');

assert.equal(ctx.hashDuLieuHoSo_(base()), h0);
kh('Dữ liệu không đổi: dấu vân tay giữ nguyên (chống tạo trùng vẫn hoạt động)');
console.log('\nTỔNG: ' + ok + ' kiểm tra dấu vân tay tài khoản trích nợ đạt, 0 lỗi');
