/**
 * CANHBAO.GS — CẢNH BÁO KHOẢN VAY: sắp đến hạn, quá hạn, biến động tỷ giá vượt ngưỡng.
 *
 * NGUỒN TỶ GIÁ: nhập THỦ CÔNG vào sheet TyGiaThuCong (mục 3 — tự cập nhật BIDV — chưa làm).
 * Chỉ tính cho khoản đang theo dõi (Đã giải ngân, chưa tất toán, dư nợ gốc > 0).
 */
var SHEET_TY_GIA_THU_CONG = 'TyGiaThuCong';
var COT_TY_GIA_THU_CONG_ = ['Ngay', 'TyGiaBan', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi'];
var CB_NGUONG_BIEN_DONG_TY_GIA = 0.01; // 1% so với tỷ giá ghi nhận khi giải ngân
var CB_SAP_DEN_HAN_NGAY = 7;
var CB_GIOI_HAN_HIEN_THI = 50;

/** Số ngày từ a đến b (ISO yyyy-MM-dd). Dương = b sau a. */
function soNgayGiuaIso_(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
/** Tỷ giá thủ công mới nhất (hoặc null). */
function layTyGiaThuCongMoiNhat_() {
  if (!getSS_().getSheetByName(SHEET_TY_GIA_THU_CONG)) return null;
  var ds = sheetToObjects_(SHEET_TY_GIA_THU_CONG).filter(function (r) { return ngayIsoCuaO_(r.Ngay) && Number(r.TyGiaBan) > 0; });
  if (!ds.length) return null;
  ds.sort(function (a, b) { var x = ngayIsoCuaO_(a.Ngay), y = ngayIsoCuaO_(b.Ngay); return x < y ? 1 : (x > y ? -1 : 0); });
  return { ngay: ngayIsoCuaO_(ds[0].Ngay), tyGiaBan: Number(ds[0].TyGiaBan) };
}
/** Ghi tỷ giá thủ công cho một ngày (mỗi ngày một dòng; trùng ngày bị chặn để không mơ hồ). */
function ghiTyGiaThuCong(tt) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    var ngay = ngayChuanISO_(tt.ngay, 'Ngày tỷ giá', true);
    var ty = Math.round(Number(String(tt.tyGiaBan == null ? '' : tt.tyGiaBan).replace(/[^0-9]/g, '')));
    if (!(ty >= 1000 && ty <= 100000)) throw new Error('Tỷ giá VND/USD phải từ 1.000 đến 100.000.');
    if (ngay > homNayVN_()) throw new Error('Ngày tỷ giá không được ở tương lai.');
    var ds = getSS_().getSheetByName(SHEET_TY_GIA_THU_CONG) ? sheetToObjects_(SHEET_TY_GIA_THU_CONG) : [];
    if (ds.some(function (r) { return ngayIsoCuaO_(r.Ngay) === ngay; })) throw new Error('Đã có tỷ giá ngày ' + ngay + '. Không ghi trùng ngày.');
    var sh = ensureSheet_(getSS_(), SHEET_TY_GIA_THU_CONG, COT_TY_GIA_THU_CONG_);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var me = layDanhTinh_().email || emailNguoiDung_();
    themDongVaoCuoiThat_(sh, headers.map(function (h) {
      return { Ngay: ngay, TyGiaBan: ty, GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').trim()).substring(0, 200), NguoiGhi: me, ThoiDiemGhi: new Date() }[h] ?? '';
    }));
    ghiNhatKy_('TY_GIA', 'GHI_TY_GIA', ngay + ' | ' + ty);
    return { ngay: ngay, tyGiaBan: ty };
  });
}

/**
 * Danh sách cảnh báo cho khoản đang theo dõi.
 * @param {Array} rows hồ sơ đã lọc theo phạm vi (khoanVayTrongPhamVi_)
 * @param {Object} traMap tổng trả gốc theo hồ sơ (tongTraGocTheoHoSo_)
 */
function layCanhBaoKhoanVay_(rows, traMap) {
  var today = homNayVN_(), ty = layTyGiaThuCongMoiNhat_(), out = [];
  (rows || []).forEach(function (h) {
    if (daTatToanHoSo_(h)) return;
    var duNo = duNoGocConLai_(h, traMap);
    if (!(duNo > 0)) return;
    var loaiTien = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    var ma = String(h.MaHoSo), hanIso = ngayIsoCuaO_(h.NgayDenHan), base = { maHoSo: ma, loaiTien: loaiTien, duNoGoc: duNo, ngayDenHan: hanIso || '' };
    if (hanIso) {
      var soNgay = soNgayGiuaIso_(today, hanIso);
      if (soNgay < 0) out.push(Object.assign({}, base, { loai: 'QUA_HAN', mucDo: 'cao', soNgay: -soNgay,
        moTa: 'Quá hạn ' + (-soNgay) + ' ngày (đến hạn ' + hanIso + ').' }));
      else if (soNgay <= CB_SAP_DEN_HAN_NGAY) out.push(Object.assign({}, base, { loai: 'SAP_DEN_HAN', mucDo: soNgay <= 2 ? 'cao' : 'vua', soNgay: soNgay,
        moTa: soNgay === 0 ? 'Đến hạn hôm nay.' : 'Còn ' + soNgay + ' ngày đến hạn (' + hanIso + ').' }));
    }
    var tyGiaHS = Number(h.TyGiaBan) || 0;
    if (loaiTien === 'USD' && ty && tyGiaHS > 0) {
      var lech = (ty.tyGiaBan - tyGiaHS) / tyGiaHS;
      if (Math.abs(lech) >= CB_NGUONG_BIEN_DONG_TY_GIA) out.push(Object.assign({}, base, { loai: 'TY_GIA', mucDo: Math.abs(lech) >= 2 * CB_NGUONG_BIEN_DONG_TY_GIA ? 'cao' : 'vua', lechTyGia: lech,
        moTa: 'Tỷ giá ' + ty.ngay + ' là ' + formatTyGia_(ty.tyGiaBan) + ', lệch ' + (lech * 100).toFixed(2).replace('.', ',') + '% so với tỷ giá giải ngân ' + formatTyGia_(tyGiaHS) + '.' }));
    }
  });
  var thuTu = { QUA_HAN: 0, SAP_DEN_HAN: 1, TY_GIA: 2 };
  out.sort(function (a, b) { return (thuTu[a.loai] - thuTu[b.loai]) || ((a.soNgay || 0) - (b.soNgay || 0)); });
  return { ngayKiemTra: today, tyGiaMoiNhat: ty, nguongTyGia: CB_NGUONG_BIEN_DONG_TY_GIA,
    tongSo: out.length, dong: out.slice(0, CB_GIOI_HAN_HIEN_THI) };
}
