/**
 * NHACNO.GS — NHẮC NỢ NGOÀI ỨNG DỤNG: bản tin email hằng ngày + sự kiện Google Calendar cho các kỳ đến hạn.
 *
 * AN TOÀN / QUYỀN RIÊNG TƯ
 *  • Email chỉ gửi tới các địa chỉ DO QUẢN TRỊ khai báo (NHAC_EMAIL_NHAN); nội dung chỉ gồm mã hồ sơ, số hợp đồng, tên công ty, ngày và số tiền —
 *    KHÔNG gồm số tài khoản, chứng từ hay thông tin người thụ hưởng.
 *  • Chỉ gửi khi có nội dung cần chú ý, tối đa MỘT email mỗi ngày (khoá trong PropertiesService); gửi lỗi thì không đánh dấu "đã gửi" để lần chạy sau thử lại.
 *  • Calendar: sự kiện cả ngày trên LỊCH MẶC ĐỊNH của tài khoản chạy trình kích hoạt; mỗi kỳ một sự kiện (khoá trong sheet NhacNoNhatKy → không tạo trùng);
 *    kỳ đã trả đủ thì sự kiện tương lai được gỡ.
 *  • Lần đầu dùng MailApp/CalendarApp, Google yêu cầu cấp quyền gửi email và Lịch cho tài khoản chạy script (một lần).
 */
var SHEET_NHAC_NO_LOG = 'NhacNoNhatKy';
var COT_NHAC_NO_LOG_ = ['Khoa', 'Loai', 'Ngay', 'MaHoSo', 'EventId', 'TrangThai', 'ThoiDiem', 'GhiChu'];
var PROP_NHAC_EMAIL_LAN_CUOI_ = 'NHAC_EMAIL_LAN_CUOI';
var NHAC_GIOI_HAN_DONG_ = 15, NHAC_NGAY_LICH_ = 60;

function dinhDangTienNhac_(so, loai) { return formatSo_(so) + ' ' + loai; }

/**
 * Dựng nội dung bản tin (thuần theo dữ liệu hiện có; KHÔNG kiểm tra đăng nhập — dùng được trong trình kích hoạt).
 * @return {{co:boolean, ngay:string, tieuDe:string, soMuc:number, nhom:Array<{ten:string,dong:string[]}>, text:string, html:string}}
 */
