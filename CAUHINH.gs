/**
 * CAUHINH.GS — CẤU HÌNH HỆ THỐNG: số ngày nhắc trước hạn, quy ước ngày tính lãi (ACT/365 hoặc ACT/360).
 * Lưu ở sheet CauHinhHeThong (Khoa, GiaTri, CapNhatLuc, CapNhatBoi). Thiếu dòng thì dùng mặc định.
 */
var SHEET_CAU_HINH = 'CauHinhHeThong';
var COT_CAU_HINH_ = ['Khoa', 'GiaTri', 'CapNhatLuc', 'CapNhatBoi'];
var CAU_HINH_MAC_DINH_ = {
  NGAY_NHAC_TRUOC_HAN: '7', QUY_UOC_NGAY_LAI: 'ACT/365',
  // Quản lý vay (xem QLV_ bên dưới)
  CHAN_VUOT_HAN_MUC: '1', NGUONG_CB_HAN_MUC_1: '80', NGUONG_CB_HAN_MUC_2: '95', BAT_DUYET_HAI_CAP: '0',
  THU_TU_PHAN_BO: 'PHAT,LAI,GOC', TY_LE_LAI_QUA_HAN: '150', LAI_CHAM_TRA_NAM: '0',
  NHAC_EMAIL_BAT: '0', NHAC_EMAIL_NHAN: '', NHAC_CALENDAR_BAT: '0'
};

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


