/**
 * GIAINGANTHUCTE.GS — XÁC NHẬN GIẢI NGÂN THỰC TẾ, HỦY, ĐIỀU CHỈNH/HOÀN TRẢ và BÁO CÁO GIẢI NGÂN THỰC TẾ.
 *
 * NGUYÊN TẮC
 *  • "Đã giải ngân" CHỈ được đặt qua xacNhanGiaiNganThucTe(): cần bằng chứng giao dịch ngân hàng (số tham chiếu duy nhất, ngày thực tế, số tiền thực,
 *    tài liệu/tham chiếu xác nhận, người xác nhận). Ghi nhận THỦ CÔNG có kiểm soát — chưa kết nối trực tiếp ngân hàng.
 *  • Số tiền thực giải ngân phải BẰNG tổng hồ sơ. Giải ngân TỪNG PHẦN CHƯA được hỗ trợ (cần quy trình riêng được phê duyệt): hệ thống từ chối thay vì đặt "Đã giải ngân".
 *  • Hủy chỉ cho 2 trường hợp ngân hàng CHƯA thực hiện / báo THẤT BẠI. Tiền ĐÃ chuyển thành công mà phải xử lý → ghiNhanDieuChinhGiaiNgan (hoàn trả/điều chỉnh),
 *    KHÔNG hủy. Hồ sơ đã có điều chỉnh/hoàn trả không hủy được.
 *  • Mọi bản ghi giữ lại (xác nhận bị hủy chuyển 'Hủy bỏ' kèm lý do), không xoá.
 */
var SHEET_XAC_NHAN_GN = 'XacNhanGiaiNgan';
var COT_XAC_NHAN_GN_ = ['MaXacNhan', 'MaHoSo', 'LoaiBanGhi', 'NgayKeHoach', 'NgayThucTe', 'SoThamChieuNH', 'SoTienThucTe', 'LoaiTien', 'TaiLieuXacNhan', 'NguoiXacNhan', 'ThoiDiemXacNhan', 'GhiChu', 'TrangThai', 'RevisionHoSo'];
var XN_LOAI_XAC_NHAN = 'XAC_NHAN', XN_LOAI_DIEU_CHINH = 'DIEU_CHINH', XN_LOAI_HOAN_TRA = 'HOAN_TRA';
var XN_HIEU_LUC = 'Hiệu lực', XN_HUY_BO = 'Hủy bỏ';
var LOAI_HUY_HOP_LE_ = { NH_CHUA_THUC_HIEN: 'Ngân hàng chưa thực hiện giao dịch', NH_BAO_THAT_BAI: 'Ngân hàng báo giao dịch thất bại' };

/** Đọc (không tạo sheet khi chỉ đọc). */
function docXacNhanGN_() {
  if (!getSS_().getSheetByName(SHEET_XAC_NHAN_GN)) return [];
  return sheetToObjects_(SHEET_XAC_NHAN_GN);
}
function hieuLucCuaHoSo_(ds, maHoSo) { return ds.filter(function (r) { return String(r.MaHoSo) === String(maHoSo) && r.TrangThai === XN_HIEU_LUC; }); }
function tongThucTeNguyenTe_(rows) { return rows.reduce(function (a, r) { return congSoTien_(a, r.SoTienThucTe); }, 0); }
function homNayVN_() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function ngayChuanISO_(v, ten, khongTuongLai) {
  var t = tachNgay_(v);
  if (!t) throw new Error(ten + ' không hợp lệ (cần dạng yyyy-MM-dd hoặc dd/MM/yyyy).');
  var iso = t.yyyy + '-' + t.mm + '-' + t.dd, y = Number(t.yyyy), m = Number(t.mm), dd = Number(t.dd), d = new Date(Date.UTC(y, m - 1, dd));
  // Kiểm tra lịch thuần (không phụ thuộc múi giờ máy chạy): ngày/tháng/năm phải tồn tại thật, kể cả năm nhuận.
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== dd) throw new Error(ten + ' không tồn tại: ' + iso);
  if (khongTuongLai && iso > homNayVN_()) throw new Error(ten + ' (' + iso + ') nằm trong tương lai — chỉ ghi nhận giao dịch đã xảy ra.');
  return iso;
}
function kiemTraSoThamChieuMoi_(ds, soTC, boQuaMa) {
  var k = String(soTC).trim().toLowerCase();
  var trung = ds.filter(function (r) { return r.TrangThai === XN_HIEU_LUC && String(r.SoThamChieuNH).trim().toLowerCase() === k && r.MaXacNhan !== boQuaMa; })[0];
  if (trung) throw new Error('Số tham chiếu ngân hàng "' + soTC + '" đã được dùng cho hồ sơ ' + trung.MaHoSo + ' (' + trung.MaXacNhan + ') — không ghi nhận trùng giao dịch.');
}
function ghiXacNhanDong_(o) {
  var sh = ensureSheet_(getSS_(), SHEET_XAC_NHAN_GN, COT_XAC_NHAN_GN_);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  themDongVaoCuoiThat_(sh, headers.map(function (h) { return o.hasOwnProperty(h) ? o[h] : ''; }));
}
function capNhatXacNhanDong_(maXacNhan, cot) {
  var sh = getSS_().getSheetByName(SHEET_XAC_NHAN_GN), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], vals = layGiaTriThatCuaSheet_(sh), c = headers.indexOf('MaXacNhan');
  for (var r = 1; r < vals.length; r++) if (vals[r][c] === maXacNhan) { ghiCotHoSo_(sh, headers, r + 1, cot); return true; }
  return false;
}
function maXacNhanMoi_(maHoSo, ds) {
  var n = ds.filter(function (r) { return String(r.MaHoSo) === String(maHoSo); }).length + 1;
  return 'XN-' + maHoSo + '-' + n;
}

