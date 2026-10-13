/**
 * DOCUMENTSTORAGE.GS
 * Lưu trữ tài liệu phát hành trên Google Drive và cập nhật link vào hồ sơ.
 *   <Thư mục gốc>/<MaHoSo>/DOCX | XLSX | PDF   — mỗi lần phát hành 1 file MỚI (hậu tố _L1, _L2…), không ghi đè/xoá bản cũ
 *   <Thư mục gốc>/<MaHoSo>/HoaDonGTGT, BangLuong — tài liệu đính kèm (giữ nguyên cấu trúc có sẵn)
 *   <Thư mục gốc>/MauVanBan, XemTruoc          — mẫu đã tải lên (bất biến theo phiên bản) và bản xem trước
 */

var TIEN_TO_FILE_ = { DE_NGHI_GIAI_NGAN: 'DeNghiGiaiNgan', CHUNG_TU_THANH_TOAN: 'ChungTuThanhToan', HDMB_NGOAI_TE: 'HDMB_NgoaiTe' };

// Cột link trong tab HoSoGiaiNgan cho từng loại tài liệu — TÁCH RIÊNG: goc (mở xem), docx, pdf, xlsx.
var COT_LINK_ = {
  DE_NGHI_GIAI_NGAN: { goc: 'Link_VanBanDeNghi', docx: 'Link_VanBanDeNghi_DOCX', pdf: 'Link_VanBanDeNghi_PDF', xlsx: '' },
  CHUNG_TU_THANH_TOAN: { goc: 'Link_ChungTuThanhToan', docx: 'Link_ChungTuThanhToan_DOCX', pdf: 'Link_ChungTuThanhToan_PDF', xlsx: 'Link_ChungTuThanhToan_XLSX' },
  HDMB_NGOAI_TE: { goc: 'Link_HDMBNgoaiTe', docx: 'Link_HDMBNgoaiTe_DOCX', pdf: 'Link_HDMBNgoaiTe_PDF', xlsx: '' }
};

function thuMucCon_(cha, ten) {
  var it = cha.getFoldersByName(ten);
  return it.hasNext() ? it.next() : cha.createFolder(ten);
}

/** Thư mục lưu theo loại tệp: 'DOCX' | 'XLSX' | 'PDF' bên trong thư mục hồ sơ. */
function thuMucLuuTru_(maHoSo, loaiTep) {
  return thuMucCon_(layThuMucHoSo_(maHoSo), loaiTep);
}

function thuMucXemTruoc_() {
  return thuMucCon_(layThuMucGoc_(), 'XemTruoc');
}

function tenTepTaiLieu_(loai, maHoSo, soLan, duoi) {
  return TIEN_TO_FILE_[loai] + '_' + maHoSo + '_L' + soLan + '.' + duoi;
}

/** Cập nhật cột link của hồ sơ cho 1 loại tài liệu — mỗi định dạng ghi ĐÚNG cột của nó (giá trị rỗng xoá link cũ của định dạng đó). */
function capNhatLinkChungTu_(maHoSo, loai, links) {
  var cot = COT_LINK_[loai];
  var sh = getSS_().getSheetByName(SHEET_HOSO);
  var cacCot = [cot.goc, cot.docx, cot.pdf, cot.xlsx].filter(function (c) { return c; });
  var headers = damBaoCotSheet_(sh, cacCot);
  var hs = layHoSoTheoMa(maHoSo);
  if (!hs || !hs._row) return;
  function ghi(tenCot, giaTri) {
    if (!tenCot) return;
    var c = headers.indexOf(tenCot) + 1;
    if (c > 0) sh.getRange(hs._row, c).setValue(giaTri || '');
  }
  ghi(cot.goc, links.goc); ghi(cot.docx, links.docx); ghi(cot.pdf, links.pdf); ghi(cot.xlsx, links.xlsx);
}

/**
 * SỬA DỮ LIỆU LỊCH SỬ (chạy THỦ CÔNG qua menu, có ghi nhật ký): trước đây link file .xlsx của chứng từ thanh toán bị ghi nhầm
 * vào cột Link_ChungTuThanhToan_PDF. Hàm này đọc loại file thật trên Drive; nếu là bảng tính/.xlsx thì CHUYỂN link sang cột
 * Link_ChungTuThanhToan_XLSX (không xoá file, không đổi nội dung nào khác). Link thật sự là PDF được giữ nguyên.
 */
function suaLinkChungTuCuMenu() {
  yeuCauQuanTri_('sửa link chứng từ cũ');
  var sh = getSS_().getSheetByName(SHEET_HOSO);
  var headers = damBaoCotSheet_(sh, ['Link_ChungTuThanhToan_PDF', 'Link_ChungTuThanhToan_XLSX']);
  var cPdf = headers.indexOf('Link_ChungTuThanhToan_PDF') + 1, cXlsx = headers.indexOf('Link_ChungTuThanhToan_XLSX') + 1;
  var ds = sheetToObjects_(SHEET_HOSO), daSua = [], boQua = 0;
  ds.forEach(function (hs) {
    var link = String(hs.Link_ChungTuThanhToan_PDF || ''), xlsx = String(hs.Link_ChungTuThanhToan_XLSX || '');
    if (!link || xlsx) return;
    var m = link.match(/[-\w]{25,}/);
    if (!m) { boQua++; return; }
    var mime = '';
    try { mime = DriveApp.getFileById(m[0]).getMimeType(); } catch (e) { boQua++; return; }
    if (/spreadsheetml|ms-excel|google-apps.spreadsheet/.test(mime)) {
      sh.getRange(hs._row, cXlsx).setValue(link);
      sh.getRange(hs._row, cPdf).setValue('');
      daSua.push(hs.MaHoSo);
    }
  });
  ghiNhatKy_('', 'SUA_LINK_XLSX_CU', 'Chuyển link XLSX khỏi cột PDF: ' + (daSua.join(', ') || '(không có)'));
  SpreadsheetApp.flush();
  var msg = daSua.length ? ('Đã chuyển ' + daSua.length + ' link .xlsx sang cột Link_ChungTuThanhToan_XLSX: ' + daSua.join(', ')) : 'Không có link nào cần sửa.';
  try { SpreadsheetApp.getUi().alert(msg + (boQua ? '\n(Bỏ qua ' + boQua + ' dòng không đọc được link.)' : '')); } catch (e) { /* chạy ngoài menu */ }
  return daSua;
}
