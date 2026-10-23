/**
 * DEMO.GS — Tạo một Google Sheet demo để kiểm tra UI và bảng cha‑con.
 *
 * Chạy hàm `createDemoSheet()` trong môi trường Apps Script (hoặc từ trình chỉnh sửa Script
 * trong Google Spreadsheet). Hàm sẽ tạo một spreadsheet mới, khởi tạo cấu trúc sheet
 * (các tab, cột) bằng cách gọi `initializeSpreadsheet()` đã có trong `Setup.gs`,
 * và mở menu "Mở ứng dụng" để bạn có thể thử UI.
 */
function createDemoSheet() {
  // Tạo một spreadsheet mới (đặt tên để nhận biết)
  var ss = SpreadsheetApp.create('Hosovay Demo - UI & Cha‑Con');
  // Đặt spreadsheet hiện tại để các hàm phụ trợ (yeuCauDangNhap_ etc.) hoạt động
  SpreadsheetApp.setActiveSpreadsheet(ss);

  // Khởi tạo cấu trúc các sheet và các cột cần thiết
  initializeSpreadsheet();

  // Thông báo hoàn thành và mở menu UI (nếu có)
  SpreadsheetApp.getUi().alert('Demo spreadsheet đã được tạo và khởi tạo.\n' +
    'Bạn có thể mở menu "Mở ứng dụng" để kiểm tra UI và các bảng cha‑con.');
}