/**
 * XÁC NHẬN GIẢI NGÂN THỰC TẾ → chuyển hồ sơ "Đã tạo hồ sơ" → "Đã giải ngân".
 * @param {{ngayThucTe:string, soThamChieuNH:string, soTienThucTe:number|string, taiLieuXacNhan:string, ghiChu:string=}} tt
 * @param {number} expectedRevision  BẮT BUỘC
 */
function xacNhanGiaiNganThucTe(maHoSo, tt, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    damBaoCotHoSoDomain_();
    var hs = layHoSoTheoMa_(maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    kiemTraRevisionBatBuoc_(hs, expectedRevision);
    if (hs.TrangThai !== TT_DA_TAO) throw new Error('Chỉ xác nhận giải ngân cho hồ sơ ở trạng thái "Đã tạo hồ sơ" (bộ chứng từ bắt buộc đã hoàn tất); hồ sơ ' + maHoSo + ' đang "' + hs.TrangThai + '".');
    var loaiTien = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    var ngayTT = ngayChuanISO_(tt.ngayThucTe, 'Ngày giải ngân thực tế', true);
    var soTC = String(tt.soThamChieuNH || '').trim();
    if (soTC.length < 3 || soTC.length > 60) throw new Error('Số tham chiếu giao dịch ngân hàng bắt buộc (3–60 ký tự).');
    var bangChung = String(tt.taiLieuXacNhan || '').trim();
    if (bangChung.length < 3) throw new Error('Bắt buộc có tài liệu/tham chiếu xác nhận của ngân hàng (link file xác nhận, số chứng từ, hoặc mô tả bằng chứng).');
    if (bangChung.length > 1000) throw new Error('Tài liệu xác nhận quá dài (tối đa 1000 ký tự).');
    var soTien = docTienTheoLoai_(tt.soTienThucTe, loaiTien, 'Số tiền thực giải ngân', true);
    if (!(soTien > 0)) throw new Error('Số tiền thực giải ngân phải lớn hơn 0.');
    var tongHs = Number(hs.SoTienNhanNoLanNay) || 0;
    if (soTien !== tongHs) {
      throw new Error('Số tiền thực giải ngân (' + formatSo_(soTien) + ' ' + loaiTien + ') khác số tiền hồ sơ (' + formatSo_(tongHs) + ' ' + loaiTien + '). ' +
        'Giải ngân từng phần/lệch số tiền CHƯA được hỗ trợ — không đặt "Đã giải ngân"; cần quy trình giải ngân từng phần được phê duyệt riêng.');
    }
    if (tt.loaiTien && String(tt.loaiTien).toUpperCase() !== loaiTien) throw new Error('Loại tiền giải ngân thực tế (' + tt.loaiTien + ') khác loại tiền hồ sơ (' + loaiTien + ').');
    var ds = docXacNhanGN_();
    if (hieuLucCuaHoSo_(ds, maHoSo).some(function (r) { return r.LoaiBanGhi === XN_LOAI_XAC_NHAN; })) throw new Error('Hồ sơ ' + maHoSo + ' đã có xác nhận giải ngân hiệu lực — không xác nhận trùng.');
    kiemTraSoThamChieuMoi_(ds, soTC);
    var kt = kiemTraDuDieuKienGiaiNgan_(maHoSo);
    if (kt.loi.length) throw new Error('Chưa đủ điều kiện xác nhận giải ngân:\n• ' + kt.loi.join('\n• '));
    chanNeuVuotHanMuc_(hs);
    var pheDuyet = kiemTraDuyetTruocGiaiNgan_(hs);
    var me = layDanhTinh_().email || emailNguoiDung_(), ma = maXacNhanMoi_(maHoSo, ds);
    ghiXacNhanDong_({ MaXacNhan: ma, MaHoSo: maHoSo, LoaiBanGhi: XN_LOAI_XAC_NHAN, NgayKeHoach: hs.NgayGiaiNgan instanceof Date ? Utilities.formatDate(hs.NgayGiaiNgan, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(hs.NgayGiaiNgan || ''),
      NgayThucTe: ngayTT, SoThamChieuNH: soTC, SoTienThucTe: soTien, LoaiTien: loaiTien, TaiLieuXacNhan: bangChung, NguoiXacNhan: me, ThoiDiemXacNhan: new Date(), GhiChu: String(tt.ghiChu || '').substring(0, 1000), TrangThai: XN_HIEU_LUC, RevisionHoSo: soRevision_(hs) });
    SpreadsheetApp.flush();
    try {
      var kq = chuyenTrangThaiHoSo_(maHoSo, TT_DA_GIAI_NGAN, 'Xác nhận giải ngân thực tế: ' + soTC, { expectedRevision: expectedRevision, maXacNhan: ma });
      ghiNhatKy_(maHoSo, 'XAC_NHAN_GIAI_NGAN', ma + ' | tham chiếu ' + soTC + ' | ' + soTien + ' ' + loaiTien + ' | ngày ' + ngayTT);
      if (pheDuyet) danhDauDaDungPheDuyet_(pheDuyet.MaPheDuyet);
      var don = { soFile: 0, loi: [] };
      try { don = donFileNhapSauGiaiNgan_(maHoSo); } catch (eDon) { don.loi.push(String(eDon.message || eDon)); } // dọn file lỗi không chặn giải ngân
      return { maHoSo: maHoSo, trangThai: kq.trangThai, revision: kq.revision, maXacNhan: ma, donFile: don };
    } catch (e) {
      capNhatXacNhanDong_(ma, { TrangThai: XN_HUY_BO, GhiChu: 'Chuyển trạng thái thất bại, tự hủy bỏ: ' + String(e.message).substring(0, 300) });
      throw e;
    }
  });
}

