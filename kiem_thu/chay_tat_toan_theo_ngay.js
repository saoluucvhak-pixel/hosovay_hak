// THEO DÕI TẤT TOÁN THEO NGÀY: dư nợ gốc, lãi phát sinh từng ngày + lũy kế, sự kiện (giải ngân, trả gốc/lãi, đến hạn, tất toán), số ngày còn lại tới hạn. Giả lập Apps Script/Sheets.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('tat_toan_theo_ngay'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hd = hopDong({ soHopDong: 'HD-TD', laiSuatTrongHan: 10 });
ctx.damBaoCotSheet_(G.boDuLieu.getSheetByName('HoSoGiaiNgan'), ['DaTatToan', 'NgayTatToan']);
const hs = (ma, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd.maHD, NgayGiaiNgan: '2026-01-10', NgayDenHan: '2026-12-31', SoTienNhanNoLanNay: 365000000 }, o));
hs('N-A'); hs('N-D', { DaTatToan: true, NgayTatToan: '2026-02-15' }); hs('N-NHAP', { TrangThai: 'Nháp' });
ctx.ghiNhanTraNo('N-A', { loaiTra: 'GOC', ngayTra: '2026-03-11', soTien: 165000000, soThamChieu: 'UNC-1', chungTu: 'UNC 1' }, Q.rev('N-A'));
ctx.ghiNhanTraNo('N-A', { loaiTra: 'LAI', ngayTra: '2026-03-05', soTien: 2000000, soThamChieu: 'UNC-2', chungTu: 'UNC 2' }, Q.rev('N-A'));
const lay = (ma, o) => J(ctx.layTheoDoiTatToanTheoNgay(ma, o));
const ngay = (r, d) => r.rows.find(x => x.ngay === d);

