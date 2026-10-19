/**
 * DOCGENERATOR.GS
 * Sinh các văn bản hồ sơ vay ngân hàng (Google Docs/Sheets) từ dữ liệu trên Sheet, theo đúng mẫu
 * BIDV thật: Hợp đồng tín dụng cụ thể / Văn bản đề nghị giải ngân (VND & USD), Uỷ nhiệm chi /
 * Bảng kê chuyển tiền vay (tự động theo số dòng thụ hưởng), Hợp đồng mua bán ngoại tệ giao ngay
 * (hồ sơ USD), và Báo cáo tiền vay.
 */

// ---------- Tiện ích định dạng ----------

/**
 * Định dạng số tiền có dấu chấm ngăn cách hàng nghìn (25000 -> "25.000"). Không bao giờ làm tròn:
 * hỗ trợ tối đa hai chữ số thập phân cho USD; VND được kiểm tra nguyên trước khi lưu/phát hành.
 */
function formatSo_(n) {
  var so = docTienUSD_(n, 'Số tiền'), p = String(so).split('.');
  return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : '');
}

/** Tỷ giá (được phép có phần thập phân): 26145.5 -> "26.145,5". */
function formatTyGia_(n) {
  var tg = docTyGia_(n);
  var p = String(tg).split('.');
  return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? (',' + p[1]) : '');
}

/** Ngày dd/MM/yyyy từ Date hoặc chuỗi yyyy-MM-dd; rỗng -> placeholder để điền tay. */
function formatNgay_(v) {
  if (!v) return '…../…../20….';
  return chuanNgay_(v);
}

/** Như formatNgay_ nhưng rỗng -> '' (dùng cho báo cáo/bảng). */
function chuanNgay_(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  }
  var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];
  return String(v);
}

/**
 * Canh lề cho bảng Google Doc theo kiểu cột: 'S' = số tiền (canh phải), 'D' = ngày/STT (canh giữa),
 * 'T' = chuỗi (canh trái). Hàng tiêu đề (hàng 0) canh giữa.
 */
function canhLeBang_(table, kieuCot) {
  var H = DocumentApp.HorizontalAlignment;
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < kieuCot.length && c < row.getNumCells(); c++) {
      var kieu = r === 0 ? 'D' : kieuCot[c];
      var al = kieu === 'S' ? H.RIGHT : (kieu === 'D' ? H.CENTER : H.LEFT);
      var cell = row.getCell(c);
      for (var k = 0; k < cell.getNumChildren(); k++) {
        var ch = cell.getChild(k);
        if (ch.getType() === DocumentApp.ElementType.PARAGRAPH) ch.asParagraph().setAlignment(al);
      }
    }
  }
}

/** Canh lề + định dạng số cho vùng Sheet: sốTiền '#,##0' canh phải, ngày canh giữa, chuỗi canh trái. */
function dinhDangCotSheet_(sh, dongDau, soDong, kieuCot) {
  if (soDong < 1) return;
  kieuCot.forEach(function (kieu, i) {
    var rg = sh.getRange(dongDau, i + 1, soDong, 1);
    if (kieu === 'S') rg.setNumberFormat('#,##0.##').setHorizontalAlignment('right');
    else if (kieu === 'D') rg.setHorizontalAlignment('center');
    else rg.setHorizontalAlignment('left');
  });
}

function formatNgayDayDu_(v) {
  if (!v) return 'ngày .... tháng .... năm ........';
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return 'ngày ' + Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'dd') +
    ' tháng ' + Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'MM') +
    ' năm ' + Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy');
}

// =========================================================================
// VĂN BẢN ĐỀ NGHỊ GIẢI NGÂN — MẪU BIDV "HỢP ĐỒNG TÍN DỤNG CỤ THỂ" (VND & USD), có cột
// "Loại chứng từ" (khoản mục giải ngân) theo đúng yêu cầu.
// =========================================================================

