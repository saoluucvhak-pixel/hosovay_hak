// Kiểm thử đối soát sao kê ngân hàng (phân tích CSV, số/ngày kiểu VN, ghép theo tham chiếu + số tiền, gợi ý, thiếu, phạm vi).
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('doi_soat_sao_ke'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));

dat('Đọc số tiền: 1.234.567 | 1,234,567 | 1.234.567,89 | 1,234,567.89 | (1.000) | -500 | 12,5 | 1000 VND | rỗng | chữ', () => {
  const d = ctx.docSoSaoKe_;
  assert.equal(d('1.234.567'), 1234567); assert.equal(d('1,234,567'), 1234567); assert.equal(d('1.234.567,89'), 1234567.89); assert.equal(d('1,234,567.89'), 1234567.89);
  assert.equal(d('(1.000)'), -1000); assert.equal(d('-500'), -500); assert.equal(d('12,5'), 12.5); assert.equal(d('1000 VND'), 1000); assert.equal(d(''), null); assert.ok(Number.isNaN(d('abc')));
  assert.equal(d('19.372,34'), 19372.34); assert.equal(d('19,372.34'), 19372.34);
});
dat('Đọc ngày: dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy, dd.mm.yyyy; sai → rỗng', () => {
  const d = ctx.docNgaySaoKe_;
  assert.equal(d('05/10/2026'), '2026-10-05'); assert.equal(d('2026-10-05 08:00'), '2026-10-05'); assert.equal(d('5-10-2026'), '2026-10-05'); assert.equal(d('05.10.2026'), '2026-10-05'); assert.equal(d('hôm nay'), '');
});
dat('Phân tích: tự nhận dấu phân cách (; , tab), tiêu đề tiếng Việt/Anh, dấu nháy kép chứa dấu phẩy', () => {
  const a = J(ctx.phanTichSaoKe_('Ngày GD;Số tham chiếu;Nội dung;Ghi nợ;Ghi có\n21/10/2026;FT1;GN keo;;2.000.000\n22/10/2026;FT2;Tra no;500.000;'));
  assert.equal(a.dong.length, 2); assert.deepEqual([a.dong[0].huong, a.dong[0].soTien, a.dong[1].huong, a.dong[1].soTien], ['VAO', 2000000, 'RA', 500000]);
  const b = J(ctx.phanTichSaoKe_('Date,Reference,Description,Debit,Credit\n2026-10-21,"FT,9","Giai ngan, dot 1",,"2,000,000.50"\n'));
  assert.equal(b.dong[0].thamChieu, 'FT,9'); assert.equal(b.dong[0].noiDung, 'Giai ngan, dot 1'); assert.equal(b.dong[0].soTien, 2000000.5);
  const c = J(ctx.phanTichSaoKe_('Ngày\tSố tiền\tDiễn giải\n21/10/2026\t-300.000\tchi\n22/10/2026\t1.000.000\tthu'));
  assert.deepEqual([c.dong[0].huong, c.dong[1].huong], ['RA', 'VAO']);
});
dat('Phân tích: lỗi rõ ràng (rỗng, thiếu cột, quá dài, dòng hỏng được báo)', () => {
  assert.throws(() => ctx.phanTichSaoKe_(''), /Chưa dán/); assert.throws(() => ctx.phanTichSaoKe_('a;b\n1;2'), /Không nhận ra tiêu đề/);
  assert.throws(() => ctx.phanTichSaoKe_('x'.repeat(400001)), /quá dài/);
  const r = J(ctx.phanTichSaoKe_('Ngày;Số tiền\n21/10/2026;1.000\nxx;5\n22/10/2026;abc'));
  assert.equal(r.dong.length, 1); assert.equal(r.loi.length, 2);
});
const he = { giaiNgan: [{ ma: 'XN1', maHoSo: 'H1', ref: 'GN-0001', ngay: '2026-10-21', so: 2000000, loai: 'VND' }, { ma: 'XN2', maHoSo: 'H2', ref: 'GN-0002', ngay: '2026-10-22', so: 100, loai: 'USD' }],
  traNo: [{ ma: 'TN1', maHoSo: 'H1', ref: 'TRA-77', ngay: '2026-10-25', so: 500000, loai: 'VND' }, { ma: 'TN2', maHoSo: 'H1', ref: 'TRA-88', ngay: '2026-10-26', so: 300000, loai: 'VND' }, { ma: 'TN3', maHoSo: 'H3', ref: 'TRA-99', ngay: '2026-10-27', so: 111111, loai: 'VND' }] };
