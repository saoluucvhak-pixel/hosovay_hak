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
var COT_TAI_SAN_ = ['MaTS', 'MaHD', 'LoaiTS', 'MoTa', 'GiaTriVND', 'NgayDinhGia', 'SoHDBaoDam', 'NgayHetHanBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'GiaiChapLuc', 'LyDoGiaiChap', 'NguyenGia', 'KhauHao', 'GiaTriConLai'];
var TS_DANG_BAO_DAM = 'Đang bảo đảm', TS_DA_GIAI_CHAP = 'Đã giải chấp';
var LOAI_TAI_SAN_ = { BDS: 'Bất động sản', DONG_SAN: 'Động sản / phương tiện / máy móc', TIEN_GUI: 'Tiền gửi / giấy tờ có giá', HANG_TON_KHO: 'Hàng tồn kho', KHAC: 'Khác' };
var SHEET_RANG_BUOC = 'DieuKienRangBuoc';
var COT_RANG_BUOC_ = ['MaRB', 'MaHD', 'TenChiTieu', 'Loai', 'ToanTu', 'Nguong', 'DonVi', 'KyKiemTraNgay', 'GiaTri', 'NgayCapNhat', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi'];
var LOAI_RANG_BUOC_ = { THU_CONG: 'Nhập tay theo kỳ', TY_LE_HAN_MUC: 'Tự tính: dư nợ / hạn mức (%)', TY_LE_VAY_TAI_SAN: 'Tự tính: dư nợ / giá trị TSBĐ (%)' };
var BIEN_AN_TOAN_RB_ = 0.1, NGAY_CB_BAO_HIEM_ = 15; // bảo hiểm tài sản: cảnh báo khi còn ≤ 15 ngày
/** BẢO HIỂM TÀI SẢN THẾ CHẤP — con của dòng đăng ký thế chấp (TaiSanBaoDam): hợp đồng bảo hiểm (ngày ký, công ty BH) + bảng con chi tiết tài sản được bảo hiểm. Không xoá: "hủy" = đổi trạng thái. */
var SHEET_BAO_HIEM_TS = 'BaoHiemTaiSan', SHEET_BAO_HIEM_TS_CT = 'BaoHiemTaiSanChiTiet';
var COT_BAO_HIEM_TS_ = ['MaBH', 'MaTS', 'SoHDBaoHiem', 'NgayKyHD', 'CongTyBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'HuyLuc', 'LyDoHuy'];
var COT_BAO_HIEM_TS_CT_ = ['MaBH', 'STT', 'MaTaiSan', 'TenTaiSan', 'GiaTriBH', 'PhiBH', 'TienBH', 'TuNgay', 'DenNgay'];
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
/**
 * Tình trạng bảo hiểm của từng tài sản THEO TỪNG HẠNG MỤC được bảo hiểm (dòng chi tiết của các hợp đồng bảo hiểm HIỆU LỰC), tại ngày homNay:
 *  • Mỗi hạng mục (khoá = Mã tài sản bảo hiểm, không có thì Tên) gom các khoảng từ–đến; khoảng liền nhau/chồng nhau (gia hạn) được nối thành chuỗi.
 *  • Hôm nay nằm trong chuỗi → còn bảo hiểm đến cuối chuỗi; chưa tới ngày bắt đầu (và chưa có chuỗi nào đang hiệu lực) → CHUA_HIEU_LUC; mọi khoảng đã qua → QUA_HAN.
 *  • Tài sản lấy hạng mục XẤU NHẤT (hết hạn > chưa hiệu lực > còn bảo hiểm với ngày hết sớm nhất) — không để 1 hợp đồng còn hạn che hạng mục đã hết.
 * Trả { maTS: { han, soHD, tinhTrang: ''|'QUA_HAN'|'CHUA_HIEU_LUC', batDau } }; han = ngày hết hạn của chuỗi đang hiệu lực (hoặc ngày hết gần nhất / ngày bắt đầu tới).
 */
function hanBaoHiemTheoTaiSan_(homNay) {
  var today = homNay || homNayVN_(), hieuLuc = {}, kq = {}, khoang = {};
  docSheetBaoDam_(SHEET_BAO_HIEM_TS).forEach(function (h) { if (h.TrangThai === BH_HIEU_LUC) hieuLuc[String(h.MaBH)] = String(h.MaTS); });
  Object.keys(hieuLuc).forEach(function (mb) { var o = kq[hieuLuc[mb]] || (kq[hieuLuc[mb]] = { han: '', soHD: 0, tinhTrang: '', batDau: '' }); o.soHD++; });
  docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).forEach(function (c) {
    var ts = hieuLuc[String(c.MaBH)]; if (!ts) return;
    var tu = ngayIsoCuaO_(c.TuNgay), den = ngayIsoCuaO_(c.DenNgay); if (!den) return;
    var key = chuanKhongDau_(String(c.MaTaiSan || '').trim() || String(c.TenTaiSan || '').trim());
    ((khoang[ts] = khoang[ts] || {})[key] = khoang[ts][key] || []).push({ tu: tu || '0000-01-01', den: den });
  });
  Object.keys(khoang).forEach(function (ts) {
    var o = kq[ts], xau = null, hang = [];
    Object.keys(khoang[ts]).forEach(function (k) {
      var ds = khoang[ts][k].sort(function (a, b) { return a.tu < b.tu ? -1 : (a.tu > b.tu ? 1 : 0); }), chuoi = [];
      ds.forEach(function (x) { var cu = chuoi[chuoi.length - 1]; if (cu && x.tu <= bhCongNgay_(cu.den, 1)) { if (x.den > cu.den) cu.den = x.den; } else chuoi.push({ tu: x.tu, den: x.den }); });
      var dang = chuoi.filter(function (c) { return c.tu <= today && c.den >= today; })[0], sau = chuoi.filter(function (c) { return c.tu > today; })[0], truoc = chuoi.filter(function (c) { return c.den < today; });
      if (dang) hang.push({ muc: 0, han: dang.den, batDau: '' });
      else if (sau) hang.push({ muc: 1, han: sau.tu, batDau: sau.tu, tinhTrang: 'CHUA_HIEU_LUC' });
      else hang.push({ muc: 2, han: truoc.length ? truoc[truoc.length - 1].den : '', batDau: '', tinhTrang: 'QUA_HAN' });
    });
    hang.forEach(function (h) {
      if (!xau || h.muc > xau.muc || (h.muc === xau.muc && h.han < xau.han)) xau = h;
    });
    if (xau) { o.han = xau.han; o.tinhTrang = xau.tinhTrang || ''; o.batDau = xau.batDau || ''; }
  });
  return kq;
}
/** Tổng hợp theo hợp đồng (nội bộ): {maHD: {tong, soTS, sapHetBaoHiem, quaHanBaoHiem}} — chỉ tài sản đang bảo đảm. */
function tomTatBaoDamTheoHD_() {
  var kq = {}, today = homNayVN_(), bh = hanBaoHiemTheoTaiSan_();
  docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).forEach(function (r) {
    if (r.TrangThai !== TS_DANG_BAO_DAM) return;
    var k = String(r.MaHD), o = kq[k] || (kq[k] = { tong: 0, soTS: 0, sapHetBaoHiem: 0, quaHanBaoHiem: 0 });
    o.tong = congSoTien_(o.tong, Number(r.GiaTriVND) || 0); o.soTS++;
    var b0 = bh[String(r.MaTS)], han = b0 ? b0.han : ngayIsoCuaO_(r.NgayHetHanBaoHiem);
    if (b0 && b0.tinhTrang === 'CHUA_HIEU_LUC') o.quaHanBaoHiem++;
    else if (han) { var n = soNgayGiuaIso_(today, han); if (n < 0) o.quaHanBaoHiem++; else if (n <= NGAY_CB_BAO_HIEM_) o.sapHetBaoHiem++; }
  });
  return kq;
}
/** Danh sách tài sản đang bảo đảm có bảo hiểm sắp hết (≤ 15 ngày) / đã hết hạn — cho cảnh báo Tổng quan, trong phạm vi công ty được cấp. Hết hạn trước, rồi ít ngày còn lại trước. */
function chiTietCanhBaoBaoHiem_(tra) {
  var kq = taiSanBaoDam_('').rows.filter(function (r) { return r.trangThai === TS_DANG_BAO_DAM && r.canhBaoBaoHiem; }).map(function (r) {
    return { maTS: r.maTS, maHD: r.maHD, moTa: r.moTa, soHopDong: r.soHopDong, tenCty: r.tenCty, han: r.ngayHetHanBaoHiem, soNgay: r.soNgayBaoHiem, muc: r.canhBaoBaoHiem };
  });
  return kq.sort(function (a, b) { return a.soNgay - b.soNgay; });
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
    var hd = tra.hd[String(r.MaHD)] || {}, bhTS = bh[String(r.MaTS)], han = bhTS ? bhTS.han : ngayIsoCuaO_(r.NgayHetHanBaoHiem), n = han ? soNgayGiuaIso_(today, han) : null;
    var chuaHL = bhTS && bhTS.tinhTrang === 'CHUA_HIEU_LUC';
    return { maTS: String(r.MaTS), maHD: String(r.MaHD), soHopDong: hd.SoHopDong || '', tenCty: (tra.cty[String(hd.MaCty)] || {}).TenCty || '', loai: r.LoaiTS, nhanLoai: LOAI_TAI_SAN_[r.LoaiTS] || r.LoaiTS,
      moTa: r.MoTa || '', giaTri: Number(r.GiaTriVND) || 0, nguyenGia: r.NguyenGia === '' || r.NguyenGia === undefined ? null : Number(r.NguyenGia), khauHao: r.KhauHao === '' || r.KhauHao === undefined ? null : Number(r.KhauHao), giaTriConLai: r.GiaTriConLai === '' || r.GiaTriConLai === undefined ? null : Number(r.GiaTriConLai), ngayDinhGia: ngayIsoCuaO_(r.NgayDinhGia), soHDBaoDam: r.SoHDBaoDam || '', ngayHetHanBaoHiem: han, soHopDongBaoHiem: bhTS ? bhTS.soHD : 0,
      canhBaoBaoHiem: r.TrangThai !== TS_DANG_BAO_DAM || n === null ? '' : (chuaHL ? 'CHUA_HIEU_LUC' : (n < 0 ? 'QUA_HAN' : (n <= NGAY_CB_BAO_HIEM_ ? 'SAP_HET' : ''))), soNgayBaoHiem: n,
      trangThai: r.TrangThai, ghiChu: r.GhiChu || '', nguoiGhi: r.NguoiGhi || '' };
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
/**
 * Thay TOÀN BỘ dòng con của 1 hợp đồng bảo hiểm mà không để mất dữ liệu cũ khi lỗi giữa chừng: giữ bản chụp dòng cũ → xoá → ghi mới;
 * lỗi ở bất kỳ bước nào thì xoá phần đã ghi và ghi lại bản cũ (nếu chính bước khôi phục cũng lỗi thì ném lỗi kèm cảnh báo phải kiểm tra bằng tay).
 */
function thayChiTietBaoHiemAnToan_(ma, dongMoi) {
  var cu = docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT).filter(function (c) { return String(c.MaBH) === String(ma); });
  var ghi = function (ds) { ds.forEach(function (d) { ghiDongMoi_(SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_, d); }); };
  try { xoaDongTheoCot_(SHEET_BAO_HIEM_TS_CT, 'MaBH', ma); ghi(dongMoi); }
  catch (e) {
    try { xoaDongTheoCot_(SHEET_BAO_HIEM_TS_CT, 'MaBH', ma); ghi(cu.map(function (c) { var o = {}; COT_BAO_HIEM_TS_CT_.forEach(function (k) { o[k] = c[k] === undefined ? '' : c[k]; }); return o; })); }
    catch (e2) { throw new Error('Lưu chi tiết bảo hiểm ' + ma + ' lỗi (' + e.message + ') và KHÔNG khôi phục được bản cũ (' + e2.message + ') — kiểm tra bảng BaoHiemTaiSanChiTiet của ' + ma + ' bằng tay.'); }
    throw new Error('Lưu chi tiết bảo hiểm ' + ma + ' không thành công (' + e.message + '). Dữ liệu cũ đã được giữ nguyên.');
  }
}
/** Chữ ký nội dung chi tiết để nhận biết yêu cầu lưu lặp (cùng hạng mục, số tiền, ngày). */
function chuKyChiTietBH_(ds) {
  return ds.map(function (d) { return [chuanKhongDau_(d.MaTaiSan || ''), chuanKhongDau_(d.TenTaiSan || ''), Number(d.GiaTriBH) || 0, Number(d.PhiBH) || 0, Number(d.TienBH) || 0, ngayIsoCuaO_(d.TuNgay), ngayIsoCuaO_(d.DenNgay)].join('~'); }).sort().join('|');
}
/** Đăng ký / sửa tài sản bảo đảm. maTS rỗng = tạo mới. */
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
    damBaoCotSheet_(ensureSheet_(getSS_(), SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_), COT_TAI_SAN_);
    var ngayDG = tt.ngayDinhGia ? ngayChuanISO_(tt.ngayDinhGia, 'Ngày định giá', true) : '';
    var han = tt.ngayHetHanBaoHiem ? ngayChuanISO_(tt.ngayHetHanBaoHiem, 'Ngày hết hạn bảo hiểm', false) : '';
    var ghiChu = String(tt.ghiChu || '').trim().substring(0, 500), soHD = String(tt.soHDBaoDam || '').trim().substring(0, 80);
    var ds = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM), ma = String(tt.maTS || '').trim();
    if (ma) {
      var cu = ds.filter(function (r) { return String(r.MaTS) === ma; })[0];
      if (!cu) throw new Error('Không tìm thấy tài sản ' + ma + '.');
      hopDongTrongPhamVi_(cu.MaHD); // quyền với hợp đồng GỐC của tài sản (không chỉ hợp đồng đích)
      if (cu.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp — không sửa.');
      var gt = hopNhatGiaTriTS_({ ng: soCuaO_(cu.NguyenGia), kh: soCuaO_(cu.KhauHao), cl: soCuaO_(cu.GiaTriConLai) }, moiGT), cotGiaTri = { NguyenGia: gt.ng === null ? '' : gt.ng, KhauHao: gt.kh === null ? '' : gt.kh, GiaTriConLai: gt.cl === null ? '' : gt.cl };
      if (String(cu.MaHD) !== String(tt.maHD)) ghiNhatKy_('', 'CHUYEN_TAI_SAN_BAO_DAM', ma + ' | ' + cu.MaHD + ' → ' + tt.maHD);
      capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', ma, { MaHD: tt.maHD, LoaiTS: loai, MoTa: lamSachCongThuc_(moTa), GiaTriVND: giaTri, NgayDinhGia: ngayDG, SoHDBaoDam: lamSachCongThuc_(soHD),
        NgayHetHanBaoHiem: han, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date(), NguyenGia: cotGiaTri.NguyenGia, KhauHao: cotGiaTri.KhauHao, GiaTriConLai: cotGiaTri.GiaTriConLai });
      ghiNhatKy_('', 'SUA_TAI_SAN_BAO_DAM', ma + ' | ' + loai + ' | ' + giaTri);
      return { maTS: ma, daSua: true };
    }
    var gt0 = hopNhatGiaTriTS_(null, moiGT), cotGiaTri = { NguyenGia: gt0.ng === null ? '' : gt0.ng, KhauHao: gt0.kh === null ? '' : gt0.kh, GiaTriConLai: gt0.cl === null ? '' : gt0.cl };
    ma = maBaoDamMoi_('TS', ds, 'MaTS');
    ghiDongMoi_(SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_, { MaTS: ma, MaHD: tt.maHD, LoaiTS: loai, MoTa: lamSachCongThuc_(moTa), GiaTriVND: giaTri, NgayDinhGia: ngayDG, SoHDBaoDam: lamSachCongThuc_(soHD),
      NgayHetHanBaoHiem: han, TrangThai: TS_DANG_BAO_DAM, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date(), NguyenGia: cotGiaTri.NguyenGia, KhauHao: cotGiaTri.KhauHao, GiaTriConLai: cotGiaTri.GiaTriConLai });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'THEM_TAI_SAN_BAO_DAM', ma + ' | ' + tt.maHD + ' | ' + loai + ' | ' + giaTri);
    return { maTS: ma, daSua: false };
  });
}
/** Giải chấp (không xoá): đổi trạng thái kèm lý do. */
function giaiChapTaiSan(maTS, lyDo) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var r = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (x) { return String(x.MaTS) === String(maTS); })[0];
    if (!r) throw new Error('Không tìm thấy tài sản ' + maTS + '.');
    hopDongTrongPhamVi_(r.MaHD);
    if (r.TrangThai !== TS_DANG_BAO_DAM) throw new Error('Tài sản đã giải chấp trước đó.');
    var ly = String(lyDo || '').trim(); if (ly.length < 3) throw new Error('Cần nhập lý do/chứng từ giải chấp (tối thiểu 3 ký tự).');
    capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', maTS, { TrangThai: TS_DA_GIAI_CHAP, GiaiChapLuc: new Date(), LyDoGiaiChap: lamSachCongThuc_(ly.substring(0, 500)), NguoiGhi: layDanhTinh_().email || emailNguoiDung_() });
    ghiNhatKy_('', 'GIAI_CHAP_TAI_SAN', maTS + ' | ' + ly);
    return { maTS: String(maTS), trangThai: TS_DA_GIAI_CHAP };
  });
}

