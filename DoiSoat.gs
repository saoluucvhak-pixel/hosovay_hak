/**
 * DOISOAT.GS — BÁO CÁO ĐỐI SOÁT: tổng hợp theo trạng thái × loại tiền và các phép kiểm tra toàn vẹn (chỉ đọc, không sửa dữ liệu).
 * QUY TẮC: VND và USD KHÔNG bao giờ được cộng lẫn vào một tổng; "quy đổi VND" của hồ sơ USD hiển thị riêng. Hồ sơ Nháp / Đã tạo hồ sơ /
 * Đã giải ngân / Đã hủy được tách riêng; hồ sơ xoá mềm chỉ đếm riêng và không nằm trong tổng.
 */
function layBaoCaoDoiSoat() {
  yeuCauDangNhap_();
  return phongBi_('layBaoCaoDoiSoat', function (meta) { return tinhDoiSoat_(); });
}

function tinhDoiSoat_() {
  var tatCa = docDanhSachHoSo_(true), hoSo = tatCa.filter(function (h) { return !laDaXoa_(h.DaXoa); });
  var daXoa = tatCa.length - hoSo.length;
  var chiTiet = sheetToObjects_(SHEET_CHITIET), hopDong = sheetToObjects_(SHEET_HOPDONG);
  var tongCT = {}, soCT = {}, maCoHoSo = {}, maHDCo = {};
  tatCa.forEach(function (h) { maCoHoSo[String(h.MaHoSo)] = true; });
  hopDong.forEach(function (h) { maHDCo[String(h.MaHD)] = true; });
  chiTiet.forEach(function (c) { var k = String(c.MaHoSo); tongCT[k] = (tongCT[k] || 0) + (Number(c.SoTien) || 0); soCT[k] = (soCT[k] || 0) + 1; });

  // 1) Tổng hợp theo trạng thái × loại tiền
  var nhom = {}, TT = [TT_NHAP, TT_DA_TAO, TT_DA_GIAI_NGAN, TT_DA_HUY];
  hoSo.forEach(function (h) {
    var tt = h.TrangThai || TT_NHAP, lt = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND', k = tt + '|' + lt;
    var g = nhom[k] || (nhom[k] = { trangThai: tt, loaiTien: lt, soHoSo: 0, tong: 0, tongQuyDoiVND: 0 });
    g.soHoSo++; g.tong += Number(h.SoTienNhanNoLanNay) || 0;
    if (lt === 'USD') { var qd = 0; chiTietCuaHoSo_(chiTiet, h.MaHoSo).forEach(function (c) { qd += Number(c.SoTienQuyDoi) || 0; }); g.tongQuyDoiVND += qd; }
  });
  var tongHop = [];
  TT.forEach(function (tt) { ['VND', 'USD'].forEach(function (lt) { if (nhom[tt + '|' + lt]) tongHop.push(nhom[tt + '|' + lt]); }); });

  // 2) Kiểm tra toàn vẹn
  var kt = [];
  function them(ma, ten, ds) { kt.push({ ma: ma, ten: ten, soLoi: ds.length, chiTiet: ds.slice(0, 50) }); }
  var c1 = [], c3 = [], c6 = [], c7 = [];
  hoSo.forEach(function (h) {
    var k = String(h.MaHoSo), tong = Number(h.SoTienNhanNoLanNay) || 0;
    if (!soCT[k]) c3.push(k + ': chưa có dòng thụ hưởng');
    else if (tongCT[k] !== tong) c1.push(k + ': tổng hồ sơ ' + tong + ' ≠ tổng chi tiết ' + tongCT[k]);
    if (h.MaHD && !maHDCo[String(h.MaHD)]) c6.push(k + ': hợp đồng ' + h.MaHD + ' không tồn tại');
    if (phatHienTienLe_(h, chiTietCuaHoSo_(chiTiet, k)).length) c7.push(k + ': có số tiền lẻ (lịch sử)');
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
    var r = kiemTraDuDieuKienGiaiNgan_(h.MaHoSo);
    if (r.loi.length) c4.push(h.MaHoSo + ': ' + r.loi.join(' | '));
  });
  them('GIAI_NGAN_THIEU_CHUNG_TU', 'Hồ sơ "Đã giải ngân" nhưng chứng từ thiếu/cũ so với dữ liệu' + (bo ? ' (mới kiểm ' + daKiem + ', bỏ ' + bo + ')' : ''), c4);

  // 4) Ghi dở dang chưa phục hồi
  var c5 = [];
  try { sheetToObjects_(SHEET_GHI_DO_DANG).forEach(function (r) { if (r.TrangThai === 'DANG_GHI') c5.push(r.MaHoSo + ': lần ghi ' + r.IdGhi + ' chưa hoàn tất'); }); } catch (e) { /* chưa có tab = chưa từng ghi dở */ }
  them('GHI_DO_DANG', 'Lần ghi hồ sơ dở dang chưa phục hồi', c5);

  var tongLoi = kt.reduce(function (a, x) { return a + x.soLoi; }, 0);
  return { thoiDiem: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), soHoSo: hoSo.length, soHoSoXoaMem: daXoa, tongHop: tongHop, kiemTra: kt, tongSoLoi: tongLoi };
}

function chiTietCuaHoSo_(chiTiet, maHoSo) {
  return chiTiet.filter(function (c) { return String(c.MaHoSo) === String(maHoSo); });
}
