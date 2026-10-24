// CẬP NHẬT BẢO HIỂM TSĐB TỪ EXCEL + nguyên giá/khấu hao/giá trị còn lại + công ty bảo hiểm ↔ Khách hàng. Giả lập Apps Script/Sheets — chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('cap_nhat_bao_hiem_tsdb'), { ctx, mt, G, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hd1 = hopDong({ soHopDong: 'HD-TS-1' }), hd2 = hopDong({ soHopDong: 'HD-TS-2' });
const TD = ['STT', 'Mã tài sản', 'Tên tài sản', 'Loại tài sản', 'Nguyên giá', 'Khấu hao lũy kế', 'Giá trị còn lại', 'Giá trị định giá', 'Ngày định giá', 'Số hợp đồng vay', 'Công ty bảo hiểm', 'Số HĐ bảo hiểm', 'Ngày ký HĐ bảo hiểm', 'Giá trị bảo hiểm', 'Phí bảo hiểm', 'Bảo hiểm từ ngày', 'Đến ngày'];
const dongX = (o) => TD.map(t => o[t] === undefined ? '' : o[t]);
const dsDong = [
  { 'STT': 1, 'Tên tài sản': 'Nhà xưởng KCN A', 'Loại tài sản': 'Bất động sản', 'Nguyên giá': '8.000.000.000', 'Khấu hao lũy kế': 3000000000, 'Giá trị định giá': '5.000.000.000', 'Ngày định giá': new Date(Date.UTC(2026, 0, 14, 17)), 'Công ty bảo hiểm': 'Bảo hiểm Bảo Việt', 'Số HĐ bảo hiểm': 'BH-001', 'Ngày ký HĐ bảo hiểm': '01/02/2026', 'Giá trị bảo hiểm': 5000000000, 'Phí bảo hiểm': 12000000, 'Bảo hiểm từ ngày': '01/02/2026', 'Đến ngày': '01/02/2027' },
  { 'STT': 2, 'Tên tài sản': 'Dây chuyền số 2', 'Loại tài sản': 'Máy móc thiết bị', 'Nguyên giá': 2000000000, 'Khấu hao lũy kế': 500000000, 'Giá trị còn lại': 1500000000, 'Giá trị định giá': 1200000000 },
  { 'STT': 3, 'Tên tài sản': 'Xe tải', 'Nguyên giá': 900000000, 'Khấu hao lũy kế': 100000000, 'Giá trị còn lại': 999, 'Giá trị định giá': 500000000 },
  { 'STT': 4, 'Tên tài sản': 'Kho lạnh', 'Nguyên giá': 100 },
  { 'STT': 5, 'Tên tài sản': 'Máy cắt', 'Nguyên giá': 100, 'Khấu hao lũy kế': 200, 'Giá trị định giá': 50 },
  { 'STT': 6, 'Tên tài sản': 'Máy lẻ', 'Nguyên giá': 100.5, 'Giá trị định giá': 50 },
  { 'STT': 7, 'Tên tài sản': 'Xe con', 'Giá trị định giá': 300000000, 'Số hợp đồng vay': 'HD-TS-2', 'Công ty bảo hiểm': 'PVI', 'Ngày ký HĐ bảo hiểm': '', 'Bảo hiểm từ ngày': '01/03/2026', 'Đến ngày': '01/03/2027' }
].map(dongX);
const sheetX = () => [{ ten: 'Danh sách', values: [['DANH SÁCH TÀI SẢN BẢO ĐẢM'], [''], TD, ...dsDong, ['Tổng cộng', '', '', '', 11000000000]] }];
ctx.docSheetTuExcel_ = () => sheetX();
const xt = (maHD) => J(ctx.xemTruocCapNhatTSDB({ maHD, tenFile: 'ts.xlsx', base64: Buffer.from('x').toString('base64') }));

