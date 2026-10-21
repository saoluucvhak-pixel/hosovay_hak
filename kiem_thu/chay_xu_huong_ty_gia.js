// Kiểm thử hàm XU HƯỚNG tỷ giá (không phải dự báo) — giả lập Apps Script; chưa chạy trên Google thật.
const path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), out = path.join(require('os').tmpdir(), 'hosovay_xu_huong');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx);
console.log = () => {}; const _l = (s) => process.stdout.write(s + '\n'); let ok = 0; const dat = (t, f) => { f(); ok++; _l('PASS ' + t); };
const J = (x) => JSON.parse(JSON.stringify(x));
const ngay = (i) => { const d = new Date(Date.UTC(2026, 9, 21 + i)); return d.toISOString().slice(0, 10); }; // i=0 → 2026-10-21
const chuoi = (arr) => arr.map(([i, ty]) => ({ ngay: ngay(i), ty }));
const T = (arr, homNay) => J(ctx.tinhXuHuongTyGia_(chuoi(arr), homNay || ngay(0)));

dat('Không có dữ liệu: CHUA_DU_DU_LIEU, không đoán', () => {
  const r = T([]); assert.equal(r.nhan, 'CHUA_DU_DU_LIEU'); assert.equal(r.tyMoiNhat, null); assert.match(r.luuY, /không phải dự báo/);
});
dat('Ít điểm (2 ngày): chưa đủ dữ liệu, vẫn trả giá mới nhất và chênh lệch 1 ngày', () => {
  const r = T([[-1, 26000], [0, 26100]]); assert.equal(r.nhan, 'CHUA_DU_DU_LIEU'); assert.equal(r.tyMoiNhat, 26100);
  assert.equal(r.thayDoi.ngay1.soTien, 100); assert.equal(r.thayDoi.ngay1.phanTram, 0.38);
});
const ngay30 = []; for (let i = -30; i <= 0; i++) ngay30.push([i, 26000 + (i + 30) * 15]); // tăng đều 15 đồng/ngày (~0,4% mỗi 7 ngày)
dat('Tăng đều 30 ngày: TANG, có thay đổi 7/30 ngày, trung bình động và biên độ', () => {
  const r = T(ngay30); assert.equal(r.nhan, 'TANG'); assert.equal(r.tyMoiNhat, 26450); assert.equal(r.chuoi.length, 31); assert.equal(r.chuoi[30].ty, 26450);
  assert.equal(r.thayDoi.ngay7.soTien, 105); assert.equal(r.thayDoi.ngay30.giaTruoc, 26000 + 0);
  assert.ok(r.trungBinhDong.ngay7 > 26200 && r.trungBinhDong.ngay30 > 26100); assert.ok(r.bienDo30 > 0);
});
dat('Giảm: GIAM', () => { assert.equal(T(ngay30.map(([i, t]) => [i, 52450 - t])).nhan, 'GIAM'); });
dat('Dao động nhỏ (<0,3% trong 7 ngày): DI_NGANG', () => {
  const r = T(ngay30.map(([i]) => [i, 26000 + (i % 2 ? 5 : 0)])); assert.equal(r.nhan, 'DI_NGANG');
});
dat('Dữ liệu cũ (mới nhất cách hôm nay 10 ngày): không kết luận, nêu lý do', () => {
  const r = T(ngay30.map(([i, t]) => [i - 10, t])); assert.equal(r.nhan, 'CHUA_DU_DU_LIEU'); assert.match(r.lyDo, /đã cũ 10 ngày/);
});
dat('Dữ liệu xấu/trùng ngày/số âm bị bỏ qua; trùng ngày lấy giá sau cùng; không ném lỗi', () => {
  const r = J(ctx.tinhXuHuongTyGia_([{ ngay: 'abc', ty: 5 }, { ngay: ngay(0), ty: -1 }, { ngay: ngay(0), ty: 26100 }, { ngay: ngay(0), ty: 26200 }, null], ngay(0)));
  assert.equal(r.soDiem, 1); assert.equal(r.tyMoiNhat, 26200);
});
dat('layXuHuongTyGia đọc sheet TyGiaThuCong và yêu cầu đăng nhập', () => {
  const sh = mt.__.boDuLieu.getSheetByName('TyGiaThuCong') || ctx.ensureSheet_(mt.SpreadsheetApp.getActiveSpreadsheet(), 'TyGiaThuCong', ctx.COT_TY_GIA_THU_CONG_);
  assert.ok(sh);
  mt.__email = 'ketoan@example.com';
  const r0 = J(ctx.layXuHuongTyGia()); assert.equal(r0.nhan, 'CHUA_DU_DU_LIEU');
  const hn = ctx.homNayVN_(); const them = (n, t) => ctx.themDongVaoCuoiThat_(sh, [n, t, 'x', 'TU_DONG', new Date()]);
  for (let i = 0; i < 9; i++) { const d = new Date(hn + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 8 + i); them(d.toISOString().slice(0, 10), 26000 + i * 20); }
  const r = J(ctx.layXuHuongTyGia()); assert.equal(r.nhan, 'TANG'); assert.equal(r.tyMoiNhat, 26160);
  mt.__email = '';
  assert.throws(() => ctx.layXuHuongTyGia(), /đăng nhập|quyền|AUTH/i);
});
dat('layLichSuTyGia / layTrangThaiLichTyGia: lịch sử mới nhất trước, đánh dấu tự động/nhập tay, trạng thái lịch; yêu cầu đăng nhập', () => {
  mt.__email = 'ketoan@example.com';
  const sh = mt.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TyGiaThuCong');
  const hn = ctx.homNayVN_(), dm = (k) => { const d = new Date(hn + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); };
  ctx.themDongVaoCuoiThat_(sh, [dm(-30), 25000, 'tay cũ', 'ketoan@example.com', new Date()]);
  const ls = J(ctx.layLichSuTyGia(5)); assert.ok(ls.dong.length <= 5); assert.ok(ls.dong[0].ngay >= ls.dong[ls.dong.length - 1].ngay);
  const tatCa = J(ctx.layLichSuTyGia(120)).dong; assert.ok(tatCa.some(d => d.tuDong === true) && tatCa.some(d => d.tuDong === false), 'có cả dòng tự động và nhập tay');
  assert.equal(ls.homNay, hn); assert.ok(ls.hienTai && ls.hienTai.tyGiaBan > 0);
  assert.equal(J(ctx.layLichSuTyGia(9999)).dong.length <= 120, true);
  const tg = (...h) => ({ getProjectTriggers: () => h.map(x => ({ getHandlerFunction: () => x })) }), cu = ctx.ScriptApp;
  try {
    ctx.ScriptApp = tg('chuanBiTyGiaGoogle', 'tuDongCapNhatTyGiaVCB'); let l = J(ctx.layTrangThaiLichTyGia()); assert.equal(l.dang, true); assert.equal(l.trung, false);
    ctx.ScriptApp = tg('chuanBiTyGiaGoogle'); l = J(ctx.layTrangThaiLichTyGia()); assert.equal(l.dang, false);
    ctx.ScriptApp = tg('chuanBiTyGiaGoogle', 'chuanBiTyGiaGoogle', 'tuDongCapNhatTyGiaVCB'); l = J(ctx.layTrangThaiLichTyGia()); assert.equal(l.dang, true); assert.equal(l.trung, true);
    ctx.ScriptApp = { getProjectTriggers: () => { throw new Error('không có quyền'); } }; assert.equal(J(ctx.layTrangThaiLichTyGia()).khongDoc, true);
  } finally { ctx.ScriptApp = cu; }
  mt.__email = ''; assert.throws(() => ctx.layLichSuTyGia(), /đăng nhập|quyền|AUTH/i); assert.throws(() => ctx.layTrangThaiLichTyGia(), /đăng nhập|quyền|AUTH/i);
});
_l(`\nTỔNG: ${ok} kiểm tra hàm xu hướng tỷ giá đạt, 0 lỗi`);
