/**
 * AUTH.GS
 * Phân quyền mức ứng dụng. Web App chạy "Execute as: deployer" nên mọi người truy cập được link đều thao tác bằng
 * quyền của người triển khai — vì vậy các chức năng NHẠY CẢM (mẫu DOCX, cấu hình, xuất toàn bộ dữ liệu tài chính,
 * rà soát dữ liệu) phải kiểm tra thêm danh sách quản trị viên tại máy chủ.
 *
 * Danh sách quản trị: Script Properties "ADMIN_EMAILS" (email cách nhau bởi dấu phẩy) — đặt bằng menu
 * "Hồ Sơ Vay NH > Cấu hình quản trị viên". Khi CHƯA cấu hình, hệ thống vẫn chạy như trước (không chặn) và giao diện
 * hiện cảnh báo đỏ — để không làm ngưng hoạt động đang chạy; hãy cấu hình ngay sau khi triển khai.
 *
 * GHI CHÚ: Session.getActiveUser().getEmail() chỉ trả về email khi người dùng cùng domain Google Workspace với người
 * triển khai (hoặc chính là người triển khai). Với truy cập ẩn danh/tài khoản gmail khác, email rỗng => bị coi là
 * KHÔNG phải quản trị viên khi đã cấu hình danh sách. Nên triển khai Web App với "Who has access" = domain của công ty.
 */

function danhSachQuanTri_() {
  var raw = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '';
  return raw.split(',').map(function (e) { return e.trim().toLowerCase(); }).filter(function (e) { return e; });
}

function emailHienTaiThuong_() {
  try { return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) { return ''; }
}

/** @return {{daCauHinh:boolean, quanTri:boolean, email:string, cheDo:string, nguon:string, daXacMinhCong:boolean}} */
function layTrangThaiQuyen() {
  var ds = danhSachQuanTri_();
  var dt = layDanhTinh_(); // chế độ CONG_HAK chưa cấu hình → ném lỗi rõ ràng cho giao diện
  return { daCauHinh: ds.length > 0, quanTri: dt.quyen.indexOf(QUYEN_QUAN_TRI_) >= 0, email: dt.email, cheDo: portalCheDo_(), nguon: dt.nguon, daXacMinhCong: dt.daXacMinhCong };
}

function laQuanTri_() { return layDanhTinh_().quyen.indexOf(QUYEN_QUAN_TRI_) >= 0; }

function yeuCauQuanTri_(tenChucNang) {
  if (!laQuanTri_()) {
    throw new Error('Bạn không có quyền quản trị để ' + (tenChucNang || 'thực hiện chức năng này') + '. Liên hệ quản trị viên hệ thống.');
  }
}

/** Menu Google Sheet: đặt danh sách quản trị viên (mặc định gợi ý email của chính người đang chạy). */
function cauHinhQuanTriMenu() {
  var ui = SpreadsheetApp.getUi();
  var hienCo = danhSachQuanTri_().join(', ');
  var goiY = hienCo || Session.getEffectiveUser().getEmail();
  var r = ui.prompt('Cấu hình quản trị viên', 'Nhập email quản trị viên, cách nhau bằng dấu phẩy.\nHiện tại: ' + (hienCo || '(chưa cấu hình — mọi người đều được coi là quản trị)') + '\n\nGợi ý: ' + goiY, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var nhap = r.getResponseText().trim();
  if (!nhap) { ui.alert('Chưa nhập email — không thay đổi.'); return; }
  PropertiesService.getScriptProperties().setProperty('ADMIN_EMAILS', nhap);
  ghiNhatKy_('', 'CAU_HINH_QUAN_TRI', nhap);
  ui.alert('Đã lưu danh sách quản trị viên: ' + nhap);
}
