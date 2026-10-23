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
 * Đọc hoá đơn điện tử Việt Nam từ file .xml (chuẩn Nghị định 123/2020, Thông tư 78/2021 — dùng
 * chung bởi hầu hết nhà cung cấp: VNPT Invoice, Viettel S-Invoice, MISA meInvoice, M-Invoice,
 * EasyInvoice, BKAV eHoadon...). ĐÁNG TIN CẬY HƠN OCR NHIỀU vì đọc thẳng dữ liệu có cấu trúc, không
 * phải đoán chữ từ ảnh — nhưng tên thẻ XML có thể khác đôi chút giữa các nhà cung cấp, nên hàm này
 * thử NHIỀU tên thẻ thường gặp cho mỗi trường; nếu hoá đơn của bạn vẫn đọc sai/thiếu, gửi lại đúng
 * tên thẻ trong file XML đó để tinh chỉnh thêm.
 *
 * Đọc CẢ 2 bên (NBan = người bán, NMua = người mua) — vì hoá đơn công ty tải lên có thể là hoá đơn
 * MUA VÀO (công ty là NMua, bên kia là nhà cung cấp cần lấy) hoặc hoá đơn BÁN RA (công ty là NBan,
 * ví dụ hoá đơn bán lẻ tại cửa hàng — công ty tự xuất cho khách). Việc xác định bên nào là "đối tác"
 * (không phải công ty) được làm ở hàm xacDinhDoiTacHoaDon_ bên dưới, dựa vào MST công ty đã khai báo.
 */
function docHoaDonXML_(xmlText) {
  if (!xmlText) return null;

  var soHoaDon = layGiaTriXML_(xmlText, ['SHDon', 'SoHDon', 'shdon']);
  var khHieu = layGiaTriXML_(xmlText, ['KHHDon', 'KHMSHDon', 'khhdon']);
  if (khHieu && soHoaDon) soHoaDon = khHieu + '-' + soHoaDon;

  var ngayLapRaw = layGiaTriXML_(xmlText, ['NLap', 'NgayLap', 'nlap']);
  var ngayHoaDon = chuanHoaNgayXML_(ngayLapRaw);

  var khoiNBan = layKhoiXML_(xmlText, 'NBan') || layKhoiXML_(xmlText, 'NBH') || layKhoiXML_(xmlText, 'NNT');
  var mstNBan = layGiaTriXML_(khoiNBan || xmlText, ['MST', 'Mst']);
  var tenNBan = layGiaTriXML_(khoiNBan || xmlText, ['Ten', 'TenDVi']);

  var khoiNMua = layKhoiXML_(xmlText, 'NMua');
  var mstNMua = layGiaTriXML_(khoiNMua, ['MST', 'Mst']);
  var tenNMua = layGiaTriXML_(khoiNMua, ['Ten', 'HVTNMHang']);

  var tongTienRaw = layGiaTriXML_(xmlText, ['TgTTTBSo', 'TgTTTBso', 'TongTienThanhToan', 'TTToan']);
  var soTien = soTienTuXml_(tongTienRaw);

  var dienGiai = layGiaTriXML_(xmlText, ['THHDVu', 'TenHHDVu', 'DGiai']);

  var docDuoc = !!(soHoaDon || mstNBan || soTien);
  if (!docDuoc) return null; // không phải hoá đơn hợp lệ / đọc không ra gì cả

  return {
    soHoaDon: soHoaDon, ngayHoaDon: ngayHoaDon, dienGiai: dienGiai, soTien: soTien, docDuoc: true,
    nBan: { mst: mstNBan, ten: tenNBan },
    nMua: { mst: mstNMua, ten: tenNMua }
  };
}

/**
 * Từ kết quả docHoaDonXML_ (có cả NBan lẫn NMua), xác định bên nào là "đối tác" (không phải công ty
 * mình) để làm nhà cung cấp/khách hàng — so khớp MST người bán với MST công ty đã khai báo ở Danh
 * mục công ty: khớp -> đây là hoá đơn BÁN RA, đối tác = người mua; không khớp (mặc định) -> hoá đơn
 * MUA VÀO như bình thường, đối tác = người bán. Nếu công ty CHƯA khai MST thì mặc định coi là mua
 * vào (trường hợp phổ biến nhất khi giải trình mục đích sử dụng vốn vay).
 */
