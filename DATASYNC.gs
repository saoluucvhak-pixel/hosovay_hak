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
/**
 * @param {*} v @param {number=} sau @param {string=} duongDan  vị trí để báo lỗi chẩn đoán  @param {Array=} canhBao  nhận danh sách giá trị KHÔNG đóng gói được (Date sai, NaN, Infinity)
 * Giá trị hỏng được thay bằng '' (không làm hỏng cả phản hồi) NHƯNG được ghi vào canhBao để API đánh dấu isComplete=false — không giả vờ thành công.
 */
function anToanChoTrinhDuyet_(v, sau, duongDan, canhBao) {
  sau = sau || 0; duongDan = duongDan || '';
  if (v === null || v === undefined) return v === undefined ? null : v;
  var kieu = typeof v;
  if (kieu === 'function') return null;
  if (kieu === 'number') { if (isFinite(v)) return v; if (canhBao) canhBao.push(duongDan + ' = ' + v); return ''; }
  if (kieu !== 'object') return v;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) { if (canhBao) canhBao.push(duongDan + ' = Date không hợp lệ'); return ''; }
    return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  }
  if (sau > 20) return null;
  if (Array.isArray(v)) return v.map(function (x, i) { return anToanChoTrinhDuyet_(x, sau + 1, duongDan + '[' + i + ']', canhBao); });
  var out = {};
  Object.keys(v).forEach(function (k) {
    if (typeof v[k] === 'function') return;
    var dd = duongDan + (duongDan && v._row && sau === 1 ? '' : '') + '.' + k;
    out[k] = anToanChoTrinhDuyet_(v[k], sau + 1, sau === 1 && v._row ? duongDan.replace(/\[\d+\]$/, '') + '[dòng ' + v._row + '].' + k : dd, canhBao);
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
var canhBaoDongGoi_ = []; // cảnh báo gom trong 1 lượt phongBi_
/**
 * Khoá trùng trong Sheet (vd MaHD=HD012 xuất hiện 2 dòng) KHÔNG được làm sập cả giao diện: giữ dòng ĐẦU (đúng dòng mà các hàm tra cứu phía máy chủ dùng),
 * bỏ các dòng sau khỏi lượt trả về và báo rõ dòng nào trùng để người dùng sửa trên Google Sheets. Không sửa/xoá dữ liệu trong Sheet.
 */
var KHOA_MIEN_ = { CONGTY: 'MaCty', HOPDONG: 'MaHD', KHACHHANG: 'MaKH', HOSO: 'MaHoSo' };
function loaiTrungKhoa_(rows, mien, tenSheet, canhBao) {
  var k = KHOA_MIEN_[mien]; if (!k || !rows) return rows;
  var thay = {}, kq = [];
  rows.forEach(function (r) {
    var v = r ? r[k] : '';
    if (v === undefined || v === null || v === '') { kq.push(r); return; }
    var id = String(v);
    if (thay[id] === undefined) { thay[id] = r._row || ''; kq.push(r); return; }
    canhBao.push('TRÙNG KHOÁ ' + tenSheet + ': ' + k + '=' + id + ' ở dòng ' + thay[id] + ' và dòng ' + (r._row || '?') + ' (đang dùng dòng ' + thay[id] + ', bỏ qua dòng ' + (r._row || '?') + ' — hãy xoá/sửa mã trùng trên Google Sheets)');
  });
  return kq;
}

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
    var cb = [];
    rows = loaiTrungKhoa_(rows, mien, ch.sheet, cb);
    rows = anToanChoTrinhDuyet_(rows, 0, mien, cb);
    canhBaoDongGoi_ = canhBaoDongGoi_.concat(cb);
    if (ch.cache && !tuyChon.boQuaCache) { if (cb.length || !cacheGhi_(mien, rev, rows)) trangThai = 'BYPASS'; } // dữ liệu có giá trị hỏng KHÔNG được cache (để mỗi lần đều cảnh báo)
  }
  return { rows: rows, cache: trangThai, revision: rev, ms: Date.now() - t0 };
}

// ---------------------------------------------------------------------------------------------------------------------
// PHONG BÌ API
// ---------------------------------------------------------------------------------------------------------------------
function maLoiTuThongBao_(thongBao) {
  var m = String(thongBao || '');
  if (/^XUNG_DOT_PHIEN_BAN/.test(m)) return 'XUNG_DOT_PHIEN_BAN';
  if (/^\[AUTH\]/.test(m)) return 'CHUA_DANG_NHAP';
  if (/^\[QUYEN\]/.test(m)) return 'KHONG_CO_QUYEN';
  if (/^THIEU_REVISION/.test(m)) return 'THIEU_REVISION';
  if (/^REVISION_KHONG_HOP_LE/.test(m)) return 'REVISION_KHONG_HOP_LE';
  if (/^CO_TAI_LIEU/.test(m)) return 'CO_TAI_LIEU';
  if (/CONG_CHUA_CAU_HINH/.test(m)) return 'CONG_CHUA_CAU_HINH';
  if (/quyền/i.test(m)) return 'KHONG_CO_QUYEN';
  if (/Không tìm thấy tab/.test(m)) return 'THIEU_SHEET';
  if (/cấu trúc/i.test(m)) return 'LOI_CAU_TRUC';
  if (/đang xử lý một thao tác khác|thử lại/i.test(m)) return 'HE_THONG_BAN';
  return 'LOI_MAY_CHU';
}