function addDeNghiGiaiNganBIDVToBody_(body, d) {
  var hoSo = d.hoSo, hopDong = d.hopDong, congTy = d.congTy, chiTiet = d.chiTiet || [];
  var laUSD = String(hoSo.LoaiTien || 'VND').toUpperCase() === 'USD';

  var headTable = body.appendTable([[
    '',
    'HỢP ĐỒNG TÍN DỤNG CỤ THỂ' + (laUSD ? ' -\nPHẦN ĐỀ NGHỊ GIẢI NGÂN' : '') +
      '\n(Áp dụng đối với khoản vay theo hạn mức tín dụng đối với KHBL' + (laUSD ? ', KHDN,\nChủ DNTN)' : ' và KHDN)') +
      '\nSố Hợp đồng: ' + (hopDong.SoHopDong || '……………')
  ]]);
  headTable.setBorderWidth(0.75);
  headTable.getRow(0).getCell(0).setWidth(90);
  headTable.getRow(0).getCell(1).editAsText().setBold(true).setFontSize(11);

  body.appendParagraph('');
  var kg = body.appendParagraph('Kính gửi: ' + (hopDong.TenNganHang || '') + ' - ' + (hopDong.ChiNhanh || ''));
  kg.setBold(false);

  var bv = body.appendParagraph('Bên vay: ' + congTy.TenCty);
  bv.editAsText().setBold(0, ('Bên vay: ').length - 1, true);

  var t1 = body.appendListItem('Địa chỉ: ' + (congTy.DiaChiTruSo || ''));
  t1.setGlyphType(DocumentApp.GlyphType.HYPHEN);
  var t2 = body.appendListItem('Điện thoại: ' + (congTy.DienThoai || ''));
  t2.setGlyphType(DocumentApp.GlyphType.HYPHEN);
  var t3 = body.appendListItem('Giấy chứng nhận đăng ký doanh nghiệp Số ' + (congTy.MaCIF || '') +
    (congTy.GiayUyQuyenSo ? (', ' + congTy.GiayUyQuyenSo) : '') +
    (congTy.GiayUyQuyenNgay ? (' ngày ' + formatNgay_(congTy.GiayUyQuyenNgay)) : ''));
  t3.setGlyphType(DocumentApp.GlyphType.HYPHEN);

  var t4 = body.appendListItem('Do ông/bà: ' + (congTy.NguoiDaiDien || '') + '   Chức vụ: ' + (congTy.ChucVu || '') + ' làm đại diện');
  t4.setGlyphType(DocumentApp.GlyphType.HYPHEN);

  body.appendParagraph('');
  var soTienChu = laUSD ? soTienUSDBangChu_(hoSo.SoTienNhanNoLanNay) : (hoSo.SoTienBangChu || soThanhChuVN(hoSo.SoTienNhanNoLanNay));
  var donVi = laUSD ? 'USD' : 'đồng';
  var canCu = body.appendParagraph('Căn cứ: Hợp đồng tín dụng hạn mức số ' + (hopDong.SoHopDong || '') +
    ' ký ngày ' + formatNgay_(hopDong.NgayHopDong) + ' (sau đây gọi là "Hợp đồng tín dụng hạn mức")');
  canCu.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

  var deNghi = body.appendParagraph('Đề nghị ' + (hopDong.TenNganHang || '') + ' - ' + (hopDong.ChiNhanh || '') +
    ' cho Tôi/Chúng tôi rút số tiền vay là: ' + formatSo_(hoSo.SoTienNhanNoLanNay) + ' ' + donVi +
    ' (Bằng chữ: ' + soTienChu + (laUSD ? '' : ' y') + './.)');
  deNghi.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

  body.appendParagraph('Thời hạn vay: ' + (hoSo.ThoiHanChoVay_Ngay || '……') + ' ngày.');
  if (laUSD) {
    body.appendParagraph('Ngày vay: ' + formatNgay_(hoSo.NgayGiaiNgan));
  }
  body.appendParagraph('Để thanh toán theo nội dung dưới đây:');
  body.appendParagraph('');

  // ----- Bảng thanh toán: VND có 5 cột, USD có 6 cột (thêm Loại tiền/Số tiền quy đổi) -----
  var headerRow = laUSD
    ? ['TT', 'Nội dung', 'Loại chứng từ', 'Số, ký hiệu, ngày phát sinh\nchứng từ kế toán',
       'Số tiền giải ngân\nvà Loại tiền', 'Số tiền\nquy đổi (đồng)', 'Tên đơn vị, số tài khoản\nngân hàng người thụ hưởng']
    : ['TT', 'Nội dung', 'Loại chứng từ', 'Số hiệu\nchứng từ kế toán', 'Số tiền\n(đồng)',
       'Tên đơn vị, số tài khoản\nngân hàng người thụ hưởng'];

  var rows = [headerRow];
  var tong = 0, tongQuyDoi = 0;
  chiTiet.forEach(function (ct, idx) {
    var stt = (idx + 1 < 10 ? '0' : '') + (idx + 1);
    var tenDonVi = (ct.TenNguoiHuong || '') + '\nSố TK: ' + (ct.SoTaiKhoan || '') + '\nTại: ' + (ct.TaiNganHang || '');
    if (laUSD) {
      rows.push([
        stt, ct.NoiDungThanhToan || '', ct.LoaiChungTu || '', ct.TaiLieuSo || '',
        formatSo_(ct.SoTien) + ' ' + (Number(hoSo.PhienBanTien) === 2 ? ct.LoaiTien : 'USD'), formatSo_(ct.SoTienQuyDoi), tenDonVi
      ]);
    } else {
      rows.push([stt, ct.NoiDungThanhToan || '', ct.LoaiChungTu || '', ct.TaiLieuSo || '', formatSo_(ct.SoTien), tenDonVi]);
    }
    if (Number(hoSo.PhienBanTien) !== 2) tong = tongTienTheoLoai_([tong, ct.SoTien], laUSD ? 'USD' : 'VND');
    tongQuyDoi += docTienNguyen_(ct.SoTienQuyDoi, 'Số tiền quy đổi dòng ' + (idx + 1));
  });
  var hangTong = headerRow.map(function () { return ''; });
  hangTong[0] = 'TC';
  hangTong[4] = Number(hoSo.PhienBanTien) === 2 ? '' : (laUSD ? (formatSo_(tong) + ' USD') : formatSo_(tong));
  if (laUSD) hangTong[5] = formatSo_(tongQuyDoi);
  // Mẫu 1 khoản thụ hưởng (VD: HDTD_CT_VND_01) không có dòng "TC" tổng cộng riêng — chỉ mẫu nhiều
  // khoản (VD: HDTD_CT_VND_02) mới có. Giữ đúng cách trình bày gốc theo số dòng thụ hưởng.
  if (chiTiet.length > 1) rows.push(hangTong);

  var bTable = body.appendTable(rows);
  bTable.setBorderWidth(0.75);
  for (var c = 0; c < headerRow.length; c++) {
    bTable.getRow(0).getCell(c).editAsText().setBold(true).setFontSize(9);
  }
  for (var rr = 1; rr < bTable.getNumRows(); rr++) {
    for (var cc = 0; cc < headerRow.length; cc++) bTable.getRow(rr).getCell(cc).editAsText().setFontSize(9);
  }
  canhLeBang_(bTable, laUSD ? ['D', 'T', 'T', 'T', 'S', 'S', 'T'] : ['D', 'T', 'T', 'T', 'S', 'T']);
  var lastRowIdx = bTable.getNumRows() - 1;
  bTable.getRow(lastRowIdx).getCell(0).editAsText().setBold(true);
  bTable.getRow(lastRowIdx).getCell(4).editAsText().setBold(true);
  if (laUSD) bTable.getRow(lastRowIdx).getCell(5).editAsText().setBold(true);

  body.appendParagraph('');
  body.appendParagraph('Tài liệu liên quan: ' + (hoSo.TaiLieuChungMinhMucDich || ''));
  body.appendParagraph('');
  var camKetTitle = body.appendParagraph('Chúng tôi cam kết:');
  camKetTitle.setBold(true).setItalic(true);

  var camKets = [
    'Ngay sau khi được Ngân hàng chấp thuận cho vay thì Hợp đồng tín dụng cụ thể này cùng với những nội dung chấp thuận của Ngân hàng trở thành nội dung của Hợp đồng tín dụng và có giá trị ràng buộc quyền và nghĩa vụ của Tôi/Chúng tôi đối với Ngân hàng, đồng thời là căn cứ pháp lý để giải quyết các tranh chấp sau này. Nếu nội dung chấp thuận của Ngân hàng tại phần duyệt dưới đây về số tiền, lãi suất, thời hạn và các nội dung khác khác với nội dung mà Tôi/Chúng tôi đề nghị thì nội dung chấp thuận của Ngân hàng sẽ có giá trị áp dụng. Hợp đồng tín dụng cụ thể này có hiệu lực kể từ ngày Ngân hàng chấp nhận giải ngân cho đến khi Tôi/Chúng tôi thanh toán đầy đủ số tiền gốc, lãi, lãi phạt quá hạn (nếu có) và các khoản phí liên quan cho Ngân hàng.',
    'Tôi/Chúng tôi cam kết sẽ bổ sung chứng từ giải ngân trong vòng tối đa 10 ngày làm việc kể từ ngày được giải ngân. Việc Tôi/Chúng tôi không bổ sung được tài liệu, chứng từ giải ngân trong thời hạn đã cam kết cấu thành một sự kiện vi phạm nghiêm trọng và Ngân hàng được toàn quyền áp dụng các biện pháp cần thiết và các biện pháp luật định để ngừng giải ngân, thu hồi nợ trước hạn và xử lý.',
    'Hợp đồng tín dụng cụ thể này được lập thành 03 bản, là một bộ phận không thể tách rời Hợp đồng tín dụng hạn mức.',
    'Toàn bộ nghĩa vụ thanh toán (gốc, lãi, lãi phạt, phí và các chi phí phát sinh theo Hợp đồng và Hợp đồng tín dụng hạn mức) được bảo đảm bằng các biện pháp thế chấp/cầm cố/ký quỹ/bảo lãnh bằng tài sản của bên vay và/hoặc bên thứ ba/bên bảo đảm theo các Hợp đồng thế chấp/cầm cố/ký quỹ/bảo lãnh (Hợp đồng bảo đảm).',
    'Chúng tôi cam kết chuyển doanh thu từ hoạt động kinh doanh về tài khoản mở tại Ngân hàng tối thiểu 120% doanh số giải ngân.'
  ];
  if (laUSD) {
    camKets.push('Tôi/Chúng tôi đồng ý bán giao ngay toàn bộ số tiền USD được Ngân hàng chấp thuận cho vay theo Hợp đồng tín dụng cụ thể này cho Ngân hàng theo tỷ giá bán: ' + formatTyGia_(hoSo.TyGiaBan) + ' VND/USD.');
  }
  camKets.forEach(function (noiDung) {
    var it = body.appendListItem(noiDung);
    it.setGlyphType(DocumentApp.GlyphType.HYPHEN);
    it.editAsText().setItalic(false);
  });

  body.appendParagraph('');
  var camKetCuoi = body.appendParagraph('Tôi/Chúng tôi cam kết thực hiện theo đúng các điều khoản trong Hợp đồng tín dụng hạn mức và Hợp đồng tín dụng cụ thể này.');
  camKetCuoi.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);

  body.appendParagraph('');
  var diaDiemNgay = body.appendParagraph('Đà Nẵng, ' + formatNgayDayDu_(hoSo.NgayGiaiNgan));
  diaDiemNgay.setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setItalic(true);

  body.appendParagraph('');
  var kyTable = body.appendTable([['KẾ TOÁN TRƯỞNG\n(Ký, họ tên)', 'BÊN VAY\n(ký, ghi rõ họ tên và đóng dấu)']]);
  kyTable.setBorderWidth(0.75);
  for (var i = 0; i < 2; i++) {
    kyTable.getRow(0).getCell(i).editAsText().setBold(true);
    kyTable.getRow(0).getCell(i).setPaddingTop(30);
  }
}

// =========================================================================
// CHỨNG TỪ CHUYỂN TIỀN — TỰ ĐỘNG CHỌN THEO SỐ DÒNG THỤ HƯỞNG
// Quy trình: hồ sơ có ĐÚNG 1 dòng thụ hưởng -> Uỷ nhiệm chi (UNC, 1 khoản chuyển).
//            hồ sơ có TỪ 2 dòng trở lên     -> Bảng kê chuyển tiền vay (nhiều khoản, có Tổng cộng).
// Dựng bằng code (Google Sheets), theo đúng bố cục UNC_BIDV.xlsx / BANGKE_GIAINGAN.xlsx.
// =========================================================================

/**
 * Tạo Ủy nhiệm chi (1 khoản chuyển) — dùng khi hồ sơ chỉ có đúng 1 dòng thụ hưởng.
 * Theo đúng bố cục UNC_BIDV.xlsx (song ngữ Việt/Anh, có ô "Số tiền bằng chữ").
 */
