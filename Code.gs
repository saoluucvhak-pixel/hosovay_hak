/**
 * CODE.GS
 * Điểm vào chính của ứng dụng: menu trên Google Sheet + Web App (doGet).
 */

var SHEET_CONGTY = 'DM_CongTy';
var SHEET_HOPDONG = 'DM_HopDongVay';
var SHEET_KHACHHANG = 'DM_KhachHang';
var SHEET_HOSO = 'HoSoGiaiNgan';
var SHEET_CHITIET = 'ChiTietThuHuong';
var SHEET_BAOCAO_DRAFT = 'BaoCaoTienVay_Draft';
var SHEET_TAILIEU = 'TaiLieuDinhKem';
var SHEET_BANGKE_HOADON = 'BangKeHoaDon';
var SHEET_BANGKE_LUONG = 'BangKeBangLuong';

// ===== CẤU HÌNH THEO CÔNG TY — đặt ở Script Properties, KHÔNG sửa mã =====
// Mở Apps Script > Cài đặt dự án > Thuộc tính tập lệnh (Script Properties), điền các khóa sau
// (hoặc nhập trong màn "Cài đặt hệ thống" của ứng dụng). Cùng một bộ mã dùng được cho mọi công ty:
//   CH_SPREADSHEET_ID      ID Google Sheet dữ liệu (khuyến nghị luôn đặt: Web App không có "Sheet đang mở"). Tên cũ SPREADSHEET_ID vẫn được đọc.
//   CH_THU_MUC_GOC_ID      ID thư mục Drive gốc lưu hồ sơ/báo cáo/sao lưu (BẮT BUỘC).
//   CH_SS_MUA_HANG_ID      ID Sheet "Sổ chi tiết mua hàng" (tùy chọn; để trống = tắt gợi ý nhà cung cấp).
//   CH_SHEET_MUA_HANG      Tên tab sổ mua hàng (mặc định SO_CHI_TIET_MUA_HANG).
//   CH_SS_BANG_LUONG_ID    ID Sheet bảng lương (tùy chọn); tab mặc định BANG_LUONG.
//   CH_TEN_UNG_DUNG        Tên hiển thị trong thư nhắc nợ (mặc định "Hồ sơ vay").
var SHEET_MUA_HANG = 'SO_CHI_TIET_MUA_HANG';
var SHEET_BANG_LUONG = 'BANG_LUONG';

/**
 * Cấu hình hệ thống: giá trị đã lưu ở Script Properties (qua luuCauHinhHeThong) hoặc, nếu chưa lưu, giá trị mặc định
 * khai báo ở đầu file này. TRƯỚC ĐÂY hàm này được Setting.gs/Backup.gs gọi nhưng chưa từng được định nghĩa.
 */
function CauHinh_() {
  var p = PropertiesService.getScriptProperties();
  function lay(khoa, macDinh) { return p.getProperty(khoa) || macDinh || ''; }
  return {
    ssMuaHangId: lay('CH_SS_MUA_HANG_ID', ''),
    sheetMuaHang: lay('CH_SHEET_MUA_HANG', SHEET_MUA_HANG),
    thuMucGocId: lay('CH_THU_MUC_GOC_ID', ''),
    ssBangLuongId: lay('CH_SS_BANG_LUONG_ID', ''),
    thuMucXuatTheoMauId: lay('CH_THU_MUC_XUAT_THEO_MAU_ID', ''),
    // 5 mã mẫu Google Docs/Sheets của bộ mẫu CŨ (thay bằng mẫu DOCX ở tab "Mẫu Word") — chỉ giữ để không mất cấu hình đã lưu.
    templateVanBanDeNghiId: lay('CH_TEMPLATE_VANBAN_DENGHI_ID', ''),
    templateGiayNhanNoId: lay('CH_TEMPLATE_GIAYNHANNO_ID', ''),
    templateUNC4LienId: lay('CH_TEMPLATE_UNC_4LIEN_ID', ''),
    templateBangKeHDGiaiNganId: lay('CH_TEMPLATE_BANGKE_HD_GIAINGAN_ID', ''),
    templateBangKeUNC4LienId: lay('CH_TEMPLATE_BANGKE_UNC_4LIEN_ID', '')
  };
}

