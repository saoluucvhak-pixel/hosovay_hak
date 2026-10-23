// CẬP NHẬT MẪU / CHỌN MẪU KHÁC cho 1 chứng từ của hồ sơ (khi mẫu tự chọn bị lỗi, file mẫu trên Drive đã mất…). Giả lập Apps Script/Drive; việc dựng file Word thật được thay bằng giả lập.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('chon_mau_chung_tu'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' }); ctx.luuNguoiDung({ email: 'nhap@example.com', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' });
const hd = hopDong({ soHopDong: 'HD-MAU', tenNganHang: 'BIDV' }), LOAI = ctx.CT_DE_NGHI;
const ma = themHoSo({ MaHoSo: 'HS-MAU', MaHD: hd.maHD, TrangThai: 'Nháp', SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: Q.ngay(-1), NgayDenHan: Q.ngay(90) });
const ct = G.boDuLieu.getSheetByName('ChiTietThuHuong'); ct.g.push(ct.g[0].map(k => ({ MaHoSo: ma, STT: 1, TenNguoiHuong: 'NCC A', SoTien: 1000000, LoaiTien: 'VND' })[k] ?? ''));
const tepCo = mt.DriveApp.createFile(new mt.Blob(Buffer.from('mau'), 'application/octet-stream', 'mau.docx')).getId();
const sh = G.boDuLieu.getSheetByName('DM_MauVanBan'); if (!sh) throw new Error('chưa có tab DM_MauVanBan');
const them = (o) => sh.g.push(sh.g[0].map(k => Object.assign({ NganHang: '', LoaiTaiLieu: LOAI, LoaiTien: 'TAT_CA', PhienBan: 1, TrangThai: 'Hiệu lực', LoaiFile: 'docx', SoNguoiHuongTu: 1, SoNguoiHuongDen: 9999, FileDocxId: tepCo, MacDinh: false }, o)[k] ?? ''));
them({ MaMau: 'MAU_A', TenMau: 'Mẫu A (tự chọn, file đã mất)', LoaiTien: 'VND', FileDocxId: 'FILE-DA-XOA' }); them({ MaMau: 'MAU_B', TenMau: 'Mẫu B dự phòng' });
them({ MaMau: 'MAU_C', TenMau: 'Mẫu C chỉ USD', LoaiTien: 'USD' }); them({ MaMau: 'MAU_D', TenMau: 'Mẫu D cũ', TrangThai: 'Hết hiệu lực' });
ctx.xoaCacheMau_();
const rev = () => Q.rev(ma);
let xuat = null;
ctx.kiemTraTienDePhatHanh_ = () => ({ tong: 1000000, tongQuyDoi: 1000000 });
ctx.xuatTaiLieuTuMau_ = (d, loai, mau) => { xuat = mau; return { loaiFile: 'docx', fileIdChinh: 'F-' + mau.MaMau, fileIdPdf: '', urlChinh: 'https://drive.example/' + mau.MaMau, pdfUrl: '', canhBao: [] }; };
const ung = (r, m) => r.ungVien.find(x => x.maMau === m);