/**
 * Hồ sơ đã giải ngân: chuyển vào THÙNG RÁC Drive (khôi phục được 30 ngày) các file nháp/bản cũ của hồ sơ — bản xem trước
 * (thư mục XemTruoc, tên "XemTruoc_*_<mã hồ sơ>_*") và file chứng từ "Đã thay thế"/"Lỗi" trong lịch sử phát hành.
 * GIỮ NGUYÊN: dữ liệu hồ sơ, dòng lịch sử phát hành, bộ chứng từ "Hiệu lực" (file nào cũng đang được bản Hiệu lực dùng thì không đụng).
 */
function donFileNhapSauGiaiNgan_(maHoSo) {
  var giu = {}, boCu = [], loi = [], dem = 0;
  docLichSuPhatHanh_().forEach(function (r) {
    if (String(r.MaHoSo) !== String(maHoSo)) return;
    [r.FileIdChinh, r.FileIdPdf].forEach(function (id) {
      id = String(id || '').trim(); if (!id) return;
      if (r.TrangThai === TT_PH_HIEU_LUC) giu[id] = true; else boCu.push({ id: id, nhan: nhanChungTu_(r.LoaiTaiLieu) + ' lần ' + (r.SoLan || '?') });
    });
  });
  boCu.forEach(function (x) {
    if (giu[x.id]) return;
    try { var f = DriveApp.getFileById(x.id); if (!(f.isTrashed && f.isTrashed())) { f.setTrashed(true); dem++; } }
    catch (e) { loi.push(x.nhan + ': ' + e.message); }
  });
  try {
    var it = thuMucXemTruoc_().getFiles(), dauHieu = '_' + maHoSo + '_';
    while (it.hasNext()) {
      var f = it.next(), ten = String(f.getName());
      if (ten.indexOf('XemTruoc_') !== 0 || ten.indexOf(dauHieu) < 0 || (f.isTrashed && f.isTrashed()) || giu[f.getId()]) continue;
      f.setTrashed(true); dem++;
    }
  } catch (e2) { loi.push('bản xem trước: ' + e2.message); }
  ghiNhatKy_(maHoSo, 'DON_FILE_SAU_GIAI_NGAN', dem + ' file nháp/bản cũ vào thùng rác Drive' + (loi.length ? ' | lỗi: ' + loi.join('; ') : ''));
  return { soFile: dem, loi: loi };
}