/** Chạy khi mở Google Sheet: thêm menu tuỳ chỉnh. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Hồ Sơ Vay NH')
    .addItem('Mở ứng dụng (tạo hồ sơ giải ngân)', 'showApp')
    .addSeparator()
    .addItem('Khởi tạo / kiểm tra cấu trúc Sheet', 'initializeSpreadsheet')
    .addItem('Rà soát tiền lẻ lịch sử (VND/USD phải là số nguyên)', 'raSoatTienLeLichSuMenu')
    .addItem('Cấu hình quản trị viên (phân quyền)', 'cauHinhQuanTriMenu')
    .addItem('Kiểm tra môi trường & cấu hình', 'kiemTraMoiTruongMenu')
    .addItem('Làm mới báo cáo nháp (BaoCaoTienVay_Draft)', 'lamMoiBaoCaoNhapMenu')
    .addItem('Sửa link chứng từ cũ (XLSX nằm nhầm cột PDF)', 'suaLinkChungTuCuMenu')
    .addToUi();
}

/** Mẫu Index với ĐỦ biến scriptlet (<?= phien ?>, <?= loiDangNhap ?>, <?= baseUrl ?>) — dùng chung cho doGet (Web App) và showApp (dialog trong Sheet). */
function taoMauIndex_(phien, loiDangNhap) {
  var tmpl = HtmlService.createTemplateFromFile('Index');
  tmpl.phien = phien || ''; tmpl.loiDangNhap = loiDangNhap || '';
  var url = ''; try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { url = ''; }
  tmpl.baseUrl = url;
  return tmpl;
}

/** Mở giao diện ứng dụng dạng cửa sổ (dialog) ngay trong Google Sheet. */
function showApp() {
  // Mở từ menu Sheet: không qua đăng nhập SSO nên truyền giá trị rỗng cho mọi biến của mẫu Index (thiếu biến → "ReferenceError: phien is not defined").
  var html = taoMauIndex_('', '')
    .evaluate()
    .setWidth(1100)
    .setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(html, 'Tạo hồ sơ giải ngân & in ấn hồ sơ vay ngân hàng');
}

/**
 * doGet: cho phép truy cập như một Web App độc lập (khi deploy Publish > Deploy as web app).
 * Dùng chung 1 giao diện Index.html.
 */
