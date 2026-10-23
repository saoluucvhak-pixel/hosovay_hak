/**
 * SETUP.GS
 * Khởi tạo cấu trúc các tab nếu chưa tồn tại (an toàn khi chạy nhiều lần).
 */

function initializeSpreadsheet() {
  yeuCauDangNhap_(); yeuCauQuanTri_('khởi tạo/kiểm tra cấu trúc Sheet'); // đổi cấu trúc dữ liệu: chỉ quản trị
  khoiTaoCauTrucSheet_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getUi().alert('Đã kiểm tra/khởi tạo xong cấu trúc Sheet. Bạn có thể dùng menu "Mở ứng dụng".');
}

/**
 * Tạo các tab + cột còn thiếu trong CHÍNH Spreadsheet `ss` được truyền vào (không đọc Sheet đang hoạt động, không đổi cấu hình).
 * Hàm nội bộ: người gọi phải tự kiểm quyền Quản trị.
 */
function khoiTaoCauTrucSheet_(ss) {
  ensureSheet_(ss, SHEET_CAU_HINH, COT_CAU_HINH_);

  ensureSheet_(ss, SHEET_CONGTY, [
    'MaCty', 'TenCty', 'TenVietTat', 'MaSoThue', 'MaCIF', 'DiaChiTruSo', 'DienThoai', 'Fax',
    'NguoiDaiDien', 'ChucVu', 'GiayUyQuyenSo', 'GiayUyQuyenNgay', 'NguoiLapBieu',
    'TaiKhoanVND', 'TaiKhoanUSD'
  ]);

  ensureSheet_(ss, SHEET_HOPDONG, [
    'MaHD', 'MaCty', 'SoHopDong', 'NgayHopDong', 'TenNganHang', 'ChiNhanh',
    'DiaChiChiNhanh', 'MST_ChiNhanh', 'HanMucVay', 'LaiSuatTrongHan_%',
    'MoTaLaiSuatQuaHan', 'LaiSuatLaiChamTra_%', 'KyHanTraGoc', 'KyHanTraLai',
    'NguoiDaiDienNH', 'ChucVuNH', 'GiayUyQuyenNH', 'DienThoaiNH',
    'SoHopDongKhungMBNT', 'NgayHopDongKhungMBNT'
  ]);

  ensureSheet_(ss, SHEET_KHACHHANG, [
    'MaKH', 'TenKhachHang', 'MaSoThue', 'DiaChi', 'SoTaiKhoan', 'TaiNganHang', 'DienThoai', 'Email', 'GhiChu'
  ]);

  ensureSheet_(ss, SHEET_HOSO, [
    'MaHoSo', 'MaHD', 'SoGiayNhanNo', 'NgayGiayNhanNo', 'DuNoHienTai',
    'LoaiTien', 'TyGiaBan',
    'SoTienNhanNoLanNay', 'SoTienBangChu', 'PhuongThucThanhToan',
    'MucDichSuDungVon', 'ThoiHanChoVay_Ngay', 'NgayGiaiNgan', 'NgayDenHan',
    'TaiLieuChungMinhMucDich', 'NguoiLapBieu', 'SoThamChieu', 'TrangThai',
    'NgayTao',
    'Link_VanBanDeNghi', 'Link_VanBanDeNghi_PDF',
    'Link_ChungTuThanhToan', 'Link_ChungTuThanhToan_PDF', 'LoaiChungTuThanhToan',
    'Link_HDMBNgoaiTe', 'Link_HDMBNgoaiTe_PDF',
    // Link TÁCH RIÊNG từng định dạng: DOCX / PDF / XLSX (cột Link_*_PDF chỉ chứa link PDF thật).
    'Link_VanBanDeNghi_DOCX', 'Link_ChungTuThanhToan_DOCX', 'Link_ChungTuThanhToan_XLSX', 'Link_HDMBNgoaiTe_DOCX',
    'LoaiHoSoGiaiNgan', 'KhoaYeuCau', 'Revision', 'CapNhatLuc', 'CapNhatBoi', 'DaXoa', 'NgayXoa', 'NguoiXoa', 'LyDoXoa'
  ]);
  // Các cột link của bộ mẫu VCB cũ (đã thay bằng bộ mẫu BIDV thật ở trên) KHÔNG còn được khai báo
  // ở danh sách trên nữa — nhưng nếu Sheet của bạn đã có sẵn các cột này từ trước (Link_GiayNhanNo,
  // Link_UNC, Link_BangKeTaiLieu, Link_BangKeUNC...) thì vẫn được GIỮ NGUYÊN, không tự xoá, để không
  // mất dữ liệu/link các văn bản cũ đã tạo trước đây.
  xoaCotThua_(ss.getSheetByName(SHEET_HOSO), [
    'LinkGiayNhanNo', 'LinkDeNghiGiaiNgan', 'LinkUyNhiemChi',
    'LinkBangKeTaiLieu', 'LinkPhuLuc02', 'LinkPDF_TrongBo'
  ]);

  // LoaiChungTu: phân loại nội dung thanh toán (Thanh toán tiền keo/vật tư/chi phí/lương...).
  // SoTienQuyDoi: số tiền đã quy đổi ra VND — với hồ sơ VND thì bằng đúng SoTien; với hồ sơ USD
  // thì = SoTien (USD) x TyGiaBan của hồ sơ cha, tính và lưu sẵn lúc lưu hồ sơ (tránh tính lại
  // nhiều lần và lệch nếu tỷ giá của hồ sơ có sửa lại sau này).
  ensureSheet_(ss, SHEET_CHITIET, [
    'MaHoSo', 'STT', 'TenNguoiHuong', 'SoTaiKhoan', 'TaiNganHang', 'LoaiTien',
    'NoiDungThanhToan', 'LoaiChungTu', 'SoTien', 'SoTienQuyDoi', 'ChuyenTienNhanh_24_7', 'TaiLieuSo',
    'NgayTaiLieu', 'DonViLapTaiLieu', 'NgayCapGiayToTuyThan', 'GhiChu', 'TkTrichNoCheDo', 'TkTrichNo'
  ]);

  // Hồ sơ đính kèm: Hoá đơn GTGT, Bảng lương... — nhiều file cho 1 hồ sơ, lưu link Drive từng file.
  ensureSheet_(ss, SHEET_TAILIEU, [
    'MaTaiLieu', 'MaHoSo', 'LoaiTaiLieu', 'TenFile', 'LinkFile', 'NgayTaiLen'
  ]);

  // Bảng tổng hợp hoá đơn — tự động đọc (OCR) khi tải Hoá đơn GTGT lên ở tab "Hồ sơ đính kèm".
  // Dùng làm nguồn cho nút 🔎 "Chọn từ hoá đơn" khi Khoản mục giải ngân = Thanh toán vật tư/chi phí.
  ensureSheet_(ss, SHEET_BANGKE_HOADON, [
    'MaHoaDon', 'MaTaiLieu', 'MaHoSo', 'SoHoaDon', 'NgayHoaDon',
    'TenNhaCungCap', 'MST', 'DienGiai', 'SoTien', 'DocDuoc', 'NgayTaiLen'
  ]);

  // Bảng tổng hợp bảng lương — tự động đọc khi tải file Bảng lương (.xlsx) lên.
  // Dùng làm nguồn cho nút 🔎 "Chọn từ bảng lương" khi Khoản mục giải ngân = Thanh toán lương.
  ensureSheet_(ss, SHEET_BANGKE_LUONG, [
    'MaDongLuong', 'MaTaiLieu', 'MaHoSo', 'HoTen', 'Thang', 'SoTien', 'NgayTaiLen'
  ]);

  // Mẫu văn bản (DOCX/XLSX) quản lý theo phiên bản bất biến; MaMau + PhienBan là khoá. Chi tiết: TemplateRegistry.gs
  chuyenTabCu_(ss, 'DM_MauDocx', SHEET_MAU_VAN_BAN, { LoaiChungTu: 'LoaiTaiLieu', FileIdDocx: 'FileDocxId', NgayTai: 'NgayTao', NguoiTai: 'NguoiTao' });
  ensureSheet_(ss, SHEET_MAU_VAN_BAN, COT_MAU_VAN_BAN_);
  // Lịch sử phát hành: mỗi lần phát hành (hoặc lỗi) 1 dòng, KHÔNG xoá/ghi đè bản cũ (xem DocumentAudit.gs)
  chuyenTabCu_(ss, 'PhatHanhChungTu', SHEET_LICH_SU_PHAT_HANH, { MaPhatHanh: 'MaTaiLieu', LoaiChungTu: 'LoaiTaiLieu', GhiChu: 'CanhBao' });
  ensureSheet_(ss, SHEET_LICH_SU_PHAT_HANH, COT_LICH_SU_);
  // Nhật ký thao tác (tạo/sửa hồ sơ, sửa số tiền, phát hành, mẫu, cấu hình quản trị...).
  ensureSheet_(ss, SHEET_NHAT_KY, ['ThoiGian', 'NguoiDung', 'MaHoSo', 'HanhDong', 'ChiTiet']);
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
  } else {
    // Sheet đã có dữ liệu: chỉ bổ sung các cột còn THIẾU vào cuối, không đụng tới cột/dữ liệu đã có.
    var soCotHienTai = sh.getLastColumn();
    var headerHienTai = soCotHienTai > 0 ? sh.getRange(1, 1, 1, soCotHienTai).getValues()[0] : [];
    var thieu = headers.filter(function (h) { return headerHienTai.indexOf(h) < 0; });
    if (thieu.length) {
      var batDau = soCotHienTai + 1;
      sh.getRange(1, batDau, 1, thieu.length).setValues([thieu]);
      sh.getRange(1, batDau, 1, thieu.length).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
    }
  }
  return sh;
}

