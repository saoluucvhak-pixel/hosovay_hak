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
  ghiNhatKy_('', 'BAT_LICH_LUU_TRU_NAM', 'đã bật lịch tự động');
  var tt = layTrangThaiLichLuuTruNam(); tt.ok = true; tt.moTa = 'Mỗi ngày 3h kiểm tra; trong 15 ngày đầu tháng 1 tự lưu trữ năm trước nếu chưa có bản hợp lệ.';
  return tt;
}

/* =====================================================================================================================
 * LƯU TRỮ TỆP ĐÍNH KÈM TRÊN DRIVE + CẢNH BÁO DUNG LƯỢNG + KHÔI PHỤC CÓ KIỂM SOÁT
 *
 * • Sổ tệp (sheet LuuTruTep): mỗi tệp đính kèm (TaiLieuDinhKem) của hồ sơ thuộc năm lưu trữ là 1 dòng (Chờ → Đã sao | Lỗi | Mất). Việc sao chép chạy theo LÔ trong giới hạn thời gian
 *   (luuTruSaoTep) và TIẾP TỤC ĐƯỢC: gọi lại cho đến khi hết "Chờ"; tệp đã sao không sao lại. Bản sao nằm trong thư mục con "<tên bản lưu trữ>_TEP" của LuuTru_Nam; tệp gốc KHÔNG bị đụng.
 * • Dung lượng: ước tính trước (uocTinhLuuTruTep), cảnh báo khi Drive ≥ 80% (đỏ ≥ 90%), và CHẶN sao tệp khi dung lượng còn trống không đủ cho phần còn lại (kèm 5% dự phòng).
 * • Khôi phục KHÔNG ghi đè: chỉ so sánh (soSanhLuuTru) và THÊM LẠI dòng đã bị mất khỏi dữ liệu hiện hành (khoiPhucTuLuuTru) cho các bảng danh mục trong danh sách cho phép; dòng đang có không bao giờ bị sửa.
 * =================================================================================================================== */
var SHEET_LUU_TRU_TEP = 'LuuTruTep';
var COT_LUU_TRU_TEP_ = ['MaLuuTru', 'MaTaiLieu', 'MaHoSo', 'LoaiTaiLieu', 'TenFile', 'FileIdGoc', 'DungLuong', 'FileIdBanSao', 'TrangThai', 'Loi', 'ThoiDiem'];
var TEP_CHO = 'Chờ', TEP_DA_SAO = 'Đã sao', TEP_LOI = 'Lỗi', TEP_MAT = 'Mất';
var LUU_TRU_NGAN_SACH_MS_ = 4 * 60 * 1000, LUU_TRU_TEP_TOI_DA_LO_ = 200, LUU_TRU_CANH_BAO_TYLE_ = 0.8, LUU_TRU_NGUY_HIEM_TYLE_ = 0.9, LUU_TRU_DU_PHONG_ = 0.05;

