function myFunction() {
  
}
/**
 * OCRSERVICE.GS
 * Tự động ĐỌC nội dung file khi tải lên ở tab "Hồ sơ đính kèm":
 *   - Hoá đơn GTGT (PDF/ảnh): OCR bằng Drive Advanced Service rồi dò các trường quen thuộc của
 *     hoá đơn điện tử Việt Nam (Số hoá đơn, Ngày, MST, Tên đơn vị bán, Tổng tiền thanh toán).
 *   - Bảng lương (.xlsx): chuyển tạm thành Google Sheet để đọc dữ liệu theo cột (Họ tên/Tháng/Số tiền).
 *
 * ⚠️ CẦN BẬT "Drive API" (Advanced Service) cho project Apps Script này — đã khai báo sẵn trong
 * appsscript.json (dependencies > enabledAdvancedServices), nhưng lần đầu deploy có thể cần bạn
 * vào Apps Script editor > Dịch vụ (Services) > xác nhận "Drive API" đã được thêm.
 *
 * OCR không thể chính xác 100% với mọi mẫu hoá đơn/chất lượng ảnh scan — các hàm ở đây LUÔN chạy
 * trong try/catch và KHÔNG BAO GIỜ làm hỏng việc tải file lên (nếu đọc lỗi, file vẫn được lưu bình
 * thường, chỉ là chưa có dữ liệu trích xuất — người dùng có thể sửa tay ở "Bảng tổng hợp hoá đơn").
 */

/**
 * OCR 1 file hoá đơn (PDF/ảnh) thành văn bản, dò các trường quen thuộc. Trả về object các trường
 * tìm được (chuỗi rỗng nếu không dò ra), hoặc null nếu OCR thất bại hoàn toàn.
 */
function trichXuatHoaDonTuFile_(fileId) {
  var docTamId = null;
  try {
    var banSao = Drive.Files.copy(
      { title: 'OCR_TAM_' + fileId },
      fileId,
      { ocr: true, ocrLanguage: 'vi' }
    );
    docTamId = banSao.id;

    var vanBan = '';
    try {
      vanBan = DocumentApp.openById(docTamId).getBody().getText();
    } catch (eDoc) {
      // File OCR ra không phải Google Doc (VD ảnh OCR ra file khác định dạng) — thử đọc như Blob text.
      vanBan = DriveApp.getFileById(docTamId).getBlob().getDataAsString();
    }

    return docKetQuaOCRHoaDon_(vanBan);
  } catch (e) {
    return null; // OCR lỗi (thiếu quyền Drive API, file không hỗ trợ OCR...) — không chặn việc lưu file.
  } finally {
    if (docTamId) {
      try { DriveApp.getFileById(docTamId).setTrashed(true); } catch (e2) { /* bỏ qua */ }
    }
  }
}

