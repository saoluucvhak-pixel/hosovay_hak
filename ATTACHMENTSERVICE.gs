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
/** Ghi 1 dòng hoá đơn đã đọc được (từ XML, ZIP, hoặc OCR) vào BangKeHoaDon + tự thêm khách hàng theo MST. */
function ghiHoaDonVaoBangKe_(maTaiLieu, maHoSo, ketQua) {
  return voiKhoa_(function () { return ghiHoaDonVaoBangKeKhongKhoa_(maTaiLieu, maHoSo, ketQua); });
}

function ghiHoaDonVaoBangKeKhongKhoa_(maTaiLieu, maHoSo, ketQua) {
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
}

function taiLenTaiLieuHoSo(maHoSo, loaiTaiLieu, tenFile, mimeType, base64Data) {
  yeuCauDangNhap_();
  maHoSo = maHoSo || '';
  // maHoSo có thể để TRỐNG — dùng khi tải hoá đơn/bảng lương lên NGAY LÚC đang tạo hồ sơ mới (hồ sơ
  // chưa lưu nên chưa có Mã hồ sơ). File loại này được lưu vào 1 thư mục chung "_ChuaGanHoSo" thay
  // vì thư mục riêng của hồ sơ — vẫn được OCR/đọc và tổng hợp bình thường, vẫn chọn được ở nút 🔎.
  if (maHoSo && !layHoSoTheoMa_(maHoSo)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  if (loaiTaiLieu !== 'HoaDonGTGT' && loaiTaiLieu !== 'BangLuong') {
    throw new Error('Loại tài liệu không hợp lệ: ' + loaiTaiLieu);
  }
  if (!base64Data) throw new Error('File rỗng hoặc chưa đọc được dữ liệu.');

  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', tenFile || 'tailieu');

  var tenThuMucCon = (loaiTaiLieu === 'HoaDonGTGT') ? 'HoaDonGTGT' : 'BangLuong';
  var thuMucCha = maHoSo ? layThuMucHoSo_(maHoSo) : layThuMucChungChuaGanHoSo_();
  var it = thuMucCha.getFoldersByName(tenThuMucCon);
  var thuMucCon = it.hasNext() ? it.next() : thuMucCha.createFolder(tenThuMucCon);

  var file = thuMucCon.createFile(blob);

  var sh = getSS_().getSheetByName(SHEET_TAILIEU);
  var maTaiLieu = voiKhoa_(function () {
    var m = sinhMaTuDong_(SHEET_TAILIEU, 'TL', 4);
    sh.appendRow([m, maHoSo, loaiTaiLieu, tenFile || file.getName(), file.getUrl(), new Date()]);
    return m;
  });

  // Tự động đọc và tổng hợp — KHÔNG BAO GIỜ làm việc tải file thất bại nếu đọc lỗi. Ưu tiên đọc
  // trực tiếp .xml (dữ liệu có cấu trúc, đáng tin cậy hơn OCR nhiều) — chỉ OCR khi là PDF/ảnh.
  var docDuoc = false, soDongDoc = 0, canhBaoTien = [];
  if (loaiTaiLieu === 'HoaDonGTGT') {
    var tenFileThuc = (tenFile || file.getName()).toLowerCase();
    var dsHoaDon = [];
    if (/\.xml$/.test(tenFileThuc)) {
      var xmlText;
      try { xmlText = file.getBlob().getDataAsString('UTF-8'); } catch (eXml) { xmlText = null; }
      var hd1 = xmlText ? docHoaDonXML_(xmlText) : null;
      if (hd1) hd1 = xacDinhDoiTacHoaDon_(hd1);
      if (hd1) dsHoaDon.push(hd1);
    } else if (/\.zip$/.test(tenFileThuc)) {
      dsHoaDon = trichXuatHoaDonTuZip_(file.getId()) || [];
    } else {
      var hd2 = trichXuatHoaDonTuFile_(file.getId());
      if (hd2) dsHoaDon.push(hd2);
    }

    dsHoaDon.forEach(function (ketQua) {
      ghiHoaDonVaoBangKe_(maTaiLieu, maHoSo, ketQua);
      if (ketQua.docDuoc) docDuoc = true;
    });
    soDongDoc = dsHoaDon.length;
  } else if (loaiTaiLieu === 'BangLuong') {
    var dsLuong = trichXuatBangLuongTuFile_(file.getId());
    if (dsLuong) {
      var shLuong = getSS_().getSheetByName(SHEET_BANGKE_LUONG);
      var dongHopLe = [];
      dsLuong.forEach(function (dong) {
        // Số tiền lương phải là số nguyên: KHÔNG làm tròn/cắt âm thầm — dòng có số lẻ bị loại và báo lại để sửa file nguồn.
        if (isFinite(dong.soTien) && Math.floor(dong.soTien) === dong.soTien && dong.soTien >= 0) dongHopLe.push(dong);
        else canhBaoTien.push('Bỏ qua dòng lương "' + dong.hoTen + ' (' + dong.thang + ')": số tiền ' + dong.soTien + ' có phần thập phân/không hợp lệ — sửa file nguồn thành số nguyên.');
      });
      if (dongHopLe.length) {
        voiKhoa_(function () {
          var headers = damBaoCotSheet_(shLuong, ['SoTaiKhoan', 'NganHang']); // bảng chuyển lương có số tài khoản + ngân hàng từng người
          var maBatDau = sinhMaTuDong_(SHEET_BANGKE_LUONG, 'BL', 5), so0 = parseInt(String(maBatDau).replace(/\D/g, ''), 10);
          var hangLuong = dongHopLe.map(function (dong, i) {
            var v = { MaDongLuong: 'BL' + ('00000' + (so0 + i)).slice(-5), MaTaiLieu: maTaiLieu, MaHoSo: maHoSo, HoTen: dong.hoTen, Thang: dong.thang, SoTien: dong.soTien,
              NgayTaiLen: new Date(), SoTaiKhoan: dong.soTaiKhoan || '', NganHang: dong.nganHang || '' };
            return headers.map(function (h) { return v[h] !== undefined ? v[h] : ''; });
          });
          shLuong.getRange(timDongThatCuoiCung_(shLuong) + 1, 1, hangLuong.length, hangLuong[0].length).setValues(hangLuong);
        });
      }
      (dsLuong.canhBao || []).forEach(function (c) { canhBaoTien.push(c); });
      if (dsLuong.boPhan && dsLuong.boPhan.length) { // tổng theo bộ phận (từng sheet bảng lương): thực lĩnh + khấu trừ bảo hiểm phần NLĐ
        voiKhoa_(function () {
          var shBP = ensureSheet_(getSS_(), SHEET_TONGHOP_LUONG_BP, COT_TONGHOP_LUONG_BP_);
          dsLuong.boPhan.forEach(function (b) {
            themDongVaoCuoiThat_(shBP, [maTaiLieu, maHoSo, b.thang || '', b.boPhan, b.soNguoi, b.thucLinh, b.bhxh, b.bhyt, b.bhtn, b.kpcd, new Date()]);
          });
        });
      }
      docDuoc = dongHopLe.length > 0;
      soDongDoc = dongHopLe.length;
    }
  }

  return { ok: true, maTaiLieu: maTaiLieu, linkFile: file.getUrl(), tenFile: tenFile || file.getName(), docDuoc: docDuoc, soDongDoc: soDongDoc, canhBao: canhBaoTien };
}

/** Lấy danh sách tài liệu đính kèm của 1 hồ sơ, mới nhất lên trước. */
function layTaiLieuTheoHoSo(maHoSo) {
  yeuCauDangNhap_();
  if (maHoSo) chanNeuNgoaiPhamViHoSo_(String(maHoSo));
  var ds = locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_TAILIEU), function (t) { return [t.MaHoSo]; }).filter(function (t) { return t.MaHoSo === maHoSo; });
  ds.reverse();
  return ds.map(function (t) {
    return {
      maTaiLieu: t.MaTaiLieu, maHoSo: t.MaHoSo, loaiTaiLieu: t.LoaiTaiLieu,
      tenFile: t.TenFile, linkFile: t.LinkFile, ngayTaiLen: formatNgay_(t.NgayTaiLen)
    };
  });
}

