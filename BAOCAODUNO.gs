/**
 * BÁO CÁO DƯ NỢ GỐC THEO KỲ / TẠI NGÀY (chỉ đọc). Một khoản = hồ sơ "Đã giải ngân" (chưa xoá, trong phạm vi công ty); hồ sơ Nháp / Đã tạo hồ sơ / Đã hủy KHÔNG phải dư nợ.
 *   Dư nợ cuối ngày D = gốc giải ngân (nếu ngày giải ngân ≤ D) − tổng gốc đã trả có ngày trả ≤ D (chỉ lần trả còn hiệu lực); khoản đã tất toán từ ngày tất toán trở đi = 0.
 *   Kỳ [tuNgay, denNgay] (gồm cả hai đầu): dư nợ đầu kỳ (cuối ngày tuNgay−1) + phát sinh TĂNG (giải ngân trong kỳ) − phát sinh GIẢM (trả gốc trong kỳ + gốc còn lại bị đóng khi tất toán ngoài hệ thống) = dư nợ cuối kỳ.
 *   "Tại ngày D" = kỳ có denNgay = D: không bị giao dịch ghi sau ngày D làm đổi (trừ khi giao dịch đó mang ngày ≤ D). Số tiền theo nguyên tệ; USD tròn cent; quy đổi VND dùng tỷ giá bán của hồ sơ lúc giải ngân (cùng quy tắc Hạn mức).
 *   Lưu ý: ngày giải ngân là ngày trên hồ sơ (không phải ngày thực tế của xác nhận ngân hàng); trả nợ bị hủy sau đó không còn được tính ở mọi kỳ (lịch sử vẫn nằm trong sổ trả nợ).
 */