function taoUNCMotKhoan_(d) {
  var hoSo = d.hoSo, congTy = d.congTy, chiTiet = d.chiTiet, ct = chiTiet[0];
  var laUSD = String((Number(hoSo.PhienBanTien) === 2 ? ct.LoaiTien : hoSo.LoaiTien) || 'VND').toUpperCase() === 'USD';

  var ss = SpreadsheetApp.create('UNC_' + hoSo.MaHoSo);
  var sh = ss.getSheets()[0];
  sh.setName('UNC');
  sh.setColumnWidths(1, 1, 140);
  sh.setColumnWidth(9, 220);

  function dat(a1, val, opts) {
    var r = sh.getRange(a1);
    r.setValue(val);
    if (opts && opts.bold) r.setFontWeight('bold');
    if (opts && opts.size) r.setFontSize(opts.size);
  }

  dat('H1', 'ỦY NHIỆM CHI', { bold: true, size: 14 });
  dat('H2', 'PAYMENT ORDER', { size: 9 });
  dat('U2', 'Ngày/Date:');
  dat('X2', formatNgay_(hoSo.NgayGiaiNgan));
  sh.getRange('X2').setHorizontalAlignment('center');

  dat('A3', 'Tên Tài khoản trích Nợ/ Dr A/c Name: '); dat('J3', congTy.TenCty);
  dat('A4', 'Địa chỉ/Address:'); dat('J4', congTy.DiaChiTruSo || '');
  dat('A5', 'Số tài khoản trích nợ/Dr A/C No: '); dat('I5', laUSD ? (congTy.TaiKhoanUSD || '') : (congTy.TaiKhoanVND || ''));
  dat('A6', 'Tại Ngân hàng/At Bank:'); dat('J6', 'TMCP Đầu tư và Phát triển Việt Nam – Chi nhánh Quảng Nam');
  dat('A7', 'Số tiền bằng số/ Amount in figues:');
  dat('I7', docTienTheoLoai_(ct.SoTien, laUSD ? 'USD' : 'VND', 'Số tiền'));
  sh.getRange('I7').setNumberFormat(laUSD ? '#,##0.00' : '#,##0').setHorizontalAlignment('right');
  dat('A8', 'Số tiền bằng chữ/ Amount in words:');
  var chuTien = laUSD ? soTienUSDBangChu_(ct.SoTien) : soThanhChuVN(ct.SoTien);
  dat('I8', chuTien.charAt(0).toUpperCase() + chuTien.slice(1) + ' y./.');
  dat('A9', 'Đề nghị NH quy đổi ra loại tiền/ Request for changing into:……………Tỷ giá/ Ex rate:…………..');
  dat('A10', '      Phí trong số tiền chuyển/Deduct                     ');
  dat('L10', 'Phí thu từ tiền mặt/Fee in cash');
  dat('A11', 'Phí thu từ tài khoản/Fee collected from A/C: ');
  dat('A12', 'Người hưởng/Beneficiary: '); dat('H12', ct.TenNguoiHuong || '');
  dat('A13', 'Số CCCD/HC/ID No:                                                                  ');
  dat('N13', 'Ngày cấp/Date:');
  dat('A14', 'Nơi cấp/Place:');
  dat('A15', 'Địa chỉ/Address: ');
  dat('A16', "Số tài khoản/Ben's A/C No:                                 "); dat('H16', ct.SoTaiKhoan || '');
  dat('A17', 'Tại Ngân hàng/At Bank: '); dat('H17', ct.TaiNganHang || '');
  dat('A18', 'Nội dung/Remarks: '); dat('H18', ct.NoiDungThanhToan || '');
  dat('A19', 'Khách hàng xác nhận các thông tin trên là chính xác/Please sign to confirm the above information is accurate');
  dat('C20', 'Kế toán trưởng', { bold: true }); dat('K20', 'Chủ tài khoản', { bold: true });
  dat('S20', 'Giao dịch viên', { bold: true }); dat('X20', 'Kiểm soát viên', { bold: true });
  dat('C21', 'Chief Accountant'); dat('K21', 'Account holder'); dat('S21', 'Teller'); dat('X21', 'Supervisor');
  dat('A22', '(Ký và ghi rõ họ tên/Signature & full name)'); dat('J22', '(Ký và ghi rõ họ tên/Signature & full name)');
  dat('A27', 'Cảm ơn quý khách hàng đã sử dụng dịch vụ của BIDV');
  dat('A28', "Thank you for using BIDV's services");

  SpreadsheetApp.flush();
  return { spreadsheet: ss, ten: 'UNC_' + hoSo.MaHoSo, loai: 'UNC (Ủy nhiệm chi 1 khoản)' };
}

/**
 * Tạo Bảng kê chuyển tiền vay (nhiều khoản) — dùng khi hồ sơ có TỪ 2 dòng thụ hưởng trở lên.
 * Theo đúng bố cục BANGKE_GIAINGAN.xlsx (Stt / Tên đơn vị / STK / Ngân hàng / Số tiền / Nội dung).
 */
function taoBangKeGiaiNganNhieuKhoan_(d) {
  if (Number(d.hoSo.PhienBanTien) === 2) return taoBangKeChaCon_(d);
  var hoSo = d.hoSo, congTy = d.congTy, chiTiet = d.chiTiet;
  var laUSD = String(hoSo.LoaiTien || 'VND').toUpperCase() === 'USD';

  var ss = SpreadsheetApp.create('BangKeGiaiNgan_' + hoSo.MaHoSo);
  var sh = ss.getSheets()[0];
  sh.setName('BangKe');
  sh.setColumnWidth(1, 40);
  sh.setColumnWidths(2, 3, 190);
  sh.setColumnWidth(5, 120);
  sh.setColumnWidth(6, 260);

  sh.getRange('A1').setValue('Tên đơn vị : ' + congTy.TenCty);
  sh.getRange('A2').setValue('Địa chỉ : ' + (congTy.DiaChiTruSo || ''));
  sh.getRange('A3').setValue('MST : ' + (congTy.MaCIF || ''));
  sh.getRange('A4').setValue('BẢNG KÊ CHUYỂN TIỀN VAY NGÀY :').setFontWeight('bold');
  sh.getRange('C4').setValue(formatNgay_(hoSo.NgayGiaiNgan));

  var soTienHeader = laUSD ? 'Số tiền\n(USD)' : 'Số tiền\n(VND)';
  var header = ['Stt', 'Tên đơn vị thụ hưởng', 'Số tài khoản của đơn vị thụ hưởng',
    'Ngân hàng của đơn vị thụ hưởng', soTienHeader, 'Nội dung'];
  if (laUSD) header.splice(5, 0, 'Số tiền quy đổi\n(VND)');
  sh.getRange(6, 1, 1, header.length).setValues([header]).setFontWeight('bold')
    .setBackground('#1F4E78').setFontColor('#FFFFFF').setWrap(true);

  var startRow = 7;
  var rows = chiTiet.map(function (ct, i) {
    var hang = [i + 1, ct.TenNguoiHuong || '', ct.SoTaiKhoan || '', ct.TaiNganHang || '', docTienTheoLoai_(ct.SoTien, laUSD ? 'USD' : 'VND', 'Số tiền dòng ' + (i + 1)), ct.NoiDungThanhToan || ''];
    if (laUSD) hang.splice(5, 0, docTienNguyen_(ct.SoTienQuyDoi, 'Số tiền quy đổi dòng ' + (i + 1)));
    return hang;
  });
  sh.getRange(startRow, 1, rows.length, header.length).setValues(rows);

  var rowTong = startRow + rows.length;
  var colSoTien = laUSD ? 5 : 5;
  sh.getRange(rowTong, 2).setValue('Tổng cộng').setFontWeight('bold');
  sh.getRange(rowTong, colSoTien).setFormula(
    '=SUM(' + sh.getRange(startRow, colSoTien, rows.length, 1).getA1Notation() + ')'
  ).setFontWeight('bold');
  if (laUSD) {
    sh.getRange(rowTong, 6).setFormula('=SUM(' + sh.getRange(startRow, 6, rows.length, 1).getA1Notation() + ')').setFontWeight('bold');
  }

  dinhDangCotSheet_(sh, startRow, rows.length + 1, laUSD ? ['D', 'T', 'T', 'T', 'S', 'S', 'T'] : ['D', 'T', 'T', 'T', 'S', 'T']);
  sh.getRange('C4').setHorizontalAlignment('center');
  sh.getRange(rowTong + 2, 1).setValue('KẾ TOÁN TRƯỞNG').setFontWeight('bold');
  sh.getRange(rowTong + 2, 5).setValue('NGÂN HÀNG').setFontWeight('bold');
  sh.autoResizeColumns(1, header.length);
  SpreadsheetApp.flush();

  return { spreadsheet: ss, ten: 'BangKeGiaiNgan_' + hoSo.MaHoSo, loai: 'Bảng kê chuyển tiền vay (nhiều khoản)' };
}

/**
 * NHÁNH MẶC ĐỊNH (khi chưa có mẫu DOCX hiệu lực): tự chọn UNC (1 khoản) hay Bảng kê (nhiều khoản), dựng bằng code, xuất
 * Google Sheet + PDF + .xlsx. KHÔNG tự ghi link vào hồ sơ — việc đó do phatHanhChungTu_() làm, tách đúng cột
 * (trước đây link .xlsx bị ghi nhầm vào cột Link_ChungTuThanhToan_PDF).
 */