/**
 * HỦY giải ngân — CHỈ khi ngân hàng chưa thực hiện hoặc báo thất bại.
 * @param {{loaiHuy:'NH_CHUA_THUC_HIEN'|'NH_BAO_THAT_BAI', lyDo:string, bangChung:string=}} tt
 */
function huyGiaiNgan(maHoSo, tt, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    if (typeof tt === 'string' || !tt) throw new Error('Cần chọn loại hủy (ngân hàng chưa thực hiện / báo thất bại) và nhập lý do.');
    var hs = layHoSoTheoMa_(maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    kiemTraRevisionBatBuoc_(hs, expectedRevision);
    var loai = String(tt.loaiHuy || '');
    if (loai === 'DA_THUC_HIEN' || loai === 'DA_THUC_HIEN_CAN_DIEU_CHINH') throw new Error('Giao dịch ĐÃ được ngân hàng thực hiện thành công thì KHÔNG hủy: hãy ghi nhận hoàn trả/điều chỉnh (ghiNhanDieuChinhGiaiNgan) để giữ dấu vết khoản tiền đã chuyển.');
    if (!LOAI_HUY_HOP_LE_[loai]) throw new Error('Loại hủy không hợp lệ. Chỉ chấp nhận: ' + Object.keys(LOAI_HUY_HOP_LE_).join(', ') + '.');
    var lyDo = String(tt.lyDo || '').trim();
    if (lyDo.length < 3) throw new Error('Cần nhập lý do hủy giải ngân.');
    if (loai === 'NH_BAO_THAT_BAI' && String(tt.bangChung || '').trim().length < 3) throw new Error('Ngân hàng báo thất bại: bắt buộc ghi bằng chứng/tham chiếu thông báo của ngân hàng.');
    var ds = docXacNhanGN_(), hl = hieuLucCuaHoSo_(ds, maHoSo);
    if (hl.some(function (r) { return r.LoaiBanGhi !== XN_LOAI_XAC_NHAN; })) throw new Error('Hồ sơ ' + maHoSo + ' đã có ghi nhận hoàn trả/điều chỉnh — không hủy được (tiền đã chuyển thực tế). Xử lý bằng ghi nhận điều chỉnh tiếp theo.');
    var kq = chuyenTrangThaiHoSo_(maHoSo, TT_DA_HUY, LOAI_HUY_HOP_LE_[loai] + ': ' + lyDo, { expectedRevision: expectedRevision });
    hl.forEach(function (r) { capNhatXacNhanDong_(r.MaXacNhan, { TrangThai: XN_HUY_BO, GhiChu: (r.GhiChu ? r.GhiChu + ' | ' : '') + 'HỦY (' + loai + '): ' + lyDo + (tt.bangChung ? ' | bằng chứng: ' + tt.bangChung : '') }); });
    ghiNhatKy_(maHoSo, 'HUY_GIAI_NGAN', loai + ' | ' + lyDo);
    return { maHoSo: maHoSo, trangThai: kq.trangThai, revision: kq.revision };
  });
}

/**
 * Ghi nhận HOÀN TRẢ / ĐIỀU CHỈNH sau khi tiền đã chuyển thực tế. Hồ sơ giữ "Đã giải ngân". soTien là số nguyên dương; HOAN_TRA ghi âm (giảm), DIEU_CHINH theo `huong` ('TANG'|'GIAM').
 * @param {{loai:'HOAN_TRA'|'DIEU_CHINH', huong:string=, soTien:number|string, soThamChieuNH:string, ngayThucTe:string, taiLieuXacNhan:string, lyDo:string}} tt
 */
