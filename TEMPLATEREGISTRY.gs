/**
 * TEMPLATEREGISTRY.GS
 * Danh mục MẪU VĂN BẢN (DOCX/XLSX): tab DM_MauVanBan, phiên bản, trạng thái hiệu lực, mẫu mặc định, chọn mẫu theo hồ sơ.
 *
 * Mỗi dòng = 1 PHIÊN BẢN của 1 mẫu và là BẤT BIẾN: file Drive của phiên bản không bao giờ bị ghi đè; tải lại cùng Mã mẫu
 * sinh phiên bản mới, phiên bản cũ chuyển "Hết hiệu lực" (vẫn giữ file + dòng để khôi phục/đối chiếu). Chỉ các cột trạng thái
 * (TrangThai, MacDinh, NgayCapNhat, NguoiCapNhat, FileGoogleDocId) được cập nhật sau khi tạo.
 */

var SHEET_MAU_VAN_BAN = 'DM_MauVanBan';
var COT_MAU_VAN_BAN_ = ['MaMau', 'TenMau', 'NganHang', 'LoaiTaiLieu', 'LoaiTien', 'DieuKienSoDong', 'PhienBan', 'NgayHieuLuc', 'TrangThai',
  'FileDocxId', 'FileGoogleDocId', 'NgayTao', 'NguoiTao', 'NgayCapNhat', 'NguoiCapNhat',
  'LoaiFile', 'SoNguoiHuongTu', 'SoNguoiHuongDen', 'TenFile', 'KichThuocKB', 'CoHangMau', 'DanhSachPlaceholder', 'CanhBao', 'HashFile', 'MacDinh', 'GhiChu'];
var TT_HIEU_LUC = 'Hiệu lực';
var TT_HET_HIEU_LUC = 'Hết hiệu lực';
var CACHE_MAU_ = 'MAU_VAN_BAN_V2';

function chuanKhongDau_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

var BI_DANH_NGAN_HANG_ = {
  bidv: 'dau tu va phat trien', vcb: 'ngoai thuong', vietcombank: 'ngoai thuong', vietinbank: 'cong thuong', ctg: 'cong thuong',
  agribank: 'nong nghiep', techcombank: 'ky thuong', tcb: 'ky thuong', mb: 'quan doi', mbbank: 'quan doi', acb: 'a chau',
  sacombank: 'sai gon thuong tin', vpbank: 'viet nam thinh vuong', tpbank: 'tien phong', hdbank: 'phat trien thanh pho'
};

/** Ngân hàng của mẫu (rỗng = áp dụng mọi ngân hàng) khớp với tên ngân hàng trong hợp đồng vay? */
function nganHangKhop_(nganHangMau, tenNganHangHopDong) {
  var m = chuanKhongDau_(nganHangMau);
  if (!m) return true;
  var t = chuanKhongDau_(tenNganHangHopDong);
  if (!t) return false;
  var khoa = BI_DANH_NGAN_HANG_[m.replace(/\s+/g, '')];
  return t.indexOf(m) >= 0 || m.indexOf(t) >= 0 || (khoa ? t.indexOf(khoa) >= 0 : false);
}

/** "1" -> {tu:1,den:1}; "2-999" -> {2,999}; "5+" / "từ 5" -> {5,9999}; rỗng -> {1,9999}. */
function phanTichDieuKienSoDong_(s) {
  var t = String(s === null || s === undefined ? '' : s).replace(/\s+/g, '');
  if (!t) return { tu: 1, den: 9999, nhan: '1-9999' };
  var m = /^(\d+)(?:-(\d+))?(\+)?$/.exec(t);
  if (!m) throw new Error('Điều kiện số dòng "' + s + '" không hợp lệ (VD: 1, 2-999, 5+).');
  var tu = parseInt(m[1], 10), den = m[3] ? 9999 : (m[2] ? parseInt(m[2], 10) : tu);
  if (tu < 1 || den < tu) throw new Error('Điều kiện số dòng "' + s + '" không hợp lệ (từ ≥ 1, đến ≥ từ).');
  return { tu: tu, den: den, nhan: tu === den ? String(tu) : (den >= 9999 ? tu + '+' : tu + '-' + den) };
}

