// Hồ sơ đính kèm dạng CHA–CON: hồ sơ giải ngân (cha) → hoá đơn / bảng lương / bảo hiểm (con, BHXH bảng riêng).
// Phần 1: API máy chủ lọc theo hồ sơ cha (giả lập Apps Script). Phần 2: giao diện thật bằng Chromium (bỏ qua nếu thiếu Playwright).
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const Q = require('./_qlv_chung')('cha_con_dinh_kem'), { ctx, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const SH = (ten) => G.boDuLieu.getSheetByName(ten);
const them = (ten, o) => { const sh = SH(ten); sh.g.push(sh.g[0].map(k => o[k] ?? '')); };
const hd = hopDong({ soHopDong: 'HD-CC' });
const A = themHoSo({ MaHoSo: 'HS-A', MaHD: hd.maHD }), B = themHoSo({ MaHoSo: 'HS-B', MaHD: hd.maHD });
ctx.damBaoCotSheet_(SH('BangKeHoaDon'), ctx.COT_BANGKE_HOADON_MO_RONG_);
ctx.ensureSheet_(G.boDuLieu, ctx.SHEET_TONGHOP_LUONG_BP, ctx.COT_TONGHOP_LUONG_BP_);
[['TL-A', A, 1], ['TL-B', B, 2], ['TL-N', '', 3]].forEach(([tl, hs, n]) => {
  them('TaiLieuDinhKem', { MaTaiLieu: tl, MaHoSo: hs, LoaiTaiLieu: 'BangLuong', TenFile: 'L_' + tl + '.xlsx' });
  them('BangKeBangLuong', { MaDongLuong: 'BL-' + tl, MaTaiLieu: tl, MaHoSo: hs, HoTen: 'Người ' + tl, Thang: '10/2026', SoTien: n * 1000 });
  them(ctx.SHEET_TONGHOP_LUONG_BP, { MaTaiLieu: tl, MaHoSo: hs, Thang: '10/2026', BoPhan: 'BP ' + tl, SoNguoi: 1, ThucLinh: n * 1000, BHXH: n * 10 });
  them('BangKeHoaDon', { MaHoaDon: 'HD-' + tl, MaTaiLieu: tl, MaHoSo: hs, SoHoaDon: '10' + n, SoTien: n * 100, DocDuoc: 'CO', LoaiChungTu: 'HOA_DON_GTGT' });
  them('BangKeHoaDon', { MaHoaDon: 'BH-' + tl, MaTaiLieu: tl, MaHoSo: hs, SoHoaDon: '', SoTien: n * 50, DocDuoc: 'CO', LoaiChungTu: 'BAO_HIEM', Thang: '10/2026', NLDDong: n * 5 });
});
const ma = (rows, k) => rows.map(r => r[k]).sort();

dat('API con lọc theo hồ sơ cha: không truyền = tất cả (giữ hành vi cũ); truyền mã = đúng hồ sơ; "" = chưa gắn hồ sơ', () => {
  assert.equal(ctx.layBangTongHopHoaDon().length, 6); assert.equal(ctx.layBangTongHopBangLuong().length, 3); assert.equal(J(ctx.layTongHopBangLuong()).length, 3);
  assert.deepEqual(ma(J(ctx.layBangTongHopHoaDon(A)), 'maHoaDon'), ['BH-TL-A', 'HD-TL-A']);
  assert.deepEqual(ma(J(ctx.layBangTongHopHoaDon('')), 'maHoaDon'), ['BH-TL-N', 'HD-TL-N']);
  assert.deepEqual(J(ctx.layBangTongHopBangLuong(B)).map(d => d.maDongLuong), ['BL-TL-B']);
  assert.deepEqual(J(ctx.layTongHopBangLuong(A)).map(g => [g.maTaiLieu, g.tongTien, g.boPhan.length]), [['TL-A', 1000, 1]]);
  assert.deepEqual(J(ctx.layTongHopBangLuong('')).map(g => g.maTaiLieu), ['TL-N']);
  assert.deepEqual(J(ctx.layTongHopBangLuong('HS-KHONG-CO')), []);
});
dat('Bảo hiểm (bảng riêng) lọc theo hồ sơ cha: chỉ số của hồ sơ đó, không cộng dồn hồ sơ khác', () => {
  const t = J(ctx.layTongHopBaoHiem(B)).find(x => x.thang === '10/2026');
  assert.equal(t.bangBH.length, 1); assert.equal(t.bangBH[0].maHoaDon, 'BH-TL-B'); assert.equal(t.tongBangBH.nldDong, 10); assert.equal(t.luong.bhxh, 20); assert.equal(t.luong.boPhan.length, 1);
  assert.equal(J(ctx.layTongHopBaoHiem(A)).find(x => x.thang === '10/2026').luong.bhxh, 10);
  assert.equal(J(ctx.layTongHopBaoHiem()).find(x => x.thang === '10/2026').luong.bhxh, 60);
});
dat('Qua api(): vai trò Chỉ xem đọc được bảng con; lọc cha vẫn chịu phạm vi công ty (ngoài phạm vi → rỗng)', () => {
  ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try {
    const mt = Q.mt; const c = mt.__email; mt.__email = 'xem@example.com';
    try { assert.deepEqual(J(ctx.api('', 'layBangTongHopHoaDon', [A])), []); } finally { mt.__email = c; }
  } finally { ctx.phamViCongTyNguoiDung_ = goc; }
  const mt = Q.mt, c = mt.__email; mt.__email = 'xem@example.com';
  try { assert.equal(J(ctx.api('', 'layBangTongHopHoaDon', [A])).length, 2); assert.equal(J(ctx.api('', 'layTongHopBaoHiem', [A])).length, 1); } finally { mt.__email = c; }
});

dat('Tháng: ô Sheets bị tự đổi thành ngày (Date) vẫn hiển thị "MM/yyyy", gom đúng nhóm; không lộ chuỗi "GMT+0700"', () => {
  const D = new Date(2026, 8, 1);                                                  // 01/09/2026 (Sheets tự chuyển "09/2026" thành ngày)
  them('TaiLieuDinhKem', { MaTaiLieu: 'TL-D', MaHoSo: A, LoaiTaiLieu: 'BangLuong', TenFile: 'L_D.xlsx' });
  them('BangKeBangLuong', { MaDongLuong: 'BL-D', MaTaiLieu: 'TL-D', MaHoSo: A, HoTen: 'Người D', Thang: D, SoTien: 7 });
  them(ctx.SHEET_TONGHOP_LUONG_BP, { MaTaiLieu: 'TL-D', MaHoSo: A, Thang: D, BoPhan: 'BP D', SoNguoi: 5, ThucLinh: 7, BHXH: 3 });
  them('BangKeHoaDon', { MaHoaDon: 'BH-D', MaTaiLieu: 'TL-D', MaHoSo: A, SoTien: 9, DocDuoc: 'CO', LoaiChungTu: 'BAO_HIEM', Thang: D, NLDDong: 2 });
  const g = J(ctx.layTongHopBangLuong(A)).find(x => x.maTaiLieu === 'TL-D'); assert.equal(g.thang, '09/2026');
  assert.equal(J(ctx.layBangTongHopBangLuong(A)).find(d => d.maDongLuong === 'BL-D').thang, '09/2026');
  const bh = J(ctx.layTongHopBaoHiem(A)); assert.deepEqual(bh.map(t => t.thang).sort(), ['09/2026', '10/2026']);
  assert.ok(!JSON.stringify(bh).includes('GMT'));
  assert.equal(ctx.chuanThang_('Tue Sep 01 2026 00:00:00 GMT+0700 (Indochina Time)'), '09/2026'); assert.equal(ctx.chuanThang_('9/2026'), '09/2026'); assert.equal(ctx.chuanThang_(''), '');
});
dat('Bảo hiểm nhập riêng: lưu tay 1 dòng bảng đóng BH (nguồn "NHAP_TAY") cạnh nguồn OCR; kiểm tháng/số; Chỉ xem bị chặn', () => {
  const kq = J(ctx.luuBaoHiemThuCong(B, { thang: '11/2026', soLaoDong: 12, mucLuong: 100000000, dnDong: 21500000, nldDong: 10500000, ghiChu: 'Nhập từ thông báo BHXH' }));
  assert.ok(kq.ok && /^HD/.test(kq.maHoaDon));
  const t = J(ctx.layTongHopBaoHiem(B)).find(x => x.thang === '11/2026'); assert.equal(t.bangBH.length, 1);
  assert.deepEqual([t.bangBH[0].nguon, t.bangBH[0].soLaoDong, t.bangBH[0].tongNop, t.bangBH[0].maHoSo], ['NHAP_TAY', 12, 32000000, B]);
  const ocr = J(ctx.layTongHopBaoHiem(B)).find(x => x.thang === '10/2026'); assert.equal(ocr.bangBH[0].nguon, 'OCR');
  ['10/2026x', '13/2026', '', '2026-11'].forEach(th => assert.throws(() => ctx.luuBaoHiemThuCong(B, { thang: th, soLaoDong: 1, dnDong: 1, nldDong: 1 }), /tháng/i, th));
  assert.throws(() => ctx.luuBaoHiemThuCong(B, { thang: '11/2026', soLaoDong: 1, dnDong: -5, nldDong: 1 }), /số tiền|không hợp lệ/i);
  assert.throws(() => ctx.luuBaoHiemThuCong('HS-KHONG-CO', { thang: '11/2026', soLaoDong: 1, dnDong: 1, nldDong: 1 }), /Không tìm thấy hồ sơ/);
  const mt = Q.mt, c = mt.__email; mt.__email = 'xem@example.com';
  try { assert.throws(() => ctx.api('', 'luuBaoHiemThuCong', [B, { thang: '11/2026', soLaoDong: 1, dnDong: 1, nldDong: 1 }]), /QUYEN|quyền/); } finally { mt.__email = c; }
});

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('cha–con hồ sơ đính kèm'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b;
  try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); }
  catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('cha–con hồ sơ đính kèm'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort());
    await p.route('http://dk.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://dk.test');
    const kq = await p.evaluate(async () => {
      const goi = [];
      const hd = { 'HS-A': [{ maHoaDon: 'H1', maHoSo: 'HS-A', soHoaDon: '0001', soTien: 100, docDuoc: true, loaiChungTu: 'HOA_DON_GTGT' }], 'HS-B': [{ maHoaDon: 'H2', maHoSo: 'HS-B', soHoaDon: '0002', soTien: 200, docDuoc: true, loaiChungTu: 'HOA_DON_GTGT' }, { maHoaDon: 'H3', maHoSo: 'HS-B', soHoaDon: '0003', soTien: 300, docDuoc: true, loaiChungTu: 'HOA_DON_GTGT' }], '': [{ maHoaDon: 'H4', maHoSo: '', soHoaDon: '0004', soTien: 400, docDuoc: true, loaiChungTu: 'HOA_DON_GTGT' }] };
      const luong = { 'HS-A': [{ maDongLuong: 'L1', hoTen: 'Nhân viên A', thang: '10/2026', soTien: 5000 }], 'HS-B': [], '': [] };
      const grp = { 'HS-A': [{ maTaiLieu: 'TL1', tenFile: 'LuongA.xlsx', thang: '10/2026', maHoSo: 'HS-A', soNguoi: 1, coSTK: 0, tongTien: 5000, tongThucLinhBoPhan: 0, khopBoPhan: true, boPhan: [] }], 'HS-B': [], '': [] };
      const bh = { 'HS-A': [], 'HS-B': [{ thang: '10/2026', luong: { soNguoi: 0, bhxh: 0, bhyt: 0, bhtn: 0, kpcd: 0, nldBH: 0, boPhan: [] }, bangBH: [{ maHoaDon: 'B1', maHoSo: 'HS-B', tenFile: 'BH_B.pdf', trang: '1', soLaoDong: 7, mucLuong: 1, dnDong: 2, nldDong: 3, tongNop: 5, tinCay: 'CAO' }], tongBangBH: {}, chenhLechNLD: null }], '': [] };
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        const dang = (ten, tra) => { x[ten] = function (ma) { goi.push(ten + ':' + (ma === undefined ? '*' : ma)); setTimeout(() => ok(tra(ma)), 0); return P; }; };
        dang('layTongHopHoSoVaTaiLieu', () => [{ maHoSo: 'HS-A', tenCty: 'C', soHopDong: 'H', loaiTien: 'VND', soTien: 1, trangThai: 'Nháp', soHoaDon: 1, soBangLuong: 1 }, { maHoSo: 'HS-B', tenCty: 'C', soHopDong: 'H', loaiTien: 'VND', soTien: 2, trangThai: 'Nháp', soHoaDon: 2, soBangLuong: 0 }]);
        dang('layBangTongHopHoaDon', ma => hd[ma] || []); dang('layBangTongHopBangLuong', ma => luong[ma] || []); dang('layTongHopBangLuong', ma => grp[ma] || []); dang('layTongHopBaoHiem', ma => bh[ma] || []);
        x.luuBaoHiemThuCong = function (ma, p) { goi.push('luuBaoHiemThuCong:' + ma + ':' + JSON.stringify(p)); setTimeout(() => ok({ ok: true, thang: p.thang }), 0); return P; };
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      const cho = () => new Promise(r => setTimeout(r, 40)), txt = id => document.getElementById(id).textContent;
      taiDanhSachDinhKem(); await cho();
      const batDau = { hd: document.querySelectorAll('#tbody_tonghopHoaDon tr').length, tieuDe: txt('dk_tieuDeCon'), goiBanDau: goi.slice() };
      goi.length = 0;
      const dongCha = [...document.querySelectorAll('#tbody_dinhkem tr')];
      dongCha.find(r => /HS-B/.test(r.textContent)).querySelector('td').click(); await cho();
      const chonB = { hd: [...document.querySelectorAll('#tbody_tonghopHoaDon tr')].map(r => r.textContent), dem: txt('hd_tonghop_dem'), luong: txt('luong_tonghop_tep'), bh: txt('bh_tonghop'), tieuDe: txt('dk_tieuDeCon'), dangChon: [...document.querySelectorAll('#tbody_dinhkem tr.dk-dang-chon')].map(r => r.querySelector('td').textContent), goi: goi.slice(), bhRieng: !!document.getElementById('bh_tonghop').closest('.card') && document.getElementById('bh_tonghop').closest('.card') !== document.getElementById('luong_tonghop_tep').closest('.card') };
      goi.length = 0;
      [...document.querySelectorAll('#tbody_dinhkem tr')].find(r => /HS-A/.test(r.textContent)).querySelector('td').click(); await cho();
      const chonA = { hd: [...document.querySelectorAll('#tbody_tonghopHoaDon tr')].map(r => r.textContent), luong: txt('luong_tonghop_tep'), nguoi: txt('tbody_tonghopLuong'), bh: txt('bh_tonghop') };
      goi.length = 0;
      [...document.querySelectorAll('#tbody_dinhkem tr')].find(r => /HS-B/.test(r.textContent)).querySelector('button').click(); await cho();
      const bamNut = { dangChon: [...document.querySelectorAll('#tbody_dinhkem tr.dk-dang-chon')].map(r => r.querySelector('td').textContent), goi: goi.slice() };
      goi.length = 0;
      document.getElementById('dk_chuaGan').click(); await cho();
      const chuaGan = { hd: [...document.querySelectorAll('#tbody_tonghopHoaDon tr')].map(r => r.textContent), tieuDe: txt('dk_tieuDeCon'), goi: goi.slice() };
      goi.length = 0;
      [...document.querySelectorAll('#tbody_dinhkem tr')].find(r => /HS-B/.test(r.textContent)).querySelector('td').click(); await cho(); goi.length = 0;
      el_('bhn_thang').value = '11/2026'; el_('bhn_soLD').value = '12'; el_('bhn_muc').value = '100.000.000'; el_('bhn_dn').value = '21.500.000'; el_('bhn_nld').value = '10.500.000';
      luuBaoHiemThuCongClick_(); await cho();
      const nhapTay = { goi: goi.slice(), thangSau: el_('bhn_thang').value, bhHtml: txt('bh_tonghop') };
      const pad = (sel, k) => parseFloat(getComputedStyle(document.querySelector(sel)).getPropertyValue(k));
      const khoangCach = { luong: pad('#tbl_tonghopLuong th:nth-child(3)', 'padding-right') + pad('#tbl_tonghopLuong th:nth-child(4)', 'padding-left'), hoaDon: pad('#tbl_tonghopHoaDon th:nth-child(6)', 'padding-right') + pad('#tbl_tonghopHoaDon th:nth-child(7)', 'padding-left') };
      return { batDau, chonB, chonA, bamNut, chuaGan, nhapTay, khoangCach };
    });
    assert.equal(kq.batDau.hd, 1, 'chưa chọn cha: 1 dòng nhắc chọn'); assert.match(kq.batDau.tieuDe, /Chọn một hồ sơ/);
    assert.deepEqual(kq.batDau.goiBanDau.filter(g => /^lay(BangTongHop|TongHopBangLuong|TongHopBaoHiem)/.test(g)), [], 'chưa chọn cha thì không tải bảng con');
    assert.deepEqual(kq.chonB.dangChon, ['HS-B']); assert.match(kq.chonB.tieuDe, /HS-B/);
    assert.deepEqual(kq.chonB.goi.sort(), ['layBangTongHopBangLuong:HS-B', 'layBangTongHopHoaDon:HS-B', 'layTongHopBangLuong:HS-B', 'layTongHopBaoHiem:HS-B']);
    assert.equal(kq.chonB.hd.length, 2); assert.ok(/0002/.test(kq.chonB.hd[0]) && /0003/.test(kq.chonB.hd[1]) && !kq.chonB.hd.join('').includes('0001')); assert.match(kq.chonB.dem, /2 hoá đơn/);
    assert.match(kq.chonB.bh, /BH_B\.pdf/); assert.ok(kq.chonB.bhRieng, 'Bảo hiểm ở bảng (card) riêng'); assert.ok(!/LuongA/.test(kq.chonB.luong));
    assert.ok(kq.chonA.hd.length === 1 && /0001/.test(kq.chonA.hd[0]) && /LuongA\.xlsx/.test(kq.chonA.luong) && /Nhân viên A/.test(kq.chonA.nguoi) && !/BH_B/.test(kq.chonA.bh));
    assert.deepEqual(kq.bamNut.dangChon, ['HS-A'], 'bấm nút trong dòng không đổi hồ sơ đang chọn'); assert.deepEqual(kq.bamNut.goi, []);
    assert.ok(kq.chuaGan.hd.length === 1 && /0004/.test(kq.chuaGan.hd[0]) && /chưa gắn hồ sơ/i.test(kq.chuaGan.tieuDe)); assert.ok(kq.chuaGan.goi.includes('layBangTongHopHoaDon:'));
    const g0 = kq.nhapTay.goi.find(g => g.startsWith('luuBaoHiemThuCong:HS-B:')); assert.ok(g0, JSON.stringify(kq.nhapTay.goi));
    assert.deepEqual(JSON.parse(g0.slice('luuBaoHiemThuCong:HS-B:'.length)), { thang: '11/2026', soLaoDong: 12, mucLuong: 100000000, dnDong: 21500000, nldDong: 10500000, ghiChu: '' });
    assert.ok(kq.nhapTay.goi.includes('layTongHopBaoHiem:HS-B'), 'nạp lại bảng bảo hiểm sau khi lưu'); assert.equal(kq.nhapTay.thangSau, '', 'xoá ô nhập sau khi lưu');
    assert.ok(kq.khoangCach.luong >= 40 && kq.khoangCach.hoaDon >= 40, 'Số tiền không dính cột bên cạnh: ' + JSON.stringify(kq.khoangCach));
    assert.deepEqual(loi, []);
    console.log('PASS Giao diện: bấm hồ sơ cha → hoá đơn / bảng lương / BHXH (bảng riêng) của đúng hồ sơ; chưa gắn hồ sơ có dòng riêng; bấm nút trong dòng không đổi chọn');
  } catch (e) { console.log('FAIL Giao diện cha–con hồ sơ đính kèm → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('cha–con hồ sơ đính kèm');
})();
