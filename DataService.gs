/**
 * DATASERVICE.GS
 * Lớp truy xuất dữ liệu: đọc/ghi các tab DM_CongTy, DM_HopDongVay,
 * HoSoGiaiNgan, ChiTietThuHuong.
 */

/**
 * Đọc dữ liệu THÔ (mảng 2 chiều, dòng 0 là tiêu đề) của 1 sheet — CHỈ tới đúng dòng có dữ liệu thật
 * cuối cùng, không đọc theo vùng "khai báo đang dùng" của Sheet (sh.getLastRow()) vì vùng đó CÓ THỂ
 * bị "phồng" ảo lên tới hàng nghìn dòng (do từng dán/định dạng thừa) dù dữ liệu thật chỉ có vài dòng
 * — đọc theo getDataRange()/getLastRow() thẳng sẽ quét qua hàng chục nghìn ô trống vô ích mỗi lần
 * gọi, là nguyên nhân chính gây chậm/đôi khi lỗi đã gặp suốt thời gian qua.
 */
/** Tìm số thứ tự dòng dữ liệu thật CUỐI CÙNG trong sheet (theo cột A) — không bị ảnh hưởng bởi vùng
 *  "khai báo đang dùng" ảo của Sheet. Trả về 1 nếu chưa có dòng dữ liệu nào (chỉ có tiêu đề). */
function timDongThatCuoiCung_(sh) {
  var soDongKhaiBao = sh.getLastRow();
  if (soDongKhaiBao < 2) return 1;
  var cotA = sh.getRange(2, 1, soDongKhaiBao - 1, 1).getValues();
  for (var i = cotA.length - 1; i >= 0; i--) {
    if (cotA[i][0] !== '' && cotA[i][0] !== null) {
      return i + 2; // +2 = bù lại (bắt đầu đọc từ dòng 2) + (index mảng 0-based)
    }
  }
  return 1;
}

function layGiaTriThatCuaSheet_(sh) {
  var soDongKhaiBao = sh.getLastRow();
  if (soDongKhaiBao < 1) return [[]];
  // Sheet nhỏ (dưới 300 dòng khai báo): đọc thẳng 1 lượt như trước — CHỈ khi vùng khai báo lớn bất
  // thường (nghi ngờ bị "phồng ảo" do dán/định dạng thừa) mới cần thêm bước dò cột A riêng để tránh
  // đọc hàng chục nghìn ô trống. Làm vậy vì MỖI lượt gọi API của Apps Script (kể cả đọc rất ít dữ
  // liệu) đều có độ trễ cố định riêng — dò 2 bước cho sheet vốn đã nhỏ/sạch chỉ khiến CHẬM HƠN do
  // cộng dồn nhiều lượt gọi, không giúp ích gì thêm.
  if (soDongKhaiBao <= 300) {
    return sh.getRange(1, 1, soDongKhaiBao, sh.getLastColumn()).getValues();
  }
  var dongThatCuoi = timDongThatCuoiCung_(sh);
  return sh.getRange(1, 1, dongThatCuoi, sh.getLastColumn()).getValues();
}

/** Cột BẮT BUỘC có ở dòng tiêu đề của từng sheet. Thiếu → lỗi cấu trúc (không trả [] che lỗi). */
var COT_BAT_BUOC_SHEET_ = {
  DM_CongTy: ['MaCty', 'TenCty'], DM_HopDongVay: ['MaHD', 'MaCty', 'SoHopDong'], DM_KhachHang: ['MaKH', 'TenKhachHang'],
  HoSoGiaiNgan: ['MaHoSo', 'MaHD', 'TrangThai'], ChiTietThuHuong: ['MaHoSo', 'STT', 'SoTien']
};

/**
 * Đọc 1 sheet có CHẨN ĐOÁN: {rows, boQua:[{dong, lyDo}], soDongDoc}. Dòng trống hoàn toàn bỏ qua (không phải lỗi); dòng có dữ liệu nhưng
 * thiếu khoá (cột A) được GHI NHẬN trong boQua — không biến mất âm thầm. Thiếu tab/cột bắt buộc → ném lỗi cấu trúc.
 */
function docBangChanDoan_(sheetName) {
  var sh = getSS_().getSheetByName(sheetName);
  if (!sh) throw new Error('Không tìm thấy tab "' + sheetName + '". Hãy chạy "Khởi tạo / kiểm tra cấu trúc Sheet".');
  var values = layGiaTriThatCuaSheet_(sh);
  var headers = values[0] || [];
  var thieu = (COT_BAT_BUOC_SHEET_[sheetName] || []).filter(function (c) { return headers.indexOf(c) < 0; });
  if (thieu.length) throw new Error('Lỗi cấu trúc tab "' + sheetName + '": thiếu cột ' + thieu.join(', ') + '. Hãy chạy "Khởi tạo / kiểm tra cấu trúc Sheet".');
  var out = [], boQua = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!Array.isArray(row)) { boQua.push({ dong: r + 1, lyDo: 'DONG_KHONG_HOP_LE' }); continue; }
    var trong = true;
    for (var c = 0; c < row.length; c++) if (row[c] !== '' && row[c] !== null && row[c] !== undefined) { trong = false; break; }
    if (trong) continue;
    if (row[0] === '' || row[0] === null) { boQua.push({ dong: r + 1, lyDo: 'THIEU_KHOA' }); continue; }
    var obj = {};
    for (var k = 0; k < headers.length; k++) obj[headers[k]] = row[k];
    obj._row = r + 1; // vị trí dòng thật trên sheet (1-indexed)
    out.push(obj);
  }
  return { rows: out, boQua: boQua, soDongDoc: Math.max(0, values.length - 1) };
}

function sheetToObjects_(sheetName) {
  return docBangChanDoan_(sheetName).rows;
}

/**
 * Thêm 1 dòng dữ liệu mới vào ĐÚNG NGAY SAU dòng dữ liệu THẬT cuối cùng — dùng thay cho
 * sh.appendRow(...) trực tiếp. appendRow() mặc định ghi vào ngay sau sh.getLastRow(), nhưng nếu
 * Sheet từng bị dán/định dạng thừa khiến vùng "khai báo đang dùng" phồng lên hàng nghìn dòng ảo
 * (dù dữ liệu thật chỉ có vài dòng), appendRow() sẽ ghi dữ liệu mới lạc tít xuống dưới, càng khiến
 * dữ liệu rải rác/khó tìm hơn qua mỗi lần lưu. Hàm này luôn tìm đúng dòng dữ liệu thật cuối cùng
 * (theo cột A) rồi ghi ngay sau đó, không phụ thuộc vùng khai báo ảo của Sheet.
 */
/** Cột số tài khoản: ô phải là văn bản để Sheets không đổi thành số (mất số 0 đầu, hiện dấu phân cách). */
var COT_SO_TAI_KHOAN_ = ['SoTaiKhoan', 'TaiKhoanVND', 'TaiKhoanUSD', 'TkTrichNo'];
var TK_TRICH_NO_CHE_DO_ = ['CONG_TY', 'KHAC', 'TRONG'];
/** Tài khoản trích nợ trên UNC của từng món: CONG_TY (mặc định) | KHAC (nhập số khác) | TRONG (để trống). */
function chuanHoaTkTrichNo_(ct, stt) {
  var che = String(ct.tkTrichNoCheDo || 'CONG_TY').toUpperCase();
  if (TK_TRICH_NO_CHE_DO_.indexOf(che) < 0) throw new Error('Dòng thụ hưởng ' + stt + ': chế độ tài khoản trích nợ không hợp lệ.');
  var so = String(ct.tkTrichNo || '').replace(/\s/g, '');
  if (che === 'KHAC') {
    if (!so) throw new Error('Dòng thụ hưởng ' + stt + ': chọn "Số khác" thì phải nhập số tài khoản trích nợ.');
    if (!/^[0-9A-Za-z.\-]{4,30}$/.test(so)) throw new Error('Dòng thụ hưởng ' + stt + ': số tài khoản trích nợ không hợp lệ.');
  } else so = '';
  return { che: che, so: so };
}
function dinhDangVanBanCotTaiKhoan_(sh, headers, dong, soDong) {
  if (soDong < 1) return;
  headers.forEach(function (h, i) {
    if (COT_SO_TAI_KHOAN_.indexOf(h) >= 0) sh.getRange(dong, i + 1, soDong, 1).setNumberFormat('@');
  });
}

/** Xoá dòng r. Google Sheets KHÔNG cho xoá dòng dữ liệu cuối cùng (lỗi "not possible to delete all non-frozen rows") khi sheet
 *  không còn dòng trống dư — thêm 1 dòng trống ở cuối trước khi xoá. soDong > 1: xoá nhiều dòng liền nhau. */
function xoaDongAnToan_(sh, r, soDong) {
  soDong = soDong || 1;
  if (sh.getMaxRows() - (sh.getFrozenRows() || 0) - soDong < 1) sh.insertRowsAfter(sh.getMaxRows(), 1);
  if (soDong > 1) sh.deleteRows(r, soDong); else sh.deleteRow(r);
}
function themDongVaoCuoiThat_(sh, rowData) {
  var dongThatCuoi = timDongThatCuoiCung_(sh);
  sh.getRange(dongThatCuoi + 1, 1, 1, rowData.length).setValues([rowData]);
}

/*
 * ĐÃ GỠ docCoThuLai_ (đọc lại + Utilities.sleep khi mảng rỗng). Mảng rỗng là kết quả HỢP LỆ; đọc hỏng phải là lỗi có thông báo.
 * Nguyên nhân gốc của "đọc về rỗng" đã khoanh vùng là đóng gói Date qua google.script.run (xem anToanChoTrinhDuyet_ ở DataSync.gs),
 * không phải Sheets trả thiếu. Việc nạp dữ liệu nay đi qua layDuLieuKhoiTao (DataSync.gs).
 */

/**
 * TẢI TOÀN BỘ dữ liệu danh mục cần cho cả app — ĐÚNG 1 LẦN GỌI DUY NHẤT khi mở trang, thay cho việc
 * mỗi tab tự gọi server riêng mỗi lần mở (từng gây ra hàng loạt lượt gọi chồng chéo cùng lúc, thấy
 * rõ trong log Executions — nhiều khả năng là nguyên nhân sâu xa của toàn bộ hiện tượng "lúc đúng lúc
 * sai" suốt thời gian qua). Từ giờ: tải 1 lần, mọi tab dùng lại dữ liệu đã có sẵn trong bộ nhớ trình
 * duyệt, KHÔNG gọi lại server khi chuyển tab nữa — chỉ gọi lại khi có lưu/xoá dữ liệu thật sự.
 */
/**
 * Chuyển mọi giá trị kiểu Date bên trong từng object của mảng thành CHUỖI (yyyy-MM-dd) trước khi trả
 * qua google.script.run — ĐÂY LÀ NGUYÊN NHÂN GỐC đã xác định được của hiện tượng "có dữ liệu thật
 * trên Sheet nhưng app luôn đọc về rỗng, dù server chạy xong không báo lỗi gì cả": khi 1 mảng object
 * trả trực tiếp từ server có chứa giá trị Date (VD: cột NgayHopDong, NgayGiaiNgan...), việc đóng gói
 * (serialize) để gửi qua lại giữa Apps Script và trình duyệt đôi khi lỗi/rỗng ở môi trường này — trong
 * khi mảng/])object CHỈ chứa chuỗi/số (không có Date) luôn về đúng (đã kiểm chứng: Danh mục công ty
 * — sheet gần như không có cột Date nào có giá trị — luôn đọc đúng; Danh mục hợp đồng — có cột Ngày
 * hợp đồng kiểu Date — luôn về rỗng). Chuyển Date thành chuỗi ISO ở đây tránh hẳn vấn đề, và các hàm
 * phía client đọc ngày (toInputDate, v.v.) đều đã tự new Date(chuỗi) nên không cần sửa gì thêm ở JS.
 */
function chuanHoaTruocKhiTra_(ds) {
  return anToanChoTrinhDuyet_(Array.isArray(ds) ? ds : []);
}

/** Danh sách khách hàng/nhà cung cấp — dùng lúc mở trang. */
function layDanhSachKhachHangDayDu() {
  yeuCauDangNhap_();
  return docMien_('KHACHHANG').rows;
}

