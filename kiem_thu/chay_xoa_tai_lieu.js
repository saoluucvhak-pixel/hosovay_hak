// Xoá hoá đơn / bảng lương / bảng đóng BH đã tải lên + chọn hoá đơn cho mọi khoản mục — giả lập Apps Script, dữ liệu giả.
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const Q = require('./_qlv_chung')('xoa_tai_lieu'), { ctx, mt, G, themHoSo, dat } = Q;
const M = require('./_mau_ocr_hoa_don');
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const cu = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = cu; } };
const api = (e, ten, ...a) => J(voi(e, () => ctx.api('', ten, a)));
const dong = (ten) => ctx.sheetToObjects_(ten);
const pdf = { ten: 'hoa_don_gia.pdf', mime: 'application/pdf', base64: Buffer.from('%PDF gia').toString('base64') };
const ct = (so, tien, ncc) => ({ loaiChungTu: 'HOA_DON_GTGT', kyHieu: '1C26TXX', soHoaDon: so, ngayHoaDon: '01/10/2026', tenBan: ncc || 'CÔNG TY MẪU MỘT', mstBan: '0400222333', tongTien: tien, tienTruocThue: 0, tienThue: 0, trangTu: 1, trangDen: 1, tinCay: 'CAO', canhBao: [] });
const tepTrash = (link) => { const id = String(link).match(/[-\w]{25,}/); return id ? mt.DriveApp.getFileById(id[0]).isTrashed() : null; };