function doGet(e) {
  e = e || { parameter: {} };
  var phien = '', loiDangNhap = '';
  if (e.parameter && e.parameter.sso) {
    var dn = xuLyDangNhapSso_(e.parameter.sso);
    if (dn.yeuCau) return trangDangNhapNhung_(dn.yeuCau, dn.phien, dn.loi); // đăng nhập từ trang nhúng: mã ghép cặp 6 số
    phien = dn.phien; loiDangNhap = dn.loi;
  }
  var tmpl = taoMauIndex_(phien, loiDangNhap);
  return tmpl.evaluate()
    .setTitle('Hồ sơ vay & Đề nghị giải ngân ngân hàng')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Cho phép include file .html khác (CSS/JS) vào Index.html bằng <?!= include('X'); ?> */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Tải sơ đồ theo nhu cầu; chỉ trả tài liệu tĩnh, không đọc dữ liệu nghiệp vụ. */
function layGiaoDienLuongDuLieu() {
  yeuCauDangNhap_();
  return include('LuongDuLieu');
}

var _ssDaMo_ = null; // "nhớ tạm" Spreadsheet đã mở, dùng lại trong CÙNG 1 lượt thực thi — tránh việc
// 1 hàm cần đọc nhiều sheet (VD: locDanhSachHoSo_ đọc 4 sheet) phải mở lại file từ đầu mỗi lần gọi
// getSS_(), vốn có độ trễ riêng đáng kể mỗi lần mở.
/**
 * ID Spreadsheet dữ liệu: Script Property CH_SPREADSHEET_ID; nếu chưa đặt thì dùng Sheet đang gắn script (script tạo từ Sheet).
 * Không có cả hai thì báo lỗi rõ ràng, không đoán ID.
 */
function idSpreadsheet_() {
  var v = '';
  try {
    var p = PropertiesService.getScriptProperties();
    // CH_SPREADSHEET_ID là tên chuẩn; SPREADSHEET_ID là tên cũ vẫn đang được nhiều bản triển khai đặt sẵn.
    v = String(p.getProperty('CH_SPREADSHEET_ID') || p.getProperty('SPREADSHEET_ID') || '').trim();
  } catch (e) { v = ''; }
  if (v) return v;
  var dang = null;
  try { dang = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { dang = null; }
  if (dang) return dang.getId();
  throw new Error('Chưa cấu hình Google Sheet dữ liệu: đặt Script Property CH_SPREADSHEET_ID hoặc tạo script từ Sheet (Tiện ích mở rộng > Apps Script).');
}
/** Thông báo rõ: tài liệu nào, ID nào, tài khoản nào đang chạy ứng dụng, và cách xử lý — thay cho câu "không có quyền" chung chung của Google. */
function thongBaoKhongMoDuocTaiLieu_(ten, id, loi) {
  var tk = '';
  try { tk = String(Session.getEffectiveUser().getEmail() || ''); } catch (e) { tk = ''; }
  return 'Không mở được ' + ten + ' (ID ' + String(id || '(trống)').slice(0, 12) + '…). Ứng dụng đang chạy bằng tài khoản ' + (tk || 'chủ script') +
    ': hãy chia sẻ tài liệu này cho tài khoản đó với quyền Chỉnh sửa, hoặc kiểm tra lại ID (chỉ ID, không dán cả đường link). Chi tiết Google: ' + (loi && loi.message ? loi.message : loi);
}
function getSS_() {
  if (!_ssDaMo_) {
    var idSs = idSpreadsheet_();
    try { _ssDaMo_ = SpreadsheetApp.openById(idSs); }
    catch (e) { throw new Error(thongBaoKhongMoDuocTaiLieu_('Google Sheet dữ liệu (Script Property CH_SPREADSHEET_ID)', idSs, e)); }
  }
  return _ssDaMo_;
}

/**
 * KIỂM TRA MÔI TRƯỜNG & CẤU HÌNH TRIỂN KHAI (chỉ quản trị). Không sửa dữ liệu. Mỗi mục: { muc, trangThai: 'OK'|'CANH_BAO'|'LOI', chiTiet }.
 * Dùng trước khi đưa lên production: kiểm môi trường, đăng nhập/quyền, Spreadsheet + tab + cột bắt buộc, thư mục Drive, nguồn bảng lương/mua hàng.
 */
function kiemTraMoiTruongHeThong() {
  yeuCauDangNhap_();
  yeuCauQuanTri_('kiểm tra môi trường và cấu hình hệ thống');
  var kq = [], p = PropertiesService.getScriptProperties();
  var them = function (muc, tt, ct) { kq.push({ muc: muc, trangThai: tt, chiTiet: ct }); };
  var mt = moiTruong_(), che = portalCheDo_(), idDung = idSpreadsheet_();
  them('Môi trường', mt === 'PRODUCTION' ? 'OK' : 'CANH_BAO', mt === 'PRODUCTION' ? 'PRODUCTION (fail closed).' : mt + ' — KHÔNG dùng cho dữ liệu thật: xác thực được nới lỏng.');
  var qt = danhSachQuanTri_();
  them('Quản trị viên', qt.length ? 'OK' : 'CANH_BAO', qt.length ? qt.length + ' email trong ADMIN_EMAILS (cộng chủ script).' : 'ADMIN_EMAILS trống: chỉ chủ script là quản trị. Hãy cấu hình ở menu "Cấu hình quản trị viên".');
  if (che === 'CONG_HAK') {
    var secret = !!p.getProperty(AUTH_.PROP_SECRET), cong = !!p.getProperty(AUTH_.PROP_CONG_URL);
    them('Cổng đăng nhập HAK', secret && cong ? 'OK' : 'LOI', 'Chế độ CONG_HAK: ' + (secret ? 'đã có SSO_SECRET' : 'THIẾU SSO_SECRET') + '; ' + (cong ? 'đã có địa chỉ cổng' : 'THIẾU địa chỉ cổng') + '.');
  } else them('Cổng đăng nhập HAK', mt === 'PRODUCTION' ? 'CANH_BAO' : 'OK', 'Đang ở chế độ TAM_GOOGLE (danh tính theo tài khoản Google + sheet SYS_NguoiDung). Khuyến nghị bật CONG_HAK khi triển khai chính thức.');
  var yeuCau = { DM_CongTy: ['MaCty', 'TenCty'], DM_HopDongVay: ['MaHD', 'MaCty', 'SoHopDong'], DM_KhachHang: ['MaKH'], HoSoGiaiNgan: ['MaHoSo', 'MaHD', 'TrangThai', 'Revision'], ChiTietThuHuong: ['MaHoSo', 'SoTien'] };
  try {
    var ss = getSS_();
    them('Spreadsheet dữ liệu', 'OK', (ss.getName() || '') + ' (ID lấy từ ' + (p.getProperty('CH_SPREADSHEET_ID') ? 'Script Property CH_SPREADSHEET_ID' : 'Sheet đang gắn script') + ').');
    Object.keys(yeuCau).forEach(function (ten) {
      var sh = ss.getSheetByName(ten);
      if (!sh) { them('Tab ' + ten, 'LOI', 'Không tìm thấy tab. Chạy "Khởi tạo / kiểm tra cấu trúc Sheet".'); return; }
      var dau = sh.getLastColumn() > 0 ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
      var thieu = yeuCau[ten].filter(function (c) { return dau.indexOf(c) < 0; });
      them('Tab ' + ten, thieu.length ? 'LOI' : 'OK', thieu.length ? 'Thiếu cột: ' + thieu.join(', ') : 'Đủ cột bắt buộc.');
    });
  } catch (e) { them('Spreadsheet dữ liệu', 'LOI', 'Không mở được: ' + e.message); }
  var ch = CauHinh_();
  try { them('Thư mục Drive gốc', 'OK', DriveApp.getFolderById(ch.thuMucGocId).getName()); } catch (e) { them('Thư mục Drive gốc', 'LOI', 'Không mở được thư mục gốc: ' + e.message); }
  try { SpreadsheetApp.openById(ch.ssMuaHangId); them('Sổ chi tiết mua hàng', 'OK', 'Truy cập được.'); } catch (e) { them('Sổ chi tiết mua hàng', 'CANH_BAO', 'Không mở được (gợi ý nhà cung cấp tắt): ' + e.message); }
  var bl = String(ch.ssBangLuongId || '');
  if (!bl || bl.indexOf('DÁN_ID') >= 0) them('Nguồn bảng lương', 'CANH_BAO', 'CHƯA cấu hình (CH_SS_BANG_LUONG_ID) — tra cứu bảng lương bị tắt; các chức năng khác không ảnh hưởng. Nếu không dùng, có thể bỏ qua.');
  else { try { SpreadsheetApp.openById(bl); them('Nguồn bảng lương', 'OK', 'Truy cập được.'); } catch (e) { them('Nguồn bảng lương', 'LOI', 'Đã cấu hình nhưng không mở được: ' + e.message); } }
  return { tongHop: { ok: kq.filter(function (x) { return x.trangThai === 'OK'; }).length, canhBao: kq.filter(function (x) { return x.trangThai === 'CANH_BAO'; }).length, loi: kq.filter(function (x) { return x.trangThai === 'LOI'; }).length }, muc: kq };
}

/** Menu Sheet: hiển thị kết quả kiểm tra môi trường/cấu hình. */
function kiemTraMoiTruongMenu() {
  var r = kiemTraMoiTruongHeThong(), ui = SpreadsheetApp.getUi();
  ui.alert('Kiểm tra môi trường & cấu hình (' + r.tongHop.ok + ' đạt, ' + r.tongHop.canhBao + ' cảnh báo, ' + r.tongHop.loi + ' lỗi)',
    r.muc.map(function (m) { return (m.trangThai === 'OK' ? '✔ ' : (m.trangThai === 'CANH_BAO' ? '⚠ ' : '✘ ')) + m.muc + ': ' + m.chiTiet; }).join('\n'), ui.ButtonSet.OK);
}

/**
 * CÔNG CỤ CHẨN ĐOÁN: cho biết Web App đang thực sự đọc/ghi dữ liệu vào Spreadsheet nào — dùng khi
 * nghi ngờ có sự cố đọc/ghi sai file. getSS_() giờ dùng ID gắn cứng (biến SPREADSHEET_ID ở đầu file
 * Code.gs) — nếu bạn đổi sang dùng cho 1 file Sheet khác, sửa đúng giá trị của biến đó là đủ.
 */

function layThongTinSpreadsheetDangDung() {
  yeuCauDangNhap_();
  yeuCauQuanTri_('xem thông tin Spreadsheet đang dùng');
  var ss = getSS_();
  var soDongTho = function (tenSheet) {
    var sh = ss.getSheetByName(tenSheet);
    return sh ? Math.max(0, sh.getLastRow() - 1) : -1; // -1 = chưa có tab này
  };
  var quaXuLy = function (tenSheet, cotMa) {
    try {
      var ds = sheetToObjects_(tenSheet);
      return { soLuong: ds.length, cacMa: ds.map(function (x) { return String(x[cotMa] || '(rỗng)'); }) };
    } catch (e) {
      return { soLuong: -1, cacMa: ['LỖI: ' + e.message] };
    }
  };
  var thatSuDangChay = function (hamGoi, cotMa) {
    try {
      var ds = hamGoi();
      return { soLuong: ds.length, cacMa: ds.map(function (x) { return String(x[cotMa] || '(rỗng)'); }) };
    } catch (e) {
      return { soLuong: -1, cacMa: ['LỖI: ' + e.message] };
    }
  };
  return {
    ten: ss.getName(),
    url: ss.getUrl(),
    id: ss.getId(),
    soDongCongTy: soDongTho(SHEET_CONGTY),
    soDongHopDong: soDongTho(SHEET_HOPDONG),
    soDongHoSo: soDongTho(SHEET_HOSO),
    phienBanDoc: 'DATASYNC_V2',
    congTyQuaXuLy: quaXuLy(SHEET_CONGTY, 'MaCty'),
    hopDongQuaXuLy: quaXuLy(SHEET_HOPDONG, 'MaHD'),
    congTyThatSuDangChay: thatSuDangChay(layDanhSachCongTy, 'MaCty'),
    hopDongThatSuDangChay: thatSuDangChay(layDanhSachHopDongDayDu, 'MaHD')
  };
}
