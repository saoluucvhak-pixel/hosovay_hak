// CÔNG TY / HỢP ĐỒNG: sửa công ty nào thì ghi ĐÚNG dòng công ty đó (không âm thầm ghi vào công ty đầu tiên); phạm vi công ty kiểm cả bản ghi nguồn lẫn đích.
// Dữ liệu lưu thực tế trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('cong_ty_pv'), { ctx, mt, G, cty, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const sh = G.boDuLieu.getSheetByName('DM_CongTy'); sh.g.push(sh.g[0].map(k => ({ MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002', NguoiDaiDien: 'B' })[k] ?? ''));
const ct = (ma) => J(ctx.sheetToObjects_('DM_CongTy')).find(c => c.MaCty === ma);
const CTY_A = cty.maCty;

dat('C1. Quản trị sửa công ty B → chỉ dòng B đổi, công ty A (dòng đầu) giữ nguyên; maCty không tồn tại bị từ chối thay vì ghi sang công ty khác', () => {
  const a0 = J(ct(CTY_A));
  ctx.luuCongTy({ maCty: 'CTY_B', tenCty: 'Công ty B (đã sửa)', maSoThue: '0400000002', nguoiDaiDien: 'B2', diaChiTruSo: 'HN' });
  assert.deepEqual(J(ct(CTY_A)), a0, 'công ty A không bị ghi đè'); assert.equal(ct('CTY_B').TenCty, 'Công ty B (đã sửa)'); assert.equal(ct('CTY_B').MaCty, 'CTY_B');
  assert.equal(J(ctx.sheetToObjects_('DM_CongTy')).length, 2, 'không sinh thêm dòng');
  assert.throws(() => ctx.luuCongTy({ maCty: 'CTY_KHONG_CO', tenCty: 'X' }), /Không tìm thấy công ty/);
  assert.deepEqual(J(ct(CTY_A)), a0);
});
dat('C2. Người bị giới hạn công ty B sửa B được (đúng dòng B), KHÔNG sửa được A, không tạo công ty mới', () => {
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_B'];
  try {
    const a0 = J(ct(CTY_A));
    ctx.luuCongTy({ maCty: 'CTY_B', tenCty: 'Công ty B lần 2', maSoThue: '0400000002' }); assert.equal(ct('CTY_B').TenCty, 'Công ty B lần 2'); assert.deepEqual(J(ct(CTY_A)), a0, 'công ty A (ngoài phạm vi) không bị đổi');
    assert.throws(() => ctx.luuCongTy({ maCty: CTY_A, tenCty: 'Chiếm A' }), /phạm vi/); assert.throws(() => ctx.luuCongTy({ tenCty: 'Mới' }), /giới hạn theo công ty/);
  } finally { ctx.phamViCongTyNguoiDung_ = goc; }
});
dat('C3. Chuyển hợp đồng sang công ty khác: kiểm cả công ty NGUỒN và ĐÍCH; không chuyển khi đã có hồ sơ vay (tham chiếu)', () => {
  const hd = hopDong({ soHopDong: 'HD-CHUYEN', maCty: CTY_A }), goc = ctx.phamViCongTyNguoiDung_;
  ctx.phamViCongTyNguoiDung_ = () => ['CTY_B'];
  try {
    assert.throws(() => ctx.luuHopDong({ maHD: hd.maHD, expectedRevision: 1, maCty: 'CTY_B', soHopDong: 'HD-CHUYEN', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV', hanMucVay: 1e9 }), /phạm vi/, 'nguồn (A) ngoài phạm vi');
  } finally { ctx.phamViCongTyNguoiDung_ = goc; }
  ctx.phamViCongTyNguoiDung_ = () => [CTY_A];
  try { assert.throws(() => ctx.luuHopDong({ maHD: hd.maHD, expectedRevision: 1, maCty: 'CTY_B', soHopDong: 'HD-CHUYEN', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV', hanMucVay: 1e9 }), /phạm vi/, 'đích (B) ngoài phạm vi'); } finally { ctx.phamViCongTyNguoiDung_ = goc; }
  assert.equal(J(ctx.layHopDongTheoMa_(hd.maHD)).MaCty, CTY_A, 'hợp đồng không bị chuyển');
});
Q.ket('công ty và phạm vi công ty');
