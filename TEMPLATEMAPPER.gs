/**
 * TEMPLATEMAPPER.GS
 * Từ điển placeholder (nguồn dữ liệu, kiểu, bắt buộc/tuỳ chọn, giá trị khi trống) và ánh xạ dữ liệu hồ sơ
 * (layDuLieuDayDu) -> giá trị placeholder đã chuẩn hoá. Danh mục MỞ RỘNG ĐƯỢC: thêm 1 dòng vào TEMPLATE_TU_DIEN_ rồi
 * thêm giá trị tương ứng trong taoBienDayDu_ / taoBienDong_ — không phải sửa bộ máy điền mẫu.
 *
 * Quy ước kiểu: 'text' chuỗi · 'tien' số tiền NGUYÊN (hiển thị 25.000; ô số trong Excel) · 'tygia' (được có phần thập phân)
 *               · 'ngay' dd/MM/yyyy · 'so' số khác.
 * Tên placeholder chuẩn theo danh mục; BÍ DANH (alias) giữ tương thích mẫu cũ.
 */

var CT_DE_NGHI = 'DE_NGHI_GIAI_NGAN';
var CT_THANH_TOAN = 'CHUNG_TU_THANH_TOAN';
var CT_HDMB = 'HDMB_NGOAI_TE';

var NHAN_CHUNG_TU_ = {
  DE_NGHI_GIAI_NGAN: 'Văn bản đề nghị giải ngân',
  CHUNG_TU_THANH_TOAN: 'Chứng từ thanh toán (UNC / Bảng kê)',
  HDMB_NGOAI_TE: 'Hợp đồng mua bán ngoại tệ giao ngay'
};

// Loại tài liệu do NGƯỜI DÙNG tự thêm (Cài đặt → Loại tài liệu) — lưu trong Script Properties, hợp nhất với 3 loại hệ thống ở trên.
var KHOA_LOAI_TL_TUY_CHINH_ = 'LOAI_TAI_LIEU_TUY_CHINH';
var TIEN_TO_HE_THONG_ = { DE_NGHI_GIAI_NGAN: 'DeNghiGiaiNgan', CHUNG_TU_THANH_TOAN: 'ChungTuThanhToan', HDMB_NGOAI_TE: 'HDMB_NgoaiTe' };

/** [{ma, ten, loaiTien, batBuoc, nganHang, thuTu, trangThai}] — loại tài liệu tự thêm. Không có/không đọc được → []. Loại cũ chưa có thuộc tính: batBuoc=false (phải cấu hình rõ), trangThai=DUNG. */
function layLoaiTaiLieuTuyChinh_() {
  try {
    var v = PropertiesService.getScriptProperties().getProperty(KHOA_LOAI_TL_TUY_CHINH_);
    if (!v) return [];
    var a = JSON.parse(v);
    return Array.isArray(a) ? a.filter(function (x) { return x && x.ma && !NHAN_CHUNG_TU_[x.ma]; }).map(function (x, i) {
      return { ma: String(x.ma), ten: String(x.ten || x.ma), loaiTien: ['USD', 'VND'].indexOf(x.loaiTien) >= 0 ? x.loaiTien : 'TAT_CA',
        batBuoc: x.batBuoc === true, nganHang: String(x.nganHang || ''), thuTu: isFinite(Number(x.thuTu)) && x.thuTu !== '' && x.thuTu !== undefined ? Number(x.thuTu) : 100 + i, trangThai: x.trangThai === 'NGUNG' ? 'NGUNG' : 'DUNG' };
    }) : [];
  } catch (e) { return []; }
}

// Cấu hình 3 loại HỆ THỐNG (chỉ chỉnh được: bắt buộc, ngân hàng áp dụng, thứ tự, trạng thái dùng). Mặc định: bắt buộc, mọi ngân hàng, đang dùng.
var KHOA_CAU_HINH_LOAI_HE_THONG_ = 'LOAI_TL_HE_THONG_CFG';
var THU_TU_HE_THONG_MAC_DINH_ = { DE_NGHI_GIAI_NGAN: 10, CHUNG_TU_THANH_TOAN: 20, HDMB_NGOAI_TE: 30 };
function layCauHinhLoaiHeThong_() {
  var cfg = {};
  try { cfg = JSON.parse(PropertiesService.getScriptProperties().getProperty(KHOA_CAU_HINH_LOAI_HE_THONG_) || '{}') || {}; } catch (e) { cfg = {}; }
  var kq = {};
  [CT_DE_NGHI, CT_THANH_TOAN, CT_HDMB].forEach(function (ma) {
    var c = cfg[ma] || {};
    kq[ma] = { ma: ma, ten: NHAN_CHUNG_TU_[ma], heThong: true, loaiTien: ma === CT_HDMB ? 'USD' : 'TAT_CA', batBuoc: c.batBuoc !== false,
      nganHang: String(c.nganHang || ''), thuTu: isFinite(Number(c.thuTu)) && c.thuTu !== '' && c.thuTu !== undefined ? Number(c.thuTu) : THU_TU_HE_THONG_MAC_DINH_[ma], trangThai: c.trangThai === 'NGUNG' ? 'NGUNG' : 'DUNG' };
  });
  return kq;
}
/** Toàn bộ cấu hình loại tài liệu (hệ thống + tự thêm), sắp theo thứ tự phát hành rồi mã. */
function dsCauHinhLoaiTaiLieu_() {
  var h = layCauHinhLoaiHeThong_(), kq = [h[CT_DE_NGHI], h[CT_THANH_TOAN], h[CT_HDMB]];
  layLoaiTaiLieuTuyChinh_().forEach(function (x) { kq.push({ ma: x.ma, ten: x.ten, heThong: false, loaiTien: x.loaiTien, batBuoc: x.batBuoc, nganHang: x.nganHang, thuTu: x.thuTu, trangThai: x.trangThai }); });
  kq.sort(function (a, b) { return a.thuTu - b.thuTu || (a.ma < b.ma ? -1 : 1); });
  return kq;
}
function cauHinhLoaiTaiLieu_(ma) { return dsCauHinhLoaiTaiLieu_().filter(function (x) { return x.ma === ma; })[0] || null; }

