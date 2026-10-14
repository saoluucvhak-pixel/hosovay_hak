/**
 * HOSODOMAIN.GS — LỚP MIỀN (domain) cho hồ sơ giải ngân: vòng đời trạng thái, phiên bản (revision), khoá ghi, sinh mã, xoá mềm,
 * nhật ký ghi dở dang (journal) để phát hiện và phục hồi.
 *
 * Google Sheets KHÔNG có giao dịch ACID. Cơ chế ở đây là "kiểm tra trước – ghi theo thứ tự – xác minh sau – có nhật ký để phục hồi":
 *   1. Mọi thao tác ghi nằm trong LockService (voiKhoa_, dùng lại được khi lồng nhau trong cùng lượt thực thi).
 *   2. Kiểm tra TOÀN BỘ dữ liệu mới trước khi ghi bất cứ ô nào.
 *   3. Trước khi thay chi tiết cha–con: ghi nhật ký NhatKyGhiDoDang (trạng thái DANG_GHI) kèm bản sao cũ; ghi xong và đọc lại khớp mới đánh HOAN_TAT.
 *   4. Lần ghi sau (đang giữ khoá) gặp DANG_GHI của chính hồ sơ đó = lần trước chết giữa chừng → TỰ phục hồi từ bản sao rồi mới tiếp tục.
 *   5. Mỗi hồ sơ có Revision; người lưu phải gửi expectedRevision — lệch thì từ chối (XUNG_DOT_PHIEN_BAN), không ghi đè thầm lặng.
 */

var TT_NHAP = 'Nháp', TT_DA_TAO = 'Đã tạo hồ sơ', TT_DA_GIAI_NGAN = 'Đã giải ngân', TT_DA_HUY = 'Đã hủy';
var SHEET_LICH_SU_TRANG_THAI = 'LichSuTrangThaiHoSo';
var COT_LICH_SU_TRANG_THAI_ = ['ThoiGian', 'MaHoSo', 'TuTrangThai', 'DenTrangThai', 'LyDo', 'NguoiDung', 'NguonDinhDanh', 'RevisionSau'];
var SHEET_GHI_DO_DANG = 'NhatKyGhiDoDang';
var COT_GHI_DO_DANG_ = ['IdGhi', 'MaHoSo', 'LaHoSoMoi', 'BatDau', 'HoanTat', 'TrangThai', 'NguoiDung', 'SaoLuuHoSo', 'SaoLuuChiTiet', 'GhiChu'];
var COT_HO_SO_DOMAIN_ = ['LoaiHoSoGiaiNgan', 'KhoaYeuCau', 'Revision', 'CapNhatLuc', 'CapNhatBoi', 'DaXoa', 'NgayXoa', 'NguoiXoa', 'LyDoXoa'];
var GIOI_HAN_O_SAO_LUU_ = 45000;

/** Bảng chuyển trạng thái hợp lệ: từ → [đến]. '' = chưa có hồ sơ (tạo mới chỉ vào Nháp). "Đã hủy" là trạng thái kết thúc. */
var CHUYEN_TRANG_THAI_ = {};
CHUYEN_TRANG_THAI_[''] = [TT_NHAP];
CHUYEN_TRANG_THAI_[TT_NHAP] = [TT_DA_TAO];
CHUYEN_TRANG_THAI_[TT_DA_TAO] = [TT_NHAP, TT_DA_GIAI_NGAN];
CHUYEN_TRANG_THAI_[TT_DA_GIAI_NGAN] = [TT_DA_HUY];
CHUYEN_TRANG_THAI_[TT_DA_HUY] = [];

function coTheChuyenTrangThai_(tu, den) { return (CHUYEN_TRANG_THAI_[tu || ''] || []).indexOf(den) >= 0; }

// ---------------------------------------------------------------------------------------------------------------------
// KHOÁ GHI (dùng lại được khi lồng nhau)
// ---------------------------------------------------------------------------------------------------------------------
var _khoaDangGiu_ = 0;
function voiKhoa_(fn, thoiGianMs) {
  if (_khoaDangGiu_ > 0) return fn();
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(thoiGianMs || 30000)) throw new Error('Hệ thống đang xử lý một thao tác khác (lưu/phát hành hồ sơ). Vui lòng thử lại sau ít giây.');
  _khoaDangGiu_++;
  try { return fn(); } finally { _khoaDangGiu_--; khoa.releaseLock(); }
}

