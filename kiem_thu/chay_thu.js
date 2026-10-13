/* Kiểm thử DOCX Template Engine ngoài Apps Script (Node.js). Dùng đúng mã nguồn *.gs trong repo.
 * Chạy: node kiem_thu/chay_thu.js <thư_mục_ra>      Sau đó: python3 kiem_thu/kiem_tra_docx.py <thư_mục_ra>
 * Cần: unzip, zip (để mở/đóng gói .docx). Không cần mạng. */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || path.join(GOC, 'kiem_thu', 'ket_qua'));
fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });

// ---- Nạp toàn bộ .gs vào 1 ngữ cảnh với vài stub tối thiểu của Apps Script ----
const ctx = vm.createContext({
  console, Math, Date, JSON, Number, String, Object, Array, RegExp, Error, BigInt, isNaN, isFinite, parseInt, parseFloat,
  Utilities: {
    formatDate: (d, tz, f) => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {}); return f === 'dd' ? p.day : f === 'MM' ? p.month : f === 'yyyy' ? p.year : `${p.day}/${p.month}/${p.year}`; },
    computeDigest: (alg, s) => Array.from(crypto.createHash('md5').update(s).digest()).map(b => b > 127 ? b - 256 : b),
    DigestAlgorithm: { MD5: 'MD5' }
  }
});
fs.readdirSync(GOC).filter(f => f.endsWith('.gs')).forEach(f => vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, { filename: f }));
const run = (code) => vm.runInContext(code, ctx);
ctx.__ = (n, ...a) => ctx[n](...a);

// ---- Dữ liệu thử ----
function taoDuLieu(loaiTien, soDong, tong, tyGia) {
  const usd = loaiTien === 'USD';
  const ds = [];
  if (soDong === 2 && usd) ds.push(10000, 15000);
  else { const co = Math.floor(tong / soDong); for (let i = 0; i < soDong; i++) ds.push(i === soDong - 1 ? tong - co * (soDong - 1) : co); }
  const tongKiem = ds.reduce((a, b) => a + b, 0);
  const hoSo = {
    MaHoSo: 'HS0001', MaHD: 'HD001', SoGiayNhanNo: '48/2026-09', NgayGiayNhanNo: '2026-09-14', DuNoHienTai: 1500000000,
    LoaiTien: loaiTien, TyGiaBan: usd ? tyGia : 0, SoTienNhanNoLanNay: tongKiem,
    SoTienBangChu: usd ? ctx.soTienUSDBangChu_(tongKiem) : ctx.soThanhChuVN(tongKiem),
    PhuongThucThanhToan: 'Chuyển khoản', MucDichSuDungVon: 'Thanh toán tiền keo nguyên liệu', ThoiHanChoVay_Ngay: 90,
    NgayGiaiNgan: '2026-09-15', NgayDenHan: '2026-12-14', TaiLieuChungMinhMucDich: 'Hóa đơn GTGT & hợp đồng mua bán đính kèm',
    NguoiLapBieu: 'Nguyễn Thị Kế Toán', SoThamChieu: 'TC-26-09', TrangThai: 'Nháp'
  };
  const chiTiet = ds.map((st, i) => ({
    MaHoSo: 'HS0001', STT: i + 1, TenNguoiHuong: `CÔNG TY TNHH NHÀ CUNG CẤP SỐ ${i + 1} & ĐỐI TÁC <A>`, SoTaiKhoan: '1234567' + String(i).padStart(3, '0'),
    TaiNganHang: 'Ngân hàng TMCP Ngoại thương Việt Nam - CN Quảng Nam', LoaiTien: loaiTien, NoiDungThanhToan: `Thanh toán tiền keo theo hóa đơn số ${100 + i}\ndòng 2 ghi chú`,
    LoaiChungTu: 'Thanh toán tiền hàng', SoTien: st, SoTienQuyDoi: usd ? ctx.quyDoiUSDSangVND_(st, tyGia) : st,
    ChuyenTienNhanh_24_7: 'N', TaiLieuSo: `HD${100 + i}`, NgayTaiLieu: '2026-09-1' + (i % 9), DonViLapTaiLieu: 'NCC', GhiChu: ''
  }));
  return {
    hoSo, chiTiet,
    hopDong: { SoHopDong: '0126/2026/HDTD-BIDV', NgayHopDong: '2026-01-05', TenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', ChiNhanh: 'Chi nhánh Quảng Nam', HanMucVay: 50000000000, 'LaiSuatTrongHan_%': 6.5, 'LaiSuatLaiChamTra_%': 9.75, KyHanTraGoc: 'Cuối kỳ', KyHanTraLai: 'Hàng tháng', SoHopDongKhungMBNT: 'A01/2026', NgayHopDongKhungMBNT: '2026-01-06' },
    congTy: { TenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', DiaChiTruSo: '123 Đường A, Đà Nẵng', DienThoai: '0236 111 222', NguoiDaiDien: 'Trần Văn Giám Đốc', ChucVu: 'Giám đốc', TaiKhoanVND: '5110000111', TaiKhoanUSD: '5110000222', MaCIF: '0312345678' }
  };
}

function unzipTo(file, dir) { fs.mkdirSync(dir, { recursive: true }); cp.execFileSync('unzip', ['-o', '-q', file, '-d', dir]); }
function walk(dir, base = dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name))]); }