function xacDinhDoiTacHoaDon_(ketQuaXML) {
  var mstCongTy = '';
  try {
    var dsCongTy = sheetToObjects_(SHEET_CONGTY);
    if (dsCongTy.length) mstCongTy = String(dsCongTy[0].MaSoThue || '').trim();
  } catch (e) { /* chưa cấu hình Sheet công ty — bỏ qua, dùng mặc định bên dưới */ }

  var laHoaDonBanRa = mstCongTy && ketQuaXML.nBan.mst && String(ketQuaXML.nBan.mst).trim() === mstCongTy;
  var doiTac = laHoaDonBanRa ? ketQuaXML.nMua : ketQuaXML.nBan;

  return {
    soHoaDon: ketQuaXML.soHoaDon, ngayHoaDon: ketQuaXML.ngayHoaDon, dienGiai: ketQuaXML.dienGiai,
    soTien: ketQuaXML.soTien, docDuoc: ketQuaXML.docDuoc,
    mst: doiTac.mst || '', tenNhaCungCap: doiTac.ten || '',
    laHoaDonBanRa: !!laHoaDonBanRa
  };
}

/** Tìm giá trị bên trong thẻ XML — thử lần lượt các tên thẻ hay gặp, bỏ qua tiền tố namespace (VD: <ns2:SHDon>). */
function layGiaTriXML_(xml, danhSachTen) {
  for (var i = 0; i < danhSachTen.length; i++) {
    var ten = danhSachTen[i];
    var re = new RegExp('<(?:[\\w-]+:)?' + ten + '(?:\\s[^>]*)?>([^<]*)</(?:[\\w-]+:)?' + ten + '>', 'i');
    var m = xml.match(re);
    if (m && m[1] && m[1].trim()) return m[1].trim();
  }
  return '';
}

/** Lấy toàn bộ nội dung bên trong 1 khối thẻ (VD <NBan>...</NBan>) để tìm MST/Tên đúng của người bán, tránh nhầm với người mua. */
function layKhoiXML_(xml, tenThe) {
  var re = new RegExp('<(?:[\\w-]+:)?' + tenThe + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?' + tenThe + '>', 'i');
  var m = xml.match(re);
  return m ? m[1] : '';
}

/** Chuẩn hoá ngày trong XML hoá đơn (thường "yyyy-MM-dd" hoặc "yyyy-MM-ddTHH:mm:ss") thành "dd/MM/yyyy". */
function chuanHoaNgayXML_(s) {
  if (!s) return '';
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];
  m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + m[3];
  return String(s);
}

/**
 * Giải nén file .zip (hoá đơn điện tử tải hàng loạt từ hệ thống thuế/nhà cung cấp thường đóng gói
 * dạng .zip chứa nhiều cặp file .xml + .pdf) rồi đọc TỪNG file .xml bên trong. Trả về MẢNG hoá đơn
 * (có thể nhiều hoá đơn trong 1 lần tải lên 1 file .zip), hoặc null nếu giải nén lỗi.
 */
function trichXuatHoaDonTuZip_(fileId) {
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    var cacFileGiaiNen = Utilities.unzip(blob);
    var ketQua = [];
    cacFileGiaiNen.forEach(function (f) {
      if (!/\.xml$/i.test(f.getName())) return; // bỏ qua .pdf / file khác trong zip, chỉ đọc .xml
      var xmlText;
      try {
        xmlText = f.getDataAsString('UTF-8');
      } catch (eDoc) {
        return;
      }
      var hd = docHoaDonXML_(xmlText);
      if (hd) ketQua.push(xacDinhDoiTacHoaDon_(hd));
    });
    return ketQua;
  } catch (e) {
    return null; // không giải nén được — file lỗi hoặc không đúng định dạng .zip
  }
}


/**
 * OCR 1 file hoá đơn (PDF/ảnh) thành văn bản, dò các trường quen thuộc. Trả về object các trường
 * tìm được (chuỗi rỗng nếu không dò ra), hoặc null nếu OCR thất bại hoàn toàn.
 * CHỈ dùng khi hoá đơn là PDF/ảnh (không có .xml gốc) — nếu có .xml thì đọc bằng docHoaDonXML_ ở
 * trên, đáng tin cậy hơn nhiều vì đọc thẳng dữ liệu có cấu trúc thay vì đoán chữ từ ảnh.
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

/**
 * Số tiền trong thẻ XML hoá đơn (số thuần, dấu chấm là dấu thập phân kiểu "25000000" hoặc "25000000.00").
 * Chỉ nhận số nguyên: ".00" được bỏ; phần lẻ khác 0 => 0 (người dùng tự nhập tay), KHÔNG cắt/làm tròn âm thầm.
 * (Trước đây "25000000.00" bị hiểu nhầm thành 2.500.000.000 vì dấu chấm bị coi là dấu ngăn nghìn.)
 */
