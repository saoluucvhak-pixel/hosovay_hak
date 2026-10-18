/**
 * PORTALAUTHADAPTER.GS — danh tính & quyền của người dùng (lớp tích hợp đăng nhập).
 *
 * HAI CHẾ ĐỘ (Script Property PORTAL_CHE_DO):
 *   • TAM_GOOGLE (mặc định): danh tính theo phiên Google của Web App; quản trị theo ADMIN_EMAILS (Auth.gs). Không phải đăng nhập cổng.
 *   • CONG_HAK: đăng nhập qua "Cổng đăng nhập" SSO theo mô hình HDMB_HAK (Phien.gs): cổng ký HMAC → Web App cấp phiên → mọi lời gọi đi
 *     qua api(phien, tenHam, thamSo) có kiểm quyền theo vai trò ADMIN / NHAP_LIEU / XEM (sheet SYS_NguoiDung). Gọi trực tiếp không qua
 *     api() chỉ chấp nhận ADMIN (menu Sheet / công cụ quản trị).
 * Quyền luôn kiểm ở backend; trình duyệt không được tin.
 */

var PORTAL_KHOA_CHE_DO_ = 'PORTAL_CHE_DO';
var QUYEN_QUAN_TRI_ = 'hosovay.quantri';
var QUYEN_NHAP_LIEU_ = 'hosovay.nhaplieu';
var QUYEN_SU_DUNG_ = 'hosovay.sudung'; // quyền xem

var _nguoiApi_ = null; // người gọi của lượt api() hiện tại (chỉ dùng ở chế độ CONG_HAK)

function portalCheDo_() {
  var v = '';
  try { v = String(PropertiesService.getScriptProperties().getProperty(PORTAL_KHOA_CHE_DO_) || '').trim().toUpperCase(); } catch (e) { v = ''; }
  return v === 'CONG_HAK' ? 'CONG_HAK' : 'TAM_GOOGLE';
}

/**
 * MÔI TRƯỜNG (Script Property MOI_TRUONG): PRODUCTION (mặc định khi thiếu/sai giá trị) | TEST | DEV.
 * PRODUCTION = FAIL CLOSED: không xác minh được người dùng + vai trò thì TỪ CHỐI. TEST/DEV chỉ dùng khi đặt rõ ràng trên bản thử, KHÔNG bao giờ do thiếu cấu hình.
 */
function moiTruong_() {
  var v = '';
  try { v = String(PropertiesService.getScriptProperties().getProperty('MOI_TRUONG') || '').trim().toUpperCase(); } catch (e) { v = ''; }
  return (v === 'DEV' || v === 'TEST') ? v : 'PRODUCTION';
}

/** Danh tính hiện tại: { email, ten, nguon, quyen:[], congTy:[], daXacMinhCong, vaiTro }. Ném lỗi khi không xác minh được (fail closed). */
function layDanhTinh_(thamSo) {
  if (portalCheDo_() === 'CONG_HAK') {
    var nd = _nguoiApi_;
    if (!nd) { // gọi trực tiếp (menu Sheet / công cụ quản trị): chỉ chấp nhận phiên Google của ADMIN
      var em = emailHienTaiThuong_(), vt = em ? vaiTroCua_(em) : null;
      if (vt !== 'ADMIN') throw new Error('[AUTH] Chưa đăng nhập qua Cổng. Gọi trực tiếp (không qua api()) chỉ dành cho Quản trị.');
      nd = { email: em, vaiTro: vt };
    }
    return { email: nd.email, ten: '', nguon: 'CONG_HAK', quyen: quyenTheoVaiTro_(nd.vaiTro), congTy: [], daXacMinhCong: true, vaiTro: nd.vaiTro };
  }
  var email = emailHienTaiThuong_();
  if (moiTruong_() === 'PRODUCTION') {
    // Chế độ TAM_GOOGLE trên PRODUCTION: bắt buộc có email Google đã xác minh VÀ có vai trò (chủ script / ADMIN_EMAILS / sheet SYS_NguoiDung). Không có → từ chối.
    if (!email) { ghiBaoMat_('TU_CHOI_AN_DANH', ''); throw new Error('[AUTH] Không xác định được tài khoản Google của bạn (truy cập ẩn danh hoặc khác tổ chức). Hãy đăng nhập đúng tài khoản được cấp quyền hoặc dùng Cổng đăng nhập HAK.'); }
    var vaiTro = vaiTroCua_(email);
    if (!vaiTro) { ghiBaoMat_('TU_CHOI_CHUA_CAP_QUYEN', email); throw new Error('[QUYEN] Tài khoản ' + email + ' chưa được cấp quyền sử dụng hệ thống. Liên hệ quản trị viên.'); }
    // Gọi TRỰC TIẾP (google.script.run bỏ qua api()) thì không có bảng quyền theo hàm để áp dụng → chỉ Quản trị (giống chế độ CONG_HAK).
    if (!_nguoiApi_ && vaiTro !== 'ADMIN') { ghiBaoMat_('TU_CHOI_GOI_TRUC_TIEP', email); throw new Error('[QUYEN] Gọi trực tiếp (không qua api()) chỉ dành cho Quản trị.'); }
    return { email: email, ten: '', nguon: 'TAM_GOOGLE', quyen: quyenTheoVaiTro_(vaiTro), congTy: [], daXacMinhCong: false, vaiTro: vaiTro };
  }
  // DEV/TEST (chỉ khi MOI_TRUONG được đặt rõ ràng): giữ cách cũ để thử nghiệm
  var ds = danhSachQuanTri_();
  var quanTri = ds.length === 0 || ds.indexOf(email) >= 0;
  return { email: email, ten: '', nguon: 'TAM_GOOGLE', quyen: quanTri ? [QUYEN_QUAN_TRI_, QUYEN_NHAP_LIEU_, QUYEN_SU_DUNG_] : [QUYEN_NHAP_LIEU_, QUYEN_SU_DUNG_], congTy: [], daXacMinhCong: false, vaiTro: quanTri ? 'ADMIN' : 'NHAP_LIEU' };
}

/** Nhật ký bảo mật (không ghi token/mật khẩu). */
function ghiBaoMat_(maSuKien, email) {
  try { ghiLog_('SECURITY', 'AUTH', 'XAC_THUC', maSuKien, { msg: email ? 'email=' + email : '' }); } catch (e) { /* bỏ qua */ }
}

function xoaCacheDanhTinh_() { _nguoiApi_ = null; }

/** Gọi đầu mọi API: chế độ cổng → phải đi qua api() có phiên hợp lệ (hoặc là ADMIN gọi trực tiếp); chế độ tạm → không chặn. */
function yeuCauDangNhap_() {
  if (portalCheDo_() === 'CONG_HAK' || moiTruong_() === 'PRODUCTION') return layDanhTinh_(); // PRODUCTION: fail closed ở MỌI API
  return null;
}

/** Yêu cầu 1 quyền nghiệp vụ. */
function yeuCauQuyen_(maQuyen, tenChucNang) {
  var dt = layDanhTinh_();
  if (dt.quyen.indexOf(maQuyen) < 0) {
    throw new Error('Bạn không có quyền "' + maQuyen + '" để ' + (tenChucNang || 'thực hiện chức năng này') + '.' +
      (dt.nguon === 'TAM_GOOGLE' ? ' (Chế độ tạm: danh sách quản trị ADMIN_EMAILS.)' : ''));
  }
  return dt;
}

/** Dùng cho doGet: trang luôn hiển thị (chứa màn hình đăng nhập); dữ liệu chỉ đi qua api() có phiên. */
function kiemTraTruyCapWebApp_() { return { ok: true }; }
