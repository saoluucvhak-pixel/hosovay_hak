/**
 * BAODAM.GS — TÀI SẢN BẢO ĐẢM và ĐIỀU KIỆN/CHỈ SỐ RÀNG BUỘC (covenant) gắn với hợp đồng vay.
 *
 * TÀI SẢN BẢO ĐẢM (sheet TaiSanBaoDam): đăng ký tài sản thế chấp/cầm cố gắn với hợp đồng, giá trị định giá (VND), hạn bảo hiểm;
 *   không xoá — "giải chấp" = đổi trạng thái. Tổng giá trị TSBĐ đang bảo đảm dùng để tính tỷ lệ dư nợ / giá trị tài sản.
 * ĐIỀU KIỆN RÀNG BUỘC (sheet DieuKienRangBuoc): chỉ tiêu có ngưỡng (≤ hoặc ≥). 3 loại:
 *   THU_CONG          — người dùng nhập giá trị theo kỳ (VD: doanh thu về BIDV ≥ 120% doanh số giải ngân, hệ số thanh toán ≥ 1,2)
 *   TY_LE_HAN_MUC     — tự tính: dư nợ ÷ hạn mức hợp đồng (%)
 *   TY_LE_VAY_TAI_SAN — tự tính: dư nợ ÷ tổng giá trị TSBĐ đang bảo đảm (%)
 *   Trạng thái: ĐẠT / SẮP VI PHẠM (còn trong 10% biên an toàn) / VI PHẠM / CHƯA CÓ DỮ LIỆU / QUÁ HẠN CẬP NHẬT (loại nhập tay, quá kỳ kiểm tra).
 */