function xoaCacheMau_() {
  try { CacheService.getScriptCache().remove(CACHE_MAU_); } catch (e) { /* bỏ qua */ }
}

/** Đọc danh mục mẫu (có cache ngắn hạn để không đọc lại Sheet mỗi lần phát hành). */
function docDanhSachMau_(boQuaCache) {
  if (!boQuaCache) {
    try {
      var c = CacheService.getScriptCache().get(CACHE_MAU_);
      if (c) return JSON.parse(c);
    } catch (e) { /* bỏ qua */ }
  }
  var ds;
  try { ds = chuanHoaTruocKhiTra_(sheetToObjects_(SHEET_MAU_VAN_BAN)); } catch (e2) { return []; } // chưa khởi tạo tab => dùng mặc định
  try { CacheService.getScriptCache().put(CACHE_MAU_, JSON.stringify(ds), 1800); } catch (e3) { /* quá 100KB hoặc không có cache */ }
  return ds;
}

/**
 * Chọn mẫu phù hợp nhất (hàm thuần, dùng cho cả kiểm thử): Hiệu lực + đúng loại tài liệu + loại tiền (cụ thể hơn TẤT CẢ) +
 * số người trong khoảng + ngân hàng khớp (cụ thể hơn để trống) + MẶC ĐỊNH + khoảng hẹp hơn + phiên bản cao hơn.
 */
function chonMauTuDanhSach_(ds, loaiTaiLieu, loaiTien, soDong, tenNganHang) {
  var tot = null, diemTot = -1;
  ds.forEach(function (m) {
    if (m.TrangThai !== TT_HIEU_LUC || m.LoaiTaiLieu !== loaiTaiLieu) return;
    var lt = String(m.LoaiTien || 'TAT_CA').toUpperCase();
    if (lt !== 'TAT_CA' && lt !== loaiTien) return;
    var tu = Number(m.SoNguoiHuongTu) || 1, den = Number(m.SoNguoiHuongDen) || 9999;
    if (soDong < tu || soDong > den) return;
    if (!nganHangKhop_(m.NganHang, tenNganHang)) return;
    var macDinh = (m.MacDinh === true || String(m.MacDinh).toUpperCase() === 'TRUE') ? 1 : 0;
    var diem = (lt === loaiTien ? 1000000000 : 0) + (String(m.NganHang || '').trim() ? 100000000 : 0) + macDinh * 10000000 +
      (10000 - Math.min(9999, den - tu)) * 100 + Math.min(99, Number(m.PhienBan) || 0);
    if (diem > diemTot) { diemTot = diem; tot = m; }
  });
  return tot;
}