/** Nhãn hiển thị của 1 loại tài liệu (hệ thống hoặc tự thêm); không biết → ''. */
function nhanChungTu_(ma) {
  if (NHAN_CHUNG_TU_[ma]) return NHAN_CHUNG_TU_[ma];
  var l = layLoaiTaiLieuTuyChinh_().filter(function (x) { return x.ma === ma; })[0];
  return l ? l.ten : '';
}
function tienToFile_(ma) { return TIEN_TO_HE_THONG_[ma] || String(ma).replace(/[^A-Za-z0-9_]/g, ''); }
function laLoaiTaiLieuHopLe_(ma) { return !!nhanChungTu_(ma); }
/** Chỉ 2 loại hệ thống có bảng người thụ hưởng cần hàng mẫu nhân bản; loại khác (HĐMB, tự thêm) thì không bắt buộc. */
function loaiCanHangMau_(ma) { return ma === CT_DE_NGHI || ma === CT_THANH_TOAN; }

// [khoa, kieu, batBuoc, macDinhKhiTrong, nguonDuLieu, [bí danh]]
var TEMPLATE_TU_DIEN_RAW_ = [
  ['HO_SO.USD_BAN', 'tien', false, '', 'HoSoGiaiNgan.USDBan', []],
  ['HO_SO.VND_THUC_NHAN', 'tien', false, '', 'HoSoGiaiNgan.VNDThucNhan', []],
  ['HO_SO.CHENH_LECH_QUY_DOI', 'tien', false, '', 'HoSoGiaiNgan.ChenhLechQuyDoi', []],
  ['BANG_KE.TONG_VND', 'tien', false, '', 'Tổng chi tiết VND', []],
  ['BANG_KE.TONG_USD', 'tien', false, '', 'Tổng chi tiết USD', []],
  ['CONG_TY.TEN', 'text', true, '', 'DM_CongTy.TenCty', []],
  ['CONG_TY.TEN_VIET_TAT', 'text', false, '', 'DM_CongTy.TenVietTat', []],
  ['CONG_TY.DIA_CHI', 'text', true, '', 'DM_CongTy.DiaChiTruSo', []],
  ['CONG_TY.MA_SO_THUE', 'text', true, '', 'DM_CongTy.MaSoThue', ['CONG_TY.MST']],
  ['CONG_TY.MA_CIF', 'text', false, '', 'DM_CongTy.MaCIF', []],
  ['CONG_TY.DIEN_THOAI', 'text', false, '', 'DM_CongTy.DienThoai', []],
  ['CONG_TY.FAX', 'text', false, '', 'DM_CongTy.Fax', []],
  ['CONG_TY.NGUOI_DAI_DIEN', 'text', true, '', 'DM_CongTy.NguoiDaiDien', []],
  ['CONG_TY.CHUC_VU', 'text', false, '', 'DM_CongTy.ChucVu', []],
  ['CONG_TY.TAI_KHOAN_VND', 'text', false, '', 'DM_CongTy.TaiKhoanVND', ['CONG_TY.TK_VND']],
  ['CONG_TY.TAI_KHOAN_USD', 'text', false, '', 'DM_CongTy.TaiKhoanUSD', ['CONG_TY.TK_USD']],
  ['CONG_TY.GIAY_UY_QUYEN_SO', 'text', false, '', 'DM_CongTy.GiayUyQuyenSo', []],
  ['CONG_TY.GIAY_UY_QUYEN_NGAY', 'ngay', false, '', 'DM_CongTy.GiayUyQuyenNgay', []],
  ['CONG_TY.NGUOI_LAP_BIEU', 'text', false, '', 'DM_CongTy.NguoiLapBieu', []],

  ['HOP_DONG.SO_HOP_DONG', 'text', true, '', 'DM_HopDongVay.SoHopDong', ['HOP_DONG.SO']],
  ['HOP_DONG.NGAY_KY', 'ngay', true, '', 'DM_HopDongVay.NgayHopDong', ['HOP_DONG.NGAY']],
  ['HOP_DONG.TEN_NGAN_HANG', 'text', true, '', 'DM_HopDongVay.TenNganHang', ['HOP_DONG.NGAN_HANG']],
  ['HOP_DONG.CHI_NHANH', 'text', true, '', 'DM_HopDongVay.ChiNhanh', []],
  ['HOP_DONG.DIA_CHI_CHI_NHANH', 'text', false, '', 'DM_HopDongVay.DiaChiChiNhanh', []],
  ['HOP_DONG.MST_CHI_NHANH', 'text', false, '', 'DM_HopDongVay.MST_ChiNhanh', []],
  ['HOP_DONG.HAN_MUC', 'tien', false, '', 'DM_HopDongVay.HanMucVay', []],
  ['HOP_DONG.LAI_SUAT', 'so', false, '', 'DM_HopDongVay.LaiSuatTrongHan_%', []],
  ['HOP_DONG.LAI_SUAT_QUA_HAN', 'text', false, '', 'DM_HopDongVay.MoTaLaiSuatQuaHan', []],
  ['HOP_DONG.LAI_SUAT_CHAM_TRA', 'so', false, '', 'DM_HopDongVay.LaiSuatLaiChamTra_%', []],
  ['HOP_DONG.KY_HAN_TRA_GOC', 'text', false, '', 'DM_HopDongVay.KyHanTraGoc', []],
  ['HOP_DONG.KY_HAN_TRA_LAI', 'text', false, '', 'DM_HopDongVay.KyHanTraLai', []],
  ['HOP_DONG.NGUOI_DAI_DIEN_NH', 'text', false, '', 'DM_HopDongVay.NguoiDaiDienNH', []],
  ['HOP_DONG.CHUC_VU_NH', 'text', false, '', 'DM_HopDongVay.ChucVuNH', []],
  ['HOP_DONG.GIAY_UY_QUYEN_NH', 'text', false, '', 'DM_HopDongVay.GiayUyQuyenNH', []],
  ['HOP_DONG.DIEN_THOAI_NH', 'text', false, '', 'DM_HopDongVay.DienThoaiNH', []],
  ['HOP_DONG.HD_KHUNG_MBNT_SO', 'text', false, '', 'DM_HopDongVay.SoHopDongKhungMBNT', []],
  ['HOP_DONG.HD_KHUNG_MBNT_NGAY', 'ngay', false, '', 'DM_HopDongVay.NgayHopDongKhungMBNT', []],

  ['HO_SO.MA_HO_SO', 'text', true, '', 'HoSoGiaiNgan.MaHoSo', ['HO_SO.MA']],
  ['HO_SO.SO_GIAY_NHAN_NO', 'text', false, '', 'HoSoGiaiNgan.SoGiayNhanNo', []],
  ['HO_SO.NGAY_GIAY_NHAN_NO', 'ngay', false, '', 'HoSoGiaiNgan.NgayGiayNhanNo', []],
  ['HO_SO.LOAI_TIEN', 'text', true, '', 'HoSoGiaiNgan.LoaiTien', []],
  ['HO_SO.DON_VI_TIEN', 'text', true, '', 'HoSoGiaiNgan.LoaiTien (USD | đồng)', []],
  ['HO_SO.TY_GIA', 'tygia', false, '', 'HoSoGiaiNgan.TyGiaBan', []],
  ['HO_SO.SO_TIEN', 'tien', true, '', 'HoSoGiaiNgan.SoTienNhanNoLanNay', []],
  ['HO_SO.SO_TIEN_BANG_CHU', 'text', true, '', 'tính từ SoTienNhanNoLanNay', []],
  ['HO_SO.SO_TIEN_QUY_DOI', 'tien', true, '', 'ROUND(USD × TyGiaBan, 0)', []],
  ['HO_SO.SO_TIEN_QUY_DOI_BANG_CHU', 'text', true, '', 'tính từ số tiền quy đổi', []],
  ['HO_SO.SO_TIEN_VN', 'text', true, '', 'như HO_SO.SO_TIEN nhưng LUÔN là chữ 1.234.567 (dấu chấm hàng nghìn, không phụ thuộc ngôn ngữ của Excel/Google)', []],
  ['HO_SO.SO_TIEN_QUY_DOI_VN', 'text', true, '', 'như HO_SO.SO_TIEN_QUY_DOI nhưng luôn là chữ 1.234.567', []],
  ['HO_SO.DU_NO', 'tien', false, '', 'HoSoGiaiNgan.DuNoHienTai', []],
  ['HO_SO.PHUONG_THUC', 'text', false, '', 'HoSoGiaiNgan.PhuongThucThanhToan', []],
  ['HO_SO.MUC_DICH', 'text', false, '', 'HoSoGiaiNgan.MucDichSuDungVon', []],
  ['HO_SO.THOI_HAN_VAY', 'so', false, '', 'HoSoGiaiNgan.ThoiHanChoVay_Ngay', ['HO_SO.THOI_HAN_NGAY']],
  ['HO_SO.NGAY_GIAI_NGAN', 'ngay', true, '', 'HoSoGiaiNgan.NgayGiaiNgan', []],
  ['HO_SO.NGAY_DEN_HAN', 'ngay', false, '', 'HoSoGiaiNgan.NgayDenHan', []],
  ['HO_SO.TAI_LIEU_CHUNG_MINH', 'text', false, '', 'HoSoGiaiNgan.TaiLieuChungMinhMucDich', []],
  ['HO_SO.NGUOI_LAP_BIEU', 'text', false, '', 'HoSoGiaiNgan.NguoiLapBieu', []],
  ['HO_SO.SO_THAM_CHIEU', 'text', false, '', 'HoSoGiaiNgan.SoThamChieu', []],
  ['HO_SO.SO_DONG', 'so', true, '', 'số dòng ChiTietThuHuong', []],

  ['NGAY_IN', 'ngay', true, '', 'ngày hệ thống lúc in', ['NGAY.HOM_NAY']],
  ['NGUOI_LAP_BIEU', 'text', false, '', 'HoSoGiaiNgan.NguoiLapBieu hoặc DM_CongTy.NguoiLapBieu', []],
  ['NGAY.GIAI_NGAN_DAY_DU', 'text', false, 'ngày .... tháng .... năm ........', 'HoSoGiaiNgan.NgayGiaiNgan', []],
  ['NGAY.GIAI_NGAN_DD', 'text', false, '....', 'HoSoGiaiNgan.NgayGiaiNgan', []],
  ['NGAY.GIAI_NGAN_MM', 'text', false, '....', 'HoSoGiaiNgan.NgayGiaiNgan', []],
  ['NGAY.GIAI_NGAN_YYYY', 'text', false, '........', 'HoSoGiaiNgan.NgayGiaiNgan', []],

  ['BANG_KE.TONG_TIEN', 'tien', true, '', 'Σ ChiTietThuHuong.SoTien', []],
  ['BANG_KE.TONG_TIEN_QUY_DOI', 'tien', true, '', 'Σ ChiTietThuHuong.SoTienQuyDoi', []],
  ['BANG_KE.TONG_TIEN_VN', 'text', true, '', 'như BANG_KE.TONG_TIEN nhưng luôn là chữ 1.234.567', []],
  ['BANG_KE.TONG_TIEN_QUY_DOI_VN', 'text', true, '', 'như BANG_KE.TONG_TIEN_QUY_DOI nhưng luôn là chữ 1.234.567', []],
  ['BANG_KE.TONG_TIEN_BANG_CHU', 'text', true, '', 'tính từ tổng tiền', []],
  ['BANG_KE.TONG_TIEN_QUY_DOI_BANG_CHU', 'text', true, '', 'tính từ tổng quy đổi', []],
  ['BANG_KE.SO_DONG', 'so', true, '', 'số dòng ChiTietThuHuong', []]
];

