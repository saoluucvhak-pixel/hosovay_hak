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
  var formula = '=GOOGLEFINANCE("CURRENCY:USDVND")';
  if (o.getFormula() !== formula) {
    o.setFormula(formula);
    SpreadsheetApp.flush();
  }
  var v = Number(o.getValue());
  if (!(v >= 1000 && v <= 100000)) throw new Error('GOOGLEFINANCE chưa trả về tỷ giá hợp lệ.');
  return Math.round(v);
}

/** Đọc đúng ngày, không gọi mạng. */
function tyGiaDaLuuTrongNgay_(ngay) {
  if (!getSS_().getSheetByName(SHEET_TY_GIA_THU_CONG)) return null;
  var r = sheetToObjects_(SHEET_TY_GIA_THU_CONG).filter(function (x) { return ngayIsoCuaO_(x.Ngay) === ngay; })[0];
  if (!r) return null;
  var ty = Number(r.TyGiaBan);
  if (!(ty >= 1000 && ty <= 100000)) throw new Error('Tỷ giá đã lưu ngày ' + ngay + ' không hợp lệ; cần kiểm tra dữ liệu.');
  return { ngay: ngay, tyGiaBan: ty, nguon: String(r.GhiChu || 'Nhập tay'), daCo: true, nguoiGhi: String(r.NguoiGhi || '') };
}

/** Khóa ngắn chỉ trong lúc ghi; luôn trả đúng giá thực sự được lưu. */
function ghiTyGiaTuDong_(ngay, ty, nguon, capNhatLai) {
  if (!(ty >= 1000 && ty <= 100000)) throw new Error('Tỷ giá không hợp lệ.');
  return voiKhoa_(function () {
    var cu = tyGiaDaLuuTrongNgay_(ngay);
    if (cu && !capNhatLai) return cu;
    if (cu && cu.nguoiGhi !== 'TU_DONG') throw new Error('Ngày này có tỷ giá nhập tay; không tự ghi đè.');
    var sh = ensureSheet_(getSS_(), SHEET_TY_GIA_THU_CONG, COT_TY_GIA_THU_CONG_);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    nguon = nguon || 'Vietcombank';
    var data = { Ngay: ngay, TyGiaBan: ty, GhiChu: 'Tự động: ' + nguon, NguoiGhi: 'TU_DONG', ThoiDiemGhi: new Date() };
    if (cu) {
      var values = sh.getDataRange().getValues(), col = headers.indexOf('Ngay');
      for (var i = 1; i < values.length; i++) {
        if (ngayIsoCuaO_(values[i][col]) !== ngay) continue;
        sh.getRange(i + 1, 1, 1, headers.length).setValues([headers.map(function (h, j) { return data[h] !== undefined ? data[h] : values[i][j]; })]);
        break;
      }
      ghiNhatKy_('TY_GIA', 'CAP_NHAT_TY_GIA', ngay + ' | ' + cu.tyGiaBan + ' -> ' + ty + ' | ' + nguon);
    } else {
      themDongVaoCuoiThat_(sh, headers.map(function (h) { return data[h] !== undefined ? data[h] : ''; }));
    }
    return { ngay: ngay, tyGiaBan: ty, nguon: nguon, daCo: false, capNhatLai: !!cu };
  });
}

/** Trigger giữ nguyên tên. Có tỷ giá hôm nay thì không gọi VCB/Google. */
function tuDongCapNhatTyGiaVCB() {
  return chayCapNhatTyGia_(false);
}

/** Chạy thủ công trong Apps Script khi cần làm mới giá tự động hôm nay. */
function capNhatLaiTyGiaVCB() {
  yeuCauDangNhap_();
  yeuCauQuanTri_('cập nhật lại tỷ giá');
  return chayCapNhatTyGia_(true);
}

function chayCapNhatTyGia_(lamMoi) {
  var batDau = Date.now(), ngay = homNayVN_(), cu = tyGiaDaLuuTrongNgay_(ngay);
  if (cu && !lamMoi) return cu;
  if (cu && cu.nguoiGhi !== 'TU_DONG') throw new Error('Ngày này có tỷ giá nhập tay; không tự ghi đè.');
  var moc = Date.now(), ty, nguon, loiVCB = '', thoiGian = {};
  try {
    var res = UrlFetchApp.fetch(TY_GIA_VCB_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('Vietcombank trả mã ' + res.getResponseCode());
    ty = phanTichTyGiaVCB_(res.getContentText());
    nguon = 'Vietcombank';
  } catch (e) { loiVCB = e.message || String(e); }
  finally { thoiGian.vcbMs = Date.now() - moc; }
  if (!nguon) {
    moc = Date.now();
    try {
      ty = layTyGiaGoogleFinance_();
      nguon = 'GOOGLEFINANCE (thị trường, không phải giá VCB)';
    } catch (e2) {
      throw new Error('Không lấy được tỷ giá. Vietcombank: ' + loiVCB + ' | GOOGLEFINANCE: ' + (e2.message || e2));
    } finally { thoiGian.googleMs = Date.now() - moc; }
  }
  // Lỗi ghi dữ liệu không được hiểu nhầm là lỗi VCB để chuyển sang nguồn khác.
  moc = Date.now();
  var kq = ghiTyGiaTuDong_(ngay, ty, nguon, lamMoi);
  thoiGian.ghiMs = Date.now() - moc;
  thoiGian.tongMs = Date.now() - batDau;
  kq.thoiGian = thoiGian;
  if (loiVCB) kq.canhBao = 'Vietcombank lỗi: ' + loiVCB;
  console.log('TY_GIA_TIMING ' + JSON.stringify(thoiGian));
  return kq;
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