/** Ngày hôm nay theo múi giờ Việt Nam — dùng đặt mặc định các ô lọc ngày ở client. */
function layNgayHomNay() {
  yeuCauDangNhap_();
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

/**
 * TOÀN BỘ hồ sơ giải ngân, dạng THÔ (đúng tên cột gốc trên Sheet: MaHoSo, TrangThai, LoaiTien...) —
 * dùng để đồng bộ lại DS_HO_SO_GOC ở client sau khi lưu/xoá/đổi trạng thái 1 hồ sơ. KHÔNG dùng
 * locDanhSachHoSo() cho việc này — hàm đó trả về dữ liệu đã ghép nối + đổi tên field (dạng
 * camelCase, đã format ngày thành chuỗi) để phục vụ riêng màn Báo cáo/Danh sách, khác hẳn cấu trúc
 * mà renderTongQuan_() ở client đang đọc — dùng nhầm sẽ làm vỡ toàn bộ số liệu Tổng quan.
 */
function layToanBoHoSoGoc() {
  yeuCauDangNhap_();
  return locHoSoTheoPhamVi_(docMien_('HOSO').rows);
}

/** Danh sách công ty vay vốn (cho dropdown). */
function layDanhSachCongTy() {
  yeuCauDangNhap_();
  return locTheoCongTy_(docMien_('CONGTY').rows);
}

/** Danh sách hợp đồng vay (cho dropdown), lọc theo MaCty nếu truyền vào. */

/**
 * Danh sách hợp đồng ĐẦY ĐỦ cho tab "Công ty & Hợp đồng vay" — đọc TRỰC TIẾP, đơn giản, không qua
 * lớp thử-lại nào (giống hệt cách layThongKeTongQuan đã chứng minh luôn đọc đúng).
 */
function layDanhSachHopDongDayDu() {
  yeuCauDangNhap_();
  return locTheoCongTy_(docMien_('HOPDONG').rows); // lỗi đọc được ném ra thẳng; rỗng là rỗng thật
}

/** Toàn bộ hồ sơ giải ngân đã tạo (cho danh sách/lịch sử). */
/**
 * Lọc danh sách hồ sơ dạng bảng — có tự động thử lại 1 lần nếu lần đọc đầu tiên trả về rỗng bất
 * thường (Google Sheets đôi khi đọc lệch/thiếu dữ liệu tạm thời sau khi vừa ghi/sửa dữ liệu).
 * boLoc = { maHoSo, tuNgay, denNgay (lọc theo Ngày giải ngân, yyyy-mm-dd), tenNguoiHuong, maCty, maHD }
 * Trả về mảng: [{ maHoSo, tenCty, soHopDong, soGiayNhanNo, ngayGiaiNgan, soTien, trangThai }, ...]
 * Không truyền bộ lọc nào (boLoc = {}) sẽ trả về TOÀN BỘ hồ sơ.
 */
function locDanhSachHoSo(boLoc) {
  yeuCauDangNhap_();
  return locDanhSachHoSo_(boLoc);
}

function locDanhSachHoSo_(boLoc) {
  boLoc = boLoc || {};
  var dsHoSo = docDanhSachHoSo_(false);
  var dsHopDong = sheetToObjects_(SHEET_HOPDONG);
  var dsCongTy = sheetToObjects_(SHEET_CONGTY);
  var tenNguoiHuongLoc = chuanHoaChuoi_(boLoc.tenNguoiHuong || '');

  var hopDongByMa = {};
  dsHopDong.forEach(function (h) { hopDongByMa[h.MaHD] = h; });
  var congTyByMa = {};
  dsCongTy.forEach(function (c) { congTyByMa[c.MaCty] = c; });
  // Chỉ đọc chi tiết khi cần lọc người hưởng; danh sách thường chỉ dùng bảng cha.
  var hoSoKhopNguoiHuong = Object.create(null);
  if (tenNguoiHuongLoc) {
    sheetToObjects_(SHEET_CHITIET).forEach(function (ct) {
      if (chuanHoaChuoi_(ct.TenNguoiHuong).indexOf(tenNguoiHuongLoc) >= 0) {
        hoSoKhopNguoiHuong[ct.MaHoSo] = true;
      }
    });
  }

  var tu = boLoc.tuNgay ? new Date(boLoc.tuNgay + 'T00:00:00') : null;
  var den = boLoc.denNgay ? new Date(boLoc.denNgay + 'T23:59:59') : null;
  var maHoSoLoc = chuanHoaChuoi_(boLoc.maHoSo || '');

  var out = [];
  dsHoSo.forEach(function (hs) {
    if (maHoSoLoc && chuanHoaChuoi_(hs.MaHoSo).indexOf(maHoSoLoc) < 0) return;

    var hd = hopDongByMa[hs.MaHD];
    if (boLoc.maCty && (!hd || hd.MaCty !== boLoc.maCty)) return;
    if (boLoc.maHD && hs.MaHD !== boLoc.maHD) return;

    var ngayGN = hs.NgayGiaiNgan instanceof Date ? hs.NgayGiaiNgan : (hs.NgayGiaiNgan ? new Date(hs.NgayGiaiNgan) : null);
    // Chỉ loại theo khoảng ngày khi hồ sơ CÓ Ngày giải ngân; hồ sơ chưa điền ngày này vẫn được giữ lại
    // nếu chỉ lọc theo Mã hồ sơ/Công ty/Hợp đồng/Tên người thụ hưởng.
    if (tu && ngayGN && ngayGN < tu) return;
    if (den && ngayGN && ngayGN > den) return;

    if (tenNguoiHuongLoc && !hoSoKhopNguoiHuong[hs.MaHoSo]) return;

    var loaiTienHS = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    if (boLoc.loaiTien && String(boLoc.loaiTien).toUpperCase() !== loaiTienHS) return;

    var cty = hd ? congTyByMa[hd.MaCty] : null;
    out.push({
      maHoSo: hs.MaHoSo,
      tenCty: cty ? cty.TenCty : '(không rõ công ty)',
      soHopDong: hd ? hd.SoHopDong : '',
      soGiayNhanNo: hs.SoGiayNhanNo || '',
      ngayGiaiNgan: formatNgay_(hs.NgayGiaiNgan),
      loaiTien: loaiTienHS,
      tyGiaBan: Number(hs.TyGiaBan) || 0,
      soTien: Number(hs.SoTienNhanNoLanNay) || 0,
      trangThai: hs.TrangThai || '', revision: soRevision_(hs),
      _row: hs._row || 0
    });
  });

  out.sort(function (a, b) { return b._row - a._row; });
  return out;
}

function timTheoTruong_(list, field, value) {
  for (var i = 0; i < list.length; i++) {
    if (String(list[i][field]) === String(value)) return list[i];
  }
  return null;
}

function layCongTyTheoMa_(maCty) {
  return timTheoTruong_(sheetToObjects_(SHEET_CONGTY), 'MaCty', maCty);
}

function layHopDongTheoMa_(maHD) {
  return timTheoTruong_(sheetToObjects_(SHEET_HOPDONG), 'MaHD', maHD);
}

/**
 * Đọc CHỈ các dòng có cột A = ma (khoá của mọi sheet nghiệp vụ nằm ở cột A): 1 lượt đọc MỘT cột + 1 lượt/khối dòng liên tiếp,
 * thay vì đọc cả sheet chỉ để lấy 1 hồ sơ (O(1) lần gọi, ô đọc ~ số dòng × 1 thay vì × số cột). Kết quả cùng dạng sheetToObjects_ (kèm _row).
 */
function docCacDongTheoKhoaA_(tenSheet, ma) { return docCacDongTheoCot_(tenSheet, '', ma); }

/** Như trên nhưng theo cột bất kỳ (tenCot rỗng = cột A): đọc đúng 1 cột để tìm, rồi chỉ đọc các dòng khớp. */
function docCacDongTheoCot_(tenSheet, tenCot, ma) {
  var sh = getSS_().getSheetByName(tenSheet);
  if (!sh) throw new Error('Không tìm thấy tab "' + tenSheet + '". Hãy chạy "Khởi tạo / kiểm tra cấu trúc Sheet".');
  var cuoi = sh.getLastRow(), nCot = sh.getLastColumn();
  if (cuoi < 2 || nCot < 1) return [];
  var headers = sh.getRange(1, 1, 1, nCot).getValues()[0];
  var thieu = (COT_BAT_BUOC_SHEET_[tenSheet] || []).filter(function (c) { return headers.indexOf(c) < 0; });
  if (thieu.length) throw new Error('Lỗi cấu trúc tab "' + tenSheet + '": thiếu cột ' + thieu.join(', ') + '. Hãy chạy "Khởi tạo / kiểm tra cấu trúc Sheet".');
  var cot = tenCot ? headers.indexOf(tenCot) + 1 : 1;
  if (cot < 1) return [];
  var cotDoc = sh.getRange(2, cot, cuoi - 1, 1).getValues(), dong = [];
  for (var i = 0; i < cotDoc.length; i++) if (cotDoc[i][0] !== '' && cotDoc[i][0] !== null && String(cotDoc[i][0]) === String(ma)) dong.push(i + 2);
  var out = [];
  for (var a = 0; a < dong.length;) {
    var b = a; while (b + 1 < dong.length && dong[b + 1] === dong[b] + 1) b++; // khối liên tiếp
    var vals = sh.getRange(dong[a], 1, dong[b] - dong[a] + 1, nCot).getValues();
    for (var k = 0; k < vals.length; k++) {
      var obj = {}; for (var c = 0; c < headers.length; c++) obj[headers[c]] = vals[k][c];
      obj._row = dong[a] + k; out.push(obj);
    }
    a = b + 1;
  }
  return out;
}

function layHoSoTheoMa_(maHoSo) {
  var h = docCacDongTheoKhoaA_(SHEET_HOSO, maHoSo).filter(function (x) { return !laDaXoa_(x.DaXoa); })[0] || null;
  if (h && !hoSoTrongPhamVi_(h)) throw new Error('Hồ sơ ' + maHoSo + ' nằm ngoài phạm vi công ty được cấp.');
  return h;
}

/** Chi tiết các dòng thụ hưởng của 1 hồ sơ giải ngân. */
function layChiTietTheoHoSo_(maHoSo) {
  var rows = docCacDongTheoKhoaA_(SHEET_CHITIET, maHoSo);
  rows.sort(function (a, b) { return (Number(a.STT) || 0) - (Number(b.STT) || 0); });
  return rows;
}


/** Danh sách khách hàng ĐẦY ĐỦ cho tab "Khách hàng" — đọc trực tiếp, đơn giản, không qua lớp thử-lại. */
/**
 * Lưu (tạo mới/cập nhật) 1 khách hàng ở tab DM_KhachHang.
 * payload = { maKH (rỗng nếu tạo mới), tenKhachHang, maSoThue, soTaiKhoan, taiNganHang, diaChi, ghiChu }
 */
function luuKhachHang(payload) {
  yeuCauDangNhap_();
  return voiKhoa_(function () { return luuKhachHang_(payload); });
}

function luuKhachHang_(payload) {
  if (!payload.tenKhachHang) throw new Error('Vui lòng nhập Tên khách hàng.');
  if (!payload.soTaiKhoan) throw new Error('Vui lòng nhập Số tài khoản.');
  if (!payload.taiNganHang) throw new Error('Vui lòng nhập Ngân hàng — chỉ có Số tài khoản thì không biết chuyển tiền đến ngân hàng nào.');
  var sh = getSS_().getSheetByName(SHEET_KHACHHANG);
  damBaoCotSheet_(sh, ['Revision', 'KhoaYeuCau']);
  var maKH = payload.maKH;
  // Không chỉ dựa vào "có mã hay không" để suy ra mới/cũ — trường hợp tạo khách hàng từ hoá đơn
  // (moTaoSuaKhachHangTuHoaDon_ ở client) đã GÁN SẴN Mã KH = MST dù là khách hàng hoàn toàn mới,
  // nên phải kiểm tra dòng đó có THẬT SỰ tồn tại trên Sheet hay không.
  var rHienCo = maKH ? timDongTheoMa_(SHEET_KHACHHANG, 'MaKH', maKH) : -1;
  var isNew = rHienCo < 0, hienCo = null, khoaYC = String(payload.khoaYeuCau || '').trim().substring(0, 80), rev = 1;
  var tenChuan = String(payload.tenKhachHang || '').trim(), stk = String(payload.soTaiKhoan || '').trim();
  if (isNew && khoaYC) { // gửi lại cùng yêu cầu tạo (mất phản hồi rồi bấm lưu lại): trả đúng khách hàng đã tạo, không sinh bản trùng
    var daTao = sheetToObjects_(SHEET_KHACHHANG).filter(function (k) { return String(k.KhoaYeuCau || '') === khoaYC; })[0];
    if (daTao) {
      if (String(daTao.TenKhachHang || '').trim() !== tenChuan || String(daTao.SoTaiKhoan || '').trim() !== stk) throw new Error('Khoá yêu cầu này đã dùng để tạo khách hàng ' + daTao.MaKH + ' với nội dung khác (tên/số tài khoản) — tải lại màn hình rồi nhập yêu cầu mới.');
      return { maKH: String(daTao.MaKH), trungLap: true, revision: Number(daTao.Revision) || 1 };
    }
  }
  if (!isNew) { // sửa: bắt buộc phiên bản đang xem; lệch = người khác vừa sửa → không ghi đè
    hienCo = sheetToObjects_(SHEET_KHACHHANG).filter(function (k) { return String(k.MaKH) === String(maKH); })[0] || {};
    var cur = Number(hienCo.Revision) || 0, kv = payload.expectedRevision;
    if (kv === undefined || kv === null || String(kv).trim() === '') throw new Error('Thiếu phiên bản của khách hàng ' + maKH + ' (expectedRevision) — tải lại danh sách rồi sửa lại.');
    if (Number(kv) !== cur) throw new Error('XUNG_DOT_PHIEN_BAN|' + cur + '|Khách hàng ' + maKH + ' đã được người khác thay đổi (phiên bản hiện tại ' + cur + ', bạn đang xem ' + kv + '). Tải lại rồi sửa lại để không ghi đè số tài khoản/ngân hàng của họ.');
    rev = cur + 1; khoaYC = String(hienCo.KhoaYeuCau || '');
  }
  if (isNew && !maKH) maKH = sinhMaTuDong_(SHEET_KHACHHANG, 'KH', 3);

  var giaTriTheoTen = {
    MaKH: maKH, TenKhachHang: payload.tenKhachHang, MaSoThue: payload.maSoThue || '',
    DiaChi: payload.diaChi || '', SoTaiKhoan: String(payload.soTaiKhoan || ''),
    TaiNganHang: payload.taiNganHang || '', DienThoai: payload.dienThoai || '',
    Email: payload.email || '', GhiChu: payload.ghiChu || '', Revision: rev, KhoaYeuCau: khoaYC
  };
  var headers = damBaoCotSheet_(sh, Object.keys(giaTriTheoTen));
  var row = headers.map(function (h) { return giaTriTheoTen.hasOwnProperty(h) ? giaTriTheoTen[h] : ''; });

  if (isNew) {
    dinhDangVanBanCotTaiKhoan_(sh, headers, timDongThatCuoiCung_(sh) + 1, 1);
    themDongVaoCuoiThat_(sh, row);
  } else {
    dinhDangVanBanCotTaiKhoan_(sh, headers, rHienCo, 1);
    sh.getRange(rHienCo, 1, 1, row.length).setValues([row]);
  }
  SpreadsheetApp.flush();
  tangRevision_('KHACHHANG');
  return { maKH: maKH, revision: rev };
}

/**
 * Tự động thêm/cập nhật khách hàng theo Mã số thuế đọc được từ hoá đơn — Mã khách hàng = MST
 * (khác với khách hàng tạo tay, dùng mã tự sinh KHxxx). Nếu đã có khách hàng nào đó (tạo tay hoặc
 * từ hoá đơn trước) mang đúng MST này rồi thì chỉ cập nhật tên, không tạo trùng.
 */
function upsertKhachHangTheoMST_(mst, tenDonVi) {
  mst = String(mst || '').trim();
  if (!mst) return;
  var sh = getSS_().getSheetByName(SHEET_KHACHHANG);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var ds = sheetToObjects_(SHEET_KHACHHANG);
  var trungMaKH = ds.filter(function (k) { return k.MaKH === mst; })[0];
  var trungMST = ds.filter(function (k) { return String(k.MaSoThue || '').trim() === mst; })[0];
  var hienCo = trungMaKH || trungMST;

  if (hienCo) {
    var r = timDongTheoMa_(SHEET_KHACHHANG, 'MaKH', hienCo.MaKH);
    if (r > 0 && tenDonVi && !hienCo.TenKhachHang) {
      var colTen = headers.indexOf('TenKhachHang') + 1;
      if (colTen > 0) sh.getRange(r, colTen).setValue(tenDonVi);
      tangRevision_('KHACHHANG');
    }
    return;
  }
  themDongVaoCuoiThat_(sh, headers.map(function (h) {
    if (h === 'MaKH') return mst;
    if (h === 'TenKhachHang') return tenDonVi || ('Khách hàng MST ' + mst);
    if (h === 'MaSoThue') return mst;
    if (h === 'GhiChu') return 'Tự động tạo từ hoá đơn tải lên';
    return '';
  }));
  tangRevision_('KHACHHANG');
}

function timDongTheoMa_(sheetName, maCot, giaTri) {
  var sh = getSS_().getSheetByName(sheetName);
  var values = layGiaTriThatCuaSheet_(sh);
  var headers = values[0];
  var idx = headers.indexOf(maCot);
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idx]) === String(giaTri)) return r + 1; // 1-indexed row
  }
  return -1;
}

