// Kiểm thử DUYỆT HAI CẤP (maker–checker) trước khi xác nhận giải ngân (giả lập Apps Script/Sheets).
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('duyet'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
// Người không phải quản trị chỉ gọi được QUA api() (gọi trực tiếp bị chặn) — đúng như trình duyệt thật
const ap = (e, ten, ...args) => voi(e, () => ctx.api('', ten, args));
ctx.luuNguoiDung({ email: 'lap@example.com', hoTen: 'Người lập', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' });
ctx.luuNguoiDung({ email: 'xem@example.com', hoTen: 'Người xem', vaiTro: 'XEM', trangThai: 'Hoạt động' });
ctx.luuNguoiDung({ email: 'duyet2@example.com', hoTen: 'Quản trị 2', vaiTro: 'ADMIN', trangThai: 'Hoạt động' });
ctx.kiemTraDuDieuKienGiaiNgan_ = () => ({ loi: [] });
const hd = hopDong({ soHopDong: 'HD-PD', hanMucVay: 0 });
const tao = (ma) => themHoSo({ MaHoSo: ma, MaHD: hd.maHD, TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: Q.ngay(-1), NgayDenHan: Q.ngay(90) });
const xn = (ma, ref) => ctx.xacNhanGiaiNganThucTe(ma, { ngayThucTe: Q.homNay(), soThamChieuNH: ref, soTienThucTe: 1000000, taiLieuXacNhan: 'Giấy báo nợ ' + ref }, Q.rev(ma));
tao('D1'); tao('D2'); tao('D3');

dat('Mặc định TẮT: xác nhận giải ngân không cần duyệt (quy trình cũ không đổi)', () => {
  assert.equal(ctx.layThietLapQuanLyVay().BAT_DUYET_HAI_CAP, '0');
  assert.equal(xn('D3', 'REF-D3').trangThai, 'Đã giải ngân');
});
dat('Bật duyệt hai cấp: chỉ quản trị bật được; xác nhận giải ngân bị chặn khi chưa có phiếu', () => {
  assert.throws(() => ap('lap@example.com', 'luuThietLapQuanLyVay', { BAT_DUYET_HAI_CAP: 1 }), /quản trị|quyền/i);
  ctx.luuThietLapQuanLyVay({ BAT_DUYET_HAI_CAP: 1 });
  assert.throws(() => xn('D1', 'REF-D1'), /chưa có phiếu duyệt hợp lệ/);
});
let ma;
dat('Gửi duyệt: cần revision; chỉ hồ sơ "Đã tạo hồ sơ"; trả kèm kiểm tra hạn mức; không gửi trùng', () => {
  {
    const L = 'lap@example.com';
    assert.throws(() => ap(L, 'guiDuyetGiaiNgan', 'D1', 'x', undefined), /THIEU_REVISION|revision|phiên bản/i);
    assert.throws(() => ap(L, 'guiDuyetGiaiNgan', 'D3', 'x', Q.rev('D3')), /Đã tạo hồ sơ/);
    const r = ap(L, 'guiDuyetGiaiNgan', 'D1', 'Nhờ duyệt', Q.rev('D1')); ma = r.maPheDuyet;
    assert.match(ma, /^PD-\d{4}$/); assert.equal(r.revision, Q.rev('D1')); assert.equal(r.hanMuc.apDung, false);
    assert.throws(() => ap(L, 'guiDuyetGiaiNgan', 'D1', 'x', Q.rev('D1')), /đang chờ duyệt/);
  }
});
dat('Chưa duyệt thì vẫn chặn; xem trạng thái: batBuoc, chưa được phép xác nhận', () => {
  assert.throws(() => xn('D1', 'REF-D1'), /CHỜ người có quyền quản trị/);
  const t = ctx.layTrangThaiPheDuyetHoSo('D1'); assert.equal(t.batBuoc, true); assert.equal(t.duocPhepXacNhan, false); assert.equal(t.moiNhat.trangThai, 'Chờ duyệt');
});
dat('Quy tắc người duyệt: NHẬP LIỆU không duyệt được; quản trị KHÁC người gửi mới duyệt được; người gửi là quản trị cũng KHÔNG tự duyệt', () => {
  assert.throws(() => ap('lap@example.com', 'quyetDinhPheDuyet', ma, 'DUYET', ''), /quản trị|quyền/i);
  tao('D4'); // người gửi là quản trị (ketoan) → không tự duyệt
  const r4 = ctx.guiDuyetGiaiNgan('D4', 'tự gửi', Q.rev('D4'));
  assert.throws(() => ctx.quyetDinhPheDuyet(r4.maPheDuyet, 'DUYET', ''), /KHÁC người gửi/);
  ap('duyet2@example.com', 'quyetDinhPheDuyet', r4.maPheDuyet, 'TU_CHOI', 'Thiếu chứng từ');
});
dat('Từ chối cần lý do; duyệt hợp lệ → phiếu "Đã duyệt"; danh sách cho thấy người duyệt/thời điểm/lý do', () => {
  voi('duyet2@example.com', () => {
    assert.throws(() => ctx.quyetDinhPheDuyet(ma, 'TU_CHOI', 'ab'), /lý do/);
    assert.throws(() => ctx.quyetDinhPheDuyet(ma, 'KHAC', ''), /DUYET hoặc TU_CHOI/);
    const ds = ctx.layDanhSachPheDuyet({ trangThai: 'Chờ duyệt' }); assert.equal(ds.soChoDuyet, 1); assert.equal(ds.rows[0].coTheDuyet, true);
    ctx.quyetDinhPheDuyet(ma, 'DUYET', 'Đủ hồ sơ');
  });
  { const r = ap('lap@example.com', 'layDanhSachPheDuyet', { maHoSo: 'D1' }).rows[0]; assert.equal(r.trangThai, 'Đã duyệt'); assert.equal(r.nguoiDuyet, 'duyet2@example.com'); assert.equal(r.lyDo, 'Đủ hồ sơ'); assert.equal(r.hopLe, true); assert.equal(r.coTheDuyet, false); }
});
dat('Có phiếu duyệt hợp lệ → xác nhận giải ngân được; phiếu chuyển "Đã sử dụng" và không dùng lại được', () => {
  assert.equal(ctx.layTrangThaiPheDuyetHoSo('D1').duocPhepXacNhan, true);
  assert.equal(xn('D1', 'REF-D1').trangThai, 'Đã giải ngân');
  assert.equal(ctx.layDanhSachPheDuyet({ maHoSo: 'D1' }).rows[0].trangThai, 'Đã sử dụng');
});
dat('Hồ sơ bị sửa sau khi duyệt → phiếu mất hiệu lực (revision đổi); xác nhận bị chặn; phải gửi lại', () => {
  tao('D5');
  const p = ap('lap@example.com', 'guiDuyetGiaiNgan', 'D5', '', Q.rev('D5'));
  ap('duyet2@example.com', 'quyetDinhPheDuyet', p.maPheDuyet, 'DUYET', '');
  ctx.chamRevisionHoSo_(ctx.layHoSoTheoMa_('D5'), 'x');   // giả lập một thay đổi hồ sơ
  const t = ctx.layTrangThaiPheDuyetHoSo('D5'); assert.equal(t.duocPhepXacNhan, false); assert.equal(ctx.layDanhSachPheDuyet({ maHoSo: 'D5' }).rows[0].daLoiThoi, true);
  assert.throws(() => xn('D5', 'REF-D5'), /chưa có phiếu duyệt hợp lệ/);
  const p2 = ap('lap@example.com', 'guiDuyetGiaiNgan', 'D5', 'gửi lại', Q.rev('D5'));
  assert.notEqual(p2.maPheDuyet, p.maPheDuyet);
  assert.equal(ctx.layDanhSachPheDuyet({ maHoSo: 'D5' }).rows.find(x => x.maPheDuyet === p.maPheDuyet).trangThai, 'Hết hiệu lực');
});
dat('Duyệt khi hồ sơ đã đổi sau lúc gửi → phiếu hết hiệu lực, không duyệt được', () => {
  tao('D6'); const p = ap('lap@example.com', 'guiDuyetGiaiNgan', 'D6', '', Q.rev('D6'));
  ctx.chamRevisionHoSo_(ctx.layHoSoTheoMa_('D6'), 'x');
  assert.throws(() => ap('duyet2@example.com', 'quyetDinhPheDuyet', p.maPheDuyet, 'DUYET', ''), /đã thay đổi kể từ khi gửi duyệt/);
  assert.equal(ctx.layDanhSachPheDuyet({ maHoSo: 'D6' }).rows[0].trangThai, 'Hết hiệu lực');
});
dat('Thu hồi: chỉ người gửi hoặc quản trị, chỉ phiếu đang chờ', () => {
  tao('D7'); const p = ap('lap@example.com', 'guiDuyetGiaiNgan', 'D7', '', Q.rev('D7'));
  assert.throws(() => ap('xem@example.com', 'thuHoiDuyetGiaiNgan', p.maPheDuyet), /quyền|Chỉ người gửi/);  // vai trò XEM không có quyền ghi
  ctx.luuNguoiDung({ email: 'lap2@example.com', hoTen: 'Lập 2', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' });
  assert.throws(() => ap('lap2@example.com', 'thuHoiDuyetGiaiNgan', p.maPheDuyet), /Chỉ người gửi/);   // người lập khác không thu hồi hộ
  assert.equal(ap('lap@example.com', 'thuHoiDuyetGiaiNgan', p.maPheDuyet).trangThai, 'Đã thu hồi');
  assert.throws(() => ap('lap@example.com', 'thuHoiDuyetGiaiNgan', p.maPheDuyet), /đang chờ duyệt/);
});
dat('Tắt lại duyệt hai cấp → xác nhận giải ngân không cần phiếu', () => {
  ctx.luuThietLapQuanLyVay({ BAT_DUYET_HAI_CAP: 0 }); tao('D8'); assert.equal(xn('D8', 'REF-D8').trangThai, 'Đã giải ngân');
});
dat('Danh sách hồ sơ CÓ THỂ GỬI DUYỆT để chọn (không gõ tay): chỉ "Đã tạo hồ sơ", chưa có phiếu chờ/duyệt còn hiệu lực, đúng phạm vi; kèm revision', () => {
  tao('E1'); tao('E2'); themHoSo({ MaHoSo: 'E3', MaHD: hd.maHD, TrangThai: 'Nháp', SoTienNhanNoLanNay: 1 });
  const ds = ap('lap@example.com', 'layHoSoCoTheGuiDuyet'), ma2 = ds.map(x => x.maHoSo);
  assert.ok(ma2.includes('E1') && ma2.includes('E2'), ma2.join()); assert.ok(!ma2.includes('E3') && !ma2.includes('D3'), 'không gồm Nháp / đã giải ngân');
  const e1 = ds.find(x => x.maHoSo === 'E1'); assert.deepEqual([e1.revision, e1.soTien, e1.loaiTien, e1.soHopDong], [Q.rev('E1'), 1000000, 'VND', 'HD-PD']); assert.ok(e1.tenCty);
  ctx.guiDuyetGiaiNgan('E2', 'chờ', Q.rev('E2'));
  assert.ok(!ap('lap@example.com', 'layHoSoCoTheGuiDuyet').map(x => x.maHoSo).includes('E2'), 'đã có phiếu chờ duyệt thì không liệt kê');
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try { assert.deepEqual(Array.from(ctx.layHoSoCoTheGuiDuyet()), []); } finally { ctx.phamViCongTyNguoiDung_ = goc; }
  assert.deepEqual(Array.from(ap('xem@example.com', 'layHoSoCoTheGuiDuyet').map(x => x.maHoSo)).includes('E1'), true, 'vai trò Chỉ xem đọc được danh sách');
});
Q.ket('duyệt hai cấp');
