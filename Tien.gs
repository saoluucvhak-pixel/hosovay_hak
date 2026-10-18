/**
 * TIEN.GS
 * Quy tắc tiền tệ THỐNG NHẤT toàn hệ thống:
 *  - Tiền VND là số nguyên; USD nhận tối đa hai chữ số thập phân (cent).
 *  - Dấu chấm hiển thị phân cách hàng nghìn; dấu phẩy hiển thị phần cent USD.
 *  - Không tự làm tròn / cắt phần lẻ; VND lẻ hoặc USD quá hai số thập phân phải được người dùng sửa lại.
 *  - Riêng Tỷ giá bán được phép có phần thập phân (cấu hình tỷ giá).
 *  - Quy đổi: SoTienQuyDoiVND = ROUND(SoTienUSD x TyGiaBan, 0), tính bằng số học nguyên (BigInt),
 *    không làm tròn tỷ giá trước khi nhân, không sai số floating-point.
 */

/** USD nhận tối đa hai chữ số thập phân; không cắt hoặc làm tròn phần cent. */
function docTienUSD_(v, ten, batBuoc) {
  ten = ten || 'Số tiền USD';
  if (v === null || v === undefined || String(v).trim() === '') {
    if (batBuoc) throw new Error(ten + ': vui lòng nhập số tiền.');
    return 0;
  }
  var s = String(v).replace(/[\s\u00a0]/g, '').replace(/(usd|\$)$/i, '');
  if (typeof v === 'string') {
    if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s) && (s.indexOf(',') >= 0 || /\.\d{3}/.test(s))) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d+(,\d{1,2})?$/.test(s)) s = s.replace(',', '.');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(ten + ': USD chỉ nhận tối đa 2 chữ số thập phân (VD: 25.000,50 hoặc 25000.50).');
  var p = s.split('.'), cent = BigInt(p[0]) * BigInt(100) + BigInt(((p[1] || '') + '00').slice(0, 2));
  if (cent > BigInt(TIEN_TOI_DA_)) throw new Error(ten + ': số tiền quá lớn.');
  var out = Number(cent) / 100, q = String(out).split('.');
  if (BigInt(q[0]) * BigInt(100) + BigInt(((q[1] || '') + '00').slice(0, 2)) !== cent) throw new Error(ten + ': số tiền quá lớn để giữ chính xác từng cent.');
  return out;
}
function docTienTheoLoai_(v, loaiTien, ten, batBuoc) {
  return String(loaiTien).toUpperCase() === 'USD' ? docTienUSD_(v, ten, batBuoc) : docTienNguyen_(v, ten, batBuoc);
}
function centUSD_(v) {
  var p = String(docTienUSD_(v)).split('.');
  return BigInt(p[0]) * BigInt(100) + BigInt(((p[1] || '') + '00').slice(0, 2));
}
function tongTienTheoLoai_(ds, loaiTien) {
  if (String(loaiTien).toUpperCase() !== 'USD') return tongTienNguyen_(ds);
  var cent = (ds || []).reduce(function (t, n) { return t + centUSD_(n); }, BigInt(0));
  if (cent > BigInt(TIEN_TOI_DA_)) throw new Error('Tổng số tiền quá lớn.');
  return Number(cent) / 100;
}

var TIEN_TOI_DA_ = 9007199254740991; // Number.MAX_SAFE_INTEGER

/**
 * Đọc 1 số tiền nguyên từ số hoặc chuỗi. Ném lỗi (không làm tròn) nếu có phần thập phân / sai định dạng.
 * Chấp nhận: 25000 | "25000" | "25.000" | "1.250.000". Không chấp nhận: "25.000,50" | "25000.50" | "0,5" | "-5".
 * Rỗng/null => 0 (trừ khi batBuoc = true).
 * @param {*} v giá trị đầu vào
 * @param {string} tenTruong tên trường dùng trong thông báo lỗi
 * @param {boolean=} batBuoc true: rỗng cũng báo lỗi
 */
function docTienNguyen_(v, tenTruong, batBuoc) {
  var ten = tenTruong || 'Số tiền';
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
    if (batBuoc) throw new Error(ten + ': vui lòng nhập số tiền.');
    return 0;
  }
  if (typeof v === 'number') {
    if (!isFinite(v)) throw new Error(ten + ': số tiền không hợp lệ.');
    if (Math.floor(v) !== v) {
      throw new Error(ten + ': "' + v + '" có phần thập phân. Tiền chỉ nhận số nguyên (không có cents / số lẻ), vui lòng sửa lại.');
    }
    if (v < 0) throw new Error(ten + ': số tiền không được âm.');
    if (v > TIEN_TOI_DA_) throw new Error(ten + ': số tiền quá lớn.');
    return v;
  }
  var s = String(v).replace(/[\s ]/g, '');
  s = s.replace(/(đ|₫|vnd|usd|\$)$/i, '');
  if (/^\d+$/.test(s)) {
    // chuỗi số thuần
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  } else {
    throw new Error(ten + ': "' + v + '" không hợp lệ. Tiền chỉ nhận số nguyên, dấu chấm chỉ là dấu phân cách hàng nghìn ' +
      '(VD: 25.000). Không nhập phần thập phân (như 25.000,50 hoặc 0,5).');
  }
  var n = Number(s);
  if (n > TIEN_TOI_DA_) throw new Error(ten + ': số tiền quá lớn.');
  return n;
}

