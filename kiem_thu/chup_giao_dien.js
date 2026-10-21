/* CHỤP ẢNH GIAO DIỆN THẬT trên Chromium (Playwright) với google.script.run GIẢ LẬP (dữ liệu mẫu, KHÔNG phải Google thật).
 * node kiem_thu/chup_giao_dien.js <thư_mục_mã_nguồn> <thư_mục_ảnh> [tiền_tố]
 * Ảnh: sáng/tối × máy tính (1366×800) / màn nhỏ (390×800) cho Tổng quan, Hồ sơ vay (form nhập), Quản lý vay. */
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const goc = path.resolve(process.argv[2] || path.join(__dirname, '..')), out = path.resolve(process.argv[3] || '/tmp/anh_giao_dien'), tt = process.argv[4] || 'anh';
fs.mkdirSync(out, { recursive: true });
const inc = (n) => fs.readFileSync(path.join(goc, n + '.html'), 'utf8');
const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '    /* QA cô lập */');
const { DL } = require('./_du_lieu_giao_dien');
(async () => {
  const b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  const cap = [['sang', 'desktop', 1366, 800, 'light'], ['toi', 'desktop', 1366, 800, 'dark'], ['sang', 'nho', 390, 800, 'light'], ['toi', 'nho', 390, 800, 'dark']];
  const loiJs = [];
  for (const [mau, kich, w, h, scheme] of cap) {
    const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
    await c.route('https://fonts.googleapis.com/**', r => r.abort()); await c.route('http://hak.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await c.addInitScript((d) => { window.__DL = d; window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; }, DL);
    const pg = await c.newPage(); pg.on('pageerror', e => loiJs.push(kich + '/' + mau + ': ' + e.message));
    await pg.goto('http://hak.test/'); await pg.waitForTimeout(200);
    await pg.evaluate(() => {
      window.hakRun_ = function () { let ok, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } };
        px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return (...a) => { setTimeout(() => { let v = window.__DL[ten]; if (typeof v === 'undefined') v = null; if (ok) ok(JSON.parse(JSON.stringify(v))); }, 0); }; } }); return px; };
    });
    const chup = async (ten) => { await pg.waitForTimeout(350); await pg.screenshot({ path: path.join(out, `${tt}_${ten}_${kich}_${mau}.png`), fullPage: false }); };
    await pg.evaluate((d) => { AppDataStore.tongQuan = d.layTongQuanHoSo; AppDataStore.congTy = d.layDanhSachCongTy; AppDataStore.hopDong = d.layDanhSachHopDongDayDu; if (typeof renderTongQuan_ === 'function') renderTongQuan_(); }, DL).catch(e => loiJs.push('tq: ' + e.message));
    await chup('01_tong_quan');
    await pg.evaluate(() => { chuyenTab('hoso'); datNgayLocMacDinh(); apDungLocHoSo_(); }); await chup('02_ho_so_vay');
    await pg.evaluate(() => { onChonCongTy && 0; }); 
    await pg.evaluate(() => chuyenTab('qlvay')); await chup('03_quan_ly_vay');
    await pg.evaluate(() => { chuyenTab('hoso'); AppDataStore.hopDong = []; AppDataStore.daNap = true; try { themMoiHoSoClick('USD'); } catch (e) {} try { onChonCongTy(); } catch (e) {} const el = document.getElementById('selHopDong'); if (el) el.scrollIntoView({ block: 'center' }); }); await chup('04_form_hop_dong_rong');
    await c.close();
  }
  await b.close();
  console.log('Đã chụp ' + fs.readdirSync(out).filter(f => f.startsWith(tt + '_')).length + ' ảnh vào ' + out + (loiJs.length ? '\nLỖI JS: ' + loiJs.slice(0, 5).join(' | ') : '\nKhông có lỗi JS trang.'));
})();
