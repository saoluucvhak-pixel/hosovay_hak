// LƯU TRỮ TỆP ĐÍNH KÈM TRÊN DRIVE + CẢNH BÁO DUNG LƯỢNG + KHÔI PHỤC CÓ KIỂM SOÁT. Giả lập Apps Script/Drive — chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('luu_tru_tep'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hd = hopDong({ soHopDong: 'HD-TEP' });
const hs = (ma, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd.maHD, NgayGiaiNgan: '2025-03-01', NgayDenHan: '2025-12-31', SoTienNhanNoLanNay: 1000000 }, o));
hs('TP-1'); hs('TP-2'); hs('TP-3', { NgayGiaiNgan: '2026-03-01' });
const SH = (ten) => G.boDuLieu.getSheetByName(ten);
const taoTep = (tl, maHoSo, noiDung, loai) => { const f = mt.DriveApp.createFile(mt.Utilities.newBlob(Buffer.from(noiDung), 'application/pdf', tl + '.pdf')); const sh = SH('TaiLieuDinhKem'); sh.g.push(sh.g[0].map(k => ({ MaTaiLieu: tl, MaHoSo: maHoSo, LoaiTaiLieu: loai || 'HoaDonGTGT', TenFile: tl + '.pdf', LinkFile: f.getUrl() })[k] ?? '')); return f; };
const f1 = taoTep('TL-1', 'TP-1', 'aaaa'), f2 = taoTep('TL-2', 'TP-1', 'bbbbbbbb', 'BangLuong'), f3 = taoTep('TL-3', 'TP-2', 'cc'), f4 = taoTep('TL-4', 'TP-3', 'dddd'); // TP-3 thuộc năm 2026
const tep = (ma) => J(ctx.layTepLuuTru(ma));
let ma25;

