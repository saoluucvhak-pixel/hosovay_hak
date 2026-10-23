/**
 * CHOTBAOCAO.GS — CHỐT BÁO CÁO TIỀN LÃI THEO KỲ và XUẤT EXCEL / PDF.
 *
 * • Chốt kỳ = ẢNH CHỤP kết quả layBaoCaoTienLai tại thời điểm chốt (sheet ChotBaoCaoLai = tiêu đề kỳ + tổng; ChotBaoCaoLaiCT = từng dòng tháng × hồ sơ).
 *   Sửa dữ liệu gốc sau đó KHÔNG làm đổi bản đã chốt; layChiTietChotLai trả thêm phần "lệch so với số hiện tại" để kế toán biết có phải chốt lại không.
 * • Không xoá, không sửa số đã chốt: chỉ "Hủy chốt" (đánh dấu + lý do + người hủy) rồi chốt lại. Hai kỳ chốt còn hiệu lực không được chồng khoảng ngày (cùng loại tiền, hoặc một bên là "tất cả").
 * • Bản chốt chứa dữ liệu mọi công ty nên chỉ tài khoản TOÀN HỆ THỐNG (không bị giới hạn công ty) chốt / xem được.
 * • Xuất Excel/PDF: dựng 1 file Google Sheet tạm (không đụng dữ liệu thật) → tải định dạng xlsx/pdf qua UrlFetchApp → đưa nội dung base64 về trình duyệt → bỏ file tạm vào thùng rác.
 */
var SHEET_CHOT_LAI = 'ChotBaoCaoLai';
var COT_CHOT_LAI_ = ['MaChot', 'TenKy', 'TuNgay', 'DenNgay', 'LoaiTien', 'BaoGomLaiPhat', 'CoSoNgay', 'SoDong', 'TongLai', 'TongLaiPhat', 'TongQuyDoiVND', 'SoDongThieuTyGia', 'TrangThai', 'GhiChu', 'NguoiChot', 'ThoiDiemChot', 'LyDoHuy', 'NguoiHuy', 'ThoiDiemHuy'];
var SHEET_CHOT_LAI_CT = 'ChotBaoCaoLaiCT';
var COT_CHOT_LAI_CT_ = ['MaChot', 'Thang', 'MaHoSo', 'SoHopDong', 'TenCty', 'LoaiTien', 'SoNgay', 'DuNoBinhQuan', 'LaiSuat', 'Lai', 'LaiPhat', 'TyGia', 'QuyDoiVND'];
var CHOT_HIEU_LUC = 'Đã chốt', CHOT_HUY = 'Đã hủy chốt';
var XUAT_SO_DONG_TOI_DA_ = 5000;

function chotChanGioiHanCongTy_() {
  if (phamViCongTyNguoiDung_().length) throw new Error('Bản chốt chứa dữ liệu mọi công ty: chỉ tài khoản toàn hệ thống (không bị giới hạn theo công ty) được chốt và xem.');
}
function chotChuanTuyChon_(tt) {
  tt = tt || {};
  var loai = String(tt.loaiTien || '').toUpperCase(); if (loai && loai !== 'VND' && loai !== 'USD') throw new Error('Loại tiền không hợp lệ.');
  return { tuNgay: ngayChuanISO_(tt.tuNgay, 'Từ ngày', true), denNgay: ngayChuanISO_(tt.denNgay, 'Đến ngày', true), loaiTien: loai, baoGomLaiPhat: tt.baoGomLaiPhat !== false };
}
function chotSoTongTien_(o) { return Object.keys(o || {}).reduce(function (a, k) { return a + (Number(o[k]) || 0); }, 0); }

