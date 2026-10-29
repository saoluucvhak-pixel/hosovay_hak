// GIAO DIỆN thẻ BẢO HIỂM trên Tổng quan (danh mục mới): hiển thị, ẩn khi rỗng, không tràn ngang ở 4 cỡ × sáng/tối (Chromium + google.script.run GIẢ LẬP; KHÔNG phải Google thật).
// Ảnh chụp (MÔ PHỎNG) lưu ở HAK_ANH_DIR (mặc định: thư mục tạm).
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
(async () => {
  const root = path.join(__dirname, '..'), read = (n) => fs.readFileSync(path.join(root, n + '.html'), 'utf8'), anh = process.env.HAK_ANH_DIR || path.join(os.tmpdir(), 'hosovay_anh_tq_bh');
  fs.mkdirSync(anh, { recursive: true });
  const html = read('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => read(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAK_BROWSER_PATH });
  const DU_LIEU = { soHopDong: 3, soTaiSanCan: 8, dem: { DANG_BAO_HIEM: 4, SAP_HET: 2, QUA_HAN: 1, KHOANG_TRONG: 0, CHUA_BAT_DAU: 0, CHUA_BAO_HIEM: 1 }, tongCanChuY: 4, tongPhi: 12500000, tongTienBH: 5200000000, tongGiaTriBH: 6000000000, tyLeBaoHiem: 86.7, nguongNgay: 15,
    canChuY: [{ maTS: 'TS-a1', ten: 'Nhà xưởng KCN <b>x</b>', maHD: 'HD01', soHopDong: 'HĐ 02/2026', soDangKy: 'DK/01', muc: 'CHUA_BAO_HIEM', han: '', ngayBatDau: '', soNgay: null },
      { maTS: 'TS-a2', ten: 'Xe tải 5 tấn', maHD: 'HD01', soHopDong: 'HĐ 02/2026', soDangKy: 'DK/01', muc: 'QUA_HAN', han: '2026-10-20', ngayBatDau: '', soNgay: -9 },
      { maTS: 'TS-a3', ten: 'Máy ép', maHD: 'HD02', soHopDong: 'HĐ 05/2026', soDangKy: 'DK/02', muc: 'SAP_HET', han: '2026-11-05', ngayBatDau: '', soNgay: 7 },
      { maTS: 'TS-a4', ten: 'Kho lạnh', maHD: '', soHopDong: '', soDangKy: '', muc: 'SAP_HET', han: '2026-11-10', ngayBatDau: '', soNgay: 12 }] };
  try {
    for (const theme of ['light', 'dark']) for (const w of [390, 768, 1024, 1366]) {
      const p = await browser.newPage({ viewport: { width: w, height: 900 } }), loi = [];
      p.on('pageerror', (e) => loi.push(e.message)); await p.route('https://fonts.googleapis.com/**', (r) => r.abort()); await p.route('http://tq.test/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
      await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
      await p.goto('http://tq.test'); await p.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); document.querySelectorAll('.tab-panel').forEach((e) => e.style.display = 'none'); document.getElementById('tab-tongquan').style.display = 'block'; }, theme);
      await p.evaluate((d) => { veBaoHiemTongQuan_({ baoHiem: d }); }, DU_LIEU);
      const x = await p.evaluate(() => ({ hien: getComputedStyle(el_('tq_baoHiem')).display !== 'none', the: el_('tq_bh_kpi').children.length, khuc: el_('tq_bh_bar').children.length, dong: el_('tq_bh_ds').querySelectorAll('li').length, nut: el_('tq_bh_ds').querySelectorAll('button').length, thoat: !!el_('tq_bh_ds').querySelector('b > b'), tom: el_('tq_bh_tom').textContent, tien: el_('tq_bh_tien').textContent, rong: document.documentElement.scrollWidth - document.documentElement.clientWidth, khung: (() => { const r = el_('tq_baoHiem').getBoundingClientRect(); return r.right - innerWidth; })() }));
      assert.equal(x.hien, true); assert.equal(x.the, 5); assert.equal(x.khuc, 4);
      assert.equal(x.dong, 4); assert.equal(x.nut, 3, 'chỉ dòng có mã hợp đồng vay mới có nút mở'); assert.equal(x.thoat, false, 'tên tài sản được escape'); assert.match(x.tom, /4 \/ 8 tài sản đang thế chấp cần xử lý/); assert.match(x.tien, /12\.500\.000/); assert.match(x.tien, /86,7%/);
      assert.ok(x.rong <= 1, 'không tràn ngang trang ' + theme + ' ' + w + ': ' + x.rong); assert.ok(x.khung <= 1, 'thẻ không vượt khung ' + theme + ' ' + w);
      await p.locator('#tq_baoHiem').scrollIntoViewIfNeeded(); await p.locator('#tq_baoHiem').screenshot({ path: path.join(anh, 'tq_bh_' + theme + '_' + w + '.png') });
      await p.evaluate(() => veBaoHiemTongQuan_({ baoHiem: { soHopDong: 0, soTaiSanCan: 0, dem: {}, canChuY: [], tongCanChuY: 0 } })); assert.equal(await p.evaluate(() => el_('tq_baoHiem').style.display), 'none', 'ẩn khi chưa có dữ liệu');
      await p.evaluate(() => veBaoHiemTongQuan_(null)); assert.equal(await p.evaluate(() => el_('tq_baoHiem').style.display), 'none');
      await p.evaluate(()=>veBaoHiemTongQuan_({baoHiem:{loi:true,thongBao:'Không đọc được dữ liệu bảo hiểm'}}));assert.equal(await p.evaluate(()=>el_('tq_baoHiem').style.display),'');assert.match(await p.locator('#tq_bh_tom').innerText(),/Không đọc được/);assert.equal(await p.locator('#tq_bh_kpi').innerText(),'');assert.match(await p.locator('#tq_bh_ds').innerText(),/Thử tải lại/);
      assert.deepEqual(loi, [], 'không lỗi JS: ' + loi.join('|')); await p.close();
    }
    console.log('PASS thẻ bảo hiểm Tổng quan: 4 cỡ × sáng/tối không tràn, escape tên, ẩn khi rỗng. Ảnh MÔ PHỎNG: ' + anh);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
