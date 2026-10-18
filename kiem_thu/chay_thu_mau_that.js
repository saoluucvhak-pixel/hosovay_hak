/* Chạy engine trên 5 MẪU THẬT (mau_that/*) với dữ liệu thử (USD 25.000 / VND), 1–20 người thụ hưởng.
 * node kiem_thu/chay_thu_mau_that.js <thư_mục_ra>  →  python3 kiem_thu/kiem_tra_mau_that.py <thư_mục_ra> */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_mau_that'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const ctx = vm.createContext({ console, Math, Date, JSON, Number, String, Object, Array, RegExp, Error, BigInt, isNaN, isFinite, parseInt, parseFloat,
  Utilities: { formatDate: () => '13/10/2026', computeDigest: () => [1], DigestAlgorithm: { MD5: 'MD5' } } });
fs.readdirSync(GOC).filter(f => f.endsWith('.gs')).forEach(f => vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, { filename: f }));

function duLieu(loaiTien, n, tong) {
  const d = ctx.layDuLieuThuNghiem_(loaiTien, n);
  // ép đúng tổng mong muốn (25.000 USD) và dữ liệu công ty/hợp đồng thật-giống
  const usd = loaiTien === 'USD', co = Math.floor(tong / n);
  d.chiTiet.forEach((c, i) => { c.SoTien = i === n - 1 ? tong - co * (n - 1) : co; c.SoTienQuyDoi = usd ? ctx.quyDoiUSDSangVND_(c.SoTien, 25810) : c.SoTien; });
  d.hoSo.TyGiaBan = usd ? 25810 : 0; d.hoSo.SoTienNhanNoLanNay = tong;
  d.hoSo.SoTienBangChu = usd ? ctx.soTienUSDBangChu_(tong) : ctx.soThanhChuVN(tong);
  Object.assign(d.congTy, { TenCty: 'CÔNG TY TNHH HOÀNG ANH KHÔI', DiaChiTruSo: 'Thửa đất số 1182, tờ bản đồ số 38, thôn Thạch Nham Tây, xã Bà Nà, Đà Nẵng', MaSoThue: '0401447476', DienThoai: '0913.413.214', NguoiDaiDien: 'Võ Văn Phụng', ChucVu: 'Giám đốc', TaiKhoanVND: '562.0.727.934', TaiKhoanUSD: '562.0.011.163' });
  Object.assign(d.hopDong, { TenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', ChiNhanh: 'Chi nhánh Quảng Nam', SoHopDong: '02/2026/8100173/HĐTD', NgayHopDong: '2026-09-04', SoHopDongKhungMBNT: '01/2026/MBNT/BIDV-HAK', NgayHopDongKhungMBNT: '2026-01-05',
    DiaChiChiNhanh: 'Xã Xuân Phú, thành phố Đà Nẵng', DienThoaiNH: '0235.3687888', GiayUyQuyenNH: '993/GUQ-BIDV.QNA ngày 01/07/2026' });
  d.hoSo.SoGiayNhanNo = '02.25/2026/8100173/HĐTD'; d.hoSo.NgayGiaiNgan = '2026-10-13'; d.hoSo.ThoiHanChoVay_Ngay = 178; d.hoSo.TaiLieuChungMinhMucDich = 'Hóa đơn GTGT';
  d.chiTiet.forEach((c, i) => { c.NgayTaiLieu = '2026-10-13'; c.TaiLieuSo = i === 0 ? 'UNC' : 'HĐ ' + (1000 + i); c.TenNguoiHuong = i === 0 ? 'CÔNG TY TNHH HOÀNG ANH KHÔI' : 'CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG ' + i; c.NoiDungThanhToan = i === 0 ? 'Giải ngân mua keo lá tràm' : 'Chuyển tiền bốc xếp theo hóa đơn ' + (12000 + i); });
  ctx.kiemTraTienDePhatHanh_(d);
  return d;
}

const WL = /^(\[Content_Types\]\.xml|xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|calcChain\.xml|worksheets\/sheet\d+\.xml)|word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml)$/;
function walk(dir, base = dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).replace(/\\/g, '/')]); }

