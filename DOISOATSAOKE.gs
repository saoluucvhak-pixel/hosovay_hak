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
/**
 * Số tiền kiểu VN/Anh, PHÂN TÍCH NGHIÊM NGẶT: 1.234.567 | 1,234,567 | 1.234.567,89 | 1,234,567.89 | 1 234 567 | (1.000) | -500 | 12,5 | 1000 VND | rỗng → null.
 * Dấu âm chỉ ở đầu (hoặc cả số nằm trong ngoặc); chữ chỉ là ký hiệu tiền ở đầu/cuối (VND, USD, ₫, đ); nhóm nghìn phải đủ 3 chữ số.
 * Mọi dạng không rõ nghĩa (VD "12-34", "1.2.3", "1,23,456", "--5", "5-") → NaN, KHÔNG tự đoán.
 */
function docSoSaoKe_(v) {
  var goc = String(v === null || v === undefined ? '' : v).replace(/\u00a0/g, ' ').trim();
  if (goc === '' || goc === '-') return null;
  var t = goc, am = false, m;
  if ((m = /^\(\s*(.*?)\s*\)$/.exec(t))) { am = true; t = m[1]; }
  t = t.replace(/^[A-Za-z₫đĐ]{1,4}\s*/, '').replace(/\s*[A-Za-z₫đĐ]{1,4}$/, '').trim();
  if ((m = /^([+-])\s*(.*)$/.exec(t))) { if (m[1] === '-') { if (am) return NaN; am = true; } t = m[2]; }
  var kyTu = null;
  if (/^\d+$/.test(t)) kyTu = t;
  else if (/^\d{1,3}( \d{3})+([.,]\d{1,4})?$/.test(t)) kyTu = t.replace(/ /g, '').replace(',', '.');
  else if ((m = /^\d{1,3}(\.\d{3})+(,\d{1,4})?$/.exec(t))) kyTu = t.replace(/\./g, '').replace(',', '.');   // 1.234.567[,89]
  else if ((m = /^\d{1,3}(,\d{3})+(\.\d{1,4})?$/.exec(t))) kyTu = t.replace(/,/g, '');                         // 1,234,567[.89]
  else if (/^\d+[.,]\d{1,2}$|^\d+[.,]\d{4}$/.test(t)) kyTu = t.replace(',', '.');                                // 12,5 | 12.50 (1–2 hoặc 4 số lẻ)
  if (kyTu === null || !/^\d+(\.\d+)?$/.test(kyTu) || String(t).indexOf('--') >= 0) return NaN;
  var n = Number(kyTu); return am ? -n : n;
}
function ngayHopLeSaoKe_(y, m, d) {
  y = Number(y); m = Number(m); d = Number(d);
  if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1)) return false;
  var cuoi = new Date(Date.UTC(y, m, 0)).getUTCDate(); // số ngày thật của tháng (kể cả năm nhuận)
  return d <= cuoi;
}
function docNgaySaoKe_(v) {
  var s = String(v || '').trim(), m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?!\d)/), y, mo, d;
  if (m) { y = m[1]; mo = m[2]; d = m[3]; }
  else { m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?!\d)/); if (!m) return ''; d = m[1]; mo = m[2]; y = m[3]; }
  return ngayHopLeSaoKe_(y, mo, d) ? y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2) : '';
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
    if (no && no > 0 && co && co > 0) { loi.push('Dòng ' + stt + ': có cả Ghi nợ và Ghi có trên cùng một dòng — không xác định được chiều giao dịch, cần kiểm tra thủ công.'); continue; }
    if (no && no > 0) { huong = 'RA'; so = no; } else if (co && co > 0) { huong = 'VAO'; so = co; }
    else if (st !== null && st !== 0) { huong = st < 0 ? 'RA' : 'VAO'; so = Math.abs(st); }
    else { loi.push('Dòng ' + stt + ': không có số tiền.'); continue; }
    var ltTho = chuanKhongDau_(String(lay('loaiTien') || '')).toUpperCase().replace(/[^A-Z]/g, ''), lt = '';
    if (ltTho) {
      if (ltTho === 'USD') lt = 'USD'; else if (ltTho === 'VND') lt = 'VND';
      else { loi.push('Dòng ' + stt + ': loại tiền "' + String(lay('loaiTien')).substring(0, 12) + '" chưa hỗ trợ (chỉ USD hoặc VND) — dòng bị bỏ qua, không tự quy đổi.'); continue; }
    }
    dong.push({ stt: stt, ngay: ngay, thamChieu: lay('thamChieu'), noiDung: lay('noiDung').substring(0, 200), huong: huong, soTien: so, loaiTien: lt });
  }
  if (!dong.length) throw new Error('Không đọc được dòng giao dịch nào. ' + loi.slice(0, 3).join(' '));
  return { dong: dong, loi: loi, cot: cot }; // KHÔNG cắt bớt: mọi dòng lỗi đều phải được báo cho người dùng
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
  // 2) gợi ý theo số tiền + ngày — GHÉP MỘT-MỘT: một bản ghi hệ thống chỉ được gợi ý cho MỘT dòng sao kê.
  //    Dòng nào có đúng 1 ứng viên và ứng viên đó KHÔNG cạnh tranh với dòng khác → GOI_Y; còn lại (nhiều ứng viên / nhiều dòng tranh cùng ứng viên) → GOI_Y_NHIEU (đối chiếu tay).
  var conLai = kq.filter(function (x) { return !x.ketQua; }), tranh = [];
  conLai.forEach(function (x) {
    var d = x.d; x.goiY = dsHe.filter(function (e) { return !e.dung && cung(e, d) && Math.abs(e.r.so - d.soTien) < 0.005 && lechNgay_(e.r.ngay, d.ngay) <= SAO_KE_LECH_NGAY_; });
    x.goiY.forEach(function (e) { e.soDongTranh = (e.soDongTranh || 0) + 1; });
  });
  conLai.forEach(function (x) {
    if (!x.goiY.length) x.ketQua = 'KHONG_CO';
    else if (x.goiY.length === 1 && x.goiY[0].soDongTranh === 1) { x.ketQua = 'GOI_Y'; x.ung = x.goiY[0]; x.ung.dung = true; }
    else x.ketQua = 'GOI_Y_NHIEU';
  });
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