var TEMPLATE_TU_DIEN_DONG_RAW_ = [
  ['CT.LOAI_TIEN', 'text', false, '', 'ChiTietThuHuong.LoaiTien', []],
  ['CT.STT', 'so', true, '', 'thứ tự dòng', []],
  ['CT.STT_2', 'text', true, '', 'thứ tự dòng (01, 02…)', []],
  ['CT.TEN_NGUOI_HUONG', 'text', true, '', 'ChiTietThuHuong.TenNguoiHuong', ['CT.TEN']],
  ['CT.SO_TAI_KHOAN', 'text', true, '', 'ChiTietThuHuong.SoTaiKhoan', ['CT.SO_TK']],
  ['CT.NGAN_HANG', 'text', true, '', 'ChiTietThuHuong.TaiNganHang', []],
  ['CT.LOAI_CHUNG_TU', 'text', false, '', 'ChiTietThuHuong.LoaiChungTu', []],
  ['CT.SO_TAI_LIEU', 'text', false, '', 'ChiTietThuHuong.TaiLieuSo', []],
  ['CT.NGAY_TAI_LIEU', 'ngay', false, '', 'ChiTietThuHuong.NgayTaiLieu', []],
  ['CT.TAI_LIEU_NGAY', 'text', false, '', 'TaiLieuSo + " ngày " + NgayTaiLieu', []],
  ['CT.NOI_DUNG', 'text', false, '', 'ChiTietThuHuong.NoiDungThanhToan', []],
  ['CT.SO_TIEN', 'tien', true, '', 'ChiTietThuHuong.SoTien', []],
  ['CT.SO_TIEN_QUY_DOI', 'tien', true, '', 'ChiTietThuHuong.SoTienQuyDoi', []],
  ['CT.SO_TIEN_VN', 'text', true, '', 'như CT.SO_TIEN nhưng luôn là chữ 1.234.567', []],
  ['CT.SO_TIEN_QUY_DOI_VN', 'text', true, '', 'như CT.SO_TIEN_QUY_DOI nhưng luôn là chữ 1.234.567', []],
  ['CT.SO_TIEN_BANG_CHU', 'text', false, '', 'tính từ SoTien', []],
  ['CT.SO_TIEN_QUY_DOI_BANG_CHU', 'text', false, '', 'tính từ SoTienQuyDoi', []],
  ['CT.CHUYEN_NHANH', 'text', false, '', 'ChiTietThuHuong.ChuyenTienNhanh_24_7', []],
  ['CT.DON_VI_LAP', 'text', false, '', 'ChiTietThuHuong.DonViLapTaiLieu', []],
  ['CT.GHI_CHU', 'text', false, '', 'ChiTietThuHuong.GhiChu', []]
];

