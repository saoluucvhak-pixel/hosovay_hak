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
/** Dư nợ gốc còn lại tại cuối ngày t sau các lần trả gốc có ngày ≤ t — cộng/trừ THẬP PHÂN CHÍNH XÁC (USD tròn cent, không dính sai số nhị phân như 7500.299999999999). gocTra = [{ngay, tien}]. */
function duNoGocTaiNgay_(goc, gocTra, t) {
  var da = 0; (gocTra || []).forEach(function (p) { if (p.ngay <= t) da = congSoTien_(da, p.tien); });
  return Math.max(0, congSoTien_(Number(goc) || 0, -da));
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

/** Phân bổ tiền đã trả (chỉ tính khoản có ngày không sau hôm nay) lần lượt cho từng kỳ theo thứ tự.
 * dues: [{den, so}] theo thứ tự kỳ; pays: [{ngay, tien}]. Trả về [{daTra, ngayHoanTat}] (ngayHoanTat = ngày trả đủ kỳ, null nếu chưa đủ). */
function phanBoTienTraTheoKy_(dues, pays, homNay) {
  var ps = pays.filter(function (p) { return p.ngay <= homNay && p.tien > 0; })
    .sort(function (a, b) { return a.ngay < b.ngay ? -1 : (a.ngay > b.ngay ? 1 : 0); });
  var i = 0, conTrong = ps.length ? ps[0].tien : 0;
  return dues.map(function (d) {
    var can = d.so, daTra = 0, ngayHoanTat = null;
    while (can > 0.005 && i < ps.length) {
      if (conTrong <= 0.005) { i++; conTrong = i < ps.length ? ps[i].tien : 0; continue; }
      var lay = Math.min(can, conTrong);
      daTra += lay; can -= lay; conTrong -= lay;
      if (can <= 0.005) ngayHoanTat = ps[i].ngay;
    }
    if (d.so <= 0.005) ngayHoanTat = null;
    return { daTra: daTra, ngayHoanTat: can <= 0.005 ? (ngayHoanTat || '') : null };
  });
}

/** Cấu hình dùng chung khi dựng lịch (đọc 1 lần để dựng nhiều lịch không phải đọc lại sheet cấu hình). */
function cauHinhLichTra_() {
  return { coSo: layCauHinh_('QUY_UOC_NGAY_LAI') === 'ACT/360' ? 360 : 365, nhac: Number(layCauHinh_('NGAY_NHAC_TRUOC_HAN')) || 7, today: homNayVN_() };
}
function layLichTraNo(maHoSo) {
  yeuCauDangNhap_();
  var h = layHoSoTheoMa_(maHoSo);
  if (!h) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  kiemTraPhamViTraNo_(h);
  h = hoSoVoiNgayThuc_(h); // lịch tính từ ngày THỰC giải ngân (nếu có xác nhận hiệu lực)
  var tra = layTraCuuDanhMuc_(), hd = tra.hd[String(h.MaHD)] || {};
  var ds = docTraNo_().filter(function (r) { return String(r.MaHoSo) === String(maHoSo) && r.TrangThai === TRA_HIEU_LUC; });
  return tinhLichTraNo_(h, hd, ds, cauHinhLichTra_());
}
/**
 * Dựng lịch trả nợ (thuần: không đọc sheet). ds = các bản ghi trả nợ HIỆU LỰC của hồ sơ; cfg = cauHinhLichTra_().
 * Ném lỗi khi hồ sơ thiếu ngày/số tiền (người gọi hàng loạt tự bắt để bỏ qua hồ sơ đó).
 */
function tinhLichTraNo_(h, hd, ds, cfg) {
  var maHoSo = String(h.MaHoSo);
  var loai = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
  var goc = Number(h.SoTienNhanNoLanNay) || 0, ngayGN = ngayIsoCuaO_(h.NgayGiaiNgan), ngayDH = ngayIsoCuaO_(h.NgayDenHan);
  if (!ngayGN || !ngayDH || !(goc > 0)) throw new Error('Hồ sơ thiếu ngày giải ngân, ngày đến hạn hoặc số tiền.');
  if (ngayDH <= ngayGN) throw new Error('Ngày đến hạn phải sau ngày giải ngân.');
  var lsNam = Number(hd['LaiSuatTrongHan_%']) || 0;
  var kyLai = parseKyThang_(hd.KyHanTraLai, 1), kyGoc = parseKyThang_(hd.KyHanTraGoc, 0);
  var coSo = cfg.coSo, nhac = cfg.nhac, today = cfg.today;
  var gocTra = ds.filter(function (r) { return r.LoaiTra === TRA_GOC; }).map(function (r) { return { ngay: String(r.NgayTra).substring(0, 10), tien: Number(r.SoTien) || 0 }; });
  var laiTra = ds.filter(function (r) { return r.LoaiTra === TRA_LAI; }).map(function (r) { return { ngay: String(r.NgayTra).substring(0, 10), tien: Number(r.SoTien) || 0 }; });

  function trangThaiKy_(conNo, denNgay, ngayTraDu) {
    if (conNo <= 0.005) return ngayTraDu && ngayTraDu > denNgay ? 'DA_TRA_CHAM' : 'DA_TRA_DU';
    if (denNgay < today) return 'QUA_HAN';
    return soNgayGiuaIso_(today, denNgay) <= nhac ? 'SAP_DEN_HAN' : 'CHUA_DEN_HAN';
  }
  function duNoTaiNgay_(t) {
    return duNoGocTaiNgay_(goc, gocTra, t);
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
  // Lịch lãi: tính lãi từng kỳ theo dư nợ thực tế, rồi phân bổ tiền đã trả (đến hôm nay) theo thứ tự kỳ
  var mocLai = kyLai === 0 ? [ngayGN, ngayDH] : mocKy_(ngayGN, ngayDH, kyLai), kyLaiTinh = [];
  for (var k = 0; k < mocLai.length - 1; k++) {
    kyLaiTinh.push({ s: mocLai[k], e: mocLai[k + 1], so: lamTronTienKy_(laiTrongKy_(mocLai[k], mocLai[k + 1]), loai) });
  }
  var pbLai = phanBoTienTraTheoKy_(kyLaiTinh.map(function (x) { return { den: x.e, so: x.so }; }), laiTra, today);
  var laiRows = kyLaiTinh.map(function (x, i) {
    var conNo = lamTronTienKy_(x.so - pbLai[i].daTra, loai);
    return { ky: i + 1, tuNgay: x.s, denNgay: x.e, soNgay: soNgayGiuaIso_(x.s, x.e), duNoDauKy: duNoTaiNgay_(x.s),
      laiPhaiTra: x.so, laiDaTra: lamTronTienKy_(pbLai[i].daTra, loai), conNo: conNo, ngayTraDu: pbLai[i].ngayHoanTat || '',
      trangThai: trangThaiKy_(conNo, x.e, pbLai[i].ngayHoanTat) };
  });
  // Lịch gốc
  var mocGoc = kyGoc === 0 ? [ngayDH] : mocKy_(ngayGN, ngayDH, kyGoc).slice(1);
  var n = mocGoc.length, gocDues = [], cumGocDue = 0;
  for (var j = 0; j < n; j++) {
    var tien = j < n - 1 ? lamTronTienKy_(goc / n, loai) : lamTronTienKy_(goc - cumGocDue, loai);
    cumGocDue += tien;
    gocDues.push({ den: mocGoc[j], so: tien });
  }
  var pbGoc = phanBoTienTraTheoKy_(gocDues, gocTra, today);
  var gocRows = gocDues.map(function (d, i) {
    var conNo = lamTronTienKy_(d.so - pbGoc[i].daTra, loai);
    return { ky: i + 1, ngayDen: d.den, gocPhaiTra: d.so, gocDaTra: lamTronTienKy_(pbGoc[i].daTra, loai), conNo: conNo,
      ngayTraDu: pbGoc[i].ngayHoanTat || '', trangThai: trangThaiKy_(conNo, d.den, pbGoc[i].ngayHoanTat) };
  });
  var sum = function (arr, f) { return arr.reduce(function (a, x) { return a + (Number(x[f]) || 0); }, 0); };
  return { maHoSo: String(maHoSo), loaiTien: loai, goc: goc, laiSuatNam: lsNam, coSoNgay: coSo, kyLaiThang: kyLai, kyGocThang: kyGoc,
    ngayNhacTruocHan: nhac, ngayTinh: today, duNoGocHienTai: duNoTaiNgay_(today), laiRows: laiRows, gocRows: gocRows,
    tong: { laiPhaiTra: lamTronTienKy_(sum(laiRows, 'laiPhaiTra'), loai), laiDaTra: lamTronTienKy_(sum(laiRows, 'laiDaTra'), loai),
      gocPhaiTra: lamTronTienKy_(sum(gocRows, 'gocPhaiTra'), loai), gocDaTra: lamTronTienKy_(sum(gocRows, 'gocDaTra'), loai) } };
}
