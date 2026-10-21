/**
 * DOISOATSAOKE.GS — ĐỐI SOÁT SAO KÊ NGÂN HÀNG với xác nhận giải ngân và sổ trả nợ (CHỈ ĐỌC, không ghi gì).
 *
 * Người dùng dán nội dung sao kê (CSV/TSV, copy từ Excel/Internet Banking). Hệ thống nhận dạng cột theo tên tiêu đề (không dấu, không phân biệt hoa thường),
 * rồi ghép từng dòng sao kê với bản ghi trong hệ thống:
 *   • TIỀN VÀO (ghi có)  ↔ xác nhận giải ngân thực tế (SoThamChieuNH, SoTienThucTe, NgayThucTe)
 *   • TIỀN RA  (ghi nợ)  ↔ sổ trả nợ (SoThamChieu — các dòng trả gộp -P/-L/-G được cộng lại theo mã gốc)
 * Kết quả mỗi dòng: KHOP (trùng tham chiếu + số tiền) | LECH_SO_TIEN | GOI_Y (không trùng tham chiếu nhưng trùng số tiền + ngày ±3, duy nhất) |
 *   GOI_Y_NHIEU (nhiều ứng viên) | KHONG_CO (không có trong hệ thống). Bản ghi hệ thống nằm trong khoảng ngày của sao kê nhưng không thấy trên sao kê → THIEU_TREN_SAO_KE.
 */
var SAO_KE_TOI_DA_KY_TU_ = 400000, SAO_KE_TOI_DA_DONG_ = 3000, SAO_KE_LECH_NGAY_ = 3;
var NHAN_DOI_SOAT_ = { KHOP: 'Khớp', LECH_SO_TIEN: 'Lệch số tiền', GOI_Y: 'Gợi ý khớp', GOI_Y_NHIEU: 'Nhiều ứng viên', KHONG_CO: 'Không có trong hệ thống', THIEU_TREN_SAO_KE: 'Có trong hệ thống, không thấy trên sao kê' };

function khongDauThuong_(s) { return chuanKhongDau_(String(s || '')).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
/** Tách CSV có dấu nháy kép; dấu phân cách tự nhận (tab, ;, ,) theo dòng tiêu đề. */
function tachBangSaoKe_(text) {
  var dong = String(text || '').replace(/\r\n?/g, '\n').split('\n').filter(function (l) { return l.trim() !== ''; });
  if (!dong.length) return { dong: [], phanCach: ',' };
  var dau = dong[0], pc = [['\t', 0], [';', 0], [',', 0]];
  pc.forEach(function (p) { p[1] = dau.split(p[0]).length - 1; });
  pc.sort(function (a, b) { return b[1] - a[1]; });
  var sep = pc[0][1] > 0 ? pc[0][0] : ',';
  var tach = function (l) {
    var o = [], cur = '', q = false;
    for (var i = 0; i < l.length; i++) {
      var c = l[i];
      if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === sep) { o.push(cur); cur = ''; } else cur += c;
    }
    o.push(cur); return o.map(function (x) { return x.trim(); });
  };
  return { dong: dong.map(tach), phanCach: sep };
}
/** Số tiền kiểu VN/Anh: 1.234.567 | 1,234,567 | 1.234.567,89 | 1,234,567.89 | (1.000) | -1000 | 1000 VND. Rỗng → null. Sai → NaN. */
function docSoSaoKe_(v) {
  var goc = String(v === null || v === undefined ? '' : v).trim();
  if (goc !== '' && goc !== '-' && !/\d/.test(goc)) return NaN; // có chữ mà không có chữ số → sai
  var s = goc.replace(/[A-Za-z₫đĐ\s]/g, '');
  if (s === '' || s === '-') return null;
  var am = /^\(.*\)$/.test(s) || /^-/.test(s); s = s.replace(/[()\-+]/g, '');
  var dau = s.indexOf('.'), phay = s.indexOf(',');
  if (dau >= 0 && phay >= 0) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (phay >= 0) s = (s.split(',').length > 2 || /,\d{3}$/.test(s)) ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (dau >= 0) s = (s.split('.').length > 2 || /\.\d{3}$/.test(s)) ? s.replace(/\./g, '') : s;
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  var n = Number(s); return am ? -n : n;
}
function docNgaySaoKe_(v) {
  var s = String(v || '').trim(), m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}