/* ===================== CẤU HÌNH QUẢN LÝ VAY (hạn mức, duyệt hai cấp, phân bổ tiền trả, nhắc nợ) ===================== */
var EMAIL_HOP_LE_ = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
/** Chuẩn hoá + kiểm tra từng khoá; trả về chuỗi lưu hoặc ném lỗi tiếng Việt. */
var KIEM_TRA_CAU_HINH_QLV_ = {
  CHAN_VUOT_HAN_MUC: function (v) { return soCo_(v, 'Chặn giải ngân vượt hạn mức'); },
  BAT_DUYET_HAI_CAP: function (v) { return soCo_(v, 'Bắt buộc duyệt hai cấp'); },
  NHAC_EMAIL_BAT: function (v) { return soCo_(v, 'Gửi email nhắc nợ'); },
  NHAC_CALENDAR_BAT: function (v) { return soCo_(v, 'Tạo sự kiện Google Calendar'); },
  NGUONG_CB_HAN_MUC_1: function (v) { return soTrongKhoang_(v, 50, 99, 'Ngưỡng lưu ý hạn mức (%)'); },
  NGUONG_CB_HAN_MUC_2: function (v) { return soTrongKhoang_(v, 51, 100, 'Ngưỡng cảnh báo cao hạn mức (%)'); },
  TY_LE_LAI_QUA_HAN: function (v) { return soTrongKhoang_(v, 100, 300, 'Lãi suất quá hạn (% của lãi trong hạn)'); },
  LAI_CHAM_TRA_NAM: function (v) { return soTrongKhoang_(v, 0, 50, 'Lãi chậm trả lãi (%/năm)'); },
  THU_TU_PHAN_BO: function (v) {
    var ds = String(v || '').toUpperCase().split(/[\s,>]+/).filter(Boolean);
    if (ds.length !== 3 || ['PHAT', 'LAI', 'GOC'].some(function (k) { return ds.indexOf(k) < 0; })) throw new Error('Thứ tự phân bổ tiền trả phải gồm đủ 3 mục PHAT, LAI, GOC (mỗi mục một lần), ví dụ PHAT,LAI,GOC.');
    return ds.join(',');
  },
  NHAC_EMAIL_NHAN: function (v) {
    var ds = String(v || '').split(/[,;\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (ds.length > 10) throw new Error('Tối đa 10 địa chỉ email nhận nhắc nợ.');
    ds.forEach(function (e) { if (!EMAIL_HOP_LE_.test(e) || e.length > 120) throw new Error('Email không hợp lệ: ' + e); });
    return ds.join(',');
  }
};
function soCo_(v, ten) {
  var s = String(v === true ? '1' : (v === false ? '0' : v)).trim();
  if (s !== '0' && s !== '1') throw new Error(ten + ' phải là bật (1) hoặc tắt (0).');
  return s;
}
function soTrongKhoang_(v, tu, den, ten) {
  var n = Number(String(v).replace(',', '.'));
  if (!isFinite(n) || String(v).trim() === '' || n < tu || n > den) throw new Error(ten + ' phải từ ' + tu + ' đến ' + den + '.');
  return String(Math.round(n * 100) / 100);
}
/** Cấu hình quản lý vay (mọi người đã đăng nhập xem được; chỉ quản trị lưu). */
function layThietLapQuanLyVay() {
  yeuCauDangNhap_();
  var o = {};
  Object.keys(KIEM_TRA_CAU_HINH_QLV_).forEach(function (k) { o[k] = layCauHinh_(k); });
  return o;
}
function luuThietLapQuanLyVay(tt) {
  yeuCauDangNhap_(); yeuCauQuanTri_('thay đổi cấu hình quản lý vay');
  return voiKhoa_(function () {
    tt = tt || {};
    var gia = {};
    Object.keys(tt).forEach(function (k) {
      if (!KIEM_TRA_CAU_HINH_QLV_.hasOwnProperty(k)) throw new Error('Khoá cấu hình không hợp lệ: ' + k);
      gia[k] = KIEM_TRA_CAU_HINH_QLV_[k](tt[k]);
    });
    var g1 = Number(gia.NGUONG_CB_HAN_MUC_1 !== undefined ? gia.NGUONG_CB_HAN_MUC_1 : layCauHinh_('NGUONG_CB_HAN_MUC_1')), g2 = Number(gia.NGUONG_CB_HAN_MUC_2 !== undefined ? gia.NGUONG_CB_HAN_MUC_2 : layCauHinh_('NGUONG_CB_HAN_MUC_2'));
    if (!(g1 < g2)) throw new Error('Ngưỡng lưu ý hạn mức phải nhỏ hơn ngưỡng cảnh báo cao.');
    if ((gia.NHAC_EMAIL_BAT === '1' || (gia.NHAC_EMAIL_BAT === undefined && layCauHinh_('NHAC_EMAIL_BAT') === '1')) &&
      !(gia.NHAC_EMAIL_NHAN !== undefined ? gia.NHAC_EMAIL_NHAN : layCauHinh_('NHAC_EMAIL_NHAN'))) throw new Error('Bật gửi email nhắc nợ thì phải nhập ít nhất một email nhận.');
    var sh = ensureSheet_(getSS_(), SHEET_CAU_HINH, COT_CAU_HINH_);
    var me = layDanhTinh_().email || emailNguoiDung_(), now = new Date(), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    Object.keys(gia).forEach(function (khoa) {
      var last = sh.getLastRow(), vals = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues() : [], row = -1;
      for (var i = 0; i < vals.length; i++) if (String(vals[i][0]) === khoa) { row = i + 2; break; }
      if (row < 0) themDongVaoCuoiThat_(sh, headers.map(function (h) { var o = { Khoa: khoa, GiaTri: gia[khoa], CapNhatLuc: now, CapNhatBoi: me }; return o[h] !== undefined ? o[h] : ''; }));
      else { sh.getRange(row, 2).setValue(gia[khoa]); sh.getRange(row, 3).setValue(now); sh.getRange(row, 4).setValue(me); }
    });
    SpreadsheetApp.flush();
    ghiNhatKy_('CAU_HINH', 'CAP_NHAT_QLV', Object.keys(gia).map(function (k) { return k + '=' + gia[k]; }).join('; ').substring(0, 400));
    return layThietLapQuanLyVay();
  });
}