/**
 * Tỷ giá bán: cho phép phần thập phân. Nhận số hoặc chuỗi kiểu VN ("26.145" / "26.145,50") hoặc chuỗi
 * thuần "26145.5". Trả về Number (giữ đúng giá trị nhập, không làm tròn).
 */
function docTyGia_(v, tenTruong) {
  var ten = tenTruong || 'Tỷ giá bán';
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') {
    if (!isFinite(v) || v < 0) throw new Error(ten + ' không hợp lệ.');
    return v;
  }
  var s = String(v).replace(/[\s ]/g, '');
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) && (s.indexOf(',') >= 0 || s.indexOf('.') >= 0)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(ten + ' "' + v + '" không hợp lệ.');
  }
  var n = Number(s);
  if (!isFinite(n) || n < 0) throw new Error(ten + ' không hợp lệ.');
  return n;
}

/** Tách số (Number) thành {int: BigInt tử số, scale: số chữ số thập phân} từ biểu diễn thập phân chính xác. */
function tachThapPhan_(n) {
  var s = (Math.abs(n) < 1e21 && Math.abs(n) >= 1e-6) ? String(n) : n.toFixed(10);
  if (s.indexOf('e') >= 0) s = n.toFixed(10);
  var p = s.split('.');
  var phanLe = p[1] || '';
  return { so: BigInt(p[0] + phanLe), scale: phanLe.length };
}

/**
 * SoTienQuyDoiVND = ROUND(SoTienUSD x TyGiaBan, 0). Làm tròn nửa lên (half up) trên số học nguyên,
 * dùng đúng giá trị tỷ giá gốc (không làm tròn tỷ giá trước khi nhân).
 */
function quyDoiUSDSangVND_(soTienUSD, tyGiaBan) {
  var usd = centUSD_(soTienUSD);
  var tg = docTyGia_(tyGiaBan);
  var t = tachThapPhan_(tg);
  var tich = usd * t.so;
  var mau = BigInt(100) * (BigInt(10) ** BigInt(t.scale));
  var kq = (tich * BigInt(2) + mau) / (mau * BigInt(2)); // half up
  var out = Number(kq);
  if (out > TIEN_TOI_DA_) throw new Error('Số tiền quy đổi quá lớn.');
  return out;
}

/** Cộng các số tiền nguyên, báo lỗi nếu có số lẻ. */
function tongTienNguyen_(dsSo, tenTruong) {
  var t = 0;
  (dsSo || []).forEach(function (x) { t += docTienNguyen_(x, tenTruong); });
  if (t > TIEN_TOI_DA_) throw new Error('Tổng số tiền quá lớn.');
  return t;
}

/**
 * Kiểm tra toàn bộ số tiền của payload hồ sơ TRƯỚC khi lưu. Ném lỗi ở số tiền đầu tiên không hợp lệ.
 * Trả về payload đã chuẩn hoá { loaiTien, tyGiaBan, duNo, soTienLanNay, chiTiet:[{soTien, soTienQuyDoi}] }.
 */
function kiemTraTienHoSo_(payload) {
  var loaiTien = (String(payload.loaiTien || 'VND').toUpperCase() === 'USD') ? 'USD' : 'VND';
  var tyGiaBan = loaiTien === 'USD' ? docTyGia_(payload.tyGiaBan) : 0;
  if (loaiTien === 'USD' && tyGiaBan <= 0) {
    throw new Error('Hồ sơ giải ngân bằng USD bắt buộc phải nhập "Tỷ giá bán" ở mục 3.');
  }
  var duNo = docTienTheoLoai_(payload.duNoHienTai, loaiTien, 'Dư nợ hiện tại');
  var dsCt = (payload.chiTiet || []).map(function (ct, i) {
    var soTien = docTienTheoLoai_(ct.soTien, loaiTien, 'Số tiền dòng thụ hưởng ' + (i + 1));
    return {
      soTien: soTien,
      soTienQuyDoi: loaiTien === 'USD' ? quyDoiUSDSangVND_(soTien, tyGiaBan) : soTien
    };
  });
  var tong = tongTienTheoLoai_(dsCt.map(function (x) { return x.soTien; }), loaiTien);
  var soTienLanNay = docTienTheoLoai_(payload.soTienNhanNoLanNay, loaiTien, 'Số tiền nhận nợ lần này');
  if (soTienLanNay !== tong) {
    throw new Error('Số tiền nhận nợ lần này (' + formatSo_(soTienLanNay) + ') không bằng tổng các dòng thụ hưởng (' +
      formatSo_(tong) + '). Vui lòng kiểm tra lại.');
  }
  return { loaiTien: loaiTien, tyGiaBan: tyGiaBan, duNo: duNo, soTienLanNay: soTienLanNay, chiTiet: dsCt };
}