dat('Liệt kê mẫu để chọn: mẫu đang tự dùng (file đã mất) đứng đầu kèm cảnh báo; mẫu khác phù hợp chọn được; mẫu sai loại tiền bị khoá kèm lý do; mẫu hết hiệu lực không hiện', () => {
  const r = J(ctx.layMauChoChungTu(ma, LOAI));
  assert.equal(r.loaiTaiLieu, LOAI); assert.deepEqual([r.dangDung.maMau, r.dangDung.phienBan], ['MAU_A', 1]);
  assert.deepEqual(r.ungVien.map(x => x.maMau), ['MAU_A', 'MAU_B', 'MAU_C']);
  assert.deepEqual([ung(r, 'MAU_A').dangDung, ung(r, 'MAU_A').fileTonTai, ung(r, 'MAU_A').chonDuoc], [true, false, false]); assert.match(ung(r, 'MAU_A').lyDo, /File mẫu.*không còn/);
  assert.deepEqual([ung(r, 'MAU_B').dangDung, ung(r, 'MAU_B').fileTonTai, ung(r, 'MAU_B').chonDuoc, ung(r, 'MAU_B').lyDo], [false, true, true, '']);
  assert.equal(ung(r, 'MAU_C').chonDuoc, false); assert.match(ung(r, 'MAU_C').lyDo, /loại tiền/i);
});
dat('Nút "Cập nhật": làm mới danh sách mẫu (xoá bộ nhớ đệm), kiểm tra lại file; phát hiện mẫu mới sau khi quản trị đổi phiên bản', () => {
  const k1 = J(ctx.capNhatMauChungTu(ma, LOAI)); assert.equal(k1.maMau, 'MAU_A'); assert.equal(k1.hopLe, false); assert.match(k1.loi.join(' '), /File mẫu/); assert.equal(k1.doiMau, false);
  ctx.chonMauTaiLieu_(LOAI, 'VND', 1, 'BIDV', 1); // nạp bộ nhớ đệm bằng danh sách cũ
  sh.g.find(r => r[0] === 'MAU_A')[sh.g[0].indexOf('TrangThai')] = 'Hết hiệu lực'; // quản trị vừa hạ mẫu A (sửa thẳng sheet nên bộ nhớ đệm chưa biết)
  const k2 = J(ctx.capNhatMauChungTu(ma, LOAI)); assert.deepEqual([k2.maMau, k2.hopLe, k2.doiMau, k2.mauCu], ['MAU_B', true, true, 'MAU_A']); assert.deepEqual(k2.loi, []);
  sh.g.find(r => r[0] === 'MAU_A')[sh.g[0].indexOf('TrangThai')] = 'Hiệu lực'; ctx.xoaCacheMau_();
});
dat('Phát hành bằng MẪU ĐÃ CHỌN: dùng đúng mẫu, ghi mã mẫu/phiên bản vào lịch sử; không chọn thì vẫn tự chọn như cũ', () => {
  const r0 = J(ctx.taoChungTuTuyChon(ma, LOAI, { expectedRevision: rev(), taoLai: true })); assert.equal(xuat.MaMau, 'MAU_A'); assert.equal(r0.mau, 'MAU_A');
  const r1 = J(ctx.taoChungTuTuyChon(ma, LOAI, { expectedRevision: rev(), taoLai: true, mauChon: { maMau: 'MAU_B', phienBan: 1 } }));
  assert.equal(xuat.MaMau, 'MAU_B'); assert.deepEqual([r1.mau, r1.phienBanMau], ['MAU_B', 1]);
  const ls = J(ctx.layLichSuPhatHanh(ma)).filter(x => x.loaiTaiLieu === LOAI && x.trangThai === 'Hiệu lực'); assert.ok(ls.some(x => x.mau === 'MAU_B v1'), JSON.stringify(ls.map(x => x.mau)));
});
dat('Mẫu chọn không hợp lệ bị từ chối rõ ràng: sai loại tiền, hết hiệu lực, không tồn tại, sai loại tài liệu; lỗi được ghi lịch sử', () => {
  const thu = (mauChon) => ctx.taoChungTuTuyChon(ma, LOAI, { expectedRevision: rev(), taoLai: true, mauChon: mauChon });
  assert.throws(() => thu({ maMau: 'MAU_C', phienBan: 1 }), /không phù hợp.*loại tiền|loại tiền/i); assert.throws(() => thu({ maMau: 'MAU_D', phienBan: 1 }), /không còn hiệu lực/);
  assert.throws(() => thu({ maMau: 'KHONG_CO', phienBan: 1 }), /Không tìm thấy mẫu/); assert.throws(() => thu({ maMau: 'MAU_B', phienBan: 9 }), /Không tìm thấy mẫu/);
  them({ MaMau: 'MAU_E', TenMau: 'Mẫu của loại khác', LoaiTaiLieu: ctx.CT_THANH_TOAN }); ctx.xoaCacheMau_();
  assert.throws(() => thu({ maMau: 'MAU_E', phienBan: 1 }), /không thuộc loại/);
  assert.throws(() => thu('MAU_B'), /Lựa chọn mẫu không hợp lệ/);
  const loi = J(ctx.layLichSuPhatHanh(ma)).filter(x => x.trangThai === 'Lỗi'); assert.ok(loi.length >= 5 && loi.some(x => /không còn hiệu lực/.test(x.thongBaoLoi)), 'mỗi lần chọn sai đều để lại dấu vết lỗi');
});
dat('Quyền: Chỉ xem xem được danh sách mẫu nhưng không cập nhật/phát hành; Nhập liệu cập nhật và phát hành được', () => {
  assert.ok(J(voi('xem@example.com', () => ctx.api('', 'layMauChoChungTu', [ma, LOAI]))).ungVien.length);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'capNhatMauChungTu', [ma, LOAI])), /QUYEN|quyền/);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'taoChungTuTuyChon', [ma, LOAI, { expectedRevision: rev(), mauChon: { maMau: 'MAU_B', phienBan: 1 } }])), /QUYEN|quyền/);
  assert.ok(J(voi('nhap@example.com', () => ctx.api('', 'capNhatMauChungTu', [ma, LOAI]))).maMau);
  assert.equal(J(voi('nhap@example.com', () => ctx.api('', 'taoChungTuTuyChon', [ma, LOAI, { expectedRevision: rev(), taoLai: true, mauChon: { maMau: 'MAU_B', phienBan: 1 } }]))).mau, 'MAU_B');
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try { assert.throws(() => ctx.layMauChoChungTu(ma, LOAI), /phạm vi|Không tìm thấy/); } finally { ctx.phamViCongTyNguoiDung_ = goc; }
});

