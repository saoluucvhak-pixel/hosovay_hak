/**
 * TEMPLATESERVICE.GS
 * Nghiệp vụ quản lý mẫu: tải lên + kiểm tra + đăng ký phiên bản, kiểm tra lại, xem trước với dữ liệu thử.
 * (Danh mục/chọn mẫu/trạng thái: TemplateRegistry.gs.)
 */

var KICH_THUOC_MAU_TOI_DA_ = 10 * 1024 * 1024;

function thuMucMauVanBan_() {
  var goc = layThuMucGoc_();
  var it = goc.getFoldersByName('MauVanBan');
  return it.hasNext() ? it.next() : goc.createFolder('MauVanBan');
}

/** Link thư mục MauVanBan (nơi lưu file mẫu) để mở từ tab Cài đặt. */
function layLinkThuMucMauVanBan() {
  yeuCauDangNhap_();
  var f = thuMucMauVanBan_();
  return { ten: f.getName(), url: f.getUrl() };
}

function tepMauTheoMuc_(muc) {
  return DriveApp.getFileById(muc.FileDocxId).getBlob();
}

/**
 * Tải 1 file mẫu (.docx hoặc .xlsx) lên Drive và đăng ký PHIÊN BẢN mới.
 * meta = { maMau, tenMau, nganHang, loaiTaiLieu, loaiTien (VND|USD|TAT_CA), dieuKienSoDong ("1", "2-999", "5+") | soNguoiTu/soNguoiDen, macDinh, ghiChu, tenFile }
 * @return {{ok:boolean, maMau:string, phienBan:number, canhBao:string[], placeholder:string[], linkFile:string}}
 */