// ---------------------------------------------------------------------------------------------------------------------
// CỘT & REVISION
// ---------------------------------------------------------------------------------------------------------------------
var _cotHoSoDaDam_ = false;
function damBaoCotHoSoDomain_() {
  if (_cotHoSoDaDam_) return;
  damBaoCotSheet_(getSS_().getSheetByName(SHEET_HOSO), COT_HO_SO_DOMAIN_);
  _cotHoSoDaDam_ = true;
}

function soRevision_(hs) { return Number(hs && hs.Revision) || 0; }
function laDaXoa_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

function loiXungDot_(maHoSo, hienTai, kyVong) {
  return new Error('XUNG_DOT_PHIEN_BAN|' + hienTai + '|Hồ sơ ' + maHoSo + ' đã được người khác thay đổi (phiên bản hiện tại ' + hienTai + ', bạn đang xem phiên bản ' + kyVong + '). Hãy tải lại hồ sơ rồi sửa lại để không ghi đè thay đổi của họ.');
}

/** Ghi nhiều cột của 1 dòng hồ sơ bằng MỘT lần setValues (đọc dòng hiện tại, sửa theo tên cột, ghi lại). */
function ghiCotHoSo_(sh, headers, dong, giaTriTheoTen) {
  var cu = sh.getRange(dong, 1, 1, headers.length).getValues()[0];
  headers.forEach(function (h, i) { if (giaTriTheoTen.hasOwnProperty(h)) cu[i] = giaTriTheoTen[h]; });
  sh.getRange(dong, 1, 1, headers.length).setValues([cu]);
}

/** Danh sách hồ sơ (bỏ hồ sơ đã xoá mềm trừ khi baoGomDaXoa). */
function docDanhSachHoSo_(baoGomDaXoa) {
  var ds = sheetToObjects_(SHEET_HOSO);
  return baoGomDaXoa ? ds : ds.filter(function (h) { return !laDaXoa_(h.DaXoa); });
}

// ---------------------------------------------------------------------------------------------------------------------
// SINH MÃ (trong khoá; không dùng lại mã đã cấp)
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Mã tiếp theo = max(số lớn nhất đang có trong cột A, bộ đếm đã lưu) + 1, đảm bảo chưa tồn tại. Bộ đếm (Script Properties) giữ cho mã của
 * dòng đã xoá không bị cấp lại. Chạy trong khoá (tự lấy nếu chưa có). Có thể để hở số khi lần lưu sau đó thất bại — chấp nhận để không trùng.
 * Mã (khoá kỹ thuật, ổn định) KHÁC số chứng từ nghiệp vụ (SoGiayNhanNo, SoHopDong...).
 */
