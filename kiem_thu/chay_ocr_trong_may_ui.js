// OCR trong máy (Tesseract.js) trên trình duyệt thật; Tesseract, pdf.js và máy chủ đều giả lập — không tải gói ngôn ngữ, không tài liệu thật.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const inc = n => fs.readFileSync(path.join(root, n + '.html'), 'utf8');
const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* isolated QA */');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  try {
    const p = await browser.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort());
    await p.route('https://cdn.jsdelivr.net/**', r => r.abort()); // không bao giờ tải Tesseract thật trong kiểm thử
    await p.route('http://ocr.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://ocr.test');
    await p.evaluate(() => {
      window.calls = []; window.tess = 0; window.waits = []; window.gioiHan = true;
      const timer = window.setTimeout.bind(window);
      window.setTimeout = (f, ms) => { if (ms >= 2000) { waits.push(ms); return timer(f, 0); } return timer(f, ms); };
      window.Tesseract = { createWorker: () => Promise.resolve({ recognize: () => { tess++; return Promise.resolve({ data: { text: 'HÓA ĐƠN TRANG MÁY', confidence: 82 } }); } }) };
      window.pdfjsLib = { getDocument: () => ({ promise: Promise.resolve({ numPages: 2, getPage: () => Promise.resolve({ getTextContent: () => Promise.resolve({ items: [] }), getViewport: ({ scale }) => ({ width: 100 * scale, height: 100 * scale }), render: () => ({ promise: Promise.resolve() }) }) }) }) };
      window.hakRun_ = () => { let ok; const x = { withSuccessHandler(f) { ok = f; return x; }, withFailureHandler() { return x; },
        docTrangTaiLieu(t) { calls.push({ so: t.soTrang, anh: !!t.anhBase64 });
          timer(() => ok(!t.anhBase64 ? { soTrang: t.soTrang, nguon: 'TRONG', vanBan: '', loi: 'Trang không có ảnh để OCR.' }
            : t.soTrang === 2 && gioiHan ? { soTrang: 2, nguon: 'LOI', gioiHan: true, thuLai: true, loi: 'Google đang giới hạn số lần OCR.' }
            : { soTrang: t.soTrang, nguon: 'OCR', vanBan: 'GOOGLE' + t.soTrang, diem: 60 }), 0); },
        gomChungTuTuTrang(ds) { window.gom = ds; timer(() => ok({ chungTu: ds.map(d => ({ trangTu: d.soTrang, trangDen: d.soTrang, tongTien: 100, tinCay: 'CAO', canhBao: [] })) }), 0); } }; return x; };
      window.chay = (cd) => { window.gom = undefined; calls = []; tess = 0; waits = []; try { localStorage.setItem('hak_che_do_ocr', cd); } catch (e) { /* bỏ qua */ }
        docTepNhieuTrang_(new File(['x'], 'test.pdf', { type: 'application/pdf' }), 'HS-TEST', () => {}); };
    });

    // 1. Chỉ trong máy: máy chủ chỉ nhận lớp chữ (không ảnh → không gọi Google OCR), ảnh trang đọc bằng Tesseract
    await p.evaluate(() => chay('MAY')); await p.waitForFunction(() => window.gom);
    let r = await p.evaluate(() => ({ calls, tess, gom: gom.map(g => [g.soTrang, g.vanBan]), nguon: DNT_.chungTu.map(c => c.nguonDoc), chon: DNT_.cheDo, sel: document.getElementById('dnt_cheDo').value }));
    assert.deepEqual(r.calls, [{ so: 1, anh: false }, { so: 2, anh: false }], 'không gửi ảnh lên máy chủ: ' + JSON.stringify(r.calls));
    assert.equal(r.tess, 2); assert.deepEqual(r.gom, [[1, 'HÓA ĐƠN TRANG MÁY'], [2, 'HÓA ĐƠN TRANG MÁY']]);
    assert.deepEqual(r.nguon, ['OCR_TRONG_MAY', 'OCR_TRONG_MAY']); assert.equal(r.sel, 'MAY', 'nhớ lựa chọn');
    await p.evaluate(() => dongDocNhieuTrang_());

    // 2. Tự động: Google đọc trang 1; trang 2 bị giới hạn → đọc ngay trong máy, KHÔNG chờ
    await p.evaluate(() => chay('TU_DONG')); await p.waitForFunction(() => window.gom);
    r = await p.evaluate(() => ({ calls, tess, waits: waits.filter(w => w >= 15000), gom: DNT_.chungTu.map(c => [c.trangTu, c.nguonDoc]) }));
    assert.deepEqual(r.gom, [[1, 'OCR'], [2, 'OCR_TRONG_MAY']]); assert.equal(r.tess, 1); assert.deepEqual(r.waits, [], 'không chờ giới hạn');
    assert.deepEqual(r.calls.map(c => c.so), [1, 2]);
    await p.evaluate(() => dongDocNhieuTrang_());

    // 3. Tự động nhưng không tải được Tesseract → quay về nhịp chờ của Google, đọc được khi hết giới hạn
    await p.evaluate(() => { TESS_WORKER_ = null; window.Tesseract = { createWorker: () => Promise.reject(new Error('mất mạng')) }; window.setTimeout = ((t) => (f, ms) => { if (ms >= 2000) waits.push(ms); if (ms >= 15000) gioiHan = false; return t(f, ms >= 2000 ? 0 : ms); })(window.setTimeout); chay('TU_DONG'); });
    await p.waitForFunction(() => window.gom);
    r = await p.evaluate(() => ({ waits: waits.filter(w => w >= 15000).length, gom: DNT_.chungTu.map(c => [c.trangTu, c.nguonDoc]) }));
    assert.ok(r.waits >= 1, 'chờ theo nhịp Google khi Tesseract lỗi ' + JSON.stringify(r)); assert.deepEqual(r.gom, [[1, 'OCR'], [2, 'OCR']]);
    assert.deepEqual(errors, []);
    console.log('PASS OCR trong máy: chỉ-trong-máy không gửi ảnh lên Google, tự động chuyển sang Tesseract khi bị giới hạn (không chờ), Tesseract lỗi thì quay về nhịp chờ Google, nhớ lựa chọn');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