function taiMauVanBan(meta, base64Data) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('tải mẫu văn bản');
  meta = meta || {};
  var maMau = String(meta.maMau || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!maMau) throw new Error('Vui lòng nhập Mã mẫu (chữ, số, gạch dưới).');
  if (!String(meta.tenMau || '').trim()) throw new Error('Vui lòng nhập Tên mẫu.');
  var loaiTien = String(meta.loaiTien || 'TAT_CA').toUpperCase();
  if (['VND', 'USD', 'TAT_CA'].indexOf(loaiTien) < 0) throw new Error('Loại tiền phải là VND, USD hoặc TAT_CA.');
  if (!laLoaiTaiLieuHopLe_(meta.loaiTaiLieu)) throw new Error('Loại tài liệu không hợp lệ.');
  if (!base64Data) throw new Error('Chưa chọn file mẫu.');
  var tenFile = String(meta.tenFile || (maMau + '.docx'));
  var loaiFile = loaiFileTuTen_(tenFile);
  if (!loaiFile) throw new Error('Chỉ nhận file Word .docx hoặc Excel .xlsx (không nhận .doc/.xls/.dotx). Mở file trong Word/Excel → Lưu thành (Save As) → chọn "Word Document (*.docx)" hoặc "Excel Workbook (*.xlsx)".');

  var bytes = Utilities.base64Decode(base64Data);
  if (bytes.length > KICH_THUOC_MAU_TOI_DA_) throw new Error('File mẫu quá lớn (tối đa 10 MB).');
  var blob = Utilities.newBlob(bytes, loaiFile === 'xlsx' ? XLSX_MIME_ : DOCX_MIME_, tenFile);

  var pt = phanTichMauTaiLieu_(blob, loaiFile);
  var canhBao = pt.canhBao.slice();
  if (!pt.hopLe) throw new Error('Mẫu không đạt, chưa lưu:\n• ' + pt.loi.join('\n• '));
  if (!pt.placeholder.length) {
    throw new Error('File chưa có placeholder {{...}} nào nên không điền được dữ liệu.' + (loaiFile === 'docx'
      ? '\n• Nếu đây là biểu mẫu Word thô (đã điền số liệu thật): dùng khung "Tạo mẫu từ file Word có sẵn" ở dưới để tự chèn placeholder, rồi tải lên.'
      : '\n• Với Excel: gõ {{...}} (ví dụ {{CONG_TY.TEN}}) trực tiếp vào các ô cần điền, lưu lại rồi tải lên.'));
  }
  // Điều kiện số người: để trống = tự nhận (có hàng bảng {{CT.*}} → "1+", ngược lại → "1").
  var dkRaw = meta.dieuKienSoDong !== undefined && String(meta.dieuKienSoDong).trim() !== '' ? meta.dieuKienSoDong : (meta.soNguoiTu ? (meta.soNguoiTu + '-' + (meta.soNguoiDen || meta.soNguoiTu)) : '');
  var dk;
  if (dkRaw === '') {
    dk = phanTichDieuKienSoDong_(pt.coHangMau || !loaiCanHangMau_(meta.loaiTaiLieu) ? '1+' : '1');
    canhBao.push('Điều kiện số người để trống → tự nhận "' + dk.nhan + '" ' + (pt.coHangMau ? '(mẫu có hàng bảng {{CT.*}} nhân bản được).' : '(mẫu không có hàng bảng nhân bản nên chỉ dùng cho 1 người thụ hưởng).'));
  } else {
    dk = phanTichDieuKienSoDong_(dkRaw);
  }
  var haiUnc = meta.loaiTaiLieu === CT_THANH_TOAN && dk.tu === 2 && dk.den === 2 &&
    [1, 2].every(function (i) { return ['SO_TIEN_VN','LOAI_TIEN','TEN_NGUOI_HUONG','SO_TAI_KHOAN','TAI_KHOAN_TRICH_NO'].every(function (k) { return pt.placeholder.indexOf('MON_' + i + '.' + k) >= 0; }); });
  if (dk.den > 1 && !pt.coHangMau && loaiCanHangMau_(meta.loaiTaiLieu) && !haiUnc) {
    throw new Error('Điều kiện số người "' + dk.nhan + '" áp dụng cho nhiều người thụ hưởng, nhưng mẫu KHÔNG có hàng bảng chứa {{CT.*}} để nhân bản theo số người.\n• Mẫu chỉ dành cho 1 người thụ hưởng → đặt điều kiện = 1 (hoặc để trống).\n• Mẫu nhiều người → đặt các {{CT.*}} vào MỘT hàng của bảng (hoặc dùng "Tạo mẫu từ file Word có sẵn" và chọn hàng mẫu).');
  }
  if (dk.tu === 1 && dk.den === 1 && !pt.coHangMau && pt.placeholder.every(function (k) { return k.indexOf('CT.') !== 0; }) && loaiCanHangMau_(meta.loaiTaiLieu)) {
    canhBao.push('Mẫu 1 người thụ hưởng chưa dùng {{CT.*}} — tên người hưởng/số tài khoản sẽ không được điền.');
  }
  if (loaiTien === 'VND' && (pt.placeholder.indexOf('HO_SO.TY_GIA') >= 0)) canhBao.push('Mẫu VND có dùng {{HO_SO.TY_GIA}} — với hồ sơ VND ô này sẽ để trống.');

  var khoa = LockService.getScriptLock(), ketQua;
  if (!khoa.tryLock(30000)) throw new Error('Hệ thống đang bận, vui lòng thử lại.');
  try {
    var sh = ensureSheet_(getSS_(), SHEET_MAU_VAN_BAN, COT_MAU_VAN_BAN_);
    var ds = sheetToObjects_(SHEET_MAU_VAN_BAN);
    var phienBan = 1;
    ds.forEach(function (m) { if (m.MaMau === maMau) phienBan = Math.max(phienBan, (Number(m.PhienBan) || 0) + 1); });
    ds.forEach(function (m) {
      if (m.MaMau !== maMau && m.TrangThai === TT_HIEU_LUC && m.LoaiTaiLieu === meta.loaiTaiLieu && m.LoaiTien === loaiTien &&
          String(m.NganHang || '') === String(meta.nganHang || '') &&
          !((Number(m.SoNguoiHuongDen) || 9999) < dk.tu || (Number(m.SoNguoiHuongTu) || 1) > dk.den)) {
        canhBao.push('Trùng phạm vi với mẫu ' + m.MaMau + ' (v' + m.PhienBan + '). Hệ thống chọn mẫu MẶC ĐỊNH, rồi khoảng số người hẹp hơn, rồi phiên bản cao hơn.');
      }
    });

    var tenLuu = maMau + '_v' + phienBan + '.' + loaiFile;
    var file = thuMucMauVanBan_().createFile(blob.setName(tenLuu));
    var hash = bamDuLieu_(Utilities.base64Encode(bytes));
    // Phiên bản cũ của cùng mã mẫu -> Hết hiệu lực (không xoá file/dòng).
    var nay = new Date(), nguoi = emailNguoiDung_();
    ds.forEach(function (m) {
      if (m.MaMau === maMau && m.TrangThai === TT_HIEU_LUC) capNhatDongMau_(maMau, m.PhienBan, { TrangThai: TT_HET_HIEU_LUC, MacDinh: false, NgayCapNhat: nay, NguoiCapNhat: nguoi });
    });
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var dong = {
      MaMau: maMau, TenMau: String(meta.tenMau).trim(), NganHang: String(meta.nganHang || '').trim(), LoaiTaiLieu: meta.loaiTaiLieu, LoaiTien: loaiTien,
      DieuKienSoDong: dk.nhan, PhienBan: phienBan, NgayHieuLuc: nay, TrangThai: TT_HIEU_LUC, FileDocxId: file.getId(), FileGoogleDocId: '',
      NgayTao: nay, NguoiTao: nguoi, NgayCapNhat: nay, NguoiCapNhat: nguoi, LoaiFile: loaiFile, SoNguoiHuongTu: dk.tu, SoNguoiHuongDen: dk.den,
      TenFile: tenFile, KichThuocKB: Math.round(bytes.length / 1024), CoHangMau: pt.coHangMau, DanhSachPlaceholder: pt.placeholder.join(','),
      CanhBao: canhBao.join(' | '), HashFile: hash, MacDinh: false, GhiChu: String(meta.ghiChu || '') + (haiUnc && String(meta.ghiChu || '').indexOf('[UNC_2_MON]') < 0 ? ' [UNC_2_MON]' : '')
    };
    themDongVaoCuoiThat_(sh, headers.map(function (h) { return dong.hasOwnProperty(h) ? dong[h] : ''; }));
    ghiNhatKy_('', 'MAU_TAI_LEN', maMau + ' v' + phienBan + ' (' + tenFile + ', ' + dong.KichThuocKB + ' KB, hash ' + hash + ')');
    xoaCacheMau_();
    SpreadsheetApp.flush();
    ketQua = { ok: true, maMau: maMau, phienBan: phienBan, canhBao: canhBao, placeholder: pt.placeholder, linkFile: file.getUrl(), loaiFile: loaiFile };
  } finally {
    khoa.releaseLock();
  }
  if (meta.macDinh) datMauMacDinh(maMau, ketQua.phienBan, true); // sau khi nhả khoá (hàm này tự lấy khoá)
  return ketQua;
}