function taoChungTuMacDinh_(maHoSo, duLieuDaCo) {
  var d = duLieuDaCo || layDuLieuDayDu(maHoSo);
  if (!d.chiTiet.length) throw new Error('Hồ sơ chưa có dòng thụ hưởng nào ở mục 4.');

  var ket = (d.chiTiet.length === 1) ? taoUNCMotKhoan_(d) : taoBangKeGiaiNganNhieuKhoan_(d);
  var ss = ket.spreadsheet;

  var folder = layThuMucHoSo_(maHoSo);
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch (e) { /* bỏ qua */ }

  function xuat(dinhDang, duoi) {
    var resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=' + dinhDang, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) return '';
    var f = DriveApp.createFile(resp.getBlob().setName(ket.ten + '.' + duoi));
    folder.addFile(f);
    try { DriveApp.getRootFolder().removeFile(f); } catch (e) { /* bỏ qua */ }
    return f.getUrl();
  }
  return { sheetUrl: ss.getUrl(), xlsxUrl: xuat('xlsx', 'xlsx'), pdfUrl: xuat('pdf', 'pdf'), loai: ket.loai };
}

// =========================================================================
// HỢP ĐỒNG MUA BÁN NGOẠI TỆ GIAO NGAY — chỉ áp dụng cho hồ sơ vay USD (theo đúng mẫu
// HDMB_NGOAITE bạn cung cấp). Dựng bằng code, không cần file mẫu Drive.
// =========================================================================

function addHopDongMuaBanNgoaiTeToBody_(body, d) {
  var hoSo = d.hoSo, hopDong = d.hopDong, congTy = d.congTy;

  var t = body.appendParagraph('HỢP ĐỒNG MUA BÁN NGOẠI TỆ GIAO NGAY');
  t.setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(14);
  var sub = body.appendParagraph('(Áp dụng giữa BIDV và Khách hàng đã ký Hợp đồng khung A01)');
  sub.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setItalic(true).setFontSize(10);
  var so = body.appendParagraph('Số: 01........./' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy') + '/BIDV-...........');
  so.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  var ngayLap = body.appendParagraph('Đà Nẵng, ' + formatNgayDayDu_(hoSo.NgayGiaiNgan));
  ngayLap.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setItalic(true);

  body.appendParagraph('');
  var canCu = body.appendParagraph('Căn cứ Hợp đồng khung số ' + (hopDong.SoHopDongKhungMBNT || '……………') +
    (hopDong.NgayHopDongKhungMBNT ? (' ngày ' + formatNgay_(hopDong.NgayHopDongKhungMBNT)) : ' ngày ……………') +
    ' giữa ' + (hopDong.TenNganHang || 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam') + ' – Chi nhánh ' +
    (hopDong.ChiNhanh || '……') + ' và ' + congTy.TenCty + '.');
  canCu.setItalic(true).setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  body.appendParagraph('');

  var beTable = body.appendTable([[
    'BÊN A: ' + (hopDong.TenNganHang || 'NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM').toUpperCase() +
      '\nChi nhánh: ' + (hopDong.ChiNhanh || '……') +
      '\nĐịa chỉ: ' + (hopDong.DiaChiChiNhanh || '……') +
      '\nNgười đại diện: ' + (hopDong.NguoiDaiDienNH || '……') +
      '\nChức vụ/Số CMT: ' + (hopDong.ChucVuNH || '……') +
      (hopDong.GiayUyQuyenNH ? ('\nGiấy ủy quyền số: ' + hopDong.GiayUyQuyenNH) : '') +
      '\nĐiện thoại: ' + (hopDong.DienThoaiNH || '……'),
    'BÊN B: ' + congTy.TenCty.toUpperCase() + ' (Khách hàng)' +
      '\nĐịa chỉ: ' + (congTy.DiaChiTruSo || '') +
      '\nNgười đại diện: ' + (congTy.NguoiDaiDien || '') +
      '\nChức vụ/Số CMT: ' + (congTy.ChucVu || '') +
      '\nĐiện thoại: ' + (congTy.DienThoai || '')
  ]]);
  beTable.setBorderWidth(0.75);
  for (var i = 0; i < 2; i++) beTable.getRow(0).getCell(i).editAsText().setFontSize(9).setBold(0, 5, true);

  body.appendParagraph('');
  var tt = body.appendParagraph('THÔNG TIN GIAO DỊCH:');
  tt.setBold(true);

  var soTienUSD = docTienUSD_(Number(hoSo.PhienBanTien) === 2 ? hoSo.USDBan : hoSo.SoTienNhanNoLanNay, 'Số tiền giao dịch');
  var tyGia = docTyGia_(hoSo.TyGiaBan);
  var soTienVND = Number(hoSo.PhienBanTien) === 2 ? docTienNguyen_(hoSo.VNDThucNhan) : quyDoiUSDSangVND_(soTienUSD, tyGia); // ROUND(USD x Tỷ giá, 0), không làm tròn tỷ giá trước khi nhân
  var giaoDichTable = body.appendTable([[
    'Số tiền giao dịch: ' + formatSo_(soTienUSD) + ' USD' +
      '\nTỷ giá: ' + formatTyGia_(tyGia) + ' VND/USD' +
      '\nSố tiền thanh toán: ' + formatSo_(soTienVND) +
      '\nBằng chữ: ' + soThanhChuVN(soTienVND) +
      '\nNgày giao dịch: ' + formatNgay_(hoSo.NgayGiaiNgan) +
      '\nMục đích sử dụng ngoại tệ: ' + (hoSo.MucDichSuDungVon || 'Thanh toán chi phí của công ty.'),
    '☐ Mua  ☒ Bán' +
      '\nLoại tiền giao dịch: USD' +
      '\nLoại tiền thanh toán: VND' +
      '\nNgày thanh toán: ' + formatNgay_(hoSo.NgayGiaiNgan)
  ]]);
  giaoDichTable.setBorderWidth(0.75);
  for (var j = 0; j < 2; j++) giaoDichTable.getRow(0).getCell(j).editAsText().setFontSize(9);

  body.appendParagraph('');
  var cd = body.appendParagraph('CHỈ DẪN THANH TOÁN:');
  cd.setBold(true);
  var cdTable = body.appendTable([[
    'Chỉ dẫn thanh toán đồng USD (khách hàng bán):' +
      '\n☐ Bên B ủy quyền vô điều kiện không hủy ngang cho Bên A tự động trích nợ USD từ tài khoản tiền gửi thanh toán số ' +
      (congTy.TaiKhoanUSD || '……………') + ' của Bên B mở tại Bên A.',
    'Chỉ dẫn thanh toán đồng VND (khách hàng mua):' +
      '\n☐ Bên A chuyển tiền VND vào TK số ' + (congTy.TaiKhoanVND || '……………') + ' của Bên B tại Bên A.' +
      '\nBên A chuyển tiền để thanh toán theo bảng kê tại Hợp đồng tín dụng cụ thể số ' +
      (hopDong.SoHopDong || '……') + ' ngày ' + formatNgay_(hoSo.NgayGiaiNgan) + '.'
  ]]);
  cdTable.setBorderWidth(0.75);
  for (var k = 0; k < 2; k++) cdTable.getRow(0).getCell(k).editAsText().setFontSize(9);

  body.appendParagraph('');
  var hl = body.appendParagraph('HIỆU LỰC CỦA HỢP ĐỒNG');
  hl.setBold(true);
  [
    'Hợp đồng này là một phần không thể tách rời của Hợp đồng khung số ' + (hopDong.SoHopDongKhungMBNT || '……') +
      (hopDong.NgayHopDongKhungMBNT ? (' ngày ' + formatNgay_(hopDong.NgayHopDongKhungMBNT)) : '') +
      ' giữa ' + (hopDong.TenNganHang || 'Ngân hàng') + ' – Chi nhánh ' + (hopDong.ChiNhanh || '……') + ' và ' + congTy.TenCty + '.',
    'Hợp đồng này có hiệu lực kể từ ngày ký. Mọi điều chỉnh, bổ sung Hợp đồng này chỉ có hiệu lực khi được lập thành văn bản với chữ ký, xác nhận của hai bên và là bộ phận không thể tách rời của Hợp đồng này.',
    'Hợp đồng này được lập thành 02 bản bằng tiếng Việt, có giá trị pháp lý ngang nhau, mỗi Bên giữ 01 bản.'
  ].forEach(function (noiDung, idx) {
    var it = body.appendParagraph((idx + 1) + '. ' + noiDung);
    it.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
  });

  body.appendParagraph('');
  var kyTable = body.appendTable([['NGÂN HÀNG\n(Ký, đóng dấu)', 'KHÁCH HÀNG\n(Ký, đóng dấu)\n\nKế toán trưởng']]);
  kyTable.setBorderWidth(0.75);
  for (var m = 0; m < 2; m++) {
    kyTable.getRow(0).getCell(m).editAsText().setBold(true);
    kyTable.getRow(0).getCell(m).setPaddingTop(30);
  }
}

/** Tạo Hợp đồng mua bán ngoại tệ giao ngay — CHỈ áp dụng cho hồ sơ vay USD. */
function taoHDMBMacDinh_(maHoSo, duLieuDaCo) {
  var d = duLieuDaCo || layDuLieuDayDu(maHoSo);
  if (String(d.hoSo.LoaiTien || 'VND').toUpperCase() !== 'USD') {
    throw new Error('Hợp đồng mua bán ngoại tệ chỉ áp dụng cho hồ sơ vay bằng USD.');
  }
  var doc = DocumentApp.create('HDMB_NgoaiTe_' + maHoSo);
  addHopDongMuaBanNgoaiTeToBody_(doc.getBody(), d);
  doc.saveAndClose();
  dichChuyenVaoThuMuc_(doc.getId(), maHoSo);
  var pdfUrl = xuatPdf_(doc.getId(), doc.getName(), maHoSo);

  return { docUrl: doc.getUrl(), pdfUrl: pdfUrl };
}

function taoDeNghiMacDinh_(maHoSo, duLieuDaCo) {
  var d = duLieuDaCo || layDuLieuDayDu(maHoSo);
  var doc = DocumentApp.create('DeNghiGiaiNgan_BIDV_' + maHoSo);
  addDeNghiGiaiNganBIDVToBody_(doc.getBody(), d);
  doc.saveAndClose();
  dichChuyenVaoThuMuc_(doc.getId(), maHoSo);
  var pdfUrl = xuatPdf_(doc.getId(), doc.getName(), maHoSo);
  return { docUrl: doc.getUrl(), pdfUrl: pdfUrl };
}

/**
 * Thư mục Drive gốc: ƯU TIÊN lấy theo cấu hình đã lưu qua giao diện (tab "Hồ sơ đính kèm" → "⚙️ Cấu
 * hình thư mục gốc"), CHỈ dùng hằng số THU_MUC_GOC_ID trong Code.gs làm giá trị mặc định khi chưa
 * ai cấu hình gì qua giao diện — để không cần sửa code mỗi lần đổi thư mục.
 */
function layThuMucGoc_() {
  var idDaCauHinh = PropertiesService.getScriptProperties().getProperty('CH_THU_MUC_GOC_ID');
  var id = CauHinh_().thuMucGocId;
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error('Không mở được thư mục Drive gốc (ID: ' + id + '). Vào tab "Hồ sơ đính kèm" → ' +
      '"⚙️ Cấu hình thư mục gốc" để dán lại đúng đường link thư mục Drive, hoặc kiểm tra tài khoản ' +
      'chạy Apps Script có quyền truy cập thư mục đó không.');
  }
}

/** Trích mã ID từ 1 link Google Drive thư mục (dạng .../folders/ID) — nếu chuỗi đã là ID thuần thì giữ nguyên. */
function trichIdThuMucTuLink_(link) {
  link = String(link || '').trim();
  if (!link) return '';
  var m = link.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  m = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m) return m[1];
  return link; // có thể người dùng đã dán sẵn ID thuần (không phải link đầy đủ)
}