/** Mẫu đang hiệu lực phù hợp với hồ sơ, hoặc null nếu chưa có. Kèm mảng placeholder đã phân tích khi tải lên. */
function chonMauTaiLieu_(loaiTaiLieu, loaiTien, soDong, tenNganHang, phienBanTien) {
  var ds = docDanhSachMau_().filter(function (x) { return String(x.GhiChu || '').indexOf('[TIEN_V2]') < 0 || Number(phienBanTien) === 2; });
  var m = chonMauTuDanhSach_(ds, loaiTaiLieu, loaiTien, soDong, tenNganHang);
  return m ? lamGiauMau_(m) : null;
}
/** Gắn các trường tính sẵn (placeholder, có hàng mẫu, loại file) vào 1 dòng mẫu. */
function lamGiauMau_(m) {
  m.placeholder = String(m.DanhSachPlaceholder || '').split(',').filter(function (x) { return x; });
  m.coHangMau = (m.CoHangMau === true || String(m.CoHangMau).toUpperCase() === 'TRUE');
  m.loaiFile = m.LoaiFile || loaiFileTuTen_(m.TenFile) || 'docx';
  return m;
}
/** Lý do 1 mẫu KHÔNG phù hợp với hồ sơ (loại tiền / số người thụ hưởng / ngân hàng / phiên bản tiền); chuỗi rỗng = phù hợp. Cùng điều kiện với chonMauTuDanhSach_. */
function lyDoMauKhongPhuHop_(m, loaiTien, soDong, tenNganHang, phienBanTien) {
  var lt = String(m.LoaiTien || 'TAT_CA').toUpperCase(), tu = Number(m.SoNguoiHuongTu) || 1, den = Number(m.SoNguoiHuongDen) || 9999;
  if (lt !== 'TAT_CA' && lt !== loaiTien) return 'Mẫu dành cho loại tiền ' + lt + ', hồ sơ là ' + loaiTien + '.';
  if (soDong < tu || soDong > den) return 'Mẫu dành cho ' + tu + (den >= 9999 ? '+' : '–' + den) + ' người thụ hưởng, hồ sơ có ' + soDong + '.';
  if (!nganHangKhop_(m.NganHang, tenNganHang)) return 'Mẫu dành cho ngân hàng "' + m.NganHang + '", hợp đồng là "' + (tenNganHang || '(chưa ghi)') + '".';
  if (String(m.GhiChu || '').indexOf('[TIEN_V2]') >= 0 && Number(phienBanTien) !== 2) return 'Mẫu chỉ dùng cho hồ sơ theo quy tắc tiền phiên bản 2.';
  return '';
}
/** File mẫu còn dùng được không (kiểm tra nhanh, không cần quyền quản trị): còn trên Drive và chưa vào thùng rác. */
function kiemTraTepMau_(m) {
  var nhan = m.MaMau + ' v' + m.PhienBan;
  try {
    var f = DriveApp.getFileById(m.FileDocxId);
    if (typeof f.isTrashed === 'function' && f.isTrashed()) return { fileTonTai: false, loi: ['File mẫu ' + nhan + ' trên Drive đã bị bỏ vào thùng rác.'] };
    return { fileTonTai: true, loi: [] };
  } catch (e) { return { fileTonTai: false, loi: ['File mẫu ' + nhan + ' trên Drive không còn (đã bị xoá hoặc không có quyền truy cập).'] }; }
}
/** Mẫu do người dùng CHỌN khi phát hành (thay cho tự chọn): kiểm tra tồn tại, đúng loại tài liệu, còn hiệu lực và phù hợp hồ sơ; ném lỗi rõ ràng nếu không. */
function layMauDaChon_(lc, loaiTaiLieu, loaiTien, soDong, tenNganHang, phienBanTien) {
  if (!lc || typeof lc !== 'object' || !lc.maMau) throw new Error('Lựa chọn mẫu không hợp lệ (cần mã mẫu và phiên bản).');
  var m = docDanhSachMau_().filter(function (x) { return x.MaMau === String(lc.maMau) && Number(x.PhienBan) === Number(lc.phienBan); })[0];
  if (!m) throw new Error('Không tìm thấy mẫu ' + lc.maMau + ' v' + lc.phienBan + '. Bấm "Cập nhật" để tải lại danh sách mẫu.');
  if (m.LoaiTaiLieu !== loaiTaiLieu) throw new Error('Mẫu ' + m.MaMau + ' v' + m.PhienBan + ' không thuộc loại tài liệu "' + nhanChungTu_(loaiTaiLieu) + '".');
  if (m.TrangThai !== TT_HIEU_LUC) throw new Error('Mẫu ' + m.MaMau + ' v' + m.PhienBan + ' không còn hiệu lực. Bấm "Cập nhật" để lấy danh sách mẫu mới nhất.');
  var ly = lyDoMauKhongPhuHop_(m, loaiTien, soDong, tenNganHang, phienBanTien);
  if (ly) throw new Error('Mẫu ' + m.MaMau + ' v' + m.PhienBan + ' không phù hợp với hồ sơ: ' + ly);
  return lamGiauMau_(m);
}

