/**
 * CAUHINH.GS — CẤU HÌNH HỆ THỐNG: số ngày nhắc trước hạn, quy ước ngày tính lãi (ACT/365 hoặc ACT/360).
 * Lưu ở sheet CauHinhHeThong (Khoa, GiaTri, CapNhatLuc, CapNhatBoi). Thiếu dòng thì dùng mặc định.
 */
var SHEET_CAU_HINH = 'CauHinhHeThong';
var COT_CAU_HINH_ = ['Khoa', 'GiaTri', 'CapNhatLuc', 'CapNhatBoi'];
var CAU_HINH_MAC_DINH_ = { NGAY_NHAC_TRUOC_HAN: '7', QUY_UOC_NGAY_LAI: 'ACT/365' };

/** Giá trị cấu hình (chuỗi). Không có sheet/dòng thì trả mặc định. */
function layCauHinh_(khoa) {
  var macDinh = CAU_HINH_MAC_DINH_[khoa];
  if (!getSS_().getSheetByName(SHEET_CAU_HINH)) return macDinh;
  var r = sheetToObjects_(SHEET_CAU_HINH).filter(function (x) { return String(x.Khoa) === khoa; })[0];
  return r && String(r.GiaTri).trim() !== '' ? String(r.GiaTri).trim() : macDinh;
}
/** Đọc cấu hình cho màn hình Cài đặt (chỉ đọc). */
function layThietLapNhacNo() {
  yeuCauDangNhap_();
  return { ngayNhacTruocHan: Number(layCauHinh_('NGAY_NHAC_TRUOC_HAN')) || 7, quyUocNgayLai: layCauHinh_('QUY_UOC_NGAY_LAI') };
}
/** Lưu cấu hình. Chỉ quản trị. */
function luuThietLapNhacNo(tt) {
  yeuCauQuanTri_('thay đổi cấu hình hệ thống');
  return voiKhoa_(function () {
    tt = tt || {};
    var nhac = Math.round(Number(tt.ngayNhacTruocHan));
    if (!(nhac >= 1 && nhac <= 60)) throw new Error('Số ngày nhắc trước hạn phải từ 1 đến 60.');
    var quyUoc = String(tt.quyUocNgayLai || '');
    if (['ACT/365', 'ACT/360'].indexOf(quyUoc) < 0) throw new Error('Quy ước tính lãi phải là ACT/365 hoặc ACT/360.');
    var sh = ensureSheet_(getSS_(), SHEET_CAU_HINH, COT_CAU_HINH_);
    var me = layDanhTinh_().email || emailNguoiDung_(), now = new Date();
    var gia = { NGAY_NHAC_TRUOC_HAN: String(nhac), QUY_UOC_NGAY_LAI: quyUoc };
    Object.keys(gia).forEach(function (khoa) {
      var last = sh.getLastRow(), vals = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [], row = -1;
      for (var i = 0; i < vals.length; i++) if (String(vals[i][0]) === khoa) { row = i + 2; break; }
      if (row < 0) {
        var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        themDongVaoCuoiThat_(sh, headers.map(function (h) { return { Khoa: khoa, GiaTri: gia[khoa], CapNhatLuc: now, CapNhatBoi: me }[h] ?? ''; }));
      } else {
        sh.getRange(row, 2).setValue(gia[khoa]); sh.getRange(row, 3).setValue(now); sh.getRange(row, 4).setValue(me);
      }
    });
    SpreadsheetApp.flush();
    ghiNhatKy_('CAU_HINH', 'CAP_NHAT', 'nhắc ' + nhac + ' ngày; ' + quyUoc);
    return { ngayNhacTruocHan: nhac, quyUocNgayLai: quyUoc };
  });
}
