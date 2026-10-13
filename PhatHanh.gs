/**
 * PHATHANH.GS
 * Luồng phát hành chứng từ bằng DOCX Template Engine:
 *   layDuLieuDayDu(maHoSo) -> kiểm tra dữ liệu tiền -> chọn mẫu DOCX -> chuẩn hoá biến -> sao chép mẫu & điền
 *   -> nhân bản bảng thụ hưởng -> kiểm tra tài liệu -> xuất DOCX/PDF -> lưu Drive -> ghi nhật ký -> cập nhật link hồ sơ.
 *
 * Mọi nút tạo chứng từ (từng loại hoặc "Tạo trọn bộ") đều đi qua phatHanhChungTu_() này.
 * Mỗi lần phát hành sinh file MỚI (hậu tố _L1, _L2...), KHÔNG ghi đè/xoá file đã phát hành; lịch sử ở tab PhatHanhChungTu.
 */

var SHEET_PHAT_HANH = 'PhatHanhChungTu';
var SHEET_NHAT_KY = 'NhatKyHeThong';

var CT_DE_NGHI = 'DE_NGHI_GIAI_NGAN';
var CT_THANH_TOAN = 'CHUNG_TU_THANH_TOAN';
var CT_HDMB = 'HDMB_NGOAI_TE';

var NHAN_CHUNG_TU_ = {
  DE_NGHI_GIAI_NGAN: 'Văn bản đề nghị giải ngân',
  CHUNG_TU_THANH_TOAN: 'Chứng từ thanh toán (UNC / Bảng kê)',
  HDMB_NGOAI_TE: 'Hợp đồng mua bán ngoại tệ giao ngay'
};
var TIEN_TO_FILE_ = { DE_NGHI_GIAI_NGAN: 'DeNghiGiaiNgan', CHUNG_TU_THANH_TOAN: 'ChungTuThanhToan', HDMB_NGOAI_TE: 'HDMB_NgoaiTe' };

// Cột link trong tab HoSoGiaiNgan cho từng loại chứng từ: goc = bản gốc/mở xem, docx, pdf, xlsx — TÁCH RIÊNG từng định dạng.
var COT_LINK_ = {
  DE_NGHI_GIAI_NGAN: { goc: 'Link_VanBanDeNghi', docx: 'Link_VanBanDeNghi_DOCX', pdf: 'Link_VanBanDeNghi_PDF', xlsx: '' },
  CHUNG_TU_THANH_TOAN: { goc: 'Link_ChungTuThanhToan', docx: 'Link_ChungTuThanhToan_DOCX', pdf: 'Link_ChungTuThanhToan_PDF', xlsx: 'Link_ChungTuThanhToan_XLSX' },
  HDMB_NGOAI_TE: { goc: 'Link_HDMBNgoaiTe', docx: 'Link_HDMBNgoaiTe_DOCX', pdf: 'Link_HDMBNgoaiTe_PDF', xlsx: '' }
};

// ---------- Ánh xạ dữ liệu -> placeholder ----------

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

/** Biến theo từng dòng thụ hưởng ({{CT.*}}). */
function taoBienDong_(ct, stt, loaiTien) {
  var soTien = docTienNguyen_(ct.SoTien, 'Số tiền dòng ' + stt);
  var m = taoBienTienDong_(ct);
  m['CT.SO_TIEN_BANG_CHU'] = loaiTien === 'USD' ? soTienUSDBangChu_(soTien) : soThanhChuVN(soTien);
  m['CT.STT'] = String(stt);
  m['CT.STT_2'] = (stt < 10 ? '0' : '') + stt;
  m['CT.TEN'] = ct.TenNguoiHuong || '';
  m['CT.SO_TK'] = String(ct.SoTaiKhoan || '');
  m['CT.NGAN_HANG'] = ct.TaiNganHang || '';
  m['CT.LOAI_CHUNG_TU'] = ct.LoaiChungTu || '';
  m['CT.SO_TAI_LIEU'] = ct.TaiLieuSo || '';
  m['CT.NGAY_TAI_LIEU'] = ngayChoMau_(ct.NgayTaiLieu);
  m['CT.NOI_DUNG'] = ct.NoiDungThanhToan || '';
  m['CT.CHUYEN_NHANH'] = ct.ChuyenTienNhanh_24_7 || 'N';
  m['CT.DON_VI_LAP'] = ct.DonViLapTaiLieu || '';
  m['CT.GHI_CHU'] = ct.GhiChu || '';
  return m;
}

