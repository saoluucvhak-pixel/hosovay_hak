/**
 * PHIEN.GS — ĐĂNG NHẬP QUA CỔNG (SSO) THEO MÔ HÌNH HDMB_HAK + PHÂN QUYỀN 3 VAI TRÒ + CỬA api().
 *
 * Mô hình (đọc từ saoluucvhak-pixel/HDMB_HAK, 34_PhanQuyen.gs):
 *   • "Cổng đăng nhập" = 1 dự án Apps Script riêng, chạy dưới quyền người truy cập → biết email thật → ký HMAC-SHA256
 *     {email, exp(5 phút), n(mã dùng 1 lần), yc} bằng bí mật chung SSO_SECRET → chuyển về Web App qua ?sso=...
 *   • Web App xác minh chữ ký/hạn/mã dùng 1 lần → cấp MÃ PHIÊN 64 hex trong CacheService (6 giờ, tối đa 7 ngày kể từ lúc đăng nhập).
 *   • Trình duyệt gọi máy chủ qua api(phien, tenHam, thamSo): chỉ hàm có trong BANG_API_ mới gọi được, kiểm quyền theo vai trò.
 *   • Vai trò ADMIN / NHAP_LIEU / XEM lưu ở sheet SYS_NguoiDung. Chủ script (người triển khai) và ADMIN_EMAILS luôn là ADMIN.
 * KHÁC HDMB_HAK (vá lỗ hổng đã nêu trong docs/qa/11 của chính repo đó): đăng nhập từ trang nhúng dùng MÃ GHÉP CẶP 6 số —
 *   cửa sổ đăng nhập hiện mã, khung nhúng phải nhập đúng mã mới nhận phiên (chặn kẻ gian tự đặt mã yêu cầu rồi lừa nhân viên đăng nhập).
 * Chỉ bật khi PORTAL_CHE_DO = CONG_HAK. Ở TAM_GOOGLE (mặc định) api() vẫn là cửa vào nhưng danh tính lấy từ phiên Google.
 * CHƯA kiểm thử trên Google thật và chưa kiểm thử với cổng thật — xem TAI_LIEU_DONG_BO_DU_LIEU.md.
 */
var VAI_TRO_ = { ADMIN: 'ADMIN', NHAP_LIEU: 'NHAP_LIEU', XEM: 'XEM' };
var VAI_TRO_NHAN_ = { ADMIN: 'Quản trị', NHAP_LIEU: 'Nhập liệu', XEM: 'Chỉ xem' };
var SHEET_NGUOI_DUNG = 'SYS_NguoiDung';
var COT_NGUOI_DUNG_ = ['Email', 'HoTen', 'VaiTro', 'TrangThai', 'CapNhatLuc', 'CapNhatBoi'];
var TT_HOAT_DONG_ = 'Hoạt động', TT_KHOA_ = 'Khóa';
var AUTH_ = {
  PHIEN_TTL_GIAY: 21600, PHIEN_GIA_HAN_SAU_MS: 30 * 60 * 1000, PHIEN_TOI_DA_MS: 7 * 24 * 60 * 60 * 1000,
  SSO_HIEU_LUC_MS: 5 * 60 * 1000, SSO_NONCE_TTL_GIAY: 900, CACHE_NGUOI_DUNG_GIAY: 60,
  PROP_SECRET: 'SSO_SECRET', PROP_CONG_URL: 'SSO_GATEWAY_URL', KHOA_NGUOI_DUNG: 'HOSOVAY:V2:NGUOIDUNG',
  TIEN_TO_PHIEN: 'HOSOVAY:PHIEN:', TIEN_TO_NONCE: 'HOSOVAY:SSO_N:', TIEN_TO_YEU_CAU: 'HOSOVAY:DN_YC:', YEU_CAU_TTL_GIAY: 600, SO_LAN_THU_MA_: 5,
  LOI_DANG_NHAP: '[AUTH] ', LOI_QUYEN: '[QUYEN] '
};
var MAU_PHIEN_ = /^[0-9a-f]{64}$/, MAU_YC_ = /^[0-9a-f]{32}$/, MAU_EMAIL_ = /^[^@\s]+@[^@\s]+\.[^@\s]+$/, MAU_MA6_ = /^\d{6}$/;
var MAU_CONG_URL_ = /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/;

function chuanEmail_(v) { return String(v || '').trim().toLowerCase(); }
function chuEmail_() { try { return chuanEmail_(Session.getEffectiveUser().getEmail()); } catch (e) { return ''; } }