/** Dung lượng Drive: { daDung, gioiHan, conTrong, tyLe, canhBao: '', 'CAO' | 'NGUY_HIEM' }. gioiHan 0 = không rõ (không cảnh báo). */
function luuTruDungLuongDrive_() {
  var da = 0, gh = 0; try { da = Number(DriveApp.getStorageUsed()) || 0; gh = Number(DriveApp.getStorageLimit()) || 0; } catch (e) { /* không đọc được: bỏ qua */ }
  var ty = gh > 0 ? da / gh : 0;
  return { daDung: da, gioiHan: gh, conTrong: gh > 0 ? Math.max(0, gh - da) : null, tyLe: Math.round(ty * 1000) / 1000, canhBao: gh > 0 && ty >= LUU_TRU_NGUY_HIEM_TYLE_ ? 'NGUY_HIEM' : (gh > 0 && ty >= LUU_TRU_CANH_BAO_TYLE_ ? 'CAO' : '') };
}
function luuTruFileIdTuUrl_(url) {
  var m = /(?:\/d\/|\/file\/|\/folders\/|[?&]id=)([A-Za-z0-9_-]{5,})/.exec(String(url || '')); return m ? m[1] : '';
}
function luuTruNamCuaHoSo_(h) {
  var d = ngayIsoCuaO_(h.NgayGiaiNgan) || ngayIsoCuaO_(h.NgayGiayNhanNo) || ''; return d ? Number(d.slice(0, 4)) : 0;
}
/** Các tệp đính kèm thuộc hồ sơ của năm nam: [{ maTaiLieu, maHoSo, loai, tenFile, fileId }] (chưa chạm Drive). */
function luuTruTepCuaNam_(nam) {
  var hoSoNam = {}; docDanhSachHoSo_(true).forEach(function (h) { if (luuTruNamCuaHoSo_(h) === nam) hoSoNam[String(h.MaHoSo)] = 1; });
  return (getSS_().getSheetByName(SHEET_TAILIEU) ? sheetToObjects_(SHEET_TAILIEU) : []).filter(function (t) { return hoSoNam[String(t.MaHoSo)]; }).map(function (t) {
    return { maTaiLieu: String(t.MaTaiLieu), maHoSo: String(t.MaHoSo), loai: String(t.LoaiTaiLieu || t.Loai || ''), tenFile: String(t.TenFile || ''), fileId: luuTruFileIdTuUrl_(t.Url || t.LinkFile || t.DuongDan || '') };
  });
}
/** Ước tính trước khi lưu trữ năm nam: số tệp + tổng dung lượng + dung lượng Drive (chỉ đọc). */
function uocTinhLuuTruTep(nam) {
  yeuCauDangNhap_(); yeuCauQuanTri_('ước tính lưu trữ tệp'); luuTruChanGioiHanCongTy_();
  var n = luuTruChuanNam_(nam), ds = luuTruTepCuaNam_(n), tong = 0, thieu = 0;
  ds.forEach(function (t) { if (!t.fileId) { thieu++; return; } try { tong += Number(DriveApp.getFileById(t.fileId).getSize()) || 0; } catch (e) { thieu++; } });
  var dl = luuTruDungLuongDrive_();
  return { nam: n, soTep: ds.length, soTepKhongDocDuoc: thieu, tongDungLuong: tong, drive: dl, duChoTrong: dl.conTrong === null || tong * (1 + LUU_TRU_DU_PHONG_) <= dl.conTrong };
}
function luuTruDocSoTep_(ma) { return docSheetBaoDam_(SHEET_LUU_TRU_TEP).filter(function (r) { return String(r.MaLuuTru) === String(ma); }); }
function luuTruTomTatTep_(rows) {
  var k = { tong: rows.length, cho: 0, daSao: 0, loi: 0, mat: 0, dungLuong: 0, dungLuongCon: 0 };
  rows.forEach(function (r) { var d = Number(r.DungLuong) || 0; k.dungLuong += d; if (r.TrangThai === TEP_DA_SAO) k.daSao++; else if (r.TrangThai === TEP_LOI) { k.loi++; k.dungLuongCon += d; } else if (r.TrangThai === TEP_MAT) k.mat++; else { k.cho++; k.dungLuongCon += d; } });
  return k;
}
/**
 * Lập sổ tệp cho 1 bản lưu trữ đã có (Quản trị). Chỉ lập 1 lần; gọi lại khi chưa có tệp nào ở trạng thái Chờ sẽ thêm các tệp MỚI đính kèm trước ngày gọi nếu chưa nằm trong sổ.
 */
