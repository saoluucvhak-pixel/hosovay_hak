// Cấu trúc MENU bên trái: Vận hành / Báo cáo phân tích / Hệ thống / Thông tin liên quan (Chromium + Playwright; bỏ qua nếu thiếu).
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
(async () => {
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA: không có Chromium'); return; }
  let loi = 0; const dat = (t, f) => { try { f(); console.log('PASS ' + t); } catch (e) { loi++; console.log('FAIL ' + t + ' → ' + e.message); } };
  try {
    const p = await b.newPage(); const err = []; p.on('pageerror', e => err.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://menu.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { const P = new Proxy(function () {}, { get: () => P, apply: () => P }); window.google = { script: { run: P } }; });
    await p.goto('http://menu.test');
    const menu = await p.evaluate(() => { const kq = []; let nhom = null; document.querySelector('nav.sidebar').querySelectorAll('.sidebar-label, .sidebar-nav > *').forEach(e => {
      if (e.classList.contains('sidebar-label')) { nhom = { nhom: e.textContent.trim(), muc: [] }; kq.push(nhom); } else nhom.muc.push({ id: e.id, nhan: (e.querySelector('.lbl') || {}).textContent }); }); return kq; });
    const rut = (n) => (menu.find(m => m.nhom === n) || { muc: [] }).muc;
    dat('Thứ tự nhóm menu', () => assert.deepEqual(menu.map(m => m.nhom), ['Tổng quan', 'Danh mục', 'Vận hành', 'Báo cáo phân tích', 'Hệ thống', 'Thông tin liên quan']));
    dat('Vận hành: Hồ sơ, Tất toán khoản vay, Hồ sơ đính kèm, Cập nhật bảo hiểm TSĐB, Cập nhật tỷ giá', () => assert.deepEqual(rut('Vận hành').map(x => [x.id, x.nhan]), [['tabBtn-hoso', 'Hồ sơ giải ngân'], ['tabBtn-tattoan', 'Tất toán khoản vay'], ['tabBtn-dinhkem', 'Hồ sơ đính kèm'], ['tabBtn-capnhatbh', 'Cập nhật bảo hiểm TSĐB'], ['tabBtn-tygia', 'Cập nhật tỷ giá']]));
    dat('Báo cáo phân tích: Báo cáo tiền vay, Quản lý khoản vay, So sánh USD / VND', () => assert.deepEqual(rut('Báo cáo phân tích').map(x => [x.id, x.nhan]), [['tabBtn-baocao', 'Báo cáo tiền vay'], ['tabBtn-qlvay', 'Quản lý khoản vay'], ['tabBtn-sosanh', 'So sánh USD / VND']]));
    dat('Hệ thống: Cài đặt, Hướng dẫn sử dụng', () => assert.deepEqual(rut('Hệ thống').map(x => [x.id, x.nhan]), [['tabBtn-caidat', 'Cài đặt'], ['tabBtn-luongdulieu', 'Luồng dữ liệu'], ['tabBtn-huongdan', 'Hướng dẫn sử dụng']]));
    dat('Thông tin liên quan: Tỷ giá, Ngân hàng tham chiếu', () => assert.deepEqual(rut('Thông tin liên quan').map(x => [x.id, x.nhan]), [['nav-tygia-bidv', 'Tỷ giá hàng ngày'], ['nav-nganhang-thamchieu', 'Ngân hàng tham chiếu']]));
    for (const [id, tab, tieuDe] of [['hoso', 'hoso', 'Hồ sơ giải ngân'], ['tattoan', 'tattoan', null], ['dinhkem', 'dinhkem', null], ['capnhatbh', 'capnhatbh', 'Cập nhật bảo hiểm TSĐB'], ['tygia', 'tygia', null], ['baocao', 'baocao', null], ['qlvay', 'qlvay', 'Quản lý khoản vay'], ['sosanh', 'sosanh', null], ['caidat', 'caidat', null], ['huongdan', 'huongdan', null]]) {
      await p.click('#tabBtn-' + id); await p.waitForTimeout(80);
      const r = await p.evaluate((t) => ({ hien: getComputedStyle(document.getElementById('tab-' + t)).display !== 'none', tieuDe: document.getElementById('pageTitle').textContent, cur: document.getElementById('tabBtn-' + t).getAttribute('aria-current') }), tab);
      dat('Bấm menu ' + id + ' mở đúng màn' + (tieuDe ? ' và tiêu đề "' + tieuDe + '"' : ''), () => { assert.ok(r.hien); if (tieuDe) assert.equal(r.tieuDe, tieuDe); });
    }
    dat('Không lỗi JavaScript', () => assert.deepEqual(err, []));
  } finally { await b.close(); }
  console.log('\nTỔNG: kiểm tra menu — ' + (loi ? loi + ' lỗi' : '0 lỗi')); process.exit(loi ? 1 : 0);
})();
