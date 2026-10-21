/**
 * BAODAM.GS — TÀI SẢN BẢO ĐẢM và ĐIỀU KIỆN/CHỈ SỐ RÀNG BUỘC (covenant) gắn với hợp đồng vay.
 *
 * TÀI SẢN BẢO ĐẢM (sheet TaiSanBaoDam): đăng ký tài sản thế chấp/cầm cố gắn với hợp đồng, giá trị định giá (VND), hạn bảo hiểm;
 *   không xoá — "giải chấp" = đổi trạng thái. Tổng giá trị TSBĐ đang bảo đảm dùng để tính tỷ lệ dư nợ / giá trị tài sản.
 * ĐIỀU KIỆN RÀNG BUỘC (sheet DieuKienRangBuoc): chỉ tiêu có ngưỡng (≤ hoặc ≥). 3 loại:
 *   THU_CONG          — người dùng nhập giá trị theo kỳ (VD: doanh thu về BIDV ≥ 120% doanh số giải ngân, hệ số thanh toán ≥ 1,2)
 *   TY_LE_HAN_MUC     — tự tính: dư nợ ÷ hạn mức hợp đồng (%)
 *   TY_LE_VAY_TAI_SAN — tự tính: dư nợ ÷ tổng giá trị TSBĐ đang bảo đảm (%)
 *   Trạng thái: ĐẠT / SẮP VI PHẠM (còn trong 10% biên an toàn) / VI PHẠM / CHƯA CÓ DỮ LIỆU / QUÁ HẠN CẬP NHẬT (loại nhập tay, quá kỳ kiểm tra).
 */
