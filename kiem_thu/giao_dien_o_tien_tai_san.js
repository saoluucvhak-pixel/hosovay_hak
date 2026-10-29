// Ô NHẬP TIỀN ở màn Tài sản & Thế chấp: tự phân cách hàng nghìn NGAY KHI GÕ (giống bảng hiển thị và các màn khác), gửi máy chủ đúng số nguyên, báo lỗi khi gõ sai (Chromium + google.script.run GIẢ LẬP; KHÔNG phải Google thật).
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
(async () => {
  const root = path.join(__dirname, '..'), read = (n) => fs.readFileSync(path.join(root, n + '.html'), 'utf8');
  const html = read('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => read(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAK_BROWSER_PATH });
  try {
    const p = await browser.newPage({ viewport: { width: 1366, height: 900 } }), loi = [];
    p.on('pageerror', (e) => loi.push(e.message)); await p.route('https://fonts.googleapis.com/**', (r) => r.abort()); await p.route('http://tien.test/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://tien.test');
    await p.evaluate(() => {
      laChiXem_ = () => false; document.querySelectorAll('.tab-panel').forEach((e) => e.style.display = 'none'); document.getElementById('tab-taisan').style.display = 'block';
      ts2El('company').innerHTML = '<option value="C1">Hoàng Anh Khôi</option>'; AppDataStore.congTy = [{ MaCty: 'C1', TenCty: 'Hoàng Anh Khôi' }]; AppDataStore.hopDong = [{ MaHD: 'HD01', MaCty: 'C1', SoHopDong: 'HĐ 02/2026' }];
      TS2UI.data = { TS: [{ ma: 'TS-a', ten: 'Máy A', chuSoHuu: 'A', loaiChuSoHuu: 'Cá nhân', diaDiem: 'Kho', nguyenGia: 1250000000, khauHao: 250000000, conLai: 1000000000, trangThai: 'Đang dùng', revision: 1, dangKy: [], baoHiem: null },
        { ma: 'TS-b', ten: 'Máy B', chuSoHuu: 'A', loaiChuSoHuu: 'Cá nhân', diaDiem: 'Kho', nguyenGia: 500000000, khauHao: 0, conLai: 500000000, trangThai: 'Đang dùng', revision: 1, dangKy: [], baoHiem: null }], DK: [], BH: [], cu: [] };
      window.guiDi = []; window.baoLoiGoi = []; ts2Submit = (api, pl) => guiDi.push([api, pl]); const bl = baoLoi; baoLoi = (e) => baoLoiGoi.push(String((e && e.message) || e));
    });
    const val = (sel) => p.locator(sel).inputValue(), go = async (sel, txt) => { await p.locator(sel).fill(''); await p.locator(sel).click(); await p.keyboard.type(txt); };
    // ---- 1) Danh mục tài sản
    await p.evaluate(() => { ts2View('TS'); ts2Edit(); });
    await go('[name=nguyenGia]', '100000000'); assert.equal(await val('[name=nguyenGia]'), '100.000.000', 'gõ liền → tự phân cách');
    await go('[name=khauHao]', '20000000'); assert.equal(await val('[name=khauHao]'), '20.000.000');
    assert.equal(await p.locator('#ts2-remaining').innerText(), '80.000.000', 'giá trị còn lại tính từ ô có phân cách');
    await p.locator('[name=khauHao]').press('Backspace'); assert.equal(await val('[name=khauHao]'), '2.000.000', 'xoá một chữ số, phân cách lại ngay');
    assert.equal(await p.locator('[name=nguyenGia]').getAttribute('type'), 'text'); assert.equal(await p.locator('[name=nguyenGia]').getAttribute('inputmode'), 'numeric');
    await p.locator('[name=ten]').fill('Máy mới'); await p.locator('[name=chuSoHuu]').fill('Cty'); await p.locator('[name=diaDiem]').fill('Kho'); await p.evaluate(() => ts2Save());
    let g = await p.evaluate(() => guiDi.pop()); assert.equal(g[0], 'luuDanhMucTaiSan'); assert.strictEqual(g[1].nguyenGia, 100000000); assert.strictEqual(g[1].khauHao, 2000000); assert.strictEqual(typeof g[1].nguyenGia, 'number');
    // ---- 2) Mở bản ghi có sẵn: hiển thị có phân cách
    await p.evaluate(() => { ts2Edit(0); }); assert.equal(await val('[name=nguyenGia]'), '1.250.000.000'); assert.equal(await val('[name=khauHao]'), '250.000.000'); assert.equal(await p.locator('#ts2-remaining').innerText(), '1.000.000.000');
    // ---- 3) Gõ sai: báo lỗi, không gửi
    await go('[name=nguyenGia]', '12a'); assert.ok(await p.locator('[name=nguyenGia]').evaluate((e) => e.classList.contains('tien-loi')), 'đánh dấu lỗi'); await p.evaluate(() => { guiDi.length = 0; baoLoiGoi.length = 0; ts2Save(); });
    assert.equal(await p.evaluate(() => guiDi.length), 0, 'không gửi khi ô tiền sai'); assert.ok((await p.evaluate(() => baoLoiGoi)).length >= 1, 'có báo lỗi');
    // ---- 4) Đăng ký thế chấp: định giá cả nhóm + từng tài sản
    await p.evaluate(() => { ts2View('DK'); ts2Edit(); });
    await p.locator('[name=maHD]').selectOption('HD01'); await p.locator('[name=soDangKy]').fill('DK/01'); await p.locator('[name=soHDBaoDam]').fill('TC/01'); await p.locator('[name=donViDinhGia]').fill('BIDV'); await p.locator('[name=soChungThu]').fill('CT/01');
    await p.locator('[name=pick_0]').check(); await p.locator('[name=pick_1]').check();
    await go('[name=line_0_giaTriDinhGia]', '700000000'); await go('[name=line_1_giaTriDinhGia]', '300000000'); assert.equal(await val('[name=line_0_giaTriDinhGia]'), '700.000.000'); assert.equal(await val('[name=line_1_giaTriDinhGia]'), '300.000.000');
    await p.evaluate(() => ts2Save()); g = await p.evaluate(() => guiDi.pop()); assert.equal(g[0], 'luuDangKyTheChap'); assert.deepEqual(g[1].chiTiet.map((l) => l.giaTriDinhGia), [700000000, 300000000]); assert.strictEqual(g[1].giaTri, '', 'ô nhóm bị khoá → rỗng');
    await p.locator('[name=cheDo]').selectOption('NHOM'); await go('[name=giaTri]', '1000000000'); assert.equal(await val('[name=giaTri]'), '1.000.000.000'); await p.evaluate(() => ts2Save()); g = await p.evaluate(() => guiDi.pop()); assert.strictEqual(g[1].giaTri, 1000000000);
    // ---- 5) Bảo hiểm: giá trị, số tiền, phí (tự tính hiển thị có phân cách; gõ sửa phí → nhập tay)
    await p.evaluate(() => { ts2View('BH'); ts2Edit(); });
    await p.locator('[name=soHopDong]').fill('BH/01'); await p.locator('[name=congTyBH]').fill('BIC'); await p.locator('[name=pick_0]').check();
    await go('[name=line_0_giaTriTaiSanBH]', '800000000'); assert.equal(await val('[name=line_0_giaTriTaiSanBH]'), '800.000.000'); await go('[name=line_0_soTienBH]', '700000000'); assert.equal(await val('[name=line_0_soTienBH]'), '700.000.000');
    await p.locator('[name=line_0_tyLePhi]').fill('0,2'); assert.equal(await val('[name=line_0_phiBH]'), '1.600.000', 'phí tự tính hiển thị có phân cách'); assert.equal(await p.locator('[name=line_0_cheDoPhi]').inputValue(), 'TU_DONG');
    await go('[name=line_0_phiBH]', '1700000'); assert.equal(await val('[name=line_0_phiBH]'), '1.700.000'); assert.equal(await p.locator('[name=line_0_cheDoPhi]').inputValue(), 'THU_CONG', 'gõ sửa phí → nhập tay');
    assert.match(await p.locator('#ts2-fee-0').innerText(), /1\.600\.000.*100\.000/, 'chênh lệch tính từ ô có phân cách');
    await p.evaluate(() => ts2Save()); g = await p.evaluate(() => guiDi.pop()); const l = g[1].chiTiet[0]; assert.equal(g[0], 'luuBaoHiemDanhMuc'); assert.strictEqual(l.giaTriTaiSanBH, 800000000); assert.strictEqual(l.soTienBH, 700000000); assert.strictEqual(l.phiBH, 1700000); assert.equal(l.cheDoPhi, 'THU_CONG');
    // ---- 6) Bảo hiểm BHXH nhập tay (Hồ sơ đính kèm): cùng cách gõ có phân cách
    await p.evaluate(() => { document.querySelectorAll('.tab-panel').forEach((e) => e.style.display = 'none'); document.getElementById('tab-dinhkem').style.display = 'block'; for (let e = document.getElementById('bhn_muc').parentElement; e && e !== document.body; e = e.parentElement) { if (getComputedStyle(e).display === 'none') e.style.display = 'block'; if (e.tagName === 'DETAILS') e.open = true; } });
    for (const [id, txt, kq] of [['bhn_muc', '200000000', '200.000.000'], ['bhn_dn', '43000000', '43.000.000'], ['bhn_nld', '21000000', '21.000.000']]) { await go('#' + id, txt); assert.equal(await val('#' + id), kq, id + ' tự phân cách khi gõ'); }
    assert.deepEqual(loi, [], 'không lỗi JS: ' + loi.join('|'));
    console.log('PASS ô tiền Tài sản & Thế chấp: gõ liền → phân cách ngay, hiển thị bản ghi có sẵn, gửi số nguyên, báo lỗi khi gõ sai, phí tự tính/nhập tay');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
