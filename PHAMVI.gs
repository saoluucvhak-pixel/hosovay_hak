/**
 * PHẠM VI CÔNG TY (kiểm soát truy cập phía máy chủ).
 * Cổng HAK cấp cho mỗi người dùng danh sách công ty được phép (phamViCongTyNguoiDung_); rỗng = toàn hệ thống.
 * Mọi đường đọc/ghi hồ sơ theo mã đều đi qua layHoSoTheoMa_ → hồ sơ ngoài phạm vi bị từ chối bằng lỗi rõ ràng. Các danh sách dùng chung được lọc tại nguồn (docDanhSachHoSo_ và các hàm lấy danh mục).
 * Không dựa vào ẩn/hiện ở giao diện.
 */
function hoSoTrongPhamVi_(h, tra, pv) {
  pv = pv || phamViCongTyNguoiDung_();
  if (!pv.length) return true;
  if (!h) return false;
  tra = tra || layTraCuuDanhMuc_();
  var hd = tra.hd[String(h.MaHD)];
  return !!(hd && pv.indexOf(String(hd.MaCty)) >= 0);
}
function locHoSoTheoPhamVi_(rows) {
  var pv = phamViCongTyNguoiDung_();
  if (!pv.length) return rows;
  var tra = layTraCuuDanhMuc_();
  return (rows || []).filter(function (h) { return hoSoTrongPhamVi_(h, tra, pv); });
}
function locTheoCongTy_(rows) {
  var pv = phamViCongTyNguoiDung_();
  return pv.length ? (rows || []).filter(function (r) { return pv.indexOf(String(r.MaCty)) >= 0; }) : rows;
}
/** Chặn đọc theo mã hồ sơ ngoài phạm vi (mã không tồn tại thì giữ nguyên hành vi cũ của từng hàm). */
function chanNeuNgoaiPhamViHoSo_(maHoSo) {
  var pv = phamViCongTyNguoiDung_();
  if (!pv.length) return;
  var h = docCacDongTheoKhoaA_(SHEET_HOSO, maHoSo)[0];
  if (h && !hoSoTrongPhamVi_(h, null, pv)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + ' trong phạm vi công ty được cấp.');
}
function chanNeuNgoaiPhamViCongTy_(maCty) {
  var pv = phamViCongTyNguoiDung_();
  if (pv.length && pv.indexOf(String(maCty)) < 0) throw new Error('Công ty ' + maCty + ' nằm ngoài phạm vi được cấp.');
}

/**
 * Bộ lọc quyền cho DÒNG TÀI LIỆU (hoá đơn, dòng lương, tổng lương theo bộ phận, tệp đính kèm) — các dòng này chỉ mang MaHoSo, không mang công ty.
 * Trả null khi người dùng toàn hệ thống (không lọc). Người bị giới hạn công ty chỉ thấy dòng có MaHoSo thuộc hồ sơ trong phạm vi (kể cả hồ sơ xoá mềm).
 * Dòng CHƯA GẮN hồ sơ (MaHoSo trống) hoặc trỏ tới hồ sơ không tồn tại: ẩn — cùng quy tắc "không xác định được công ty thì từ chối" của hoSoTrongPhamVi_.
 * Mỗi giá trị truyền vào hàm lọc là một mã hồ sơ ứng viên (vd mã trên dòng + mã trên tệp gốc); mọi mã không trống đều phải trong phạm vi, và phải có ít nhất một mã.
 */
function boLocTaiLieuTheoPhamVi_() {
  if (!phamViCongTyNguoiDung_().length) return null;
  var duoc = {};
  docDanhSachHoSo_(true).forEach(function (h) { duoc[String(h.MaHoSo)] = true; });
  return function () {
    var co = false;
    for (var i = 0; i < arguments.length; i++) {
      var ma = String(arguments[i] === undefined || arguments[i] === null ? '' : arguments[i]).trim();
      if (!ma) continue;
      if (!duoc[ma]) return false;
      co = true;
    }
    return co;
  };
}
/** Lọc mảng dòng theo bộ lọc trên (null = giữ nguyên). layMa(dòng) → các mã hồ sơ ứng viên của dòng. */
function locTaiLieuTheoPhamVi_(rows, layMa) {
  var loc = boLocTaiLieuTheoPhamVi_();
  return loc ? (rows || []).filter(function (r) { return loc.apply(null, layMa(r)); }) : rows;
}