/** Các trường bắt buộc còn thiếu nếu điền `mau` bằng dữ liệu hiện tại của hồ sơ `d` (không dựng file): mảng có cấu trúc, xem thieuDuLieuCoCauTruc_. */
function thieuDuLieuCuaMau_(d, loai, mau) {
  var khoaDung = mau.placeholder || String(mau.DanhSachPlaceholder || '').split(',').filter(function (x) { return x; });
  return thieuDuLieuCoCauTruc_(taoBienTheoTaiLieu_(d, loai), taoDanhSachBienDong_(d), khoaDung).map(function (x) { x.maHD = String(d.hopDong.MaHD || ''); return x; });
}
/**
 * CÁC TRƯỜNG DỮ LIỆU CÒN THIẾU để điền mẫu cho chứng từ của hồ sơ — tính trên dữ liệu HIỆN TẠI (sửa xong là hết). Mẫu: mẫu truyền vào { maMau, phienBan } hoặc mẫu hệ thống đang tự dùng. Chỉ đọc.
 */
function layThieuDuLieuChungTu(maHoSo, loai, mauChon) {
  yeuCauDangNhap_();
  if (!laLoaiTaiLieuHopLe_(loai)) throw new Error('Loại tài liệu không hợp lệ: ' + loai);
  var d = layDuLieuDayDu(maHoSo), lt = loaiTienTaiLieu_(d, loai), mau = mauChon ? layMauDaChon_(mauChon, loai, lt, d.chiTiet.length, d.hopDong.TenNganHang || '', d.hoSo.PhienBanTien) : chonMauTaiLieu_(loai, lt, d.chiTiet.length, d.hopDong.TenNganHang || '', d.hoSo.PhienBanTien);
  if (!mau) return { maHoSo: String(maHoSo), loaiTaiLieu: loai, mau: null, thieu: [] };
  return { maHoSo: String(maHoSo), loaiTaiLieu: loai, mau: { maMau: mau.MaMau, phienBan: Number(mau.PhienBan) }, thieu: thieuDuLieuCuaMau_(d, loai, mau) };
}
/**
 * DANH SÁCH MẪU ĐỂ CHỌN cho 1 chứng từ của hồ sơ: mọi mẫu HIỆU LỰC cùng loại tài liệu. Mỗi mẫu cho biết có phù hợp hồ sơ không (và lý do nếu không), file mẫu còn trên Drive không,
 * mẫu nào đang được hệ thống tự dùng. Mẫu không chọn được (sai loại tiền/số người/ngân hàng hoặc mất file) bị khoá. Chỉ đọc.
 */
