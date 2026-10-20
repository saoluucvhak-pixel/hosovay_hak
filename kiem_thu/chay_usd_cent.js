/* Hồi quy USD có cent: chạy mã Apps Script thật trong dịch vụ mô phỏng. */
const assert = require('node:assert/strict'), path = require('node:path');
const {ctx} = require('./gia_lap_apps_script')(path.join(__dirname, '..'), path.resolve(process.argv[2] || 'kiem_thu/ket_qua_hak/usd_cent'));
let n = 0; function check(name, f) { f(); n++; console.log('[ĐẠT] ' + name); }
check('Mã máy chủ dùng BigInt() tương thích Apps Script', () => {
  const fs = require('node:fs');
  for (const file of ['Tien.gs','NumberToWords.gs']) assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',file),'utf8'), /\b\d+n\b/);
});
check('Nhận USD số, chuỗi VN và dấu chấm thập phân', () => {
  for (const v of [25000.50, '25000.50', '25.000,50', '25000,50']) assert.equal(ctx.docTienUSD_(v), 25000.5);
  assert.equal(ctx.docTienUSD_('25.000'), 25000); assert.equal(ctx.docTienUSD_('0,01'), 0.01);
});
check('Chặn USD quá hai số thập phân, âm, vô hạn; VND vẫn nguyên', () => {
  for (const v of ['1,234', '25000.555', -1, Infinity, 'abc']) assert.throws(() => ctx.docTienUSD_(v));
  assert.throws(() => ctx.docTienTheoLoai_('25.000,50', 'VND'));
});
check('Cộng cent chính xác: 0.10 + 0.20 = 0.30', () => {
  assert.equal(ctx.tongTienTheoLoai_([0.1, 0.2], 'USD'), 0.3);
  assert.equal(ctx.congSoTien_(0.1, 0.2), 0.3);
  assert.equal(ctx.congSoTien_(0.3, -0.1), 0.2);
});
check('Quy đổi cent và tỷ giá lẻ, làm tròn VND nửa lên', () => {
  assert.equal(ctx.quyDoiUSDSangVND_(25000.5, 26145.5), 653650573);
  assert.equal(ctx.quyDoiUSDSangVND_(0.01, 50), 1);
  assert.equal(ctx.quyDoiUSDSangVND_(0.29, 100), 29);
});
check('Số tiền bằng chữ có cent và định dạng hiển thị', () => {
  assert.equal(ctx.soTienUSDBangChu_(25000.50), 'Hai mươi lăm ngàn đô la Mỹ và năm mươi cent');
  assert.equal(ctx.soTienUSDBangChu_(0.01), 'Không đô la Mỹ và một cent');
  assert.equal(ctx.formatSo_(25000.5), '25.000,5');
});
check('Excel giữ USD dạng số và hiện cent, giữ kiểu chữ/viền của mẫu', () => {
  const xml='<worksheet><sheetData><row r="1"><c r="A1" s="0" t="inlineStr"><is><t>{{HO_SO.SO_TIEN}}</t></is></c></row></sheetData></worksheet>';
  const styles='<styleSheet><cellXfs count="1"><xf numFmtId="3" fontId="2" borderId="1" applyAlignment="1"><alignment horizontal="right"/></xf></cellXfs></styleSheet>';
  const r=ctx.xlsxXuLyGoi_({'xl/worksheets/sheet1.xml':xml,'xl/styles.xml':styles},{'HO_SO.SO_TIEN':'25.000,50'},[]);
  assert.match(r.phan['xl/worksheets/sheet1.xml'], /<v>25000\.5<\/v>/);
  assert.match(r.phan['xl/worksheets/sheet1.xml'], /s="1"/);
  assert.match(r.phan['xl/styles.xml'], /numFmtId="4" applyNumberFormat="1"/);
  assert.match(r.phan['xl/styles.xml'], /fontId="2" borderId="1"/);
});
ctx.initializeSpreadsheet(); require('./gia_lap_apps_script').dangKyNguoiThuong(ctx);
const c = ctx.luuCongTy({tenCty:'TEST CENT'}), h = ctx.luuHopDong({tinhTrang:'Đang hiệu lực',maCty:c.maCty,soHopDong:'CENT-01',hanMucVay:100000000});
const pl = {maHD:h.maHD,loaiTien:'USD',tyGiaBan:26145.5,duNoHienTai:'10,25',soTienNhanNoLanNay:'0,30',chiTiet:[{tenNguoiHuong:'A',soTien:'0.10'},{tenNguoiHuong:'B',soTien:'0,20'}]};
let saved;
check('Lưu hồ sơ, mở lại: giữ 0.10 + 0.20 = 0.30, dư nợ có cent', () => {
  saved = ctx.luuHoSoGiaiNgan(pl);
  const hs = ctx.layHoSoTheoMa_(saved.maHoSo), ct = ctx.layChiTietTheoHoSo_(saved.maHoSo);
  assert.equal(hs.SoTienNhanNoLanNay,0.3); assert.equal(hs.DuNoHienTai,10.25);
  assert.equal(ct[0].SoTien,0.1); assert.equal(ct[1].SoTien,0.2);
  assert.equal(ct[0].SoTienQuyDoi,2615); assert.equal(ct[1].SoTienQuyDoi,5229);
  assert.equal(ctx.phatHienTienLe_(hs,ct).length,0);
  assert.equal(ctx.kiemTraTienDePhatHanh_({hoSo:hs,chiTiet:ct}).tong,0.3);
});
check('Ánh xạ chứng từ giữ cent và bằng chữ', () => {
  const hs=ctx.layHoSoTheoMa_(saved.maHoSo), ct=ctx.layChiTietTheoHoSo_(saved.maHoSo);
  const m=ctx.taoBienTienHoSo_({hoSo:hs,chiTiet:ct});
  assert.equal(m['HO_SO.SO_TIEN'],'0,3'); assert.match(m['HO_SO.SO_TIEN_BANG_CHU'],/ba mươi cent/);
  assert.equal(ctx.taoBienDong_(ct[0],1,'USD')['CT.SO_TIEN'],'0,1');
});
check('Lưu tổng sai hoặc USD quá hai số thập phân không thay dữ liệu', () => {
  const before=JSON.stringify(ctx.layHoSoTheoMa_(saved.maHoSo));
  assert.throws(()=>ctx.luuHoSoGiaiNgan({...pl,maHoSo:saved.maHoSo,expectedRevision:saved.revision,soTienNhanNoLanNay:0.31}));
  assert.throws(()=>ctx.luuHoSoGiaiNgan({...pl,maHoSo:saved.maHoSo,expectedRevision:saved.revision,chiTiet:[{soTien:'0,123'}]}));
  assert.equal(JSON.stringify(ctx.layHoSoTheoMa_(saved.maHoSo)),before);
});
console.log('TỔNG: ' + n + ' nhóm kiểm thử USD cent đạt, 0 lỗi');