function lapSoTepLuuTru(maLuuTru) {
  yeuCauDangNhap_(); yeuCauQuanTri_('lưu trữ tệp đính kèm'); luuTruChanGioiHanCongTy_();
  return voiKhoa_(function () {
    var ban = luuTruTimBan_(maLuuTru), co = {}; luuTruDocSoTep_(maLuuTru).forEach(function (r) { co[String(r.MaTaiLieu)] = 1; });
    var moi = luuTruTepCuaNam_(Number(ban.Nam)).filter(function (t) { return !co[t.maTaiLieu]; }), sh = ensureSheet_(getSS_(), SHEET_LUU_TRU_TEP, COT_LUU_TRU_TEP_), rows = [], now = new Date();
    moi.forEach(function (t) {
      var size = 0, tt = TEP_CHO, loi = '';
      if (!t.fileId) { tt = TEP_MAT; loi = 'Không xác định được tệp từ liên kết'; } else { try { size = Number(DriveApp.getFileById(t.fileId).getSize()) || 0; } catch (e) { tt = TEP_MAT; loi = 'Tệp gốc không còn / không truy cập được'; } }
      rows.push([String(maLuuTru), t.maTaiLieu, t.maHoSo, t.loai, lamSachCongThuc_(t.tenFile), t.fileId, size, '', tt, loi, now]);
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, COT_LUU_TRU_TEP_.length).setValues(rows);
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'LUU_TRU_TEP_LAP_SO', maLuuTru + ' | thêm ' + rows.length + ' tệp');
    return { maLuuTru: String(maLuuTru), themMoi: rows.length, tomTat: luuTruTomTatTep_(luuTruDocSoTep_(maLuuTru)) };
  });
}
function luuTruThuMucTep_(ban) {
  var cha = luuTruThuMuc_(), ten = String(ban.TenFile) + '_TEP', it = cha.getFoldersByName(ten);
  return it.hasNext() ? it.next() : cha.createFolder(ten);
}
/**
 * Sao 1 LÔ tệp đang "Chờ" (hoặc "Lỗi" nếu thử lại) trong giới hạn thời gian. Gọi lặp cho đến khi conLai = 0. tt = { thuLaiLoi?:bool }.
 * Chặn nếu dung lượng trống không đủ cho phần còn lại.
 */
