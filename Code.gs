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

// ID của đúng Google Sheet dữ liệu — gắn CỨNG trực tiếp ở đây, không dò qua "spreadsheet đang mở"
// hay Script Properties nữa. Script này là container-bound (gắn theo file Sheet), nhưng khi mở qua
// Web App độc lập (doGet) thì KHÔNG có ngữ cảnh "đang active" nào cả — gắn cứng ID là cách chắc
// chắn duy nhất để Web App luôn đọc/ghi đúng 1 file Sheet này, dù mở kiểu gì (menu Sheet hay link
// Web App độc lập).
var SPREADSHEET_ID = '1Txv6FRkjsJRCcHJvjeX7RM65vZ7CdY_aMsiqMOglhIM';

// File Google Sheet "Sổ chi tiết mua hàng" (nguồn tra cứu Số hoá đơn / Ngày tài liệu
// theo Nhà cung cấp ở mục 3 - Danh sách thụ hưởng).
// https://docs.google.com/spreadsheets/d/1KdbvfpXI3EBaFlq4bfv9ZSala-D3Pe-6tZZYQArt-vU/edit
var SS_MUA_HANG_ID = '1KdbvfpXI3EBaFlq4bfv9ZSala-D3Pe-6tZZYQArt-vU';
var SHEET_MUA_HANG = 'SO_CHI_TIET_MUA_HANG';

// File Google Sheet "Bảng lương" (nguồn tra cứu khi Khoản mục giải ngân = "Thanh toán lương").
// ⚠️ CẦN THAY bằng ID file Bảng lương thật của bạn (mở file trên Google Drive, copy ID trong URL).
// Sheet cần có tối thiểu 3 cột: Tháng, Họ và tên, Số tiền (tên cột không phân biệt hoa/thường,
// nếu không đặt đúng tên thì hệ thống sẽ tự lấy theo vị trí cột A/B/C).
var SS_BANG_LUONG_ID = 'DÁN_ID_FILE_BẢNG_LƯƠNG_VÀO_ĐÂY';
var SHEET_BANG_LUONG = 'BANG_LUONG';

// Thư mục Google Drive gốc để lưu TẤT CẢ hồ sơ vay được tạo (Google Doc/PDF/báo cáo).
// https://drive.google.com/drive/folders/1OmF33Lb03Iu2Tzk0-08nBYFBY9u_OM3t
var THU_MUC_GOC_ID = '1OmF33Lb03Iu2Tzk0-08nBYFBY9u_OM3t';

/**
 * Cấu hình hệ thống: giá trị đã lưu ở Script Properties (qua luuCauHinhHeThong) hoặc, nếu chưa lưu, giá trị mặc định
 * khai báo ở đầu file này. TRƯỚC ĐÂY hàm này được Setting.gs/Backup.gs gọi nhưng chưa từng được định nghĩa.
 */
