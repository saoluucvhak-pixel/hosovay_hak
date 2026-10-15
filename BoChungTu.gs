/**
 * BOCHUNGTU.GS — QUẢN LÝ BỘ CHỨNG TỪ: phiên phát hành trọn bộ, trạng thái bộ, hiệu lực của từng chứng từ theo dữ liệu hồ sơ.
 *
 * Trạng thái BỘ (tính từ dữ liệu, không lưu trùng): Chưa phát hành · Đang phát hành · Phát hành thiếu · Phát hành lỗi · Đã hoàn tất · Hết hiệu lực do hồ sơ thay đổi.
 * Một chứng từ "có hiệu lực" khi: bản phát hành hiện hành trạng thái "Hiệu lực" + có liên kết file + HashDuLieu khớp dữ liệu hồ sơ HIỆN TẠI.
 * (Có link Drive KHÔNG đủ để coi là hợp lệ.) Lịch sử luôn được giữ; phát hành lại tạo phiên bản mới, không ghi đè file cũ.
 */
var SHEET_PHIEN_PHAT_HANH = 'PhienPhatHanhBo';
var COT_PHIEN_PHAT_HANH_ = ['MaPhien', 'MaHoSo', 'RevisionNguon', 'HashNguon', 'CanTao', 'DaTao', 'Loi', 'BoQua', 'BatDau', 'HoanThanh', 'TrangThai', 'NguoiThucHien', 'CheDo', 'PhienGoc'];
var TT_PHIEN_DANG = 'Đang phát hành', TT_PHIEN_THIEU = 'Phát hành thiếu', TT_PHIEN_LOI = 'Phát hành lỗi', TT_PHIEN_XONG = 'Đã hoàn tất';
var TT_BO_CHUA = 'Chưa phát hành', TT_BO_HET_HAN = 'Hết hiệu lực do hồ sơ thay đổi';
var PHIEN_TOI_DA_PHUT_ = 10; // quá thời gian này mà vẫn "Đang phát hành" = phiên bị ngắt (hết 6 phút của Apps Script / mất kết nối)

/** Mô tả hiệu lực 1 bản phát hành so với dữ liệu hồ sơ hiện tại. @return {{ma:string, nhan:string}} */
function hieuLucBanPhatHanh_(ban, hashHienTai) {
  if (!ban) return { ma: 'THIEU', nhan: 'Chưa phát hành' };
  if (ban.TrangThai === TT_PH_LOI) return { ma: 'LOI', nhan: 'Phát hành lỗi' };
  if (ban.TrangThai === TT_PH_DA_THAY) return { ma: 'DA_THAY', nhan: 'Được thay thế' };
  if (!(ban.LinkDocx || ban.LinkXlsx || ban.LinkGoc)) return { ma: 'THIEU_LINK', nhan: 'Thiếu liên kết file hợp lệ' };
  if (hashHienTai && ban.HashDuLieu && ban.HashDuLieu !== hashHienTai) return { ma: 'HET_HIEU_LUC', nhan: TT_BO_HET_HAN };
  return { ma: 'HIEU_LUC', nhan: 'Hiệu lực' };
}

/** Hash dữ liệu hiện tại của hồ sơ (cùng công thức lúc phát hành). */
function hashHienTaiCuaHoSo_(d) { try { return hashDuLieuHoSo_(d); } catch (e) { return ''; } }

function docPhienPhatHanh_() {
  try { return sheetToObjects_(SHEET_PHIEN_PHAT_HANH); } catch (e) { return []; }
}
function phienMoiNhat_(maHoSo, boQuaMa) {
  var kq = null;
  docPhienPhatHanh_().forEach(function (p) { if (String(p.MaHoSo) === String(maHoSo) && p.MaPhien !== boQuaMa) kq = p; });
  return kq;
}
function ghiPhienBatDau_(maHoSo, revision, hash, canTao, cheDo, phienGoc) {
  var sh = ensureSheet_(getSS_(), SHEET_PHIEN_PHAT_HANH, COT_PHIEN_PHAT_HANH_);
  var ma = 'PH-' + maHoSo + '-' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyMMddHHmmss') + '-' + Math.floor(Math.random() * 1000);
  themDongVaoCuoiThat_(sh, [ma, maHoSo, revision, hash, JSON.stringify(canTao), '[]', '[]', '[]', new Date(), '', TT_PHIEN_DANG, emailNguoiDung_(), cheDo || 'MOI', phienGoc || '']);
  return ma;
}
function capNhatPhien_(maPhien, cot) {
  var sh = getSS_().getSheetByName(SHEET_PHIEN_PHAT_HANH);
  if (!sh) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], vals = layGiaTriThatCuaSheet_(sh), cMa = headers.indexOf('MaPhien');
  for (var r = vals.length - 1; r >= 1; r--) {
    if (vals[r][cMa] === maPhien) { ghiCotHoSo_(sh, headers, r + 1, cot); return; }
  }
}

