/**
 * DUBAO.GS — DỰ BÁO DÒNG TIỀN PHẢI TRẢ, PHÂN TÍCH NỢ QUÁ HẠN THEO TUỔI, BẢNG ĐIỀU HÀNH (chỉ đọc).
 *
 * DỰ BÁO: từ lịch trả nợ (LICHTRA.gs) của mọi khoản đang vay (Đã giải ngân, chưa tất toán, còn dư nợ), lấy phần CHƯA TRẢ của từng kỳ gốc/lãi:
 *   • kỳ đã quá hạn → nhóm "Quá hạn"; kỳ trong N tháng tới (tính từ tháng hiện tại) → từng tháng; xa hơn → "Sau kỳ dự báo".
 *   • Lãi các kỳ tương lai tính trên DƯ NỢ HIỆN TẠI, giả định không trả gốc sớm hơn lịch.
 *   • VND và USD tách riêng; quy đổi USD → VND theo tỷ giá mới nhất ± biên độ (kịch bản) — không cộng lẫn nguyên tệ.
 * TUỔI NỢ QUÁ HẠN: số ngày từ kỳ quá hạn CŨ NHẤT còn chưa trả đủ đến hôm nay → các bậc 1–30, 31–60, 61–90, trên 90 ngày.
 */
var BAC_QUA_HAN_ = [
  { ma: 'B1_30', nhan: '1–30 ngày', tu: 1, den: 30 }, { ma: 'B31_60', nhan: '31–60 ngày', tu: 31, den: 60 },
  { ma: 'B61_90', nhan: '61–90 ngày', tu: 61, den: 90 }, { ma: 'B90P', nhan: 'Trên 90 ngày', tu: 91, den: 99999 }
];
function bacQuaHan_(soNgay) {
  for (var i = 0; i < BAC_QUA_HAN_.length; i++) if (soNgay >= BAC_QUA_HAN_[i].tu && soNgay <= BAC_QUA_HAN_[i].den) return BAC_QUA_HAN_[i].ma;
  return '';
}
function khoaThang_(iso) { return iso.slice(0, 7); }
function congThangKhoa_(khoa, n) {
  var p = khoa.split('-').map(Number), t = p[0] * 12 + (p[1] - 1) + n, y = Math.floor(t / 12), m = t - y * 12 + 1;
  return y + '-' + (m < 10 ? '0' : '') + m;
}
/** Dựng lịch cho mọi khoản đang vay; hồ sơ lỗi dữ liệu được ghi vào boQua (không làm hỏng cả báo cáo). */
function dungLichHangLoat_(kv, today) {
  var cfg = cauHinhLichTra_(); cfg.today = today || cfg.today;
  var theoHoSo = {};
  kv.dsTra.forEach(function (r) { if (r.TrangThai === TRA_HIEU_LUC) (theoHoSo[String(r.MaHoSo)] || (theoHoSo[String(r.MaHoSo)] = [])).push(r); });
  var lich = [], boQua = [];
  kv.rows.forEach(function (k) {
    try { lich.push({ k: k, lich: tinhLichTraNo_(k.h, k.hd, theoHoSo[k.maHoSo] || [], cfg), ds: theoHoSo[k.maHoSo] || [] }); }
    catch (e) { boQua.push({ maHoSo: k.maHoSo, lyDo: String(e.message || e) }); }
  });
  return { lich: lich, boQua: boQua, cfg: cfg };
}

/** Thuần: gom khoản chưa trả theo tháng. lichList = [{k:{maHoSo, loai}, lich}]; trả {quaHan, thang:[{thang, VND:{goc,lai}, USD:{goc,lai}}], sau}. */
function gomDongTienTheoThang_(lichList, today, soThang) {
  var dau = khoaThang_(today), thang = [], idx = {};
  for (var i = 0; i < soThang; i++) { var kh = congThangKhoa_(dau, i); idx[kh] = i; thang.push({ thang: kh, VND: { goc: 0, lai: 0 }, USD: { goc: 0, lai: 0 } }); }
  var quaHan = { VND: { goc: 0, lai: 0 }, USD: { goc: 0, lai: 0 }, soKy: 0 }, sau = { VND: { goc: 0, lai: 0 }, USD: { goc: 0, lai: 0 } };
  lichList.forEach(function (x) {
    var loai = x.k.loai;
    var them = function (ngay, so, truong) {
      if (!(so > 0.005)) return;
      var dich;
      if (ngay < today) { dich = quaHan; quaHan.soKy++; }
      else if (idx[khoaThang_(ngay)] !== undefined) dich = thang[idx[khoaThang_(ngay)]];
      else dich = sau;
      dich[loai][truong] = congSoTien_(dich[loai][truong], so);
    };
    x.lich.gocRows.forEach(function (r) { them(r.ngayDen, r.conNo, 'goc'); });
    x.lich.laiRows.forEach(function (r) { them(r.denNgay, r.conNo, 'lai'); });
  });
  return { quaHan: quaHan, thang: thang, sau: sau };
}
function quyDoiKichBan_(usd, tyGia, phanTram) { return tyGia > 0 ? Math.round(usd * tyGia * (1 + phanTram / 100)) : null; }