/** Lấy cấu hình thư mục gốc hiện tại — để hiển thị sẵn trong ô cấu hình trên giao diện. */
function layCauHinhThuMucGoc() {
  yeuCauDangNhap_();
  var idDaCauHinh = PropertiesService.getScriptProperties().getProperty('CH_THU_MUC_GOC_ID');
  try {
    var f = layThuMucGoc_();
    return { id: idDaCauHinh || THU_MUC_GOC_ID, ten: f.getName(), url: f.getUrl(), daTuCauHinh: !!idDaCauHinh, loi: '' };
  } catch (e) {
    return { id: idDaCauHinh || THU_MUC_GOC_ID, ten: '', url: '', daTuCauHinh: !!idDaCauHinh, loi: e.message };
  }
}

/** Lưu cấu hình thư mục gốc từ link/ID người dùng dán vào giao diện — kiểm tra mở được trước khi lưu. */
function luuCauHinhThuMucGoc(link) {
  yeuCauDangNhap_();
  var id = trichIdThuMucTuLink_(link);
  if (!id) throw new Error('Vui lòng dán đường link (hoặc mã ID) thư mục Drive.');
  var ten;
  try {
    ten = DriveApp.getFolderById(id).getName();
  } catch (e) {
    throw new Error('Không mở được thư mục này — kiểm tra lại đường link, hoặc tài khoản chạy Apps Script chưa có quyền truy cập (thử mở link đó bằng đúng tài khoản Google đang đăng nhập Apps Script).');
  }
  PropertiesService.getScriptProperties().setProperty('CH_THU_MUC_GOC_ID', id);
  return { id: id, ten: ten };
}

/** Trả về link thư mục Drive gốc (chứa tất cả hồ sơ) — để hiện nút "Mở thư mục Drive" trên giao diện. */
function layLinkThuMucGoc() {
  yeuCauDangNhap_();
  return { url: layThuMucGoc_().getUrl(), ten: layThuMucGoc_().getName() };
}

/** Trả về link thư mục Drive của riêng 1 hồ sơ (chứa HoaDonGTGT/ và BangLuong/) — tự tạo nếu chưa có. */
function layLinkThuMucHoSo(maHoSo) {
  yeuCauDangNhap_();
  var f = layThuMucHoSo_(maHoSo);
  return { url: f.getUrl(), ten: f.getName() };
}

function layThuMucHoSo_(maHoSo) {
  var goc = layThuMucGoc_();
  var it = goc.getFoldersByName(maHoSo);
  if (it.hasNext()) return it.next();
  return goc.createFolder(maHoSo);
}

/** Thư mục chung cho hoá đơn/bảng lương tải lên TRƯỚC khi hồ sơ giải ngân được lưu (chưa có Mã hồ sơ). */
function layThuMucChungChuaGanHoSo_() {
  var goc = layThuMucGoc_();
  var it = goc.getFoldersByName('_ChuaGanHoSo');
  if (it.hasNext()) return it.next();
  return goc.createFolder('_ChuaGanHoSo');
}

function dichChuyenVaoThuMuc_(fileId, maHoSo) {
  var folder = layThuMucHoSo_(maHoSo);
  var file = DriveApp.getFileById(fileId);
  folder.addFile(file);
  var root = DriveApp.getRootFolder();
  try { root.removeFile(file); } catch (e) { /* file có thể đã không còn ở root, bỏ qua */ }
}

function xuatPdf_(docId, tenGoi, maHoSo) {
  var file = DriveApp.getFileById(docId);
  var blob = file.getAs(MimeType.PDF).setName(tenGoi + '.pdf');
  var pdfFile = DriveApp.createFile(blob);
  var folder = layThuMucHoSo_(maHoSo);
  folder.addFile(pdfFile);
  DriveApp.getRootFolder().removeFile(pdfFile);
  return pdfFile.getUrl();
}

// =========================================================================
// BÁO CÁO TIỀN VAY (tab "Báo cáo tiền vay")
// =========================================================================

function layThuMucBaoCao_() {
  var goc = layThuMucGoc_();
  var it = goc.getFoldersByName('BaoCao_TienVay');
  if (it.hasNext()) return it.next();
  return goc.createFolder('BaoCao_TienVay');
}

/**
 * Tạo Google Doc "BẢNG KÊ CHI TIẾT TIỀN VAY THEO KHẾ ƯỚC" (để in), kèm xuất PDF.
 * Lưu vào thư mục con "BaoCao_TienVay" bên trong thư mục gốc (THU_MUC_GOC_ID).
 * Trả về { docUrl, pdfUrl }.
 */
