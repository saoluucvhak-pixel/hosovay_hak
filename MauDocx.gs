/**
 * MAUDOCX.GS
 * Quản lý MẪU WORD (.docx): tải lên, phiên bản, hiệu lực, chọn mẫu theo hồ sơ.
 *
 * Mỗi mẫu được định danh theo: Mã mẫu, Tên mẫu, Ngân hàng, Loại tiền (VND/USD/TAT_CA), Loại chứng từ,
 * Số người thụ hưởng áp dụng (từ–đến), Phiên bản, Trạng thái hiệu lực, File DOCX gốc (Drive).
 * Tải lại cùng Mã mẫu => phiên bản mới; phiên bản cũ chuyển "Hết hiệu lực" (file vẫn giữ để đối chiếu/khôi phục).
 * File mẫu KHÔNG BAO GIỜ bị sửa khi phát hành — engine chỉ đọc mẫu và ghi ra bản sao.
 */

var SHEET_MAU_DOCX = 'DM_MauDocx';
var COT_MAU_DOCX_ = ['MaMau', 'TenMau', 'NganHang', 'LoaiTien', 'LoaiChungTu', 'SoNguoiHuongTu', 'SoNguoiHuongDen', 'PhienBan',
  'TrangThai', 'FileIdDocx', 'TenFile', 'KichThuocKB', 'CoHangMau', 'DanhSachPlaceholder', 'CanhBao', 'NgayTai', 'NguoiTai', 'GhiChu'];
var TT_HIEU_LUC = 'Hiệu lực';
var TT_HET_HIEU_LUC = 'Hết hiệu lực';
var KICH_THUOC_MAU_TOI_DA_ = 10 * 1024 * 1024;

function thuMucMauDocx_() {
  var goc = layThuMucGoc_();
  var it = goc.getFoldersByName('MauDocx');
  return it.hasNext() ? it.next() : goc.createFolder('MauDocx');
}

function chuanKhongDau_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
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

/**
 * Chọn mẫu phù hợp nhất (hàm thuần, dùng cho cả kiểm thử): Hiệu lực + đúng loại chứng từ + loại tiền khớp
 * (cụ thể hơn TAT_CA) + số người trong khoảng + ngân hàng khớp (cụ thể hơn để trống) + khoảng hẹp hơn + phiên bản cao hơn.
 */
function chonMauTuDanhSach_(ds, loaiChungTu, loaiTien, soDong, tenNganHang) {
  var tot = null, diemTot = -1;
  ds.forEach(function (m) {
    if (m.TrangThai !== TT_HIEU_LUC || m.LoaiChungTu !== loaiChungTu) return;
    var lt = String(m.LoaiTien || 'TAT_CA').toUpperCase();
    if (lt !== 'TAT_CA' && lt !== loaiTien) return;
    var tu = Number(m.SoNguoiHuongTu) || 1, den = Number(m.SoNguoiHuongDen) || 9999;
    if (soDong < tu || soDong > den) return;
    if (!nganHangKhop_(m.NganHang, tenNganHang)) return;
    var diem = (lt === loaiTien ? 1000000 : 0) + (String(m.NganHang || '').trim() ? 100000 : 0) + (10000 - Math.min(9999, den - tu)) * 10 + (Number(m.PhienBan) || 0);
    if (diem > diemTot) { diemTot = diem; tot = m; }
  });
  return tot;
}

/** Mẫu DOCX đang hiệu lực phù hợp với hồ sơ, hoặc null nếu chưa có. Kèm mảng placeholder đã phân tích khi tải lên. */
function chonMauDocx_(loaiChungTu, loaiTien, soDong, tenNganHang) {
  var ds;
  try { ds = sheetToObjects_(SHEET_MAU_DOCX); } catch (e) { return null; } // chưa khởi tạo tab => dùng mặc định
  var m = chonMauTuDanhSach_(ds, loaiChungTu, loaiTien, soDong, tenNganHang);
  if (!m) return null;
  m.placeholder = String(m.DanhSachPlaceholder || '').split(',').filter(function (x) { return x; });
  m.coHangMau = (m.CoHangMau === true || String(m.CoHangMau).toUpperCase() === 'TRUE');
  return m;
}

