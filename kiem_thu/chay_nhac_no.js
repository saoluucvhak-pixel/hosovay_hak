// Kiểm thử NHẮC NỢ ngoài ứng dụng: bản tin email (1 lần/ngày, không lộ số tài khoản) và sự kiện Google Calendar (không trùng, gỡ khi đã trả).
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('nhac_no'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
// Ngày của sự kiện theo GIỜ ĐỊA PHƯƠNG của tiến trình (không dùng toISOString/UTC → kết quả không phụ thuộc múi giờ máy chạy test)
const ngayDiaPhuong = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const quanTri = (f) => { const g = ctx.laQuanTri_; ctx.laQuanTri_ = () => true; try { return f(); } finally { ctx.laQuanTri_ = g; } };
// ---- giả lập dịch vụ Google (chỉ để ghi lại lời gọi) ----
const thu = []; let loiGui = null;
ctx.MailApp = { sendEmail: (o) => { if (loiGui) throw new Error(loiGui); thu.push(o); } };
const events = {}; let evSo = 0;
const cal = { createAllDayEvent: (tieuDe, ngay, o) => { const id = 'EV' + (++evSo); events[id] = { id, tieuDe, ngay, moTa: (o || {}).description, daXoa: false, nhac: [] };
  return { getId: () => id, removeAllReminders: () => {}, addPopupReminder: (p) => events[id].nhac.push(p), deleteEvent: () => { events[id].daXoa = true; } }; },
  getEventById: (id) => (events[id] && !events[id].daXoa) ? { deleteEvent: () => { events[id].daXoa = true; } } : null };
ctx.CalendarApp = { getDefaultCalendar: () => cal };
let triggers = [];
ctx.ScriptApp = Object.assign({}, ctx.ScriptApp || {}, { getProjectTriggers: () => triggers.slice(), deleteTrigger: (t) => { triggers = triggers.filter(x => x !== t); },
  newTrigger: (fn) => { const t = { fn, getHandlerFunction: () => fn }; const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, create: () => { triggers.push(t); return t; } }; return b; } });

const hd = hopDong({ soHopDong: 'HD-NN', hanMucVay: 1000000, laiSuatTrongHan: 12, kyHanTraLai: 'Hàng tháng', kyHanTraGoc: 'Cuối kỳ' });
// N1: quá hạn 40 ngày; N2: kỳ lãi đầu đến hạn sau 3 ngày; N3: tiền USD để kiểm tra không lộ tài khoản
themHoSo({ MaHoSo: 'N1', MaHD: hd.maHD, SoTienNhanNoLanNay: 600000, NgayGiaiNgan: Q.ngay(-100), NgayDenHan: Q.ngay(-40), SoGiayNhanNo: 'GNN-N1', LoaiTien: 'VND' });
const gnN2 = ctx.congThangIso_(Q.ngay(3), -1);
// Trừ rồi cộng tháng không đảo ngược ở ngày 31 (tháng trước có thể chỉ 30 ngày).
const hanLaiN2 = ctx.congThangIso_(gnN2, 1);
themHoSo({ MaHoSo: 'N2', MaHD: hd.maHD, SoTienNhanNoLanNay: 500000, NgayGiaiNgan: gnN2, NgayDenHan: Q.ngay(120) });

