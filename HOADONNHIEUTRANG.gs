/**
 * HOADONNHIEUTRANG.GS — đọc TÀI LIỆU NHIỀU TRANG (PDF scan / PDF điện tử / ảnh) thành danh sách CHỨNG TỪ, mỗi chứng từ 1 dòng.
 *
 * Luồng (giao diện điều khiển, máy chủ chỉ làm phần cần quyền Google):
 *   1) Trình duyệt dựng từng trang PDF thành ảnh + lấy lớp chữ của trang (pdf.js), gửi TỪNG TRANG lên docTrangTaiLieu().
 *   2) docTrangTaiLieu: lớp chữ đủ tốt thì dùng luôn (không OCR); không thì OCR ảnh trang bằng Google Drive (tiếng Việt).
 *   3) gomChungTuTuTrang: phân loại từng trang (đầu hóa đơn / trang tiếp theo / thông báo tiền điện / bảng bảo hiểm / khác),
 *      gom trang thành chứng từ (hóa đơn nhiều trang = 1 dòng), trích trường, tự kiểm (số tiền bằng chữ, trước thuế + thuế = tổng),
 *      đánh dấu hóa đơn đã có trong sổ. KHÔNG ghi gì — người dùng xem, sửa, chọn dòng rồi mới lưu.
 *   4) luuChungTuNhieuTrang: lưu file gốc 1 lần vào thư mục hồ sơ + mỗi chứng từ 1 dòng BangKeHoaDon (kèm trang từ–đến).
 *   5) doiChieuTaiLieuHoSo: đối chiếu chứng từ đã lưu với các dòng thụ hưởng của hồ sơ giải ngân về số tiền.
 *
 * Cách làm tham khảo HAK_OCR_ENGINE / HAK_LUONG_OFFLINE: dùng lớp chữ PDF trước OCR, đọc theo trang, luật kiểm nghiệp vụ (lệch tổng),
 * mức tin cậy, không tự lưu khi chưa được người dùng duyệt. OCR không bao giờ chính xác 100% — mọi trường đều sửa được trước khi lưu.
 */

var LOAI_CT_ = {
  HOA_DON_GTGT: 'Hóa đơn GTGT', HOA_DON_BAN_HANG: 'Hóa đơn bán hàng', HOA_DON: 'Hóa đơn',
  TIEN_DIEN: 'Thông báo tiền điện', BAO_HIEM: 'Bảng đóng bảo hiểm', KHAC: 'Tài liệu khác'
};
var TIN_CAY_ = { CAO: 'CAO', TRUNG_BINH: 'TRUNG_BINH', THAP: 'THAP' };
var COT_BANGKE_HOADON_MO_RONG_ = ['KyHieu', 'TienTruocThue', 'TienThue', 'TrangTu', 'TrangDen', 'LoaiChungTu', 'TinCay', 'CanhBao', 'MSTNguoiMua', 'NguonDoc',
  'Thang', 'SoLaoDong', 'MucLuongDongBH', 'DNDong', 'NLDDong']; // 5 cột cuối: bảng đóng bảo hiểm
var SHEET_TONGHOP_LUONG_BP = 'TongHopLuongBoPhan';
var COT_TONGHOP_LUONG_BP_ = ['MaTaiLieu', 'MaHoSo', 'Thang', 'BoPhan', 'SoNguoi', 'ThucLinh', 'BHXH', 'BHYT', 'BHTN', 'KPCD', 'NgayTaiLen'];

// ------------------------------------------------------------------ chữ: bỏ dấu GIỮ NGUYÊN độ dài để vị trí khớp chuỗi gốc
/** Bỏ dấu tiếng Việt từng ký tự, chữ thường; độ dài KHÔNG đổi (để tìm trên chuỗi đã bỏ dấu rồi cắt giá trị ở chuỗi gốc). */
function boDauGiuDoDai_(s) {
  s = String(s || '');
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c === 'đ' || c === 'Đ') { out += 'd'; continue; }
    var d = c.normalize('NFD').charAt(0);
    out += (d.length ? d : c).toLowerCase();
  }
  return out;
}
function chuanVanBan_(s) { return String(s || '').normalize('NFC').replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' '); }

// ------------------------------------------------------------------ số tiền
var RE_TIEN_ = /\d{1,3}(?:[.,]\d{3})+(?:,\d{1,2})?(?![\d])|\d{4,}(?![\d])/g;
/** Các số tiền (số nguyên VND) trong 1 đoạn, theo thứ tự xuất hiện. Bỏ số lẻ khác 0 (vd 18.998,02) vì không phải tiền. */
function cacSoTien_(doan) {
  var kq = [], m;
  RE_TIEN_.lastIndex = 0;
  while ((m = RE_TIEN_.exec(String(doan || '')))) {
    var raw = m[0];
    if (/,\d{1,2}$/.test(raw) && !/,0{1,2}$/.test(raw)) continue;
    var v = soTuChuoiTien_(raw);
    if (v > 0) kq.push(v);
  }
  return kq;
}

/**
 * Số tiền viết bằng chữ tiếng Việt → số nguyên ("Bốn mươi triệu bảy trăm mười sáu nghìn đồng chẵn" → 40716000). 0 nếu không đọc được.
 * Đơn vị lớn (nghìn / triệu / tỷ) tách theo cấp LỚN NHẤT trong đoạn: giá trị = (phần bên trái × cấp) + phần bên phải, nên đơn vị ghép đúng
 * ("một nghìn tỷ" = 1.000 × 10^9, "hai nghìn triệu" = 2 × 10^9). Cấp lớn nhất lặp lại trong cùng đoạn, hoặc kết quả vượt
 * Number.MAX_SAFE_INTEGER → không đọc được (0), không trả số sai.
 */
function docSoTienBangChu_(chuoi) {
  var tu = boDauGiuDoDai_(chuoi).replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(Boolean);
  var SO = { khong: 0, mot: 1, hai: 2, ba: 3, bon: 4, tu: 4, nam: 5, lam: 5, sau: 6, bay: 7, tam: 8, chin: 9 };
  var BO_QUA = { linh: 1, le: 1, dong: 1, chan: 1, vnd: 1, va: 1 };
  var BAC = { ty: 1e9, ti: 1e9, trieu: 1e6, nghin: 1e3, ngan: 1e3 };
  var CO_BAC = function (t) { return Object.prototype.hasOwnProperty.call(BAC, t); };
  var la = 0, coSo = false, hopLe = true;
  var nhomNho = function (ds) { // 0..999 từ các từ không chứa đơn vị lớn
    var nhom = 0, cho = null;
    ds.forEach(function (t) {
      if (Object.prototype.hasOwnProperty.call(SO, t)) { if (cho !== null) { nhom += cho; } cho = SO[t]; coSo = true; return; }
      if (t === 'muoi') { if (cho !== null && cho > 0) { nhom += cho * 10; } else { nhom += 10; } cho = null; coSo = true; return; }
      if (t === 'tram') { nhom += (cho === null ? 1 : cho) * 100; cho = null; coSo = true; return; }
      if (!BO_QUA[t]) la++;
    });
    return nhom + (cho || 0);
  };
  var goiHan = function (x) { if (!(x <= Number.MAX_SAFE_INTEGER)) hopLe = false; return x; };
  var doc = function (ds) {
    var bacLon = 0, vt = -1, soLan = 0, i;
    for (i = 0; i < ds.length; i++) if (CO_BAC(ds[i])) { if (BAC[ds[i]] > bacLon) { bacLon = BAC[ds[i]]; vt = i; soLan = 1; } else if (BAC[ds[i]] === bacLon) { soLan++; vt = i; } }
    if (!bacLon) return nhomNho(ds);
    if (soLan > 1) { hopLe = false; return 0; }
    var trai = ds.slice(0, vt), phai = ds.slice(vt + 1), coSoTrai = trai.some(function (t) { return Object.prototype.hasOwnProperty.call(SO, t) || t === 'muoi' || t === 'tram' || CO_BAC(t); });
    var giaTriTrai = coSoTrai ? doc(trai) : 1; // "nghìn đồng" = một nghìn
    var kq = goiHan(giaTriTrai * bacLon);
    return hopLe ? goiHan(kq + doc(phai)) : 0;
  };
  var kq = doc(tu);
  if (!coSo || la > 2 || !hopLe || !(kq <= Number.MAX_SAFE_INTEGER)) return 0;
  return kq;
}