/** Toàn bộ placeholder chung (công ty, hợp đồng, hồ sơ, ngày, tiền) — tái sử dụng taoBienTienHoSo_ cho phần tiền. */
function taoBienDayDu_(d, tuyChon) {
  tuyChon = tuyChon || {};
  var hs = d.hoSo, hd = d.hopDong, ct = d.congTy;
  var laUSD = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD';
  var m = taoBienTienHoSo_(d);
  var tongQuyDoi = docTienNguyen_(laUSD ? quyDoiUSDSangVND_(hs.SoTienNhanNoLanNay, hs.TyGiaBan) : hs.SoTienNhanNoLanNay);

  var homNay = tuyChon.homNay || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  var gn = tachNgay_(hs.NgayGiaiNgan);

  var khac = {
    'CONG_TY.TEN': ct.TenCty || '', 'CONG_TY.TEN_VIET_TAT': ct.TenVietTat || '', 'CONG_TY.MST': String(ct.MaSoThue || ''),
    'CONG_TY.MA_CIF': String(ct.MaCIF || ''), 'CONG_TY.DIA_CHI': ct.DiaChiTruSo || '', 'CONG_TY.DIEN_THOAI': String(ct.DienThoai || ''),
    'CONG_TY.FAX': String(ct.Fax || ''), 'CONG_TY.NGUOI_DAI_DIEN': ct.NguoiDaiDien || '', 'CONG_TY.CHUC_VU': ct.ChucVu || '',
    'CONG_TY.GIAY_UY_QUYEN_SO': String(ct.GiayUyQuyenSo || ''), 'CONG_TY.GIAY_UY_QUYEN_NGAY': ngayChoMau_(ct.GiayUyQuyenNgay),
    'CONG_TY.NGUOI_LAP_BIEU': ct.NguoiLapBieu || hs.NguoiLapBieu || '',
    'CONG_TY.TK_VND': String(ct.TaiKhoanVND || ''), 'CONG_TY.TK_USD': String(ct.TaiKhoanUSD || ''),

    'HOP_DONG.SO': String(hd.SoHopDong || ''), 'HOP_DONG.NGAY': ngayChoMau_(hd.NgayHopDong),
    'HOP_DONG.NGAN_HANG': hd.TenNganHang || '', 'HOP_DONG.CHI_NHANH': hd.ChiNhanh || '',
    'HOP_DONG.DIA_CHI_CHI_NHANH': hd.DiaChiChiNhanh || '', 'HOP_DONG.MST_CHI_NHANH': String(hd.MST_ChiNhanh || ''),
    'HOP_DONG.HAN_MUC': formatSo_(hd.HanMucVay),
    'HOP_DONG.LAI_SUAT': soThapPhanVN_(hd['LaiSuatTrongHan_%']), 'HOP_DONG.LAI_SUAT_QUA_HAN': hd.MoTaLaiSuatQuaHan || '',
    'HOP_DONG.LAI_SUAT_CHAM_TRA': soThapPhanVN_(hd['LaiSuatLaiChamTra_%']),
    'HOP_DONG.KY_HAN_TRA_GOC': hd.KyHanTraGoc || '', 'HOP_DONG.KY_HAN_TRA_LAI': hd.KyHanTraLai || '',
    'HOP_DONG.NGUOI_DAI_DIEN_NH': hd.NguoiDaiDienNH || '', 'HOP_DONG.CHUC_VU_NH': hd.ChucVuNH || '',
    'HOP_DONG.GIAY_UY_QUYEN_NH': hd.GiayUyQuyenNH || '', 'HOP_DONG.DIEN_THOAI_NH': String(hd.DienThoaiNH || ''),
    'HOP_DONG.HD_KHUNG_MBNT_SO': String(hd.SoHopDongKhungMBNT || ''), 'HOP_DONG.HD_KHUNG_MBNT_NGAY': ngayChoMau_(hd.NgayHopDongKhungMBNT),

    'HO_SO.MA': hs.MaHoSo || '', 'HO_SO.SO_GIAY_NHAN_NO': String(hs.SoGiayNhanNo || ''),
    'HO_SO.NGAY_GIAY_NHAN_NO': ngayChoMau_(hs.NgayGiayNhanNo), 'HO_SO.LOAI_TIEN': laUSD ? 'USD' : 'VND',
    'HO_SO.DON_VI_TIEN': laUSD ? 'USD' : 'đồng',
    'HO_SO.SO_TIEN_QUY_DOI_BANG_CHU': soThanhChuVN(tongQuyDoi),
    'HO_SO.PHUONG_THUC': hs.PhuongThucThanhToan || '', 'HO_SO.MUC_DICH': hs.MucDichSuDungVon || '',
    'HO_SO.THOI_HAN_NGAY': String(hs.ThoiHanChoVay_Ngay || ''),
    'HO_SO.NGAY_GIAI_NGAN': ngayChoMau_(hs.NgayGiaiNgan), 'HO_SO.NGAY_DEN_HAN': ngayChoMau_(hs.NgayDenHan),
    'HO_SO.TAI_LIEU_CHUNG_MINH': hs.TaiLieuChungMinhMucDich || '', 'HO_SO.NGUOI_LAP_BIEU': hs.NguoiLapBieu || '',
    'HO_SO.SO_THAM_CHIEU': String(hs.SoThamChieu || ''), 'HO_SO.SO_DONG': String((d.chiTiet || []).length),

    'NGAY.HOM_NAY': homNay,
    'NGAY.GIAI_NGAN_DAY_DU': gn ? ('ngày ' + gn.dd + ' tháng ' + gn.mm + ' năm ' + gn.yyyy) : 'ngày .... tháng .... năm ........',
    'NGAY.GIAI_NGAN_DD': gn ? gn.dd : '....', 'NGAY.GIAI_NGAN_MM': gn ? gn.mm : '....', 'NGAY.GIAI_NGAN_YYYY': gn ? gn.yyyy : '........',

    'BANG_KE.TONG_TIEN_BANG_CHU': m['HO_SO.SO_TIEN_BANG_CHU'],
    'BANG_KE.SO_DONG': String((d.chiTiet || []).length)
  };
  Object.keys(khac).forEach(function (k) { m[k] = khac[k]; });
  return m;
}