// ------------------------------------------------------------------------------------------------ người dùng & vai trò
function docNguoiDung_() {
  var cache = CacheService.getScriptCache(), raw = null;
  try { raw = cache.get(AUTH_.KHOA_NGUOI_DUNG); } catch (e) { raw = null; }
  if (raw) { try { return JSON.parse(raw); } catch (e2) { /* hỏng → đọc lại */ } }
  var ds = [];
  try {
    var sh = getSS_().getSheetByName(SHEET_NGUOI_DUNG);
    if (sh && sh.getLastRow() > 1) {
      ds = sh.getRange(2, 1, sh.getLastRow() - 1, COT_NGUOI_DUNG_.length).getValues().map(function (r, i) {
        return { dong: i + 2, email: chuanEmail_(r[0]), hoTen: String(r[1] || '').trim(), vaiTro: String(r[2] || '').trim().toUpperCase(), trangThai: String(r[3] || '').trim() };
      }).filter(function (x) { return x.email; });
    }
  } catch (e) { throw new Error('Không đọc được danh sách người dùng (' + SHEET_NGUOI_DUNG + '): ' + e.message); }
  try { cache.put(AUTH_.KHOA_NGUOI_DUNG, JSON.stringify(ds), AUTH_.CACHE_NGUOI_DUNG_GIAY); } catch (e3) { /* bỏ qua */ }
  return ds;
}
function xoaCacheNguoiDung_() { try { CacheService.getScriptCache().remove(AUTH_.KHOA_NGUOI_DUNG); } catch (e) { /* bỏ qua */ } }

/** Vai trò hiệu lực của email; null nếu chưa được cấp quyền / đã khóa. Chủ script & ADMIN_EMAILS luôn ADMIN. */
function vaiTroCua_(email) {
  var e = chuanEmail_(email);
  if (!e) return null;
  if (e === chuEmail_() || danhSachQuanTri_().indexOf(e) >= 0) return VAI_TRO_.ADMIN;
  var nd = docNguoiDung_().filter(function (x) { return x.email === e; })[0];
  if (!nd || nd.trangThai !== TT_HOAT_DONG_ || !VAI_TRO_[nd.vaiTro]) return null;
  return nd.vaiTro;
}
function quyenTheoVaiTro_(vaiTro) {
  if (vaiTro === VAI_TRO_.ADMIN) return [QUYEN_QUAN_TRI_, QUYEN_NHAP_LIEU_, QUYEN_SU_DUNG_];
  if (vaiTro === VAI_TRO_.NHAP_LIEU) return [QUYEN_NHAP_LIEU_, QUYEN_SU_DUNG_];
  if (vaiTro === VAI_TRO_.XEM) return [QUYEN_SU_DUNG_];
  return [];
}

// ------------------------------------------------------------------------------------------------ phiên
function taoMaNgauNhien_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase(); }
function taoPhien_(email, dangNhapLuc) {
  var phien = taoMaNgauNhien_(), bayGio = Date.now();
  CacheService.getScriptCache().put(AUTH_.TIEN_TO_PHIEN + phien, JSON.stringify({ email: email, taoLuc: bayGio, dangNhapLuc: dangNhapLuc || bayGio }), AUTH_.PHIEN_TTL_GIAY);
  return phien;
}
function docPhienDayDu_(phien) {
  if (!MAU_PHIEN_.test(String(phien || ''))) return null;
  var raw = CacheService.getScriptCache().get(AUTH_.TIEN_TO_PHIEN + phien);
  if (!raw) return null;
  try {
    var p = JSON.parse(raw), dn = Number(p.dangNhapLuc || p.taoLuc) || 0;
    if (Date.now() - dn > AUTH_.PHIEN_TOI_DA_MS) return null;
    return { email: chuanEmail_(p.email), taoLuc: Number(p.taoLuc) || 0, dangNhapLuc: dn };
  } catch (e) { return null; }
}

