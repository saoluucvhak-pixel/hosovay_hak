/**
 * BACKUP.GS
 * Sao lưu định kỳ file Sheet chính ra 1 bản copy trong thư mục "Backup_Sheet".
 * Cách kích hoạt: Trình kích hoạt (⏰) > Thêm trình kích hoạt > chọn hàm saoLuuHangTuan
 * > Time-driven > Week timer > chọn ngày/giờ chạy (VD: Thứ Hai, 1h-2h sáng).
 *
 * Quy tắc:
 *  • BACKUP_LAN_CUOI_MS chỉ được ghi SAU KHI bản sao đã tạo và xác minh được; sao lưu hỏng không chặn lần sau.
 *  • BACKUP_LAN_THU_MS (lần thử gần nhất, kể cả hỏng) chỉ để chặn gọi dồn dập — tối thiểu 10 phút giữa hai lần thử.
 *  • Chạy dưới khoá script (không hai bản sao cùng lúc); luôn nhả khoá (finally).
 *  • Dọn bản cũ CHỈ trong thư mục Backup_Sheet và CHỈ file có đúng tiền tố của ứng dụng; luôn giữ bản mới nhất vừa xác minh.
 *  • Chưa có chức năng phục hồi tự động: phục hồi làm thủ công (xem DEPLOYMENT_GUIDE.md) để không ghi đè dữ liệu thật.
 */
var BACKUP_GIU_LAI_ = 12;
var BACKUP_CACH_TOI_THIEU_MS_ = 20 * 3600 * 1000;
var BACKUP_CACH_THU_TOI_THIEU_MS_ = 10 * 60 * 1000;

function saoLuuHangTuan() {
  // Hàm này là đích của trình kích hoạt theo giờ nên phải gọi được không cần đăng nhập; vì hàm công khai nên CHẶN TẦN SUẤT để người lạ
  // gọi trực tiếp (google.script.run) không thể tạo hàng loạt bản sao làm đầy Drive.
  var props = PropertiesService.getScriptProperties(), bayGio = Date.now();
  var lanCuoi = Number(props.getProperty('BACKUP_LAN_CUOI_MS')) || 0, lanThu = Number(props.getProperty('BACKUP_LAN_THU_MS')) || 0;
  if (bayGio - lanCuoi < BACKUP_CACH_TOI_THIEU_MS_) { console.warn('[BACKUP] Bỏ qua: đã sao lưu cách đây chưa đủ 20 giờ.'); return { boQua: true }; }
  if (bayGio - lanThu < BACKUP_CACH_THU_TOI_THIEU_MS_) { console.warn('[BACKUP] Bỏ qua: vừa thử sao lưu cách đây chưa đủ 10 phút.'); return { boQua: true }; }
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(5000)) { console.warn('[BACKUP] Bỏ qua: đang có tiến trình khác giữ khoá.'); return { boQua: true }; }
  var banSao = null;
  try {
    // Kiểm tra lại trong khoá: tiến trình trước có thể vừa xong.
    if (Date.now() - (Number(props.getProperty('BACKUP_LAN_CUOI_MS')) || 0) < BACKUP_CACH_TOI_THIEU_MS_) return { boQua: true };
    props.setProperty('BACKUP_LAN_THU_MS', String(Date.now()));
    var ss = getSS_(), tien = backupTienTo_(ss), dongTruoc = luuTruDemDong_(ss);
    var tenBanSao = tien + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss');
    banSao = DriveApp.getFileById(ss.getId()).makeCopy(tenBanSao);
    try { banSao.setDescription(backupDauNhanBiet_(ss)); } catch (e) { /* dấu nhận biết chỉ để dọn bản cũ khi file bị đổi tên; thiếu thì vẫn dọn theo tiền tố tên */ }
    var thuMuc = backupThuMuc_();
    thuMuc.addFile(banSao);
    try { DriveApp.getRootFolder().removeFile(banSao); } catch (e) { /* bỏ qua */ }
    backupXacMinh_(ss, banSao, tenBanSao, dongTruoc);
    props.setProperty('BACKUP_LAN_CUOI_MS', String(Date.now())); // chỉ ghi khi đã xác minh
    var daXoa = 0;
    try { daXoa = don_DepBanSaoCu_(thuMuc, BACKUP_GIU_LAI_, tien, backupDauNhanBiet_(ss)); } catch (e) { console.warn('[BACKUP] Dọn bản cũ lỗi (bản mới vẫn hợp lệ): ' + e.message); }
    console.log('[BACKUP] OK ' + tenBanSao + ' id=' + banSao.getId() + ' đã dọn ' + daXoa);
    try { ghiNhatKy_('', 'SAO_LUU', 'OK ' + tenBanSao + ' (dọn ' + daXoa + ' bản cũ)'); } catch (e) { /* nhật ký không được làm hỏng sao lưu */ }
    return { ok: true, tenBanSao: tenBanSao, fileId: banSao.getId(), daDon: daXoa };
  } catch (e) {
    if (banSao) { try { banSao.setTrashed(true); } catch (e2) { /* bỏ qua */ } } // bản sao hỏng/dở dang do chính lần này tạo
    console.error('[BACKUP] THẤT BẠI: ' + e.message);
    try { ghiNhatKy_('', 'SAO_LUU', 'THẤT BẠI: ' + e.message); } catch (e3) { /* bỏ qua */ }
    return { ok: false, loi: e.message };
  } finally {
    try { khoa.releaseLock(); } catch (e4) { /* bỏ qua */ }
  }
}

