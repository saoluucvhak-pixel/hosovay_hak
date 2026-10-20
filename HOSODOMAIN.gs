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

/**
 * BẮT BUỘC revision cho mọi cập nhật hồ sơ ĐÃ TỒN TẠI. Thiếu → THIEU_REVISION; không hợp lệ → REVISION_KHONG_HOP_LE; lệch → XUNG_DOT_PHIEN_BAN.
 * Không bao giờ tự lấy revision mới nhất thay cho client. Gọi trong vùng khoá ghi.
 */
function kiemTraRevisionBatBuoc_(hs, expected) {
  var ma = hs && hs.MaHoSo;
  if (expected === undefined || expected === null || expected === '') throw new Error('THIEU_REVISION|Thiếu phiên bản hồ sơ (expectedRevision) khi cập nhật hồ sơ ' + ma + ' — hãy tải lại hồ sơ rồi thao tác lại.');
  var n = Number(expected);
  if (typeof expected === 'boolean' || !isFinite(n) || n < 0 || Math.floor(n) !== n) throw new Error('REVISION_KHONG_HOP_LE|Phiên bản hồ sơ không hợp lệ: "' + expected + '".');
  if (n !== soRevision_(hs)) throw loiXungDot_(ma, soRevision_(hs), n);
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
/**
 * ĐIỀU KIỆN VỀ HỒ SƠ + CHỨNG TỪ để được xác nhận giải ngân (chưa gồm xác nhận giao dịch ngân hàng — xem GiaiNganThucTe.gs).
 * Chứng từ BẮT BUỘC (cấu hình ở Cài đặt → Loại tài liệu) phải: đã phát hành, có liên kết file, và HashDuLieu khớp dữ liệu hồ sơ HIỆN TẠI.
 * Chứng từ không bắt buộc được phép thiếu. @return {{loi:string[], canhBao:string[]}} — chỉ đọc, không ghi.
 */
function kiemTraDuDieuKienGiaiNgan_(maHoSo, duLieuSan) {
  var loi = [], canhBao = [], d;
  if (duLieuSan) d = duLieuSan; // đã nạp sẵn (đối soát hàng loạt): không đọc lại Sheet cho từng hồ sơ
  else { try { d = layDuLieuDayDu(maHoSo); } catch (e) { return { loi: ['Không tải được dữ liệu hồ sơ: ' + e.message], canhBao: [] }; } }
  var hs = d.hoSo;
  if (!String(hs.SoGiayNhanNo || '').trim()) loi.push('Chưa có Số giấy nhận nợ.');
  if (!hs.NgayGiaiNgan || !tachNgay_(hs.NgayGiaiNgan)) loi.push('Chưa có Ngày giải ngân (kế hoạch) hợp lệ.');
  if (!String(hs.MaHD || '').trim()) loi.push('Chưa chọn hợp đồng vay.');
  if (!d.chiTiet.length) loi.push('Chưa có người thụ hưởng nào.');
  d.chiTiet.forEach(function (c, i) {
    if (!String(c.TenNguoiHuong || '').trim()) loi.push('Dòng thụ hưởng ' + (i + 1) + ': thiếu tên người hưởng.');
    if (!String(c.SoTaiKhoan || '').trim()) loi.push('Dòng thụ hưởng ' + (i + 1) + ': thiếu số tài khoản.');
    if (!String(c.TaiNganHang || '').trim()) loi.push('Dòng thụ hưởng ' + (i + 1) + ': thiếu ngân hàng.');
  });
  try { kiemTraTienDePhatHanh_(d); } catch (e) { String(e.message).split('\n').forEach(function (l) { if (l.trim()) loi.push(l.replace(/^•\s*/, '')); }); }
  var hashHienTai = hashHienTaiCuaHoSo_(d), laUSD = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD', bank = d.hopDong.TenNganHang || '';
  var batBuoc = dsChungTuBatBuoc_(hs, bank), apDung = dsChungTuApDung_(hs, bank);
  batBuoc.forEach(function (loai) {
    var ten = nhanChungTu_(loai), ban = layPhatHanhHienHanh_(maHoSo, loai), h = hieuLucBanPhatHanh_(ban, hashHienTai);
    if (h.ma === 'HIEU_LUC') return;
    if (h.ma === 'HET_HIEU_LUC') { loi.push('"' + ten + '" đã HẾT HIỆU LỰC do hồ sơ thay đổi sau khi phát hành — hãy phát hành lại.'); return; }
    if (h.ma === 'THIEU_LINK') { loi.push('"' + ten + '" thiếu liên kết file hợp lệ — hãy phát hành lại.'); return; }
    var mau = chonMauTaiLieu_(loai, laUSD ? 'USD' : 'VND', d.chiTiet.length, bank, d.hoSo.PhienBanTien);
    var heThong = loai === CT_DE_NGHI || loai === CT_THANH_TOAN || loai === CT_HDMB;
    loi.push('Chưa tạo chứng từ BẮT BUỘC "' + ten + '".' + (!mau && !heThong ? ' (Chưa có mẫu hiệu lực cho loại này — tải mẫu ở Cài đặt → Quản lý mẫu văn bản.)' : ''));
  });
  apDung.forEach(function (loai) { // không bắt buộc: chỉ cảnh báo nếu đã phát hành nhưng cũ
    if (batBuoc.indexOf(loai) >= 0) return;
    var ban = layPhatHanhHienHanh_(maHoSo, loai);
    if (ban && hieuLucBanPhatHanh_(ban, hashHienTai).ma === 'HET_HIEU_LUC') canhBao.push('"' + nhanChungTu_(loai) + '" (không bắt buộc) đã hết hiệu lực do hồ sơ thay đổi.');
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
    var hs = layHoSoTheoMa_(maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    var tu = String(hs.TrangThai || '').trim() || TT_NHAP;
    kiemTraRevisionBatBuoc_(hs, tuyChon.expectedRevision); // luôn bắt buộc — kể cả khi trạng thái không đổi
    if (tu === den) {
      if (tuyChon.chapNhanGiuNguyen) return { maHoSo: maHoSo, trangThai: tu, tuTrangThai: tu, revision: soRevision_(hs), khongDoi: true };
      throw new Error('Hồ sơ ' + maHoSo + ' đã ở trạng thái "' + den + '".');
    }
    if (tuyChon.boQuaNeuGiaiNgan && (tu === TT_DA_GIAI_NGAN)) return { maHoSo: maHoSo, trangThai: tu, tuTrangThai: tu, revision: soRevision_(hs), khongDoi: true };
    if (!coTheChuyenTrangThai_(tu, den)) {
      throw new Error('Không được chuyển hồ sơ ' + maHoSo + ' từ "' + tu + '" sang "' + den + '".' + (tu === TT_DA_HUY ? ' "Đã hủy" là trạng thái kết thúc.' : ' Các bước hợp lệ: ' + ((CHUYEN_TRANG_THAI_[tu] || []).join(', ') || '(không có)') + '.'));
    }
    if (den === TT_DA_HUY && !String(lyDo || '').trim()) throw new Error('Cần nhập lý do hủy giải ngân.');
    if (den === TT_DA_TAO) { // "Đã tạo hồ sơ" = bộ chứng từ BẮT BUỘC đã phát hành hợp lệ, khớp dữ liệu hiện tại
      var bo = tinhTrangThaiBo_(maHoSo, null);
      if (bo.trangThai !== TT_PHIEN_XONG) throw new Error('Chưa thể chuyển sang "Đã tạo hồ sơ": bộ chứng từ đang ở trạng thái "' + bo.trangThai + '"' + (bo.thieu.length ? ' — thiếu: ' + bo.thieu.map(nhanChungTu_).join(', ') : '') + (bo.hetHieuLuc.length ? ' — hết hiệu lực: ' + bo.hetHieuLuc.map(nhanChungTu_).join(', ') : '') + '.');
    }
    if (den === TT_DA_GIAI_NGAN) {
      if (!tuyChon.maXacNhan) throw new Error('Không thể sang "Đã giải ngân" nếu chưa có xác nhận giải ngân thực tế của ngân hàng (xacNhanGiaiNganThucTe).');
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
    capNhatBaoCaoNhapAnToan_(maHoSo);
    return { maHoSo: maHoSo, trangThai: den, tuTrangThai: tu, revision: revMoi };
  });
}

/** Nháp ← Đã tạo hồ sơ (cho sửa lại). Chứng từ đã phát hành được GIỮ NGUYÊN (lịch sử) nhưng sẽ hết hiệu lực khi dữ liệu thay đổi. expectedRevision BẮT BUỘC. */
function chuyenHoSoVeNhap(maHoSo, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return chuyenTrangThaiHoSo_(maHoSo, TT_NHAP, lyDo || 'Chuyển về Nháp để chỉnh sửa', { expectedRevision: expectedRevision });
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
    var hs = layHoSoTheoMa_(maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    if (hs.TrangThai === TT_DA_GIAI_NGAN || hs.TrangThai === TT_DA_HUY) throw new Error('Hồ sơ đã ở trạng thái "' + hs.TrangThai + '", không thể xoá — chỉ có thể xem lại.');
    kiemTraRevisionBatBuoc_(hs, tuyChon.expectedRevision);
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
    capNhatBaoCaoNhapAnToan_(maHoSo);
    return { maHoSo: maHoSo, daXoaMem: true, soTaiLieuGiuLai: soTL };
  });
}

/**
 * Khôi phục hồ sơ đã xoá mềm (chỉ quản trị). expectedRevision = revision của hồ sơ lúc bị xoá (xem layDanhSachHoSoXoaMem) — BẮT BUỘC.
 * Từ chối nếu dữ liệu tham chiếu không còn tương thích: hợp đồng không tồn tại, thiếu dòng thụ hưởng, tổng lệch chi tiết, mã trùng với hồ sơ đang hoạt động.
 * Sau khôi phục chạy kiểm tra toàn vẹn của riêng hồ sơ và trả cảnh báo.
 */
function khoiPhucHoSo(maHoSo, expectedRevision) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('khôi phục hồ sơ đã xoá');
  return voiKhoa_(function () {
    damBaoCotHoSoDomain_();
    var tatCa = sheetToObjects_(SHEET_HOSO), hs = timTheoTruong_(tatCa, 'MaHoSo', maHoSo);
    if (!hs || !laDaXoa_(hs.DaXoa)) throw new Error('Không có hồ sơ đã xoá mềm mang mã ' + maHoSo + '.');
    kiemTraRevisionBatBuoc_(hs, expectedRevision);
    var loi = [];
    if (tatCa.filter(function (h) { return String(h.MaHoSo) === String(maHoSo) && !laDaXoa_(h.DaXoa); }).length) loi.push('đã có hồ sơ hoạt động trùng mã');
    if (!hs.MaHD || !layHopDongTheoMa_(hs.MaHD)) loi.push('hợp đồng ' + hs.MaHD + ' không còn tồn tại');
    var ct = layChiTietTheoHoSo_(maHoSo), tong = 0;
    if (Number(hs.PhienBanTien) !== 2) ct.forEach(function (c) { tong = tongTienTheoLoai_([tong, c.SoTien], hs.LoaiTien); });
    if (!ct.length) loi.push('không còn dòng thụ hưởng');
    else if (Number(hs.PhienBanTien) !== 2 && tong !== (Number(hs.SoTienNhanNoLanNay) || 0)) loi.push('tổng chi tiết ' + tong + ' ≠ tổng hồ sơ ' + hs.SoTienNhanNoLanNay);
    if (loi.length) throw new Error('Không khôi phục được hồ sơ ' + maHoSo + ': ' + loi.join('; ') + '. Dữ liệu tham chiếu đã thay đổi — cần xử lý thủ công, hồ sơ vẫn được giữ ở trạng thái xoá mềm.');
    var sh = getSS_().getSheetByName(SHEET_HOSO);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var dong = timDongHoSo_(sh, headers, maHoSo), me = layDanhTinh_().email || emailNguoiDung_(), revMoi = soRevision_(hs) + 1;
    ghiCotHoSo_(sh, headers, dong, { DaXoa: false, Revision: revMoi, CapNhatLuc: new Date(), CapNhatBoi: me });
    SpreadsheetApp.flush();
    tangRevision_('HOSO');
    ghiNhatKy_(maHoSo, 'KHOI_PHUC_HO_SO', 'Bỏ xoá mềm bởi ' + me + ' | revision ' + revMoi);
    var canhBao = [];
    try { var kt = tinhDoiSoat_().kiemTra.filter(function (k) { return k.soLoi && k.chiTiet.some(function (x) { return String(x).indexOf(maHoSo) === 0; }); }); kt.forEach(function (k) { canhBao.push(k.ten); }); } catch (e) { /* không chặn */ }
    return { maHoSo: maHoSo, revision: revMoi, canhBaoToanVen: canhBao };
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
function xacMinhChaCon_(maHoSo, soDongKyVong, tongKyVong, v2) {
  if (v2) {
    var hs2 = layHoSoTheoMa_(maHoSo), ct2 = layChiTietTheoHoSo_(maHoSo), loi2 = [];
    if (!hs2 || ['PhienBanTien','USDBan','VNDThucNhan','VNDTheoTyGia','ChenhLechQuyDoi','SoTienNhanNoLanNay'].some(function (k) { return hs2[k] !== v2.cha[k]; })) loi2.push('Bảng cha không khớp dữ liệu gửi');
    if (ct2.length !== v2.con.length) loi2.push('Số dòng con không khớp');
    ct2.forEach(function (c, i) { if (!v2.con[i] || v2.headers.some(function (k, n) { return ['MaChiTiet','LoaiTien','SoTien','SoTienQuyDoi','SoTaiKhoan'].indexOf(k) >= 0 && c[k] !== v2.con[i][n]; })) loi2.push('Dòng con ' + (i + 1) + ' không khớp'); });
    return loi2;
  }
  var ct = layChiTietTheoHoSo_(maHoSo), tong = 0;
  ct.forEach(function (c) { tong = congSoTien_(tong, c.SoTien); });
  var loi = [];
  if (ct.length !== soDongKyVong) loi.push('số dòng chi tiết ' + ct.length + ' ≠ ' + soDongKyVong);
  if (tong !== tongKyVong) loi.push('tổng chi tiết ' + tong + ' ≠ ' + tongKyVong);
  return loi;
}

/**
 * Sau khi MẤT KẾT NỐI lúc gửi lệnh lưu: hỏi máy chủ xem lệnh đã được ghi chưa TRƯỚC khi cho gửi lại.
 *  • Hồ sơ mới: tra theo khoaYeuCau → {daGhi, maHoSo, revision}.
 *  • Hồ sơ đã có: revision hiện tại so với expectedRevision (lớn hơn = đã có thay đổi được ghi; không phân biệt được do chính lệnh vừa gửi hay người khác → giao diện bắt tải lại).
 */
function kiemTraKetQuaLuu(maHoSo, khoaYeuCau, expectedRevision) {
  yeuCauDangNhap_();
  var ds = docDanhSachHoSo_(true), h = null;
  if (maHoSo) h = ds.filter(function (x) { return String(x.MaHoSo) === String(maHoSo); })[0];
  else if (khoaYeuCau) h = ds.filter(function (x) { return String(x.KhoaYeuCau || '') === String(khoaYeuCau); })[0];
  if (!h) return { daGhi: false };
  var rev = soRevision_(h);
  return { daGhi: maHoSo ? (expectedRevision !== undefined && expectedRevision !== null ? rev > Number(expectedRevision) : false) : true, maHoSo: h.MaHoSo, revision: rev, trangThai: h.TrangThai };
}