/** Xoá các cột không còn dùng nữa khỏi 1 sheet, tra theo TÊN cột (an toàn nếu cột không tồn tại). */
function xoaCotThua_(sh, tenCotCanXoa) {
  if (!sh) return;
  var soCot = sh.getLastColumn();
  if (soCot === 0) return;
  var header = sh.getRange(1, 1, 1, soCot).getValues()[0];
  // Xoá từ cột cuối về đầu để không bị lệch chỉ số khi xoá dần.
  for (var c = header.length - 1; c >= 0; c--) {
    if (tenCotCanXoa.indexOf(header[c]) >= 0) {
      sh.deleteColumn(c + 1);
    }
  }
}

/** Đổi tên tab cũ sang tên mới (giữ nguyên dữ liệu) và đổi tên cột theo bảng ánh xạ; chỉ chạy khi tab cũ có và tab mới chưa có. */
function chuyenTabCu_(ss, tenCu, tenMoi, anhXaCot) {
  var cu = ss.getSheetByName(tenCu);
  if (!cu || ss.getSheetByName(tenMoi)) return;
  cu.setName(tenMoi);
  var n = cu.getLastColumn();
  if (n < 1) return;
  var h = cu.getRange(1, 1, 1, n).getValues()[0];
  var moi = h.map(function (x) { return anhXaCot.hasOwnProperty(x) ? anhXaCot[x] : x; });
  cu.getRange(1, 1, 1, n).setValues([moi]);
}