// ------------------------------------------------------------------------------------------------ SSO
function layHoacTaoSecret_(tao) {
  var props = PropertiesService.getScriptProperties(), s = props.getProperty(AUTH_.PROP_SECRET);
  if (!s && tao) { s = taoMaNgauNhien_(); props.setProperty(AUTH_.PROP_SECRET, s); }
  return s;
}
function kyHmac_(data, secret) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, secret)); }
function soSanhAnToan_(a, b) {
  if (a.length !== b.length) return false;
  var k = 0; for (var i = 0; i < a.length; i++) k |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return k === 0;
}
/** Xác minh mã từ cổng: đúng chữ ký, còn hạn, chưa dùng. @return {{email:string, yeuCau:string}} */
function xacMinhSso_(token) {
  var secret = layHoacTaoSecret_(false);
  if (!secret) throw new Error('Cổng đăng nhập chưa được cấu hình.');
  var parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Mã đăng nhập không hợp lệ.');
  if (!soSanhAnToan_(kyHmac_(parts[0], secret), parts[1])) throw new Error('Mã đăng nhập không hợp lệ (sai chữ ký).');
  var payload;
  try { payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString('UTF-8')); } catch (e) { throw new Error('Mã đăng nhập không đọc được.'); }
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) throw new Error('Link đăng nhập đã hết hạn - vui lòng đăng nhập lại.');
  var nonce = String(payload.n || ''), cache = CacheService.getScriptCache();
  if (!nonce || cache.get(AUTH_.TIEN_TO_NONCE + nonce)) throw new Error('Link đăng nhập đã được dùng - vui lòng đăng nhập lại.');
  cache.put(AUTH_.TIEN_TO_NONCE + nonce, '1', AUTH_.SSO_NONCE_TTL_GIAY);
  var email = chuanEmail_(payload.email);
  if (!MAU_EMAIL_.test(email)) throw new Error('Mã đăng nhập không có email hợp lệ.');
  return { email: email, yeuCau: MAU_YC_.test(String(payload.yc || '')) ? payload.yc : '' };
}

/** Xử lý ?sso=... trong doGet. @return {{phien:string, loi:string, yeuCau:string, ma:string}} */
function xuLyDangNhapSso_(sso) {
  var kq = { phien: '', loi: '', yeuCau: '', ma: '' };
  try {
    var x = xacMinhSso_(sso);
    kq.yeuCau = x.yeuCau;
    if (vaiTroCua_(x.email)) {
      kq.phien = taoPhien_(x.email);
      ghiNhatKy_('', 'DANG_NHAP', 'Đăng nhập qua cổng: ' + x.email + (x.yeuCau ? ' (trang nhúng)' : ''));
    } else {
      kq.loi = 'Tài khoản ' + x.email + ' chưa được cấp quyền hoặc đã bị khóa - liên hệ Quản trị để được thêm vào hệ thống.';
      ghiNhatKy_('', 'DANG_NHAP_BI_TU_CHOI', x.email);
    }
  } catch (err) { kq.loi = String((err && err.message) || err); }
  return kq;
}

/** Trang cửa sổ nhỏ khi đăng nhập từ trang nhúng: lưu phiên theo mã yêu cầu + hiện MÃ GHÉP CẶP 6 số. */
function trangDangNhapNhung_(yeuCau, phien, loi) {
  var ma = '';
  if (phien) ma = String(100000 + Math.floor(Math.random() * 900000));
  CacheService.getScriptCache().put(AUTH_.TIEN_TO_YEU_CAU + yeuCau, JSON.stringify(phien ? { phien: phien, ma: ma, lan: 0 } : { loi: loi }), AUTH_.YEU_CAU_TTL_GIAY);
  var thoat = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var nd = phien
    ? '<h2 style="color:#16a34a">✅ Đăng nhập thành công</h2><p>Nhập mã ghép cặp này vào màn hình HOSOVAY_HAK đang chờ:</p><div style="font-size:36px;letter-spacing:8px;font-weight:700;margin:12px 0">' + ma + '</div><p style="color:#666;font-size:12px">Chỉ nhập mã này nếu CHÍNH BẠN vừa bấm "Đăng nhập" trên máy của mình. Không gửi mã cho người khác.</p>'
    : '<h2 style="color:#dc2626">Không đăng nhập được</h2><p>' + thoat(loi) + '</p>';
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;padding:32px;text-align:center">' + nd + '</div>').setTitle('Đăng nhập HOSOVAY_HAK');
}

// ------------------------------------------------------------------------------------------------ hàm công khai (không cần đăng nhập)
/** CÔNG KHAI: trạng thái đăng nhập + link cổng. */
function thongTinDangNhap(phien) {
  var pd = docPhienDayDu_(phien), email = pd ? pd.email : '';
  var cheDo = portalCheDo_();
  if (!email) email = emailHienTaiThuong_();
  var vaiTro = email ? vaiTroCua_(email) : null;
  if (cheDo !== 'CONG_HAK') {
    // Chế độ tạm: danh tính theo Google (không cần cổng)
    return { cheDo: cheDo, daDangNhap: true, email: email, vaiTro: '', vaiTroNhan: '', quyen: [], quaPhien: false, phienMoi: '', congDangNhapUrl: '' };
  }
  var phienMoi = (pd && vaiTro && Date.now() - pd.taoLuc > AUTH_.PHIEN_GIA_HAN_SAU_MS) ? taoPhien_(pd.email, pd.dangNhapLuc) : '';
  return {
    cheDo: cheDo, daDangNhap: !!vaiTro, email: email, vaiTro: vaiTro || '', vaiTroNhan: vaiTro ? VAI_TRO_NHAN_[vaiTro] : '',
    quyen: vaiTro ? quyenTheoVaiTro_(vaiTro) : [], quaPhien: !!(pd && pd.email), phienMoi: phienMoi,
    congDangNhapUrl: PropertiesService.getScriptProperties().getProperty(AUTH_.PROP_CONG_URL) || ''
  };
}