/** Kiểm tra lại 1 mẫu đã lưu: toàn vẹn file (hash), placeholder, danh mục. Không ghi gì. */
function kiemTraLaiMau(maMau, phienBan) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('kiểm tra mẫu văn bản');
  var m = docDanhSachMau_(true).filter(function (x) { return x.MaMau === maMau && Number(x.PhienBan) === Number(phienBan); })[0];
  if (!m) throw new Error('Không tìm thấy mẫu.');
  var blob = tepMauTheoMuc_(m), loai = m.LoaiFile || loaiFileTuTen_(m.TenFile) || 'docx';
  var pt = phanTichMauTaiLieu_(blob, loai);
  var hash = bamDuLieu_(Utilities.base64Encode(blob.getBytes()));
  if (m.HashFile && hash !== m.HashFile) pt.loi.push('File mẫu trên Drive ĐÃ BỊ THAY ĐỔI so với lúc tải lên (hash khác) — không phát hành bằng mẫu này; tải lại thành phiên bản mới.');
  return { hopLe: pt.loi.length === 0, loi: pt.loi, canhBao: pt.canhBao, placeholder: pt.placeholder, coHangMau: pt.coHangMau, nguyenVen: !m.HashFile || hash === m.HashFile };
}

/**
 * XEM TRƯỚC mẫu với DỮ LIỆU THỬ (không đụng dữ liệu sản xuất) hoặc với 1 hồ sơ có thật nếu truyền maHoSo.
 * Tạo file trong thư mục "XemTruoc" (KHÔNG ghi lịch sử phát hành). Trả về link DOCX/XLSX + PDF + kết quả kiểm tra.
 */
