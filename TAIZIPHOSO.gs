/**
 * TAIZIPHOSO.GS — "Tải trọn bộ hồ sơ (ZIP)": gom chứng từ đã phát hành (Hiệu lực) + hóa đơn/bảng lương đính kèm của MỘT hồ sơ
 * thành 1 file ZIP trả thẳng về trình duyệt (base64). Máy chủ đọc Drive bằng quyền của chủ Web App nên người dùng KHÔNG cần
 * được cấp quyền Drive và không phải mở thư mục. Chỉ đọc: không tạo/sửa file hay dòng dữ liệu nào (trừ nhật ký tải).
 * Giới hạn: Apps Script trả dữ liệu cho trình duyệt có trần dung lượng → vượt ZIP_TOI_DA_BYTE_ thì bỏ bớt tệp đính kèm và báo rõ.
 */
var ZIP_TOI_DA_BYTE_ = 30 * 1024 * 1024;

function tenTepAnToan_(s) {
  return String(s || 'tep').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 80) || 'tep';
}

function taiBoHoSoZip(maHoSo) {
  yeuCauDangNhap_();
  maHoSo = String(maHoSo || '').trim();
  if (!maHoSo) throw new Error('Thiếu mã hồ sơ.');
  chanNeuNgoaiPhamViHoSo_(maHoSo);
  var hs = layHoSoTheoMa_(maHoSo);
  if (!hs) throw new Error('Không tìm thấy hồ sơ ' + maHoSo + '.');

  var blobs = [], dong = [], thieu = [], tong = 0, dung = {};
  function them(blob, tenTrongZip, nhan, batBuoc) {
    var n = blob.getBytes().length;
    if (!batBuoc && tong + n > ZIP_TOI_DA_BYTE_) { thieu.push(nhan + ': bỏ qua vì vượt giới hạn tải trực tiếp (' + Math.round(ZIP_TOI_DA_BYTE_ / 1048576) + ' MB); lấy từ thư mục Drive của hồ sơ'); return; }
    var ten = tenTrongZip, k = 1; while (dung[ten]) { k++; ten = tenTrongZip.replace(/(\.[A-Za-z0-9]+)?$/, '_' + k + '$1'); }
    dung[ten] = true; blob.setName(ten); blobs.push(blob); tong += n; dong.push(ten);
  }

  // 1) Chứng từ phát hành hiện hành (mỗi loại một bản "Hiệu lực": tệp chính + PDF)
  var theoLoai = {}, thuTu = [];
  docLichSuPhatHanh_().forEach(function (r) {
    if (String(r.MaHoSo) !== maHoSo || r.TrangThai !== TT_PH_HIEU_LUC) return;
    if (!theoLoai[r.LoaiTaiLieu]) thuTu.push(r.LoaiTaiLieu);
    theoLoai[r.LoaiTaiLieu] = r;
  });
  thuTu.forEach(function (loai, i) {
    var r = theoLoai[loai], goc = String(i + 1).length < 2 ? '0' + (i + 1) : String(i + 1), ten = tenTepAnToan_(nhanChungTu_(loai));
    [[r.FileIdChinh, String(r.LoaiFile || 'docx').toLowerCase(), 'tệp chính'], [r.FileIdPdf, 'pdf', 'PDF']].forEach(function (p) {
      if (!p[0]) return;
      try { them(DriveApp.getFileById(p[0]).getBlob(), goc + '_' + ten + '_' + tenTepAnToan_(maHoSo) + '_L' + (r.SoLan || 1) + '.' + p[1], nhanChungTu_(loai) + ' (' + p[2] + ')', true); }
      catch (e) { thieu.push(nhanChungTu_(loai) + ' (' + p[2] + '): không đọc được file trên Drive — ' + e.message); }
    });
  });
  if (!blobs.length) throw new Error('Hồ sơ ' + maHoSo + ' chưa có chứng từ phát hành hợp lệ. Hãy bấm “Tạo trọn bộ hồ sơ” trước.');

  // 2) Hóa đơn GTGT / bảng lương đính kèm nằm trong thư mục riêng của hồ sơ (chỉ đọc, KHÔNG tạo thư mục mới)
  try {
    var it = layThuMucGoc_().getFoldersByName(maHoSo);
    if (it.hasNext()) {
      var thuMuc = it.next();
      [['HoaDonGTGT', 'dinh_kem_hoa_don'], ['BangLuong', 'dinh_kem_bang_luong']].forEach(function (c) {
        var ic = thuMuc.getFoldersByName(c[0]);
        if (!ic.hasNext()) return;
        var fi = ic.next().getFiles();
        while (fi.hasNext()) {
          var f = fi.next();
          try { if (f.isTrashed && f.isTrashed()) continue; them(f.getBlob(), c[1] + '/' + tenTepAnToan_(f.getName().replace(/\.[^.]+$/, '')) + (/\.[A-Za-z0-9]+$/.test(f.getName()) ? f.getName().match(/\.[A-Za-z0-9]+$/)[0] : ''), 'đính kèm ' + f.getName(), false); }
          catch (e) { thieu.push('đính kèm ' + f.getName() + ': ' + e.message); }
        }
      });
    }
  } catch (e) { thieu.push('Không đọc được thư mục đính kèm của hồ sơ: ' + e.message); }

  // 3) Tệp thông tin
  var me = ''; try { me = layDanhTinh_().email || emailNguoiDung_(); } catch (e) { me = ''; }
  var gio = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
  var info = ['HỒ SƠ GIẢI NGÂN ' + maHoSo, 'Trạng thái hồ sơ: ' + (hs.TrangThai || ''), 'Loại tiền: ' + (hs.LoaiTien || ''), 'Tạo gói lúc: ' + gio + (me ? ' bởi ' + me : ''), '', 'DANH SÁCH TỆP (' + dong.length + '):']
    .concat(dong.map(function (t) { return ' - ' + t; })).concat(thieu.length ? ['', 'LƯU Ý (không có trong gói):'].concat(thieu.map(function (t) { return ' - ' + t; })) : []).join('\n');
  blobs.push(Utilities.newBlob(info, 'text/plain', '00_THONG_TIN.txt'));

  var tenZip = 'HoSo_' + tenTepAnToan_(maHoSo) + '_' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmm').replace(/[^0-9_]/g, '') + '.zip';
  var zip = Utilities.zip(blobs, tenZip), bytes = zip.getBytes();
  ghiNhatKy_(maHoSo, 'TAI_ZIP_HO_SO', dong.length + ' tệp, ' + Math.round(bytes.length / 1024) + ' KB');
  return { tenFile: tenZip, base64: Utilities.base64Encode(bytes), soTep: dong.length, kichThuocKB: Math.round(bytes.length / 1024), thieu: thieu };
}
