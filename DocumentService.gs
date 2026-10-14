/**
 * DOCUMENTSERVICE.GS
 * ĐIỀU PHỐI phát hành tài liệu — điểm vào DUY NHẤT cho mọi nút tạo chứng từ:
 *   layDuLieuDayDu(maHoSo) → kiểm tra dữ liệu tiền → chọn mẫu → chuẩn hoá biến → sao chép mẫu & điền → nhân bản bảng thụ hưởng
 *   → kiểm tra tài liệu → lưu DOCX/XLSX + xuất PDF → ghi lịch sử phát hành → cập nhật link hồ sơ → trả kết quả cho WebApp.
 * Chưa có mẫu phù hợp → dùng biểu mẫu dựng sẵn bằng code (legacy/fallback), ghi rõ trong kết quả (Nguon = MAC_DINH_CODE).
 */

var CUA_SO_TRUNG_LAP_GIAY_ = 15; // hai lần bấm cùng dữ liệu + cùng mẫu trong khoảng này => dùng lại bản vừa phát hành

function hashDuLieuHoSo_(d) {
  return bamDuLieu_(JSON.stringify([d.hoSo.SoTienNhanNoLanNay, d.hoSo.TyGiaBan, d.hoSo.NgayGiaiNgan, d.hoSo.SoGiayNhanNo, d.hopDong.SoHopDong, d.congTy.TenCty,
    d.chiTiet.map(function (c) { return [c.SoTien, c.SoTienQuyDoi, c.TenNguoiHuong, c.SoTaiKhoan, c.TaiNganHang, c.NoiDungThanhToan, c.TaiLieuSo, c.NgayTaiLieu]; })]));
}

function ketQuaTuLichSu_(r, daCo) {
  var laXlsx = r.LoaiFile === 'xlsx';
  return {
    nguon: r.Nguon, loai: NHAN_CHUNG_TU_[r.LoaiTaiLieu], loaiTaiLieu: r.LoaiTaiLieu, loaiFile: r.LoaiFile, mau: r.MaMau, phienBanMau: r.PhienBanMau, soLan: r.SoLan,
    maTaiLieu: r.MaTaiLieu, docUrl: r.LinkGoc, docxUrl: r.LinkDocx, xlsxUrl: laXlsx ? r.LinkXlsx : '', pdfUrl: r.LinkPdf, sheetUrl: '', soDong: r.SoDong,
    fileIdChinh: r.FileIdChinh, canhBao: daCo ? ['Bản vừa phát hành cách đây vài giây với cùng dữ liệu và cùng mẫu — dùng lại, không tạo trùng. Dùng "Tạo lại" nếu cần bản mới.'] : [], daCo: !!daCo
  };
}

/**
 * Phát hành 1 loại tài liệu cho 1 hồ sơ.
 * @param {Object=} tuyChon {batBuocMau: true => không dùng biểu mẫu mặc định; taoLai: true => luôn tạo bản mới (bỏ qua chống trùng)}
 */
