/**
 * HANMUC.GS — HẠN MỨC TÍN DỤNG THEO HỢP ĐỒNG: đã dùng / đang chờ giải ngân / còn lại, cảnh báo ngưỡng, chặn giải ngân vượt hạn mức.
 *
 * QUY ƯỚC TÍNH (ghi rõ để đối chiếu với ngân hàng):
 *  • "Đã dùng" = tổng DƯ NỢ GỐC còn lại của hồ sơ "Đã giải ngân", chưa tất toán, thuộc hợp đồng (vay xoay vòng: trả gốc thì hạn mức được trả lại).
 *  • Khoản USD quy đổi VND theo TỶ GIÁ GIẢI NGÂN của chính hồ sơ (TyGiaBan, làm tròn nửa lên) — không dùng tỷ giá hôm nay.
 *  • "Đang chờ" = hồ sơ "Đã tạo hồ sơ" (chưa xác nhận giải ngân) — chỉ để tham khảo, KHÔNG tính vào "đã dùng".
 *  • Hạn mức chưa khai báo (HanMucVay ≤ 0) → không áp dụng kiểm tra, không chặn.
 *  • Hạn mức coi là VND (HanMucVay lưu số nguyên).
 */

/** Dư nợ gốc quy VND của 1 hồ sơ. Trả {vnd, thieuTyGia}. */
function duNoQuyVND_(h, duNo) {
  if (String(h.LoaiTien || 'VND').toUpperCase() !== 'USD') return { vnd: Number(duNo) || 0, thieuTyGia: false };
  try { return { vnd: quyDoiUSDSangVND_(duNo, h.TyGiaBan), thieuTyGia: false }; }
  catch (e) { return { vnd: 0, thieuTyGia: true }; }
}

/**
 * Danh sách khoản đang vay (Đã giải ngân, chưa xoá, chưa tất toán, dư nợ gốc > 0) trong phạm vi người dùng, kèm hợp đồng/công ty/dư nợ.
 * Đọc sheet 1 lần; dùng chung cho hạn mức, dự báo, phân tích quá hạn, bảng điều hành.
 */
function danhSachKhoanDangVay_(dsHoSo, dsTraSan, traCuuSan) {
  var tra = traCuuSan || layTraCuuDanhMuc_(), ds = dsTraSan || docTraNo_(), traMap = tongTraGocTheoHoSo_(ds);
  var rows = khoanVayTrongPhamVi_(dsHoSo || docDanhSachHoSo_(false), tra, phamViCongTyNguoiDung_());
  var kq = [];
  rows.forEach(function (h) {
    if (daTatToanHoSo_(h)) return;
    var duNo = duNoGocConLai_(h, traMap);
    if (!(duNo > 0)) return;
    var hd = tra.hd[String(h.MaHD)] || {}, ct = tra.cty[String(hd.MaCty)] || {}, qd = duNoQuyVND_(h, duNo);
    kq.push({ h: h, hd: hd, ct: ct, maHoSo: String(h.MaHoSo), maHD: String(h.MaHD), loai: String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND',
      duNo: duNo, duNoVND: qd.vnd, thieuTyGia: qd.thieuTyGia });
  });
  return { rows: kq, traMap: traMap, dsTra: ds, tra: tra };
}

function nguongHanMuc_() { return { n1: Number(layCauHinh_('NGUONG_CB_HAN_MUC_1')) || 80, n2: Number(layCauHinh_('NGUONG_CB_HAN_MUC_2')) || 95 }; }
/**
 * NGỮ CẢNH DÙNG CHUNG cho các báo cáo quản lý vay: đọc sheet/cấu hình MỘT lần rồi chuyển cho hạn mức, dự báo, tuổi nợ, ràng buộc, bản tin
 * (tránh mỗi báo cáo tự đọc lại cả sổ). cauLich = có dựng lịch trả nợ cho mọi khoản (tốn CPU nhất) hay không.
 */
function ngCanhQLV_(khongCanLich) {
  var dsHoSo = docDanhSachHoSo_(false), kv = danhSachKhoanDangVay_(dsHoSo), today = homNayVN_(), nc = { kv: kv, today: today, dsHoSo: dsHoSo, nguong: nguongHanMuc_(), baoDam: tomTatBaoDamTheoHD_(), qh: null, d: null };
  if (!khongCanLich) nc.d = dungLichHangLoat_(kv, today);
  return nc;
}
function lichCuaNgCanh_(nc) { if (!nc.d) nc.d = dungLichHangLoat_(nc.kv, nc.today); return nc.d; }