var SHEET_TAI_SAN_BAO_DAM = 'TaiSanBaoDam';
var COT_TAI_SAN_ = ['MaTS', 'MaHD', 'LoaiTS', 'MoTa', 'GiaTriVND', 'NgayDinhGia', 'SoHDBaoDam', 'NgayHetHanBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'GiaiChapLuc', 'LyDoGiaiChap'];
var TS_DANG_BAO_DAM = 'Đang bảo đảm', TS_DA_GIAI_CHAP = 'Đã giải chấp';
var LOAI_TAI_SAN_ = { BDS: 'Bất động sản', DONG_SAN: 'Động sản / phương tiện / máy móc', TIEN_GUI: 'Tiền gửi / giấy tờ có giá', HANG_TON_KHO: 'Hàng tồn kho', KHAC: 'Khác' };
var SHEET_RANG_BUOC = 'DieuKienRangBuoc';
var COT_RANG_BUOC_ = ['MaRB', 'MaHD', 'TenChiTieu', 'Loai', 'ToanTu', 'Nguong', 'DonVi', 'KyKiemTraNgay', 'GiaTri', 'NgayCapNhat', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi'];
var LOAI_RANG_BUOC_ = { THU_CONG: 'Nhập tay theo kỳ', TY_LE_HAN_MUC: 'Tự tính: dư nợ / hạn mức (%)', TY_LE_VAY_TAI_SAN: 'Tự tính: dư nợ / giá trị TSBĐ (%)' };
var BIEN_AN_TOAN_RB_ = 0.1, NGAY_CB_BAO_HIEM_ = 30;

function hopDongTrongPhamVi_(maHD) {
  var tra = layTraCuuDanhMuc_(), hd = tra.hd[String(maHD)], pv = phamViCongTyNguoiDung_();
  if (!hd || (pv.length && pv.indexOf(String(hd.MaCty)) < 0)) throw new Error('Không tìm thấy hợp đồng ' + maHD + ' trong phạm vi được cấp.');
  return hd;
}
function docSoThuc_(v, ten, tu, den) {
  var s = String(v === null || v === undefined ? '' : v).trim().replace(/\s/g, '');
  if (s === '') throw new Error(ten + ' không được để trống.');
  if (/,/.test(s) && /\./.test(s)) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (/,/.test(s)) s = s.replace(',', '.');
  if (!/^-?\d+(\.\d{1,4})?$/.test(s)) throw new Error(ten + ' phải là số (tối đa 4 chữ số thập phân).');
  var n = Number(s);
  if (n < tu || n > den) throw new Error(ten + ' phải từ ' + tu + ' đến ' + den + '.');
  return n;
}
function docSheetBaoDam_(ten) { return getSS_().getSheetByName(ten) ? sheetToObjects_(ten) : []; }
function ghiDongMoi_(ten, cot, o) {
  var sh = ensureSheet_(getSS_(), ten, cot), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  themDongVaoCuoiThat_(sh, headers.map(function (h) { return o.hasOwnProperty(h) ? o[h] : ''; }));
}
function capNhatDongTheoMa_(ten, khoa, ma, cot) {
  var sh = getSS_().getSheetByName(ten); if (!sh) throw new Error('Chưa có dữ liệu.');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], vals = layGiaTriThatCuaSheet_(sh), c = headers.indexOf(khoa), dong = -1;
  for (var i = 1; i < vals.length; i++) if (String(vals[i][c]) === String(ma)) { dong = i + 1; break; }
  if (dong < 0) throw new Error('Không tìm thấy bản ghi ' + ma + '.');
  ghiCotHoSo_(sh, headers, dong, cot); SpreadsheetApp.flush();
}
function maBaoDamMoi_(tienTo, ds, khoa) {
  var max = 0; ds.forEach(function (r) { var m = String(r[khoa]).match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  return tienTo + '-' + String(max + 1).padStart(4, '0');
}

/* ------------------------------ TÀI SẢN BẢO ĐẢM ------------------------------ */
/** Tổng hợp theo hợp đồng (nội bộ): {maHD: {tong, soTS, sapHetBaoHiem, quaHanBaoHiem}} — chỉ tài sản đang bảo đảm. */
function tomTatBaoDamTheoHD_() {
  var kq = {}, today = homNayVN_();
  docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).forEach(function (r) {
    if (r.TrangThai !== TS_DANG_BAO_DAM) return;
    var k = String(r.MaHD), o = kq[k] || (kq[k] = { tong: 0, soTS: 0, sapHetBaoHiem: 0, quaHanBaoHiem: 0 });
    o.tong = congSoTien_(o.tong, Number(r.GiaTriVND) || 0); o.soTS++;
    var han = ngayIsoCuaO_(r.NgayHetHanBaoHiem);
    if (han) { var n = soNgayGiuaIso_(today, han); if (n < 0) o.quaHanBaoHiem++; else if (n <= NGAY_CB_BAO_HIEM_) o.sapHetBaoHiem++; }
  });
  return kq;
}
function layTaiSanBaoDam(maHD) {
  yeuCauDangNhap_();
  return taiSanBaoDam_(maHD);
}
function taiSanBaoDam_(maHD) {
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), today = homNayVN_();
  var rows = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (r) {
    var hd = tra.hd[String(r.MaHD)];
    if (maHD && String(r.MaHD) !== String(maHD)) return false;
    return hd && (!pv.length || pv.indexOf(String(hd.MaCty)) >= 0);
  }).map(function (r) {
    var hd = tra.hd[String(r.MaHD)] || {}, han = ngayIsoCuaO_(r.NgayHetHanBaoHiem), n = han ? soNgayGiuaIso_(today, han) : null;
    return { maTS: String(r.MaTS), maHD: String(r.MaHD), soHopDong: hd.SoHopDong || '', tenCty: (tra.cty[String(hd.MaCty)] || {}).TenCty || '', loai: r.LoaiTS, nhanLoai: LOAI_TAI_SAN_[r.LoaiTS] || r.LoaiTS,
      moTa: r.MoTa || '', giaTri: Number(r.GiaTriVND) || 0, ngayDinhGia: ngayIsoCuaO_(r.NgayDinhGia), soHDBaoDam: r.SoHDBaoDam || '', ngayHetHanBaoHiem: han,
      canhBaoBaoHiem: r.TrangThai !== TS_DANG_BAO_DAM || n === null ? '' : (n < 0 ? 'QUA_HAN' : (n <= NGAY_CB_BAO_HIEM_ ? 'SAP_HET' : '')), soNgayBaoHiem: n,
      trangThai: r.TrangThai, ghiChu: r.GhiChu || '', nguoiGhi: r.NguoiGhi || '' };
  }).sort(function (a, b) { return String(a.maTS).localeCompare(String(b.maTS)); });
  var tong = rows.filter(function (r) { return r.trangThai === TS_DANG_BAO_DAM; }).reduce(function (a, r) { return congSoTien_(a, r.giaTri); }, 0);
  return { rows: rows, tongGiaTriDangBaoDam: tong, loaiTaiSan: LOAI_TAI_SAN_ };
}
/** Đăng ký / sửa tài sản bảo đảm. maTS rỗng = tạo mới. */
function luuTaiSanBaoDam(tt) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    hopDongTrongPhamVi_(tt.maHD);
    var loai = String(tt.loai || ''), moTa = String(tt.moTa || '').trim(), me = layDanhTinh_().email || emailNguoiDung_();
    if (!LOAI_TAI_SAN_[loai]) throw new Error('Loại tài sản không hợp lệ.');
    if (moTa.length < 3 || moTa.length > 300) throw new Error('Mô tả tài sản phải từ 3 đến 300 ký tự.');
    var giaTri = docTienNguyen_(tt.giaTri, 'Giá trị tài sản');
    if (!(giaTri > 0)) throw new Error('Giá trị tài sản phải lớn hơn 0.');
    var ngayDG = tt.ngayDinhGia ? ngayChuanISO_(tt.ngayDinhGia, 'Ngày định giá', true) : '';
    var han = tt.ngayHetHanBaoHiem ? ngayChuanISO_(tt.ngayHetHanBaoHiem, 'Ngày hết hạn bảo hiểm', false) : '';
    var ghiChu = String(tt.ghiChu || '').trim().substring(0, 500), soHD = String(tt.soHDBaoDam || '').trim().substring(0, 80);
    var ds = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM), ma = String(tt.maTS || '').trim();
    if (ma) {
      var cu = ds.filter(function (r) { return String(r.MaTS) === ma; })[0];
      if (!cu) throw new Error('Không tìm thấy tài sản ' + ma + '.');
      if (cu.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp — không sửa.');
      capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', ma, { MaHD: tt.maHD, LoaiTS: loai, MoTa: lamSachCongThuc_(moTa), GiaTriVND: giaTri, NgayDinhGia: ngayDG, SoHDBaoDam: lamSachCongThuc_(soHD),
        NgayHetHanBaoHiem: han, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date() });
      ghiNhatKy_('', 'SUA_TAI_SAN_BAO_DAM', ma + ' | ' + loai + ' | ' + giaTri);
      return { maTS: ma, daSua: true };
    }
    ma = maBaoDamMoi_('TS', ds, 'MaTS');
    ghiDongMoi_(SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_, { MaTS: ma, MaHD: tt.maHD, LoaiTS: loai, MoTa: lamSachCongThuc_(moTa), GiaTriVND: giaTri, NgayDinhGia: ngayDG, SoHDBaoDam: lamSachCongThuc_(soHD),
      NgayHetHanBaoHiem: han, TrangThai: TS_DANG_BAO_DAM, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date() });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'THEM_TAI_SAN_BAO_DAM', ma + ' | ' + tt.maHD + ' | ' + loai + ' | ' + giaTri);
    return { maTS: ma, daSua: false };
  });
}
/** Giải chấp (không xoá): đổi trạng thái kèm lý do. */
function giaiChapTaiSan(maTS, lyDo) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (x) { return String(x.MaTS) === String(maTS); })[0];
    if (!r) throw new Error('Không tìm thấy tài sản ' + maTS + '.');
    hopDongTrongPhamVi_(r.MaHD);
    if (r.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp trước đó.');
    var ly = String(lyDo || '').trim(); if (ly.length < 3) throw new Error('Cần nhập lý do/chứng từ giải chấp (tối thiểu 3 ký tự).');
    capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', maTS, { TrangThai: TS_DA_GIAI_CHAP, GiaiChapLuc: new Date(), LyDoGiaiChap: lamSachCongThuc_(ly.substring(0, 500)), NguoiGhi: layDanhTinh_().email || emailNguoiDung_() });
    ghiNhatKy_('', 'GIAI_CHAP_TAI_SAN', maTS + ' | ' + ly);
    return { maTS: String(maTS), trangThai: TS_DA_GIAI_CHAP };
  });
}