var SHEET_TAI_SAN_BAO_DAM = 'TaiSanBaoDam';
var COT_TAI_SAN_ = ['MaTS', 'MaHD', 'LoaiTS', 'MoTa', 'GiaTriVND', 'NgayDinhGia', 'SoHDBaoDam', 'NgayHetHanBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'GiaiChapLuc', 'LyDoGiaiChap', 'NguyenGia', 'KhauHao', 'GiaTriConLai', 'Revision', 'KhoaYeuCau'];
var TS_DANG_BAO_DAM = 'Đang bảo đảm', TS_DA_GIAI_CHAP = 'Đã giải chấp';
var LOAI_TAI_SAN_ = { BDS: 'Bất động sản', DONG_SAN: 'Động sản / phương tiện / máy móc', TIEN_GUI: 'Tiền gửi / giấy tờ có giá', HANG_TON_KHO: 'Hàng tồn kho', KHAC: 'Khác' };
var SHEET_RANG_BUOC = 'DieuKienRangBuoc';
var COT_RANG_BUOC_ = ['MaRB', 'MaHD', 'TenChiTieu', 'Loai', 'ToanTu', 'Nguong', 'DonVi', 'KyKiemTraNgay', 'GiaTri', 'NgayCapNhat', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi'];
var LOAI_RANG_BUOC_ = { THU_CONG: 'Nhập tay theo kỳ', TY_LE_HAN_MUC: 'Tự tính: dư nợ / hạn mức (%)', TY_LE_VAY_TAI_SAN: 'Tự tính: dư nợ / giá trị TSBĐ (%)' };
var BIEN_AN_TOAN_RB_ = 0.1, NGAY_CB_BAO_HIEM_ = 15; // bảo hiểm tài sản: cảnh báo khi còn ≤ 15 ngày
/** BẢO HIỂM TÀI SẢN THẾ CHẤP — con của dòng đăng ký thế chấp (TaiSanBaoDam): hợp đồng bảo hiểm (ngày ký, công ty BH) + bảng con chi tiết tài sản được bảo hiểm. Không xoá: "hủy" = đổi trạng thái. */
var SHEET_BAO_HIEM_TS = 'BaoHiemTaiSan', SHEET_BAO_HIEM_TS_CT = 'BaoHiemTaiSanChiTiet';
var COT_BAO_HIEM_TS_ = ['MaBH', 'MaTS', 'SoHDBaoHiem', 'NgayKyHD', 'CongTyBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'HuyLuc', 'LyDoHuy', 'Revision', 'TheHe', 'SoDong', 'MaGD'];
var COT_BAO_HIEM_TS_CT_ = ['MaBH', 'STT', 'MaTaiSan', 'TenTaiSan', 'GiaTriBH', 'PhiBH', 'TienBH', 'TuNgay', 'DenNgay', 'TheHe'];
var BH_HIEU_LUC = 'Hiệu lực', BH_DA_HUY = 'Đã hủy';
/** Dấu vết giao dịch ghi hợp đồng bảo hiểm (chỉ thêm dòng, không sửa): cho phép xác minh/phục hồi khi kết quả ghi chưa xác định. */
var SHEET_GD_BH = 'GiaoDichBaoHiem';
var COT_GD_BH_ = ['MaGD', 'MaBH', 'MaTS', 'TheHeCu', 'TheHeMoi', 'RevisionCu', 'RevisionMoi', 'SoDongCu', 'SoDongMoi', 'TrangThai', 'ChaCu', 'NguoiGhi', 'ThoiDiemGhi', 'GhiChu'];

function hopDongTrongPhamVi_(maHD) {
  var tra = layTraCuuDanhMuc_(), hd = tra.hd[String(maHD)], pv = phamViCongTyNguoiDung_();
  if (!hd || (pv.length && pv.indexOf(String(hd.MaCty)) < 0)) throw new Error('Không tìm thấy hợp đồng ' + maHD + ' trong phạm vi được cấp.');
  return hd;
}
function docSoThuc_(v, ten, tu, den) {
  var s = String(v === null || v === undefined ? '' : v).trim().replace(/\s/g, '');
  if (s === '') throw new Error(ten + ' không được để trống.');
  if (/,/.test(s) && /\./.test(s)) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (/,/.test(s)) s = s.replace(',', '.');
  if (!/^-?\d+(\.\d{1,4})?$/.test(s)) throw new Error(ten + ' phải là số (tối đa 4 chữ số thập phân).');
  var n = Number(s);
  if (n < tu || n > den) throw new Error(ten + ' phải từ ' + tu + ' đến ' + den + '.');
  return n;
}
/* ===== BỘ NHỚ ĐỌC TRONG MỘT LẦN XỬ LÝ =====
 * Chỉ bật bên trong voiBoNhoBH_ (các hàm CHỈ ĐỌC tổng hợp). Khoá theo người dùng + phạm vi công ty, xoá sạch khi có bất kỳ thao tác ghi bảo hiểm/tài sản, và luôn tắt khi hàm kết thúc —
 * không giữ dữ liệu giữa hai lần gọi, không dùng chung giữa các phạm vi công ty. */
var _boNhoBH_ = null;
function khoaBoNhoBH_() { return (layDanhTinh_().email || emailNguoiDung_() || '') + '#' + phamViCongTyNguoiDung_().slice().sort().join(','); }
function voiBoNhoBH_(fn) {
  if (_boNhoBH_) return fn();
  _boNhoBH_ = { khoa: khoaBoNhoBH_(), ds: {} };
  try { return fn(); } finally { _boNhoBH_ = null; }
}
function xoaBoNhoBH_() { if (_boNhoBH_) { _boNhoBH_.ds = {}; _boNhoBH_.ngayThuc = null; } }
function docSheetBaoDam_(ten) {
  var bn = _boNhoBH_;
  if (bn && bn.ds[ten]) return bn.ds[ten];
  var kq = getSS_().getSheetByName(ten) ? sheetToObjects_(ten) : [];
  if (bn) bn.ds[ten] = kq;
  return kq;
}

/* ===== BỘ GHI THEO LÔ (đọc tiêu đề + vị trí dòng cuối đúng MỘT lần rồi tự theo dõi; ghi từng khối) ===== */
function boGhiBang_(ten, cot) {
  var sh = ensureSheet_(getSS_(), ten, cot);
  return { ten: ten, sh: sh, tieuDe: sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), cuoi: null, viTri: null, khoa: '', theHe: null };
}
function bgDongCuoi_(b) { if (b.cuoi === null) b.cuoi = timDongThatCuoiCung_(b.sh); return b.cuoi; }
/** Ghi liền các dòng (mảng object) vào cuối bảng bằng MỘT setValues; trả số dòng đầu. */
function bgNoi_(b, ds) {
  var dau = bgDongCuoi_(b) + 1, n = ds.length;
  var vals = ds.map(function (o) { return b.tieuDe.map(function (h) { return o.hasOwnProperty(h) ? o[h] : ''; }); });
  try { b.sh.getRange(dau, 1, n, b.tieuDe.length).setValues(vals); } catch (e) { b.cuoi = null; b.viTri = null; b.theHe = null; throw e; }
  b.cuoi = dau + n - 1;
  if (b.viTri) ds.forEach(function (o, i) { b.viTri[String(o[b.khoa])] = dau + i; });
  return dau;
}
/** Bản đồ khoá → số dòng (đọc bảng đúng một lần, đồng thời biết dòng cuối). */
function bgViTri_(b, khoa) {
  if (!b.viTri || b.khoa !== khoa) {
    var v = layGiaTriThatCuaSheet_(b.sh), c = v[0].map(String).indexOf(khoa); b.viTri = {}; b.khoa = khoa;
    var cuoi = 1; for (var i = 1; i < v.length; i++) { b.viTri[String(v[i][c])] = i + 1; if (v[i][0] !== '' && v[i][0] !== null) cuoi = i + 1; }
    b.cuoi = cuoi;
  }
  return b.viTri;
}
function bgCapNhat_(b, khoa, ma, cot) {
  var dong = bgViTri_(b, khoa)[String(ma)];
  if (!dong) throw new Error('Không tìm thấy bản ghi ' + ma + '.');
  ghiCotHoSo_(b.sh, b.tieuDe, dong, cot);
}
function bgDocKhoi_(b, dau, n) {
  var v = b.sh.getRange(dau, 1, n, b.tieuDe.length).getValues();
  return v.map(function (r) { var o = {}; b.tieuDe.forEach(function (h, i) { o[h] = r[i]; }); return o; });
}
function bgFlush_(bg) { if (!bg || !bg.batch) SpreadsheetApp.flush(); }

/** Ghi 1 dòng. Có boGhi = dùng bộ ghi theo lô (không quét lại bảng); không có = ghi lẻ như cũ. */
function ghiDongMoi_(ten, cot, o, boGhi) {
  xoaBoNhoBH_();
  if (boGhi) { bgNoi_(boGhi, [o]); return; }
  var sh = ensureSheet_(getSS_(), ten, cot), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  themDongVaoCuoiThat_(sh, headers.map(function (h) { return o.hasOwnProperty(h) ? o[h] : ''; }));
}
/** Ghi NHIỀU dòng liền nhau bằng một khối; trả số dòng đầu của khối. */
function ghiNhieuDong_(ten, cot, ds, boGhi) {
  xoaBoNhoBH_();
  return bgNoi_(boGhi || boGhiBang_(ten, cot), ds);
}
function capNhatDongTheoMa_(ten, khoa, ma, cot, boGhi) {
  xoaBoNhoBH_();
  if (boGhi) { bgCapNhat_(boGhi, khoa, ma, cot); return; }
  var sh = getSS_().getSheetByName(ten); if (!sh) throw new Error('Chưa có dữ liệu.');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], vals = layGiaTriThatCuaSheet_(sh), c = headers.indexOf(khoa), dong = -1;
  for (var i = 1; i < vals.length; i++) if (String(vals[i][c]) === String(ma)) { dong = i + 1; break; }
  if (dong < 0) throw new Error('Không tìm thấy bản ghi ' + ma + '.');
  ghiCotHoSo_(sh, headers, dong, cot); SpreadsheetApp.flush();
}
function maBaoDamMoi_(tienTo, ds, khoa) {
  var max = 0; ds.forEach(function (r) { var m = String(r[khoa]).match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  return tienTo + '-' + String(max + 1).padStart(4, '0');
}

/* ------------------------------ TÀI SẢN BẢO ĐẢM ------------------------------ */
/** Cộng/trừ ngày cho chuỗi yyyy-MM-dd (thuần, theo UTC). */
function bhCongNgay_(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function soTheHe_(v) { return Number(v) || 0; }

/* ===== THẾ HỆ CHI TIẾT BẢO HIỂM (phiên bản chờ) =====
 * Dòng chi tiết thuộc hợp đồng chỉ HIỂN THỊ khi TheHe của dòng = TheHe của hợp đồng cha. Sửa hợp đồng = ghi chi tiết ở thế hệ MỚI (vô hình) → cập nhật cha
 * (MỘT thao tác ghi 1 dòng, là điểm "chốt") → dọn thế hệ cũ. LockService chỉ chặn ghi đồng thời, KHÔNG phải giao dịch: ở bất kỳ bước nào lỗi,
 * người đọc vẫn thấy hoặc toàn bộ bản cũ, hoặc toàn bộ bản mới — không bao giờ lẫn cha cũ với con mới. Dữ liệu cũ chưa có cột TheHe coi là thế hệ 0 (tương thích). */
/** Các dòng chi tiết HIỆN HÀNH (đúng thế hệ của cha). Dòng mồ côi / thế hệ khác bị loại. */
function chiTietHienHanhBH_() {
  var cha = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
  return docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).filter(function (c) { var k = String(c.MaBH); return cha.hasOwnProperty(k) && soTheHe_(c.TheHe) === cha[k]; });
}
/** Đọc hợp đồng cha. bg (nếu có vị trí dòng đã biết) = đọc đúng 1 dòng; không thì quét bảng. Ném lỗi nếu không đọc được (người gọi phân biệt "không đọc được" với "không có"). */
function docChaBH_(ma, bg) {
  if (bg && bg.cha && bg.cha.viTri) { var dong = bg.cha.viTri[String(ma)]; if (!dong) return null; return bgDocKhoi_(bg.cha, dong, 1)[0]; }
  return docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (h) { return String(h.MaBH) === String(ma); })[0] || null;
}
/** Bộ ghi cho các bảng bảo hiểm (một lô). batch = true: không flush từng hợp đồng, dọn thế hệ cũ dồn một lượt cuối (donLoBH_). */
function taoBoGhiBH_(batch) {
  nangCapCauTrucBaoDam_();
  var bg = { batch: !!batch, cha: boGhiBang_(SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_), ct: boGhiBang_(SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_), gd: boGhiBang_(SHEET_GD_BH, COT_GD_BH_), donSau: [] };
  bgViTri_(bg.cha, 'MaBH');
  return bg;
}
/** Thế hệ đã dùng của từng hợp đồng (kể cả dòng ghi dở còn sót): { maBH: { thếHệ: số dòng } }. Đọc bảng chi tiết đúng một lần cho cả lô. Ném lỗi nếu không đọc được. */
function docTheHeDaDungBH_(bg) {
  if (!bg.ct.theHe) {
    var v = layGiaTriThatCuaSheet_(bg.ct.sh), h = (v[0] || []).map(String), cM = h.indexOf('MaBH'), cT = h.indexOf('TheHe'), m = {};
    var cuoi = 1; for (var i = 1; i < v.length; i++) { if (v[i][0] !== '' && v[i][0] !== null) cuoi = i + 1; var k = String(v[i][cM]); if (!k) continue; var g = soTheHe_(cT < 0 ? 0 : v[i][cT]); (m[k] = m[k] || {})[g] = (m[k][g] || 0) + 1; }
    bg.ct.theHe = m; bg.ct.cuoi = cuoi;
  }
  return bg.ct.theHe;
}
/** Xoá các dòng chi tiết của một hợp đồng rồi ĐỌC LẠI để xác minh. Không ném lỗi: { daDon, conLai, loi }.
 *  kieu 'DUNG' = đúng thế hệ theHe (phần ghi dở chắc chắn chưa chốt); 'NGOAI' = mọi thế hệ KHÁC theHe (sau khi theHe đã chốt và xác minh). cam = thế hệ TUYỆT ĐỐI không được đụng (đang hiển thị). */
function donChiTietBH_(ma, theHe, kieu, cam, bg) {
  var kq = { daDon: false, conLai: -1, loi: '' }, tg = soTheHe_(theHe);
  if (kieu === 'DUNG' && cam !== undefined && cam !== null && soTheHe_(cam) === tg) { kq.loi = 'từ chối: thế hệ ' + tg + ' đang hiển thị, không được xoá'; return kq; }
  var khop = function (maDong, g) { return String(maDong) === String(ma) && (kieu === 'NGOAI' ? g !== tg : g === tg); };
  try {
    xoaBoNhoBH_();
    var sh = getSS_().getSheetByName(SHEET_BAO_HIEM_TS_CT);
    if (sh && sh.getLastRow() >= 2) {
      var v = layGiaTriThatCuaSheet_(sh), h = v[0].map(String), cM = h.indexOf('MaBH'), cT = h.indexOf('TheHe');
      for (var r = v.length - 1; r >= 1; r--) if (khop(v[r][cM], soTheHe_(cT < 0 ? 0 : v[r][cT]))) xoaDongAnToan_(sh, r + 1);
    }
  } catch (e) { kq.loi = e.message; }
  try {
    kq.conLai = docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).filter(function (c) { return khop(c.MaBH, soTheHe_(c.TheHe)); }).length; kq.daDon = kq.conLai === 0;
  } catch (e2) { kq.loi = kq.loi || e2.message; }
  if (bg) { bg.ct.theHe = null; bg.ct.cuoi = null; }
  return kq;
}
function moTaDon_(d) { return d.daDon ? 'Phần ghi dở đã được dọn và xác minh sạch.' : 'Phần ghi dở CHƯA dọn được' + (d.conLai >= 0 ? ' (còn ' + d.conLai + ' dòng chi tiết không hiển thị)' : ' (không xác minh được)') + (d.loi ? ' — ' + d.loi : '') + '. Không ảnh hưởng dữ liệu đang xem; Quản trị chạy “Dọn dữ liệu bảo hiểm thừa” để xoá.'; }
/** Dọn dồn một lượt cuối lô: với mỗi hợp đồng đã chốt và xác minh, xoá mọi thế hệ khác thế hệ đã chốt. Đọc bảng chi tiết một lần, rồi đọc lại xác minh. { daXoa, conLai, loi }. */
function donLoBH_(bg) {
  var kq = { daXoa: 0, conLai: 0, loi: '' }, giu = {};
  bg.donSau.forEach(function (x) { giu[String(x.ma)] = soTheHe_(x.giu); });
  bg.donSau = [];
  if (!Object.keys(giu).length) return kq;
  var khop = function (ma, g) { return giu.hasOwnProperty(String(ma)) && g !== giu[String(ma)]; };
  try {
    xoaBoNhoBH_();
    var sh = getSS_().getSheetByName(SHEET_BAO_HIEM_TS_CT);
    if (sh && sh.getLastRow() >= 2) {
      var v = layGiaTriThatCuaSheet_(sh), h = v[0].map(String), cM = h.indexOf('MaBH'), cT = h.indexOf('TheHe'), xoa = [];
      for (var r = v.length - 1; r >= 1; r--) if (khop(v[r][cM], soTheHe_(cT < 0 ? 0 : v[r][cT]))) xoa.push(r + 1);
      for (var i = 0; i < xoa.length;) { // gộp các dòng liền nhau thành một lần xoá
        var j = i; while (j + 1 < xoa.length && xoa[j + 1] === xoa[j] - 1) j++;
        xoaDongAnToan_(sh, xoa[j], j - i + 1); kq.daXoa += j - i + 1; i = j + 1;
      }
    }
  } catch (e) { kq.loi = e.message; }
  try { kq.conLai = docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).filter(function (c) { return khop(c.MaBH, soTheHe_(c.TheHe)); }).length; } catch (e2) { kq.conLai = -1; kq.loi = kq.loi || e2.message; }
  bg.ct.theHe = null; bg.ct.cuoi = null;
  return kq;
}
/** Dấu vết giao dịch (chỉ thêm dòng). Trả true nếu ghi được. Không ném lỗi. */
function ghiDauVetBH_(bg, o) {
  try { ghiNhieuDong_(SHEET_GD_BH, COT_GD_BH_, [Object.assign({ NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), ThoiDiemGhi: new Date() }, o)], bg ? bg.gd : null); return true; } catch (e) { return false; }
}
function ghiDauVetBHNghiemNgat_(bg, o) { ghiNhieuDong_(SHEET_GD_BH, COT_GD_BH_, [Object.assign({ NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), ThoiDiemGhi: new Date() }, o)], bg.gd); }
/** Số dòng chi tiết theo (hợp đồng, thế hệ), đọc một lần. Dùng cho kiểm tra/phục hồi: { maBH: { thếHệ: [STT...] } }. */
function chiTietTheoTheHeBH_() {
  var m = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).forEach(function (c) { var k = String(c.MaBH), g = soTheHe_(c.TheHe); ((m[k] = m[k] || {})[g] = m[k][g] || []).push(Number(c.STT) || 0); });
  return m;
}
/** Thế hệ g của hợp đồng có ĐỦ chi tiết không: đúng số dòng cha đã ghi (SoDong; dữ liệu cũ chưa có SoDong thì cần ≥ 1 dòng) và STT liền từ 1. */
function theHeDuChiTietBH_(cha, stts) {
  stts = (stts || []).slice().sort(function (a, b) { return a - b; });
  if (!stts.length) return false;
  var dich = cha.SoDong === '' || cha.SoDong === null || cha.SoDong === undefined ? null : Number(cha.SoDong);
  if (dich !== null && stts.length !== dich) return false;
  return dich === null ? true : stts.every(function (s, i) { return s === i + 1; });
}
/** Số dòng chi tiết không hiển thị (mồ côi hoặc thế hệ khác). Không kiểm quyền (dùng nội bộ). */
function demChiTietThuaBH_() {
  var cha = {}, n = 0; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
  docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).forEach(function (c) { var k = String(c.MaBH); if (!cha.hasOwnProperty(k) || soTheHe_(c.TheHe) !== cha[k]) n++; });
  return n;
}
/** Hợp đồng mà thế hệ HIỆN HÀNH của cha thiếu chi tiết (cha trỏ thế hệ không đủ dòng): cần xác minh/phục hồi, TUYỆT ĐỐI không dọn thế hệ cũ của nó. */
function hopDongHongBH_() {
  var ct = chiTietTheoTheHeBH_(), hong = [];
  docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { var k = String(h.MaBH), g = soTheHe_(h.TheHe); if (!theHeDuChiTietBH_(h, (ct[k] || {})[g])) hong.push(k); });
  return hong;
}
/** Trạng thái toàn vẹn: số dòng chi tiết không hiển thị (mồ côi / thế hệ khác) và hợp đồng đang trỏ thế hệ thiếu chi tiết — cần xác minh/phục hồi khi có. */
function layTrangThaiToanVenBaoHiem() {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem trạng thái toàn vẹn bảo hiểm');
  var cha = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
  var moCoi = 0, cu = 0, can = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).forEach(function (c) { var k = String(c.MaBH); if (!cha.hasOwnProperty(k)) { moCoi++; can[k] = 1; } else if (soTheHe_(c.TheHe) !== cha[k]) { cu++; can[k] = 1; } });
  var hong = hopDongHongBH_(); hong.forEach(function (k) { can[k] = 1; });
  return { dongMoCoi: moCoi, dongTheHeCu: cu, hopDongHong: hong, canXacMinh: Object.keys(can).sort(), canPhucHoi: moCoi + cu + hong.length > 0 };
}
/** Xoá dòng chi tiết không hiển thị (mồ côi + thế hệ khác), CHỈ khi hợp đồng đó có thế hệ hiện hành ĐỦ chi tiết; hợp đồng hỏng bị bỏ qua (dùng xacMinhPhucHoiBaoHiem). Chỉ Quản trị. */
function donChiTietBaoHiemThua() {
  yeuCauDangNhap_(); yeuCauQuanTri_('dọn dữ liệu bảo hiểm thừa');
  return voiKhoa_(function () {
    var sh = getSS_().getSheetByName(SHEET_BAO_HIEM_TS_CT), xoa = 0, boQua = 0;
    if (sh && sh.getLastRow() >= 2) {
      var cha = {}, hong = {}; hopDongHongBH_().forEach(function (k) { hong[k] = 1; });
      docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
      var v = layGiaTriThatCuaSheet_(sh), h = v[0].map(String), cM = h.indexOf('MaBH'), cT = h.indexOf('TheHe');
      for (var r = v.length - 1; r >= 1; r--) {
        var k = String(v[r][cM]), g = soTheHe_(cT < 0 ? 0 : v[r][cT]);
        if (cha.hasOwnProperty(k) && hong[k]) { if (g !== cha[k]) boQua++; continue; }
        if (!cha.hasOwnProperty(k) || g !== cha[k]) { xoaDongAnToan_(sh, r + 1); xoa++; }
      }
    }
    xoaBoNhoBH_();
    ghiNhatKy_('', 'DON_BAO_HIEM_THUA', 'đã xoá ' + xoa + ' dòng chi tiết không hiển thị' + (boQua ? ', giữ ' + boQua + ' dòng của hợp đồng đang cần phục hồi' : ''));
    return { daXoa: xoa, giuLaiViCanPhucHoi: boQua, conLai: layTrangThaiToanVenBaoHiem() };
  });
}
/**
 * XÁC MINH / PHỤC HỒI một hợp đồng sau khi kết quả ghi CHƯA XÁC ĐỊNH (hoặc dữ liệu hỏng). Chỉ Quản trị; idempotent; mọi thay đổi ghi dấu vết (GiaoDichBaoHiem + nhật ký).
 *  DA_CHOT          — cha trỏ thế hệ đủ chi tiết; (nếu có) đã dọn các thế hệ khác.
 *  CHUA_CHOT_DA_DON — cha vẫn ở thế hệ cũ đủ chi tiết; bản ghi dở (thế hệ mới hơn) đã dọn.
 *  DA_PHUC_HOI      — cha trỏ thế hệ THIẾU chi tiết nên trả về thế hệ trước đó (đủ chi tiết) cùng thông tin cha lúc đó.
 *  KHONG_PHUC_HOI_DUOC — không có thế hệ nào đủ để phục hồi: KHÔNG xoá gì, cần xử lý tay.
 */