function layMauChoChungTu(maHoSo, loai) {
  yeuCauDangNhap_();
  if (!laLoaiTaiLieuHopLe_(loai)) throw new Error('Loại tài liệu không hợp lệ: ' + loai);
  var d = layDuLieuDayDu(maHoSo), lt = loaiTienTaiLieu_(d, loai), soDong = d.chiTiet.length, nh = d.hopDong.TenNganHang || '', pb = d.hoSo.PhienBanTien;
  var dang = chonMauTaiLieu_(loai, lt, soDong, nh, pb), ung = docDanhSachMau_(true).filter(function (m) { return m.LoaiTaiLieu === loai && m.TrangThai === TT_HIEU_LUC; }).map(function (m) {
    var ly = lyDoMauKhongPhuHop_(m, lt, soDong, nh, pb), f = kiemTraTepMau_(m), laDang = !!dang && dang.MaMau === m.MaMau && Number(dang.PhienBan) === Number(m.PhienBan);
    if (!ly && !f.fileTonTai) ly = f.loi[0];
    return { maMau: m.MaMau, phienBan: Number(m.PhienBan), tenMau: m.TenMau || m.MaMau, nganHang: m.NganHang || '(mọi ngân hàng)', loaiTien: m.LoaiTien || 'TAT_CA', dieuKien: m.DieuKienSoDong || '',
      loaiFile: m.LoaiFile || loaiFileTuTen_(m.TenFile) || 'docx', macDinh: m.MacDinh === true || String(m.MacDinh).toUpperCase() === 'TRUE', dangDung: laDang, phuHop: !lyDoMauKhongPhuHop_(m, lt, soDong, nh, pb),
      fileTonTai: f.fileTonTai, chonDuoc: !ly, lyDo: ly, soThieu: 0, thieuTom: [] };
  });
  ung.forEach(function (u) { // mẫu dùng được: cho biết còn thiếu bao nhiêu dữ liệu để điền (người dùng chọn mẫu đủ dữ liệu)
    if (!u.chonDuoc) return;
    var m = docDanhSachMau_().filter(function (x) { return x.MaMau === u.maMau && Number(x.PhienBan) === u.phienBan; })[0];
    if (m) { var th = thieuDuLieuCuaMau_(d, loai, lamGiauMau_(m)); u.soThieu = th.length; u.thieuTom = th.slice(0, 5).map(function (x) { return x.nhan + (x.dong ? ' (dòng ' + x.dong + ')' : ''); }); }
  });
  ung.sort(function (a, b) { return (b.dangDung - a.dangDung) || (b.chonDuoc - a.chonDuoc) || String(a.maMau).localeCompare(String(b.maMau)) || (a.phienBan - b.phienBan); });
  var kd = dang ? kiemTraTepMau_(dang) : null;
  return { maHoSo: String(maHoSo), loaiTaiLieu: loai, tenTaiLieu: nhanChungTu_(loai), loaiTien: lt, soNguoiHuong: soDong,
    dangDung: dang ? { maMau: dang.MaMau, phienBan: Number(dang.PhienBan), tenMau: dang.TenMau || dang.MaMau, fileTonTai: kd.fileTonTai, loi: kd.loi } : null, ungVien: ung };
}
/**
 * Nút "CẬP NHẬT": xoá bộ nhớ đệm danh sách mẫu, chọn lại mẫu cho chứng từ của hồ sơ và kiểm tra lại file mẫu trên Drive (ví dụ sau khi quản trị tải mẫu mới / đổi phiên bản).
 * Không phát hành gì, không sửa hồ sơ. Trả mẫu đang được tự dùng, có dùng được không và có ĐỔI MẪU so với trước khi cập nhật không.
 */