/* ------------------------------ ĐIỀU KIỆN RÀNG BUỘC ------------------------------ */
var NHAN_RANG_BUOC_ = { DAT: 'Đạt', SAP_VI_PHAM: 'Sắp vi phạm', VI_PHAM: 'Vi phạm', CHUA_CO_DU_LIEU: 'Chưa có dữ liệu', QUA_HAN_CAP_NHAT: 'Quá hạn cập nhật' };
/** Đánh giá 1 chỉ tiêu. giaTri === null → chưa có. toanTu '<=' (không vượt ngưỡng) hoặc '>=' (không thấp hơn ngưỡng). Thuần, kiểm thử được. */
function danhGiaRangBuoc_(toanTu, nguong, giaTri) {
  if (giaTri === null || giaTri === undefined || !isFinite(giaTri)) return 'CHUA_CO_DU_LIEU';
  if (toanTu === '<=') {
    if (giaTri > nguong) return 'VI_PHAM';
    return giaTri >= nguong * (1 - BIEN_AN_TOAN_RB_) ? 'SAP_VI_PHAM' : 'DAT';
  }
  if (giaTri < nguong) return 'VI_PHAM';
  return giaTri <= nguong * (1 + BIEN_AN_TOAN_RB_) ? 'SAP_VI_PHAM' : 'DAT';
}
/** Giá trị tự tính theo loại; trả null khi không tính được. */
function giaTriTuDongRangBuoc_(loai, maHD, hanMucRow, baoDamRow, duNoVND) {
  if (loai === 'TY_LE_HAN_MUC') return hanMucRow > 0 ? Math.round(duNoVND / hanMucRow * 10000) / 100 : null;
  if (loai === 'TY_LE_VAY_TAI_SAN') return baoDamRow && baoDamRow.tong > 0 ? Math.round(duNoVND / baoDamRow.tong * 10000) / 100 : null;
  return null;
}
function layDieuKienRangBuoc(maHD) {
  yeuCauDangNhap_();
  return dieuKienRangBuoc_(maHD);
}
function dieuKienRangBuoc_(maHD, nc) {
  nc = nc || ngCanhQLV_(true);
  var tra = nc.kv.tra, pv = phamViCongTyNguoiDung_(), today = nc.today, kv = nc.kv, duNoHD = {}, bd = nc.baoDam;
  kv.rows.forEach(function (k) { duNoHD[k.maHD] = (duNoHD[k.maHD] || 0) + k.duNoVND; });
  var rows = docSheetBaoDam_(SHEET_RANG_BUOC).filter(function (r) {
    var hd = tra.hd[String(r.MaHD)];
    if (maHD && String(r.MaHD) !== String(maHD)) return false;
    return r.TrangThai !== 'Ngừng áp dụng' && hd && (!pv.length || pv.indexOf(String(hd.MaCty)) >= 0);
  }).map(function (r) {
    var hd = tra.hd[String(r.MaHD)] || {}, loai = String(r.Loai), nguong = Number(r.Nguong), toanTu = r.ToanTu === '>=' ? '>=' : '<=';
    var tuDong = loai !== 'THU_CONG', gt = tuDong ? giaTriTuDongRangBuoc_(loai, r.MaHD, Number(hd.HanMucVay) || 0, bd[String(r.MaHD)], duNoHD[String(r.MaHD)] || 0)
      : (String(r.GiaTri).trim() === '' ? null : Number(r.GiaTri));
    var ngayCN = tuDong ? today : ngayIsoCuaO_(r.NgayCapNhat), ky = Number(r.KyKiemTraNgay) || 0, tt = danhGiaRangBuoc_(toanTu, nguong, gt);
    if (!tuDong && tt !== 'CHUA_CO_DU_LIEU' && ky > 0 && ngayCN && soNgayGiuaIso_(ngayCN, today) > ky) tt = 'QUA_HAN_CAP_NHAT';
    return { maRB: String(r.MaRB), maHD: String(r.MaHD), soHopDong: hd.SoHopDong || '', tenCty: (tra.cty[String(hd.MaCty)] || {}).TenCty || '', tenChiTieu: r.TenChiTieu, loai: loai, nhanLoai: LOAI_RANG_BUOC_[loai] || loai,
      toanTu: toanTu, nguong: nguong, donVi: r.DonVi || '', kyKiemTraNgay: ky, giaTri: gt, ngayCapNhat: ngayCN, tuDong: tuDong, trangThai: tt, nhanTrangThai: NHAN_RANG_BUOC_[tt], ghiChu: r.GhiChu || '' };
  });
  var thuTu = { VI_PHAM: 0, SAP_VI_PHAM: 1, QUA_HAN_CAP_NHAT: 2, CHUA_CO_DU_LIEU: 3, DAT: 4 };
  rows.sort(function (a, b) { return (thuTu[a.trangThai] - thuTu[b.trangThai]) || String(a.soHopDong).localeCompare(String(b.soHopDong)); });
  var dem = {}; rows.forEach(function (r) { dem[r.trangThai] = (dem[r.trangThai] || 0) + 1; });
  return { rows: rows, dem: dem, loaiRangBuoc: LOAI_RANG_BUOC_ };
}
/** Khai báo / sửa điều kiện ràng buộc (QUẢN TRỊ). maRB rỗng = tạo mới. */
function luuDieuKienRangBuoc(tt) {
  yeuCauDangNhap_(); yeuCauQuanTri_('khai báo điều kiện ràng buộc');
  return voiKhoa_(function () {
    tt = tt || {};
    hopDongTrongPhamVi_(tt.maHD);
    var ten = String(tt.tenChiTieu || '').trim(), loai = String(tt.loai || ''), toanTu = String(tt.toanTu || '');
    if (ten.length < 3 || ten.length > 120) throw new Error('Tên chỉ tiêu phải từ 3 đến 120 ký tự.');
    if (!LOAI_RANG_BUOC_[loai]) throw new Error('Loại chỉ tiêu không hợp lệ.');
    if (toanTu !== '<=' && toanTu !== '>=') throw new Error('Toán tử phải là ≤ (không vượt) hoặc ≥ (không thấp hơn).');
    var nguong = docSoThuc_(tt.nguong, 'Ngưỡng', -1e9, 1e12);
    var ky = tt.kyKiemTraNgay === '' || tt.kyKiemTraNgay === undefined ? 0 : docSoThuc_(tt.kyKiemTraNgay, 'Kỳ kiểm tra (ngày)', 0, 3650);
    var donVi = String(tt.donVi || (loai === 'THU_CONG' ? '' : '%')).trim().substring(0, 20), me = layDanhTinh_().email || emailNguoiDung_();
    var ds = docSheetBaoDam_(SHEET_RANG_BUOC), ma = String(tt.maRB || '').trim();
    if (ma) {
      if (!ds.some(function (r) { return String(r.MaRB) === ma; })) throw new Error('Không tìm thấy điều kiện ' + ma + '.');
      capNhatDongTheoMa_(SHEET_RANG_BUOC, 'MaRB', ma, { MaHD: tt.maHD, TenChiTieu: lamSachCongThuc_(ten), Loai: loai, ToanTu: toanTu, Nguong: nguong, DonVi: lamSachCongThuc_(donVi), KyKiemTraNgay: ky,
        GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').substring(0, 500)), NguoiGhi: me, ThoiDiemGhi: new Date() });
      ghiNhatKy_('', 'SUA_RANG_BUOC', ma + ' | ' + ten);
      return { maRB: ma, daSua: true };
    }
    ma = maBaoDamMoi_('RB', ds, 'MaRB');
    ghiDongMoi_(SHEET_RANG_BUOC, COT_RANG_BUOC_, { MaRB: ma, MaHD: tt.maHD, TenChiTieu: lamSachCongThuc_(ten), Loai: loai, ToanTu: toanTu, Nguong: nguong, DonVi: lamSachCongThuc_(donVi), KyKiemTraNgay: ky,
      TrangThai: 'Đang áp dụng', GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').substring(0, 500)), NguoiGhi: me, ThoiDiemGhi: new Date() });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'THEM_RANG_BUOC', ma + ' | ' + tt.maHD + ' | ' + ten);
    return { maRB: ma, daSua: false };
  });
}
/** Cập nhật giá trị kỳ này cho chỉ tiêu nhập tay (NHẬP LIỆU trở lên). */
function capNhatGiaTriRangBuoc(maRB, giaTri, ngay, ghiChu) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_RANG_BUOC).filter(function (x) { return String(x.MaRB) === String(maRB) && x.TrangThai !== 'Ngừng áp dụng'; })[0];
    if (!r) throw new Error('Không tìm thấy điều kiện ' + maRB + '.');
    hopDongTrongPhamVi_(r.MaHD);
    if (r.Loai !== 'THU_CONG') throw new Error('Chỉ tiêu này tự tính từ dữ liệu hệ thống, không nhập tay.');
    var gt = docSoThuc_(giaTri, 'Giá trị', -1e9, 1e12), nay = ngayChuanISO_(ngay || homNayVN_(), 'Ngày ghi nhận', true);
    capNhatDongTheoMa_(SHEET_RANG_BUOC, 'MaRB', maRB, { GiaTri: gt, NgayCapNhat: nay, GhiChu: lamSachCongThuc_(String(ghiChu || r.GhiChu || '').substring(0, 500)), NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), ThoiDiemGhi: new Date() });
    ghiNhatKy_('', 'CAP_NHAT_RANG_BUOC', maRB + ' | ' + gt + ' | ' + nay);
    return { maRB: String(maRB), giaTri: gt, ngay: nay };
  });
}
/** Ngừng áp dụng (không xoá). */
function xoaDieuKienRangBuoc(maRB) {
  yeuCauDangNhap_(); yeuCauQuanTri_('ngừng áp dụng điều kiện ràng buộc');
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_RANG_BUOC).filter(function (x) { return String(x.MaRB) === String(maRB); })[0];
    if (!r) throw new Error('Không tìm thấy điều kiện ' + maRB + '.');
    hopDongTrongPhamVi_(r.MaHD);
    capNhatDongTheoMa_(SHEET_RANG_BUOC, 'MaRB', maRB, { TrangThai: 'Ngừng áp dụng', NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), ThoiDiemGhi: new Date() });
    ghiNhatKy_('', 'NGUNG_RANG_BUOC', String(maRB));
    return { maRB: String(maRB) };
  });
}
