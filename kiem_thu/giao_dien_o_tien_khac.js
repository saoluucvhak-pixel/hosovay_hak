// Ô NHẬP TIỀN / TỶ GIÁ ở các màn còn lại (Tất toán: trả nợ & trả gộp, Xác nhận giải ngân, Điều chỉnh giải ngân, bảng đọc nhiều trang, Tỷ giá hồ sơ / Rủi ro / So sánh): tự phân cách hàng nghìn NGAY KHI GÕ,
// và khi gửi máy chủ luôn là SỐ CHUẨN (dấu chấm thập phân, không phân cách nghìn). Chromium + google.script.run GIẢ LẬP; KHÔNG phải Google thật.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
(async () => {
  const root = path.join(__dirname, '..'), read = (n) => fs.readFileSync(path.join(root, n + '.html'), 'utf8');
  const html = read('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => read(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAK_BROWSER_PATH });
  try {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } }), loi = [];
    p.on('pageerror', (e) => loi.push(e.message)); await p.route('https://fonts.googleapis.com/**', (r) => r.abort()); await p.route('http://tien2.test/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://tien2.test');
    await p.evaluate(() => {
      window.goi = []; window.hakRun_ = () => { const px = new Proxy({ withSuccessHandler() { return px; }, withFailureHandler() { return px; } }, { get(t, k) { return t[k] || function (...a) { goi.push([k, a]); return px; }; } }); return px; };
      window.baoLoi = () => {}; window.hienLoading = () => {};
      document.querySelectorAll('.tab-panel').forEach((e) => e.style.display = 'none');
      const e = document.createElement('input'); e.className = 'dnt-o'; e.setAttribute('data-k', 'tongTien'); e.id = 'thu_dnt'; document.body.appendChild(e);
      const f = document.createElement('input'); f.className = 'dnt-o'; f.setAttribute('data-k', 'soHoaDon'); f.id = 'thu_dnt_so'; document.body.appendChild(f);
    });
    const hien = async (id) => { await p.evaluate((id) => { const e = document.getElementById(id); for (let x = e; x && x !== document.body; x = x.parentElement) { if (getComputedStyle(x).display === 'none') x.style.display = 'block'; x.hidden = false; if (x.tagName === 'DETAILS') x.open = true; } document.querySelectorAll('.modal-overlay').forEach((m) => { if (!m.contains(e)) m.style.display = 'none'; }); }, id); };
    const go = async (id, txt) => { await hien(id); await p.locator('#' + id).fill(''); await p.locator('#' + id).click(); await p.keyboard.type(txt); return p.locator('#' + id).inputValue(); };
    // ---- Tất toán: trả nợ VND / USD
    await p.evaluate(() => { TT_SELECTED_ = { maHoSo: 'HS1', revision: 3, loaiTien: 'VND' }; });
    assert.equal(await go('tt_traSoTien', '1234567'), '1.234.567', 'VND: gõ liền → phân cách');
    await p.evaluate(() => { ttEl_('traLoai').value = 'GOC'; ttEl_('traNgay').value = '2026-10-29'; ttEl_('traTC').value = 'REF1'; goi.length = 0; ttGhiTra_(); });
    let g = await p.evaluate(() => goi[0]); assert.equal(g[0], 'ghiNhanTraNo'); assert.equal(g[1][1].soTien, '1234567', 'gửi số chuẩn'); await p.evaluate(() => { TT_SAVING_ = false; });
    await p.evaluate(() => { TT_SELECTED_.loaiTien = 'USD'; });
    assert.equal(await go('tt_traSoTien', '1200,5'), '1.200,5', 'USD: phần thập phân giữ nguyên');
    await p.evaluate(() => { goi.length = 0; ttGhiTra_(); }); g = await p.evaluate(() => goi[0]); assert.equal(g[1][1].soTien, '1200.5', 'USD gửi dấu chấm thập phân'); await p.evaluate(() => { TT_SAVING_ = false; });
    await go('tt_traSoTien', '12a'); await p.evaluate(() => { goi.length = 0; ttGhiTra_(); }); assert.equal(await p.evaluate(() => goi.length), 0, 'gõ sai: không gửi'); assert.ok((await p.locator('#tt_detailStatus').innerText()).length > 0, 'có báo lỗi'); await p.evaluate(() => { TT_SAVING_ = false; });
    // ---- Trả gộp: ô gợi ý phân bổ có phân cách, gửi số chuẩn
    await p.evaluate(() => { TT_SELECTED_.loaiTien = 'VND'; ttEl_('gop').hidden = false; ttEl_('gop').innerHTML = '<input id="tt_gopPhat" value="' + fmtTienLoai_(4932, 'VND') + '"><input id="tt_gopLai" value="' + fmtTienLoai_(1500000, 'VND') + '"><input id="tt_gopGoc" value="' + fmtTienLoai_(98500000, 'VND') + '">'; ttEl_('traSoTien').value = '100.004.932'; ttEl_('traLoai').value = 'GOP'; goi.length = 0; ttGopGhi_(); });
    g = await p.evaluate(() => goi[0]); assert.equal(g[0], 'ghiNhanTraNoGop'); assert.deepEqual(g[1][1].phanBo, { phat: '4932', lai: '1500000', goc: '98500000' }); assert.equal(g[1][1].soTien, '100004932'); await p.evaluate(() => { TT_SAVING_ = false; });
    assert.equal(await go('tt_gopGoc', '98500000'), '98.500.000', 'ô phân bổ gộp cũng phân cách khi gõ');
    // ---- Xác nhận giải ngân
    await p.evaluate(() => { document.getElementById('gn_loaiTien').textContent = 'VND'; MA_HO_SO_DANG_SUA = 'HS1'; });
    assert.equal(await go('gn_soTien', '1500000000'), '1.500.000.000');
    await p.evaluate(() => { ['gn_ngayThucTe', 'gn_soThamChieu', 'gn_taiLieu'].forEach((id) => { document.getElementById(id).value = 'x1234'; }); document.getElementById('gn_ngayThucTe').value = '2026-10-29'; goi.length = 0; GN_TRANG_THAI_ = null; guiXacNhanGiaiNgan(); });
    g = await p.evaluate(() => goi.find((x) => /GiaiNgan/.test(x[0]))); assert.ok(g, 'có gọi máy chủ: ' + JSON.stringify(await p.evaluate(() => goi.map((x) => x[0])))); assert.ok(JSON.stringify(g[1]).includes('"1500000000"'), 'gửi số chuẩn: ' + JSON.stringify(g[1]).slice(0, 300));
    // ---- Điều chỉnh giải ngân (VND theo hồ sơ)
    await p.evaluate(() => { AppDataStore.lay = (m, ma) => ({ LoaiTien: 'VND' }); });
    assert.equal(await go('dc_soTien', '25000000'), '25.000.000');
    // ---- Bảng đọc nhiều trang: ô Tổng tiền phân cách khi gõ; ô khác không đổi
    assert.equal(await go('thu_dnt', '3400000'), '3.400.000'); assert.equal(await go('thu_dnt_so', '0001234'), '0001234', 'số hoá đơn giữ nguyên số 0 đầu, không phân cách');
    // ---- Tỷ giá ở các màn (có phần thập phân)
    for (const id of ['tyGiaBan', 'rr_sell', 'ss_buy', 'ss_sell']) { assert.equal(await go(id, '26145'), '26.145', id + ' phân cách khi gõ'); assert.equal(await go(id, '26145,5'), '26.145,5', id + ' giữ phần thập phân'); }
    assert.deepEqual(loi, [], 'không lỗi JS: ' + loi.join('|'));
    console.log('PASS ô tiền/tỷ giá các màn còn lại: gõ liền → phân cách ngay, gửi máy chủ số chuẩn, gõ sai không gửi');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