/**
 * API: dự báo tiền phải trả N tháng tới.
 * @param {{soThang:number=, bienDoTyGia:number=}} tuyChon soThang 1–24 (mặc định 12); bienDoTyGia 0–30 (%, mặc định 5)
 */
function layDuBaoDongTien(tuyChon) {
  yeuCauDangNhap_();
  return duBaoDongTien_(tuyChon);
}
function duBaoDongTien_(tuyChon, nc) {
  var o = tuyChon || {}, soThang = Math.round(Number(o.soThang === undefined ? 12 : o.soThang)), bd = Number(o.bienDoTyGia === undefined ? 5 : o.bienDoTyGia);
  if (!(soThang >= 1 && soThang <= 24)) throw new Error('Số tháng dự báo phải từ 1 đến 24.');
  if (!(bd >= 0 && bd <= 30)) throw new Error('Biên độ tỷ giá phải từ 0 đến 30%.');
  nc = nc || ngCanhQLV_(); var kv = nc.kv, today = nc.today, d = lichCuaNgCanh_(nc), g = gomDongTienTheoThang_(d.lich, today, soThang);
  var ty = layTyGiaThuCongMoiNhat_(), tyGia = ty ? ty.tyGiaBan : 0, kichBan = [-bd, 0, bd];
  var tinhThang = function (x) {
    var usd = congSoTien_(x.USD.goc, x.USD.lai), vnd = congSoTien_(x.VND.goc, x.VND.lai);
    return { VND: x.VND, USD: x.USD, tongVND: vnd, tongUSD: usd, quyDoiVND: kichBan.map(function (p) { var q = quyDoiKichBan_(usd, tyGia, p); return q === null ? null : vnd + q; }) };
  };
  var thang = g.thang.map(function (x) { var r = tinhThang(x); r.thang = x.thang; return r; });
  var tong = tinhThang({ VND: { goc: 0, lai: 0 }, USD: { goc: 0, lai: 0 } });
  thang.concat([tinhThang(g.quaHan)]).forEach(function (r) {
    ['goc', 'lai'].forEach(function (t) { tong.VND[t] = congSoTien_(tong.VND[t], r.VND[t]); tong.USD[t] = congSoTien_(tong.USD[t], r.USD[t]); });
  });
  tong = tinhThang(tong);
  var ba = thang.slice(0, 3).reduce(function (a, r) { a.vnd = congSoTien_(a.vnd, r.tongVND); a.usd = congSoTien_(a.usd, r.tongUSD); return a; }, { vnd: 0, usd: 0 });
  return { ngay: today, soThang: soThang, tyGiaDungQuyDoi: ty, canhBaoTyGia: !ty ? 'Chưa có tỷ giá nên không quy đổi USD.' : (ty.canhBao || ''), bienDoTyGia: bd, kichBan: kichBan, soKhoan: kv.rows.length, boQua: d.boQua,
    quaHan: tinhThang(g.quaHan), thang: thang, sauKyDuBao: tinhThang(g.sau), tong: tong, baThangToi: ba,
    ghiChu: 'Lãi các kỳ tương lai tính trên dư nợ hiện tại (giả định không trả gốc sớm hơn lịch). USD quy VND theo tỷ giá mới nhất ± biên độ; không cộng lẫn nguyên tệ.' };
}

