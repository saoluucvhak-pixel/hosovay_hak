/**
 * PHANTRANG.GS — danh sách hồ sơ PHÂN TRANG PHÍA MÁY CHỦ + tổng quan hồ sơ (không tải toàn bộ hồ sơ xuống trình duyệt).
 *
 * CHIẾN LƯỢC ĐỌC (Google Sheets không có chỉ mục/truy vấn): mỗi trang cần quét toàn bộ tập hồ sơ để lọc/sắp xếp/đếm, nên ta dựng một
 * "CHỈ MỤC PHỤ" gọn (mảng 12 trường/hồ sơ) từ sheet HoSoGiaiNgan và lưu vào CacheService THEO PHIÊN BẢN `REV_HOSO` (khoá có số revision → mọi lần ghi
 * hồ sơ làm khoá cũ vô hiệu, không bao giờ trả dữ liệu cũ sau khi ghi qua WebApp). Cache bị mất/hết hạn → đọc lại sheet (nguồn chính thức).
 * Trang trả về chỉ gồm tối đa 100 dòng; chi tiết hồ sơ chỉ nạp khi mở (layDuLieuDayDu). Dữ liệu sửa TRỰC TIẾP trên Google Sheets (ngoài WebApp)
 * không đổi revision → hiển thị sau tối đa CACHE_TTL_GIAY_ (5 phút) hoặc khi người dùng bấm "Làm mới" (boQuaCache).
 */
var CACHE_CHI_MUC_KY_TU_ = 80000;           // mỗi mảnh cache < 100KB
var SO_DONG_TRANG_HOP_LE_ = [20, 30, 50, 100];
var COT_SAP_XEP_HOSO_ = { ngayCapNhat: 1, maHoSo: 1, soTien: 1, ngayGiaiNgan: 1, trangThai: 1, tenCty: 1, soHopDong: 1, soGiayNhanNo: 1, loaiTien: 1, ngayDenHan: 1 };
// vị trí trường trong 1 bản ghi chỉ mục
var CM_ = { MA: 0, HD: 1, GNN: 2, NGAY_GN: 3, NGAY_DH: 4, LOAI: 5, TIEN: 6, TT: 7, REV: 8, ROW: 9, CAP_NHAT: 10, NGUOI: 11, TAT_TOAN: 12 };

function ngayIsoCuaO_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (v instanceof Date) { // getter theo múi giờ của dự án (appsscript.json = Asia/Ho_Chi_Minh): nhanh hơn Utilities.formatDate khi dựng chỉ mục hàng chục nghìn dòng
    if (isNaN(v.getTime())) return '';
    var m = v.getMonth() + 1, d = v.getDate(); return v.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  var s = String(v).trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}
function ngayHienThiCuaIso_(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }

