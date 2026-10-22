// Kiểm thử "tải file qua ứng dụng" (báo cáo .xlsx/.pdf, chứng từ) trên giả lập Apps Script/Drive — chưa chạy trên Google thật.
// Người dùng chỉ có quyền TRONG APP (không có quyền Drive) vẫn tải được; file ngoài thư mục app hoặc ngoài phạm vi hồ sơ bị chặn.
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const Q = require('./_qlv_chung')('tai_file_qua_app'), { ctx, mt, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const blob = (ten, noiDung, type) => new mt.Blob(Buffer.from(noiDung), type || 'application/octet-stream', ten);
const goc = mt.DriveApp.getFolderById('GOC_ID');
const hd = hopDong();
const ma = themHoSo({ MaHoSo: 'HS-TAI', MaHD: hd.maHD, LoaiTien: 'VND', TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 1000 });
const doc = (r) => Buffer.from(r.base64, 'base64').toString('utf8');

dat('Báo cáo .xlsx trong thư mục BaoCao_TienVay: tải được qua app, đúng tên, loại và nội dung', () => {
  const f = ctx.layThuMucBaoCao_().createFile(blob('BaoCao_TienVay_2026.xlsx', 'XLSX-BAO-CAO', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
  const r = J(ctx.taiFileQuaApp(f.getId()));
  assert.equal(r.tenFile, 'BaoCao_TienVay_2026.xlsx'); assert.match(r.mimeType, /spreadsheetml/); assert.equal(doc(r), 'XLSX-BAO-CAO'); assert.ok(r.kichThuocKB >= 0);
});
dat('File tạo ở gốc Drive rồi chuyển vào thư mục báo cáo (cách báo cáo Excel đang lưu) vẫn tải được', () => {
  const f = mt.DriveApp.createFile(blob('BaoCao.pdf', 'PDF-BC', 'application/pdf'));
  ctx.layThuMucBaoCao_().addFile(f);
  assert.equal(doc(J(ctx.taiFileQuaApp(f.getId()))), 'PDF-BC');
});
dat('Chứng từ trong thư mục hồ sơ và thư mục con (HoaDonGTGT) tải được', () => {
  const tm = ctx.layThuMucHoSo_(ma), f1 = tm.createFile(blob('de_nghi.pdf', 'PDF-HS', 'application/pdf'));
  const f2 = tm.createFolder('HoaDonGTGT').createFile(blob('hoa_don.pdf', 'HOA-DON', 'application/pdf'));
  assert.equal(doc(J(ctx.taiFileQuaApp(f1.getId()))), 'PDF-HS'); assert.equal(doc(J(ctx.taiFileQuaApp(f2.getId()))), 'HOA-DON');
});
dat('File NGOÀI thư mục app, hoặc trong thư mục app nhưng không phải báo cáo/hồ sơ: bị chặn', () => {
  const ngoai = mt.DriveApp.createFile(blob('rieng_tu.pdf', 'BI-MAT', 'application/pdf'));
  assert.throws(() => ctx.taiFileQuaApp(ngoai.getId()), /không thuộc thư mục dữ liệu của ứng dụng/);
  const khac = goc.createFolder('MauVanBan').createFile(blob('mau.docx', 'MAU', 'application/octet-stream'));
  assert.throws(() => ctx.taiFileQuaApp(khac.getId()), /không thuộc thư mục báo cáo hay thư mục hồ sơ/);
  const thang = goc.createFile(blob('o_goc.pdf', 'GOC', 'application/pdf'));
  assert.throws(() => ctx.taiFileQuaApp(thang.getId()), /không thuộc thư mục dữ liệu của ứng dụng/);
});
dat('Hồ sơ ngoài phạm vi công ty được cấp: không tải được chứng từ của hồ sơ đó', () => {
  const f = ctx.layThuMucHoSo_(ma).createFile(blob('unc.pdf', 'UNC', 'application/pdf'));
  const cu = ctx.phamViCongTyNguoiDung_;
  try {
    ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC']; assert.throws(() => ctx.taiFileQuaApp(f.getId()), /phạm vi/);
    ctx.phamViCongTyNguoiDung_ = () => [String(Q.cty.maCty)]; assert.equal(doc(J(ctx.taiFileQuaApp(f.getId()))), 'UNC');
  } finally { ctx.phamViCongTyNguoiDung_ = cu; }
});
dat('File Google (Sheets/Docs), file đã xóa, mã sai, file quá lớn: báo lỗi rõ', () => {
  const gs = ctx.layThuMucBaoCao_().createFile(blob('BaoCao', 'ss', 'application/vnd.google-apps.spreadsheet'));
  assert.throws(() => ctx.taiFileQuaApp(gs.getId()), /file Google/);
  const xoa = ctx.layThuMucBaoCao_().createFile(blob('cu.pdf', 'X', 'application/pdf')); xoa.setTrashed(true);
  assert.throws(() => ctx.taiFileQuaApp(xoa.getId()), /đã bị xóa/);
  assert.throws(() => ctx.taiFileQuaApp('../abc'), /Mã file không hợp lệ/); assert.throws(() => ctx.taiFileQuaApp('KHONGCOFILE123'), /Không tìm thấy file/);
  const lon = ctx.layThuMucBaoCao_().createFile(blob('lon.pdf', '0123456789', 'application/pdf')), cap = ctx.ZIP_TOI_DA_BYTE_;
  try { ctx.ZIP_TOI_DA_BYTE_ = 5; assert.throws(() => ctx.taiFileQuaApp(lon.getId()), /quá lớn/); } finally { ctx.ZIP_TOI_DA_BYTE_ = cap; }
});
dat('Phải đăng nhập; gọi qua api() với vai trò XEM được phép; không ghi/sửa dòng hồ sơ', () => {
  const f = ctx.layThuMucBaoCao_().createFile(blob('a.xlsx', 'A', 'application/octet-stream'));
  const sh = mt.__.boDuLieu.getSheetByName('HoSoGiaiNgan'), truoc = JSON.stringify(sh.g);
  assert.equal(ctx.bangQuyenApi_().taiFileQuaApp, 'XEM');
  ctx.taiFileQuaApp(f.getId()); assert.equal(JSON.stringify(sh.g), truoc);
  mt.__email = ''; assert.throws(() => ctx.taiFileQuaApp(f.getId()), /đăng nhập|quyền|AUTH/i); mt.__email = 'ketoan@example.com';
});
dat('Giao diện: link .xlsx/.pdf/.docx tải qua app (taiFileQuaApp), link Google Doc/Sheet vẫn mở Drive; nhận đúng mã file từ link Drive', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'JavaScript.html'), 'utf8');
  assert.ok(/hienLinkVao_\(box, 'Tải file Excel \(\.xlsx\)', res\.xlsxUrl, true\)/.test(js));
  assert.ok(/hienLinkVao_\(box, 'Tải file Excel — TOÀN BỘ dữ liệu \(\.xlsx\)', res\.xlsxUrl, true\)/.test(js));
  assert.ok(/hienLinkVao_\(box, 'PDF bản in', res\.pdfUrl, true\)/.test(js) && /hienLinkVao_\(box, 'Google Doc \(để xem\/in\)', res\.docUrl\)/.test(js));
  assert.ok(/them\('📄', 'PDF', ketQua\.pdfUrl, true\)/.test(js) && /them\('📊', '\.xlsx', ketQua\.xlsxUrl, true\)/.test(js) && /them\('🔗', 'Google Sheet', ketQua\.sheetUrl, false\)/.test(js));
  assert.ok(/\.taiFileQuaApp\(maFile\)/.test(js));
  const m = js.match(/function maFileDrive_\(url\) \{[\s\S]*?\n  \}/); assert.ok(m, 'có maFileDrive_');
  const s = vm.createContext({ String }); vm.runInContext(m[0], s);
  assert.equal(s.maFileDrive_('https://drive.google.com/file/d/1T8cdZfekJJlqkwr84QeyVji0m7gypZ0_/view?usp=drivesdk'), '1T8cdZfekJJlqkwr84QeyVji0m7gypZ0_');
  assert.equal(s.maFileDrive_('https://drive.google.com/open?id=1AbCdEfGhIjKlMn'), '1AbCdEfGhIjKlMn');
  assert.equal(s.maFileDrive_('https://example.com/khong-phai-drive'), '');
});
Q.ket('tải file qua ứng dụng');