function layDanhMucPlaceholder() {
  return { chung: DOCX_KHOA_CHUNG_, dong: DOCX_KHOA_DONG_ };
}

/** Danh sách mẫu (mọi phiên bản), mẫu mới nhất lên đầu — chỉ quản trị viên. */
function layDanhSachMauDocx() {
  yeuCauQuanTri_('xem danh sách mẫu Word');
  var ds = sheetToObjects_(SHEET_MAU_DOCX);
  return ds.map(function (m) {
    var link = '';
    try { link = DriveApp.getFileById(m.FileIdDocx).getUrl(); } catch (e) { link = ''; }
    return {
      maMau: m.MaMau, tenMau: m.TenMau, nganHang: m.NganHang, loaiTien: m.LoaiTien, loaiChungTu: m.LoaiChungTu,
      soNguoiTu: m.SoNguoiHuongTu, soNguoiDen: m.SoNguoiHuongDen, phienBan: m.PhienBan, trangThai: m.TrangThai,
      tenFile: m.TenFile, kichThuocKB: m.KichThuocKB, coHangMau: (m.CoHangMau === true || String(m.CoHangMau).toUpperCase() === 'TRUE'),
      placeholder: m.DanhSachPlaceholder, canhBao: m.CanhBao, ngayTai: formatNgay_(m.NgayTai), nguoiTai: m.NguoiTai, linkFile: link
    };
  }).reverse();
}

/**
 * Tải 1 file .docx mẫu lên Drive và đăng ký phiên bản mới.
 * meta = { maMau, tenMau, nganHang, loaiTien (VND|USD|TAT_CA), loaiChungTu, soNguoiTu, soNguoiDen, ghiChu, tenFile }
 * @return {{ok:boolean, maMau:string, phienBan:number, canhBao:string[], placeholder:string[]}}
 */
