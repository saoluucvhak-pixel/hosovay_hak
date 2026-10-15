/**
 * DOCUMENTAUDIT.GS
 * Nhật ký thao tác (NhatKyHeThong) và LỊCH SỬ PHÁT HÀNH tài liệu (LichSuPhatHanhTaiLieu) — mỗi lần phát hành/thất bại 1 dòng,
 * không bao giờ xoá/ghi đè; bản phát hành mới chuyển bản cũ cùng hồ sơ + loại thành "Đã thay thế" (file giữ nguyên).
 */

var SHEET_NHAT_KY = 'NhatKyHeThong';
var SHEET_LICH_SU_PHAT_HANH = 'LichSuPhatHanhTaiLieu';
var COT_LICH_SU_ = ['MaTaiLieu', 'MaHoSo', 'LoaiTaiLieu', 'SoLan', 'MaMau', 'PhienBanMau', 'LoaiFile', 'Nguon', 'LinkGoc', 'LinkDocx', 'LinkPdf', 'LinkXlsx',
  'FileIdChinh', 'FileIdPdf', 'SoDong', 'TongTien', 'TongQuyDoi', 'HashDuLieu', 'HashMau', 'RevisionHoSo', 'TrangThai', 'NguoiPhatHanh', 'NgayPhatHanh', 'ThongBaoLoi', 'CanhBao'];
var TT_PH_HIEU_LUC = 'Hiệu lực', TT_PH_DA_THAY = 'Đã thay thế', TT_PH_LOI = 'Lỗi';

function emailNguoiDung_() {
  try { var dt = layDanhTinh_(); if (dt && dt.email) return dt.email; } catch (e0) { /* chưa có danh tính cổng */ }
  try { return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '(không rõ)'; } catch (e) { return '(không rõ)'; }
}

/** Ghi vết thao tác quan trọng (tạo/sửa hồ sơ, sửa tiền, phát hành, mẫu, cấu hình...). Lỗi ghi nhật ký không chặn nghiệp vụ. */
function ghiNhatKy_(maHoSo, hanhDong, chiTiet) {
  try {
    var sh = ensureSheet_(getSS_(), SHEET_NHAT_KY, ['ThoiGian', 'NguoiDung', 'MaHoSo', 'HanhDong', 'ChiTiet']);
    themDongVaoCuoiThat_(sh, [new Date(), emailNguoiDung_(), maHoSo || '', hanhDong, String(chiTiet || '').substring(0, 45000)]);
  } catch (e) { /* bỏ qua */ }
}

function bamDuLieu_(chuoi) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, chuoi);
  return b.map(function (x) { return ('0' + (x < 0 ? x + 256 : x).toString(16)).slice(-2); }).join('');
}

// Bộ nhớ đệm đọc LichSuPhatHanhTaiLieu — chỉ BẬT trong phạm vi 1 thao tác (batCacheLichSu_ … xoaCacheLichSu_) để một lần phát hành/liệt kê
// không phải đọc cả tab nhiều lần (mỗi lần đọc Google Sheets tốn vài trăm ms). Ngoài phạm vi đó luôn đọc mới.
var _lichSuCache_ = null, _lichSuBat_ = false;
function batCacheLichSu_() { _lichSuBat_ = true; _lichSuCache_ = null; }
function xoaCacheLichSu_() { _lichSuBat_ = false; _lichSuCache_ = null; }
function docLichSuPhatHanh_() {
  if (_lichSuBat_ && _lichSuCache_) return _lichSuCache_;
  var ds = sheetToObjects_(SHEET_LICH_SU_PHAT_HANH);
  if (_lichSuBat_) _lichSuCache_ = ds;
  return ds;
}