function mucDoHanMuc_(hanMuc, daDung, ng) {
  if (!(hanMuc > 0)) return { tyLe: 0, muc: 'chua_khai_bao' };
  ng = ng || nguongHanMuc_();
  var tyLe = daDung / hanMuc * 100, n1 = ng.n1, n2 = ng.n2;
  return { tyLe: Math.round(tyLe * 100) / 100, muc: daDung > hanMuc ? 'vuot' : (tyLe >= n2 ? 'cao' : (tyLe >= n1 ? 'luu_y' : 'ok')) };
}

/**
 * Hạn mức theo từng hợp đồng trong phạm vi người dùng (chỉ đọc).
 * @return {{ngay:string, tongHanMuc:number, tongDaDung:number, tongDangCho:number, tongConLai:number, soVuot:number, soThieuTyGia:number, rows:Array}}
 */
function layHanMucTinDung() {
  yeuCauDangNhap_();
  return hanMucTinDung_();
}
function hanMucTinDung_(nc) {
  nc = nc || ngCanhQLV_(true);
  var kv = nc.kv, tra = kv.tra, pv = phamViCongTyNguoiDung_(), theoHD = {};
  kv.rows.forEach(function (k) {
    var o = theoHD[k.maHD] || (theoHD[k.maHD] = { daDung: 0, dangCho: 0, soKhoan: 0, thieuTyGia: 0 });
    o.daDung += k.duNoVND; o.soKhoan++; if (k.thieuTyGia) o.thieuTyGia++;
  });
  nc.dsHoSo.forEach(function (h) { // đang chờ giải ngân
    if (laDaXoa_(h.DaXoa) || h.TrangThai !== TT_DA_TAO) return;
    var hd = tra.hd[String(h.MaHD)]; if (!hd || (pv.length && pv.indexOf(String(hd.MaCty)) < 0)) return;
    var o = theoHD[String(h.MaHD)] || (theoHD[String(h.MaHD)] = { daDung: 0, dangCho: 0, soKhoan: 0, thieuTyGia: 0 });
    o.dangCho += duNoQuyVND_(h, Number(h.SoTienNhanNoLanNay) || 0).vnd;
  });
  var baoDam = nc.baoDam, ng = nc.nguong;
  var rows = [], t = { hm: 0, dung: 0, cho: 0, conLai: 0, vuot: 0, thieu: 0 };
  Object.keys(tra.hd).forEach(function (ma) {
    var hd = tra.hd[ma]; if (pv.length && pv.indexOf(String(hd.MaCty)) < 0) return;
    var o = theoHD[ma] || { daDung: 0, dangCho: 0, soKhoan: 0, thieuTyGia: 0 }, hanMuc = Number(hd.HanMucVay) || 0;
    if (!(hanMuc > 0) && !o.soKhoan && !o.dangCho) return; // không có hạn mức và không có khoản vay → không liệt kê
    var m = mucDoHanMuc_(hanMuc, o.daDung, ng), ct = tra.cty[String(hd.MaCty)] || {}, bd = baoDam[ma] || { tong: 0, soTS: 0 };
    rows.push({ maHD: ma, soHopDong: hd.SoHopDong || '', tenCty: ct.TenCty || '', tinhTrang: hd.TinhTrang || '', hanMuc: hanMuc, daDung: o.daDung, dangCho: o.dangCho,
      conLai: hanMuc > 0 ? hanMuc - o.daDung : null, conLaiSauCho: hanMuc > 0 ? hanMuc - o.daDung - o.dangCho : null, tyLe: m.tyLe, muc: m.muc, soKhoan: o.soKhoan,
      thieuTyGia: o.thieuTyGia, giaTriBaoDam: bd.tong, soTaiSan: bd.soTS, tyLeVayTrenTaiSan: bd.tong > 0 ? Math.round(o.daDung / bd.tong * 10000) / 100 : null });
    if (hanMuc > 0) { t.hm += hanMuc; t.dung += o.daDung; t.cho += o.dangCho; t.conLai += hanMuc - o.daDung; }
    if (m.muc === 'vuot') t.vuot++; t.thieu += o.thieuTyGia;
  });
  var thuTu = { vuot: 0, cao: 1, luu_y: 2, ok: 3, chua_khai_bao: 4 };
  rows.sort(function (a, b) { return (thuTu[a.muc] - thuTu[b.muc]) || (b.tyLe - a.tyLe) || String(a.soHopDong).localeCompare(String(b.soHopDong)); });
  return { ngay: homNayVN_(), donVi: 'VND', tongHanMuc: t.hm, tongDaDung: t.dung, tongDangCho: t.cho, tongConLai: t.conLai, soVuot: t.vuot, soThieuTyGia: t.thieu,
    nguong1: ng.n1, nguong2: ng.n2, rows: rows };
}

/**
 * Kiểm tra 1 hồ sơ có làm VƯỢT hạn mức hợp đồng khi giải ngân không (chỉ đọc; không ném lỗi).
 * @return {{apDung:boolean, hanMuc:number, daDung:number, soTienVND:number, conLai:number, vuot:boolean, chan:boolean, thongBao:string}}
 */
