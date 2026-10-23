/**
 * DUYET.GS — DUYỆT HAI CẤP (maker–checker) TRƯỚC KHI XÁC NHẬN GIẢI NGÂN.
 *
 * Bật bằng cấu hình BAT_DUYET_HAI_CAP = 1 (mặc định TẮT để không đổi quy trình đang chạy). Khi bật:
 *  • Người lập (NHẬP LIỆU trở lên) bấm "Gửi duyệt" với hồ sơ ở trạng thái "Đã tạo hồ sơ" → phiếu "Chờ duyệt" ghi lại REVISION hồ sơ lúc gửi.
 *  • Người duyệt phải có vai trò QUẢN TRỊ và KHÁC người gửi. Duyệt/từ chối đều lưu người, thời điểm, lý do.
 *  • Phiếu "Đã duyệt" chỉ có hiệu lực khi hồ sơ CHƯA bị sửa kể từ lúc gửi (cùng revision). Hồ sơ đổi → phiếu "Hết hiệu lực", phải gửi lại.
 *  • xacNhanGiaiNganThucTe từ chối nếu chưa có phiếu "Đã duyệt" hợp lệ; sau khi xác nhận thành công phiếu chuyển "Đã sử dụng" (không dùng lại được).
 * Phiếu không bị xoá: mọi chuyển trạng thái giữ lịch sử.
 */
var SHEET_PHE_DUYET = 'PheDuyetGiaiNgan';
var COT_PHE_DUYET_ = ['MaPheDuyet', 'MaHoSo', 'RevisionGui', 'TrangThai', 'NguoiGui', 'ThoiDiemGui', 'GhiChuGui', 'NguoiDuyet', 'ThoiDiemDuyet', 'LyDoQuyetDinh', 'ThoiDiemSuDung'];
var PD_CHO = 'Chờ duyệt', PD_DUYET = 'Đã duyệt', PD_TU_CHOI = 'Từ chối', PD_HET_HIEU_LUC = 'Hết hiệu lực', PD_DA_DUNG = 'Đã sử dụng', PD_THU_HOI = 'Đã thu hồi';

function batDuyetHaiCap_() { return layCauHinh_('BAT_DUYET_HAI_CAP') === '1'; }
function docPheDuyet_() { return getSS_().getSheetByName(SHEET_PHE_DUYET) ? sheetToObjects_(SHEET_PHE_DUYET) : []; }
function emailChuan_(e) { return String(e || '').trim().toLowerCase(); }
function emailHienTaiQLV_() { return emailChuan_(layDanhTinh_().email || emailNguoiDung_()); }

/** Phiếu còn hiệu lực với hồ sơ ở revision hiện tại (trả phiếu "Đã duyệt" đúng revision, hoặc null). */
function pheDuyetHopLeCuaHoSo_(hs) {
  var rev = soRevision_(hs);
  return docPheDuyet_().filter(function (r) { return String(r.MaHoSo) === String(hs.MaHoSo) && r.TrangThai === PD_DUYET && Number(r.RevisionGui) === rev; })[0] || null;
}
/** Gọi trong xacNhanGiaiNganThucTe (đã giữ khoá): chặn nếu bật duyệt hai cấp mà chưa có phiếu duyệt hợp lệ. */
function kiemTraDuyetTruocGiaiNgan_(hs) {
  if (!batDuyetHaiCap_()) return null;
  var p = pheDuyetHopLeCuaHoSo_(hs);
  if (p) return p;
  var cho = docPheDuyet_().filter(function (r) { return String(r.MaHoSo) === String(hs.MaHoSo) && r.TrangThai === PD_CHO; })[0];
  throw new Error('Đang bật duyệt hai cấp: hồ sơ ' + hs.MaHoSo + (cho ? ' đang CHỜ người có quyền quản trị (khác người gửi) duyệt.' : ' chưa có phiếu duyệt hợp lệ (hoặc hồ sơ đã bị sửa sau khi duyệt). Bấm "Gửi duyệt" rồi nhờ người duyệt xử lý.'));
}
function danhDauDaDungPheDuyet_(maPheDuyet) {
  if (!maPheDuyet) return;
  capNhatDongTheoMa_(SHEET_PHE_DUYET, 'MaPheDuyet', maPheDuyet, { TrangThai: PD_DA_DUNG, ThoiDiemSuDung: new Date() });
}

