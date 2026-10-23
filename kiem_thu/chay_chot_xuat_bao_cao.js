// CHỐT BÁO CÁO TIỀN LÃI THEO KỲ + XUẤT EXCEL/PDF. Giả lập Apps Script/Sheets (bảng tạm + UrlFetchApp giả) — chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('chot_xuat_bao_cao'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hd1 = hopDong({ soHopDong: 'HD-C1', laiSuatTrongHan: 10 });
ctx.damBaoCotSheet_(G.boDuLieu.getSheetByName('HoSoGiaiNgan'), ['DaTatToan', 'NgayTatToan']);
const hs = (ma, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd1.maHD, NgayGiaiNgan: '2026-01-10', NgayDenHan: '2026-12-31', SoTienNhanNoLanNay: 365000000, SoGiayNhanNo: 'GNN-' + ma }, o));
hs('C-A'); hs('C-B', { LoaiTien: 'USD', SoTienNhanNoLanNay: 36500 });
const lai = (o) => J(ctx.layBaoCaoTienLai(o)), docFile = (r) => JSON.parse(Buffer.from(r.base64, 'base64').toString('utf8'));

dat('Chốt kỳ: lưu ảnh chụp đúng số liệu; tổng khớp báo cáo; ghi nhật ký; không sửa theo dữ liệu gốc sau đó', () => {
  const bc = lai({ tuNgay: '2026-02-01', denNgay: '2026-02-28' });
  const r = J(ctx.chotBaoCaoLai({ tenKy: 'Tháng 02/2026', tuNgay: '2026-02-01', denNgay: '2026-02-28', ghiChu: 'chốt thử' }));
  assert.equal(r.ok, true); assert.equal(r.soDong, bc.chiTiet.length); assert.deepEqual(r.tong, bc.tong);
  const ct = J(ctx.layChiTietChotLai(r.maChot));
  assert.equal(ct.ky.trangThai, 'Đã chốt'); assert.equal(ct.ky.tenKy, 'Tháng 02/2026'); assert.deepEqual(ct.ky.tongLai, bc.tong); assert.equal(ct.dong.length, bc.chiTiet.length);
  assert.equal(ct.dong.find(d => d.maHoSo === 'C-A').lai, 2800000); assert.equal(ct.dong.find(d => d.maHoSo === 'C-B').lai, 280); assert.equal(ct.coLech, false, 'vừa chốt: chưa lệch');
  // trả gốc làm dư nợ đổi → số hiện tại đổi, bản chốt giữ nguyên và báo lệch
  ctx.ghiNhanTraNo('C-A', { loaiTra: 'GOC', ngayTra: '2026-02-10', soTien: 165000000, soThamChieu: 'UNC-1', chungTu: 'UNC 1' }, Q.rev('C-A'));
  const sau = J(ctx.layChiTietChotLai(r.maChot));
  assert.equal(sau.dong.find(d => d.maHoSo === 'C-A').lai, 2800000, 'số đã chốt không đổi'); assert.equal(sau.coLech, true);
  assert.deepEqual(sau.lech.map(x => [x.thang, x.maHoSo, x.laiDaChot < x.laiHienTai]), [['2026-02', 'C-A', false]], 'hiện tại thấp hơn vì đã trả gốc');
  assert.equal(J(ctx.layDanhSachChotLai()).length, 1);
});
dat('Không chồng kỳ: trùng ngày bị chặn; khác loại tiền hoặc kỳ liền kề cho phép; hủy chốt (cần lý do) rồi chốt lại được', () => {
  assert.throws(() => ctx.chotBaoCaoLai({ tenKy: 'Chồng', tuNgay: '2026-02-15', denNgay: '2026-03-15' }), /trùng kỳ đã chốt CHOT-0001/);
  assert.throws(() => ctx.chotBaoCaoLai({ tenKy: 'Chồng USD', tuNgay: '2026-02-15', denNgay: '2026-03-15', loaiTien: 'USD' }), /trùng/, 'kỳ đã chốt là "tất cả" nên chồng cả USD');
  const m3 = J(ctx.chotBaoCaoLai({ tenKy: 'Tháng 03/2026', tuNgay: '2026-03-01', denNgay: '2026-03-31' })); assert.equal(m3.maChot, 'CHOT-0002');
  assert.throws(() => ctx.huyChotLai('CHOT-0001', 'ngắn'), /lý do/); assert.throws(() => ctx.huyChotLai('CHOT-9999', 'không tồn tại nhé'), /Không tìm thấy/);
  ctx.huyChotLai('CHOT-0001', 'Chốt nhầm kỳ, tính lại'); assert.throws(() => ctx.huyChotLai('CHOT-0001', 'hủy lần hai nữa'), /đã được hủy/);
  const ds = J(ctx.layDanhSachChotLai()); assert.deepEqual(ds.map(x => [x.maChot, x.trangThai]).sort(), [['CHOT-0001', 'Đã hủy chốt'], ['CHOT-0002', 'Đã chốt']]);
  assert.equal(ds.find(x => x.maChot === 'CHOT-0001').lyDoHuy, 'Chốt nhầm kỳ, tính lại'); assert.equal(J(ctx.layChiTietChotLai('CHOT-0001')).dong.length > 0, true, 'bản đã hủy vẫn xem được (không xoá)');
  const lai2 = J(ctx.chotBaoCaoLai({ tenKy: 'Tháng 02/2026 (chốt lại)', tuNgay: '2026-02-01', denNgay: '2026-02-28', loaiTien: 'USD' })); assert.equal(lai2.maChot, 'CHOT-0003');
  assert.throws(() => ctx.chotBaoCaoLai({ tenKy: 'Rỗng', tuNgay: '2025-01-01', denNgay: '2025-01-31' }), /không có lãi phát sinh/);
  assert.throws(() => ctx.chotBaoCaoLai({ tenKy: '', tuNgay: '2026-04-01', denNgay: '2026-04-30' }), /tên kỳ/); assert.throws(() => ctx.chotBaoCaoLai({ tenKy: 'x', tuNgay: '2026-04-01', denNgay: '2026-04-30', loaiTien: 'EUR' }), /Loại tiền/);
});
dat('Quyền + phạm vi: người xem không chốt/hủy; tài khoản giới hạn công ty không chốt, không xem bản chốt; công thức bị vô hiệu hoá', () => {
  const c = mt.__email; mt.__email = 'xem@example.com';
  try {
    assert.throws(() => ctx.api('', 'chotBaoCaoLai', [{ tenKy: 'X', tuNgay: '2026-05-01', denNgay: '2026-05-31' }]), /quyền|Quản trị|không được phép/i);
    assert.throws(() => ctx.api('', 'huyChotLai', ['CHOT-0002', 'không đủ quyền']), /quyền|Quản trị|không được phép/i);
  } finally { mt.__email = c; }
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try { assert.throws(() => ctx.chotBaoCaoLai({ tenKy: 'X', tuNgay: '2026-05-01', denNgay: '2026-05-31' }), /toàn hệ thống/); assert.throws(() => ctx.layDanhSachChotLai(), /toàn hệ thống/); assert.throws(() => ctx.layChiTietChotLai('CHOT-0002'), /toàn hệ thống/); assert.throws(() => ctx.xuatBaoCaoLai({ maChot: 'CHOT-0002', dinhDang: 'xlsx' }), /toàn hệ thống/); } finally { ctx.phamViCongTyNguoiDung_ = g; }
  const k = J(ctx.chotBaoCaoLai({ tenKy: '=HYPERLINK("http://x")', tuNgay: '2026-05-01', denNgay: '2026-05-31' })); assert.ok(!/^=/.test(J(ctx.layChiTietChotLai(k.maChot)).ky.tenKy), 'tên kỳ không được là công thức');
});
dat('Xuất Excel: 4 sheet đúng số liệu, số giữ kiểu số, đủ cột; file tạm bỏ vào thùng rác; gửi token; không đụng sheet nghiệp vụ', () => {
  const truoc = Object.keys(G.boDuLieu.sheets).sort().join(',');
  const r = J(ctx.xuatBaoCaoLai({ tuNgay: '2026-02-01', denNgay: '2026-02-28', dinhDang: 'xlsx' })), f = docFile(r);
  assert.equal(r.tenFile, 'TienLai_2026-02-01_2026-02-28.xlsx'); assert.match(r.mime, /spreadsheetml/); assert.deepEqual(f.map(s => s.ten), ['Theo hồ sơ', 'Theo hợp đồng', 'Theo tháng', 'Chi tiết tháng x hồ sơ']);
  const hang = f[0].g; assert.equal(hang[0][0], 'Mã hồ sơ'); const a = hang.find(x => x[0] === 'C-A'); assert.equal(a[11], lai({ tuNgay: '2026-02-01', denNgay: '2026-02-28' }).theoHoSo.find(x => x.maHoSo === 'C-A').lai); assert.equal(a[11], 1941096, 'sau khi trả gốc 10/02: 9 ngày × 100.000 + 19 ngày × 54.795'); assert.equal(typeof a[11], 'number'); assert.equal(hang.find(x => x[0] === 'C-B')[11], 280);
  assert.equal(f[3].g.length, 1 + 2); assert.equal(mt.__xuatTam.at(-1).auth, 'Bearer TOKEN'); assert.match(mt.__xuatTam.at(-1).url, /format=xlsx/);
  const tam = Object.values(mt.__.dsFile).filter(x => x.googleDoc && /^TienLai_/.test(x.getName())); assert.ok(tam.length && tam.every(x => x.isTrashed()), 'file tạm phải vào thùng rác');
  assert.equal(Object.keys(G.boDuLieu.sheets).sort().join(','), truoc, 'xuất không tạo sheet nào trong file dữ liệu thật');
});
dat('Xuất PDF + lỗi: PDF ngang khổ A4; lỗi từ Google không lộ file/để lại file tạm; quá nhiều dòng bị chặn; định dạng sai bị chặn', () => {
  const r = J(ctx.xuatBaoCaoLai({ tuNgay: '2026-02-01', denNgay: '2026-02-28', dinhDang: 'pdf' })); assert.match(r.tenFile, /\.pdf$/); assert.equal(r.mime, 'application/pdf'); assert.match(mt.__xuatTam.at(-1).url, /format=pdf&portrait=false&size=A4/);
  mt.__xuatLoi = 500; try { assert.throws(() => ctx.xuatBaoCaoLai({ tuNgay: '2026-02-01', denNgay: '2026-02-28', dinhDang: 'xlsx' }), /Không xuất được file XLSX \(mã 500\)/); } finally { mt.__xuatLoi = 0; }
  assert.ok(Object.values(mt.__.dsFile).filter(x => x.googleDoc && /^TienLai_/.test(x.getName())).every(x => x.isTrashed()), 'lỗi vẫn dọn file tạm');
  assert.throws(() => ctx.xuatBaoCaoLai({ tuNgay: '2026-02-01', denNgay: '2026-02-28', dinhDang: 'docx' }), /xlsx hoặc pdf/);
  assert.throws(() => ctx.xuatBangRaFile_('Lon', [{ ten: 'A', dong: new Array(5001).fill(['x']) }], 'xlsx'), /Quá nhiều dòng/);
  const x = docFile(J(ctx.xuatBangRaFile_('CT', [{ ten: 'A', dong: [['=1+1', 5, null], ['b']] }], 'xlsx')))[0].g; assert.ok(!/^=/.test(x[0][0]), 'ô văn bản bắt đầu bằng = bị vô hiệu hoá'); assert.equal(x[0][1], 5); assert.equal(x[1].length, 3, 'lưới được đệm đủ cột');
});
dat('Xuất kỳ đã chốt (số đã chốt, không tính lại) và xuất theo dõi tất toán theo ngày', () => {
  const r = J(ctx.xuatBaoCaoLai({ maChot: 'CHOT-0002', dinhDang: 'xlsx' })), f = docFile(r); assert.equal(r.tenFile, 'Chot_CHOT-0002.xlsx'); assert.deepEqual(f.map(s => s.ten), ['Thông tin kỳ chốt', 'Chi tiết đã chốt']);
  assert.equal(f[0].g[1][1], 'Tháng 03/2026'); assert.ok(f[1].g.some(x => x[1] === 'C-B' && x[7] === 310));
  const t = J(ctx.xuatTheoDoiTatToan('C-A', { tuNgay: '2026-03-01', denNgay: '2026-03-10' }, 'pdf')), g = docFile(t)[0].g; assert.match(t.tenFile, /^TatToan_C-A_2026-03-01_2026-03-10\.pdf$/); assert.equal(g.length, 1 + 10); assert.equal(g[0][0], 'Ngày'); assert.equal(g[1][0], '2026-03-01');
  const c = mt.__email; mt.__email = 'xem@example.com'; try { assert.equal(J(ctx.api('', 'xuatBaoCaoLai', [{ tuNgay: '2026-02-01', denNgay: '2026-02-28', dinhDang: 'xlsx' }])).ok, true); } finally { mt.__email = c; }
});
(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('chốt báo cáo tiền lãi + xuất Excel/PDF'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('chốt báo cáo tiền lãi + xuất Excel/PDF'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://chot.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://chot.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40)), tai = [], hoi = [];
      const res = { tuNgay: '2026-07-01', denNgay: '2026-07-31', soNgayKhoang: 31, coSoNgay: 365, coLaiPhat: true, tong: { VND: 0, USD: 310 }, tongPhat: { VND: 4650000 }, tongQuyDoi: { laiTrongHan: 8060000, laiPhat: 4650000, tong: 12710000, soDongThieuTyGia: 0 }, ghiChu: 'g',
        theoHoSo: [{ maHoSo: 'L-X', soGiayNhanNo: '', tenCty: 'Cty', maHD: 'H', soHopDong: 'HD-1', loaiTien: 'VND', goc: 365000000, laiSuat: 10, ngayTatToan: '', tuNgayTinh: '', denNgayTinh: '', soNgay: 0, duNoBinhQuan: 0, lai: 0, laiPhat: 4650000, laiDaTra: 0, quyDoiVND: 4650000, canhBao: '' },
          { maHoSo: 'L-B', soGiayNhanNo: '', tenCty: 'Cty', maHD: 'H', soHopDong: 'HD-1', loaiTien: 'USD', goc: 36500, laiSuat: 10, ngayTatToan: '', tuNgayTinh: '2026-07-01', denNgayTinh: '2026-07-31', soNgay: 31, duNoBinhQuan: 36500, lai: 310, laiPhat: 0, laiDaTra: 0, quyDoiVND: null, canhBao: 'THIEU_TY_GIA' }],
        theoHopDong: [{ maHD: 'H', soHopDong: 'HD-1', tenCty: 'Cty', soKhoan: 2, laiSuat: 10, lai: { USD: 310 }, laiPhat: { VND: 4650000 }, laiDaTra: {}, quyDoiVND: 4650000, thieuTyGia: 1 }],
        theoThang: [{ thang: '2026-07', soNgay: 31, soKhoan: 2, lai: { USD: 310 }, laiPhat: { VND: 4650000 }, quyDoiVND: null, tyGiaCuoiThang: 27000 }], chiTiet: [] };
      const ds = [{ maChot: 'CHOT-0001', tenKy: 'Tháng 06/2026', tuNgay: '2026-06-01', denNgay: '2026-06-30', loaiTien: '', soDong: 3, tongLai: { VND: 100, USD: 5 }, tongQuyDoiVND: 130000, trangThai: 'Đã chốt', nguoiChot: 'ketoan@example.com', thoiDiemChot: '2026-07-01 08:00', lyDoHuy: '' }, { maChot: 'CHOT-0002', tenKy: 'Nhầm', tuNgay: '2026-05-01', denNgay: '2026-05-31', loaiTien: 'USD', soDong: 1, tongLai: { USD: 1 }, tongQuyDoiVND: 0, trangThai: 'Đã hủy chốt', nguoiChot: 'a', thoiDiemChot: '', lyDoHuy: 'Chốt nhầm' }];
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        const tra = (ten, v) => { x[ten] = function (...a) { goi.push([ten, JSON.stringify(a)]); setTimeout(() => ok(typeof v === 'function' ? v(...a) : v), 0); return P; }; };
        tra('layBaoCaoTienLai', res); tra('layDanhSachChotLai', ds); tra('xuatBaoCaoLai', (t) => ({ tenFile: 'x.xlsx', mime: 'application/vnd.ms-excel', base64: 'eA==', soDong: 7 })); tra('chotBaoCaoLai', (t) => ({ maChot: 'CHOT-0003', soDong: 2 })); tra('huyChotLai', { ok: true });
        tra('layChiTietChotLai', (m) => ({ ky: ds[0], dong: [{ thang: '2026-06', maHoSo: 'L-A', soHopDong: 'HD-1', loaiTien: 'VND', soNgay: 30, duNoBinhQuan: 1, laiSuat: 10, lai: 100, laiPhat: 0, quyDoiVND: 100 }], lech: [{ thang: '2026-06', maHoSo: 'L-A', laiDaChot: 100, laiHienTai: 90 }], coLech: true }));
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      window.luuBlobTaiVe_ = (b64, ten, mime) => tai.push([b64, ten, mime]); window.hoiXacNhan = (m, f) => { hoi.push(m); f(); }; let ten = 'Tháng 07/2026'; window.prompt = () => ten;
      window.HAK_NGUOI_DUNG = null;
      document.getElementById('tabBtn-baocao').click(); chuyenBcSub_(5); await cho();
      const a = { tom: el_('bcLai_tomTat').textContent, hs: [...document.querySelectorAll('#bcLai_tbHoSo tbody tr')].map(r => r.textContent), th: [...document.querySelectorAll('#bcLai_tbThang tbody tr')].map(r => r.textContent),
        chot: [...document.querySelectorAll('#bcLai_tbChot tbody tr')].map(r => r.textContent), btnChot: getComputedStyle(el_('bcLai_btnChot')).display, goi0: goi.map(g => g[0]) };
      xuatFileBcLai_('xlsx'); await cho(); xuatFileBcLai_('pdf'); await cho(); xuatFileBcLai_('xlsx', 'CHOT-0001'); await cho();
      el_('bcLai_tuNgay').value = '2026-07-01'; el_('bcLai_denNgay').value = '2026-07-31'; moChotBcLai_(); await cho(); xemChotLai_('CHOT-0001'); await cho(); const ct = el_('bcLai_chotChiTiet').textContent; huyChotLaiClick_('CHOT-0001'); await cho();
      window.HAK_NGUOI_DUNG = { cheDo: 'CONG_HAK', vaiTro: 'KE_TOAN' }; taiChotLai_();
      return { a, tai, hoi, ct, goi, an: { chot: getComputedStyle(el_('bcLai_chotBox')).display, nut: getComputedStyle(el_('bcLai_btnChot')).display } };
    });
    assert.match(kq.a.tom, /Lãi quá hạn \/ phạt \(ước tính\): 4\.650\.000 VND/); assert.match(kq.a.tom, /Tổng quy đổi VND.*12\.710\.000/); assert.match(kq.a.hs[0], /4\.650\.000/); assert.match(kq.a.hs[1], /Thiếu tỷ giá/); assert.match(kq.a.th[0], /27\.000/);
    assert.equal(kq.a.chot.length, 2); assert.match(kq.a.chot[0], /CHOT-0001.*Tháng 06\/2026.*Đã chốt.*Hủy chốt/); assert.ok(!/Hủy chốt$/.test(kq.a.chot[1]) && /Chốt nhầm/.test(kq.a.chot[1]), 'kỳ đã hủy không còn nút hủy'); assert.notEqual(kq.a.btnChot, 'none');
    assert.deepEqual(kq.tai.map(t => t[1]), ['x.xlsx', 'x.xlsx', 'x.xlsx']); const g = (n) => kq.goi.filter(x => x[0] === n).map(x => JSON.parse(x[1])[0]);
    assert.deepEqual(g('xuatBaoCaoLai').map(t => [t.dinhDang, t.maChot || '']), [['xlsx', ''], ['pdf', ''], ['xlsx', 'CHOT-0001']]); assert.equal(g('xuatBaoCaoLai')[0].baoGomLaiPhat, true);
    assert.deepEqual(g('chotBaoCaoLai').map(t => [t.tenKy, t.tuNgay, t.denNgay]), [['Tháng 07/2026', '2026-07-01', '2026-07-31']]); assert.equal(kq.hoi.length, 1);
    assert.match(kq.ct, /lệch.*L-A.*chốt 100 ≠ hiện tại 90/); assert.deepEqual(g('huyChotLai'), ['CHOT-0001']); assert.deepEqual(kq.goi.filter(x => x[0] === 'huyChotLai').map(x => JSON.parse(x[1])[1]), ['Tháng 07/2026']);
    assert.deepEqual(kq.an, { chot: 'none', nut: 'none' }, 'người không phải Quản trị không thấy phần chốt'); assert.deepEqual(loi, []);
    console.log('PASS Giao diện: cột lãi quá hạn/quy đổi VND, xuất Excel/PDF, chốt kỳ, xem lệch, hủy chốt; ẩn với người không phải Quản trị');
  } catch (e) { console.log('FAIL Giao diện chốt/xuất báo cáo lãi → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('chốt báo cáo tiền lãi + xuất Excel/PDF');
})();