/**
 * Lưu (tạo mới/cập nhật) 1 công ty vay vốn ở tab DM_CongTy.
 * payload = { maCty (rỗng nếu tạo mới), tenCty, maCIF, diaChiTruSo, dienThoai, fax,
 *             nguoiDaiDien, chucVu, giayUyQuyenSo, giayUyQuyenNgay }
 */
/**
 * Lưu (tạo mới lần ĐẦU TIÊN hoặc cập nhật) công ty vay vốn ở tab DM_CongTy.
 * Hệ thống chỉ quản lý ĐÚNG 1 công ty — chỉ Xem/Sửa, không có "thêm công ty khác". Chặn ở CẢ 2 phía:
 * giao diện (không có nút/luồng tạo công ty thứ 2) VÀ ở đây (nếu Sheet đã có sẵn 1 dòng, luôn ghi
 * đè lên đúng dòng đó — kể cả khi payload.maCty rỗng — không bao giờ chèn thêm dòng thứ 2).
 */
/**
 * Đảm bảo 1 sheet có ĐỦ các cột cần thiết trước khi ghi dữ liệu — TỰ BỔ SUNG cột còn thiếu ngay lúc
 * lưu (không chỉ lúc chạy "Khởi tạo / kiểm tra cấu trúc Sheet"). Đây là lưới an toàn cho trường hợp
 * code được cập nhật thêm trường mới (VD: Tên viết tắt, Điện thoại, Email...) nhưng người dùng CHƯA
 * kịp chạy lại "Khởi tạo" — nếu không có bước này, dữ liệu trường mới sẽ bị ghi theo tên cột không
 * tồn tại nên IM LẶNG KHÔNG LƯU ĐƯỢC (báo lưu thành công nhưng dữ liệu biến mất).
 * Trả về mảng header MỚI NHẤT (đã gồm cột vừa bổ sung, nếu có) để dùng ngay cho headers.map(...).
 */
function damBaoCotSheet_(sh, danhSachCotCanCo) {
  var soCotHienTai = sh.getLastColumn();
  var headerHienTai = soCotHienTai > 0 ? sh.getRange(1, 1, 1, soCotHienTai).getValues()[0] : [];
  var headerChuan = headerHienTai.map(function (h) { return String(h || '').trim(); });
  var thieu = danhSachCotCanCo.filter(function (c) { return headerChuan.indexOf(c) < 0; });
  if (thieu.length) {
    var batDau = soCotHienTai + 1;
    sh.getRange(1, batDau, 1, thieu.length).setValues([thieu]);
    sh.getRange(1, batDau, 1, thieu.length).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
  }
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function luuCongTy(payload) {
  yeuCauDangNhap_();
  return voiKhoa_(function () { return luuCongTy_(payload); });
}

function luuCongTy_(payload) {
  if (phamViCongTyNguoiDung_().length) {
    // Người dùng bị giới hạn theo công ty không tạo công ty mới và không sửa công ty ngoài phạm vi.
    if (!payload.maCty) throw new Error('Tài khoản bị giới hạn theo công ty nên không tạo công ty mới.');
    chanNeuNgoaiPhamViCongTy_(payload.maCty);
  }
  if (!payload.tenCty) throw new Error('Vui lòng nhập Tên công ty.');
  var sh = getSS_().getSheetByName(SHEET_CONGTY);
  var maCty = payload.maCty;

  // Quy ước một công ty: chưa có công ty nào thì tạo dòng đầu tiên (duy nhất). Đã có công ty: PHẢI cập nhật đúng dòng của mã được chọn — trước đây luôn ghi vào dòng đầu tiên nên sửa
  // công ty B làm hỏng dữ liệu công ty A. Không gửi mã: chỉ chấp nhận khi hệ thống có đúng một công ty (không đoán trong nhiều công ty). Nhiều công ty mà mã lạ: báo lỗi, không ghi sang công ty khác.
  var dsHienCo = sheetToObjects_(SHEET_CONGTY);
  maCty = String(maCty || '').trim();
  if (dsHienCo.length > 0) {
    if (!maCty) {
      if (dsHienCo.length > 1) throw new Error('Có ' + dsHienCo.length + ' công ty — hãy chọn công ty cần sửa (thiếu mã công ty).');
      maCty = dsHienCo[0].MaCty;
    } else if (!dsHienCo.some(function (c) { return String(c.MaCty) === maCty; })) {
      if (dsHienCo.length > 1) throw new Error('Không tìm thấy công ty ' + maCty + ' để cập nhật.');
      maCty = dsHienCo[0].MaCty; // hệ thống một công ty: mã gửi lên lạc hậu thì cập nhật công ty duy nhất, không tạo dòng mới
    }
  } else if (!maCty) {
    maCty = sinhMaTuDong_(SHEET_CONGTY, 'CTY', 3);
  }
  var isNew = dsHienCo.length === 0, revCty = 1;
  if (!isNew) { // sửa: bắt buộc phiên bản đang xem; lệch = người khác vừa sửa → không ghi đè
    var cuCty = dsHienCo.filter(function (c) { return String(c.MaCty) === String(maCty); })[0] || {}, curCty = Number(cuCty.Revision) || 0, kvCty = payload.expectedRevision;
    if (kvCty === undefined || kvCty === null || String(kvCty).trim() === '') throw new Error('Thiếu phiên bản của công ty ' + maCty + ' (expectedRevision) — tải lại màn hình rồi sửa lại.');
    if (Number(kvCty) !== curCty) throw new Error('XUNG_DOT_PHIEN_BAN|' + curCty + '|Công ty ' + maCty + ' đã được người khác thay đổi (phiên bản hiện tại ' + curCty + ', bạn đang xem ' + kvCty + '). Tải lại rồi sửa lại để không ghi đè thay đổi của họ.');
    revCty = curCty + 1;
  }

  // Ghi theo TÊN cột (không theo vị trí cố định) — cột mới thêm sau này (VD: TenVietTat) có thể
  // nằm ở vị trí khác nhau giữa Sheet mới tạo và Sheet đã nâng cấp, nên không dùng mảng vị trí cứng.
  var giaTriTheoTen = {
    MaCty: maCty, TenCty: payload.tenCty, TenVietTat: payload.tenVietTat || '',
    MaSoThue: payload.maSoThue || '',
    MaCIF: payload.maCIF || '', DiaChiTruSo: payload.diaChiTruSo || '',
    DienThoai: payload.dienThoai || '', Fax: payload.fax || '',
    NguoiDaiDien: payload.nguoiDaiDien || '', ChucVu: payload.chucVu || '',
    GiayUyQuyenSo: payload.giayUyQuyenSo || '', GiayUyQuyenNgay: payload.giayUyQuyenNgay || '',
    NguoiLapBieu: payload.nguoiLapBieu || '', TaiKhoanVND: payload.taiKhoanVND || '',
    TaiKhoanUSD: payload.taiKhoanUSD || '', Revision: revCty
  };
  var headers = damBaoCotSheet_(sh, Object.keys(giaTriTheoTen));
  var hangMoi = headers.map(function (h) {
    return giaTriTheoTen.hasOwnProperty(h) ? giaTriTheoTen[h] : '';
  });

  if (isNew) {
    dinhDangVanBanCotTaiKhoan_(sh, headers, timDongThatCuoiCung_(sh) + 1, 1);
    themDongVaoCuoiThat_(sh, hangMoi);
  } else {
    var r = timDongTheoMa_(SHEET_CONGTY, 'MaCty', maCty);
    if (r < 0) throw new Error('Không tìm thấy công ty ' + maCty + ' để cập nhật.');
    dinhDangVanBanCotTaiKhoan_(sh, headers, r, 1);
    sh.getRange(r, 1, 1, hangMoi.length).setValues([hangMoi]);
  }
  SpreadsheetApp.flush();
  tangRevision_('CONGTY');
  return { maCty: maCty, revision: revCty };
}

/**
 * Lưu (tạo mới/cập nhật) 1 hợp đồng cho vay theo hạn mức ở tab DM_HopDongVay.
 * payload = { maHD (rỗng nếu tạo mới), maCty, soHopDong, ngayHopDong, tenNganHang, chiNhanh,
 *             diaChiChiNhanh, mstChiNhanh, hanMucVay, laiSuatTrongHan, moTaLaiSuatQuaHan,
 *             laiSuatLaiChamTra, kyHanTraGoc, kyHanTraLai }
 */

var TINH_TRANG_HOP_DONG_ = ['Nháp', 'Đang hiệu lực', 'Hết hiệu lực', 'Đã tất toán'];
function tinhTrangHopDong_(h) {
  // Hợp đồng cũ chưa phân loại phải được xác nhận trước khi tạo hồ sơ mới.
  return String((h && h.TinhTrang) || 'Nháp');
}
function kiemTraHopDongThemHoSo_(maHD) {
  var h = layHopDongTheoMa_(maHD);
  if (!h) throw new Error('Không tìm thấy hợp đồng vay.');
  chanNeuNgoaiPhamViCongTy_(h.MaCty);
  if (tinhTrangHopDong_(h) !== 'Đang hiệu lực') throw new Error('Chỉ hợp đồng Đang hiệu lực mới được thêm hồ sơ vay. Hợp đồng này: ' + tinhTrangHopDong_(h) + '.');
  return h;
}

function luuHopDong(payload) {
  yeuCauDangNhap_();
  return voiKhoa_(function () { return luuHopDong_(payload); });
}

function luuHopDong_(payload) {
  if (!payload.maCty) throw new Error('Vui lòng chọn công ty vay vốn.');
  chanNeuNgoaiPhamViCongTy_(payload.maCty);
  if (payload.maHD) { var hdHienCo = layHopDongTheoMa_(payload.maHD); if (hdHienCo) chanNeuNgoaiPhamViCongTy_(hdHienCo.MaCty); }
  if (!payload.soHopDong) throw new Error('Vui lòng nhập Số hợp đồng.');
  var sh = getSS_().getSheetByName(SHEET_HOPDONG);
  var maHD = payload.maHD;
  var isNew = !maHD;
  var tinhTrang = payload.tinhTrang || (isNew ? 'Nháp' : tinhTrangHopDong_(layHopDongTheoMa_(maHD)));
  if (TINH_TRANG_HOP_DONG_.indexOf(tinhTrang) < 0) throw new Error('Tình trạng hợp đồng không hợp lệ.');
  var hopDongCu = isNew ? null : layHopDongTheoMa_(maHD);
  if (!isNew && !hopDongCu) throw new Error('Không tìm thấy hợp đồng để sửa.');
  if (!isNew) kiemTraRevisionBatBuoc_(hopDongCu, payload.expectedRevision);
  var chuan = function (v) { return String(v || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  var daCo = sheetToObjects_(SHEET_HOPDONG).filter(function (h) { return String(h.MaHD) !== String(maHD || '') && String(h.MaCty) === String(payload.maCty) && chuan(h.SoHopDong) === chuan(payload.soHopDong); });
  if (daCo.length) throw new Error('Công ty này đã có hợp đồng số "' + payload.soHopDong + '" (mã ' + daCo[0].MaHD + '). Không lưu trùng số hợp đồng.');
  if (isNew) maHD = sinhMaTuDong_(SHEET_HOPDONG, 'HD', 3);

  var giaTriTheoTen = {
    MaHD: maHD, Revision: hopDongCu ? soRevision_(hopDongCu) + 1 : 1, TinhTrang: tinhTrang, MaCty: payload.maCty, SoHopDong: payload.soHopDong, NgayHopDong: toDateOrEmpty_(payload.ngayHopDong, 'Ngày hợp đồng'),
    TenNganHang: payload.tenNganHang || '', ChiNhanh: payload.chiNhanh || '', DiaChiChiNhanh: payload.diaChiChiNhanh || '',
    MST_ChiNhanh: payload.mstChiNhanh || '', HanMucVay: docTienNguyen_(payload.hanMucVay, 'Hạn mức vay'),
    'LaiSuatTrongHan_%': Number(payload.laiSuatTrongHan) || 0, MoTaLaiSuatQuaHan: payload.moTaLaiSuatQuaHan || '',
    'LaiSuatLaiChamTra_%': Number(payload.laiSuatLaiChamTra) || 0, KyHanTraGoc: payload.kyHanTraGoc || 'Cuối kỳ',
    KyHanTraLai: payload.kyHanTraLai || 'Hàng tháng',
    NguoiDaiDienNH: payload.nguoiDaiDienNH || '', ChucVuNH: payload.chucVuNH || '', GiayUyQuyenNH: payload.giayUyQuyenNH || '',
    DienThoaiNH: payload.dienThoaiNH || '', SoHopDongKhungMBNT: payload.soHopDongKhungMBNT || '',
    NgayHopDongKhungMBNT: toDateOrEmpty_(payload.ngayHopDongKhungMBNT, 'Ngày hợp đồng khung MBNT')
  };
  var headers = damBaoCotSheet_(sh, Object.keys(giaTriTheoTen));
  var row = headers.map(function (h) { return giaTriTheoTen.hasOwnProperty(h) ? giaTriTheoTen[h] : (hopDongCu && hopDongCu[h] !== undefined ? hopDongCu[h] : ''); });

  if (isNew) {
    themDongVaoCuoiThat_(sh, row);
  } else {
    var r = timDongTheoMa_(SHEET_HOPDONG, 'MaHD', maHD);
    if (r < 0) throw new Error('Không tìm thấy hợp đồng ' + maHD + ' để cập nhật.');
    sh.getRange(r, 1, 1, row.length).setValues([row]);
  }
  // Đảm bảo ghi xong THẬT SỰ trước khi trả kết quả về client — nếu không, lần đọc lại ngay sau khi
  // lưu (napDanhMucCoBan gọi liền sau khi lưu thành công) đôi khi chưa thấy dòng vừa thêm do độ trễ
  // của Google Sheets, khiến hợp đồng "có lưu nhưng không hiện trên webapp".
  SpreadsheetApp.flush();
  tangRevision_('HOPDONG');
  return { maHD: maHD };
}


/** Xóa hợp đồng chưa được dùng; kiểm tra và ghi trong cùng khóa với thao tác lưu hồ sơ. */
function xoaHopDong(maHD, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    maHD = String(maHD || '').trim();
    if (!maHD) throw new Error('Thiếu mã hợp đồng.');
    var ds = sheetToObjects_(SHEET_HOPDONG).filter(function (h) { return String(h.MaHD) === maHD; });
    if (ds.length !== 1) throw new Error('Hợp đồng không tồn tại hoặc bị trùng mã. Hãy làm mới và kiểm tra danh mục.');
    chanNeuNgoaiPhamViCongTy_(ds[0].MaCty);
    kiemTraRevisionBatBuoc_(ds[0], expectedRevision);
    // Bao gồm cả hồ sơ đã xóa mềm để giữ khả năng khôi phục và đối chiếu.
    var lienKet = sheetToObjects_(SHEET_HOSO).some(function (h) { return String(h.MaHD) === maHD; });
    if (lienKet) throw new Error('Không thể xóa: hợp đồng đã có hồ sơ giải ngân liên kết, kể cả hồ sơ đã xóa mềm.');
    xoaDongAnToan_(getSS_().getSheetByName(SHEET_HOPDONG), ds[0]._row);
    SpreadsheetApp.flush();
    tangRevision_('HOPDONG');
    return { maHD: maHD, daXoa: true };
  });
}

/** Nếu v là chuỗi ngày dạng yyyy-MM-dd hoặc dd/MM/yyyy thì ngày/tháng/năm phải TỒN TẠI thật (kể cả năm nhuận); sai → ném lỗi.
 *  Không để `new Date('2026-02-31')` tự nhảy sang 03/03 rồi lưu im lặng vào hồ sơ. Giá trị rỗng/Date/định dạng khác: bỏ qua. */
function kiemTraNgayTonTai_(v, ten) {
  if (!v || v instanceof Date) return;
  var s = String(v).trim(), m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s), y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return;
  var t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) throw new Error((ten || 'Ngày') + ' "' + s + '" không tồn tại trong lịch. Hãy nhập lại ngày hợp lệ.');
}