function dien(mau, d, out) {
  const tmp = fs.mkdtempSync(path.join(RA, 'tmp_')); cp.execFileSync('unzip', ['-o', '-q', mau, '-d', tmp]);
  const map = ctx.taoBienDayDu_(d, { homNay: '13/10/2026' }), dsDong = ctx.taoDanhSachBienDong_(d);
  const xlsx = mau.endsWith('.xlsx'); let r;
  const phan = {}; walk(tmp).filter(f => WL.test(f)).forEach(f => { phan[f] = fs.readFileSync(path.join(tmp, f), 'utf8'); });
  if (xlsx) {
    const k = ctx.xlsxXuLyGoi_(phan, map, dsDong);
    Object.keys(k.phan).forEach(f => { if (k.phan[f] === null) fs.rmSync(path.join(tmp, f)); else fs.writeFileSync(path.join(tmp, f), k.phan[f]); });
    r = { conLai: k.conLai, conNgoac: k.conNgoac, canhBao: k.canhBao, soHangMau: k.soHangMau, soHangTao: k.soHangTao };
  } else {
    r = { conLai: [], conNgoac: [], canhBao: [], soHangMau: 0, soHangTao: 0 };
    Object.keys(phan).filter(f => /^word\//.test(f)).forEach(f => { const x = ctx.docxXuLyXml_(phan[f], map, dsDong); fs.writeFileSync(path.join(tmp, f), x.xml); r.conLai.push(...x.conLai); r.conNgoac.push(...x.conNgoac); r.canhBao.push(...x.canhBao); r.soHangMau += x.soHangMau; r.soHangTao += x.soHangTao; });
  }
  fs.rmSync(out, { force: true });
  cp.execFileSync('zip', ['-X', '-q', out, '[Content_Types].xml'], { cwd: tmp }); cp.execFileSync('zip', ['-X', '-q', '-r', out, '.', '-x', '[Content_Types].xml'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  return { map, dsDong, r };
}

const KB = [
  ['hdtd1_usd', 'HDTD_USD_1_KHOAN.docx', 'USD', 1], ['hdtd2_usd', 'HDTD_USD_NHIEU_KHOAN.docx', 'USD', 2], ['hdtd5_usd', 'HDTD_USD_NHIEU_KHOAN.docx', 'USD', 5], ['hdtd20_usd', 'HDTD_USD_NHIEU_KHOAN.docx', 'USD', 20],
  ['hdtd1_vnd', 'HDTD_VND_1_KHOAN.docx', 'VND', 1], ['hdtd2_vnd', 'HDTD_VND_NHIEU_KHOAN.docx', 'VND', 2], ['hdtd5_vnd', 'HDTD_VND_NHIEU_KHOAN.docx', 'VND', 5], ['hdtd20_vnd', 'HDTD_VND_NHIEU_KHOAN.docx', 'VND', 20],
  ['hdmb_usd', 'HDMB_USD.docx', 'USD', 5], ['unc1', 'UNC_1_KHOAN.xlsx', 'USD', 1], ['unc1_vnd', 'UNC_1_KHOAN.xlsx', 'VND', 1],
  ['bk1', 'BANG_KE_NHIEU_KHOAN.xlsx', 'USD', 1], ['bk2', 'BANG_KE_NHIEU_KHOAN.xlsx', 'USD', 2], ['bk5', 'BANG_KE_NHIEU_KHOAN.xlsx', 'USD', 5], ['bk20', 'BANG_KE_NHIEU_KHOAN.xlsx', 'USD', 20], ['bk20_vnd', 'BANG_KE_NHIEU_KHOAN.xlsx', 'VND', 20]
];
KB.forEach(([ten, mau, lt, n]) => {
  const tong = lt === 'USD' ? 25000 : 463520000, d = duLieu(lt, n, tong);
  const out = path.join(RA, ten + path.extname(mau));
  const x = dien(path.join(GOC, 'mau_that', mau), d, out);
  const tongQd = d.chiTiet.reduce((a, c) => a + c.SoTienQuyDoi, 0);
  fs.writeFileSync(path.join(RA, ten + '.json'), JSON.stringify({ ten, mau, loai: lt, soDong: n, tongTien: tong, tongBangSo: ctx.formatSo_(tong), tongQuyDoi: tongQd,
    tongBangChu: x.map['HO_SO.SO_TIEN_BANG_CHU'], cacDong: x.dsDong.map(c => ({ ten: c['CT.TEN_NGUOI_HUONG'], soTien: c['CT.SO_TIEN'], quyDoi: c['CT.SO_TIEN_QUY_DOI'] })), engine: x.r }, null, 1));
  console.log(`${ten}: hàng mẫu=${x.r.soHangMau} tạo=${x.r.soHangTao} còn lại=[${x.r.conLai}] ngoặc=${x.r.conNgoac.length} cảnh báo=${JSON.stringify(x.r.canhBao)}`);
});