function ghiNhanDieuChinhGiaiNgan(maHoSo, tt, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    var hs = layHoSoTheoMa_(maHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    kiemTraRevisionBatBuoc_(hs, expectedRevision);
    if (hs.TrangThai !== TT_DA_GIAI_NGAN) throw new Error('Chỉ ghi nhận hoàn trả/điều chỉnh cho hồ sơ "Đã giải ngân" (đang "' + hs.TrangThai + '").');
    var loai = tt.loai === XN_LOAI_HOAN_TRA ? XN_LOAI_HOAN_TRA : (tt.loai === XN_LOAI_DIEU_CHINH ? XN_LOAI_DIEU_CHINH : '');
    if (!loai) throw new Error('Loại ghi nhận phải là HOAN_TRA hoặc DIEU_CHINH.');
    var ngay = ngayChuanISO_(tt.ngayThucTe, 'Ngày thực tế', true), soTC = String(tt.soThamChieuNH || '').trim();
    if (soTC.length < 3) throw new Error('Số tham chiếu giao dịch ngân hàng bắt buộc.');
    if (String(tt.taiLieuXacNhan || '').trim().length < 3) throw new Error('Bắt buộc có tài liệu/tham chiếu xác nhận.');
    if (String(tt.lyDo || '').trim().length < 3) throw new Error('Cần nhập lý do điều chỉnh/hoàn trả.');
    var soTien = docTienTheoLoai_(tt.soTien, hs.LoaiTien, 'Số tiền điều chỉnh', true);
    if (!(soTien > 0)) throw new Error('Số tiền điều chỉnh phải lớn hơn 0 (chiều tăng/giảm chọn bằng loại/huong).');
    var giam = loai === XN_LOAI_HOAN_TRA || String(tt.huong).toUpperCase() === 'GIAM';
    var ds = docXacNhanGN_(), hl = hieuLucCuaHoSo_(ds, maHoSo), rong = tongThucTeNguyenTe_(hl);
    if (giam && soTien > rong) throw new Error('Số tiền giảm (' + formatSo_(soTien) + ') vượt số tiền thực giải ngân còn lại (' + formatSo_(rong) + ').');
    kiemTraSoThamChieuMoi_(ds, soTC);
    var me = layDanhTinh_().email || emailNguoiDung_(), ma = maXacNhanMoi_(maHoSo, ds), loaiTien = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    ghiXacNhanDong_({ MaXacNhan: ma, MaHoSo: maHoSo, LoaiBanGhi: loai, NgayKeHoach: '', NgayThucTe: ngay, SoThamChieuNH: soTC, SoTienThucTe: giam ? -soTien : soTien, LoaiTien: loaiTien,
      TaiLieuXacNhan: String(tt.taiLieuXacNhan).trim(), NguoiXacNhan: me, ThoiDiemXacNhan: new Date(), GhiChu: String(tt.lyDo).trim().substring(0, 1000), TrangThai: XN_HIEU_LUC, RevisionHoSo: soRevision_(hs) });
    // chạm hồ sơ (revision + người/lúc) để các phiên khác phát hiện thay đổi
    var sh = getSS_().getSheetByName(SHEET_HOSO), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], dong = timDongHoSo_(sh, headers, maHoSo), revMoi = soRevision_(hs) + 1;
    ghiCotHoSo_(sh, headers, dong, { Revision: revMoi, CapNhatLuc: new Date(), CapNhatBoi: me });
    SpreadsheetApp.flush(); tangRevision_('HOSO');
    ghiNhatKy_(maHoSo, 'DIEU_CHINH_GIAI_NGAN', ma + ' | ' + loai + ' | ' + (giam ? '-' : '+') + soTien + ' ' + loaiTien + ' | ' + soTC);
    return { maHoSo: maHoSo, revision: revMoi, maXacNhan: ma, ronThucTe: congSoTien_(rong, giam ? -soTien : soTien) };
  });
}