/** Số lần phát hành THÀNH CÔNG kế tiếp (hậu tố _L{n}); các dòng "Lỗi" không chiếm số. */
function soLanPhatHanhTiepTheo_(maHoSo, loai) {
  var max = 0;
  try {
    docLichSuPhatHanh_().forEach(function (r) {
      if (String(r.MaHoSo) === String(maHoSo) && r.LoaiTaiLieu === loai && r.TrangThai !== TT_PH_LOI) max = Math.max(max, Number(r.SoLan) || 0);
    });
  } catch (e) { /* tab chưa có */ }
  return max + 1;
}

/** Bản phát hành HIỆU LỰC gần nhất của hồ sơ + loại tài liệu (hoặc null). */
function layPhatHanhHienHanh_(maHoSo, loai) {
  var kq = null;
  try {
    docLichSuPhatHanh_().forEach(function (r) {
      if (String(r.MaHoSo) === String(maHoSo) && r.LoaiTaiLieu === loai && r.TrangThai === TT_PH_HIEU_LUC) kq = r;
    });
  } catch (e) { /* tab chưa có */ }
  return kq;
}

function ghiPhatHanh_(tt) {
  _lichSuCache_ = null; // dữ liệu sắp đổi
  var sh = ensureSheet_(getSS_(), SHEET_LICH_SU_PHAT_HANH, COT_LICH_SU_);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (tt.TrangThai === TT_PH_HIEU_LUC) {
    var cMa = headers.indexOf('MaHoSo'), cLoai = headers.indexOf('LoaiTaiLieu'), cTT = headers.indexOf('TrangThai');
    var vals = layGiaTriThatCuaSheet_(sh);
    for (var r = 1; r < vals.length; r++) {
      if (String(vals[r][cMa]) === String(tt.MaHoSo) && vals[r][cLoai] === tt.LoaiTaiLieu && vals[r][cTT] === TT_PH_HIEU_LUC) {
        sh.getRange(r + 1, cTT + 1).setValue(TT_PH_DA_THAY);
      }
    }
  }
  themDongVaoCuoiThat_(sh, headers.map(function (h) { return tt.hasOwnProperty(h) ? tt[h] : ''; }));
}

/** Lịch sử phát hành (mọi bản, kể cả lỗi), mới nhất trước; maHoSo rỗng = tất cả. Với 1 hồ sơ: kèm `hieuLuc` (so với dữ liệu hiện tại) — Hiệu lực / Hết hiệu lực do hồ sơ thay đổi / Được thay thế / Phát hành lỗi. */
function layLichSuPhatHanh(maHoSo) {
  yeuCauDangNhap_();
  var hash = '';
  if (maHoSo) { try { hash = hashHienTaiCuaHoSo_(layDuLieuDayDu(maHoSo)); } catch (e) { hash = ''; } }
  return docLichSuPhatHanh_().filter(function (r) { return !maHoSo || String(r.MaHoSo) === String(maHoSo); }).reverse().map(function (r) {
    return {
      maTaiLieu: r.MaTaiLieu, maHoSo: r.MaHoSo, loaiTaiLieu: r.LoaiTaiLieu, loai: nhanChungTu_(r.LoaiTaiLieu) || r.LoaiTaiLieu, soLan: r.SoLan,
      mau: r.MaMau ? (r.MaMau + ' v' + r.PhienBanMau) : '(biểu mẫu mặc định)', nguon: r.Nguon, loaiFile: r.LoaiFile, trangThai: r.TrangThai,
      hieuLuc: hieuLucBanPhatHanh_(r, hash).nhan, revisionHoSo: r.RevisionHoSo === undefined ? '' : r.RevisionHoSo,
      linkDocx: r.LinkDocx, linkPdf: r.LinkPdf, linkXlsx: r.LinkXlsx, linkGoc: r.LinkGoc, soDong: r.SoDong, tongTien: r.TongTien,
      nguoi: r.NguoiPhatHanh, ngay: ngayChoMau_(r.NgayPhatHanh), thongBaoLoi: r.ThongBaoLoi, canhBao: r.CanhBao
    };
  });
}
