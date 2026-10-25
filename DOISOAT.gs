/**
 * DOISOAT.GS — BÁO CÁO ĐỐI SOÁT: tổng hợp theo trạng thái × loại tiền và các phép kiểm tra toàn vẹn (chỉ đọc, không sửa dữ liệu).
 * QUY TẮC: VND và USD KHÔNG bao giờ được cộng lẫn vào một tổng; "quy đổi VND" của hồ sơ USD hiển thị riêng. Hồ sơ Nháp / Đã tạo hồ sơ /
 * Đã giải ngân / Đã hủy được tách riêng; hồ sơ xoá mềm chỉ đếm riêng và không nằm trong tổng.
 */
function layBaoCaoDoiSoat() {
  yeuCauDangNhap_();
  return phongBi_('layBaoCaoDoiSoat', function (meta) { return tinhDoiSoat_(); });
}

/** Đối soát: nạp MỘT lần các sheet dùng chung (hợp đồng, công ty, chi tiết, lịch sử phát hành) thay vì đọc lại cho từng hồ sơ (tránh O(N²) lần đọc Sheet). */
function tinhDoiSoat_() {
  var dangBat = _lichSuBat_; batCacheLichSu_();
  try { return tinhDoiSoatCore_(); } finally { if (!dangBat) xoaCacheLichSu_(); }
}