/* ------------------------------ BẢO HIỂM TÀI SẢN THẾ CHẤP (con của đăng ký thế chấp) ------------------------------ */
function taiSanTheoMa_(maTS) {
  var r = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM).filter(function (x) { return String(x.MaTS) === String(maTS); })[0];
  if (!r) throw new Error('Không tìm thấy tài sản ' + maTS + '.');
  hopDongTrongPhamVi_(r.MaHD);
  return r;
}
/** Hợp đồng bảo hiểm của 1 tài sản thế chấp, kèm bảng con chi tiết tài sản được bảo hiểm (STT, mã, tên, giá trị BH, phí BH, tiền BH, từ–đến ngày). Chỉ đọc. */
function layBaoHiemTaiSan(maTS) {
  yeuCauDangNhap_();
  var ts = taiSanTheoMa_(maTS), today = homNayVN_(), tra = layTraCuuDanhMuc_(), hd = tra.hd[String(ts.MaHD)] || {};
  var ct = docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT), hopDong = docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (h) { return String(h.MaTS) === String(maTS); }).map(function (h) {
    var dong = ct.filter(function (c) { return String(c.MaBH) === String(h.MaBH); }).map(function (c) {
      return { stt: Number(c.STT) || 0, maTaiSan: String(c.MaTaiSan || ''), tenTaiSan: String(c.TenTaiSan || ''), giaTriBH: Number(c.GiaTriBH) || 0, phiBH: Number(c.PhiBH) || 0, tienBH: Number(c.TienBH) || 0,
        tuNgay: ngayIsoCuaO_(c.TuNgay), denNgay: ngayIsoCuaO_(c.DenNgay) };
    }).sort(function (a, b) { return a.stt - b.stt; });
    var den = dong.reduce(function (m, x) { return x.denNgay > m ? x.denNgay : m; }, ''), n = den ? soNgayGiuaIso_(today, den) : null, hieuLuc = h.TrangThai === BH_HIEU_LUC;
    return { maBH: String(h.MaBH), soHDBaoHiem: String(h.SoHDBaoHiem || ''), ngayKyHD: ngayIsoCuaO_(h.NgayKyHD), congTyBaoHiem: String(h.CongTyBaoHiem || ''), trangThai: h.TrangThai, ghiChu: String(h.GhiChu || ''),
      lyDoHuy: String(h.LyDoHuy || ''), chiTiet: dong, denNgayCuoi: den, soNgay: n, canhBao: !hieuLuc || n === null ? '' : (n < 0 ? 'QUA_HAN' : (n <= NGAY_CB_BAO_HIEM_ ? 'SAP_HET' : '')),
      tong: { giaTriBH: dong.reduce(function (a, x) { return congSoTien_(a, x.giaTriBH); }, 0), phiBH: dong.reduce(function (a, x) { return congSoTien_(a, x.phiBH); }, 0), tienBH: dong.reduce(function (a, x) { return congSoTien_(a, x.tienBH); }, 0) } };
  }).sort(function (a, b) { return String(a.maBH).localeCompare(String(b.maBH)); });
  return { maTS: String(ts.MaTS), maHD: String(ts.MaHD), soHopDong: hd.SoHopDong || '', moTa: String(ts.MoTa || ''), giaTri: Number(ts.GiaTriVND) || 0, trangThai: ts.TrangThai, hopDong: hopDong, nguongCanhBaoNgay: NGAY_CB_BAO_HIEM_ };
}
/**
 * Thêm / sửa 1 hợp đồng bảo hiểm của tài sản thế chấp (maBH rỗng = thêm mới) cùng bảng con chi tiết. Sửa = thay toàn bộ dòng chi tiết, STT đánh lại theo thứ tự gửi lên.
 * tt = { maTS, maBH?, soHDBaoHiem, ngayKyHD, congTyBaoHiem, ghiChu, chiTiet: [{ maTaiSan, tenTaiSan, giaTriBH, phiBH, tienBH, tuNgay, denNgay }] }
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
    var me = layDanhTinh_().email || emailNguoiDung_(), dsBH = docSheetBaoDam_(SHEET_BAO_HIEM_TS), ma = String(tt.maBH || '').trim(), daSua = false, cty0 = { daCo: true };
    ensureSheet_(getSS_(), SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_);
    var ctNay = chuKyChiTietBH_(dong), ctSheet = docSheetBaoDam_(SHEET_BAO_HIEM_TS_CT);
    if (ma) {
      var cu = dsBH.filter(function (x) { return String(x.MaBH) === ma && String(x.MaTS) === String(ts.MaTS); })[0];
      if (!cu) throw new Error('Không tìm thấy hợp đồng bảo hiểm ' + ma + ' của tài sản này.');
      if (cu.TrangThai !== BH_HIEU_LUC) throw new Error('Hợp đồng bảo hiểm đã hủy — không sửa.');
      dong.forEach(function (d, i) { d.MaBH = ma; d.STT = i + 1; });
      thayChiTietBaoHiemAnToan_(ma, dong); // chi tiết trước (lỗi thì khôi phục bản cũ), thông tin cha sau
      capNhatDongTheoMa_(SHEET_BAO_HIEM_TS, 'MaBH', ma, { SoHDBaoHiem: lamSachCongThuc_(so), NgayKyHD: ngayKy, CongTyBaoHiem: lamSachCongThuc_(cty), GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date() });
      daSua = true;
    } else {
      // Yêu cầu lặp (mất phản hồi rồi bấm lưu lại): cùng tài sản + số HĐ + công ty + ngày ký + cùng chi tiết → trả bản đã có, không sinh bản thứ hai.
      var khop = dsBH.filter(function (x) { return x.TrangThai === BH_HIEU_LUC && String(x.MaTS) === String(ts.MaTS) && chuanKhongDau_(x.SoHDBaoHiem || '') === chuanKhongDau_(so) && chuanKhongDau_(x.CongTyBaoHiem || '') === chuanKhongDau_(cty) && ngayIsoCuaO_(x.NgayKyHD) === ngayKy; });
      for (var q = 0; q < khop.length; q++) {
        var chuKyCu = chuKyChiTietBH_(ctSheet.filter(function (c) { return String(c.MaBH) === String(khop[q].MaBH); }));
        if (chuKyCu === ctNay) return { maBH: String(khop[q].MaBH), maTS: String(ts.MaTS), daSua: false, soDong: dong.length, congTyMoi: false, trungLap: true };
      }
      if (so && khop.length) throw new Error('Đã có hợp đồng bảo hiểm cùng số “' + so + '”, công ty và ngày ký (' + khop[0].MaBH + ') nhưng nội dung chi tiết khác. Mở hợp đồng đó để sửa; nếu là phụ lục/gia hạn thì đổi số hợp đồng hoặc ngày ký.');
      ma = maBaoDamMoi_('BH', dsBH, 'MaBH');
      dong.forEach(function (d, i) { d.MaBH = ma; d.STT = i + 1; });
      try { dong.forEach(function (d) { ghiDongMoi_(SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_, d); }); }
      catch (eCT) { try { xoaDongTheoCot_(SHEET_BAO_HIEM_TS_CT, 'MaBH', ma); } catch (eDon) { /* dọn dòng lẻ */ } throw new Error('Không lưu được chi tiết bảo hiểm (' + eCT.message + '). Chưa tạo hợp đồng bảo hiểm.'); }
      try { ghiDongMoi_(SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_, { MaBH: ma, MaTS: ts.MaTS, SoHDBaoHiem: lamSachCongThuc_(so), NgayKyHD: ngayKy, CongTyBaoHiem: lamSachCongThuc_(cty), TrangThai: BH_HIEU_LUC, GhiChu: lamSachCongThuc_(ghiChu), NguoiGhi: me, ThoiDiemGhi: new Date() }); }
      catch (eCha) { try { xoaDongTheoCot_(SHEET_BAO_HIEM_TS_CT, 'MaBH', ma); } catch (eDon2) { /* dọn dòng lẻ */ } throw new Error('Không tạo được hợp đồng bảo hiểm (' + eCha.message + '). Đã dọn phần chi tiết.'); }
    }
    cty0 = themCongTyBaoHiem_(cty); // chỉ thêm công ty vào Khách hàng SAU KHI lưu thành công
    SpreadsheetApp.flush();
    ghiNhatKy_('', daSua ? 'SUA_BAO_HIEM_TAI_SAN' : 'THEM_BAO_HIEM_TAI_SAN', ma + ' | ' + ts.MaTS + ' | ' + cty + ' | ' + dong.length + ' dòng');
    return { maBH: ma, maTS: String(ts.MaTS), daSua: daSua, soDong: dong.length, congTyMoi: !cty0.daCo };
  });
}
/** Hủy hợp đồng bảo hiểm (không xoá, giữ lịch sử): cần lý do. */
function huyBaoHiemTaiSan(maBH, lyDo) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var h = docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (x) { return String(x.MaBH) === String(maBH); })[0];
    if (!h) throw new Error('Không tìm thấy hợp đồng bảo hiểm ' + maBH + '.');
    taiSanTheoMa_(h.MaTS);
    if (h.TrangThai !== BH_HIEU_LUC) throw new Error('Hợp đồng bảo hiểm đã hủy trước đó.');
    var ly = String(lyDo || '').trim(); if (ly.length < 3) throw new Error('Cần nhập lý do hủy (tối thiểu 3 ký tự).');
    capNhatDongTheoMa_(SHEET_BAO_HIEM_TS, 'MaBH', maBH, { TrangThai: BH_DA_HUY, HuyLuc: new Date(), LyDoHuy: lamSachCongThuc_(ly.substring(0, 500)), NguoiGhi: layDanhTinh_().email || emailNguoiDung_() });
    ghiNhatKy_('', 'HUY_BAO_HIEM_TAI_SAN', maBH + ' | ' + ly);
    return { maBH: String(maBH), trangThai: BH_DA_HUY };
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