function phatHanhChungTu_(maHoSo, loai, d, tuyChon) {
  tuyChon = tuyChon || {};
  if (!NHAN_CHUNG_TU_[loai]) throw new Error('Loại tài liệu không hợp lệ: ' + loai);
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(60000)) throw new Error('Hệ thống đang xử lý một thao tác khác (lưu/phát hành hồ sơ). Vui lòng thử lại sau ít phút.');
  var soLan = 0, mauDung = null;
  try {
    d = d || layDuLieuDayDu(maHoSo);
    if (d.hoSo.TrangThai === 'Đã hủy') throw new Error('Hồ sơ ' + maHoSo + ' đã hủy, không phát hành chứng từ mới.');
    if (loai !== CT_HDMB || String(d.hoSo.LoaiTien || 'VND').toUpperCase() === 'USD') {
      // HĐMB sai loại tiền được báo riêng ngay bên dưới; còn lại kiểm tra theo LOẠI HỒ SƠ giải ngân.
      if (dsChungTuApDung_(d.hoSo).indexOf(loai) < 0) {
        throw new Error('Hồ sơ loại "' + loaiHoSoCuaHoSo_(d.hoSo).ten + '" không dùng "' + NHAN_CHUNG_TU_[loai] + '". Muốn lập, đổi Loại hồ sơ giải ngân của hồ sơ hoặc bật văn bản này cho loại đó ở Cài đặt.');
      }
    }
    if (loai === CT_HDMB && String(d.hoSo.LoaiTien || 'VND').toUpperCase() !== 'USD') {
      throw new Error('Hợp đồng mua bán ngoại tệ chỉ áp dụng cho hồ sơ vay bằng USD.');
    }
    var tom = kiemTraTienDePhatHanh_(d); // chặn nếu tiền chưa hợp lệ, chỉ rõ trường cần sửa

    var laUSD = String(d.hoSo.LoaiTien || 'VND').toUpperCase() === 'USD';
    var mau = chonMauTaiLieu_(loai, laUSD ? 'USD' : 'VND', d.chiTiet.length, d.hopDong.TenNganHang || '');
    mauDung = mau;
    if (!mau && tuyChon.batBuocMau) throw new Error('Chưa có mẫu hiệu lực cho "' + NHAN_CHUNG_TU_[loai] + '" (' + (laUSD ? 'USD' : 'VND') + ', ' + d.chiTiet.length + ' người thụ hưởng). Hãy tải mẫu ở mục Cài đặt → Quản lý mẫu văn bản.');
    var hashDl = hashDuLieuHoSo_(d);

    // Chống tạo trùng ngoài ý muốn (bấm đúp/tải lại trang): cùng dữ liệu + cùng mẫu trong vài giây -> trả lại bản vừa tạo.
    var hh = layPhatHanhHienHanh_(maHoSo, loai);
    if (!tuyChon.taoLai && hh && hh.HashDuLieu === hashDl && String(hh.MaMau || '') === String(mau ? mau.MaMau : '') &&
        String(hh.PhienBanMau || '') === String(mau ? mau.PhienBan : '') && (new Date().getTime() - new Date(hh.NgayPhatHanh).getTime()) < CUA_SO_TRUNG_LAP_GIAY_ * 1000) {
      return ketQuaTuLichSu_(hh, true);
    }

    soLan = soLanPhatHanhTiepTheo_(maHoSo, loai);
    var kq;
    if (mau) {
      var x = xuatTaiLieuTuMau_(d, loai, mau, maHoSo, soLan);
      var laXlsx = x.loaiFile === 'xlsx';
      kq = { nguon: 'MAU_DOCX', loaiFile: x.loaiFile, mau: mau.MaMau, phienBanMau: mau.PhienBan, hashMau: mau.HashFile || '', fileIdChinh: x.fileIdChinh, fileIdPdf: x.fileIdPdf,
        docUrl: x.urlChinh, docxUrl: laXlsx ? '' : x.urlChinh, xlsxUrl: laXlsx ? x.urlChinh : '', pdfUrl: x.pdfUrl, sheetUrl: '', canhBao: x.canhBao };
    } else {
      kq = phatHanhMacDinh_(d, loai, maHoSo);
      kq.canhBao = (kq.canhBao || []).concat(['Chưa có mẫu hiệu lực — dùng biểu mẫu dựng sẵn bằng code (mặc định). Tải mẫu Word/Excel ở Cài đặt → Quản lý mẫu văn bản để tự sinh theo mẫu của bạn.']);
    }
    kq.loai = NHAN_CHUNG_TU_[loai]; kq.loaiTaiLieu = loai; kq.soDong = d.chiTiet.length; kq.soLan = soLan;
    kq.maTaiLieu = maHoSo + '-' + loai + '-L' + soLan; kq.daCo = false;

    ghiPhatHanh_({
      MaTaiLieu: kq.maTaiLieu, MaHoSo: maHoSo, LoaiTaiLieu: loai, SoLan: soLan, MaMau: kq.mau || '', PhienBanMau: kq.phienBanMau || '', LoaiFile: kq.loaiFile || 'google', Nguon: kq.nguon,
      LinkGoc: kq.docUrl || kq.sheetUrl || '', LinkDocx: kq.docxUrl || '', LinkPdf: kq.pdfUrl || '', LinkXlsx: kq.xlsxUrl || '', FileIdChinh: kq.fileIdChinh || '', FileIdPdf: kq.fileIdPdf || '',
      SoDong: d.chiTiet.length, TongTien: tom.tong, TongQuyDoi: tom.tongQuyDoi, HashDuLieu: hashDl, HashMau: kq.hashMau || '', TrangThai: TT_PH_HIEU_LUC,
      NguoiPhatHanh: emailNguoiDung_(), NgayPhatHanh: new Date(), ThongBaoLoi: '', CanhBao: (kq.canhBao || []).join(' | ')
    });
    capNhatLinkChungTu_(maHoSo, loai, { goc: kq.docUrl || kq.sheetUrl, docx: kq.docxUrl, pdf: kq.pdfUrl, xlsx: kq.xlsxUrl });
    ghiNhatKy_(maHoSo, 'PHAT_HANH_' + loai, 'L' + soLan + ' | nguồn=' + kq.nguon + ' | mẫu=' + (kq.mau || '-') + ' | tổng=' + tom.tong);
    SpreadsheetApp.flush();
    return kq;
  } catch (e) {
    // Ghi lại THẤT BẠI để truy vết (không chiếm số lần phát hành).
    try {
      ghiPhatHanh_({ MaTaiLieu: maHoSo + '-' + loai + '-LOI', MaHoSo: maHoSo, LoaiTaiLieu: loai, SoLan: soLan, MaMau: mauDung ? mauDung.MaMau : '', PhienBanMau: mauDung ? mauDung.PhienBan : '',
        TrangThai: TT_PH_LOI, NguoiPhatHanh: emailNguoiDung_(), NgayPhatHanh: new Date(), ThongBaoLoi: String(e.message).substring(0, 1500) });
    } catch (e2) { /* không che lỗi gốc */ }
    throw e;
  } finally {
    khoa.releaseLock();
  }
}

