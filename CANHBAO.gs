/**
 * CANHBAO.GS — CẢNH BÁO KHOẢN VAY: sắp đến hạn, quá hạn, biến động tỷ giá vượt ngưỡng.
 *
 * NGUỒN TỶ GIÁ: nhập THỦ CÔNG vào sheet TyGiaThuCong (tự cập nhật từ Vietcombank: xem TYGIATUDONG.gs).
 * Chỉ tính cho khoản đang theo dõi (Đã giải ngân, chưa tất toán, dư nợ gốc > 0).
 */
var SHEET_TY_GIA_THU_CONG = 'TyGiaThuCong';
var COT_TY_GIA_THU_CONG_ = ['Ngay', 'TyGiaBan', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi'];
var CB_NGUONG_BIEN_DONG_TY_GIA = 0.01; // 1% so với tỷ giá ghi nhận khi giải ngân
var CB_SAP_DEN_HAN_NGAY = 7; // mặc định, nếu cấu hình NGAY_NHAC_TRUOC_HAN chưa đặt
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
  var ngay = ngayIsoCuaO_(ds[0].Ngay), tuoi = Math.max(0, soNgayGiuaIso_(ngay, homNayVN_())), nguong = Number(layCauHinh_('TY_GIA_CU_SAU_NGAY'));
  if (!(nguong >= 0)) nguong = TY_GIA_CU_SAU_NGAY_MAC_DINH_;
  var cu = tuoi > nguong;
  return { ngay: ngay, tyGiaBan: Number(ds[0].TyGiaBan), nguon: String(ds[0].GhiChu || '').trim() || 'Nhập tay', ghiLuc: ds[0].ThoiDiemGhi ? ngayChoMau_(ds[0].ThoiDiemGhi) : '',
    soNgayCu: tuoi, trangThai: cu ? 'CU' : 'MOI',
    canhBao: cu ? 'Tỷ giá đã cũ ' + tuoi + ' ngày (ngày ' + ngay + ') — chưa phải tỷ giá hiện hành, cần cập nhật trước khi dùng để quy đổi/đánh giá rủi ro.' : '' };
}
/** Tỷ giá được xem là CŨ khi quá số ngày này (cấu hình TY_GIA_CU_SAU_NGAY; mặc định 2 để chịu được cuối tuần). */
var TY_GIA_CU_SAU_NGAY_MAC_DINH_ = 2;
/** Ghi tỷ giá thủ công cho một ngày (mỗi ngày một dòng; trùng ngày bị chặn để không mơ hồ). */
function ghiTyGiaThuCong(tt) {
  yeuCauDangNhap_();
  return voiKhoa_(function () {
    tt = tt || {};
    var ngay = ngayChuanISO_(tt.ngay, 'Ngày tỷ giá', true);
    var raw = String(tt.tyGiaBan == null ? '' : tt.tyGiaBan).trim();
    if (!/^\d{1,3}([.,]\d{3})+$|^\d{4,6}$/.test(raw)) throw new Error('Tỷ giá phải là số dương dạng 25.800 hoặc 25800 (không có dấu âm, số lẻ hay ký tự khác).');
    var ty = Number(raw.replace(/[.,]/g, ''));
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
  var today = homNayVN_(), ty = layTyGiaThuCongMoiNhat_(), out = [], coUSD = false;
  var nhac = Number(layCauHinh_('NGAY_NHAC_TRUOC_HAN')) || CB_SAP_DEN_HAN_NGAY;
  (rows || []).forEach(function (h) {
    if (daTatToanHoSo_(h)) return;
    var duNo = duNoGocConLai_(h, traMap);
    if (!(duNo > 0)) return;
    var loaiTien = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    if (loaiTien === 'USD') coUSD = true;
    var ma = String(h.MaHoSo), hanIso = ngayIsoCuaO_(h.NgayDenHan), base = { maHoSo: ma, loaiTien: loaiTien, duNoGoc: duNo, ngayDenHan: hanIso || '' };
    if (hanIso) {
      var soNgay = soNgayGiuaIso_(today, hanIso);
      if (soNgay < 0) out.push(Object.assign({}, base, { loai: 'QUA_HAN', mucDo: 'cao', soNgay: -soNgay,
        moTa: 'Quá hạn ' + (-soNgay) + ' ngày (đến hạn ' + hanIso + ').' }));
      else if (soNgay <= nhac) out.push(Object.assign({}, base, { loai: 'SAP_DEN_HAN', mucDo: soNgay <= 2 ? 'cao' : 'vua', soNgay: soNgay,
        moTa: soNgay === 0 ? 'Đến hạn hôm nay.' : 'Còn ' + soNgay + ' ngày đến hạn (' + hanIso + ').' }));
    }
    var tyGiaHS = Number(h.TyGiaBan) || 0;
    if (loaiTien === 'USD' && ty && tyGiaHS > 0) {
      var lech = (ty.tyGiaBan - tyGiaHS) / tyGiaHS;
      if (Math.abs(lech) >= CB_NGUONG_BIEN_DONG_TY_GIA) out.push(Object.assign({}, base, { loai: 'TY_GIA', mucDo: Math.abs(lech) >= 2 * CB_NGUONG_BIEN_DONG_TY_GIA ? 'cao' : 'vua', lechTyGia: lech,
        moTa: 'Tỷ giá ' + ty.ngay + (ty.trangThai === 'CU' ? ' (CŨ ' + ty.soNgayCu + ' ngày, không phải tỷ giá hiện hành)' : '') + ' là ' + formatTyGia_(ty.tyGiaBan) + ', lệch ' + (lech * 100).toFixed(2).replace('.', ',') + '% so với tỷ giá giải ngân ' + formatTyGia_(tyGiaHS) + '.' }));
    }
  });
  if (coUSD && (!ty || ty.trangThai === 'CU')) out.push({ loai: 'TY_GIA_CU', mucDo: 'vua', soNgay: 0, maHoSo: '', loaiTien: 'USD', duNoGoc: 0, ngayDenHan: '',
    moTa: ty ? ty.canhBao : 'Chưa có tỷ giá USD nên chưa đánh giá được rủi ro tỷ giá của các khoản vay USD còn dư nợ. Hãy nhập tỷ giá.' });
  var thuTu = { QUA_HAN: 0, SAP_DEN_HAN: 1, TY_GIA: 2, TY_GIA_CU: 3 };
  out.sort(function (a, b) { return (thuTu[a.loai] - thuTu[b.loai]) || ((a.soNgay || 0) - (b.soNgay || 0)); });
  return { ngayKiemTra: today, tyGiaMoiNhat: ty, nguongTyGia: CB_NGUONG_BIEN_DONG_TY_GIA,
    tongSo: out.length, dong: out.slice(0, CB_GIOI_HAN_HIEN_THI) };
}
