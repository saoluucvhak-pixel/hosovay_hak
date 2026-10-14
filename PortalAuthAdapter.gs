/**
 * PORTALAUTHADAPTER.GS — LỚP TÍCH HỢP với cổng quản lý trung tâm HAK (đăng nhập, danh tính, vai trò, phạm vi công ty).
 *
 * NGUYÊN TẮC: HOSOVAY_HAK KHÔNG có đăng nhập/tài khoản/RBAC riêng. Mọi quyết định "ai là ai, được làm gì" phải đến từ cổng trung tâm.
 *
 * HAI CHẾ ĐỘ (Script Property PORTAL_CHE_DO):
 *   • TAM_GOOGLE (mặc định, HIỆN TẠI): danh tính lấy từ phiên Google của Web App (Session.getActiveUser) và vai trò "quản trị"
 *     tạm theo danh sách ADMIN_EMAILS (Auth.gs). ĐÂY KHÔNG PHẢI TÍCH HỢP CỔNG — chỉ để ứng dụng chạy được cho tới khi có hợp đồng
 *     tích hợp; giao diện cảnh báo rõ. Không có kiểm tra phạm vi công ty.
 *   • CONG_HAK: danh tính/quyền do cổng cung cấp qua giao thức của HAK_HDMB. GIAO THỨC CHƯA ĐƯỢC CUNG CẤP nên chế độ này CHƯA hoạt động:
 *     xacMinhPhienCong_() luôn từ chối kèm lý do "chưa cấu hình giao thức". KHÔNG tự đặt token/giao thức. Khi có hợp đồng tích hợp
 *     (nơi nhận token/tham số, cách xác minh chữ ký/khoá, tên quyền, phạm vi công ty), chỉ cần hiện thực hàm xacMinhPhienCong_() này.
 *
 * Mọi API nhạy cảm gọi yeuCauDangNhap_() / yeuCauQuyen_() ở backend; trình duyệt không được tin để bảo vệ dữ liệu.
 */

var PORTAL_KHOA_CHE_DO_ = 'PORTAL_CHE_DO';
var QUYEN_QUAN_TRI_ = 'hosovay.quantri';
var QUYEN_SU_DUNG_ = 'hosovay.sudung';

function portalCheDo_() {
  var v = '';
  try { v = String(PropertiesService.getScriptProperties().getProperty(PORTAL_KHOA_CHE_DO_) || '').trim().toUpperCase(); } catch (e) { v = ''; }
  return v === 'CONG_HAK' ? 'CONG_HAK' : 'TAM_GOOGLE';
}

/**
 * HỢP ĐỒNG TÍCH HỢP (điền khi có tài liệu từ HAK_HDMB). Trả về { email, ten, quyen:[...], congTy:[...] } nếu phiên hợp lệ,
 * ném lỗi (mã CONG_*) nếu không. HIỆN CHƯA CÓ GIAO THỨC → luôn từ chối.
 */
function xacMinhPhienCong_(thamSo) {
  throw new Error('CONG_CHUA_CAU_HINH: Chưa có giao thức tích hợp cổng quản lý HAK (cần hợp đồng tích hợp theo HAK_HDMB). ' +
    'Chế độ CONG_HAK chưa dùng được; đặt lại PORTAL_CHE_DO=TAM_GOOGLE hoặc cung cấp giao thức.');
}

var _danhTinhCache_ = null;

/** Danh tính hiện tại: { email, ten, nguon, quyen:[], congTy:[], daXacMinhCong:boolean }. Lưu đệm trong 1 lượt thực thi. */
function layDanhTinh_(thamSo) {
  if (_danhTinhCache_ && !thamSo && _danhTinhCache_.nguon === 'CONG_HAK') return _danhTinhCache_;
  var kq;
  if (portalCheDo_() === 'CONG_HAK') {
    var p = xacMinhPhienCong_(thamSo || {});
    kq = { email: String(p.email || '').toLowerCase(), ten: p.ten || '', nguon: 'CONG_HAK', quyen: p.quyen || [], congTy: p.congTy || [], daXacMinhCong: true };
  } else {
    var email = emailHienTaiThuong_(), ds = danhSachQuanTri_();
    var quanTri = ds.length === 0 || ds.indexOf(email) >= 0;
    kq = { email: email, ten: '', nguon: 'TAM_GOOGLE', quyen: quanTri ? [QUYEN_QUAN_TRI_, QUYEN_SU_DUNG_] : [QUYEN_SU_DUNG_], congTy: [], daXacMinhCong: false };
  }
  if (!thamSo && kq.nguon === 'CONG_HAK') _danhTinhCache_ = kq; // chế độ tạm đọc lại mỗi lần (rẻ, và phản ánh đổi ADMIN_EMAILS ngay)
  return kq;
}

function xoaCacheDanhTinh_() { _danhTinhCache_ = null; }

/** Gọi đầu mọi API đọc/ghi dữ liệu: chế độ cổng → phải có phiên hợp lệ; chế độ tạm → không chặn. */
function yeuCauDangNhap_() {
  if (portalCheDo_() === 'CONG_HAK') return layDanhTinh_(); // ném lỗi nếu phiên không hợp lệ/chưa cấu hình
  return null;
}

/** Yêu cầu 1 quyền nghiệp vụ do cổng cấp. */
function yeuCauQuyen_(maQuyen, tenChucNang) {
  var dt = layDanhTinh_();
  if (dt.quyen.indexOf(maQuyen) < 0) {
    throw new Error('Bạn không có quyền "' + maQuyen + '" để ' + (tenChucNang || 'thực hiện chức năng này') + '.' +
      (dt.nguon === 'TAM_GOOGLE' ? ' (Chế độ tạm: danh sách quản trị ADMIN_EMAILS. Cần tích hợp cổng HAK.)' : ''));
  }
  return dt;
}

/** Dùng cho doGet: có cho mở giao diện không. */
function kiemTraTruyCapWebApp_() {
  try { var dt = yeuCauDangNhap_(); return { ok: true, danhTinh: dt }; }
  catch (e) { return { ok: false, thongBao: String(e.message || e) }; }
}
