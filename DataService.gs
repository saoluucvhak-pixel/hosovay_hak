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
  return docMien_('HOSO').rows;
}

/** Danh sách công ty vay vốn (cho dropdown). */
function layDanhSachCongTy() {
  yeuCauDangNhap_();
  return docMien_('CONGTY').rows;
}

/** Danh sách hợp đồng vay (cho dropdown), lọc theo MaCty nếu truyền vào. */

/**
 * Danh sách hợp đồng ĐẦY ĐỦ cho tab "Công ty & Hợp đồng vay" — đọc TRỰC TIẾP, đơn giản, không qua
 * lớp thử-lại nào (giống hệt cách layThongKeTongQuan đã chứng minh luôn đọc đúng).
 */
function layDanhSachHopDongDayDu() {
  yeuCauDangNhap_();
  return docMien_('HOPDONG').rows; // lỗi đọc được ném ra thẳng; rỗng là rỗng thật
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
  var dsChiTiet = sheetToObjects_(SHEET_CHITIET);

  var hopDongByMa = {};
  dsHopDong.forEach(function (h) { hopDongByMa[h.MaHD] = h; });
  var congTyByMa = {};
  dsCongTy.forEach(function (c) { congTyByMa[c.MaCty] = c; });
  var chiTietByHoSo = {};
  dsChiTiet.forEach(function (ct) {
    if (!chiTietByHoSo[ct.MaHoSo]) chiTietByHoSo[ct.MaHoSo] = [];
    chiTietByHoSo[ct.MaHoSo].push(ct);
  });

  var tu = boLoc.tuNgay ? new Date(boLoc.tuNgay + 'T00:00:00') : null;
  var den = boLoc.denNgay ? new Date(boLoc.denNgay + 'T23:59:59') : null;
  var maHoSoLoc = chuanHoaChuoi_(boLoc.maHoSo || '');
  var tenNguoiHuongLoc = chuanHoaChuoi_(boLoc.tenNguoiHuong || '');

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

    var dsCt = chiTietByHoSo[hs.MaHoSo] || [];
    if (tenNguoiHuongLoc) {
      var khop = dsCt.some(function (ct) { return chuanHoaChuoi_(ct.TenNguoiHuong).indexOf(tenNguoiHuongLoc) >= 0; });
      if (!khop) return;
    }

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
function docCacDongTheoKhoaA_(tenSheet, ma) {
  var sh = getSS_().getSheetByName(tenSheet);
  if (!sh) throw new Error('Không tìm thấy tab "' + tenSheet + '". Hãy chạy "Khởi tạo / kiểm tra cấu trúc Sheet".');
  var cuoi = sh.getLastRow(), nCot = sh.getLastColumn();
  if (cuoi < 2 || nCot < 1) return [];
  var headers = sh.getRange(1, 1, 1, nCot).getValues()[0];
  var thieu = (COT_BAT_BUOC_SHEET_[tenSheet] || []).filter(function (c) { return headers.indexOf(c) < 0; });
  if (thieu.length) throw new Error('Lỗi cấu trúc tab "' + tenSheet + '": thiếu cột ' + thieu.join(', ') + '. Hãy chạy "Khởi tạo / kiểm tra cấu trúc Sheet".');
  var cotA = sh.getRange(2, 1, cuoi - 1, 1).getValues(), dong = [];
  for (var i = 0; i < cotA.length; i++) if (cotA[i][0] !== '' && cotA[i][0] !== null && String(cotA[i][0]) === String(ma)) dong.push(i + 2);
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
  return docCacDongTheoKhoaA_(SHEET_HOSO, maHoSo).filter(function (h) { return !laDaXoa_(h.DaXoa); })[0] || null;
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
  var maKH = payload.maKH;
  // Không chỉ dựa vào "có mã hay không" để suy ra mới/cũ — trường hợp tạo khách hàng từ hoá đơn
  // (moTaoSuaKhachHangTuHoaDon_ ở client) đã GÁN SẴN Mã KH = MST dù là khách hàng hoàn toàn mới,
  // nên phải kiểm tra dòng đó có THẬT SỰ tồn tại trên Sheet hay không.
  var rHienCo = maKH ? timDongTheoMa_(SHEET_KHACHHANG, 'MaKH', maKH) : -1;
  var isNew = rHienCo < 0;
  if (isNew && !maKH) maKH = sinhMaTuDong_(SHEET_KHACHHANG, 'KH', 3);

  var giaTriTheoTen = {
    MaKH: maKH, TenKhachHang: payload.tenKhachHang, MaSoThue: payload.maSoThue || '',
    DiaChi: payload.diaChi || '', SoTaiKhoan: String(payload.soTaiKhoan || ''),
    TaiNganHang: payload.taiNganHang || '', DienThoai: payload.dienThoai || '',
    Email: payload.email || '', GhiChu: payload.ghiChu || ''
  };
  var headers = damBaoCotSheet_(sh, Object.keys(giaTriTheoTen));
  var row = headers.map(function (h) { return giaTriTheoTen.hasOwnProperty(h) ? giaTriTheoTen[h] : ''; });

  if (isNew) {
    themDongVaoCuoiThat_(sh, row);
  } else {
    sh.getRange(rHienCo, 1, 1, row.length).setValues([row]);
  }
  SpreadsheetApp.flush();
  tangRevision_('KHACHHANG');
  return { maKH: maKH };
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
  if (!payload.tenCty) throw new Error('Vui lòng nhập Tên công ty.');
  var sh = getSS_().getSheetByName(SHEET_CONGTY);
  var maCty = payload.maCty;

  // Đã có sẵn công ty trên Sheet (bất kể payload gửi lên maCty gì) -> LUÔN cập nhật đúng dòng đó,
  // không tạo dòng mới. Chỉ khi Sheet CHƯA có công ty nào mới cho phép tạo dòng đầu tiên (và cũng
  // là duy nhất).
  var dsHienCo = sheetToObjects_(SHEET_CONGTY);
  if (dsHienCo.length > 0) {
    maCty = dsHienCo[0].MaCty;
  } else if (!maCty) {
    maCty = sinhMaTuDong_(SHEET_CONGTY, 'CTY', 3);
  }
  var isNew = dsHienCo.length === 0;

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
    TaiKhoanUSD: payload.taiKhoanUSD || ''
  };
  var headers = damBaoCotSheet_(sh, Object.keys(giaTriTheoTen));
  var hangMoi = headers.map(function (h) {
    return giaTriTheoTen.hasOwnProperty(h) ? giaTriTheoTen[h] : '';
  });

  if (isNew) {
    themDongVaoCuoiThat_(sh, hangMoi);
  } else {
    var r = timDongTheoMa_(SHEET_CONGTY, 'MaCty', maCty);
    if (r < 0) throw new Error('Không tìm thấy công ty ' + maCty + ' để cập nhật.');
    sh.getRange(r, 1, 1, hangMoi.length).setValues([hangMoi]);
  }
  SpreadsheetApp.flush();
  tangRevision_('CONGTY');
  return { maCty: maCty };
}