function toDateOrEmpty_(v, ten) {
  if (!v) return '';
  if (v instanceof Date) return v;
  kiemTraNgayTonTai_(v, ten);
  var d = new Date(v);
  return isNaN(d.getTime()) ? v : d;
}

/**
 * Lưu (tạo mới hoặc cập nhật) một hồ sơ giải ngân + danh sách chi tiết thụ hưởng.
 * payload = {
 *   maHoSo (rỗng nếu tạo mới), maHD, soGiayNhanNo, ngayGiayNhanNo, duNoHienTai,
 *   soTienNhanNoLanNay, phuongThucThanhToan, mucDichSuDungVon, thoiHanChoVayNgay,
 *   ngayGiaiNgan, ngayDenHan, taiLieuChungMinhMucDich, nguoiLapBieu, soThamChieu, trangThai,
 *   chiTiet: [{ tenNguoiHuong, soTaiKhoan, taiNganHang, loaiTien, noiDungThanhToan,
 *               soTien, chuyenTienNhanh, taiLieuSo, ngayTaiLieu, donViLapTaiLieu,
 *               ngayCapGiayToTuyThan, ghiChu }, ...]
 * }
 * Lưu ý: nếu payload.trangThai để trống, hồ sơ MỚI sẽ mặc định "Đã tạo hồ sơ"; khi cập nhật hồ sơ
 * đã có, client nên truyền lại trạng thái hiện tại để không bị vô tình reset trạng thái.
 */
function luuHoSoGiaiNgan(payload) {
  yeuCauDangNhap_();
  return voiKhoa_(function () { return luuHoSoGiaiNganKhongKhoa_(payload); });
}

/** Liệt kê các số tiền CÓ PHẦN THẬP PHÂN trong dữ liệu đã lưu của 1 hồ sơ (không sửa gì). */
function phatHienTienLe_(hoSo, chiTiet) {
  var kq = [];
  function xet(viTri, v, vnd) {
    if (v === '' || v === null || v === undefined) return;
    var n = Number(v);
    if (isFinite(n) && (String((hoSo || {}).LoaiTien).toUpperCase() === 'USD' && !vnd ? !/^\d+(\.\d{1,2})?$/.test(String(n)) : Math.floor(n) !== n)) kq.push(viTri + ' = ' + v);
  }
  xet('HoSoGiaiNgan.DuNoHienTai', hoSo && hoSo.DuNoHienTai);
  xet('HoSoGiaiNgan.SoTienNhanNoLanNay', hoSo && hoSo.SoTienNhanNoLanNay);
  (chiTiet || []).forEach(function (ct, i) {
    xet('ChiTietThuHuong dòng ' + (i + 1) + ' SoTien', ct.SoTien);
    xet('ChiTietThuHuong dòng ' + (i + 1) + ' SoTienQuyDoi', ct.SoTienQuyDoi, true);
  });
  return kq;
}