/** Từ điển dạng đối tượng: khoa -> {khoa, kieu, batBuoc, macDinh, nguon, alias, laDong, chinh (khoá chuẩn)}; bao gồm cả bí danh. */
function tuDienPlaceholder_() {
  if (tuDienPlaceholder_.cache) return tuDienPlaceholder_.cache;
  var kq = {};
  function nap(dsRaw, laDong) {
    dsRaw.forEach(function (r) {
      var mucChinh = { khoa: r[0], kieu: r[1], batBuoc: r[2], macDinh: r[3], nguon: r[4], alias: r[5], laDong: laDong, chinh: r[0] };
      kq[r[0]] = mucChinh;
      r[5].forEach(function (a) { kq[a] = { khoa: a, kieu: r[1], batBuoc: r[2], macDinh: r[3], nguon: r[4], alias: [], laDong: laDong, chinh: r[0] }; });
    });
  }
  nap(TEMPLATE_TU_DIEN_RAW_, false);
  nap(TEMPLATE_TU_DIEN_DONG_RAW_, true);
  tuDienPlaceholder_.cache = kq;
  return kq;
}

// Nhãn tiếng Việt dễ hiểu của từng placeholder (hiện trong ô chọn trường ở Trình tạo mẫu). Không có nhãn → dùng khoá.
var NHAN_PLACEHOLDER_ = {
 "CONG_TY.TEN": "Tên công ty",
 "CONG_TY.TEN_VIET_TAT": "Tên viết tắt công ty",
 "CONG_TY.DIA_CHI": "Địa chỉ công ty",
 "CONG_TY.MA_SO_THUE": "Mã số thuế",
 "CONG_TY.MA_CIF": "Mã CIF",
 "CONG_TY.DIEN_THOAI": "Điện thoại công ty",
 "CONG_TY.FAX": "Fax công ty",
 "CONG_TY.NGUOI_DAI_DIEN": "Người đại diện công ty",
 "CONG_TY.CHUC_VU": "Chức vụ người đại diện",
 "CONG_TY.TAI_KHOAN_VND": "Tài khoản VND",
 "CONG_TY.TAI_KHOAN_USD": "Tài khoản USD",
 "CONG_TY.GIAY_UY_QUYEN_SO": "Số giấy ủy quyền (công ty)",
 "CONG_TY.GIAY_UY_QUYEN_NGAY": "Ngày giấy ủy quyền (công ty)",
 "CONG_TY.NGUOI_LAP_BIEU": "Người lập biểu (công ty)",
 "HOP_DONG.SO_HOP_DONG": "Số hợp đồng tín dụng hạn mức",
 "HOP_DONG.NGAY_KY": "Ngày ký hợp đồng tín dụng",
 "HOP_DONG.TEN_NGAN_HANG": "Tên ngân hàng",
 "HOP_DONG.CHI_NHANH": "Chi nhánh ngân hàng",
 "HOP_DONG.DIA_CHI_CHI_NHANH": "Địa chỉ chi nhánh",
 "HOP_DONG.MST_CHI_NHANH": "MST chi nhánh",
 "HOP_DONG.HAN_MUC": "Hạn mức vay",
 "HOP_DONG.LAI_SUAT": "Lãi suất trong hạn (%)",
 "HOP_DONG.LAI_SUAT_QUA_HAN": "Mô tả lãi suất quá hạn",
 "HOP_DONG.LAI_SUAT_CHAM_TRA": "Lãi suất lãi chậm trả (%)",
 "HOP_DONG.KY_HAN_TRA_GOC": "Kỳ hạn trả gốc",
 "HOP_DONG.KY_HAN_TRA_LAI": "Kỳ hạn trả lãi",
 "HOP_DONG.NGUOI_DAI_DIEN_NH": "Người đại diện ngân hàng",
 "HOP_DONG.CHUC_VU_NH": "Chức vụ người đại diện NH",
 "HOP_DONG.GIAY_UY_QUYEN_NH": "Giấy ủy quyền ngân hàng",
 "HOP_DONG.DIEN_THOAI_NH": "Điện thoại ngân hàng",
 "HOP_DONG.HD_KHUNG_MBNT_SO": "Số HĐ khung mua bán ngoại tệ",
 "HOP_DONG.HD_KHUNG_MBNT_NGAY": "Ngày HĐ khung mua bán ngoại tệ",
 "HO_SO.MA_HO_SO": "Mã hồ sơ",
 "HO_SO.SO_GIAY_NHAN_NO": "Số giấy nhận nợ / số HĐTD cụ thể",
 "HO_SO.NGAY_GIAY_NHAN_NO": "Ngày giấy nhận nợ",
 "HO_SO.LOAI_TIEN": "Loại tiền (VND/USD)",
 "HO_SO.DON_VI_TIEN": "Đơn vị tiền (USD / đồng)",
 "HO_SO.TY_GIA": "Tỷ giá bán",
 "HO_SO.SO_TIEN": "Số tiền nhận nợ lần này",
 "HO_SO.SO_TIEN_BANG_CHU": "Số tiền nhận nợ bằng chữ",
 "HO_SO.SO_TIEN_QUY_DOI": "Số tiền quy đổi VND",
 "HO_SO.SO_TIEN_QUY_DOI_BANG_CHU": "Số tiền quy đổi VND bằng chữ",
 "HO_SO.SO_TIEN_VN": "Số tiền (chữ 1.234.567, dấu chấm cố định)",
 "HO_SO.SO_TIEN_QUY_DOI_VN": "Số tiền quy đổi VND (chữ 1.234.567, dấu chấm cố định)",
 "HO_SO.DU_NO": "Dư nợ hiện tại",
 "HO_SO.PHUONG_THUC": "Phương thức thanh toán",
 "HO_SO.MUC_DICH": "Mục đích sử dụng vốn",
 "HO_SO.THOI_HAN_VAY": "Thời hạn vay (ngày)",
 "HO_SO.NGAY_GIAI_NGAN": "Ngày giải ngân",
 "HO_SO.NGAY_DEN_HAN": "Ngày đến hạn",
 "HO_SO.TAI_LIEU_CHUNG_MINH": "Tài liệu kèm theo (\"Tài liệu liên quan\")",
 "HO_SO.NGUOI_LAP_BIEU": "Người lập biểu (hồ sơ)",
 "HO_SO.SO_THAM_CHIEU": "Số tham chiếu",
 "HO_SO.SO_DONG": "Số người thụ hưởng",
 "NGAY_IN": "Ngày in",
 "NGUOI_LAP_BIEU": "Người lập biểu",
 "NGAY.GIAI_NGAN_DAY_DU": "\"ngày … tháng … năm …\" (ngày giải ngân, đầy đủ)",
 "NGAY.GIAI_NGAN_DD": "Ngày giải ngân — số ngày",
 "NGAY.GIAI_NGAN_MM": "Ngày giải ngân — số tháng",
 "NGAY.GIAI_NGAN_YYYY": "Ngày giải ngân — số năm",
 "BANG_KE.TONG_TIEN": "Tổng cộng số tiền",
 "BANG_KE.TONG_TIEN_QUY_DOI": "Tổng cộng quy đổi VND",
 "BANG_KE.TONG_TIEN_VN": "Tổng cộng số tiền (chữ 1.234.567, dấu chấm cố định)",
 "BANG_KE.TONG_TIEN_QUY_DOI_VN": "Tổng cộng quy đổi VND (chữ 1.234.567, dấu chấm cố định)",
 "BANG_KE.TONG_TIEN_BANG_CHU": "Tổng cộng bằng chữ",
 "BANG_KE.TONG_TIEN_QUY_DOI_BANG_CHU": "Tổng quy đổi VND bằng chữ",
 "BANG_KE.SO_DONG": "Số dòng bảng kê",
 "CT.STT": "STT (1, 2, 3…)",
 "CT.STT_2": "STT (01, 02, 03…)",
 "CT.TEN_NGUOI_HUONG": "Tên người thụ hưởng",
 "CT.SO_TAI_KHOAN": "Số tài khoản người thụ hưởng",
 "CT.NGAN_HANG": "Ngân hàng người thụ hưởng",
 "CT.LOAI_CHUNG_TU": "Loại chứng từ",
 "CT.SO_TAI_LIEU": "Số tài liệu (hóa đơn/hợp đồng)",
 "CT.NGAY_TAI_LIEU": "Ngày tài liệu",
 "CT.TAI_LIEU_NGAY": "\"Tài liệu số … ngày …\"",
 "CT.NOI_DUNG": "Nội dung thanh toán",
 "CT.SO_TIEN": "Số tiền (từng người)",
 "CT.SO_TIEN_QUY_DOI": "Số tiền quy đổi VND (từng người)",
 "CT.SO_TIEN_VN": "Số tiền (từng người, chữ 1.234.567 dấu chấm cố định)",
 "CT.SO_TIEN_QUY_DOI_VN": "Số tiền quy đổi VND (từng người, chữ 1.234.567 dấu chấm cố định)",
 "CT.SO_TIEN_BANG_CHU": "Số tiền bằng chữ (từng người)",
 "CT.SO_TIEN_QUY_DOI_BANG_CHU": "Quy đổi VND bằng chữ (từng người)",
 "CT.CHUYEN_NHANH": "Chuyển nhanh 24/7",
 "CT.DON_VI_LAP": "Đơn vị lập tài liệu",
 "CT.GHI_CHU": "Ghi chú"
};