/** Dò các trường quen thuộc của hoá đơn điện tử Việt Nam từ văn bản đã OCR. */
function docKetQuaOCRHoaDon_(vanBan) {
  vanBan = String(vanBan || '');

  var soHoaDon = '';
  var mSo = vanBan.match(/(?:Số|No\.?|Number)[\s:]*[:\s]*#?\s*(\d{5,8})\b/i);
  if (mSo) soHoaDon = mSo[1];

  var mst = '';
  var mMst = vanBan.match(/(?:Mã số thuế|MST|Tax code)[\s:]*([0-9]{10}(?:[-\s][0-9]{3})?)/i);
  if (mMst) mst = mMst[1].replace(/\s/g, '');

  var ngayHoaDon = '';
  var mNgay = vanBan.match(/[Nn]gày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/);
  if (mNgay) {
    ngayHoaDon = ('0' + mNgay[1]).slice(-2) + '/' + ('0' + mNgay[2]).slice(-2) + '/' + mNgay[3];
  } else {
    var mNgay2 = vanBan.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
    if (mNgay2) ngayHoaDon = ('0' + mNgay2[1]).slice(-2) + '/' + ('0' + mNgay2[2]).slice(-2) + '/' + mNgay2[3];
  }

  var soTien = 0;
  var mTien = vanBan.match(/(?:Tổng tiền thanh toán|Cộng tiền thanh toán|Total payment)[^0-9]{0,20}([\d.,]{4,})/i);
  if (mTien) soTien = soTuChuoiTien_(mTien[1]);

  var tenNhaCungCap = '';
  var mTen = vanBan.match(/(?:Đơn vị bán hàng|Tên đơn vị bán hàng|Seller)[\s:]*\n?\s*([^\n]{4,120})/i);
  if (mTen) tenNhaCungCap = mTen[1].trim().replace(/^[:\-\s]+/, '');

  var dienGiai = '';
  var mHangHoa = vanBan.match(/(?:Tên hàng hóa|Tên hàng hóa, dịch vụ)[\s:]*\n?\s*([^\n]{4,160})/i);
  if (mHangHoa) dienGiai = mHangHoa[1].trim();

  return {
    soHoaDon: soHoaDon, ngayHoaDon: ngayHoaDon, mst: mst,
    tenNhaCungCap: tenNhaCungCap, dienGiai: dienGiai, soTien: soTien,
    docDuoc: !!(soHoaDon || mst || soTien)
  };
}

/** "15.000.000" hoặc "15,000,000" hoặc "15000000" -> 15000000 (số). */
function soTuChuoiTien_(s) {
  var sach = String(s || '').replace(/[^\d.,]/g, '');
  // Nếu có cả dấu chấm và phẩy: bỏ dấu ngăn cách nghìn (chấm), giữ phẩy làm thập phân rồi bỏ luôn phần thập phân.
  sach = sach.replace(/\./g, '').replace(/,\d{1,2}$/, '').replace(/,/g, '');
  return Number(sach) || 0;
}

/**
 * Đọc file Bảng lương (.xlsx) vừa tải lên: chuyển tạm thành Google Sheet để đọc dữ liệu, dò cột
 * theo tên (Họ tên/Tháng/Số tiền), fallback theo vị trí cột A/B/C nếu không khớp tên.
 * Trả về mảng [{hoTen, thang, soTien}], hoặc null nếu đọc lỗi.
 */
function trichXuatBangLuongTuFile_(fileId) {
  var sheetTamId = null;
  try {
    var banSao = Drive.Files.copy(
      { title: 'BANGLUONG_TAM_' + fileId, mimeType: 'application/vnd.google-apps.spreadsheet' },
      fileId,
      { convert: true }
    );
    sheetTamId = banSao.id;

    var ss = SpreadsheetApp.openById(sheetTamId);
    var sh = ss.getSheets()[0];
    var values = sh.getDataRange().getValues();
    if (values.length < 2) return [];

    var headers = values[0];
    var idxThang = timCotTheoTenHoacViTri_(headers, 'tháng', 0);
    var idxHoTen = timCotTheoTenHoacViTri_(headers, 'họ và tên', 1);
    var idxSoTien = timCotTheoTenHoacViTri_(headers, 'số tiền', 2);

    var out = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var hoTen = row[idxHoTen];
      if (!hoTen) continue;
      var thang = row[idxThang];
      var thangChuoi = (thang instanceof Date) ? Utilities.formatDate(thang, 'Asia/Ho_Chi_Minh', 'MM/yyyy') : String(thang || '');
      out.push({ hoTen: String(hoTen).trim(), thang: thangChuoi, soTien: soTuChuoiHoacSo_(row[idxSoTien]) });
    }
    return out;
  } catch (e) {
    return null; // Đọc lỗi (sai định dạng cột, thiếu quyền Drive API...) — không chặn việc lưu file.
  } finally {
    if (sheetTamId) {
      try { DriveApp.getFileById(sheetTamId).setTrashed(true); } catch (e2) { /* bỏ qua */ }
    }
  }
}