function taoDanhSachBienDong_(d) {
  var loaiTien = String(d.hoSo.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
  return (d.chiTiet || []).map(function (ct, i) { return taoBienDong_(ct, i + 1, loaiTien); });
}

// ---------- Kiểm tra dữ liệu tiền trước khi phát hành ----------

/**
 * Chặn phát hành nếu dữ liệu tiền của hồ sơ chưa hợp lệ, và CHỈ RÕ từng trường cần sửa.
 * Không sửa, không làm tròn dữ liệu — chỉ đọc.
 */
function kiemTraTienDePhatHanh_(d) {
  var loi = [], hs = d.hoSo, ds = d.chiTiet || [];
  var laUSD = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD';

  function doc(viTri, v, duongBat) {
    try {
      var n = docTienNguyen_(v, viTri);
      if (duongBat && n <= 0) { loi.push('• ' + viTri + ': phải lớn hơn 0.'); return null; }
      return n;
    } catch (e) { loi.push('• [' + viTri + '] ' + e.message); return null; }
  }

  if (!ds.length) loi.push('• ChiTietThuHuong: hồ sơ chưa có dòng thụ hưởng nào.');
  var duNo = doc('HoSoGiaiNgan.DuNoHienTai', hs.DuNoHienTai, false);
  var tongHs = doc('HoSoGiaiNgan.SoTienNhanNoLanNay', hs.SoTienNhanNoLanNay, true);
  var tyGia = 0;
  if (laUSD) {
    try { tyGia = docTyGia_(hs.TyGiaBan); } catch (e) { loi.push('• [HoSoGiaiNgan.TyGiaBan] ' + e.message); }
    if (!(tyGia > 0)) loi.push('• HoSoGiaiNgan.TyGiaBan: hồ sơ USD phải có tỷ giá bán > 0.');
  }

  var tong = 0, tongQd = 0, tongHopLe = true;
  ds.forEach(function (ct, i) {
    var dong = 'ChiTietThuHuong dòng ' + (i + 1);
    var st = doc(dong + ' – SoTien', ct.SoTien, true);
    var qd = doc(dong + ' – SoTienQuyDoi', ct.SoTienQuyDoi, true);
    if (st === null || qd === null) { tongHopLe = false; return; }
    tong += st; tongQd += qd;
    if (laUSD && tyGia > 0) {
      var cho = quyDoiUSDSangVND_(st, tyGia);
      if (cho !== qd) loi.push('• [' + dong + ' – SoTienQuyDoi] đang lưu ' + formatSo_(qd) + ' nhưng ROUND(' + formatSo_(st) + ' × ' + formatTyGia_(tyGia) + ') = ' + formatSo_(cho) + '. Lưu lại hồ sơ để tính lại.');
    } else if (!laUSD && qd !== st) {
      loi.push('• [' + dong + '] hồ sơ VND nhưng SoTienQuyDoi (' + formatSo_(qd) + ') khác SoTien (' + formatSo_(st) + ').');
    }
  });
  if (tongHopLe && tongHs !== null && tong !== tongHs) {
    loi.push('• Tổng các dòng thụ hưởng (' + formatSo_(tong) + ') khác HoSoGiaiNgan.SoTienNhanNoLanNay (' + formatSo_(tongHs) + ').');
  }
  if (tongHs !== null && !loi.length) {
    var chuCho = laUSD ? soTienUSDBangChu_(tongHs) : soThanhChuVN(tongHs);
    if (String(hs.SoTienBangChu || '') !== chuCho) {
      loi.push('• [HoSoGiaiNgan.SoTienBangChu] "' + hs.SoTienBangChu + '" không khớp số tiền bằng số (phải là "' + chuCho + '"). Lưu lại hồ sơ để cập nhật.');
    }
  }
  if (loi.length) {
    throw new Error('Không thể phát hành chứng từ — dữ liệu tiền của hồ sơ ' + hs.MaHoSo + ' chưa hợp lệ. Cần sửa:\n' + loi.join('\n'));
  }
  return { tong: tong, tongQuyDoi: tongQd, soDong: ds.length, duNo: duNo };
}

// ---------- Nhật ký & phát hành ----------

function emailNguoiDung_() {
  try { return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '(không rõ)'; } catch (e) { return '(không rõ)'; }
}

/** Ghi vết thao tác quan trọng (tạo/sửa hồ sơ, sửa tiền, phát hành...). Lỗi ghi nhật ký không chặn nghiệp vụ. */
function ghiNhatKy_(maHoSo, hanhDong, chiTiet) {
  try {
    var ss = getSS_();
    var sh = ensureSheet_(ss, SHEET_NHAT_KY, ['ThoiGian', 'NguoiDung', 'MaHoSo', 'HanhDong', 'ChiTiet']);
    themDongVaoCuoiThat_(sh, [new Date(), emailNguoiDung_(), maHoSo || '', hanhDong, String(chiTiet || '').substring(0, 45000)]);
  } catch (e) { /* bỏ qua */ }
}

function bamDuLieu_(chuoi) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, chuoi);
  return b.map(function (x) { return ('0' + (x < 0 ? x + 256 : x).toString(16)).slice(-2); }).join('');
}