function dungBanTinNhacNo_() {
  var nc = ngCanhQLV_(), today = nc.today, d = lichCuaNgCanh_(nc), nhac = d.cfg.nhac, nhom = [];
  var qh = [], sap = [];
  d.lich.forEach(function (x) {
    var t = tuoiNoQuaHan_(x.lich, today), k = x.k, ten = k.maHoSo + ' (' + (k.hd.SoHopDong || '—') + (k.ct.TenCty ? ', ' + k.ct.TenCty : '') + ')';
    if (t.soNgay > 0) qh.push({ n: t.soNgay, s: ten + ': kỳ cũ nhất quá hạn ' + t.soNgay + ' ngày — gốc ' + dinhDangTienNhac_(t.soTienQuaHan.goc, k.loai) + ', lãi ' + dinhDangTienNhac_(t.soTienQuaHan.lai, k.loai) });
    x.lich.gocRows.forEach(function (r) { if (r.conNo > 0.005 && r.ngayDen >= today && soNgayGiuaIso_(today, r.ngayDen) <= nhac) sap.push({ n: r.ngayDen, s: r.ngayDen + ' — ' + ten + ': trả GỐC ' + dinhDangTienNhac_(r.conNo, k.loai) }); });
    x.lich.laiRows.forEach(function (r) { if (r.conNo > 0.005 && r.denNgay >= today && soNgayGiuaIso_(today, r.denNgay) <= nhac) sap.push({ n: r.denNgay, s: r.denNgay + ' — ' + ten + ': trả LÃI ' + dinhDangTienNhac_(r.conNo, k.loai) }); });
  });
  var cat = function (ds, sapXepGiam) { ds.sort(function (a, b) { return sapXepGiam ? b.n - a.n : (a.n < b.n ? -1 : (a.n > b.n ? 1 : 0)); }); return ds.slice(0, NHAC_GIOI_HAN_DONG_).map(function (x) { return x.s; }).concat(ds.length > NHAC_GIOI_HAN_DONG_ ? ['… và ' + (ds.length - NHAC_GIOI_HAN_DONG_) + ' mục khác (xem trong ứng dụng).'] : []); };
  if (qh.length) nhom.push({ ten: 'NỢ QUÁ HẠN (' + qh.length + ' khoản)', dong: cat(qh, true) });
  if (sap.length) nhom.push({ ten: 'SẮP ĐẾN HẠN trong ' + nhac + ' ngày (' + sap.length + ' kỳ)', dong: cat(sap, false) });
  var hm = hanMucTinDung_(nc).rows.filter(function (r) { return r.muc === 'vuot' || r.muc === 'cao'; });
  if (hm.length) nhom.push({ ten: 'HẠN MỨC SẮP HẾT / VƯỢT (' + hm.length + ' hợp đồng)', dong: hm.slice(0, NHAC_GIOI_HAN_DONG_).map(function (r) { return r.soHopDong + (r.tenCty ? ' (' + r.tenCty + ')' : '') + ': đã dùng ' + r.tyLe + '% — còn lại ' + (r.conLai === null ? '—' : dinhDangTienNhac_(r.conLai, 'VND')); }) });
  var rb = dieuKienRangBuoc_('', nc).rows.filter(function (r) { return r.trangThai === 'VI_PHAM' || r.trangThai === 'SAP_VI_PHAM' || r.trangThai === 'QUA_HAN_CAP_NHAT'; });
  if (rb.length) nhom.push({ ten: 'ĐIỀU KIỆN RÀNG BUỘC CẦN CHÚ Ý (' + rb.length + ')', dong: rb.slice(0, NHAC_GIOI_HAN_DONG_).map(function (r) { return r.tenChiTieu + ' — ' + r.soHopDong + ': ' + r.nhanTrangThai + (r.giaTri !== null ? ' (hiện tại ' + r.giaTri + ' ' + r.donVi + ', ngưỡng ' + r.toanTu + ' ' + r.nguong + ')' : ''); }) });
  var bhTong = ts2TongQuanAnToan_(null, NHAC_GIOI_HAN_DONG_);
  if(bhTong.loi) nhom.push({ten:'KHÔNG ĐỌC ĐƯỢC DỮ LIỆU BẢO HIỂM',dong:[bhTong.thongBao]});
  if (bhTong && bhTong.tongCanChuY) nhom.push({ ten: 'BẢO HIỂM TÀI SẢN THẾ CHẤP (' + bhTong.tongCanChuY + ')', dong: bhTong.canChuY.map(function (r) { return moTaCanhBaoBaoHiem_(r); }) });
  var soMuc = nhom.reduce(function (a, g) { return a + g.dong.length; }, 0);
  var tieuDe = '[Hồ sơ vay] ' + homNayVN_().split('-').reverse().join('/') + ': ' + (qh.length ? qh.length + ' khoản quá hạn' : (sap.length ? sap.length + ' kỳ sắp đến hạn' : 'cần chú ý'));
  var text = nhom.map(function (g) { return g.ten + '\n' + g.dong.map(function (x) { return ' • ' + x; }).join('\n'); }).join('\n\n') +
    '\n\n—\nThư tự động từ ứng dụng Hồ sơ vay HAK. Số liệu ước tính theo dữ liệu trong ứng dụng; số chính thức theo thông báo của ngân hàng.';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">' + nhom.map(function (g) { return '<h3 style="margin:14px 0 6px;font-size:15px">' + esc(g.ten) + '</h3><ul style="margin:0;padding-left:20px">' + g.dong.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }).join('') +
    '<p style="color:#666;font-size:12px;margin-top:18px">Thư tự động từ ứng dụng Hồ sơ vay HAK. Số liệu ước tính theo dữ liệu trong ứng dụng; số chính thức theo thông báo của ngân hàng.</p></div>';
  return { co: soMuc > 0, ngay: today, tieuDe: tieuDe, soMuc: soMuc, nhom: nhom, text: text, html: html };
}
function nguoiNhanNhacNo_() { return String(layCauHinh_('NHAC_EMAIL_NHAN') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }

/** API: xem trước bản tin sẽ gửi (không gửi). */
function xemTruocNhacNo() {
  yeuCauDangNhap_();
  var b = dungBanTinNhacNo_();
  return { co: b.co, ngay: b.ngay, tieuDe: b.tieuDe, soMuc: b.soMuc, nhom: b.nhom, nguoiNhan: nguoiNhanNhacNo_(), emailBat: layCauHinh_('NHAC_EMAIL_BAT') === '1', calendarBat: layCauHinh_('NHAC_CALENDAR_BAT') === '1' };
}
/** API (quản trị): gửi THỬ bản tin tới chính email của người bấm (không đánh dấu "đã gửi hôm nay"). */
function guiThuNhacNo() {
  yeuCauDangNhap_(); yeuCauQuanTri_('gửi thử email nhắc nợ');
  var den = layDanhTinh_().email || emailNguoiDung_();
  if (!den) throw new Error('Không xác định được email của bạn.');
  var b = dungBanTinNhacNo_();
  MailApp.sendEmail({ to: den, subject: '[THỬ] ' + b.tieuDe, body: b.co ? b.text : 'Hôm nay không có mục nào cần nhắc. (Thư thử từ ứng dụng Hồ sơ vay HAK.)', htmlBody: b.co ? b.html : undefined, name: 'Hồ sơ vay HAK' });
  ghiNhatKy_('', 'NHAC_NO_GUI_THU', den + ' | ' + b.soMuc + ' mục');
  return { daGui: true, den: den, soMuc: b.soMuc };
}
/** ĐÍCH CỦA TRÌNH KÍCH HOẠT HẰNG NGÀY — không nhận tham số; chỉ gửi tới email quản trị đã khai báo, tối đa 1 lần/ngày, chỉ khi có nội dung. */
function guiNhacNoHangNgay() {
  var kq = { ngay: homNayVN_(), email: 'tat', calendar: 'tat' };
  if (layCauHinh_('NHAC_EMAIL_BAT') === '1') kq = guiEmailNhacNoMotLan_(kq);
  if (layCauHinh_('NHAC_CALENDAR_BAT') === '1') kq.calendar = dongBoLichNhacNo_();
  return kq;
}
/**
 * Gửi email ĐÚNG MỘT LẦN mỗi ngày kể cả khi 2 lần chạy trùng thời điểm: toàn bộ "kiểm tra đã gửi → giành quyền gửi → gửi" nằm trong KHOÁ;
 * quyền gửi được GIÀNH (ghi ngày hôm nay) TRƯỚC khi gửi, gửi lỗi thì TRẢ LẠI giá trị cũ để lần chạy sau thử lại.
 * Đánh đổi có chủ đích: nếu tiến trình chết đúng giữa lúc giành quyền và lúc gửi thì hôm đó không có email (thà thiếu một thư còn hơn gửi trùng nhiều lần).
 */
function guiEmailNhacNoMotLan_(kq) {
  return voiKhoa_(function () {
    var props = PropertiesService.getScriptProperties(), cu = props.getProperty(PROP_NHAC_EMAIL_LAN_CUOI_);
    if (cu === kq.ngay) { kq.email = 'da_gui_hom_nay'; return kq; }
    var den = nguoiNhanNhacNo_();
    if (!den.length) { kq.email = 'chua_co_nguoi_nhan'; return kq; }
    var b = dungBanTinNhacNo_();
    if (!b.co) { kq.email = 'khong_co_noi_dung'; return kq; }
    props.setProperty(PROP_NHAC_EMAIL_LAN_CUOI_, kq.ngay); // giành quyền gửi
    try {
      MailApp.sendEmail({ to: den.join(','), subject: b.tieuDe, body: b.text, htmlBody: b.html, name: 'Hồ sơ vay HAK' });
    } catch (e) {
      if (cu === null || cu === undefined) props.deleteProperty(PROP_NHAC_EMAIL_LAN_CUOI_); else props.setProperty(PROP_NHAC_EMAIL_LAN_CUOI_, cu); // gửi lỗi → trả lại, lần sau thử lại
      throw e;
    }
    ghiNhatKy_('', 'NHAC_NO_GUI_EMAIL', den.length + ' người nhận | ' + b.soMuc + ' mục');
    kq.email = 'da_gui'; kq.soMuc = b.soMuc;
    return kq;
  });
}

/** Các kỳ cần có sự kiện lịch: [{khoa, ngay, tieuDe, moTa}] trong NHAC_NGAY_LICH_ ngày tới (kỳ chưa trả đủ). */
function cacKyCanSuKienLich_() {
  var nc = ngCanhQLV_(), today = nc.today, d = lichCuaNgCanh_(nc), kq = [];
  d.lich.forEach(function (x) {
    var k = x.k, ten = k.maHoSo + ' / ' + (k.hd.SoHopDong || '');
    var them = function (loai, ky, ngay, so) {
      if (!(so > 0.005) || ngay < today || soNgayGiuaIso_(today, ngay) > NHAC_NGAY_LICH_) return;
      kq.push({ khoa: 'cal:' + k.maHoSo + ':' + loai + ':' + ky + ':' + ngay, ngay: ngay, maHoSo: k.maHoSo,
        tieuDe: '[Vay] Đến hạn trả ' + (loai === 'goc' ? 'GỐC' : 'LÃI') + ' — ' + ten + ' — ' + dinhDangTienNhac_(so, k.loai),
        moTa: 'Khoản ' + k.maHoSo + (k.ct.TenCty ? ' — ' + k.ct.TenCty : '') + '\nKỳ ' + ky + ' đến hạn ' + ngay + ': ' + (loai === 'goc' ? 'gốc ' : 'lãi ') + dinhDangTienNhac_(so, k.loai) + '\n(Tạo tự động từ ứng dụng Hồ sơ vay HAK)' });
    };
    x.lich.gocRows.forEach(function (r) { them('goc', r.ky, r.ngayDen, r.conNo); });
    x.lich.laiRows.forEach(function (r) { them('lai', r.ky, r.denNgay, r.conNo); });
  });
  return kq;
}
/** Đồng bộ sự kiện Calendar: tạo kỳ mới, gỡ sự kiện tương lai của kỳ đã trả đủ. Không tạo trùng (khoá trong sheet NhacNoNhatKy). */
function dongBoLichNhacNo_() {
  return voiKhoa_(function () {
    var can = cacKyCanSuKienLich_(), canMap = {}, today = homNayVN_(), cal = CalendarApp.getDefaultCalendar();
    can.forEach(function (c) { canMap[c.khoa] = c; });
    var sh = ensureSheet_(getSS_(), SHEET_NHAC_NO_LOG, COT_NHAC_NO_LOG_), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var cu = sheetToObjects_(SHEET_NHAC_NO_LOG), daCo = {}, tao = 0, go = 0, loi = 0;
    cu.forEach(function (r) { if (r.TrangThai === 'Đã tạo') daCo[String(r.Khoa)] = r; });
    can.forEach(function (c) {
      if (daCo[c.khoa]) return;
      try {
        var d = new Date(c.ngay + 'T12:00:00') /* 12h trưa: lệch múi giờ giữa script và Lịch (±11h) không làm sự kiện nhảy sang ngày khác */, ev = cal.createAllDayEvent(c.tieuDe, d, { description: c.moTa });
        try { ev.removeAllReminders(); ev.addPopupReminder(24 * 60); ev.addPopupReminder(9 * 60); } catch (e) { /* nhắc mặc định */ }
        themDongVaoCuoiThat_(sh, headers.map(function (h) { var o = { Khoa: c.khoa, Loai: 'CALENDAR', Ngay: c.ngay, MaHoSo: c.maHoSo, EventId: ev.getId(), TrangThai: 'Đã tạo', ThoiDiem: new Date() }; return o[h] !== undefined ? o[h] : ''; }));
        tao++;
      } catch (e) { loi++; }
    });
    Object.keys(daCo).forEach(function (khoa) { // kỳ không còn cần (đã trả đủ) và còn ở tương lai → gỡ
      var r = daCo[khoa], ngay = ngayIsoCuaO_(r.Ngay);
      if (canMap[khoa] || !ngay || ngay < today) return;
      try { var ev = cal.getEventById(r.EventId); if (ev) ev.deleteEvent(); capNhatDongTheoMa_(SHEET_NHAC_NO_LOG, 'Khoa', khoa, { TrangThai: 'Đã gỡ', ThoiDiem: new Date() }); go++; } catch (e) { loi++; }
    });
    SpreadsheetApp.flush();
    if (tao || go) ghiNhatKy_('', 'NHAC_NO_LICH', 'tạo ' + tao + ', gỡ ' + go + ', lỗi ' + loi);
    return { tao: tao, go: go, loi: loi, tong: can.length };
  });
}
/** API (quản trị): đồng bộ Calendar ngay. */
function dongBoLichNhacNo() {
  yeuCauDangNhap_(); yeuCauQuanTri_('đồng bộ lịch nhắc nợ');
  return dongBoLichNhacNo_();
}
/** API (quản trị): tạo trình kích hoạt hằng ngày 8h sáng cho guiNhacNoHangNgay (xoá bản cũ, không tạo trùng). */
function taoLichNhacNo() {
  yeuCauDangNhap_(); yeuCauQuanTri_('tạo lịch tự động nhắc nợ');
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'guiNhacNoHangNgay') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('guiNhacNoHangNgay').timeBased().everyDays(1).atHour(8).create();
  ghiNhatKy_('', 'NHAC_NO_TAO_LICH', 'hằng ngày 8h');
  return { ok: true, moTa: 'Mỗi ngày khoảng 8h sáng: gửi email nhắc nợ (nếu bật) và đồng bộ sự kiện Calendar (nếu bật). Lần đầu Google sẽ yêu cầu cấp quyền gửi email và Lịch.' };
}