function xacMinhPhucHoiBaoHiem(maBH) {
  yeuCauDangNhap_(); yeuCauQuanTri_('xác minh/phục hồi hợp đồng bảo hiểm');
  return voiKhoa_(function () {
    var ma = String(maBH || '').trim(); if (!ma) throw new Error('Thiếu mã hợp đồng bảo hiểm.');
    var bg = taoBoGhiBH_(false), cha = docChaBH_(ma), ct = chiTietTheoTheHeBH_()[ma] || {}, cacTheHe = Object.keys(ct).map(Number);
    var donNhom = function (giu, nhan) { var d = donChiTietBH_(ma, giu, 'NGOAI', null, bg); if (!d.daDon) throw new Error('Chưa dọn xong thế hệ thừa của ' + ma + ' (' + moTaDon_(d) + ')'); return d; };
    if (!cha) { // không có hợp đồng cha: mọi dòng chi tiết là mồ côi (chắc chắn chưa chốt vì ĐÃ đọc được bảng cha)
      var coi = cacTheHe.length ? donChiTietBH_(ma, -1, 'NGOAI', null, bg) : { daDon: true };
      if (!coi.daDon) throw new Error('Chưa dọn xong dòng mồ côi của ' + ma + ' (' + moTaDon_(coi) + ')');
      ghiDauVetBH_(bg, { MaGD: 'GD-' + ma + '-XM-' + Utilities.getUuid().slice(0, 6), MaBH: ma, TrangThai: 'XAC_MINH_CHUA_CHOT', GhiChu: 'không có hợp đồng cha; dọn ' + cacTheHe.length + ' thế hệ mồ côi' });
      ghiNhatKy_('', 'XAC_MINH_BAO_HIEM', ma + ' | chưa chốt, đã dọn mồ côi');
      return { maBH: ma, trangThai: 'CHUA_CHOT_DA_DON', theHe: null };
    }
    var g = soTheHe_(cha.TheHe), thua = cacTheHe.filter(function (x) { return x !== g; }), moiHon = thua.filter(function (x) { return x > g; }).length;
    if (theHeDuChiTietBH_(cha, ct[g])) {
      if (thua.length) donNhom(g);
      var ttNay = thua.length && moiHon === thua.length ? 'CHUA_CHOT_DA_DON' : 'DA_CHOT';
      if (thua.length) { ghiDauVetBH_(bg, { MaGD: 'GD-' + ma + '-XM-' + Utilities.getUuid().slice(0, 6), MaBH: ma, TheHeMoi: g, TrangThai: ttNay === 'DA_CHOT' ? 'XAC_MINH_DA_CHOT' : 'XAC_MINH_CHUA_CHOT', GhiChu: 'đã dọn ' + thua.length + ' thế hệ khác' }); ghiNhatKy_('', 'XAC_MINH_BAO_HIEM', ma + ' | ' + ttNay + ' | thế hệ ' + g); }
      return { maBH: ma, trangThai: ttNay, theHe: g };
    }
    // thế hệ hiện hành của cha thiếu chi tiết → tìm giao dịch đã chốt vào thế hệ này để biết bản trước đó
    var vet = docSheetBaoDam_(SHEET_GD_BH).filter(function (x) { return String(x.MaBH) === ma && soTheHe_(x.TheHeMoi) === g && x.TrangThai === 'CHO_CHOT'; }).pop();
    var cu = vet ? soTheHe_(vet.TheHeCu) : null, chaCu = null; try { chaCu = vet && vet.ChaCu ? JSON.parse(vet.ChaCu) : null; } catch (eJ) { chaCu = null; }
    var duCu = vet && cu !== null && chaCu && ct[cu] && theHeDuChiTietBH_({ SoDong: vet.SoDongCu }, ct[cu]);
    if (!duCu) return { maBH: ma, trangThai: 'KHONG_PHUC_HOI_DUOC', theHe: g, thongBao: 'Hợp đồng ' + ma + ' đang trỏ thế hệ ' + g + ' nhưng thiếu chi tiết, và không có thế hệ trước đó đủ dữ liệu để phục hồi. Không xoá gì; cần xử lý thủ công.' };
    var rev = soTheHe_(cha.Revision) + 1, maGD = 'GD-' + ma + '-PH-' + Utilities.getUuid().slice(0, 6);
    ghiDauVetBHNghiemNgat_(bg, { MaGD: maGD, MaBH: ma, MaTS: cha.MaTS, TheHeCu: g, TheHeMoi: cu, RevisionCu: soTheHe_(cha.Revision), RevisionMoi: rev, SoDongCu: ct[g] ? ct[g].length : 0, SoDongMoi: vet.SoDongCu, TrangThai: 'PHUC_HOI', ChaCu: JSON.stringify({ SoHDBaoHiem: cha.SoHDBaoHiem, NgayKyHD: ngayIsoCuaO_(cha.NgayKyHD), CongTyBaoHiem: cha.CongTyBaoHiem, GhiChu: cha.GhiChu, SoDong: cha.SoDong }), GhiChu: 'cha trỏ thế hệ ' + g + ' thiếu chi tiết; trả về thế hệ ' + cu });
    capNhatDongTheoMa_(SHEET_BAO_HIEM_TS, 'MaBH', ma, { SoHDBaoHiem: chaCu.SoHDBaoHiem, NgayKyHD: chaCu.NgayKyHD, CongTyBaoHiem: chaCu.CongTyBaoHiem, GhiChu: chaCu.GhiChu, SoDong: vet.SoDongCu, TheHe: cu, Revision: rev, MaGD: maGD, NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), ThoiDiemGhi: new Date() });
    var sau = docChaBH_(ma); if (!sau || soTheHe_(sau.TheHe) !== cu) throw new Error('Đã gửi lệnh phục hồi ' + ma + ' nhưng đọc lại chưa thấy thế hệ ' + cu + '. Không xoá gì; chạy lại xác minh.');
    donNhom(cu);
    ghiNhatKy_('', 'PHUC_HOI_BAO_HIEM', ma + ' | thế hệ ' + g + ' → ' + cu);
    return { maBH: ma, trangThai: 'DA_PHUC_HOI', theHe: cu, revision: rev };
  });
}

/* ===== ĐÁNH GIÁ THỜI HẠN BẢO HIỂM THEO TỪNG HẠNG MỤC (một nguồn cho bảng tài sản, modal bảo hiểm, Tổng quan) ===== */
var BH_UU_TIEN_ = { DANG_BAO_HIEM: 1, SAP_HET: 2, CHUA_BAT_DAU: 3, KHOANG_TRONG: 4, QUA_HAN: 5 };
var BH_CANH_BAO_ = { SAP_HET: 1, CHUA_BAT_DAU: 1, KHOANG_TRONG: 1, QUA_HAN: 1 };
/**
 * khoang: [{ key, ten, tu, den }] của MỘT tài sản (các hợp đồng bảo hiểm HIỆU LỰC, chi tiết hiện hành). Mỗi hạng mục (key = Mã tài sản bảo hiểm, không có thì Tên) gom các khoảng,
 * nối khoảng liền nhau/chồng nhau (gia hạn) thành chuỗi rồi xét tại ngày today:
 *   DANG_BAO_HIEM / SAP_HET (≤ 15 ngày) — hôm nay nằm trong 1 chuỗi; ngayHetHan = cuối chuỗi
 *   CHUA_BAT_DAU — chưa từng được bảo hiểm, chuỗi đầu tiên còn ở tương lai; ngayBatDau = ngày bắt đầu (KHÔNG phải ngày hết hạn)
 *   KHOANG_TRONG — đã hết hạn nhưng có chuỗi tương lai (hở từ ngayHetHan+1 đến ngayBatDau-1)
 *   QUA_HAN — mọi khoảng đã qua; ngayHetHan = ngày hết gần nhất
 * Trả { tinhTrang (xấu nhất), hangMuc (tên hạng mục gây cảnh báo), ngayHetHan, ngayBatDau, ngayLienQuan, soNgay, hangMucChiTiet[] }.
 */