function tinhDoiSoatCore_() {
  var tatCa = docDanhSachHoSo_(true), hoSo = tatCa.filter(function (h) { return !laDaXoa_(h.DaXoa); });
  var daXoa = tatCa.length - hoSo.length;
  var chiTiet = sheetToObjects_(SHEET_CHITIET), hopDong = sheetToObjects_(SHEET_HOPDONG), congTyDs = sheetToObjects_(SHEET_CONGTY), hdTheoMa = {}, ctyTheoMa = {}, chiTietTheoHs = {};
  hopDong.forEach(function (h) { if (hdTheoMa[String(h.MaHD)] === undefined) hdTheoMa[String(h.MaHD)] = h; });
  congTyDs.forEach(function (c) { if (ctyTheoMa[String(c.MaCty)] === undefined) ctyTheoMa[String(c.MaCty)] = c; });
  chiTiet.forEach(function (c) { (chiTietTheoHs[String(c.MaHoSo)] = chiTietTheoHs[String(c.MaHoSo)] || []).push(c); });
  var tongCT = {}, soCT = {}, maCoHoSo = {}, maHDCo = {};
  tatCa.forEach(function (h) { maCoHoSo[String(h.MaHoSo)] = true; });
  hopDong.forEach(function (h) { maHDCo[String(h.MaHD)] = true; });
  chiTiet.forEach(function (c) { var k = String(c.MaHoSo); tongCT[k] = congSoTien_(tongCT[k], c.SoTien); soCT[k] = (soCT[k] || 0) + 1; });

  // 1) Tổng hợp theo trạng thái × loại tiền
  var nhom = {}, TT = [TT_NHAP, TT_DA_TAO, TT_DA_GIAI_NGAN, TT_DA_HUY];
  hoSo.forEach(function (h) {
    var tt = h.TrangThai || TT_NHAP, lt = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND', k = tt + '|' + lt;
    var g = nhom[k] || (nhom[k] = { trangThai: tt, loaiTien: lt, soHoSo: 0, tong: 0, tongQuyDoiVND: 0 });
    g.soHoSo++; g.tong = congSoTien_(g.tong, h.SoTienNhanNoLanNay);
    if (lt === 'USD') { var qd = 0; (chiTietTheoHs[String(h.MaHoSo)] || []).forEach(function (c) { qd += Number(c.SoTienQuyDoi) || 0; }); g.tongQuyDoiVND += qd; }
  });
  var tongHop = [];
  TT.forEach(function (tt) { ['VND', 'USD'].forEach(function (lt) { if (nhom[tt + '|' + lt]) tongHop.push(nhom[tt + '|' + lt]); }); });

  // 2) Kiểm tra toàn vẹn
  var kt = [];
  function them(ma, ten, ds, loai) { kt.push({ ma: ma, ten: ten, loai: loai || 'LOI', soLoi: ds.length, chiTiet: ds.slice(0, 50) }); }
  var c1 = [], c3 = [], c6 = [], c7 = [];
  hoSo.forEach(function (h) {
    var k = String(h.MaHoSo), tong = Number(h.SoTienNhanNoLanNay) || 0;
    if (!soCT[k]) c3.push(k + ': chưa có dòng thụ hưởng');
    else if (Number(h.PhienBanTien) === 2) { var v2 = kiemTraTienChaCon_(payloadTienChaConDaLuu_(h, chiTietTheoHs[k] || []), false); if (!v2.doiSoatKhop) c1.push(k + ': ' + v2.canhBao.join('; ')); }
    else if (tongCT[k] !== tong) c1.push(k + ': tổng hồ sơ ' + tong + ' ≠ tổng chi tiết ' + tongCT[k]);
    if (h.MaHD && !maHDCo[String(h.MaHD)]) c6.push(k + ': hợp đồng ' + h.MaHD + ' không tồn tại');
    if (phatHienTienLe_(h, chiTietTheoHs[k] || []).length) c7.push(k + ': có số tiền lẻ (lịch sử)');
  });
  var c2 = [];
  Object.keys(soCT).forEach(function (k) { if (!maCoHoSo[k]) c2.push(k + ': ' + soCT[k] + ' dòng chi tiết không có hồ sơ cha'); });
  them('TONG_KHOP', 'Tổng hồ sơ = tổng chi tiết thụ hưởng', c1);
  them('CHI_TIET_MO_COI', 'Chi tiết không có hồ sơ cha', c2);
  them('HO_SO_THIEU_CHI_TIET', 'Hồ sơ chưa có dòng thụ hưởng', c3);
  them('HOP_DONG_THIEU', 'Hồ sơ trỏ tới hợp đồng không tồn tại', c6);
  them('TIEN_LE', 'Hồ sơ giữ số tiền có phần thập phân (cần rà soát)', c7);

  // 3) Hồ sơ đã giải ngân phải còn đủ điều kiện (chứng từ hiện hành khớp dữ liệu) — tối đa 100 hồ sơ để không quá chậm
  var c4 = [], daKiem = 0, bo = 0;
  hoSo.forEach(function (h) {
    if (h.TrangThai !== TT_DA_GIAI_NGAN) return;
    if (daKiem >= 100) { bo++; return; }
    daKiem++;
    var hdh = hdTheoMa[String(h.MaHD)], cth = hdh ? ctyTheoMa[String(hdh.MaCty)] : null, dSan = null;
    if (hdh && cth) dSan = { hoSo: chuyenDoiDateThanhChuoi_(h), hopDong: chuyenDoiDateThanhChuoi_(hdh), congTy: chuyenDoiDateThanhChuoi_(cth), chiTiet: chuyenDoiDateThanhChuoi_(chiTietTheoHs[String(h.MaHoSo)] || []) };
    var r = dSan ? kiemTraDuDieuKienGiaiNgan_(h.MaHoSo, dSan) : { loi: [hdh ? 'Không tìm thấy công ty vay: ' + hdh.MaCty : 'Không tìm thấy hợp đồng vay: ' + h.MaHD] };
    if (r.loi.length) c4.push(h.MaHoSo + ': ' + r.loi.join(' | '));
  });
  them('GIAI_NGAN_THIEU_CHUNG_TU', 'Hồ sơ "Đã giải ngân" nhưng chứng từ thiếu/cũ so với dữ liệu' + (bo ? ' (mới kiểm ' + daKiem + ', bỏ ' + bo + ')' : ''), c4);

  // 4) Ghi dở dang chưa phục hồi
  var c5 = [];
  try { sheetToObjects_(SHEET_GHI_DO_DANG).forEach(function (r) { if (r.TrangThai === 'DANG_GHI') c5.push(r.MaHoSo + ': lần ghi ' + r.IdGhi + ' chưa hoàn tất'); }); } catch (e) { /* chưa có tab = chưa từng ghi dở */ }
  them('GHI_DO_DANG', 'Lần ghi hồ sơ dở dang chưa phục hồi', c5);

  // 5) Khớp với xác nhận giải ngân thực tế của ngân hàng, chứng từ, ngày, tham chiếu
  var xn = []; try { xn = docXacNhanGN_(); } catch (e) { xn = []; }
  var hlXn = xn.filter(function (r) { return r.TrangThai === XN_HIEU_LUC; }), c16 = [], c8 = [], c9 = [], c10 = [], c11 = [], c12 = [], c13 = [], c14 = [], c15 = [];
  var ngayThucHS = {}; hlXn.forEach(function (r) { if (r.LoaiBanGhi !== XN_LOAI_XAC_NHAN) return; var d = ngayIsoCuaO_(r.NgayThucTe), kk = String(r.MaHoSo); if (d && (!ngayThucHS[kk] || d < ngayThucHS[kk])) ngayThucHS[kk] = d; });
  var xnTheoHs = {}; hlXn.forEach(function (r) { (xnTheoHs[String(r.MaHoSo)] = xnTheoHs[String(r.MaHoSo)] || []).push(r); });
  var demThamChieu = {};
  hlXn.forEach(function (r) { var k = String(r.SoThamChieuNH).trim().toLowerCase(); (demThamChieu[k] = demThamChieu[k] || []).push(r.MaHoSo); });
  Object.keys(demThamChieu).forEach(function (k) { if (demThamChieu[k].length > 1) c10.push('Số tham chiếu "' + k + '" dùng ở: ' + demThamChieu[k].join(', ')); });
  var kiemBo = 0;
  hoSo.forEach(function (h) {
    var k = String(h.MaHoSo), rows = xnTheoHs[k] || [], goc = rows.filter(function (r) { return r.LoaiBanGhi === XN_LOAI_XAC_NHAN; }), dc = rows.filter(function (r) { return r.LoaiBanGhi !== XN_LOAI_XAC_NHAN; });
    if (h.TrangThai === TT_DA_TAO) c8.push(k + ': đã tạo hồ sơ, chưa có xác nhận giải ngân');
    if (h.TrangThai === TT_DA_GIAI_NGAN && !goc.length) c9.push(k + ': "Đã giải ngân" nhưng KHÔNG có xác nhận giải ngân thực tế hiệu lực');
    if (h.TrangThai !== TT_DA_GIAI_NGAN && goc.length) c9.push(k + ': có xác nhận giải ngân hiệu lực nhưng trạng thái hồ sơ là "' + h.TrangThai + '"');
    if (h.TrangThai === TT_DA_GIAI_NGAN && goc.length) {
      var rong = tongThucTeNguyenTe_(rows);
      if (!dc.length && rong !== (Number(h.SoTienNhanNoLanNay) || 0)) c11.push(k + ': thực giải ngân ' + rong + ' ≠ tổng hồ sơ ' + h.SoTienNhanNoLanNay);
      if (dc.length) c15.push(k + ': có ' + dc.length + ' ghi nhận hoàn trả/điều chỉnh (ròng thực tế ' + rong + ')');
    }
    if ((h.TrangThai === TT_DA_TAO || h.TrangThai === TT_DA_GIAI_NGAN) && kiemBo < 100) {
      kiemBo++;
      try { var hdb = hdTheoMa[String(h.MaHD)], ctb = hdb ? ctyTheoMa[String(hdb.MaCty)] : null; var bo = tinhTrangThaiBo_(k, (hdb && ctb) ? { hoSo: chuyenDoiDateThanhChuoi_(h), hopDong: chuyenDoiDateThanhChuoi_(hdb), congTy: chuyenDoiDateThanhChuoi_(ctb), chiTiet: chuyenDoiDateThanhChuoi_(chiTietTheoHs[k] || []) } : null); if (bo.hetHieuLuc.length) c12.push(k + ': chứng từ hết hiệu lực do hồ sơ thay đổi — ' + bo.hetHieuLuc.map(nhanChungTu_).join(', ')); } catch (eB) { c12.push(k + ': không kiểm được bộ chứng từ (' + eB.message + ')'); }
    }
    ['NgayGiaiNgan', 'NgayDenHan', 'NgayGiayNhanNo'].forEach(function (c) {
      var v = h[c]; if (v === '' || v === null || v === undefined) return;
      if (v instanceof Date ? isNaN(v.getTime()) : !tachNgay_(v)) c13.push(k + ': ' + c + ' không hợp lệ ("' + v + '")');
    });
    if ((h.TrangThai === TT_DA_TAO || h.TrangThai === TT_DA_GIAI_NGAN) && (!h.NgayGiaiNgan || (h.NgayGiaiNgan instanceof Date ? isNaN(h.NgayGiaiNgan.getTime()) : !tachNgay_(h.NgayGiaiNgan)))) c13.push(k + ': thiếu Ngày giải ngân kế hoạch');
    if (h.TrangThai === TT_DA_GIAI_NGAN && ngayThucHS[k] && ngayIsoCuaO_(h.NgayGiaiNgan) && ngayThucHS[k] !== ngayIsoCuaO_(h.NgayGiaiNgan)) c16.push(k + ': ngày trên hồ sơ ' + ngayIsoCuaO_(h.NgayGiaiNgan) + ', ngày thực giải ngân ' + ngayThucHS[k]);
    if (h.TrangThai === TT_DA_HUY) c14.push(k + ': giao dịch đã hủy' + (xn.filter(function (r) { return String(r.MaHoSo) === k && r.TrangThai === XN_HUY_BO; }).length ? ' (có xác nhận bị hủy bỏ)' : ''));
  });
  them('HO_SO_DA_TAO_CHUA_GIAI_NGAN', 'Hồ sơ đã tạo nhưng chưa giải ngân (thông tin theo dõi)', c8, 'THONG_TIN');
  them('TRANG_THAI_KHONG_KHOP_XAC_NHAN', 'Trạng thái hồ sơ không khớp xác nhận giải ngân thực tế', c9);
  them('SO_THAM_CHIEU_TRUNG', 'Số tham chiếu giao dịch ngân hàng bị trùng', c10);
  them('TONG_XAC_NHAN_LECH', 'Số tiền thực giải ngân lệch tổng hồ sơ (chưa có điều chỉnh)', c11);
  them('CHUNG_TU_HET_HIEU_LUC', 'Hồ sơ có chứng từ hết hiệu lực do hồ sơ thay đổi' + (kiemBo >= 100 ? ' (kiểm tối đa 100 hồ sơ)' : ''), c12);
  them('NGAY_KHONG_HOP_LE', 'Ngày thiếu / không hợp lệ', c13);
  them('NGAY_GIAI_NGAN_LECH', 'Ngày giải ngân trên hồ sơ khác ngày thực giải ngân theo xác nhận ngân hàng (báo cáo dư nợ dùng ngày thực; báo cáo lãi/lịch trả vẫn theo ngày hồ sơ — nên chỉnh cho khớp)', c16, 'THONG_TIN');
  them('GIAO_DICH_DA_HUY', 'Giao dịch đã hủy (thông tin)', c14, 'THONG_TIN');
  them('CO_DIEU_CHINH', 'Hồ sơ có hoàn trả/điều chỉnh sau giải ngân (thông tin)', c15, 'THONG_TIN');

  var tongLoi = kt.reduce(function (a, x) { return a + (x.loai === 'THONG_TIN' ? 0 : x.soLoi); }, 0);
  return { thoiDiem: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), soHoSo: hoSo.length, soHoSoXoaMem: daXoa, tongHop: tongHop, kiemTra: kt, tongSoLoi: tongLoi };
}

function chiTietCuaHoSo_(chiTiet, maHoSo) {
  return chiTiet.filter(function (c) { return String(c.MaHoSo) === String(maHoSo); });
}

/** Danh sách hồ sơ đã xoá mềm (phục vụ kiểm toán + khôi phục). Chỉ quản trị. */
function layDanhSachHoSoXoaMem() {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem hồ sơ đã xoá mềm');
  var ls = []; try { ls = sheetToObjects_(SHEET_LICH_SU_PHAT_HANH); } catch (e) { ls = []; }
  return docDanhSachHoSo_(true).filter(function (h) { return laDaXoa_(h.DaXoa); }).map(function (h) {
    return { maHoSo: h.MaHoSo, trangThai: h.TrangThai, soTien: Number(h.SoTienNhanNoLanNay) || 0, loaiTien: h.LoaiTien, revision: soRevision_(h), nguoiXoa: h.NguoiXoa, ngayXoa: ngayChoMau_(h.NgayXoa), lyDo: h.LyDoXoa,
      soChungTuGiuLai: ls.filter(function (r) { return String(r.MaHoSo) === String(h.MaHoSo) && r.TrangThai !== TT_PH_LOI; }).length };
  });
}