function capNhatMauChungTu(maHoSo, loai) {
  yeuCauDangNhap_();
  if (!laLoaiTaiLieuHopLe_(loai)) throw new Error('Loại tài liệu không hợp lệ: ' + loai);
  var d = layDuLieuDayDu(maHoSo), lt = loaiTienTaiLieu_(d, loai), soDong = d.chiTiet.length, nh = d.hopDong.TenNganHang || '', pb = d.hoSo.PhienBanTien;
  var cu = chonMauTaiLieu_(loai, lt, soDong, nh, pb);
  xoaCacheMau_();
  var moi = chonMauTaiLieu_(loai, lt, soDong, nh, pb);
  if (!moi) return { maHoSo: String(maHoSo), loaiTaiLieu: loai, maMau: '', phienBan: '', hopLe: false, doiMau: !!cu, mauCu: cu ? cu.MaMau : '', loi: ['Chưa có mẫu hiệu lực phù hợp cho "' + nhanChungTu_(loai) + '". Quản trị tải mẫu ở Cài đặt → Quản lý mẫu văn bản, hoặc bấm "Chọn mẫu khác".'] };
  var f = kiemTraTepMau_(moi), doi = !cu || cu.MaMau !== moi.MaMau || Number(cu.PhienBan) !== Number(moi.PhienBan), thieu = thieuDuLieuCuaMau_(d, loai, moi), loi = f.loi.slice();
  if (thieu.length) loi.push('Thiếu ' + thieu.length + ' trường dữ liệu bắt buộc: ' + thieu.slice(0, 6).map(function (x) { return x.nhan + (x.dong ? ' (dòng ' + x.dong + ')' : ''); }).join(', ') + (thieu.length > 6 ? '…' : '') + '.');
  ghiNhatKy_(maHoSo, 'CAP_NHAT_MAU_CHUNG_TU', loai + ' | ' + (cu ? cu.MaMau + ' v' + cu.PhienBan : '-') + ' -> ' + moi.MaMau + ' v' + moi.PhienBan + ' | ' + (f.fileTonTai ? 'file OK' : 'file thiếu') + ' | thiếu ' + thieu.length + ' trường');
  return { maHoSo: String(maHoSo), loaiTaiLieu: loai, maMau: moi.MaMau, phienBan: Number(moi.PhienBan), tenMau: moi.TenMau || moi.MaMau, hopLe: f.fileTonTai && !thieu.length, doiMau: doi, mauCu: cu ? cu.MaMau : '', loi: loi, thieuDuLieu: thieu };
}

/** Danh sách mẫu (mọi phiên bản), mẫu mới nhất lên đầu — chỉ quản trị viên. */
function layDanhSachMauVanBan() {
  yeuCauDangNhap_();
  yeuCauQuanTri_('xem danh sách mẫu văn bản');
  return docDanhSachMau_(true).map(function (m) {
    var link = '';
    try { link = DriveApp.getFileById(m.FileDocxId).getUrl(); } catch (e) { link = ''; }
    return {
      maMau: m.MaMau, tenMau: m.TenMau, nganHang: m.NganHang, loaiTaiLieu: m.LoaiTaiLieu, loaiTien: m.LoaiTien, dieuKien: m.DieuKienSoDong,
      phienBan: m.PhienBan, trangThai: m.TrangThai, macDinh: (m.MacDinh === true || String(m.MacDinh).toUpperCase() === 'TRUE'),
      loaiFile: m.LoaiFile || 'docx', tenFile: m.TenFile, kichThuocKB: m.KichThuocKB, coHangMau: (m.CoHangMau === true || String(m.CoHangMau).toUpperCase() === 'TRUE'),
      placeholder: m.DanhSachPlaceholder, canhBao: m.CanhBao, ngayHieuLuc: ngayChoMau_(m.NgayHieuLuc), ngayTao: ngayChoMau_(m.NgayTao),
      nguoiTao: m.NguoiTao, ghiChu: m.GhiChu || '', ngayCapNhat: ngayChoMau_(m.NgayCapNhat), nguoiCapNhat: m.NguoiCapNhat, linkFile: link
    };
  }).reverse();
}

/** Cập nhật vài cột của 1 phiên bản mẫu (dưới khoá). capNhat = {tenCot: giaTri}. */
function capNhatDongMau_(maMau, phienBan, capNhat) {
  var sh = getSS_().getSheetByName(SHEET_MAU_VAN_BAN);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var vals = layGiaTriThatCuaSheet_(sh), cMa = headers.indexOf('MaMau'), cPb = headers.indexOf('PhienBan'), dem = 0;
  for (var r = 1; r < vals.length; r++) {
    if (vals[r][cMa] === maMau && Number(vals[r][cPb]) === Number(phienBan)) {
      Object.keys(capNhat).forEach(function (k) { var c = headers.indexOf(k); if (c >= 0) sh.getRange(r + 1, c + 1).setValue(capNhat[k]); });
      dem++;
    }
  }
  return dem;
}