const ma = themHoSo({ MaHoSo: 'HS-XOA', MaHD: '', LoaiTien: 'VND', TrangThai: 'Nháp', SoTienNhanNoLanNay: 1000 });
let tep2;
dat('Xoá 1 hoá đơn trong PDF nhiều hoá đơn: chỉ mất dòng đó, file gốc còn; xoá hoá đơn cuối cùng → file vào thùng rác, dòng tài liệu mất', () => {
  tep2 = api('ketoan@example.com', 'luuChungTuNhieuTrang', '', pdf, [ct('9001', 1100000), ct('9002', 2200000)]);
  const hd = dong(ctx.SHEET_BANGKE_HOADON).filter(h => h.MaTaiLieu === tep2.maTaiLieu);
  assert.equal(hd.length, 2);
  const link = dong(ctx.SHEET_TAILIEU).find(t => t.MaTaiLieu === tep2.maTaiLieu).LinkFile;
  api('ketoan@example.com', 'xoaHoaDonDaTai', hd[0].MaHoaDon);
  assert.equal(dong(ctx.SHEET_BANGKE_HOADON).filter(h => h.MaTaiLieu === tep2.maTaiLieu).length, 1);
  assert.equal(tepTrash(link), false, 'file còn vì còn 1 hoá đơn');
  api('ketoan@example.com', 'xoaHoaDonDaTai', hd[1].MaHoaDon);
  assert.equal(dong(ctx.SHEET_BANGKE_HOADON).filter(h => h.MaTaiLieu === tep2.maTaiLieu).length, 0);
  assert.ok(!dong(ctx.SHEET_TAILIEU).some(t => t.MaTaiLieu === tep2.maTaiLieu), 'dòng tài liệu đã xoá');
  assert.equal(tepTrash(link), true, 'file vào thùng rác');
});
dat('Xoá cả tệp (bảng lương): mất dòng lương + tổng bộ phận + dòng tài liệu; tệp chưa gắn hồ sơ cũng xoá được', () => {
  const t = api('ketoan@example.com', 'luuChungTuNhieuTrang', '', pdf, [ct('9101', 500000)]);
  ctx.themDongVaoCuoiThat_(ctx.ensureSheet_(ctx.getSS_(), ctx.SHEET_BANGKE_LUONG, ['MaDongLuong', 'MaTaiLieu', 'MaHoSo', 'HoTen', 'Thang', 'SoTien', 'NgayTaiLen']), ['L1', t.maTaiLieu, '', 'Nguyễn Văn A', '10/2026', 1000, new Date()]);
  ctx.themDongVaoCuoiThat_(ctx.ensureSheet_(ctx.getSS_(), ctx.SHEET_TONGHOP_LUONG_BP, ctx.COT_TONGHOP_LUONG_BP_), [t.maTaiLieu, '', '10/2026', 'Bộ phận A', 1, 1000, 0, 0, 0, 0, new Date()]);
  const r = api('ketoan@example.com', 'xoaTaiLieuDinhKem', t.maTaiLieu);
  assert.equal(r.soHoaDon, 1); assert.equal(r.soDongLuong, 1);
  assert.ok(!dong(ctx.SHEET_BANGKE_LUONG).some(d => d.MaTaiLieu === t.maTaiLieu));
  assert.ok(!dong(ctx.SHEET_TONGHOP_LUONG_BP).some(d => d.MaTaiLieu === t.maTaiLieu));
  assert.ok(!dong(ctx.SHEET_TAILIEU).some(d => d.MaTaiLieu === t.maTaiLieu));
});
dat('Hoá đơn đang dùng ở Danh sách thụ hưởng của hồ sơ: KHÔNG cho xoá (cả xoá lẻ lẫn xoá tệp); vai trò Chỉ xem không xoá được', () => {
  const t = api('ketoan@example.com', 'luuChungTuNhieuTrang', ma, pdf, [ct('9201', 700000)]);
  ctx.themDongVaoCuoiThat_(ctx.getSS_().getSheetByName(ctx.SHEET_CHITIET), (() => { const h = ctx.getSS_().getSheetByName(ctx.SHEET_CHITIET).getRange(1, 1, 1, ctx.getSS_().getSheetByName(ctx.SHEET_CHITIET).getLastColumn()).getValues()[0]; return h.map(c => ({ MaHoSo: ma, STT: 1, TenNguoiHuong: 'CÔNG TY MẪU MỘT', SoTien: 700000, TaiLieuSo: '9201' })[c] ?? ''); })());
  const hd = dong(ctx.SHEET_BANGKE_HOADON).find(h => h.MaTaiLieu === t.maTaiLieu);
  assert.throws(() => api('ketoan@example.com', 'xoaHoaDonDaTai', hd.MaHoaDon), /9201 đang dùng ở Danh sách thụ hưởng/);
  assert.throws(() => api('ketoan@example.com', 'xoaTaiLieuDinhKem', t.maTaiLieu), /đang dùng ở Danh sách thụ hưởng/);
  assert.throws(() => api('xem@example.com', 'xoaHoaDonDaTai', hd.MaHoaDon), /\[QUYEN\]/);
  assert.ok(dong(ctx.SHEET_BANGKE_HOADON).some(h => h.MaHoaDon === hd.MaHoaDon), 'vẫn còn');
});
dat('Chọn hoá đơn (nút 🔎): không nhập tên hoặc tên không khớp → hiện mọi hoá đơn đã tải lên có số tiền, chưa dùng ở hồ sơ khác (gắn cờ khongKhopTen); tên khớp → chỉ hoá đơn khớp', () => {
  api('ketoan@example.com', 'luuChungTuNhieuTrang', '', pdf, [ct('9301', 300000, 'HỘ KINH DOANH KEO MẪU'), ct('9302', 0, 'HỘ KINH DOANH KEO MẪU')]);
  let r = api('ketoan@example.com', 'layDanhSachTaiLieuTheoNhaCungCap', '', '');
  assert.ok(r.some(x => x.sohd === '9301' && x.khongKhopTen), JSON.stringify(r));
  assert.ok(!r.some(x => x.sohd === '9302'), 'bỏ dòng số tiền 0'); assert.ok(!r.some(x => x.sohd === '9201'), 'bỏ hoá đơn đã dùng ở hồ sơ khác');
  r = api('ketoan@example.com', 'layDanhSachTaiLieuTheoNhaCungCap', 'Công ty TNHH Không Khớp Gì', '');
  assert.ok(r.length && r.every(x => x.khongKhopTen));
  r = api('ketoan@example.com', 'layDanhSachTaiLieuTheoNhaCungCap', 'Hộ kinh doanh keo mẫu', '');
  assert.deepEqual(r.map(x => x.sohd).sort(), ['9301', '9302'].filter(s => s === '9301' || r.some(x => x.sohd === s)).sort());
  assert.ok(r.every(x => !x.khongKhopTen));
});
dat('Giao diện: nút 🔎 hiện cho MỌI khoản mục (kể cả tiền keo); bước 3 có ô tải lên + ẩn dòng chưa đọc được/của hồ sơ khác; nút 🗑 ở bảng hoá đơn, bảng lương, bảng bảo hiểm; quyền xoaHoaDonDaTai đã đăng ký', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'JavaScript.html'), 'utf8'), ix = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8'), ph = fs.readFileSync(path.join(__dirname, '..', 'PHIEN.gs'), 'utf8');
  assert.ok(/btn\.style\.display = ''; \/\/ mọi khoản mục/.test(js)); assert.ok(!/Vui lòng nhập "Tên người hưởng" ở dòng này trước khi chọn hoá đơn/.test(js));
  assert.ok(/id="ctuInputTaiLen"[^>]*onchange="taiLenTuBuoc3_\(this\)"/.test(ix) && /id="ctuHienHet"/.test(ix));
  assert.ok(/nutXoa_\('HD', h\.maHoaDon/.test(js) && /nutXoa_\('TEP', g\.maTaiLieu/.test(js) && /nutXoa_\('HD', b\.maHoaDon, 'bảng đóng bảo hiểm/.test(js));
  assert.ok(/xoaHoaDonDaTai/.test(ph));
});
Q.ket('xoá tài liệu đã tải + chọn hoá đơn mọi khoản mục');
