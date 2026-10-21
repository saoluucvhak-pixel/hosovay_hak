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