function taiMauDocx(meta, base64Data) {
  yeuCauQuanTri_('tải mẫu Word');
  meta = meta || {};
  var maMau = String(meta.maMau || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!maMau) throw new Error('Vui lòng nhập Mã mẫu (chữ, số, gạch dưới).');
  if (!String(meta.tenMau || '').trim()) throw new Error('Vui lòng nhập Tên mẫu.');
  var loaiTien = String(meta.loaiTien || 'TAT_CA').toUpperCase();
  if (['VND', 'USD', 'TAT_CA'].indexOf(loaiTien) < 0) throw new Error('Loại tiền phải là VND, USD hoặc TAT_CA.');
  if (!NHAN_CHUNG_TU_[meta.loaiChungTu]) throw new Error('Loại chứng từ không hợp lệ.');
  var tu = parseInt(meta.soNguoiTu, 10), den = parseInt(meta.soNguoiDen, 10);
  if (isNaN(tu) || isNaN(den) || tu < 1 || den < tu) throw new Error('Số người thụ hưởng áp dụng không hợp lệ (từ ≥ 1, đến ≥ từ).');
  if (!base64Data) throw new Error('Chưa chọn file .docx.');
  var tenFile = String(meta.tenFile || (maMau + '.docx'));
  if (!/\.docx$/i.test(tenFile)) throw new Error('Chỉ nhận file Word định dạng .docx (không nhận .doc).');

  var bytes = Utilities.base64Decode(base64Data);
  if (bytes.length > KICH_THUOC_MAU_TOI_DA_) throw new Error('File mẫu quá lớn (tối đa 10 MB).');
  var blob = Utilities.newBlob(bytes, DOCX_MIME_, tenFile);

  var pt = docxPhanTichMau_(blob);
  var canhBao = pt.canhBao.slice();
  if (!pt.hopLe) throw new Error('Mẫu không đạt, chưa lưu:\n• ' + pt.loi.join('\n• '));
  if (den > 1 && !pt.coHangMau && meta.loaiChungTu !== CT_HDMB) {
    throw new Error('Mẫu áp dụng cho nhiều người thụ hưởng (đến ' + den + ') nhưng KHÔNG có hàng bảng chứa {{CT.*}} để nhân bản. Thêm 1 hàng mẫu vào bảng, hoặc đặt "đến" = 1.');
  }
  if (tu === 1 && den === 1 && !pt.coHangMau && pt.placeholder.every(function (k) { return k.indexOf('CT.') !== 0; })) {
    canhBao.push('Mẫu 1 người thụ hưởng chưa dùng {{CT.*}} — tên người hưởng/số tài khoản sẽ không được điền.');
  }
  if (loaiTien === 'VND' && pt.placeholder.indexOf('HO_SO.TY_GIA') >= 0) canhBao.push('Mẫu VND có dùng {{HO_SO.TY_GIA}} — với hồ sơ VND ô này sẽ để trống.');
  if (loaiTien !== 'USD' && /CONG_TY\.TK_USD/.test(pt.placeholder.join(','))) canhBao.push('Mẫu không dành riêng USD nhưng dùng {{CONG_TY.TK_USD}}.');

  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try {
    var sh = ensureSheet_(getSS_(), SHEET_MAU_DOCX, COT_MAU_DOCX_);
    var ds = sheetToObjects_(SHEET_MAU_DOCX);
    var phienBan = 1;
    ds.forEach(function (m) { if (m.MaMau === maMau) phienBan = Math.max(phienBan, (Number(m.PhienBan) || 0) + 1); });

    // Cảnh báo trùng phạm vi với mẫu khác đang hiệu lực.
    ds.forEach(function (m) {
      if (m.MaMau !== maMau && m.TrangThai === TT_HIEU_LUC && m.LoaiChungTu === meta.loaiChungTu &&
          (m.LoaiTien === loaiTien) && String(m.NganHang || '') === String(meta.nganHang || '') &&
          !((Number(m.SoNguoiHuongDen) || 9999) < tu || (Number(m.SoNguoiHuongTu) || 1) > den)) {
        canhBao.push('Trùng phạm vi với mẫu ' + m.MaMau + ' (v' + m.PhienBan + '). Hệ thống chọn mẫu có khoảng số người hẹp hơn, rồi phiên bản cao hơn.');
      }
    });

    var tenLuu = maMau + '_v' + phienBan + '.docx';
    var file = thuMucMauDocx_().createFile(blob.setName(tenLuu));
    // Phiên bản cũ của cùng mã mẫu -> Hết hiệu lực (không xoá file/dòng).
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var cMa = headers.indexOf('MaMau'), cTT = headers.indexOf('TrangThai');
    var vals = layGiaTriThatCuaSheet_(sh);
    for (var r = 1; r < vals.length; r++) {
      if (vals[r][cMa] === maMau && vals[r][cTT] === TT_HIEU_LUC) sh.getRange(r + 1, cTT + 1).setValue(TT_HET_HIEU_LUC);
    }
    var dong = {
      MaMau: maMau, TenMau: String(meta.tenMau).trim(), NganHang: String(meta.nganHang || '').trim(), LoaiTien: loaiTien,
      LoaiChungTu: meta.loaiChungTu, SoNguoiHuongTu: tu, SoNguoiHuongDen: den, PhienBan: phienBan, TrangThai: TT_HIEU_LUC,
      FileIdDocx: file.getId(), TenFile: tenFile, KichThuocKB: Math.round(bytes.length / 1024), CoHangMau: pt.coHangMau,
      DanhSachPlaceholder: pt.placeholder.join(','), CanhBao: canhBao.join(' | '), NgayTai: new Date(), NguoiTai: emailNguoiDung_(),
      GhiChu: String(meta.ghiChu || '')
    };
    themDongVaoCuoiThat_(sh, headers.map(function (h) { return dong.hasOwnProperty(h) ? dong[h] : ''; }));
    ghiNhatKy_('', 'TAI_MAU_DOCX', maMau + ' v' + phienBan + ' (' + tenFile + ', ' + dong.KichThuocKB + ' KB)');
    SpreadsheetApp.flush();
    return { ok: true, maMau: maMau, phienBan: phienBan, canhBao: canhBao, placeholder: pt.placeholder, linkFile: file.getUrl() };
  } finally {
    khoa.releaseLock();
  }
}

