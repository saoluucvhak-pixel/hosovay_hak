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

/** Chạy khi mở Google Sheet: thêm menu tuỳ chỉnh. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Hồ Sơ Vay NH')
    .addItem('Mở ứng dụng (tạo hồ sơ giải ngân)', 'showApp')
    .addSeparator()
    .addItem('Khởi tạo / kiểm tra cấu trúc Sheet', 'initializeSpreadsheet')
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
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Hồ sơ vay & Đề nghị giải ngân ngân hàng')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Cho phép include file .html khác (CSS/JS) vào Index.html bằng <?!= include('X'); ?> */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSS_() {
  // Ưu tiên SPREADSHEET_ID đã lưu cố định (được set khi chạy "Khởi tạo / kiểm tra cấu trúc Sheet").
  // Đây là cách xác định spreadsheet ĐÁNG TIN CẬY DUY NHẤT khi chạy qua Web App (doGet) —
  // SpreadsheetApp.getActiveSpreadsheet() có thể trả về kết quả KHÔNG NHẤT QUÁN (lúc có lúc không,
  // hoặc trỏ nhầm sang spreadsheet khác đang mở cùng tài khoản) khi chạy ở chế độ Web App độc lập,
  // dẫn tới tình trạng lưu vào 1 nơi nhưng đọc lại ở 1 nơi khác (hoặc rỗng).
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  // Chưa từng chạy "Khởi tạo" lần nào: thử dùng active spreadsheet (chỉ đúng khi đang chạy dạng
  // dialog gắn kèm trong Sheet), đồng thời tự lưu lại SPREADSHEET_ID để các lần gọi sau nhất quán.
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', active.getId());
    return active;
  }
  throw new Error('Chưa thiết lập SPREADSHEET_ID. Hãy mở Google Sheet, vào menu ' +
    '"Hồ Sơ Vay NH" > "Khởi tạo / kiểm tra cấu trúc Sheet" một lần trước khi dùng Web App độc lập.');
}

/**
 * CÔNG CỤ CHẨN ĐOÁN: cho biết Web App đang thực sự đọc/ghi dữ liệu vào Spreadsheet nào — dùng khi
 * nghi ngờ "lưu vào Sheet đúng nhưng Web App không hiện", vì getSS_() dùng 1 SPREADSHEET_ID được
 * "nhớ" cố định trong Script Properties (đặt lần đầu khi chạy "Khởi tạo") — nếu ID đó vô tình trỏ
 * sang 1 Spreadsheet KHÁC (VD: từng chạy "Khởi tạo" trên 1 file test/bản sao trước đó), Web App sẽ
 * đọc/ghi vào SAI file dù người dùng đang nhìn đúng file thật trên trình duyệt.
 */
function layThongTinSpreadsheetDangDung() {
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
  return {
    ten: ss.getName(),
    url: ss.getUrl(),
    id: ss.getId(),
    soDongCongTy: soDongTho(SHEET_CONGTY),
    soDongHopDong: soDongTho(SHEET_HOPDONG),
    soDongHoSo: soDongTho(SHEET_HOSO),
    // Kết quả THẬT SỰ của hàm sheetToObjects_ (đúng hàm app đang dùng) — so với số dòng thô ở trên
    // để biết chắc lỗi nằm ở bước đọc/xử lý dữ liệu hay ở bước khác (hiển thị, cache trình duyệt...).
    congTyQuaXuLy: quaXuLy(SHEET_CONGTY, 'MaCty'),
    hopDongQuaXuLy: quaXuLy(SHEET_HOPDONG, 'MaHD')
  };
}
