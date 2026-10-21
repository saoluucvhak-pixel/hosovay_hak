/**
 * TRANONO.GS — SỔ GHI NHẬN TRẢ GỐC/LÃI TỪNG LẦN, DƯ NỢ GỐC CÒN LẠI.
 *
 * NGUYÊN TẮC
 *  • Chỉ ghi nhận trả nợ cho hồ sơ "Đã giải ngân" và chưa tất toán.
 *  • Dư nợ gốc còn lại = SoTienNhanNoLanNay − tổng TRẢ GỐC còn hiệu lực. Không cho trả gốc vượt dư nợ còn lại.
 *  • Trả LÃI chỉ ghi nhận để đối chiếu; không làm thay đổi dư nợ gốc.
 *  • Không xoá bản ghi: hủy = đánh dấu "Hủy bỏ" kèm lý do và người hủy.
 *  • Mỗi thao tác tăng revision hồ sơ (để các phiên khác phát hiện thay đổi).
 */
var SHEET_TRA_NO = 'TraNoHoSo';
var COT_TRA_NO_ = ['MaTra', 'MaHoSo', 'NgayTra', 'LoaiTra', 'SoTien', 'LoaiTien', 'SoThamChieu', 'ChungTu', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'TrangThai', 'LyDoHuy', 'NguoiHuy', 'ThoiDiemHuy', 'RevisionHoSo'];
var TRA_GOC = 'GOC', TRA_LAI = 'LAI', TRA_HIEU_LUC = 'Hiệu lực', TRA_HUY = 'Hủy bỏ';

/** Kiểm tra hồ sơ thuộc công ty được cấp cho người dùng (dùng cho đọc, ghi, hủy trả nợ và lịch). */
function kiemTraPhamViTraNo_(h) {
  var pv = phamViCongTyNguoiDung_();
  if (!pv.length) return;
  var hd = layTraCuuDanhMuc_().hd[String((h || {}).MaHD)];
  if (!h || !hd || pv.indexOf(String(hd.MaCty)) < 0) throw new Error('Không tìm thấy khoản đã giải ngân trong phạm vi được cấp.');
}
/** Đọc (không tạo sheet khi chỉ đọc). */
function docTraNo_() {
  if (!getSS_().getSheetByName(SHEET_TRA_NO)) return [];
  return sheetToObjects_(SHEET_TRA_NO);
}
/** Tổng trả GỐC còn hiệu lực theo từng hồ sơ: { maHoSo: soTien }. Dùng cho tổng quan (1 lần đọc). */
function tongTraGocTheoHoSo_(ds) {
  var m = {};
  (ds || []).forEach(function (r) {
    if (r.LoaiTra !== TRA_GOC || r.TrangThai !== TRA_HIEU_LUC) return;
    var k = String(r.MaHoSo);
    m[k] = congSoTien_(m[k] || 0, Number(r.SoTien) || 0);
  });
  return m;
}
/** Dư nợ gốc còn lại của 1 hồ sơ = gốc giải ngân − trả gốc hiệu lực. */
function duNoGocConLai_(hs, traMap) {
  var goc = Number(hs.SoTienNhanNoLanNay) || 0;
  return congSoTien_(goc, -((traMap || {})[String(hs.MaHoSo)] || 0));
}
/** Tổng hợp trả nợ theo hồ sơ (chỉ bản ghi hiệu lực): { maHoSo: {daTraGoc, daTraLai, soLan, ngayCuoi} }. */
function tongHopTraNoTheoHoSo_(ds) {
  var m = {};
  (ds || []).forEach(function (r) {
    if (r.TrangThai !== TRA_HIEU_LUC) return;
    var k = String(r.MaHoSo), o = m[k] || (m[k] = { daTraGoc: 0, daTraLai: 0, soLan: 0, ngayCuoi: '' });
    var tien = Number(r.SoTien) || 0, ngay = String(r.NgayTra || '').substring(0, 10);
    if (r.LoaiTra === TRA_GOC) o.daTraGoc = congSoTien_(o.daTraGoc, tien);
    else if (r.LoaiTra === TRA_LAI) o.daTraLai = congSoTien_(o.daTraLai, tien);
    o.soLan++;
    if (ngay > o.ngayCuoi) o.ngayCuoi = ngay;
  });
  return m;
}
function maTraMoi_(maHoSo, ds) {
  var n = (ds || []).filter(function (r) { return String(r.MaHoSo) === String(maHoSo); }).length + 1;
  return 'TN-' + maHoSo + '-' + n;
}
function ghiTraNoDong_(o) {
  var sh = ensureSheet_(getSS_(), SHEET_TRA_NO, COT_TRA_NO_);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  themDongVaoCuoiThat_(sh, headers.map(function (h) { return o.hasOwnProperty(h) ? o[h] : ''; }));
}