/** Xoá các dòng của 1 sheet có cot === giaTri (từ dưới lên để số dòng không lệch). Trả số dòng đã xoá. */
function xoaDongTheoCot_(tenSheet, cot, giaTri) {
  var sh = getSS_().getSheetByName(tenSheet);
  if (!sh || sh.getLastRow() < 2) return 0;
  var values = layGiaTriThatCuaSheet_(sh), c = values[0].indexOf(cot), dem = 0;
  if (c < 0) return 0;
  for (var r = values.length - 1; r >= 1; r--) if (String(values[r][c]) === String(giaTri)) { xoaDongAnToan_(sh, r + 1); dem++; }
  return dem;
}
/** Hoá đơn (số HĐ) của 1 tệp đang được dùng ở Danh sách thụ hưởng của hồ sơ nào đó → không cho xoá (gỡ khỏi hồ sơ trước). */
function chanXoaHoaDonDangDung_(dsHoaDon) {
  var daDung = layTapSoHDDaSuDung_(''), bi = dsHoaDon.filter(function (h) { return h.SoHoaDon && daDung[String(h.SoHoaDon).trim()]; });
  if (bi.length) throw new Error('Hoá đơn ' + bi.map(function (h) { return h.SoHoaDon; }).join(', ') + ' đang dùng ở Danh sách thụ hưởng của hồ sơ — xoá số hoá đơn khỏi hồ sơ đó trước rồi mới xoá được.');
}