function taoBaoCaoTienVayDoc(tuNgay, denNgay, tenKhachHang, nguoiLapBieu, trangThai, loaiTien, tuyChon) {
  yeuCauDangNhap_();
  var rows = layBaoCaoTienVay(tuNgay, denNgay, tenKhachHang, trangThai, loaiTien, false, tuyChon);
  kiemTraBaoCaoKhongTienLe_(rows);
  var laTongHop = !loaiTien;
  var hienQuyDoi = laTongHop || String(loaiTien).toUpperCase() === 'USD';
  var tieuDeLoai = laTongHop ? 'TỔNG HỢP (VND + USD QUY ĐỔI)' : (String(loaiTien).toUpperCase() === 'USD' ? 'VAY USD' : 'VAY VND');

  var doc = DocumentApp.create('BaoCaoTienVay_' + tieuDeLoai.replace(/\s+/g, '') + '_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss'));
  var body = doc.getBody();
  body.setPageWidth(1191).setPageHeight(842); // A3 ngang: 14–16 cột, giữ ngày và số tiền đọc được.
  body.setMarginLeft(30).setMarginRight(30).setMarginTop(30).setMarginBottom(30);

  var t = body.appendParagraph('BẢNG KÊ CHI TIẾT TIỀN VAY THEO KHẾ ƯỚC — ' + tieuDeLoai);
  t.setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(14);
  var p = body.appendParagraph('Từ ngày ' + (tuNgay ? formatNgay_(new Date(tuNgay)) : '……………') +
    ' đến ngày ' + (denNgay ? formatNgay_(new Date(denNgay)) : '……………'));
  p.setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(11);
  if (tenKhachHang) {
    var kh = body.appendParagraph('Khách hàng: ' + tenKhachHang);
    kh.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setItalic(true);
  }
  if (trangThai) {
    var tt = body.appendParagraph('Trạng thái hồ sơ: ' + trangThai);
    tt.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setItalic(true);
  }
  body.appendParagraph(moTaPhamViBaoCao_(tuyChon));
  body.appendParagraph('');

  var header = ['STT', 'Mã hồ sơ', 'Số hợp đồng', 'Số giấy nhận nợ', 'Ngày nhận nợ', 'Ngày giải ngân', 'Tên người hưởng',
    'Loại chứng từ'];
  if (laTongHop) header.push('Loại tiền');
  header.push('Số tiền vay');
  if (hienQuyDoi) header.push('Số tiền quy đổi (VND)');
  header.push('Số tài liệu', 'Ngày tài liệu', 'Ngày đến hạn', 'Lãi suất trong hạn (%/năm)', 'Trạng thái');

  var dataRows = [header];
  var tong = 0, tongQuyDoi = 0;
  var idxSoTienVay = header.indexOf('Số tiền vay');
  rows.forEach(function (r, i) {
    var hang = [String(i + 1), String(r.maHoSo || ''), String(r.soHopDong || ''), String(r.soGiayNhanNo || ''),
      chuanNgay_(r.ngayNhanNo), chuanNgay_(r.ngayGiaiNgan), String(r.tenNguoiHuong || ''), String(r.loaiChungTu || '')];
    if (laTongHop) hang.push(String(r.loaiTien || 'VND'));
    hang.push(formatSo_(r.soTienVay));
    if (hienQuyDoi) hang.push(formatSo_(r.soTienQuyDoi));
    hang.push(String(r.soTaiLieu || ''), chuanNgay_(r.ngayTaiLieu), chuanNgay_(r.ngayDenHan),
      String(r.laiSuatTrongHan || ''), String(r.trangThai || ''));
    dataRows.push(hang);
    tong = congSoTien_(tong, r.soTienVay);
    tongQuyDoi += Number(r.soTienQuyDoi) || 0;
  });
  var hangTong = header.map(function () { return ''; });
  hangTong[6] = 'TỔNG CỘNG';
  hangTong[idxSoTienVay] = laTongHop ? tongNguyenTeBaoCao_(rows) : formatSo_(tong);
  if (hienQuyDoi) hangTong[idxSoTienVay + 1] = formatSo_(tongQuyDoi);
  dataRows.push(hangTong);

  var table = body.appendTable(dataRows);
  table.setBorderWidth(0.75);
  canhLeBang_(table, kieuCotBaoCao_(laTongHop, hienQuyDoi));
  for (var rr = 0; rr < table.getNumRows(); rr++) {
    for (var cc = 0; cc < header.length; cc++) {
      table.getRow(rr).getCell(cc).editAsText().setFontSize(9).setBold(rr === 0);
    }
  }
  for (var c = 0; c < header.length; c++) table.getRow(0).getCell(c).editAsText().setBold(true);
  var lastR = table.getNumRows() - 1;
  table.getRow(lastR).getCell(6).editAsText().setBold(true);
  table.getRow(lastR).getCell(idxSoTienVay).editAsText().setBold(true);
  if (hienQuyDoi) table.getRow(lastR).getCell(idxSoTienVay + 1).editAsText().setBold(true);

  body.appendParagraph('');
  var ngayLap = body.appendParagraph('Ngày lập ' + formatNgay_(new Date()));
  ngayLap.setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setItalic(true);
  var lap = body.appendParagraph('Người lập biểu');
  lap.setBold(true).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph('');
  body.appendParagraph('');
  var tenLap = body.appendParagraph(nguoiLapBieu || '');
  tenLap.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

  doc.saveAndClose();

  var folder = layThuMucBaoCao_();
  var file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch (e) { /* bỏ qua */ }

  var pdfBlob = DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(doc.getName() + '.pdf');
  var pdfFile = DriveApp.createFile(pdfBlob);
  folder.addFile(pdfFile);
  try { DriveApp.getRootFolder().removeFile(pdfFile); } catch (e) { /* bỏ qua */ }

  return { docUrl: doc.getUrl(), pdfUrl: pdfFile.getUrl() };
}

/**
 * Xuất báo cáo tiền vay thành 1 file Excel (.xlsx) thật, lưu vào thư mục con "BaoCao_TienVay".
 * Trả về { xlsxUrl, sheetUrl }.
 */
/**
 * Xuất TOÀN BỘ dữ liệu tiền vay ra Excel, KHÔNG áp dụng bộ lọc Ngày/Khách hàng/Trạng thái —
 * file có sẵn AutoFilter để tự lọc/sắp xếp ngay trong Excel. Đây là cách đáng tin cậy hơn lọc
 * "live" nhiều lần trên Apps Script (không phụ thuộc độ trễ đọc Google Sheets).
 * loaiTien: '' (Tổng hợp VND+USD quy đổi) | 'VND' | 'USD' — vẫn giữ nguyên Loại báo cáo đang chọn.
 */
function taoBaoCaoTienVayExcelToanBo(loaiTien) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('xuất toàn bộ dữ liệu tiền vay');
  return taoBaoCaoTienVayExcel('', '', '', '', loaiTien, true);
}

function taoBaoCaoTienVayExcel(tuNgay, denNgay, tenKhachHang, trangThai, loaiTien, baoGomDaHuy, tuyChon) {
  yeuCauDangNhap_();
  var rows = layBaoCaoTienVay(tuNgay, denNgay, tenKhachHang, trangThai, loaiTien, baoGomDaHuy, tuyChon);
  kiemTraBaoCaoKhongTienLe_(rows);
  var laTongHop = !loaiTien;
  var hienQuyDoi = laTongHop || String(loaiTien).toUpperCase() === 'USD';
  var tieuDeLoai = laTongHop ? 'TỔNG HỢP (VND + USD QUY ĐỔI)' : (String(loaiTien).toUpperCase() === 'USD' ? 'VAY USD' : 'VAY VND');

  var ss = SpreadsheetApp.create('BaoCaoTienVay_' + tieuDeLoai.replace(/\s+/g, '') + '_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss'));
  var sh = ss.getSheets()[0];
  sh.setName('BaoCao');

  sh.getRange(1, 1).setValue('BẢNG KÊ CHI TIẾT TIỀN VAY THEO KHẾ ƯỚC — ' + tieuDeLoai).setFontWeight('bold').setFontSize(13);
  var coLoc = !!(tuNgay || denNgay || tenKhachHang || trangThai);
  sh.getRange(2, 1).setValue(coLoc
    ? ('Từ ngày ' + (tuNgay || '') + ' đến ngày ' + (denNgay || '') +
        (tenKhachHang ? ('  |  Khách hàng: ' + tenKhachHang) : '') +
        (trangThai ? ('  |  Trạng thái: ' + trangThai) : ''))
    : 'TOÀN BỘ dữ liệu (chưa lọc theo Ngày/Khách hàng/Trạng thái) — dùng nút lọc (▼) trên dòng tiêu đề bảng để tự lọc ngay trong Excel.');

  var header = ['STT', 'Mã hồ sơ', 'Số hợp đồng', 'Số giấy nhận nợ', 'Ngày nhận nợ', 'Ngày giải ngân', 'Tên người hưởng',
    'Loại chứng từ'];
  if (laTongHop) header.push('Loại tiền');
  header.push('Số tiền vay');
  if (hienQuyDoi) header.push('Số tiền quy đổi (VND)');
  header.push('Số tài liệu', 'Ngày tài liệu', 'Ngày đến hạn', 'Lãi suất trong hạn (%/năm)', 'Trạng thái');

  var idxSoTienVay = header.indexOf('Số tiền vay');
  var data = [header];
  var tong = 0, tongQuyDoi = 0;
  rows.forEach(function (r, i) {
    var hang = [i + 1, r.maHoSo, r.soHopDong, r.soGiayNhanNo, chuanNgay_(r.ngayNhanNo), chuanNgay_(r.ngayGiaiNgan), r.tenNguoiHuong, r.loaiChungTu || ''];
    if (laTongHop) hang.push(r.loaiTien || 'VND');
    hang.push(r.soTienVay);
    if (hienQuyDoi) hang.push(r.soTienQuyDoi);
    hang.push(r.soTaiLieu, chuanNgay_(r.ngayTaiLieu), chuanNgay_(r.ngayDenHan), r.laiSuatTrongHan, r.trangThai);
    data.push(hang);
    tong = congSoTien_(tong, r.soTienVay);
    tongQuyDoi += Number(r.soTienQuyDoi) || 0;
  });
  var hangTong = header.map(function () { return ''; });
  hangTong[6] = 'TỔNG CỘNG';
  hangTong[idxSoTienVay] = laTongHop ? tongNguyenTeBaoCao_(rows) : tong;
  if (hienQuyDoi) hangTong[idxSoTienVay + 1] = tongQuyDoi;
  data.push(hangTong);

  sh.getRange(3, 1).setValue(moTaPhamViBaoCao_(tuyChon));
  var startRow = 4;
  sh.getRange(startRow, 1, data.length, header.length).setValues(data);
  sh.getRange(startRow, 1, 1, header.length).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
  sh.getRange(startRow + data.length - 1, idxSoTienVay + 1, 1, hienQuyDoi ? 2 : 1).setFontWeight('bold');
  dinhDangCotSheet_(sh, startRow + 1, data.length - 1, kieuCotBaoCao_(laTongHop, hienQuyDoi));
  sh.getRange(startRow, 1, 1, header.length).setHorizontalAlignment('center');
  sh.autoResizeColumns(1, header.length);
  // Bật bộ lọc (AutoFilter) ngay trên file — lọc/sắp xếp trực tiếp trong Excel/Google Sheets sẽ
  // đáng tin cậy hơn lọc "live" nhiều lần qua Apps Script (không phụ thuộc độ trễ đọc Google Sheets).
  try {
    sh.getRange(startRow, 1, data.length - 1, header.length).createFilter();
  } catch (e) { /* không chặn nếu tạo filter lỗi */ }
  sh.setFrozenRows(startRow);
  SpreadsheetApp.flush();

  var folder = layThuMucBaoCao_();
  var file = DriveApp.getFileById(ss.getId());
  folder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch (e) { /* bỏ qua */ }

  // Xuất thành file .xlsx thật (không chỉ Google Sheet) rồi lưu cùng thư mục.
  var exportUrl = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  var resp = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) {
    return { xlsxUrl: '', sheetUrl: ss.getUrl() };
  }
  var xlsxBlob = resp.getBlob().setName(ss.getName() + '.xlsx');
  var xlsxFile = DriveApp.createFile(xlsxBlob);
  folder.addFile(xlsxFile);
  try { DriveApp.getRootFolder().removeFile(xlsxFile); } catch (e) { /* bỏ qua */ }

  return { xlsxUrl: xlsxFile.getUrl(), sheetUrl: ss.getUrl() };
}

