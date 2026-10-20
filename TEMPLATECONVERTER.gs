/**
 * TEMPLATECONVERTER.GS
 * Chuyển file Office (DOCX/XLSX) sang định dạng Google (Docs/Sheets) qua Drive API (Advanced Service "Drive" v2) — dùng cho
 * (1) xuất PDF, (2) "Mở bằng Google Docs/Sheets". Việc điền dữ liệu KHÔNG đi qua Google Docs (xem DocumentRenderer.gs) vì
 * chuyển đổi qua Google có thể làm lệch bố cục; Google chỉ là bước cuối để xuất PDF/xem.
 */

var MIME_GOOGLE_ = { docx: 'application/vnd.google-apps.document', xlsx: 'application/vnd.google-apps.spreadsheet' };

/** Chỉ áp dụng ép một trang khi chính mẫu XLSX một sheet yêu cầu điều đó. */
function tuyChonPdfMotTrangXlsx_(parts) {
  var sheets = parts.filter(function (p) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(p.getName()); });
  if (sheets.length !== 1) return null;
  var xml = sheets[0].getDataAsString();
  var fit = /<pageSetUpPr\b[^>]*\bfitToPage="(?:1|true)"/.test(xml);
  var setup = (/<pageSetup\b[^>]*\/?\s*>/.exec(xml) || [''])[0];
  if (!fit || xlsxThuocTinh_(setup, 'fitToHeight') !== '1' || xlsxThuocTinh_(setup, 'fitToWidth') !== '1') return null;
  var paper = xlsxThuocTinh_(setup, 'paperSize');
  if (paper !== '9') return null; // chỉ A4 đã được kiểm chứng; khổ khác giữ đường xuất cũ.
  var margins = (/<pageMargins\b[^>]*\/?\s*>/.exec(xml) || [''])[0];
  var result = { format: 'pdf', size: 'A4', scale: '4', portrait: xlsxThuocTinh_(setup, 'orientation') === 'landscape' ? 'false' : 'true',
    gridlines: 'false', sheetnames: 'false', printtitle: 'false', pagenum: 'UNDEFINED', attachment: 'true' };
  ['top','bottom','left','right'].forEach(function (key) {
    var v = xlsxThuocTinh_(margins, key);
    if (v !== '' && isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 2) result[key + '_margin'] = v;
  });
  return result;
}

function pdfTuBanGoogle_(id, tepOffice) {
  if (loaiFileTuTen_(tepOffice.getName()) !== 'xlsx') return DriveApp.getFileById(id).getAs('application/pdf');
  var options = tuyChonPdfTheoMauXlsx_(Utilities.unzip(tepOffice.getBlob().setContentType('application/zip')));
  if (!options) return DriveApp.getFileById(id).getAs('application/pdf');
  SpreadsheetApp.flush();
  var query = Object.keys(options).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(options[k]); }).join('&');
  var response = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/export?' + query,
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  var blob = response.getBlob();
  if (response.getResponseCode() !== 200 || String(blob.getContentType()).split(';')[0] !== 'application/pdf') {
    throw new Error('Xuất PDF theo thiết lập một trang thất bại (HTTP ' + response.getResponseCode() + '). Không dùng bản PDF sai thiết lập thay thế.');
  }
  return blob;
}

/** Bảng kê A4 ngang: vừa chiều rộng, cho phép nhiều trang theo chiều cao. */
function tuyChonPdfTheoMauXlsx_(parts) {
  var motTrang = tuyChonPdfMotTrangXlsx_(parts);
  if (motTrang) return motTrang;
  var sheets = parts.filter(function (p) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(p.getName()); });
  if (sheets.length > 1) {
    var pages = sheets.map(function (s) { return tuyChonPdfMotTrangXlsx_([s]); });
    if (pages.every(function (o) { return o && JSON.stringify(o) === JSON.stringify(pages[0]); })) return pages[0];
    return null;
  }
  if (sheets.length !== 1) return null;
  var xml = sheets[0].getDataAsString(), setup = (/<pageSetup\b[^>]*\/?\s*>/.exec(xml) || [''])[0];
  if (!/<pageSetUpPr\b[^>]*\bfitToPage="(?:1|true)"/.test(xml) || xlsxThuocTinh_(setup, 'paperSize') !== '9' ||
      xlsxThuocTinh_(setup, 'orientation') !== 'landscape' || xlsxThuocTinh_(setup, 'fitToWidth') !== '1' || xlsxThuocTinh_(setup, 'fitToHeight') !== '0') return null;
  var result = { format: 'pdf', size: 'A4', scale: '2', portrait: 'false', gridlines: 'false', sheetnames: 'false', printtitle: 'false', pagenum: 'UNDEFINED', attachment: 'true' };
  var margins = (/<pageMargins\b[^>]*\/?\s*>/.exec(xml) || [''])[0];
  ['top','bottom','left','right'].forEach(function (key) { var v = xlsxThuocTinh_(margins, key); if (v !== '' && isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 2) result[key + '_margin'] = v; });
  return result;
}

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
    var pdfBlob = pdfTuBanGoogle_(idTam, tepOffice).setName(tenPdf);
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