/** Số lần đã phát hành loại chứng từ này cho hồ sơ (để đặt hậu tố _L{n}; không bao giờ ghi đè file cũ). */
function soLanPhatHanhTiepTheo_(maHoSo, loai) {
  var max = 0;
  try {
    sheetToObjects_(SHEET_PHAT_HANH).forEach(function (r) {
      if (String(r.MaHoSo) === String(maHoSo) && r.LoaiChungTu === loai) max = Math.max(max, Number(r.SoLan) || 0);
    });
  } catch (e) { /* tab chưa có */ }
  return max + 1;
}

function ghiPhatHanh_(thongTin) {
  var ss = getSS_();
  var sh = ensureSheet_(ss, SHEET_PHAT_HANH, COT_PHAT_HANH_);
  // Bản trước cùng hồ sơ + loại chuyển sang "Đã thay thế" (file vẫn còn nguyên, chỉ đổi nhãn).
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var cMa = headers.indexOf('MaHoSo'), cLoai = headers.indexOf('LoaiChungTu'), cTT = headers.indexOf('TrangThai');
  var vals = layGiaTriThatCuaSheet_(sh);
  for (var r = 1; r < vals.length; r++) {
    if (String(vals[r][cMa]) === String(thongTin.MaHoSo) && vals[r][cLoai] === thongTin.LoaiChungTu && vals[r][cTT] === 'Hiệu lực') {
      sh.getRange(r + 1, cTT + 1).setValue('Đã thay thế');
    }
  }
  var row = headers.map(function (h) { return thongTin.hasOwnProperty(h) ? thongTin[h] : ''; });
  themDongVaoCuoiThat_(sh, row);
}