function bhDanhGiaHangMuc_(khoang, today) {
  var nhom = {}, thuTu = [];
  khoang.forEach(function (k) { if (!nhom[k.key]) { nhom[k.key] = { key: k.key, ten: k.ten, ds: [] }; thuTu.push(k.key); } nhom[k.key].ds.push({ tu: k.tu || '0000-01-01', den: k.den }); });
  var hm = thuTu.map(function (key) {
    var g = nhom[key], ds = g.ds.sort(function (a, b) { return a.tu < b.tu ? -1 : (a.tu > b.tu ? 1 : 0); }), chuoi = [];
    ds.forEach(function (x) { var c = chuoi[chuoi.length - 1]; if (c && x.tu <= bhCongNgay_(c.den, 1)) { if (x.den > c.den) c.den = x.den; } else chuoi.push({ tu: x.tu, den: x.den }); });
    var dang = chuoi.filter(function (c) { return c.tu <= today && c.den >= today; })[0], sau = chuoi.filter(function (c) { return c.tu > today; })[0], truoc = chuoi.filter(function (c) { return c.den < today; });
    var o = { key: key, ten: g.ten, tinhTrang: '', ngayHetHan: '', ngayBatDau: '', ngayLienQuan: '', soNgay: null };
    if (dang) { o.ngayHetHan = dang.den; o.soNgay = soNgayGiuaIso_(today, dang.den); o.tinhTrang = o.soNgay <= NGAY_CB_BAO_HIEM_ ? 'SAP_HET' : 'DANG_BAO_HIEM'; o.ngayLienQuan = dang.den; }
    else if (sau && truoc.length) { o.tinhTrang = 'KHOANG_TRONG'; o.ngayHetHan = truoc[truoc.length - 1].den; o.ngayBatDau = sau.tu; o.soNgay = soNgayGiuaIso_(today, sau.tu); o.ngayLienQuan = sau.tu; }
    else if (sau) { o.tinhTrang = 'CHUA_BAT_DAU'; o.ngayBatDau = sau.tu; o.soNgay = soNgayGiuaIso_(today, sau.tu); o.ngayLienQuan = sau.tu; }
    else { o.tinhTrang = 'QUA_HAN'; o.ngayHetHan = truoc.length ? truoc[truoc.length - 1].den : ''; o.soNgay = o.ngayHetHan ? soNgayGiuaIso_(today, o.ngayHetHan) : null; o.ngayLienQuan = o.ngayHetHan; }
    return o;
  });
  var xau = null;
  hm.forEach(function (h) { if (!xau || BH_UU_TIEN_[h.tinhTrang] > BH_UU_TIEN_[xau.tinhTrang] || (BH_UU_TIEN_[h.tinhTrang] === BH_UU_TIEN_[xau.tinhTrang] && h.ngayLienQuan < xau.ngayLienQuan)) xau = h; });
  return xau ? { tinhTrang: xau.tinhTrang, hangMuc: xau.ten, ngayHetHan: xau.ngayHetHan, ngayBatDau: xau.ngayBatDau, ngayLienQuan: xau.ngayLienQuan, soNgay: xau.soNgay, hangMucChiTiet: hm } : null;
}
/** Khoá hạng mục = mã tài sản bảo hiểm (không có thì tên), bỏ dấu, không phân biệt hoa/thường, bỏ dấu câu và khoảng trắng thừa: “Kho  A.” = “KHO-A” = “Khô a”. */
function khoaHangMucBH_(c) {
  var g = chuanKhongDau_(String(c.MaTaiSan || '').trim() || String(c.TenTaiSan || '').trim()), r = g.replace(/[^a-z0-9]+/g, ' ').trim();
  return r || g;
}
function khoangCachChuoi_(a, b) {
  var m = a.length, n = b.length, d = [], i, j; for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 1; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
  return d[m][n];
}
/** Hai khoá KHÁC nhau nhưng gần giống (sai 1–2 ký tự, hoặc một tên là phần đầu của tên kia) → có thể là cùng hạng mục gõ lệch. */
function tenGanGiong_(a, b) {
  if (!a || !b || a === b || Math.min(a.length, b.length) < 3) return false;
  if ((a.indexOf(b) === 0 && a.length - b.length <= 3) || (b.indexOf(a) === 0 && b.length - a.length <= 3)) return true;
  return khoangCachChuoi_(a, b) <= 2 && Math.max(a.length, b.length) >= 5;
}
/** Cảnh báo (không chặn): hạng mục mới có tên GẦN GIỐNG hạng mục đang có ở hợp đồng bảo hiểm KHÁC của cùng tài sản nhưng được tính là hạng mục KHÁC → hạng mục cũ vẫn báo hết hạn/hở. */
function canhBaoTenGanGiong_(maTS, maBHDangSua, dongMoi) {
  var hieuLuc = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { if (h.TrangThai === BH_HIEU_LUC && String(h.MaTS) === String(maTS) && String(h.MaBH) !== String(maBHDangSua || '')) hieuLuc[String(h.MaBH)] = 1; });
  var chuan = function (v) { var g = chuanKhongDau_(String(v || '').trim()), r = g.replace(/[^a-z0-9]+/g, ' ').trim(); return r || g; };
  var daCo = [], kq = [], daBao = {};
  chiTietHienHanhBH_().forEach(function (c) { if (hieuLuc[String(c.MaBH)]) daCo.push({ k: khoaHangMucBH_(c), tenK: chuan(c.TenTaiSan), ten: String(c.TenTaiSan || c.MaTaiSan || ''), maBH: String(c.MaBH) }); });
  dongMoi.forEach(function (d) {
    var k = khoaHangMucBH_(d), tk = chuan(d.TenTaiSan);
    if (daBao[k] || daCo.some(function (x) { return x.k === k || x.tenK === tk; })) return; // đúng là hạng mục đã có (theo khoá hoặc theo tên)
    var gan = daCo.filter(function (x) { return tenGanGiong_(tk, x.tenK) || tenGanGiong_(k, x.k); })[0];
    if (gan) { daBao[k] = 1; kq.push('Hạng mục “' + d.TenTaiSan + '” gần giống “' + gan.ten + '” (hợp đồng ' + gan.maBH + ') nhưng được tính là hạng mục KHÁC — nếu cùng một hạng mục, hãy sửa cho đúng tên để nối tiếp; nếu không “' + gan.ten + '” vẫn báo hết hạn/hở.'); }
  });
  return kq;
}
/** Các khoảng bảo hiểm HIỆU LỰC (chi tiết hiện hành) theo tài sản: { maTS: [{ key, ten, tu, den, maBH }] }. */
function khoangBaoHiemTheoTaiSan_() {
  var hieuLuc = {}, kq = {};
  docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { if (h.TrangThai === BH_HIEU_LUC) hieuLuc[String(h.MaBH)] = String(h.MaTS); });
  chiTietHienHanhBH_().forEach(function (c) {
    var ts = hieuLuc[String(c.MaBH)], den = ngayIsoCuaO_(c.DenNgay); if (!ts || !den) return;
    (kq[ts] = kq[ts] || []).push({ key: khoaHangMucBH_(c), ten: String(c.TenTaiSan || c.MaTaiSan || ''), tu: ngayIsoCuaO_(c.TuNgay), den: den, maBH: String(c.MaBH) });
  });
  return kq;
}
/**
 * Tình trạng bảo hiểm HIỆN TẠI của từng tài sản (xấu nhất theo hạng mục): { maTS: { han (ngày hết hạn thật, '' nếu chưa bắt đầu), soHD, tinhTrang, hangMuc, ngayBatDau, ngayLienQuan, soNgay, hangMucChiTiet } }.
 */
function hanBaoHiemTheoTaiSan_(homNay) {
  var today = homNay || homNayVN_(), kq = {}, khoang = khoangBaoHiemTheoTaiSan_();
  docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { if (h.TrangThai === BH_HIEU_LUC) { var o = kq[String(h.MaTS)] || (kq[String(h.MaTS)] = { han: '', soHD: 0, tinhTrang: '', hangMuc: '', ngayBatDau: '', ngayLienQuan: '', soNgay: null, hangMucChiTiet: [] }); o.soHD++; } });
  Object.keys(khoang).forEach(function (ts) {
    var d = bhDanhGiaHangMuc_(khoang[ts], today); if (!d || !kq[ts]) return;
    kq[ts].han = d.ngayHetHan; kq[ts].tinhTrang = d.tinhTrang; kq[ts].hangMuc = d.hangMuc; kq[ts].ngayBatDau = d.ngayBatDau; kq[ts].ngayLienQuan = d.ngayLienQuan; kq[ts].soNgay = d.soNgay; kq[ts].hangMucChiTiet = d.hangMucChiTiet;
  });
  return kq;
}
/** Tổng hợp theo hợp đồng (nội bộ): {maHD: {tong, soTS, sapHetBaoHiem, quaHanBaoHiem}} — chỉ tài sản đang bảo đảm. quaHan gồm hết hạn, khoảng trống, chưa bắt đầu (đều là chưa được bảo vệ hôm nay). */
function tomTatBaoDamTheoHD_() { return voiBoNhoBH_(tomTatBaoDamTheoHDKhongNho_); }
function tomTatBaoDamTheoHDKhongNho_() {
  var kq = {}, today = homNayVN_(), bh = hanBaoHiemTheoTaiSan_();
  docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).forEach(function (r) {
    if (r.TrangThai !== TS_DANG_BAO_DAM) return;
    var k = String(r.MaHD), o = kq[k] || (kq[k] = { tong: 0, soTS: 0, sapHetBaoHiem: 0, quaHanBaoHiem: 0 });
    o.tong = congSoTien_(o.tong, Number(r.GiaTriVND) || 0); o.soTS++;
    var b0 = bh[String(r.MaTS)];
    if (b0 && b0.tinhTrang) { if (b0.tinhTrang === 'SAP_HET') o.sapHetBaoHiem++; else if (BH_CANH_BAO_[b0.tinhTrang]) o.quaHanBaoHiem++; }
    else { var han = ngayIsoCuaO_(r.NgayHetHanBaoHiem); if (han) { var n = soNgayGiuaIso_(today, han); if (n < 0) o.quaHanBaoHiem++; else if (n <= NGAY_CB_BAO_HIEM_) o.sapHetBaoHiem++; } }
  });
  return kq;
}
/** Danh sách tài sản đang bảo đảm cần cảnh báo bảo hiểm (sắp hết ≤ 15 ngày, hết hạn, hở giữa các hợp đồng, chưa bắt đầu), kèm HẠNG MỤC gây cảnh báo và ngày liên quan — cho Tổng quan. Nặng nhất trước. */
function chiTietCanhBaoBaoHiem_(tra) {
  var kq = taiSanBaoDam_('').rows.filter(function (r) { return r.trangThai === TS_DANG_BAO_DAM && r.canhBaoBaoHiem; }).map(function (r) {
    return { maTS: r.maTS, maHD: r.maHD, moTa: r.moTa, soHopDong: r.soHopDong, tenCty: r.tenCty, han: r.ngayHetHanBaoHiem, ngayBatDau: r.ngayBatDauBaoHiem, ngayLienQuan: r.ngayLienQuanBaoHiem, hangMuc: r.hangMucBaoHiem, soNgay: r.soNgayBaoHiem, muc: r.canhBaoBaoHiem };
  });
  return kq.sort(function (a, b) { return (BH_UU_TIEN_[b.muc] || 0) - (BH_UU_TIEN_[a.muc] || 0) || (a.soNgay === null ? 1 : a.soNgay) - (b.soNgay === null ? 1 : b.soNgay); });
}
function layTaiSanBaoDam(maHD) {
  yeuCauDangNhap_();
  return taiSanBaoDam_(maHD);
}
function taiSanBaoDam_(maHD) { return voiBoNhoBH_(function () { return taiSanBaoDamKhongNho_(maHD); }); }
function taiSanBaoDamKhongNho_(maHD) {
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), today = homNayVN_(), bh = hanBaoHiemTheoTaiSan_();
  var rows = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (r) {
    var hd = tra.hd[String(r.MaHD)];
    if (maHD && String(r.MaHD) !== String(maHD)) return false;
    return hd && (!pv.length || pv.indexOf(String(hd.MaCty)) >= 0);
  }).map(function (r) {
    var hd = tra.hd[String(r.MaHD)] || {}, bhTS = bh[String(r.MaTS)], coBH = bhTS && bhTS.tinhTrang, dang = r.TrangThai === TS_DANG_BAO_DAM;
    var han = coBH ? bhTS.han : ngayIsoCuaO_(r.NgayHetHanBaoHiem), n = coBH ? bhTS.soNgay : (han ? soNgayGiuaIso_(today, han) : null), canh = '';
    if (dang) { if (coBH) canh = BH_CANH_BAO_[bhTS.tinhTrang] ? bhTS.tinhTrang : ''; else if (n !== null) canh = n < 0 ? 'QUA_HAN' : (n <= NGAY_CB_BAO_HIEM_ ? 'SAP_HET' : ''); }
    return { maTS: String(r.MaTS), maHD: String(r.MaHD), soHopDong: hd.SoHopDong || '', tenCty: (tra.cty[String(hd.MaCty)] || {}).TenCty || '', loai: r.LoaiTS, nhanLoai: LOAI_TAI_SAN_[r.LoaiTS] || r.LoaiTS,
      moTa: r.MoTa || '', giaTri: Number(r.GiaTriVND) || 0, nguyenGia: soCuaO_(r.NguyenGia), khauHao: soCuaO_(r.KhauHao), giaTriConLai: soCuaO_(r.GiaTriConLai), ngayDinhGia: ngayIsoCuaO_(r.NgayDinhGia), soHDBaoDam: r.SoHDBaoDam || '',
      ngayHetHanBaoHiem: han, ngayBatDauBaoHiem: coBH ? bhTS.ngayBatDau : '', ngayLienQuanBaoHiem: coBH ? bhTS.ngayLienQuan : han, hangMucBaoHiem: coBH ? bhTS.hangMuc : '', tinhTrangBaoHiem: coBH ? bhTS.tinhTrang : '', soHopDongBaoHiem: bhTS ? bhTS.soHD : 0,
      canhBaoBaoHiem: canh, soNgayBaoHiem: n, trangThai: r.TrangThai, ghiChu: r.GhiChu || '', nguoiGhi: r.NguoiGhi || '', revision: soTheHe_(r.Revision) };
  }).sort(function (a, b) { return String(a.maTS).localeCompare(String(b.maTS)); });
  var tong = rows.filter(function (r) { return r.trangThai === TS_DANG_BAO_DAM; }).reduce(function (a, r) { return congSoTien_(a, r.giaTri); }, 0);
  return { rows: rows, tongGiaTriDangBaoDam: tong, loaiTaiSan: LOAI_TAI_SAN_ };
}
/** Hợp nhất số CŨ (đang lưu) với số MỚI (người dùng nhập; null = không nhập) rồi kiểm tra Nguyên giá / Khấu hao / Giá trị còn lại. cu, moi = { ng, kh, cl }. Ném lỗi nếu sai; trả { ng, kh, cl } sau hợp nhất. */
function hopNhatGiaTriTS_(cu, moi) {
  cu = cu || { ng: null, kh: null, cl: null };
  if (moi.ng === null && moi.kh === null && moi.cl === null) return { ng: cu.ng, kh: cu.kh, cl: cu.cl };
  var ng = moi.ng !== null ? moi.ng : cu.ng, kh = moi.kh !== null ? moi.kh : cu.kh, cl = moi.cl !== null ? moi.cl : cu.cl;
  if (ng !== null && kh !== null) {
    if (kh > ng) throw new Error('Khấu hao (' + kh + ') không được lớn hơn nguyên giá (' + ng + ')' + (moi.ng === null || moi.kh === null ? ' — số còn lại đang lưu được tính cùng số mới nhập.' : '.'));
    if (moi.cl !== null && moi.cl !== ng - kh) throw new Error('Giá trị còn lại phải bằng nguyên giá − khấu hao (' + (ng - kh) + ').');
    cl = ng - kh;
  }
  return { ng: ng, kh: kh, cl: cl };
}
function soCuaO_(v) { return v === '' || v === null || v === undefined ? null : Number(v); }
function soMoiTuNhap_(v, ten) { return v === null || v === undefined || String(v).trim() === '' ? null : docTienNguyen_(v, ten, false); }
/** Kiểm tra phiên bản (Revision) của 1 dòng tài sản/hợp đồng bảo hiểm: chống 2 phiên ghi đè nhau. batBuoc: thiếu expected là lỗi. Trả revision hiện tại. */
function kiemTraRevisionBD_(row, expected, nhan, batBuoc) {
  var cur = soTheHe_(row.Revision);
  if (expected === undefined || expected === null || String(expected).trim() === '') {
    if (batBuoc) throw new Error('Thiếu phiên bản của ' + nhan + ' (expectedRevision) — tải lại dữ liệu rồi lưu lại.');
    return cur;
  }
  if (Number(expected) !== cur) throw new Error('XUNG_DOT_PHIEN_BAN|' + cur + '|' + nhan + ' đã được người khác thay đổi (phiên bản hiện tại ' + cur + ', bạn đang xem ' + expected + '). Tải lại rồi sửa lại.');
  return cur;
}
/** Chữ ký nội dung chi tiết để nhận biết yêu cầu lưu lặp (cùng hạng mục, số tiền, ngày). */
function chuKyChiTietBH_(ds) {
  return ds.map(function (d) { return [chuanKhongDau_(d.MaTaiSan || ''), chuanKhongDau_(d.TenTaiSan || ''), Number(d.GiaTriBH) || 0, Number(d.PhiBH) || 0, Number(d.TienBH) || 0, ngayIsoCuaO_(d.TuNgay), ngayIsoCuaO_(d.DenNgay)].join('~'); }).sort().join('|');
}
/** Nâng cấp cấu trúc (an toàn chạy lại nhiều lần, không đụng dữ liệu): thêm cột còn thiếu cho các bảng tài sản–bảo hiểm và tạo bảng dấu vết giao dịch. */
function nangCapCauTrucBaoDam_() {
  var ss = getSS_();
  damBaoCotSheet_(ensureSheet_(ss, SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_), COT_TAI_SAN_);
  damBaoCotSheet_(ensureSheet_(ss, SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_), COT_BAO_HIEM_TS_);
  damBaoCotSheet_(ensureSheet_(ss, SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_), COT_BAO_HIEM_TS_CT_);
  damBaoCotSheet_(ensureSheet_(ss, SHEET_GD_BH, COT_GD_BH_), COT_GD_BH_);
}
/**
 * GHI 1 HỢP ĐỒNG BẢO HIỂM theo giao dịch/thế hệ (người gọi đang giữ khoá). p = { moi, ma, maTS, cha:{SoHDBaoHiem,NgayKyHD,CongTyBaoHiem,GhiChu}, dong:[{MaTaiSan,TenTaiSan,GiaTriBH,PhiBH,TienBH,TuNgay,DenNgay}], me, chaCu, soDongCu, bg?, hoanDon? }.
 *
 * Thế thứ tự (mỗi bước nói rõ kết quả có CHẮC CHẮN hay không):
 *  0) chọn thế hệ mới = lớn hơn MỌI thế hệ đã từng có của hợp đồng (kể cả dòng ghi dở còn sót) → không bao giờ tái sử dụng/trộn với dòng cũ. Không đọc được → chưa ghi gì.
 *  1) ghi cả khối chi tiết thế hệ mới (vô hình); 2) đọc lại đúng khối đó: đủ dòng, STT, thế hệ, nội dung; 3) ghi dấu vết CHO_CHOT (kèm bản cha cũ để phục hồi);
 *  4) CHỐT = ghi cha (TheHe, Revision, SoDong) – một thao tác; 5) đọc lại cha; 6) chỉ khi đã xác nhận mới dọn thế hệ khác.
 * Kết cục: ĐÃ CHỐT (đã xác minh) · CHẮC CHẮN CHƯA CHỐT (đọc lại thấy cha cũ → dọn phần ghi dở của đúng thế hệ này) · CHƯA XÁC ĐỊNH (không đọc lại được → giữ NGUYÊN mọi dữ liệu, ném lỗi chuaXacDinh).
 * Thành công trả { maBH, revision, theHe, canhBao:[] } (canhBao = việc phụ chưa xong nhưng dữ liệu chính ĐÃ lưu).
 */
