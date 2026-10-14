/**
 * DATASYNC.GS — ĐỒNG BỘ DỮ LIỆU: revision theo miền, CacheManager, DataRepository đọc có chẩn đoán, API phong bì {ok,data,meta,error}.
 *
 * NGUYÊN TẮC
 *  • Dữ liệu giao dịch (HOSO) KHÔNG cache: đọc từ Sheet (nguồn thẩm quyền) mỗi lần.
 *  • Danh mục (CONGTY / HOPDONG / KHACHHANG) cache bằng CacheService, khoá có revision:
 *      HOSOVAY:V2:{phạm vi}:{miền}:{revision}   (TTL ngắn). Lưu dữ liệu → tangRevision_ → khoá mới → khoá cũ tự hết hạn.
 *    Chỉ miền bị đổi mới đổi khoá; không xoá cả cache.
 *  • Cache chỉ là bản sao đọc nhanh: không lưu giao dịch, không thay LockService, không lưu số tài khoản/token vào KHOÁ hay nhật ký.
 *  • Danh sách rỗng là kết quả HỢP LỆ — trả ngay, không đọc lại. Lỗi đọc là lỗi: trả error, không trả [] thay thế.
 *  • Sửa tay trực tiếp trên Sheet không đổi revision → danh mục có thể cũ tối đa TTL; nút "Làm mới" của giao diện bỏ qua cache.
 */

var MIEN_DU_LIEU_ = ['CONGTY', 'HOPDONG', 'KHACHHANG', 'HOSO'];
var CACHE_TTL_GIAY_ = 300;
var CACHE_TOI_DA_KY_TU_ = 90000; // CacheService: 100KB/giá trị; quá thì BYPASS (không cache), không lỗi
var CACHE_TIEN_TO_ = 'HOSOVAY:V2:';

