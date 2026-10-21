/**
 * CANHBAO.GS — CẢNH BÁO KHOẢN VAY: sắp đến hạn, quá hạn, biến động tỷ giá vượt ngưỡng.
 *
 * NGUỒN TỶ GIÁ: nhập THỦ CÔNG vào sheet TyGiaThuCong (tự cập nhật từ Vietcombank: xem TYGIATUDONG.gs).
 * Chỉ tính cho khoản đang theo dõi (Đã giải ngân, chưa tất toán, dư nợ gốc > 0).
 */
var SHEET_TY_GIA_THU_CONG = 'TyGiaThuCong';
var COT_TY_GIA_THU_CONG_ = ['Ngay', 'TyGiaBan', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'TyGiaMua'];
var SHEET_LICH_SU_TY_GIA = 'LichSuTyGia';
var COT_LICH_SU_TY_GIA_ = ['ThoiGian', 'NgayApDung', 'TyGiaMua', 'TyGiaBan', 'HanhDong', 'NguonGhiChu', 'NguoiGhi', 'GiaBanTruoc', 'GiaMuaTruoc', 'NguoiGhiTruoc'];
/** Nhật ký THAY ĐỔI tỷ giá (chỉ thêm, không sửa/xóa): mỗi lần ghi mới/thay/ghi đè có thời điểm, người, giá trước đó. Lỗi ghi nhật ký không được chặn việc ghi tỷ giá. */
function ghiLichSuTyGia_(o) {
  try {
    var sh = ensureSheet_(getSS_(), SHEET_LICH_SU_TY_GIA, COT_LICH_SU_TY_GIA_), headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var d = { ThoiGian: new Date(), NgayApDung: o.ngay, TyGiaMua: o.mua == null ? '' : o.mua, TyGiaBan: o.ban, HanhDong: o.hanhDong, NguonGhiChu: lamSachCongThuc_(String(o.nguon || '')).substring(0, 200), NguoiGhi: o.nguoi,
      GiaBanTruoc: o.banTruoc == null ? '' : o.banTruoc, GiaMuaTruoc: o.muaTruoc == null || o.muaTruoc === '' ? '' : o.muaTruoc, NguoiGhiTruoc: o.nguoiTruoc || '' };
    themDongVaoCuoiThat_(sh, headers.map(function (h) { return d[h] !== undefined ? d[h] : ''; }));
  } catch (e) { console.warn('[TY_GIA] Không ghi được nhật ký thay đổi: ' + e.message); }
}
/** Bình quân mua–bán (2 số lẻ). Trả null khi thiếu hoặc không hợp lệ giá mua. */
function tyGiaBinhQuan_(mua, ban) { mua = Number(mua); ban = Number(ban); return mua > 0 && ban > 0 ? Math.round((mua + ban) / 2 * 100) / 100 : null; }
/** Chuẩn hoá một ô tỷ giá nhập (cùng quy tắc cho giá bán và giá mua). */
function chuanTyGiaNhap_(raw, ten) {
  raw = String(raw == null ? '' : raw).trim();
  var coLe = /^\d{4,6}\.\d{1,6}$/.test(raw);
  if (!coLe && !/^\d{1,3}([.,]\d{3})+$|^\d{4,6}$/.test(raw)) throw new Error(ten + ' phải là số dương dạng 25.800, 25800 hoặc 25857,5 (không có dấu âm hay ký tự khác).');
  var ty = coLe ? Number(raw) : Number(raw.replace(/[.,]/g, ''));
  if (!(ty >= 1000 && ty <= 100000)) throw new Error(ten + ' VND/USD phải từ 1.000 đến 100.000.');
  return ty;
}
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
  return { ngay: ngay, tyGiaBan: Number(ds[0].TyGiaBan), tyGiaMua: Number(ds[0].TyGiaMua) > 0 ? Number(ds[0].TyGiaMua) : null, tyGiaBinhQuan: tyGiaBinhQuan_(ds[0].TyGiaMua, ds[0].TyGiaBan), nguon: String(ds[0].GhiChu || '').trim() || 'Nhập tay', ghiLuc: ds[0].ThoiDiemGhi ? ngayChoMau_(ds[0].ThoiDiemGhi) : '',
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
    // Chấp nhận: 25.800 (có dấu nghìn), 25800, hoặc có phần thập phân dạng chuẩn 25857.5 (giao diện gửi dấu chấm thập phân).
    var ty = chuanTyGiaNhap_(tt.tyGiaBan, 'Tỷ giá');
    var mua = null; // tỷ giá MUA (không bắt buộc); bình quân mua–bán tính ra khi hiển thị
    if (tt.tyGiaMua != null && String(tt.tyGiaMua).trim() !== '') {
      mua = chuanTyGiaNhap_(tt.tyGiaMua, 'Tỷ giá mua');
      if (mua > ty) throw new Error('Tỷ giá mua (' + mua + ') không được lớn hơn tỷ giá bán (' + ty + ').');
    }
    if (ngay > homNayVN_()) throw new Error('Ngày tỷ giá không được ở tương lai.');
    var ds = getSS_().getSheetByName(SHEET_TY_GIA_THU_CONG) ? sheetToObjects_(SHEET_TY_GIA_THU_CONG) : [];
    var daCo = ds.filter(function (r) { return ngayIsoCuaO_(r.Ngay) === ngay; })[0];
    // Dòng do hệ thống tự ghi (GOOGLEFINANCE) được thay bằng tỷ giá nhập tay. Dòng đã do người dùng nhập chỉ ghi đè khi có xác nhận (ghiDe): bản cũ luôn còn trong nhật ký thay đổi.
    var daNhapTay = !!daCo && String(daCo.NguoiGhi) !== 'TU_DONG';
    if (daNhapTay && tt.ghiDe !== true) throw new Error('[DA_CO_NHAP_TAY] Đã có tỷ giá ngày ' + ngay + ' do người dùng nhập (' + daCo.NguoiGhi + (daCo.ThoiDiemGhi ? ' lúc ' + ngayChoMau_(daCo.ThoiDiemGhi) : '') + ', bán ' + daCo.TyGiaBan + '). Không ghi trùng ngày nếu chưa xác nhận ghi đè.');
    var sh = ensureSheet_(getSS_(), SHEET_TY_GIA_THU_CONG, COT_TY_GIA_THU_CONG_);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var me = layDanhTinh_().email || emailNguoiDung_();
    if (daCo) {
      var vals = sh.getDataRange().getValues(), cNgay = headers.indexOf('Ngay');
      for (var i = 1; i < vals.length; i++) {
        if (ngayIsoCuaO_(vals[i][cNgay]) !== ngay) continue;
        var moi = { Ngay: ngay, TyGiaBan: ty, GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').trim()).substring(0, 200), NguoiGhi: me, ThoiDiemGhi: new Date(), TyGiaMua: mua === null ? '' : mua };
        sh.getRange(i + 1, 1, 1, headers.length).setValues([headers.map(function (h, j) { return moi[h] !== undefined ? moi[h] : vals[i][j]; })]);
        break;
      }
      ghiNhatKy_('TY_GIA', daNhapTay ? 'GHI_DE_TY_GIA_NHAP_TAY' : 'THAY_TY_GIA_TU_DONG_BANG_NHAP_TAY', ngay + ' | ' + daCo.TyGiaBan + ' -> ' + ty);
      ghiLichSuTyGia_({ ngay: ngay, mua: mua, ban: ty, hanhDong: daNhapTay ? 'GHI_DE_NHAP_TAY' : 'THAY_TU_DONG', nguon: tt.ghiChu, nguoi: me, banTruoc: Number(daCo.TyGiaBan), muaTruoc: daCo.TyGiaMua, nguoiTruoc: daCo.NguoiGhi });
      return { ngay: ngay, tyGiaBan: ty, tyGiaMua: mua, tyGiaBinhQuan: tyGiaBinhQuan_(mua, ty), thayTuDong: !daNhapTay, ghiDe: daNhapTay };
    }
    themDongVaoCuoiThat_(sh, headers.map(function (h) {
      return { Ngay: ngay, TyGiaBan: ty, GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').trim()).substring(0, 200), NguoiGhi: me, ThoiDiemGhi: new Date(), TyGiaMua: mua === null ? '' : mua }[h] ?? '';
    }));
    ghiNhatKy_('TY_GIA', 'GHI_TY_GIA', ngay + ' | bán ' + ty + (mua === null ? '' : ' | mua ' + mua));
    ghiLichSuTyGia_({ ngay: ngay, mua: mua, ban: ty, hanhDong: 'GHI_MOI', nguon: tt.ghiChu, nguoi: me });
    return { ngay: ngay, tyGiaBan: ty, tyGiaMua: mua, tyGiaBinhQuan: tyGiaBinhQuan_(mua, ty) };
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
