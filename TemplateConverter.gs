/**
 * TEMPLATECONVERTER.GS
 * Chuyển file Office (DOCX/XLSX) sang định dạng Google (Docs/Sheets) qua Drive API (Advanced Service "Drive" v2) — dùng cho
 * (1) xuất PDF, (2) "Mở bằng Google Docs/Sheets". Việc điền dữ liệu KHÔNG đi qua Google Docs (xem DocumentRenderer.gs) vì
 * chuyển đổi qua Google có thể làm lệch bố cục; Google chỉ là bước cuối để xuất PDF/xem.
 */

var MIME_GOOGLE_ = { docx: 'application/vnd.google-apps.document', xlsx: 'application/vnd.google-apps.spreadsheet' };

/** Tạo bản Google Docs/Sheets từ 1 file Office. Trả về id bản Google (tạo tạm; người gọi chịu trách nhiệm xoá nếu là bản tạm). */
function chuyenSangGoogle_(tepOffice) {
  var loai = loaiFileTuTen_(tepOffice.getName()) || 'docx';
  var tam = Drive.Files.insert({ title: 'G_' + tepOffice.getName().replace(/\.(docx|xlsx)$/i, ''), mimeType: MIME_GOOGLE_[loai] }, tepOffice.getBlob(), { convert: true });
  return tam.id;
}

/** DOCX/XLSX -> bản Google trung gian -> PDF lưu vào `thuMuc`; xoá bản trung gian. Lỗi PDF không làm mất file chính. */
function xuatPdfTuTepOffice_(tepOffice, thuMuc, tenPdf) {
  var idTam = null;
  try {
    idTam = chuyenSangGoogle_(tepOffice);
    var pdfBlob = DriveApp.getFileById(idTam).getAs('application/pdf').setName(tenPdf);
    var pdf = thuMuc.createFile(pdfBlob);
    return { url: pdf.getUrl(), id: pdf.getId(), loi: '' };
  } catch (e) {
    return { url: '', id: '', loi: e.message };
  } finally {
    if (idTam) { try { DriveApp.getFileById(idTam).setTrashed(true); } catch (e2) { /* bỏ qua */ } }
  }
}

/**
 * "Mở bằng Google Docs/Sheets" cho 1 tài liệu đã phát hành: tạo BẢN SAO Google trong thư mục GoogleBanSao của hồ sơ
 * (không đụng file đã phát hành). Dùng lại bản đã tạo nếu có.
 */
function moBanGoogleCuaTaiLieu(maTaiLieu) {
  yeuCauDangNhap_();
  var r = sheetToObjects_(SHEET_LICH_SU_PHAT_HANH).filter(function (x) { return x.MaTaiLieu === maTaiLieu; })[0];
  if (!r) throw new Error('Không tìm thấy tài liệu ' + maTaiLieu + '.');
  if (!r.FileIdChinh) throw new Error('Tài liệu này không có file Office để mở bằng Google (chỉ có bản tạo bằng biểu mẫu mặc định — dùng link gốc).');
  var thuMuc = thuMucCon_(layThuMucHoSo_(r.MaHoSo), 'GoogleBanSao');
  var ten = 'G_' + r.MaTaiLieu;
  var it = thuMuc.getFilesByName ? thuMuc.getFilesByName(ten) : null;
  if (it && it.hasNext()) return { url: it.next().getUrl(), moi: false };
  var tep = DriveApp.getFileById(r.FileIdChinh);
  var id = chuyenSangGoogle_(tep);
  var f = DriveApp.getFileById(id);
  f.setName(ten);
  thuMuc.addFile(f);
  try { DriveApp.getRootFolder().removeFile(f); } catch (e) { /* bỏ qua */ }
  ghiNhatKy_(r.MaHoSo, 'MO_BAN_GOOGLE', maTaiLieu + ' -> ' + f.getUrl());
  return { url: f.getUrl(), moi: true };
}