function dienMau(mauFile, d, out) {
  const tmp = fs.mkdtempSync(path.join(RA, 'tmp_'));
  unzipTo(mauFile, tmp);
  const map = ctx.taoBienDayDu_(d, { homNay: '13/10/2026' });
  const dsDong = ctx.taoDanhSachBienDong_(d);
  const tong = { conLai: [], conNgoac: [], canhBao: [], soHangMau: 0, soHangTao: 0, phan: 0 };
  walk(tmp).filter(f => /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(f.replace(/\\/g, '/'))).forEach(f => {
    const p = path.join(tmp, f);
    const r = ctx.docxXuLyXml_(fs.readFileSync(p, 'utf8'), map, dsDong);
    fs.writeFileSync(p, r.xml);
    r.conLai.forEach(k => tong.conLai.push(k)); r.conNgoac.forEach(k => tong.conNgoac.push(f + ': ' + k)); r.canhBao.forEach(k => tong.canhBao.push(k));
    tong.soHangMau += r.soHangMau; tong.soHangTao += r.soHangTao; tong.phan++;
  });
  fs.rmSync(out, { force: true });
  cp.execFileSync('zip', ['-X', '-q', out, '[Content_Types].xml'], { cwd: tmp });
  cp.execFileSync('zip', ['-X', '-q', '-r', out, '.', '-x', '[Content_Types].xml'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  return { map, dsDong, tong };
}

const kich = [
  ['usd_1', 'DE_NGHI_USD', 'USD', 1, 25000], ['usd_2', 'DE_NGHI_USD', 'USD', 2, 25000], ['usd_5', 'DE_NGHI_USD', 'USD', 5, 25000], ['usd_20', 'DE_NGHI_USD', 'USD', 20, 25000],
  ['vnd_1', 'DE_NGHI_VND', 'VND', 1, 463520000], ['vnd_5', 'DE_NGHI_VND', 'VND', 5, 463520000], ['vnd_20', 'DE_NGHI_VND', 'VND', 20, 463520000],
  ['bangke_usd_5', 'BANG_KE_USD', 'USD', 5, 25000], ['bangke_usd_20', 'BANG_KE_USD', 'USD', 20, 25000], ['bangke_vnd_20', 'BANG_KE_VND', 'VND', 20, 463520000],
  ['unc_usd_1', 'UNC_USD_1_KHOAN', 'USD', 1, 25000], ['unc_vnd_1', 'UNC_VND_1_KHOAN', 'VND', 1, 463520000]
];
const TY_GIA = 26145.5;
const ketQua = [];
kich.forEach(([ten, mau, loai, n, tong]) => {
  const d = taoDuLieu(loai, n, tong, TY_GIA);
  ctx.kiemTraTienDePhatHanh_(d); // dữ liệu phải đạt kiểm tra phát hành
  const out = path.join(RA, ten + '.docx');
  const r = dienMau(path.join(GOC, 'mau_thu', mau + '.docx'), d, out);
  const exp = {
    ten, mau, loai, soDong: n, tongTien: tong, tongBangSo: ctx.formatSo_(tong), tongBangChu: r.map['HO_SO.SO_TIEN_BANG_CHU'],
    tongQuyDoi: loai === 'USD' ? ctx.quyDoiUSDSangVND_(tong, TY_GIA) : tong, tyGia: loai === 'USD' ? ctx.formatTyGia_(TY_GIA) : '',
    cacDong: r.dsDong.map(x => ({ soTien: x['CT.SO_TIEN'], quyDoi: x['CT.SO_TIEN_QUY_DOI'], ten: x['CT.TEN'] })),
    engine: { conLai: r.tong.conLai, conNgoac: r.tong.conNgoac, canhBao: r.tong.canhBao, soHangMau: r.tong.soHangMau, soHangTao: r.tong.soHangTao, phan: r.tong.phan }
  };
  fs.writeFileSync(path.join(RA, ten + '.json'), JSON.stringify(exp, null, 1));
  ketQua.push(`${ten}: phần xử lý=${r.tong.phan} hàng mẫu=${r.tong.soHangMau} hàng tạo=${r.tong.soHangTao} còn lại=[${r.tong.conLai}] ngoặc=[${r.tong.conNgoac.length}]`);
});
console.log(ketQua.join('\n'));