/** Nhánh mặc định (chưa có mẫu): biểu mẫu dựng bằng code cũ — vẫn ghi lịch sử & tách đúng cột link. */
function phatHanhMacDinh_(d, loai, maHoSo) {
  if (loai === CT_DE_NGHI) {
    var r = taoDeNghiMacDinh_(maHoSo, d);
    return { nguon: 'MAC_DINH_CODE', mau: '', docUrl: r.docUrl, docxUrl: '', pdfUrl: r.pdfUrl, xlsxUrl: '', sheetUrl: '', canhBao: [] };
  }
  if (loai === CT_HDMB) {
    var h = taoHDMBMacDinh_(maHoSo, d);
    return { nguon: 'MAC_DINH_CODE', mau: '', docUrl: h.docUrl, docxUrl: '', pdfUrl: h.pdfUrl, xlsxUrl: '', sheetUrl: '', canhBao: [] };
  }
  var c = taoChungTuMacDinh_(maHoSo, d);
  return { nguon: 'MAC_DINH_CODE', mau: '', docUrl: '', sheetUrl: c.sheetUrl, docxUrl: '', pdfUrl: c.pdfUrl, xlsxUrl: c.xlsxUrl, canhBao: [] };
}

/**
 * DANH SÁCH CHỨNG TỪ HỒ SƠ — cho khu "Thực hiện": mỗi loại tài liệu áp dụng cho hồ sơ + mẫu sẽ dùng + bản phát hành hiện hành.
 */