function soTienTuXml_(raw) {
  var s = String(raw || '').trim().replace(/[\s,]/g, '');
  if (/^\d+$/.test(s)) return Number(s);
  var m = s.match(/^(\d+)\.(\d+)$/);
  if (m && /^0+$/.test(m[2])) return Number(m[1]);
  return 0;
}

/** "15.000.000" hoặc "15,000,000" hoặc "15000000" -> 15000000 (số). */
function soTuChuoiTien_(s) {
  var sach = String(s || '').replace(/[^\d.,]/g, '');
  // Tiền chỉ là số nguyên: phần thập phân khác 0 KHÔNG được cắt âm thầm — trả 0 để người dùng nhập lại
  // tay (",00" thì bỏ được vì không đổi giá trị).
  if (/,\d{1,2}$/.test(sach)) {
    if (!/,0{1,2}$/.test(sach)) return 0;
    sach = sach.replace(/,0{1,2}$/, '');
  }
  sach = sach.replace(/\./g, '').replace(/,/g, '');
  return Number(sach) || 0;
}

/**
 * Đọc bảng lương THẬT nhiều sheet (dsSheet: [{ ten, values }]). Tìm dòng tiêu đề trong 15 dòng đầu mỗi sheet (cột Họ tên + cột Số tiền / Thực lĩnh,
 * tiêu đề có thể 2 tầng). Ưu tiên sheet CHUYỂN LƯƠNG (Họ tên + Số tài khoản + Số tiền) — đúng số tiền chuyển cho từng người; không có thì gộp các
 * sheet bảng lương (cột Thực lĩnh). Tháng lấy từ tiêu đề ("Tháng 09 năm 2026", "THÁNG 9/2026"). Tổng ở sheet "Bảng tổng hợp" (dòng Tổng cộng) dùng
 * để tự kiểm. Trả null nếu không nhận ra bố cục (để dùng cách đọc cũ). Hàm thuần — không gọi dịch vụ Google.
 */