/** CÔNG KHAI: khung nhúng nhận phiên theo mã yêu cầu của mình + MÃ GHÉP CẶP người dùng đọc từ cửa sổ đăng nhập. */
function nhanPhienDangNhap(yeuCau, ma) {
  if (!MAU_YC_.test(String(yeuCau || ''))) return {};
  var cache = CacheService.getScriptCache(), khoa = AUTH_.TIEN_TO_YEU_CAU + yeuCau, raw = cache.get(khoa);
  if (!raw) return {};
  var o; try { o = JSON.parse(raw); } catch (e) { cache.remove(khoa); return {}; }
  if (o.loi) { cache.remove(khoa); return { loi: o.loi }; }
  if (!MAU_MA6_.test(String(ma || ''))) return { canMa: true };
  if (String(ma) !== String(o.ma)) {
    o.lan = (o.lan || 0) + 1;
    if (o.lan >= AUTH_.SO_LAN_THU_MA_) { cache.remove(khoa); return { loi: 'Nhập sai mã ghép cặp quá nhiều lần - hãy đăng nhập lại.' }; }
    cache.put(khoa, JSON.stringify(o), AUTH_.YEU_CAU_TTL_GIAY);
    return { canMa: true, saiMa: true };
  }
  cache.remove(khoa); // dùng 1 lần
  return { phien: o.phien };
}

/** CÔNG KHAI: hủy đúng mã phiên được gửi lên. */
function dangXuat(phien) {
  if (MAU_PHIEN_.test(String(phien || ''))) CacheService.getScriptCache().remove(AUTH_.TIEN_TO_PHIEN + phien);
  return { success: true };
}

