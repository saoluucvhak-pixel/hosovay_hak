/**
 * DOCUMENTVALIDATOR.GS
 * Kiểm tra: (1) dữ liệu tiền của hồ sơ TRƯỚC khi phát hành, (2) dữ liệu BẮT BUỘC theo từ điển placeholder mà mẫu dùng,
 * (3) tài liệu SAU khi điền (không sót placeholder, đủ số hàng, số tiền có mặt). Chỉ ĐỌC — không sửa, không làm tròn.
 */

/**
 * Chặn phát hành nếu dữ liệu tiền của hồ sơ chưa hợp lệ, và CHỈ RÕ từng trường cần sửa (mã hồ sơ, dòng, trường, giá trị).
 */
function kiemTraTienDePhatHanh_(d) {
  if (Number(d.hoSo.PhienBanTien) === 2) {
    var v2 = kiemTraTienChaCon_(payloadTienChaConDaLuu_(d.hoSo, d.chiTiet), true);
    var chu = v2.loaiTien === 'USD' ? soTienUSDBangChu_(v2.soTienLanNay) : soThanhChuVN(v2.soTienLanNay);
    if (String(d.hoSo.SoTienBangChu || '') !== chu) throw new Error('Số tiền bằng chữ không khớp số tiền vay.');
    (d.chiTiet || []).forEach(function (c, i) { if (Number(c.SoTienQuyDoi) !== v2.chiTiet[i].soTienQuyDoi) throw new Error('Dữ liệu tiền dòng ' + (i + 1) + ' không khớp loại tiền thanh toán.'); });
    return { tong: v2.soTienLanNay, tongQuyDoi: v2.vndThucNhan, soDong: v2.chiTiet.length };
  }
  var loi = [], hs = d.hoSo, ds = d.chiTiet || [];
  var laUSD = String(hs.LoaiTien || 'VND').toUpperCase() === 'USD';

  function doc(viTri, v, duongBat, vnd) {
    try {
      var n = docTienTheoLoai_(v, laUSD && !vnd ? 'USD' : 'VND', viTri);
      if (duongBat && n <= 0) { loi.push('• ' + viTri + ': phải lớn hơn 0.'); return null; }
      return n;
    } catch (e) { loi.push('• [' + viTri + '] ' + e.message); return null; }
  }

  if (!ds.length) loi.push('• ChiTietThuHuong: hồ sơ chưa có dòng thụ hưởng nào.');
  doc('HoSoGiaiNgan.DuNoHienTai', hs.DuNoHienTai, false);
  var tongHs = doc('HoSoGiaiNgan.SoTienNhanNoLanNay', hs.SoTienNhanNoLanNay, true);
  var tyGia = 0;
  if (laUSD) {
    try { tyGia = docTyGia_(hs.TyGiaBan); } catch (e) { loi.push('• [HoSoGiaiNgan.TyGiaBan] ' + e.message); }
    if (!(tyGia > 0)) loi.push('• HoSoGiaiNgan.TyGiaBan: hồ sơ USD phải có tỷ giá bán > 0.');
  }

  var tong = 0, tongQd = 0, tongHopLe = true;
  ds.forEach(function (ct, i) {
    var dong = 'ChiTietThuHuong dòng ' + (i + 1);
    var st = doc(dong + ' – SoTien', ct.SoTien, true);
    var qd = doc(dong + ' – SoTienQuyDoi', ct.SoTienQuyDoi, true, true);
    if (st === null || qd === null) { tongHopLe = false; return; }
    tong = tongTienTheoLoai_([tong, st], laUSD ? 'USD' : 'VND'); tongQd += qd;
    if (laUSD && tyGia > 0) {
      var cho = quyDoiUSDSangVND_(st, tyGia);
      if (cho !== qd) loi.push('• [' + dong + ' – SoTienQuyDoi] đang lưu ' + formatSo_(qd) + ' nhưng ROUND(' + formatSo_(st) + ' × ' + formatTyGia_(tyGia) + ') = ' + formatSo_(cho) + '. Lưu lại hồ sơ để tính lại.');
    } else if (!laUSD && qd !== st) {
      loi.push('• [' + dong + '] hồ sơ VND nhưng SoTienQuyDoi (' + formatSo_(qd) + ') khác SoTien (' + formatSo_(st) + ').');
    }
  });
  if (tongHopLe && tong > TIEN_TOI_DA_) loi.push('• Tổng số tiền vượt giới hạn số nguyên an toàn.');
  if (tongHopLe && tongHs !== null && tong !== tongHs) {
    loi.push('• Tổng các dòng thụ hưởng (' + formatSo_(tong) + ') khác HoSoGiaiNgan.SoTienNhanNoLanNay (' + formatSo_(tongHs) + ').');
  }
  if (tongHs !== null && !loi.length) {
    var chuCho = laUSD ? soTienUSDBangChu_(tongHs) : soThanhChuVN(tongHs);
    if (String(hs.SoTienBangChu || '') !== chuCho) {
      loi.push('• [HoSoGiaiNgan.SoTienBangChu] "' + hs.SoTienBangChu + '" không khớp số tiền bằng số (phải là "' + chuCho + '"). Lưu lại hồ sơ để cập nhật.');
    }
  }
  if (loi.length) {
    throw new Error('Không thể phát hành chứng từ — dữ liệu tiền của hồ sơ ' + hs.MaHoSo + ' chưa hợp lệ. Cần sửa:\n' + loi.join('\n'));
  }
  return { tong: tong, tongQuyDoi: tongQd, soDong: ds.length };
}