/**
 * XOÁ 1 phiên bản mẫu CHƯA TỪNG DÙNG phát hành tài liệu (xoá dòng trong DM_MauVanBan, chuyển file mẫu vào thùng rác Drive — khôi phục được ~30 ngày).
 * Mẫu đã phát hành ít nhất 1 tài liệu thì KHÔNG xoá được (giữ nguyên để truy vết) — chỉ "Ngừng". Lần phát hành lỗi không tính là đã dùng.
 */
function xoaMauVanBan(maMau, phienBan) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('xoá mẫu văn bản');
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try {
    var m = sheetToObjects_(SHEET_MAU_VAN_BAN).filter(function (x) { return x.MaMau === maMau && Number(x.PhienBan) === Number(phienBan); })[0];
    if (!m) throw new Error('Không tìm thấy mẫu ' + maMau + ' v' + phienBan + '.');
    var daDung = sheetToObjects_(SHEET_LICH_SU_PHAT_HANH).filter(function (r) {
      return String(r.MaMau) === String(maMau) && Number(r.PhienBanMau) === Number(phienBan) && r.TrangThai !== TT_PH_LOI;
    }).length;
    if (daDung) throw new Error('Mẫu ' + maMau + ' v' + phienBan + ' đã được dùng phát hành ' + daDung + ' tài liệu nên không xoá được (để truy vết). Hãy bấm "Ngừng" nếu không muốn dùng nữa.');
    var sh = getSS_().getSheetByName(SHEET_MAU_VAN_BAN);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var vals = layGiaTriThatCuaSheet_(sh), cMa = headers.indexOf('MaMau'), cPb = headers.indexOf('PhienBan'), dong = -1;
    for (var r = 1; r < vals.length; r++) if (vals[r][cMa] === maMau && Number(vals[r][cPb]) === Number(phienBan)) { dong = r + 1; break; }
    if (dong < 0) throw new Error('Không tìm thấy dòng mẫu trong Sheet.');
    var tep = '';
    try { var f = DriveApp.getFileById(m.FileDocxId); tep = f.getName(); f.setTrashed(true); } catch (e) { tep = '(không chuyển được file vào thùng rác: ' + e.message + ')'; }
    xoaDongAnToan_(sh, dong);
    ghiNhatKy_('', 'MAU_XOA', maMau + ' v' + phienBan + ' (' + (m.TenFile || '') + ', ' + (m.TrangThai || '') + ') — file: ' + tep);
    xoaCacheMau_();
    SpreadsheetApp.flush();
    return { ok: true, maMau: maMau, phienBan: Number(phienBan), tep: tep };
  } finally {
    khoa.releaseLock();
  }
}

/**
 * Đặt trạng thái 1 phiên bản: 'Hiệu lực' (đồng thời các phiên bản khác của cùng mã → Hết hiệu lực; dùng để KHÔI PHỤC bản cũ)
 * hoặc 'Hết hiệu lực' (ngừng sử dụng). Mẫu đã dùng để phát hành vẫn nguyên vẹn.
 */
function datTrangThaiMau(maMau, phienBan, trangThai) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('đổi trạng thái mẫu văn bản');
  if ([TT_HIEU_LUC, TT_HET_HIEU_LUC].indexOf(trangThai) < 0) throw new Error('Trạng thái không hợp lệ.');
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try {
    var ds = sheetToObjects_(SHEET_MAU_VAN_BAN), ten = emailNguoiDung_(), nay = new Date();
    var muc = ds.filter(function (x) { return x.MaMau === maMau && Number(x.PhienBan) === Number(phienBan); })[0];
    if (!muc) throw new Error('Không tìm thấy mẫu ' + maMau + ' v' + phienBan + '.');
    if (trangThai === TT_HIEU_LUC) {
      ds.forEach(function (x) {
        if (x.MaMau === maMau && Number(x.PhienBan) !== Number(phienBan) && x.TrangThai === TT_HIEU_LUC) {
          capNhatDongMau_(maMau, x.PhienBan, { TrangThai: TT_HET_HIEU_LUC, NgayCapNhat: nay, NguoiCapNhat: ten });
        }
      });
      capNhatDongMau_(maMau, phienBan, { TrangThai: TT_HIEU_LUC, NgayHieuLuc: nay, NgayCapNhat: nay, NguoiCapNhat: ten });
    } else {
      capNhatDongMau_(maMau, phienBan, { TrangThai: TT_HET_HIEU_LUC, MacDinh: false, NgayCapNhat: nay, NguoiCapNhat: ten });
    }
    ghiNhatKy_('', 'MAU_DOI_TRANG_THAI', maMau + ' v' + phienBan + ' -> ' + trangThai);
    xoaCacheMau_();
    SpreadsheetApp.flush();
    return { ok: true };
  } finally {
    khoa.releaseLock();
  }
}

