/* Hồi quy: mở ứng dụng từ MENU Google Sheet (showApp) và qua Web App (doGet) đều phải cung cấp ĐỦ biến scriptlet của Index.html
 * (<?= phien ?>, <?= loiDangNhap ?>, <?= baseUrl ?>). Thiếu biến → Apps Script báo "ReferenceError: phien is not defined".
 * Giả lập: mẫu HTML "nghiêm ngặt" — evaluate() ném ReferenceError nếu thiếu bất kỳ biến scriptlet nào. Không phải Google thật. */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const TI = require('./gia_lap_apps_script'); const { ctx } = TI(root, path.join(require('os').tmpdir(), 'hosovay_mo_sheet'));
const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
const bien = Array.from(new Set(Array.from(index.matchAll(/<\?=\s*(\w+)\s*\?>/g)).map(m => m[1])));
let ok = 0; const dat = (t, f) => { f(); ok++; console.log('PASS ' + t); };
let dialog = null;
ctx.HtmlService = {
  createTemplateFromFile(ten) { assert.equal(ten, 'Index'); const t = { evaluate() { bien.forEach(b => { if (!(b in t)) throw new ReferenceError(b + ' is not defined'); }); const o = { vars: Object.assign({}, t), setWidth() { return o; }, setHeight() { return o; }, setTitle() { return o; }, addMetaTag() { return o; }, setXFrameOptionsMode() { return o; } }; return o; } }; return t; },
  createHtmlOutput: (h) => ({ html: h, setTitle() { return this; } }), XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
};
ctx.SpreadsheetApp = Object.assign({}, ctx.SpreadsheetApp, { getUi: () => ({ showModalDialog: (h, t) => { dialog = { h, t }; } }) });
dat('Index.html dùng các biến scriptlet: ' + bien.join(', '), () => assert.ok(bien.includes('phien') && bien.includes('loiDangNhap') && bien.includes('baseUrl')));
dat('Menu Sheet → showApp(): không còn ReferenceError, mở dialog với phiên rỗng', () => { ctx.showApp(); assert.ok(dialog && dialog.h.vars.phien === '' && dialog.h.vars.loiDangNhap === '' && typeof dialog.h.vars.baseUrl === 'string'); });
dat('Web App → doGet() không tham số: đủ biến', () => { const o = ctx.doGet({ parameter: {} }); assert.equal(o.vars.phien, ''); });
console.log('\nTỔNG: ' + ok + ' kiểm tra mở ứng dụng trong Sheet đạt, 0 lỗi');