/** Xoá 1 tài liệu đính kèm (hoá đơn, bảng lương, bảng đóng bảo hiểm…): xoá dòng metadata VÀ mọi dòng dữ liệu đọc từ tệp đó
 *  (bảng kê hoá đơn, dòng lương, tổng lương theo bộ phận); chuyển file Drive vào thùng rác (khôi phục được 30 ngày). */
function xoaTaiLieuDinhKem(maTaiLieu) {
  yeuCauDangNhap_();
  maTaiLieu = String(maTaiLieu || '').trim();
  if (!maTaiLieu) throw new Error('Thiếu mã tài liệu.');
  var tl = sheetToObjects_(SHEET_TAILIEU).filter(function (t) { return String(t.MaTaiLieu) === maTaiLieu; })[0];
  var hd = sheetToObjects_(SHEET_BANGKE_HOADON).filter(function (h) { return String(h.MaTaiLieu) === maTaiLieu; });
  if (!tl && !hd.length && !sheetToObjects_(SHEET_BANGKE_LUONG).some(function (d) { return String(d.MaTaiLieu) === maTaiLieu; })) throw new Error('Không tìm thấy tài liệu ' + maTaiLieu + '.');
  var maHoSo = String((tl && tl.MaHoSo) || (hd[0] && hd[0].MaHoSo) || '');
  if (maHoSo) chanNeuNgoaiPhamViHoSo_(maHoSo);
  chanXoaHoaDonDangDung_(hd);
  var dem = { hoaDon: xoaDongTheoCot_(SHEET_BANGKE_HOADON, 'MaTaiLieu', maTaiLieu), luong: xoaDongTheoCot_(SHEET_BANGKE_LUONG, 'MaTaiLieu', maTaiLieu) };
  if (typeof SHEET_TONGHOP_LUONG_BP !== 'undefined') xoaDongTheoCot_(SHEET_TONGHOP_LUONG_BP, 'MaTaiLieu', maTaiLieu);
  xoaDongTheoCot_(SHEET_TAILIEU, 'MaTaiLieu', maTaiLieu);
  if (tl && tl.LinkFile) {
    try {
      var m = String(tl.LinkFile).match(/[-\w]{25,}/);
      if (m) DriveApp.getFileById(m[0]).setTrashed(true);
    } catch (e) { /* file có thể đã bị xoá tay trên Drive từ trước, bỏ qua */ }
  }
  ghiNhatKy_(maHoSo, 'XOA_TAI_LIEU', maTaiLieu + ' | ' + dem.hoaDon + ' dòng hoá đơn, ' + dem.luong + ' dòng lương');
  return { ok: true, soHoaDon: dem.hoaDon, soDongLuong: dem.luong };
}

/** Xoá 1 HOÁ ĐƠN / chứng từ đã đọc (1 dòng Bảng kê hoá đơn — gồm cả bảng đóng bảo hiểm). Tệp gốc chỉ vào thùng rác khi
 *  không còn chứng từ nào khác đọc từ cùng tệp (PDF nhiều hoá đơn: xoá 1 hoá đơn sai không mất các hoá đơn còn lại). */