/** Danh sách bản ghi xác nhận/điều chỉnh của 1 hồ sơ + số tiền thực giải ngân ròng (chỉ đọc). */
function layXacNhanGiaiNgan(maHoSo) {
  yeuCauDangNhap_();
  chanNeuNgoaiPhamViHoSo_(maHoSo);
  var ds = docXacNhanGN_().filter(function (r) { return String(r.MaHoSo) === String(maHoSo); });
  return { dong: ds.map(function (r) { return { maXacNhan: r.MaXacNhan, loai: r.LoaiBanGhi, ngayKeHoach: r.NgayKeHoach, ngayThucTe: r.NgayThucTe, soThamChieuNH: r.SoThamChieuNH, soTien: Number(r.SoTienThucTe) || 0, loaiTien: r.LoaiTien,
      taiLieu: r.TaiLieuXacNhan, nguoi: r.NguoiXacNhan, luc: ngayChoMau_(r.ThoiDiemXacNhan), ghiChu: r.GhiChu, trangThai: r.TrangThai }; }),
    ronThucTe: tongThucTeNguyenTe_(hieuLucCuaHoSo_(ds, maHoSo)) };
}

/**
 * BÁO CÁO GIẢI NGÂN THỰC TẾ: chỉ gồm giao dịch có xác nhận HIỆU LỰC của hồ sơ "Đã giải ngân" (không gồm Nháp / Đã tạo hồ sơ / Đã hủy). Lọc theo NGÀY THỰC TẾ.
 * Tổng theo NGUYÊN TỆ riêng; hồ sơ USD có thêm quy đổi VND = ROUND(USD × tỷ giá bán của hồ sơ, half-up) hiển thị riêng, KHÔNG cộng vào tổng VND.
 */
function layBaoCaoGiaiNganThucTe(tuNgay, denNgay) {
  yeuCauDangNhap_();
  return phongBi_('layBaoCaoGiaiNganThucTe', function () {
    var tu = tuNgay ? ngayChuanISO_(tuNgay, 'Từ ngày', false) : '', den = denNgay ? ngayChuanISO_(denNgay, 'Đến ngày', false) : '';
    var hoSo = {}; docDanhSachHoSo_(false).forEach(function (h) { hoSo[String(h.MaHoSo)] = h; });
    var dong = [], tong = { VND: { soGiaoDich: 0, tong: 0 }, USD: { soGiaoDich: 0, tong: 0, tongQuyDoiVND: 0 } };
    docXacNhanGN_().forEach(function (r) {
      var h = hoSo[String(r.MaHoSo)];
      if (!h || h.TrangThai !== TT_DA_GIAI_NGAN || r.TrangThai !== XN_HIEU_LUC) return;
      var nt = String(r.NgayThucTe || '').substring(0, 10);
      if ((tu && nt < tu) || (den && nt > den)) return;
      var lt = r.LoaiTien === 'USD' ? 'USD' : 'VND', st = Number(r.SoTienThucTe) || 0, qd = '';
      if (lt === 'USD') { var tg = Number(h.TyGiaBan) || 0; qd = (st < 0 ? -1 : 1) * quyDoiUSDSangVND_(Math.abs(st), tg); tong.USD.tongQuyDoiVND += qd; }
      tong[lt].soGiaoDich++; tong[lt].tong += st;
      dong.push({ maHoSo: r.MaHoSo, maXacNhan: r.MaXacNhan, loai: r.LoaiBanGhi, ngayThucTe: nt, ngayKeHoach: r.NgayKeHoach, soThamChieuNH: r.SoThamChieuNH, loaiTien: lt, soTien: st, tyGiaBan: lt === 'USD' ? Number(h.TyGiaBan) || 0 : '', quyDoiVND: qd, nguoiXacNhan: r.NguoiXacNhan });
    });
    dong.sort(function (a, b) { return a.ngayThucTe < b.ngayThucTe ? -1 : (a.ngayThucTe > b.ngayThucTe ? 1 : 0); });
    return { dong: dong, tongTheoNguyenTe: tong, quyTacQuyDoi: 'Quy đổi VND của giao dịch USD = ROUND(số USD × tỷ giá bán của hồ sơ), làm tròn half-up; hiển thị riêng, không cộng vào tổng VND.',
      boLoc: { tuNgay: tu, denNgay: den, loaiNgay: 'THUC_TE' }, nguon: 'XacNhanGiaiNgan (bản ghi hiệu lực) của hồ sơ Đã giải ngân', revisionHoSo: docRevision_('HOSO') };
  });
}