function luuHoSoGiaiNganKhongKhoa_(payload) {
  var ss = getSS_();
  var shHoSo = ss.getSheetByName(SHEET_HOSO);
  damBaoCotHoSoDomain_(); // Sheet cũ chưa có cột mới → thêm vào cuối (không đụng dữ liệu cũ)
  var shChiTiet = ss.getSheetByName(SHEET_CHITIET);

  var maHoSo = payload.maHoSo;
  var isNew = !maHoSo;
  // IDEMPOTENCY khi TẠO MỚI: nếu mạng đứt sau khi máy chủ đã ghi, lần gửi lại cùng khoaYeuCau trả đúng hồ sơ đã tạo thay vì tạo bản trùng.
  var khoaYeuCau = String(payload.khoaYeuCau || '').trim();
  if (isNew && khoaYeuCau) {
    var daCo = docCacDongTheoCot_(SHEET_HOSO, 'KhoaYeuCau', khoaYeuCau)[0];
    if (daCo) return { maHoSo: daCo.MaHoSo, trangThai: daCo.TrangThai, revision: soRevision_(daCo), daCoTuTruoc: true };
  }
  if (!isNew) tuPhucHoiGhiDoDangCuaHoSo_(maHoSo); // lần lưu trước chết giữa chừng → phục hồi trước khi ghi tiếp
  var existing = isNew ? null : layHoSoTheoMa_(maHoSo);
  if (!isNew && !existing) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + ' để cập nhật.');
  if (existing && existing.TrangThai !== TT_NHAP) {
    throw new Error('Hồ sơ ' + maHoSo + ' đang ở trạng thái "' + existing.TrangThai + '" nên không sửa được' +
      (existing.TrangThai === TT_DA_TAO ? ' — hãy bấm "Chuyển về Nháp" trước khi sửa.' : '.'));
  }
  if (isNew || (existing && String(existing.MaHD) !== String(payload.maHD))) kiemTraHopDongThemHoSo_(payload.maHD);
  if (existing && Number(existing.PhienBanTien) === 2 && Number(payload.phienBanTien) !== 2) throw new Error('Hồ sơ dùng mô hình tiền mới; hãy tải lại ứng dụng để sửa.');
  if (existing) kiemTraRevisionBatBuoc_(existing, payload.expectedRevision); // cập nhật hồ sơ có sẵn: BẮT BUỘC đúng revision

  // ===== Loại tiền vay của hồ sơ (VND / USD) — quyết định luồng chứng từ và cách quy đổi =====
  // Kiểm tra TOÀN BỘ số tiền (nguyên, không cents, tổng khớp) TRƯỚC khi ghi bất cứ thứ gì xuống Sheet.
  var tien = kiemTraTienHoSo_(payload);
  if (isNew) maHoSo = sinhMaTuDong_(SHEET_HOSO, 'HS', 4);
  var loaiTien = tien.loaiTien;
  var tyGiaBan = tien.tyGiaBan;

  var soTienBangChu = loaiTien === 'USD'
    ? soTienUSDBangChu_(tien.soTienLanNay)
    : soThanhChuVN(tien.soTienLanNay);
  var headers = damBaoCotSheet_(shHoSo, ['PhienBanTien', 'USDBan', 'VNDThucNhan', 'VNDTheoTyGia', 'ChenhLechQuyDoi']);

  // Các giá trị hồ sơ TỰ NHẬP — cột nào không có trong đây (VD: các cột Link_...) sẽ được GIỮ NGUYÊN
  // giá trị cũ khi cập nhật (tra theo TÊN cột, không theo vị trí, để không lệch khi thêm cột mới).
  var giaTriTheoTen = {
    MaHoSo: maHoSo,
    MaHD: payload.maHD || '',
    SoGiayNhanNo: payload.soGiayNhanNo || '',
    NgayGiayNhanNo: toDateOrEmpty_(payload.ngayGiayNhanNo, 'Ngày giấy nhận nợ'),
    PhienBanTien: Number(payload.phienBanTien) === 2 ? 2 : 1,
    USDBan: tien.usdBan === undefined ? '' : tien.usdBan,
    VNDThucNhan: tien.vndThucNhan === undefined ? '' : tien.vndThucNhan,
    VNDTheoTyGia: tien.vndTheoTyGia === undefined ? '' : tien.vndTheoTyGia,
    ChenhLechQuyDoi: tien.chenhLechQuyDoi === undefined ? '' : tien.chenhLechQuyDoi,
    DuNoHienTai: tien.duNo,
    LoaiTien: loaiTien,
    TyGiaBan: loaiTien === 'USD' ? tyGiaBan : 0,
    SoTienNhanNoLanNay: tien.soTienLanNay,
    SoTienBangChu: soTienBangChu,
    PhuongThucThanhToan: payload.phuongThucThanhToan || 'Chuyển khoản',
    MucDichSuDungVon: payload.mucDichSuDungVon || '',
    ThoiHanChoVay_Ngay: payload.thoiHanChoVayNgay || '',
    NgayGiaiNgan: toDateOrEmpty_(payload.ngayGiaiNgan, 'Ngày giải ngân'),
    NgayDenHan: toDateOrEmpty_(payload.ngayDenHan, 'Ngày đến hạn'),
    TaiLieuChungMinhMucDich: payload.taiLieuChungMinhMucDich || '',
    LoaiHoSoGiaiNgan: String(payload.loaiHoSoGiaiNgan || '').trim(),
    NguoiLapBieu: payload.nguoiLapBieu || '',
    SoThamChieu: payload.soThamChieu || '',
    TrangThai: existing ? existing.TrangThai : TT_NHAP, // KHÔNG nhận trangThai từ client — chỉ chuyenTrangThaiHoSo_ được đổi
    KhoaYeuCau: existing ? (existing.KhoaYeuCau || '') : khoaYeuCau,
    Revision: existing ? soRevision_(existing) + 1 : 1,
    CapNhatLuc: new Date(),
    CapNhatBoi: layDanhTinh_().email || emailNguoiDung_(),
    NgayTao: existing && existing.NgayTao ? existing.NgayTao : new Date()
  };

  var rowData = headers.map(function (h) {
    if (giaTriTheoTen.hasOwnProperty(h)) return giaTriTheoTen[h];
    // Cột không tự nhập (VD: Link_...) — giữ nguyên giá trị cũ nếu đang cập nhật, để trống nếu tạo mới.
    return existing && existing.hasOwnProperty(h) ? existing[h] : '';
  });

  // Dữ liệu tiền CŨ (nếu có số lẻ lịch sử) — ghi vết trước khi bị thay bằng số nguyên mới người dùng đã nhập.
  var tienLeCu = existing ? phatHienTienLe_(existing, layChiTietTheoHoSo_(maHoSo)) : [];

  var dongHoSoGhi, rowHoSoCu = null;
  if (isNew) {
    dongHoSoGhi = timDongThatCuoiCung_(shHoSo) + 1;
  } else {
    dongHoSoGhi = existing._row;
    rowHoSoCu = headers.map(function (h) { return existing.hasOwnProperty(h) ? existing[h] : ''; });
  }

  // Dựng TRƯỚC toàn bộ dòng chi tiết mới (đã được kiểm tra ở kiemTraTienHoSo_) rồi mới ghi — không ghi dở dang.
  var headerChiTiet = damBaoCotSheet_(shChiTiet, ['MaChiTiet', 'TkTrichNoCheDo', 'TkTrichNo']);
  var chiTiet = payload.chiTiet || [];
  var hangChiTietMoi = chiTiet.map(function (ct, idx) {
    var tkTrich = chuanHoaTkTrichNo_(ct, idx + 1);
    var giaTriDong = {
      MaHoSo: maHoSo,
      STT: idx + 1,
      TkTrichNoCheDo: tkTrich.che,
      TkTrichNo: tkTrich.so,
      MaChiTiet: ct.maChiTiet || ('CT-' + Utilities.getUuid()),
      TenNguoiHuong: ct.tenNguoiHuong || '',
      SoTaiKhoan: ct.soTaiKhoan || '',
      TaiNganHang: ct.taiNganHang || '',
      LoaiTien: tien.chiTiet[idx].loaiTien || loaiTien,
      NoiDungThanhToan: ct.noiDungThanhToan || '',
      LoaiChungTu: ct.loaiChungTu || '',
      SoTien: tien.chiTiet[idx].soTien,
      SoTienQuyDoi: tien.chiTiet[idx].soTienQuyDoi,
      ChuyenTienNhanh_24_7: ct.chuyenTienNhanh || 'N',
      TaiLieuSo: ct.taiLieuSo || '',
      NgayTaiLieu: (kiemTraNgayTonTai_(ct.ngayTaiLieu, 'Ngày tài liệu dòng ' + (idx + 1)), ct.ngayTaiLieu || ''),
      DonViLapTaiLieu: ct.donViLapTaiLieu || ct.tenNguoiHuong || '',
      NgayCapGiayToTuyThan: (kiemTraNgayTonTai_(ct.ngayCapGiayToTuyThan, 'Ngày cấp giấy tờ dòng ' + (idx + 1)), ct.ngayCapGiayToTuyThan || ''),
      GhiChu: ct.ghiChu || ''
    };
    return headerChiTiet.map(function (h) { return giaTriDong.hasOwnProperty(h) ? giaTriDong[h] : ''; });
  });

  // Sao lưu chi tiết cũ để PHỤC HỒI nếu ghi mới thất bại giữa chừng (không để mất dữ liệu).
  var rowsToDelete = [], saoLuuChiTiet = [];
  docCacDongTheoKhoaA_(SHEET_CHITIET, maHoSo).forEach(function (o) { // chỉ các dòng của hồ sơ này (không đọc cả sheet chi tiết)
    rowsToDelete.unshift(o._row); // giảm dần như trước (xoá từ dưới lên)
    saoLuuChiTiet.push(headerChiTiet.map(function (h) { return o[h] === undefined ? '' : o[h]; }));
  });

  var nhatKyGhi = ghiDoDangBatDau_(maHoSo, isNew, rowHoSoCu, saoLuuChiTiet);
  try {
    shHoSo.getRange(dongHoSoGhi, 1, 1, rowData.length).setValues([rowData]);
    xoaCacDongNhom_(shChiTiet, rowsToDelete);
    if (hangChiTietMoi.length) {
      var dongDau = timDongThatCuoiCung_(shChiTiet) + 1;
      dinhDangVanBanCotTaiKhoan_(shChiTiet, headerChiTiet, dongDau, hangChiTietMoi.length);
      shChiTiet.getRange(dongDau, 1, hangChiTietMoi.length, headerChiTiet.length).setValues(hangChiTietMoi);
    }
    SpreadsheetApp.flush();
    var loiXacMinh = xacMinhChaCon_(maHoSo, chiTiet.length, tien.soTienLanNay, Number(payload.phienBanTien) === 2 ? { cha: giaTriTheoTen, con: hangChiTietMoi, headers: headerChiTiet } : null);
    if (loiXacMinh.length) throw new Error('Đối chiếu sau khi ghi không khớp: ' + loiXacMinh.join('; '));
  } catch (eGhi) {
    try {
      // Khôi phục: bỏ chi tiết dở dang (nếu có) rồi ghi lại bản cũ; hồ sơ mới thì xoá dòng vừa ghi.
      var conLai = layGiaTriThatCuaSheet_(shChiTiet);
      for (var q = conLai.length - 1; q >= 1; q--) {
        if (String(conLai[q][0]) === String(maHoSo)) xoaDongAnToan_(shChiTiet, q + 1);
      }
      if (saoLuuChiTiet.length) {
        shChiTiet.getRange(timDongThatCuoiCung_(shChiTiet) + 1, 1, saoLuuChiTiet.length, saoLuuChiTiet[0].length).setValues(saoLuuChiTiet);
      }
      if (isNew) xoaDongAnToan_(shHoSo, dongHoSoGhi); else shHoSo.getRange(dongHoSoGhi, 1, 1, rowHoSoCu.length).setValues([rowHoSoCu]);
      capNhatGhiDoDang_(nhatKyGhi.id, 'DA_PHUC_HOI', 'Ghi lỗi, phục hồi ngay: ' + eGhi.message);
    } catch (ePhucHoi) {
      ghiNhatKy_(maHoSo, 'LOI_PHUC_HOI', 'Ghi thất bại: ' + eGhi.message + ' | Phục hồi thất bại: ' + ePhucHoi.message);
      throw new Error('Lưu hồ sơ thất bại VÀ không phục hồi được tự động. Kiểm tra tab ChiTietThuHuong/NhatKyHeThong (mã ' + maHoSo + '). Lỗi: ' + eGhi.message);
    }
    throw new Error('Lưu hồ sơ thất bại, dữ liệu cũ đã được giữ nguyên: ' + eGhi.message);
  }

  capNhatGhiDoDang_(nhatKyGhi.id, 'HOAN_TAT');
  tangRevision_('HOSO');
  // Đảm bảo ghi xong THẬT SỰ trước khi các bước sau (cập nhật báo cáo nháp, hoặc client đọc lại
  // ngay sau khi lưu) chạy — không dựa vào flush() bên trong capNhatBaoCaoDraft_ vì hàm đó có thể
  // bị bỏ qua sớm (try/catch) nếu lỗi trước khi tới lượt flush.
  SpreadsheetApp.flush();
  capNhatBaoCaoNhapAnToan_(maHoSo);

  ghiNhatKy_(maHoSo, isNew ? 'TAO_HO_SO' : 'SUA_HO_SO',
    loaiTien + ' | tổng=' + tien.soTienLanNay + ' | ' + chiTiet.length + ' dòng' +
    (tienLeCu.length ? ' | SỬA SỐ TIỀN LẺ LỊCH SỬ (giá trị cũ: ' + tienLeCu.join('; ') + ')' : ''));
  return { maHoSo: maHoSo, trangThai: giaTriTheoTen.TrangThai, revision: giaTriTheoTen.Revision };
}

/**
 * Cập nhật CHỈ thông tin KHÔNG phải tiền của hồ sơ (và của từng dòng thụ hưởng, ghép theo STT). Dùng cho hồ sơ cũ có
 * số tiền lẻ: các giá trị tiền (DuNoHienTai, SoTienNhanNoLanNay, SoTienBangChu, TyGiaBan, SoTien, SoTienQuyDoi) được GIỮ
 * NGUYÊN trạng — không đọc lại, không làm tròn, không ghi lại. Số dòng thụ hưởng không được đổi (đổi số dòng là đổi tiền).
 */
function capNhatThongTinPhiTienTe(payload) {
  yeuCauDangNhap_();
  return voiKhoa_(function () { return capNhatThongTinPhiTienTeKhongKhoa_(payload); });
}

/**
 * CẬP NHẬT THÔNG TIN KHÔNG PHẢI TIỀN (hồ sơ có số tiền lẻ lịch sử). Tái sử dụng journal NhatKyGhiDoDang của HoSoDomain.gs:
 *  1) kiểm tra TOÀN BỘ dữ liệu + revision (bắt buộc) trước khi ghi;  2) chụp bản sao dòng cha + các dòng con;  3) ghi nhật ký DANG_GHI;
 *  4) ghi theo LÔ (1 lần setValues cho dòng cha, 1 lần cho mỗi khối dòng con liên tiếp);  5) đọc lại, xác minh: cột tiền KHÔNG đổi (so sánh nguyên giá trị,
 *  giữ nguyên số lẻ lịch sử), cột cần đổi đúng giá trị mới, Revision = cũ+1;  6) lỗi bất kỳ → phục hồi từ bản sao, báo lỗi, KHÔNG tăng revision;
 *  7) chỉ trả thành công khi đối chiếu đạt.
 */