/** Dựng chỉ mục từ sheet (đọc 1 lần). Bỏ hồ sơ đã xoá mềm và khoá trùng (giữ dòng đầu, như các hàm tra cứu). */
function dungChiMucHoSo_() {
  var ds = docDanhSachHoSo_(false), thay = {}, kq = [];
  ds.forEach(function (h) {
    var id = String(h.MaHoSo); if (thay[id]) return; thay[id] = true;
    var cl = h.CapNhatLuc instanceof Date ? h.CapNhatLuc.getTime() : (h.CapNhatLuc ? (new Date(h.CapNhatLuc).getTime() || 0) : 0);
    kq.push([id, String(h.MaHD || ''), String(h.SoGiayNhanNo || ''), ngayIsoCuaO_(h.NgayGiaiNgan), ngayIsoCuaO_(h.NgayDenHan),
      String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND', Number(h.SoTienNhanNoLanNay) || 0, String(h.TrangThai || TT_NHAP), soRevision_(h), h._row || 0, cl, String(h.CapNhatBoi || ''), daTatToanHoSo_(h)]);
  });
  return kq;
}

function khoaChiMuc_(rev) { return CACHE_TIEN_TO_ + 'ALL:HOSO_IDX_V2:' + rev; }

/** Ghi chỉ mục vào cache theo mảnh; trả true nếu ghi đủ. */
function cacheGhiChiMuc_(rev, chiMuc) {
  try {
    var cache = CacheService.getScriptCache(), manh = [], cur = [], len = 0;
    chiMuc.forEach(function (r) {
      var s = JSON.stringify(r);
      if (len + s.length + 1 > CACHE_CHI_MUC_KY_TU_ && cur.length) { manh.push(cur); cur = []; len = 0; }
      cur.push(r); len += s.length + 1;
    });
    manh.push(cur);
    manh.forEach(function (m, i) { cache.put(khoaChiMuc_(rev) + ':' + i, JSON.stringify(m), CACHE_TTL_GIAY_); });
    cache.put(khoaChiMuc_(rev) + ':n', String(manh.length), CACHE_TTL_GIAY_);
    return true;
  } catch (e) { return false; }
}
function cacheDocChiMuc_(rev) {
  try {
    var cache = CacheService.getScriptCache(), n = parseInt(cache.get(khoaChiMuc_(rev) + ':n') || '0', 10);
    if (!n) return null;
    var kq = [];
    for (var i = 0; i < n; i++) {
      var raw = cache.get(khoaChiMuc_(rev) + ':' + i);
      if (!raw) return null; // thiếu mảnh → coi như MISS
      kq = kq.concat(JSON.parse(raw));
    }
    return kq;
  } catch (e) { return null; }
}

/** @return {{ds:Array, cache:'HIT'|'MISS'|'BYPASS', revision:number}} */
function layChiMucHoSo_(boQuaCache) {
  var rev = docRevision_('HOSO');
  if (!boQuaCache) { var c = cacheDocChiMuc_(rev); if (c) return { ds: c, cache: 'HIT', revision: rev }; }
  var ds = dungChiMucHoSo_();
  var ghi = cacheGhiChiMuc_(rev, ds);
  return { ds: ds, cache: ghi ? 'MISS' : 'BYPASS', revision: rev };
}

/** Danh bạ hợp đồng + công ty cho 1 lượt (danh mục nhỏ, có cache theo revision). */
function layTraCuuDanhMuc_() {
  var hd = docMien_('HOPDONG').rows, cty = docMien_('CONGTY').rows, hdMa = {}, ctyMa = {};
  hd.forEach(function (h) { if (!hdMa[String(h.MaHD)]) hdMa[String(h.MaHD)] = h; });
  cty.forEach(function (c) { if (!ctyMa[String(c.MaCty)]) ctyMa[String(c.MaCty)] = c; });
  return { hd: hdMa, cty: ctyMa };
}

/** Phạm vi công ty của người dùng (cổng HAK cấp); rỗng = tất cả. Không trả dữ liệu ngoài phạm vi. */
function phamViCongTyNguoiDung_() {
  try { var dt = layDanhTinh_(); return (dt && dt.congTy && dt.congTy.length) ? dt.congTy.map(String) : []; } catch (e) { return []; }
}

function banGhiTrangHoSo_(r, tra) {
  var hd = tra.hd[r[CM_.HD]], cty = hd ? tra.cty[String(hd.MaCty)] : null;
  return {
    maHoSo: r[CM_.MA], tenCty: cty ? cty.TenCty : '(không rõ công ty)', maCty: hd ? String(hd.MaCty) : '', maHD: r[CM_.HD], soHopDong: hd ? hd.SoHopDong : '', tenNganHang: hd ? (hd.TenNganHang || '') : '',
    soGiayNhanNo: r[CM_.GNN], ngayGiaiNgan: ngayHienThiCuaIso_(r[CM_.NGAY_GN]), ngayDenHan: ngayHienThiCuaIso_(r[CM_.NGAY_DH]), loaiTien: r[CM_.LOAI], soTien: r[CM_.TIEN],
    daTatToan: !!r[CM_.TAT_TOAN], trangThai: r[CM_.TT], revision: r[CM_.REV], nguoiXuLy: r[CM_.NGUOI], ngayCapNhat: r[CM_.CAP_NHAT] ? Utilities.formatDate(new Date(r[CM_.CAP_NHAT]), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') : '', _row: r[CM_.ROW]
  };
}

/**
 * Trang hồ sơ (tìm kiếm/lọc/sắp xếp/phân trang ở máy chủ).
 * @param {{page:number, pageSize:number, search:string, filters:Object, sortBy:string, sortDir:string, boQuaCache:boolean}=} tuyChon
 *   filters: { trangThai:string|string[], loaiTien:'VND'|'USD', maCty, maHD, tuNgay, denNgay (theo Ngày giải ngân; hồ sơ THIẾU ngày bị loại khi có lọc ngày), thieuNgay:boolean, tenNguoiHuong }
 * @return {{success:boolean, data:Array, pagination:{page,pageSize,totalRows,totalPages}, revision:string, revisionSo:number, tongTheoLoaiTien:{VND:number,USD:number}, cache:string}}
 */
function layTrangHoSo(tuyChon) {
  yeuCauDangNhap_();
  return layTrangHoSo_(tuyChon);
}
function getHoSoPage(tuyChon) { return layTrangHoSo(tuyChon); } // tên theo đặc tả API

function layTrangHoSo_(tuyChon) {
  tuyChon = tuyChon || {};
  var f = tuyChon.filters || {};
  var boLoc = taoBoLocHoSoHak_(f, tuyChon.search);
  var pageSize = SO_DONG_TRANG_HOP_LE_.indexOf(Number(tuyChon.pageSize)) >= 0 ? Number(tuyChon.pageSize) : 30;
  var sortBy = COT_SAP_XEP_HOSO_[tuyChon.sortBy] ? tuyChon.sortBy : 'ngayCapNhat', huong = String(tuyChon.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  var chiMuc = layChiMucHoSo_(!!tuyChon.boQuaCache), tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_();

  var khopNguoiHuong = null;
  if (f.tenNguoiHuong) { // đọc sheet chi tiết CHỈ khi dùng bộ lọc này (đắt hơn) — kết quả giới hạn theo từ khoá
    var kh = chuanKhongDau_(f.tenNguoiHuong); khopNguoiHuong = {};
    sheetToObjects_(SHEET_CHITIET).forEach(function (c) { if (chuanKhongDau_(c.TenNguoiHuong).indexOf(kh) >= 0) khopNguoiHuong[String(c.MaHoSo)] = true; });
  }
  var tong = { VND: 0, USD: 0 }, ds = [];
  chiMuc.ds.forEach(function (r) {
    var hd = tra.hd[r[CM_.HD]];
    if (pv.length && (!hd || pv.indexOf(String(hd.MaCty)) < 0)) return;
    ds.push(r);
  });
  ds = HAK_SF_.filterRows(ds, boLoc.config, boLoc.state, { tra: tra, nguoi: khopNguoiHuong }).rows;
  ds.forEach(function (r) {
    tong[r[CM_.LOAI]] = congSoTien_(tong[r[CM_.LOAI]], r[CM_.TIEN]);
  });

  var khoa = function (r) {
    switch (sortBy) {
      case 'maHoSo': return r[CM_.MA]; case 'soTien': return r[CM_.TIEN]; case 'ngayGiaiNgan': return r[CM_.NGAY_GN]; case 'ngayDenHan': return r[CM_.NGAY_DH]; case 'trangThai': return r[CM_.TT];
      case 'loaiTien': return r[CM_.LOAI]; case 'soGiayNhanNo': return chuanKhongDau_(r[CM_.GNN]);
      case 'tenCty': var h = tra.hd[r[CM_.HD]], c = h ? tra.cty[String(h.MaCty)] : null; return chuanKhongDau_(c ? c.TenCty : '');
      case 'soHopDong': var h2 = tra.hd[r[CM_.HD]]; return chuanKhongDau_(h2 ? h2.SoHopDong : '');
      default: return r[CM_.CAP_NHAT] || 0; // ngayCapNhat (thiếu → xếp cuối khi giảm dần)
    }
  };
  var kv = ds.map(function (r) { return { r: r, k: khoa(r) }; });
  kv.sort(function (a, b) {
    var c = a.k < b.k ? -1 : (a.k > b.k ? 1 : 0);
    if (c) return c * huong;
    return (b.r[CM_.ROW] - a.r[CM_.ROW]); // cùng khoá: dòng mới hơn trước (ổn định, cho kết quả lặp lại được)
  });

  var tongDong = kv.length, tongTrang = Math.max(1, Math.ceil(tongDong / pageSize));
  var page = Math.min(Math.max(1, parseInt(tuyChon.page, 10) || 1), tongTrang); // vượt cuối → trang cuối (dữ liệu vừa giảm)
  var dong = kv.slice((page - 1) * pageSize, page * pageSize).map(function (x) { return banGhiTrangHoSo_(x.r, tra); });
  return { success: true, data: dong, pagination: { page: page, pageSize: pageSize, totalRows: tongDong, totalPages: soTrang_(tongDong, pageSize) },
    revision: 'HOSO:' + chiMuc.revision, revisionSo: chiMuc.revision, tongTheoLoaiTien: tong, phamViLoc: HAK_SF_.scopeText(boLoc.config, boLoc.state), cache: chiMuc.cache };
}
function soTrang_(tongDong, pageSize) { return tongDong === 0 ? 0 : Math.ceil(tongDong / pageSize); }

/** Tổng quan: đếm theo trạng thái/loại tiền + 8 hồ sơ gần nhất — tính ở máy chủ, KHÔNG gửi cả danh sách hồ sơ. */
function layTongQuanHoSo(tuyChon) {
  yeuCauDangNhap_();
  tuyChon = tuyChon || {};
  var chiMuc = layChiMucHoSo_(!!tuyChon.boQuaCache), tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_();
  var ds = chiMuc.ds.filter(function (r) { if (!pv.length) return true; var h = tra.hd[r[CM_.HD]]; return h && pv.indexOf(String(h.MaCty)) >= 0; });
  var kq = { tongHoSo: ds.length, daGiaiNgan: 0, daHuy: 0, choXuLy: 0, hoSoVND: 0, hoSoUSD: 0, theoTrangThai: {} };
  ds.forEach(function (r) {
    if (r[CM_.LOAI] === 'USD') kq.hoSoUSD++; else kq.hoSoVND++;
    if (r[CM_.TT] === TT_DA_GIAI_NGAN) kq.daGiaiNgan++; else if (r[CM_.TT] === TT_DA_HUY) kq.daHuy++;
    kq.theoTrangThai[r[CM_.TT]] = (kq.theoTrangThai[r[CM_.TT]] || 0) + 1;
  });
  kq.choXuLy = kq.tongHoSo - kq.daGiaiNgan - kq.daHuy;
  kq.ganDay = ds.slice().sort(function (a, b) { return b[CM_.ROW] - a[CM_.ROW]; }).slice(0, 8).map(function (r) { return banGhiTrangHoSo_(r, tra); });
  var hoSoTheoDoi=docDanhSachHoSo_(false);
  var traMap = tongTraGocTheoHoSo_(docTraNo_());
  kq.ruiRoUSD = duLieuRuiRoKhoanVay_(hoSoTheoDoi, tra, pv, traMap);
  kq.tatToan = thongKeTatToan_(khoanVayTrongPhamVi_(hoSoTheoDoi, tra, pv), traMap);
  kq.canhBao = layCanhBaoKhoanVay_(khoanVayTrongPhamVi_(hoSoTheoDoi, tra, pv), traMap);
  kq.quanLyVay = typeof tongQuanQuanLyVay_ === 'function' ? tongQuanQuanLyVay_(hoSoTheoDoi, tra, docTraNo_()) : null;
  // Cảnh báo Drive sắp đầy: đi kèm Tổng quan (không thêm lượt gọi máy chủ); chỉ tài khoản toàn hệ thống và chỉ khi ≥ ngưỡng.
  if (!pv.length && typeof luuTruDungLuongDrive_ === 'function') { try { var dl = luuTruDungLuongDrive_(); if (dl.canhBao) kq.dungLuong = { canhBao: dl.canhBao, tyLe: dl.tyLe, thongBao: 'Drive đã dùng ' + Math.round(dl.tyLe * 100) + '% dung lượng' + (dl.canhBao === 'NGUY_HIEM' ? ' — sắp đầy, tệp mới có thể không tải lên được.' : '. Cân nhắc lưu trữ năm cũ và dọn tệp.') }; } catch (eDl) { /* cảnh báo phụ */ } }
  kq.revision = 'HOSO:' + chiMuc.revision; kq.revisionSo = chiMuc.revision; kq.cache = chiMuc.cache;
  return kq;
}