/** Chốt báo cáo tiền lãi kỳ tt = { tenKy, tuNgay, denNgay, loaiTien?, baoGomLaiPhat?, ghiChu? } (Quản trị, tài khoản toàn hệ thống). */
function chotBaoCaoLai(tt) {
  yeuCauDangNhap_(); yeuCauQuanTri_('chốt báo cáo tiền lãi'); chotChanGioiHanCongTy_();
  tt = tt || {};
  var tenKy = lamSachCongThuc_(String(tt.tenKy || '').trim().substring(0, 80)); if (!tenKy) throw new Error('Nhập tên kỳ chốt (VD: Tháng 06/2026).');
  var op = chotChuanTuyChon_(tt), me = layDanhTinh_().email || emailNguoiDung_();
  return voiKhoa_(function () {
    var ds = docSheetBaoDam_(SHEET_CHOT_LAI);
    ds.forEach(function (r) {
      if (r.TrangThai !== CHOT_HIEU_LUC) return;
      var khacLoai = r.LoaiTien && op.loaiTien && r.LoaiTien !== op.loaiTien;
      if (!khacLoai && ngayIsoCuaO_(r.TuNgay) <= op.denNgay && ngayIsoCuaO_(r.DenNgay) >= op.tuNgay) throw new Error('Khoảng ngày trùng kỳ đã chốt ' + r.MaChot + ' (' + r.TenKy + ': ' + ngayIsoCuaO_(r.TuNgay) + ' → ' + ngayIsoCuaO_(r.DenNgay) + '). Hủy chốt kỳ đó trước nếu cần chốt lại.');
    });
    var bc = layBaoCaoTienLai(op), ma = maBaoDamMoi_('CHOT', ds, 'MaChot'), tenCty = {}, now = new Date();
    bc.theoHoSo.forEach(function (h) { tenCty[h.maHoSo] = h.tenCty; });
    if (!bc.chiTiet.length) throw new Error('Kỳ này không có lãi phát sinh để chốt.');
    var sh = ensureSheet_(getSS_(), SHEET_CHOT_LAI_CT, COT_CHOT_LAI_CT_);
    var rows = bc.chiTiet.map(function (c) { return [ma, c.thang, c.maHoSo, c.soHopDong, tenCty[c.maHoSo] || '', c.loaiTien, c.soNgay, c.duNoBinhQuan, c.laiSuat, c.lai, c.laiPhat || 0, c.tyGia === null ? '' : c.tyGia, c.quyDoiVND === null ? '' : c.quyDoiVND]; });
    // dòng chi tiết ghi trước, tiêu đề kỳ ghi sau: lỗi giữa chừng không để lại kỳ "đã chốt" thiếu dòng
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, COT_CHOT_LAI_CT_.length).setValues(rows);
    ghiDongMoi_(SHEET_CHOT_LAI, COT_CHOT_LAI_, { MaChot: ma, TenKy: tenKy, TuNgay: op.tuNgay, DenNgay: op.denNgay, LoaiTien: op.loaiTien, BaoGomLaiPhat: op.baoGomLaiPhat ? 'Có' : 'Không', CoSoNgay: bc.coSoNgay, SoDong: rows.length,
      TongLai: JSON.stringify(bc.tong), TongLaiPhat: JSON.stringify(bc.tongPhat), TongQuyDoiVND: bc.tongQuyDoi.tong, SoDongThieuTyGia: bc.tongQuyDoi.soDongThieuTyGia, TrangThai: CHOT_HIEU_LUC,
      GhiChu: lamSachCongThuc_(String(tt.ghiChu || '').substring(0, 300)), NguoiChot: me, ThoiDiemChot: now });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'CHOT_BAO_CAO_LAI', ma + ' | ' + tenKy + ' | ' + op.tuNgay + ' → ' + op.denNgay + ' | ' + rows.length + ' dòng');
    return { ok: true, maChot: ma, tenKy: tenKy, soDong: rows.length, tong: bc.tong, tongPhat: bc.tongPhat, tongQuyDoi: bc.tongQuyDoi };
  });
}
function chotDocJson_(v) { try { return JSON.parse(v || '{}') || {}; } catch (e) { return {}; } }
function chotTomTat_(r) {
  return { maChot: r.MaChot, tenKy: r.TenKy, tuNgay: ngayIsoCuaO_(r.TuNgay), denNgay: ngayIsoCuaO_(r.DenNgay), loaiTien: r.LoaiTien || '', baoGomLaiPhat: r.BaoGomLaiPhat === 'Có', coSoNgay: Number(r.CoSoNgay) || 0, soDong: Number(r.SoDong) || 0,
    tongLai: chotDocJson_(r.TongLai), tongLaiPhat: chotDocJson_(r.TongLaiPhat), tongQuyDoiVND: Number(r.TongQuyDoiVND) || 0, soDongThieuTyGia: Number(r.SoDongThieuTyGia) || 0, trangThai: r.TrangThai, ghiChu: r.GhiChu || '',
    nguoiChot: r.NguoiChot, thoiDiemChot: r.ThoiDiemChot ? Utilities.formatDate(new Date(r.ThoiDiemChot), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') : '', lyDoHuy: r.LyDoHuy || '', nguoiHuy: r.NguoiHuy || '' };
}
/** Danh sách kỳ đã chốt (mới nhất trước). */
function layDanhSachChotLai() {
  yeuCauDangNhap_(); chotChanGioiHanCongTy_();
  return docSheetBaoDam_(SHEET_CHOT_LAI).map(chotTomTat_).sort(function (a, b) { return a.maChot < b.maChot ? 1 : -1; });
}
function chotLayKy_(maChot) {
  var k = docSheetBaoDam_(SHEET_CHOT_LAI).filter(function (r) { return String(r.MaChot) === String(maChot); })[0];
  if (!k) throw new Error('Không tìm thấy kỳ chốt ' + maChot + '.');
  return k;
}
function chotDongCT_(maChot) {
  return docSheetBaoDam_(SHEET_CHOT_LAI_CT).filter(function (r) { return String(r.MaChot) === String(maChot); }).map(function (r) {
    return { thang: chuanThang_(r.Thang), maHoSo: String(r.MaHoSo), soHopDong: r.SoHopDong, tenCty: r.TenCty, loaiTien: r.LoaiTien, soNgay: Number(r.SoNgay) || 0, duNoBinhQuan: Number(r.DuNoBinhQuan) || 0, laiSuat: Number(r.LaiSuat) || 0,
      lai: Number(r.Lai) || 0, laiPhat: Number(r.LaiPhat) || 0, tyGia: r.TyGia === '' ? null : Number(r.TyGia), quyDoiVND: r.QuyDoiVND === '' ? null : Number(r.QuyDoiVND) };
  });
}
/** Chi tiết 1 kỳ chốt + phần lệch so với số tính lại hiện tại (chỉ so sánh; không ghi gì). */
function layChiTietChotLai(maChot) {
  yeuCauDangNhap_(); chotChanGioiHanCongTy_();
  var ky = chotTomTat_(chotLayKy_(maChot)), dong = chotDongCT_(maChot), lech = [];
  if (ky.trangThai === CHOT_HIEU_LUC) {
    var hienTai = layBaoCaoTienLai({ tuNgay: ky.tuNgay, denNgay: ky.denNgay, loaiTien: ky.loaiTien, baoGomLaiPhat: ky.baoGomLaiPhat }), cu = {}, moi = {};
    dong.forEach(function (d) { cu[d.thang + '|' + d.maHoSo] = d; });
    hienTai.chiTiet.forEach(function (d) { moi[d.thang + '|' + d.maHoSo] = d; });
    Object.keys(cu).concat(Object.keys(moi).filter(function (k) { return !cu[k]; })).forEach(function (k) {
      var a = cu[k], b = moi[k], laiA = a ? a.lai : 0, laiB = b ? b.lai : 0, phatA = a ? a.laiPhat : 0, phatB = b ? (b.laiPhat || 0) : 0;
      if (laiA !== laiB || phatA !== phatB) lech.push({ thang: (a || b).thang, maHoSo: (a || b).maHoSo, loaiTien: (a || b).loaiTien, laiDaChot: laiA, laiHienTai: laiB, laiPhatDaChot: phatA, laiPhatHienTai: phatB });
    });
  }
  return { ky: ky, dong: dong, lech: lech, coLech: lech.length > 0 };
}
/** Hủy chốt (không xoá): bắt buộc lý do. */
function huyChotLai(maChot, lyDo) {
  yeuCauDangNhap_(); yeuCauQuanTri_('hủy chốt báo cáo tiền lãi'); chotChanGioiHanCongTy_();
  var ly = String(lyDo || '').trim(); if (ly.length < 5) throw new Error('Nhập lý do hủy chốt (tối thiểu 5 ký tự).');
  var me = layDanhTinh_().email || emailNguoiDung_();
  return voiKhoa_(function () {
    var ky = chotLayKy_(maChot); if (ky.TrangThai !== CHOT_HIEU_LUC) throw new Error('Kỳ ' + maChot + ' đã được hủy chốt trước đó.');
    capNhatDongTheoMa_(SHEET_CHOT_LAI, 'MaChot', maChot, { TrangThai: CHOT_HUY, LyDoHuy: lamSachCongThuc_(ly.substring(0, 300)), NguoiHuy: me, ThoiDiemHuy: new Date() });
    ghiNhatKy_('', 'HUY_CHOT_BAO_CAO_LAI', maChot + ' | ' + ly.substring(0, 100));
    return { ok: true, maChot: maChot };
  });
}

/* ------------------------------ XUẤT EXCEL / PDF ------------------------------ */
/**
 * Dựng file tạm từ các sheet { ten, dong: [[...]] } và trả { tenFile, mime, base64 }. File tạm luôn được bỏ vào thùng rác.
 */
function xuatBangRaFile_(tenFile, cacSheet, dinhDang) {
  var dd = String(dinhDang || 'xlsx').toLowerCase(); if (dd !== 'xlsx' && dd !== 'pdf') throw new Error('Định dạng xuất phải là xlsx hoặc pdf.');
  var tong = cacSheet.reduce(function (a, s) { return a + s.dong.length; }, 0);
  if (tong > XUAT_SO_DONG_TOI_DA_) throw new Error('Quá nhiều dòng để xuất (' + tong + ' > ' + XUAT_SO_DONG_TOI_DA_ + '). Thu hẹp khoảng ngày hoặc xuất CSV.');
  var ss = SpreadsheetApp.create(tenFile);
  try {
    cacSheet.forEach(function (s, i) {
      var sh = i === 0 ? ss.getSheets()[0] : ss.insertSheet(s.ten);
      if (i === 0) sh.setName(s.ten);
      var rong = s.dong.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
      var luoi = s.dong.map(function (r) { var o = r.map(function (v) { return typeof v === 'string' ? lamSachCongThuc_(v) : (v === null || v === undefined ? '' : v); }); while (o.length < rong) o.push(''); return o; });
      if (luoi.length) sh.getRange(1, 1, luoi.length, rong).setValues(luoi);
    });
    SpreadsheetApp.flush();
    var q = dd === 'pdf' ? '?format=pdf&portrait=false&size=A4&fitw=true&gridlines=false' : '?format=xlsx';
    var resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export' + q, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) throw new Error('Không xuất được file ' + dd.toUpperCase() + ' (mã ' + resp.getResponseCode() + '). Thử lại sau hoặc dùng xuất CSV.');
    return { ok: true, tenFile: tenFile + '.' + dd, mime: dd === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: Utilities.base64Encode(resp.getBlob().getBytes()), soDong: tong };
  } finally {
    try { DriveApp.getFileById(ss.getId()).setTrashed(true); } catch (e) { /* file tạm: bỏ qua */ }
  }
}
function xuatTenAnToan_(s) { return String(s).replace(/[^A-Za-z0-9_\-]+/g, '_').substring(0, 60); }
function xuatDongLai_(r) {
  var tien = function (o) { return Object.keys(o || {}).sort().map(function (k) { return k + ' ' + o[k]; }).join(' · '); };
  return {
    hoSo: [['Mã hồ sơ', 'Số giấy nhận nợ', 'Số hợp đồng', 'Công ty', 'Loại tiền', 'Gốc khoản vay', 'Lãi suất %/năm', 'Từ ngày tính', 'Đến ngày tính', 'Số ngày', 'Dư nợ bình quân', 'Lãi trong hạn', 'Lãi quá hạn (ước tính)', 'Lãi đã trả trong kỳ', 'Quy đổi VND', 'Cảnh báo']]
      .concat(r.theoHoSo.map(function (x) { return [x.maHoSo, x.soGiayNhanNo, x.soHopDong, x.tenCty, x.loaiTien, x.goc, x.laiSuat, x.tuNgayTinh, x.denNgayTinh, x.soNgay, x.duNoBinhQuan, x.lai, x.laiPhat || 0, x.laiDaTra, x.quyDoiVND === null ? 'Thiếu tỷ giá' : x.quyDoiVND, x.canhBao || '']; })),
    hopDong: [['Số hợp đồng', 'Công ty', 'Số khoản', 'Lãi suất %/năm', 'Lãi trong hạn', 'Lãi quá hạn (ước tính)', 'Lãi đã trả', 'Quy đổi VND']]
      .concat(r.theoHopDong.map(function (x) { return [x.soHopDong, x.tenCty, x.soKhoan, x.laiSuat, tien(x.lai), tien(x.laiPhat), tien(x.laiDaTra), x.quyDoiVND === null || x.thieuTyGia ? 'Thiếu tỷ giá' : x.quyDoiVND]; })),
    thang: [['Tháng', 'Số ngày', 'Số khoản', 'Lãi trong hạn', 'Lãi quá hạn (ước tính)', 'Tỷ giá cuối tháng', 'Quy đổi VND']]
      .concat(r.theoThang.map(function (x) { return [x.thang.slice(5) + '/' + x.thang.slice(0, 4), x.soNgay, x.soKhoan, tien(x.lai), tien(x.laiPhat), x.tyGiaCuoiThang === null ? '' : x.tyGiaCuoiThang, x.quyDoiVND === null ? 'Thiếu tỷ giá' : x.quyDoiVND]; })),
    chiTiet: [['Tháng', 'Mã hồ sơ', 'Số hợp đồng', 'Loại tiền', 'Số ngày', 'Dư nợ bình quân', 'Lãi suất %/năm', 'Lãi trong hạn', 'Lãi quá hạn (ước tính)', 'Tỷ giá', 'Quy đổi VND']]
      .concat(r.chiTiet.map(function (c) { return [c.thang, c.maHoSo, c.soHopDong, c.loaiTien, c.soNgay, c.duNoBinhQuan, c.laiSuat, c.lai, c.laiPhat || 0, c.tyGia === null ? '' : c.tyGia, c.quyDoiVND === null ? 'Thiếu tỷ giá' : c.quyDoiVND]; }))
  };
}
/** Xuất báo cáo tiền lãi đang tính (hoặc kỳ đã chốt nếu có tt.maChot) ra Excel/PDF: tt = { tuNgay, denNgay, loaiTien?, baoGomLaiPhat?, dinhDang, maChot? }. */
function xuatBaoCaoLai(tt) {
  yeuCauDangNhap_(); tt = tt || {};
  var bc, nhan;
  if (tt.maChot) {
    chotChanGioiHanCongTy_();
    var ct = layChiTietChotLai(tt.maChot), ky = ct.ky;
    bc = { tuNgay: ky.tuNgay, denNgay: ky.denNgay, theoHoSo: [], theoHopDong: [], theoThang: [], chiTiet: ct.dong.map(function (d) { return { thang: d.thang, maHoSo: d.maHoSo, soHopDong: d.soHopDong, loaiTien: d.loaiTien, soNgay: d.soNgay, duNoBinhQuan: d.duNoBinhQuan, laiSuat: d.laiSuat, lai: d.lai, laiPhat: d.laiPhat, tyGia: d.tyGia, quyDoiVND: d.quyDoiVND }; }) };
    nhan = 'Chot_' + xuatTenAnToan_(ky.maChot);
    var dong = xuatDongLai_(bc);
    return xuatBangRaFile_(nhan, [{ ten: 'Thông tin kỳ chốt', dong: [['Mã chốt', ky.maChot], ['Tên kỳ', ky.tenKy], ['Từ ngày', ky.tuNgay], ['Đến ngày', ky.denNgay], ['Trạng thái', ky.trangThai], ['Người chốt', ky.nguoiChot], ['Thời điểm chốt', ky.thoiDiemChot], ['Ghi chú', ky.ghiChu]] }, { ten: 'Chi tiết đã chốt', dong: dong.chiTiet }], tt.dinhDang);
  }
  bc = layBaoCaoTienLai({ tuNgay: tt.tuNgay, denNgay: tt.denNgay, loaiTien: tt.loaiTien, baoGomLaiPhat: tt.baoGomLaiPhat });
  var d = xuatDongLai_(bc);
  return xuatBangRaFile_('TienLai_' + bc.tuNgay + '_' + bc.denNgay, [{ ten: 'Theo hồ sơ', dong: d.hoSo }, { ten: 'Theo hợp đồng', dong: d.hopDong }, { ten: 'Theo tháng', dong: d.thang }, { ten: 'Chi tiết tháng x hồ sơ', dong: d.chiTiet }], tt.dinhDang);
}
/** Xuất bảng theo dõi tất toán theo ngày của 1 hồ sơ ra Excel/PDF. */
function xuatTheoDoiTatToan(maHoSo, tuyChon, dinhDang) {
  yeuCauDangNhap_();
  var r = layTheoDoiTatToanTheoNgay(maHoSo, tuyChon || {});
  var dong = [['Ngày', 'Còn (ngày) đến hạn', 'Dư nợ gốc cuối ngày', 'Lãi trong ngày', 'Lãi lũy kế', 'Gốc trả', 'Lãi trả', 'Lãi phạt trả', 'Sự kiện', 'Dự kiến']]
    .concat(r.rows.map(function (x) { return [x.ngay, x.soNgayDenHan === null ? '' : x.soNgayDenHan, x.duNoGocCuoiNgay, x.laiNgay, x.laiLuyKe, x.gocTra, x.laiTra, x.phatTra, (x.suKien || []).join('; '), x.duKien ? 'Dự kiến' : '']; }));
  return xuatBangRaFile_('TatToan_' + xuatTenAnToan_(maHoSo) + '_' + r.tuNgay + '_' + r.denNgay, [{ ten: 'Theo dõi theo ngày', dong: dong }], dinhDang);
}