/** Đặt trạng thái 1 phiên bản mẫu: 'Hiệu lực' (các phiên bản khác của cùng mã tự về Hết hiệu lực) hoặc 'Hết hiệu lực'. */
function datTrangThaiMauDocx(maMau, phienBan, trangThai) {
  yeuCauQuanTri_('đổi trạng thái mẫu Word');
  if ([TT_HIEU_LUC, TT_HET_HIEU_LUC].indexOf(trangThai) < 0) throw new Error('Trạng thái không hợp lệ.');
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(30000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try {
    var sh = getSS_().getSheetByName(SHEET_MAU_DOCX);
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var cMa = headers.indexOf('MaMau'), cPb = headers.indexOf('PhienBan'), cTT = headers.indexOf('TrangThai');
    var vals = layGiaTriThatCuaSheet_(sh), thay = 0;
    for (var r = 1; r < vals.length; r++) {
      if (vals[r][cMa] !== maMau) continue;
      if (Number(vals[r][cPb]) === Number(phienBan)) { sh.getRange(r + 1, cTT + 1).setValue(trangThai); thay++; }
      else if (trangThai === TT_HIEU_LUC && vals[r][cTT] === TT_HIEU_LUC) sh.getRange(r + 1, cTT + 1).setValue(TT_HET_HIEU_LUC);
    }
    if (!thay) throw new Error('Không tìm thấy mẫu ' + maMau + ' v' + phienBan + '.');
    ghiNhatKy_('', 'DOI_TRANG_THAI_MAU', maMau + ' v' + phienBan + ' -> ' + trangThai);
    SpreadsheetApp.flush();
    return { ok: true };
  } finally {
    khoa.releaseLock();
  }
}

/**
 * Chạy thử 1 mẫu với dữ liệu của 1 hồ sơ có thật — KHÔNG tạo file, KHÔNG ghi gì: chỉ báo placeholder còn sót,
 * cảnh báo bố cục, số hàng nhân bản. Dùng trước khi cho mẫu có hiệu lực.
 */
function xemThuMauDocx(maMau, phienBan, maHoSo) {
  yeuCauQuanTri_('chạy thử mẫu Word');
  var m = sheetToObjects_(SHEET_MAU_DOCX).filter(function (x) { return x.MaMau === maMau && Number(x.PhienBan) === Number(phienBan); })[0];
  if (!m) throw new Error('Không tìm thấy mẫu.');
  var d = layDuLieuDayDu(maHoSo);
  kiemTraTienDePhatHanh_(d);
  var map = taoBienDayDu_(d), dsDong = taoDanhSachBienDong_(d);
  var kq = docxDienMau_(DriveApp.getFileById(m.FileIdDocx).getBlob(), map, dsDong, 'xem_thu.docx');
  var loi = docxKiemTraKetQua_(kq, map, dsDong, { coHangMau: m.CoHangMau === true || String(m.CoHangMau).toUpperCase() === 'TRUE', placeholder: String(m.DanhSachPlaceholder || '').split(',') });
  return { dat: loi.length === 0, loi: loi, canhBao: kq.canhBao, soHangMau: kq.soHangMau, soHangTao: kq.soHangTao, soDong: dsDong.length };
}

/** Lịch sử phát hành chứng từ của 1 hồ sơ (mới nhất trước) — mọi bản đều còn nguyên link. */
function layLichSuPhatHanh(maHoSo) {
  var ds = sheetToObjects_(SHEET_PHAT_HANH).filter(function (r) { return !maHoSo || String(r.MaHoSo) === String(maHoSo); });
  return ds.reverse().map(function (r) {
    return {
      maPhatHanh: r.MaPhatHanh, maHoSo: r.MaHoSo, loai: NHAN_CHUNG_TU_[r.LoaiChungTu] || r.LoaiChungTu, soLan: r.SoLan,
      mau: r.MaMau ? (r.MaMau + ' v' + r.PhienBanMau) : '(mặc định)', nguon: r.Nguon, trangThai: r.TrangThai,
      linkDocx: r.LinkDocx, linkPdf: r.LinkPdf, linkXlsx: r.LinkXlsx, linkGoc: r.LinkGoc,
      soDong: r.SoDong, tongTien: r.TongTien, nguoi: r.NguoiPhatHanh, ngay: formatNgay_(r.NgayPhatHanh)
    };
  });
}
