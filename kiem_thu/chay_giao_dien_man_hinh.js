// GIAO DIỆN: mọi màn hình chính không tràn ngang trang ở 360/390/768/1366 px, chế độ sáng và tối; bảng rộng phải cuộn TRONG khung.
// Chromium + google.script.run GIẢ LẬP với dữ liệu mẫu (không phải Google thật). Ảnh chụp: HAK_ANH_DIR (mặc định không chụp).
const fs = require('fs'), path = require('path');
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  const { DL: DL0 } = require('./_du_lieu_giao_dien'); const DL = Object.assign({ layDanhMucPlaceholder: { chung: [], dong: [] } }, DL0);
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA: không có Chromium'); process.exit(0); }
  const TABS = ['tongquan', 'hopdong', 'khachhang', 'congty', 'hoso', 'qlvay', 'tattoan', 'baocao', 'caidat', 'huongdan', 'tygia', 'dinhkem', 'sosanh'];
  const anh = process.env.HAK_ANH_DIR; if (anh) fs.mkdirSync(anh, { recursive: true });
  let loiTest = 0, soKiemTra = 0; const hong = [];
  try {
    for (const scheme of ['light', 'dark']) for (const w of [360, 390, 768, 1366]) {
      const c = await b.newContext({ viewport: { width: w, height: 800 }, colorScheme: scheme });
      await c.route('https://fonts.googleapis.com/**', r => r.abort()); await c.route('http://mh.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
      await c.addInitScript((d) => { window.__DL = d; window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; }, DL);
      const pg = await c.newPage(); const loiJs = []; pg.on('pageerror', e => loiJs.push(e.message));
      await pg.goto('http://mh.test/'); await pg.waitForTimeout(150);
      await pg.evaluate(() => {
        window.hakRun_ = function () { let ok, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } };
          px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return (...a) => { setTimeout(() => { let v = window.__DL[ten]; if (typeof v === 'undefined') v = null; if (ok) ok(JSON.parse(JSON.stringify(v))); }, 0); }; } }); return px; };
        window.confirm = () => true; window.hoiXacNhan = (m, f) => f(); window.baoLoi = () => {};
        AppDataStore.tongQuan = window.__DL.layTongQuanHoSo; AppDataStore.congTy = window.__DL.layDanhSachCongTy; AppDataStore.hopDong = window.__DL.layDanhSachHopDongDayDu;
        if (typeof renderTongQuan_ === 'function') renderTongQuan_();
      });
      for (const t of TABS) {
        await pg.evaluate((t) => { try { chuyenTabKhongKiem_(t); } catch (e) { window.__loi = String(e.message); } }, t); await pg.waitForTimeout(120);
        const r = await pg.evaluate(() => { const W = window.innerWidth, d = document.documentElement; let kem = ''; if (d.scrollWidth > W + 1) { const xs = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); if (s.display === 'none' || s.position === 'fixed') return false; const q = e.getBoundingClientRect(); return q.width > 0 && q.right > W + 1; }); kem = xs.slice(0, 3).map(e => e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) + ' R=' + Math.round(e.getBoundingClientRect().right)).join(' ; '); } return { tran: d.scrollWidth - W, kem, loi: window.__loi || '' }; });
        soKiemTra++; if (r.tran > 1) { loiTest++; hong.push(scheme + ' ' + w + 'px tab ' + t + ': tràn ' + r.tran + 'px — ' + r.kem); }
        if (anh && (t === 'tongquan' || t === 'hoso' || t === 'baocao')) await pg.screenshot({ path: path.join(anh, `man_${t}_${w}_${scheme}.png`) });
      }
      if (loiJs.length) { loiTest++; hong.push(scheme + ' ' + w + ': lỗi JS ' + loiJs.slice(0, 2).join(' | ')); }
      await c.close();
    }
  } finally { await b.close(); }
  hong.forEach(h => console.log('FAIL ' + h)); console.log('\nTỔNG: ' + soKiemTra + ' lượt (màn hình × cỡ × sáng/tối) kiểm tràn ngang, ' + loiTest + ' lỗi'); process.exit(loiTest ? 1 : 0);
})();