// ------------------------------------------------------------------------------------------------ BẢNG QUYỀN API & CỬA api()
var Q_XEM_ = 'XEM', Q_NHAP_ = 'NHAP_LIEU', Q_QT_ = 'QUAN_TRI';
/** Tên hàm (trình duyệt gọi) → quyền tối thiểu. Hàm KHÔNG có ở đây thì không gọi được qua api(). */
function bangQuyenApi_() {
  var b = {}, dat = function (q, ds) { ds.split(/\s+/).filter(Boolean).forEach(function (n) { b[n] = q; }); };
  dat(Q_XEM_, 'taiMauCapNhatTSDB layCanhBaoDungLuong layTrangThaiLichLuuTruNam layBaoCaoTienVayTongHop layBaoCaoTienLai xuatBaoCaoLai xuatTheoDoiTatToan layDanhSachChotLai layChiTietChotLai layTheoDoiTatToanTheoNgay layDanhSachLuuTru layDuLieuLuuTru layHoSoCoTheGuiDuyet layMauNoiDungThanhToan doiChieuTaiLieuHoSo layTongHopBangLuong layTongHopBaoHiem layTyGiaHienThi layXuHuongTyGia layLichSuTyGia layNhatKyThayDoiTyGia layTrangThaiLichTyGia layLinkThuMucMauVanBan layLichTraNo layThietLapNhacNo layBaoCaoTraNo layPhienBanUngDung kiemTraCauTrucDuLieu layTrangThaiXacNhanGN layTraNoHoSo layChiTietTatToan layTrangTatToan layTrangHoSo getHoSoPage layTongQuanHoSo layDuLieuKhoiTao layRevisionDuLieu layBaoCaoDoiSoat layTrangThaiBoChungTu layLichSuPhienPhatHanh layXacNhanGiaiNgan layBaoCaoGiaiNganThucTe layNgayHomNay layDanhSachCongTy layDanhSachHopDongDayDu layDanhSachKhachHangDayDu layToanBoHoSoGoc ' +
    'locDanhSachHoSo layDuLieuDayDu layBaoCaoTienVay demTienLeLichSu layTrangThaiQuyen kiemTraDieuKienGiaiNgan layLichSuTrangThaiHoSo layLichSuPhatHanh ' +
    'layDanhSachChungTuHoSo layMauChoChungTu layThieuDuLieuChungTu xemTruocChungTu moBanGoogleCuaTaiLieu layLinkThuMucGoc layLinkThuMucHoSo layTaiLieuTheoHoSo layTongHopHoSoVaTaiLieu layBangTongHopHoaDon layBangTongHopBangLuong ' +
    'layDanhSachBangLuongDeChon layDanhSachTaiLieuTheoNhaCungCap layDanhMucTaiLieuKem layDanhMucLoaiTaiLieu layLoaiHoSoGiaiNgan ' +
    'taoBaoCaoTienVayDoc taoBaoCaoTienVayExcel taoBaoCaoTienVayExcelToanBo ' +
    'layThietLapQuanLyVay layHanMucTinDung kiemTraHanMucHoSo layTaiSanBaoDam layBaoHiemTaiSan layDieuKienRangBuoc layLaiPhatQuaHan layGoiYPhanBoTra layDuBaoDongTien layPhanTichQuaHan layBangDieuHanh xemTruocNhacNo doiSoatSaoKe layDanhSachPheDuyet layTrangThaiPheDuyetHoSo');
  // Tải tệp về máy (ZIP hồ sơ, file qua app): Nhập liệu trở lên — vai trò Chỉ xem chỉ xem trên app, không tải tệp.
  dat(Q_NHAP_, 'taiBoHoSoZip taiFileQuaApp docTrangTaiLieu gomChungTuTuTrang luuChungTuNhieuTrang luuBaoHiemThuCong capNhatMauChungTu luuThietLapNhacNo dongBoTrangThaiTheoBo ghiNhanTraNo huyTraNo ghiTyGiaThuCong capNhatTatToanHoSo kiemTraKetQuaLuu luuHoSoGiaiNgan capNhatThongTinPhiTienTe chuyenHoSoVeNhap xacNhanGiaiNganThucTe ghiNhanDieuChinhGiaiNgan huyGiaiNgan xoaHoSo luuKhachHang capNhatHoaDonThuCong ' +
    'taiLenTaiLieuHoSo xoaTaiLieuDinhKem xoaHoaDonDaTai taoTronBoTheoMau taoDeNghiGiaiNganBIDV taoChungTuThanhToan taoHopDongMuaBanNgoaiTe taoChungTuTuyChon ' +
    'ghiNhanTraNoGop xemTruocCapNhatTSDB apDungCapNhatTSDB themCongTyBaoHiem luuTaiSanBaoDam giaiChapTaiSan luuBaoHiemTaiSan huyBaoHiemTaiSan capNhatGiaTriRangBuoc guiDuyetGiaiNgan thuHoiDuyetGiaiNgan');
  dat(Q_QT_, 'layTrangThaiToanVenBaoHiem donChiTietBaoHiemThua xacMinhPhucHoiBaoHiem tatLichLuuTruNam uocTinhLuuTruTep lapSoTepLuuTru luuTruSaoTep layTepLuuTru soSanhLuuTru khoiPhucTuLuuTru chotBaoCaoLai huyChotLai luuTruNam huyLuuTru taoLichLuuTruNam luuDinhDangHienThi luuMauNoiDungThanhToan luuCongTy luuHopDong xoaHopDong luuDanhMucTaiLieuKem luuLoaiTaiLieuTuyChinh luuLoaiHoSoGiaiNgan layCauHinhHeThong luuCauHinhHeThong kiemTraCauHinh layCauHinhThuMucGoc luuCauHinhThuMucGoc ' +
    'layThongTinSpreadsheetDangDung lamMoiBaoCaoNhap kiemTraMoiTruongHeThong layNhatKyLoiGanDay layDanhMucPlaceholder layDanhSachMauVanBan layLichSuChinhSuaMau taiMauVanBan xoaMauVanBan datTrangThaiMau datMauMacDinh kiemTraLaiMau xemTruocMau phanTichTepTho taoMauTuAnhXa ' +
    'khoiPhucHoSo layDanhSachHoSoXoaMem layGhiDoDang phucHoiGhiDoDang layDanhSachNguoiDung luuNguoiDung layCauHinhDangNhap luuCauHinhDangNhap layMaNguonCong datCheDoPortal ' +
    'luuThietLapQuanLyVay luuDieuKienRangBuoc xoaDieuKienRangBuoc quyetDinhPheDuyet guiThuNhacNo dongBoLichNhacNo taoLichNhacNo capNhatLaiTyGiaVCB taoLichTuDongTyGia');
  return b;
}
function coQuyenApi_(vaiTro, quyenCan) {
  if (vaiTro === VAI_TRO_.ADMIN) return true;
  if (vaiTro === VAI_TRO_.NHAP_LIEU) return quyenCan === Q_XEM_ || quyenCan === Q_NHAP_;
  if (vaiTro === VAI_TRO_.XEM) return quyenCan === Q_XEM_;
  return false;
}
/** Xác định người gọi: theo phiên; không có phiên thì theo phiên Google (chủ script / cùng domain). */
function nguoiGoi_(phien) {
  var email = '';
  if (phien) {
    email = docPhienDayDu_(phien) ? docPhienDayDu_(phien).email : '';
    if (!email) throw new Error(AUTH_.LOI_DANG_NHAP + 'Phiên đăng nhập đã hết hạn - vui lòng đăng nhập lại.');
  } else email = emailHienTaiThuong_();
  if (!email) throw new Error(AUTH_.LOI_DANG_NHAP + 'Chưa đăng nhập - vui lòng đăng nhập bằng tài khoản Google đã được cấp quyền.');
  var vt = vaiTroCua_(email);
  if (!vt) throw new Error(AUTH_.LOI_DANG_NHAP + 'Tài khoản ' + email + ' chưa được cấp quyền hoặc đã bị khóa - liên hệ Quản trị.');
  return { email: email, vaiTro: vt };
}

