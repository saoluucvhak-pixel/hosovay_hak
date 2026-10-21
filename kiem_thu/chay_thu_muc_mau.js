// Kiểm thử link thư mục mẫu văn bản (TEMPLATESERVICE.gs) và đăng ký API (PHIEN.gs).
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_thu_muc_mau');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
mt.__email = 'ketoan@example.com';
const r = ctx.layLinkThuMucMauVanBan();
assert.equal(r.ten, 'MauVanBan');
assert.ok(/^https?:\/\//.test(r.url) || r.url.length > 0);
console.log('PASS Mở được thư mục MauVanBan (tên: ' + r.ten + ')');
const phien = require('fs').readFileSync(path.join(root, 'PHIEN.gs'), 'utf8');
assert.ok(/layLinkThuMucMauVanBan/.test(phien));
console.log('PASS Đã đăng ký layLinkThuMucMauVanBan trong danh sách API');
console.log('\nTỔNG: 2 kiểm tra thư mục mẫu đạt, 0 lỗi');