function ghiHopDongBH_(p) {
  var ma = p.ma, bg = p.bg || taoBoGhiBH_(false), canhBao = [], moi = !!p.moi, n = p.dong.length;
  var cuTheHe = moi ? 0 : soTheHe_(p.chaCu.TheHe), cuRev = moi ? 0 : soTheHe_(p.chaCu.Revision), rev = cuRev + 1, moiTheHe = 0, dau;
  xoaBoNhoBH_();
  var chuaChot = function (lyDo, daDocLai) { // CHẮC CHẮN cha chưa đổi → dọn đúng phần ghi dở của thế hệ này
    var d = moiTheHe ? donChiTietBH_(ma, moiTheHe, 'DUNG', cuTheHe, bg) : { daDon: true, conLai: 0, loi: '' };
    if (moiTheHe) ghiDauVetBH_(bg, { MaGD: maGD, MaBH: ma, MaTS: p.maTS, TheHeCu: cuTheHe, TheHeMoi: moiTheHe, TrangThai: 'LOI_CHUA_CHOT', GhiChu: String(lyDo).substring(0, 300) });
    return new Error('Chưa lưu hợp đồng bảo hiểm ' + ma + ' (' + lyDo + '). Dữ liệu cũ còn nguyên' + (daDocLai ? ' (đã đọc lại xác minh)' : '') + '. ' + moTaDon_(d));
  };
  var maGD = 'GD-' + ma + '-' + Utilities.getUuid().slice(0, 8);
  // 0) thế hệ mới, chưa từng dùng
  try {
    var daDung = docTheHeDaDungBH_(bg)[String(ma)] || {}, max = cuTheHe;
    Object.keys(daDung).forEach(function (g) { if (Number(g) > max) max = Number(g); });
    moiTheHe = max + 1; maGD = 'GD-' + ma + '-' + moiTheHe + '-' + Utilities.getUuid().slice(0, 6);
  } catch (e0) { throw new Error('Chưa lưu hợp đồng bảo hiểm ' + ma + ' (không xác định được thế hệ ghi an toàn: ' + e0.message + '). Chưa ghi gì; dữ liệu cũ còn nguyên.'); }
  // 1) khối chi tiết thế hệ mới (vô hình với người đọc)
  var dongMoi = p.dong.map(function (d, i) { var o = {}; Object.keys(d).forEach(function (k) { o[k] = d[k]; }); o.MaBH = ma; o.STT = i + 1; o.TheHe = moiTheHe; return o; });
  try { dau = ghiNhieuDong_(SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_, dongMoi, bg.ct); bgFlush_(bg); }
  catch (e1) { throw chuaChot('lỗi ghi chi tiết: ' + e1.message); }
  // 2) xác minh ĐÚNG khối vừa ghi trước khi chốt
  try {
    var doc = bgDocKhoi_(bg.ct, dau, n);
    var khop = doc.length === n && doc.every(function (r, i) { return String(r.MaBH) === String(ma) && soTheHe_(r.TheHe) === moiTheHe && Number(r.STT) === i + 1; }) && chuKyChiTietBH_(doc) === chuKyChiTietBH_(p.dong);
    if (!khop) throw new Error('đọc lại khối chi tiết vừa ghi không khớp (số dòng, STT hoặc nội dung)');
  } catch (e1b) { throw chuaChot('xác minh chi tiết trước khi chốt: ' + e1b.message); }
  // 3) dấu vết trước khi chốt (có bản cha cũ để phục hồi)
  var chaCuJson = moi ? '' : JSON.stringify({ SoHDBaoHiem: p.chaCu.SoHDBaoHiem, NgayKyHD: ngayIsoCuaO_(p.chaCu.NgayKyHD), CongTyBaoHiem: p.chaCu.CongTyBaoHiem, GhiChu: p.chaCu.GhiChu });
  try { ghiDauVetBHNghiemNgat_(bg, { MaGD: maGD, MaBH: ma, MaTS: p.maTS, TheHeCu: cuTheHe, TheHeMoi: moiTheHe, RevisionCu: cuRev, RevisionMoi: rev, SoDongCu: p.soDongCu === undefined ? '' : p.soDongCu, SoDongMoi: n, TrangThai: 'CHO_CHOT', ChaCu: chaCuJson }); }
  catch (eg) { throw chuaChot('không ghi được dấu vết giao dịch: ' + eg.message); }
  // 4) CHỐT
  var chot = Object.assign({}, p.cha, { TheHe: moiTheHe, Revision: rev, SoDong: n, MaGD: maGD, NguoiGhi: p.me, ThoiDiemGhi: new Date() }), daChot = false, daXacMinh = false;
  try {
    if (moi) ghiDongMoi_(SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_, Object.assign({ MaBH: ma, MaTS: p.maTS, TrangThai: BH_HIEU_LUC }, chot), bg.cha);
    else capNhatDongTheoMa_(SHEET_BAO_HIEM_TS, 'MaBH', ma, chot, bg.cha);
    bgFlush_(bg); daChot = true;
  } catch (e2) {
    var thuc = null, docDuoc = true;
    try { thuc = docChaBH_(ma, bg); } catch (e3) { docDuoc = false; }
    if (!docDuoc) { // CHƯA XÁC ĐỊNH: không xoá gì
      ghiDauVetBH_(bg, { MaGD: maGD, MaBH: ma, MaTS: p.maTS, TheHeCu: cuTheHe, TheHeMoi: moiTheHe, TrangThai: 'CHUA_XAC_DINH', GhiChu: String(e2.message).substring(0, 300) });
      var le = new Error('CHƯA XÁC ĐỊNH kết quả lưu hợp đồng bảo hiểm ' + ma + ' (' + e2.message + '). Không đọc lại được để xác minh nên KHÔNG xoá gì: cả bản cũ lẫn bản mới đều được giữ nguyên. Đừng lưu lại; Quản trị chạy “Xác minh/phục hồi bảo hiểm” cho ' + ma + '.');
      le.chuaXacDinh = true; le.maBH = ma; bg.ct.theHe = null; bg.ct.cuoi = null; throw le;
    }
    if (thuc && soTheHe_(thuc.TheHe) === moiTheHe) { daChot = true; daXacMinh = true; canhBao.push('Bước ghi báo lỗi (' + e2.message + ') nhưng đã ĐỌC LẠI và xác nhận hợp đồng ' + ma + ' được lưu đúng.'); }
    else throw chuaChot('lỗi cập nhật hợp đồng: ' + e2.message, true);
  }
  // 5) đọc lại cha để xác nhận (kể cả khi không báo lỗi)
  if (!daXacMinh) {
    try { var chk = docChaBH_(ma, bg); daXacMinh = !!chk && soTheHe_(chk.TheHe) === moiTheHe; if (!daXacMinh) canhBao.push('Đã ghi hợp đồng ' + ma + ' nhưng đọc lại chưa thấy thế hệ mới; chưa dọn bản cũ — Quản trị chạy “Xác minh/phục hồi bảo hiểm”.'); }
    catch (e4) { canhBao.push('Đã ghi hợp đồng ' + ma + ' nhưng chưa đọc lại được để xác minh (' + e4.message + '); chưa dọn bản cũ — Quản trị chạy “Xác minh/phục hồi bảo hiểm”.'); }
  }
  // 6) dọn các thế hệ khác — CHỈ sau khi đã xác nhận
  if (daChot && daXacMinh) {
    var khac = false; try { var dd = docTheHeDaDungBH_(bg)[String(ma)] || {}; Object.keys(dd).forEach(function (g) { if (Number(g) !== moiTheHe) khac = true; }); } catch (e5) { khac = true; }
    if (khac) {
      if (p.hoanDon) bg.donSau.push({ ma: ma, giu: moiTheHe });
      else { var d3 = donChiTietBH_(ma, moiTheHe, 'NGOAI', null, bg); if (!d3.daDon) canhBao.push('Đã lưu, nhưng chưa dọn được ' + Math.max(d3.conLai, 0) + ' dòng chi tiết bản cũ (không hiển thị, không ảnh hưởng). Quản trị có thể chạy “Dọn dữ liệu bảo hiểm thừa”.'); }
    }
  }
  if (bg.ct.theHe) { bg.ct.theHe[String(ma)] = bg.ct.theHe[String(ma)] || {}; bg.ct.theHe[String(ma)][moiTheHe] = n; }
  return { maBH: ma, revision: rev, theHe: moiTheHe, canhBao: canhBao, daXacMinh: daXacMinh };
}
/** Việc phụ SAU khi dữ liệu chính đã lưu (công ty bảo hiểm → Khách hàng, nhật ký): lỗi chỉ thành cảnh báo, không làm người dùng tưởng chưa lưu. Trả { congTyMoi, canhBao[] }. */
function viecPhuSauLuuBH_(cty, hanhDong, chiTietLog) {
  var kq = { congTyMoi: false, canhBao: [] };
  try { kq.congTyMoi = !themCongTyBaoHiem_(cty).daCo; } catch (e) { kq.canhBao.push('Hợp đồng bảo hiểm ĐÃ lưu, nhưng chưa thêm được công ty “' + cty + '” vào Khách hàng (' + e.message + ').'); }
  try { ghiNhatKy_('', hanhDong, chiTietLog); } catch (e2) { kq.canhBao.push('Hợp đồng bảo hiểm ĐÃ lưu, nhưng chưa ghi được nhật ký (' + e2.message + ').'); }
  return kq;
}
/** Đăng ký / sửa tài sản bảo đảm. maTS rỗng = tạo mới; sửa BẮT BUỘC kèm expectedRevision (phiên bản đang xem). */
function luuTaiSanBaoDam(tt) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    hopDongTrongPhamVi_(tt.maHD);
    var loai = String(tt.loai || ''), moTa = String(tt.moTa || '').trim(), me = layDanhTinh_().email || emailNguoiDung_();
    if (!LOAI_TAI_SAN_[loai]) throw new Error('Loại tài sản không hợp lệ.');
    if (moTa.length < 3 || moTa.length > 300) throw new Error('Mô tả tài sản phải từ 3 đến 300 ký tự.');
    var giaTri = docTienNguyen_(tt.giaTri, 'Giá trị tài sản');
    if (!(giaTri > 0)) throw new Error('Giá trị tài sản phải lớn hơn 0.');
    var moiGT = { ng: soMoiTuNhap_(tt.nguyenGia, 'Nguyên giá'), kh: soMoiTuNhap_(tt.khauHao, 'Khấu hao'), cl: soMoiTuNhap_(tt.giaTriConLai, 'Giá trị còn lại') };
    nangCapCauTrucBaoDam_();
    var ngayDG = tt.ngayDinhGia ? ngayChuanISO_(tt.ngayDinhGia, 'Ngày định giá', true) : '';
    var han = tt.ngayHetHanBaoHiem ? ngayChuanISO_(tt.ngayHetHanBaoHiem, 'Ngày hết hạn bảo hiểm', false) : '';
    var ghiChu = String(tt.ghiChu || '').trim().substring(0, 500), soHD = String(tt.soHDBaoDam || '').trim().substring(0, 80);
    var ds = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM), ma = String(tt.maTS || '').trim();
    if (ma) {
      var cu = ds.filter(function (r) { return String(r.MaTS) === ma; })[0];
      if (!cu) throw new Error('Không tìm thấy tài sản ' + ma + '.');
      hopDongTrongPhamVi_(cu.MaHD); // quyền với hợp đồng GỐC của tài sản (không chỉ hợp đồng đích)
      if (cu.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp — không sửa.');
      var rev = kiemTraRevisionBD_(cu, tt.expectedRevision, 'Tài sản ' + ma, true);
      var gt = hopNhatGiaTriTS_({ ng: soCuaO_(cu.NguyenGia), kh: soCuaO_(cu.KhauHao), cl: soCuaO_(cu.GiaTriConLai) }, moiGT), cotGiaTri = { NguyenGia: gt.ng === null ? '' : gt.ng, KhauHao: gt.kh === null ? '' : gt.kh, GiaTriConLai: gt.cl === null ? '' : gt.cl };
      if (String(cu.MaHD) !== String(tt.maHD)) ghiNhatKy_('', 'CHUYEN_TAI_SAN_BAO_DAM', ma + ' | ' + cu.MaHD + ' → ' + tt.maHD);
      capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', ma, { MaHD: tt.maHD, LoaiTS: loai, MoTa: lamSachCongThuc_(moTa), GiaTriVND: giaTri, NgayDinhGia: ngayDG, SoHDBaoDam: lamSachCongThuc_(soHD),
        NgayHetHanBaoHiem: han, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date(), NguyenGia: cotGiaTri.NguyenGia, KhauHao: cotGiaTri.KhauHao, GiaTriConLai: cotGiaTri.GiaTriConLai, Revision: rev + 1 });
      ghiNhatKy_('', 'SUA_TAI_SAN_BAO_DAM', ma + ' | ' + loai + ' | ' + giaTri);
      return { maTS: ma, daSua: true, revision: rev + 1 };
    }
    var khoaYC = String(tt.khoaYeuCau || '').trim();
    if (!khoaYC) throw new Error('Thiếu khoá yêu cầu (khoaYeuCau) khi thêm tài sản — tải lại màn hình rồi thao tác lại.');
    if (khoaYC.length > 80) throw new Error('Khoá yêu cầu quá dài (tối đa 80 ký tự).');
    var daTao = ds.filter(function (r) { return String(r.KhoaYeuCau || '') === khoaYC; })[0];
    if (daTao) { // gửi lại cùng yêu cầu (mất phản hồi rồi thử lại): trả đúng tài sản đã tạo; nội dung khác với yêu cầu gốc thì chặn, không âm thầm trả bản cũ
      if (String(daTao.MaHD) !== String(tt.maHD) || String(daTao.LoaiTS) !== loai || String(daTao.MoTa) !== lamSachCongThuc_(moTa) || Number(daTao.GiaTriVND) !== giaTri) throw new Error('Khoá yêu cầu này đã dùng để tạo tài sản ' + daTao.MaTS + ' với nội dung khác — tải lại màn hình rồi nhập yêu cầu mới.');
      return { maTS: String(daTao.MaTS), daSua: false, revision: soTheHe_(daTao.Revision), trungLap: true };
    }
    var gt0 = hopNhatGiaTriTS_(null, moiGT), cotMoi = { NguyenGia: gt0.ng === null ? '' : gt0.ng, KhauHao: gt0.kh === null ? '' : gt0.kh, GiaTriConLai: gt0.cl === null ? '' : gt0.cl };
    ma = maBaoDamMoi_('TS', ds, 'MaTS');
    ghiDongMoi_(SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_, { MaTS: ma, MaHD: tt.maHD, LoaiTS: loai, MoTa: lamSachCongThuc_(moTa), GiaTriVND: giaTri, NgayDinhGia: ngayDG, SoHDBaoDam: lamSachCongThuc_(soHD),
      NgayHetHanBaoHiem: han, TrangThai: TS_DANG_BAO_DAM, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date(), NguyenGia: cotMoi.NguyenGia, KhauHao: cotMoi.KhauHao, GiaTriConLai: cotMoi.GiaTriConLai, Revision: 1, KhoaYeuCau: khoaYC });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'THEM_TAI_SAN_BAO_DAM', ma + ' | ' + tt.maHD + ' | ' + loai + ' | ' + giaTri);
    return { maTS: ma, daSua: false, revision: 1 };
  });
}
/** Giải chấp (không xoá): đổi trạng thái kèm lý do. expectedRevision BẮT BUỘC, chống giải chấp tài sản vừa bị người khác sửa. Giữ nguyên bảo hiểm và lịch sử. */
function giaiChapTaiSan(maTS, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (x) { return String(x.MaTS) === String(maTS); })[0];
    if (!r) throw new Error('Không tìm thấy tài sản ' + maTS + '.');
    hopDongTrongPhamVi_(r.MaHD);
    if (r.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp trước đó.');
    var rev = kiemTraRevisionBD_(r, expectedRevision, 'Tài sản ' + maTS, true);
    var ly = String(lyDo || '').trim(); if (ly.length < 3) throw new Error('Cần nhập lý do/chứng từ giải chấp (tối thiểu 3 ký tự).');
    nangCapCauTrucBaoDam_();
    capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', maTS, { TrangThai: TS_DA_GIAI_CHAP, GiaiChapLuc: new Date(), LyDoGiaiChap: lamSachCongThuc_(ly.substring(0, 500)), NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), Revision: rev + 1 });
    ghiNhatKy_('', 'GIAI_CHAP_TAI_SAN', maTS + ' | ' + ly);
    return { maTS: String(maTS), trangThai: TS_DA_GIAI_CHAP, revision: rev + 1 };
  });
}