function xoaHoaDonDaTai(maHoaDon) {
  yeuCauDangNhap_();
  maHoaDon = String(maHoaDon || '').trim();
  var ds = sheetToObjects_(SHEET_BANGKE_HOADON), h = ds.filter(function (x) { return String(x.MaHoaDon) === maHoaDon; })[0];
  if (!h) throw new Error('Không tìm thấy hoá đơn ' + maHoaDon + '.');
  if (h.MaHoSo) chanNeuNgoaiPhamViHoSo_(String(h.MaHoSo));
  chanXoaHoaDonDangDung_([h]);
  var conLai = ds.filter(function (x) { return x.MaTaiLieu && String(x.MaTaiLieu) === String(h.MaTaiLieu) && String(x.MaHoaDon) !== maHoaDon; }).length;
  if (h.MaTaiLieu && !conLai) return xoaTaiLieuDinhKem(String(h.MaTaiLieu)); // chứng từ cuối cùng của tệp → xoá cả tệp
  xoaDongTheoCot_(SHEET_BANGKE_HOADON, 'MaHoaDon', maHoaDon);
  ghiNhatKy_(String(h.MaHoSo || ''), 'XOA_HOA_DON', maHoaDon + ' | số ' + (h.SoHoaDon || '') + ' | ' + (h.SoTien || 0));
  return { ok: true, soHoaDon: 1 };
}

/** Toàn bộ hoá đơn đã tải lên + đọc tự động (OCR), mới nhất lên trước — cho tab "Hồ sơ đính kèm". */
function layBangTongHopHoaDon() {
  yeuCauDangNhap_();
  var tep = tenTepTheoMaTaiLieu_();
  var ds = locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_BANGKE_HOADON), function (h) { return [h.MaHoSo, (tep[h.MaTaiLieu] || {}).maHoSo]; });
  ds.reverse();
  return ds.map(function (h) {
    return {
      maHoaDon: h.MaHoaDon, maHoSo: h.MaHoSo, soHoaDon: h.SoHoaDon, ngayHoaDon: h.NgayHoaDon,
      tenNhaCungCap: h.TenNhaCungCap, mst: h.MST, dienGiai: h.DienGiai, soTien: Number(h.SoTien) || 0,
      docDuoc: h.DocDuoc === 'CO', ngayTaiLen: formatNgay_(h.NgayTaiLen),
      kyHieu: h.KyHieu || '', trangTu: h.TrangTu || '', trangDen: h.TrangDen || '', loaiChungTu: h.LoaiChungTu || '', tinCay: h.TinCay || '' // đọc nhiều trang
    };
  });
}

/** Toàn bộ dòng lương đã tải lên + đọc tự động, mới nhất lên trước — cho tab "Hồ sơ đính kèm". */
function layBangTongHopBangLuong() {
  yeuCauDangNhap_();
  var tep = tenTepTheoMaTaiLieu_();
  var ds = locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_BANGKE_LUONG), function (d) { return [d.MaHoSo, (tep[d.MaTaiLieu] || {}).maHoSo]; });
  ds.reverse();
  return ds.map(function (d) {
    return {
      maDongLuong: d.MaDongLuong, maHoSo: d.MaHoSo, hoTen: d.HoTen, thang: d.Thang,
      soTien: Number(d.SoTien) || 0, ngayTaiLen: formatNgay_(d.NgayTaiLen), soTaiKhoan: d.SoTaiKhoan || '', nganHang: d.NganHang || ''
    };
  });
}

/** Sửa tay 1 hoá đơn đã đọc tự động (khi OCR đọc sai hoặc thiếu trường). */
function capNhatHoaDonThuCong(maHoaDon, payload) {
  yeuCauDangNhap_();
  var sh = getSS_().getSheetByName(SHEET_BANGKE_HOADON);
  var r = timDongTheoMa_(SHEET_BANGKE_HOADON, 'MaHoaDon', maHoaDon);
  if (r < 0) throw new Error('Không tìm thấy hoá đơn ' + maHoaDon + '.');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var giaTri = {
    SoHoaDon: payload.soHoaDon || '', NgayHoaDon: payload.ngayHoaDon || '',
    TenNhaCungCap: payload.tenNhaCungCap || '', MST: payload.mst || '',
    DienGiai: payload.dienGiai || '', SoTien: docTienNguyen_(payload.soTien, 'Số tiền hoá đơn'),
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
  yeuCauDangNhap_();
  var dsHoSo = docDanhSachHoSo_(false);
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
