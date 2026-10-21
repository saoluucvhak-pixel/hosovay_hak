// Kiểm thử "Tải trọn bộ hồ sơ (ZIP)" trên giả lập Apps Script/Drive — chưa chạy trên Google thật.
const assert = require('assert/strict'), cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const Q = require('./_qlv_chung')('tai_zip'), { ctx, mt, G, themHoSo, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const ma = themHoSo({ MaHoSo: 'HS-ZIP', MaHD: '', LoaiTien: 'USD', TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 1000 });
const tep = (ten, noiDung, type) => mt.DriveApp.createFile(new mt.Blob(Buffer.from(noiDung), type || 'application/octet-stream', ten));
const ghi = (loai, f1, f2, trangThai, soLan) => ctx.ghiPhatHanh_({ MaTaiLieu: 'TL-' + loai + soLan, MaHoSo: ma, LoaiTaiLieu: loai, SoLan: soLan, LoaiFile: 'docx', FileIdChinh: f1 ? f1.getId() : '', FileIdPdf: f2 ? f2.getId() : '', TrangThai: trangThai, NguoiPhatHanh: 'x', NgayPhatHanh: new Date() });
const giaiNen = (b64) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'zipchk_')), f = path.join(d, 'a.zip'); fs.writeFileSync(f, Buffer.from(b64, 'base64')); const o = path.join(d, 'o'); fs.mkdirSync(o); cp.execFileSync('unzip', ['-q', f, '-d', o]); const ds = []; (function dq(p) { fs.readdirSync(p, { withFileTypes: true }).forEach(e => e.isDirectory() ? dq(path.join(p, e.name)) : ds.push(path.relative(o, path.join(p, e.name)).split(path.sep).join('/'))); })(o); return { ds, doc: (r) => fs.readFileSync(path.join(o, r), 'utf8') }; };

