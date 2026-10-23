/**
 * LUUTRU.GS — LƯU TRỮ TOÀN BỘ DỮ LIỆU THEO NĂM và XEM LẠI NĂM CŨ (chỉ đọc).
 *
 * • Lưu trữ năm N = một bản sao TOÀN BỘ file Google Sheet (mọi sheet) trong thư mục "LuuTru_Nam" (dưới thư mục gốc của ứng dụng), tên LUUTRU_<tên file>_<năm>_<ngày giờ>.
 *   Là ẢNH CHỤP tại thời điểm lưu: sửa dữ liệu hiện hành sau đó không làm đổi bản đã lưu. Mỗi lần lưu được xác minh (đủ sheet, đủ số dòng) rồi mới ghi sổ (sheet LuuTruNam).
 * • Khác sao lưu hằng tuần (Backup.gs: tiền tố BACKUP_, thư mục Backup_Sheet, tự dọn bản cũ): bản lưu trữ năm KHÔNG bao giờ bị tự dọn; "hủy" chỉ đánh dấu, không xoá file.
 * • Xem lại năm cũ: đọc bản sao (chỉ đọc, không ghi gì vào bản lưu trữ) qua danh sách bảng nghiệp vụ cho phép — KHÔNG gồm người dùng/cấu hình/khoá. Bản lưu trữ chứa dữ liệu mọi công ty nên
 *   chỉ tài khoản TOÀN HỆ THỐNG (không bị giới hạn công ty) được lưu trữ và xem.
 * • Tự động đầu năm: luuTruNamTuDong (đích của trình kích hoạt hằng ngày, tạo bằng taoLichLuuTruNam) lưu năm trước trong 15 ngày đầu tháng 1 nếu chưa có bản hợp lệ.
 * • Chưa có phục hồi tự động ngược vào dữ liệu hiện hành (tránh ghi đè dữ liệu thật): bản lưu trữ là nơi xem/đối chiếu; cần khôi phục thì làm thủ công từ file bản sao.
 */
var SHEET_LUU_TRU = 'LuuTruNam';
var COT_LUU_TRU_ = ['MaLuuTru', 'Nam', 'TenFile', 'FileId', 'Url', 'SoSheet', 'SoDong', 'ChiTietSheet', 'TrangThai', 'GhiChu', 'NguoiTao', 'ThoiDiemTao', 'HuyLuc', 'LyDoHuy'];
var LT_HOP_LE = 'Hợp lệ', LT_DA_HUY = 'Đã hủy';
var LUU_TRU_CACH_TOI_THIEU_MS_ = 10 * 60 * 1000;

/** Bảng nghiệp vụ được phép xem trong bản lưu trữ: mã → { sheet, nhan }. Cố ý KHÔNG có người dùng, cấu hình, nhật ký bảo mật. */
function luuTruMienXem_() {
  return {
    HOSO: { sheet: SHEET_HOSO, nhan: 'Hồ sơ giải ngân' }, CHITIET: { sheet: SHEET_CHITIET, nhan: 'Chi tiết thụ hưởng' }, HOPDONG: { sheet: SHEET_HOPDONG, nhan: 'Hợp đồng vay' },
    CONGTY: { sheet: SHEET_CONGTY, nhan: 'Công ty' }, KHACHHANG: { sheet: SHEET_KHACHHANG, nhan: 'Khách hàng' }, TRANO: { sheet: SHEET_TRA_NO, nhan: 'Sổ trả nợ' },
    HOADON: { sheet: SHEET_BANGKE_HOADON, nhan: 'Hoá đơn / bảng đóng bảo hiểm' }, LUONG: { sheet: SHEET_BANGKE_LUONG, nhan: 'Bảng lương' }, TAISAN: { sheet: SHEET_TAI_SAN_BAO_DAM, nhan: 'Đăng ký thế chấp tài sản' },
    BAOHIEM: { sheet: SHEET_BAO_HIEM_TS, nhan: 'Hợp đồng bảo hiểm tài sản' }, BAOHIEMCT: { sheet: SHEET_BAO_HIEM_TS_CT, nhan: 'Chi tiết tài sản bảo hiểm' }, PHEDUYET: { sheet: SHEET_PHE_DUYET, nhan: 'Phiếu duyệt giải ngân' },
    TYGIA: { sheet: SHEET_TY_GIA_THU_CONG, nhan: 'Tỷ giá' }, PHATHANH: { sheet: SHEET_LICH_SU_PHAT_HANH, nhan: 'Lịch sử phát hành chứng từ' }
  };
}
function luuTruChanGioiHanCongTy_() {
  if (phamViCongTyNguoiDung_().length) throw new Error('Bản lưu trữ chứa dữ liệu mọi công ty: chỉ tài khoản toàn hệ thống (không bị giới hạn theo công ty) được lưu trữ và xem.');
}
function luuTruThuMuc_() {
  var goc = DriveApp.getFolderById(CauHinh_().thuMucGocId), it = goc.getFoldersByName('LuuTru_Nam');
  return it.hasNext() ? it.next() : goc.createFolder('LuuTru_Nam');
}
/** Số dòng dữ liệu (không tính tiêu đề) của từng sheet: { tenSheet: soDong }. */
function luuTruDemDong_(ss) {
  var kq = {};
  ss.getSheets().forEach(function (sh) { kq[sh.getName()] = Math.max(0, sh.getLastRow() - 1); });
  return kq;
}
function luuTruChuanNam_(v) {
  var n = Number(v), nay = Number(homNayVN_().slice(0, 4));
  if (v === null || v === undefined || String(v).trim() === '' || !isFinite(n) || Math.floor(n) !== n || n < 2000 || n > nay) throw new Error('Năm lưu trữ phải là số nguyên từ 2000 đến ' + nay + '.');
  return n;
}