/** Mẫu mặc định theo loại, tiền, ngân hàng và phạm vi số người; các khoảng 1 / 2 / 3+ độc lập. */
function datMauMacDinh(maMau, phienBan, macDinh) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('chọn mẫu mặc định');
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try {
    var ds = sheetToObjects_(SHEET_MAU_VAN_BAN), ten = emailNguoiDung_(), nay = new Date();
    var muc = ds.filter(function (x) { return x.MaMau === maMau && Number(x.PhienBan) === Number(phienBan); })[0];
    if (!muc) throw new Error('Không tìm thấy mẫu ' + maMau + ' v' + phienBan + '.');
    if (macDinh && muc.TrangThai !== TT_HIEU_LUC) throw new Error('Chỉ đặt mặc định cho mẫu đang hiệu lực.');
    if (macDinh) {
      ds.forEach(function (x) {
        var trungSoNguoi = (Number(x.SoNguoiHuongTu) || 1) <= (Number(muc.SoNguoiHuongDen) || 9999) &&
          (Number(muc.SoNguoiHuongTu) || 1) <= (Number(x.SoNguoiHuongDen) || 9999);
        if (x.LoaiTaiLieu === muc.LoaiTaiLieu && x.LoaiTien === muc.LoaiTien && chuanKhongDau_(x.NganHang) === chuanKhongDau_(muc.NganHang) && trungSoNguoi && (x.MacDinh === true || String(x.MacDinh).toUpperCase() === 'TRUE') &&
            !(x.MaMau === maMau && Number(x.PhienBan) === Number(phienBan))) {
          capNhatDongMau_(x.MaMau, x.PhienBan, { MacDinh: false, NgayCapNhat: nay, NguoiCapNhat: ten });
        }
      });
    }
    capNhatDongMau_(maMau, phienBan, { MacDinh: !!macDinh, NgayCapNhat: nay, NguoiCapNhat: ten });
    ghiNhatKy_('', 'MAU_MAC_DINH', maMau + ' v' + phienBan + ' -> ' + (macDinh ? 'mặc định' : 'bỏ mặc định'));
    xoaCacheMau_();
    SpreadsheetApp.flush();
    return { ok: true };
  } finally {
    khoa.releaseLock();
  }
}

/** Lịch sử chỉnh sửa của 1 mẫu: tải lên phiên bản, đổi trạng thái, đặt mặc định (từ NhatKyHeThong). */
function layLichSuChinhSuaMau(maMau) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('xem lịch sử chỉnh sửa mẫu');
  return sheetToObjects_(SHEET_NHAT_KY).filter(function (r) {
    return /^MAU_/.test(String(r.HanhDong)) && (!maMau || String(r.ChiTiet).indexOf(maMau) >= 0);
  }).reverse().map(function (r) {
    return { thoiGian: Utilities.formatDate(new Date(r.ThoiGian), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'), nguoi: r.NguoiDung, hanhDong: r.HanhDong, chiTiet: r.ChiTiet };
  });
}