// ------------------------------------------------------------------ phân loại trang
/** Loại 1 trang: { loai: 'HOA_DON'|'TIEP_THEO'|'KHAC', loaiChungTu } — dựa trên từ khóa đã bỏ dấu. */
function phanLoaiTrang_(vanBan) {
  var g = boDauGiuDoDai_(chuanVanBan_(vanBan));
  if (/tiep theo trang truoc/.test(g)) return { loai: 'TIEP_THEO', loaiChungTu: '' };
  if (/hoa\s*don\s*ban\s*hang/.test(g)) return { loai: 'HOA_DON', loaiChungTu: 'HOA_DON_BAN_HANG' };
  if (/hoa\s*don\s*gia\s*tri\s*gia\s*tang|vat\s*invoice|invoice\s*\(?\s*v\.?\s*a\.?\s*t/.test(g)) return { loai: 'HOA_DON', loaiChungTu: 'HOA_DON_GTGT' };
  if (/thong\s*bao\s*tien\s*dien/.test(g)) return { loai: 'KHAC', loaiChungTu: 'TIEN_DIEN' };
  if (/bao\s*hiem/.test(g) && /bhxh|bhyt|bhtn/.test(g)) return { loai: 'KHAC', loaiChungTu: 'BAO_HIEM' };
  if (/\bhoa\s*don\b/.test(g) && /ky\s*hieu/.test(g)) return { loai: 'HOA_DON', loaiChungTu: 'HOA_DON' };
  return { loai: 'KHAC', loaiChungTu: 'KHAC' };
}

// ------------------------------------------------------------------ trích trường
/** Phần còn lại của dòng sau vị trí i (chuỗi gốc), và dòng kế tiếp. */
function phanSauTrenDong_(goc, i) {
  var het = goc.indexOf('\n', i); if (het < 0) het = goc.length;
  var ke = goc.indexOf('\n', het + 1); if (ke < 0) ke = goc.length;
  return { dong: goc.substring(i, het), ke: goc.substring(het + 1, ke) };
}
/** Số tiền sau 1 nhãn: số CUỐI trên cùng dòng (bảng "Tổng cộng: trước thuế  thuế  tổng"), không có thì số đầu ở dòng kế. */
function tienSauNhan_(goc, gap, nhanList) {
  for (var k = 0; k < nhanList.length; k++) {
    var re = new RegExp(nhanList[k], 'g'), m;
    while ((m = re.exec(gap))) {
      var p = phanSauTrenDong_(goc, m.index + m[0].length);
      // OCR có thể nối nhãn thuế rỗng với nhãn tổng tiền trên cùng dòng.
      // Chỉ đọc phần trước nhãn tiếp theo, không lấy tiền của trường bên cạnh.
      var tachNhan = p.dong.replace(/^\s*\([^)]*\)\s*:?/, '').split(/(?:tổng\s*(?:cộng|số|tiền)|cộng\s*tiền|tiền\s*thuế|total\s*(?:amount|payment))/i);
      p.dong = tachNhan[0];
      var tren = cacSoTien_(p.dong);
      if (tren.length) return tren[tren.length - 1];
      if (tachNhan.length > 1) continue;
      // Dòng kế chỉ dùng khi nó CHỈ có số (OCR tách nhãn/giá trị); dòng kế có chữ là nhãn khác (vd ô thuế để trống, dòng dưới là tổng tiền).
      var duoi = cacSoTien_(p.ke);
      if (duoi.length && !/[a-z]{2}/.test(boDauGiuDoDai_(p.ke).replace(/\b(vnd|dong|d)\b/g, ''))) return duoi[0];
    }
  }
  return 0;
}
function chuanMST_(raw) {
  var s = String(raw || '').replace(/[\s.]/g, '');
  var m = s.match(/^(\d{10}|\d{12})(?:-(\d{3}))?$/);
  return m ? (m[1] + (m[2] ? '-' + m[2] : '')) : '';
}
function goc10MST_(mst) { return String(mst || '').split('-')[0]; }
function soHoaDonChuan_(s) { var d = String(s || '').replace(/\D/g, '').replace(/^0+/, ''); return d || (String(s || '').replace(/\D/g, '') ? '0' : ''); }

/**
 * Trích trường của 1 chứng từ từ văn bản (1 hoặc nhiều trang ghép). mstCongTy: danh sách MST công ty mình (để tách bên mua/bên bán).
 * Trả { kyHieu, soHoaDon, ngayHoaDon, mstBan, tenBan, mstMua, tenMua, tienTruocThue, tienThue, tongTien, tongBangChu, dienGiai }.
 */