function xemTruocMau(maMau, phienBan, maHoSo) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('xem trước mẫu văn bản');
  var m = docDanhSachMau_(true).filter(function (x) { return x.MaMau === maMau && Number(x.PhienBan) === Number(phienBan); })[0];
  if (!m) throw new Error('Không tìm thấy mẫu.');
  var d;
  if (maHoSo) { d = layDuLieuDayDu(maHoSo); kiemTraTienDePhatHanh_(d); }
  else {
    var lt = m.LoaiTien === 'VND' ? 'VND' : 'USD';
    var tu = Number(m.SoNguoiHuongTu) || 1, den = Number(m.SoNguoiHuongDen) || 9999;
    d = layDuLieuThuNghiem_(lt, Math.max(tu, Math.min(den, 3)));
    if (String(m.GhiChu || '').indexOf('[TIEN_V2]') >= 0) {
      var usd = d.hoSo.LoaiTien === 'USD', traUSD = usd && m.LoaiTaiLieu === CT_THANH_TOAN && m.LoaiTien === 'USD';
      d.hoSo.PhienBanTien = 2;
      d.hoSo.USDBan = usd && !traUSD ? d.hoSo.SoTienNhanNoLanNay : 0;
      d.hoSo.VNDThucNhan = traUSD ? 0 : (usd ? quyDoiUSDSangVND_(d.hoSo.USDBan, d.hoSo.TyGiaBan) : d.hoSo.SoTienNhanNoLanNay);
      var daChia = 0;
      d.chiTiet.forEach(function (c, i) {
        c.LoaiTien = traUSD ? 'USD' : 'VND';
        c.SoTien = traUSD ? c.SoTien : (i === d.chiTiet.length - 1 ? d.hoSo.VNDThucNhan - daChia : c.SoTienQuyDoi);
        c.SoTienQuyDoi = traUSD ? 0 : c.SoTien; daChia += c.SoTien;
      });
      kiemTraTienDePhatHanh_(d);
    }
  }
  var loaiFile = m.LoaiFile || loaiFileTuTen_(m.TenFile) || 'docx';
  var kq = dienVaKiemTraMau_(m, d, 'XemTruoc_' + maMau + '_v' + phienBan + '.' + loaiFile);
  if (kq.loi.length) return { dat: false, loi: kq.loi, canhBao: kq.canhBao, soHangMau: 0, soHangTao: 0, soDong: d.chiTiet.length,
    duLieu: maHoSo ? ('hồ sơ ' + maHoSo) : 'dữ liệu thử', linkFile: '', linkPdf: '', loiPdf: '' };
  var thuMuc = thuMucXemTruoc_();
  var tep = thuMuc.createFile(kq.blob.setName('XemTruoc_' + maMau + '_v' + phienBan + '_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd') + '.' + loaiFile));
  var pdf = xuatPdfTuTepOffice_(tep, thuMuc, tep.getName().replace(/\.(docx|xlsx)$/, '') + '.pdf');
  return { dat: kq.loi.length === 0, loi: kq.loi, canhBao: kq.canhBao, soHangMau: kq.soHangMau, soHangTao: kq.soHangTao, soDong: d.chiTiet.length,
    duLieu: maHoSo ? ('hồ sơ ' + maHoSo) : 'dữ liệu thử', linkFile: tep.getUrl(), linkPdf: pdf.url, loiPdf: pdf.loi };
}
