/**
 * LICHTRA.GS — LỊCH TRẢ NỢ THEO KỲ. Lãi tính theo DƯ NỢ GỐC THỰC TẾ (đổi ngày khi trả gốc),
 * quy ước ngày theo cấu hình (ACT/365 hoặc ACT/360). Chỉ đọc.
 *  • Kỳ trả lãi: KyHanTraLai (Hàng tháng/Hàng quý/Hàng năm/n tháng).
 *  • Kỳ trả gốc: KyHanTraGoc; "Cuối kỳ" = trả một lần khi đến hạn; ngược lại chia đều theo kỳ.
 *  • Phân bổ tiền đã trả theo thứ tự thời gian: trả đủ kỳ trước thì kỳ đó "Đã trả đủ".
 */
function parseKyThang_(text, macDinh) {
  var s = String(text || '').toLowerCase();
  if (/cuối\s*kỳ/.test(s)) return 0;
  if (/hàng\s*tháng/.test(s)) return 1;
  if (/hàng\s*quý/.test(s)) return 3;
  if (/hàng\s*năm/.test(s)) return 12;
  var m = s.match(/(\d+)\s*tháng/);
  if (m) return Number(m[1]);
  return macDinh;
}
/** Cộng n tháng vào ngày ISO, giữ ngày trong tháng (tối đa cuối tháng). */
function congThangIso_(iso, n) {
  var p = iso.split('-').map(Number), tong = p[0] * 12 + (p[1] - 1) + n;
  var y = Math.floor(tong / 12), m = tong - y * 12;
  var cuoiThang = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  var pad = function (x) { return String(x).padStart(2, '0'); };
  return y + '-' + pad(m + 1) + '-' + pad(Math.min(p[2], cuoiThang));
}
function lamTronTienKy_(x, loai) { return loai === 'USD' ? Math.round(x * 100) / 100 : Math.round(x); }
/** Các mốc kỳ từ ngày bắt đầu đến ngày đến hạn (mốc cuối luôn là ngày đến hạn). */
function mocKy_(ngayBatDau, ngayDenHan, soThang) {
  var moc = [ngayBatDau];
  for (var k = 1; k < 2000; k++) {
    var m = congThangIso_(ngayBatDau, k * soThang);
    if (m >= ngayDenHan) break;
    moc.push(m);
  }
  moc.push(ngayDenHan);
  return moc;
}