dat('Từng ngày quanh ngày trả gốc 11/03: dư nợ, lãi ngày, lãi lũy kế tính tay; sự kiện trả gốc/lãi', () => {
  const r = lay('N-A', { tuNgay: '2026-03-09', denNgay: '2026-03-12' });
  assert.deepEqual(r.rows.map(x => x.ngay), ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12']);
  assert.deepEqual([ngay(r, '2026-03-10').duNoGocCuoiNgay, ngay(r, '2026-03-10').laiNgay, ngay(r, '2026-03-10').laiLuyKe], [365000000, 100000, 6000000], 'lũy kế từ 10/01 đến hết 10/03 = 60 ngày × 100.000');
  const t11 = ngay(r, '2026-03-11'); assert.deepEqual([t11.duNoGocCuoiNgay, t11.laiNgay, t11.gocTra, t11.laiLuyKe], [200000000, 54795, 165000000, 6054795]); assert.ok(t11.suKien.some(s => /Trả gốc/.test(s)));
  assert.equal(ngay(r, '2026-03-12').laiLuyKe, 6109589); assert.equal(r.rows.find(x => x.ngay === '2026-03-12').duNoGocCuoiNgay, 200000000);
  const r5 = lay('N-A', { tuNgay: '2026-03-04', denNgay: '2026-03-06' }); assert.equal(ngay(r5, '2026-03-05').laiTra, 2000000); assert.ok(ngay(r5, '2026-03-05').suKien.some(s => /Trả lãi/.test(s)));
});
dat('Số ngày còn lại tới hạn + đánh dấu dự kiến: ngày tương lai là "dự kiến"; ngày đến hạn có sự kiện, không tính lãi; dừng đúng ngày đến hạn', () => {
  const r = lay('N-A', { tuNgay: '2026-12-29', denNgay: '2027-01-05' });
  assert.deepEqual(r.rows.map(x => x.ngay), ['2026-12-29', '2026-12-30', '2026-12-31']); assert.deepEqual(r.rows.map(x => x.soNgayDenHan), [2, 1, 0]);
  assert.ok(r.rows.every(x => x.duKien === true)); assert.equal(ngay(r, '2026-12-31').laiNgay, 0); assert.ok(ngay(r, '2026-12-31').suKien.some(s => /Đến hạn khoản vay/.test(s)));
  assert.equal(lay('N-A', { tuNgay: '2026-03-09', denNgay: '2026-03-09' }).rows[0].duKien, false);
});
dat('Ngày giải ngân là ngày đầu tiên (sự kiện giải ngân); khoảng trước ngày giải ngân bị cắt; tổng kết khoản vay', () => {
  const r = lay('N-A', { tuNgay: '2026-01-01', denNgay: '2026-01-11' }); assert.equal(r.rows[0].ngay, '2026-01-10'); assert.ok(r.rows[0].suKien.some(s => /Giải ngân/.test(s))); assert.equal(r.rows[0].laiLuyKe, 100000);
  assert.deepEqual([r.maHoSo, r.loaiTien, r.goc, r.laiSuat, r.coSoNgay, r.ngayGiaiNgan, r.ngayDenHan], ['N-A', 'VND', 365000000, 10, 365, '2026-01-10', '2026-12-31']);
});
dat('Khoản đã tất toán: dừng ở ngày tất toán (sự kiện "Tất toán"), lãi lũy kế dừng', () => {
  const r = lay('N-D', { tuNgay: '2026-02-12', denNgay: '2026-03-01' });
  assert.deepEqual(r.rows.map(x => x.ngay), ['2026-02-12', '2026-02-13', '2026-02-14', '2026-02-15']); assert.ok(ngay(r, '2026-02-15').suKien.some(s => /Tất toán/.test(s))); assert.equal(ngay(r, '2026-02-15').laiNgay, 0);
  assert.equal(ngay(r, '2026-02-15').laiLuyKe, 100000 * (22 + 14), '10–31/01 = 22 ngày, 01–14/02 = 14 ngày'); assert.equal(r.ngayTatToan, '2026-02-15');
});
dat('Mặc định cửa sổ ±30 ngày quanh hôm nay; quá 400 ngày bị từ chối; hồ sơ chưa giải ngân / không tồn tại bị từ chối', () => {
  const r = lay('N-A'); assert.ok(r.rows.length >= 31 && r.rows.length <= 62); assert.ok(r.rows.some(x => x.duKien === false) && r.rows.some(x => x.duKien === true));
  assert.throws(() => ctx.layTheoDoiTatToanTheoNgay('N-A', { tuNgay: '2026-01-01', denNgay: '2027-03-01' }), /tối đa 400 ngày/);
  assert.throws(() => ctx.layTheoDoiTatToanTheoNgay('N-A', { tuNgay: '2026-03-05', denNgay: '2026-03-01' }), /không được trước/);
  assert.throws(() => ctx.layTheoDoiTatToanTheoNgay('N-NHAP', {}), /đã giải ngân/); assert.throws(() => ctx.layTheoDoiTatToanTheoNgay('KHONG-CO', {}), /Không tìm thấy/);
});
dat('Danh sách tất toán có "số ngày đến hạn" (còn / quá hạn); quyền Chỉ xem đọc được; ngoài phạm vi công ty bị từ chối', () => {
  const d = J(ctx.layTrangTatToan({ trangThai: 'TAT_CA' })).data.find(x => x.maHoSo === 'N-A'); assert.equal(typeof d.soNgayDenHan, 'number'); assert.equal(d.soNgayDenHan, ctx.soNgayGiuaIso_(ctx.homNayVN_(), '2026-12-31'));
  const c = mt.__email; mt.__email = 'xem@example.com'; try { assert.ok(J(ctx.api('', 'layTheoDoiTatToanTheoNgay', ['N-A', { tuNgay: '2026-03-09', denNgay: '2026-03-10' }])).rows.length === 2); } finally { mt.__email = c; }
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try { assert.throws(() => ctx.layTheoDoiTatToanTheoNgay('N-A', {}), /Không tìm thấy|phạm vi/); } finally { ctx.phamViCongTyNguoiDung_ = goc; }
});

(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('tất toán theo dõi theo ngày'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('tất toán theo dõi theo ngày'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://tt.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://tt.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40));
      const dong = (ma, n, tt) => ({ maHoSo: ma, soGiayNhanNo: 'G', soHopDong: 'HD', tenCty: 'Cty', loaiTien: 'VND', soTien: 1000, ngayDenHan: '2026-12-31', daTatToan: !!tt, ngayTatToan: '', revision: 1, duNoGoc: 1000, daTraGoc: 0, trangThaiTraNo: 'CHUA_TRA', nhanTrangThai: 'Chưa trả gốc', soNgayDenHan: tt ? null : n });
      const rows = [{ ngay: '2026-03-10', soNgayDenHan: 296, duNoGocCuoiNgay: 365000000, laiNgay: 100000, laiLuyKe: 6000000, gocTra: 0, laiTra: 0, phatTra: 0, suKien: [], duKien: false },
        { ngay: '2026-03-11', soNgayDenHan: 295, duNoGocCuoiNgay: 200000000, laiNgay: 54795, laiLuyKe: 6054795, gocTra: 165000000, laiTra: 0, phatTra: 0, suKien: ['Trả gốc 165.000.000'], duKien: false }, { ngay: '2026-12-31', soNgayDenHan: 0, duNoGocCuoiNgay: 200000000, laiNgay: 0, laiLuyKe: 99999, gocTra: 0, laiTra: 0, phatTra: 0, suKien: ['Đến hạn khoản vay'], duKien: true }];
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        const dang = (ten, tra) => { x[ten] = function (...a) { goi.push(ten + ':' + JSON.stringify(a)); setTimeout(() => ok(tra(...a)), 0); return P; }; };
        dang('layTrangTatToan', () => ({ success: true, summary: {}, pagination: { page: 1, totalPages: 1, totalRows: 3, pageSize: 30 }, data: [dong('A', 5), dong('B', 0), dong('C', -3), dong('D', null, true)] }));
        dang('layTheoDoiTatToanTheoNgay', () => ({ maHoSo: 'A', loaiTien: 'VND', rows: rows, tong: { laiPhatSinh: 154795, gocTra: 165000000, laiTra: 0 }, ngayGiaiNgan: '2026-01-10', ngayKetThuc: '2026-12-31' }));
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      ttTaiTrang_(1); await cho();
      const lst = [...document.querySelectorAll('#tt_rows tr')].map(r => r.children[2].textContent);
      TT_SELECTED_ = { maHoSo: 'A', revision: 1, daTatToan: false }; ttEl_('form').hidden = false;
      const box = document.getElementById('tt_ngayBox'); box.open = true; await cho();
      const a = { goi: goi.filter(g => /^layTheoDoi/.test(g)), tu: ttEl_('ngayTu').value, den: ttEl_('ngayDen').value, st: ttEl_('ngayStatus').textContent, dong: [...document.querySelectorAll('#tt_tbNgay tbody tr')].map(r => r.textContent), duKien: document.querySelectorAll('#tt_tbNgay tr.tt-du-kien').length };
      return { lst, a };
    });
    assert.match(kq.lst[0], /Còn 5 ngày/); assert.match(kq.lst[1], /Đến hạn hôm nay/); assert.match(kq.lst[2], /Quá hạn 3 ngày/); assert.ok(!/ngày$/.test(kq.lst[3].replace(/\d{2}\/\d{2}\/\d{4}/, '')) , 'khoản đã tất toán không hiện số ngày');
    assert.equal(kq.a.goi.length, 1); const [ma, kh] = JSON.parse(kq.a.goi[0].slice('layTheoDoiTatToanTheoNgay:'.length)); assert.equal(ma, 'A'); assert.deepEqual([kh.tuNgay, kh.denNgay], [kq.a.tu, kq.a.den]);
    assert.ok(kq.a.den > kq.a.tu); assert.match(kq.a.st, /3 ngày · Lãi phát sinh trong khoảng 154\.795 VND · Trả gốc 165\.000\.000/);
    assert.ok(kq.a.dong.length === 3 && /11\/03\/2026/.test(kq.a.dong[1]) && /200\.000\.000/.test(kq.a.dong[1]) && /54\.795/.test(kq.a.dong[1]) && /Trả gốc 165\.000\.000/.test(kq.a.dong[1]) && /dự kiến/.test(kq.a.dong[2]) && /Đến hạn khoản vay/.test(kq.a.dong[2]));
    assert.equal(kq.a.duKien, 1); assert.deepEqual(loi, []);
    console.log('PASS Giao diện: danh sách tất toán hiện còn/quá hạn N ngày; “Theo dõi theo ngày” hiện dư nợ, lãi ngày, lũy kế, sự kiện, ngày dự kiến');
  } catch (e) { console.log('FAIL Giao diện theo dõi theo ngày → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('tất toán theo dõi theo ngày');
})();