// =========================================================================
// RÀ SOÁT DỮ LIỆU LỊCH SỬ CÓ PHẦN THẬP PHÂN — chỉ CẢNH BÁO + LIỆT KÊ, KHÔNG sửa dữ liệu cũ.
// =========================================================================

var SHEET_CAN_RA_SOAT_TIEN = 'CanRaSoat_TienLe';

/**
 * Quét HoSoGiaiNgan, ChiTietThuHuong, DM_HopDongVay (HanMucVay), BangKeHoaDon, BangKeBangLuong tìm số tiền có phần
 * thập phân. Ghi danh sách vào tab "CanRaSoat_TienLe" (ghi mới mỗi lần quét) và trả về danh sách.
 * KHÔNG thay đổi bất kỳ dữ liệu gốc nào.
 */
function raSoatTienLeLichSu() {
  yeuCauQuanTri_('rà soát dữ liệu lịch sử');
  var cacBang = [
    { sheet: SHEET_HOSO, khoa: 'MaHoSo', cot: ['DuNoHienTai', 'SoTienNhanNoLanNay'] },
    { sheet: SHEET_CHITIET, khoa: 'MaHoSo', cot: ['SoTien', 'SoTienQuyDoi'] },
    { sheet: SHEET_HOPDONG, khoa: 'MaHD', cot: ['HanMucVay'] },
    { sheet: SHEET_BANGKE_HOADON, khoa: 'MaHoaDon', cot: ['SoTien'] },
    { sheet: SHEET_BANGKE_LUONG, khoa: 'MaDongLuong', cot: ['SoTien'] }
  ];
  var ds = [];
  cacBang.forEach(function (b) {
    var rows;
    try { rows = sheetToObjects_(b.sheet); } catch (e) { return; }
    rows.forEach(function (r) {
      b.cot.forEach(function (c) {
        var v = r[c];
        if (v === '' || v === null || v === undefined) return;
        var n = (typeof v === 'number') ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
        if (isFinite(n) && Math.floor(n) !== n) {
          ds.push({ tab: b.sheet, dong: r._row, ma: String(r[b.khoa] || ''), cot: c, giaTri: v });
        }
      });
    });
  });

  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_CAN_RA_SOAT_TIEN) || ss.insertSheet(SHEET_CAN_RA_SOAT_TIEN);
  sh.clearContents();
  var data = [['Tab', 'Dòng', 'Mã', 'Cột', 'Giá trị hiện lưu', 'Ghi chú']];
  ds.forEach(function (x) {
    data.push([x.tab, x.dong, x.ma, x.cot, x.giaTri, 'Có phần thập phân — cần rà soát và sửa tay (hệ thống KHÔNG tự đổi dữ liệu cũ)']);
  });
  sh.getRange(1, 1, data.length, 6).setValues(data);
  sh.getRange(1, 1, 1, 6).setFontWeight('bold');
  sh.getRange(2, 5, Math.max(1, data.length - 1), 1).setNumberFormat('#,##0.########').setHorizontalAlignment('right');
  sh.getRange(2, 2, Math.max(1, data.length - 1), 1).setHorizontalAlignment('center');
  SpreadsheetApp.flush();
  return ds;
}

/** Gọi từ menu Google Sheet. */
function raSoatTienLeLichSuMenu() {
  var ds = raSoatTienLeLichSu();
  SpreadsheetApp.getUi().alert(ds.length
    ? ('Phát hiện ' + ds.length + ' ô tiền có phần thập phân trong dữ liệu lịch sử. Danh sách ở tab "' +
       SHEET_CAN_RA_SOAT_TIEN + '". Dữ liệu cũ KHÔNG bị thay đổi — vui lòng rà soát và sửa tay.')
    : 'Không có số tiền nào có phần thập phân trong dữ liệu lịch sử.');
}

/** Số lượng ô tiền lịch sử có phần thập phân — cho giao diện hiển thị cảnh báo (không ghi gì). */
function demTienLeLichSu() {
  yeuCauDangNhap_();
  var tong = 0;
  var dsCt = sheetToObjects_(SHEET_CHITIET);
  sheetToObjects_(SHEET_HOSO).forEach(function (hs) {
    tong += phatHienTienLe_(hs, dsCt.filter(function (ct) { return String(ct.MaHoSo) === String(hs.MaHoSo); })).length;
  });
  return tong;
}

/** Cộng số tiền đã lưu bằng số học thập phân, kể cả bản ghi điều chỉnh âm. */
function congSoTien_(a, b) {
  var x = tachThapPhan_(Number(a) || 0), y = tachThapPhan_(Number(b) || 0), scale = Math.max(x.scale, y.scale);
  var t = x.so * (BigInt(10) ** BigInt(scale - x.scale)) + y.so * (BigInt(10) ** BigInt(scale - y.scale));
  return Number(t) / Math.pow(10, scale);
}