function trichTruongChungTu_(vanBan, mstCongTy) {
  var goc = chuanVanBan_(vanBan), g = boDauGiuDoDai_(goc), m;
  var congTy = (mstCongTy || []).map(goc10MST_);
  var kq = { kyHieu: '', soHoaDon: '', ngayHoaDon: '', mstBan: '', tenBan: '', mstMua: '', tenMua: '', tienTruocThue: 0, tienThue: 0, tongTien: 0, tongBangChu: 0, dienGiai: '' };

  m = /ky\s*hieu[^:\n]{0,40}:\s*([0-9][0-9a-z]{4,7})\b/.exec(g);
  if (m) kq.kyHieu = goc.substr(m.index + m[0].length - m[1].length, m[1].length).toUpperCase();

  var reSo = /(?:^|[^a-z])so\s*(?:\((?:invoice\s*)?no\.?\))?\s*[:.]\s*0*(\d{1,8})(?![\da-z]|[.,]\d)/g, ungVien = [];
  while ((m = reSo.exec(g))) ungVien.push({ i: m.index, v: goc.substr(m.index + m[0].length - m[1].length, m[1].length) });
  if (ungVien.length) {
    var iKH = g.search(/ky\s*hieu/);
    ungVien.sort(function (a, b) { return iKH < 0 ? a.i - b.i : Math.abs(a.i - iKH) - Math.abs(b.i - iKH); });
    var raw = ungVien[0].v, mDu = goc.substr(ungVien[0].i).match(/0*\d{1,8}/);
    kq.soHoaDon = (mDu && soHoaDonChuan_(mDu[0]) === soHoaDonChuan_(raw)) ? mDu[0] : raw;
  }

  var tA = '\\s*(?:\\([a-z]+\\))?\\s*'; // nhãn tiếng Anh xen giữa: "Ngày (day) 20 tháng (month) 10 năm (year) 2026"
  m = new RegExp('ngay' + tA + ':?\\s*(\\d{1,2})' + '\\s*thang' + tA + '(\\d{1,2})' + '\\s*nam' + tA + '(\\d{4})').exec(g) || /ngay[^0-9\n]{0,25}(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(g);
  if (m) kq.ngayHoaDon = ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + m[3];

  var reMst = /(?:ma\s*so\s*thue|\bmst\b|tax\s*code)[^0-9\n]{0,30}(\d(?:[ .]?\d){9,11}(?:\s*-\s*\d(?:\s?\d){2})?)/g, dsMst = [];
  while ((m = reMst.exec(g))) { var v = chuanMST_(m[1]); if (v) dsMst.push({ i: m.index, v: v }); }
  var laCongTy = function (x) { return congTy.indexOf(goc10MST_(x)) >= 0; };
  var ban = dsMst.filter(function (x) { return !laCongTy(x.v); })[0] || (congTy.length ? null : dsMst[0]);
  var mua = dsMst.filter(function (x) { return laCongTy(x.v); })[0] || dsMst.filter(function (x) { return !ban || x.v !== ban.v; })[0];
  if (ban) kq.mstBan = ban.v;
  if (mua) kq.mstMua = mua.v;

  var layNhan = function (reNhan) {
    var mm = reNhan.exec(g); if (!mm) return '';
    var p = phanSauTrenDong_(goc, mm.index + mm[0].length);
    var v = p.dong.replace(/^\s*\([A-Za-z .\/]{2,30}\)\s*/, '').replace(/^[\s:.\-]+/, '').trim(); // bỏ nhãn tiếng Anh "(Seller)" rồi dấu ":"
    if (!v || /^\(?[a-z ]+\)?:?$/i.test(v)) v = p.ke.trim();
    return v.replace(/\s{2,}/g, ' ').substring(0, 150);
  };
  kq.tenBan = layNhan(/don\s*vi\s*ban(?:\s*hang)?|\(seller\)/);
  if (!kq.tenBan && ban) { // không có nhãn "Đơn vị bán": lấy dòng tên đơn vị gần nhất phía trên MST bên bán
    var truoc = goc.substring(0, ban.i).split('\n').reverse().slice(0, 8);
    [/c[oô]ng\s*ty|chi\s*nh[aá]nh|h[oộ]\s*kinh\s*doanh/i, /c[uử]a\s*h[aà]ng|đi[eệ]n\s*l[uự]c/i].some(function (re) { // ưu tiên "Công ty/Chi nhánh/Hộ KD" hơn tên đơn vị phụ
      for (var j = 0; j < truoc.length; j++) if (re.test(truoc[j])) { kq.tenBan = truoc[j].trim(); return true; }
      return false;
    });
  }
  kq.tenMua = layNhan(/ten\s*don\s*vi|don\s*vi\s*mua(?:\s*hang)?|don\s*vi\s*yeu\s*cau|\(buyer\)|khach\s*hang/);

  kq.tongTien = tienSauNhan_(goc, g, ['tong\\s*cong\\s*tien\\s*thanh\\s*toan', 'tong\\s*so\\s*tien\\s*thanh\\s*toan', 'tong\\s*tien\\s*thanh\\s*toan', 'total\\s*payment', 'total\\s*amount', 'tong\\s*cong\\s*:', 'cong\\s*tien\\s*thanh\\s*toan', 'so\\s*tien\\s*thanh\\s*toan']);
  kq.tienThue = tienSauNhan_(goc, g, ['tien\\s*thue\\s*gtgt', 'thue\\s*gtgt\\s*\\(dong\\)', 'thue\\s*gtgt\\s*:']);
  kq.tienTruocThue = tienSauNhan_(goc, g, ['cong\\s*tien\\s*hang\\s*truoc\\s*thue', 'cong\\s*tien\\s*hang', 'tong\\s*tien\\s*dien\\s*chua\\s*thue', 'tien\\s*giam\\s*dinh', 'thanh\\s*tien\\s*truoc\\s*thue']);
  if (!kq.tongTien && kq.tienTruocThue && !kq.tienThue) kq.tongTien = kq.tienTruocThue; // hóa đơn bán hàng: không thuế, tổng = cộng tiền hàng

  m = /(?:viet\s*)?bang\s*chu\s*(?:\((?:say|amount in words)\))?\s*:?|amount\s*in\s*words\s*:?/.exec(g);
  if (m) {
    var sau = g.substring(m.index + m[0].length, m.index + m[0].length + 260), het = sau.search(/dong\b/);
    kq.tongBangChu = docSoTienBangChu_(goc.substr(m.index + m[0].length, het >= 0 ? het + 4 : 200));
  }
  if (!kq.tongTien && kq.tongBangChu) kq.tongTien = kq.tongBangChu;
  boTienTuDongTong_(goc, g, kq);

  m = /ten\s*hang\s*hoa[^\n]*\n(?:[^\n]*\n){0,2}?\s*1\s+([^\n]*[a-z]{3}[^\n]*)/.exec(g); // dòng hàng số 1 (bỏ dòng đánh số cột "1 2 3 4 5 6=4x5")
  if (m) kq.dienGiai = goc.substr(m.index + m[0].length - m[1].length, m[1].length).replace(RE_TIEN_, '').replace(/\s{2,}/g, ' ').trim().substring(0, 160);
  return kq;
}

/**
 * OCR hay dàn bảng tổng thành 1 dòng nhãn "Cộng tiền hàng  Tiền thuế GTGT  Tổng cộng tiền thanh toán" rồi các số phía sau → nhãn nào
 * cũng lấy cùng số cuối (trước thuế = thuế = tổng). Khi 3 số không khớp: tìm trên 1 dòng (hoặc dòng + dòng kế) bộ (a, b, c) với
 * a + b = c và thuế b ≤ 10,5% a → trước thuế = a, thuế = b, tổng = c; ưu tiên bộ có c = tổng đã đọc, rồi c lớn nhất.
 * Ô "Tiền thuế GTGT" để trống (thuế suất KKKNT / KCT — không kê khai, không chịu thuế) thì nhãn thuế vớ phải số của dòng dưới:
 * thuế suất KKKNT/KCT → thuế = 0; thuế không thể ≥ tổng hay > 10,5% trước thuế → lấy tổng − trước thuế nếu hợp lý, không thì 0.
 */
function boTienTuDongTong_(goc, g, kq) {
  var t = kq.tienTruocThue, th = kq.tienThue, tg = kq.tongTien;
  if (th && /thue\s*suat[^\n0-9]{0,20}(kkknt|kct\b|khong\s*chiu\s*thue|khong\s*ke\s*khai)/.test(g)) { kq.tienThue = 0; return; }
  if ((!th && t) || !tg || (t && t + th === tg && t !== th)) return;
  var dong = goc.split('\n'), tot = null;
  for (var i = 0; i < dong.length; i++) {
    var ds = cacSoTien_(dong[i] + ' ' + (dong[i + 1] || ''));
    for (var x = 0; x < ds.length; x++) for (var y = 0; y < ds.length; y++) for (var z = 0; z < ds.length; z++) {
      var a = ds[x], b = ds[y], c = ds[z];
      if (x === y || y === z || x === z || !b || a + b !== c || b > a * 0.105 + 1) continue;
      var diem = (c === tg ? 2e15 : 0) + c;
      if (!tot || diem > tot.diem) tot = { a: a, b: b, c: c, diem: diem };
    }
  }
  if (tot) { kq.tienTruocThue = tot.a; kq.tienThue = tot.b; kq.tongTien = tot.c; return; }
  if (th >= tg || (t && th > t * 0.105 + 1)) kq.tienThue = (t && tg > t && tg - t <= t * 0.105 + 1) ? tg - t : 0;
}

/**
 * BẢNG ĐÓNG BẢO HIỂM: đọc dòng "TỔNG CỘNG" → mức lương đóng BH, DN đóng, NLĐ đóng, tổng nộp; tháng; số lao động.
 * Không phụ thuộc thứ tự cột (OCR bảng xoay ngang hay đảo cột): mức lương = số lớn nhất; tìm bộ (a, b, c) với a + b = c < mức lương
 * → DN = a (lớn hơn), NLĐ = b, tổng nộp = c. Tỷ lệ so với mức lương (thường 21,5% / 10,5%) chỉ dùng để cảnh báo.
 */
function trichBaoHiem_(vanBan) {
  var goc = chuanVanBan_(vanBan), g = boDauGiuDoDai_(goc), kq = { thang: '', soLaoDong: 0, mucLuong: 0, dnDong: 0, nldDong: 0, tongNop: 0 }, m;
  m = /thang\s*0?(\d{1,2})\s*\/\s*(\d{4})/.exec(g) || /thang\s*0?(\d{1,2})\s*nam\s*(\d{4})/.exec(g);
  if (m) kq.thang = ('0' + m[1]).slice(-2) + '/' + m[2];
  var reTong = /tong\s*cong/g, so = [];
  while ((m = reTong.exec(g))) {
    var p = phanSauTrenDong_(goc, m.index + m[0].length), ds = cacSoTien_(p.dong);
    if (ds.length < 4) ds = ds.concat(cacSoTien_(p.ke));
    if (ds.length > so.length) so = ds;
  }
  if (so.length >= 3) {
    kq.mucLuong = Math.max.apply(null, so);
    var con = so.filter(function (x) { return x < kq.mucLuong; }), tot = null;
    for (var i = 0; i < con.length; i++) for (var j = 0; j < con.length; j++) for (var k = 0; k < con.length; k++) {
      if (i === j || i === k || j === k || con[i] < con[j] || con[i] + con[j] !== con[k]) continue;
      if (!tot || con[k] > tot.c) tot = { a: con[i], b: con[j], c: con[k] };
    }
    if (tot) { kq.dnDong = tot.a; kq.nldDong = tot.b; kq.tongNop = tot.c; }
  }
  var reDong = /^\s*(\d{1,3})\s+[A-Za-zÀ-ỹĐđ]/gm, maxStt = 0;
  while ((m = reDong.exec(goc))) { var n = Number(m[1]); if (n > maxStt && n < 1000) maxStt = n; }
  kq.soLaoDong = maxStt;
  return kq;
}

/** Tự kiểm 1 chứng từ: mức tin cậy + cảnh báo (không chặn — người dùng quyết định). */
function kiemChungTu_(ct) {
  if (ct.loaiChungTu === 'BAO_HIEM') {
    var bh = ct.baoHiem || {}, cbBH = [];
    if (!bh.tongNop) cbBH.push('Chưa đọc được dòng "Tổng cộng" (DN đóng + NLĐ đóng = tổng nộp) — nhập tay tổng tiền');
    if (!bh.thang) cbBH.push('Chưa đọc được tháng đóng bảo hiểm');
    var tyLe = function (x) { return bh.mucLuong ? Math.round(x / bh.mucLuong * 1000) / 10 : 0; };
    if (bh.tongNop && (Math.abs(tyLe(bh.dnDong) - 21.5) > 0.2 || Math.abs(tyLe(bh.nldDong) - 10.5) > 0.2)) cbBH.push('Tỷ lệ DN ' + tyLe(bh.dnDong) + '% / NLĐ ' + tyLe(bh.nldDong) + '% khác mức thường gặp 21,5% / 10,5% — kiểm tra lại');
    return { tinCay: bh.tongNop ? (cbBH.length ? TIN_CAY_.TRUNG_BINH : TIN_CAY_.CAO) : TIN_CAY_.THAP, canhBao: cbBH };
  }
  var cb = [];
  if (ct.loai === 'HOA_DON') {
    if (!ct.soHoaDon) cb.push('Chưa đọc được số hóa đơn');
    if (!ct.mstBan) cb.push('Chưa đọc được MST bên bán');
    if (!ct.ngayHoaDon) cb.push('Chưa đọc được ngày hóa đơn');
  }
  if (!ct.tongTien) cb.push('Chưa đọc được tổng tiền');
  var khopChu = ct.tongTien && ct.tongBangChu && ct.tongTien === ct.tongBangChu;
  if (ct.tongTien && ct.tongBangChu && !khopChu) cb.push('Tổng tiền bằng số (' + ct.tongTien + ') khác bằng chữ (' + ct.tongBangChu + ') — kiểm tra lại');
  var khopThue = ct.tienTruocThue && ct.tienThue && ct.tongTien && ct.tienTruocThue + ct.tienThue === ct.tongTien;
  if (ct.tienTruocThue && ct.tienThue && ct.tongTien && !khopThue) cb.push('Trước thuế + thuế khác tổng tiền');
  var tc = TIN_CAY_.THAP;
  if (!cb.length && ct.tongTien && (khopChu || khopThue) && (ct.loai !== 'HOA_DON' || (ct.soHoaDon && ct.mstBan))) tc = TIN_CAY_.CAO;
  else if (ct.tongTien && (ct.loai !== 'HOA_DON' || ct.soHoaDon || ct.mstBan)) tc = TIN_CAY_.TRUNG_BINH;
  return { tinCay: tc, canhBao: cb };
}

/**
 * GOM TRANG → CHỨNG TỪ. dsTrang: [{ soTrang, vanBan }]. Mỗi trang đầu hóa đơn mở 1 chứng từ mới; trang "tiếp theo trang trước" nối vào chứng từ
 * trước; trang tài liệu khác cùng loại liền nhau (vd bảng bảo hiểm 2 trang) gom 1; trang khác loại đứng riêng. Trường được trích trên văn bản GHÉP
 * của cả chứng từ (tổng tiền thường ở trang cuối). Hàm thuần — không đọc/ghi Sheet.
 */
function gomTrangThanhChungTu_(dsTrang, mstCongTy) {
  var nhom = [];
  (dsTrang || []).slice().sort(function (a, b) { return a.soTrang - b.soTrang; }).forEach(function (t) {
    var pl = phanLoaiTrang_(t.vanBan), cuoi = nhom[nhom.length - 1];
    var noi = cuoi && (pl.loai === 'TIEP_THEO' || (pl.loai === 'KHAC' && cuoi.loai === 'KHAC' && (pl.loaiChungTu === cuoi.loaiChungTu || pl.loaiChungTu === 'KHAC')) ||
      // trang không rõ loại ngay sau 1 hóa đơn CHƯA thấy tổng tiền: phần còn lại của hóa đơn đó (không ghi "tiếp theo trang trước")
      (pl.loai === 'KHAC' && pl.loaiChungTu === 'KHAC' && cuoi.loai === 'HOA_DON' && !trichTruongChungTu_(cuoi.vanBan, mstCongTy).tongTien));
    if (noi) { cuoi.trangDen = t.soTrang; cuoi.vanBan += '\n' + t.vanBan; return; }
    nhom.push({ loai: pl.loai === 'TIEP_THEO' ? 'KHAC' : pl.loai, loaiChungTu: pl.loaiChungTu || 'KHAC', trangTu: t.soTrang, trangDen: t.soTrang, vanBan: String(t.vanBan || '') });
  });
  return nhom.map(function (n) {
    var ct = trichTruongChungTu_(n.vanBan, mstCongTy);
    ct.loai = n.loai; ct.loaiChungTu = n.loaiChungTu; ct.tenLoai = LOAI_CT_[n.loaiChungTu] || LOAI_CT_.KHAC; ct.trangTu = n.trangTu; ct.trangDen = n.trangDen;
    if (n.loaiChungTu === 'BAO_HIEM') { // bảng bảo hiểm không có số/MST hóa đơn: số tiền = tổng nộp ở dòng "Tổng cộng"
      ct.baoHiem = trichBaoHiem_(n.vanBan);
      ct.tongTien = ct.baoHiem.tongNop; ct.tienTruocThue = 0; ct.tienThue = 0; ct.soHoaDon = ''; ct.kyHieu = ''; ct.mstBan = ''; ct.tenBan = 'Bảo hiểm xã hội'; // bên nhận tiền là cơ quan BHXH, không phải công ty trên tiêu đề bảng
      ct.dienGiai = 'Đóng bảo hiểm' + (ct.baoHiem.thang ? ' tháng ' + ct.baoHiem.thang : '') + (ct.baoHiem.soLaoDong ? ' — ' + ct.baoHiem.soLaoDong + ' lao động' : '');
    }
    var k = kiemChungTu_(ct); ct.tinCay = k.tinCay; ct.canhBao = k.canhBao;
    return ct;
  });
}

/**
 * Điểm chất lượng chữ OCR của 1 trang (0–100+): tỷ lệ chữ có dấu tiếng Việt + từ khóa chứng từ. Trang scan bị XOAY NGANG thường OCR ra chữ rời rạc
 * không dấu → điểm thấp → giao diện dựng lại trang xoay 90°/270° rồi OCR lại, giữ bản điểm cao nhất.
 */
function diemVanBan_(vanBan) {
  var s = String(vanBan || ''), chu = (s.match(/[A-Za-zÀ-ỹĐđ]/g) || []).length;
  if (chu < 40) return 0;
  var coDau = (s.normalize('NFC').match(/[À-ỹĐđ]/g) || []).length, g = boDauGiuDoDai_(s), tuKhoa = 0;
  [/hoa\s*don/, /ma\s*so\s*thue/, /tong\s*cong/, /bao\s*hiem/, /thanh\s*toan/, /ho\s*(va\s*)?ten/, /dia\s*chi/, /so\s*tien/].forEach(function (re) { if (re.test(g)) tuKhoa++; });
  return Math.round(coDau / chu * 100) + tuKhoa * 8;
}
var DIEM_CHU_TOI_THIEU_ = 25;

/** Lớp chữ của PDF có dùng được thay OCR không: đủ dài, có dấu tiếng Việt, ít ký tự rác (PDF scan thường có lớp chữ OCR kém, vd "HoA Dor{ GrA"). */
function lopChuDungDuoc_(vanBan) {
  var s = String(vanBan || '');
  var chu = (s.match(/[A-Za-zÀ-ỹ]/g) || []).length;
  if (chu < 80) return false;
  var coDau = (s.normalize('NFC').match(/[À-ỹ]/g) || []).length, rac = (s.match(/[{}|~$\\^`]/g) || []).length;
  var g = boDauGiuDoDai_(s);
  return coDau / chu > 0.08 && rac / chu < 0.01 && /hoa\s*don|ma\s*so\s*thue|tong\s*(cong|tien)/.test(g);
}

// ================================================================== API (máy chủ)
var TRANG_ANH_TOI_DA_BYTE_ = 8 * 1024 * 1024, SO_TRANG_TOI_DA_ = 300;

/** OCR 1 ảnh trang bằng Google Drive (Drive API v2, tiếng Việt): Google Doc tạm → lấy chữ → bỏ vào thùng rác.
 *  mimeType của tệp tải lên phải là loại ẢNH gốc (image/jpeg|png); ghi 'application/vnd.google-apps.document' thì Drive
 *  từ chối "OCR is not supported for files of type ...google-apps.document". Drive tự đổi sang Google Doc khi ocr=true. */
/** Google giới hạn số lần OCR mỗi người dùng ("User rate limit exceeded for OCR"): lỗi tạm thời — máy chủ KHÔNG ngủ chờ
 *  (giữ quy tắc không sleep), chỉ gắn cờ gioiHan để trình duyệt giãn nhịp rồi gửi lại đúng trang đó. */
function laLoiGioiHanOCR_(e) { return /rate\s*limit|ratelimit|quota|too\s*many|\b429\b/i.test(String((e && e.message) || e)); }
function ocrAnhThanhVanBan_(blob) {
  var tam = null, mime = String((blob.getContentType && blob.getContentType()) || '').toLowerCase();
  if (!/^image\/|^application\/pdf$/.test(mime)) mime = 'image/jpeg';
  try {
    tam = Drive.Files.insert({ title: 'OCR_TAM_' + Date.now(), mimeType: mime }, blob, { ocr: true, ocrLanguage: 'vi' });
    return DocumentApp.openById(tam.id).getBody().getText();
  } finally {
    if (tam && tam.id) { try { DriveApp.getFileById(tam.id).setTrashed(true); } catch (e) { /* bỏ qua */ } }
  }
}

/** MST các công ty mình (Danh mục công ty) — để tách bên mua / bên bán. */
function dsMSTCongTy_() {
  try { return sheetToObjects_(SHEET_CONGTY).map(function (c) { return chuanMST_(c.MaSoThue) || String(c.MaSoThue || '').trim(); }).filter(Boolean); } catch (e) { return []; }
}

/**
 * ĐỌC 1 TRANG. trang = { soTrang, lopChu, anhBase64, mime }. Lớp chữ PDF đủ tốt → dùng luôn; không thì OCR ảnh trang.
 * Lỗi OCR trả mã lỗi để trình duyệt chờ/thử lại đúng trang; không dùng lớp chữ đã bị đánh giá kém.
 */
function docTrangTaiLieu(trang) {
  yeuCauDangNhap_();
  trang = trang || {};
  var soTrang = Math.max(1, Math.round(Number(trang.soTrang)) || 1), lopChu = String(trang.lopChu || '');
  if (lopChuDungDuoc_(lopChu)) return { soTrang: soTrang, nguon: 'LOP_CHU', vanBan: chuanVanBan_(lopChu) };
  var b64 = String(trang.anhBase64 || '');
  if (!b64) return { soTrang: soTrang, nguon: 'TRONG', vanBan: chuanVanBan_(lopChu), loi: 'Trang không có ảnh để OCR.' };
  var mime = /^image\/(jpeg|png)$/.test(String(trang.mime)) ? String(trang.mime) : 'image/jpeg';
  var bytes = Utilities.base64Decode(b64);
  if (bytes.length > TRANG_ANH_TOI_DA_BYTE_) throw new Error('Ảnh trang ' + soTrang + ' quá lớn (tối đa 8 MB).');
  try {
    var vb = chuanVanBan_(ocrAnhThanhVanBan_(Utilities.newBlob(bytes, mime, 'trang_' + soTrang + (mime === 'image/png' ? '.png' : '.jpg'))));
    var diem = diemVanBan_(vb);
    return { soTrang: soTrang, nguon: 'OCR', vanBan: vb, diem: diem, nenThuXoay: diem < DIEM_CHU_TOI_THIEU_ };
  } catch (e) {
    var msg = String((e && e.message) || e);
    var gioiHan = laLoiGioiHanOCR_(e);
    if (/Drive is not defined|accessNotConfigured|has not been used|API.*disabled/i.test(msg)) msg += ' (kiểm tra Drive API đã bật cho dự án Apps Script).';
    return { soTrang: soTrang, nguon: 'LOI', vanBan: '', gioiHan: gioiHan, maLoi: gioiHan ? 'OCR_RATE_LIMIT' : 'OCR_ERROR', thuLai: gioiHan,
      loi: gioiHan ? 'Google đang giới hạn số lần OCR. Các trang đã đọc được giữ lại; chờ rồi thử lại trang ' + soTrang + '.' : 'OCR trang ' + soTrang + ' lỗi: ' + msg };
  }
}

/** Khóa nhận diện 1 hóa đơn: MST bên bán (10 số gốc) + số hóa đơn bỏ số 0 đầu. Dòng cũ đọc từ XML lưu "KýHiệu-Số" nên lấy phần sau dấu "-" cuối. */
function khoaHoaDon_(mst, soHoaDon) {
  var so = soHoaDonChuan_(String(soHoaDon || '').split('-').pop());
  var g = goc10MST_(chuanMST_(mst) || String(mst || '').replace(/\D/g, ''));
  return (g && so) ? g + '|' + so : '';
}

/**
 * GOM CÁC TRANG ĐÃ ĐỌC thành chứng từ (mỗi chứng từ 1 dòng) + đánh dấu hóa đơn ĐÃ CÓ trong sổ (trùng). Không ghi gì.
 * dsTrang: [{ soTrang, vanBan }] (kết quả docTrangTaiLieu).
 */
function gomChungTuTuTrang(dsTrang) {
  yeuCauDangNhap_();
  if (!Array.isArray(dsTrang) || !dsTrang.length) throw new Error('Chưa có trang nào được đọc.');
  if (dsTrang.length > SO_TRANG_TOI_DA_) throw new Error('Tối đa ' + SO_TRANG_TOI_DA_ + ' trang mỗi lần.');
  var trang = dsTrang.map(function (t) { return { soTrang: Math.round(Number(t && t.soTrang)) || 0, vanBan: String((t && t.vanBan) || '').substring(0, 60000) }; });
  var ds = gomTrangThanhChungTu_(trang, dsMSTCongTy_());
  var daCo = {}, tepGom = tenTepTheoMaTaiLieu_();
  try { locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_BANGKE_HOADON), function (h) { return [h.MaHoSo, (tepGom[h.MaTaiLieu] || {}).maHoSo]; }).forEach(function (h) { var k = khoaHoaDon_(h.MST, h.SoHoaDon); if (k && !daCo[k]) daCo[k] = { maHoaDon: h.MaHoaDon, maHoSo: h.MaHoSo || '' }; }); } catch (e) { /* chưa có sổ */ }
  var trongTep = {};
  ds.forEach(function (ct) {
    var k = ct.loai === 'HOA_DON' ? khoaHoaDon_(ct.mstBan, ct.soHoaDon) : '';
    if (k && daCo[k]) { ct.trungVoi = daCo[k]; ct.canhBao.push('Hóa đơn này đã có trong sổ (' + daCo[k].maHoaDon + (daCo[k].maHoSo ? ', hồ sơ ' + daCo[k].maHoSo : '') + ')'); }
    if (k && trongTep[k]) ct.canhBao.push('Trùng với chứng từ trang ' + trongTep[k] + ' trong cùng tệp');
    if (k && !trongTep[k]) trongTep[k] = ct.trangTu;
  });
  return { soTrang: trang.length, chungTu: ds };
}

/**
 * LƯU: tệp gốc 1 lần (thư mục hồ sơ, hoặc thư mục chung khi hồ sơ chưa lưu) + mỗi chứng từ người dùng giữ lại 1 dòng BangKeHoaDon (kèm trang từ–đến,
 * ký hiệu, trước thuế, thuế, loại, mức tin cậy). tep = { ten, mime, base64 }; dsChungTu: các dòng đã xem/sửa trên giao diện.
 */
function luuChungTuNhieuTrang(maHoSo, tep, dsChungTu) {
  yeuCauDangNhap_();
  maHoSo = String(maHoSo || '').trim();
  if (maHoSo) { if (!layHoSoTheoMa_(maHoSo)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.'); chanNeuNgoaiPhamViHoSo_(maHoSo); }
  tep = tep || {};
  if (!tep.base64) throw new Error('Thiếu tệp gốc.');
  if (!Array.isArray(dsChungTu) || !dsChungTu.length) throw new Error('Chưa chọn chứng từ nào để lưu.');
  if (dsChungTu.length > SO_TRANG_TOI_DA_) throw new Error('Quá nhiều chứng từ trong 1 lần lưu.');
  var dong = dsChungTu.map(function (c, i) {
    var ten = 'Chứng từ ' + (i + 1);
    var tu = Math.max(1, Math.round(Number(c.trangTu)) || 1), den = Math.max(tu, Math.round(Number(c.trangDen)) || tu);
    var d = {
      KyHieu: String(c.kyHieu || '').trim().substring(0, 20), SoHoaDon: String(c.soHoaDon || '').trim().substring(0, 30), NgayHoaDon: String(c.ngayHoaDon || '').trim().substring(0, 20),
      TenNhaCungCap: String(c.tenBan || '').trim().substring(0, 200), MST: chuanMST_(c.mstBan) || String(c.mstBan || '').trim().substring(0, 20), MSTNguoiMua: chuanMST_(c.mstMua) || '',
      DienGiai: String(c.dienGiai || '').trim().substring(0, 300),
      SoTien: docTienNguyen_(c.tongTien, ten + ' — tổng tiền'), TienTruocThue: docTienNguyen_(c.tienTruocThue, ten + ' — tiền trước thuế'), TienThue: docTienNguyen_(c.tienThue, ten + ' — tiền thuế'),
      TrangTu: tu, TrangDen: den, LoaiChungTu: LOAI_CT_[c.loaiChungTu] ? c.loaiChungTu : 'KHAC', TinCay: TIN_CAY_[c.tinCay] ? c.tinCay : TIN_CAY_.THAP,
      CanhBao: (Array.isArray(c.canhBao) ? c.canhBao.join('; ') : String(c.canhBao || '')).substring(0, 500), NguonDoc: String(c.nguonDoc || 'OCR').substring(0, 20),
      Thang: '', SoLaoDong: '', MucLuongDongBH: '', DNDong: '', NLDDong: ''
    };
    if (c.loaiChungTu === 'BAO_HIEM' && c.baoHiem) {
      var bh = c.baoHiem;
      d.Thang = String(bh.thang || '').substring(0, 7); d.SoLaoDong = Math.max(0, Math.round(Number(bh.soLaoDong)) || 0);
      d.MucLuongDongBH = docTienNguyen_(bh.mucLuong, ten + ' — mức lương đóng BH'); d.DNDong = docTienNguyen_(bh.dnDong, ten + ' — DN đóng'); d.NLDDong = docTienNguyen_(bh.nldDong, ten + ' — NLĐ đóng');
    }
    return d;
  });
  var bytes = Utilities.base64Decode(String(tep.base64));
  if (bytes.length > 50 * 1024 * 1024) throw new Error('Tệp quá lớn (tối đa 50 MB).');
  var thuMucCha = maHoSo ? layThuMucHoSo_(maHoSo) : layThuMucChungChuaGanHoSo_();
  var it = thuMucCha.getFoldersByName('HoaDonGTGT'), thuMucCon = it.hasNext() ? it.next() : thuMucCha.createFolder('HoaDonGTGT');
  var file = thuMucCon.createFile(Utilities.newBlob(bytes, String(tep.mime || 'application/pdf'), String(tep.ten || 'chung_tu.pdf').substring(0, 150)));
  var kq = voiKhoa_(function () {
    var maTaiLieu = sinhMaTuDong_(SHEET_TAILIEU, 'TL', 4);
    themDongVaoCuoiThat_(getSS_().getSheetByName(SHEET_TAILIEU), [maTaiLieu, maHoSo, 'HoaDonGTGT', String(tep.ten || file.getName()), file.getUrl(), new Date()]);
    var sh = getSS_().getSheetByName(SHEET_BANGKE_HOADON), headers = damBaoCotSheet_(sh, COT_BANGKE_HOADON_MO_RONG_), ma = [];
    datCotThangDangChu_(sh);
    dong.forEach(function (d) {
      var maHoaDon = sinhMaTuDong_(SHEET_BANGKE_HOADON, 'HD', 5);
      var v = Object.assign({ MaHoaDon: maHoaDon, MaTaiLieu: maTaiLieu, MaHoSo: maHoSo, DocDuoc: (d.SoHoaDon || d.MST || d.SoTien) ? 'CO' : 'KHONG', NgayTaiLen: new Date() }, d);
      themDongVaoCuoiThat_(sh, headers.map(function (h) { return v[h] !== undefined ? v[h] : ''; }));
      ma.push(maHoaDon);
    });
    return { maTaiLieu: maTaiLieu, maHoaDon: ma };
  });
  dong.forEach(function (d) { if (d.MST && d.TenNhaCungCap && d.LoaiChungTu !== 'BAO_HIEM') { try { upsertKhachHangTheoMST_(d.MST, d.TenNhaCungCap); } catch (e) { /* không chặn */ } } });
  ghiNhatKy_(maHoSo, 'LUU_CHUNG_TU_NHIEU_TRANG', String(tep.ten || '') + ' | ' + dong.length + ' chứng từ | ' + kq.maTaiLieu);
  return { ok: true, maTaiLieu: kq.maTaiLieu, maHoaDon: kq.maHoaDon, soDong: dong.length, linkFile: file.getUrl(), tenFile: String(tep.ten || file.getName()) };
}

/**
 * Chuẩn hoá "tháng" về chuỗi MM/yyyy. Google Sheets tự đổi ô "09/2026" thành NGÀY (01/09/2026) nên đọc về là Date hoặc chuỗi
 * "Tue Sep 01 2026 00:00:00 GMT+0700 (...)" — đổi lại đúng tháng; chuỗi "9/2026" thành "09/2026"; giá trị khác giữ nguyên.
 */
function chuanThang_(v) {
  if (v === null || v === undefined || v === '') return '';
  var d = null;
  if (Object.prototype.toString.call(v) === '[object Date]') d = v;
  else if (/GMT|^[A-Za-z]{3} [A-Za-z]{3} \d{1,2} \d{4}/.test(String(v))) d = new Date(String(v));
  if (d) return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'MM/yyyy');
  var s = String(v).trim(), m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  return m ? ('0' + m[1]).slice(-2) + '/' + m[2] : s;
}
/** Cột "Thang" của sheet ghi dạng VĂN BẢN để Sheets không tự đổi "09/2026" thành ngày. */
function datCotThangDangChu_(sh) {
  try {
    var c = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].indexOf('Thang') + 1;
    if (c > 0) sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@');
  } catch (e) { /* định dạng không bắt buộc; đọc về vẫn được chuẩn hoá bởi chuanThang_ */ }
}

/**
 * Lọc theo HỒ SƠ CHA đang chọn (giao diện cha–con). loc undefined/null = giữ tất cả (hành vi cũ); chuỗi = chỉ dòng của đúng hồ sơ đó,
 * '' = dòng chưa gắn hồ sơ. Mã hồ sơ của dòng = MaHoSo trên dòng, trống thì lấy MaHoSo của tệp gốc. Luôn chạy SAU bộ lọc phạm vi công ty.
 */
function locTheoHoSoCha_(rows, loc, tep) {
  if (loc === undefined || loc === null) return rows;
  var ma = String(loc).trim();
  return (rows || []).filter(function (r) { return String(r.MaHoSo || (tep[r.MaTaiLieu] || {}).maHoSo || '').trim() === ma; });
}

/** Tên tệp theo mã tài liệu (TaiLieuDinhKem). */
function tenTepTheoMaTaiLieu_() {
  var m = {};
  try { sheetToObjects_(SHEET_TAILIEU).forEach(function (t) { m[t.MaTaiLieu] = { ten: String(t.TenFile || ''), link: String(t.LinkFile || ''), maHoSo: String(t.MaHoSo || '') }; }); } catch (e) { /* chưa có */ }
  return m;
}

/**
 * BẢNG TỔNG HỢP BẢNG LƯƠNG: mỗi tệp bảng lương đã tải 1 nhóm — tháng, số người, tổng tiền chuyển, số người có STK, hồ sơ;
 * kèm tổng theo BỘ PHẬN (từng sheet: số người, thực lĩnh, khấu trừ BHXH/BHYT/BHTN/KPCĐ phần NLĐ). Chỉ đọc.
 * maHoSo (tuỳ chọn): chỉ tệp của hồ sơ cha đó ('' = chưa gắn hồ sơ).
 */
function layTongHopBangLuong(maHoSo) {
  yeuCauDangNhap_();
  var tep = tenTepTheoMaTaiLieu_(), nhom = {}, thuTu = [], maCuaDong = function (d) { return [d.MaHoSo, (tep[d.MaTaiLieu] || {}).maHoSo]; };
  locTheoHoSoCha_(locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_BANGKE_LUONG), maCuaDong), maHoSo, tep).forEach(function (d) {
    var k = String(d.MaTaiLieu || '') + '|' + chuanThang_(d.Thang);
    if (!nhom[k]) { nhom[k] = { maTaiLieu: d.MaTaiLieu, maHoSo: d.MaHoSo || '', thang: chuanThang_(d.Thang), tenFile: (tep[d.MaTaiLieu] || {}).ten || '', soNguoi: 0, tongTien: 0, coSTK: 0, boPhan: [] }; thuTu.push(k); }
    var g = nhom[k]; g.soNguoi++; g.tongTien += Number(d.SoTien) || 0; if (String(d.SoTaiKhoan || '').trim()) g.coSTK++;
  });
  var bp = [];
  try { bp = locTheoHoSoCha_(locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_TONGHOP_LUONG_BP), maCuaDong), maHoSo, tep); } catch (e) { bp = []; }
  bp.forEach(function (b) {
    var k = String(b.MaTaiLieu || '') + '|' + chuanThang_(b.Thang);
    if (!nhom[k]) { nhom[k] = { maTaiLieu: b.MaTaiLieu, maHoSo: b.MaHoSo || '', thang: chuanThang_(b.Thang), tenFile: (tep[b.MaTaiLieu] || {}).ten || '', soNguoi: 0, tongTien: 0, coSTK: 0, boPhan: [] }; thuTu.push(k); }
    nhom[k].boPhan.push({ boPhan: String(b.BoPhan || ''), soNguoi: Number(b.SoNguoi) || 0, thucLinh: Number(b.ThucLinh) || 0, bhxh: Number(b.BHXH) || 0, bhyt: Number(b.BHYT) || 0, bhtn: Number(b.BHTN) || 0, kpcd: Number(b.KPCD) || 0 });
  });
  return thuTu.reverse().map(function (k) {
    var g = nhom[k], tl = g.boPhan.reduce(function (s, b) { return s + b.thucLinh; }, 0);
    g.tongThucLinhBoPhan = tl;
    g.khopBoPhan = !g.boPhan.length || !g.tongTien || tl === g.tongTien;
    return g;
  });
}

/**
 * BẢNG TỔNG HỢP BẢO HIỂM theo tháng — ĐỘC LẬP với bảng lương: chỉ lấy các dòng bảng đóng bảo hiểm (LoaiChungTu = BAO_HIEM) đọc từ PDF/ảnh (OCR)
 * hoặc nhập riêng (luuBaoHiemThuCong): số lao động, mức lương đóng BH, DN đóng, NLĐ đóng, tổng nộp. Chỉ đọc.
 * maHoSo (tuỳ chọn): chỉ dòng của hồ sơ cha đó ('' = chưa gắn hồ sơ).
 */
function layTongHopBaoHiem(maHoSo) {
  yeuCauDangNhap_();
  var tep = tenTepTheoMaTaiLieu_(), thang = {}, maCuaDong = function (d) { return [d.MaHoSo, (tep[d.MaTaiLieu] || {}).maHoSo]; };
  var lay = function (t) { t = chuanThang_(t) || '(chưa rõ tháng)'; if (!thang[t]) thang[t] = { thang: t, bangBH: [] }; return thang[t]; };
  locTheoHoSoCha_(locTaiLieuTheoPhamVi_(sheetToObjects_(SHEET_BANGKE_HOADON), maCuaDong), maHoSo, tep).filter(function (h) { return h.LoaiChungTu === 'BAO_HIEM'; }).forEach(function (h) {
    lay(h.Thang).bangBH.push({ maHoaDon: h.MaHoaDon, maHoSo: h.MaHoSo || '', tenFile: (tep[h.MaTaiLieu] || {}).ten || '', trang: h.TrangTu ? (String(h.TrangTu) === String(h.TrangDen) || !h.TrangDen ? String(h.TrangTu) : h.TrangTu + '–' + h.TrangDen) : '',
      soLaoDong: Number(h.SoLaoDong) || 0, mucLuong: Number(h.MucLuongDongBH) || 0, dnDong: Number(h.DNDong) || 0, nldDong: Number(h.NLDDong) || 0, tongNop: Number(h.SoTien) || 0, tinCay: h.TinCay || '',
      nguon: String(h.NguonDoc || 'OCR'), ghiChu: String(h.DienGiai || '') });
  });
  return Object.keys(thang).sort().reverse().map(function (k) {
    var t = thang[k], tong = function (f) { return t.bangBH.reduce(function (s, b) { return s + b[f]; }, 0); };
    t.tongBangBH = { soLaoDong: tong('soLaoDong'), dnDong: tong('dnDong'), nldDong: tong('nldDong'), tongNop: tong('tongNop') };
    return t;
  });
}

/**
 * NHẬP RIÊNG bảng đóng bảo hiểm của 1 tháng (khi không có PDF/ảnh để đọc OCR): thành 1 dòng BangKeHoaDon loại BAO_HIEM, nguồn "NHAP_TAY"
 * — hiện cùng bảng bảo hiểm với các dòng đọc từ OCR. p = { thang 'MM/yyyy', soLaoDong, mucLuong, dnDong, nldDong, ghiChu }. maHoSo trống = chưa gắn hồ sơ.
 */
function luuBaoHiemThuCong(maHoSo, p) {
  yeuCauDangNhap_();
  maHoSo = String(maHoSo || '').trim(); p = p || {};
  if (maHoSo) { if (!layHoSoTheoMa_(maHoSo)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.'); chanNeuNgoaiPhamViHoSo_(maHoSo); }
  else if (phamViCongTyNguoiDung_().length) throw new Error('Tài khoản bị giới hạn theo công ty: phải chọn hồ sơ để nhập bảo hiểm.');
  var thang = String(p.thang || '').trim();
  if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(thang)) throw new Error('Tháng bảo hiểm phải có dạng MM/yyyy (vd 10/2026).');
  var soLD = Number(p.soLaoDong);
  if (!isFinite(soLD) || soLD < 0 || Math.floor(soLD) !== soLD) throw new Error('Số lao động không hợp lệ.');
  var muc = docTienNguyen_(p.mucLuong || 0, 'Mức lương đóng BH'), dn = docTienNguyen_(p.dnDong || 0, 'DN đóng'), nld = docTienNguyen_(p.nldDong || 0, 'NLĐ đóng');
  if (muc < 0 || dn < 0 || nld < 0) throw new Error('Số tiền không hợp lệ (không được âm).');
  var maHoaDon = voiKhoa_(function () {
    var sh = getSS_().getSheetByName(SHEET_BANGKE_HOADON), headers = damBaoCotSheet_(sh, COT_BANGKE_HOADON_MO_RONG_);
    datCotThangDangChu_(sh);
    var ma = sinhMaTuDong_(SHEET_BANGKE_HOADON, 'HD', 5);
    var v = { MaHoaDon: ma, MaTaiLieu: '', MaHoSo: maHoSo, DocDuoc: 'CO', NgayTaiLen: new Date(), TenNhaCungCap: 'Bảo hiểm xã hội', SoTien: dn + nld,
      DienGiai: String(p.ghiChu || 'Nhập tay').trim().substring(0, 300), LoaiChungTu: 'BAO_HIEM', TinCay: TIN_CAY_.CAO, NguonDoc: 'NHAP_TAY',
      Thang: thang, SoLaoDong: soLD, MucLuongDongBH: muc, DNDong: dn, NLDDong: nld };
    themDongVaoCuoiThat_(sh, headers.map(function (h) { return v[h] !== undefined ? v[h] : ''; }));
    return ma;
  });
  ghiNhatKy_(maHoSo, 'NHAP_BAO_HIEM_THU_CONG', thang + ' | ' + soLD + ' lao động | DN ' + dn + ' | NLĐ ' + nld);
  return { ok: true, maHoaDon: maHoaDon, thang: thang };
}

/**
 * ĐỐI CHIẾU tài liệu (hóa đơn/chứng từ đã lưu của hồ sơ) với các dòng thụ hưởng của hồ sơ giải ngân về SỐ TIỀN.
 * Ghép: số hóa đơn có trong "Tài liệu số" của dòng → khớp; không có thì ghép theo đúng số tiền. Mỗi chứng từ 1 dòng kết quả,
 * dòng thụ hưởng chưa có chứng từ liệt kê riêng; dòng lương đối chiếu với tổng bảng lương đã tải. Chỉ đọc.
 */
function doiChieuTaiLieuHoSo(maHoSo) {
  yeuCauDangNhap_();
  maHoSo = String(maHoSo || '').trim();
  var hs = layHoSoTheoMa_(maHoSo);
  if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  chanNeuNgoaiPhamViHoSo_(maHoSo);
  var laUSD = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD';
  var chiTiet = layChiTietTheoHoSo_(maHoSo).map(function (c) {
    var tien = Number(c.SoTien) || 0, qd = Number(c.SoTienQuyDoi) || 0;
    return { stt: c.STT, nguoiHuong: String(c.TenNguoiHuong || ''), loaiChungTu: String(c.LoaiChungTu || ''), taiLieuSo: String(c.TaiLieuSo || ''),
      soTien: tien, soTienVND: laUSD ? qd : tien, laLuong: /l[uư][oơ]ng/i.test(String(c.LoaiChungTu || '')), daGhep: false };
  });
  var dsCT = sheetToObjects_(SHEET_BANGKE_HOADON).filter(function (h) { return String(h.MaHoSo) === maHoSo; }).map(function (h) {
    return { maHoaDon: h.MaHoaDon, kyHieu: String(h.KyHieu || ''), soHoaDon: String(h.SoHoaDon || ''), ngay: String(h.NgayHoaDon || ''), ncc: String(h.TenNhaCungCap || ''), mst: String(h.MST || ''),
      loai: LOAI_CT_[h.LoaiChungTu] || (h.LoaiChungTu ? String(h.LoaiChungTu) : LOAI_CT_.HOA_DON_GTGT),
      trang: h.TrangTu ? ((String(h.TrangTu) === String(h.TrangDen) || !h.TrangDen) ? String(h.TrangTu) : h.TrangTu + '–' + h.TrangDen) : '',
      tien: Number(h.SoTien) || 0, dong: [] };
  });
  var soTrongTaiLieu = function (s) { return (String(s).match(/\d+/g) || []).map(soHoaDonChuan_); };
  chiTiet.filter(function (c) { return !c.laLuong; }).forEach(function (c) {
    var so = soTrongTaiLieu(c.taiLieuSo), ungVien = dsCT.filter(function (h) { return h.soHoaDon && so.indexOf(soHoaDonChuan_(h.soHoaDon.split('-').pop())) >= 0; });
    if (ungVien.length > 1) ungVien = ungVien.filter(function (h) { return h.tien === c.soTienVND; }).concat(ungVien.filter(function (h) { return h.tien !== c.soTienVND; }));
    var h = ungVien[0];
    if (h) { h.dong.push(c); c.daGhep = true; c.cachGhep = 'SO_HOA_DON'; }
  });
  chiTiet.filter(function (c) { return !c.laLuong && !c.daGhep && c.soTienVND > 0; }).forEach(function (c) {
    var h = dsCT.filter(function (x) { return !x.dong.length && x.tien === c.soTienVND; })[0];
    if (h) { h.dong.push(c); c.daGhep = true; c.cachGhep = 'SO_TIEN'; }
  });
  var dongKQ = dsCT.map(function (h) {
    var tienHS = h.dong.reduce(function (s, c) { return s + c.soTienVND; }, 0);
    var tt = !h.dong.length ? 'CHUA_DUNG' : (tienHS === h.tien ? 'KHOP' : 'LECH');
    return { maHoaDon: h.maHoaDon, loai: h.loai, kyHieu: h.kyHieu, soHoaDon: h.soHoaDon, ngay: h.ngay, ncc: h.ncc, mst: h.mst, trang: h.trang, tienChungTu: h.tien,
      dongHoSo: h.dong.map(function (c) { return { stt: c.stt, nguoiHuong: c.nguoiHuong, soTien: c.soTien, soTienVND: c.soTienVND, cachGhep: c.cachGhep }; }),
      tienHoSo: tienHS, chenhLech: tienHS - h.tien, trangThai: tt };
  });
  var thieu = chiTiet.filter(function (c) { return !c.laLuong && !c.daGhep; }).map(function (c) { return { stt: c.stt, nguoiHuong: c.nguoiHuong, loaiChungTu: c.loaiChungTu, taiLieuSo: c.taiLieuSo, soTien: c.soTien, soTienVND: c.soTienVND }; });
  var coLuong = chiTiet.some(function (c) { return c.laLuong; });
  var luongHS = chiTiet.filter(function (c) { return c.laLuong; }).reduce(function (s, c) { return s + c.soTienVND; }, 0);
  var luongTL = sheetToObjects_(SHEET_BANGKE_LUONG).filter(function (d) { return String(d.MaHoSo) === maHoSo; }).reduce(function (s, d) { return s + (Number(d.SoTien) || 0); }, 0);
  var tongCT = dsCT.reduce(function (s, h) { return s + h.tien; }, 0), tongCTDung = dongKQ.filter(function (d) { return d.dongHoSo.length; }).reduce(function (s, d) { return s + d.tienChungTu; }, 0);
  var tongChiTiet = chiTiet.reduce(function (s, c) { return s + c.soTienVND; }, 0);
  return {
    maHoSo: maHoSo, loaiTien: laUSD ? 'USD' : 'VND', soTienHoSo: Number(hs.SoTienNhanNoLanNay) || 0, laUSD: laUSD,
    canhBaoTien: laUSD && chiTiet.some(function (c) { return !c.soTienVND; }) ? 'Hồ sơ USD: dòng thụ hưởng chưa có số tiền quy đổi VND nên chưa đối chiếu được số tiền với chứng từ (VND).' : '',
    dong: dongKQ, dongThieuChungTu: thieu,
    luong: { coDongLuong: coLuong, tienHoSo: luongHS, tienBangLuong: luongTL, chenhLech: luongHS - luongTL, khop: luongHS === luongTL },
    tong: { chungTu: tongCT, chungTuDaGhep: tongCTDung, chiTietHoSo: tongChiTiet, chenhLech: tongChiTiet - tongCTDung - (coLuong ? luongTL : 0),
      soKhop: dongKQ.filter(function (d) { return d.trangThai === 'KHOP'; }).length, soLech: dongKQ.filter(function (d) { return d.trangThai === 'LECH'; }).length,
      soChuaDung: dongKQ.filter(function (d) { return d.trangThai === 'CHUA_DUNG'; }).length, soThieu: thieu.length }
  };
}