(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('cập nhật / chọn mẫu chứng từ'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('cập nhật / chọn mẫu chứng từ'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://cm.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://cm.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40)), txt = (id) => document.getElementById(id).textContent;
      const ds = [{ loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', tenTaiLieu: 'Giấy đề nghị giải ngân', batBuoc: true, maMau: 'MAU_A', phienBanMau: 1, loaiFile: 'docx', nganHang: 'BIDV', loaiTien: 'VND', trangThai: 'Chưa phát hành', soLan: 0, loiGanNhat: 'Mẫu "MAU_A" v1 sinh ra tài liệu chưa đạt: • File mẫu MAU_A v1 trên Drive đã bị xoá' }];
      const dsMau = { maHoSo: 'HS-1', loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', tenTaiLieu: 'Giấy đề nghị giải ngân', loaiTien: 'VND', soNguoiHuong: 1, dangDung: { maMau: 'MAU_A', phienBan: 1, tenMau: 'Mẫu A', fileTonTai: false, loi: ['File mẫu MAU_A v1 trên Drive không còn.'] },
        ungVien: [{ maMau: 'MAU_A', phienBan: 1, tenMau: 'Mẫu A', nganHang: 'BIDV', loaiTien: 'VND', dieuKien: '1', loaiFile: 'docx', macDinh: false, dangDung: true, phuHop: true, fileTonTai: false, chonDuoc: false, lyDo: 'File mẫu MAU_A v1 trên Drive không còn.' },
          { maMau: 'MAU_B', phienBan: 2, tenMau: 'Mẫu B dự phòng', nganHang: '(mọi ngân hàng)', loaiTien: 'TAT_CA', dieuKien: '', loaiFile: 'docx', macDinh: false, dangDung: false, phuHop: true, fileTonTai: true, chonDuoc: true, lyDo: '' }] };
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        const dang = (ten, tra) => { x[ten] = function (...a) { goi.push(ten + ':' + JSON.stringify(a)); setTimeout(() => ok(tra(...a)), 0); return P; }; };
        dang('layDanhSachChungTuHoSo', () => ds); dang('layMauChoChungTu', () => dsMau); dang('capNhatMauChungTu', () => ({ maMau: 'MAU_B', phienBan: 2, hopLe: true, doiMau: true, mauCu: 'MAU_A', loi: [] })); dang('taoDeNghiGiaiNganBIDV', () => ({ loai: 'Giấy đề nghị giải ngân', soDong: 1 }));
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      MA_HO_SO_DANG_SUA = 'HS-1'; REVISION_HIEN_TAI = 3; FORM_HO_SO_BAN_ = false;
      taiDanhSachChungTuHoSo_(); await cho();
      const nutCapNhat = [...document.querySelectorAll('#ct_tbody button')].filter(b => /Cập nhật mẫu/.test(b.textContent)), nutChon = [...document.querySelectorAll('#ct_tbody button')].filter(b => /Chọn mẫu khác/.test(b.textContent));
      const a = { nCapNhat: nutCapNhat.length, nChon: nutChon.length, loi: document.querySelector('#ct_tbody').textContent.includes('Lỗi gần nhất') };
      goi.length = 0; nutCapNhat[0].click(); await cho();
      const b1 = { goi: goi.filter(g => /^capNhatMauChungTu/.test(g)), thongBao: document.getElementById('msgBox').textContent };
      goi.length = 0; nutChon[0].click(); await cho();
      const m = { hien: getComputedStyle(document.getElementById('modalChonMau')).display, goi: goi.filter(g => /^layMauChoChungTu/.test(g)), tieuDe: txt('cm_tieuDe'), moTa: txt('cm_moTa'), dong: [...document.querySelectorAll('#cm_tbody tr')].map(r => r.textContent), khoa: [...document.querySelectorAll('#cm_tbody input')].map(i => i.disabled), nutTao: document.getElementById('cm_nutTao').disabled };
      document.querySelectorAll('#cm_tbody input')[1].click(); await cho(); m.nutTaoSau = document.getElementById('cm_nutTao').disabled;
      goi.length = 0; taoBangMauDaChon_(); await cho();
      const t = { goi: goi.filter(g => /^taoDeNghiGiaiNganBIDV/.test(g)), dong: getComputedStyle(document.getElementById('modalChonMau')).display };
      return { a, b1, m, t };
    });
    assert.equal(kq.a.nCapNhat, 1); assert.equal(kq.a.nChon, 1); assert.ok(kq.a.loi);
    assert.deepEqual(kq.b1.goi, ['capNhatMauChungTu:["HS-1","DE_NGHI_GIAI_NGAN"]']); assert.match(kq.b1.thongBao, /MAU_B v2.*đã đổi từ MAU_A/);
    assert.equal(kq.m.hien, 'flex'); assert.deepEqual(kq.m.goi, ['layMauChoChungTu:["HS-1","DE_NGHI_GIAI_NGAN"]']); assert.match(kq.m.tieuDe, /Giấy đề nghị giải ngân/); assert.match(kq.m.moTa, /đang tự dùng: MAU_A v1/);
    assert.ok(/MAU_A.*đang tự dùng.*File mẫu MAU_A v1 trên Drive không còn/.test(kq.m.dong[0]) && /MAU_B.*Dùng được/.test(kq.m.dong[1]), kq.m.dong.join(' | ')); assert.deepEqual(kq.m.khoa, [true, false]); assert.equal(kq.m.nutTao, true); assert.equal(kq.m.nutTaoSau, false);
    assert.deepEqual(kq.t.goi, ['taoDeNghiGiaiNganBIDV:["HS-1",{"taoLai":false,"expectedRevision":3,"mauChon":{"maMau":"MAU_B","phienBan":2}}]']); assert.equal(kq.t.dong, 'none');
    assert.deepEqual(loi, []);
    console.log('PASS Giao diện: mỗi dòng chứng từ có “🔄 Cập nhật mẫu” và “🧩 Chọn mẫu khác”; hộp chọn khoá mẫu không dùng được; tạo chứng từ gửi đúng mẫu đã chọn');
  } catch (e) { console.log('FAIL Giao diện chọn mẫu → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('cập nhật / chọn mẫu chứng từ');
})();