function layLichTraNo(maHoSo) {
  yeuCauDangNhap_();
  var h = layHoSoTheoMa_(maHoSo);
  if (!h) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  var tra = layTraCuuDanhMuc_(), hd = tra.hd[String(h.MaHD)] || {};
  var loai = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
  var goc = Number(h.SoTienNhanNoLanNay) || 0, ngayGN = ngayIsoCuaO_(h.NgayGiaiNgan), ngayDH = ngayIsoCuaO_(h.NgayDenHan);
  if (!ngayGN || !ngayDH || !(goc > 0)) throw new Error('Hồ sơ thiếu ngày giải ngân, ngày đến hạn hoặc số tiền.');
  if (ngayDH <= ngayGN) throw new Error('Ngày đến hạn phải sau ngày giải ngân.');
  var lsNam = Number(hd['LaiSuatTrongHan_%']) || 0;
  var kyLai = parseKyThang_(hd.KyHanTraLai, 1) || 1, kyGoc = parseKyThang_(hd.KyHanTraGoc, 0);
  var coSo = layCauHinh_('QUY_UOC_NGAY_LAI') === 'ACT/360' ? 360 : 365;
  var nhac = Number(layCauHinh_('NGAY_NHAC_TRUOC_HAN')) || 7, today = homNayVN_();
  var ds = docTraNo_().filter(function (r) { return String(r.MaHoSo) === String(maHoSo) && r.TrangThai === TRA_HIEU_LUC; });
  var gocTra = ds.filter(function (r) { return r.LoaiTra === TRA_GOC; }).map(function (r) { return { ngay: String(r.NgayTra).substring(0, 10), tien: Number(r.SoTien) || 0 }; });
  var laiTra = ds.filter(function (r) { return r.LoaiTra === TRA_LAI; }).map(function (r) { return { ngay: String(r.NgayTra).substring(0, 10), tien: Number(r.SoTien) || 0 }; });

  function trangThaiKy_(conNo, denNgay) {
    if (conNo <= 0.005) return 'DA_TRA_DU';
    if (denNgay < today) return 'QUA_HAN';
    return soNgayGiuaIso_(today, denNgay) <= nhac ? 'SAP_DEN_HAN' : 'CHUA_DEN_HAN';
  }
  function duNoTaiNgay_(t) {
    var da = gocTra.filter(function (p) { return p.ngay <= t; }).reduce(function (a, p) { return a + p.tien; }, 0);
    return Math.max(0, goc - da);
  }
  function laiTrongKy_(s, e) {
    var cuts = [s];
    gocTra.forEach(function (p) { if (p.ngay > s && p.ngay < e && cuts.indexOf(p.ngay) < 0) cuts.push(p.ngay); });
    cuts.push(e); cuts.sort();
    var lai = 0;
    for (var i = 0; i < cuts.length - 1; i++) {
      var days = soNgayGiuaIso_(cuts[i], cuts[i + 1]);
      if (days > 0) lai += duNoTaiNgay_(cuts[i]) * lsNam / 100 * days / coSo;
    }
    return lai;
  }
  // Lịch lãi
  var mocLai = mocKy_(ngayGN, ngayDH, kyLai), laiRows = [], cumDue = 0, cumPaidBefore = 0;
  for (var k = 0; k < mocLai.length - 1; k++) {
    var s = mocLai[k], e = mocLai[k + 1];
    var phaiTra = lamTronTienKy_(laiTrongKy_(s, e), loai);
    cumDue += phaiTra;
    var daTraDenE = laiTra.filter(function (p) { return p.ngay <= e; }).reduce(function (a, p) { return a + p.tien; }, 0);
    var daTra = Math.min(phaiTra, Math.max(0, daTraDenE - (cumDue - phaiTra)));
    laiRows.push({ ky: k + 1, tuNgay: s, denNgay: e, soNgay: soNgayGiuaIso_(s, e), duNoDauKy: duNoTaiNgay_(s),
      laiPhaiTra: phaiTra, laiDaTra: lamTronTienKy_(daTra, loai), conNo: lamTronTienKy_(phaiTra - daTra, loai), trangThai: trangThaiKy_(phaiTra - daTra, e) });
  }
  // Lịch gốc
  var mocGoc = kyGoc === 0 ? [ngayDH] : mocKy_(ngayGN, ngayDH, kyGoc).slice(1);
  var n = mocGoc.length, gocRows = [], cumGocDue = 0;
  for (var j = 0; j < n; j++) {
    var tien = j < n - 1 ? lamTronTienKy_(goc / n, loai) : lamTronTienKy_(goc - cumGocDue, loai);
    cumGocDue += tien;
    var paidE = gocTra.filter(function (p) { return p.ngay <= mocGoc[j]; }).reduce(function (a, p) { return a + p.tien; }, 0);
    var daTraG = Math.min(tien, Math.max(0, paidE - (cumGocDue - tien)));
    gocRows.push({ ky: j + 1, ngayDen: mocGoc[j], gocPhaiTra: tien, gocDaTra: lamTronTienKy_(daTraG, loai),
      conNo: lamTronTienKy_(tien - daTraG, loai), trangThai: trangThaiKy_(tien - daTraG, mocGoc[j]) });
  }
  var sum = function (arr, f) { return arr.reduce(function (a, x) { return a + (Number(x[f]) || 0); }, 0); };
  return { maHoSo: String(maHoSo), loaiTien: loai, goc: goc, laiSuatNam: lsNam, coSoNgay: coSo, kyLaiThang: kyLai, kyGocThang: kyGoc,
    ngayNhacTruocHan: nhac, ngayTinh: today, duNoGocHienTai: duNoTaiNgay_(today), laiRows: laiRows, gocRows: gocRows,
    tong: { laiPhaiTra: lamTronTienKy_(sum(laiRows, 'laiPhaiTra'), loai), laiDaTra: lamTronTienKy_(sum(laiRows, 'laiDaTra'), loai),
      gocPhaiTra: lamTronTienKy_(sum(gocRows, 'gocPhaiTra'), loai), gocDaTra: lamTronTienKy_(sum(gocRows, 'gocDaTra'), loai) } };
}
