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

/** Danh tính hiện tại: { email, ten, nguon, quyen:[], congTy:[], daXacMinhCong, vaiTro }. */
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
  var email = emailHienTaiThuong_(), ds = danhSachQuanTri_();
  var quanTri = ds.length === 0 || ds.indexOf(email) >= 0;
  return { email: email, ten: '', nguon: 'TAM_GOOGLE', quyen: quanTri ? [QUYEN_QUAN_TRI_, QUYEN_NHAP_LIEU_, QUYEN_SU_DUNG_] : [QUYEN_NHAP_LIEU_, QUYEN_SU_DUNG_], congTy: [], daXacMinhCong: false, vaiTro: '' };
}

function xoaCacheDanhTinh_() { _nguoiApi_ = null; }

/** Gọi đầu mọi API: chế độ cổng → phải đi qua api() có phiên hợp lệ (hoặc là ADMIN gọi trực tiếp); chế độ tạm → không chặn. */
function yeuCauDangNhap_() {
  if (portalCheDo_() === 'CONG_HAK') return layDanhTinh_();
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
