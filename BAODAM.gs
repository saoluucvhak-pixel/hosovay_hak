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
var COT_TAI_SAN_ = ['MaTS', 'MaHD', 'LoaiTS', 'MoTa', 'GiaTriVND', 'NgayDinhGia', 'SoHDBaoDam', 'NgayHetHanBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'GiaiChapLuc', 'LyDoGiaiChap', 'NguyenGia', 'KhauHao', 'GiaTriConLai', 'Revision'];
var TS_DANG_BAO_DAM = 'Đang bảo đảm', TS_DA_GIAI_CHAP = 'Đã giải chấp';
var LOAI_TAI_SAN_ = { BDS: 'Bất động sản', DONG_SAN: 'Động sản / phương tiện / máy móc', TIEN_GUI: 'Tiền gửi / giấy tờ có giá', HANG_TON_KHO: 'Hàng tồn kho', KHAC: 'Khác' };
var SHEET_RANG_BUOC = 'DieuKienRangBuoc';
var COT_RANG_BUOC_ = ['MaRB', 'MaHD', 'TenChiTieu', 'Loai', 'ToanTu', 'Nguong', 'DonVi', 'KyKiemTraNgay', 'GiaTri', 'NgayCapNhat', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi'];
var LOAI_RANG_BUOC_ = { THU_CONG: 'Nhập tay theo kỳ', TY_LE_HAN_MUC: 'Tự tính: dư nợ / hạn mức (%)', TY_LE_VAY_TAI_SAN: 'Tự tính: dư nợ / giá trị TSBĐ (%)' };
var BIEN_AN_TOAN_RB_ = 0.1, NGAY_CB_BAO_HIEM_ = 15; // bảo hiểm tài sản: cảnh báo khi còn ≤ 15 ngày
/** BẢO HIỂM TÀI SẢN THẾ CHẤP — con của dòng đăng ký thế chấp (TaiSanBaoDam): hợp đồng bảo hiểm (ngày ký, công ty BH) + bảng con chi tiết tài sản được bảo hiểm. Không xoá: "hủy" = đổi trạng thái. */
var SHEET_BAO_HIEM_TS = 'BaoHiemTaiSan', SHEET_BAO_HIEM_TS_CT = 'BaoHiemTaiSanChiTiet';
var COT_BAO_HIEM_TS_ = ['MaBH', 'MaTS', 'SoHDBaoHiem', 'NgayKyHD', 'CongTyBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'HuyLuc', 'LyDoHuy', 'Revision', 'TheHe'];
var COT_BAO_HIEM_TS_CT_ = ['MaBH', 'STT', 'MaTaiSan', 'TenTaiSan', 'GiaTriBH', 'PhiBH', 'TienBH', 'TuNgay', 'DenNgay', 'TheHe'];
var BH_HIEU_LUC = 'Hiệu lực', BH_DA_HUY = 'Đã hủy';

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
function docSheetBaoDam_(ten) { return getSS_().getSheetByName(ten) ? sheetToObjects_(ten) : []; }
function ghiDongMoi_(ten, cot, o) {
  var sh = ensureSheet_(getSS_(), ten, cot), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  themDongVaoCuoiThat_(sh, headers.map(function (h) { return o.hasOwnProperty(h) ? o[h] : ''; }));
}
function capNhatDongTheoMa_(ten, khoa, ma, cot) {
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
/** Các dòng chi tiết HIỆN HÀNH (đúng thế hệ của cha). Dòng mồ côi / thế hệ cũ bị loại. */
function chiTietHienHanhBH_() {
  var cha = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
  return docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).filter(function (c) { var k = String(c.MaBH); return cha.hasOwnProperty(k) && soTheHe_(c.TheHe) === cha[k]; });
}
function docChaBH_(ma) { return docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (h) { return String(h.MaBH) === String(ma); })[0] || null; }
/** Xoá các dòng chi tiết (MaBH, TheHe) rồi ĐỌC LẠI để xác minh. Không ném lỗi: { daDon (đã xác minh), conLai, loi }. */
function donChiTietBH_(ma, theHe) {
  var kq = { daDon: false, conLai: -1, loi: '' };
  try {
    var sh = getSS_().getSheetByName(SHEET_BAO_HIEM_TS_CT);
    if (sh && sh.getLastRow() >= 2) {
      var v = layGiaTriThatCuaSheet_(sh), h = v[0].map(String), cM = h.indexOf('MaBH'), cT = h.indexOf('TheHe');
      for (var r = v.length - 1; r >= 1; r--) if (String(v[r][cM]) === String(ma) && soTheHe_(cT < 0 ? 0 : v[r][cT]) === soTheHe_(theHe)) xoaDongAnToan_(sh, r + 1);
    }
  } catch (e) { kq.loi = e.message; }
  try { kq.conLai = docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).filter(function (c) { return String(c.MaBH) === String(ma) && soTheHe_(c.TheHe) === soTheHe_(theHe); }).length; kq.daDon = kq.conLai === 0; } catch (e2) { kq.loi = kq.loi || e2.message; }
  return kq;
}
function moTaDon_(d) { return d.daDon ? 'Phần ghi dở đã được dọn và xác minh sạch.' : 'Phần ghi dở CHƯA dọn được' + (d.conLai >= 0 ? ' (còn ' + d.conLai + ' dòng chi tiết không hiển thị)' : ' (không xác minh được)') + (d.loi ? ' — ' + d.loi : '') + '. Không ảnh hưởng dữ liệu đang xem; Quản trị chạy “Dọn dữ liệu bảo hiểm thừa” để xoá.'; }
/** Số dòng chi tiết không hiển thị (mồ côi hoặc thế hệ cũ). Không kiểm quyền (dùng nội bộ). */
function demChiTietThuaBH_() {
  var cha = {}, n = 0; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
  docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).forEach(function (c) { var k = String(c.MaBH); if (!cha.hasOwnProperty(k) || soTheHe_(c.TheHe) !== cha[k]) n++; });
  return n;
}
/** Trạng thái toàn vẹn: số dòng chi tiết không hiển thị (mồ côi hoặc thế hệ cũ) — cần phục hồi/dọn khi > 0. */
function layTrangThaiToanVenBaoHiem() {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem trạng thái toàn vẹn bảo hiểm');
  var cha = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
  var moCoi = 0, cu = 0; docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).forEach(function (c) { var k = String(c.MaBH); if (!cha.hasOwnProperty(k)) moCoi++; else if (soTheHe_(c.TheHe) !== cha[k]) cu++; });
  return { dongMoCoi: moCoi, dongTheHeCu: cu, canPhucHoi: moCoi + cu > 0 };
}
/** Xoá dòng chi tiết không hiển thị (mồ côi + thế hệ cũ). Chỉ Quản trị; chỉ đụng dòng đã vô hình. */
function donChiTietBaoHiemThua() {
  yeuCauDangNhap_(); yeuCauQuanTri_('dọn dữ liệu bảo hiểm thừa');
  return voiKhoa_(function () {
    var sh = getSS_().getSheetByName(SHEET_BAO_HIEM_TS_CT), xoa = 0;
    if (sh && sh.getLastRow() >= 2) {
      var cha = {}; docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { cha[String(h.MaBH)] = soTheHe_(h.TheHe); });
      var v = layGiaTriThatCuaSheet_(sh), h = v[0].map(String), cM = h.indexOf('MaBH'), cT = h.indexOf('TheHe');
      for (var r = v.length - 1; r >= 1; r--) { var k = String(v[r][cM]); if (!cha.hasOwnProperty(k) || soTheHe_(cT < 0 ? 0 : v[r][cT]) !== cha[k]) { xoaDongAnToan_(sh, r + 1); xoa++; } }
    }
    ghiNhatKy_('', 'DON_BAO_HIEM_THUA', 'đã xoá ' + xoa + ' dòng chi tiết không hiển thị');
    return { daXoa: xoa, conLai: layTrangThaiToanVenBaoHiem() };
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
function khoaHangMucBH_(c) { return chuanKhongDau_(String(c.MaTaiSan || '').trim() || String(c.TenTaiSan || '').trim()); }
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
function tomTatBaoDamTheoHD_() {
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
function taiSanBaoDam_(maHD) {
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
/** Nâng cấp cấu trúc (an toàn chạy lại nhiều lần, không đụng dữ liệu): thêm cột Revision/TheHe còn thiếu cho 3 bảng tài sản–bảo hiểm. */
function nangCapCauTrucBaoDam_() {
  var ss = getSS_();
  damBaoCotSheet_(ensureSheet_(ss, SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_), COT_TAI_SAN_);
  damBaoCotSheet_(ensureSheet_(ss, SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_), COT_BAO_HIEM_TS_);
  damBaoCotSheet_(ensureSheet_(ss, SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_), COT_BAO_HIEM_TS_CT_);
}
/**
 * GHI 1 HỢP ĐỒNG BẢO HIỂM theo thế hệ (người gọi đang giữ khoá). p = { moi, ma, maTS, cha:{SoHDBaoHiem,NgayKyHD,CongTyBaoHiem,GhiChu}, dong:[{MaTaiSan,TenTaiSan,GiaTriBH,PhiBH,TienBH,TuNgay,DenNgay}], me, chaCu }.
 * Thành công trả { maBH, revision, theHe, canhBao:[] } (canhBao = việc phụ chưa xong nhưng dữ liệu chính ĐÃ lưu). Thất bại ném lỗi nêu chính xác: chưa lưu gì (dữ liệu cũ còn nguyên) và phần ghi dở đã dọn/chưa dọn.
 */
function ghiHopDongBH_(p) {
  var ma = p.ma, cuTheHe = p.moi ? 0 : soTheHe_(p.chaCu.TheHe), moiTheHe = cuTheHe + 1, canhBao = [], rev = p.moi ? 1 : soTheHe_(p.chaCu.Revision) + 1;
  nangCapCauTrucBaoDam_();
  // 1) chi tiết ở thế hệ MỚI (chưa hiển thị với ai)
  try {
    p.dong.forEach(function (d, i) { var o = {}; Object.keys(d).forEach(function (k) { o[k] = d[k]; }); o.MaBH = ma; o.STT = i + 1; o.TheHe = moiTheHe; ghiDongMoi_(SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_, o); });
    SpreadsheetApp.flush();
  } catch (e1) {
    var d1 = donChiTietBH_(ma, moiTheHe);
    throw new Error('Chưa lưu hợp đồng bảo hiểm ' + ma + ' (lỗi ghi chi tiết: ' + e1.message + '). Dữ liệu cũ còn nguyên. ' + moTaDon_(d1));
  }
  // 2) CHỐT: ghi cha (thế hệ mới + thông tin mới) — một thao tác duy nhất làm bản mới hiển thị
  var chot = Object.assign({}, p.cha, { TheHe: moiTheHe, Revision: rev, NguoiGhi: p.me, ThoiDiemGhi: new Date() });
  try {
    if (p.moi) ghiDongMoi_(SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_, Object.assign({ MaBH: ma, MaTS: p.maTS, TrangThai: BH_HIEU_LUC }, chot));
    else capNhatDongTheoMa_(SHEET_BAO_HIEM_TS, 'MaBH', ma, chot);
  } catch (e2) {
    var thuc = null; try { thuc = docChaBH_(ma); } catch (e3) { /* không đọc được: xử như chưa chốt */ }
    if (thuc && soTheHe_(thuc.TheHe) === moiTheHe) canhBao.push('Bước ghi báo lỗi (' + e2.message + ') nhưng đã ĐỌC LẠI và xác nhận hợp đồng ' + ma + ' được lưu đúng.');
    else {
      var d2 = donChiTietBH_(ma, moiTheHe);
      throw new Error('Chưa lưu hợp đồng bảo hiểm ' + ma + ' (lỗi cập nhật hợp đồng: ' + e2.message + '). Dữ liệu cũ còn nguyên (đã đọc lại xác minh). ' + moTaDon_(d2));
    }
  }
  // 3) dọn thế hệ cũ (không bắt buộc: dòng cũ đã vô hình)
  if (!p.moi) { var d3 = donChiTietBH_(ma, cuTheHe); if (!d3.daDon) canhBao.push('Đã lưu, nhưng chưa dọn được ' + Math.max(d3.conLai, 0) + ' dòng chi tiết bản cũ (không hiển thị, không ảnh hưởng). Quản trị có thể chạy “Dọn dữ liệu bảo hiểm thừa”.'); }
  return { maBH: ma, revision: rev, theHe: moiTheHe, canhBao: canhBao };
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
    var gt0 = hopNhatGiaTriTS_(null, moiGT), cotMoi = { NguyenGia: gt0.ng === null ? '' : gt0.ng, KhauHao: gt0.kh === null ? '' : gt0.kh, GiaTriConLai: gt0.cl === null ? '' : gt0.cl };
    ma = maBaoDamMoi_('TS', ds, 'MaTS');
    ghiDongMoi_(SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_, { MaTS: ma, MaHD: tt.maHD, LoaiTS: loai, MoTa: lamSachCongThuc_(moTa), GiaTriVND: giaTri, NgayDinhGia: ngayDG, SoHDBaoDam: lamSachCongThuc_(soHD),
      NgayHetHanBaoHiem: han, TrangThai: TS_DANG_BAO_DAM, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date(), NguyenGia: cotMoi.NguyenGia, KhauHao: cotMoi.KhauHao, GiaTriConLai: cotMoi.GiaTriConLai, Revision: 1 });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'THEM_TAI_SAN_BAO_DAM', ma + ' | ' + tt.maHD + ' | ' + loai + ' | ' + giaTri);
    return { maTS: ma, daSua: false, revision: 1 };
  });
}
/** Giải chấp (không xoá): đổi trạng thái kèm lý do. expectedRevision (nếu có) chống giải chấp tài sản vừa bị người khác sửa. Giữ nguyên bảo hiểm và lịch sử. */
function giaiChapTaiSan(maTS, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (x) { return String(x.MaTS) === String(maTS); })[0];
    if (!r) throw new Error('Không tìm thấy tài sản ' + maTS + '.');
    hopDongTrongPhamVi_(r.MaHD);
    if (r.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp trước đó.');
    var rev = kiemTraRevisionBD_(r, expectedRevision, 'Tài sản ' + maTS, false);
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
    var me = layDanhTinh_().email || emailNguoiDung_(), dsBH = docSheetBaoDam_(SHEET_BAO_HIEM_TS), ma = String(tt.maBH || '').trim();
    var cha = { SoHDBaoHiem: lamSachCongThuc_(so), NgayKyHD: ngayKy, CongTyBaoHiem: lamSachCongThuc_(cty), GhiChu: lamSachCongThuc_(ghiChu) }, kq;
    if (ma) {
      var cu = dsBH.filter(function (x) { return String(x.MaBH) === ma && String(x.MaTS) === String(ts.MaTS); })[0];
      if (!cu) throw new Error('Không tìm thấy hợp đồng bảo hiểm ' + ma + ' của tài sản này.');
      if (cu.TrangThai !== BH_HIEU_LUC) throw new Error('Hợp đồng bảo hiểm đã hủy — không sửa.');
      kiemTraRevisionBD_(cu, tt.expectedRevision, 'Hợp đồng bảo hiểm ' + ma, true);
      kq = ghiHopDongBH_({ moi: false, ma: ma, maTS: ts.MaTS, cha: cha, dong: dong, me: me, chaCu: cu });
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
    return { maBH: kq.maBH, maTS: String(ts.MaTS), daSua: !!String(tt.maBH || '').trim(), soDong: dong.length, congTyMoi: phu.congTyMoi, revision: kq.revision, canhBao: kq.canhBao.concat(phu.canhBao) };
  });
}
/** Hủy hợp đồng bảo hiểm (không xoá, giữ lịch sử và chi tiết): cần lý do; expectedRevision (nếu có) chống hủy bản vừa bị sửa. */
function huyBaoHiemTaiSan(maBH, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var h = docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (x) { return String(x.MaBH) === String(maBH); })[0];
    if (!h) throw new Error('Không tìm thấy hợp đồng bảo hiểm ' + maBH + '.');
    taiSanTheoMa_(h.MaTS);
    if (h.TrangThai !== BH_HIEU_LUC) throw new Error('Hợp đồng bảo hiểm đã hủy trước đó.');
    var rev = kiemTraRevisionBD_(h, expectedRevision, 'Hợp đồng bảo hiểm ' + maBH, false);
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