var COT_TIEN_HO_SO_ = ['LoaiTien', 'TyGiaBan', 'DuNoHienTai', 'SoTienNhanNoLanNay', 'SoTienBangChu'];
var COT_TIEN_CHI_TIET_ = ['STT', 'LoaiTien', 'SoTien', 'SoTienQuyDoi'];
function capNhatThongTinPhiTienTeKhongKhoa_(payload) {
  var maHoSo = payload && payload.maHoSo;
  var hs = maHoSo ? layHoSoTheoMa_(maHoSo) : null;
  if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + ' để cập nhật.');
  if (hs.TrangThai !== TT_NHAP) throw new Error('Hồ sơ ' + maHoSo + ' đang ở trạng thái "' + hs.TrangThai + '", không sửa được.');
  kiemTraRevisionBatBuoc_(hs, payload.expectedRevision);
  damBaoCotHoSoDomain_();
  tuPhucHoiGhiDoDangCuaHoSo_(maHoSo);
  var ct = layChiTietTheoHoSo_(maHoSo), moi = payload.chiTiet || [];
  if (moi.length !== ct.length) {
    throw new Error('Hồ sơ này đang giữ số tiền lịch sử có phần thập phân: không được thêm/bớt dòng thụ hưởng ở chế độ "giữ nguyên số tiền". ' +
      'Muốn đổi số dòng, hãy bấm "Sửa số tiền" và nhập lại các số tiền nguyên.');
  }
  var ss = getSS_(), shHs = ss.getSheetByName(SHEET_HOSO), shCt = ss.getSheetByName(SHEET_CHITIET);
  var hHs = shHs.getRange(1, 1, 1, shHs.getLastColumn()).getValues()[0], hCt = shCt.getRange(1, 1, 1, shCt.getLastColumn()).getValues()[0];

  // ---- 1) KIỂM TRA TOÀN BỘ trước khi ghi ----
  var loi = [], ngay = function (v, ten) { if (v === undefined || v === null || v === '') return v === undefined ? undefined : ''; var d = toDateOrEmpty_(v); if (!(d instanceof Date) || isNaN(d.getTime())) { loi.push(ten + ' không phải ngày hợp lệ: "' + v + '"'); return undefined; } return d; };
  var chuoi = function (v, ten, max) { if (v === undefined) return undefined; var t = String(v === null ? '' : v); if (t.length > (max || 1000)) loi.push(ten + ' quá dài (tối đa ' + (max || 1000) + ' ký tự)'); return t; };
  var cotHoSo = {
    MaHD: chuoi(payload.maHD, 'Mã hợp đồng', 40), SoGiayNhanNo: chuoi(payload.soGiayNhanNo, 'Số giấy nhận nợ', 100), NgayGiayNhanNo: ngay(payload.ngayGiayNhanNo, 'Ngày giấy nhận nợ'),
    PhuongThucThanhToan: chuoi(payload.phuongThucThanhToan, 'Phương thức thanh toán', 100), MucDichSuDungVon: chuoi(payload.mucDichSuDungVon, 'Mục đích sử dụng vốn', 1000),
    ThoiHanChoVay_Ngay: payload.thoiHanChoVayNgay, NgayGiaiNgan: ngay(payload.ngayGiaiNgan, 'Ngày giải ngân'), NgayDenHan: ngay(payload.ngayDenHan, 'Ngày đến hạn'),
    TaiLieuChungMinhMucDich: chuoi(payload.taiLieuChungMinhMucDich, 'Tài liệu chứng minh mục đích', 2000), NguoiLapBieu: chuoi(payload.nguoiLapBieu, 'Người lập biểu', 200),
    SoThamChieu: chuoi(payload.soThamChieu, 'Số tham chiếu', 100), LoaiHoSoGiaiNgan: payload.loaiHoSoGiaiNgan === undefined ? undefined : String(payload.loaiHoSoGiaiNgan || '').trim()
  };
  if (cotHoSo.MaHD !== undefined && cotHoSo.MaHD !== '' && !layHopDongTheoMa_(cotHoSo.MaHD)) loi.push('Hợp đồng "' + cotHoSo.MaHD + '" không tồn tại');
  if (cotHoSo.ThoiHanChoVay_Ngay !== undefined && cotHoSo.ThoiHanChoVay_Ngay !== '' && !(Number(cotHoSo.ThoiHanChoVay_Ngay) >= 0)) loi.push('Thời hạn cho vay phải là số ngày không âm');
  var cotChiTiet = moi.map(function (m, i) {
    m = m || {}; var t = 'Dòng thụ hưởng ' + (i + 1) + ' – ';
    return { TenNguoiHuong: chuoi(m.tenNguoiHuong, t + 'tên', 300), SoTaiKhoan: chuoi(m.soTaiKhoan, t + 'số tài khoản', 60), TaiNganHang: chuoi(m.taiNganHang, t + 'ngân hàng', 200),
      NoiDungThanhToan: chuoi(m.noiDungThanhToan, t + 'nội dung', 1000), LoaiChungTu: chuoi(m.loaiChungTu, t + 'loại chứng từ', 200), ChuyenTienNhanh_24_7: chuoi(m.chuyenTienNhanh, t + 'chuyển nhanh', 5),
      TaiLieuSo: chuoi(m.taiLieuSo, t + 'tài liệu số', 500), NgayTaiLieu: m.ngayTaiLieu, DonViLapTaiLieu: chuoi(m.donViLapTaiLieu, t + 'đơn vị lập', 300), GhiChu: chuoi(m.ghiChu, t + 'ghi chú', 1000) };
  });
  if (loi.length) throw new Error('Dữ liệu không hợp lệ, CHƯA ghi gì:\n• ' + loi.join('\n• '));

  // ---- 2) bản sao + dòng mới (dựng trọn trong bộ nhớ) ----
  var nH = hHs.length, nC = hCt.length;
  var rowHsCu = shHs.getRange(hs._row, 1, 1, nH).getValues()[0], rowHsMoi = rowHsCu.slice();
  Object.keys(cotHoSo).forEach(function (c) { var i = hHs.indexOf(c); if (i >= 0 && cotHoSo[c] !== undefined) rowHsMoi[i] = cotHoSo[c]; });
  var me = layDanhTinh_().email || emailNguoiDung_(), revMoi = soRevision_(hs) + 1;
  rowHsMoi[hHs.indexOf('Revision')] = revMoi; rowHsMoi[hHs.indexOf('CapNhatLuc')] = new Date(); rowHsMoi[hHs.indexOf('CapNhatBoi')] = me;
  var dongCt = ct.map(function (cu, i) {
    var cuRow = shCt.getRange(cu._row, 1, 1, nC).getValues()[0], moiRow = cuRow.slice();
    Object.keys(cotChiTiet[i]).forEach(function (c) { var k = hCt.indexOf(c); if (k >= 0 && cotChiTiet[i][c] !== undefined) moiRow[k] = cotChiTiet[i][c]; });
    return { row: cu._row, cu: cuRow, moi: moiRow };
  });
  var nhatKy = ghiDoDangBatDau_(maHoSo, false, rowHsCu, dongCt.map(function (x) { return x.cu; }));

  // ---- 3) ghi theo LÔ rồi xác minh; lỗi → phục hồi ----
  function ghiKhoiLienTiep(layMoi) {
    var sx = dongCt.slice().sort(function (a, b) { return a.row - b.row; }), i = 0;
    while (i < sx.length) {
      var j = i; while (j + 1 < sx.length && sx[j + 1].row === sx[j].row + 1) j++;
      shCt.getRange(sx[i].row, 1, j - i + 1, nC).setValues(sx.slice(i, j + 1).map(layMoi));
      i = j + 1;
    }
  }
  try {
    shHs.getRange(hs._row, 1, 1, nH).setValues([rowHsMoi]);
    ghiKhoiLienTiep(function (x) { return x.moi; });
    SpreadsheetApp.flush();
    // xác minh
    var docHs = shHs.getRange(hs._row, 1, 1, nH).getValues()[0], sai = [];
    hHs.forEach(function (c, i) {
      if (COT_TIEN_HO_SO_.indexOf(c) >= 0 && docHs[i] !== rowHsCu[i]) sai.push('cột tiền ' + c + ' của hồ sơ bị đổi');
      if (c === 'Revision' && Number(docHs[i]) !== revMoi) sai.push('Revision sau ghi ' + docHs[i] + ' ≠ ' + revMoi);
    });
    dongCt.forEach(function (x, k) {
      var doc = shCt.getRange(x.row, 1, 1, nC).getValues()[0];
      hCt.forEach(function (c, i) { if (COT_TIEN_CHI_TIET_.indexOf(c) >= 0 && doc[i] !== x.cu[i]) sai.push('cột tiền ' + c + ' của dòng ' + (k + 1) + ' bị đổi'); });
      hCt.forEach(function (c, i) { if (cotChiTiet[k][c] !== undefined && String(doc[i]) !== String(x.moi[i]) && !(doc[i] instanceof Date)) sai.push('dòng ' + (k + 1) + ' cột ' + c + ' ghi không đúng'); });
    });
    if (sai.length) throw new Error('Đối chiếu sau ghi không đạt: ' + sai.slice(0, 5).join('; '));
  } catch (eGhi) {
    try {
      shHs.getRange(hs._row, 1, 1, nH).setValues([rowHsCu]);
      ghiKhoiLienTiep(function (x) { return x.cu; });
      SpreadsheetApp.flush();
      capNhatGhiDoDang_(nhatKy.id, 'DA_PHUC_HOI', 'Lỗi, phục hồi ngay: ' + eGhi.message);
    } catch (ePhucHoi) {
      ghiNhatKy_(maHoSo, 'LOI_PHUC_HOI', 'Cập nhật phi tiền tệ lỗi: ' + eGhi.message + ' | phục hồi lỗi: ' + ePhucHoi.message + ' | journal ' + nhatKy.id);
      throw new Error('Lưu thất bại VÀ chưa phục hồi được tự động (mã ' + maHoSo + ', nhật ký ' + nhatKy.id + '). Quản trị: dùng phucHoiGhiDoDang. Lỗi: ' + eGhi.message);
    }
    throw new Error('Lưu thất bại, dữ liệu cũ đã được giữ nguyên (không đổi revision): ' + eGhi.message);
  }
  capNhatGhiDoDang_(nhatKy.id, 'HOAN_TAT');
  tangRevision_('HOSO');
  ghiNhatKy_(maHoSo, 'SUA_PHI_TIEN_TE', 'Giữ nguyên toàn bộ số tiền cũ: ' + phatHienTienLe_(hs, ct).join('; '));
  return { maHoSo: maHoSo, trangThai: hs.TrangThai, revision: revMoi };
}

function capNhatLinkHoSo_(maHoSo, cot, url) {
  var sh = getSS_().getSheetByName(SHEET_HOSO);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var dong = timDongHoSo_(sh, headers, maHoSo);
  if (!dong) return;
  var colIdx = headers.indexOf(cot) + 1;
  if (colIdx > 0) { sh.getRange(dong, colIdx).setValue(url); tangRevision_('HOSO'); } // gọi khi đang giữ khoá ghi
}

/** Số dòng (1-based) của hồ sơ trong tab HoSoGiaiNgan — chỉ đọc MỘT cột MaHoSo (nhanh hơn đọc cả bảng); 0 nếu không thấy. */
function timDongHoSo_(sh, headers, maHoSo) {
  var c = headers.indexOf('MaHoSo') + 1, n = sh.getLastRow();
  if (c < 1 || n < 2) return 0;
  var v = sh.getRange(2, c, n - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(maHoSo)) return i + 2;
  return 0;
}

/**
 * Chuẩn hoá chuỗi để so khớp tên (bỏ khoảng trắng thừa, chuyển hoa).
 */
function chuanHoaChuoi_(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Tìm chỉ số cột theo tên header (không phân biệt hoa/thường, bỏ khoảng trắng thừa);
 * nếu không tìm thấy tên cột thì dùng vị trí mặc định (0-indexed) truyền vào — để vẫn hoạt động
 * được kể cả khi header trong Sheet gõ khác đôi chút (hoa/thường, dấu cách...).
 */
function timCotTheoTenHoacViTri_(headers, tenCot, viTriMacDinh) {
  var idx = -1;
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === tenCot) { idx = i; break; }
  }
  return idx >= 0 ? idx : viTriMacDinh;
}

/**
 * Chuyển 1 giá trị (số hoặc chuỗi có định dạng dấu phẩy/chấm ngăn cách hàng nghìn) thành số thuần.
 */
function soTuChuoiHoacSo_(v) {
  // Trả về ĐÚNG giá trị số (kể cả khi nguồn có phần thập phân) — KHÔNG làm tròn/cắt âm thầm; nơi nhận phải tự kiểm tra
  // số nguyên. Hiểu cả "7.234.567" (VN), "7,234,567" (US), "7.234.567,5", "25,5". Không đọc được => 0.
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || v === '') return 0;
  var s = String(v).trim().replace(/[\s\u00A0]/g, '').replace(/(đ|₫|vnd|usd|\$)$/i, '');
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
  if (/^\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
  if (/^\d+\.\d+$/.test(s)) return Number(s);
  return 0;
}

/**
 * Tập hợp các Số hoá đơn (TaiLieuSo) đã được dùng ở các hồ sơ KHÁC trong ChiTietThuHuong,
 * để loại khỏi danh sách cho chọn (tránh dùng trùng 1 hoá đơn cho nhiều hồ sơ).
 * maHoSoBoQua: mã hồ sơ đang sửa — các dòng thuộc chính hồ sơ này KHÔNG bị loại.
 */
function layTapSoHDDaSuDung_(maHoSoBoQua) {
  var sh = getSS_().getSheetByName(SHEET_CHITIET);
  if (!sh) return {};
  var values = layGiaTriThatCuaSheet_(sh);
  if (values.length < 2) return {};
  var headers = values[0];
  var idxMaHoSo = headers.indexOf('MaHoSo');
  var idxTaiLieuSo = headers.indexOf('TaiLieuSo');
  if (idxTaiLieuSo < 0) return {};
  var tap = {}, daXoaMem = {};
  docDanhSachHoSo_(true).forEach(function (h) { if (laDaXoa_(h.DaXoa)) daXoaMem[String(h.MaHoSo)] = true; }); // hồ sơ đã xoá mềm không còn giữ hoá đơn
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (idxMaHoSo >= 0 && daXoaMem[String(row[idxMaHoSo])]) continue;
    if (maHoSoBoQua && idxMaHoSo >= 0 && String(row[idxMaHoSo]) === String(maHoSoBoQua)) continue;
    var raw = String(row[idxTaiLieuSo] || '');
    if (!raw) continue;
    raw.split(',').forEach(function (s) {
      var v = s.trim();
      if (v) tap[v] = true;
    });
  }
  return tap;
}

/**
 * Tra cứu danh sách dòng lương trong file "Bảng lương" (sheet SHEET_BANG_LUONG), dùng khi Khoản
 * mục giải ngân = "Thanh toán lương" ở mục 4 - Danh sách thụ hưởng. Không lọc theo Tên người
 * hưởng (vì khoản chi lương thường là 1 khoản tổng gộp, không phải trả trực tiếp từng nhân viên).
 * Trả về mảng: [{ hoTen, thang, soTien, key }, ...], đã loại các dòng đã dùng ở hồ sơ khác.
 */