/** Gửi duyệt giải ngân. expectedRevision BẮT BUỘC. */
function guiDuyetGiaiNgan(maHoSo, ghiChu, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var hs = layHoSoTheoMa_(maHoSo);
    if (!hs || laDaXoa_(hs.DaXoa)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    kiemTraPhamViTraNo_(hs); kiemTraRevisionBatBuoc_(hs, expectedRevision);
    if (hs.TrangThai !== TT_DA_TAO) throw new Error('Chỉ gửi duyệt hồ sơ ở trạng thái "Đã tạo hồ sơ" (đang "' + hs.TrangThai + '").');
    var ds = docPheDuyet_(), rev = soRevision_(hs);
    if (ds.some(function (r) { return String(r.MaHoSo) === String(maHoSo) && r.TrangThai === PD_CHO; })) throw new Error('Hồ sơ đã có phiếu đang chờ duyệt.');
    if (pheDuyetHopLeCuaHoSo_(hs)) throw new Error('Hồ sơ đã được duyệt (còn hiệu lực) — có thể xác nhận giải ngân.');
    ds.forEach(function (r) { if (String(r.MaHoSo) === String(maHoSo) && r.TrangThai === PD_DUYET && Number(r.RevisionGui) !== rev) capNhatDongTheoMa_(SHEET_PHE_DUYET, 'MaPheDuyet', r.MaPheDuyet, { TrangThai: PD_HET_HIEU_LUC }); });
    var ma = maBaoDamMoi_('PD', ds, 'MaPheDuyet'), me = emailHienTaiQLV_();
    ghiDongMoi_(SHEET_PHE_DUYET, COT_PHE_DUYET_, { MaPheDuyet: ma, MaHoSo: String(maHoSo), RevisionGui: rev, TrangThai: PD_CHO, NguoiGui: me, ThoiDiemGui: new Date(), GhiChuGui: lamSachCongThuc_(String(ghiChu || '').trim().substring(0, 500)) });
    SpreadsheetApp.flush();
    ghiNhatKy_(maHoSo, 'GUI_DUYET_GIAI_NGAN', ma + ' | revision ' + rev);
    return { maPheDuyet: ma, maHoSo: String(maHoSo), revision: rev, hanMuc: kiemTraHanMucHoSo_(hs) };
  });
}
/** Người duyệt (QUẢN TRỊ, khác người gửi) duyệt hoặc từ chối. quyetDinh: 'DUYET' | 'TU_CHOI'. */
function quyetDinhPheDuyet(maPheDuyet, quyetDinh, lyDo) {
  yeuCauDangNhap_(); yeuCauQuanTri_('duyệt giải ngân');
  return voiKhoa_(function () {
    var p = docPheDuyet_().filter(function (r) { return String(r.MaPheDuyet) === String(maPheDuyet); })[0];
    if (!p) throw new Error('Không tìm thấy phiếu ' + maPheDuyet + '.');
    if (p.TrangThai !== PD_CHO) throw new Error('Phiếu không còn ở trạng thái chờ duyệt (đang "' + p.TrangThai + '").');
    var hs = layHoSoTheoMa_(p.MaHoSo); if (!hs || laDaXoa_(hs.DaXoa)) throw new Error('Không tìm thấy hồ sơ ' + p.MaHoSo + '.');
    kiemTraPhamViTraNo_(hs);
    if (quyetDinh !== 'DUYET' && quyetDinh !== 'TU_CHOI') throw new Error('Quyết định phải là DUYET hoặc TU_CHOI.');
    var me = emailHienTaiQLV_(), ly = String(lyDo || '').trim();
    if (me && me === emailChuan_(p.NguoiGui)) throw new Error('Người duyệt phải KHÁC người gửi duyệt (' + p.NguoiGui + ').');
    if (quyetDinh === 'TU_CHOI' && ly.length < 3) throw new Error('Từ chối cần nêu lý do (tối thiểu 3 ký tự).');
    if (hs.TrangThai !== TT_DA_TAO || soRevision_(hs) !== Number(p.RevisionGui)) {
      capNhatDongTheoMa_(SHEET_PHE_DUYET, 'MaPheDuyet', maPheDuyet, { TrangThai: PD_HET_HIEU_LUC, LyDoQuyetDinh: 'Hồ sơ đã thay đổi sau khi gửi duyệt' });
      throw new Error('Hồ sơ đã thay đổi kể từ khi gửi duyệt (revision ' + p.RevisionGui + ' → ' + soRevision_(hs) + ') nên phiếu hết hiệu lực. Người lập cần gửi duyệt lại.');
    }
    capNhatDongTheoMa_(SHEET_PHE_DUYET, 'MaPheDuyet', maPheDuyet, { TrangThai: quyetDinh === 'DUYET' ? PD_DUYET : PD_TU_CHOI, NguoiDuyet: me, ThoiDiemDuyet: new Date(), LyDoQuyetDinh: lamSachCongThuc_(ly.substring(0, 500)) });
    ghiNhatKy_(p.MaHoSo, quyetDinh === 'DUYET' ? 'DUYET_GIAI_NGAN' : 'TU_CHOI_GIAI_NGAN', maPheDuyet + ' | ' + ly);
    return { maPheDuyet: String(maPheDuyet), trangThai: quyetDinh === 'DUYET' ? PD_DUYET : PD_TU_CHOI };
  });
}
/** Người gửi (hoặc quản trị) thu hồi phiếu đang chờ. */
function thuHoiDuyetGiaiNgan(maPheDuyet) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var p = docPheDuyet_().filter(function (r) { return String(r.MaPheDuyet) === String(maPheDuyet); })[0];
    if (!p) throw new Error('Không tìm thấy phiếu ' + maPheDuyet + '.');
    if (p.TrangThai !== PD_CHO) throw new Error('Chỉ thu hồi phiếu đang chờ duyệt.');
    var hs = layHoSoTheoMa_(p.MaHoSo); if (hs) kiemTraPhamViTraNo_(hs);
    var me = emailHienTaiQLV_(), laQT = typeof laQuanTri_ === 'function' ? laQuanTri_() : false;
    if (me !== emailChuan_(p.NguoiGui) && !laQT) throw new Error('Chỉ người gửi hoặc quản trị được thu hồi phiếu.');
    capNhatDongTheoMa_(SHEET_PHE_DUYET, 'MaPheDuyet', maPheDuyet, { TrangThai: PD_THU_HOI, NguoiDuyet: me, ThoiDiemDuyet: new Date() });
    ghiNhatKy_(p.MaHoSo, 'THU_HOI_DUYET', String(maPheDuyet));
    return { maPheDuyet: String(maPheDuyet), trangThai: PD_THU_HOI };
  });
}
function banGhiPheDuyet_(r, hs, me, laQT) {
  var rev = hs ? soRevision_(hs) : null, hopLe = r.TrangThai === PD_DUYET && rev === Number(r.RevisionGui);
  return { maPheDuyet: String(r.MaPheDuyet), maHoSo: String(r.MaHoSo), revisionGui: Number(r.RevisionGui), revisionHienTai: rev, trangThai: r.TrangThai, nguoiGui: r.NguoiGui, thoiDiemGui: r.ThoiDiemGui instanceof Date ? r.ThoiDiemGui.toISOString() : String(r.ThoiDiemGui || ''),
    ghiChuGui: r.GhiChuGui || '', nguoiDuyet: r.NguoiDuyet || '', thoiDiemDuyet: r.ThoiDiemDuyet instanceof Date ? r.ThoiDiemDuyet.toISOString() : String(r.ThoiDiemDuyet || ''), lyDo: r.LyDoQuyetDinh || '',
    hopLe: hopLe, daLoiThoi: r.TrangThai === PD_DUYET && !hopLe, toiLaNguoiGui: emailChuan_(r.NguoiGui) === me,
    coTheDuyet: r.TrangThai === PD_CHO && laQT && emailChuan_(r.NguoiGui) !== me && !!hs && hs.TrangThai === TT_DA_TAO && rev === Number(r.RevisionGui) };
}
/**
 * Hồ sơ CÓ THỂ GỬI DUYỆT để người dùng CHỌN (không phải gõ mã): trạng thái "Đã tạo hồ sơ", chưa xoá, chưa có phiếu đang chờ duyệt, chưa có phiếu duyệt còn hiệu lực,
 * trong phạm vi công ty được cấp. Kèm revision hiện tại (guiDuyetGiaiNgan vẫn kiểm lại ở máy chủ). Chỉ đọc.
 */