/**
 * CHỐNG FORMULA INJECTION (CSV/Sheet injection): chuỗi do người dùng nhập mà BẮT ĐẦU bằng = + - @ (hoặc tab/CR) và không phải số thuần
 * sẽ bị Google Sheets hiểu là CÔNG THỨC khi ghi (setValues). Đặt dấu nháy đơn ở đầu để Sheets coi là văn bản (dấu nháy không lưu vào ô).
 * Chỉ áp dụng cho chuỗi ngắn (≤ 500 ký tự) để KHÔNG phá dữ liệu nhị phân/base64 (tải mẫu, tệp kèm).
 */
function lamSachCongThuc_(v) {
  if (typeof v === 'string') {
    if (v.length === 0 || v.length > 500) return v;
    if (/^[=+\-@\t\r]/.test(v) && !/^[+-]?\d[\d.,\s]*$/.test(v) && !/^[+-]?\d+([.,]\d+)?\s*%?$/.test(v)) return "'" + v;
    return v;
  }
  if (Array.isArray(v)) return v.map(lamSachCongThuc_);
  if (v && typeof v === 'object' && !(v instanceof Date) && Object.getPrototypeOf(v) === Object.prototype) {
    var o = {}; Object.keys(v).forEach(function (k) { o[k] = lamSachCongThuc_(v[k]); }); return o;
  }
  return v;
}

/** CỬA VÀO DUY NHẤT của trình duyệt. */
function api(phien, tenHam, thamSo) {
  var bang = bangQuyenApi_();
  if (!Object.prototype.hasOwnProperty.call(bang, String(tenHam))) throw new Error('Chức năng không tồn tại: ' + tenHam);
  var fn = globalThis[tenHam];
  if (typeof fn !== 'function') throw new Error('Chức năng không tồn tại: ' + tenHam);
  var batDau = Date.now(), loiLog = null, kq;
  _nguoiApi_ = null; _reqIdLog_ = Utilities.getUuid().slice(0, 8); _userLog_ = '';
  try {
    if (portalCheDo_() === 'CONG_HAK') {
      var nd = nguoiGoi_(phien);
      _userLog_ = nd.email;
      if (!coQuyenApi_(nd.vaiTro, bang[tenHam])) throw new Error(AUTH_.LOI_QUYEN + 'Tài khoản ' + nd.email + ' (' + VAI_TRO_NHAN_[nd.vaiTro] + ') không có quyền thực hiện thao tác này.');
      _nguoiApi_ = nd;
    }
    else if (moiTruong_() === 'PRODUCTION') { // TAM_GOOGLE trên PRODUCTION: vẫn kiểm vai trò theo bảng quyền ở backend
      var egg = emailHienTaiThuong_(); _userLog_ = egg;
      if (!egg) { ghiBaoMat_('TU_CHOI_AN_DANH', ''); throw new Error(AUTH_.LOI_DANG_NHAP + 'Không xác định được tài khoản Google của bạn (truy cập ẩn danh hoặc khác tổ chức).'); }
      var vtg = vaiTroCua_(egg);
      if (!vtg) { ghiBaoMat_('TU_CHOI_CHUA_CAP_QUYEN', egg); throw new Error(AUTH_.LOI_QUYEN + 'Tài khoản ' + egg + ' chưa được cấp quyền sử dụng hệ thống. Liên hệ quản trị viên.'); }
      if (!coQuyenApi_(vtg, bang[tenHam])) throw new Error(AUTH_.LOI_QUYEN + 'Tài khoản ' + egg + ' không có quyền thực hiện thao tác này.');
      _nguoiApi_ = { email: egg, vaiTro: vtg }; // các hàm bên trong biết đây là lượt gọi hợp lệ qua api()
    } else _userLog_ = emailHienTaiThuong_();
    kq = fn.apply(null, Array.isArray(thamSo) ? (bang[tenHam] === Q_XEM_ ? thamSo : lamSachCongThuc_(thamSo)) : []); // hàm chỉ ĐỌC không ghi Sheet → không đổi chuỗi tìm kiếm
    return (kq !== null && typeof kq === 'object') ? anToanChoTrinhDuyet_(kq) : kq;
  } catch (e) {
    loiLog = e;
    var tb = String((e && e.message) || e), ma = maLoiTuThongBao_(tb);
    ghiLog_(/^\[(AUTH|QUYEN)\]/.test(tb) ? 'SECURITY' : (/^(XUNG_DOT_PHIEN_BAN|THIEU_REVISION|REVISION_KHONG_HOP_LE|CO_TAI_LIEU)$/.test(ma) ? 'WARN' : 'ERROR'), 'API', tenHam, ma, { ms: Date.now() - batDau, msg: tb });
    throw e;
  } finally {
    var ms = Date.now() - batDau;
    if (!loiLog) {
      if (bang[tenHam] !== Q_XEM_) ghiLog_('INFO', 'API', tenHam, 'OK', { ms: ms, revSau: (kq && typeof kq === 'object' && typeof kq.revision === 'number') ? kq.revision : undefined }); // chỉ log thao tác GHI
      else if (ms > 5000) ghiLog_('WARN', 'API', tenHam, 'CHAM', { ms: ms });
    }
    _nguoiApi_ = null;
  }
}