/** Lõi lưu trữ (đã giữ khoá bởi người gọi): sao chép, xác minh, ghi sổ. Lỗi → bỏ bản sao dở dang, ném lỗi. */
function luuTruNamLoi_(nam, ghiChu, nguoi) {
  var ds = docSheetBaoDam_(SHEET_LUU_TRU), now = Date.now();
  ds.forEach(function (r) {
    if (r.TrangThai === LT_HOP_LE && Number(r.Nam) === nam && now - new Date(r.ThoiDiemTao).getTime() < LUU_TRU_CACH_TOI_THIEU_MS_) throw new Error('Năm ' + nam + ' vừa được lưu trữ cách đây chưa đến 10 phút (' + r.MaLuuTru + ').');
  });
  var ss = getSS_(), truoc = luuTruDemDong_(ss), ten = 'LUUTRU_' + ss.getName() + '_' + nam + '_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss'), file = null;
  try {
    file = DriveApp.getFileById(ss.getId()).makeCopy(ten);
    luuTruThuMuc_().addFile(file);
    try { DriveApp.getRootFolder().removeFile(file); } catch (e) { /* bỏ qua */ }
    backupXacMinh_(ss, file, ten); // đủ sheet
    var sao = luuTruDemDong_(SpreadsheetApp.openById(file.getId())), lech = Object.keys(truoc).filter(function (n) { return sao[n] !== truoc[n]; });
    if (lech.length) throw new Error('Bản lưu trữ lệch số dòng ở: ' + lech.slice(0, 5).join(', ') + '.');
    var tong = Object.keys(truoc).reduce(function (a, n) { return a + truoc[n]; }, 0), ma = maBaoDamMoi_('LT', ds, 'MaLuuTru');
    ghiDongMoi_(SHEET_LUU_TRU, COT_LUU_TRU_, { MaLuuTru: ma, Nam: nam, TenFile: ten, FileId: file.getId(), Url: file.getUrl(), SoSheet: Object.keys(truoc).length, SoDong: tong, ChiTietSheet: JSON.stringify(truoc),
      TrangThai: LT_HOP_LE, GhiChu: lamSachCongThuc_(String(ghiChu || '').substring(0, 300)), NguoiTao: nguoi, ThoiDiemTao: new Date() });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'LUU_TRU_NAM', ma + ' | năm ' + nam + ' | ' + ten + ' | ' + Object.keys(truoc).length + ' sheet, ' + tong + ' dòng');
    return { ok: true, maLuuTru: ma, nam: nam, tenFile: ten, fileId: file.getId(), url: file.getUrl(), soSheet: Object.keys(truoc).length, soDong: tong };
  } catch (e) {
    if (file) { try { file.setTrashed(true); } catch (e2) { /* bản sao dở dang do chính lần này tạo */ } }
    throw e;
  }
}
/** Lưu trữ toàn bộ dữ liệu cho năm tt.nam (Quản trị, tài khoản toàn hệ thống). tt = { nam, ghiChu }. */
function luuTruNam(tt) {
  yeuCauDangNhap_(); yeuCauQuanTri_('lưu trữ dữ liệu theo năm'); luuTruChanGioiHanCongTy_();
  tt = tt || {};
  var nam = luuTruChuanNam_(tt.nam), me = layDanhTinh_().email || emailNguoiDung_();
  return voiKhoa_(function () { return luuTruNamLoi_(nam, tt.ghiChu, me); });
}
/** Danh sách bản lưu trữ, năm mới trước; kèm số dòng từng bảng xem được. */
function layDanhSachLuuTru() {
  yeuCauDangNhap_(); luuTruChanGioiHanCongTy_();
  var mien = luuTruMienXem_();
  var rows = docSheetBaoDam_(SHEET_LUU_TRU).map(function (r) {
    var ct = {}; try { ct = JSON.parse(r.ChiTietSheet || '{}'); } catch (e) { ct = {}; }
    return { maLuuTru: String(r.MaLuuTru), nam: Number(r.Nam), tenFile: String(r.TenFile || ''), url: String(r.Url || ''), soSheet: Number(r.SoSheet) || 0, soDong: Number(r.SoDong) || 0, trangThai: r.TrangThai, ghiChu: String(r.GhiChu || ''),
      nguoiTao: String(r.NguoiTao || ''), thoiDiemTao: r.ThoiDiemTao instanceof Date ? r.ThoiDiemTao.toISOString() : String(r.ThoiDiemTao || ''), lyDoHuy: String(r.LyDoHuy || ''),
      cacMien: Object.keys(mien).map(function (m) { return { ma: m, nhan: mien[m].nhan, soDong: Number(ct[mien[m].sheet]) || 0 }; }) };
  });
  rows.sort(function (a, b) { return (b.nam - a.nam) || (a.thoiDiemTao < b.thoiDiemTao ? 1 : -1); });
  return { namHienTai: Number(homNayVN_().slice(0, 4)), rows: rows };
}
function luuTruTimBan_(maLuuTru, choPhepDaHuy) {
  var r = docSheetBaoDam_(SHEET_LUU_TRU).filter(function (x) { return String(x.MaLuuTru) === String(maLuuTru); })[0];
  if (!r) throw new Error('Không tìm thấy bản lưu trữ ' + maLuuTru + '.');
  if (!choPhepDaHuy && r.TrangThai !== LT_HOP_LE) throw new Error('Bản lưu trữ ' + maLuuTru + ' đã hủy — không xem được.');
  return r;
}
function luuTruOChuoi_(v) {
  if (v instanceof Date) { var ngay = Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'), gio = Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'HH:mm:ss'); return gio === '00:00:00' ? ngay : ngay + ' ' + gio; }
  return v === null || v === undefined ? '' : v;
}
/**
 * XEM LẠI 1 bảng của năm cũ (CHỈ ĐỌC bản sao). tuyChon = { trang, kichThuocTrang (≤100, mặc định 50), tim (không phân biệt dấu/hoa thường) }.
 * Trả { cot:[tiêu đề], rows:[[giá trị theo cột]], tong, trang, soTrang, ... }.
 */
function layDuLieuLuuTru(maLuuTru, mien, tuyChon) {
  yeuCauDangNhap_(); luuTruChanGioiHanCongTy_();
  var o = tuyChon || {}, ban = luuTruTimBan_(maLuuTru), cacMien = luuTruMienXem_(), m = cacMien[String(mien || '')];
  if (!m) throw new Error('Bảng không được xem (hoặc chưa chọn bảng). Chọn một bảng trong danh sách.');
  var ss; try { ss = SpreadsheetApp.openById(ban.FileId); } catch (e) { throw new Error('Không mở được bản lưu trữ ' + maLuuTru + ' (file đã bị xoá hoặc không có quyền truy cập).'); }
  var sh = ss.getSheetByName(m.sheet), kichThuoc = Math.min(100, Math.max(1, Math.round(Number(o.kichThuocTrang)) || 50));
  var kq = { maLuuTru: String(maLuuTru), nam: Number(ban.Nam), mien: String(mien), nhanMien: m.nhan, tenSheet: m.sheet, cot: [], rows: [], tong: 0, trang: 1, soTrang: 1, kichThuocTrang: kichThuoc, thieuSheet: !sh };
  if (!sh || sh.getLastRow() < 1) return kq;
  var vals = layGiaTriThatCuaSheet_(sh), tim = o.tim ? chuanKhongDau_(String(o.tim)).trim() : '';
  kq.cot = (vals[0] || []).map(function (c) { return String(c === null || c === undefined ? '' : c); });
  var dong = [];
  for (var i = 1; i < vals.length; i++) {
    var ro = vals[i]; if (!Array.isArray(ro) || ro.every(function (c) { return c === '' || c === null || c === undefined; })) continue;
    var cells = kq.cot.map(function (_, j) { return luuTruOChuoi_(ro[j]); });
    if (tim && chuanKhongDau_(cells.join(' ')).indexOf(tim) < 0) continue;
    dong.push(cells);
  }
  kq.tong = dong.length; kq.soTrang = Math.max(1, Math.ceil(dong.length / kichThuoc)); kq.trang = Math.min(Math.max(1, Math.round(Number(o.trang)) || 1), kq.soTrang);
  kq.rows = dong.slice((kq.trang - 1) * kichThuoc, kq.trang * kichThuoc);
  return kq;
}
/** Hủy 1 bản lưu trữ (không xoá file, giữ dấu vết): cần lý do. */
function huyLuuTru(maLuuTru, lyDo) {
  yeuCauDangNhap_(); yeuCauQuanTri_('hủy bản lưu trữ'); luuTruChanGioiHanCongTy_();
  return voiKhoa_(function () {
    var r = luuTruTimBan_(maLuuTru, true);
    if (r.TrangThai !== LT_HOP_LE) throw new Error('Bản lưu trữ ' + maLuuTru + ' đã hủy trước đó.');
    var ly = String(lyDo || '').trim(); if (ly.length < 3) throw new Error('Cần nhập lý do hủy (tối thiểu 3 ký tự).');
    capNhatDongTheoMa_(SHEET_LUU_TRU, 'MaLuuTru', maLuuTru, { TrangThai: LT_DA_HUY, HuyLuc: new Date(), LyDoHuy: lamSachCongThuc_(ly.substring(0, 500)) });
    ghiNhatKy_('', 'HUY_LUU_TRU', maLuuTru + ' | ' + ly);
    return { maLuuTru: String(maLuuTru), trangThai: LT_DA_HUY };
  });
}
/**
 * Đích của trình kích hoạt hằng ngày (taoLichLuuTruNam): trong 15 ngày đầu tháng 1, nếu NĂM TRƯỚC chưa có bản lưu trữ hợp lệ thì lưu trữ. Không tham số, gọi được không cần đăng nhập
 * (hàm công khai) nên tự chặn: chỉ một lần cho mỗi năm, tối thiểu 10 phút giữa hai lần thử.
 */
function luuTruNamTuDong() {
  var hn = homNayVN_(), thang = Number(hn.slice(5, 7)), ngay = Number(hn.slice(8, 10)), nam = Number(hn.slice(0, 4)) - 1;
  if (thang !== 1 || ngay > 15) return { boQua: true, lyDo: 'Chưa đến đầu năm' };
  var props = PropertiesService.getScriptProperties();
  if (Date.now() - (Number(props.getProperty('LUU_TRU_LAN_THU_MS')) || 0) < LUU_TRU_CACH_TOI_THIEU_MS_) return { boQua: true, lyDo: 'Vừa thử cách đây chưa đến 10 phút' };
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(5000)) return { boQua: true, lyDo: 'Đang có tiến trình khác giữ khoá' };
  try {
    if (docSheetBaoDam_(SHEET_LUU_TRU).some(function (r) { return r.TrangThai === LT_HOP_LE && Number(r.Nam) === nam; })) return { boQua: true, lyDo: 'Năm ' + nam + ' đã có bản lưu trữ' };
    props.setProperty('LUU_TRU_LAN_THU_MS', String(Date.now()));
    return luuTruNamLoi_(nam, 'Tự động đầu năm', 'tự động');
  } catch (e) {
    try { ghiNhatKy_('', 'LUU_TRU_NAM', 'TỰ ĐỘNG THẤT BẠI năm ' + nam + ': ' + e.message); } catch (e2) { /* bỏ qua */ }
    return { ok: false, loi: e.message };
  } finally { try { khoa.releaseLock(); } catch (e3) { /* bỏ qua */ } }
}
/** Tạo lịch tự động (mỗi ngày 3h; chỉ có tác dụng trong 15 ngày đầu tháng 1). Thay lịch cũ, không nhân đôi. Chỉ Quản trị. */
function taoLichLuuTruNam() {
  yeuCauDangNhap_(); yeuCauQuanTri_('tạo lịch tự động lưu trữ năm');
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'luuTruNamTuDong') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('luuTruNamTuDong').timeBased().everyDays(1).atHour(3).create();
  return { ok: true, moTa: 'Mỗi ngày 3h kiểm tra; trong 15 ngày đầu tháng 1 tự lưu trữ năm trước nếu chưa có bản hợp lệ.' };
}
