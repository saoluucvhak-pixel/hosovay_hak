// KHOÁ LỖI RÀ SOÁT 24/10/2026 còn hiệu lực: không sửa/chuyển tài sản công ty khác. (Phần bảo hiểm kiểu cũ và nhập Excel đã gỡ.) Giả lập Apps Script/Sheets — chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('ra_soat_tsdb'), { ctx, mt, G, hopDong, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const SH = (n) => G.boDuLieu.getSheetByName(n);
const ct = SH('DM_CongTy'); ct.g.push(ct.g[0].map(k => ({ MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002' })[k] ?? ''));
const hdA = hopDong({ soHopDong: 'HD-A' }), hdB = hopDong({ soHopDong: 'HD-B', maCty: 'CTY_B' });
const taoTS = (hd, moTa, o) => J(ctx.luuTaiSanBaoDam(Object.assign({ khoaYeuCau: 'K' + Math.random(), maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1000000000 }, o || {}))).maTS;
const bhCT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 0, tuNgay: tu, denNgay: den }, o || {});
const revTS = (hd, ma) => J(ctx.layTaiSanBaoDam(hd.maHD)).rows.find(t => t.maTS === ma).revision;
const luuBH = (maTS, chiTiet, o) => ctx.luuBaoHiemTaiSan(Object.assign({ maTS, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {}));

dat('1. Không sửa/chuyển tài sản của công ty khác (kiểm tra cả hợp đồng GỐC)', () => {
  const tsB = taoTS(hdB, 'Kho của B');
  const revB = revTS(hdB, tsB), g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => [hdA.maCty];
  try {
    assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: tsB, maHD: hdA.maHD, loai: 'BDS', moTa: 'Chiếm của B', giaTri: 1, expectedRevision: revB }), /phạm vi/);
    assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: tsB, maHD: hdB.maHD, loai: 'BDS', moTa: 'Sửa trực tiếp', giaTri: 1, expectedRevision: revB }), /phạm vi/);
  } finally { ctx.phamViCongTyNguoiDung_ = g; }
  const r = J(ctx.layTaiSanBaoDam(hdB.maHD)).rows.find(t => t.maTS === tsB); assert.deepEqual([r.moTa, r.giaTri, r.maHD], ['Kho của B', 1000000000, hdB.maHD], 'không đổi');
  ctx.phamViCongTyNguoiDung_ = () => []; const moi = taoTS(hdA, 'TS chuyển'); assert.ok(J(ctx.luuTaiSanBaoDam({ maTS: moi, maHD: hdB.maHD, loai: 'BDS', moTa: 'TS chuyển', giaTri: 5, expectedRevision: revTS(hdA, moi) })).daSua, 'toàn hệ thống được chuyển (có nhật ký)');
});
Q.ket('rà soát luồng tài sản thế chấp và bảo hiểm');