/** Thuần: phân loại 1 lịch theo tuổi nợ quá hạn. Trả {soNgay, soTienQuaHan:{goc,lai}, bac}. soNgay = 0 → không quá hạn. */
function tuoiNoQuaHan_(lich, today) {
  var cu = '', goc = 0, lai = 0;
  lich.gocRows.forEach(function (r) { if (r.conNo > 0.005 && r.ngayDen < today) { goc = congSoTien_(goc, r.conNo); if (!cu || r.ngayDen < cu) cu = r.ngayDen; } });
  lich.laiRows.forEach(function (r) { if (r.conNo > 0.005 && r.denNgay < today) { lai = congSoTien_(lai, r.conNo); if (!cu || r.denNgay < cu) cu = r.denNgay; } });
  var n = cu ? soNgayGiuaIso_(cu, today) : 0;
  return { soNgay: n, soTienQuaHan: { goc: goc, lai: lai }, bac: n > 0 ? bacQuaHan_(n) : 'HIEN_HANH', ngayCu: cu };
}
/** API: phân tích nợ quá hạn theo bậc tuổi (chỉ đọc). */
function layPhanTichQuaHan() {
  yeuCauDangNhap_();
  return phanTichQuaHan_();
}
function phanTichQuaHan_(nc) {
  nc = nc || ngCanhQLV_(); var today = nc.today, d = lichCuaNgCanh_(nc);
  var bac = {}; BAC_QUA_HAN_.concat([{ ma: 'HIEN_HANH', nhan: 'Chưa quá hạn' }]).forEach(function (b) { bac[b.ma] = { ma: b.ma, nhan: b.nhan, soKhoan: 0, VND: { duNoGoc: 0, quaHanGoc: 0, quaHanLai: 0 }, USD: { duNoGoc: 0, quaHanGoc: 0, quaHanLai: 0 } }; });
  var rows = [], qh = nc.qh || (nc.qh = thamSoQuaHan_());
  d.lich.forEach(function (x) {
    var t = tuoiNoQuaHan_(x.lich, today), b = bac[t.bac], loai = x.k.loai;
    b.soKhoan++; b[loai].duNoGoc = congSoTien_(b[loai].duNoGoc, x.k.duNo); b[loai].quaHanGoc = congSoTien_(b[loai].quaHanGoc, t.soTienQuaHan.goc); b[loai].quaHanLai = congSoTien_(b[loai].quaHanLai, t.soTienQuaHan.lai);
    if (t.soNgay > 0) {
      var phat = 0; try { phat = tinhLaiPhat_(x.k.h, x.k.hd, x.ds, d.cfg, qh).conNo; } catch (e) { phat = 0; }
      rows.push({ maHoSo: x.k.maHoSo, soHopDong: x.k.hd.SoHopDong || '', tenCty: x.k.ct.TenCty || '', loaiTien: loai, duNoGoc: x.k.duNo, soNgayQuaHan: t.soNgay, bac: t.bac, nhanBac: bac[t.bac].nhan,
        ngayQuaHanCuNhat: t.ngayCu, quaHanGoc: t.soTienQuaHan.goc, quaHanLai: t.soTienQuaHan.lai, laiPhatUocTinh: phat, revision: soRevision_(x.k.h) });
    }
  });
  rows.sort(function (a, b) { return b.soNgayQuaHan - a.soNgayQuaHan; });
  return { ngay: today, bac: BAC_QUA_HAN_.concat([{ ma: 'HIEN_HANH', nhan: 'Chưa quá hạn' }]).map(function (b) { return bac[b.ma]; }), rows: rows.slice(0, 300), tongQuaHan: rows.length, boQua: d.boQua };
}

/** API: bảng điều hành cho lãnh đạo (chỉ đọc; vai trò XEM dùng được). Tổng hợp từ các báo cáo trên. */
function layBangDieuHanh() {
  yeuCauDangNhap_();
  var nc = ngCanhQLV_(), hm = hanMucTinDung_(nc), db = duBaoDongTien_({ soThang: 3 }, nc), qh = phanTichQuaHan_(nc), rb = dieuKienRangBuoc_('', nc), ts = taiSanBaoDam_('');
  var viec = [];
  qh.rows.slice(0, 5).forEach(function (r) { viec.push({ muc: 'cao', loai: 'QUA_HAN', maHoSo: r.maHoSo, moTa: r.maHoSo + ' quá hạn ' + r.soNgayQuaHan + ' ngày (' + r.nhanBac + ').' }); });
  hm.rows.filter(function (r) { return r.muc === 'vuot' || r.muc === 'cao'; }).slice(0, 5).forEach(function (r) { viec.push({ muc: r.muc === 'vuot' ? 'cao' : 'vua', loai: 'HAN_MUC', maHD: r.maHD, moTa: 'Hợp đồng ' + r.soHopDong + ' đã dùng ' + r.tyLe + '% hạn mức.' }); });
  rb.rows.filter(function (r) { return r.trangThai === 'VI_PHAM' || r.trangThai === 'SAP_VI_PHAM' || r.trangThai === 'QUA_HAN_CAP_NHAT'; }).slice(0, 5)
    .forEach(function (r) { viec.push({ muc: r.trangThai === 'VI_PHAM' ? 'cao' : 'vua', loai: 'RANG_BUOC', maHD: r.maHD, moTa: r.tenChiTieu + ' (' + r.soHopDong + '): ' + r.nhanTrangThai + '.' }); });
  ts.rows.filter(function (r) { return r.canhBaoBaoHiem; }).slice(0, 5).forEach(function (r) { viec.push({ muc: r.canhBaoBaoHiem === 'QUA_HAN' ? 'cao' : 'vua', loai: 'BAO_HIEM', maHD: r.maHD, moTa: 'Bảo hiểm tài sản ' + r.maTS + ' ' + (r.canhBaoBaoHiem === 'QUA_HAN' ? 'đã hết hạn' : 'sắp hết hạn') + ' (' + r.ngayHetHanBaoHiem + ').' }); });
  return { ngay: homNayVN_(), hanMuc: { tongHanMuc: hm.tongHanMuc, tongDaDung: hm.tongDaDung, tongConLai: hm.tongConLai, soVuot: hm.soVuot, top: hm.rows.slice(0, 5) },
    phaiTra3Thang: db.baThangToi, quaHanTrongDuBao: db.quaHan, thangDauTien: db.thang[0], quaHan: { tong: qh.tongQuaHan, bac: qh.bac }, rangBuoc: rb.dem,
    soTaiSanDangBaoDam: ts.rows.filter(function (r) { return r.trangThai === TS_DANG_BAO_DAM; }).length, tongGiaTriBaoDam: ts.tongGiaTriDangBaoDam, tyGia: db.tyGiaDungQuyDoi, viecCanLam: viec };
}
