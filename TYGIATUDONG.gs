/**
 * TYGIATUDONG.GS — TỰ ĐỘNG LẤY TỶ GIÁ USD (BẢNG TỶ GIÁ VIETCOMBANK) MỖI NGÀY, GHI VÀO TyGiaThuCong.
 *
 * LƯU Ý: đây là tỷ giá Vietcombank, không phải BIDV. Địa chỉ và định dạng cần kiểm tra một lần
 * (chạy thử tuDongCapNhatTyGiaVCB từ trình soạn Apps Script rồi xem sheet TyGiaThuCong).
 * Hàm KHÔNG ghi gì nếu định dạng không đúng mong đợi — báo lỗi thay vì ghi số sai.
 */
var TY_GIA_VCB_URL = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx';

/** Phân tích XML bảng tỷ giá: trả về tỷ giá bán USD (số nguyên VND) hoặc ném lỗi. Hàm thuần, không gọi mạng. */
function phanTichTyGiaVCB_(xmlText) {
  var text = String(xmlText || '');
  var tag = text.match(/<Exrate\b[^>]*CurrencyCode="USD"[^>]*>/);
  if (!tag) throw new Error('Không tìm thấy dòng USD trong bảng tỷ giá Vietcombank (định dạng có thể đã đổi).');
  var sell = tag[0].match(/\bSell="([^"]+)"/);
  if (!sell) throw new Error('Dòng USD không có giá bán (Sell).');
  var ty = Math.round(Number(sell[1].replace(/,/g, '')));
  if (!(ty >= 1000 && ty <= 100000)) throw new Error('Tỷ giá USD đọc được không hợp lý: ' + sell[1]);
  return ty;
}

var SHEET_NGUON_GOOGLE = 'NguonTyGiaGoogle';

/**
 * Dự phòng khi không đọc được Vietcombank: GOOGLEFINANCE trong một ô của sheet phụ.
 * Đây là tỷ giá THỊ TRƯỜNG (không phải giá bán của ngân hàng), nên được ghi rõ nguồn trong GhiChu.
 */
function layTyGiaGoogleFinance_() {
  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_NGUON_GOOGLE) || ss.insertSheet(SHEET_NGUON_GOOGLE);
  var o = sh.getRange('A1');
  o.setFormula('=GOOGLEFINANCE("CURRENCY:USDVND")');
  SpreadsheetApp.flush();
  var v = Number(o.getValue());
  if (!(v >= 1000 && v <= 100000)) throw new Error('GOOGLEFINANCE chưa trả về tỷ giá hợp lệ.');
  return Math.round(v);
}

/** Ghi tỷ giá tự động cho một ngày (không cần phiên đăng nhập; dùng cho lịch chạy nền). Bỏ qua nếu đã có ngày đó. */
function ghiTyGiaTuDong_(ngay, ty, nguon) {
  var ss = getSS_();
  var ds = ss.getSheetByName(SHEET_TY_GIA_THU_CONG) ? sheetToObjects_(SHEET_TY_GIA_THU_CONG) : [];
  if (ds.some(function (r) { return ngayIsoCuaO_(r.Ngay) === ngay; })) return { ngay: ngay, tyGiaBan: ty, daCo: true };
  var sh = ensureSheet_(ss, SHEET_TY_GIA_THU_CONG, COT_TY_GIA_THU_CONG_);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  themDongVaoCuoiThat_(sh, headers.map(function (h) {
    return { Ngay: ngay, TyGiaBan: ty, GhiChu: 'Tự động: ' + (nguon || 'Vietcombank'), NguoiGhi: 'TU_DONG', ThoiDiemGhi: new Date() }[h] ?? '';
  }));
  return { ngay: ngay, tyGiaBan: ty, daCo: false };
}

/**
 * Hàm chính cho lịch chạy hằng ngày (hoặc chạy thử tay).
 * Ưu tiên Vietcombank; nếu lỗi thì dùng GOOGLEFINANCE (ghi rõ nguồn). Cả hai lỗi thì không ghi gì.
 */
function tuDongCapNhatTyGiaVCB() {
  var ngay = homNayVN_();
  var loiVCB = '';
  try {
    var res = UrlFetchApp.fetch(TY_GIA_VCB_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('Vietcombank trả mã ' + res.getResponseCode());
    var tyVCB = phanTichTyGiaVCB_(res.getContentText());
    ghiTyGiaTuDong_(ngay, tyVCB, 'Vietcombank');
    return { ngay: ngay, tyGiaBan: tyVCB, nguon: 'Vietcombank' };
  } catch (e) {
    loiVCB = e.message || String(e);
  }
  try {
    var tyGG = layTyGiaGoogleFinance_();
    ghiTyGiaTuDong_(ngay, tyGG, 'GOOGLEFINANCE (thị trường, không phải giá VCB)');
    return { ngay: ngay, tyGiaBan: tyGG, nguon: 'GOOGLEFINANCE', canhBao: 'Vietcombank lỗi: ' + loiVCB };
  } catch (e2) {
    throw new Error('Không lấy được tỷ giá. Vietcombank: ' + loiVCB + ' | GOOGLEFINANCE: ' + (e2.message || e2));
  }
}

/** Tỷ giá mới nhất đã lưu để hiển thị (đọc sheet, không gọi mạng). */
function layTyGiaHienThi() {
  yeuCauDangNhap_();
  return layTyGiaThuCongMoiNhat_(); // {ngay, tyGiaBan, nguon, ghiLuc, soNgayCu, trangThai: MOI|CU, canhBao} hoặc null khi chưa có
}

/** Tạo lịch chạy hằng ngày lúc 9h sáng. Chỉ quản trị chạy một lần. */
function taoLichTuDongTyGia() {
  yeuCauQuanTri_('tạo lịch tự động tỷ giá');
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tuDongCapNhatTyGiaVCB') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tuDongCapNhatTyGiaVCB').timeBased().everyDays(1).atHour(9).create();
  return { ok: true, moTa: 'Mỗi ngày lúc 9h sáng, tự ghi tỷ giá USD vào TyGiaThuCong.' };
}