dat('Bản tin: có nhóm quá hạn + sắp đến hạn + hạn mức (110% > 95%); nội dung không chứa số tài khoản', () => {
  const b = ctx.dungBanTinNhacNo_();
  assert.equal(b.co, true);
  const ten = Array.from(b.nhom.map(g => g.ten)).join('|');
  assert.match(ten, /NỢ QUÁ HẠN \(1 khoản\)/); assert.match(ten, /SẮP ĐẾN HẠN/); assert.match(ten, /HẠN MỨC SẮP HẾT/);
  assert.match(b.text, /N1 \(HD-NN, Công ty thử\): kỳ cũ nhất quá hạn \d+ ngày — gốc 600\.000 VND/);
  assert.ok(!/\d{9,}/.test(b.text.replace(/\d{1,3}(\.\d{3})+/g, '')), 'không có dãy số dài (số tài khoản)');
  assert.match(b.html, /<h3/);
});
dat('Xem trước: không gửi gì; hiển thị người nhận và trạng thái bật/tắt', () => {
  const r = ctx.xemTruocNhacNo(); assert.equal(r.emailBat, false); assert.equal(thu.length, 0); assert.ok(r.soMuc >= 3);
});
dat('Gửi thử: chỉ quản trị; gửi tới chính người bấm; có tiền tố [THỬ]; KHÔNG đánh dấu đã gửi hôm nay', () => {
  const g = ctx.laQuanTri_; ctx.laQuanTri_ = () => false;
  assert.throws(() => ctx.guiThuNhacNo(), /quản trị|quyền/i); ctx.laQuanTri_ = g;
  const r = quanTri(() => ctx.guiThuNhacNo());
  assert.equal(thu.length, 1); assert.match(thu[0].subject, /^\[THỬ\]/); assert.equal(thu[0].to, r.den);
  assert.equal(G.props['NHAC_EMAIL_LAN_CUOI'], undefined);
});
dat('Cấu hình email: bật mà chưa có người nhận bị từ chối; email sai định dạng bị từ chối', () => {
  quanTri(() => {
    assert.throws(() => ctx.luuThietLapQuanLyVay({ NHAC_EMAIL_BAT: 1 }), /ít nhất một email/);
    assert.throws(() => ctx.luuThietLapQuanLyVay({ NHAC_EMAIL_NHAN: 'khong-phai-email' }), /Email không hợp lệ/);
    ctx.luuThietLapQuanLyVay({ NHAC_EMAIL_NHAN: 'ketoan@example.com; giamdoc@example.com', NHAC_EMAIL_BAT: 1 });
  });
  assert.equal(ctx.layThietLapQuanLyVay().NHAC_EMAIL_NHAN, 'ketoan@example.com,giamdoc@example.com');
});
dat('Tắt email thì trình kích hoạt không gửi; bật → gửi đúng 1 email tới đủ người nhận', () => {
  thu.length = 0;
  quanTri(() => ctx.luuThietLapQuanLyVay({ NHAC_EMAIL_BAT: 0 }));
  assert.equal(ctx.guiNhacNoHangNgay().email, 'tat'); assert.equal(thu.length, 0);
  quanTri(() => ctx.luuThietLapQuanLyVay({ NHAC_EMAIL_BAT: 1 }));
  const r = ctx.guiNhacNoHangNgay();
  assert.equal(r.email, 'da_gui'); assert.equal(thu.length, 1); assert.equal(thu[0].to, 'ketoan@example.com,giamdoc@example.com');
});
dat('Chạy lại trong cùng ngày → không gửi trùng', () => {
  assert.equal(ctx.guiNhacNoHangNgay().email, 'da_gui_hom_nay'); assert.equal(thu.length, 1);
});
dat('Gửi lỗi → KHÔNG đánh dấu đã gửi; lần chạy sau (hết lỗi) gửi lại', () => {
  delete G.props['NHAC_EMAIL_LAN_CUOI']; thu.length = 0; loiGui = 'Hết hạn mức gửi mail';
  assert.throws(() => ctx.guiNhacNoHangNgay(), /Hết hạn mức gửi mail/); assert.equal(G.props['NHAC_EMAIL_LAN_CUOI'], undefined);
  loiGui = null; assert.equal(ctx.guiNhacNoHangNgay().email, 'da_gui'); assert.equal(thu.length, 1);
});
dat('Calendar tắt → không tạo sự kiện', () => {
  assert.equal(Object.keys(events).length, 0);
});
dat('Calendar bật: tạo sự kiện cho kỳ trong 60 ngày tới; chạy lại không tạo trùng', () => {
  quanTri(() => ctx.luuThietLapQuanLyVay({ NHAC_CALENDAR_BAT: 1 }));
  delete G.props['NHAC_EMAIL_LAN_CUOI'];
  const r1 = quanTri(() => ctx.dongBoLichNhacNo());
  assert.ok(r1.tao >= 2, 'kỳ lãi N2 + kỳ lãi/gốc khác'); const n1 = Object.keys(events).length;
  assert.equal(n1, r1.tao);
  const r2 = quanTri(() => ctx.dongBoLichNhacNo()); assert.equal(r2.tao, 0); assert.equal(Object.keys(events).length, n1);
  const ev = Object.values(events).find(e => /N2/.test(e.tieuDe) && /LÃI/.test(e.tieuDe));
  assert.ok(ev, 'có sự kiện lãi của N2'); assert.equal(ngayDiaPhuong(ev.ngay), hanLaiN2); assert.equal(ev.ngay.getHours(), 12, 'đặt 12h trưa để lệch múi giờ lịch không nhảy ngày'); assert.deepEqual(ev.nhac, [1440, 540]);
  assert.match(ev.moTa, /Hồ sơ vay HAK/);
});
dat('Trả đủ kỳ lãi N2 → sự kiện tương lai bị gỡ, không tạo lại', () => {
  const lai = ctx.layLichTraNo('N2').laiRows[0];
  ctx.ghiNhanTraNo('N2', { loaiTra: 'LAI', ngayTra: Q.homNay(), soTien: lai.laiPhaiTra, soThamChieu: 'UNC-LAI-N2', chungTu: 'UNC lãi' }, Q.rev('N2'));
  const r = quanTri(() => ctx.dongBoLichNhacNo()); assert.equal(r.go, 1);
  const ev = Object.values(events).find(e => /N2/.test(e.tieuDe) && /LÃI/.test(e.tieuDe) && ngayDiaPhuong(e.ngay) === hanLaiN2);
  assert.equal(ev.daXoa, true);
  assert.equal(quanTri(() => ctx.dongBoLichNhacNo()).go, 0);
});
dat('Trình kích hoạt hằng ngày chạy được cả khi email lẫn Calendar bật: trả về trạng thái từng phần', () => {
  delete G.props['NHAC_EMAIL_LAN_CUOI'];
  const r = ctx.guiNhacNoHangNgay(); assert.equal(r.email, 'da_gui'); assert.equal(typeof r.calendar, 'object');
});
dat('Tạo lịch tự động: thay trình kích hoạt cũ, chỉ còn 1', () => {
  triggers = [{ fn: 'guiNhacNoHangNgay', getHandlerFunction: () => 'guiNhacNoHangNgay' }, { fn: 'khac', getHandlerFunction: () => 'khac' }];
  const g = ctx.laQuanTri_; ctx.laQuanTri_ = () => false; assert.throws(() => ctx.taoLichNhacNo(), /quản trị|quyền/i); ctx.laQuanTri_ = g;
  quanTri(() => ctx.taoLichNhacNo());
  assert.equal(triggers.filter(t => t.fn === 'guiNhacNoHangNgay').length, 1); assert.equal(triggers.filter(t => t.fn === 'khac').length, 1);
});
dat('Chạy ĐỒNG THỜI: lần chạy thứ hai xen vào đúng lúc đang gửi KHÔNG gửi thêm (giành quyền gửi trước khi gửi, trong khoá)', () => {
  delete G.props['NHAC_EMAIL_LAN_CUOI']; thu.length = 0; let xen = null;
  const gui = ctx.MailApp.sendEmail; ctx.MailApp = { sendEmail: (o) => { if (!xen) xen = ctx.guiNhacNoHangNgay(); thu.push(o); } };
  const r = ctx.guiNhacNoHangNgay();
  assert.equal(thu.length, 1, 'chỉ 1 email'); assert.equal(r.email, 'da_gui'); assert.equal(xen.email, 'da_gui_hom_nay');
  ctx.MailApp = { sendEmail: gui };
});
dat('Gửi lỗi sau khi giành quyền: trả lại giá trị cũ (không mất nhắc nợ); giá trị ngày cũ được giữ nguyên', () => {
  G.props['NHAC_EMAIL_LAN_CUOI'] = '2020-01-01'; loiGui = 'Lỗi tạm thời';
  assert.throws(() => ctx.guiNhacNoHangNgay(), /Lỗi tạm thời/); assert.equal(G.props['NHAC_EMAIL_LAN_CUOI'], '2020-01-01');
  loiGui = null; assert.equal(ctx.guiNhacNoHangNgay().email, 'da_gui');
});
Q.ket('nhắc nợ');
