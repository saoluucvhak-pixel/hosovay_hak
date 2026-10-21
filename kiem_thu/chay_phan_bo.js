// Kiểm thử lãi phạt quá hạn, phân bổ tiền trả theo thứ tự cấu hình, ghi nhận trả gộp (giả lập Apps Script/Sheets).
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('phan_bo'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const ADMIN = () => { const g = ctx.laQuanTri_; ctx.laQuanTri_ = () => true; return () => { ctx.laQuanTri_ = g; }; };
const hd = hopDong({ soHopDong: 'HD-PB' });
// Khoản VND 1.000.000, lãi 12%/năm, kỳ lãi hàng tháng, gốc cuối kỳ, 01/01 → 01/04/2026
const H = { MaHoSo: 'P1', MaHD: hd.maHD, SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: '2026-01-01', NgayDenHan: '2026-04-01' };
const cfg = (today) => ({ coSo: 365, nhac: 7, today });
const hdRow = { 'LaiSuatTrongHan_%': 12, KyHanTraLai: 'Hàng tháng', KyHanTraGoc: 'Cuối kỳ' };
const qh = (tyLe, cham) => ({ tyLeQuaHan: tyLe, chamTraNam: cham });

dat('Lãi phạt gốc quá hạn: 1.000.000 × 12% × 150% × 10 ngày / 365 = 4.932', () => {
  const r = ctx.tinhLaiPhat_(H, hdRow, [], cfg('2026-04-11'), qh(150, 0));
  assert.equal(r.laiSuatQuaHanNam, 18);
  assert.equal(r.laiPhatTrenGoc, Math.round(1000000 * 0.18 * 10 / 365)); assert.equal(r.laiPhatTrenGoc, 4932);
  assert.equal(r.laiPhatTrenLai, 0); assert.equal(r.conNo, 4932);
});
dat('Chưa đến hạn gốc → chưa có lãi phạt', () => {
  assert.equal(ctx.tinhLaiPhat_(H, hdRow, [], cfg('2026-03-31'), qh(150, 0)).tong, 0);
  assert.equal(ctx.tinhLaiPhat_(H, hdRow, [], cfg('2026-04-01'), qh(150, 0)).tong, 0);
});
dat('Lãi chậm trả 10%/năm trên lãi quá hạn (3 kỳ lãi: 10.192 / 9.205 / 10.192)', () => {
  const r = ctx.tinhLaiPhat_(H, hdRow, [], cfg('2026-04-11'), qh(150, 10));
  const tay = 10192 * 0.1 * 69 / 365 + 9205 * 0.1 * 41 / 365 + 10192 * 0.1 * 10 / 365;
  assert.equal(r.laiPhatTrenLai, Math.round(tay)); assert.equal(r.tong, 4932 + Math.round(tay));
  assert.equal(r.chiTiet.filter(x => x.loai === 'LAI').length, 3);
});
dat('Phần gốc trả MUỘN chỉ chịu phạt đến ngày trả; phần còn nợ chịu phạt đến ngày tính', () => {
  const ds = [{ LoaiTra: 'GOC', NgayTra: '2026-04-06', SoTien: 400000 }];
  const r = ctx.tinhLaiPhat_(H, hdRow, ds, cfg('2026-04-11'), qh(150, 0));
  const tay = 400000 * 0.18 * 5 / 365 + 600000 * 0.18 * 10 / 365;
  assert.equal(r.laiPhatTrenGoc, Math.round(tay));
});
dat('Trả đủ gốc đúng hạn → không phạt gốc', () => {
  const ds = [{ LoaiTra: 'GOC', NgayTra: '2026-04-01', SoTien: 1000000 }];
  assert.equal(ctx.tinhLaiPhat_(H, hdRow, ds, cfg('2026-05-01'), qh(150, 0)).laiPhatTrenGoc, 0);
});
dat('Lãi phạt đã trả (LoaiTra PHAT) được trừ vào số còn nợ', () => {
  const ds = [{ LoaiTra: 'PHAT', NgayTra: '2026-04-11', SoTien: 1000 }];
  const r = ctx.tinhLaiPhat_(H, hdRow, ds, cfg('2026-04-11'), qh(150, 0));
  assert.equal(r.daTra, 1000); assert.equal(r.conNo, 3932);
});
dat('Phân bổ 20.000 theo PHAT→LAI→GOC: phạt 4.932, lãi 15.068, gốc 0', () => {
  const r = ctx.phanBoKhoanTra_(H, hdRow, [], cfg('2026-04-11'), qh(150, 0), 20000, '2026-04-11', ['PHAT', 'LAI', 'GOC']);
  assert.deepEqual([r.phat, r.lai, r.goc, r.thua], [4932, 15068, 0, 0]);
  assert.equal(r.conPhaiTra.lai, 29589);
});
dat('Đổi thứ tự LAI→GOC→PHAT: lãi 20.000 trước, không trả phạt', () => {
  const r = ctx.phanBoKhoanTra_(H, hdRow, [], cfg('2026-04-11'), qh(150, 0), 20000, '2026-04-11', ['LAI', 'GOC', 'PHAT']);
  assert.deepEqual([r.phat, r.lai, r.goc], [0, 20000, 0]);
});
dat('Số tiền lớn: trả hết phạt + lãi, phần còn lại vào gốc; vượt tổng → còn thừa', () => {
  const r = ctx.phanBoKhoanTra_(H, hdRow, [], cfg('2026-04-11'), qh(150, 0), 100000, '2026-04-11', ['PHAT', 'LAI', 'GOC']);
  assert.deepEqual([r.phat, r.lai, r.goc], [4932, 29589, 65479]);
  const v = ctx.phanBoKhoanTra_(H, hdRow, [], cfg('2026-04-11'), qh(150, 0), 2000000, '2026-04-11', ['PHAT', 'LAI', 'GOC']);
  assert.equal(v.goc, 1000000); assert.equal(v.thua, 2000000 - 4932 - 29589 - 1000000);
});
dat('Phân bổ "tại ngày trả": tiền trả sau ngày đó không ảnh hưởng', () => {
  const ds = [{ LoaiTra: 'LAI', NgayTra: '2026-04-20', SoTien: 29589 }];
  const r = ctx.phanBoKhoanTra_(H, hdRow, ds, cfg('2026-04-11'), qh(150, 0), 20000, '2026-04-11', ['PHAT', 'LAI', 'GOC']);
  assert.equal(r.conPhaiTra.lai, 29589);
});

// ---- Tích hợp: sổ trả nợ thật (ngày tương đối so với hôm nay) ----
const t0 = Q.ngay(-100), dh = Q.ngay(-10);
themHoSo({ MaHoSo: 'P2', MaHD: hd.maHD, SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: t0, NgayDenHan: dh });
dat('API lãi phạt: quá hạn 10 ngày → 4.932 (cấu hình mặc định 150%)', () => {
  const r = ctx.layLaiPhatQuaHan('P2');
  assert.equal(r.laiPhatTrenGoc, 4932); assert.equal(r.ngayTinh, Q.homNay());
});
dat('Cấu hình: chỉ quản trị lưu; 200% → lãi phạt đổi; thứ tự sai bị từ chối', () => {
  const goc = ctx.laQuanTri_; ctx.laQuanTri_ = () => false;
  assert.throws(() => ctx.luuThietLapQuanLyVay({ TY_LE_LAI_QUA_HAN: 200 }), /quản trị|quyền/i);
  ctx.laQuanTri_ = () => true;
  assert.throws(() => ctx.luuThietLapQuanLyVay({ THU_TU_PHAN_BO: 'PHAT,LAI' }), /đủ 3 mục/);
  assert.throws(() => ctx.luuThietLapQuanLyVay({ TY_LE_LAI_QUA_HAN: 50 }), /từ 100 đến 300/);
  assert.throws(() => ctx.luuThietLapQuanLyVay({ KHONG_CO: 1 }), /không hợp lệ/);
  ctx.luuThietLapQuanLyVay({ TY_LE_LAI_QUA_HAN: 200 });
  assert.equal(ctx.layLaiPhatQuaHan('P2').laiPhatTrenGoc, Math.round(1000000 * 0.24 * 10 / 365));
  ctx.luuThietLapQuanLyVay({ TY_LE_LAI_QUA_HAN: 150 });
  ctx.laQuanTri_ = goc;
});
dat('Gợi ý + ghi nhận trả gộp: 20.000 → phạt + lãi thành 2 dòng sổ, hậu tố -P/-L, số dư gốc không đổi', () => {
  const g = ctx.layGoiYPhanBoTra('P2', 20000, Q.homNay());
  assert.equal(g.phat, 4932); assert.equal(g.goc, 0); assert.equal(g.phat + g.lai, 20000);
  const r = ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 20000, soThamChieu: 'GD-2026-001', chungTu: 'UNC 001' }, Q.rev('P2'));
  assert.deepEqual(Array.from(r.parts.map(x => x.loai)), ['PHAT', 'LAI']); assert.equal(r.duNoGoc, 1000000);
  const so = ctx.layTraNoHoSo('P2');
  assert.deepEqual(Array.from(so.dong.map(x => x.loai)).sort(), ['LAI', 'PHAT']);
  assert.equal(ctx.layLaiPhatQuaHan('P2').daTra, 4932);
  assert.equal(ctx.layLaiPhatQuaHan('P2').conNo, 0);
});
dat('Trùng số tham chiếu (kể cả hậu tố) bị chặn; số tiền vượt tổng phải trả bị chặn; phanBo tay phải khớp tổng', () => {
  assert.throws(() => ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 100, soThamChieu: 'GD-2026-001', chungTu: 'x1x' }, Q.rev('P2')), /đã dùng/);
  assert.throws(() => ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 5000000, soThamChieu: 'GD-2026-002', chungTu: 'x1x' }, Q.rev('P2')), /vượt tổng còn phải trả/);
  assert.throws(() => ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 1000, soThamChieu: 'GD-2026-003', chungTu: 'x1x', phanBo: { phat: 100, lai: 100, goc: 100 } }, Q.rev('P2')), /phải bằng số tiền trả/);
  assert.throws(() => ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 1000, soThamChieu: 'GD-2026-004', chungTu: 'x1x' }, Q.rev('P2') - 1), /XUNG_DOT|phiên bản/i);
});
dat('Ghi tay phanBo (lãi 500 + gốc 500) → 2 dòng LAI/GOC, gốc giảm 500', () => {
  const r = ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 1000, soThamChieu: 'GD-2026-005', chungTu: 'UNC 005', phanBo: { phat: 0, lai: 500, goc: 500 } }, Q.rev('P2'));
  assert.deepEqual(Array.from(r.parts.map(x => x.loai)), ['LAI', 'GOC']); assert.equal(r.duNoGoc, 999500);
});
dat('Một phần duy nhất → giữ nguyên số tham chiếu (không hậu tố)', () => {
  ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 700, soThamChieu: 'GD-2026-006', chungTu: 'UNC 006', phanBo: { phat: 0, lai: 0, goc: 700 } }, Q.rev('P2'));
  assert.ok(ctx.layTraNoHoSo('P2').dong.some(x => x.soThamChieu === 'GD-2026-006'));
});
dat('Lỗi giữa chừng → tự hủy các dòng đã ghi (không để sổ dở dang)', () => {
  const truoc = ctx.layTraNoHoSo('P2').dong.filter(x => x.trangThai === 'Hiệu lực').length;
  const goc = ctx.ghiNhanTraNo; let n = 0;
  ctx.ghiNhanTraNo = function () { if (++n === 2) throw new Error('Lỗi giả lập'); return goc.apply(null, arguments); };
  assert.throws(() => ctx.ghiNhanTraNoGop('P2', { ngayTra: Q.homNay(), soTien: 2000, soThamChieu: 'GD-2026-007', chungTu: 'UNC 007', phanBo: { phat: 0, lai: 1000, goc: 1000 } }, Q.rev('P2')), /Lỗi giả lập/);
  ctx.ghiNhanTraNo = goc;
  assert.equal(ctx.layTraNoHoSo('P2').dong.filter(x => x.trangThai === 'Hiệu lực').length, truoc);
});
Q.ket('phân bổ / lãi phạt');
