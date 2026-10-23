// BẢO HIỂM TÀI SẢN THẾ CHẤP: Hợp đồng (cha) → Đăng ký thế chấp (con) → Hợp đồng bảo hiểm (con của thế chấp) → Chi tiết tài tài sản bảo hiểm.
// Cảnh báo bảo hiểm sắp hết hạn trước 15 ngày trên Tổng quan. Giả lập Apps Script/Sheets — chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('bao_hiem_tai_san'), { ctx, mt, G, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const hd = Q.hopDong({ soHopDong: 'HD-BH' });
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
const ts1 = ctx.luuTaiSanBaoDam({ maHD: hd.maHD, loai: 'BDS', moTa: 'Nhà xưởng KCN', giaTri: 30000000, ngayDinhGia: Q.ngay(-30) }).maTS;
const ts2 = ctx.luuTaiSanBaoDam({ maHD: hd.maHD, loai: 'DONG_SAN', moTa: 'Xe tải', giaTri: 20000000, ngayHetHanBaoHiem: Q.ngay(40), soHDBaoDam: 'cũ' }).maTS;
const ct = (o) => Object.assign({ maTaiSan: 'NX-01', tenTaiSan: 'Nhà xưởng số 1', giaTriBH: 25000000, phiBH: 500000, tienBH: 25000000, tuNgay: Q.ngay(-300), denNgay: Q.ngay(60) }, o || {});
const bh = (o) => Object.assign({ maTS: ts1, soHDBaoHiem: 'BH-2026-01', ngayKyHD: Q.ngay(-300), congTyBaoHiem: 'Bảo Việt', ghiChu: '', chiTiet: [ct(), ct({ maTaiSan: 'NX-02', tenTaiSan: 'Kho lạnh', giaTriBH: 5000000, phiBH: 100000, tienBH: 5000000, denNgay: Q.ngay(45) })] }, o || {});

