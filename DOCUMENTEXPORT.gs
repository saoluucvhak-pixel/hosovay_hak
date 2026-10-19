/**
 * DOCUMENTEXPORT.GS
 * Điền mẫu + kiểm tra + xuất tệp chính (DOCX/XLSX) và PDF.
 */

/**
 * Điền dữ liệu hồ sơ `d` vào BẢN SAO của mẫu `muc` (file mẫu KHÔNG bị sửa), rồi kiểm tra. Không ném lỗi nghiệp vụ:
 * trả về { blob, loi[], canhBao[], soHangMau, soHangTao, map, dsDong }. `loi` rỗng = đạt.
 */
function dienVaKiemTraMau_(muc, d, tenRa) {
  var loaiFile = muc.loaiFile || muc.LoaiFile || loaiFileTuTen_(muc.TenFile) || 'docx';
  var khoaDung = muc.placeholder || String(muc.DanhSachPlaceholder || '').split(',').filter(function (x) { return x; });
  var map = taoBienTheoTaiLieu_(d, muc.LoaiTaiLieu || muc.loaiTaiLieu), dsDong = taoDanhSachBienDong_(d);
  var loi = kiemTraBatBuoc_(map, dsDong, khoaDung);
  if (String(muc.GhiChu || '').indexOf('[TIEN_V2]') >= 0 && Number(d.hoSo.PhienBanTien) !== 2) loi.push('Mẫu này dùng mô hình tiền cha–con v2; hồ sơ lịch sử cần dùng mẫu tương thích với mô hình tiền đã lưu.');
  if (khoaDung.some(function (k) { return /^MON_[12]\./.test(k); }) && d.chiTiet.length !== 2) loi.push('Mẫu hai UNC chỉ dùng cho đúng 2 món giải ngân.');
  if (Number(d.hoSo.PhienBanTien) === 2) {
    var hasVND = dsDong.some(function (c) { return c['CT.LOAI_TIEN'] === 'VND'; }), hasUSD = dsDong.some(function (c) { return c['CT.LOAI_TIEN'] === 'USD'; });
    var ltTaiLieu = loaiTienTaiLieu_(d, muc.LoaiTaiLieu || muc.loaiTaiLieu);
    if (khoaDung.indexOf('CT.SO_TIEN') >= 0 && khoaDung.indexOf('CT.LOAI_TIEN') < 0 && dsDong.some(function (c) { return c['CT.LOAI_TIEN'] !== ltTaiLieu; })) loi.push('Mẫu hiện tại chưa thể hiện đúng loại tiền thực trả. Hãy thêm {{CT.LOAI_TIEN}} cạnh {{CT.SO_TIEN}}, hoặc dùng trường tổng USD của hồ sơ và cột VND thực trả riêng.');
    if (hasVND && hasUSD && khoaDung.indexOf('CT.SO_TIEN') >= 0 && khoaDung.indexOf('CT.LOAI_TIEN') < 0) loi.push('Mẫu thanh toán nhiều loại tiền phải có {{CT.LOAI_TIEN}} cạnh số tiền.');
    if (hasVND && hasUSD && khoaDung.some(function (k) { return ['BANG_KE.TONG_TIEN','BANG_KE.TONG_TIEN_VN','BANG_KE.TONG_TIEN_BANG_CHU'].indexOf(k) >= 0; })) loi.push('Mẫu nhiều loại tiền phải dùng tổng VND và tổng USD riêng.');
  }
  var blobMau = tepMauTheoMuc_(muc);
  if (muc.HashFile && bamDuLieu_(Utilities.base64Encode(blobMau.getBytes())) !== muc.HashFile) {
    loi.push('File mẫu ' + muc.MaMau + ' v' + muc.PhienBan + ' trên Drive đã bị thay đổi sau khi tải lên (hash khác). Mẫu là bất biến: hãy tải lại thành phiên bản mới.');
  }
  if (loi.length) return { blob: null, loi: ['Thiếu dữ liệu bắt buộc để điền mẫu:'].concat(loi), canhBao: [], soHangMau: 0, soHangTao: 0, map: map, dsDong: dsDong };
  var kq = renderTaiLieu_(blobMau, loaiFile, map, dsDong, tenRa);
  var coHang = (muc.coHangMau !== undefined) ? muc.coHangMau : (muc.CoHangMau === true || String(muc.CoHangMau).toUpperCase() === 'TRUE');
  var loiSau = kiemTraKetQuaTaiLieu_(kq, map, dsDong, { coHangMau: coHang, placeholder: khoaDung, loaiFile: loaiFile });
  return { blob: kq.blob, loi: loiSau, canhBao: kq.canhBao, soHangMau: kq.soHangMau, soHangTao: kq.soHangTao, map: map, dsDong: dsDong };
}

/**
 * Phát hành 1 tài liệu từ mẫu: điền -> kiểm tra (dừng nếu chưa đạt) -> lưu tệp chính (DOCX/XLSX) -> xuất PDF.
 * @return {{loaiFile, fileIdChinh, urlChinh, pdfUrl, fileIdPdf, canhBao[]}}
 */
function xuatTaiLieuTuMau_(d, loai, mau, maHoSo, soLan) {
  var duoi = mau.loaiFile || 'docx';
  var tenTep = tenTepTaiLieu_(loai, maHoSo, soLan, duoi);
  var kq = dienVaKiemTraMau_(mau, d, tenTep);
  if (kq.loi.length) throw new Error('Mẫu "' + mau.MaMau + '" v' + mau.PhienBan + ' sinh ra tài liệu chưa đạt, đã DỪNG phát hành:\n• ' + kq.loi.join('\n• '));
  var tep = thuMucLuuTru_(maHoSo, duoi.toUpperCase()).createFile(kq.blob.setName(tenTep));
  var pdf = xuatPdfTuTepOffice_(tep, thuMucLuuTru_(maHoSo, 'PDF'), tenTepTaiLieu_(loai, maHoSo, soLan, 'pdf'));
  var canhBao = kq.canhBao.slice();
  if (pdf.loi) canhBao.push('Không xuất được PDF: ' + pdf.loi);
  return { loaiFile: duoi, fileIdChinh: tep.getId(), urlChinh: tep.getUrl(), pdfUrl: pdf.url, fileIdPdf: pdf.id, canhBao: canhBao };
}
