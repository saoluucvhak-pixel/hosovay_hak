/**
 * TAIFILEQUAAPP.GS — tải MỘT file (xlsx/pdf/docx…) do app tạo, trả thẳng về trình duyệt (base64) như "Tải trọn bộ hồ sơ (ZIP)".
 * Web App chạy bằng tài khoản người triển khai nên file nằm trong Drive của chủ app; người dùng được phân quyền TRONG APP
 * không có quyền Drive → mở link Drive bị "Bạn cần có quyền truy cập". Tải qua đây thì quyền trong app là đủ.
 * Chỉ cho tải file nằm trong thư mục gốc của app, thuộc thư mục báo cáo hoặc thư mục một hồ sơ trong phạm vi người dùng.
 */
var THU_MUC_BAO_CAO_ = 'BaoCao_TienVay';

/** Đường dẫn thư mục (từ con của thư mục gốc xuống) chứa file; null nếu file không nằm trong thư mục gốc của app. */
function duongDanTrongThuMucGoc_(file) {
  var gocId = layThuMucGoc_().getId(), dangXet = [{ muc: file, duong: [] }];
  for (var buoc = 0; buoc < 8 && dangXet.length; buoc++) {
    var tiep = [];
    for (var i = 0; i < dangXet.length; i++) {
      var it = dangXet[i].muc.getParents();
      while (it.hasNext()) {
        var cha = it.next();
        if (cha.getId() === gocId) return dangXet[i].duong;
        tiep.push({ muc: cha, duong: [cha.getName()].concat(dangXet[i].duong) });
      }
    }
    dangXet = tiep;
  }
  return null;
}

function taiFileQuaApp(fileId) {
  yeuCauDangNhap_();
  fileId = String(fileId || '').trim();
  if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) throw new Error('Mã file không hợp lệ.');
  var f;
  try { f = DriveApp.getFileById(fileId); } catch (e) { throw new Error('Không tìm thấy file trên Drive của ứng dụng.'); }
  if (f.isTrashed && f.isTrashed()) throw new Error('File đã bị xóa.');
  var duong = duongDanTrongThuMucGoc_(f);
  if (!duong || !duong.length) throw new Error('File không thuộc thư mục dữ liệu của ứng dụng nên không tải qua ứng dụng được.');
  var maHoSo = '';
  if (duong[0] !== THU_MUC_BAO_CAO_) {
    maHoSo = duong[0];
    if (!layHoSoTheoMa_(maHoSo)) throw new Error('File không thuộc thư mục báo cáo hay thư mục hồ sơ nào nên không tải qua ứng dụng được.');
    chanNeuNgoaiPhamViHoSo_(maHoSo);
  }
  var mime = String(f.getMimeType() || '');
  if (mime.indexOf('application/vnd.google-apps') === 0) throw new Error('Đây là file Google (Docs/Sheets), không tải trực tiếp được; dùng bản .xlsx/.pdf/.docx.');
  var bytes = f.getBlob().getBytes();
  if (bytes.length > ZIP_TOI_DA_BYTE_) throw new Error('File quá lớn để tải qua ứng dụng (' + Math.round(bytes.length / 1048576) + ' MB, tối đa ' + Math.round(ZIP_TOI_DA_BYTE_ / 1048576) + ' MB).');
  ghiNhatKy_(maHoSo || 'BAO_CAO', 'TAI_FILE_QUA_APP', f.getName() + ' (' + Math.round(bytes.length / 1024) + ' KB)');
  return { tenFile: f.getName(), mimeType: mime || 'application/octet-stream', base64: Utilities.base64Encode(bytes), kichThuocKB: Math.round(bytes.length / 1024) };
}