dat('Kiểm tra đầu vào: ngày ký, công ty BH, ít nhất 1 dòng chi tiết, từ ngày ≤ đến ngày, tiền không âm/lẻ, tài sản tồn tại', () => {
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ ngayKyHD: '' })), /Ngày ký/);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ ngayKyHD: '2999-01-01' })), /tương lai|không được/i);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ congTyBaoHiem: ' ' })), /Công ty bảo hiểm/);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ chiTiet: [] })), /ít nhất 1 tài sản/);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ chiTiet: [ct({ tenTaiSan: '' })] })), /Tên tài sản/);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ chiTiet: [ct({ tuNgay: Q.ngay(10), denNgay: Q.ngay(5) })] })), /đến ngày.*không được trước|trước.*từ ngày/i);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ chiTiet: [ct({ phiBH: -1 })] })), /không được âm|không hợp lệ/);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ chiTiet: [ct({ giaTriBH: 10.5 })] })), /thập phân|số nguyên/);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ maTS: 'TS-KHONG-CO' })), /Không tìm thấy tài sản/);
  assert.equal(J(ctx.layBaoHiemTaiSan(ts1)).hopDong.length, 0, 'lỗi không ghi gì');
});
let maBH;
dat('Lưu hợp đồng bảo hiểm + bảng con chi tiết (STT, mã/tên tài sản, giá trị, phí, tiền BH, từ–đến ngày); tổng và hạn cuối', () => {
  const r = J(ctx.luuBaoHiemTaiSan(bh())); maBH = r.maBH; assert.match(maBH, /^BH-\d{4}$/);
  const k = J(ctx.layBaoHiemTaiSan(ts1)); assert.equal(k.hopDong.length, 1); const h = k.hopDong[0];
  assert.deepEqual([h.soHDBaoHiem, h.congTyBaoHiem, h.ngayKyHD, h.trangThai], ['BH-2026-01', 'Bảo Việt', Q.ngay(-300), 'Hiệu lực']);
  assert.deepEqual(h.chiTiet.map(x => [x.stt, x.maTaiSan, x.tenTaiSan, x.giaTriBH, x.phiBH, x.tienBH, x.tuNgay, x.denNgay]),
    [[1, 'NX-01', 'Nhà xưởng số 1', 25000000, 500000, 25000000, Q.ngay(-300), Q.ngay(60)], [2, 'NX-02', 'Kho lạnh', 5000000, 100000, 5000000, Q.ngay(-300), Q.ngay(45)]]);
  assert.deepEqual(h.tong, { giaTriBH: 30000000, phiBH: 600000, tienBH: 30000000 }); assert.equal(h.denNgayCuoi, Q.ngay(60));
  assert.equal(k.maTS, ts1); assert.equal(k.moTa, 'Nhà xưởng KCN');
});
dat('"Bảo hiểm đến" của tài sản thế chấp lấy từ hợp đồng bảo hiểm (ngày cuối lớn nhất); tài sản chưa có BH dùng trường cũ', () => {
  const r = J(ctx.layTaiSanBaoDam(hd.maHD)), a = r.rows.find(x => x.maTS === ts1), b = r.rows.find(x => x.maTS === ts2);
  assert.equal(a.ngayHetHanBaoHiem, Q.ngay(60)); assert.equal(a.soHopDongBaoHiem, 1); assert.equal(a.canhBaoBaoHiem, '');
  assert.equal(b.ngayHetHanBaoHiem, Q.ngay(40)); assert.equal(b.soHopDongBaoHiem, 0);
});
dat('Sửa hợp đồng bảo hiểm: thay toàn bộ dòng chi tiết, STT đánh lại; không sinh dòng mồ côi', () => {
  ctx.luuBaoHiemTaiSan(bh({ maBH: maBH, chiTiet: [ct({ maTaiSan: 'NX-09', tenTaiSan: 'Kho mới', denNgay: Q.ngay(12) })] }));
  const h = J(ctx.layBaoHiemTaiSan(ts1)).hopDong[0]; assert.deepEqual(h.chiTiet.map(x => [x.stt, x.maTaiSan]), [[1, 'NX-09']]); assert.equal(h.denNgayCuoi, Q.ngay(12));
  assert.equal(G.boDuLieu.getSheetByName('BaoHiemTaiSanChiTiet').g.slice(1).filter(r => r[0] === maBH).length, 1);
});
dat('Cảnh báo 15 ngày: còn ≤ 15 ngày → SAP_HET; 16 ngày → chưa cảnh báo; quá hạn → QUA_HAN; có trên Tổng quan', () => {
  const tt = (n) => J(ctx.layTaiSanBaoDam(hd.maHD)).rows.find(x => x.maTS === ts1);
  assert.equal(tt().canhBaoBaoHiem, 'SAP_HET'); assert.equal(tt().soNgayBaoHiem, 12);
  ctx.luuBaoHiemTaiSan(bh({ maBH: maBH, chiTiet: [ct({ denNgay: Q.ngay(15) })] })); assert.equal(tt().canhBaoBaoHiem, 'SAP_HET');
  ctx.luuBaoHiemTaiSan(bh({ maBH: maBH, chiTiet: [ct({ denNgay: Q.ngay(16) })] })); assert.equal(tt().canhBaoBaoHiem, '');
  ctx.luuBaoHiemTaiSan(bh({ maBH: maBH, chiTiet: [ct({ denNgay: Q.ngay(-1), tuNgay: Q.ngay(-300) })] })); assert.equal(tt().canhBaoBaoHiem, 'QUA_HAN');
  ctx.luuBaoHiemTaiSan(bh({ maBH: maBH, chiTiet: [ct({ denNgay: Q.ngay(10) })] }));
  const q = J(ctx.tongQuanQuanLyVay_(ctx.docDanhSachHoSo_(false), ctx.layTraCuuDanhMuc_(), [])); assert.equal(q.baoHiemCanChuY, 1);
  assert.equal(q.chiTietBaoHiem.length, 1); assert.deepEqual([q.chiTietBaoHiem[0].maTS, q.chiTietBaoHiem[0].soNgay, q.chiTietBaoHiem[0].muc], [ts1, 10, 'SAP_HET']);
});
dat('Hủy hợp đồng bảo hiểm (không xoá): cần lý do; hủy xong không tính hạn, trở về trường cũ; giải chấp thì không cảnh báo', () => {
  assert.throws(() => ctx.huyBaoHiemTaiSan(maBH, 'x'), /lý do/);
  ctx.huyBaoHiemTaiSan(maBH, 'Hợp đồng bảo hiểm ký nhầm'); assert.throws(() => ctx.huyBaoHiemTaiSan(maBH, 'lại lần nữa'), /đã hủy/);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ maBH: maBH })), /đã hủy/);
  assert.equal(J(ctx.layBaoHiemTaiSan(ts1)).hopDong[0].trangThai, 'Đã hủy');
  assert.equal(J(ctx.layTaiSanBaoDam(hd.maHD)).rows.find(x => x.maTS === ts1).ngayHetHanBaoHiem, '');
  ctx.luuBaoHiemTaiSan(bh({ chiTiet: [ct({ denNgay: Q.ngay(5) })] }));
  assert.equal(J(ctx.tongQuanQuanLyVay_(ctx.docDanhSachHoSo_(false), ctx.layTraCuuDanhMuc_(), [])).baoHiemCanChuY, 1);
  ctx.giaiChapTaiSan(ts1, 'Giải chấp theo biên bản 01');
  assert.equal(J(ctx.tongQuanQuanLyVay_(ctx.docDanhSachHoSo_(false), ctx.layTraCuuDanhMuc_(), [])).baoHiemCanChuY, 0);
  assert.throws(() => ctx.luuBaoHiemTaiSan(bh()), /giải chấp/);
});
dat('Quyền: Chỉ xem đọc được nhưng không lưu/hủy; ngoài phạm vi công ty bị từ chối', () => {
  assert.ok(J(voi('xem@example.com', () => ctx.api('', 'layBaoHiemTaiSan', [ts2]))).hopDong);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'luuBaoHiemTaiSan', [bh({ maTS: ts2 })])), /QUYEN|quyền/);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'huyBaoHiemTaiSan', ['BH-0001', 'lý do'])), /QUYEN|quyền/);
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try { assert.throws(() => ctx.layBaoHiemTaiSan(ts2), /phạm vi|Không tìm thấy/); assert.throws(() => ctx.luuBaoHiemTaiSan(bh({ maTS: ts2 })), /phạm vi|Không tìm thấy/); }
  finally { ctx.phamViCongTyNguoiDung_ = goc; }
});

