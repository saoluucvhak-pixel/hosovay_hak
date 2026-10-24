// GIAO DIỆN: phản hồi CŨ không được ghi đè màn hình sau khi người dùng đổi bộ lọc / hồ sơ (báo cáo dư nợ, báo cáo lãi, mở hồ sơ, xác nhận giải ngân, chứng từ, tài liệu).
// Chromium + google.script.run GIẢ LẬP với độ trễ có kiểm soát (không phải Google thật).
const assert = require('assert/strict'); const fs = require('fs'), path = require('path');
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA: không có Chromium'); process.exit(0); }
  let loiTest = 0; const ok = (t) => console.log('PASS ' + t), hong = (t, e) => { loiTest++; console.log('FAIL ' + t + ' → ' + (e && e.message)); };
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://pc.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://pc.test');
    const kq = await p.evaluate(async () => {
      const cho = (ms) => new Promise(r => setTimeout(r, ms)), txt = (id) => document.getElementById(id).textContent;
      // mỗi lời gọi lấy độ trễ từ hàng đợi lat[ten]; kết quả = hàm của tham số đầu
      const lat = {}, tra = {};
      window.hakRun_ = () => { let ok, bad, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler(f) { bad = f; return P; } };
        ['layBaoCaoDuNoTheoKy', 'layBaoCaoTienLai', 'layDuLieuDayDu', 'layXacNhanGiaiNgan', 'layDanhSachChungTuHoSo', 'layTaiLieuTheoHoSo', 'layTrangThaiXacNhanGN'].forEach(ten => { x[ten] = function (...a) { const ms = (lat[ten] || []).shift() || 0; setTimeout(() => ok(tra[ten](...a)), ms); return P; }; });
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      const kqC = {};
      // 1) Dư nợ theo kỳ: lượt 1 (VND) chậm, lượt 2 (USD) nhanh
      tra.layBaoCaoDuNoTheoKy = (o) => ({ tuNgay: '2026-10-01', denNgay: '2026-10-24', loaiTien: o.loaiTien, tong: { [o.loaiTien || 'X']: { soKhoan: 1, dauKy: 1, tang: 0, giamTra: 0, giamTatToan: 0, cuoiKy: 1, cuoiKyQuyDoiVND: 1, soKhoanThieuTyGia: 0 } }, rows: [], quyDoiVNDTong: 1, soKhoanThieuTyGia: 0 });
      chuyenTab('baocao'); chuyenBcSub_(6); await cho(30);
      el_('bcDuNo_loaiTien').value = 'VND'; lat.layBaoCaoDuNoTheoKy = [250, 10]; taiBcDuNo_(); el_('bcDuNo_loaiTien').value = 'USD'; taiBcDuNo_(); await cho(400);
      kqC.duNo = txt('bcDuNo_tom');
      // 2) Lãi
      tra.layBaoCaoTienLai = (o) => ({ _loai: o.loaiTien }); window.renderBcLai_ = () => {};
      el_('bcLai_loaiTien').value = 'VND'; lat.layBaoCaoTienLai = [250, 10]; taiBcLai_(); el_('bcLai_loaiTien').value = 'USD'; taiBcLai_(); await cho(400);
      kqC.lai = window.BC_LAI_DU_LIEU && window.BC_LAI_DU_LIEU._loai;
      // 3) Mở hồ sơ A (chậm) rồi B (nhanh)
      const dd = []; window.dienDuLieuVaoForm = (d) => { dd.push(d.ma); }; window.chuyenViewHoSo_ = () => {}; window.chuyenTabChiTietHoSo = () => {}; window.renderBangHoSo_ = () => {};
      tra.layDuLieuDayDu = (ma) => ({ ma }); lat.layDuLieuDayDu = [250, 10]; suaHoSoTuBang('HS-A'); suaHoSoTuBang('HS-B'); await cho(400);
      kqC.mo = { dangSua: window.MA_HO_SO_DANG_SUA, daDien: dd.slice() };
      // 4) Xác nhận giải ngân của hồ sơ A (chậm) không được hiện sau khi đã chuyển sang hồ sơ B
      const gn = (ma) => ({ dong: [{ maXacNhan: 'XN-' + ma, loai: 'X', ngayThucTe: '2026-10-01', soThamChieuNH: '', soTien: 1, trangThai: 'Hiệu lực' }], ronThucTe: 1 });
      tra.layXacNhanGiaiNgan = gn; tra.layTrangThaiXacNhanGN = () => ({}); lat.layXacNhanGiaiNgan = [250, 10];
      window.MA_HO_SO_DANG_SUA = 'HS-A'; taiXacNhanGN_(); window.MA_HO_SO_DANG_SUA = 'HS-B'; taiXacNhanGN_(); await cho(400);
      kqC.gn = txt('gn_danhSach');
      return kqC;
    });
    try { assert.match(kq.duNo, /USD \(1 khoản\)/); assert.doesNotMatch(kq.duNo, /VND \(1 khoản\)/); ok('P1. Dư nợ theo kỳ: phản hồi chậm của bộ lọc cũ (VND) không ghi đè kết quả mới (USD)'); } catch (e) { hong('P1', new Error(e.message.slice(0, 160) + ' | ' + kq.duNo.slice(0, 80))); }
    try { assert.equal(kq.lai, 'USD'); ok('P2. Báo cáo lãi: phản hồi cũ không ghi đè kết quả mới'); } catch (e) { hong('P2', new Error('lai=' + kq.lai)); }
    try { assert.equal(kq.mo.dangSua, 'HS-B'); assert.deepEqual(kq.mo.daDien, ['HS-B']); ok('P3. Mở hồ sơ A rồi B: chỉ hồ sơ B được điền vào form, mã đang sửa = B'); } catch (e) { hong('P3', new Error(JSON.stringify(kq.mo))); }
    try { assert.match(kq.gn, /XN-HS-B/); assert.doesNotMatch(kq.gn, /XN-HS-A/); ok('P4. Xác nhận giải ngân của hồ sơ cũ không hiện ở hồ sơ mới'); } catch (e) { hong('P4', new Error(kq.gn.slice(0, 120))); }
    if (loi.length) hong('Lỗi trang', new Error(loi.slice(0, 3).join(' | ')));
  } catch (e) { hong('Chạy giao diện', e); } finally { await b.close(); }
  console.log('\nTỔNG: giao diện phản hồi cũ — ' + loiTest + ' lỗi'); process.exit(loiTest ? 1 : 0);
})();