function luuTruSaoTep(maLuuTru, tt) {
  yeuCauDangNhap_(); yeuCauQuanTri_('sao tệp đính kèm vào lưu trữ'); luuTruChanGioiHanCongTy_();
  var thuLai = !!(tt && tt.thuLaiLoi), bat = Date.now();
  return voiKhoa_(function () {
    var ban = luuTruTimBan_(maLuuTru), rows = luuTruDocSoTep_(maLuuTru);
    if (!rows.length) throw new Error('Bản lưu trữ ' + maLuuTru + ' chưa có sổ tệp. Bấm “Lập sổ tệp” trước.');
    var cho = rows.filter(function (r) { return r.TrangThai === TEP_CHO || (thuLai && r.TrangThai === TEP_LOI); }), canSao = cho.reduce(function (a, r) { return a + (Number(r.DungLuong) || 0); }, 0), dl = luuTruDungLuongDrive_();
    if (dl.conTrong !== null && canSao * (1 + LUU_TRU_DU_PHONG_) > dl.conTrong) throw new Error('Dung lượng Drive còn trống (' + dl.conTrong + ' byte) không đủ để sao ' + canSao + ' byte tệp. Giải phóng dung lượng hoặc nâng gói rồi thử lại.');
    var dich = luuTruThuMucTep_(ban), sh = getSS_().getSheetByName(SHEET_LUU_TRU_TEP), vals = layGiaTriThatCuaSheet_(sh), head = vals[0], cMa = head.indexOf('MaLuuTru'), cTL = head.indexOf('MaTaiLieu'), daXong = 0, loi = 0;
    for (var i = 0; i < cho.length && daXong < LUU_TRU_TEP_TOI_DA_LO_ && Date.now() - bat < LUU_TRU_NGAN_SACH_MS_; i++) {
      var r = cho[i], kq = { TrangThai: TEP_DA_SAO, Loi: '', ThoiDiem: new Date(), FileIdBanSao: '' };
      try {
        var goc = DriveApp.getFileById(r.FileIdGoc), ban2 = goc.makeCopy(String(r.MaHoSo) + '__' + String(r.TenFile || goc.getName()), dich);
        if (Number(ban2.getSize()) !== Number(goc.getSize())) { ban2.setTrashed(true); throw new Error('Kích thước bản sao khác bản gốc'); }
        kq.FileIdBanSao = ban2.getId();
      } catch (e) { kq.TrangThai = /not found|Không tìm thấy|No item/i.test(String(e.message)) ? TEP_MAT : TEP_LOI; kq.Loi = String(e.message).substring(0, 200); loi++; }
      for (var d = 1; d < vals.length; d++) if (String(vals[d][cMa]) === String(maLuuTru) && String(vals[d][cTL]) === String(r.MaTaiLieu)) { ghiCotHoSo_(sh, head, d + 1, kq); break; }
      daXong++;
    }
    SpreadsheetApp.flush();
    var tom = luuTruTomTatTep_(luuTruDocSoTep_(maLuuTru));
    ghiNhatKy_('', 'LUU_TRU_TEP_SAO', maLuuTru + ' | lô ' + daXong + ' tệp, lỗi ' + loi + ' | còn chờ ' + tom.cho);
    return { maLuuTru: String(maLuuTru), xuLyTrongLo: daXong, loiTrongLo: loi, conLai: tom.cho, tomTat: tom, thuMucTep: dich.getUrl(), xong: tom.cho === 0 };
  });
}
/** Sổ tệp của 1 bản lưu trữ (tóm tắt + danh sách) và dung lượng Drive. */
function layTepLuuTru(maLuuTru) {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem tệp lưu trữ'); luuTruChanGioiHanCongTy_();
  luuTruTimBan_(maLuuTru, true);
  var rows = luuTruDocSoTep_(maLuuTru);
  return { maLuuTru: String(maLuuTru), tomTat: luuTruTomTatTep_(rows), drive: luuTruDungLuongDrive_(), tep: rows.map(function (r) { return { maTaiLieu: r.MaTaiLieu, maHoSo: r.MaHoSo, loai: r.LoaiTaiLieu, tenFile: r.TenFile, dungLuong: Number(r.DungLuong) || 0, trangThai: r.TrangThai, loi: r.Loi || '', urlBanSao: r.FileIdBanSao ? 'https://drive.google.com/file/d/' + r.FileIdBanSao + '/view' : '' }; }) };
}
/** Cảnh báo dung lượng cho Tổng quan / màn lưu trữ (mọi người dùng toàn hệ thống đọc được). */
function layCanhBaoDungLuong() {
  yeuCauDangNhap_(); luuTruChanGioiHanCongTy_();
  var dl = luuTruDungLuongDrive_(); dl.thongBao = dl.canhBao === 'NGUY_HIEM' ? 'Drive đã dùng ' + Math.round(dl.tyLe * 100) + '% — sắp đầy, tệp mới có thể không tải lên được.' : (dl.canhBao === 'CAO' ? 'Drive đã dùng ' + Math.round(dl.tyLe * 100) + '% dung lượng. Cân nhắc lưu trữ năm cũ và dọn tệp.' : '');
  return dl;
}