/** Danh mục cho giao diện: chỉ khoá chuẩn, kèm bí danh. */
function layDanhMucPlaceholder() {
  yeuCauDangNhap_();
  function ra(dsRaw) { return dsRaw.map(function (r) { return { khoa: r[0], nhan: NHAN_PLACEHOLDER_[r[0]] || r[0], kieu: r[1], batBuoc: r[2], macDinh: r[3], nguon: r[4], alias: r[5] }; }); }
  return { chung: ra(TEMPLATE_TU_DIEN_RAW_), dong: ra(TEMPLATE_TU_DIEN_DONG_RAW_) };
}

// ---------- Tiện ích dữ liệu ----------

function tachNgay_(v) {
  if (!v) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return { dd: Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'dd'), mm: Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'MM'), yyyy: Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy') };
  }
  var s = String(v), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { dd: m[3], mm: m[2], yyyy: m[1] };
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return { dd: ('0' + m[1]).slice(-2), mm: ('0' + m[2]).slice(-2), yyyy: m[3] };
  return null;
}

/** Ngày dạng dd/MM/yyyy; chuỗi nhiều ngày ("15/09/2025, 16/09/2025") giữ từng ngày; không có thì để trống (KHÔNG chèn dấu chấm giả). */
function ngayChoMau_(v) {
  if (!v) return '';
  if (typeof v === 'string' && v.indexOf(',') >= 0) {
    return v.split(',').map(function (x) { return ngayChoMau_(x.trim()); }).join(', ');
  }
  return chuanNgay_(v);
}

function soThapPhanVN_(v) {
  return (v === '' || v === null || v === undefined) ? '' : String(v).replace('.', ',');
}

function chuoiGon_(v) { return (v === null || v === undefined) ? '' : String(v); }

// ---------- Ánh xạ ----------