/**
 * Lưu (tạo mới/cập nhật) 1 hợp đồng cho vay theo hạn mức ở tab DM_HopDongVay.
 * payload = { maHD (rỗng nếu tạo mới), maCty, soHopDong, ngayHopDong, tenNganHang, chiNhanh,
 *             diaChiChiNhanh, mstChiNhanh, hanMucVay, laiSuatTrongHan, moTaLaiSuatQuaHan,
 *             laiSuatLaiChamTra, kyHanTraGoc, kyHanTraLai }
 */
function luuHopDong(payload) {
  yeuCauDangNhap_();
  return voiKhoa_(function () { return luuHopDong_(payload); });
}

function luuHopDong_(payload) {
  if (!payload.maCty) throw new Error('Vui lòng chọn công ty vay vốn.');
  if (!payload.soHopDong) throw new Error('Vui lòng nhập Số hợp đồng.');
  var sh = getSS_().getSheetByName(SHEET_HOPDONG);
  var maHD = payload.maHD;
  var isNew = !maHD;
  if (isNew) {
    // Chặn tạo trùng khi bấm lưu nhiều lần / lưu lại sau lỗi mạng: cùng công ty + cùng số hợp đồng đã có thì KHÔNG tạo thêm dòng.
    var chuan = function (v) { return String(v || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    var daCo = sheetToObjects_(SHEET_HOPDONG).filter(function (h) { return String(h.MaCty) === String(payload.maCty) && chuan(h.SoHopDong) === chuan(payload.soHopDong); });
    if (daCo.length) throw new Error('Công ty này đã có hợp đồng số "' + payload.soHopDong + '" (mã ' + daCo[0].MaHD + '). Hãy mở hợp đồng đó để sửa, không tạo thêm bản trùng.');
    maHD = sinhMaTuDong_(SHEET_HOPDONG, 'HD', 3);
  }

  var giaTriTheoTen = {
    MaHD: maHD, MaCty: payload.maCty, SoHopDong: payload.soHopDong, NgayHopDong: toDateOrEmpty_(payload.ngayHopDong),
    TenNganHang: payload.tenNganHang || '', ChiNhanh: payload.chiNhanh || '', DiaChiChiNhanh: payload.diaChiChiNhanh || '',
    MST_ChiNhanh: payload.mstChiNhanh || '', HanMucVay: docTienNguyen_(payload.hanMucVay, 'Hạn mức vay'),
    'LaiSuatTrongHan_%': Number(payload.laiSuatTrongHan) || 0, MoTaLaiSuatQuaHan: payload.moTaLaiSuatQuaHan || '',
    'LaiSuatLaiChamTra_%': Number(payload.laiSuatLaiChamTra) || 0, KyHanTraGoc: payload.kyHanTraGoc || 'Cuối kỳ',
    KyHanTraLai: payload.kyHanTraLai || 'Hàng tháng',
    NguoiDaiDienNH: payload.nguoiDaiDienNH || '', ChucVuNH: payload.chucVuNH || '', GiayUyQuyenNH: payload.giayUyQuyenNH || '',
    DienThoaiNH: payload.dienThoaiNH || '', SoHopDongKhungMBNT: payload.soHopDongKhungMBNT || '',
    NgayHopDongKhungMBNT: toDateOrEmpty_(payload.ngayHopDongKhungMBNT)
  };
  var headers = damBaoCotSheet_(sh, Object.keys(giaTriTheoTen));
  var row = headers.map(function (h) { return giaTriTheoTen.hasOwnProperty(h) ? giaTriTheoTen[h] : ''; });

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

function toDateOrEmpty_(v) {
  if (!v) return '';
  if (v instanceof Date) return v;
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
  function xet(viTri, v) {
    if (v === '' || v === null || v === undefined) return;
    var n = Number(v);
    if (isFinite(n) && Math.floor(n) !== n) kq.push(viTri + ' = ' + v);
  }
  xet('HoSoGiaiNgan.DuNoHienTai', hoSo && hoSo.DuNoHienTai);
  xet('HoSoGiaiNgan.SoTienNhanNoLanNay', hoSo && hoSo.SoTienNhanNoLanNay);
  (chiTiet || []).forEach(function (ct, i) {
    xet('ChiTietThuHuong dòng ' + (i + 1) + ' SoTien', ct.SoTien);
    xet('ChiTietThuHuong dòng ' + (i + 1) + ' SoTienQuyDoi', ct.SoTienQuyDoi);
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
    var daCo = docDanhSachHoSo_(true).filter(function (h) { return String(h.KhoaYeuCau || '') === khoaYeuCau; })[0];
    if (daCo) return { maHoSo: daCo.MaHoSo, trangThai: daCo.TrangThai, revision: soRevision_(daCo), daCoTuTruoc: true };
  }
  if (!isNew) tuPhucHoiGhiDoDangCuaHoSo_(maHoSo); // lần lưu trước chết giữa chừng → phục hồi trước khi ghi tiếp
  var existing = isNew ? null : layHoSoTheoMa_(maHoSo);
  if (!isNew && !existing) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + ' để cập nhật.');
  if (existing && existing.TrangThai !== TT_NHAP) {
    throw new Error('Hồ sơ ' + maHoSo + ' đang ở trạng thái "' + existing.TrangThai + '" nên không sửa được' +
      (existing.TrangThai === TT_DA_TAO ? ' — hãy bấm "Chuyển về Nháp" trước khi sửa.' : '.'));
  }
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
  var headers = shHoSo.getRange(1, 1, 1, shHoSo.getLastColumn()).getValues()[0];

  // Các giá trị hồ sơ TỰ NHẬP — cột nào không có trong đây (VD: các cột Link_...) sẽ được GIỮ NGUYÊN
  // giá trị cũ khi cập nhật (tra theo TÊN cột, không theo vị trí, để không lệch khi thêm cột mới).
  var giaTriTheoTen = {
    MaHoSo: maHoSo,
    MaHD: payload.maHD || '',
    SoGiayNhanNo: payload.soGiayNhanNo || '',
    NgayGiayNhanNo: toDateOrEmpty_(payload.ngayGiayNhanNo),
    DuNoHienTai: tien.duNo,
    LoaiTien: loaiTien,
    TyGiaBan: loaiTien === 'USD' ? tyGiaBan : 0,
    SoTienNhanNoLanNay: tien.soTienLanNay,
    SoTienBangChu: soTienBangChu,
    PhuongThucThanhToan: payload.phuongThucThanhToan || 'Chuyển khoản',
    MucDichSuDungVon: payload.mucDichSuDungVon || '',
    ThoiHanChoVay_Ngay: payload.thoiHanChoVayNgay || '',
    NgayGiaiNgan: toDateOrEmpty_(payload.ngayGiaiNgan),
    NgayDenHan: toDateOrEmpty_(payload.ngayDenHan),
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
  var headerChiTiet = shChiTiet.getRange(1, 1, 1, shChiTiet.getLastColumn()).getValues()[0];
  var chiTiet = payload.chiTiet || [];
  var hangChiTietMoi = chiTiet.map(function (ct, idx) {
    var giaTriDong = {
      MaHoSo: maHoSo,
      STT: idx + 1,
      TenNguoiHuong: ct.tenNguoiHuong || '',
      SoTaiKhoan: ct.soTaiKhoan || '',
      TaiNganHang: ct.taiNganHang || '',
      LoaiTien: loaiTien,
      NoiDungThanhToan: ct.noiDungThanhToan || '',
      LoaiChungTu: ct.loaiChungTu || '',
      SoTien: tien.chiTiet[idx].soTien,
      SoTienQuyDoi: tien.chiTiet[idx].soTienQuyDoi,
      ChuyenTienNhanh_24_7: ct.chuyenTienNhanh || 'N',
      TaiLieuSo: ct.taiLieuSo || '',
      NgayTaiLieu: ct.ngayTaiLieu || '',
      DonViLapTaiLieu: ct.donViLapTaiLieu || ct.tenNguoiHuong || '',
      NgayCapGiayToTuyThan: ct.ngayCapGiayToTuyThan || '',
      GhiChu: ct.ghiChu || ''
    };
    return headerChiTiet.map(function (h) { return giaTriDong.hasOwnProperty(h) ? giaTriDong[h] : ''; });
  });

  // Sao lưu chi tiết cũ để PHỤC HỒI nếu ghi mới thất bại giữa chừng (không để mất dữ liệu).
  var allChiTiet = layGiaTriThatCuaSheet_(shChiTiet);
  var rowsToDelete = [], saoLuuChiTiet = [];
  for (var r = allChiTiet.length - 1; r >= 1; r--) {
    if (String(allChiTiet[r][0]) === String(maHoSo)) { rowsToDelete.push(r + 1); saoLuuChiTiet.unshift(allChiTiet[r]); }
  }

  var nhatKyGhi = ghiDoDangBatDau_(maHoSo, isNew, rowHoSoCu, saoLuuChiTiet);
  try {
    shHoSo.getRange(dongHoSoGhi, 1, 1, rowData.length).setValues([rowData]);
    xoaCacDongNhom_(shChiTiet, rowsToDelete);
    if (hangChiTietMoi.length) {
      var dongDau = timDongThatCuoiCung_(shChiTiet) + 1;
      shChiTiet.getRange(dongDau, 1, hangChiTietMoi.length, headerChiTiet.length).setValues(hangChiTietMoi);
    }
    SpreadsheetApp.flush();
    var loiXacMinh = xacMinhChaCon_(maHoSo, chiTiet.length, tien.soTienLanNay);
    if (loiXacMinh.length) throw new Error('Đối chiếu sau khi ghi không khớp: ' + loiXacMinh.join('; '));
  } catch (eGhi) {
    try {
      // Khôi phục: bỏ chi tiết dở dang (nếu có) rồi ghi lại bản cũ; hồ sơ mới thì xoá dòng vừa ghi.
      var conLai = layGiaTriThatCuaSheet_(shChiTiet);
      for (var q = conLai.length - 1; q >= 1; q--) {
        if (String(conLai[q][0]) === String(maHoSo)) shChiTiet.deleteRow(q + 1);
      }
      if (saoLuuChiTiet.length) {
        shChiTiet.getRange(timDongThatCuoiCung_(shChiTiet) + 1, 1, saoLuuChiTiet.length, saoLuuChiTiet[0].length).setValues(saoLuuChiTiet);
      }
      if (isNew) shHoSo.deleteRow(dongHoSoGhi); else shHoSo.getRange(dongHoSoGhi, 1, 1, rowHoSoCu.length).setValues([rowHoSoCu]);
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
  var dsLuongTaiLen = sheetToObjects_(SHEET_BANGKE_LUONG);
  dsLuongTaiLen.forEach(function (dong) {
    if (!dong.HoTen) return;
    out.push({
      hoTen: String(dong.HoTen).trim(), thang: String(dong.Thang || ''), soTien: Number(dong.SoTien) || 0,
      key: String(dong.HoTen).trim() + ' (' + String(dong.Thang || '') + ')'
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
  if (!tenNguoiHuong) return [];
  var chuan = chuanHoaChuoi_(tenNguoiHuong);
  var khopChinhXac = [];
  var khopGanDung = [];

  // Nguồn 1: Sổ chi tiết mua hàng (file Sheet ngoài, cấu hình ở SS_MUA_HANG_ID) — best-effort, không
  // chặn kết quả nếu file này chưa cấu hình/không mở được (VD chưa cấp quyền, đổi ID...).
  try {
    var ss = SpreadsheetApp.openById(SS_MUA_HANG_ID);
    var sh = ss.getSheetByName(SHEET_MUA_HANG);
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
  var dsHoaDonTaiLen = sheetToObjects_(SHEET_BANGKE_HOADON);
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
    if (nccChuan === chuan) khopChinhXac.push(item);
    else if (nccChuan.indexOf(chuan) >= 0 || chuan.indexOf(nccChuan) >= 0) khopGanDung.push(item);
  });

  // Ưu tiên khớp chính xác tên nhà cung cấp; nếu không có thì dùng khớp gần đúng (chứa nhau).
  var ketQua = khopChinhXac.length ? khopChinhXac : khopGanDung;

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
      var canRaSoat = (Math.floor(soTienGoc) !== soTienGoc) || (Math.floor(soTienQuyDoi) !== soTienQuyDoi);
      if (!(ct.SoTienQuyDoi !== undefined && ct.SoTienQuyDoi !== '') && !canRaSoat) {
        soTienQuyDoi = (loaiTienHS === 'USD') ? quyDoiUSDSangVND_(soTienGoc, tyGiaBanHS) : soTienGoc;
      }
      out.push({
        maHoSo: hs.MaHoSo,
        trangThai: hs.TrangThai || '',
        soHopDong: soHopDong || '',
        soGiayNhanNo: hs.SoGiayNhanNo || '',
        ngayNhanNo: formatNgay_(hs.NgayGiayNhanNo),
        ngayGiaiNgan: formatNgay_(hs.NgayGiaiNgan),
        ngayThucTe: xn ? String(xn.NgayThucTe || '') : '', soThamChieuNH: xn ? xn.SoThamChieuNH : '', thieuNgay: thieuNgay,
        tenNguoiHuong: ct.TenNguoiHuong || '',
        loaiTien: loaiTienHS,
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

/** Cập nhật sheet BaoCaoTienVay_Draft (báo cáo NHÁP, không phải bản chính thức). Lỗi không chặn lưu hồ sơ nhưng KHÔNG bị nuốt: ghi nhật ký để biết bản nháp đang cũ. */
function capNhatBaoCaoNhapAnToan_(maHoSo) {
  try { capNhatBaoCaoDraft_(); } catch (e) { ghiNhatKy_(maHoSo || '', 'LOI_BAO_CAO_NHAP', 'Báo cáo nháp chưa cập nhật được (có thể đang cũ): ' + e.message); }
}