function backupTienTo_(ss) { return 'BACKUP_' + ss.getName() + '_'; }

/** Dấu ghi vào mô tả bản sao: gắn với ID file gốc nên đổi tên file Sheet vẫn nhận ra và dọn được các bản cũ. */
function backupDauNhanBiet_(ss) { return 'HAK_BACKUP:' + ss.getId(); }

function backupThuMuc_() {
  var goc = DriveApp.getFolderById(CauHinh_().thuMucGocId);
  var itBk = goc.getFoldersByName('Backup_Sheet');
  return itBk.hasNext() ? itBk.next() : goc.createFolder('Backup_Sheet');
}

/**
 * Mở bản sao và so danh sách sheet với bản gốc; lệch/thiếu thì ném lỗi (bản sao KHÔNG được coi là hợp lệ).
 * dongTruoc (tuỳ chọn, {tenSheet: số dòng dữ liệu} đo TRƯỚC khi sao chép): bản sao không được ít dòng hơn mốc này ở bất kỳ sheet nào.
 */
function backupXacMinh_(ssGoc, fileBanSao, tenMongDoi, dongTruoc) {
  if (!fileBanSao || fileBanSao.getName() !== tenMongDoi) throw new Error('Bản sao tạo ra không đúng tên mong đợi.');
  if (fileBanSao.isTrashed && fileBanSao.isTrashed()) throw new Error('Bản sao đã bị chuyển vào thùng rác.');
  var banSao = SpreadsheetApp.openById(fileBanSao.getId());
  var tenGoc = ssGoc.getSheets().map(function (s) { return s.getName(); }), tenSao = banSao.getSheets().map(function (s) { return s.getName(); });
  if (!tenSao.length) throw new Error('Bản sao không có sheet nào.');
  var thieu = tenGoc.filter(function (n) { return tenSao.indexOf(n) < 0; });
  if (thieu.length) throw new Error('Bản sao thiếu sheet: ' + thieu.slice(0, 5).join(', '));
  if (dongTruoc) {
    var dongSao = luuTruDemDong_(banSao), hut = Object.keys(dongTruoc).filter(function (n) { return (dongSao[n] || 0) < dongTruoc[n]; });
    if (hut.length) throw new Error('Bản sao ít dòng hơn bản gốc ở: ' + hut.slice(0, 5).join(', '));
  }
}

/**
 * Chỉ giữ N bản gần nhất. CHỈ động tới file có tên bắt đầu bằng tiền tố của ứng dụng hoặc mô tả đúng dấu HAK_BACKUP của file gốc (không xóa file khác trong thư mục),
 * bỏ qua file đã trong thùng rác, luôn giữ ít nhất 1 bản. Trả về số bản đã chuyển vào thùng rác.
 */
function don_DepBanSaoCu_(thuMuc, soBanGiuLai, tienTo, dauNhanBiet) {
  var giu = Math.max(1, Number(soBanGiuLai) || 1), files = [], it = thuMuc.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    var theoMoTa = false;
    if (dauNhanBiet) { try { theoMoTa = f.getDescription() === dauNhanBiet; } catch (e) { /* bỏ qua */ } }
    if (tienTo && !theoMoTa && String(f.getName()).indexOf(tienTo) !== 0) continue;
    if (f.isTrashed && f.isTrashed()) continue;
    files.push({ file: f, ngay: f.getDateCreated().getTime() });
  }
  files.sort(function (a, b) { return b.ngay - a.ngay; }); // mới nhất trước
  var xoa = 0;
  for (var i = giu; i < files.length; i++) { files[i].file.setTrashed(true); xoa++; }
  return xoa;
}