/* ---------- Khôi phục có kiểm soát (chỉ thêm lại dòng đã mất; không ghi đè) ---------- */
function luuTruMienKhoiPhuc_() {
  return { HOSO: { khoa: 'MaHoSo', mien: 'HOSO' }, HOPDONG: { khoa: 'MaHD', mien: 'HOPDONG' }, CONGTY: { khoa: 'MaCty', mien: 'CONGTY' }, KHACHHANG: { khoa: 'MaKH', mien: 'KHACHHANG' }, TAISAN: { khoa: 'MaTS' }, BAOHIEM: { khoa: 'MaBH' } };
}
function luuTruDocBang_(sh) {
  if (!sh || sh.getLastRow() < 1) return { head: [], rows: [] };
  var v = layGiaTriThatCuaSheet_(sh); return { head: (v[0] || []).map(String), rows: v.slice(1).filter(function (r) { return Array.isArray(r) && r.some(function (c) { return c !== '' && c !== null && c !== undefined; }); }) };
}
/** Mở bản lưu trữ + bảng hiện hành của 1 miền khôi phục. */
function luuTruChuanBiSoSanh_(maLuuTru, mienMa) {
  var cfg = luuTruMienKhoiPhuc_()[String(mienMa || '')]; if (!cfg) throw new Error('Bảng này không được so sánh/khôi phục. Chọn: ' + Object.keys(luuTruMienKhoiPhuc_()).join(', ') + '.');
  var ban = luuTruTimBan_(maLuuTru), m = luuTruMienXem_()[mienMa], ss; try { ss = SpreadsheetApp.openById(ban.FileId); } catch (e) { throw new Error('Không mở được bản lưu trữ ' + maLuuTru + '.'); }
  var cu = luuTruDocBang_(ss.getSheetByName(m.sheet)), shHienTai = getSS_().getSheetByName(m.sheet), nay = luuTruDocBang_(shHienTai), kc = cu.head.indexOf(cfg.khoa), kn = nay.head.indexOf(cfg.khoa);
  if (kc < 0) throw new Error('Bản lưu trữ không có cột khoá ' + cfg.khoa + '.'); if (shHienTai && kn < 0) throw new Error('Bảng hiện hành không có cột khoá ' + cfg.khoa + '.');
  return { cfg: cfg, m: m, cu: cu, nay: nay, kc: kc, kn: kn, sh: shHienTai, ban: ban };
}
function luuTruTomDong_(head, ro) { return head.slice(0, 4).map(function (c, i) { return luuTruOChuoi_(ro[i]); }).filter(function (x) { return x !== ''; }).join(' | '); }
/** So sánh bản lưu trữ ↔ hiện hành: dòng đã MẤT, dòng đã ĐỔI (chỉ xem), số dòng mới. Chỉ đọc. */
function soSanhLuuTru(maLuuTru, mienMa) {
  yeuCauDangNhap_(); yeuCauQuanTri_('so sánh bản lưu trữ'); luuTruChanGioiHanCongTy_();
  var c = luuTruChuanBiSoSanh_(maLuuTru, mienMa), hien = {}, thieu = [], khac = [], gap = {};
  c.nay.rows.forEach(function (r) { hien[String(r[c.kn])] = r; });
  c.cu.rows.forEach(function (r) {
    var k = String(r[c.kc]); if (k === '') return; gap[k] = 1;
    var h = hien[k]; if (!h) { thieu.push({ khoa: k, tom: luuTruTomDong_(c.cu.head, r) }); return; }
    var cot = []; c.cu.head.forEach(function (ten, i) { var j = c.nay.head.indexOf(ten); if (j >= 0 && String(luuTruOChuoi_(r[i])) !== String(luuTruOChuoi_(h[j]))) cot.push({ cot: ten, luuTru: String(luuTruOChuoi_(r[i])), hienTai: String(luuTruOChuoi_(h[j])) }); });
    if (cot.length) khac.push({ khoa: k, cot: cot.slice(0, 8), soCotKhac: cot.length });
  });
  var moi = c.nay.rows.filter(function (r) { return !gap[String(r[c.kn])]; }).length;
  return { maLuuTru: String(maLuuTru), mien: mienMa, nhan: c.m.nhan, khoa: c.cfg.khoa, soDongLuuTru: c.cu.rows.length, soDongHienTai: c.nay.rows.length, thieu: thieu.slice(0, 500), tongThieu: thieu.length, khac: khac.slice(0, 200), tongKhac: khac.length, moiSauLuuTru: moi };
}
/**
 * Thêm lại các dòng đã mất (theo khoá) từ bản lưu trữ. Chỉ Quản trị; bắt buộc lý do; tối đa 200 dòng/lần; khoá không còn thiếu (đã có lại) bị bỏ qua; KHÔNG sửa dòng đang có.
 * Chỉ thêm đúng 1 bảng: bảng con (VD chi tiết thụ hưởng, trả nợ) không tự khôi phục kèm.
 */
