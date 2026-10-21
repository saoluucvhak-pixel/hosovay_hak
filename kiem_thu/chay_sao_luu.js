// Kiểm thử SAO LƯU (Backup.gs) trên giả lập Apps Script/Drive — chưa chạy trên Google thật.
const path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), out = path.join(require('os').tmpdir(), 'hosovay_sao_luu');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out), G = mt.__;
ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx);
console.log = () => {}; console.warn = () => {}; console.error = () => {};
const _l = (...a) => process.stdout.write(a.join(' ') + '\n'); let ok = 0; const dat = (t, f) => { f(); ok++; _l('PASS ' + t); };
const gio = 3600000, chua = () => { delete G.props['BACKUP_LAN_CUOI_MS']; delete G.props['BACKUP_LAN_THU_MS']; };
const goc = () => { const g = mt.DriveApp.getFolderById('GOC_ID'); return g.getFoldersByName('Backup_Sheet').next(); };
const dem = (f) => { const it = f.getFiles(); let n = 0; while (it.hasNext()) { if (!it.next().isTrashed()) n++; } return n; };

dat('Thành công: tạo bản sao, xác minh, ghi BACKUP_LAN_CUOI_MS', () => {
  chua(); const r = ctx.saoLuuHangTuan();
  assert.equal(r.ok, true); assert.ok(r.fileId); assert.ok(Number(G.props.BACKUP_LAN_CUOI_MS) > 0); assert.equal(dem(goc()), 1);
});
dat('Gọi lại ngay: bỏ qua, không tạo thêm bản sao', () => {
  const r = ctx.saoLuuHangTuan(); assert.equal(r.boQua, true); assert.equal(dem(goc()), 1);
});
dat('THẤT BẠI (bản sao thiếu sheet): KHÔNG ghi BACKUP_LAN_CUOI_MS, bản hỏng bị bỏ thùng rác, lần sau (sau 10 phút) vẫn chạy được', () => {
  chua(); mt.__hongBanSao = true; const truoc = dem(goc());
  const r = ctx.saoLuuHangTuan(); mt.__hongBanSao = false;
  assert.equal(r.ok, false); assert.match(r.loi, /thiếu sheet|không có sheet/); assert.equal(G.props.BACKUP_LAN_CUOI_MS, undefined);
  assert.equal(dem(goc()), truoc, 'bản hỏng không được giữ lại');
  assert.equal(ctx.saoLuuHangTuan().boQua, true, 'chặn dồn dập 10 phút sau lần thử hỏng');
  G.props.BACKUP_LAN_THU_MS = String(Date.now() - 11 * 60000);
  assert.equal(ctx.saoLuuHangTuan().ok, true, 'sao lưu hỏng không chặn lần sau');
});
dat('Lỗi Drive (không mở được file gốc): trả ok=false, không ném lỗi, khoá được nhả', () => {
  chua(); const g = mt.DriveApp.getFileById; mt.DriveApp.getFileById = () => { throw new Error('Drive lỗi'); };
  let r; try { r = ctx.saoLuuHangTuan(); } finally { mt.DriveApp.getFileById = g; }
  assert.equal(r.ok, false); assert.equal(G.props.BACKUP_LAN_CUOI_MS, undefined);
  G.props.BACKUP_LAN_THU_MS = String(Date.now() - 11 * 60000); assert.equal(ctx.saoLuuHangTuan().ok, true);
});
dat('Đang có tiến trình khác giữ khoá: bỏ qua, không sao lưu trùng', () => {
  chua(); const tl = mt.LockService.getScriptLock; mt.LockService.getScriptLock = () => ({ tryLock: () => false, releaseLock() {} });
  const truoc = dem(goc()); let r; try { r = ctx.saoLuuHangTuan(); } finally { mt.LockService.getScriptLock = tl; }
  assert.equal(r.boQua, true); assert.equal(dem(goc()), truoc);
});
dat('Dọn bản cũ: chỉ file đúng tiền tố ứng dụng, giữ N bản mới nhất, không xóa file lạ', () => {
  const f = goc(), tien = ctx.backupTienTo_(mt.SpreadsheetApp.getActiveSpreadsheet());
  const them = (ten, ngay) => { const x = f.createFile(new mt.Blob(Buffer.from('x'), 'text/plain', ten)); x.ngayTao = new Date(ngay); return x; };
  const lan = them('GHI_CHU_QUAN_TRONG.txt', 1000), cu = [1, 2, 3, 4].map(i => them(tien + 'cu' + i, 1000 + i));
  const xoa = ctx.don_DepBanSaoCu_(f, 2, tien);
  assert.ok(xoa >= 3); assert.equal(lan.isTrashed(), false, 'file lạ không bị xóa'); assert.equal(cu[0].isTrashed(), true);
  const con = []; const it = f.getFiles(); while (it.hasNext()) { const x = it.next(); if (!x.isTrashed() && x.getName().indexOf(tien) === 0) con.push(x); }
  assert.equal(con.length, 2, 'đúng 2 bản đúng tiền tố được giữ');
  assert.equal(ctx.don_DepBanSaoCu_(f, 0, tien) >= 1 && true, true); // N<=0 vẫn giữ tối thiểu 1 bản
  const con2 = []; const it2 = f.getFiles(); while (it2.hasNext()) { const x = it2.next(); if (!x.isTrashed() && x.getName().indexOf(tien) === 0) con2.push(x); }
  assert.equal(con2.length, 1, 'luôn giữ bản hợp lệ cuối cùng');
});
dat('Cấu hình nguồn mua hàng: layDanhSachTaiLieuTheoNhaCungCap dùng ID trong Script Properties, không dùng hằng số cứng', () => {
  G.props.CH_SS_MUA_HANG_ID = 'SS_CAU_HINH_RIENG'; const g = mt.SpreadsheetApp.openById, da = [];
  mt.SpreadsheetApp.openById = (i) => { da.push(i); return g(i); };
  mt.__email = 'ketoan@example.com'; try { ctx.layDanhSachTaiLieuTheoNhaCungCap('Nhà cung cấp A', ''); } finally { mt.SpreadsheetApp.openById = g; delete G.props.CH_SS_MUA_HANG_ID; }
  assert.ok(da.includes('SS_CAU_HINH_RIENG'), 'phải mở đúng ID đã cấu hình: ' + da.join(','));
});
_l(`\nTỔNG: ${ok} kiểm tra sao lưu đạt, 0 lỗi`);