function docBangLuongTuSheets_(dsSheet) {
  var gap = function (v) { return boDauGiuDoDai_(String(v === null || v === undefined ? '' : v)).replace(/\s+/g, ' ').trim(); };
  var soCuaO = function (v) { if (typeof v === 'number') return v; var s = String(v || '').trim(); return /^[\d.,\s]+$/.test(s) ? soTuChuoiTien_(s) : NaN; };
  var thangTu = function (values) {
    for (var r = 0; r < Math.min(values.length, 12); r++) {
      var t = gap(values[r].join(' ')), m = /thang\s*0?(\d{1,2})\s*(?:\/|nam)\s*(\d{4})/.exec(t);
      if (m) return ('0' + m[1]).slice(-2) + '/' + m[2];
    }
    return '';
  };
  var thangChung = '', tongFile = 0, dsBang = [];
  (dsSheet || []).forEach(function (sh) {
    var v = sh.values || [];
    thangChung = thangChung || thangTu(v);
    if (/tong\s*hop/.test(gap(sh.ten))) {
      v.forEach(function (row) { if (/^tong\s*cong/.test(gap(row.filter(function (c) { return String(c).trim(); })[0]))) { var so = row.map(soCuaO).filter(function (x) { return x > 0; }); if (so.length) tongFile = so[so.length - 1]; } });
      return;
    }
    for (var r = 0; r < Math.min(v.length, 15); r++) {
      var h = v[r].map(gap), h2 = (v[r + 1] || []).map(gap);
      var cTen = h.findIndex(function (x) { return /^ho\s*(va\s*)?ten$/.test(x); });
      if (cTen < 0) continue;
      var tim = function (re) { var i = h.findIndex(function (x) { return re.test(x); }); return i; };
      var cTK = tim(/so\s*tai\s*khoan/), cNH = tim(/ngan\s*hang/), cTien = tim(/^so\s*tien$/), cThucLinh = tim(/thuc\s*linh/);
      var laChuyen = cTK >= 0 && cTien >= 0;
      var cot = laChuyen ? cTien : (cThucLinh >= 0 ? cThucLinh : -1);
      if (cot < 0) break;
      var batDau = r + 1;
      if (h2.some(function (x) { return /^so\s*tien$|^ngay\s*cong$|bhxh/.test(x); }) && !gap(v[r + 1][cTen])) batDau = r + 2; // tiêu đề 2 tầng
      // Cột khấu trừ bảo hiểm phần NLĐ ở tầng tiêu đề thứ 2 (BHXH 8%, BHYT 1,5%, BHTN / BH thất nghiệp 1%, KPCĐ 0,5%); bỏ cột gộp "BHXH-KPCĐ".
      var cotTang2 = function (re, tru) { return h2.findIndex(function (x) { return re.test(x) && !(tru && tru.test(x)); }); };
      var cBH = { bhxh: cotTang2(/^bhxh/, /kpcd/), bhyt: cotTang2(/^bhyt/), bhtn: cotTang2(/^bhtn|that\s*nghiep/), kpcd: cotTang2(/kpcd/, /bhxh/) };
      var dong = [], bp = { bhxh: 0, bhyt: 0, bhtn: 0, kpcd: 0 };
      for (var i = batDau; i < v.length; i++) {
        var ten = String(v[i][cTen] || '').trim(), tg = gap(ten);
        if (/^(tong|cong|nguoi lap|ke toan|giam doc)/.test(tg)) break;
        if (!ten || /^\d+$/.test(ten)) continue;
        Object.keys(cBH).forEach(function (k) { var x = cBH[k] >= 0 ? soCuaO(v[i][cBH[k]]) : NaN; if (isFinite(x)) bp[k] += x; });
        var so = soCuaO(v[i][cot]);
        if (!isFinite(so)) { if (!laChuyen) dong.push({ hoTen: ten, soTien: NaN, chiDem: true }); continue; }
        dong.push({ hoTen: ten, soTien: so, soTaiKhoan: cTK >= 0 ? String(v[i][cTK] || '').trim() : '', nganHang: cNH >= 0 ? String(v[i][cNH] || '').trim() : '' });
      }
      var dongTien = dong.filter(function (d) { return !d.chiDem; });
      if (dong.length) dsBang.push({ ten: sh.ten, laChuyen: laChuyen, thang: thangTu(v), dong: dongTien,
        boPhan: laChuyen ? null : { boPhan: sh.ten, thang: thangTu(v), soNguoi: dong.length, thucLinh: dongTien.reduce(function (s, d) { return s + d.soTien; }, 0),
          bhxh: Math.round(bp.bhxh), bhyt: Math.round(bp.bhyt), bhtn: Math.round(bp.bhtn), kpcd: Math.round(bp.kpcd) } });
      break;
    }
  });
  if (!dsBang.length) return null;
  var boPhan = dsBang.filter(function (b) { return b.boPhan; }).map(function (b) { b.boPhan.thang = b.boPhan.thang || thangChung; return b.boPhan; });
  dsBang = dsBang.filter(function (b) { return b.dong.length; });
  if (!dsBang.length) return null;
  var chuyen = dsBang.filter(function (b) { return b.laChuyen; });
  var dung = chuyen.length ? chuyen.slice(0, 1) : dsBang;
  var out = [];
  dung.forEach(function (b) { b.dong.forEach(function (d) { out.push({ hoTen: d.hoTen, thang: b.thang || thangChung, soTien: d.soTien, soTaiKhoan: d.soTaiKhoan, nganHang: d.nganHang, sheet: b.ten }); }); });
  var tong = out.reduce(function (s, d) { return s + (isFinite(d.soTien) ? d.soTien : 0); }, 0), cb = [];
  if (tongFile && Math.round(tong) !== Math.round(tongFile)) cb.push('Tổng các dòng đọc được (' + Math.round(tong) + ') khác dòng "Tổng cộng" ở sheet tổng hợp (' + Math.round(tongFile) + ') — kiểm tra lại file.');
  var tongBP = boPhan.reduce(function (s, b) { return s + b.thucLinh; }, 0);
  if (chuyen.length && boPhan.length && Math.round(tongBP) !== Math.round(tong)) cb.push('Tổng thực lĩnh các bộ phận (' + Math.round(tongBP) + ') khác tổng sheet chuyển lương (' + Math.round(tong) + ').');
  return { dong: out, canhBao: cb, tongFile: tongFile, sheetDoc: dung.map(function (b) { return b.ten; }), boPhan: boPhan };
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
    var dsSheet = ss.getSheets().map(function (sh) { return { ten: sh.getName(), values: sh.getDataRange().getValues() }; });
    var kq = docBangLuongTuSheets_(dsSheet);
    if (kq) { var arr = kq.dong; arr.canhBao = kq.canhBao; arr.tongFile = kq.tongFile; arr.sheetDoc = kq.sheetDoc; arr.boPhan = kq.boPhan; return arr; }

    // Không nhận ra bố cục bảng lương thật: giữ cách đọc cũ (sheet đầu, tiêu đề ở dòng 1: Tháng | Họ và tên | Số tiền).
    var values = dsSheet[0].values;
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