/* ------------------------------ BẢO HIỂM TÀI SẢN THẾ CHẤP (con của đăng ký thế chấp) ------------------------------ */
function taiSanTheoMa_(maTS) {
  var r = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (x) { return String(x.MaTS) === String(maTS); })[0];
  if (!r) throw new Error('Không tìm thấy tài sản ' + maTS + '.');
  hopDongTrongPhamVi_(r.MaHD);
  return r;
}
/**
 * Hợp đồng bảo hiểm của 1 tài sản thế chấp, kèm bảng con chi tiết (chỉ thế hệ hiện hành). Chỉ đọc.
 *  baoVe = tình trạng bảo hiểm HIỆN TẠI của tài sản sau gia hạn, theo từng hạng mục (cùng nguồn với bảng tài sản và Tổng quan).
 *  Mỗi hợp đồng: tinhTrangRieng = tình trạng của CHÍNH hợp đồng đó (DA_GIA_HAN / NOI_TIEP = đã/sẽ được hợp đồng khác nối tiếp liền mạch → không cảnh báo); canhBao chỉ ≠ '' khi thật sự thiếu bảo vệ.
 */
function layBaoHiemTaiSan(maTS) {
  yeuCauDangNhap_();
  return voiBoNhoBH_(function () { return layBaoHiemTaiSanKhongNho_(maTS); });
}
function layBaoHiemTaiSanKhongNho_(maTS) {
  var ts = taiSanTheoMa_(maTS), today = homNayVN_(), tra = layTraCuuDanhMuc_(), hd = tra.hd[String(ts.MaHD)] || {};
  var ct = chiTietHienHanhBH_(), khoang = khoangBaoHiemTheoTaiSan_()[String(maTS)] || [], baoVe = bhDanhGiaHangMuc_(khoang, today), trangHM = {};
  if (baoVe) baoVe.hangMucChiTiet.forEach(function (h) { trangHM[h.key] = h.tinhTrang; });
  var hopDong = docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (h) { return String(h.MaTS) === String(maTS); }).map(function (h) {
    var hieuLuc = h.TrangThai === BH_HIEU_LUC, worst = '', uu = { '': -1, DA_GIA_HAN: 0, NOI_TIEP: 0, DANG_BAO_HIEM: 1, SAP_HET: 2, CHUA_BAT_DAU: 3, QUA_HAN: 5 };
    var dong = ct.filter(function (c) { return String(c.MaBH) === String(h.MaBH); }).map(function (c) {
      var tu = ngayIsoCuaO_(c.TuNgay), den = ngayIsoCuaO_(c.DenNgay), hmNay = trangHM[khoaHangMucBH_(c)] || '', duocBaoVe = hmNay === 'DANG_BAO_HIEM' || hmNay === 'SAP_HET', tt;
      if (den && den < today) tt = duocBaoVe ? 'DA_GIA_HAN' : 'QUA_HAN';
      else if (tu && tu > today) tt = duocBaoVe ? 'NOI_TIEP' : 'CHUA_BAT_DAU';
      else tt = den && soNgayGiuaIso_(today, den) <= NGAY_CB_BAO_HIEM_ ? (duocBaoVe && hmNay === 'DANG_BAO_HIEM' ? 'DANG_BAO_HIEM' : 'SAP_HET') : 'DANG_BAO_HIEM';
      if (hieuLuc && uu[tt] > uu[worst]) worst = tt;
      return { stt: Number(c.STT) || 0, maTaiSan: String(c.MaTaiSan || ''), tenTaiSan: String(c.TenTaiSan || ''), giaTriBH: Number(c.GiaTriBH) || 0, phiBH: Number(c.PhiBH) || 0, tienBH: Number(c.TienBH) || 0, tuNgay: tu, denNgay: den, tinhTrang: hieuLuc ? tt : '' };
    }).sort(function (a, b) { return a.stt - b.stt; });
    var den = dong.reduce(function (m, x) { return x.denNgay > m ? x.denNgay : m; }, ''), n = den ? soNgayGiuaIso_(today, den) : null;
    return { maBH: String(h.MaBH), soHDBaoHiem: String(h.SoHDBaoHiem || ''), ngayKyHD: ngayIsoCuaO_(h.NgayKyHD), congTyBaoHiem: String(h.CongTyBaoHiem || ''), trangThai: h.TrangThai, ghiChu: String(h.GhiChu || ''), revision: soTheHe_(h.Revision),
      lyDoHuy: String(h.LyDoHuy || ''), chiTiet: dong, denNgayCuoi: den, soNgay: n, tinhTrangRieng: hieuLuc ? (worst || 'DANG_BAO_HIEM') : '', canhBao: hieuLuc && BH_CANH_BAO_[worst] ? worst : '',
      tong: { giaTriBH: dong.reduce(function (a, x) { return congSoTien_(a, x.giaTriBH); }, 0), phiBH: dong.reduce(function (a, x) { return congSoTien_(a, x.phiBH); }, 0), tienBH: dong.reduce(function (a, x) { return congSoTien_(a, x.tienBH); }, 0) } };
  }).sort(function (a, b) { return String(a.maBH).localeCompare(String(b.maBH)); });
  return { maTS: String(ts.MaTS), maHD: String(ts.MaHD), soHopDong: hd.SoHopDong || '', moTa: String(ts.MoTa || ''), giaTri: Number(ts.GiaTriVND) || 0, trangThai: ts.TrangThai, revisionTS: soTheHe_(ts.Revision),
    baoVe: baoVe ? { tinhTrang: baoVe.tinhTrang, hangMuc: baoVe.hangMuc, ngayHetHan: baoVe.ngayHetHan, ngayBatDau: baoVe.ngayBatDau, ngayLienQuan: baoVe.ngayLienQuan, soNgay: baoVe.soNgay, canhBao: BH_CANH_BAO_[baoVe.tinhTrang] ? baoVe.tinhTrang : '', hangMucChiTiet: baoVe.hangMucChiTiet } : null,
    hopDong: hopDong, nguongCanhBaoNgay: NGAY_CB_BAO_HIEM_ };
}
/**
 * Thêm / sửa hợp đồng bảo hiểm (tt.maBH rỗng = thêm). Sửa BẮT BUỘC có tt.expectedRevision. Ghi theo thế hệ (xem ghiHopDongBH_): lỗi giữa chừng không để cha–con lệch nhau;
 * yêu cầu tạo lặp (mất phản hồi rồi bấm lại) trả bản đã có (trungLap). Lỗi việc phụ sau khi đã lưu (thêm công ty bảo hiểm vào Khách hàng, nhật ký) chỉ thành canhBao.
 */
