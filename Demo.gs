/**
 * DEMO.GS — Tạo một Google Sheet demo riêng để kiểm tra UI và bảng cha‑con.
 *
 * Chạy hàm `createDemoSheet()` trong Apps Script (chỉ Quản trị). Hàm tạo một spreadsheet MỚI và khởi tạo cấu trúc tab/cột
 * (khoiTaoCauTrucSheet_ ở `Setup.gs`) CHỈ trong spreadsheet đó. Không gọi setActiveSpreadsheet, không đổi Script Property
 * (CH_SPREADSHEET_ID…) nên Sheet vận hành, cấu hình dùng chung và nguồn getSS_() giữ nguyên — kể cả khi khởi tạo demo thất bại
 * (khi đó Sheet demo dở dang bị bỏ vào thùng rác). Để dùng ứng dụng trên Sheet demo, triển khai bản riêng với CH_SPREADSHEET_ID trỏ tới nó.
 */
function createDemoSheet() {
  yeuCauDangNhap_(); yeuCauQuanTri_('tạo Sheet demo'); // kiểm quyền TRƯỚC khi tạo bất cứ thứ gì
  var ss = SpreadsheetApp.create('Hosovay Demo - UI & Cha‑Con');
  try {
    khoiTaoCauTrucSheet_(ss);
  } catch (e) {
    try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (e2) { /* không chặn việc báo lỗi gốc */ }
    throw e;
  }
  return { ok: true, id: ss.getId(), url: ss.getUrl(), ghiChu: 'Sheet demo riêng; Sheet vận hành và cấu hình không bị thay đổi.' };
}