(async () => {
  const fs = require('fs'), path = require('path');
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('bảo hiểm tài sản thế chấp'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b;
  try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); }
  catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('bảo hiểm tài sản thế chấp'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort());
    await p.route('http://bh.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://bh.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40));
      const ts = [{ maTS: 'TS-0001', maHD: 'HD1', soHopDong: 'HD-A', nhanLoai: 'Bất động sản', moTa: 'Nhà xưởng KCN', giaTri: 30000000, ngayDinhGia: '2026-01-01', ngayHetHanBaoHiem: '2026-11-02', canhBaoBaoHiem: 'SAP_HET', soNgayBaoHiem: 10, soHopDongBaoHiem: 1, trangThai: 'Đang bảo đảm' },
        { maTS: 'TS-0002', maHD: 'HD1', soHopDong: 'HD-A', nhanLoai: 'Động sản', moTa: 'Xe tải', giaTri: 20000000, ngayDinhGia: '', ngayHetHanBaoHiem: '', canhBaoBaoHiem: '', soNgayBaoHiem: null, soHopDongBaoHiem: 0, trangThai: 'Đang bảo đảm' }];
      const bhts = { maTS: 'TS-0001', maHD: 'HD1', soHopDong: 'HD-A', moTa: 'Nhà xưởng KCN', giaTri: 30000000, trangThai: 'Đang bảo đảm', nguongCanhBaoNgay: 15, hopDong: [{ maBH: 'BH-0001', soHDBaoHiem: 'BH-2026-01', ngayKyHD: '2026-01-05', congTyBaoHiem: 'Bảo Việt', trangThai: 'Hiệu lực', ghiChu: '', lyDoHuy: '', denNgayCuoi: '2026-11-02', soNgay: 10, canhBao: 'SAP_HET',
        chiTiet: [{ stt: 1, maTaiSan: 'NX-01', tenTaiSan: 'Nhà xưởng số 1', giaTriBH: 25000000, phiBH: 500000, tienBH: 25000000, tuNgay: '2026-01-05', denNgay: '2026-11-02' }, { stt: 2, maTaiSan: 'NX-02', tenTaiSan: 'Kho lạnh', giaTriBH: 5000000, phiBH: 100000, tienBH: 5000000, tuNgay: '2026-01-05', denNgay: '2026-10-20' }], tong: { giaTriBH: 30000000, phiBH: 600000, tienBH: 30000000 } }] };
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        const dang = (ten, tra) => { x[ten] = function (...a) { goi.push(ten + ':' + JSON.stringify(a)); setTimeout(() => ok(tra(...a)), 0); return P; }; };
        dang('layTaiSanBaoDam', () => ({ rows: ts, tongGiaTriDangBaoDam: 50000000, loaiTaiSan: { BDS: 'Bất động sản', DONG_SAN: 'Động sản' } })); dang('layBaoHiemTaiSan', () => bhts);
        dang('luuBaoHiemTaiSan', () => ({ ok: true })); dang('layBangTongHopHoaDon', () => []); dang('layDanhSachHoSoCuaHopDong', () => []);
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      AppDataStore.hopDong = [{ MaHD: 'HD1', MaCty: 'C1', SoHopDong: 'HD-A', TenNganHang: 'BIDV', NgayHopDong: '2026-01-01', HanMucVay: 1e9, Revision: 1 }]; AppDataStore.congTy = [{ MaCty: 'C1', TenCty: 'Cty' }];
      moHopDongChiTiet('HD1'); await cho();
      const a = { hien: getComputedStyle(el_('cardTheChapCuaHopDong')).display, dem: txt('thechap_dem'), hang: [...document.querySelectorAll('#tbody_theChapCuaHopDong tr')].map(r => r.textContent), goi: goi.filter(g => /^layTaiSanBaoDam/.test(g)) };
      function txt(id) { return document.getElementById(id).textContent; }
      goi.length = 0;
      [...document.querySelectorAll('#tbody_theChapCuaHopDong button')].find(bt => /Bảo hiểm \(1\)/.test(bt.textContent)).click(); await cho();
      const m = { mo: getComputedStyle(el_('modalBaoHiemTS')).display, ds: txt('bhts_ds'), goi: goi.slice(), dongForm: document.querySelectorAll('#tbody_bhtsChiTiet tr').length, tong: txt('bhts_moTa') };
      el_('bhts_ngayKy').value = '2026-02-01'; el_('bhts_congTy').value = 'PVI'; el_('bhts_soHD').value = 'PVI-9';
      const r1 = document.querySelector('#tbody_bhtsChiTiet tr'); r1.querySelector('.bhts-ma').value = 'KH-1'; r1.querySelector('.bhts-ten').value = 'Kho hàng'; r1.querySelector('.bhts-gt').value = '10.000.000'; r1.querySelector('.bhts-phi').value = '200.000'; r1.querySelector('.bhts-tien').value = '10.000.000'; r1.querySelector('.bhts-tu').value = '2026-02-01'; r1.querySelector('.bhts-den').value = '2027-02-01';
      themDongBHTS_({ tenTaiSan: 'Xe nâng', giaTriBH: 5, phiBH: 1, tienBH: 5, tuNgay: '2026-02-01', denNgay: '2027-01-01' });
      const stt = [...document.querySelectorAll('#tbody_bhtsChiTiet .bhts-stt')].map(e => e.textContent);
      goi.length = 0; luuBaoHiemTSClick_(); await cho();
      const luu = goi.find(g => g.startsWith('luuBaoHiemTaiSan:'));
      const pad = parseFloat(getComputedStyle(document.querySelector('#tbl_theChapCuaHopDong th.cot-tien')).paddingRight);
      veCanhBaoBaoHiemTongQuan_({ chiTietBaoHiem: [{ maTS: 'TS-0001', maHD: 'HD1', moTa: 'Nhà xưởng KCN', soHopDong: 'HD-A', han: '2026-11-02', soNgay: 10, muc: 'SAP_HET' }, { maTS: 'TS-0009', maHD: 'HD1', moTa: 'Xe', soHopDong: 'HD-A', han: '2026-10-01', soNgay: -3, muc: 'QUA_HAN' }], nguongBaoHiemNgay: 15 });
      const tq = { hien: getComputedStyle(el_('tq_cbBaoHiem')).display, tom: txt('tq_cbBaoHiemTom'), list: txt('tq_cbBaoHiemList') };
      veCanhBaoBaoHiemTongQuan_({ chiTietBaoHiem: [] }); tq.an = getComputedStyle(el_('tq_cbBaoHiem')).display;
      return { a, m, stt, luu, pad, tq };
    });
    assert.notEqual(kq.a.hien, 'none'); assert.deepEqual(kq.a.goi, ['layTaiSanBaoDam:["HD1"]']); assert.match(kq.a.dem, /2 tài sản/);
    assert.ok(/TS-0001/.test(kq.a.hang[0]) && /Còn 10 ngày/.test(kq.a.hang[0]) && /Bảo hiểm \(1\)/.test(kq.a.hang[0]) && /Bảo hiểm \(0\)/.test(kq.a.hang[1]) && /chưa có/.test(kq.a.hang[1]));
    assert.equal(kq.m.mo, 'flex'); assert.deepEqual(kq.m.goi, ['layBaoHiemTaiSan:["TS-0001"]']); assert.ok(/Bảo Việt/.test(kq.m.ds) && /Kho lạnh/.test(kq.m.ds) && /Nhà xưởng số 1/.test(kq.m.ds) && /Đến 02\/11\/2026/.test(kq.m.ds) && /Còn 10 ngày/.test(kq.m.ds), kq.m.ds);
    assert.equal(kq.m.dongForm, 1); assert.deepEqual(kq.stt, ['1', '2']);
    const tt = JSON.parse(JSON.parse(kq.luu.slice('luuBaoHiemTaiSan:'.length))[0] ? kq.luu.slice('luuBaoHiemTaiSan:'.length) : '[]')[0];
    assert.deepEqual(tt, { maTS: 'TS-0001', maBH: '', soHDBaoHiem: 'PVI-9', ngayKyHD: '2026-02-01', congTyBaoHiem: 'PVI', ghiChu: '', chiTiet: [{ maTaiSan: 'KH-1', tenTaiSan: 'Kho hàng', giaTriBH: 10000000, phiBH: 200000, tienBH: 10000000, tuNgay: '2026-02-01', denNgay: '2027-02-01' }, { maTaiSan: '', tenTaiSan: 'Xe nâng', giaTriBH: 5, phiBH: 1, tienBH: 5, tuNgay: '2026-02-01', denNgay: '2027-01-01' }] });
    assert.ok(kq.pad >= 20, 'Giá trị (số tiền) không dính cột Bảo hiểm đến: padding-right ' + kq.pad);
    assert.notEqual(kq.tq.hien, 'none'); assert.match(kq.tq.tom, /2 tài sản thế chấp cần gia hạn bảo hiểm \(1 đã hết hạn\).*15 ngày/); assert.ok(/còn 10 ngày/.test(kq.tq.list) && /đã hết hạn 3 ngày/.test(kq.tq.list) && /Mở hợp đồng/.test(kq.tq.list)); assert.equal(kq.tq.an, 'none');
    assert.deepEqual(loi, []);
    console.log('PASS Giao diện: Hợp đồng → bảng con Đăng ký thế chấp → modal Bảo hiểm (HĐ BH + bảng chi tiết tài sản) → lưu; cảnh báo 15 ngày ở Tổng quan; số tiền không dính cột bên cạnh');
  } catch (e) { console.log('FAIL Giao diện bảo hiểm tài sản → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('bảo hiểm tài sản thế chấp');
})();