function layDanhSachChungTuHoSo(maHoSo) {
  var d = layDuLieuDayDu(maHoSo);
  var laUSD = String(d.hoSo.LoaiTien || 'VND').toUpperCase() === 'USD';
  var lt = laUSD ? 'USD' : 'VND', soDong = d.chiTiet.length;
  var dsLoai = dsChungTuApDung_(d.hoSo), tenLoaiHoSo = loaiHoSoCuaHoSo_(d.hoSo).ten;
  var thuMuc = '';
  try { thuMuc = layThuMucHoSo_(maHoSo).getUrl(); } catch (e) { /* chưa có */ }
  var lichSu = layLichSuPhatHanh(maHoSo);
  return dsLoai.map(function (loai) {
    var mau = chonMauTaiLieu_(loai, lt, soDong, d.hopDong.TenNganHang || '');
    var hh = layPhatHanhHienHanh_(maHoSo, loai);
    var loiGanNhat = lichSu.filter(function (x) { return x.loaiTaiLieu === loai && x.trangThai === TT_PH_LOI; })[0];
    var ten = NHAN_CHUNG_TU_[loai];
    if (loai === CT_THANH_TOAN) ten = (soDong === 1 ? 'Ủy nhiệm chi (UNC)' : 'Bảng kê chuyển tiền vay') + ' — ' + soDong + ' người thụ hưởng';
    return {
      loaiTaiLieu: loai, tenTaiLieu: ten,
      maMau: mau ? mau.MaMau : '', phienBanMau: mau ? mau.PhienBan : '', loaiFile: mau ? mau.loaiFile : '', nganHang: mau ? (mau.NganHang || '(mọi ngân hàng)') : '', loaiTien: lt,
      nguonMau: mau ? 'MAU' : 'MAC_DINH_CODE',
      trangThai: hh ? 'Đã phát hành' : 'Chưa phát hành', soLan: hh ? hh.SoLan : 0, ngayTao: hh ? ngayChoMau_(hh.NgayPhatHanh) : '', nguoiTao: hh ? hh.NguoiPhatHanh : '',
      linkDocx: hh ? hh.LinkDocx : '', linkPdf: hh ? hh.LinkPdf : '', linkXlsx: hh ? hh.LinkXlsx : '', linkGoc: hh ? hh.LinkGoc : '', maTaiLieu: hh ? hh.MaTaiLieu : '',
      loiGanNhat: loiGanNhat ? loiGanNhat.thongBaoLoi : '', thuMucUrl: thuMuc, loaiHoSo: tenLoaiHoSo
    };
  });
}

/** XEM TRƯỚC 1 tài liệu của hồ sơ (dữ liệu thật, KHÔNG phát hành, KHÔNG ghi lịch sử): tạo file trong thư mục XemTruoc. */
function xemTruocChungTu(maHoSo, loai) {
  var d = layDuLieuDayDu(maHoSo);
  kiemTraTienDePhatHanh_(d);
  var lt = String(d.hoSo.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
  var mau = chonMauTaiLieu_(loai, lt, d.chiTiet.length, d.hopDong.TenNganHang || '');
  if (!mau) throw new Error('Chưa có mẫu hiệu lực cho "' + NHAN_CHUNG_TU_[loai] + '" nên chưa xem trước được (biểu mẫu mặc định dựng bằng code không hỗ trợ xem trước). Tải mẫu ở Cài đặt → Quản lý mẫu văn bản.');
  var ten = 'XemTruoc_' + TIEN_TO_FILE_[loai] + '_' + maHoSo + '.' + mau.loaiFile;
  var kq = dienVaKiemTraMau_(mau, d, ten);
  if (kq.loi.length) throw new Error('Xem trước chưa đạt:\n• ' + kq.loi.join('\n• '));
  var thuMuc = thuMucXemTruoc_();
  var tep = thuMuc.createFile(kq.blob.setName('XemTruoc_' + TIEN_TO_FILE_[loai] + '_' + maHoSo + '_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd') + '.' + mau.loaiFile));
  var pdf = xuatPdfTuTepOffice_(tep, thuMuc, tep.getName().replace(/\.(docx|xlsx)$/, '') + '.pdf');
  return { linkFile: tep.getUrl(), linkPdf: pdf.url, loiPdf: pdf.loi, mau: mau.MaMau + ' v' + mau.PhienBan, canhBao: kq.canhBao, soDong: d.chiTiet.length };
}