var BC_DU_NO_SO_DONG_TOI_DA_ = 2000;
function layBaoCaoDuNoTheoKy(tuyChon) {
  yeuCauDangNhap_();
  var o = tuyChon || {}, today = homNayVN_();
  var den = o.denNgay ? ngayChuanISO_(o.denNgay, 'Đến ngày', false) : today, tu = o.tuNgay ? ngayChuanISO_(o.tuNgay, 'Từ ngày', false) : den.slice(0, 7) + '-01';
  if (den < tu) throw new Error('Đến ngày (' + den + ') không được trước Từ ngày (' + tu + ').');
  var loaiLoc = String(o.loaiTien || '').toUpperCase(); if (loaiLoc && loaiLoc !== 'VND' && loaiLoc !== 'USD') throw new Error('Loại tiền không hợp lệ (chỉ VND hoặc USD).');
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), goc = {}, ngayThuc = ngayThucGiaiNganTheoHoSo_(), soLech = 0;
  docTraNo_().forEach(function (r) { if (r.LoaiTra !== TRA_GOC || r.TrangThai !== TRA_HIEU_LUC) return; (goc[String(r.MaHoSo)] = goc[String(r.MaHoSo)] || []).push({ ngay: ngayIsoCuaO_(r.NgayTra), tien: Number(r.SoTien) || 0 }); });
  var dauNgay = bhCongNgay_(tu, -1), rows = [], tong = {}, thieu = 0;
  var tru = function (a, b) { return congSoTien_(a, -b); };
  khoanVayTrongPhamVi_(docDanhSachHoSo_(false), tra, pv).forEach(function (h) {
    var loai = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND'; if (loaiLoc && loai !== loaiLoc) return;
    var k = String(h.MaHoSo), g = Number(h.SoTienNhanNoLanNay) || 0, gnHoSo = ngayIsoCuaO_(h.NgayGiaiNganHoSo || h.NgayGiaiNgan), gn = ngayThuc[k] || gnHoSo, lech = !!(ngayThuc[k] && gnHoSo && ngayThuc[k] !== gnHoSo), tt = daTatToanHoSo_(h) ? ngayIsoCuaO_(h.NgayTatToan) : '', ds = goc[k] || [];
    if (!gn || !(g > 0)) return;
    var daTraDen = function (d) { var s = 0; ds.forEach(function (p) { if (p.ngay <= d) s = congSoTien_(s, p.tien); }); return s; };
    var duNo = function (d) { if (gn > d || (tt && tt <= d)) return 0; return Math.max(0, tru(g, daTraDen(d))); };
    var dau = duNo(dauNgay), cuoi = duNo(den), tang = gn >= tu && gn <= den ? g : 0, giamTra = 0, giamTT = 0;
    if (gn <= den) {
      var cuoiTra = tt && tt <= den ? tt : den; ds.forEach(function (p) { if (p.ngay >= tu && p.ngay <= cuoiTra) giamTra = congSoTien_(giamTra, p.tien); });
      if (tt && tt >= tu && tt <= den) giamTT = Math.max(0, tru(g, daTraDen(tt)));
    }
    if (!dau && !tang && !giamTra && !giamTT && !cuoi) return;
    var hd = tra.hd[String(h.MaHD)] || {}, ct = tra.cty[String(hd.MaCty)] || {}, qd = duNoQuyVND_(h, cuoi);
    if (lech) soLech++;
    var t = tong[loai] || (tong[loai] = { soKhoan: 0, dauKy: 0, tang: 0, giamTra: 0, giamTatToan: 0, cuoiKy: 0, cuoiKyQuyDoiVND: 0, soKhoanThieuTyGia: 0 });
    t.soKhoan++; t.dauKy = congSoTien_(t.dauKy, dau); t.tang = congSoTien_(t.tang, tang); t.giamTra = congSoTien_(t.giamTra, giamTra); t.giamTatToan = congSoTien_(t.giamTatToan, giamTT); t.cuoiKy = congSoTien_(t.cuoiKy, cuoi);
    if (qd.thieuTyGia) { t.soKhoanThieuTyGia++; thieu++; } else t.cuoiKyQuyDoiVND = congSoTien_(t.cuoiKyQuyDoiVND, qd.vnd);
    rows.push({ maHoSo: k, soGiayNhanNo: h.SoGiayNhanNo || '', soHopDong: hd.SoHopDong || '', tenCty: ct.TenCty || '', loaiTien: loai, ngayGiaiNgan: gn, ngayGiaiNganHoSo: gnHoSo, lechNgay: lech, ngayTatToan: tt, dauKy: dau, tang: tang, giamTra: giamTra, giamTatToan: giamTT, cuoiKy: cuoi,
      tyGiaBan: loai === 'USD' ? Number(h.TyGiaBan) || 0 : '', cuoiKyQuyDoiVND: qd.thieuTyGia ? '' : qd.vnd, thieuTyGia: qd.thieuTyGia });
  });
  rows.sort(function (a, b) { return a.maHoSo.localeCompare(b.maHoSo); });
  var quyDoi = Object.keys(tong).reduce(function (a, l) { return congSoTien_(a, tong[l].cuoiKyQuyDoiVND); }, 0);
  return { tuNgay: tu, denNgay: den, loaiTien: loaiLoc, tong: tong, quyDoiVNDTong: quyDoi, soKhoanThieuTyGia: thieu, soKhoanLechNgay: soLech, tongSoKhoan: rows.length, biCat: rows.length > BC_DU_NO_SO_DONG_TOI_DA_, rows: rows.slice(0, BC_DU_NO_SO_DONG_TOI_DA_),
    ghiChu: 'Dư nợ GỐC theo nguyên tệ; đầu kỳ + tăng (giải ngân) − giảm (trả gốc, tất toán ngoài hệ thống) = cuối kỳ. Ngày giải ngân tính theo xác nhận ngân hàng (nếu có), không theo ngày kế hoạch trên hồ sơ. Hồ sơ chưa giải ngân thực tế hoặc đã hủy không tính. Quy đổi VND theo tỷ giá bán của hồ sơ lúc giải ngân.' };
}
/** Xuất báo cáo dư nợ theo kỳ ra Excel/PDF: cùng số liệu với màn hình (không tính lại theo cách khác). */
function xuatBaoCaoDuNo(tuyChon) {
  yeuCauDangNhap_(); tuyChon = tuyChon || {};
  var bc = layBaoCaoDuNoTheoKy(tuyChon), dd = tuyChon.dinhDang || 'xlsx';
  if (bc.biCat) throw new Error('Có ' + bc.tongSoKhoan + ' khoản (> ' + BC_DU_NO_SO_DONG_TOI_DA_ + '): thu hẹp theo loại tiền hoặc khoảng ngày rồi xuất lại.');
  var tong = [['Loại tiền', 'Số khoản', 'Dư nợ đầu kỳ', 'Phát sinh tăng (giải ngân)', 'Giảm: trả gốc', 'Giảm: tất toán ngoài hệ thống', 'Dư nợ cuối kỳ', 'Quy đổi VND (cuối kỳ)']];
  Object.keys(bc.tong).sort().forEach(function (l) { var t = bc.tong[l]; tong.push([l, t.soKhoan, t.dauKy, t.tang, t.giamTra, t.giamTatToan, t.cuoiKy, t.cuoiKyQuyDoiVND]); });
  tong.push([], ['Từ ngày', bc.tuNgay], ['Đến ngày', bc.denNgay], ['Loại tiền lọc', bc.loaiTien || 'Tất cả'], ['Tổng quy đổi VND (cuối kỳ)', bc.quyDoiVNDTong]);
  var ct = [['Mã hồ sơ', 'Số giấy nhận nợ', 'Số hợp đồng', 'Công ty', 'Loại tiền', 'Ngày giải ngân', 'Ngày tất toán', 'Dư nợ đầu kỳ', 'Phát sinh tăng (giải ngân)', 'Giảm: trả gốc', 'Giảm: tất toán ngoài hệ thống', 'Dư nợ cuối kỳ', 'Tỷ giá bán', 'Quy đổi VND (cuối kỳ)']]
    .concat(bc.rows.map(function (r) { return [r.maHoSo, r.soGiayNhanNo, r.soHopDong, r.tenCty, r.loaiTien, r.ngayGiaiNgan, r.ngayTatToan, r.dauKy, r.tang, r.giamTra, r.giamTatToan, r.cuoiKy, r.tyGiaBan, r.cuoiKyQuyDoiVND]; }));
  return xuatBangRaFile_('DuNo_' + bc.tuNgay + '_' + bc.denNgay, [{ ten: 'Tổng hợp theo loại tiền', dong: tong }, { ten: 'Chi tiết theo khoản', dong: ct }], dd);
}
