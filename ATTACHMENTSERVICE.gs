/**
 * ATTACHMENTSERVICE.GS
 * Quản lý hồ sơ đính kèm (Hoá đơn GTGT, Bảng lương...) cho từng hồ sơ giải ngân.
 * File được lưu vào đúng thư mục Drive của hồ sơ đó (layThuMucHoSo_ ở DocGenerator.gs),
 * metadata (tên file, link, loại) lưu ở tab TaiLieuDinhKem để tra cứu nhanh không cần quét Drive.
 */

/**
 * Tải lên 1 file đính kèm cho hồ sơ (Hoá đơn GTGT hoặc Bảng lương). Nhận dữ liệu base64 từ trình
 * duyệt (FileReader), ghi vào Drive rồi lưu metadata. Cho phép tải nhiều file cùng loại cho 1 hồ sơ
 * (VD: nhiều hoá đơn GTGT khác nhau).
 * @param {string} maHoSo
 * @param {string} loaiTaiLieu 'HoaDonGTGT' | 'BangLuong'
 * @param {string} tenFile Tên file gốc (kèm phần mở rộng)
 * @param {string} mimeType
 * @param {string} base64Data Nội dung file, đã encode base64 (không kèm tiền tố data:...;base64,)
 */
function taiLenTaiLieuHoSo(maHoSo, loaiTaiLieu, tenFile, mimeType, base64Data) {
  if (!maHoSo) throw new Error('Thiếu mã hồ sơ.');
  if (!layHoSoTheoMa(maHoSo)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  if (loaiTaiLieu !== 'HoaDonGTGT' && loaiTaiLieu !== 'BangLuong') {
    throw new Error('Loại tài liệu không hợp lệ: ' + loaiTaiLieu);
  }
  if (!base64Data) throw new Error('File rỗng hoặc chưa đọc được dữ liệu.');

  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', tenFile || 'tailieu');

  var tenThuMucCon = (loaiTaiLieu === 'HoaDonGTGT') ? 'HoaDonGTGT' : 'BangLuong';
  var thuMucHoSo = layThuMucHoSo_(maHoSo);
  var it = thuMucHoSo.getFoldersByName(tenThuMucCon);
  var thuMucCon = it.hasNext() ? it.next() : thuMucHoSo.createFolder(tenThuMucCon);

  var file = thuMucCon.createFile(blob);

  var sh = getSS_().getSheetByName(SHEET_TAILIEU);
  var maTaiLieu = sinhMaTuDong_(SHEET_TAILIEU, 'TL', 4);
  sh.appendRow([maTaiLieu, maHoSo, loaiTaiLieu, tenFile || file.getName(), file.getUrl(), new Date()]);

  // Tự động đọc (OCR/đọc Excel) và tổng hợp — KHÔNG BAO GIỜ làm việc tải file thất bại nếu đọc lỗi.
  var docDuoc = false, soDongDoc = 0;
  if (loaiTaiLieu === 'HoaDonGTGT') {
    var ketQua = trichXuatHoaDonTuFile_(file.getId());
    if (ketQua) {
      docDuoc = ketQua.docDuoc;
      var shHD = getSS_().getSheetByName(SHEET_BANGKE_HOADON);
      var maHoaDon = sinhMaTuDong_(SHEET_BANGKE_HOADON, 'HD', 5);
      shHD.appendRow([
        maHoaDon, maTaiLieu, maHoSo, ketQua.soHoaDon, ketQua.ngayHoaDon,
        ketQua.tenNhaCungCap, ketQua.mst, ketQua.dienGiai, ketQua.soTien,
        ketQua.docDuoc ? 'CO' : 'KHONG', new Date()
      ]);
      if (ketQua.mst && ketQua.tenNhaCungCap) {
        upsertKhachHangTheoMST_(ketQua.mst, ketQua.tenNhaCungCap);
      }
      soDongDoc = 1;
    }
  } else if (loaiTaiLieu === 'BangLuong') {
    var dsLuong = trichXuatBangLuongTuFile_(file.getId());
    if (dsLuong) {
      var shLuong = getSS_().getSheetByName(SHEET_BANGKE_LUONG);
      dsLuong.forEach(function (dong) {
        var maDong = sinhMaTuDong_(SHEET_BANGKE_LUONG, 'BL', 5);
        shLuong.appendRow([maDong, maTaiLieu, maHoSo, dong.hoTen, dong.thang, dong.soTien, new Date()]);
      });
      docDuoc = dsLuong.length > 0;
      soDongDoc = dsLuong.length;
    }
  }

  return { ok: true, maTaiLieu: maTaiLieu, linkFile: file.getUrl(), tenFile: tenFile || file.getName(), docDuoc: docDuoc, soDongDoc: soDongDoc };
}

/** Lấy danh sách tài liệu đính kèm của 1 hồ sơ, mới nhất lên trước. */
function layTaiLieuTheoHoSo(maHoSo) {
  var ds = sheetToObjects_(SHEET_TAILIEU).filter(function (t) { return t.MaHoSo === maHoSo; });
  ds.reverse();
  return ds.map(function (t) {
    return {
      maTaiLieu: t.MaTaiLieu, maHoSo: t.MaHoSo, loaiTaiLieu: t.LoaiTaiLieu,
      tenFile: t.TenFile, linkFile: t.LinkFile, ngayTaiLen: formatNgay_(t.NgayTaiLen)
    };
  });
}

/** Xoá 1 tài liệu đính kèm (xoá dòng metadata; chuyển file Drive vào thùng rác để có thể khôi phục). */
function xoaTaiLieuDinhKem(maTaiLieu) {
  var sh = getSS_().getSheetByName(SHEET_TAILIEU);
  var r = timDongTheoMa_(SHEET_TAILIEU, 'MaTaiLieu', maTaiLieu);
  if (r < 0) throw new Error('Không tìm thấy tài liệu ' + maTaiLieu + '.');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var colLink = headers.indexOf('LinkFile');
  var link = colLink >= 0 ? sh.getRange(r, colLink + 1).getValue() : '';
  sh.deleteRow(r);
  if (link) {
    try {
      var m = String(link).match(/[-\w]{25,}/);
      if (m) DriveApp.getFileById(m[0]).setTrashed(true);
    } catch (e) { /* file có thể đã bị xoá tay trên Drive từ trước, bỏ qua */ }
  }
  return { ok: true };
}

/** Toàn bộ hoá đơn đã tải lên + đọc tự động (OCR), mới nhất lên trước — cho tab "Hồ sơ đính kèm". */
function layBangTongHopHoaDon() {
  var ds = sheetToObjects_(SHEET_BANGKE_HOADON);
  ds.reverse();
  return ds.map(function (h) {
    return {
      maHoaDon: h.MaHoaDon, maHoSo: h.MaHoSo, soHoaDon: h.SoHoaDon, ngayHoaDon: h.NgayHoaDon,
      tenNhaCungCap: h.TenNhaCungCap, mst: h.MST, dienGiai: h.DienGiai, soTien: Number(h.SoTien) || 0,
      docDuoc: h.DocDuoc === 'CO', ngayTaiLen: formatNgay_(h.NgayTaiLen)
    };
  });
}

/** Toàn bộ dòng lương đã tải lên + đọc tự động, mới nhất lên trước — cho tab "Hồ sơ đính kèm". */
function layBangTongHopBangLuong() {
  var ds = sheetToObjects_(SHEET_BANGKE_LUONG);
  ds.reverse();
  return ds.map(function (d) {
    return {
      maDongLuong: d.MaDongLuong, maHoSo: d.MaHoSo, hoTen: d.HoTen, thang: d.Thang,
      soTien: Number(d.SoTien) || 0, ngayTaiLen: formatNgay_(d.NgayTaiLen)
    };
  });
}

/** Sửa tay 1 hoá đơn đã đọc tự động (khi OCR đọc sai hoặc thiếu trường). */
function capNhatHoaDonThuCong(maHoaDon, payload) {
  var sh = getSS_().getSheetByName(SHEET_BANGKE_HOADON);
  var r = timDongTheoMa_(SHEET_BANGKE_HOADON, 'MaHoaDon', maHoaDon);
  if (r < 0) throw new Error('Không tìm thấy hoá đơn ' + maHoaDon + '.');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var giaTri = {
    SoHoaDon: payload.soHoaDon || '', NgayHoaDon: payload.ngayHoaDon || '',
    TenNhaCungCap: payload.tenNhaCungCap || '', MST: payload.mst || '',
    DienGiai: payload.dienGiai || '', SoTien: Number(payload.soTien) || 0,
    DocDuoc: (payload.soHoaDon || payload.mst || payload.soTien) ? 'CO' : 'KHONG'
  };
  Object.keys(giaTri).forEach(function (key) {
    var col = headers.indexOf(key) + 1;
    if (col > 0) sh.getRange(r, col).setValue(giaTri[key]);
  });
  if (payload.mst && payload.tenNhaCungCap) upsertKhachHangTheoMST_(payload.mst, payload.tenNhaCungCap);
  return { ok: true };
}

/**
 * Bảng tổng hợp cho tab "Hồ sơ đính kèm": mỗi hồ sơ giải ngân kèm số lượng Hoá đơn GTGT / Bảng
 * lương đã tải lên, để biết ngay hồ sơ nào còn thiếu chứng từ trước khi nộp ngân hàng.
 */
function layTongHopHoSoVaTaiLieu() {
  var dsHoSo = sheetToObjects_(SHEET_HOSO);
  var dsHopDong = sheetToObjects_(SHEET_HOPDONG);
  var dsCongTy = sheetToObjects_(SHEET_CONGTY);
  var dsTaiLieu = sheetToObjects_(SHEET_TAILIEU);

  var hopDongByMa = {}; dsHopDong.forEach(function (h) { hopDongByMa[h.MaHD] = h; });
  var congTyByMa = {}; dsCongTy.forEach(function (c) { congTyByMa[c.MaCty] = c; });

  var demTheoHoSo = {}; // { maHoSo: { HoaDonGTGT: n, BangLuong: n } }
  dsTaiLieu.forEach(function (t) {
    var key = t.MaHoSo;
    if (!demTheoHoSo[key]) demTheoHoSo[key] = { HoaDonGTGT: 0, BangLuong: 0 };
    if (t.LoaiTaiLieu === 'HoaDonGTGT') demTheoHoSo[key].HoaDonGTGT++;
    else if (t.LoaiTaiLieu === 'BangLuong') demTheoHoSo[key].BangLuong++;
  });

  var out = dsHoSo.map(function (hs) {
    var hd = hopDongByMa[hs.MaHD];
    var cty = hd ? congTyByMa[hd.MaCty] : null;
    var dem = demTheoHoSo[hs.MaHoSo] || { HoaDonGTGT: 0, BangLuong: 0 };
    return {
      maHoSo: hs.MaHoSo,
      tenCty: cty ? cty.TenCty : '(không rõ công ty)',
      soHopDong: hd ? hd.SoHopDong : '',
      loaiTien: String(hs.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND',
      soTien: Number(hs.SoTienNhanNoLanNay) || 0,
      trangThai: hs.TrangThai || '',
      soHoaDon: dem.HoaDonGTGT,
      soBangLuong: dem.BangLuong,
      _row: hs._row || 0
    };
  });
  out.sort(function (a, b) { return b._row - a._row; });
  return out;
}