function layDanhSachBangLuongDeChon(maHoSoHienTai) {
  yeuCauDangNhap_();
  var out = [];

  // Nguồn 1: file Bảng lương ngoài (cấu hình ở SS_BANG_LUONG_ID) — best-effort, không chặn kết quả
  // nếu chưa cấu hình/không mở được.
  var idBangLuong = CauHinh_().ssBangLuongId;
  if (idBangLuong && idBangLuong.indexOf('DÁN_ID') < 0) {
    try {
      var ss = SpreadsheetApp.openById(idBangLuong);
      var sh = ss.getSheetByName(SHEET_BANG_LUONG);
      if (sh) {
        var values = sh.getDataRange().getValues();
        if (values.length >= 2) {
          var headers = values[0];
          var idxThang = timCotTheoTenHoacViTri_(headers, 'tháng', 0);
          var idxHoTen = timCotTheoTenHoacViTri_(headers, 'họ và tên', 1);
          var idxSoTien = timCotTheoTenHoacViTri_(headers, 'số tiền', 2);
          for (var r = 1; r < values.length; r++) {
            var row = values[r];
            var hoTen = row[idxHoTen];
            if (!hoTen) continue;
            var thang = row[idxThang];
            var thangChuoi = (thang instanceof Date) ? Utilities.formatDate(thang, 'Asia/Ho_Chi_Minh', 'MM/yyyy') : String(thang || '');
            out.push({
              hoTen: String(hoTen).trim(), thang: thangChuoi, soTien: soTuChuoiHoacSo_(row[idxSoTien]),
              key: String(hoTen).trim() + ' (' + thangChuoi + ')'
            });
          }
        }
      }
    } catch (eBangLuong) { /* Chưa cấu hình/không mở được — bỏ qua, vẫn dùng nguồn 2 bên dưới. */ }
  }

  // Nguồn 2: Bảng lương đã tải lên + đọc tự động ở tab "Hồ sơ đính kèm" (BangKeBangLuong) — luôn
  // hoạt động, không cần cấu hình gì thêm.
  var tepLuong = tenTepTheoMaTaiLieu_();
  var dsLuongTaiLen = locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_BANGKE_LUONG), function (d) { return [d.MaHoSo, (tepLuong[d.MaTaiLieu] || {}).maHoSo]; });
  dsLuongTaiLen.forEach(function (dong) {
    if (!dong.HoTen) return;
    out.push({
      hoTen: String(dong.HoTen).trim(), thang: chuanThang_(dong.Thang), soTien: Number(dong.SoTien) || 0,
      key: String(dong.HoTen).trim() + ' (' + chuanThang_(dong.Thang) + ')'
    });
  });

  // Loại các dòng lương đã được dùng (lưu ở TaiLieuSo dạng "Họ tên (Tháng)") ở hồ sơ khác.
  var daDung = layTapSoHDDaSuDung_(maHoSoHienTai);
  out = out.filter(function (it) { return !daDung[it.key]; });

  return out;
}

/**
 * Tra cứu danh sách hoá đơn (Số hoá đơn + Ngày) trong file "Sổ chi tiết mua hàng"
 * (sheet SO_CHI_TIET_MUA_HANG, cột I "nhacungcap") theo Tên người hưởng, để chọn
 * nhanh vào ô "Tài liệu số" / "Ngày tài liệu" ở mục 3 - Danh sách thụ hưởng.
 * Trả về mảng: [{ sohd, ngay (dd/MM/yyyy), ngaySort, dienGiai, nhaCungCap, giaTri }, ...]
 * đã loại trùng, loại các hoá đơn đã dùng ở hồ sơ khác, và sắp xếp theo ngày tăng dần.
 * giaTri lấy từ cột "giatri" (cột O) trong SO_CHI_TIET_MUA_HANG, dùng để gợi ý "Số tiền"
 * của dòng thụ hưởng (vẫn sửa tay được).
 * maHoSoHienTai: mã hồ sơ đang sửa (để không loại các hoá đơn đã gán cho chính hồ sơ này).
 */
function layDanhSachTaiLieuTheoNhaCungCap(tenNguoiHuong, maHoSoHienTai) {
  yeuCauDangNhap_();
  var chuan = tenNguoiHuong ? chuanHoaChuoi_(tenNguoiHuong) : '';
  var khopChinhXac = [];
  var khopGanDung = [];

  // Nguồn 1: Sổ chi tiết mua hàng (file Sheet ngoài, cấu hình ở SS_MUA_HANG_ID) — best-effort, không
  // chặn kết quả nếu file này chưa cấu hình/không mở được (VD chưa cấp quyền, đổi ID...).
  try {
    var chMua = CauHinh_(); // dùng cấu hình đã lưu (Script Properties), không dùng hằng số cứng
    var ss = SpreadsheetApp.openById(chMua.ssMuaHangId);
    var sh = ss.getSheetByName(chMua.sheetMuaHang);
    if (sh) {
      var values = sh.getDataRange().getValues();
      if (values.length >= 2) {
        var headers = values[0];
        var idxSoHD = timCotTheoTenHoacViTri_(headers, 'sohd', 7);
        var idxNgay = timCotTheoTenHoacViTri_(headers, 'ngay', 3);
        var idxNCC = timCotTheoTenHoacViTri_(headers, 'nhacungcap', 8);
        var idxDienGiai = timCotTheoTenHoacViTri_(headers, 'diengiai', 1);
        var idxGiaTri = timCotTheoTenHoacViTri_(headers, 'giatri', 14);

        for (var r = 1; r < values.length; r++) {
          var row = values[r];
          var nccRaw = row[idxNCC];
          if (!nccRaw) continue;
          var soHD = row[idxSoHD];
          var ngay = row[idxNgay];
          if (soHD === '' || soHD === null || soHD === undefined || !ngay) continue;

          if (!chuan) continue; // chưa nhập tên: Sổ chi tiết mua hàng quá rộng, chỉ dùng hoá đơn đã tải lên
          var nccChuan = chuanHoaChuoi_(nccRaw);
          var item = {
            sohd: String(soHD).trim(),
            ngay: (ngay instanceof Date) ? Utilities.formatDate(ngay, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : String(ngay),
            ngaySort: (ngay instanceof Date) ? ngay.getTime() : 0,
            dienGiai: idxDienGiai >= 0 ? String(row[idxDienGiai] || '') : '',
            nhaCungCap: String(nccRaw).trim(),
            giaTri: soTuChuoiHoacSo_(row[idxGiaTri])
          };
          if (nccChuan === chuan) khopChinhXac.push(item);
          else if (nccChuan.indexOf(chuan) >= 0 || chuan.indexOf(nccChuan) >= 0) khopGanDung.push(item);
        }
      }
    }
  } catch (eSoSach) { /* Chưa cấu hình/không mở được — bỏ qua, vẫn dùng nguồn 2 bên dưới. */ }

  // Nguồn 2: Hoá đơn đã tải lên + OCR ở tab "Hồ sơ đính kèm" (BangKeHoaDon) — luôn hoạt động, không
  // cần cấu hình gì thêm.
  var tepHD = tenTepTheoMaTaiLieu_();
  var dsHoaDonTaiLen = locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_BANGKE_HOADON), function (h) { return [h.MaHoSo, (tepHD[h.MaTaiLieu] || {}).maHoSo]; }), tatCa = [];
  dsHoaDonTaiLen.forEach(function (hd) {
    if (!hd.TenNhaCungCap || !hd.SoHoaDon) return;
    var nccChuan = chuanHoaChuoi_(hd.TenNhaCungCap);
    var item = {
      sohd: String(hd.SoHoaDon).trim(),
      ngay: String(hd.NgayHoaDon || ''),
      ngaySort: 0,
      dienGiai: String(hd.DienGiai || ''),
      nhaCungCap: String(hd.TenNhaCungCap).trim(),
      giaTri: Number(hd.SoTien) || 0
    };
    if (item.giaTri > 0) tatCa.push({ sohd: item.sohd, ngay: item.ngay, ngaySort: 0, dienGiai: item.dienGiai, nhaCungCap: item.nhaCungCap, giaTri: item.giaTri, khongKhopTen: true });
    if (!chuan) return;
    if (nccChuan === chuan) khopChinhXac.push(item);
    else if (nccChuan.indexOf(chuan) >= 0 || chuan.indexOf(nccChuan) >= 0) khopGanDung.push(item);
  });

  // Ưu tiên khớp chính xác tên nhà cung cấp; nếu không có thì dùng khớp gần đúng (chứa nhau).
  // Không khớp tên nào (hoặc chưa nhập tên) → hiện mọi hoá đơn đã tải lên đọc được số tiền, gắn cờ khongKhopTen để giao diện báo.
  var ketQua = khopChinhXac.length ? khopChinhXac : khopGanDung.length ? khopGanDung : tatCa;

  // Loại bỏ trùng lặp: mỗi hoá đơn thường có 2 dòng hạch toán (Nợ/Có) giống hệt Số hoá đơn +
  // Ngày + Giá trị. Gộp theo cả 3 để không mất các dòng có Giá trị khác nhau trong cùng 1 hoá đơn.
  var daThay = {};
  var out = [];
  ketQua.forEach(function (it) {
    var key = it.sohd + '|' + it.ngay + '|' + it.giaTri;
    if (daThay[key]) return;
    daThay[key] = true;
    out.push(it);
  });

  // Loại các hoá đơn đã được dùng (Tài liệu số) ở hồ sơ khác.
  var daDung = layTapSoHDDaSuDung_(maHoSoHienTai);
  out = out.filter(function (it) { return !daDung[it.sohd]; });

  out.sort(function (a, b) { return a.ngaySort - b.ngaySort; });
  return out;
}

/** Dữ liệu tổng hợp đầy đủ cho 1 hồ sơ: hồ sơ + hợp đồng + công ty + chi tiết. */
/**
 * Chuyển mọi giá trị kiểu Date trong 1 object (hoặc mảng object) phẳng thành chuỗi yyyy-MM-dd.
 * google.script.run đôi khi serialize Date không ổn định (đặc biệt Date "rỗng"/không hợp lệ do ô
 * trống trong Sheet) khiến cả object trả về bị null phía client — chuyển hết sang chuỗi để tránh lỗi.
 */
function chuyenDoiDateThanhChuoi_(obj) {
  if (Array.isArray(obj)) {
    return obj.map(chuyenDoiDateThanhChuoi_);
  }
  if (obj && typeof obj === 'object') {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v instanceof Date) {
        out[k] = isNaN(v.getTime()) ? '' : Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      } else {
        out[k] = v;
      }
    });
    return out;
  }
  return obj;
}

function layDuLieuDayDu(maHoSo) {
  yeuCauDangNhap_();
  var hoSo = layHoSoTheoMa_(maHoSo);
  if (!hoSo) throw new Error('Không tìm thấy hồ sơ: ' + maHoSo);
  var hopDong = layHopDongTheoMa_(hoSo.MaHD);
  if (!hopDong) throw new Error('Không tìm thấy hợp đồng vay: ' + hoSo.MaHD);
  var congTy = layCongTyTheoMa_(hopDong.MaCty);
  if (!congTy) throw new Error('Không tìm thấy công ty vay: ' + hopDong.MaCty);
  var chiTiet = layChiTietTheoHoSo_(maHoSo);
  return {
    hoSo: chuyenDoiDateThanhChuoi_(hoSo),
    hopDong: chuyenDoiDateThanhChuoi_(hopDong),
    congTy: chuyenDoiDateThanhChuoi_(congTy),
    chiTiet: chuyenDoiDateThanhChuoi_(chiTiet)
  };
}

/**
 * Báo cáo chi tiết tiền vay theo khế ước, lọc theo khoảng "Ngày giải ngân" [tuNgay, denNgay]
 * (yyyy-mm-dd) và (tuỳ chọn) theo Tên khách hàng/người hưởng (khớp gần đúng, không phân biệt hoa/thường).
 * Mỗi dòng kết quả tương ứng 1 dòng thụ hưởng (ChiTietThuHuong) của các hồ sơ khớp điều kiện.
 * Trả về mảng: [{ soGiayNhanNo, ngayNhanNo, ngayGiaiNgan, tenNguoiHuong, soTienVay,
 *                  soTaiLieu, ngayTaiLieu, ngayDenHan, laiSuatTrongHan }, ...]
 */
/**
 * Báo cáo chi tiết tiền vay theo khế ước — có tự động thử lại 1 lần nếu lần đọc đầu tiên trả về
 * rỗng bất thường (Google Sheets đôi khi đọc lệch/thiếu dữ liệu tạm thời, đặc biệt ngay sau khi
 * vừa ghi/sửa dữ liệu ở 1 lệnh gọi khác trước đó).
 */
/**
 * Lọc báo cáo tiền vay theo cách "ghi ra sheet nháp rồi đọc lại ngay": tính kết quả, GHI vào 1 sheet
 * riêng (BaoCaoTienVay_Draft) trong CHÍNH file gốc — xoá sạch dữ liệu cũ trước khi ghi mới — rồi ĐỌC
 * LẠI NGAY LẬP TỨC từ chính sheet đó trong CÙNG 1 lần thực thi để trả về client.
 *
 * Vì ghi và đọc diễn ra trong cùng 1 lần gọi (không phải 2 lần google.script.run tách biệt như
 * layBaoCaoTienVay), cách này tránh hoàn toàn hiện tượng Google Sheets đọc dữ liệu bị trễ/lệch giữa
 * các lần gọi khác nhau — đây là phương án đáng tin cậy nhất, dùng cho bảng xem trực tiếp trên web.
 * Sheet nháp này cũng là 1 "bằng chứng" bạn có thể mở trực tiếp trong Google Sheets để tự kiểm tra.
 */