var COT_PHAT_HANH_ = ['MaPhatHanh', 'MaHoSo', 'LoaiChungTu', 'SoLan', 'MaMau', 'PhienBanMau', 'Nguon', 'LinkGoc', 'LinkDocx', 'LinkPdf',
  'LinkXlsx', 'FileIdDocx', 'SoDong', 'TongTien', 'TongQuyDoi', 'HashDuLieu', 'TrangThai', 'NguoiPhatHanh', 'NgayPhatHanh', 'GhiChu'];

/** Cập nhật 4 cột link của hồ sơ cho 1 loại chứng từ — mỗi định dạng ghi ĐÚNG cột của nó. */
function capNhatLinkChungTu_(maHoSo, loai, links) {
  var cot = COT_LINK_[loai];
  var sh = getSS_().getSheetByName(SHEET_HOSO);
  var cacCot = [cot.goc, cot.docx, cot.pdf, cot.xlsx].filter(function (c) { return c; });
  var headers = damBaoCotSheet_(sh, cacCot);
  var hs = layHoSoTheoMa(maHoSo);
  if (!hs || !hs._row) return;
  function ghi(tenCot, giaTri) {
    if (!tenCot) return;
    var c = headers.indexOf(tenCot) + 1;
    if (c > 0) sh.getRange(hs._row, c).setValue(giaTri || '');
  }
  ghi(cot.goc, links.goc); ghi(cot.docx, links.docx); ghi(cot.pdf, links.pdf); ghi(cot.xlsx, links.xlsx);
}

/** Xuất DOCX -> PDF qua bản Google Docs trung gian (Drive API), xong xoá bản trung gian. Lỗi PDF không làm mất DOCX. */
function docxXuatPdf_(fileDocx, thuMuc, tenPdf) {
  var tam = null;
  try {
    tam = Drive.Files.insert({ title: 'TAM_' + tenPdf, mimeType: 'application/vnd.google-apps.document' }, fileDocx.getBlob(), { convert: true });
    var pdfBlob = DriveApp.getFileById(tam.id).getAs('application/pdf').setName(tenPdf);
    var pdf = thuMuc.createFile(pdfBlob);
    return { url: pdf.getUrl(), id: pdf.getId(), loi: '' };
  } catch (e) {
    return { url: '', id: '', loi: e.message };
  } finally {
    if (tam && tam.id) { try { DriveApp.getFileById(tam.id).setTrashed(true); } catch (e2) { /* bỏ qua */ } }
  }
}