function khoiPhucTuLuuTru(maLuuTru, mienMa, dsKhoa, lyDo) {
  yeuCauDangNhap_(); yeuCauQuanTri_('khôi phục từ bản lưu trữ'); luuTruChanGioiHanCongTy_();
  var ly = String(lyDo || '').trim(); if (ly.length < 5) throw new Error('Nhập lý do khôi phục (tối thiểu 5 ký tự).');
  var khoa = (Array.isArray(dsKhoa) ? dsKhoa : []).map(String).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  if (!khoa.length) throw new Error('Chọn ít nhất một dòng cần khôi phục.'); if (khoa.length > 200) throw new Error('Mỗi lần khôi phục tối đa 200 dòng.');
  var me = layDanhTinh_().email || emailNguoiDung_();
  return voiKhoa_(function () {
    var c = luuTruChuanBiSoSanh_(maLuuTru, mienMa); if (!c.sh) c.sh = ensureSheet_(getSS_(), c.m.sheet, c.cu.head);
    var head = layGiaTriThatCuaSheet_(c.sh)[0].map(String), kn = head.indexOf(c.cfg.khoa), hien = {}, daCo = [], them = [], khongThay = [];
    luuTruDocBang_(c.sh).rows.forEach(function (r) { hien[String(r[kn])] = 1; });
    khoa.forEach(function (k) {
      if (hien[k]) { daCo.push(k); return; }
      var ro = c.cu.rows.filter(function (r) { return String(r[c.kc]) === k; })[0]; if (!ro) { khongThay.push(k); return; }
      them.push(head.map(function (ten) { var j = c.cu.head.indexOf(ten); var v = j >= 0 ? ro[j] : ''; return typeof v === 'string' ? lamSachCongThuc_(v) : v; }));
    });
    if (!them.length) throw new Error('Không có dòng nào để khôi phục (' + daCo.length + ' dòng đã tồn tại, ' + khongThay.length + ' dòng không có trong bản lưu trữ).');
    var batDau = timDongThatCuoiCung_(c.sh) + 1; c.sh.getRange(batDau, 1, them.length, head.length).setValues(them);
    if (c.cfg.mien) tangRevision_(c.cfg.mien);
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'KHOI_PHUC_LUU_TRU', maLuuTru + ' | ' + mienMa + ' | thêm lại ' + them.length + ' dòng: ' + khoa.slice(0, 20).join(',') + ' | ' + ly.substring(0, 150) + ' | ' + me);
    return { ok: true, maLuuTru: String(maLuuTru), mien: mienMa, daKhoiPhuc: them.length, daCoSan: daCo, khongThayTrongLuuTru: khongThay };
  });
}

/** Trạng thái lịch tự động lưu trữ đầu năm, đọc từ trình kích hoạt THẬT: { bat, soLich, lanThuCuoi }. */
function layTrangThaiLichLuuTruNam() {
  yeuCauDangNhap_(); luuTruChanGioiHanCongTy_();
  var so = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'luuTruNamTuDong'; }).length, ms = 0;
  try { ms = Number(PropertiesService.getScriptProperties().getProperty('LUU_TRU_LAN_THU_MS')) || 0; } catch (e) { /* bỏ qua */ }
  return { bat: so > 0, soLich: so, lanThuCuoi: ms ? Utilities.formatDate(new Date(ms), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') : '' };
}
/** Tắt lịch tự động (xoá trình kích hoạt luuTruNamTuDong). Chỉ Quản trị. Trả trạng thái mới. */
function tatLichLuuTruNam() {
  yeuCauDangNhap_(); yeuCauQuanTri_('tắt lịch tự động lưu trữ năm'); luuTruChanGioiHanCongTy_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'luuTruNamTuDong') ScriptApp.deleteTrigger(t); });
  ghiNhatKy_('', 'TAT_LICH_LUU_TRU_NAM', 'đã tắt lịch tự động');
  return layTrangThaiLichLuuTruNam();
}
