// KIỂM TRA MÔI TRƯỜNG THẬT: trên giả lập chỉ kiểm tra logic của chính bài kiểm tra (quyền, dọn sheet tạm, không đụng sheet khác, báo lỗi đúng).
// Kết quả trên Google thật phải do Quản trị chạy ở Cài đặt › Đồng bộ dữ liệu — KHÔNG được tính là đã kiểm thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('moi_truong'), { ctx, mt, G, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
dat('M1. Chạy được, đạt trên giả lập, không để lại sheet tạm, không đụng sheet dữ liệu nào, có đủ bước và thời gian', () => {
  const truoc = Object.keys(G.boDuLieu.sheets).sort().join('|'), dongHS = G.boDuLieu.getSheetByName('HoSoGiaiNgan').g.length;
  const r = J(ctx.kiemTraMoiTruongThat()); assert.equal(r.ok, true, JSON.stringify(r.buoc.filter(b => !b.ok)));
  assert.ok(r.buoc.length >= 10); r.buoc.forEach(b => assert.equal(typeof b.ms, 'number')); assert.equal(Object.keys(G.boDuLieu.sheets).sort().join('|'), truoc); assert.equal(G.boDuLieu.getSheetByName('HoSoGiaiNgan').g.length, dongHS);
  assert.ok(r.buoc.some(b => /Kiểu dữ liệu/.test(b.ten)) && r.buoc.some(b => /MỘT khối/.test(b.ten)) && r.buoc.some(b => /Múi giờ/.test(b.ten)));
});
dat('M2. Chỉ Quản trị chạy được; sheet tạm còn sót lần trước bị dọn; lỗi môi trường được BÁO (không nuốt)', () => {
  assert.throws(() => voi('nguoila@example.com', () => ctx.api('', 'kiemTraMoiTruongThat', [])), /quyền|QUYEN/i);
  G.boDuLieu.insertSheet('_HAK_THU_MOI_TRUONG'); assert.equal(J(ctx.kiemTraMoiTruongThat()).ok, true); assert.equal(G.boDuLieu.getSheetByName('_HAK_THU_MOI_TRUONG'), null);
  const goc = ctx.Session; ctx.Session = Object.assign({}, goc, { getScriptTimeZone: () => 'America/New_York' });
  try { const r = J(ctx.kiemTraMoiTruongThat()); assert.equal(r.ok, false); assert.match(r.buoc.find(b => /Múi giờ/.test(b.ten)).ghi, /Asia\/Ho_Chi_Minh/); assert.equal(G.boDuLieu.getSheetByName('_HAK_THU_MOI_TRUONG'), null, 'vẫn dọn sheet tạm khi có lỗi'); } finally { ctx.Session = goc; }
});
Q.ket('kiểm tra môi trường thật (logic của bài kiểm tra)');