/**
 * Xây dựng lại TOÀN BỘ (không lọc) sheet nháp BaoCaoTienVay_Draft mỗi khi Lưu hồ sơ / Huỷ giải ngân /
 * Đánh dấu đã giải ngân — để có SẴN 1 bảng phẳng, dễ đọc trực tiếp trên Google Sheet (lọc/pivot tay)
 * mà không cần mở Web App. LƯU Ý: đây là bảng snapshot 1 chiều (ghi ra để người dùng tự xem trên
 * Sheet) — báo cáo trong Web App (layBaoCaoTienVay bên dưới) đọc TRỰC TIẾP từ HoSoGiaiNgan/
 * ChiTietThuHuong, KHÔNG đọc lại từ sheet nháp này.
 */
function capNhatBaoCaoDraft_() {
  var rows = layBaoCaoTienVay('', '', '', '', '');

  var ss = getSS_();
  var sh = ss.getSheetByName(SHEET_BAOCAO_DRAFT);
  if (!sh) {
    sh = ss.insertSheet(SHEET_BAOCAO_DRAFT);
  } else {
    sh.clearContents();
  }

  var header = ['MaHoSo', 'TrangThai', 'SoHopDong', 'SoGiayNhanNo', 'NgayNhanNo', 'NgayGiaiNgan', 'TenNguoiHuong',
    'LoaiTien', 'LoaiChungTu', 'SoTienVay', 'SoTienQuyDoi', 'SoTaiLieu', 'NgayTaiLieu', 'NgayDenHan', 'LaiSuatTrongHan'];
  var data = [header];
  rows.forEach(function (r) {
    data.push([
      String(r.maHoSo || ''), String(r.trangThai || ''), String(r.soHopDong || ''), String(r.soGiayNhanNo || ''),
      String(r.ngayNhanNo || ''), String(r.ngayGiaiNgan || ''), String(r.tenNguoiHuong || ''),
      String(r.loaiTien || 'VND'), String(r.loaiChungTu || ''),
      Number(r.soTienVay) || 0, Number(r.soTienQuyDoi) || 0, String(r.soTaiLieu || ''), String(r.ngayTaiLieu || ''),
      String(r.ngayDenHan || ''), String(r.laiSuatTrongHan || '')
    ]);
  });

  sh.getRange(1, 1, data.length, header.length).setValues(data);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  SpreadsheetApp.flush();
  return sh;
}

/**
 * Lấy báo cáo tiền vay. Tham số `loaiTien`:
 *   - '' (rỗng)  -> TỔNG HỢP: lấy cả hồ sơ VND và USD, mỗi dòng có kèm soTienQuyDoi (quy đổi ra VND).
 *   - 'VND'      -> chỉ hồ sơ vay VND.
 *   - 'USD'      -> chỉ hồ sơ vay USD (soTienVay là số USD gốc, soTienQuyDoi là số VND quy đổi).
 * `baoGomDaHuy` (mặc định false): hồ sơ "Đã hủy" (giao dịch không thành công) KHÔNG được tính vào
 * báo cáo/tổng tiền theo mặc định — trừ khi trangThai lọc đúng "Đã hủy", hoặc baoGomDaHuy = true
 * (dùng cho "Xuất TOÀN BỘ" — đúng nghĩa toàn bộ, không âm thầm loại trừ gì cả).
 */
function layBaoCaoTienVay(tuNgay, denNgay, tenKhachHang, trangThai, loaiTien, baoGomDaHuy, tuyChon) {
  yeuCauDangNhap_();
  return layBaoCaoTienVay_(tuNgay, denNgay, tenKhachHang, trangThai, loaiTien, baoGomDaHuy, tuyChon); // báo cáo rỗng là hợp lệ — không đọc lại
}

/**
 * BÁO CÁO QUẢN LÝ HỒ SƠ VAY (mọi trạng thái; mỗi dòng = 1 người thụ hưởng). Đây KHÔNG phải báo cáo giải ngân thực tế (xem layBaoCaoGiaiNganThucTe).
 * tuyChon = { loaiNgay: 'DU_KIEN' (mặc định, NgayGiaiNgan kế hoạch) | 'THUC_TE' (ngày thực tế của xác nhận ngân hàng), chiThieuNgay: true → CHỈ liệt kê hồ sơ thiếu/sai ngày }.
 * Khi lọc theo khoảng ngày, hồ sơ KHÔNG có ngày (hoặc ngày sai) bị LOẠI khỏi kết quả — không mặc nhiên coi là nằm trong khoảng; dùng chiThieuNgay để xem riêng nhóm đó.
 */
function layBaoCaoTienVay_(tuNgay, denNgay, tenKhachHang, trangThai, loaiTien, baoGomDaHuy, tuyChon) {
  tuyChon = tuyChon || {};
  var theoThucTe = tuyChon.loaiNgay === 'THUC_TE', chiThieuNgay = !!tuyChon.chiThieuNgay;
  var xacNhanHL = {};
  { try { docXacNhanGN_().forEach(function (r) { if (r.TrangThai === XN_HIEU_LUC && r.LoaiBanGhi === XN_LOAI_XAC_NHAN) xacNhanHL[String(r.MaHoSo)] = r; }); } catch (eXn) { xacNhanHL = {}; } }
  var dsHoSo = docDanhSachHoSo_(false);
  var dsChiTiet = sheetToObjects_(SHEET_CHITIET);
  var dsHopDong = sheetToObjects_(SHEET_HOPDONG);

  var tu = tuNgay ? new Date(tuNgay + 'T00:00:00') : null;
  var den = denNgay ? new Date(denNgay + 'T23:59:59') : null;
  var tuKhoa = chuanHoaChuoi_(tenKhachHang || '');
  var loaiTienLoc = String(loaiTien || '').toUpperCase(); // '' = tất cả (tổng hợp), 'VND', 'USD'

  var hopDongByMa = {};
  dsHopDong.forEach(function (h) { hopDongByMa[h.MaHD] = h; });

  var chiTietByHoSo = {};
  dsChiTiet.forEach(function (ct) {
    var key = String(ct.MaHoSo || '').trim();
    if (!key) return;
    if (!chiTietByHoSo[key]) chiTietByHoSo[key] = [];
    chiTietByHoSo[key].push(ct);
  });

  var out = [];
  dsHoSo.forEach(function (hs) {
    if (trangThai) {
      if (hs.TrangThai !== trangThai) return;
    } else if (hs.TrangThai === 'Đã hủy' && !baoGomDaHuy) {
      // "Tất cả" (bộ lọc để trống) mặc định KHÔNG gộp hồ sơ "Đã hủy" vào báo cáo — đây là giao dịch
      // KHÔNG thành công (đã bị huỷ sau khi lỡ đánh dấu Đã giải ngân), gộp vào sẽ làm sai lệch tổng
      // tiền đã vay thật sự. Muốn xem/đối chiếu hồ sơ đã huỷ thì chọn đúng "Đã hủy" ở bộ lọc, hoặc
      // dùng "Xuất TOÀN BỘ" (baoGomDaHuy = true — đúng nghĩa toàn bộ, không loại trừ gì).
      return;
    }

    var loaiTienHS = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    if (loaiTienLoc && loaiTienLoc !== loaiTienHS) return;

    var xn = xacNhanHL[String(hs.MaHoSo)] || null;
    var nguonNgay = theoThucTe ? (xn ? xn.NgayThucTe : null) : hs.NgayGiaiNgan;
    var ngayGN = nguonNgay instanceof Date ? nguonNgay : (nguonNgay ? new Date(String(nguonNgay).length === 10 ? nguonNgay + 'T00:00:00' : nguonNgay) : null);
    var thieuNgay = !ngayGN || isNaN(ngayGN.getTime());
    if (chiThieuNgay) { if (!thieuNgay) return; }
    else if (tu || den) {
      if (thieuNgay) return; // KHÔNG mặc nhiên coi hồ sơ thiếu ngày là nằm trong khoảng lọc
      if (tu && ngayGN < tu) return;
      if (den && ngayGN > den) return;
    }

    var hd = hopDongByMa[hs.MaHD];
    var laiSuat = hd ? hd['LaiSuatTrongHan_%'] : '';
    var soHopDong = hd ? hd.SoHopDong : '';
    var tyGiaBanHS = Number(hs.TyGiaBan) || 0;

    var dsCt = chiTietByHoSo[String(hs.MaHoSo || '').trim()] || [];
    dsCt.forEach(function (ct) {
      if (tuKhoa && chuanHoaChuoi_(ct.TenNguoiHuong).indexOf(tuKhoa) < 0) return;
      var soTienGoc = Number(ct.SoTien) || 0;
      var soTienQuyDoi = (ct.SoTienQuyDoi !== undefined && ct.SoTienQuyDoi !== '')
        ? Number(ct.SoTienQuyDoi) || 0
        : 0;
      var canRaSoat = ((Number(hs.PhienBanTien) === 2 ? ct.LoaiTien : loaiTienHS) === 'USD' ? !/^\d+(\.\d{1,2})?$/.test(String(soTienGoc)) : Math.floor(soTienGoc) !== soTienGoc) || (Math.floor(soTienQuyDoi) !== soTienQuyDoi);
      if (!(ct.SoTienQuyDoi !== undefined && ct.SoTienQuyDoi !== '') && !canRaSoat) {
        soTienQuyDoi = (loaiTienHS === 'USD') ? quyDoiUSDSangVND_(soTienGoc, tyGiaBanHS) : soTienGoc;
      }
      out.push({
        maHoSo: hs.MaHoSo,
        trangThai: hs.TrangThai || '',
        soHopDong: soHopDong || '',
        soGiayNhanNo: hs.SoGiayNhanNo || '',
        ngayNhanNo: formatNgay_(hs.NgayGiayNhanNo),
        ngayGiaiNgan: theoThucTe ? chuanNgay_(nguonNgay) : formatNgay_(hs.NgayGiaiNgan),
        ngayThucTe: xn ? String(xn.NgayThucTe || '') : '', soThamChieuNH: xn ? xn.SoThamChieuNH : '', thieuNgay: thieuNgay,
        tenNguoiHuong: ct.TenNguoiHuong || '',
        loaiTien: Number(hs.PhienBanTien) === 2 ? ct.LoaiTien : loaiTienHS,
        loaiTienVay: loaiTienHS,
        loaiChungTu: ct.LoaiChungTu || '',
        soTienVay: soTienGoc,
        soTienQuyDoi: soTienQuyDoi,
        canRaSoat: canRaSoat, // dữ liệu lịch sử có phần thập phân: giữ nguyên, chỉ cảnh báo
        soTaiLieu: ct.TaiLieuSo || '',
        ngayTaiLieu: ct.NgayTaiLieu || '',
        ngayDenHan: formatNgay_(hs.NgayDenHan),
        laiSuatTrongHan: laiSuat || ''
      });
    });
  });

  out.sort(function (a, b) { return String(a.ngayGiaiNgan).localeCompare(String(b.ngayGiaiNgan)); });
  return out;
}


/** Bổ sung 1 cột còn thiếu vào cuối sheet HoSoGiaiNgan (an toàn, không đổi dữ liệu cũ). */
function damBaoCotHoSo_(tenCot) {
  var sh = getSS_().getSheetByName(SHEET_HOSO);
  var n = sh.getLastColumn(), h = n > 0 ? sh.getRange(1, 1, 1, n).getValues()[0] : [];
  if (h.indexOf(tenCot) >= 0) return;
  sh.getRange(1, n + 1).setValue(tenCot).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
}

/** Quản trị: dựng lại sheet BaoCaoTienVay_Draft ngay (dùng khi dữ liệu lớn nên không tự dựng lại sau mỗi lần lưu). */
function lamMoiBaoCaoNhap() {
  yeuCauDangNhap_(); yeuCauQuanTri_('làm mới báo cáo nháp');
  capNhatBaoCaoDraft_(); PropertiesService.getScriptProperties().deleteProperty('BAO_CAO_NHAP_CU');
  return { ok: true };
}
function lamMoiBaoCaoNhapMenu() { lamMoiBaoCaoNhap(); SpreadsheetApp.getUi().alert('Đã làm mới sheet BaoCaoTienVay_Draft.'); }

/** Cập nhật sheet BaoCaoTienVay_Draft (báo cáo NHÁP, không phải bản chính thức). Lỗi không chặn lưu hồ sơ nhưng KHÔNG bị nuốt: ghi nhật ký để biết bản nháp đang cũ. */
function capNhatBaoCaoNhapAnToan_(maHoSo) {
  try {
    // Sheet nháp được dựng lại TOÀN BỘ mỗi lần lưu (O(N) ô đọc + ghi). Dữ liệu lớn (> ngưỡng dòng chi tiết, mặc định 1.000) sẽ làm mỗi lần lưu
    // chậm tuyến tính → chỉ đánh dấu "cũ"; quản trị làm mới bằng menu "Làm mới báo cáo nháp" hoặc API lamMoiBaoCaoNhap. Báo cáo trong WebApp KHÔNG phụ thuộc sheet này.
    var p = PropertiesService.getScriptProperties(), sh = getSS_().getSheetByName(SHEET_CHITIET), n = sh ? Math.max(0, sh.getLastRow() - 1) : 0;
    var nguong = Number(p.getProperty('CH_NGUONG_BAO_CAO_NHAP')) || 1000;
    if (n > nguong) { p.setProperty('BAO_CAO_NHAP_CU', '1'); return; }
    capNhatBaoCaoDraft_(); p.deleteProperty('BAO_CAO_NHAP_CU');
  } catch (e) { ghiNhatKy_(maHoSo || '', 'LOI_BAO_CAO_NHAP', 'Báo cáo nháp chưa cập nhật được (có thể đang cũ): ' + e.message); }
}
