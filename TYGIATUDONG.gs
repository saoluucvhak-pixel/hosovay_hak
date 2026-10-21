/**
 * TYGIATUDONG.GS — TỰ ĐỘNG LẤY TỶ GIÁ USD/VND TỪ GOOGLE (GOOGLEFINANCE) MỖI NGÀY, GHI VÀO TyGiaThuCong.
 *
 * Đây là tỷ giá THỊ TRƯỜNG của Google, KHÔNG phải giá bán của ngân hàng; nguồn được ghi rõ trong cột GhiChu.
 * THIẾT KẾ KHÔNG CHỜ (không flush/sleep/retry): GOOGLEFINANCE là công thức của Google Sheets, tính xong lúc nào không đoán được,
 * nên script KHÔNG đứng chờ kết quả. Thay vào đó chia 2 bước:
 *   1) chuanBiTyGiaGoogle (trình kích hoạt 8h): ghi công thức vào ô A1 của sheet NguonTyGiaGoogle (đổi nội dung công thức để buộc Google tính lại)
 *      và ghi thời điểm ở B1 — rồi kết thúc ngay.
 *   2) tuDongCapNhatTyGiaVCB (trình kích hoạt 9h; tên cũ được giữ để không mất trình kích hoạt đang có): chỉ ĐỌC ô A1.
 *      Giá trị hợp lệ và còn mới (< 12 giờ) → ghi tỷ giá của hôm nay. Chưa tính xong / quá cũ / lỗi → KHÔNG ghi gì, chuẩn bị lại cho lần sau.
 * Ngày đã có tỷ giá thì không làm gì; tỷ giá nhập tay không bao giờ bị ghi đè.
 */
var SHEET_NGUON_GOOGLE = 'NguonTyGiaGoogle';
var NGUON_GOOGLE_ = 'GOOGLEFINANCE (tỷ giá thị trường Google, không phải giá bán ngân hàng)';
var TY_GIA_GOOGLE_TOI_DA_GIO_ = 12;      // giá trị đọc được cũ hơn mức này thì không dùng
var TY_GIA_GOOGLE_DANG_TINH_PHUT_ = 10;  // trong khoảng này sau khi chuẩn bị, chưa có giá trị = "đang tính", không phải lỗi

/**
 * Hàm thuần: đánh giá nội dung ô A1 và thời điểm chuẩn bị (ms). Không gọi dịch vụ Google.
 * @return {{trangThai:'OK'|'DANG_TINH'|'CU'|'LOI'|'CHUA_CHUAN_BI', ty:number, tuoiPhut:number}}
 */
function danhGiaTyGiaGoogle_(giaTri, chuanBiLucMs, bayGioMs) {
  var chuanBi = Number(chuanBiLucMs), ty = Number(giaTri);
  if (!(chuanBi > 0)) return { trangThai: 'CHUA_CHUAN_BI', ty: 0, tuoiPhut: 0 };
  var tuoi = Math.max(0, ((bayGioMs === undefined ? Date.now() : bayGioMs) - chuanBi) / 60000);
  var hopLe = typeof giaTri !== 'boolean' && String(giaTri).trim() !== '' && isFinite(ty) && ty >= 1000 && ty <= 100000;
  if (hopLe) return { trangThai: tuoi > TY_GIA_GOOGLE_TOI_DA_GIO_ * 60 ? 'CU' : 'OK', ty: Math.round(ty), tuoiPhut: Math.round(tuoi) };
  return { trangThai: tuoi < TY_GIA_GOOGLE_DANG_TINH_PHUT_ ? 'DANG_TINH' : 'LOI', ty: 0, tuoiPhut: Math.round(tuoi) };
}

/** Ghi công thức (nội dung đổi mỗi lần để Google tính lại) + thời điểm chuẩn bị. KHÔNG flush, KHÔNG chờ. */
function datCongThucTyGiaGoogle_() {
  var ss = getSS_(), sh = ss.getSheetByName(SHEET_NGUON_GOOGLE) || ss.insertSheet(SHEET_NGUON_GOOGLE), bayGio = Date.now();
  sh.getRange('A1').setFormula('=GOOGLEFINANCE("CURRENCY:USDVND")+0*' + (bayGio % 100000));
  sh.getRange('B1').setValue(bayGio);
  sh.getRange('A2').setValue('Ô A1: tỷ giá USD/VND từ GOOGLEFINANCE (tự quản lý bởi ứng dụng, không sửa tay). Ô B1: thời điểm chuẩn bị (ms).');
  return bayGio;
}