/** Biến theo từng dòng thụ hưởng ({{CT.*}}). */
function taoBienDong_(ct, stt, loaiTien) {
  loaiTien = ct.LoaiTien || loaiTien;
  var soTien = docTienTheoLoai_(ct.SoTien, loaiTien, 'Số tiền dòng ' + stt);
  var soQuyDoi = docTienNguyen_(ct.SoTienQuyDoi, 'Số tiền quy đổi dòng ' + stt);
  var m = taoBienTienDong_(ct);
  m['CT.SO_TIEN_BANG_CHU'] = loaiTien === 'USD' ? soTienUSDBangChu_(soTien) : soThanhChuVN(soTien);
  m['CT.SO_TIEN_QUY_DOI_BANG_CHU'] = soThanhChuVN(soQuyDoi);
  m['CT.LOAI_TIEN'] = loaiTien;
  m['CT.STT'] = String(stt);
  m['CT.STT_2'] = (stt < 10 ? '0' : '') + stt;
  m['CT.TEN_NGUOI_HUONG'] = chuoiGon_(ct.TenNguoiHuong);
  m['CT.SO_TAI_KHOAN'] = chuoiGon_(ct.SoTaiKhoan);
  m['CT.NGAN_HANG'] = chuoiGon_(ct.TaiNganHang);
  m['CT.LOAI_CHUNG_TU'] = chuoiGon_(ct.LoaiChungTu);
  m['CT.SO_TAI_LIEU'] = chuoiGon_(ct.TaiLieuSo);
  m['CT.NGAY_TAI_LIEU'] = ngayChoMau_(ct.NgayTaiLieu);
  m['CT.TAI_LIEU_NGAY'] = m['CT.SO_TAI_LIEU'] + (m['CT.SO_TAI_LIEU'] && m['CT.NGAY_TAI_LIEU'] ? ' ngày ' + m['CT.NGAY_TAI_LIEU'] : m['CT.NGAY_TAI_LIEU']);
  m['CT.NOI_DUNG'] = chuoiGon_(ct.NoiDungThanhToan);
  m['CT.CHUYEN_NHANH'] = ct.ChuyenTienNhanh_24_7 || 'N';
  m['CT.DON_VI_LAP'] = chuoiGon_(ct.DonViLapTaiLieu);
  m['CT.GHI_CHU'] = chuoiGon_(ct.GhiChu);
  return apBiDanhVaMacDinh_(m, true);
}