dat('Đọc Excel: tự tìm dòng tiêu đề (có dòng tiêu đề chung phía trên), nhận cột theo tên, bỏ dòng Tổng cộng, số kiểu VN và ngày dạng Date/dd/MM/yyyy', () => {
  const r = xt(hd1.maHD), d = (n) => r.dong.find(x => x.dong === n);
  assert.equal(r.dong.length, 7, 'bỏ dòng Tổng cộng'); assert.equal(r.maHD, hd1.maHD);
  const a = d(4); assert.deepEqual([a.ten, a.loai, a.nguyenGia, a.khauHao, a.conLai, a.dinhGia, a.ngayDinhGia], ['Nhà xưởng KCN A', 'BDS', 8000000000, 3000000000, 5000000000, 5000000000, '2026-01-15'], 'còn lại tự tính; Date → ngày VN');
  assert.deepEqual([a.bh.congTy, a.bh.soHD, a.bh.ngayKy, a.bh.giaTriBH, a.bh.tuNgay, a.bh.denNgay], ['Bảo hiểm Bảo Việt', 'BH-001', '2026-02-01', 5000000000, '2026-02-01', '2027-02-01']);
  assert.equal(d(5).loai, 'DONG_SAN'); assert.equal(d(5).bh, null, 'không có cột bảo hiểm → không tạo bảo hiểm');
  assert.throws(() => { ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['a', 'b'], ['1', '2']] }]; xt(hd1.maHD); }, /Không nhận ra dòng tiêu đề/); ctx.docSheetTuExcel_ = () => sheetX();
});
dat('Xem trước phân loại: tạo mới / cập nhật / lỗi (từng lý do) / bảo hiểm thêm; công ty bảo hiểm mới; không ghi gì', () => {
  const truoc = ctx.docSheetBaoDam_('TaiSanBaoDam').length;
  const r = xt(hd1.maHD), d = (n) => r.dong.find(x => x.dong === n);
  assert.deepEqual([d(4).hanhDongTS, d(4).hanhDongBH, d(4).congTyMoi], ['TAO_MOI', 'THEM', true]); assert.equal(d(5).hanhDongTS, 'TAO_MOI');
  assert.match(d(6).loi.join(' '), /Giá trị còn lại \(999\) ≠ nguyên giá − khấu hao \(800000000\)/); assert.match(d(7).loi.join(' '), /cần Giá trị định giá/);
  assert.match(d(8).loi.join(' '), /Khấu hao \(200\) lớn hơn nguyên giá \(100\)/); assert.match(d(9).loi.join(' '), /phần thập phân/);
  assert.match(d(10).loi.join(' '), /khác hợp đồng đang chọn \(HD-TS-1\)/); assert.match(d(10).loi.join(' '), /thiếu Ngày ký hợp đồng bảo hiểm/); assert.deepEqual([r.tomTat.tong, r.tomTat.taoMoi, r.tomTat.capNhat, r.tomTat.loi, r.tomTat.bhThem, r.tomTat.congTyMoi], [7, 2, 0, 5, 1, 1]);
  assert.equal(ctx.docSheetBaoDam_('TaiSanBaoDam').length, truoc, 'xem trước KHÔNG ghi');
  const r2 = xt(''); assert.deepEqual([r2.dong.find(x => x.dong === 10).maHD, r2.dong.find(x => x.dong === 10).soHopDong], [hd2.maHD, 'HD-TS-2'], 'không chọn hợp đồng: dùng cột Số hợp đồng vay'); assert.match(r2.dong.find(x => x.dong === 10).loi.join(' '), /thiếu Ngày ký hợp đồng bảo hiểm/); assert.match(r2.dong.find(x => x.dong === 4).loi.join(' '), /Chưa chọn hợp đồng vay/);
});
dat('Áp dụng: tạo tài sản (định giá hiện ở Đăng ký thế chấp), nguyên giá/khấu hao/còn lại, hợp đồng bảo hiểm + chi tiết; dòng lỗi bỏ qua; thêm công ty bảo hiểm vào Khách hàng', () => {
  const xem = xt(hd1.maHD), revKH = ctx.docRevision_('KHACHHANG');
  const kq = J(ctx.apDungCapNhatTSDB({ maHD: hd1.maHD, dong: xem.dong }));
  assert.deepEqual([kq.taoMoi, kq.capNhat, kq.bhThem, kq.congTyMoi, kq.boQua.length], [2, 0, 1, 1, 5]);
  const ts = J(ctx.layTaiSanBaoDam(hd1.maHD)).rows, nx = ts.find(t => t.moTa === 'Nhà xưởng KCN A');
  assert.deepEqual([nx.giaTri, nx.nguyenGia, nx.khauHao, nx.giaTriConLai, nx.ngayDinhGia, nx.loai, nx.soHopDongBaoHiem], [5000000000, 8000000000, 3000000000, 5000000000, '2026-01-15', 'BDS', 1]); assert.equal(ts.length, 2);
  assert.equal(nx.ngayHetHanBaoHiem, '2027-02-01', 'ngày hết hạn bảo hiểm theo hợp đồng bảo hiểm vừa nạp'); assert.equal(ts.find(t => t.moTa === 'Dây chuyền số 2').giaTri, 1200000000);
  const bh = J(ctx.layBaoHiemTaiSan(nx.maTS)); assert.equal(bh.hopDong.length, 1); assert.deepEqual([bh.hopDong[0].congTyBaoHiem, bh.hopDong[0].soHDBaoHiem, bh.hopDong[0].chiTiet[0].giaTriBH, bh.hopDong[0].chiTiet[0].phiBH, bh.hopDong[0].chiTiet[0].tenTaiSan], ['Bảo hiểm Bảo Việt', 'BH-001', 5000000000, 12000000, 'Nhà xưởng KCN A']);
  const kh = J(ctx.sheetToObjects_('DM_KhachHang')).filter(k => k.TenKhachHang === 'Bảo hiểm Bảo Việt'); assert.equal(kh.length, 1); assert.equal(kh[0].GhiChu, 'Công ty bảo hiểm'); assert.ok(ctx.docRevision_('KHACHHANG') > revKH);
  assert.deepEqual(kq.boQua.map(b => b.dong).sort((a, b) => a - b), [6, 7, 8, 9, 10]);
});
dat('Nạp lại cùng file: cập nhật (không tạo trùng), hợp đồng bảo hiểm đã có bị bỏ qua, định giá để trống thì giữ nguyên, khấu hao đổi được', () => {
  dsDong[0][TD.indexOf('Khấu hao lũy kế')] = 3500000000; dsDong[0][TD.indexOf('Giá trị còn lại')] = ''; dsDong[1][TD.indexOf('Giá trị định giá')] = '';
  const xem = xt(hd1.maHD), d = (n) => xem.dong.find(x => x.dong === n);
  assert.deepEqual([d(4).hanhDongTS, d(4).hanhDongBH, d(5).hanhDongTS, d(4).congTyMoi], ['CAP_NHAT', 'DA_CO', 'CAP_NHAT', false]);
  const kq = J(ctx.apDungCapNhatTSDB({ maHD: hd1.maHD, dong: xem.dong }));
  assert.deepEqual([kq.taoMoi, kq.capNhat, kq.bhThem, kq.bhDaCo, kq.congTyMoi], [0, 2, 0, 1, 0]);
  const ts = J(ctx.layTaiSanBaoDam(hd1.maHD)).rows; assert.equal(ts.length, 2); const nx = ts.find(t => t.moTa === 'Nhà xưởng KCN A'), dc = ts.find(t => t.moTa === 'Dây chuyền số 2');
  assert.deepEqual([nx.khauHao, nx.giaTriConLai, nx.giaTri, dc.giaTri], [3500000000, 4500000000, 5000000000, 1200000000]); assert.equal(J(ctx.layBaoHiemTaiSan(nx.maTS)).hopDong.length, 1);
  assert.equal(J(ctx.sheetToObjects_('DM_KhachHang')).filter(k => k.TenKhachHang === 'Bảo hiểm Bảo Việt').length, 1, 'không thêm công ty bảo hiểm lần hai');
});
dat('Hợp đồng qua cột Số hợp đồng vay; máy chủ kiểm tra lại dòng (không tin dữ liệu xem trước bị sửa); giới hạn số dòng; quyền', () => {
  const xem = xt(''), dong10 = J(xem.dong.find(x => x.dong === 10)); dong10.loi = []; dong10.raw.dinhGia = -5;
  assert.match(J(ctx.apDungCapNhatTSDB({ maHD: '', dong: [dong10] })).boQua[0].loi, /lớn hơn 0|không được âm|Tạo tài sản mới cần/, 'giá trị bị sửa vẫn bị chặn');
  const k0 = J(ctx.apDungCapNhatTSDB({ maHD: '', dong: [J(xem.dong.find(x => x.dong === 10))] })); assert.deepEqual([k0.taoMoi, k0.boQua.length, J(ctx.layTaiSanBaoDam(hd2.maHD)).rows.length], [0, 1, 0], 'bảo hiểm thiếu Ngày ký → dòng lỗi, không ghi gì');
  const tot = J(xem.dong.find(x => x.dong === 10)); tot.raw.ngayKyBH = '2026-03-01'; const k = J(ctx.apDungCapNhatTSDB({ maHD: '', dong: [tot] }));
  assert.deepEqual([k.taoMoi, k.bhThem], [1, 1]); assert.equal(J(ctx.layTaiSanBaoDam(hd2.maHD)).rows.length, 1); assert.equal(J(ctx.layTaiSanBaoDam(hd2.maHD)).rows[0].soHopDongBaoHiem, 1, 'tạo ở hợp đồng 2 theo cột Số hợp đồng vay');
  assert.throws(() => ctx.apDungCapNhatTSDB({ dong: [] }), /Không có dòng nào/); assert.throws(() => ctx.apDungCapNhatTSDB({ maHD: hd1.maHD, dong: new Array(301).fill({}) }), /Tối đa 300/);
  assert.throws(() => ctx.xemTruocCapNhatTSDB({ maHD: 'HD-KHONG-CO', base64: 'eA==' }), /Không tìm thấy hợp đồng|phạm vi/);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'apDungCapNhatTSDB', [{ maHD: hd1.maHD, dong: [{}] }])), /QUYEN|quyền/); assert.throws(() => voi('xem@example.com', () => ctx.api('', 'xemTruocCapNhatTSDB', [{ maHD: hd1.maHD, base64: 'eA==' }])), /QUYEN|quyền/);
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC']; try { assert.throws(() => ctx.xemTruocCapNhatTSDB({ maHD: hd1.maHD, base64: 'eA==' }), /phạm vi|Không tìm thấy/); } finally { ctx.phamViCongTyNguoiDung_ = g; }
});
dat('Nhập tay: Nguyên giá / Khấu hao / Còn lại kiểm tra khớp; công ty bảo hiểm mới tự vào Khách hàng; thêm công ty bảo hiểm riêng; mẫu Excel', () => {
  const moi = J(ctx.luuTaiSanBaoDam({ maHD: hd1.maHD, loai: 'BDS', moTa: 'Đất vườn', giaTri: '700000000', nguyenGia: 900000000, khauHao: 200000000 }));
  const t = J(ctx.layTaiSanBaoDam(hd1.maHD)).rows.find(x => x.maTS === moi.maTS); assert.deepEqual([t.giaTri, t.nguyenGia, t.khauHao, t.giaTriConLai], [700000000, 900000000, 200000000, 700000000], 'còn lại tự tính');
  assert.throws(() => ctx.luuTaiSanBaoDam({ maHD: hd1.maHD, loai: 'BDS', moTa: 'Đất sai', giaTri: 1, nguyenGia: 100, khauHao: 40, giaTriConLai: 70 }), /bằng nguyên giá − khấu hao \(60\)/);
  assert.throws(() => ctx.luuTaiSanBaoDam({ maHD: hd1.maHD, loai: 'BDS', moTa: 'Đất sai', giaTri: 1, nguyenGia: 100, khauHao: 400 }), /Khấu hao \(400\) không được lớn hơn nguyên giá \(100\)/);
  const r = J(ctx.luuBaoHiemTaiSan({ maTS: moi.maTS, ngayKyHD: '2026-03-01', congTyBaoHiem: 'Bảo hiểm PTI', chiTiet: [{ tenTaiSan: 'Đất vườn', giaTriBH: 700000000, phiBH: 1000000, tienBH: 0, tuNgay: '2026-03-01', denNgay: '2027-03-01' }] })); assert.equal(r.congTyMoi, true);
  assert.equal(J(ctx.sheetToObjects_('DM_KhachHang')).filter(k => k.TenKhachHang === 'Bảo hiểm PTI').length, 1);
  assert.deepEqual([J(ctx.themCongTyBaoHiem('bảo hiểm pti')).daCo, J(ctx.themCongTyBaoHiem('Bảo Minh')).daCo], [true, false]); assert.throws(() => ctx.themCongTyBaoHiem('A'), /2 đến 150/);
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'themCongTyBaoHiem', ['Công ty X'])), /QUYEN|quyền/);
  const m = J(ctx.taiMauCapNhatTSDB()), f = JSON.parse(Buffer.from(m.base64, 'base64').toString('utf8')); assert.equal(m.tenFile, 'Mau_cap_nhat_bao_hiem_TSDB.xlsx'); assert.equal(f[0].g[0][1], 'Tên tài sản'); assert.equal(f[0].g[0].length, 17); assert.equal(f[0].g[1][1], 'Nhà xưởng KCN A');
  ctx.docSheetTuExcel_ = () => f[0].g.length ? [{ ten: 'TSDB', values: f[0].g }] : []; assert.equal(xt(hd1.maHD).dong.length, 2, 'mẫu tải về đọc lại được');
});
(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('cập nhật bảo hiểm TSĐB từ Excel'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('cập nhật bảo hiểm TSĐB từ Excel'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://bh.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://bh.test');
    const goi = await p.evaluate(() => {
      window.__goi = []; window.hoiXacNhan = (m, f) => { window.__goi.push(['hoi', m]); f(); };
      const xem = { maHD: '', soHopDong: '', loaiTaiSan: {}, tomTat: { tong: 3, taoMoi: 1, capNhat: 1, loi: 1, bhThem: 1, bhDaCo: 0, congTyMoi: 1 }, dong: [
        { dong: 4, ten: 'Nhà xưởng', maTS: '', soHopDong: 'HD-1', maHD: 'M1', nguyenGia: 8000000000, khauHao: 3000000000, conLai: 5000000000, dinhGia: 5000000000, hanhDongTS: 'TAO_MOI', hanhDongBH: 'THEM', congTyMoi: true, loi: [], canhBao: ['Chưa có Loại tài sản — dùng “Khác”.'], bh: { congTy: 'Bảo Việt', soHD: 'BH1', tuNgay: '2026-02-01', denNgay: '2027-02-01', giaTriBH: 5000000000 }, raw: { ten: 'Nhà xưởng', dinhGia: 5000000000 } },
        { dong: 5, ten: 'Dây chuyền', maTS: 'TS-0001', soHopDong: 'HD-1', maHD: 'M1', nguyenGia: 2000000000, khauHao: null, conLai: null, dinhGia: null, hanhDongTS: 'CAP_NHAT', maTSHienCo: 'TS-0001', hanhDongBH: '', loi: [], canhBao: [], bh: null, raw: { ten: 'Dây chuyền', maTS: 'TS-0001', nguyenGia: 2000000000 } },
        { dong: 6, ten: 'Xe tải', maTS: '', soHopDong: 'HD-1', maHD: 'M1', nguyenGia: 900, khauHao: 100, conLai: 999, dinhGia: 5, hanhDongTS: 'LOI', hanhDongBH: '', loi: ['Giá trị còn lại (999) ≠ nguyên giá − khấu hao (800).'], canhBao: [], bh: null, raw: { ten: 'Xe tải' } }] };
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        x.xemTruocCapNhatTSDB = function (a) { window.__goi.push(['xem', JSON.stringify({ maHD: a.maHD, tenFile: a.tenFile, coBase64: !!a.base64 })]); setTimeout(() => ok(xem), 0); return P; };
        x.apDungCapNhatTSDB = function (a) { window.__goi.push(['apDung', JSON.stringify(a)]); setTimeout(() => ok({ taoMoi: 1, capNhat: 1, bhThem: 1, bhDaCo: 0, congTyMoi: 1, boQua: [] }), 0); return P; };
        x.taiMauCapNhatTSDB = function () { window.__goi.push(['mau', '']); setTimeout(() => ok({ base64: 'eA==', tenFile: 'mau.xlsx', mime: 'x' }), 0); return P; };
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      window.luuBlobTaiVe_ = (b64, ten) => window.__goi.push(['tai', ten]);
      document.getElementById('tabBtn-capnhatbh').click(); return true;
    });
    await p.setInputFiles('#cnbh_file', { name: 'ts.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('xlsx') });
    await p.evaluate(() => cnbhDoc_()); await p.waitForTimeout(200);
    const xem = await p.evaluate(() => ({ tab: getComputedStyle(document.getElementById('tab-capnhatbh')).display, tieuDe: document.getElementById('pageTitle').textContent, tomTat: document.getElementById('cnbh_tomTat').textContent, dong: [...document.querySelectorAll('#tbody_cnbh tr')].map(r => r.textContent), nut: document.getElementById('cnbh_btnApDung').textContent, hienNut: getComputedStyle(document.getElementById('cnbh_btnApDung')).display, canPhai: getComputedStyle(document.querySelector('#tbody_cnbh td.cot-tien')).textAlign }));
    await p.evaluate(() => cnbhApDung_()); await p.waitForTimeout(200); await p.evaluate(() => cnbhTaiMau_()); await p.waitForTimeout(100);
    const sau = await p.evaluate(() => ({ goi: window.__goi, status: document.getElementById('cnbh_status').textContent, nut: getComputedStyle(document.getElementById('cnbh_btnApDung')).display }));
    // nhập số: tự phân cách nghìn, căn phải; còn lại tự tính; dòng bảo hiểm; công ty bảo hiểm lọc theo Khách hàng
    await p.evaluate(() => { document.getElementById('modalTheChap').style.display = 'flex'; });
    await p.fill('#tc_giaTri', ''); await p.type('#tc_giaTri', '5000000000'); await p.type('#tc_nguyenGia', '8000000000'); await p.type('#tc_khauHao', '3000000000');
    await p.evaluate(() => { document.getElementById('modalBaoHiemTS').style.display = 'flex'; themDongBHTS_(); });
    await p.type('.bhts-gt', '5000000000'); await p.type('.bhts-phi', '12000000'); await p.evaluate(() => document.querySelector('.bhts-phi').blur());
    const so = await p.evaluate(() => ({ dinhGia: tc_giaTri.value, nguyenGia: tc_nguyenGia.value, khauHao: tc_khauHao.value, conLai: tc_conLai.value, canPhai: ['tc_giaTri', 'tc_nguyenGia', 'tc_khauHao', 'tc_conLai'].map(id => getComputedStyle(document.getElementById(id)).textAlign), gt: document.querySelector('.bhts-gt').value, phi: document.querySelector('.bhts-phi').value, canPhaiBH: getComputedStyle(document.querySelector('.bhts-gt')).textAlign, listCty: document.getElementById('bhts_congTy').getAttribute('list'), dsKH: !!document.getElementById('dsKhachHang') }));
    assert.equal(xem.tab, 'block'); assert.equal(xem.tieuDe, 'Cập nhật bảo hiểm TSĐB'); assert.match(xem.tomTat, /Tạo mới 1.*Cập nhật 1.*Lỗi 1.*Bảo hiểm thêm 1.*mới sẽ thêm vào Khách hàng: 1/); assert.equal(xem.dong.length, 3);
    assert.match(xem.dong[0], /Nhà xưởng.*8\.000\.000\.000.*3\.000\.000\.000.*5\.000\.000\.000.*Bảo Việt.*BH1.*Tạo mới.*thêm hợp đồng mới \(công ty mới\)/); assert.match(xem.dong[1], /Cập nhật TS-0001/); assert.match(xem.dong[2], /Lỗi — bỏ qua.*999\) ≠ nguyên giá/);
    assert.match(xem.nut, /Áp dụng 2 dòng hợp lệ/); assert.equal(xem.canPhai, 'right');
    const g = (k) => sau.goi.filter(x => x[0] === k); assert.deepEqual(JSON.parse(g('xem')[0][1]), { maHD: '', tenFile: 'ts.xlsx', coBase64: true });
    const ap = JSON.parse(g('apDung')[0][1]); assert.deepEqual(ap.dong.map(d => d.dong), [4, 5], 'chỉ gửi dòng hợp lệ, kèm giá trị thô'); assert.ok(ap.dong.every(d => d.raw && d.raw.ten)); assert.match(g('hoi')[0][1], /Ghi 2 dòng.*1 tạo mới, 1 cập nhật, 1 hợp đồng bảo hiểm mới.*1 dòng lỗi sẽ bị bỏ qua/);
    assert.match(sau.status, /Đã tạo 1, cập nhật 1 tài sản; bảo hiểm thêm 1.*thêm 1 công ty bảo hiểm vào Khách hàng/); assert.equal(sau.nut, 'none'); assert.deepEqual(g('tai'), [['tai', 'mau.xlsx']]);
    assert.deepEqual([so.dinhGia, so.nguyenGia, so.khauHao, so.conLai], ['5.000.000.000', '8.000.000.000', '3.000.000.000', '5.000.000.000'], 'tự phân cách nghìn khi gõ; còn lại = nguyên giá − khấu hao');
    assert.ok(so.canPhai.every(x => x === 'right') && so.canPhaiBH === 'right', 'số căn phải'); assert.deepEqual([so.gt, so.phi], ['5.000.000.000', '12.000.000']); assert.deepEqual([so.listCty, so.dsKH], ['dsKhachHang', true], 'công ty bảo hiểm lọc theo Khách hàng');
    assert.deepEqual(loi, []);
    console.log('PASS Giao diện: menu “Cập nhật bảo hiểm TSĐB”, xem trước → áp dụng, tải mẫu; số tự phân cách nghìn, căn phải; công ty bảo hiểm chọn từ Khách hàng');
  } catch (e) { console.log('FAIL Giao diện cập nhật bảo hiểm TSĐB → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('cập nhật bảo hiểm TSĐB từ Excel');
})();