// =========================================================================
// TẠO TRỌN BỘ HỒ SƠ (mẫu BIDV thật)
// =========================================================================
// =========================================================================
// ĐIỂM VÀO CÔNG KHAI — mọi nút trên giao diện đều đi qua phatHanhChungTu_() (PhatHanh.gs)
// =========================================================================

function taoDeNghiGiaiNganBIDV(maHoSo, tuyChon) { yeuCauDangNhap_(); return phatHanhChungTu_(maHoSo, CT_DE_NGHI, null, tuyChon); }
function taoChungTuThanhToan(maHoSo, tuyChon) { yeuCauDangNhap_(); return phatHanhChungTu_(maHoSo, CT_THANH_TOAN, null, tuyChon); }
function taoHopDongMuaBanNgoaiTe(maHoSo, tuyChon) { yeuCauDangNhap_(); return phatHanhChungTu_(maHoSo, CT_HDMB, null, tuyChon); }
/** Phát hành 1 tài liệu bất kỳ trong danh mục (kể cả loại tự thêm). */
function taoChungTuTuyChon(maHoSo, loai, tuyChon) {
  yeuCauDangNhap_(); return phatHanhChungTu_(maHoSo, loai, null, tuyChon); }

/**
 * PHÁT HÀNH TRỌN BỘ CHỨNG TỪ theo PHIÊN (sheet PhienPhatHanhBo). KHÔNG ghi/sửa dữ liệu hồ sơ (chỉ phát hành từ dữ liệu ĐÃ LƯU, đúng expectedRevision).
 *  • Danh sách tài liệu theo loại hồ sơ + cấu hình loại tài liệu (bắt buộc / không bắt buộc, thứ tự, loại tiền, ngân hàng).
 *  • Mỗi tài liệu độc lập: lỗi 1 tài liệu KHÔNG xoá tài liệu đã tạo, KHÔNG dừng các tài liệu còn lại; kết quả ghi vào phiên (đã tạo / lỗi / bỏ qua + lý do).
 *  • Tài liệu BẮT BUỘC thiếu mẫu (loại tự thêm) hoặc lỗi → bộ KHÔNG hoàn tất, hồ sơ KHÔNG sang "Đã tạo hồ sơ". Tài liệu không bắt buộc thiếu mẫu → bỏ qua, ghi lý do.
 *  • Chỉ khi mọi chứng từ bắt buộc có hiệu lực và khớp dữ liệu: chuyển Nháp → Đã tạo hồ sơ (qua máy trạng thái).
 *  • Thử lại: tuyChon.tiepTucPhien = mã phiên lỗi/thiếu (chỉ tạo phần thiếu, cùng revision); mặc định = phiên mới (dùng lại tài liệu đã đúng dữ liệu, không tạo trùng);
 *    tuyChon.taoLai = true = phát hành lại TOÀN BỘ thành phiên bản mới (bản cũ giữ nguyên, đánh dấu "Đã thay thế").
 * @param {{expectedRevision:number, tiepTucPhien:string=, taoLai:boolean=}} tuyChon  expectedRevision BẮT BUỘC
 */