// ------------------------------------------------------------------------------------------------ quản trị đăng nhập & người dùng (chỉ QUAN_TRI)
function layCauHinhDangNhap() {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem cấu hình đăng nhập');
  var p = PropertiesService.getScriptProperties();
  return { cheDo: portalCheDo_(), congUrl: p.getProperty(AUTH_.PROP_CONG_URL) || '', daCoSecret: !!p.getProperty(AUTH_.PROP_SECRET), chuScript: chuEmail_() };
}
function luuCauHinhDangNhap(congUrl) {
  yeuCauDangNhap_(); yeuCauQuanTri_('lưu cấu hình đăng nhập');
  var u = String(congUrl || '').trim();
  if (u && !MAU_CONG_URL_.test(u)) throw new Error('Địa chỉ Cổng đăng nhập phải có dạng https://script.google.com/macros/s/…/exec');
  PropertiesService.getScriptProperties().setProperty(AUTH_.PROP_CONG_URL, u);
  ghiNhatKy_('', 'CAU_HINH_CONG_DANG_NHAP', u ? 'Đặt địa chỉ cổng' : 'Xóa địa chỉ cổng');
  return { ok: true };
}
/** Mã nguồn dự án "Cổng đăng nhập" (dán vào 1 dự án Apps Script MỚI) — chứa SSO_SECRET: không chia sẻ. */
function layMaNguonCong(appUrl) {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem mã nguồn Cổng đăng nhập');
  var url = String(appUrl || '').trim();
  if (!/^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/.test(url)) throw new Error('Nhập địa chỉ Web App HOSOVAY_HAK (…/exec) để sinh mã Cổng.');
  var secret = layHoacTaoSecret_(true);
  return { maNguon:
    '// CỔNG ĐĂNG NHẬP - HOSOVAY_HAK\n// Dán vào 1 dự án Apps Script MỚI → Deploy > New deployment > Web app:\n//   Execute as: User accessing the web app  ·  Who has access: Anyone with Google account\n// SSO_SECRET phải KHỚP với Web App chính - không chia sẻ file này.\n' +
    'var APP_URL = ' + JSON.stringify(url) + ';\nvar SSO_SECRET = ' + JSON.stringify(secret) + ';\nvar SSO_HIEU_LUC_MS = ' + AUTH_.SSO_HIEU_LUC_MS + ';\n\n' +
    'function doGet(e) {\n  var email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();\n  var yc = String((e && e.parameter && e.parameter.yc) || "");\n' +
    '  if (!email) return HtmlService.createHtmlOutput(\'<p style="font-family:Arial;padding:24px">Không xác định được tài khoản Google. Hãy đăng nhập Google rồi mở lại link này.</p>\');\n' +
    '  var payload = JSON.stringify({ email: email, exp: Date.now() + SSO_HIEU_LUC_MS, n: Utilities.getUuid(), yc: /^[0-9a-f]{32}$/.test(yc) ? yc : "" });\n' +
    '  var p64 = Utilities.base64EncodeWebSafe(payload, Utilities.Charset.UTF_8);\n  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p64, SSO_SECRET));\n' +
    '  var url = APP_URL + "?sso=" + encodeURIComponent(p64 + "." + sig);\n  var em = email.replace(/[&<>"\']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; });\n' +
    '  return HtmlService.createHtmlOutput(\'<div style="font-family:Arial,sans-serif;padding:32px;text-align:center"><h2>HOSOVAY_HAK</h2><p>Tài khoản: <b>\' + em + \'</b></p><a href="\' + url + \'" target="_top" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Vào hệ thống</a><p style="color:#666;font-size:12px;margin-top:16px">Link có hiệu lực 5 phút, dùng 1 lần.</p></div>\').setTitle("Đăng nhập HOSOVAY_HAK");\n}\n' };
}
/** Bật/tắt chế độ cổng. Chỉ bật được khi đã cấu hình cổng + secret và người bật là ADMIN (chống tự khóa mình). */
function datCheDoPortal(che) {
  yeuCauDangNhap_(); yeuCauQuanTri_('đổi chế độ đăng nhập');
  var p = PropertiesService.getScriptProperties();
  if (che === 'CONG_HAK') {
    if (!p.getProperty(AUTH_.PROP_CONG_URL) || !p.getProperty(AUTH_.PROP_SECRET)) throw new Error('Chưa cấu hình Cổng đăng nhập (địa chỉ cổng + mã nguồn). Hãy cấu hình trước khi bật.');
    var dt = layDanhTinh_();
    if (!dt.email) throw new Error('Không xác định được email của bạn để đảm bảo bạn vẫn là Quản trị sau khi bật. Mở Web App bằng tài khoản chủ hệ thống.');
  } else if (che !== 'TAM_GOOGLE') throw new Error('Chế độ không hợp lệ.');
  p.setProperty(PORTAL_KHOA_CHE_DO_, che);
  ghiNhatKy_('', 'DOI_CHE_DO_DANG_NHAP', che);
  return { cheDo: che };
}
function layDanhSachNguoiDung() {
  yeuCauDangNhap_(); yeuCauQuanTri_('xem danh sách người dùng');
  return docNguoiDung_().map(function (x) { return { email: x.email, hoTen: x.hoTen, vaiTro: x.vaiTro, trangThai: x.trangThai }; });
}
/** Thêm/sửa người dùng. Không thể tự khóa hoặc hạ quyền chính mình nếu mình không phải chủ script (tránh mất quản trị). */
function luuNguoiDung(p) {
  yeuCauDangNhap_(); yeuCauQuanTri_('quản lý người dùng');
  return voiKhoa_(function () {
    var email = chuanEmail_(p && p.email), vt = String((p && p.vaiTro) || '').toUpperCase(), tt = (p && p.trangThai === TT_KHOA_) ? TT_KHOA_ : TT_HOAT_DONG_;
    if (!MAU_EMAIL_.test(email)) throw new Error('Email không hợp lệ.');
    if (!VAI_TRO_[vt]) throw new Error('Vai trò phải là ADMIN, NHAP_LIEU hoặc XEM.');
    if (email === chuEmail_() || danhSachQuanTri_().indexOf(email) >= 0) throw new Error('Chủ hệ thống / quản trị cố định luôn là Quản trị, không đổi ở đây.');
    var me = layDanhTinh_().email;
    if (email === me && (vt !== VAI_TRO_.ADMIN || tt === TT_KHOA_)) throw new Error('Không thể tự hạ quyền hoặc tự khóa tài khoản đang dùng.');
    var sh = ensureSheet_(getSS_(), SHEET_NGUOI_DUNG, COT_NGUOI_DUNG_);
    var hang = [email, String(p.hoTen || '').trim(), vt, tt, new Date(), me], cu = docNguoiDung_().filter(function (x) { return x.email === email; })[0];
    if (cu) sh.getRange(cu.dong, 1, 1, hang.length).setValues([hang]); else themDongVaoCuoiThat_(sh, hang);
    SpreadsheetApp.flush(); xoaCacheNguoiDung_();
    ghiNhatKy_('', 'LUU_NGUOI_DUNG', email + ' → ' + vt + ' / ' + tt);
    return { email: email };
  });
}