function kiemTraHanMucHoSo_(h) {
  var tra = layTraCuuDanhMuc_(), hd = tra.hd[String(h.MaHD)] || {}, hanMuc = Number(hd.HanMucVay) || 0;
  var soTien = duNoQuyVND_(h, Number(h.SoTienNhanNoLanNay) || 0);
  if (!(hanMuc > 0)) return { apDung: false, hanMuc: 0, daDung: 0, soTienVND: soTien.vnd, conLai: 0, vuot: false, chan: false, thongBao: 'Hợp đồng chưa khai báo hạn mức — không kiểm tra.' };
  if (soTien.thieuTyGia) return { apDung: true, hanMuc: hanMuc, daDung: 0, soTienVND: 0, conLai: 0, vuot: false, chan: true, thongBao: 'Hồ sơ USD thiếu tỷ giá giải ngân hợp lệ nên không quy đổi được để kiểm tra hạn mức.' };
  var traMap = tongTraGocTheoHoSo_(docTraNo_()), daDung = 0;
  docDanhSachHoSo_(false).forEach(function (x) {
    if (laDaXoa_(x.DaXoa) || x.TrangThai !== TT_DA_GIAI_NGAN || daTatToanHoSo_(x) || String(x.MaHD) !== String(h.MaHD) || String(x.MaHoSo) === String(h.MaHoSo)) return;
    var du = duNoGocConLai_(x, traMap); if (du > 0) daDung += duNoQuyVND_(x, du).vnd;
  });
  var conLai = hanMuc - daDung, vuot = soTien.vnd > conLai;
  return { apDung: true, hanMuc: hanMuc, daDung: daDung, soTienVND: soTien.vnd, conLai: conLai, vuot: vuot, chan: vuot && layCauHinh_('CHAN_VUOT_HAN_MUC') === '1',
    thongBao: vuot ? 'Giải ngân ' + formatSo_(soTien.vnd) + ' VND vượt hạn mức còn lại ' + formatSo_(Math.max(conLai, 0)) + ' VND (hạn mức ' + formatSo_(hanMuc) + ', đã dùng ' + formatSo_(daDung) + ').'
      : 'Trong hạn mức: còn lại ' + formatSo_(conLai) + ' VND, sau giải ngân còn ' + formatSo_(conLai - soTien.vnd) + ' VND.' };
}
/** API: kiểm tra hạn mức cho 1 hồ sơ trước khi xác nhận giải ngân (chỉ đọc). */
function kiemTraHanMucHoSo(maHoSo) {
  yeuCauDangNhap_();
  var h = layHoSoTheoMa_(maHoSo);
  if (!h || laDaXoa_(h.DaXoa)) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');
  kiemTraPhamViTraNo_(h);
  return kiemTraHanMucHoSo_(h);
}
/** Chặn khi xác nhận giải ngân (gọi trong xacNhanGiaiNganThucTe, đã giữ khoá). */
function chanNeuVuotHanMuc_(h) {
  var kt = kiemTraHanMucHoSo_(h);
  if (kt.chan) throw new Error(kt.thongBao + (kt.vuot ? ' Hãy tất toán/ghi nhận trả gốc các khoản đã giải ngân, tăng hạn mức ở mục Hợp đồng vay, hoặc nhờ quản trị tắt "Chặn giải ngân vượt hạn mức" (Cài đặt → Quản lý vay).' : ''));
  return kt;
}

/**
 * Tóm tắt NHẸ cho màn Tổng quan (không dựng lịch trả nợ): hạn mức + số ràng buộc/bảo hiểm cần chú ý. Gắn vào layTongQuanHoSo, dùng lại dữ liệu đã đọc.
 * Lỗi bất kỳ chỉ làm mất thẻ này, không làm hỏng Tổng quan.
 */
function tongQuanQuanLyVay_(dsHoSo, tra, dsTra) {
  try {
    var kv = danhSachKhoanDangVay_(dsHoSo, dsTra, tra), nc = { kv: kv, today: homNayVN_(), dsHoSo: dsHoSo, nguong: nguongHanMuc_(), baoDam: tomTatBaoDamTheoHD_() };
    var hm = hanMucTinDung_(nc), rb = dieuKienRangBuoc_('', nc), bh = null;
    bh = ts2TongQuanAnToan_();
    return { hanMuc: { tongHanMuc: hm.tongHanMuc, tongDaDung: hm.tongDaDung, tongConLai: hm.tongConLai, soVuot: hm.soVuot }, rangBuoc: rb.dem, baoHiemCanChuY: bh && !bh.loi ? bh.tongCanChuY : null, baoHiem: bh, nguongBaoHiemNgay: NGAY_CB_BAO_HIEM_ };
  } catch (e) { return null; }
}
