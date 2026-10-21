/**
 * VERSION.GS — phiên bản code đang chạy và kiểm tra cấu trúc dữ liệu (chỉ đọc).
 * Tăng APP_VERSION mỗi lần phát hành để biết Web App đang chạy bản nào.
 */
var APP_VERSION = '2026.10.21.2';
var APP_MO_TA_PHIEN_BAN = 'Đồng nhất trạng thái giải ngân · Sổ trả nợ gốc/lãi · Cảnh báo đến hạn/quá hạn/tỷ giá · Kiểm tra cấu trúc';

/** Phiên bản code (không ghi dữ liệu). */
function layPhienBanUngDung() {
  yeuCauDangNhap_();
  return { version: APP_VERSION, moTa: APP_MO_TA_PHIEN_BAN, thoiDiem: new Date().toISOString() };
}

/**
 * Kiểm tra sheet/cột bắt buộc sau khi cập nhật code. Chỉ ĐỌC, không sửa dữ liệu.
 * Sheet/cột thiếu: chạy initializeSpreadsheet() (quản trị) để bổ sung.
 */
function kiemTraCauTrucDuLieu() {
  yeuCauDangNhap_();
  var ss = getSS_();
  var kiemTra = [
    { sheet: SHEET_CONGTY, loai: 'BAT_BUOC', cot: ['MaCty', 'TenCty', 'MaSoThue'] },
    { sheet: SHEET_HOPDONG, loai: 'BAT_BUOC', cot: ['MaHD', 'MaCty', 'SoHopDong', 'HanMucVay'] },
    { sheet: SHEET_HOSO, loai: 'BAT_BUOC', cot: ['MaHoSo', 'MaHD', 'TrangThai', 'LoaiTien', 'SoTienNhanNoLanNay', 'TyGiaBan', 'NgayGiaiNgan', 'NgayDenHan', 'Revision'] },
    { sheet: SHEET_HOSO, loai: 'TUY_CHON', cot: ['DaTatToan', 'NgayTatToan'], ghiChu: 'Tự thêm cột khi tất toán lần đầu' },
    { sheet: SHEET_TRA_NO, loai: 'TUY_CHON', cot: COT_TRA_NO_ },
    { sheet: SHEET_TY_GIA_THU_CONG, loai: 'TUY_CHON', cot: COT_TY_GIA_THU_CONG_ },
    { sheet: SHEET_XAC_NHAN_GN, loai: 'TUY_CHON', cot: COT_XAC_NHAN_GN_ },
    { sheet: SHEET_LICH_SU_TRANG_THAI, loai: 'TUY_CHON', cot: COT_LICH_SU_TRANG_THAI_ },
    { sheet: SHEET_NGUOI_DUNG, loai: 'TUY_CHON', cot: COT_NGUOI_DUNG_ }
  ];
  var ketQua = kiemTra.map(function (k) {
    var sh = ss.getSheetByName(k.sheet);
    if (!sh) return { sheet: k.sheet, loai: k.loai, trangThai: k.loai === 'BAT_BUOC' ? 'THIEU_SHEET' : 'CHUA_TAO', thieu: [] };
    var cuoi = sh.getLastColumn();
    var headers = cuoi ? sh.getRange(1, 1, 1, cuoi).getValues()[0].map(String) : [];
    var thieu = k.cot.filter(function (c) { return headers.indexOf(c) < 0; });
    return { sheet: k.sheet, loai: k.loai, trangThai: thieu.length ? 'THIEU_COT' : 'DU', thieu: thieu, ghiChu: k.ghiChu || '' };
  });
  var loiBatBuoc = ketQua.filter(function (k) { return k.loai === 'BAT_BUOC' && k.trangThai !== 'DU'; }).length;
  return { version: APP_VERSION, ketQua: ketQua, duBatBuoc: loiBatBuoc === 0,
    ghiChu: loiBatBuoc ? 'Thiếu cấu trúc bắt buộc: chạy khởi tạo/kiểm tra cấu trúc (quản trị) rồi kiểm tra lại.' : 'Cấu trúc bắt buộc đầy đủ.' };
}