/** Kiểm tra bản DOCX đã điền: không sót placeholder, số hàng nhân bản đúng, số tiền có mặt trong văn bản. */
function docxKiemTraKetQua_(ketQua, map, dsDong, mau) {
  var loi = [];
  if (ketQua.conLai.length) loi.push('Còn placeholder chưa xử lý: ' + ketQua.conLai.map(function (k) { return '{{' + k + '}}'; }).join(', '));
  if (ketQua.conNgoac.length) loi.push('Còn ký tự "{{"/"}}" trong văn bản: ' + ketQua.conNgoac.join(' | '));
  if (mau && mau.coHangMau && ketQua.soHangTao !== ketQua.soHangMau * dsDong.length) {
    loi.push('Số hàng thụ hưởng tạo ra (' + ketQua.soHangTao + ') không khớp ' + ketQua.soHangMau + ' hàng mẫu × ' + dsDong.length + ' dòng.');
  }
  var phan = Utilities.unzip(ketQua.blob), van = '';
  phan.forEach(function (f) {
    if (f.getName() === 'word/document.xml') van = f.getDataAsString('UTF-8').replace(/<[^>]+>/g, '');
  });
  var tuMau = (mau && mau.placeholder) || [];
  ['HO_SO.SO_TIEN', 'HO_SO.SO_TIEN_BANG_CHU', 'BANG_KE.TONG_TIEN'].forEach(function (k) {
    if (tuMau.indexOf(k) >= 0 && van.indexOf(docxMaHoa_(String(map[k]))) < 0) loi.push('Giá trị của {{' + k + '}} không thấy trong văn bản đã điền.');
  });
  return loi;
}

/**
 * ĐIỂM VÀO DUY NHẤT để phát hành 1 loại chứng từ cho 1 hồ sơ.
 * @return {{nguon:string, loai:string, docUrl:string, docxUrl:string, pdfUrl:string, xlsxUrl:string, sheetUrl:string,
 *           soDong:number, mau:string, phienBanMau:number, soLan:number, canhBao:string[]}}
 */