function layHoSoCoTheGuiDuyet() {
  yeuCauDangNhap_();
  var tra = layTraCuuDanhMuc_(), ds = docPheDuyet_(), cho = {};
  ds.forEach(function (r) { if (r.TrangThai === PD_CHO) cho[String(r.MaHoSo)] = true; });
  return docDanhSachHoSo_(false).filter(function (h) { return h.TrangThai === TT_DA_TAO && !cho[String(h.MaHoSo)] && !pheDuyetHopLeCuaHoSo_(h); }).map(function (h) {
    var hd = tra.hd[String(h.MaHD)] || {}, ct = tra.cty[String(hd.MaCty)] || {};
    return { maHoSo: String(h.MaHoSo), tenCty: ct.TenCty || '', soHopDong: hd.SoHopDong || '', soGiayNhanNo: h.SoGiayNhanNo || '', loaiTien: String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND',
      soTien: Number(h.SoTienNhanNoLanNay) || 0, ngayGiaiNgan: ngayIsoCuaO_(h.NgayGiaiNgan), revision: soRevision_(h) };
  }).sort(function (a, b) { return a.maHoSo < b.maHoSo ? 1 : -1; });
}
/** Danh sách phiếu (mới nhất trước). tuyChon: {trangThai, maHoSo}. */
function layDanhSachPheDuyet(tuyChon) {
  yeuCauDangNhap_();
  var o = tuyChon || {}, tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), me = emailHienTaiQLV_(), laQT = typeof laQuanTri_ === 'function' ? laQuanTri_() : false, hsMap = {};
  docDanhSachHoSo_(false).forEach(function (h) { hsMap[String(h.MaHoSo)] = h; });
  var rows = docPheDuyet_().filter(function (r) {
    var hs = hsMap[String(r.MaHoSo)], hd = hs ? tra.hd[String(hs.MaHD)] : null;
    if (!hs || (pv.length && (!hd || pv.indexOf(String(hd.MaCty)) < 0))) return false;
    return (!o.trangThai || r.TrangThai === o.trangThai) && (!o.maHoSo || String(r.MaHoSo) === String(o.maHoSo));
  }).map(function (r) { return banGhiPheDuyet_(r, hsMap[String(r.MaHoSo)], me, laQT); });
  rows.sort(function (a, b) { return a.maPheDuyet < b.maPheDuyet ? 1 : -1; });
  return { batBuoc: batDuyetHaiCap_(), toiLaQuanTri: laQT, email: me, soChoDuyet: rows.filter(function (x) { return x.trangThai === PD_CHO; }).length, rows: rows.slice(0, 200) };
}
/** Trạng thái duyệt của 1 hồ sơ (dùng trên màn hình hồ sơ). */
function layTrangThaiPheDuyetHoSo(maHoSo) {
  yeuCauDangNhap_();
  var hs = layHoSoTheoMa_(maHoSo);
  if (!hs || laDaXoa_(hs.DaXoa)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  kiemTraPhamViTraNo_(hs);
  var me = emailHienTaiQLV_(), laQT = typeof laQuanTri_ === 'function' ? laQuanTri_() : false;
  var ds = docPheDuyet_().filter(function (r) { return String(r.MaHoSo) === String(maHoSo); }).map(function (r) { return banGhiPheDuyet_(r, hs, me, laQT); }).sort(function (a, b) { return a.maPheDuyet < b.maPheDuyet ? 1 : -1; });
  var hopLe = ds.filter(function (x) { return x.hopLe; })[0] || null;
  return { batBuoc: batDuyetHaiCap_(), duocPhepXacNhan: !batDuyetHaiCap_() || !!hopLe, hopLe: hopLe, moiNhat: ds[0] || null, lichSu: ds.slice(0, 10) };
}