/** Cấu hình miền → tên sheet + có cache hay không (tạo lúc gọi vì hằng SHEET_* nằm ở file khác). */
function cauHinhMien_() {
  return {
    CONGTY: { sheet: SHEET_CONGTY, cache: true },
    HOPDONG: { sheet: SHEET_HOPDONG, cache: true },
    KHACHHANG: { sheet: SHEET_KHACHHANG, cache: true },
    HOSO: { sheet: SHEET_HOSO, cache: false }
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// REVISION THEO MIỀN (Script Properties). tangRevision_ PHẢI được gọi khi đang giữ khoá ghi (voiKhoa_ hoặc khoá phát hành).
// ---------------------------------------------------------------------------------------------------------------------
function docRevision_(mien) {
  try { return parseInt(PropertiesService.getScriptProperties().getProperty('REV_' + mien) || '0', 10) || 0; } catch (e) { return 0; }
}
function tangRevision_(mien) {
  var p = PropertiesService.getScriptProperties(), moi = docRevision_(mien) + 1;
  p.setProperty('REV_' + mien, String(moi));
  return moi;
}
function layTatCaRevision_() {
  var kq = {};
  MIEN_DU_LIEU_.forEach(function (m) { kq[m] = docRevision_(m); });
  return kq;
}

// ---------------------------------------------------------------------------------------------------------------------
// CACHE MANAGER
// ---------------------------------------------------------------------------------------------------------------------
function phamViCache_() {
  // Phạm vi truy cập: hiện 1 công ty → 'ALL'. Khi cổng HAK cấp phạm vi công ty, mỗi tập công ty có khoá riêng (không dùng chung dữ liệu).
  try {
    var dt = layDanhTinh_();
    if (dt && dt.congTy && dt.congTy.length) return 'CT-' + dt.congTy.slice().sort().join('+');
  } catch (e) { /* không xác định được → phạm vi chung */ }
  return 'ALL';
}
function khoaCache_(mien, revision) { return CACHE_TIEN_TO_ + phamViCache_() + ':' + mien + ':' + revision; }

/** @return {{trangThai:'HIT'|'MISS', du_lieu:Array|null}} */
function cacheDoc_(mien, revision) {
  try {
    var raw = CacheService.getScriptCache().get(khoaCache_(mien, revision));
    if (raw) return { trangThai: 'HIT', duLieu: JSON.parse(raw) };
  } catch (e) { /* cache hỏng/bị đẩy ra → coi như MISS */ }
  return { trangThai: 'MISS', duLieu: null };
}
/** @return {boolean} true nếu đã cache; false nếu quá lớn/không ghi được (BYPASS). */
function cacheGhi_(mien, revision, duLieu) {
  try {
    var s = JSON.stringify(duLieu);
    if (s.length > CACHE_TOI_DA_KY_TU_) return false;
    CacheService.getScriptCache().put(khoaCache_(mien, revision), s, CACHE_TTL_GIAY_);
    return true;
  } catch (e) { return false; }
}

// ---------------------------------------------------------------------------------------------------------------------
// ĐÓNG GÓI AN TOÀN CHO TRÌNH DUYỆT (đệ quy): Date/NaN/Infinity/hàm làm google.script.run trả null/rỗng
// ---------------------------------------------------------------------------------------------------------------------
function anToanChoTrinhDuyet_(v, sau) {
  sau = sau || 0;
  if (v === null || v === undefined) return v === undefined ? null : v;
  var kieu = typeof v;
  if (kieu === 'function') return null;
  if (kieu === 'number') return isFinite(v) ? v : '';
  if (kieu !== 'object') return v;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  }
  if (sau > 20) return null;
  if (Array.isArray(v)) return v.map(function (x) { return anToanChoTrinhDuyet_(x, sau + 1); });
  var out = {};
  Object.keys(v).forEach(function (k) {
    var g = anToanChoTrinhDuyet_(v[k], sau + 1);
    if (typeof v[k] !== 'function') out[k] = g;
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// DATA REPOSITORY: đọc 1 miền (cache cho danh mục)
// ---------------------------------------------------------------------------------------------------------------------
/**
 * @param {string} mien
 * @param {{boQuaCache:boolean}=} tuyChon
 * @return {{rows:Array, cache:string, revision:number, ms:number}}
 */
function docMien_(mien, tuyChon) {
  tuyChon = tuyChon || {};
  var ch = cauHinhMien_()[mien];
  if (!ch) throw new Error('Miền dữ liệu không hợp lệ: ' + mien);
  var t0 = Date.now(), rev = docRevision_(mien), trangThai = 'BYPASS', rows = null;
  if (ch.cache && !tuyChon.boQuaCache) {
    var c = cacheDoc_(mien, rev);
    if (c.trangThai === 'HIT') { rows = c.duLieu; trangThai = 'HIT'; } else trangThai = 'MISS';
  }
  if (rows === null) {
    rows = mien === 'HOSO' ? docDanhSachHoSo_(false) : sheetToObjects_(ch.sheet);
    rows = anToanChoTrinhDuyet_(rows);
    if (ch.cache && !tuyChon.boQuaCache && !cacheGhi_(mien, rev, rows)) trangThai = 'BYPASS';
  }
  return { rows: rows, cache: trangThai, revision: rev, ms: Date.now() - t0 };
}

// ---------------------------------------------------------------------------------------------------------------------
// PHONG BÌ API
// ---------------------------------------------------------------------------------------------------------------------
function maLoiTuThongBao_(thongBao) {
  var m = String(thongBao || '');
  if (/^XUNG_DOT_PHIEN_BAN/.test(m)) return 'XUNG_DOT_PHIEN_BAN';
  if (/CONG_CHUA_CAU_HINH/.test(m)) return 'CONG_CHUA_CAU_HINH';
  if (/quyền/i.test(m)) return 'KHONG_CO_QUYEN';
  if (/Không tìm thấy tab/.test(m)) return 'THIEU_SHEET';
  if (/cấu trúc/i.test(m)) return 'LOI_CAU_TRUC';
  if (/đang xử lý một thao tác khác|thử lại/i.test(m)) return 'HE_THONG_BAN';
  return 'LOI_MAY_CHU';
}

/** Chạy fn(meta) → { ok, data, meta, error }. Không ném lỗi ra ngoài: giao diện luôn nhận 1 đối tượng hợp lệ. */
function phongBi_(hanhDong, fn) {
  var t0 = Date.now(), meta = { idYeuCau: Utilities.getUuid().slice(0, 8), hanhDong: hanhDong, cache: {}, phienBanDoc: {}, soBanGhi: {}, thoiGianMs: {} };
  try {
    var data = fn(meta);
    meta.tongMs = Date.now() - t0;
    meta.thoiDiem = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
    meta.revisions = layTatCaRevision_();
    return { ok: true, data: anToanChoTrinhDuyet_(data), meta: meta, error: null };
  } catch (e) {
    meta.tongMs = Date.now() - t0;
    var tb = String((e && e.message) || e);
    return { ok: false, data: null, meta: meta, error: { ma: maLoiTuThongBao_(tb), thongBao: tb } };
  }
}

/**
 * MỘT lượt gọi nạp dữ liệu cho cả giao diện.
 * @param {{mien:string[], boQuaCache:boolean}=} tuyChon  mien: chỉ nạp các miền này (mặc định tất cả)
 */
function layDuLieuKhoiTao(tuyChon) {
  yeuCauDangNhap_();
  tuyChon = tuyChon || {};
  var dsMien = (tuyChon.mien && tuyChon.mien.length ? tuyChon.mien : MIEN_DU_LIEU_).filter(function (m) { return MIEN_DU_LIEU_.indexOf(m) >= 0; });
  return phongBi_('layDuLieuKhoiTao', function (meta) {
    var data = { ngay: layNgayHomNay() };
    var khoaTen = { CONGTY: 'congTy', HOPDONG: 'hopDong', KHACHHANG: 'khachHang', HOSO: 'hoSoGoc' };
    dsMien.forEach(function (m) {
      var r = docMien_(m, { boQuaCache: !!tuyChon.boQuaCache });
      data[khoaTen[m]] = r.rows;
      meta.cache[m] = r.cache; meta.phienBanDoc[m] = r.revision; meta.soBanGhi[m] = r.rows.length; meta.thoiGianMs[m] = r.ms;
    });
    return data;
  });
}

/** Rẻ (chỉ đọc 4 số): giao diện hỏi định kỳ khi quay lại tab để biết dữ liệu có bị phiên khác đổi không. */
function layRevisionDuLieu() {
  yeuCauDangNhap_();
  return phongBi_('layRevisionDuLieu', function () { return layTatCaRevision_(); });
}
