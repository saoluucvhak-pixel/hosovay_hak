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
// Bảo hiểm tài sản kiểu CŨ (sheet BaoHiemTaiSan*): dữ liệu được GIỮ NGUYÊN trong Sheet nhưng ứng dụng không còn đọc/ghi/nhập. Hai hằng này chỉ để lưu trữ theo năm và chặn xóa khách hàng đã từng là công ty bảo hiểm.
var SHEET_BAO_HIEM_TS = 'BaoHiemTaiSan', SHEET_BAO_HIEM_TS_CT = 'BaoHiemTaiSanChiTiet';

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


/* ===== ĐÁNH GIÁ THỜI HẠN BẢO HIỂM THEO TỪNG HẠNG MỤC (một nguồn cho bảng tài sản, modal bảo hiểm, Tổng quan) ===== */
var BH_UU_TIEN_ = { CHUA_BAO_HIEM: 6, DANG_BAO_HIEM: 1, SAP_HET: 2, CHUA_BAT_DAU: 3, KHOANG_TRONG: 4, QUA_HAN: 5 };
var BH_CANH_BAO_ = { CHUA_BAO_HIEM: 1, SAP_HET: 1, CHUA_BAT_DAU: 1, KHOANG_TRONG: 1, QUA_HAN: 1 };
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
/**
 * Tình trạng bảo hiểm HIỆN TẠI của từng tài sản (xấu nhất theo hạng mục): { maTS: { han (ngày hết hạn thật, '' nếu chưa bắt đầu), soHD, tinhTrang, hangMuc, ngayBatDau, ngayLienQuan, soNgay, hangMucChiTiet } }.
 */
function hanBaoHiemTheoTaiSan_(homNay) {
  return ts2BaoHiemBaoCao_(homNay || homNayVN_());
}
/** Tổng hợp theo hợp đồng (nội bộ): {maHD: {tong, soTS, sapHetBaoHiem, quaHanBaoHiem}} — chỉ tài sản đang bảo đảm. quaHan gồm hết hạn, khoảng trống, chưa bắt đầu (đều là chưa được bảo vệ hôm nay). */
function tomTatBaoDamTheoHD_() { return voiBoNhoBH_(tomTatBaoDamTheoHDKhongNho_); }
function tomTatBaoDamTheoHDKhongNho_() {
  var kq = {}, today = homNayVN_(), bh = hanBaoHiemTheoTaiSan_();
  docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).concat(ts2DangKyBaoCao_()).forEach(function (r) {
    if (r.TrangThai !== TS_DANG_BAO_DAM) return;
    var k = String(r.MaHD), o = kq[k] || (kq[k] = { tong: 0, soTS: 0, sapHetBaoHiem: 0, quaHanBaoHiem: 0 });
    o.tong = congSoTien_(o.tong, Number(r.GiaTriVND) || 0); o.soTS += r.NguonDanhMuc ? Number(r.SoTaiSan) : 1;
    var b0 = bh[String(r.MaTS)];
    if (b0 && b0.tinhTrang) { if (b0.tinhTrang === 'SAP_HET') o.sapHetBaoHiem++; else if (BH_CANH_BAO_[b0.tinhTrang]) o.quaHanBaoHiem++; }
    else { var han = ngayIsoCuaO_(r.NgayHetHanBaoHiem); if (han) { var n = soNgayGiuaIso_(today, han); if (n < 0) o.quaHanBaoHiem++; else if (n <= NGAY_CB_BAO_HIEM_) o.sapHetBaoHiem++; } }
  });
  return kq;
}
function layTaiSanBaoDam(maHD) {
  yeuCauDangNhap_();
  return taiSanBaoDam_(maHD);
}
function taiSanBaoDam_(maHD) { return voiBoNhoBH_(function () { return taiSanBaoDamKhongNho_(maHD); }); }
function taiSanBaoDamKhongNho_(maHD) {
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), today = homNayVN_(), bh = hanBaoHiemTheoTaiSan_();
  var rows = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).concat(ts2DangKyBaoCao_()).filter(function (r) {
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
/** Nâng cấp cấu trúc (an toàn chạy lại nhiều lần, không đụng dữ liệu): thêm cột còn thiếu cho các bảng tài sản–bảo hiểm và tạo bảng dấu vết giao dịch. */
function nangCapCauTrucBaoDam_() {
  var ss = getSS_();
  damBaoCotSheet_(ensureSheet_(ss, SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_), COT_TAI_SAN_);
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