/**
 * TRẠNG THÁI THỐNG NHẤT ĐỂ XÁC NHẬN GIẢI NGÂN (chỉ đọc): gộp trạng thái hồ sơ + bộ chứng từ + lý do cụ thể.
 * Giao diện dùng để hiện nút (bật/tắt) và giải thích vì sao chưa xác nhận được — không để người dùng đoán.
 *  • choXacNhan: hồ sơ "Đã tạo hồ sơ" VÀ bộ chứng từ "Đã hoàn tất" → được bấm xác nhận giải ngân.
 *  • choDongBo: bộ chứng từ đã hoàn tất nhưng hồ sơ còn "Nháp" (lệch trạng thái) → bấm "Đồng bộ trạng thái".
 */
function layTrangThaiXacNhanGN(maHoSo) {
  yeuCauDangNhap_();
  var hs = layHoSoTheoMa_(maHoSo);
  if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  var tt = String(hs.TrangThai || '').trim() || TT_NHAP;
  var bo = tinhTrangThaiBo_(maHoSo, null);
  var thieu = bo.thieu.map(nhanChungTu_).concat(bo.hetHieuLuc.map(nhanChungTu_));
  var kq = { maHoSo: maHoSo, trangThaiHoSo: tt, trangThaiBo: bo.trangThai, thieu: thieu, choXacNhan: false, choDongBo: false, lyDo: '' };
  var danhSachThieu = thieu.length ? ' — còn thiếu/hết hiệu lực: ' + thieu.join(', ') : '';
  if (tt === TT_DA_TAO) {
    kq.choXacNhan = bo.trangThai === TT_PHIEN_XONG;
    kq.lyDo = kq.choXacNhan
      ? 'Đủ điều kiện. Khi ngân hàng đã chuyển tiền, bấm "Xác nhận giải ngân thực tế".'
      : 'Hồ sơ đang "Đã tạo hồ sơ" nhưng bộ chứng từ là "' + bo.trangThai + '"' + danhSachThieu + '. Chuyển về Nháp để sửa rồi tạo lại bộ chứng từ.';
  } else if (tt === TT_NHAP) {
    if (bo.trangThai === TT_PHIEN_XONG) {
      kq.choDongBo = true;
      kq.lyDo = 'Bộ chứng từ đã hoàn tất nhưng hồ sơ còn "Nháp". Bấm "Đồng bộ trạng thái" để chuyển sang "Đã tạo hồ sơ".';
    } else {
      kq.lyDo = 'Chưa xác nhận giải ngân được: bộ chứng từ đang "' + bo.trangThai + '"' + danhSachThieu + '. Tạo bộ chứng từ bắt buộc ở tab "Thực hiện" trước.';
    }
  } else if (tt === TT_DA_GIAI_NGAN) {
    kq.lyDo = 'Hồ sơ đã giải ngân. Muốn điều chỉnh/hoàn trả, dùng "Ghi nhận hoàn trả/điều chỉnh".';
  } else if (tt === TT_DA_HUY) {
    kq.lyDo = 'Hồ sơ đã hủy, không thao tác giải ngân.';
  }
  return kq;
}

/** Đồng bộ hồ sơ "Nháp" → "Đã tạo hồ sơ" khi bộ chứng từ đã hoàn tất (trường hợp lệch do phiên trước bị gián đoạn). */
function dongBoTrangThaiTheoBo(maHoSo, expectedRevision) {
  yeuCauDangNhap_();
  var hs = layHoSoTheoMa_(maHoSo);
  if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  kiemTraRevisionBatBuoc_(hs, expectedRevision);
  var tt = String(hs.TrangThai || '').trim() || TT_NHAP;
  if (tt !== TT_NHAP) throw new Error('Chỉ đồng bộ hồ sơ đang "Nháp" (hiện: "' + tt + '").');
  var bo = tinhTrangThaiBo_(maHoSo, null);
  if (bo.trangThai !== TT_PHIEN_XONG) throw new Error('Bộ chứng từ chưa hoàn tất (' + bo.trangThai + '), chưa thể đồng bộ.');
  var ch = chuyenTrangThaiHoSo_(maHoSo, TT_DA_TAO, 'Đồng bộ: bộ chứng từ đã hoàn tất', { expectedRevision: expectedRevision });
  return { maHoSo: maHoSo, trangThai: ch.trangThai, revision: ch.revision };
}