/**
 * Trường BẮT BUỘC (theo từ điển) mà mẫu có dùng nhưng dữ liệu đang TRỐNG -> liệt kê nguồn dữ liệu cần bổ sung.
 * Trường tuỳ chọn trống được điền giá trị mặc định (không chặn).
 * @param {string[]} khoaDung placeholder mà mẫu dùng (từ phân tích mẫu khi tải lên)
 */
function kiemTraBatBuoc_(map, dsDong, khoaDung) {
  var td = tuDienPlaceholder_(), loi = [];
  (khoaDung || []).forEach(function (k) {
    var e = td[k];
    if (!e || !e.batBuoc) return;
    if (e.laDong) {
      dsDong.forEach(function (dong, i) {
        if (dong[k] === undefined || String(dong[k]).trim() === '') loi.push('• Dòng thụ hưởng ' + (i + 1) + ': thiếu {{' + k + '}} (nguồn: ' + e.nguon + ')');
      });
    } else if (map[k] === undefined || String(map[k]).trim() === '') {
      loi.push('• Thiếu {{' + k + '}} (nguồn: ' + e.nguon + ')');
    }
  });
  return loi;
}

/**
 * Kiểm tra tài liệu SAU khi điền. Trả về mảng lỗi (rỗng = đạt).
 * `mau` = {coHangMau, placeholder[], loaiFile}.
 */
function kiemTraKetQuaTaiLieu_(ketQua, map, dsDong, mau) {
  var loi = [];
  if (ketQua.conLai.length) loi.push('Còn placeholder chưa xử lý: ' + ketQua.conLai.map(function (k) { return '{{' + k + '}}'; }).join(', '));
  if (ketQua.conNgoac.length) loi.push('Còn ký tự "{{"/"}}" trong văn bản: ' + ketQua.conNgoac.join(' | '));
  if (mau && mau.coHangMau && ketQua.soHangTao !== ketQua.soHangMau * dsDong.length) {
    loi.push('Số hàng thụ hưởng tạo ra (' + ketQua.soHangTao + ') không khớp ' + ketQua.soHangMau + ' hàng mẫu × ' + dsDong.length + ' dòng.');
  }
  if (mau && mau.loaiFile === 'docx') {
    var van = '';
    giaiNenOffice_(ketQua.blob).forEach(function (f) {
      if (f.getName() === 'word/document.xml') van = f.getDataAsString('UTF-8').replace(/<[^>]+>/g, '');
    });
    var tuMau = mau.placeholder || [];
    ['HO_SO.SO_TIEN', 'HO_SO.SO_TIEN_BANG_CHU', 'BANG_KE.TONG_TIEN'].forEach(function (k) {
      if (tuMau.indexOf(k) >= 0 && van.indexOf(docxMaHoa_(String(map[k]))) < 0) loi.push('Giá trị của {{' + k + '}} không thấy trong văn bản đã điền.');
    });
  }
  return loi;
}