/** Chi tiết trả nợ của 1 hồ sơ (chỉ đọc). */
function layTraNoHoSo(maHoSo) {
  yeuCauDangNhap_();
  var hs = layHoSoTheoMa_(maHoSo);
  if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  kiemTraPhamViTraNo_(hs);
  var ds = docTraNo_().filter(function (r) { return String(r.MaHoSo) === String(maHoSo); });
  var map = tongTraGocTheoHoSo_(ds);
  var lai = ds.filter(function (r) { return r.LoaiTra === TRA_LAI && r.TrangThai === TRA_HIEU_LUC; })
    .reduce(function (a, r) { return congSoTien_(a, Number(r.SoTien) || 0); }, 0);
  return {
    maHoSo: String(maHoSo), loaiTien: String(hs.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND',
    trangThai: hs.TrangThai || '', daTatToan: daTatToanHoSo_(hs),
    goc: Number(hs.SoTienNhanNoLanNay) || 0, daTraGoc: map[String(maHoSo)] || 0,
    duNoGoc: duNoGocConLai_(hs, map), daTraLai: lai,
    dong: ds.map(function (r) {
      return { maTra: r.MaTra, loai: r.LoaiTra, ngayTra: String(r.NgayTra || '').substring(0, 10), soTien: Number(r.SoTien) || 0, soThamChieu: r.SoThamChieu,
        chungTu: r.ChungTu, ghiChu: r.GhiChu, nguoi: r.NguoiGhi, trangThai: r.TrangThai, lyDoHuy: r.LyDoHuy || '' };
    }).sort(function (a, b) { return a.ngayTra < b.ngayTra ? 1 : (a.ngayTra > b.ngayTra ? -1 : 0); })
  };
}

/**
 * GHI NHẬN MỘT LẦN TRẢ GỐC/LÃI.
 * @param {{loaiTra:'GOC'|'LAI', ngayTra:string, soTien:number|string, soThamChieu:string, chungTu:string, ghiChu:string=}} tt
 * @param {number} expectedRevision BẮT BUỘC
 */
function ghiNhanTraNo(maHoSo, tt, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    var hs = layHoSoTheoMa_(maHoSo);
    if (!hs || laDaXoa_(hs.DaXoa)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
    kiemTraPhamViTraNo_(hs);
    kiemTraRevisionBatBuoc_(hs, expectedRevision);
    if (hs.TrangThai !== TT_DA_GIAI_NGAN) throw new Error('Chỉ ghi nhận trả nợ cho hồ sơ "Đã giải ngân" (đang "' + hs.TrangThai + '").');
    if (daTatToanHoSo_(hs)) throw new Error('Hồ sơ đã tất toán. Mở lại tất toán trước khi ghi nhận trả nợ.');
    var loai = tt.loaiTra === TRA_LAI ? TRA_LAI : (tt.loaiTra === TRA_GOC ? TRA_GOC : '');
    if (!loai) throw new Error('Loại trả phải là GOC (gốc) hoặc LAI (lãi).');
    var ngay = ngayChuanISO_(tt.ngayTra, 'Ngày trả', true);
    var ngayGN = ngayIsoCuaO_(hs.NgayGiaiNgan);
    if (ngayGN && ngay < ngayGN) throw new Error('Ngày trả không được trước ngày giải ngân (' + ngayGN + ').');
    var loaiTien = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    var soTien = docTienTheoLoai_(tt.soTien, hs.LoaiTien, 'Số tiền trả', true);
    if (!(soTien > 0)) throw new Error('Số tiền trả phải lớn hơn 0.');
    var ds = docTraNo_();
    if (loai === TRA_GOC) {
      var du = duNoGocConLai_(hs, tongTraGocTheoHoSo_(ds));
      if (soTien > du) throw new Error('Số tiền gốc trả (' + formatSo_(soTien) + ') vượt dư nợ gốc còn lại (' + formatSo_(du) + ').');
    }
    var soTC = String(tt.soThamChieu || '').trim();
    if (soTC.length < 3) throw new Error('Số tham chiếu giao dịch ngân hàng bắt buộc (tối thiểu 3 ký tự).');
    var k = soTC.toLowerCase();
    var trung = ds.filter(function (r) { return r.TrangThai === TRA_HIEU_LUC && String(r.SoThamChieu).trim().toLowerCase() === k; })[0];
    if (trung) throw new Error('Số tham chiếu "' + soTC + '" đã dùng cho bản ghi ' + trung.MaTra + ' — không ghi nhận trùng giao dịch.');
    var chungTu = String(tt.chungTu || '').trim();
    if (chungTu.length < 3) throw new Error('Bắt buộc có chứng từ/bằng chứng trả nợ.');
    var me = layDanhTinh_().email || emailNguoiDung_(), ma = maTraMoi_(maHoSo, ds);
    ghiTraNoDong_({ MaTra: ma, MaHoSo: maHoSo, NgayTra: ngay, LoaiTra: loai, SoTien: soTien, LoaiTien: loaiTien, SoThamChieu: soTC,
      ChungTu: chungTu, GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').trim()).substring(0, 500), NguoiGhi: me, ThoiDiemGhi: new Date(),
      TrangThai: TRA_HIEU_LUC, RevisionHoSo: soRevision_(hs) });
    var revMoi = chamRevisionHoSo_(hs, me);
    ghiNhatKy_(maHoSo, 'TRA_NO', ma + ' | ' + loai + ' | ' + soTien + ' ' + loaiTien + ' | ' + soTC);
    var duSau = duNoGocConLai_(hs, tongTraGocTheoHoSo_(docTraNo_()));
    return { maHoSo: maHoSo, maTra: ma, revision: revMoi, duNoGoc: duSau };
  });
}