function CauHinh_() {
  var p = PropertiesService.getScriptProperties();
  function lay(khoa, macDinh) { return p.getProperty(khoa) || macDinh || ''; }
  return {
    ssMuaHangId: lay('CH_SS_MUA_HANG_ID', SS_MUA_HANG_ID),
    sheetMuaHang: lay('CH_SHEET_MUA_HANG', SHEET_MUA_HANG),
    thuMucGocId: lay('CH_THU_MUC_GOC_ID', THU_MUC_GOC_ID),
    ssBangLuongId: lay('CH_SS_BANG_LUONG_ID', SS_BANG_LUONG_ID),
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

/** Mở giao diện ứng dụng dạng cửa sổ (dialog) ngay trong Google Sheet. */
function showApp() {
  var html = HtmlService.createTemplateFromFile('Index')
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
  var tmpl = HtmlService.createTemplateFromFile('Index');
  tmpl.phien = phien; tmpl.loiDangNhap = loiDangNhap; tmpl.baseUrl = ScriptApp.getService().getUrl();
  return tmpl.evaluate()
    .setTitle('Hồ sơ vay & Đề nghị giải ngân ngân hàng')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Cho phép include file .html khác (CSS/JS) vào Index.html bằng <?!= include('X'); ?> */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

var _ssDaMo_ = null; // "nhớ tạm" Spreadsheet đã mở, dùng lại trong CÙNG 1 lượt thực thi — tránh việc
// 1 hàm cần đọc nhiều sheet (VD: locDanhSachHoSo_ đọc 4 sheet) phải mở lại file từ đầu mỗi lần gọi
// getSS_(), vốn có độ trễ riêng đáng kể mỗi lần mở.
/**
 * ID Spreadsheet dữ liệu: Script Property CH_SPREADSHEET_ID (nếu có — dùng cho bản TEST/DEV để KHÔNG chạm dữ liệu production),
 * ngược lại dùng ID gắn cứng SPREADSHEET_ID ở đầu file (production, giữ nguyên hành vi cũ).
 */
function idSpreadsheet_() {
  var v = '';
  try { v = String(PropertiesService.getScriptProperties().getProperty('CH_SPREADSHEET_ID') || '').trim(); } catch (e) { v = ''; }
  return v || SPREADSHEET_ID;
}
function getSS_() {
  if (!_ssDaMo_) {
    _ssDaMo_ = SpreadsheetApp.openById(idSpreadsheet_());
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
  if (mt !== 'PRODUCTION' && idDung === SPREADSHEET_ID) them('Cách ly dữ liệu', 'LOI', 'Bản ' + mt + ' đang trỏ vào Spreadsheet PRODUCTION. Đặt Script Property CH_SPREADSHEET_ID = ID Spreadsheet thử nghiệm.');
  var qt = danhSachQuanTri_();
  them('Quản trị viên', qt.length ? 'OK' : 'CANH_BAO', qt.length ? qt.length + ' email trong ADMIN_EMAILS (cộng chủ script).' : 'ADMIN_EMAILS trống: chỉ chủ script là quản trị. Hãy cấu hình ở menu "Cấu hình quản trị viên".');
  if (che === 'CONG_HAK') {
    var secret = !!p.getProperty(AUTH_.PROP_SECRET), cong = !!p.getProperty(AUTH_.PROP_CONG_URL);
    them('Cổng đăng nhập HAK', secret && cong ? 'OK' : 'LOI', 'Chế độ CONG_HAK: ' + (secret ? 'đã có SSO_SECRET' : 'THIẾU SSO_SECRET') + '; ' + (cong ? 'đã có địa chỉ cổng' : 'THIẾU địa chỉ cổng') + '.');
  } else them('Cổng đăng nhập HAK', mt === 'PRODUCTION' ? 'CANH_BAO' : 'OK', 'Đang ở chế độ TAM_GOOGLE (danh tính theo tài khoản Google + sheet SYS_NguoiDung). Khuyến nghị bật CONG_HAK khi triển khai chính thức.');
  var yeuCau = { DM_CongTy: ['MaCty', 'TenCty'], DM_HopDongVay: ['MaHD', 'MaCty', 'SoHopDong'], DM_KhachHang: ['MaKH'], HoSoGiaiNgan: ['MaHoSo', 'MaHD', 'TrangThai', 'Revision'], ChiTietThuHuong: ['MaHoSo', 'SoTien'] };
  try {
    var ss = getSS_();
    them('Spreadsheet dữ liệu', 'OK', (ss.getName() || '') + ' (ID lấy từ ' + (idDung === SPREADSHEET_ID ? 'mã nguồn' : 'Script Property CH_SPREADSHEET_ID') + ').');
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
    coHamThuLai: (typeof docCoThuLai_ === 'function'),
    congTyQuaXuLy: quaXuLy(SHEET_CONGTY, 'MaCty'),
    hopDongQuaXuLy: quaXuLy(SHEET_HOPDONG, 'MaHD'),
    congTyThatSuDangChay: thatSuDangChay(layDanhSachCongTy, 'MaCty'),
    hopDongThatSuDangChay: thatSuDangChay(layDanhSachHopDongDayDu, 'MaHD')
  };
}
