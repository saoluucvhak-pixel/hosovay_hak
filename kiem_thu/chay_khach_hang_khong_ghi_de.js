// KHÁCH HÀNG / NGƯỜI THỤ HƯỞNG: tạo lại sau mất phản hồi không sinh bản trùng; hai khách hàng thật trùng tên vẫn phân biệt bằng mã; hai phiên sửa cùng khách hàng phải phát hiện xung đột
// (số tài khoản nhận tiền KHÔNG được ghi đè âm thầm). Dữ liệu lưu thực tế trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('khach_hang'), { ctx, mt, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const kh = (o) => Object.assign({ tenKhachHang: 'Công ty Bán A', maSoThue: '0100109106', soTaiKhoan: '111222333', taiNganHang: 'BIDV', diaChi: 'Đà Nẵng' }, o || {});
const ds = () => J(ctx.sheetToObjects_('DM_KhachHang')), cua = (ma) => ds().find(k => k.MaKH === ma);

dat('K1. Tạo khách hàng gửi lại sau mất phản hồi (cùng khoaYeuCau) → một bản ghi; hai khách hàng THẬT trùng tên khác khoá → hai mã riêng', () => {
  const truoc = ds().length;
  const a = J(ctx.luuKhachHang(kh({ khoaYeuCau: 'KH-REQ-1' }))), b = J(ctx.luuKhachHang(kh({ khoaYeuCau: 'KH-REQ-1' })));
  assert.equal(a.maKH, b.maKH); assert.equal(b.trungLap, true); assert.equal(ds().length, truoc + 1, 'không sinh bản trùng');
  const c = J(ctx.luuKhachHang(kh({ khoaYeuCau: 'KH-REQ-2' }))); assert.notEqual(c.maKH, a.maKH, 'khách hàng thật trùng tên được phân biệt bằng mã'); assert.equal(ds().length, truoc + 2);
  assert.throws(() => ctx.luuKhachHang(kh({ khoaYeuCau: 'KH-REQ-1', soTaiKhoan: '999' })), /khoá yêu cầu.*nội dung khác|đã dùng/i, 'cùng khoá nhưng số tài khoản khác bị chặn, không âm thầm trả bản cũ');
});
dat('K2. Hai phiên sửa cùng khách hàng: phiên cũ bị chặn (XUNG_DOT_PHIEN_BAN) và KHÔNG ghi đè số tài khoản; thiếu phiên bản bị từ chối; sửa đúng phiên bản thành công và tăng phiên bản', () => {
  const t = J(ctx.luuKhachHang(kh({ khoaYeuCau: 'KH-REQ-3', tenKhachHang: 'Công ty Bán C', maSoThue: '0300588569' }))), ma = t.maKH, r0 = Number(cua(ma).Revision) || 0;
  assert.ok(r0 >= 1, 'bản ghi mới có phiên bản');
  // phiên B sửa trước
  const b = J(ctx.luuKhachHang(kh({ maKH: ma, tenKhachHang: 'Công ty Bán C', maSoThue: '0300588569', soTaiKhoan: 'TK-CUA-B', expectedRevision: r0 })));
  assert.equal(cua(ma).SoTaiKhoan, 'TK-CUA-B'); assert.equal(Number(cua(ma).Revision), r0 + 1); assert.equal(b.revision, r0 + 1);
  // phiên A (đọc ở r0) lưu sau → bị chặn, số tài khoản của B còn nguyên
  let loi = ''; try { ctx.luuKhachHang(kh({ maKH: ma, tenKhachHang: 'Công ty Bán C', maSoThue: '0300588569', soTaiKhoan: 'TK-CUA-A', expectedRevision: r0 })); } catch (e) { loi = e.message; }
  assert.match(loi, /^XUNG_DOT_PHIEN_BAN\|/); assert.equal(cua(ma).SoTaiKhoan, 'TK-CUA-B', 'không ghi đè'); assert.equal(Number(cua(ma).Revision), r0 + 1);
  assert.throws(() => ctx.luuKhachHang(kh({ maKH: ma, tenKhachHang: 'Công ty Bán C', soTaiKhoan: 'X' })), /Thiếu phiên bản/);
  const ok = J(ctx.luuKhachHang(kh({ maKH: ma, tenKhachHang: 'Công ty Bán C', maSoThue: '0300588569', soTaiKhoan: 'TK-CUA-A', expectedRevision: r0 + 1 }))); assert.equal(ok.revision, r0 + 2); assert.equal(cua(ma).SoTaiKhoan, 'TK-CUA-A');
  assert.equal(cua(ma).KhoaYeuCau, 'KH-REQ-3', 'khoá yêu cầu gốc được giữ khi sửa');
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'luuKhachHang', [kh({ khoaYeuCau: 'KH-REQ-9' })])), /quyền|QUYEN/i);
});
dat('K3. OCR/hóa đơn tự thêm khách hàng theo MST: lặp lại không nhân đôi, không đè khách hàng đã có; khách hàng có sẵn cùng MST được dùng lại', () => {
  const truoc = ds().length; ctx.upsertKhachHangTheoMST_('0311111111', 'Nhà cung cấp OCR'); ctx.upsertKhachHangTheoMST_('0311111111', 'Nhà cung cấp OCR'); ctx.upsertKhachHangTheoMST_('0311111111', 'Tên khác');
  assert.equal(ds().length, truoc + 1); assert.equal(ds().find(k => k.MaSoThue === '0311111111').TenKhachHang, 'Nhà cung cấp OCR');
  const co = ds().find(k => k.MaSoThue === '0100109106'); const rv = Number(co.Revision) || 0; ctx.upsertKhachHangTheoMST_('0100109106', 'Tên OCR khác'); assert.equal(ds().find(k => k.MaKH === co.MaKH).TenKhachHang, co.TenKhachHang, 'không đè tên đã có'); assert.equal(Number(ds().find(k => k.MaKH === co.MaKH).Revision) || 0, rv);
});
Q.ket('khách hàng: chống trùng và chống ghi đè');