var TIEU_DE_SAO_KE_ = {
  ngay: ['ngay', 'ngay gd', 'ngay giao dich', 'ngay hach toan', 'ngay hieu luc', 'date', 'transaction date', 'posting date', 'value date'],
  thamChieu: ['so tham chieu', 'tham chieu', 'ma gd', 'ma giao dich', 'so gd', 'so but toan', 'so chung tu', 'so ct', 'reference', 'ref', 'reference no', 'transaction no', 'trace no'],
  noiDung: ['noi dung', 'dien giai', 'mo ta', 'description', 'details', 'remarks', 'narrative'],
  ghiNo: ['ghi no', 'so tien ghi no', 'debit', 'rut ra', 'tien ra', 'chi', 'withdrawal', 'dr'],
  ghiCo: ['ghi co', 'so tien ghi co', 'credit', 'gui vao', 'tien vao', 'thu', 'deposit', 'cr'],
  soTien: ['so tien', 'amount', 'gia tri'],
  loaiTien: ['loai tien', 'tien te', 'currency', 'ccy']
};
/** Phân tích sao kê → {dong:[{stt, ngay, thamChieu, noiDung, huong:'RA'|'VAO', soTien, loaiTien}], loi:[...], cot:{...}}. */
function phanTichSaoKe_(text) {
  var t = String(text || '');
  if (t.trim() === '') throw new Error('Chưa dán nội dung sao kê.');
  if (t.length > SAO_KE_TOI_DA_KY_TU_) throw new Error('Sao kê quá dài (tối đa ' + SAO_KE_TOI_DA_KY_TU_ + ' ký tự). Hãy chia nhỏ theo tháng.');
  var b = tachBangSaoKe_(t), loi = [];
  if (b.dong.length < 2) throw new Error('Cần ít nhất 1 dòng tiêu đề và 1 dòng giao dịch.');
  if (b.dong.length - 1 > SAO_KE_TOI_DA_DONG_) throw new Error('Tối đa ' + SAO_KE_TOI_DA_DONG_ + ' dòng giao dịch mỗi lần đối soát.');
  // tìm dòng tiêu đề trong 5 dòng đầu: dòng khớp nhiều tên cột nhất
  var tot = -1, dongTD = 0, cot = {};
  for (var r = 0; r < Math.min(5, b.dong.length); r++) {
    var c = {}, dem = 0;
    b.dong[r].forEach(function (h, i) {
      var k = khongDauThuong_(h);
      Object.keys(TIEU_DE_SAO_KE_).forEach(function (kh) { if (c[kh] === undefined && TIEU_DE_SAO_KE_[kh].indexOf(k) >= 0) { c[kh] = i; dem++; } });
    });
    if (dem > tot) { tot = dem; dongTD = r; cot = c; }
  }
  if (cot.ngay === undefined || (cot.soTien === undefined && cot.ghiNo === undefined && cot.ghiCo === undefined)) throw new Error('Không nhận ra tiêu đề cột. Cần tối thiểu cột Ngày và (Số tiền hoặc Ghi nợ/Ghi có). Các tên chấp nhận: Ngày, Số tham chiếu/Mã GD, Nội dung/Diễn giải, Ghi nợ, Ghi có, Số tiền, Loại tiền.');
  var dong = [];
  for (var i = dongTD + 1; i < b.dong.length; i++) {
    var x = b.dong[i], lay = function (k) { return cot[k] === undefined ? '' : (x[cot[k]] || ''); }, stt = i - dongTD;
    var ngay = docNgaySaoKe_(lay('ngay'));
    if (!ngay) { loi.push('Dòng ' + stt + ': ngày không hợp lệ "' + lay('ngay') + '".'); continue; }
    var no = cot.ghiNo !== undefined ? docSoSaoKe_(lay('ghiNo')) : null, co = cot.ghiCo !== undefined ? docSoSaoKe_(lay('ghiCo')) : null, st = cot.soTien !== undefined ? docSoSaoKe_(lay('soTien')) : null;
    if ([no, co, st].some(function (v) { return v !== null && isNaN(v); })) { loi.push('Dòng ' + stt + ': số tiền không hợp lệ.'); continue; }
    var huong, so;
    if (no && no > 0) { huong = 'RA'; so = no; } else if (co && co > 0) { huong = 'VAO'; so = co; }
    else if (st !== null && st !== 0) { huong = st < 0 ? 'RA' : 'VAO'; so = Math.abs(st); }
    else { loi.push('Dòng ' + stt + ': không có số tiền.'); continue; }
    var lt = String(lay('loaiTien') || '').toUpperCase().replace(/[^A-Z]/g, '');
    dong.push({ stt: stt, ngay: ngay, thamChieu: lay('thamChieu'), noiDung: lay('noiDung').substring(0, 200), huong: huong, soTien: so, loaiTien: lt === 'USD' ? 'USD' : (lt ? 'VND' : '') });
  }
  if (!dong.length) throw new Error('Không đọc được dòng giao dịch nào. ' + loi.slice(0, 3).join(' '));
  return { dong: dong, loi: loi.slice(0, 20), cot: cot };
}
function chuanThamChieu_(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function lechNgay_(a, b) { return Math.abs(soNgayGiuaIso_(a, b)); }

/**
 * Thuần: ghép sao kê với bản ghi hệ thống.
 * he = { giaiNgan:[{ma, maHoSo, ref, ngay, so, loai}], traNo:[{ma, maHoSo, ref (mã gốc), ngay, so (tổng các phần), loai}] }
 */
function doiSoatSaoKe_(dong, he, macDinhLoaiTien) {
  var dsHe = [];
  he.giaiNgan.forEach(function (r) { dsHe.push({ nguon: 'GIAI_NGAN', huong: 'VAO', r: r, dung: false, k: chuanThamChieu_(r.ref) }); });
  he.traNo.forEach(function (r) { dsHe.push({ nguon: 'TRA_NO', huong: 'RA', r: r, dung: false, k: chuanThamChieu_(r.ref) }); });
  var kq = dong.map(function (d) { return { d: d, ketQua: '', ung: null, goiY: [] }; });
  var loaiCua = function (d) { return d.loaiTien || macDinhLoaiTien || 'VND'; };
  var cung = function (e, d) { return e.huong === d.huong && (e.r.loai || 'VND') === loaiCua(d); };
  // 1) khớp theo tham chiếu
  kq.forEach(function (x) {
    var d = x.d, kd = chuanThamChieu_(d.thamChieu), nd = chuanThamChieu_(d.noiDung);
    var cs = dsHe.filter(function (e) { return !e.dung && cung(e, d) && e.k.length >= 4 && (e.k === kd || (kd && kd.indexOf(e.k) >= 0) || nd.indexOf(e.k) >= 0); });
    if (!cs.length) return;
    var kh = cs.filter(function (e) { return Math.abs(e.r.so - d.soTien) < 0.005; })[0] || cs[0];
    kh.dung = true; x.ung = kh;
    x.ketQua = Math.abs(kh.r.so - d.soTien) < 0.005 ? 'KHOP' : 'LECH_SO_TIEN';
  });
  // 2) gợi ý theo số tiền + ngày
  kq.forEach(function (x) {
    if (x.ketQua) return;
    var d = x.d, cs = dsHe.filter(function (e) { return !e.dung && cung(e, d) && Math.abs(e.r.so - d.soTien) < 0.005 && lechNgay_(e.r.ngay, d.ngay) <= SAO_KE_LECH_NGAY_; });
    if (cs.length === 1) { x.ketQua = 'GOI_Y'; x.ung = cs[0]; x.goiY = cs; }
    else if (cs.length > 1) { x.ketQua = 'GOI_Y_NHIEU'; x.goiY = cs; }
    else x.ketQua = 'KHONG_CO';
  });
  // GOI_Y chiếm bản ghi để dòng sau không gợi ý trùng
  kq.forEach(function (x) { if (x.ketQua === 'GOI_Y') x.ung.dung = true; });
  var tu = dong.reduce(function (a, d) { return !a || d.ngay < a ? d.ngay : a; }, ''), den = dong.reduce(function (a, d) { return !a || d.ngay > a ? d.ngay : a; }, '');
  var thieu = dsHe.filter(function (e) { return !e.dung && e.r.ngay >= tu && e.r.ngay <= den; });
  return { dong: kq, thieu: thieu, khoang: { tu: tu, den: den } };
}

/** Lấy bản ghi hệ thống trong phạm vi người dùng, đã chuẩn hoá cho doiSoatSaoKe_. */
function banGhiHeThongDoiSoat_() {
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), hsOK = {};
  docDanhSachHoSo_(false).forEach(function (h) { if (laDaXoa_(h.DaXoa)) return; var hd = tra.hd[String(h.MaHD)]; if (!pv.length || (hd && pv.indexOf(String(hd.MaCty)) >= 0)) hsOK[String(h.MaHoSo)] = h; });
  var gn = (getSS_().getSheetByName(SHEET_XAC_NHAN_GN) ? sheetToObjects_(SHEET_XAC_NHAN_GN) : []).filter(function (r) { return r.TrangThai === XN_HIEU_LUC && hsOK[String(r.MaHoSo)] && r.LoaiBanGhi === XN_LOAI_XAC_NHAN; })
    .map(function (r) { return { ma: String(r.MaXacNhan), maHoSo: String(r.MaHoSo), ref: String(r.SoThamChieuNH), ngay: ngayIsoCuaO_(r.NgayThucTe), so: Number(r.SoTienThucTe) || 0, loai: String(r.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND' }; });
  var nhom = {};
  docTraNo_().forEach(function (r) {
    if (r.TrangThai !== TRA_HIEU_LUC || !hsOK[String(r.MaHoSo)]) return;
    var goc = String(r.SoThamChieu).trim().replace(/-(P|L|G)$/i, ''), k = String(r.MaHoSo) + '|' + goc.toLowerCase() + '|' + ngayIsoCuaO_(r.NgayTra);
    var o = nhom[k] || (nhom[k] = { ma: String(r.MaTra), maHoSo: String(r.MaHoSo), ref: goc, ngay: ngayIsoCuaO_(r.NgayTra), so: 0, loai: String(r.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND', phan: [] });
    o.so = congSoTien_(o.so, Number(r.SoTien) || 0); o.phan.push(r.LoaiTra);
  });
  return { giaiNgan: gn, traNo: Object.keys(nhom).map(function (k) { return nhom[k]; }) };
}
/**
 * API: đối soát sao kê (chỉ đọc).
 * @param {string} text nội dung sao kê dán vào
 * @param {{loaiTien:string=}} tuyChon loại tiền mặc định khi sao kê không có cột loại tiền ('VND' hoặc 'USD')
 */
function doiSoatSaoKe(text, tuyChon) {
  yeuCauDangNhap_();
  var lt = String((tuyChon || {}).loaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
  var p = phanTichSaoKe_(text), he = banGhiHeThongDoiSoat_(), r = doiSoatSaoKe_(p.dong, he, lt);
  var dem = {}; r.dong.forEach(function (x) { dem[x.ketQua] = (dem[x.ketQua] || 0) + 1; }); if (r.thieu.length) dem.THIEU_TREN_SAO_KE = r.thieu.length;
  return { loaiTienMacDinh: lt, khoang: r.khoang, loiPhanTich: p.loi, dem: dem, nhan: NHAN_DOI_SOAT_,
    dong: r.dong.map(function (x) {
      return { stt: x.d.stt, ngay: x.d.ngay, thamChieu: x.d.thamChieu, noiDung: x.d.noiDung, huong: x.d.huong, soTien: x.d.soTien, loaiTien: x.d.loaiTien || lt, ketQua: x.ketQua, nhanKetQua: NHAN_DOI_SOAT_[x.ketQua],
        ungVien: x.ung ? { nguon: x.ung.nguon, maHoSo: x.ung.r.maHoSo, ma: x.ung.r.ma, ref: x.ung.r.ref, ngay: x.ung.r.ngay, soTien: x.ung.r.so, chenhLech: x.ketQua === 'LECH_SO_TIEN' ? x.d.soTien - x.ung.r.so : 0 } : null,
        soUngVien: x.goiY.length };
    }),
    thieuTrenSaoKe: r.thieu.map(function (e) { return { nguon: e.nguon, maHoSo: e.r.maHoSo, ma: e.r.ma, ref: e.r.ref, ngay: e.r.ngay, soTien: e.r.so, loaiTien: e.r.loai, huong: e.huong }; }) };
}