// ---------------------------------------------------------------------------------------------------------------------
// LOG CÓ CẤU TRÚC (INFO / WARN / ERROR / SECURITY)
// ---------------------------------------------------------------------------------------------------------------------
var _reqIdLog_ = '', _userLog_ = '';
var KHOA_LOG_LOI_ = 'HOSOVAY:V2:LOGLOI';

/** Che dữ liệu nhạy cảm trong thông điệp log: chuỗi hex dài (token/phiên), dãy 9–12 chữ số (CCCD/CMND/TK), cắt tối đa 200 ký tự. */
function cheLog_(v) {
  return String(v === undefined || v === null ? '' : v).replace(/[0-9a-fA-F]{32,}/g, '[token]').replace(/\b\d{9,12}\b/g, '[so]').slice(0, 200);
}

/**
 * Ghi 1 dòng log JSON: { ts, level, requestId, user, module, action, code, ms, revSau, msg }. KHÔNG bao giờ ghi tham số API, mật khẩu, token, số tiền, CCCD.
 * ERROR/SECURITY được giữ thêm trong bộ nhớ đệm vòng (100 sự kiện gần nhất, 6 giờ) để quản trị xem ở layNhatKyLoiGanDay.
 */
function ghiLog_(level, module, action, code, chiTiet) {
  var c = chiTiet || {}, e = {
    ts: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ss"), level: level, requestId: _reqIdLog_, user: _userLog_, module: module, action: action, code: code || ''
  };
  if (c.ms !== undefined) e.ms = c.ms;
  if (c.revSau !== undefined) e.revSau = c.revSau;
  if (c.msg) e.msg = cheLog_(c.msg);
  var dong = JSON.stringify(e);
  try {
    if (level === 'ERROR') console.error(dong); else if (level === 'WARN' || level === 'SECURITY') console.warn(dong); else console.log(dong);
    if (level === 'ERROR' || level === 'SECURITY') {
      var cache = CacheService.getScriptCache(), cu = [];
      try { cu = JSON.parse(cache.get(KHOA_LOG_LOI_) || '[]'); } catch (x) { cu = []; }
      cu.push(e); if (cu.length > 100) cu = cu.slice(cu.length - 100);
      cache.put(KHOA_LOG_LOI_, JSON.stringify(cu), 21600);
    }
  } catch (x) { /* log không được làm hỏng nghiệp vụ */ }
}

/** Quản trị: 100 sự kiện ERROR/SECURITY gần nhất (mới nhất trước). Không chứa dữ liệu nghiệp vụ. */
function layNhatKyLoiGanDay() {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem nhật ký lỗi');
  var cu = []; try { cu = JSON.parse(CacheService.getScriptCache().get(KHOA_LOG_LOI_) || '[]'); } catch (e) { cu = []; }
  return cu.reverse();
}

/** Chạy fn(meta) → { ok, data, meta, error }. Không ném lỗi ra ngoài: giao diện luôn nhận 1 đối tượng hợp lệ. */
function phongBi_(hanhDong, fn) {
  var t0 = Date.now(), meta = { requestId: '', idYeuCau: '', fetchedAt: '', source: 'sheets', isComplete: true, hanhDong: hanhDong, cache: {}, phienBanDoc: {}, soBanGhi: {}, thoiGianMs: {} };
  meta.idYeuCau = Utilities.getUuid().slice(0, 8); meta.requestId = meta.idYeuCau; canhBaoDongGoi_ = [];
  try {
    var data = fn(meta);
    meta.tongMs = Date.now() - t0;
    meta.thoiDiem = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
    meta.revisions = layTatCaRevision_(); meta.fetchedAt = meta.thoiDiem; meta.revision = Object.keys(meta.revisions).reduce(function (a, k) { return a + meta.revisions[k]; }, 0);
    var coCache = Object.keys(meta.cache).map(function (k) { return meta.cache[k]; });
    meta.source = coCache.length && coCache.every(function (c) { return c === 'HIT'; }) ? 'cache' : (coCache.indexOf('HIT') >= 0 ? 'sheets+cache' : 'sheets');
    if (meta.tongMs > 3000) console.warn('[HIEU_NANG] ' + hanhDong + ' ' + meta.tongMs + 'ms id=' + meta.idYeuCau + ' ban_ghi=' + JSON.stringify(meta.soBanGhi));
    var cbCuoi = canhBaoDongGoi_.slice(); var dong = anToanChoTrinhDuyet_(data, 0, '', cbCuoi);
    if (cbCuoi.length) { meta.isComplete = false; meta.canhBao = cbCuoi.slice(0, 20); meta.soCanhBao = cbCuoi.length; console.warn('[DU_LIEU_HONG] ' + hanhDong + ' ' + cbCuoi.length + ' giá trị không đóng gói được'); }
    return { ok: true, data: dong, meta: meta, error: null };
  } catch (e) {
    meta.tongMs = Date.now() - t0;
    var tb = String((e && e.message) || e);
    var ma = maLoiTuThongBao_(tb);
    if (!_reqIdLog_) _reqIdLog_ = meta.idYeuCau;
    ghiLog_('ERROR', 'API', hanhDong, ma, { ms: meta.tongMs, msg: tb });
    return { ok: false, data: null, meta: meta, error: { ma: ma, code: ma, thongBao: tb, message: tb, retryable: ma === 'HE_THONG_BAN' } };
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