function luuBaoHiemTaiSan(tt) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    var ts = taiSanTheoMa_(tt.maTS);
    if (ts.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp — không thêm/sửa bảo hiểm.');
    var ngayKy = ngayChuanISO_(tt.ngayKyHD, 'Ngày ký hợp đồng bảo hiểm', true), cty = String(tt.congTyBaoHiem || '').trim(), so = String(tt.soHDBaoHiem || '').trim(), ghiChu = String(tt.ghiChu || '').trim();
    if (cty.length < 2 || cty.length > 150) throw new Error('Công ty bảo hiểm phải từ 2 đến 150 ký tự.');
    if (so.length > 80 || ghiChu.length > 500) throw new Error('Số hợp đồng bảo hiểm tối đa 80 ký tự, ghi chú tối đa 500 ký tự.');
    if (!Array.isArray(tt.chiTiet) || !tt.chiTiet.length) throw new Error('Cần ít nhất 1 tài sản được bảo hiểm trong bảng chi tiết.');
    if (tt.chiTiet.length > 200) throw new Error('Tối đa 200 dòng chi tiết cho 1 hợp đồng bảo hiểm.');
    var dong = tt.chiTiet.map(function (c, i) {
      var nhan = 'Dòng ' + (i + 1), ten = String((c && c.tenTaiSan) || '').trim(), ma = String((c && c.maTaiSan) || '').trim();
      if (!ten || ten.length > 200) throw new Error(nhan + ': Tên tài sản bắt buộc (tối đa 200 ký tự).');
      var tu = ngayChuanISO_(c.tuNgay, nhan + ' — Bảo hiểm từ ngày', false), den = ngayChuanISO_(c.denNgay, nhan + ' — Bảo hiểm đến ngày', false);
      if (den < tu) throw new Error(nhan + ': Ngày bảo hiểm đến ngày không được trước từ ngày.');
      return { MaTaiSan: lamSachCongThuc_(ma.substring(0, 60)), TenTaiSan: lamSachCongThuc_(ten), GiaTriBH: docTienNguyen_(c.giaTriBH, nhan + ' — Giá trị bảo hiểm', true), PhiBH: docTienNguyen_(c.phiBH, nhan + ' — Phí bảo hiểm', true),
        TienBH: docTienNguyen_(c.tienBH, nhan + ' — Tiền bảo hiểm', true), TuNgay: tu, DenNgay: den };
    });
    var canhGanGiong = canhBaoTenGanGiong_(ts.MaTS, String(tt.maBH || '').trim(), dong.map(function (d) { return { MaTaiSan: d.MaTaiSan, TenTaiSan: d.TenTaiSan }; }));
    var me = layDanhTinh_().email || emailNguoiDung_(), dsBH = docSheetBaoDam_(SHEET_BAO_HIEM_TS), ma = String(tt.maBH || '').trim();
    var cha = { SoHDBaoHiem: lamSachCongThuc_(so), NgayKyHD: ngayKy, CongTyBaoHiem: lamSachCongThuc_(cty), GhiChu: lamSachCongThuc_(ghiChu) }, kq;
    if (ma) {
      var cu = dsBH.filter(function (x) { return String(x.MaBH) === ma && String(x.MaTS) === String(ts.MaTS); })[0];
      if (!cu) throw new Error('Không tìm thấy hợp đồng bảo hiểm ' + ma + ' của tài sản này.');
      if (cu.TrangThai !== BH_HIEU_LUC) throw new Error('Hợp đồng bảo hiểm đã hủy — không sửa.');
      kiemTraRevisionBD_(cu, tt.expectedRevision, 'Hợp đồng bảo hiểm ' + ma, true);
      kq = ghiHopDongBH_({ moi: false, ma: ma, maTS: ts.MaTS, cha: cha, dong: dong, me: me, chaCu: cu, soDongCu: chiTietHienHanhBH_().filter(function (c) { return String(c.MaBH) === ma; }).length });
    } else {
      // Yêu cầu lặp (mất phản hồi rồi bấm lưu lại): cùng tài sản + số HĐ + công ty + ngày ký + cùng chi tiết → trả bản đã có, không sinh bản thứ hai.
      var ctNay = chuKyChiTietBH_(dong), ctSheet = chiTietHienHanhBH_();
      var khop = dsBH.filter(function (x) { return x.TrangThai === BH_HIEU_LUC && String(x.MaTS) === String(ts.MaTS) && chuanKhongDau_(x.SoHDBaoHiem || '') === chuanKhongDau_(so) && chuanKhongDau_(x.CongTyBaoHiem || '') === chuanKhongDau_(cty) && ngayIsoCuaO_(x.NgayKyHD) === ngayKy; });
      for (var q = 0; q < khop.length; q++) {
        var chuKyCu = chuKyChiTietBH_(ctSheet.filter(function (c) { return String(c.MaBH) === String(khop[q].MaBH); }));
        if (chuKyCu === ctNay) return { maBH: String(khop[q].MaBH), maTS: String(ts.MaTS), daSua: false, soDong: dong.length, congTyMoi: false, trungLap: true, revision: soTheHe_(khop[q].Revision), canhBao: [] };
      }
      if (so && khop.length) throw new Error('Đã có hợp đồng bảo hiểm cùng số “' + so + '”, công ty và ngày ký (' + khop[0].MaBH + ') nhưng nội dung chi tiết khác. Mở hợp đồng đó để sửa; nếu là phụ lục/gia hạn thì đổi số hợp đồng hoặc ngày ký.');
      ma = maBaoDamMoi_('BH', dsBH, 'MaBH');
      kq = ghiHopDongBH_({ moi: true, ma: ma, maTS: ts.MaTS, cha: cha, dong: dong, me: me });
    }
    var phu = viecPhuSauLuuBH_(cty, ma === String(tt.maBH || '').trim() ? 'SUA_BAO_HIEM_TAI_SAN' : 'THEM_BAO_HIEM_TAI_SAN', kq.maBH + ' | ' + ts.MaTS + ' | ' + cty + ' | ' + dong.length + ' dòng');
    return { maBH: kq.maBH, maTS: String(ts.MaTS), daSua: !!String(tt.maBH || '').trim(), soDong: dong.length, congTyMoi: phu.congTyMoi, revision: kq.revision, canhBao: kq.canhBao.concat(phu.canhBao, canhGanGiong) };
  });
}
/** Hủy hợp đồng bảo hiểm (không xoá, giữ lịch sử và chi tiết): cần lý do; expectedRevision BẮT BUỘC, chống hủy bản vừa bị sửa. */
function huyBaoHiemTaiSan(maBH, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var h = docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (x) { return String(x.MaBH) === String(maBH); })[0];
    if (!h) throw new Error('Không tìm thấy hợp đồng bảo hiểm ' + maBH + '.');
    taiSanTheoMa_(h.MaTS);
    if (h.TrangThai !== BH_HIEU_LUC) throw new Error('Hợp đồng bảo hiểm đã hủy trước đó.');
    var rev = kiemTraRevisionBD_(h, expectedRevision, 'Hợp đồng bảo hiểm ' + maBH, true);
    var ly = String(lyDo || '').trim(); if (ly.length < 3) throw new Error('Cần nhập lý do hủy (tối thiểu 3 ký tự).');
    nangCapCauTrucBaoDam_();
    capNhatDongTheoMa_(SHEET_BAO_HIEM_TS, 'MaBH', maBH, { TrangThai: BH_DA_HUY, HuyLuc: new Date(), LyDoHuy: lamSachCongThuc_(ly.substring(0, 500)), NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), Revision: rev + 1 });
    ghiNhatKy_('', 'HUY_BAO_HIEM_TAI_SAN', maBH + ' | ' + ly);
    return { maBH: String(maBH), trangThai: BH_DA_HUY, revision: rev + 1 };
  });
}