/** Đọc A1/B1 (không tính lại, không chờ). */
function docTyGiaGoogle_() {
  var sh = getSS_().getSheetByName(SHEET_NGUON_GOOGLE);
  if (!sh) return { trangThai: 'CHUA_CHUAN_BI', ty: 0, tuoiPhut: 0 };
  return danhGiaTyGiaGoogle_(sh.getRange('A1').getValue(), sh.getRange('B1').getValue());
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
    nguon = nguon || NGUON_GOOGLE_;
    var sh = ensureSheet_(getSS_(), SHEET_TY_GIA_THU_CONG, COT_TY_GIA_THU_CONG_);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
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

/** Trình kích hoạt 8h: chỉ chuẩn bị công thức, kết thúc ngay (không chờ Google). */
function chuanBiTyGiaGoogle() {
  var t = datCongThucTyGiaGoogle_();
  console.log('TY_GIA_CHUAN_BI ' + new Date(t).toISOString());
  return { ok: true, chuanBiLuc: t };
}

/** Trình kích hoạt 9h (tên cũ giữ nguyên): đọc A1 và ghi tỷ giá hôm nay nếu hợp lệ + còn mới. */
function tuDongCapNhatTyGiaVCB() {
  return chayCapNhatTyGia_(false);
}

/** Chạy tay (quản trị) khi cần làm mới: đọc giá hiện có; nếu chưa có/quá cũ thì chuẩn bị lại — chạy lại sau khoảng 1–2 phút. */
function capNhatLaiTyGiaVCB() {
  yeuCauDangNhap_();
  yeuCauQuanTri_('cập nhật lại tỷ giá');
  return chayCapNhatTyGia_(true);
}

function chayCapNhatTyGia_(lamMoi) {
  var batDau = Date.now(), ngay = homNayVN_(), cu = tyGiaDaLuuTrongNgay_(ngay);
  if (cu && !lamMoi) return cu;
  if (cu && cu.nguoiGhi !== 'TU_DONG') throw new Error('Ngày này có tỷ giá nhập tay; không tự ghi đè.');
  var g = docTyGiaGoogle_(), kq;
  if (g.trangThai === 'OK') {
    kq = ghiTyGiaTuDong_(ngay, g.ty, NGUON_GOOGLE_, lamMoi);
    kq.tuoiPhut = g.tuoiPhut;
  } else {
    // Không ghi số sai/cũ. Chuẩn bị lại để lần chạy sau (hoặc chạy tay sau 1–2 phút) có giá trị mới.
    var dangTinh = g.trangThai === 'DANG_TINH';
    if (!dangTinh) datCongThucTyGiaGoogle_();
    kq = { chuaCapNhat: true, trangThaiGoogle: g.trangThai, ngay: ngay,
      huongDan: dangTinh ? 'Google đang tính tỷ giá; chạy lại sau 1–2 phút.' :
        'Chưa có tỷ giá Google hợp lệ (' + g.trangThai + '). Đã yêu cầu Google tính lại; chạy lại sau 1–2 phút. Trong lúc chờ có thể nhập tay.' };
  }
  kq.thoiGian = { tongMs: Date.now() - batDau };
  console.log('TY_GIA_KET_QUA ' + JSON.stringify({ trangThai: g.trangThai, tuoiPhut: g.tuoiPhut, ghi: !kq.chuaCapNhat, tongMs: kq.thoiGian.tongMs }));
  return kq;
}

/** Tỷ giá mới nhất đã lưu để hiển thị (đọc sheet, không gọi mạng). */
function layTyGiaHienThi() {
  yeuCauDangNhap_();
  return layTyGiaThuCongMoiNhat_(); // {ngay, tyGiaBan, nguon, ghiLuc, soNgayCu, trangThai: MOI|CU, canhBao} hoặc null khi chưa có
}

/** Tạo lịch: 8h chuẩn bị công thức, 9h ghi tỷ giá. Chỉ quản trị chạy một lần (thay thế lịch cũ). */
function taoLichTuDongTyGia() {
  yeuCauQuanTri_('tạo lịch tự động tỷ giá');
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'tuDongCapNhatTyGiaVCB' || h === 'chuanBiTyGiaGoogle') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('chuanBiTyGiaGoogle').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('tuDongCapNhatTyGiaVCB').timeBased().everyDays(1).atHour(9).create();
  return { ok: true, moTa: 'Mỗi ngày 8h chuẩn bị công thức GOOGLEFINANCE, 9h ghi tỷ giá USD vào TyGiaThuCong (nguồn: Google, tỷ giá thị trường).' };
}