function phatHanhChungTu_(maHoSo, loai, d, tuyChon) {
  tuyChon = tuyChon || {};
  if (!NHAN_CHUNG_TU_[loai]) throw new Error('Loại chứng từ không hợp lệ: ' + loai);
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(60000)) throw new Error('Hệ thống đang xử lý một thao tác khác (lưu/phát hành hồ sơ). Vui lòng thử lại sau ít phút.');
  try {
    d = d || layDuLieuDayDu(maHoSo);
    if (d.hoSo.TrangThai === 'Đã hủy') throw new Error('Hồ sơ ' + maHoSo + ' đã hủy, không phát hành chứng từ mới.');
    if (loai === CT_HDMB && String(d.hoSo.LoaiTien || 'VND').toUpperCase() !== 'USD') {
      throw new Error('Hợp đồng mua bán ngoại tệ chỉ áp dụng cho hồ sơ vay bằng USD.');
    }
    var tom = kiemTraTienDePhatHanh_(d); // chặn nếu tiền chưa hợp lệ, chỉ rõ trường cần sửa

    var mau = chonMauDocx_(loai, String(d.hoSo.LoaiTien || 'VND').toUpperCase(), d.chiTiet.length, d.hopDong.TenNganHang || '');
    var thuMuc = layThuMucHoSo_(maHoSo);
    var soLan = soLanPhatHanhTiepTheo_(maHoSo, loai);
    var tenGoc = TIEN_TO_FILE_[loai] + '_' + maHoSo + '_L' + soLan;
    var kq;

    if (mau) {
      kq = phatHanhTuMauDocx_(d, loai, mau, thuMuc, tenGoc);
    } else {
      if (tuyChon.batBuocMau) throw new Error('Chưa có mẫu DOCX hiệu lực cho "' + NHAN_CHUNG_TU_[loai] + '" (' + d.hoSo.LoaiTien + ', ' + d.chiTiet.length + ' người thụ hưởng). Hãy tải mẫu ở tab "Mẫu Word".');
      kq = phatHanhMacDinh_(d, loai, maHoSo);
      kq.canhBao = (kq.canhBao || []).concat(['Chưa có mẫu DOCX hiệu lực — dùng biểu mẫu dựng sẵn bằng code (mặc định). Tải mẫu Word ở tab "Mẫu Word" để tự sinh theo mẫu của bạn.']);
    }
    kq.loai = NHAN_CHUNG_TU_[loai]; kq.soDong = d.chiTiet.length; kq.soLan = soLan;

    ghiPhatHanh_({
      MaPhatHanh: maHoSo + '-' + loai + '-L' + soLan, MaHoSo: maHoSo, LoaiChungTu: loai, SoLan: soLan,
      MaMau: kq.mau || '', PhienBanMau: kq.phienBanMau || '', Nguon: kq.nguon,
      LinkGoc: kq.docUrl || kq.sheetUrl || '', LinkDocx: kq.docxUrl || '', LinkPdf: kq.pdfUrl || '', LinkXlsx: kq.xlsxUrl || '',
      FileIdDocx: kq.fileIdDocx || '', SoDong: d.chiTiet.length, TongTien: tom.tong, TongQuyDoi: tom.tongQuyDoi,
      HashDuLieu: bamDuLieu_(JSON.stringify([d.hoSo.SoTienNhanNoLanNay, d.hoSo.TyGiaBan, d.chiTiet.map(function (c) { return [c.SoTien, c.SoTienQuyDoi, c.TenNguoiHuong, c.SoTaiKhoan]; })])),
      TrangThai: 'Hiệu lực', NguoiPhatHanh: emailNguoiDung_(), NgayPhatHanh: new Date(), GhiChu: (kq.canhBao || []).join(' | ')
    });
    capNhatLinkChungTu_(maHoSo, loai, { goc: kq.docUrl || kq.sheetUrl, docx: kq.docxUrl, pdf: kq.pdfUrl, xlsx: kq.xlsxUrl });
    ghiNhatKy_(maHoSo, 'PHAT_HANH_' + loai, 'L' + soLan + ' | nguồn=' + kq.nguon + ' | mẫu=' + (kq.mau || '-') + ' | tổng=' + tom.tong);
    SpreadsheetApp.flush();
    return kq;
  } finally {
    khoa.releaseLock();
  }
}

/** Nhánh dùng mẫu DOCX: sao chép mẫu -> điền -> kiểm tra -> lưu DOCX -> xuất PDF. */
function phatHanhTuMauDocx_(d, loai, mau, thuMuc, tenGoc) {
  var map = taoBienDayDu_(d);
  var dsDong = taoDanhSachBienDong_(d);
  var blobMau = DriveApp.getFileById(mau.FileIdDocx).getBlob();          // đọc mẫu, KHÔNG sửa file mẫu
  var ketQua = docxDienMau_(blobMau, map, dsDong, tenGoc + '.docx');      // bản sao đã điền
  var loi = docxKiemTraKetQua_(ketQua, map, dsDong, { coHangMau: mau.CoHangMau === true || mau.CoHangMau === 'TRUE', placeholder: mau.placeholder });
  if (loi.length) throw new Error('Mẫu "' + mau.MaMau + '" v' + mau.PhienBan + ' sinh ra tài liệu chưa đạt, đã DỪNG phát hành:\n• ' + loi.join('\n• '));

  var fileDocx = thuMuc.createFile(ketQua.blob.setName(tenGoc + '.docx'));
  var pdf = docxXuatPdf_(fileDocx, thuMuc, tenGoc + '.pdf');
  var canhBao = ketQua.canhBao.slice();
  if (pdf.loi) canhBao.push('Không xuất được PDF: ' + pdf.loi);
  return {
    nguon: 'MAU_DOCX', mau: mau.MaMau, phienBanMau: mau.PhienBan, fileIdDocx: fileDocx.getId(),
    docUrl: fileDocx.getUrl(), docxUrl: fileDocx.getUrl(), pdfUrl: pdf.url, xlsxUrl: '', sheetUrl: '', canhBao: canhBao
  };
}

