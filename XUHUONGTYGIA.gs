/**
 * XUHUONGTYGIA.GS — XU HƯỚNG tỷ giá USD/VND từ lịch sử đã lưu trong sheet TyGiaThuCong.
 *
 * ĐÂY KHÔNG PHẢI DỰ BÁO. Chỉ mô tả chuyện đã xảy ra trong dữ liệu của chính hệ thống (chênh lệch so với 1/7/30 ngày trước,
 * trung bình động, biên độ). Không đưa ra tỷ giá tương lai, không khuyến nghị tất toán/giữ khoản vay.
 * Thiếu dữ liệu thì trả "CHUA_DU_DU_LIEU" thay vì đoán.
 */
var XU_HUONG_NGUONG_PHAN_TRAM_ = 0.3;   // |thay đổi 7 ngày| < 0,3% → đi ngang
var XU_HUONG_TOI_THIEU_DIEM_7_ = 3;     // số ngày có dữ liệu tối thiểu trong 7 ngày gần nhất
var XU_HUONG_TOI_THIEU_DIEM_30_ = 10;
var XU_HUONG_TOI_DA_CU_NGAY_ = 7;       // dữ liệu mới nhất cũ hơn mức này → không kết luận xu hướng
var XU_HUONG_LUU_Y_ = 'Chỉ là thống kê xu hướng từ tỷ giá đã lưu trong hệ thống; không phải dự báo hay khuyến nghị.';

function xuHuongCongNgay_(iso, soNgay) {
  var p = String(iso).split('-'), d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + soNgay));
  return d.toISOString().slice(0, 10);
}

/**
 * Hàm thuần. chuoi: [{ngay:'yyyy-MM-dd', ty:number}] (mọi thứ tự); homNay: 'yyyy-MM-dd'.
 * Mỗi ngày chỉ lấy một giá (giá ghi sau cùng nếu trùng ngày).
 */
function tinhXuHuongTyGia_(chuoi, homNay) {
  var theoNgay = {};
  (chuoi || []).forEach(function (x) { if (x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.ngay)) && Number(x.ty) > 0) theoNgay[x.ngay] = Number(x.ty); });
  var ngays = Object.keys(theoNgay).sort();
  var kq = { luuY: XU_HUONG_LUU_Y_, soDiem: ngays.length, nhan: 'CHUA_DU_DU_LIEU', lyDo: '', ngayMoiNhat: '', tyMoiNhat: null,
    thayDoi: { ngay1: null, ngay7: null, ngay30: null }, trungBinhDong: { ngay7: null, ngay30: null }, bienDo30: null };
  if (!ngays.length) { kq.lyDo = 'Chưa có tỷ giá nào được lưu.'; return kq; }
  var moi = ngays[ngays.length - 1], tyMoi = theoNgay[moi];
  kq.ngayMoiNhat = moi; kq.tyMoiNhat = tyMoi;
  function giaTruoc(n, dungSai) { // giá của ngày gần nhất trước hoặc bằng (mới nhất − n), không cũ hơn n + dungSai ngày
    var muc = xuHuongCongNgay_(moi, -n), gioiHan = xuHuongCongNgay_(moi, -(n + dungSai)), g = null;
    ngays.forEach(function (d) { if (d <= muc && d >= gioiHan) g = d; });
    return g ? theoNgay[g] : null;
  }
  function thayDoi(n, dungSai) {
    var t = giaTruoc(n, dungSai); if (t === null) return null;
    return { soTien: Math.round((tyMoi - t) * 100) / 100, phanTram: Math.round((tyMoi - t) / t * 10000) / 100, giaTruoc: t };
  }
  kq.thayDoi.ngay1 = thayDoi(1, 3); kq.thayDoi.ngay7 = thayDoi(7, 3); kq.thayDoi.ngay30 = thayDoi(30, 7);
  function trongCua(n) { var tu = xuHuongCongNgay_(moi, -(n - 1)); return ngays.filter(function (d) { return d >= tu; }).map(function (d) { return theoNgay[d]; }); }
  function tb(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  var c7 = trongCua(7), c30 = trongCua(30);
  if (c7.length >= XU_HUONG_TOI_THIEU_DIEM_7_) kq.trungBinhDong.ngay7 = Math.round(tb(c7));
  if (c30.length >= XU_HUONG_TOI_THIEU_DIEM_30_) {
    kq.trungBinhDong.ngay30 = Math.round(tb(c30));
    kq.bienDo30 = Math.round((Math.max.apply(null, c30) - Math.min.apply(null, c30)) / tb(c30) * 10000) / 100;
  }
  var cu = homNay ? Math.max(0, soNgayGiuaIso_(moi, homNay)) : 0;
  if (cu > XU_HUONG_TOI_DA_CU_NGAY_) { kq.lyDo = 'Tỷ giá mới nhất đã cũ ' + cu + ' ngày (' + moi + '); không kết luận xu hướng.'; return kq; }
  if (!kq.thayDoi.ngay7 || c7.length < XU_HUONG_TOI_THIEU_DIEM_7_) { kq.lyDo = 'Chưa đủ dữ liệu 7 ngày gần nhất (cần ít nhất ' + XU_HUONG_TOI_THIEU_DIEM_7_ + ' ngày có tỷ giá và một mốc khoảng 7 ngày trước).'; return kq; }
  var pt = kq.thayDoi.ngay7.phanTram;
  kq.nhan = pt > XU_HUONG_NGUONG_PHAN_TRAM_ ? 'TANG' : (pt < -XU_HUONG_NGUONG_PHAN_TRAM_ ? 'GIAM' : 'DI_NGANG');
  kq.lyDo = 'So với khoảng 7 ngày trước: ' + (pt > 0 ? '+' : '') + pt + '% (ngưỡng đi ngang ±' + XU_HUONG_NGUONG_PHAN_TRAM_ + '%).';
  return kq;
}

/** Xu hướng từ sheet TyGiaThuCong (mọi người đã đăng nhập xem được; chỉ đọc). */
function layXuHuongTyGia() {
  yeuCauDangNhap_();
  var ds = getSS_().getSheetByName(SHEET_TY_GIA_THU_CONG) ? sheetToObjects_(SHEET_TY_GIA_THU_CONG) : [];
  var chuoi = ds.map(function (r) { return { ngay: ngayIsoCuaO_(r.Ngay), ty: Number(r.TyGiaBan) }; });
  return tinhXuHuongTyGia_(chuoi, homNayVN_());
}
