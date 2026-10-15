/* KIỂM TRA "ĐÓNG GÓI" KẾT QUẢ máy chủ → trình duyệt (google.script.run): giá trị Date, NaN/Infinity, hàm, BigInt, vòng lặp, undefined trong mảng
 * làm Apps Script trả về RỖNG/null mà không báo lỗi (nguyên nhân gốc đã biết của "có dữ liệu trên Sheet nhưng giao diện rỗng").
 * Gọi mọi hàm ĐỌC mà giao diện dùng trên dữ liệu có đủ cột ngày, rồi quét đệ quy kết quả.   node kiem_thu/chay_dong_goi.js <thư_mục_ra> */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_dong_goi'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
require('./gia_lap_apps_script').khachHangDungRevision(ctx); // trình duyệt đúng quy định: luôn gửi expectedRevision hiện hành
mt.__.props.ADMIN_EMAILS = 'ketoan@example.com'; ctx.initializeSpreadsheet();
const b64 = (f) => fs.readFileSync(path.join(GOC, 'mau_that', f)).toString('base64');
[['U1', 'HDTD_USD_1_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '1'], ['UNC', 'UNC_1_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '1'], ['HM', 'HDMB_USD.docx', 'USD', 'HDMB_NGOAI_TE', '1+']]
  .forEach(([ma, f, lt, l, dk]) => ctx.taiMauVanBan({ maMau: ma, tenMau: ma, loaiTien: lt, loaiTaiLieu: l, dieuKienSoDong: dk, tenFile: f }, b64(f)));
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY A', maCIF: '1', maSoThue: '0401447476', diaChiTruSo: 'Đà Nẵng', dienThoai: '0913', nguoiDaiDien: 'Võ Văn A', chucVu: 'GĐ', taiKhoanVND: '1', taiKhoanUSD: '2' });
const hd = ctx.luuHopDong({ maCty: cty.maCty, soHopDong: '02/2026/HĐTD', ngayHopDong: '2026-09-04', tenNganHang: 'BIDV', chiNhanh: 'Quảng Nam', hanMucVay: 5e10, ngayHopDongKhungMBNT: '2026-01-05', soHopDongKhungMBNT: 'K1' });
ctx.luuKhachHang({ tenKhachHang: 'NCC A', soTaiKhoan: '123', taiNganHang: 'NH' });
const hs = ctx.luuHoSoGiaiNgan({ maHD: hd.maHD, soGiayNhanNo: 'GNN1', ngayGiayNhanNo: '2026-10-13', duNoHienTai: 0, loaiTien: 'USD', tyGiaBan: 25810, soTienNhanNoLanNay: 25000, phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'x', thoiHanChoVayNgay: 90, ngayGiaiNgan: '2026-10-13', ngayDenHan: '2027-01-11', nguoiLapBieu: 'k',
  chiTiet: [{ tenNguoiHuong: 'NCC A', soTaiKhoan: '123', taiNganHang: 'NH', loaiTien: 'USD', noiDungThanhToan: 'x', soTien: 25000, taiLieuSo: 'HD1', ngayTaiLieu: '13/10/2026', chuyenTienNhanh: 'N' }] });
ctx.taoTronBoTheoMau(hs.maHoSo);

function quet(v, p, loi, thay = new Set()) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
  if (typeof v === 'number') { if (!isFinite(v)) loi.push(p + ' = ' + v + ' (NaN/Infinity)'); return; }
  if (typeof v === 'undefined') return;
  if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') { loi.push(p + ' kiểu ' + typeof v); return; }
  if (v instanceof Date) { loi.push(p + ' là Date (phải đổi sang chuỗi)'); return; }
  if (thay.has(v)) { loi.push(p + ' vòng lặp tham chiếu'); return; }
  thay.add(v);
  if (Array.isArray(v)) v.forEach((x, i) => { if (x === undefined) loi.push(p + '[' + i + '] undefined trong mảng'); quet(x, p + '[' + i + ']', loi, thay); });
  else if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null && !Array.isArray(v)) {
    // đối tượng từ vm context có prototype khác (cùng ý nghĩa object thường) -> vẫn quét
    Object.keys(v).forEach(k => quet(v[k], p + '.' + k, loi, thay));
  } else Object.keys(v).forEach(k => quet(v[k], p + '.' + k, loi, thay));
  thay.delete(v);
}

const CAC_HAM = [
  ['layDanhSachCongTy', []], ['layDanhSachHopDongDayDu', []], ['layDanhSachKhachHangDayDu', []], ['layToanBoHoSoGoc', []], ['locDanhSachHoSo', [{}]],
  ['layDanhSachMauVanBan', []], ['layLichSuChinhSuaMau', ['U1']], ['layLichSuPhatHanh', ['']], ['layLichSuPhatHanh', [hs.maHoSo]], ['layDanhSachChungTuHoSo', [hs.maHoSo]],
  ['layDanhMucPlaceholder', []], ['layDanhMucLoaiTaiLieu', []], ['layLoaiHoSoGiaiNgan', []], ['layDanhMucTaiLieuKem', []], ['layTrangThaiQuyen', []],
  ['layCauHinhHeThong', []], ['layBaoCaoTienVay', ['', '', '', '', '']], ['layDuLieuDayDu', [hs.maHoSo]], ['layNgayHomNay', []], ['layThongTinSpreadsheetDangDung', []],
  ['layCauHinhThuMucGoc', []], ['layLinkThuMucGoc', []], ['layLinkThuMucHoSo', [hs.maHoSo]], ['layTaiLieuTheoHoSo', [hs.maHoSo]], ['layTongHopHoSoVaTaiLieu', []],
  ['layBangTongHopHoaDon', []], ['layBangTongHopBangLuong', []], ['layDanhSachBangLuongDeChon', []], ['demTienLeLichSu', []], ['layThongKeTongQuan', []],
  ['xemTruocChungTu', [hs.maHoSo, 'CHUNG_TU_THANH_TOAN']], ['xemTruocMau', ['U1', 1, '']], ['kiemTraLaiMau', ['U1', 1]], ['layDanhSachTaiLieuTheoNhaCungCap', ['NCC A']]
];
let loiTong = 0, boQua = 0;
CAC_HAM.forEach(([ten, args]) => {
  if (typeof ctx[ten] !== 'function') { console.log(`  [BỎ QUA] ${ten}: không có hàm`); boQua++; return; }
  let kq;
  try { kq = ctx[ten].apply(null, args); } catch (e) { console.log(`  [BỎ QUA] ${ten}: gọi lỗi trong môi trường thử (${String(e.message).slice(0, 80)})`); boQua++; return; }
  const loi = []; quet(kq, ten, loi);
  const rong = (Array.isArray(kq) && kq.length === 0) ? ' (mảng rỗng — dữ liệu thử có thể chưa đủ)' : '';
  if (loi.length) { loiTong += loi.length; console.log(`  [LỖI] ${ten}: ${loi.slice(0, 4).join(' | ')}${loi.length > 4 ? ' …' : ''}`); }
  else console.log(`  [ĐẠT] ${ten}${rong}`);
});
console.log(`\nTỔNG: ${CAC_HAM.length} hàm đã thử, ${boQua} bỏ qua, ${loiTong} lỗi đóng gói`);
process.exit(loiTong ? 1 : 0);