function sinhMaTuDong_(sheetName, prefix, doRong) {
  return voiKhoa_(function () {
    var sh = getSS_().getSheetByName(sheetName);
    var re = new RegExp('^' + prefix + '(\\d+)$'), max = 0, co = {};
    var lastRow = sh.getLastRow();
    if (lastRow >= 2) {
      sh.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function (r) {
        var s = String(r[0] || ''), m = s.match(re);
        if (m) { max = Math.max(max, parseInt(m[1], 10)); co[s] = true; }
      });
    }
    var p = PropertiesService.getScriptProperties(), khoaDem = 'SEQ_' + sheetName + '_' + prefix, dem = 0;
    try { dem = parseInt(p.getProperty(khoaDem) || '0', 10) || 0; } catch (e) { dem = 0; }
    var next = Math.max(max, dem) + 1, ma;
    do {
      var so = String(next);
      while (so.length < (doRong || 3)) so = '0' + so;
      ma = prefix + so; next++;
    } while (co[ma]);
    try { p.setProperty(khoaDem, String(next - 1)); } catch (e2) { /* thiếu bộ đếm vẫn an toàn nhờ kiểm tra cột A */ }
    return ma;
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// ĐIỀU KIỆN GIẢI NGÂN
// ---------------------------------------------------------------------------------------------------------------------
/** @return {{loi:string[], canhBao:string[]}} — chỉ đọc, không ghi. */
function kiemTraDuDieuKienGiaiNgan_(maHoSo) {
  var loi = [], canhBao = [], d;
  try { d = layDuLieuDayDu(maHoSo); } catch (e) { return { loi: ['Không tải được dữ liệu hồ sơ: ' + e.message], canhBao: [] }; }
  var hs = d.hoSo;
  if (!String(hs.SoGiayNhanNo || '').trim()) loi.push('Chưa có Số giấy nhận nợ.');
  if (!hs.NgayGiaiNgan || !tachNgay_(hs.NgayGiaiNgan)) loi.push('Chưa có Ngày giải ngân hợp lệ.');
  if (!String(hs.MaHD || '').trim()) loi.push('Chưa chọn hợp đồng vay.');
  if (!d.chiTiet.length) loi.push('Chưa có người thụ hưởng nào.');
  d.chiTiet.forEach(function (c, i) {
    if (!String(c.TenNguoiHuong || '').trim()) loi.push('Dòng thụ hưởng ' + (i + 1) + ': thiếu tên người hưởng.');
    if (!String(c.SoTaiKhoan || '').trim()) loi.push('Dòng thụ hưởng ' + (i + 1) + ': thiếu số tài khoản.');
    if (!String(c.TaiNganHang || '').trim()) loi.push('Dòng thụ hưởng ' + (i + 1) + ': thiếu ngân hàng.');
  });
  try { kiemTraTienDePhatHanh_(d); } catch (e) { String(e.message).split('\n').forEach(function (l) { if (l.trim()) loi.push(l.replace(/^•\s*/, '')); }); }
  // Chứng từ bắt buộc theo loại hồ sơ: đã tạo (Hiệu lực) VÀ tạo từ đúng dữ liệu hiện tại (đối chiếu hash).
  var hashHienTai = '';
  try { hashHienTai = hashDuLieuHoSo_(d); } catch (e) { hashHienTai = ''; }
  var laUSD = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD';
  dsChungTuApDung_(hs).forEach(function (loai) {
    var ten = nhanChungTu_(loai);
    var mau = chonMauTaiLieu_(loai, laUSD ? 'USD' : 'VND', d.chiTiet.length, d.hopDong.TenNganHang || '');
    var coTheLap = mau || loai === CT_DE_NGHI || loai === CT_THANH_TOAN || loai === CT_HDMB; // loại tự thêm chưa có mẫu thì không bắt buộc
    if (!coTheLap) return;
    var hh = layPhatHanhHienHanh_(maHoSo, loai);
    if (!hh) loi.push('Chưa tạo "' + ten + '".');
    else if (hashHienTai && hh.HashDuLieu && hh.HashDuLieu !== hashHienTai) loi.push('"' + ten + '" được tạo từ dữ liệu cũ (hồ sơ đã sửa sau khi tạo) — hãy tạo lại.');
  });
  return { loi: loi, canhBao: canhBao };
}

// ---------------------------------------------------------------------------------------------------------------------
// CHUYỂN TRẠNG THÁI (điểm vào DUY NHẤT để đổi cột TrangThai)
// ---------------------------------------------------------------------------------------------------------------------
function ghiLichSuTrangThai_(maHoSo, tu, den, lyDo, revisionSau) {
  try {
    var sh = ensureSheet_(getSS_(), SHEET_LICH_SU_TRANG_THAI, COT_LICH_SU_TRANG_THAI_);
    var dt = layDanhTinh_();
    themDongVaoCuoiThat_(sh, [new Date(), maHoSo, tu, den, String(lyDo || ''), dt.email || emailNguoiDung_(), dt.nguon, revisionSau]);
  } catch (e) { /* nhật ký không chặn nghiệp vụ; ghiNhatKy_ bên dưới vẫn ghi */ }
}

/**
 * @param {string} maHoSo
 * @param {string} den  trạng thái đích
 * @param {string} lyDo
 * @param {{expectedRevision:number, chapNhanGiuNguyen:boolean, boQuaNeuGiaiNgan:boolean, xacNhanLai:boolean}=} tuyChon
 */
function chuyenTrangThaiHoSo_(maHoSo, den, lyDo, tuyChon) {
  tuyChon = tuyChon || {};
  return voiKhoa_(function () {
    damBaoCotHoSoDomain_();
    var hs = layHoSoTheoMa(maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    var tu = String(hs.TrangThai || '').trim() || TT_NHAP;
    if (tuyChon.expectedRevision !== undefined && tuyChon.expectedRevision !== null && Number(tuyChon.expectedRevision) !== soRevision_(hs)) throw loiXungDot_(maHoSo, soRevision_(hs), tuyChon.expectedRevision);
    if (tu === den) {
      if (tuyChon.chapNhanGiuNguyen) return { maHoSo: maHoSo, trangThai: tu, tuTrangThai: tu, revision: soRevision_(hs), khongDoi: true };
      throw new Error('Hồ sơ ' + maHoSo + ' đã ở trạng thái "' + den + '".');
    }
    if (tuyChon.boQuaNeuGiaiNgan && (tu === TT_DA_GIAI_NGAN)) return { maHoSo: maHoSo, trangThai: tu, tuTrangThai: tu, revision: soRevision_(hs), khongDoi: true };
    if (!coTheChuyenTrangThai_(tu, den)) {
      throw new Error('Không được chuyển hồ sơ ' + maHoSo + ' từ "' + tu + '" sang "' + den + '".' + (tu === TT_DA_HUY ? ' "Đã hủy" là trạng thái kết thúc.' : ' Các bước hợp lệ: ' + ((CHUYEN_TRANG_THAI_[tu] || []).join(', ') || '(không có)') + '.'));
    }
    if (den === TT_DA_HUY && !String(lyDo || '').trim()) throw new Error('Cần nhập lý do hủy giải ngân.');
    if (den === TT_DA_GIAI_NGAN) {
      var kt = kiemTraDuDieuKienGiaiNgan_(maHoSo);
      if (kt.loi.length) throw new Error('Chưa đủ điều kiện đánh dấu giải ngân:\n• ' + kt.loi.join('\n• '));
    }
    var sh = getSS_().getSheetByName(SHEET_HOSO);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var dong = timDongHoSo_(sh, headers, maHoSo);
    if (!dong) throw new Error('Không tìm thấy dòng hồ sơ ' + maHoSo + ' trong Sheet.');
    var revMoi = soRevision_(hs) + 1, dt = layDanhTinh_();
    ghiCotHoSo_(sh, headers, dong, { TrangThai: den, Revision: revMoi, CapNhatLuc: new Date(), CapNhatBoi: dt.email || emailNguoiDung_() });
    SpreadsheetApp.flush();
    tangRevision_('HOSO');
    ghiLichSuTrangThai_(maHoSo, tu, den, lyDo, revMoi);
    ghiNhatKy_(maHoSo, 'CHUYEN_TRANG_THAI', tu + ' -> ' + den + (lyDo ? ' | lý do: ' + lyDo : ''));
    try { capNhatBaoCaoDraft_(); } catch (e) { /* không chặn */ }
    return { maHoSo: maHoSo, trangThai: den, tuTrangThai: tu, revision: revMoi };
  });
}

/** Nháp ← Đã tạo hồ sơ (cho sửa lại). Chứng từ đã phát hành được giữ nguyên. */
function chuyenHoSoVeNhap(maHoSo, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return chuyenTrangThaiHoSo_(maHoSo, TT_NHAP, lyDo || 'Chuyển về Nháp để chỉnh sửa', { expectedRevision: expectedRevision });
}

/** Đã tạo hồ sơ → Đã giải ngân, chỉ khi đủ điều kiện (kiemTraDuDieuKienGiaiNgan_). */
function danhDauDaGiaiNgan(maHoSo, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return chuyenTrangThaiHoSo_(maHoSo, TT_DA_GIAI_NGAN, lyDo || 'Đánh dấu đã giải ngân', { expectedRevision: expectedRevision });
}

/** Đã giải ngân → Đã hủy (kết thúc). Bắt buộc lý do. */
function huyGiaiNgan(maHoSo, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return chuyenTrangThaiHoSo_(maHoSo, TT_DA_HUY, lyDo, { expectedRevision: expectedRevision });
}

/** Cho giao diện: hồ sơ này có đủ điều kiện giải ngân chưa (không ghi gì). */
function kiemTraDieuKienGiaiNgan(maHoSo) {
  yeuCauDangNhap_();
  return kiemTraDuDieuKienGiaiNgan_(maHoSo);
}

/** Lịch sử chuyển trạng thái của 1 hồ sơ (mới nhất trước). */
function layLichSuTrangThaiHoSo(maHoSo) {
  yeuCauDangNhap_();
  var ds;
  try { ds = sheetToObjects_(SHEET_LICH_SU_TRANG_THAI); } catch (e) { return []; }
  return ds.filter(function (r) { return String(r.MaHoSo) === String(maHoSo); }).reverse().map(function (r) {
    return { thoiGian: Utilities.formatDate(new Date(r.ThoiGian), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), tu: r.TuTrangThai, den: r.DenTrangThai, lyDo: r.LyDo, nguoi: r.NguoiDung, nguon: r.NguonDinhDanh, revision: r.RevisionSau };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// XOÁ MỀM
// ---------------------------------------------------------------------------------------------------------------------
function demTaiLieuDaPhatHanh_(maHoSo) {
  try {
    return sheetToObjects_(SHEET_LICH_SU_PHAT_HANH).filter(function (r) { return String(r.MaHoSo) === String(maHoSo) && r.TrangThai !== TT_PH_LOI; }).length;
  } catch (e) { return 0; }
}

/**
 * XOÁ MỀM (đặt DaXoa, giữ nguyên dòng cha + chi tiết + file Drive). Không xoá hồ sơ Đã giải ngân/Đã hủy. Nếu đã có tài liệu phát hành,
 * phải truyền tuyChon.xacNhanCoTaiLieu = true (giao diện hỏi lại). Không tự xoá file trên Drive.
 */
function xoaHoSo(maHoSo, tuyChon) {
  yeuCauDangNhap_();
  tuyChon = tuyChon || {};
  return voiKhoa_(function () {
    damBaoCotHoSoDomain_();
    var hs = layHoSoTheoMa(maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    if (hs.TrangThai === TT_DA_GIAI_NGAN || hs.TrangThai === TT_DA_HUY) throw new Error('Hồ sơ đã ở trạng thái "' + hs.TrangThai + '", không thể xoá — chỉ có thể xem lại.');
    if (tuyChon.expectedRevision !== undefined && tuyChon.expectedRevision !== null && Number(tuyChon.expectedRevision) !== soRevision_(hs)) throw loiXungDot_(maHoSo, soRevision_(hs), tuyChon.expectedRevision);
    var soTL = demTaiLieuDaPhatHanh_(maHoSo);
    if (soTL > 0 && !tuyChon.xacNhanCoTaiLieu) {
      throw new Error('CO_TAI_LIEU|' + soTL + '|Hồ sơ ' + maHoSo + ' đã có ' + soTL + ' tài liệu phát hành. Xoá hồ sơ chỉ ẩn khỏi danh sách (dữ liệu và file Drive được giữ nguyên để truy vết). Xác nhận để tiếp tục.');
    }
    var sh = getSS_().getSheetByName(SHEET_HOSO);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var dong = timDongHoSo_(sh, headers, maHoSo), dt = layDanhTinh_(), revMoi = soRevision_(hs) + 1;
    ghiCotHoSo_(sh, headers, dong, { DaXoa: true, NgayXoa: new Date(), NguoiXoa: dt.email || emailNguoiDung_(), LyDoXoa: String(tuyChon.lyDo || ''), Revision: revMoi, CapNhatLuc: new Date(), CapNhatBoi: dt.email || emailNguoiDung_() });
    SpreadsheetApp.flush();
    tangRevision_('HOSO');
    ghiNhatKy_(maHoSo, 'XOA_MEM_HO_SO', 'Ẩn hồ sơ (xoá mềm); ' + soTL + ' tài liệu đã phát hành và file Drive được giữ nguyên.' + (tuyChon.lyDo ? ' Lý do: ' + tuyChon.lyDo : ''));
    try { capNhatBaoCaoDraft_(); } catch (e) { /* không chặn */ }
    return { maHoSo: maHoSo, daXoaMem: true, soTaiLieuGiuLai: soTL };
  });
}

/** Khôi phục hồ sơ đã xoá mềm (quản trị). */
function khoiPhucHoSo(maHoSo) {
  yeuCauQuanTri_('khôi phục hồ sơ đã xoá');
  return voiKhoa_(function () {
    damBaoCotHoSoDomain_();
    var hs = timTheoTruong_(sheetToObjects_(SHEET_HOSO), 'MaHoSo', maHoSo);
    if (!hs || !laDaXoa_(hs.DaXoa)) throw new Error('Không có hồ sơ đã xoá mềm mang mã ' + maHoSo + '.');
    var sh = getSS_().getSheetByName(SHEET_HOSO);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var dong = timDongHoSo_(sh, headers, maHoSo);
    ghiCotHoSo_(sh, headers, dong, { DaXoa: false, Revision: soRevision_(hs) + 1, CapNhatLuc: new Date(), CapNhatBoi: emailNguoiDung_() });
    SpreadsheetApp.flush();
    tangRevision_('HOSO');
    ghiNhatKy_(maHoSo, 'KHOI_PHUC_HO_SO', 'Bỏ xoá mềm');
    return { maHoSo: maHoSo };
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// NHẬT KÝ GHI DỞ DANG (journal) & PHỤC HỒI
// ---------------------------------------------------------------------------------------------------------------------
function ghiDoDangBatDau_(maHoSo, laHoSoMoi, rowHoSoCu, saoLuuChiTiet) {
  var sh = ensureSheet_(getSS_(), SHEET_GHI_DO_DANG, COT_GHI_DO_DANG_);
  var id = 'GD' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 1e6);
  var jHs = JSON.stringify(rowHoSoCu || []), jCt = JSON.stringify(saoLuuChiTiet || []), ghiChu = '';
  if (jHs.length > GIOI_HAN_O_SAO_LUU_ || jCt.length > GIOI_HAN_O_SAO_LUU_) { jHs = jHs.length > GIOI_HAN_O_SAO_LUU_ ? '' : jHs; jCt = jCt.length > GIOI_HAN_O_SAO_LUU_ ? '' : jCt; ghiChu = 'KHONG_DU_SAO_LUU'; }
  themDongVaoCuoiThat_(sh, [id, maHoSo, laHoSoMoi ? 'TRUE' : 'FALSE', new Date(), '', 'DANG_GHI', emailNguoiDung_(), jHs, jCt, ghiChu]);
  return { id: id };
}

function capNhatGhiDoDang_(id, trangThai, ghiChu) {
  var sh = getSS_().getSheetByName(SHEET_GHI_DO_DANG);
  if (!sh) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals = layGiaTriThatCuaSheet_(sh), cId = headers.indexOf('IdGhi');
  for (var r = vals.length - 1; r >= 1; r--) {
    if (vals[r][cId] === id) {
      var cap = { TrangThai: trangThai, HoanTat: new Date() };
      if (ghiChu) cap.GhiChu = ghiChu;
      ghiCotHoSo_(sh, headers, r + 1, cap);
      return;
    }
  }
}

/** Các lần ghi dở dang chưa phục hồi (quản trị xem). */
function layGhiDoDang() {
  yeuCauQuanTri_('xem nhật ký ghi dở dang');
  var ds;
  try { ds = sheetToObjects_(SHEET_GHI_DO_DANG); } catch (e) { return []; }
  return ds.filter(function (r) { return r.TrangThai === 'DANG_GHI'; }).map(function (r) {
    return { idGhi: r.IdGhi, maHoSo: r.MaHoSo, laHoSoMoi: r.LaHoSoMoi === 'TRUE', batDau: Utilities.formatDate(new Date(r.BatDau), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), nguoi: r.NguoiDung, coSaoLuu: r.GhiChu !== 'KHONG_DU_SAO_LUU' };
  });
}

/** Phục hồi 1 lần ghi dở dang từ bản sao: trả chi tiết cũ + dòng cha cũ (hồ sơ mới thì xoá mềm dòng cha). Gọi trong khoá. */
function phucHoiGhiDoDangTheoDong_(r, ghiChu) {
  if (r.GhiChu === 'KHONG_DU_SAO_LUU') throw new Error('Lần ghi ' + r.IdGhi + ' không có bản sao đủ để tự phục hồi (dữ liệu lớn). Kiểm tra thủ công hồ sơ ' + r.MaHoSo + '.');
  var maHoSo = r.MaHoSo, ss = getSS_();
  var shCt = ss.getSheetByName(SHEET_CHITIET), shHs = ss.getSheetByName(SHEET_HOSO);
  var cu = JSON.parse(r.SaoLuuChiTiet || '[]'), hsCu = JSON.parse(r.SaoLuuHoSo || '[]');
  // 1) bỏ chi tiết hiện có của hồ sơ này
  var all = layGiaTriThatCuaSheet_(shCt), xoa = [];
  for (var q = all.length - 1; q >= 1; q--) if (String(all[q][0]) === String(maHoSo)) xoa.push(q + 1);
  xoaCacDongNhom_(shCt, xoa);
  // 2) ghi lại bản cũ (nếu có)
  if (cu.length) shCt.getRange(timDongThatCuoiCung_(shCt) + 1, 1, cu.length, cu[0].length).setValues(cu);
  // 3) dòng cha
  var headers = shHs.getRange(1, 1, 1, shHs.getLastColumn()).getValues()[0], dong = timDongHoSo_(shHs, headers, maHoSo);
  if (r.LaHoSoMoi === 'TRUE') {
    if (dong) ghiCotHoSo_(shHs, headers, dong, { DaXoa: true, NgayXoa: new Date(), NguoiXoa: 'HE_THONG', LyDoXoa: 'Ghi dở dang khi tạo mới (đã phục hồi)' });
  } else if (dong && hsCu.length) {
    shHs.getRange(dong, 1, 1, hsCu.length).setValues([hsCu]);
  }
  SpreadsheetApp.flush();
  capNhatGhiDoDang_(r.IdGhi, 'DA_PHUC_HOI', ghiChu || 'Phục hồi từ bản sao');
  tangRevision_('HOSO');
  ghiNhatKy_(maHoSo, 'PHUC_HOI_GHI_DO_DANG', r.IdGhi + ' | ' + (ghiChu || ''));
}

/** Phục hồi thủ công theo mã lần ghi (quản trị). */
function phucHoiGhiDoDang(idGhi) {
  yeuCauQuanTri_('phục hồi lần ghi dở dang');
  return voiKhoa_(function () {
    var r = sheetToObjects_(SHEET_GHI_DO_DANG).filter(function (x) { return x.IdGhi === idGhi && x.TrangThai === 'DANG_GHI'; })[0];
    if (!r) throw new Error('Không có lần ghi dở dang "' + idGhi + '" cần phục hồi.');
    phucHoiGhiDoDangTheoDong_(r, 'Quản trị phục hồi thủ công');
    return { idGhi: idGhi, maHoSo: r.MaHoSo };
  });
}

/** Đầu mỗi lần lưu (đang giữ khoá): nếu hồ sơ này còn lần ghi DANG_GHI → lần trước chết giữa chừng → tự phục hồi rồi mới ghi tiếp. */
function tuPhucHoiGhiDoDangCuaHoSo_(maHoSo) {
  var ds;
  try { ds = sheetToObjects_(SHEET_GHI_DO_DANG); } catch (e) { return 0; }
  var dem = 0;
  ds.filter(function (r) { return r.TrangThai === 'DANG_GHI' && String(r.MaHoSo) === String(maHoSo); }).forEach(function (r) { phucHoiGhiDoDangTheoDong_(r, 'Tự phục hồi trước lần lưu kế tiếp'); dem++; });
  return dem;
}

/** Xoá nhiều dòng theo nhóm liên tiếp (ít lệnh gọi hơn xoá từng dòng). rowsGiamDan: số dòng 1-based, sắp GIẢM dần. */
function xoaCacDongNhom_(sh, rowsGiamDan) {
  var i = 0;
  while (i < rowsGiamDan.length) {
    var cuoi = rowsGiamDan[i], j = i;
    while (j + 1 < rowsGiamDan.length && rowsGiamDan[j + 1] === rowsGiamDan[j] - 1) j++;
    var dau = rowsGiamDan[j], soDong = cuoi - dau + 1;
    if (typeof sh.deleteRows === 'function') sh.deleteRows(dau, soDong); else for (var k = cuoi; k >= dau; k--) sh.deleteRow(k);
    i = j + 1;
  }
}

/** Đối chiếu cha–con của 1 hồ sơ sau khi ghi: đúng số dòng và đúng tổng tiền. */
function xacMinhChaCon_(maHoSo, soDongKyVong, tongKyVong) {
  var ct = layChiTietTheoHoSo(maHoSo), tong = 0;
  ct.forEach(function (c) { tong += Number(c.SoTien) || 0; });
  var loi = [];
  if (ct.length !== soDongKyVong) loi.push('số dòng chi tiết ' + ct.length + ' ≠ ' + soDongKyVong);
  if (tong !== tongKyVong) loi.push('tổng chi tiết ' + tong + ' ≠ ' + tongKyVong);
  return loi;
}