dat('Chưa có chứng từ phát hành hợp lệ: báo lỗi rõ ràng, không tạo gói rỗng', () => {
  assert.throws(() => ctx.taiBoHoSoZip(ma), /chưa có chứng từ phát hành hợp lệ/);
  assert.throws(() => ctx.taiBoHoSoZip(''), /Thiếu mã hồ sơ/); assert.throws(() => ctx.taiBoHoSoZip('KHONG-CO'), /Không tìm thấy hồ sơ/);
});
dat('Gói ZIP có chứng từ Hiệu lực (tệp chính + PDF), bỏ bản đã thay thế, kèm hóa đơn/bảng lương và 00_THONG_TIN.txt', () => {
  ghi('DE_NGHI_GIAI_NGAN', tep('cu.docx', 'BAN-CU'), null, 'Đã thay thế', 1);
  ghi('DE_NGHI_GIAI_NGAN', tep('dn.docx', 'DE-NGHI-MOI'), tep('dn.pdf', 'PDF-DE-NGHI'), 'Hiệu lực', 2);
  ghi('CHUNG_TU_THANH_TOAN', tep('unc.xlsx', 'UNC'), null, 'Hiệu lực', 1);
  ghi('HDMB_NGOAI_TE', tep('loi.docx', 'LOI'), null, 'Lỗi', 1);
  const goc = mt.DriveApp.getFolderById('GOC_ID'), tm = goc.createFolder(ma), hd = tm.createFolder('HoaDonGTGT'), bl = tm.createFolder('BangLuong');
  hd.createFile(new mt.Blob(Buffer.from('HOA-DON'), 'application/pdf', 'Hóa đơn 001.pdf')); bl.createFile(new mt.Blob(Buffer.from('LUONG'), 'application/vnd.ms-excel', 'bang luong T10.xlsx'));
  const r = J(ctx.taiBoHoSoZip(ma)), z = giaiNen(r.base64);
  assert.match(r.tenFile, /^HoSo_HS-ZIP_[0-9_]+\.zip$/); assert.equal(r.thieu.length, 0);
  const ds = z.ds; assert.ok(ds.some(x => /^01_.*_L2\.docx$/.test(x)) && ds.some(x => /^01_.*_L2\.pdf$/.test(x)), 'đề nghị: bản Hiệu lực L2 (docx + pdf): ' + ds);
  assert.ok(ds.some(x => /^02_.*\.docx$/.test(x)) || ds.some(x => /^02_.*\.xlsx$/.test(x)) || ds.some(x => /^02_/.test(x)), 'có chứng từ thanh toán');
  assert.ok(!ds.some(x => /_L1\.docx$/.test(x) && /DE_NGHI|De_nghi|de_nghi/i.test(x)), 'không chứa bản đã thay thế');
  assert.ok(ds.some(x => /^dinh_kem_hoa_don\//.test(x)) && ds.some(x => /^dinh_kem_bang_luong\//.test(x)), 'có hóa đơn và bảng lương: ' + ds);
  assert.ok(!ds.some(x => /LOI/i.test(x) && /HDMB/i.test(x)), 'bản Lỗi không vào gói');
  const info = z.doc('00_THONG_TIN.txt'); assert.match(info, /HỒ SƠ GIẢI NGÂN HS-ZIP/); assert.match(info, /DANH SÁCH TỆP/);
  assert.equal(r.soTep, ds.length - 1); assert.ok(r.kichThuocKB >= 0);
  assert.equal(z.doc(ds.find(x => /_L2\.pdf$/.test(x))), 'PDF-DE-NGHI', 'nội dung đúng bản mới');
});
dat('File Drive bị mất: vẫn tạo gói các tệp còn lại và nêu rõ phần thiếu', () => {
  const goc = mt.DriveApp.getFolderById('GOC_ID');
  ghi('BANG_KE', tep('bk.docx', 'BK'), null, 'Hiệu lực', 1);
  ctx.ghiPhatHanh_({ MaTaiLieu: 'TL-MAT', MaHoSo: ma, LoaiTaiLieu: 'KHAC_MAT', SoLan: 1, LoaiFile: 'docx', FileIdChinh: 'ID_KHONG_TON_TAI', TrangThai: 'Hiệu lực', NguoiPhatHanh: 'x', NgayPhatHanh: new Date() });
  const r = J(ctx.taiBoHoSoZip(ma)); assert.ok(r.soTep >= 3); assert.ok(r.thieu.some(t => /không đọc được file trên Drive/.test(t)), JSON.stringify(r.thieu));
});
dat('Đã đăng nhập mới tải được; ẩn danh bị từ chối; không ghi/sửa dữ liệu hồ sơ', () => {
  const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), truoc = JSON.stringify(sh.g);
  ctx.taiBoHoSoZip(ma); assert.equal(JSON.stringify(sh.g), truoc, 'không đổi dòng hồ sơ');
  mt.__email = ''; assert.throws(() => ctx.taiBoHoSoZip(ma), /đăng nhập|quyền|AUTH/i); mt.__email = 'ketoan@example.com';
});
dat('Tên tệp trong gói an toàn (không dấu, không ký tự lạ) và không trùng', () => {
  assert.equal(ctx.tenTepAnToan_('Đề nghị giải ngân / BIDV: #1'), 'De_nghi_giai_ngan_BIDV_1');
  assert.equal(ctx.tenTepAnToan_(''), 'tep');
});
dat('Giao diện: tạo trọn bộ xong (Đã hoàn tất) thì TỰ gọi tải ZIP; có nút tải lại; quyền xem đã đăng ký', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'JavaScript.html'), 'utf8'), ph = fs.readFileSync(path.join(__dirname, '..', 'PHIEN.gs'), 'utf8');
  assert.ok(/if \(res\.trangThaiPhien === 'Đã hoàn tất'\) taiZipHoSo_\(maHoSo, true\)/.test(js)); assert.ok(/id="btnTaiZip"/.test(fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8')));
  assert.ok(/taiBoHoSoZip/.test(ph));
});
Q.ket('tải trọn bộ hồ sơ ZIP');