function taoTronBoTheoMau(maHoSo, tuyChon) {
  yeuCauDangNhap_();
  tuyChon = tuyChon || {};
  var hs0 = layHoSoTheoMa_(maHoSo);
  if (!hs0) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  kiemTraRevisionBatBuoc_(hs0, tuyChon.expectedRevision);
  var d = layDuLieuDayDu(maHoSo);
  kiemTraTienDePhatHanh_(d); // dừng sớm, trước khi sinh bất kỳ file nào
  if (d.hoSo.TrangThai === TT_DA_HUY) throw new Error('Hồ sơ ' + maHoSo + ' đã hủy, không phát hành chứng từ mới.');
  var laUSD = String(d.hoSo.LoaiTien || 'VND').toUpperCase() === 'USD', bank = d.hopDong.TenNganHang || '';
  var ap = dsChungTuApDung_(d.hoSo, bank), batBuoc = dsChungTuBatBuoc_(d.hoSo, bank), rev = soRevision_(d.hoSo);
  if (!ap.length) throw new Error('Loại hồ sơ "' + loaiHoSoCuaHoSo_(d.hoSo).ten + '" không có chứng từ nào được bật (sửa ở Cài đặt → Loại hồ sơ giải ngân / Loại tài liệu).');

  var cheDo = 'MOI', phienGoc = '';
  if (tuyChon.tiepTucPhien) {
    var pg = docPhienPhatHanh_().filter(function (p) { return p.MaPhien === tuyChon.tiepTucPhien && String(p.MaHoSo) === String(maHoSo); })[0];
    if (!pg) throw new Error('Không tìm thấy phiên phát hành ' + tuyChon.tiepTucPhien + ' của hồ sơ ' + maHoSo + '.');
    if (pg.TrangThai === TT_PHIEN_XONG) throw new Error('Phiên ' + pg.MaPhien + ' đã hoàn tất — không cần tiếp tục.');
    if (Number(pg.RevisionNguon) !== rev) throw new Error('Không tiếp tục được phiên ' + pg.MaPhien + ': hồ sơ đã đổi (phiên bản ' + pg.RevisionNguon + ' → ' + rev + '). Hãy phát hành lại toàn bộ thành phiên mới.');
    cheDo = 'TIEP_TUC'; phienGoc = pg.MaPhien;
  } else if (tuyChon.taoLai) cheDo = 'LAI_TOAN_BO';
  var hash = hashHienTaiCuaHoSo_(d), maPhien = ghiPhienBatDau_(maHoSo, rev, hash, ap, cheDo, phienGoc);
  var ketQua = {}, daTao = [], loi = [], boQua = [], khac = [], chung = { expectedRevision: tuyChon.expectedRevision, taoLai: cheDo === 'LAI_TOAN_BO', taiSuDungNeuKhop: cheDo !== 'LAI_TOAN_BO' };
  var dungSom = null;
  for (var i = 0; i < ap.length && !dungSom; i++) {
    var loai = ap[i], laBatBuoc = batBuoc.indexOf(loai) >= 0, heThong = (loai === CT_DE_NGHI || loai === CT_THANH_TOAN || loai === CT_HDMB);
    try {
      var mau = chonMauTaiLieu_(loai, laUSD ? 'USD' : 'VND', d.chiTiet.length, bank);
      if (!mau && !heThong && !laBatBuoc) { boQua.push({ loaiTaiLieu: loai, loai: nhanChungTu_(loai), lyDo: 'Chưa có mẫu hiệu lực phù hợp; loại KHÔNG bắt buộc nên bỏ qua (Cài đặt → Quản lý mẫu văn bản).' }); continue; }
      if (!mau && !heThong && laBatBuoc) throw new Error('Chưa có mẫu hiệu lực cho chứng từ BẮT BUỘC "' + nhanChungTu_(loai) + '" — tải mẫu ở Cài đặt → Quản lý mẫu văn bản.');
      var kq = phatHanhChungTu_(maHoSo, loai, d, chung);
      ketQua[loai] = kq; daTao.push({ loaiTaiLieu: loai, loai: kq.loai, maTaiLieu: kq.maTaiLieu, soLan: kq.soLan, dungLai: !!kq.daCo, batBuoc: laBatBuoc });
    } catch (e) {
      var msg = String((e && e.message) || e);
      if (/^(XUNG_DOT_PHIEN_BAN|THIEU_REVISION|REVISION_KHONG_HOP_LE)/.test(msg)) { dungSom = msg; loi.push({ loaiTaiLieu: loai, loai: nhanChungTu_(loai), loi: msg, batBuoc: laBatBuoc }); }
      else loi.push({ loaiTaiLieu: loai, loai: nhanChungTu_(loai), loi: msg.substring(0, 800), batBuoc: laBatBuoc });
    }
  }
  // Hồ sơ bị thay đổi trong lúc đang phát hành (kể cả sau tài liệu cuối)? → chứng từ vừa tạo dựa trên dữ liệu cũ → KHÔNG hoàn tất.
  var hienTai = layHoSoTheoMa_(maHoSo);
  if (!dungSom && (!hienTai || soRevision_(hienTai) !== rev)) {
    dungSom = 'XUNG_DOT_PHIEN_BAN|' + (hienTai ? soRevision_(hienTai) : '?') + '|Hồ sơ ' + maHoSo + ' vừa được thay đổi trong lúc đang tạo chứng từ (phiên bản ' + rev + ' → ' + (hienTai ? soRevision_(hienTai) : '?') + '). Chứng từ vừa tạo dựa trên dữ liệu cũ; hồ sơ giữ nguyên trạng thái. Hãy tải lại hồ sơ và phát hành lại.';
    loi.push({ loaiTaiLieu: '(bộ)', loai: 'Cả bộ', loi: dungSom, batBuoc: true });
  }
  var bo = tinhTrangThaiBo_(maHoSo, dungSom ? null : d, maPhien), ttPhien; // bỏ qua chính phiên đang chạy khi suy trạng thái bộ
  if (dungSom) ttPhien = TT_PHIEN_LOI;
  else if (bo.trangThai === TT_PHIEN_XONG) ttPhien = TT_PHIEN_XONG;
  else if (loi.length) ttPhien = TT_PHIEN_LOI;
  else ttPhien = TT_PHIEN_THIEU;
  capNhatPhien_(maPhien, { DaTao: JSON.stringify(daTao), Loi: JSON.stringify(loi), BoQua: JSON.stringify(boQua), HoanThanh: new Date(), TrangThai: ttPhien });
  ghiNhatKy_(maHoSo, 'PHIEN_PHAT_HANH', maPhien + ' | ' + cheDo + ' | ' + ttPhien + ' | tạo ' + daTao.length + ', lỗi ' + loi.length + ', bỏ qua ' + boQua.length);
  if (dungSom) throw new Error(dungSom);

  var trangThaiMoi = d.hoSo.TrangThai || TT_NHAP, revMoi = rev;
  if (ttPhien === TT_PHIEN_XONG && trangThaiMoi === TT_NHAP) {
    var ch = chuyenTrangThaiHoSo_(maHoSo, TT_DA_TAO, 'Hoàn tất bộ chứng từ bắt buộc (phiên ' + maPhien + ')', { expectedRevision: tuyChon.expectedRevision });
    trangThaiMoi = ch.trangThai; revMoi = ch.revision;
  }
  var boCuoi = tinhTrangThaiBo_(maHoSo, null);
  ap.forEach(function (m) { if (m !== CT_DE_NGHI && m !== CT_THANH_TOAN && m !== CT_HDMB && ketQua[m]) khac.push(ketQua[m]); });
  boQua.forEach(function (b) { khac.push({ loaiTaiLieu: b.loaiTaiLieu, loai: b.loai, boQua: true, lyDo: b.lyDo }); });
  return {
    maPhien: maPhien, trangThaiPhien: ttPhien, trangThaiBo: boCuoi.trangThai, cheDo: cheDo, daTao: daTao, loi: loi, boQua: boQua, thieu: boCuoi.thieu, hetHieuLuc: boCuoi.hetHieuLuc,
    vanBanDeNghi: ketQua[CT_DE_NGHI] || null, chungTuThanhToan: ketQua[CT_THANH_TOAN] || null, hdmbNgoaiTe: ketQua[CT_HDMB] || null, khac: khac,
    thuMucUrl: layThuMucHoSo_(maHoSo).getUrl(), trangThai: trangThaiMoi, revision: revMoi, loaiHoSo: loaiHoSoCuaHoSo_(d.hoSo).ten
  };
}

/** Kiểu canh lề từng cột của báo cáo tiền vay (S = tiền phải, D = ngày/STT giữa, T = chuỗi trái). */
function kieuCotBaoCao_(laTongHop, hienQuyDoi) {
  var k = ['D', 'T', 'T', 'T', 'D', 'D', 'T', 'T'];
  if (laTongHop) k.push('T');
  k.push('S');
  if (hienQuyDoi) k.push('S');
  k.push('T', 'D', 'D', 'S', 'T');
  return k;
}

// =========================================================================
// DOCX/DOC TEMPLATE ENGINE — biến số tiền luôn là SỐ NGUYÊN có dấu chấm hàng nghìn.
// Ví dụ: {{HO_SO.SO_TIEN}} -> 25.000 ; {{HO_SO.SO_TIEN_BANG_CHU}} -> Hai mươi lăm ngàn đô la Mỹ ;
//        {{CT.SO_TIEN}} -> 10.000 ; {{BANG_KE.TONG_TIEN}} -> 25.000. Không bao giờ xuất 25,000.00 / cents.
// =========================================================================

/** Báo cáo chỉ xuất khi mọi số tiền là số nguyên; dữ liệu lịch sử có số lẻ -> báo rõ hồ sơ nào cần rà soát. */
function kiemTraBaoCaoKhongTienLe_(rows) {
  var ma = {};
  rows.forEach(function (r) { if (r.canRaSoat) ma[r.maHoSo] = true; });
  var ds = Object.keys(ma);
  if (ds.length) {
    throw new Error('Không thể xuất báo cáo: hồ sơ ' + ds.join(', ') + ' có số tiền lịch sử chứa phần thập phân. ' +
      'Dữ liệu cũ KHÔNG bị thay đổi — vui lòng chạy menu "Rà soát tiền lẻ lịch sử" và sửa các số tiền đó.');
  }
}

function taoBangKeChaCon_(d) {
  var v = kiemTraTienChaCon_(payloadTienChaConDaLuu_(d.hoSo, d.chiTiet), true);
  var ss = SpreadsheetApp.create('BangKe_' + d.hoSo.MaHoSo), sh = ss.getSheets()[0];
  sh.setName('BangKe');
  sh.getRange('A1').setValue(d.congTy.TenCty);
  sh.getRange('A2').setValue('BẢNG KÊ CHUYỂN TIỀN VAY ' + formatNgay_(d.hoSo.NgayGiaiNgan));
  var rows = [['STT','Người hưởng','Số tài khoản','Ngân hàng','Loại tiền','Số tiền thực trả','Nội dung']];
  (d.chiTiet || []).forEach(function (c, i) { rows.push([i + 1,c.TenNguoiHuong,c.SoTaiKhoan,c.TaiNganHang,c.LoaiTien,c.SoTien,c.NoiDungThanhToan]); });
  rows.push(['','Tổng VND','','','VND',v.tongVND,'']);
  rows.push(['','Tổng USD','','','USD',v.tongUSD,'']);
  sh.getRange(4,1,rows.length,7).setValues(rows);
  sh.getRange(4,1,1,7).setFontWeight('bold').setBackground('#1F4E78').setFontColor('#FFFFFF');
  sh.getRange(5,3,rows.length - 1,1).setNumberFormat('@');
  sh.getRange(5,6,rows.length - 1,1).setNumberFormat('#,##0.##');
  sh.autoResizeColumns(1,7); SpreadsheetApp.flush();
  return { spreadsheet:ss, ten:'BangKeGiaiNgan_' + d.hoSo.MaHoSo, loai:'Bảng kê thanh toán theo nguyên tệ' };
}
