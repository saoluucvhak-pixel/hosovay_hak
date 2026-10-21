/* BỘ MẪU THẬT: hồ sơ 1 món / 2 món / nhiều món.
 *   1 món  → 1 UNC (UNC_1_KHOAN, mẫu thật).
 *   2 món  → HAI UNC RIÊNG, mỗi món 2 liên (UNC_2_KHOAN, sinh từ mẫu thật bằng kiem_thu/tao_mau_unc_2_khoan.py) = 4 khối UNC, 2 trang A4, mỗi trang 2 liên của 1 món.
 *   ≥3 món → Bảng kê (BANG_KE_NHIEU_KHOAN, mẫu thật).
 * Dịch vụ Apps Script GIẢ LẬP; PDF do LibreOffice tạo (không phải Google). Kiểm tra cả USD có số lẻ, tiền bằng chữ tiếng Việt có dấu và định dạng ngày/số.
 * node kiem_thu/chay_unc_hai_khoan.js [thư_mục_ra] */
const fs = require('fs'), path = require('path'), cp = require('child_process'), assert = require('assert/strict');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_unc_hai_khoan'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const TI = require('./gia_lap_apps_script'); const { ctx, mt } = TI(GOC, path.join(RA, '_tam'));
TI.khachHangDungRevision(ctx);
const G = mt.__; let ok = 0, loi = 0;
const dat = (t, f) => { try { f(); ok++; console.log('PASS ' + t); } catch (e) { loi++; console.log('FAIL ' + t + ' → ' + String(e.message).slice(0, 400)); } };
const b64 = (f) => fs.readFileSync(path.join(GOC, 'mau_that', f)).toString('base64');
const idUrl = (u) => String(u).split('/').pop();
ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx); G.props['ADMIN_EMAILS'] = 'ketoan@example.com';
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HOÀNG ANH KHÔI', maCIF: '0401447476', maSoThue: '0401447476', diaChiTruSo: 'Thôn Thạch Nham Tây, xã Bà Nà, Đà Nẵng', dienThoai: '0913000000', nguoiDaiDien: 'Nguyễn Văn A', chucVu: 'Giám đốc', taiKhoanVND: '8619299999', taiKhoanUSD: '8619288888' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: '02/2026/HĐTD', ngayHopDong: '2026-09-04', tenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', chiNhanh: 'Chi nhánh Quảng Nam', hanMucVay: 50000000000, laiSuatTrongHan: 6.5, kyHanTraGoc: 'Cuối kỳ', kyHanTraLai: 'Hàng tháng' });
[['HDTD_USD_1', 'HDTD_USD_1_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '1'], ['HDTD_USD_N', 'HDTD_USD_NHIEU_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '2-999'], ['HDTD_VND_1', 'HDTD_VND_1_KHOAN.docx', 'VND', 'DE_NGHI_GIAI_NGAN', '1'], ['HDTD_VND_N', 'HDTD_VND_NHIEU_KHOAN.docx', 'VND', 'DE_NGHI_GIAI_NGAN', '2-999'],
  ['UNC_BIDV', 'UNC_1_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '1'], ['UNC_2_BIDV', 'UNC_2_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '2'], ['BANG_KE_BIDV', 'BANG_KE_NHIEU_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '3+'], ['HDMB_BIDV', 'HDMB_USD.docx', 'USD', 'HDMB_NGOAI_TE', '1+']]
  .forEach(([ma, f, lt, lct, dk]) => ctx.taiMauVanBan({ maMau: ma, tenMau: 'Mẫu thật ' + ma, nganHang: 'BIDV', loaiTien: lt, loaiTaiLieu: lct, dieuKienSoDong: dk, tenFile: f, macDinh: true }, b64(f)));
const tenNh = ['CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG', 'CÔNG TY TNHH NÔNG LÂM SẢN QUẢNG NAM', 'ĐẶNG THỊ MỸ LỆ', 'TRẦN VĂN BẢO', 'LÊ THỊ HƯƠNG'];
function taoHoSo(lt, tien) {
  const n = tien.length, tong = Math.round(tien.reduce((a, b) => a + b, 0) * 100) / 100;
  const chiTiet = tien.map((st, i) => ({ tenNguoiHuong: tenNh[i % tenNh.length], soTaiKhoan: '9000' + (100 + i), taiNganHang: 'BIDV - CN Quảng Nam', loaiTien: lt, noiDungThanhToan: 'Thanh toán đợt ' + (i + 1), loaiChungTu: 'Thanh toán tiền hàng', soTien: st, taiLieuSo: 'HD' + (i + 1), ngayTaiLieu: '15/10/2026' }));
  return ctx.luuHoSoGiaiNgan({ maHD: hd.maHD, soGiayNhanNo: 'GNN-' + lt + n, ngayGiayNhanNo: '2026-10-13', duNoHienTai: 0, loaiTien: lt, tyGiaBan: lt === 'USD' ? 25810 : 0, soTienNhanNoLanNay: tong, phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'Mua keo lá tràm', thoiHanChoVayNgay: 90, ngayGiaiNgan: '2026-10-15', ngayDenHan: '2027-01-13', taiLieuChungMinhMucDich: 'Hóa đơn', nguoiLapBieu: 'Lập', chiTiet });
}
const pdfText = (buf, tu, den) => { const f = path.join(RA, 'tam.pdf'); fs.writeFileSync(f, buf); return cp.execFileSync('pdftotext', ['-layout', '-f', String(tu), '-l', String(den), f, '-'], { encoding: 'utf8' }); };
const pdfTrang = (buf) => { const f = path.join(RA, 'tam.pdf'); fs.writeFileSync(f, buf); return Number(/Pages:\s+(\d+)/.exec(cp.execFileSync('pdfinfo', [f], { encoding: 'utf8' }))[1]); };
const dem = (s, t) => s.split(t).length - 1;

dat('Chọn mẫu theo số món: 1 → UNC_BIDV, 2 → UNC_2_BIDV (hai UNC riêng), 5 → BANG_KE_BIDV; tên tài liệu nói rõ "mỗi món 2 liên"', () => {
  const m1 = taoHoSo('VND', [12500000]).maHoSo, m2 = taoHoSo('VND', [12500000, 7300000]).maHoSo, m5 = taoHoSo('VND', [1, 2, 3, 4, 5].map(x => x * 1000000)).maHoSo;
  const ds = (ma) => ctx.layDanhSachChungTuHoSo(ma).find(x => x.loaiTaiLieu === 'CHUNG_TU_THANH_TOAN');
  assert.equal(ds(m1).maMau, 'UNC_BIDV'); assert.equal(ds(m2).maMau, 'UNC_2_BIDV'); assert.equal(ds(m5).maMau, 'BANG_KE_BIDV');
  assert.match(ds(m2).tenTaiLieu, /Hai ủy nhiệm chi riêng — mỗi món 2 liên/);
  assert.match(ctx.layDanhSachMauVanBan().find(m => m.maMau === 'UNC_2_BIDV').dieuKien, /^2$/);
});

dat('2 món VND: 2 UNC RIÊNG, mỗi món 2 liên — PDF 2 trang; trang 1 chỉ món 1 (×2 liên), trang 2 chỉ món 2 (×2 liên); không còn {{…}}', () => {
  const ma = taoHoSo('VND', [12500000, 7300000]).maHoSo;
  const R = ctx.taoTronBoTheoMau(ma);
  assert.equal(R.chungTuThanhToan.mau, 'UNC_2_BIDV'); assert.equal(R.chungTuThanhToan.loaiFile, 'xlsx');
  const pdf = G.dsFile[idUrl(R.chungTuThanhToan.pdfUrl)].blob.bytes;
  assert.equal(pdfTrang(pdf), 2, 'PDF phải đúng 2 trang A4');
  const t1 = pdfText(pdf, 1, 1), t2 = pdfText(pdf, 2, 2);
  assert.equal(dem(t1, 'ỦY NHIỆM CHI'), 2, 'trang 1 có 2 liên'); assert.equal(dem(t2, 'ỦY NHIỆM CHI'), 2, 'trang 2 có 2 liên');
  assert.equal(dem(t1, 'CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG'), 2); assert.equal(dem(t1, 'NÔNG LÂM SẢN'), 0, 'trang 1 không lẫn món 2');
  assert.equal(dem(t2, 'CÔNG TY TNHH NÔNG LÂM SẢN QUẢNG NAM'), 2); assert.equal(dem(t2, 'CẢNG ĐÀ NẴNG'), 0, 'trang 2 không lẫn món 1');
  fs.copyFileSync(path.join(RA, 'tam.pdf'), path.join(RA, 'unc_2_mon_vnd.pdf'));
  assert.equal(dem(t1, '12.500.000'), 2); assert.equal(dem(t2, '7.300.000'), 2);
  assert.match(t1, /Mười hai triệu, năm trăm ngàn đồng chẵn/); assert.match(t2, /Bảy triệu, ba trăm ngàn đồng chẵn/);
  assert.ok(!/\{\{|\}\}/.test(t1 + t2), 'không còn placeholder');
  assert.match(t1 + t2, /8619299999/, 'tài khoản trích nợ VND của công ty');
  fs.copyFileSync(path.join(RA, 'tam.pdf'), path.join(RA, 'unc_2_mon_vnd.pdf'));
});

dat('2 món USD có số lẻ (1.234,56 và 0,5): số tiền, loại tiền, tiền bằng chữ tiếng Việt có dấu đúng; tài khoản trích nợ USD', () => {
  const ma = taoHoSo('USD', [1234.56, 0.5]).maHoSo;
  const R = ctx.taoTronBoTheoMau(ma);
  assert.equal(R.chungTuThanhToan.mau, 'UNC_2_BIDV');
  const pdf = G.dsFile[idUrl(R.chungTuThanhToan.pdfUrl)].blob.bytes;
  const t1 = pdfText(pdf, 1, 1), t2 = pdfText(pdf, 2, 2); fs.copyFileSync(path.join(RA, 'tam.pdf'), path.join(RA, 'unc_2_mon_usd.pdf'));
  assert.equal(pdfTrang(pdf), 2);
  assert.equal(dem(t1, '1.234,56 USD'), 2); assert.equal(dem(t2, '0,5 USD'), 2);
  assert.match(t1, /Một ngàn, hai trăm ba mươi bốn đô la Mỹ và năm mươi sáu cent/);
  assert.match(t2, /Không đô la Mỹ và năm mươi cent/);
  assert.match(t1 + t2, /8619288888/, 'tài khoản trích nợ USD');
  assert.ok(!/\{\{|\}\}/.test(t1 + t2));
});

dat('1 món → UNC_1_KHOAN (1 UNC, mẫu thật, số tiền quy đổi); ≥3 món → Bảng kê; USD đủ Đề nghị + UNC/Bảng kê + HĐMB', () => {
  const R1 = ctx.taoTronBoTheoMau(taoHoSo('USD', [2500.25]).maHoSo);
  assert.equal(R1.chungTuThanhToan.mau, 'UNC_BIDV'); assert.ok(R1.hdmbNgoaiTe && R1.hdmbNgoaiTe.mau === 'HDMB_BIDV'); assert.equal(R1.vanBanDeNghi.mau, 'HDTD_USD_1');
  const R5 = ctx.taoTronBoTheoMau(taoHoSo('VND', [1000000, 2000000, 3000000, 4000000, 5000000]).maHoSo);
  assert.equal(R5.chungTuThanhToan.mau, 'BANG_KE_BIDV'); assert.equal(R5.vanBanDeNghi.mau, 'HDTD_VND_N');
  const t = pdfText(G.dsFile[idUrl(R5.chungTuThanhToan.pdfUrl)].blob.bytes, 1, 99);
  assert.match(t, /15[.,]000[.,]000/); assert.ok(!/\{\{|\}\}/.test(t));
});

dat('Mẫu UNC 2 món được nhận diện: điều kiện "2", tự gắn nhãn [UNC_2_MON], không cảnh báo thiếu hàng bảng', () => {
  const l = ctx.layDanhSachMauVanBan().find(m => m.maMau === 'UNC_2_BIDV');
  assert.equal(l.dieuKien, '2'); assert.doesNotMatch(l.canhBao, /KHÔNG có hàng bảng/);
  assert.match(ctx.docDanhSachMau_(true).find(m => m.MaMau === 'UNC_2_BIDV').GhiChu, /\[UNC_2_MON\]/);
});
console.log('\nTỔNG: ' + ok + ' kiểm tra mẫu thật 1/2/nhiều món đạt, ' + loi + ' lỗi. Tệp: ' + RA);
process.exit(loi ? 1 : 0);