/** Nhánh mặc định (chưa có mẫu DOCX): dùng biểu mẫu dựng bằng code cũ — vẫn ghi nhật ký & tách đúng cột link. */
function phatHanhMacDinh_(d, loai, maHoSo) {
  if (loai === CT_DE_NGHI) {
    var r = taoDeNghiMacDinh_(maHoSo, d);
    return { nguon: 'MAC_DINH_CODE', mau: '', docUrl: r.docUrl, docxUrl: '', pdfUrl: r.pdfUrl, xlsxUrl: '', sheetUrl: '', canhBao: [] };
  }
  if (loai === CT_HDMB) {
    var h = taoHDMBMacDinh_(maHoSo, d);
    return { nguon: 'MAC_DINH_CODE', mau: '', docUrl: h.docUrl, docxUrl: '', pdfUrl: h.pdfUrl, xlsxUrl: '', sheetUrl: '', canhBao: [] };
  }
  var c = taoChungTuMacDinh_(maHoSo, d);
  return { nguon: 'MAC_DINH_CODE', mau: '', docUrl: '', sheetUrl: c.sheetUrl, docxUrl: '', pdfUrl: c.pdfUrl, xlsxUrl: c.xlsxUrl, canhBao: [] };
}

/**
 * SỬA DỮ LIỆU LỊCH SỬ (chạy THỦ CÔNG qua menu, có ghi nhật ký): trước đây link file .xlsx của chứng từ thanh toán bị ghi nhầm
 * vào cột Link_ChungTuThanhToan_PDF. Hàm này đọc loại file thật trên Drive; nếu là bảng tính/.xlsx thì CHUYỂN link sang cột
 * Link_ChungTuThanhToan_XLSX (không xoá file, không đổi nội dung nào khác). Link thật sự là PDF được giữ nguyên.
 */
function suaLinkChungTuCuMenu() {
  yeuCauQuanTri_('sửa link chứng từ cũ');
  var sh = getSS_().getSheetByName(SHEET_HOSO);
  var headers = damBaoCotSheet_(sh, ['Link_ChungTuThanhToan_PDF', 'Link_ChungTuThanhToan_XLSX']);
  var cPdf = headers.indexOf('Link_ChungTuThanhToan_PDF') + 1, cXlsx = headers.indexOf('Link_ChungTuThanhToan_XLSX') + 1;
  var ds = sheetToObjects_(SHEET_HOSO), daSua = [], boQua = 0;
  ds.forEach(function (hs) {
    var link = String(hs.Link_ChungTuThanhToan_PDF || ''), xlsx = String(hs.Link_ChungTuThanhToan_XLSX || '');
    if (!link || xlsx) return;
    var m = link.match(/[-\w]{25,}/);
    if (!m) { boQua++; return; }
    var mime = '';
    try { mime = DriveApp.getFileById(m[0]).getMimeType(); } catch (e) { boQua++; return; }
    if (/spreadsheetml|ms-excel|google-apps.spreadsheet/.test(mime)) {
      sh.getRange(hs._row, cXlsx).setValue(link);
      sh.getRange(hs._row, cPdf).setValue('');
      daSua.push(hs.MaHoSo);
    }
  });
  ghiNhatKy_('', 'SUA_LINK_XLSX_CU', 'Chuyển link XLSX khỏi cột PDF: ' + (daSua.join(', ') || '(không có)'));
  SpreadsheetApp.flush();
  var msg = daSua.length ? ('Đã chuyển ' + daSua.length + ' link .xlsx sang cột Link_ChungTuThanhToan_XLSX: ' + daSua.join(', ')) : 'Không có link nào cần sửa.';
  try { SpreadsheetApp.getUi().alert(msg + (boQua ? '\n(Bỏ qua ' + boQua + ' dòng không đọc được link.)' : '')); } catch (e) { /* chạy ngoài menu */ }
  return daSua;
}