/** Toàn bộ placeholder chung — tái sử dụng taoBienTienHoSo_ cho phần tiền. */
function taoBienDayDu_(d, tuyChon) {
  tuyChon = tuyChon || {};
  var hs = d.hoSo, hd = d.hopDong, ct = d.congTy;
  var laUSD = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD';
  var m = taoBienTienHoSo_(d);
  var tongQuyDoi = Number(hs.PhienBanTien) === 2 ? Number(hs.VNDThucNhan) : (laUSD ? quyDoiUSDSangVND_(hs.SoTienNhanNoLanNay, hs.TyGiaBan) : docTienNguyen_(hs.SoTienNhanNoLanNay));
  var tongQuyDoiTheoDong = 0;
  (d.chiTiet || []).forEach(function (c) { tongQuyDoiTheoDong += docTienNguyen_(c.SoTienQuyDoi, 'Số tiền quy đổi'); });

  var homNay = tuyChon.homNay || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  var gn = tachNgay_(hs.NgayGiaiNgan);
  var soDong = String((d.chiTiet || []).length);

  var khac = {
    'CONG_TY.TEN': chuoiGon_(ct.TenCty), 'CONG_TY.TEN_VIET_TAT': chuoiGon_(ct.TenVietTat), 'CONG_TY.DIA_CHI': chuoiGon_(ct.DiaChiTruSo),
    'CONG_TY.MA_SO_THUE': chuoiGon_(ct.MaSoThue), 'CONG_TY.MA_CIF': chuoiGon_(ct.MaCIF), 'CONG_TY.DIEN_THOAI': chuoiGon_(ct.DienThoai),
    'CONG_TY.FAX': chuoiGon_(ct.Fax), 'CONG_TY.NGUOI_DAI_DIEN': chuoiGon_(ct.NguoiDaiDien), 'CONG_TY.CHUC_VU': chuoiGon_(ct.ChucVu),
    'CONG_TY.TAI_KHOAN_VND': chuoiGon_(ct.TaiKhoanVND), 'CONG_TY.TAI_KHOAN_USD': chuoiGon_(ct.TaiKhoanUSD),
    'CONG_TY.GIAY_UY_QUYEN_SO': chuoiGon_(ct.GiayUyQuyenSo), 'CONG_TY.GIAY_UY_QUYEN_NGAY': ngayChoMau_(ct.GiayUyQuyenNgay),
    'CONG_TY.NGUOI_LAP_BIEU': chuoiGon_(ct.NguoiLapBieu || hs.NguoiLapBieu),

    'HOP_DONG.SO_HOP_DONG': chuoiGon_(hd.SoHopDong), 'HOP_DONG.NGAY_KY': ngayChoMau_(hd.NgayHopDong),
    'HOP_DONG.TEN_NGAN_HANG': chuoiGon_(hd.TenNganHang), 'HOP_DONG.CHI_NHANH': chuoiGon_(hd.ChiNhanh),
    'HOP_DONG.DIA_CHI_CHI_NHANH': chuoiGon_(hd.DiaChiChiNhanh), 'HOP_DONG.MST_CHI_NHANH': chuoiGon_(hd.MST_ChiNhanh),
    'HOP_DONG.HAN_MUC': hd.HanMucVay === '' || hd.HanMucVay === undefined ? '' : formatSo_(hd.HanMucVay),
    'HOP_DONG.LAI_SUAT': soThapPhanVN_(hd['LaiSuatTrongHan_%']), 'HOP_DONG.LAI_SUAT_QUA_HAN': chuoiGon_(hd.MoTaLaiSuatQuaHan),
    'HOP_DONG.LAI_SUAT_CHAM_TRA': soThapPhanVN_(hd['LaiSuatLaiChamTra_%']),
    'HOP_DONG.KY_HAN_TRA_GOC': chuoiGon_(hd.KyHanTraGoc), 'HOP_DONG.KY_HAN_TRA_LAI': chuoiGon_(hd.KyHanTraLai),
    'HOP_DONG.NGUOI_DAI_DIEN_NH': chuoiGon_(hd.NguoiDaiDienNH), 'HOP_DONG.CHUC_VU_NH': chuoiGon_(hd.ChucVuNH),
    'HOP_DONG.GIAY_UY_QUYEN_NH': chuoiGon_(hd.GiayUyQuyenNH), 'HOP_DONG.DIEN_THOAI_NH': chuoiGon_(hd.DienThoaiNH),
    'HOP_DONG.HD_KHUNG_MBNT_SO': chuoiGon_(hd.SoHopDongKhungMBNT), 'HOP_DONG.HD_KHUNG_MBNT_NGAY': ngayChoMau_(hd.NgayHopDongKhungMBNT),

    'HO_SO.MA_HO_SO': chuoiGon_(hs.MaHoSo), 'HO_SO.SO_GIAY_NHAN_NO': chuoiGon_(hs.SoGiayNhanNo),
    'HO_SO.NGAY_GIAY_NHAN_NO': ngayChoMau_(hs.NgayGiayNhanNo), 'HO_SO.LOAI_TIEN': laUSD ? 'USD' : 'VND',
    'HO_SO.DON_VI_TIEN': laUSD ? 'USD' : 'đồng',
    'HO_SO.SO_TIEN_QUY_DOI': formatSo_(tongQuyDoi), 'HO_SO.SO_TIEN_QUY_DOI_VN': formatSo_(tongQuyDoi), 'HO_SO.SO_TIEN_QUY_DOI_BANG_CHU': soThanhChuVN(tongQuyDoi),
    'HO_SO.PHUONG_THUC': chuoiGon_(hs.PhuongThucThanhToan), 'HO_SO.MUC_DICH': chuoiGon_(hs.MucDichSuDungVon),
    'HO_SO.THOI_HAN_VAY': chuoiGon_(hs.ThoiHanChoVay_Ngay),
    'HO_SO.NGAY_GIAI_NGAN': ngayChoMau_(hs.NgayGiaiNgan), 'HO_SO.NGAY_DEN_HAN': ngayChoMau_(hs.NgayDenHan),
    'HO_SO.TAI_LIEU_CHUNG_MINH': chuoiGon_(hs.TaiLieuChungMinhMucDich), 'HO_SO.NGUOI_LAP_BIEU': chuoiGon_(hs.NguoiLapBieu),
    'HO_SO.SO_THAM_CHIEU': chuoiGon_(hs.SoThamChieu), 'HO_SO.SO_DONG': soDong,

    'NGAY_IN': homNay, 'NGUOI_LAP_BIEU': chuoiGon_(hs.NguoiLapBieu || ct.NguoiLapBieu),
    'NGAY.GIAI_NGAN_DAY_DU': gn ? ('ngày ' + gn.dd + ' tháng ' + gn.mm + ' năm ' + gn.yyyy) : '',
    'NGAY.GIAI_NGAN_DD': gn ? gn.dd : '', 'NGAY.GIAI_NGAN_MM': gn ? gn.mm : '', 'NGAY.GIAI_NGAN_YYYY': gn ? gn.yyyy : '',

    'BANG_KE.TONG_TIEN_QUY_DOI': formatSo_(tongQuyDoiTheoDong), 'BANG_KE.TONG_TIEN_QUY_DOI_VN': formatSo_(tongQuyDoiTheoDong),
    'BANG_KE.TONG_TIEN_BANG_CHU': m['HO_SO.SO_TIEN_BANG_CHU'],
    'BANG_KE.TONG_TIEN_QUY_DOI_BANG_CHU': soThanhChuVN(tongQuyDoiTheoDong),
    'BANG_KE.SO_DONG': soDong
  };
  Object.keys(khac).forEach(function (k) { m[k] = khac[k]; });
  if (Number(hs.PhienBanTien) === 2) {
    var v2 = kiemTraTienChaCon_(payloadTienChaConDaLuu_(hs, d.chiTiet), false);
    m['HO_SO.USD_BAN'] = formatSo_(v2.usdBan);
    m['HO_SO.VND_THUC_NHAN'] = formatSo_(v2.vndThucNhan);
    m['HO_SO.CHENH_LECH_QUY_DOI'] = formatSo_(v2.chenhLechQuyDoi);
    m['BANG_KE.TONG_VND'] = formatSo_(v2.tongVND); m['BANG_KE.TONG_USD'] = formatSo_(v2.tongUSD);
    m['BANG_KE.TONG_TIEN'] = v2.tongUSD && v2.tongVND ? '' : formatSo_(v2.tongUSD || v2.tongVND);
    m['BANG_KE.TONG_TIEN_VN'] = m['BANG_KE.TONG_TIEN'];
    m['BANG_KE.TONG_TIEN_BANG_CHU'] = v2.tongUSD && v2.tongVND ? '' : (v2.tongUSD ? soTienUSDBangChu_(v2.tongUSD) : soThanhChuVN(v2.tongVND));
  }
  return apBiDanhVaMacDinh_(m, false);
}

/** Đưa giá trị sang MỌI bí danh và áp giá trị mặc định khi trống (chỉ với trường không bắt buộc). */
function apBiDanhVaMacDinh_(m, laDong) {
  var td = tuDienPlaceholder_();
  Object.keys(td).forEach(function (k) {
    var e = td[k];
    if (e.laDong !== laDong) return;
    var chinh = m[e.chinh];
    if (k !== e.chinh) { if (chinh !== undefined) m[k] = chinh; return; }
    if ((chinh === undefined || chinh === '') && !e.batBuoc && e.macDinh) m[k] = e.macDinh;
  });
  return m;
}

