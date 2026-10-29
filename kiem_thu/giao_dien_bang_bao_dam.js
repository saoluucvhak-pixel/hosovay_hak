// GIAO DIỆN bảng tài sản bảo đảm / bảo hiểm sau khi gỡ bảo hiểm kiểu cũ: cột “Bảo hiểm” dùng chung ở màn Hợp đồng và Quản lý khoản vay, không còn nút 🛡 / form cũ, không tràn ngang
// (Chromium + google.script.run GIẢ LẬP; KHÔNG phải Google thật). Ảnh chụp (MÔ PHỎNG) lưu ở HAK_ANH_DIR (mặc định: thư mục tạm).
const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
(async () => {
  const root = path.join(__dirname, '..'), read = (n) => fs.readFileSync(path.join(root, n + '.html'), 'utf8'), anh = process.env.HAK_ANH_DIR || path.join(os.tmpdir(), 'hosovay_anh_bang_bao_dam'); fs.mkdirSync(anh, { recursive: true });
  const html = read('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => read(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  const hang = (o) => Object.assign({ maTS: 'DK-1', maHD: 'HD01', soHopDong: 'HĐ 02/2026', tenCty: 'HAK', loai: 'KHAC', nhanLoai: 'Khác', moTa: 'Đăng ký TC/01 (3 tài sản)', giaTri: 1500000000, nguyenGia: null, khauHao: null, giaTriConLai: null, ngayDinhGia: '2026-10-01', trangThai: 'Đang bảo đảm', revision: 1,
    ngayHetHanBaoHiem: '', ngayBatDauBaoHiem: '', ngayLienQuanBaoHiem: '', hangMucBaoHiem: '', tinhTrangBaoHiem: '', soHopDongBaoHiem: 0, canhBaoBaoHiem: '', soNgayBaoHiem: null }, o);
  const DU_LIEU = { loaiTaiSan: {}, tongGiaTriDangBaoDam: 3500000000, rows: [
    hang({ maTS: 'DK-1', canhBaoBaoHiem: 'CHUA_BAO_HIEM', tinhTrangBaoHiem: 'CHUA_BAO_HIEM', hangMucBaoHiem: 'Nhà xưởng <i>x</i>, Máy ép' }),
    hang({ maTS: 'DK-2', moTa: 'Đăng ký TC/02 (1 tài sản)', canhBaoBaoHiem: 'SAP_HET', tinhTrangBaoHiem: 'SAP_HET', ngayHetHanBaoHiem: '2026-11-05', soNgayBaoHiem: 7, hangMucBaoHiem: 'Xe tải', soHopDongBaoHiem: 1 }),
    hang({ maTS: 'DK-3', moTa: 'Đăng ký TC/03 (2 tài sản)', tinhTrangBaoHiem: 'DANG_BAO_HIEM', ngayHetHanBaoHiem: '2027-06-30', soNgayBaoHiem: 244, soHopDongBaoHiem: 2 }),
    hang({ maTS: 'DK-4', moTa: 'Đăng ký TC/04', canhBaoBaoHiem: 'KHOANG_TRONG', tinhTrangBaoHiem: 'KHOANG_TRONG', ngayHetHanBaoHiem: '2026-09-30', ngayBatDauBaoHiem: '2026-11-15', hangMucBaoHiem: 'Kho lạnh', soHopDongBaoHiem: 2 }),
    hang({ maTS: 'DK-5', moTa: 'Đăng ký TC/05 đã giải chấp', trangThai: 'Đã giải chấp' }),
    hang({ maTS: 'TS-0001', loai: 'BDS', nhanLoai: 'Bất động sản', moTa: 'Tài sản nhập kiểu cũ', giaTri: 800000000 })] };
  const browser = await chromium.launch({ headless: true, executablePath: process.env.HAK_BROWSER_PATH });
  try {
    for (const theme of ['light', 'dark']) for (const w of [390, 1024, 1366]) {
      const p = await browser.newPage({ viewport: { width: w, height: 900 } }), loi = [];
      p.on('pageerror', (e) => loi.push(e.message)); await p.route('https://fonts.googleapis.com/**', (r) => r.abort()); await p.route('http://bd.test/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
      await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
      await p.goto('http://bd.test');
      await p.evaluate(([t, d]) => {
        document.documentElement.setAttribute('data-theme', t); laChiXem_ = () => false;
        window.hakRun_ = () => { let ok; const px = new Proxy({ withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } }, { get(t0, k) { return t0[k] || function () { if (k === 'layTaiSanBaoDam') ok(d); return px; }; } }); return px; };
        document.querySelectorAll('.tab-panel').forEach((e) => e.style.display = 'none');
      }, [theme, DU_LIEU]);
      // ---- Màn Hợp đồng: thẻ đăng ký thế chấp
      await p.evaluate(() => { MA_HD_DANG_XEM = 'HD01'; document.getElementById('tab-hopdong').style.display = 'block'; var c = document.getElementById('cardTheChapCuaHopDong'); c.style.display = ''; for (var e = c.parentElement; e && e !== document.body; e = e.parentElement) { if (getComputedStyle(e).display === 'none') e.style.display = 'block'; e.hidden = false; } taiTheChapCuaHopDong_(); });
      const a = await p.evaluate(() => { const tr = [].slice.call(document.querySelectorAll('#tbody_theChapCuaHopDong tr')); return { dong: tr.length, o: tr.map((r) => r.children.length), text: document.getElementById('tbody_theChapCuaHopDong').innerText, nutBH: document.getElementById('tbody_theChapCuaHopDong').querySelectorAll('button').length, html: document.getElementById('tbody_theChapCuaHopDong').innerHTML, rong: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      assert.equal(a.dong, 6); assert.ok(a.o.every((n) => n === 10), 'mỗi dòng đủ 10 ô: ' + a.o); assert.ok(!a.text.includes('🛡')); assert.equal(a.nutBH, 5, 'chỉ dòng đang bảo đảm có nút Giải chấp');
      assert.ok(a.text.includes('Chưa có bảo hiểm') && a.text.includes('Còn 7 ngày') && a.text.includes('Đang bảo hiểm') && a.text.includes('Hở bảo hiểm') && a.text.includes('Chưa có bảo hiểm'), a.text);
      assert.ok(a.text.includes('Đến 05/11/2026') && a.text.includes('2 hợp đồng bảo hiểm') && a.text.includes('Hết 30/09/2026, tiếp từ 15/11/2026'), a.text); assert.ok(!a.html.includes('<i>x</i>'), 'tên hạng mục được escape');
      await p.locator('#cardTheChapCuaHopDong').scrollIntoViewIfNeeded(); await p.locator('#cardTheChapCuaHopDong').screenshot({ path: path.join(anh, 'hop_dong_' + theme + '_' + w + '.png') });
      // ---- Màn Quản lý khoản vay › Bảo đảm
      await p.evaluate(() => { document.getElementById('tab-hopdong').style.display = 'none'; document.getElementById('tab-qlvay').style.display = 'block'; qvChuyen_('baodam'); qvTaiBaoDam_(); });
      const b = await p.evaluate(() => { const tr = [].slice.call(document.querySelectorAll('#qv_tsRows tr')); return { dong: tr.length, o: tr.map((r) => r.children.length), text: document.getElementById('qv_tsRows').innerText, nutBH: [].slice.call(document.querySelectorAll('#qv_p_baodam button')).filter((x) => /🛡/.test(x.textContent)).length, formCu: !!document.getElementById('qv_tsMoTa') || !!document.getElementById('qv_tsHD'), moDK: [].slice.call(document.querySelectorAll('#qv_p_baodam button')).filter((x) => /Mở đăng ký thế chấp/.test(x.textContent)).length, rong: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
      assert.equal(b.dong, 6); assert.ok(b.o.every((n) => n === 6)); assert.equal(b.nutBH, 0); assert.equal(b.formCu, false, 'không còn form nhập tay cũ'); assert.equal(b.moDK, 1);
      assert.ok(b.text.includes('Chưa có bảo hiểm') && b.text.includes('Đến 05/11/2026') && b.text.includes('Hở bảo hiểm'), b.text);
      assert.ok(a.rong <= 1 && b.rong <= 1, 'không tràn ngang ' + theme + ' ' + w + ': ' + a.rong + '/' + b.rong);
      await p.locator('#qv_p_baodam').screenshot({ path: path.join(anh, 'qlv_bao_dam_' + theme + '_' + w + '.png') });
      assert.deepEqual(loi, [], 'không lỗi JS: ' + loi.join('|')); await p.close();
    }
    console.log('PASS bảng tài sản bảo đảm / bảo hiểm: cột Bảo hiểm dùng chung ở Hợp đồng và Quản lý vay, escape, không còn nút/form cũ, 3 cỡ × sáng/tối không tràn. Ảnh MÔ PHỎNG: ' + anh);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