dat('Ước tính: chỉ tính tệp của hồ sơ thuộc năm; đủ dung lượng; Quản trị toàn hệ thống mới dùng được', () => {
  const u = J(ctx.uocTinhLuuTruTep(2025)); assert.deepEqual([u.soTep, u.tongDungLuong, u.duChoTrong, u.soTepKhongDocDuoc], [3, 4 + 8 + 2, true, 0]);
  assert.equal(J(ctx.uocTinhLuuTruTep(2026)).soTep, 1);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'uocTinhLuuTruTep', [2025])), /QUYEN|quyền/);
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC']; try { assert.throws(() => ctx.uocTinhLuuTruTep(2025), /toàn hệ thống/); assert.throws(() => ctx.layCanhBaoDungLuong(), /toàn hệ thống/); } finally { ctx.phamViCongTyNguoiDung_ = g; }
});
dat('Lập sổ tệp: mỗi tệp một dòng "Chờ" kèm dung lượng; lập lại không nhân đôi; tệp gốc đã mất đánh dấu Mất', () => {
  ma25 = J(ctx.luuTruNam({ nam: 2025 })).maLuuTru;
  const r = J(ctx.lapSoTepLuuTru(ma25)); assert.equal(r.themMoi, 3); assert.deepEqual([r.tomTat.tong, r.tomTat.cho, r.tomTat.dungLuong], [3, 3, 14]);
  assert.equal(J(ctx.lapSoTepLuuTru(ma25)).themMoi, 0, 'gọi lại: không thêm trùng');
  const f5 = taoTep('TL-5', 'TP-2', 'eee'); f5.setTrashed(true); delete mt.__.dsFile[f5.getId()]; // tệp mới đính kèm nhưng gốc đã bị xoá khỏi Drive
  const r2 = J(ctx.lapSoTepLuuTru(ma25)); assert.equal(r2.themMoi, 1); assert.equal(tep(ma25).tep.find(t => t.maTaiLieu === 'TL-5').trangThai, 'Mất');
});
dat('Sao tệp theo lô: đúng nội dung/kích thước, tệp gốc nguyên vẹn, thư mục *_TEP riêng; gọi lại không sao trùng', () => {
  const r = J(ctx.luuTruSaoTep(ma25)); assert.deepEqual([r.xuLyTrongLo, r.conLai, r.xong, r.tomTat.daSao, r.tomTat.mat], [3, 0, true, 3, 1]);
  const t = tep(ma25); assert.ok(t.tep.filter(x => x.trangThai === 'Đã sao').every(x => /drive\.google\.com\/file\/d\//.test(x.urlBanSao)));
  const dich = mt.DriveApp.getFolderById('GOC_ID').getFoldersByName('LuuTru_Nam').next().getFoldersByName(J(ctx.layDanhSachLuuTru()).rows.find(x => x.maLuuTru === ma25).tenFile + '_TEP').next();
  assert.equal(dich.getFiles().hasNext(), true); const ten = []; for (const it = dich.getFiles(); it.hasNext();) { const f = it.next(); ten.push([f.getName(), f.getSize()]); }
  assert.deepEqual(ten.sort(), [['TP-1__TL-1.pdf', 4], ['TP-1__TL-2.pdf', 8], ['TP-2__TL-3.pdf', 2]]); assert.ok(!f1.isTrashed() && f1.getSize() === 4, 'tệp gốc còn nguyên');
  assert.equal(J(ctx.luuTruSaoTep(ma25)).xuLyTrongLo, 0, 'không sao lại tệp đã sao');
});
dat('Lỗi từng tệp không chặn cả lô: tệp lỗi được ghi, thử lại được; bản sao sai kích thước bị bỏ', () => {
  const f6 = taoTep('TL-6', 'TP-1', 'ffff'), f7 = taoTep('TL-7', 'TP-1', 'gggg'); ctx.lapSoTepLuuTru(ma25);
  mt.__hongSaoTep = (x) => x.getId() === f6.getId(); mt.__hongSaoLoi = 'Hết hạn mức Drive';
  let r; try { r = J(ctx.luuTruSaoTep(ma25)); } finally { mt.__hongSaoTep = null; }
  assert.deepEqual([r.xuLyTrongLo, r.loiTrongLo, r.conLai, r.tomTat.loi, r.tomTat.daSao], [2, 1, 0, 1, 4]); assert.match(tep(ma25).tep.find(x => x.maTaiLieu === 'TL-6').loi, /Hết hạn mức/);
  assert.equal(J(ctx.luuTruSaoTep(ma25)).xuLyTrongLo, 0, 'không thử lại tệp lỗi nếu không yêu cầu');
  mt.__saiKichThuoc = true; try { const rr = J(ctx.luuTruSaoTep(ma25, { thuLaiLoi: true })); assert.equal(rr.loiTrongLo, 1); assert.match(tep(ma25).tep.find(x => x.maTaiLieu === 'TL-6').loi, /Kích thước/); } finally { mt.__saiKichThuoc = false; }
  const rr2 = J(ctx.luuTruSaoTep(ma25, { thuLaiLoi: true })); assert.deepEqual([rr2.xuLyTrongLo, rr2.conLai, rr2.tomTat.loi], [1, 0, 0], 'thử lại thành công'); assert.equal(f7.isTrashed(), false);
});
dat('Dung lượng Drive: cảnh báo ≥80% / ≥90%; chặn sao khi không đủ chỗ; không có giới hạn thì không cảnh báo', () => {
  const dl = (da, gh) => { mt.__driveDaDung = da; mt.__driveGioiHan = gh; return J(ctx.layCanhBaoDungLuong()); };
  try {
    mt.__driveDaDung = 100; mt.__driveGioiHan = 1000; assert.equal(J(ctx.layTongQuanHoSo({ boQuaCache: true })).dungLuong, undefined, 'dưới 80%: Tổng quan không kèm cảnh báo');
    mt.__driveDaDung = 920; assert.deepEqual([J(ctx.layTongQuanHoSo({ boQuaCache: true })).dungLuong.canhBao, J(ctx.layTongQuanHoSo({ boQuaCache: true })).dungLuong.tyLe], ['NGUY_HIEM', 0.92], 'Tổng quan kèm cảnh báo, không cần thêm lượt gọi');
    const gp = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC']; try { assert.equal(J(ctx.layTongQuanHoSo({ boQuaCache: true })).dungLuong, undefined, 'tài khoản giới hạn công ty không thấy'); } finally { ctx.phamViCongTyNguoiDung_ = gp; }
    assert.equal(dl(100, 1000).canhBao, ''); assert.equal(dl(800, 1000).canhBao, 'CAO'); assert.match(dl(800, 1000).thongBao, /80%/); const n = dl(950, 1000); assert.deepEqual([n.canhBao, n.conTrong], ['NGUY_HIEM', 50]); assert.equal(dl(5, 0).canhBao, '');
    const f8 = taoTep('TL-8', 'TP-1', 'x'.repeat(100)); ctx.lapSoTepLuuTru(ma25); mt.__driveDaDung = 960; mt.__driveGioiHan = 1000;
    assert.throws(() => ctx.luuTruSaoTep(ma25), /không đủ để sao/); assert.equal(tep(ma25).tep.find(x => x.maTaiLieu === 'TL-8').trangThai, 'Chờ', 'bị chặn thì không đổi trạng thái');
    assert.equal(J(ctx.uocTinhLuuTruTep(2025)).duChoTrong, false); mt.__driveGioiHan = 15000000000; assert.equal(J(ctx.luuTruSaoTep(ma25)).conLai, 0);
  } finally { mt.__driveDaDung = undefined; mt.__driveGioiHan = undefined; }
  assert.equal(J(voi('xem@example.com', () => ctx.api('', 'layCanhBaoDungLuong', []))).canhBao, '');
});
dat('So sánh bản lưu trữ ↔ hiện hành: dòng bị mất, dòng bị đổi (chỉ xem), dòng mới', () => {
  const kt = (ma) => J(ctx.soSanhLuuTru(ma25, ma));
  const s0 = kt('HOSO'); assert.deepEqual([s0.tongThieu, s0.tongKhac, s0.moiSauLuuTru, s0.soDongLuuTru], [0, 0, 0, 3]);
  const sh = SH('HoSoGiaiNgan'), cMa = sh.g[0].indexOf('MaHoSo'), cTien = sh.g[0].indexOf('SoTienNhanNoLanNay');
  const i2 = sh.g.findIndex(r => r[cMa] === 'TP-2'); sh.g.splice(i2, 1); sh.g.find(r => r[cMa] === 'TP-1')[cTien] = 5000000; hs('TP-9');
  const s = kt('HOSO'); assert.deepEqual([s.tongThieu, s.thieu[0].khoa, s.tongKhac, s.khac[0].khoa, s.khac[0].cot[0].cot, s.khac[0].cot[0].luuTru, s.khac[0].cot[0].hienTai, s.moiSauLuuTru], [1, 'TP-2', 1, 'TP-1', 'SoTienNhanNoLanNay', '1000000', '5000000', 1]);
  ['NGUOIDUNG', 'CHITIET', 'TRANO', '', 'abc'].forEach(m => assert.throws(() => kt(m), /không được so sánh/, m));
});
dat('Khôi phục: chỉ thêm dòng đã mất, không ghi đè dòng đang có; bắt buộc lý do; tối đa 200; tăng revision; ghi nhật ký; ghi lại khoá thiếu', () => {
  const sh = SH('HoSoGiaiNgan'), cMa = sh.g[0].indexOf('MaHoSo'), cTien = sh.g[0].indexOf('SoTienNhanNoLanNay'), dem = () => sh.g.filter(r => r[cMa] === 'TP-2').length, revTruoc = ctx.docRevision_('HOSO');
  assert.throws(() => ctx.khoiPhucTuLuuTru(ma25, 'HOSO', ['TP-2'], 'ngắn'), /lý do/); assert.throws(() => ctx.khoiPhucTuLuuTru(ma25, 'HOSO', [], 'khôi phục dòng mất'), /ít nhất một/);
  assert.throws(() => ctx.khoiPhucTuLuuTru(ma25, 'HOSO', Array.from({ length: 201 }, (_, i) => 'K' + i), 'quá nhiều dòng'), /tối đa 200/);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'khoiPhucTuLuuTru', [ma25, 'HOSO', ['TP-2'], 'không đủ quyền'])), /QUYEN|quyền/);
  assert.throws(() => ctx.khoiPhucTuLuuTru(ma25, 'HOSO', ['TP-1'], 'dòng đang có'), /Không có dòng nào để khôi phục/, 'chỉ có dòng đang tồn tại → không ghi đè');
  const r = J(ctx.khoiPhucTuLuuTru(ma25, 'HOSO', ['TP-2', 'TP-1', 'KHONG-CO'], 'Xoá nhầm TP-2')); assert.deepEqual([r.daKhoiPhuc, r.daCoSan, r.khongThayTrongLuuTru], [1, ['TP-1'], ['KHONG-CO']]);
  assert.equal(dem(), 1); assert.equal(sh.g.find(r => r[cMa] === 'TP-1')[cTien], 5000000, 'dòng TP-1 đang có KHÔNG bị ghi đè'); assert.equal(sh.g.find(r => r[cMa] === 'TP-2')[cTien], 1000000, 'dòng khôi phục đúng nội dung lưu trữ');
  assert.equal(ctx.docRevision_('HOSO'), revTruoc + 1); assert.deepEqual([J(ctx.soSanhLuuTru(ma25, 'HOSO')).tongThieu], [0]);
  assert.throws(() => ctx.khoiPhucTuLuuTru(ma25, 'HOSO', ['TP-2'], 'lần hai nữa'), /Không có dòng nào để khôi phục/, 'chạy lại không nhân đôi'); assert.equal(dem(), 1);
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC']; try { assert.throws(() => ctx.khoiPhucTuLuuTru(ma25, 'HOSO', ['TP-2'], 'khác công ty'), /toàn hệ thống/); assert.throws(() => ctx.soSanhLuuTru(ma25, 'HOSO'), /toàn hệ thống/); } finally { ctx.phamViCongTyNguoiDung_ = g; }
});
(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('lưu trữ tệp Drive + dung lượng + khôi phục có kiểm soát'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('lưu trữ tệp Drive + dung lượng + khôi phục có kiểm soát'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://lt.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://lt.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40)); let lo = 0;
      const tomTat = (cho, daSao) => ({ tong: 5, cho, daSao, loi: 0, mat: 0, dungLuong: 5000, dungLuongCon: cho * 1000 });
      window.hakRun_ = () => { let ok, bad, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler(f) { bad = f; return P; } };
        const tra = (ten, v, loiMsg) => { x[ten] = function (...a) { goi.push([ten, JSON.stringify(a)]); setTimeout(() => { const e = loiMsg && loiMsg(); if (e) bad({ message: e }); else ok(typeof v === 'function' ? v(...a) : v); }, 0); return P; }; };
        tra('layCanhBaoDungLuong', { daDung: 13000000000, gioiHan: 15000000000, conTrong: 2000000000, tyLe: 0.867, canhBao: 'CAO', thongBao: 'Drive đã dùng 87% dung lượng. Cân nhắc lưu trữ năm cũ và dọn tệp.' });
        tra('uocTinhLuuTruTep', (n) => ({ nam: n, soTep: 12, tongDungLuong: 3 * 1048576, soTepKhongDocDuoc: 1, duChoTrong: false }));
        tra('layTepLuuTru', () => ({ maLuuTru: 'LT-0001', tomTat: tomTat(lo === 0 ? 5 : 0, lo === 0 ? 0 : 5), drive: {}, tep: [{ maTaiLieu: 'TL-1', maHoSo: 'HS-1', loai: 'HoaDonGTGT', tenFile: 'a.pdf', dungLuong: 1000, trangThai: 'Đã sao', loi: '', urlBanSao: 'https://drive.google.com/file/d/ABC/view' }] }));
        tra('lapSoTepLuuTru', { themMoi: 5 }); tra('luuTruSaoTep', () => { lo++; return lo < 3 ? { xuLyTrongLo: 2, conLai: 5 - lo * 2, tomTat: tomTat(1, 4) } : { xuLyTrongLo: 1, conLai: 0, tomTat: tomTat(0, 5) }; });
        tra('soSanhLuuTru', { nhan: 'Hồ sơ giải ngân', khoa: 'MaHoSo', soDongLuuTru: 3, soDongHienTai: 3, tongThieu: 1, tongKhac: 1, moiSauLuuTru: 1, thieu: [{ khoa: 'TP-2', tom: 'TP-2 | HD1' }], khac: [{ khoa: 'TP-1', soCotKhac: 1, cot: [{ cot: 'SoTienNhanNoLanNay', luuTru: '1000000', hienTai: '5000000' }] }] });
        tra('khoiPhucTuLuuTru', { daKhoiPhuc: 1 });
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      const hoi = []; window.hoiXacNhan = (m, f) => { hoi.push(m); f(); };
      window.HAK_NGUOI_DUNG = null; LT_DS_ = [{ maLuuTru: 'LT-0001', nam: 2025, trangThai: 'Hợp lệ', cacMien: [{ ma: 'HOSO', nhan: 'Hồ sơ', soDong: 3 }] }];
      ltTaiDungLuong_(); await cho(); const dl = el_('lt_dungLuong').textContent;
      el_('lt_nam').innerHTML = '<option value="2025">2025</option>'; el_('lt_nam').value = '2025'; ltUocTinh_(); await cho(); const uoc = el_('lt_uocTinh').textContent;
      moTepLuuTru_('LT-0001'); await cho(); const t0 = el_('lt_tepStatus').textContent;
      ltLapSoTep_(); await cho(); ltSaoTep_(false); await cho(); await cho(); await cho(); await cho(); const t1 = el_('lt_tepStatus').textContent, nut = el_('lt_btnSaoTep').disabled, soGoiSao = goi.filter(g => g[0] === 'luuTruSaoTep').length;
      LT_MA_ = 'LT-0001'; el_('lt_kpMien').value = 'HOSO'; el_('lt_kpLyDo').value = 'Xoá nhầm TP-2'; ltSoSanh_(); await cho();
      const ss = { st: el_('lt_kpStatus').textContent, ket: el_('lt_kpKetQua').textContent, nut: getComputedStyle(el_('lt_kpBtn')).display };
      ltKhoiPhuc_(); await cho(); const kp0 = goi.filter(g => g[0] === 'khoiPhucTuLuuTru').length; document.querySelector('.lt-kp-chon').checked = true; ltKhoiPhuc_(); await cho();
      // thanh menu Cài đặt nằm TRÊN CÙNG; trạng thái lịch tự động; Thông tin công ty tải nhanh
      const caiDat = document.getElementById('tab-caidat'), viTri = { thanhMenuDau: caiDat.firstElementChild.classList.contains('hoso-tabs') || caiDat.firstElementChild.id === 'cd_canhBaoQuyen', thanhMenuTruocThe: caiDat.querySelector('.hoso-tabs').compareDocumentPosition(caiDat.querySelector('section.card')) & Node.DOCUMENT_POSITION_FOLLOWING ? true : false, nutCongTy: document.querySelectorAll('#tab-congty .hoso-tabs button').length };
      let bat = false; const lichGoi = [];
      window.hakRun_ = () => { let ok, bad, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler(f) { bad = f; return P; } };
        x.layTrangThaiLichLuuTruNam = function () { lichGoi.push('doc'); setTimeout(() => ok({ bat, soLich: bat ? 1 : 0, lanThuCuoi: bat ? '02/01/2027 03:05' : '' }), 0); return P; };
        x.taoLichLuuTruNam = function () { lichGoi.push('bat'); bat = true; setTimeout(() => ok({ ok: true, bat: true, soLich: 1 }), 0); return P; };
        x.tatLichLuuTruNam = function () { lichGoi.push('tat'); bat = false; setTimeout(() => ok({ bat: false, soLich: 0 }), 0); return P; };
        x.layDanhSachCongTy = function () { lichGoi.push('congty'); setTimeout(() => ok([{ MaCty: 'C1', TenCty: 'Cty Thử', TenVietTat: 'CT', DiaChiTruSo: 'Số 1', GiayUyQuyenNgay: '' }]), 0); return P; };
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      ltTaiLich_(); await cho(); const lich0 = { tt: el_('lt_lichTrangThai').textContent, nut: el_('lt_btnLich').textContent };
      batLichLuuTruClick_(); await cho(); const lich1 = { tt: el_('lt_lichTrangThai').textContent, nut: el_('lt_btnLich').textContent };
      batLichLuuTruClick_(); await cho(); const lich2 = { tt: el_('lt_lichTrangThai').textContent, nut: el_('lt_btnLich').textContent };
      el_('ct_trangThaiHint').textContent = 'Đang tải...'; taiCongTyNhanh_(); await cho(); const congTy = { hint: el_('ct_trangThaiHint').textContent, bang: el_('ct_bangXem').textContent, goi: lichGoi.filter(g => g === 'congty').length };
      window.HAK_NGUOI_DUNG = { cheDo: 'CONG_HAK', vaiTro: 'NHAP_LIEU' }; const bangKhong = ltQuanTri_();
      return { dl, uoc, t0, t1, nut, soGoiSao, ss, kp0, hoi, goi, bangKhong, tq: typeof veCanhBaoDungLuongTongQuan_, viTri, lich0, lich1, lich2, congTy, lichGoi };
    });
    assert.match(kq.dl, /87%/); assert.match(kq.dl, /12,1 GB|12,1/); assert.match(kq.uoc, /12.*tệp.*3,0 MB/); assert.match(kq.uoc, /KHÔNG đủ chỗ/); assert.match(kq.uoc, /1 tệp không đọc được/);
    assert.match(kq.t0, /Tổng 5 tệp.*chờ 5/); assert.equal(kq.soGoiSao, 3, 'gọi lặp từng lô đến khi hết chờ'); assert.match(kq.t1, /đã sao 5/); assert.equal(kq.nut, false, 'nút sao bật lại sau khi xong');
    assert.match(kq.ss.st, /mất 1.*đã đổi 1/); assert.match(kq.ss.ket, /TP-2/); assert.match(kq.ss.ket, /SoTienNhanNoLanNay.*1000000.*5000000/); assert.notEqual(kq.ss.nut, 'none');
    assert.equal(kq.kp0, 0, 'chưa chọn dòng thì không gọi khôi phục'); const g = (n) => kq.goi.filter(x => x[0] === n).map(x => JSON.parse(x[1])); assert.deepEqual(g('khoiPhucTuLuuTru'), [['LT-0001', 'HOSO', ['TP-2'], 'Xoá nhầm TP-2']]); assert.equal(kq.hoi.length, 1);
    assert.ok(kq.viTri.thanhMenuTruocThe, 'thanh menu Cài đặt nằm trên các thẻ'); assert.equal(kq.viTri.nutCongTy, 6, 'thanh menu ở màn Thông tin công ty đủ 6 mục');
    assert.match(kq.lich0.tt, /CHƯA BẬT/); assert.match(kq.lich0.nut, /Bật tự động/); assert.match(kq.lich1.tt, /ĐÃ BẬT TỰ ĐỘNG/); assert.match(kq.lich1.nut, /Tắt tự động/); assert.match(kq.lich2.tt, /CHƯA BẬT/); assert.match(kq.lich2.nut, /Bật tự động/);
    assert.match(kq.congTy.hint, /Đã khai báo công ty \(C1\)/); assert.match(kq.congTy.bang, /Cty Thử/); assert.equal(kq.congTy.goi, 1, 'đọc riêng danh sách công ty 1 lần khi bộ nhớ chưa có');
    assert.equal(kq.bangKhong, false); assert.equal(kq.tq, 'function'); assert.deepEqual(loi, []);
    console.log('PASS Giao diện lưu trữ: cảnh báo dung lượng, ước tính, sao tệp theo lô, so sánh và khôi phục dòng đã chọn');
  } catch (e) { console.log('FAIL Giao diện lưu trữ tệp/khôi phục → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('lưu trữ tệp Drive + dung lượng + khôi phục có kiểm soát');
})();