function taoDanhSachBienDong_(d) {
  var loaiTien = String(d.hoSo.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
  return (d.chiTiet || []).map(function (ct, i) { return taoBienDong_(ct, i + 1, loaiTien); });
}

/** Biến số tiền của hồ sơ (dùng chung mọi mẫu); chỉ số nguyên có dấu chấm hàng nghìn. */
function taoBienTienHoSo_(d) {
  var hoSo = d.hoSo, laUSD = String(hoSo.LoaiTien || 'VND').toUpperCase() === 'USD';
  var tong = 0;
  if (Number(hoSo.PhienBanTien) !== 2) (d.chiTiet || []).forEach(function (ct) { tong = tongTienTheoLoai_([tong, ct.SoTien], laUSD ? 'USD' : 'VND'); });
  if (Number(hoSo.PhienBanTien) === 2) tong = (d.chiTiet || []).every(function (c) { return c.LoaiTien === 'VND'; }) ? Number(hoSo.VNDThucNhan) : ((d.chiTiet || []).every(function (c) { return c.LoaiTien === 'USD'; }) ? tongTienTheoLoai_((d.chiTiet || []).map(function (c) { return c.SoTien; }), 'USD') : 0);
  var soTien = docTienTheoLoai_(hoSo.SoTienNhanNoLanNay, laUSD ? 'USD' : 'VND', 'Số tiền nhận nợ lần này');
  return {
    'HO_SO.SO_TIEN': formatSo_(soTien),
    'HO_SO.SO_TIEN_BANG_CHU': laUSD ? soTienUSDBangChu_(soTien) : soThanhChuVN(soTien),
    'HO_SO.TY_GIA': laUSD ? formatTyGia_(hoSo.TyGiaBan) : '',
    'HO_SO.DU_NO': formatSo_(hoSo.DuNoHienTai),
    'BANG_KE.TONG_TIEN': formatSo_(tong), 'BANG_KE.TONG_TIEN_VN': formatSo_(tong), 'HO_SO.SO_TIEN_VN': formatSo_(soTien)
  };
}

/** Biến số tiền của 1 dòng thụ hưởng ({{CT.*}}). */
function taoBienTienDong_(ct) {
  return { 'CT.SO_TIEN': formatSo_(ct.SoTien), 'CT.SO_TIEN_QUY_DOI': formatSo_(ct.SoTienQuyDoi), 'CT.SO_TIEN_VN': formatSo_(ct.SoTien), 'CT.SO_TIEN_QUY_DOI_VN': formatSo_(ct.SoTienQuyDoi) };
}

/** Dữ liệu mẫu THỬ (độc lập dữ liệu sản xuất) dùng cho "Xem trước với dữ liệu thử". Tiền luôn là số nguyên. */
function layDuLieuThuNghiem_(loaiTien, soDong) {
  var usd = String(loaiTien).toUpperCase() === 'USD', n = Math.max(1, Math.min(60, Number(soDong) || 2));
  var tyGia = 26145.5, ds = [], co = usd ? 5000 : 12000000;
  for (var i = 0; i < n; i++) ds.push(co + i * (usd ? 100 : 1000000));
  var tong = ds.reduce(function (a, b) { return a + b; }, 0);
  var chiTiet = ds.map(function (st, i) {
    return { STT: i + 1, TenNguoiHuong: 'CÔNG TY THỬ NGHIỆM SỐ ' + (i + 1), SoTaiKhoan: '1234567' + ('000' + i).slice(-3), TaiNganHang: 'Ngân hàng thử nghiệm - CN Quảng Nam',
      LoaiTien: usd ? 'USD' : 'VND', NoiDungThanhToan: 'Thanh toán theo hóa đơn số ' + (100 + i), LoaiChungTu: 'Thanh toán tiền hàng', SoTien: st,
      SoTienQuyDoi: usd ? quyDoiUSDSangVND_(st, tyGia) : st, ChuyenTienNhanh_24_7: 'N', TaiLieuSo: 'HD' + (100 + i), NgayTaiLieu: '2026-09-15', DonViLapTaiLieu: 'NCC thử', GhiChu: '' };
  });
  return {
    hoSo: { MaHoSo: 'HS-THU', MaHD: 'HD-THU', SoGiayNhanNo: '01/2026-09', NgayGiayNhanNo: '2026-09-14', DuNoHienTai: 1500000000, LoaiTien: usd ? 'USD' : 'VND',
      TyGiaBan: usd ? tyGia : 0, SoTienNhanNoLanNay: tong, SoTienBangChu: usd ? soTienUSDBangChu_(tong) : soThanhChuVN(tong), PhuongThucThanhToan: 'Chuyển khoản',
      MucDichSuDungVon: 'Thanh toán tiền hàng (DỮ LIỆU THỬ)', ThoiHanChoVay_Ngay: 90, NgayGiaiNgan: '2026-09-15', NgayDenHan: '2026-12-14',
      TaiLieuChungMinhMucDich: 'Hóa đơn GTGT', NguoiLapBieu: 'Người lập thử', SoThamChieu: 'TC-THU', TrangThai: 'Nháp' },
    hopDong: { SoHopDong: '01/2026/HDTD-THU', NgayHopDong: '2026-01-05', TenNganHang: 'Ngân hàng thử nghiệm', ChiNhanh: 'Chi nhánh Quảng Nam', DiaChiChiNhanh: 'Địa chỉ chi nhánh thử',
      MST_ChiNhanh: '0100000000', HanMucVay: 50000000000, 'LaiSuatTrongHan_%': 6.5, 'LaiSuatLaiChamTra_%': 9.75, KyHanTraGoc: 'Cuối kỳ', KyHanTraLai: 'Hàng tháng',
      NguoiDaiDienNH: 'Người đại diện NH thử', ChucVuNH: 'Giám đốc', SoHopDongKhungMBNT: 'A01/2026', NgayHopDongKhungMBNT: '2026-01-06' },
    congTy: { TenCty: 'CÔNG TY THỬ NGHIỆM', DiaChiTruSo: '123 Đường A, Đà Nẵng', MaSoThue: '0400000000', DienThoai: '0236 000 000', NguoiDaiDien: 'Nguyễn Văn Thử', ChucVu: 'Giám đốc',
      TaiKhoanVND: '5110000111', TaiKhoanUSD: '5110000222', MaCIF: '0400000000' },
    chiTiet: chiTiet
  };
}

/** Tiền trên tài liệu phải theo nghiệp vụ: vay, bán USD, hoặc thanh toán thực tế. */
function taoBienTheoTaiLieu_(d, loai) {
  var m = taoBienDayDu_(d), hs = d.hoSo;
  if (Number(hs.PhienBanTien) !== 2) return m;
  var v = kiemTraTienChaCon_(payloadTienChaConDaLuu_(hs, d.chiTiet), false), st, lt;
  if (loai === CT_HDMB) { st = v.usdBan; lt = 'USD'; }
  else if (loai === CT_THANH_TOAN) {
    if (v.tongVND && v.tongUSD) { st = null; lt = ''; }
    else { st = v.tongUSD || v.tongVND; lt = v.tongUSD ? 'USD' : 'VND'; }
  } else return m;
  m['HO_SO.SO_TIEN'] = st === null ? '' : formatSo_(st);
  m['HO_SO.SO_TIEN_VN'] = m['HO_SO.SO_TIEN'];
  m['HO_SO.SO_TIEN_BANG_CHU'] = st === null ? '' : (lt === 'USD' ? soTienUSDBangChu_(st) : soThanhChuVN(st));
  m['HO_SO.LOAI_TIEN'] = lt;
  return apBiDanhVaMacDinh_(m, false);
}