/* ------------------------------ ĐIỀU KIỆN RÀNG BUỘC ------------------------------ */
var NHAN_RANG_BUOC_ = { DAT: 'Đạt', SAP_VI_PHAM: 'Sắp vi phạm', VI_PHAM: 'Vi phạm', CHUA_CO_DU_LIEU: 'Chưa có dữ liệu', QUA_HAN_CAP_NHAT: 'Quá hạn cập nhật' };
/** Đánh giá 1 chỉ tiêu. giaTri === null → chưa có. toanTu '<=' (không vượt ngưỡng) hoặc '>=' (không thấp hơn ngưỡng). Thuần, kiểm thử được. */
function danhGiaRangBuoc_(toanTu, nguong, giaTri) {
  if (giaTri === null || giaTri === undefined || !isFinite(giaTri)) return 'CHUA_CO_DU_LIEU';
  if (toanTu === '<=') {
    if (giaTri > nguong) return 'VI_PHAM';
    return giaTri >= nguong * (1 - BIEN_AN_TOAN_RB_) ? 'SAP_VI_PHAM' : 'DAT';
  }
  if (giaTri < nguong) return 'VI_PHAM';
  return giaTri <= nguong * (1 + BIEN_AN_TOAN_RB_) ? 'SAP_VI_PHAM' : 'DAT';
}
/** Giá trị tự tính theo loại; trả null khi không tính được. */
function giaTriTuDongRangBuoc_(loai, maHD, hanMucRow, baoDamRow, duNoVND) {
  if (loai === 'TY_LE_HAN_MUC') return hanMucRow > 0 ? Math.round(duNoVND / hanMucRow * 10000) / 100 : null;
  if (loai === 'TY_LE_VAY_TAI_SAN') return baoDamRow && baoDamRow.tong > 0 ? Math.round(duNoVND / baoDamRow.tong * 10000) / 100 : null;
  return null;
}
function layDieuKienRangBuoc(maHD) {
  yeuCauDangNhap_();
  return dieuKienRangBuoc_(maHD);
}
function dieuKienRangBuoc_(maHD, nc) {
  nc = nc || ngCanhQLV_(true);
  var tra = nc.kv.tra, pv = phamViCongTyNguoiDung_(), today = nc.today, kv = nc.kv, duNoHD = {}, bd = nc.baoDam;
  kv.rows.forEach(function (k) { duNoHD[k.maHD] = (duNoHD[k.maHD] || 0) + k.duNoVND; });
  var rows = docSheetBaoDam_(SHEET_RANG_BUOC).filter(function (r) {
    var hd = tra.hd[String(r.MaHD)];
    if (maHD && String(r.MaHD) !== String(maHD)) return false;
    return r.TrangThai !== 'Ngừng áp dụng' && hd && (!pv.length || pv.indexOf(String(hd.MaCty)) >= 0);
  }).map(function (r) {
    var hd = tra.hd[String(r.MaHD)] || {}, loai = String(r.Loai), nguong = Number(r.Nguong), toanTu = r.ToanTu === '>=' ? '>=' : '<=';
    var tuDong = loai !== 'THU_CONG', gt = tuDong ? giaTriTuDongRangBuoc_(loai, r.MaHD, Number(hd.HanMucVay) || 0, bd[String(r.MaHD)], duNoHD[String(r.MaHD)] || 0)
      : (String(r.GiaTri).trim() === '' ? null : Number(r.GiaTri));
    var ngayCN = tuDong ? today : ngayIsoCuaO_(r.NgayCapNhat), ky = Number(r.KyKiemTraNgay) || 0, tt = danhGiaRangBuoc_(toanTu, nguong, gt);
    if (!tuDong && tt !== 'CHUA_CO_DU_LIEU' && ky > 0 && ngayCN && soNgayGiuaIso_(ngayCN, today) > ky) tt = 'QUA_HAN_CAP_NHAT';
    return { maRB: String(r.MaRB), maHD: String(r.MaHD), soHopDong: hd.SoHopDong || '', tenCty: (tra.cty[String(hd.MaCty)] || {}).TenCty || '', tenChiTieu: r.TenChiTieu, loai: loai, nhanLoai: LOAI_RANG_BUOC_[loai] || loai,
      toanTu: toanTu, nguong: nguong, donVi: r.DonVi || '', kyKiemTraNgay: ky, giaTri: gt, ngayCapNhat: ngayCN, tuDong: tuDong, trangThai: tt, nhanTrangThai: NHAN_RANG_BUOC_[tt], ghiChu: r.GhiChu || '' };
  });
  var thuTu = { VI_PHAM: 0, SAP_VI_PHAM: 1, QUA_HAN_CAP_NHAT: 2, CHUA_CO_DU_LIEU: 3, DAT: 4 };
  rows.sort(function (a, b) { return (thuTu[a.trangThai] - thuTu[b.trangThai]) || String(a.soHopDong).localeCompare(String(b.soHopDong)); });
  var dem = {}; rows.forEach(function (r) { dem[r.trangThai] = (dem[r.trangThai] || 0) + 1; });
  return { rows: rows, dem: dem, loaiRangBuoc: LOAI_RANG_BUOC_ };
}
/** Khai báo / sửa điều kiện ràng buộc (QUẢN TRỊ). maRB rỗng = tạo mới. */
function luuDieuKienRangBuoc(tt) {
  yeuCauDangNhap_(); yeuCauQuanTri_('khai báo điều kiện ràng buộc');
  return voiKhoa_(function () {
    tt = tt || {};
    hopDongTrongPhamVi_(tt.maHD);
    var ten = String(tt.tenChiTieu || '').trim(), loai = String(tt.loai || ''), toanTu = String(tt.toanTu || '');
    if (ten.length < 3 || ten.length > 120) throw new Error('Tên chỉ tiêu phải từ 3 đến 120 ký tự.');
    if (!LOAI_RANG_BUOC_[loai]) throw new Error('Loại chỉ tiêu không hợp lệ.');
    if (toanTu !== '<=' && toanTu !== '>=') throw new Error('Toán tử phải là ≤ (không vượt) hoặc ≥ (không thấp hơn).');
    var nguong = docSoThuc_(tt.nguong, 'Ngưỡng', -1e9, 1e12);
    var ky = tt.kyKiemTraNgay === '' || tt.kyKiemTraNgay === undefined ? 0 : docSoThuc_(tt.kyKiemTraNgay, 'Kỳ kiểm tra (ngày)', 0, 3650);
    var donVi = String(tt.donVi || (loai === 'THU_CONG' ? '' : '%')).trim().substring(0, 20), me = layDanhTinh_().email || emailNguoiDung_();
    var ds = docSheetBaoDam_(SHEET_RANG_BUOC), ma = String(tt.maRB || '').trim();
    // Chống ghi trùng (bấm lưu hai lần / hai người cùng khai): cùng hợp đồng + cùng tên chỉ tiêu (bỏ dấu/khoảng trắng) + cùng loại + cùng toán tử đang áp dụng = đã có.
    var khoaTen = khoaHangMucBH_(ten), trung = ds.filter(function (r) { return String(r.MaRB) !== ma && String(r.MaHD) === String(tt.maHD) && r.TrangThai !== 'Ngừng áp dụng' && khoaHangMucBH_(r.TenChiTieu) === khoaTen && String(r.Loai) === loai && String(r.ToanTu) === toanTu; })[0];
    if (trung) throw new Error('Hợp đồng này đã có điều kiện “' + trung.TenChiTieu + '” (' + trung.MaRB + ') cùng loại và toán tử. Sửa điều kiện đó thay vì tạo thêm, hoặc ngừng áp dụng điều kiện cũ.');
    if (ma) {
      if (!ds.some(function (r) { return String(r.MaRB) === ma; })) throw new Error('Không tìm thấy điều kiện ' + ma + '.');
      capNhatDongTheoMa_(SHEET_RANG_BUOC, 'MaRB', ma, { MaHD: tt.maHD, TenChiTieu: lamSachCongThuc_(ten), Loai: loai, ToanTu: toanTu, Nguong: nguong, DonVi: lamSachCongThuc_(donVi), KyKiemTraNgay: ky,
        GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').substring(0, 500)), NguoiGhi: me, ThoiDiemGhi: new Date() });
      ghiNhatKy_('', 'SUA_RANG_BUOC', ma + ' | ' + ten);
      return { maRB: ma, daSua: true };
    }
    ma = maBaoDamMoi_('RB', ds, 'MaRB');
    ghiDongMoi_(SHEET_RANG_BUOC, COT_RANG_BUOC_, { MaRB: ma, MaHD: tt.maHD, TenChiTieu: lamSachCongThuc_(ten), Loai: loai, ToanTu: toanTu, Nguong: nguong, DonVi: lamSachCongThuc_(donVi), KyKiemTraNgay: ky,
      TrangThai: 'Đang áp dụng', GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').substring(0, 500)), NguoiGhi: me, ThoiDiemGhi: new Date() });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'THEM_RANG_BUOC', ma + ' | ' + tt.maHD + ' | ' + ten);
    return { maRB: ma, daSua: false };
  });
}
/** Cập nhật giá trị kỳ này cho chỉ tiêu nhập tay (NHẬP LIỆU trở lên). */
function capNhatGiaTriRangBuoc(maRB, giaTri, ngay, ghiChu) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_RANG_BUOC).filter(function (x) { return String(x.MaRB) === String(maRB) && x.TrangThai !== 'Ngừng áp dụng'; })[0];
    if (!r) throw new Error('Không tìm thấy điều kiện ' + maRB + '.');
    hopDongTrongPhamVi_(r.MaHD);
    if (r.Loai !== 'THU_CONG') throw new Error('Chỉ tiêu này tự tính từ dữ liệu hệ thống, không nhập tay.');
    var gt = docSoThuc_(giaTri, 'Giá trị', -1e9, 1e12), nay = ngayChuanISO_(ngay || homNayVN_(), 'Ngày ghi nhận', true);
    capNhatDongTheoMa_(SHEET_RANG_BUOC, 'MaRB', maRB, { GiaTri: gt, NgayCapNhat: nay, GhiChu: lamSachCongThuc_(String(ghiChu || r.GhiChu || '').substring(0, 500)), NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), ThoiDiemGhi: new Date() });
    ghiNhatKy_('', 'CAP_NHAT_RANG_BUOC', maRB + ' | ' + gt + ' | ' + nay);
    return { maRB: String(maRB), giaTri: gt, ngay: nay };
  });
}
/** Ngừng áp dụng (không xoá). */
function xoaDieuKienRangBuoc(maRB) {
  yeuCauDangNhap_(); yeuCauQuanTri_('ngừng áp dụng điều kiện ràng buộc');
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_RANG_BUOC).filter(function (x) { return String(x.MaRB) === String(maRB); })[0];
    if (!r) throw new Error('Không tìm thấy điều kiện ' + maRB + '.');
    hopDongTrongPhamVi_(r.MaHD);
    capNhatDongTheoMa_(SHEET_RANG_BUOC, 'MaRB', maRB, { TrangThai: 'Ngừng áp dụng', NguoiGhi: layDanhTinh_().email || emailNguoiDung_(), ThoiDiemGhi: new Date() });
    ghiNhatKy_('', 'NGUNG_RANG_BUOC', String(maRB));
    return { maRB: String(maRB) };
  });
}