/** Hủy một bản ghi trả nợ (không xoá): đánh dấu "Hủy bỏ" kèm lý do. */
function huyTraNo(maTra, lyDo, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    var ds = docTraNo_(), r = ds.filter(function (x) { return x.MaTra === maTra; })[0];
    if (!r) throw new Error('Không tìm thấy bản ghi trả nợ ' + maTra + '.');
    if (r.TrangThai !== TRA_HIEU_LUC) throw new Error('Bản ghi này đã hủy trước đó.');
    var ly = String(lyDo || '').trim();
    if (ly.length < 3) throw new Error('Cần nhập lý do hủy bản ghi trả nợ.');
    var hs = layHoSoTheoMa_(r.MaHoSo);
    if (!hs) throw new Error('Không tìm thấy hồ sơ ' + r.MaHoSo + '.');
    kiemTraPhamViTraNo_(hs);
    kiemTraRevisionBatBuoc_(hs, expectedRevision);
    if (daTatToanHoSo_(hs)) throw new Error('Hồ sơ đã tất toán. Mở lại tất toán trước khi hủy bản ghi trả nợ.');
    var me = layDanhTinh_().email || emailNguoiDung_();
    var sh = getSS_().getSheetByName(SHEET_TRA_NO), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var vals = layGiaTriThatCuaSheet_(sh), c = headers.indexOf('MaTra'), dong = -1;
    for (var i = 1; i < vals.length; i++) if (vals[i][c] === maTra) { dong = i + 1; break; }
    if (dong < 0) throw new Error('Không tìm thấy dòng bản ghi ' + maTra + '.');
    ghiCotHoSo_(sh, headers, dong, { TrangThai: TRA_HUY, LyDoHuy: lamSachCongThuc_(ly).substring(0, 500), NguoiHuy: me, ThoiDiemHuy: new Date() });
    SpreadsheetApp.flush();
    var revMoi = chamRevisionHoSo_(hs, me);
    ghiNhatKy_(r.MaHoSo, 'HUY_TRA_NO', maTra + ' | ' + ly);
    var duSau = duNoGocConLai_(hs, tongTraGocTheoHoSo_(docTraNo_()));
    return { maHoSo: r.MaHoSo, maTra: maTra, revision: revMoi, duNoGoc: duSau };
  });
}

/** Tăng revision hồ sơ (dùng chung cho mọi thay đổi sổ trả nợ). */
function chamRevisionHoSo_(hs, me) {
  var sh = getSS_().getSheetByName(SHEET_HOSO), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var dong = timDongHoSo_(sh, headers, hs.MaHoSo), revMoi = soRevision_(hs) + 1;
  ghiCotHoSo_(sh, headers, dong, { Revision: revMoi, CapNhatLuc: new Date(), CapNhatBoi: me });
  SpreadsheetApp.flush(); tangRevision_('HOSO');
  return revMoi;
}