/**
 * Trạng thái bộ chứng từ của 1 hồ sơ (chỉ đọc). d = layDuLieuDayDu(maHoSo) nếu đã có.
 * @return {{trangThai:string, batBuoc:string[], hopLe:string[], thieu:string[], hetHieuLuc:string[], loi:string[], phienMoiNhat:string, revisionHoSo:number}}
 */
function tinhTrangThaiBo_(maHoSo, d, boQuaPhienMa) {
  d = d || layDuLieuDayDu(maHoSo);
  var hash = hashHienTaiCuaHoSo_(d), bank = d.hopDong.TenNganHang || '', batBuoc = dsChungTuBatBuoc_(d.hoSo, bank);
  var hopLe = [], thieu = [], het = [], loi = [];
  batCacheLichSu_();
  try {
    batBuoc.forEach(function (loai) {
      var ban = layPhatHanhHienHanh_(maHoSo, loai), h = hieuLucBanPhatHanh_(ban, hash);
      if (h.ma === 'HIEU_LUC') hopLe.push(loai); else if (h.ma === 'HET_HIEU_LUC') het.push(loai); else thieu.push(loai);
    });
  } finally { xoaCacheLichSu_(); }
  var p = phienMoiNhat_(maHoSo, boQuaPhienMa), tt;
  var phienDang = p && p.TrangThai === TT_PHIEN_DANG && (Date.now() - new Date(p.BatDau).getTime()) < PHIEN_TOI_DA_PHUT_ * 60000;
  if (phienDang) tt = TT_PHIEN_DANG;
  else if (hopLe.length === batBuoc.length) tt = TT_PHIEN_XONG; // (không có chứng từ bắt buộc nào = coi như đủ)
  else if (het.length) tt = TT_BO_HET_HAN;
  else if (p && (p.TrangThai === TT_PHIEN_LOI || p.TrangThai === TT_PHIEN_DANG)) { // phiên "Đang" quá hạn = bị ngắt → coi là lỗi
    try { loi = JSON.parse(p.Loi || '[]').map(function (x) { return x.loaiTaiLieu; }); } catch (e) { loi = []; }
    tt = TT_PHIEN_LOI;
  } else if (hopLe.length) tt = TT_PHIEN_THIEU;
  else if (p && p.TrangThai === TT_PHIEN_THIEU) tt = TT_PHIEN_THIEU;
  else tt = TT_BO_CHUA;
  return { trangThai: tt, batBuoc: batBuoc, hopLe: hopLe, thieu: thieu, hetHieuLuc: het, loi: loi, phienMoiNhat: p ? p.MaPhien : '', revisionHoSo: soRevision_(d.hoSo) };
}

function layTrangThaiBoChungTu(maHoSo) {
  yeuCauDangNhap_();
  var t = tinhTrangThaiBo_(maHoSo, null);
  t.nhan = {}; t.batBuoc.concat(t.hopLe, t.thieu, t.hetHieuLuc).forEach(function (m) { t.nhan[m] = nhanChungTu_(m); });
  return t;
}

function layLichSuPhienPhatHanh(maHoSo) {
  yeuCauDangNhap_();
  return docPhienPhatHanh_().filter(function (p) { return String(p.MaHoSo) === String(maHoSo); }).reverse().map(function (p) {
    var j = function (v) { try { return JSON.parse(v || '[]'); } catch (e) { return []; } };
    return { maPhien: p.MaPhien, revisionNguon: p.RevisionNguon, trangThai: p.TrangThai, cheDo: p.CheDo, phienGoc: p.PhienGoc, canTao: j(p.CanTao), daTao: j(p.DaTao), loi: j(p.Loi), boQua: j(p.BoQua),
      batDau: ngayChoMau_(p.BatDau), hoanThanh: p.HoanThanh ? ngayChoMau_(p.HoanThanh) : '', nguoi: p.NguoiThucHien };
  });
}