const dg = (...x) => x.map((d, i) => Object.assign({ stt: i + 1, ngay: '2026-10-21', thamChieu: '', noiDung: '', huong: 'RA', soTien: 0, loaiTien: '' }, d));
dat('Ghép: KHỚP theo tham chiếu + số tiền (chuẩn hoá bỏ ký tự lạ, chứa trong nội dung)', () => {
  const r = J(ctx.doiSoatSaoKe_(dg({ huong: 'VAO', thamChieu: 'gn 0001', soTien: 2000000 }, { huong: 'RA', thamChieu: '', noiDung: 'TT NO TRA-77 DOT 1', soTien: 500000, ngay: '2026-10-25' }), he, 'VND'));
  assert.deepEqual(r.dong.map(x => x.ketQua), ['KHOP', 'KHOP']); assert.equal(r.dong[0].ung.r.ma, 'XN1');
});
dat('LỆCH SỐ TIỀN: đúng tham chiếu nhưng số tiền khác → báo chênh lệch', () => {
  const r = J(ctx.doiSoatSaoKe_(dg({ huong: 'RA', thamChieu: 'TRA-88', soTien: 299000, ngay: '2026-10-26' }), he, 'VND'));
  assert.equal(r.dong[0].ketQua, 'LECH_SO_TIEN');
});
dat('Phân biệt hướng và loại tiền: tiền vào không ghép với sổ trả nợ; USD không ghép với VND', () => {
  const r = J(ctx.doiSoatSaoKe_(dg({ huong: 'VAO', thamChieu: 'TRA-77', soTien: 500000, ngay: '2026-10-25' }, { huong: 'VAO', thamChieu: 'GN-0002', soTien: 100, loaiTien: 'VND', ngay: '2026-10-22' }, { huong: 'VAO', thamChieu: 'GN-0002', soTien: 100, loaiTien: 'USD', ngay: '2026-10-22' }), he, 'VND'));
  assert.deepEqual(r.dong.map(x => x.ketQua), ['KHONG_CO', 'KHONG_CO', 'KHOP']);
});
dat('GỢI Ý: không có tham chiếu nhưng trùng số tiền + ngày ±3 (duy nhất); nhiều ứng viên → GOI_Y_NHIEU; ngoài ±3 ngày → không gợi ý', () => {
  const r = J(ctx.doiSoatSaoKe_(dg({ huong: 'RA', thamChieu: 'KHONG-RO', soTien: 300000, ngay: '2026-10-28' }, { huong: 'RA', soTien: 111111, ngay: '2026-10-31' }), he, 'VND'));
  assert.equal(r.dong[0].ketQua, 'GOI_Y'); assert.equal(r.dong[0].ung.r.ma, 'TN2'); assert.equal(r.dong[1].ketQua, 'KHONG_CO');
  const he2 = { giaiNgan: [], traNo: [{ ma: 'A', maHoSo: 'H1', ref: 'AAAA1', ngay: '2026-10-25', so: 1000, loai: 'VND' }, { ma: 'B', maHoSo: 'H2', ref: 'BBBB1', ngay: '2026-10-26', so: 1000, loai: 'VND' }] };
  assert.equal(J(ctx.doiSoatSaoKe_(dg({ huong: 'RA', soTien: 1000, ngay: '2026-10-25' }), he2, 'VND')).dong[0].ketQua, 'GOI_Y_NHIEU');
});
dat('Mỗi bản ghi hệ thống chỉ ghép MỘT lần (2 dòng sao kê cùng tham chiếu → dòng sau không ghép nữa)', () => {
  const r = J(ctx.doiSoatSaoKe_(dg({ huong: 'RA', thamChieu: 'TRA-77', soTien: 500000, ngay: '2026-10-25' }, { huong: 'RA', thamChieu: 'TRA-77', soTien: 500000, ngay: '2026-10-25' }), he, 'VND'));
  assert.deepEqual(r.dong.map(x => x.ketQua), ['KHOP', 'KHONG_CO']);
});
dat('THIẾU TRÊN SAO KÊ: bản ghi hệ thống trong khoảng ngày sao kê nhưng không có trên sao kê; ngoài khoảng ngày không tính', () => {
  const r = J(ctx.doiSoatSaoKe_(dg({ huong: 'VAO', thamChieu: 'GN-0001', soTien: 2000000, ngay: '2026-10-21' }, { huong: 'RA', thamChieu: 'TRA-77', soTien: 500000, ngay: '2026-10-25' }), he, 'VND'));
  assert.deepEqual(r.thieu.map(x => x.r.ma).sort(), ['XN2']);  // XN2 (22/10, USD) nằm trong khoảng 21→25 mà sao kê không có; TN2 (26/10) và TN3 (27/10) nằm ngoài khoảng nên không tính
});
// ---- Tích hợp với dữ liệu thật (xác nhận giải ngân + sổ trả nợ) ----
const hd = hopDong({ soHopDong: 'HD-DS', hanMucVay: 0 });
themHoSo({ MaHoSo: 'S1', MaHD: hd.maHD, SoTienNhanNoLanNay: 5000000, NgayGiaiNgan: Q.ngay(-20), NgayDenHan: Q.ngay(100) });
ctx.ghiXacNhanDong_({ MaXacNhan: 'XN-S1-1', MaHoSo: 'S1', LoaiBanGhi: ctx.XN_LOAI_XAC_NHAN, NgayThucTe: Q.ngay(-19), SoThamChieuNH: 'BIDV-GN-5555', SoTienThucTe: 5000000, LoaiTien: 'VND', TrangThai: ctx.XN_HIEU_LUC, NguoiXacNhan: 'x' });
ctx.ghiNhanTraNoGop('S1', { ngayTra: Q.ngay(-3), soTien: 20000, soThamChieu: 'TT-9001', chungTu: 'UNC 9001', phanBo: { phat: 0, lai: 12000, goc: 8000 } }, Q.rev('S1'));
const iso = (n) => { const d = Q.ngay(n).split('-'); return d[2] + '/' + d[1] + '/' + d[0]; };
dat('Tích hợp: giải ngân 5tr khớp; trả gộp lãi+gốc (2 dòng -L/-G) được CỘNG LẠI thành 1 giao dịch 20.000 → khớp; dòng lạ báo không có', () => {
  const text = 'Ngày GD;Số tham chiếu;Nội dung;Ghi nợ;Ghi có\n' + iso(-19) + ';BIDV-GN-5555;Giai ngan;;5.000.000\n' + iso(-3) + ';TT-9001;Tra no lai goc;20.000;\n' + iso(-2) + ';FT-LA;Phi dich vu;11.000;';
  const r = ctx.doiSoatSaoKe(text, { loaiTien: 'VND' });
  assert.deepEqual(Array.from(r.dong.map(x => x.ketQua)), ['KHOP', 'KHOP', 'KHONG_CO']);
  assert.equal(r.dong[1].ungVien.soTien, 20000); assert.equal(r.dem.KHOP, 2); assert.equal(r.dem.KHONG_CO, 1);
});
dat('Tích hợp: sao kê thiếu giao dịch giải ngân → hệ thống báo THIEU_TREN_SAO_KE; phạm vi ngày chỉ theo sao kê', () => {
  const text = 'Ngày GD;Số tham chiếu;Ghi nợ;Ghi có\n' + iso(-10) + ';ABC1;1.000;\n' + iso(0) + ';ABC2;2.000;';
  const r = ctx.doiSoatSaoKe(text, {}); assert.deepEqual(Array.from(r.thieuTrenSaoKe.map(x => x.ref)), ['TT-9001']);  // giao dịch trả nợ -3 ngày nằm trong khoảng sao kê nhưng không có trên sao kê
  const r2 = ctx.doiSoatSaoKe('Ngày GD;Số tham chiếu;Ghi nợ;Ghi có\n' + iso(-20) + ';ABC1;1.000;\n' + iso(0) + ';ABC2;2.000;', {});
  assert.deepEqual(Array.from(r2.thieuTrenSaoKe.map(x => x.ref)).sort(), ['BIDV-GN-5555', 'TT-9001']);
});
dat('Không ghi gì vào Sheet (chỉ đọc)', () => {
  const truoc = JSON.stringify(Object.keys(G.boDuLieu.sheets).map(n => G.boDuLieu.sheets[n].g.length));
  ctx.doiSoatSaoKe('Ngày;Số tiền\n' + iso(-3) + ';-20.000', {});
  assert.equal(JSON.stringify(Object.keys(G.boDuLieu.sheets).map(n => G.boDuLieu.sheets[n].g.length)), truoc);
});
Q.ket('đối soát sao kê');
