// LÃI / LỊCH TRẢ / TẤT TOÁN THEO NGÀY GIẢI NGÂN THỰC TẾ (xác nhận ngân hàng hiệu lực); không có xác nhận hiệu lực → ngày trên hồ sơ. Ngày trên hồ sơ KHÔNG bị ghi đè.
// Dữ liệu LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('lai_ngay_thuc'), { ctx, G, hopDong, themHoSo, ngay, rev, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const sh = (n) => G.boDuLieu.getSheetByName(n), them = (n, o) => { if (!sh(n) && n === 'XacNhanGiaiNgan') ctx.ensureSheet_(ctx.getSS_(), n, ctx.COT_XAC_NHAN_GN_); const s = sh(n); s.g.push(s.g[0].map(k => o[k] ?? '')); };
ctx.damBaoCotSheet_(sh('HoSoGiaiNgan'), ['DaTatToan', 'NgayTatToan']);
const hd = hopDong({ soHopDong: 'HD-LT', laiSuatTrongHan: 10, hanMucVay: 5e12 });
const hs = (ma, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd.maHD, NgayGiaiNgan: ngay(-40), NgayDenHan: ngay(50), SoTienNhanNoLanNay: 365000000, SoGiayNhanNo: 'GNN-' + ma }, o));
const xn = (ma, hsMa, ngayTT, tt = ctx.XN_HIEU_LUC) => them('XacNhanGiaiNgan', { MaXacNhan: ma, MaHoSo: hsMa, LoaiBanGhi: ctx.XN_LOAI_XAC_NHAN, NgayThucTe: ngayTT, SoThamChieuNH: 'REF-' + ma, SoTienThucTe: 365000000, LoaiTien: 'VND', TrangThai: tt });
hs('A'); xn('XN-A', 'A', ngay(-20));          // hồ sơ -40, thực tế -20
hs('B');                                       // chưa có xác nhận → ngày hồ sơ
hs('C'); xn('XN-C', 'C', ngay(-20), ctx.XN_HUY_BO); // xác nhận đã hủy bỏ → ngày hồ sơ
const hang = (r, ma) => r.theoHoSo.find(x => x.maHoSo === ma);
dat('L1. Báo cáo lãi (-40…-1): A tính từ ngày thực (20 ngày × 100.000 = 2.000.000); B và C (không xác nhận hiệu lực) tính từ ngày hồ sơ (40 ngày = 4.000.000)', () => {
  const r = J(ctx.layBaoCaoTienLai({ tuNgay: ngay(-40), denNgay: ngay(-1) }));
  assert.equal(hang(r, 'A').soNgay, 20); assert.equal(hang(r, 'A').lai, 2000000); assert.equal(hang(r, 'B').soNgay, 40); assert.equal(hang(r, 'B').lai, 4000000); assert.equal(hang(r, 'C').lai, 4000000);
});
dat('L2. Lịch trả nợ: kỳ lãi đầu của A bắt đầu từ ngày thực; B từ ngày hồ sơ', () => {
  const a = J(ctx.layLichTraNo('A')), b = J(ctx.layLichTraNo('B')); assert.equal(a.laiRows[0].tuNgay, ngay(-20)); assert.equal(b.laiRows[0].tuNgay, ngay(-40));
});
dat('L3. Theo dõi tất toán theo ngày + danh sách tất toán dùng ngày thực của A', () => {
  const t = J(ctx.layTheoDoiTatToanTheoNgay('A', {})); assert.equal(t.ngayGiaiNgan, ngay(-20));
  const l = J(ctx.layTrangTatToan({})), r = (l.rows || l.dong || l.khoan || []).find(x => x.maHoSo === 'A'); if (r) assert.equal(r.ngayGiaiNgan, ngay(-20));
});
dat('L4. Ghi nhận trả nợ: ngày trả trước ngày THỰC giải ngân (nhưng sau ngày hồ sơ) bị từ chối; sau ngày thực được nhận', () => {
  assert.throws(() => ctx.ghiNhanTraNo('A', { loaiTra: 'GOC', ngayTra: ngay(-30), soTien: 1000000, soThamChieu: 'REF-T1', chungTu: 'Chứng từ thử' }, rev('A')), /trước ngày giải ngân/);
  ctx.ghiNhanTraNo('A', { loaiTra: 'GOC', ngayTra: ngay(-19), soTien: 1000000, soThamChieu: 'REF-T2', chungTu: 'Chứng từ thử' }, rev('A'));
});
dat('L5. Ngày trên hồ sơ KHÔNG bị ghi đè (mở hồ sơ vẫn thấy ngày hồ sơ); báo cáo chỉ-đọc', () => {
  const ngayHS = (ma) => String(J(ctx.layDuLieuDayDu(ma)).hoSo.NgayGiaiNgan).slice(0, 10); assert.equal(ngayHS('A'), ngay(-40));
  const chup = () => JSON.stringify(sh('HoSoGiaiNgan').g.map(r => r.slice())); const t = chup(); ctx.layBaoCaoTienLai({ tuNgay: ngay(-40), denNgay: ngay(-1) }); ctx.layLichTraNo('A'); assert.equal(chup(), t);
});
dat('L6. Hiệu năng/đúng đắn bộ nhớ: trong một yêu cầu đọc, ngày thực giải ngân đọc ĐÚNG MỘT lần (4 cột, không đọc cả bảng); sau khi ghi xác nhận mới thì đọc lại thấy ngay', () => {
  const mt = Q.mt; hs('D'); for (let i = 0; i < 60; i++) xn('XN-F' + i, 'F' + i, ngay(-5)); const dem = () => { mt.__soLanDocRange = 0; mt.__soODoc = 0; };
  dem(); ctx.ngayThucGiaiNganTheoHoSo_(); const mot = { luot: mt.__soLanDocRange, o: mt.__soODoc };
  dem(); let a, b, c; ctx.voiBoNhoBH_(() => { a = J(ctx.ngayThucGiaiNganTheoHoSo_()); b = J(ctx.ngayThucGiaiNganTheoHoSo_()); }); const trongPhamVi = mt.__soLanDocRange;
  assert.ok(trongPhamVi <= mot.luot, 'hai lần gọi trong một yêu cầu chỉ đọc sheet một lần: ' + trongPhamVi + ' vs ' + mot.luot);
  const nCot = sh('XacNhanGiaiNgan').g[0].length; assert.ok(mot.o < sh('XacNhanGiaiNgan').g.length * nCot / 2, 'chỉ đọc vài cột, không đọc cả bảng: ' + mot.o);
  ctx.voiBoNhoBH_(() => { ctx.ngayThucGiaiNganTheoHoSo_(); ctx.ghiXacNhanDong_({ MaXacNhan: 'XN-D', MaHoSo: 'D', LoaiBanGhi: ctx.XN_LOAI_XAC_NHAN, NgayThucTe: ngay(-7), SoThamChieuNH: 'REF-D', SoTienThucTe: 1, LoaiTien: 'VND', TrangThai: ctx.XN_HIEU_LUC }); c = J(ctx.ngayThucGiaiNganTheoHoSo_()); });
  assert.equal(a.D, undefined); assert.deepEqual(a, b); assert.equal(c.D, ngay(-7), 'ghi xác nhận mới trong cùng yêu cầu phải xoá bộ nhớ');
});
Q.ket('lãi/lịch trả/tất toán theo ngày giải ngân thực tế');
