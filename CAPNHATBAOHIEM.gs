/**
 * CAPNHATBAOHIEM.GS — “CẬP NHẬT BẢO HIỂM TSĐB” từ file Excel + thêm công ty bảo hiểm vào Khách hàng.
 *
 * LUỒNG: xemTruocCapNhatTSDB (đọc Excel, KHÔNG ghi) → người dùng xem từng dòng (tạo mới / cập nhật / lỗi; bảo hiểm thêm / đã có) → apDungCapNhatTSDB (ghi, kiểm tra lại từng dòng ở máy chủ).
 *
 * MỖI DÒNG EXCEL = 1 tài sản bảo đảm của 1 hợp đồng vay. Cột (nhận theo tiêu đề, không phân biệt dấu/hoa thường, thứ tự tuỳ ý; chỉ “Tên tài sản” là bắt buộc):
 *   Tài sản:  Mã tài sản · Tên tài sản · Loại tài sản · Nguyên giá · Khấu hao · Giá trị còn lại · Giá trị định giá · Ngày định giá · Số hợp đồng vay
 *   Bảo hiểm: Công ty bảo hiểm · Số hợp đồng bảo hiểm · Ngày ký hợp đồng bảo hiểm · Giá trị bảo hiểm · Phí bảo hiểm · Tiền bảo hiểm · Bảo hiểm từ ngày · Đến ngày
 * QUY TẮC: Giá trị còn lại = Nguyên giá − Khấu hao (để trống thì tự tính; có đủ 3 số mà lệch thì báo lỗi dòng). “Giá trị định giá” là số hiện ở Đăng ký thế chấp tài sản (bắt buộc khi tạo mới, bỏ trống khi cập nhật thì giữ nguyên).
 * Tài sản đã có (theo Mã tài sản, hoặc trùng Tên trong cùng hợp đồng) được CẬP NHẬT; chưa có thì TẠO MỚI. Hợp đồng bảo hiểm đã có (cùng tài sản + số HĐ BH + công ty + ngày ký) được BỎ QUA (nạp lại file không nhân đôi).
 * Công ty bảo hiểm chưa có trong Khách hàng được thêm vào Khách hàng (ghi chú “Công ty bảo hiểm”).
 */
var CAP_NHAT_TSDB_TOI_DA_ = 300;
var TSDB_COT_ = {
  maTS: ['ma tai san', 'ma ts'], ten: ['ten tai san', 'mo ta tai san', 'ten ts', 'mo ta'], loai: ['loai tai san', 'loai ts', 'nhom tai san'],
  nguyenGia: ['nguyen gia'], khauHao: ['khau hao luy ke', 'hao mon luy ke', 'gia tri hao mon', 'khau hao', 'hao mon'], conLai: ['gia tri con lai', 'con lai'],
  dinhGia: ['gia tri dinh gia', 'gia tri tsdb', 'gia tri tai san bao dam', 'dinh gia'], ngayDinhGia: ['ngay dinh gia'],
  soHDVay: ['so hop dong vay', 'so hop dong tin dung', 'so hd vay', 'hop dong vay'],
  congTyBH: ['cong ty bao hiem', 'don vi bao hiem', 'nha bao hiem'], soHDBH: ['so hop dong bao hiem', 'so hd bao hiem', 'so don bao hiem'],
  ngayKyBH: ['ngay ky hop dong bao hiem', 'ngay ky hd bao hiem', 'ngay ky bao hiem'], giaTriBH: ['gia tri bao hiem', 'so tien bao hiem'], phiBH: ['phi bao hiem'], tienBH: ['tien bao hiem', 'so tien duoc bao hiem'],
  tuNgay: ['bao hiem tu ngay', 'ngay bat dau bao hiem', 'tu ngay'], denNgay: ['bao hiem den ngay', 'ngay het han bao hiem', 'ngay ket thuc bao hiem', 'den ngay']
};
var TSDB_NHAN_ = { maTS: 'Mã tài sản', ten: 'Tên tài sản', loai: 'Loại tài sản', nguyenGia: 'Nguyên giá', khauHao: 'Khấu hao', conLai: 'Giá trị còn lại', dinhGia: 'Giá trị định giá', ngayDinhGia: 'Ngày định giá', soHDVay: 'Số hợp đồng vay',
  congTyBH: 'Công ty bảo hiểm', soHDBH: 'Số hợp đồng bảo hiểm', ngayKyBH: 'Ngày ký hợp đồng bảo hiểm', giaTriBH: 'Giá trị bảo hiểm', phiBH: 'Phí bảo hiểm', tienBH: 'Tiền bảo hiểm', tuNgay: 'Bảo hiểm từ ngày', denNgay: 'Đến ngày' };

function tsdbChuanTieuDe_(v) { return chuanKhongDau_(String(v === null || v === undefined ? '' : v)).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
/** Gán cột theo tiêu đề: mỗi tiêu đề thuộc trường có từ khoá DÀI NHẤT nằm trong tiêu đề; mỗi trường lấy cột đầu tiên khớp. */
function tsdbMapCot_(hang) {
  var map = {}, dem = 0;
  hang.forEach(function (c, i) {
    var t = tsdbChuanTieuDe_(c), tot = null, dai = 0;
    if (!t) return;
    Object.keys(TSDB_COT_).forEach(function (k) {
      TSDB_COT_[k].forEach(function (s) { if ((t === s || (' ' + t + ' ').indexOf(' ' + s + ' ') >= 0) && s.length > dai) { dai = s.length; tot = k; } });
    });
    if (tot && map[tot] === undefined) { map[tot] = i; dem++; }
  });
  return { map: map, so: dem };
}
function tsdbLoaiTuChu_(v) {
  var t = tsdbChuanTieuDe_(v); if (!t) return '';
  var khop = Object.keys(LOAI_TAI_SAN_).filter(function (k) { return tsdbChuanTieuDe_(LOAI_TAI_SAN_[k]) === t || tsdbChuanTieuDe_(k) === t; })[0]; if (khop) return khop;
  if (/bat dong san|nha|dat|quyen su dung|xuong|van phong/.test(t)) return 'BDS';
  if (/dong san|xe|o to|may|phuong tien|thiet bi|day chuyen/.test(t)) return 'DONG_SAN';
  if (/tien gui|giay to co gia|so tiet kiem|trai phieu/.test(t)) return 'TIEN_GUI';
  if (/hang ton kho|ton kho|hang hoa/.test(t)) return 'HANG_TON_KHO';
  return 'KHAC';
}
/** Ngày trong Excel: Date → ngày VN; chuỗi → yyyy-MM-dd. khongTuongLai dùng CHUNG quy tắc với nhập tay: ngày ký hợp đồng bảo hiểm và ngày định giá không ở tương lai. */
function tsdbNgay_(v, ten, khongTuongLai) {
  if (v === null || v === undefined || String(v).trim() === '') return '';
  if (v instanceof Date) { var iso = Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); return ngayChuanISO_(iso, ten, !!khongTuongLai); }
  return ngayChuanISO_(String(v).trim(), ten, !!khongTuongLai);
}
/** Số tiền trong Excel: ô TRỐNG → null (khác số 0); “1.234”/“1,234” = 1234 (nhóm nghìn); “12,5” (thập phân) bị từ chối vì tiền là số nguyên. */
function tsdbTien_(v, ten) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  return docTienNguyen_(soTuChuoiHoacSo_(v), ten, false);
}
/** Chuẩn hoá 1 dòng đã có sẵn các trường chữ/số thô → đối tượng sạch + danh sách lỗi (dùng cho cả xem trước lẫn áp dụng). */
function tsdbChuanHoaDong_(r, soDong) {
  var o = { dong: soDong, loi: [], canhBao: [] }, bat = function (f) { try { return f(); } catch (e) { o.loi.push(e.message); return null; } };
  r = r || {};
  o.maTS = String(r.maTS || '').trim().substring(0, 40);
  o.ten = lamSachCongThuc_(String(r.ten || '').trim());
  if (o.ten.length < 3 || o.ten.length > 300) o.loi.push('Tên tài sản bắt buộc (3–300 ký tự).');
  o.loai = r.loai === undefined || r.loai === '' ? '' : (LOAI_TAI_SAN_[r.loai] ? r.loai : tsdbLoaiTuChu_(r.loai));
  o.nguyenGia = bat(function () { return tsdbTien_(r.nguyenGia, 'Nguyên giá'); }); o.khauHao = bat(function () { return tsdbTien_(r.khauHao, 'Khấu hao'); });
  o.conLai = bat(function () { return tsdbTien_(r.conLai, 'Giá trị còn lại'); }); o.dinhGia = bat(function () { return tsdbTien_(r.dinhGia, 'Giá trị định giá'); });
  o.ngayDinhGia = bat(function () { return tsdbNgay_(r.ngayDinhGia, 'Ngày định giá', true); }) || '';
  o.soHDVay = String(r.soHDVay || '').trim();
  if (o.nguyenGia !== null && o.khauHao !== null) {
    if (o.khauHao > o.nguyenGia) o.loi.push('Khấu hao (' + o.khauHao + ') lớn hơn nguyên giá (' + o.nguyenGia + ').');
    else if (o.conLai === null) o.conLai = o.nguyenGia - o.khauHao;
    else if (o.conLai !== o.nguyenGia - o.khauHao) o.loi.push('Giá trị còn lại (' + o.conLai + ') ≠ nguyên giá − khấu hao (' + (o.nguyenGia - o.khauHao) + ').');
  }
  var coBH = ['congTyBH', 'soHDBH', 'ngayKyBH', 'giaTriBH', 'phiBH', 'tienBH', 'tuNgay', 'denNgay'].some(function (k) { return String(r[k] === undefined || r[k] === null ? '' : r[k]).trim() !== ''; });
  o.bh = null;
  if (coBH) {
    var b = { congTy: lamSachCongThuc_(String(r.congTyBH || '').trim()), soHD: lamSachCongThuc_(String(r.soHDBH || '').trim()), ngayKy: '', giaTriBH: null, phiBH: null, tienBH: null, tuNgay: '', denNgay: '' };
    if (b.congTy.length < 2 || b.congTy.length > 150) o.loi.push('Bảo hiểm: Công ty bảo hiểm bắt buộc (2–150 ký tự).');
    if (b.soHD.length > 80) o.loi.push('Bảo hiểm: Số hợp đồng bảo hiểm tối đa 80 ký tự.');
    b.ngayKy = bat(function () { var d = tsdbNgay_(r.ngayKyBH, 'Ngày ký hợp đồng bảo hiểm', true); if (!d) throw new Error('Bảo hiểm: thiếu Ngày ký hợp đồng bảo hiểm.'); return d; }) || '';
    b.tuNgay = bat(function () { var d = tsdbNgay_(r.tuNgay, 'Bảo hiểm từ ngày', false); if (!d) throw new Error('Bảo hiểm: thiếu Bảo hiểm từ ngày.'); return d; }) || '';
    b.denNgay = bat(function () { var d = tsdbNgay_(r.denNgay, 'Bảo hiểm đến ngày', false); if (!d) throw new Error('Bảo hiểm: thiếu Đến ngày.'); return d; }) || '';
    if (b.tuNgay && b.denNgay && b.denNgay < b.tuNgay) o.loi.push('Bảo hiểm: Đến ngày không được trước Từ ngày.');
    b.giaTriBH = bat(function () { return tsdbTien_(r.giaTriBH, 'Giá trị bảo hiểm'); }); b.phiBH = bat(function () { return tsdbTien_(r.phiBH, 'Phí bảo hiểm'); }); b.tienBH = bat(function () { return tsdbTien_(r.tienBH, 'Tiền bảo hiểm'); });
    o.bh = b;
  }
  return o;
}
/** Đọc 1 file Excel (base64) thành các sheet { ten, values }. Tách riêng để kiểm thử thay thế được (cần Drive nâng cao v2). */
function docSheetTuExcel_(base64, tenFile) {
  var bytes = Utilities.base64Decode(String(base64 || ''));
  if (!bytes.length) throw new Error('File rỗng hoặc chưa đọc được dữ liệu.');
  if (bytes.length > 10 * 1024 * 1024) throw new Error('File quá lớn (tối đa 10 MB).');
  var goc = null, tam = null;
  try {
    goc = DriveApp.createFile(Utilities.newBlob(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'TSDB_TAM_' + String(tenFile || 'file.xlsx').substring(0, 80)));
    tam = Drive.Files.copy({ title: 'TSDB_TAM_' + goc.getId(), mimeType: 'application/vnd.google-apps.spreadsheet' }, goc.getId(), { convert: true });
    return SpreadsheetApp.openById(tam.id).getSheets().map(function (sh) { return { ten: sh.getName(), values: sh.getDataRange().getValues() }; });
  } finally {
    try { if (tam) DriveApp.getFileById(tam.id).setTrashed(true); } catch (e) { /* file tạm */ }
    try { if (goc) goc.setTrashed(true); } catch (e2) { /* file tạm */ }
  }
}
/** Bóc các dòng tài sản từ các sheet: tìm dòng tiêu đề (trong 25 dòng đầu, có “Tên tài sản” và ≥ 2 cột nhận ra). */
function tsdbBocDong_(dsSheet) {
  var out = [], daThay = false;
  (dsSheet || []).forEach(function (sh) {
    var v = sh.values || [], hdr = -1, cfg = null;
    for (var i = 0; i < Math.min(v.length, 25); i++) { var c = tsdbMapCot_(v[i] || []); if (c.map.ten !== undefined && c.so >= 2) { hdr = i; cfg = c; break; } }
    if (hdr < 0) return;
    daThay = true;
    for (var r = hdr + 1; r < v.length; r++) {
      var ro = v[r] || [], lay = function (k) { return cfg.map[k] === undefined ? '' : ro[cfg.map[k]]; }, ten = String(lay('ten') === null || lay('ten') === undefined ? '' : lay('ten')).trim();
      if (ro.every(function (c) { return c === '' || c === null || c === undefined; })) continue;
      // Dòng TỔNG: nhãn đứng ở cột khác “Tên tài sản” (tên trống) hoặc tên đúng bằng “Tổng/Tổng cộng/Cộng”. KHÔNG loại theo tiền tố tên: “Cổng nhà máy”, “Công trình”, “Tổng kho” vẫn là tài sản.
      var nhanTong = /^(tong|tong cong|cong|tong so|cong tong|total)$/, dau = ro.filter(function (x) { return typeof x === 'string' && x.trim() !== ''; })[0];
      if (ten === '' ? nhanTong.test(tsdbChuanTieuDe_(dau || '')) : nhanTong.test(tsdbChuanTieuDe_(ten))) continue;
      var raw = { sheet: sh.ten };
      Object.keys(TSDB_COT_).forEach(function (k) { var g = lay(k); raw[k] = g instanceof Date ? Utilities.formatDate(g, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : g; }); // ngày về dạng chuỗi theo giờ VN trước khi qua trình duyệt (JSON đổi Date sang UTC)
      out.push({ soDongExcel: r + 1, sheet: sh.ten, raw: raw });
    }
  });
  if (!daThay) throw new Error('Không nhận ra dòng tiêu đề. File cần có cột “Tên tài sản” và ít nhất 1 cột khác (VD Nguyên giá, Giá trị định giá). Tải “Mẫu Excel” để xem bố cục.');
  if (!out.length) throw new Error('Không có dòng tài sản nào dưới dòng tiêu đề.');
  if (out.length > CAP_NHAT_TSDB_TOI_DA_) throw new Error('Tối đa ' + CAP_NHAT_TSDB_TOI_DA_ + ' dòng mỗi lần (file có ' + out.length + '). Chia nhỏ file.');
  return out;
}
function tsdbHopDongTheoSo_(soHD, tra) {
  var k = tsdbChuanTieuDe_(soHD); if (!k) return null;
  return Object.keys(tra.hd).map(function (m) { return tra.hd[m]; }).filter(function (h) { return tsdbChuanTieuDe_(h.SoHopDong) === k; });
}
/** Tìm tài sản đích. Đã nhập Mã tài sản thì PHẢI khớp đúng mã + đúng hợp đồng (không âm thầm chuyển sang dò theo tên); chỉ dò theo tên khi bỏ trống mã, và từ chối nếu trùng tên nhiều tài sản. Trả { ts } hoặc { loi }. */
function tsdbTimTS_(dsTS, maHD, o) {
  if (o.maTS) {
    var m = dsTS.filter(function (t) { return String(t.MaTS) === o.maTS; })[0];
    if (!m) return { loi: 'Mã tài sản “' + o.maTS + '” không có trong hệ thống — sửa mã cho đúng, hoặc để trống để dò theo tên.' };
    if (String(m.MaHD) !== String(maHD)) return { loi: 'Mã tài sản “' + o.maTS + '” thuộc hợp đồng khác (' + m.MaHD + ').' };
    if (m.TrangThai !== TS_DANG_BAO_DAM) return { loi: 'Tài sản “' + o.maTS + '” đã giải chấp — không cập nhật.' };
    return { ts: m };
  }
  var k = tsdbChuanTieuDe_(o.ten), kh = dsTS.filter(function (t) { return String(t.MaHD) === String(maHD) && t.TrangThai === TS_DANG_BAO_DAM && tsdbChuanTieuDe_(t.MoTa) === k; });
  if (kh.length > 1) return { loi: 'Có ' + kh.length + ' tài sản cùng tên “' + o.ten + '” trong hợp đồng (' + kh.map(function (t) { return t.MaTS; }).join(', ') + ') — điền cột Mã tài sản để chỉ rõ.' };
  return { ts: kh[0] || null };
}
/**
 * Tìm dòng hạng mục trong hợp đồng bảo hiểm ứng với dòng Excel (hạng mục = chính tài sản). Quy tắc định danh DUY NHẤT cho nhập tay và Excel:
 * khớp theo khoá (mã tài sản bảo hiểm, không có mã thì tên) trước; không có thì khớp theo TÊN đã chuẩn hoá — để hạng mục nhập tay có mã riêng hoặc bỏ trống mã vẫn là MỘT hạng mục
 * khi Excel cập nhật. Có nhiều dòng cùng khớp thì không đoán: { moHo: n }. Trả { chiSo, dong } | { moHo } | { chiSo: -1 }.
 */
function tsdbTimDongHM_(lines, moi) {
  var k = khoaHangMucBH_(moi), ten = chuanKhongDau_(String(moi.TenTaiSan || '').trim()), theoKhoa = [], theoTen = [];
  lines.forEach(function (l, i) { if (khoaHangMucBH_(l) === k) theoKhoa.push(i); else if (ten && chuanKhongDau_(String(l.TenTaiSan || '').trim()) === ten) theoTen.push(i); });
  var ds = theoKhoa.length ? theoKhoa : theoTen;
  if (ds.length > 1) return { moHo: ds.length };
  return ds.length ? { chiSo: ds[0], dong: lines[ds[0]] } : { chiSo: -1 };
}
function tsdbKhoaBH_(o, maTS) { return [maTS, tsdbChuanTieuDe_(o.bh.soHD), tsdbChuanTieuDe_(o.bh.congTy), o.bh.ngayKy].join('|'); }
/** Dòng chi tiết bảo hiểm do 1 dòng Excel đại diện (hạng mục = chính tài sản đó). null ở số tiền = để trống. */
function tsdbDongCT_(o, maTS) { return { MaTaiSan: maTS, TenTaiSan: o.ten, GiaTriBH: o.bh.giaTriBH, PhiBH: o.bh.phiBH, TienBH: o.bh.tienBH, TuNgay: o.bh.tuNgay, DenNgay: o.bh.denNgay }; }
/** Phân loại 1 dòng đã chuẩn hoá theo dữ liệu hiện có (không ghi): hợp đồng đích, tài sản tạo mới/cập nhật (hợp nhất số cũ–mới), bảo hiểm THEM / DA_CO / CAP_NHAT (cùng khoá nhưng ngày, phí, số tiền đổi). */
function tsdbPhanLoai_(o, ngCanh) {
  var tra = ngCanh.tra, hdChon = ngCanh.hd, hd = hdChon;
  if (o.soHDVay) {
    var kh = tsdbHopDongTheoSo_(o.soHDVay, tra) || [];
    if (hdChon) { if (tsdbChuanTieuDe_(hdChon.SoHopDong) !== tsdbChuanTieuDe_(o.soHDVay)) o.loi.push('Số hợp đồng vay “' + o.soHDVay + '” khác hợp đồng đang chọn (' + hdChon.SoHopDong + ').'); }
    else if (kh.length !== 1) o.loi.push(kh.length ? 'Số hợp đồng vay “' + o.soHDVay + '” trùng nhiều hợp đồng — hãy chọn hợp đồng ở trên.' : 'Không thấy hợp đồng vay “' + o.soHDVay + '”.');
    else hd = kh[0];
  } else if (!hd) o.loi.push('Chưa chọn hợp đồng vay và dòng không có cột Số hợp đồng vay.');
  o.maHD = hd ? String(hd.MaHD) : ''; o.soHopDong = hd ? hd.SoHopDong || '' : '';
  if (hd && ngCanh.pv.length && ngCanh.pv.indexOf(String(hd.MaCty)) < 0) o.loi.push('Hợp đồng ' + o.soHopDong + ' ngoài phạm vi được cấp.');
  var tim = o.maHD && !o.loi.length ? tsdbTimTS_(ngCanh.dsTS, o.maHD, o) : { ts: null }, co = tim.ts;
  if (tim.loi) o.loi.push(tim.loi);
  if (co && !o.loi.length) { // hợp nhất số cũ/mới trước khi kiểm tra: file chỉ nhập khấu hao thì đối chiếu với nguyên giá ĐANG LƯU (kể cả giá trị do dòng trước trong cùng file vừa đổi)
    var truoc = { ng: soCuaO_(co.NguyenGia), kh: soCuaO_(co.KhauHao), cl: soCuaO_(co.GiaTriConLai), dinhGia: soCuaO_(co.GiaTriVND) };
    try { var gt = hopNhatGiaTriTS_({ ng: truoc.ng, kh: truoc.kh, cl: truoc.cl }, { ng: o.nguyenGia, kh: o.khauHao, cl: o.conLai }); o.truoc = truoc; o.nguyenGia = gt.ng; o.khauHao = gt.kh; o.conLai = gt.cl; }
    catch (eHN) { o.loi.push(eHN.message); }
  }
  o.maTSHienCo = co ? String(co.MaTS) : ''; o.trongFile = !!(co && co.ao); o.revisionTS = co && !co.ao ? soTheHe_(co.Revision) : null; o.hanhDongTS = o.loi.length ? 'LOI' : (co ? 'CAP_NHAT' : 'TAO_MOI');
  if (co && co.ao && !o.loi.length) o.canhBao.push('Trùng tài sản với dòng ' + co.ao + ' trong cùng file — dòng này cập nhật tiếp sau dòng đó.');
  if (!co && o.dinhGia === null && !o.loi.length) { o.loi.push('Tạo tài sản mới cần Giá trị định giá.'); o.hanhDongTS = 'LOI'; }
  if (!co && o.dinhGia !== null && !(o.dinhGia > 0) && !o.loi.length) { o.loi.push('Giá trị định giá phải lớn hơn 0.'); o.hanhDongTS = 'LOI'; }
  if (!co && !o.loai && !o.loi.length) o.canhBao.push('Chưa có Loại tài sản — dùng “Khác”.');
  o.hanhDongBH = ''; o.maBHHienCo = ''; o.revisionBH = null; o.bhThayDoi = [];
  if (o.bh && !o.loi.length) {
    var kBH = tsdbKhoaBH_(o, o.maTSHienCo), cu = ngCanh.bhMap[kBH], moi = tsdbDongCT_(o, o.maTSHienCo);
    o.congTyMoi = !ngCanh.khTen[tsdbChuanTieuDe_(o.bh.congTy)];
    if (!cu) { o.hanhDongBH = 'THEM'; if (o.bh.giaTriBH === null || o.bh.phiBH === null || o.bh.tienBH === null) o.canhBao.push('Ô giá trị/phí/tiền bảo hiểm để trống được ghi là 0 (khác với số 0 nhập chủ động chỉ ở chỗ bạn được báo).'); }
    else {
      o.maBHHienCo = cu.maBH; o.revisionBH = cu.ao ? null : cu.revision;
      var tim = tsdbTimDongHM_(cu.lines, moi), dongCu = tim.dong || null;
      if (tim.moHo) { o.loi.push('Hợp đồng bảo hiểm ' + cu.maBH + ' có ' + tim.moHo + ' hạng mục cùng tên/mã với “' + o.ten + '” — sửa tay trên màn hình Bảo hiểm tài sản để chỉ còn một.'); o.hanhDongTS = 'LOI'; o.hanhDongBH = ''; return o; }
      if (!dongCu) o.bhThayDoi.push('thêm hạng mục “' + o.ten + '” vào hợp đồng ' + cu.maBH);
      else {
        [['GiaTriBH', 'giá trị BH'], ['PhiBH', 'phí BH'], ['TienBH', 'tiền BH']].forEach(function (f) { if (moi[f[0]] !== null && Number(dongCu[f[0]]) !== moi[f[0]]) o.bhThayDoi.push(f[1] + ' ' + (Number(dongCu[f[0]]) || 0) + ' → ' + moi[f[0]]); });
        if (ngayIsoCuaO_(dongCu.TuNgay) !== moi.TuNgay) o.bhThayDoi.push('từ ngày ' + ngayIsoCuaO_(dongCu.TuNgay) + ' → ' + moi.TuNgay);
        if (ngayIsoCuaO_(dongCu.DenNgay) !== moi.DenNgay) o.bhThayDoi.push('đến ngày ' + ngayIsoCuaO_(dongCu.DenNgay) + ' → ' + moi.DenNgay);
      }
      o.hanhDongBH = o.bhThayDoi.length ? 'CAP_NHAT' : 'DA_CO';
    }
  }
  return o;
}
/** Ghi nhớ hiệu ứng của 1 dòng vào bộ nhớ để dòng SAU trong cùng file thấy số đã cập nhật (xem trước = mô phỏng tuần tự, áp dụng = sau khi ghi thật). ma* = mã thật hoặc mã ảo. */
function tsdbGhiNho_(o, ng, maTS, maBH, thatSu) {
  var co = ng.dsTS.filter(function (t) { return String(t.MaTS) === String(maTS); })[0], moiTao = !co;
  if (!co) { co = { MaTS: maTS, MaHD: o.maHD, MoTa: o.ten, TrangThai: TS_DANG_BAO_DAM, GiaTriVND: o.dinhGia, Revision: 1, ao: thatSu ? 0 : o.dong }; ng.dsTS.push(co); }
  co.NguyenGia = o.nguyenGia === null ? '' : o.nguyenGia; co.KhauHao = o.khauHao === null ? '' : o.khauHao; co.GiaTriConLai = o.conLai === null ? '' : o.conLai;
  if (o.dinhGia !== null && o.dinhGia > 0) co.GiaTriVND = o.dinhGia;
  if (thatSu) { if (!moiTao) co.Revision = soTheHe_(co.Revision) + 1; ng.suaTS[String(maTS)] = 1; }
  if (o.bh && (o.hanhDongBH === 'THEM' || o.hanhDongBH === 'CAP_NHAT')) {
    var k = tsdbKhoaBH_(o, maTS), moi = tsdbDongCT_(o, maTS), cu = ng.bhMap[k] || (ng.bhMap[k] = { maBH: maBH, revision: 1, lines: [], ao: !thatSu });
    var dongCu = tsdbTimDongHM_(cu.lines, moi).dong || null;
    if (dongCu) { ['GiaTriBH', 'PhiBH', 'TienBH'].forEach(function (f) { if (moi[f] !== null) dongCu[f] = moi[f]; }); dongCu.TuNgay = moi.TuNgay; dongCu.DenNgay = moi.DenNgay; }
    else cu.lines.push({ MaTaiSan: moi.MaTaiSan, TenTaiSan: moi.TenTaiSan, GiaTriBH: moi.GiaTriBH || 0, PhiBH: moi.PhiBH || 0, TienBH: moi.TienBH || 0, TuNgay: moi.TuNgay, DenNgay: moi.DenNgay });
    if (thatSu) { cu.maBH = maBH; cu.revision = soTheHe_(cu.revision) + 1; cu.ao = false; ng.suaBH[String(maBH)] = 1; }
    ng.khTen[tsdbChuanTieuDe_(o.bh.congTy)] = 1;
  }
}
function tsdbNguCanh_(maHD) {
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), hd = null;
  if (maHD) { hopDongTrongPhamVi_(maHD); hd = tra.hd[String(maHD)]; if (!hd) throw new Error('Không tìm thấy hợp đồng vay ' + maHD + '.'); }
  var dsTS = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM), bhMap = {}, khTen = {}, ct = chiTietHienHanhBH_();
  docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (b) { return b.TrangThai === BH_HIEU_LUC; }).forEach(function (b) {
    var lines = ct.filter(function (c) { return String(c.MaBH) === String(b.MaBH); }).map(function (c) { return { MaTaiSan: c.MaTaiSan, TenTaiSan: c.TenTaiSan, GiaTriBH: Number(c.GiaTriBH) || 0, PhiBH: Number(c.PhiBH) || 0, TienBH: Number(c.TienBH) || 0, TuNgay: ngayIsoCuaO_(c.TuNgay), DenNgay: ngayIsoCuaO_(c.DenNgay) }; });
    bhMap[[String(b.MaTS), tsdbChuanTieuDe_(b.SoHDBaoHiem), tsdbChuanTieuDe_(b.CongTyBaoHiem), ngayIsoCuaO_(b.NgayKyHD)].join('|')] = { maBH: String(b.MaBH), revision: soTheHe_(b.Revision), lines: lines };
  });
  (getSS_().getSheetByName(SHEET_KHACHHANG) ? sheetToObjects_(SHEET_KHACHHANG) : []).forEach(function (k) { khTen[tsdbChuanTieuDe_(k.TenKhachHang)] = 1; });
  return { tra: tra, pv: pv, hd: hd, dsTS: dsTS, bhMap: bhMap, khTen: khTen, suaTS: {}, suaBH: {} };
}
function tsdbTomTat_(dsDong) {
  var k = { tong: dsDong.length, taoMoi: 0, capNhat: 0, loi: 0, bhThem: 0, bhDaCo: 0, bhCapNhat: 0, congTyMoi: 0 }, moi = {};
  dsDong.forEach(function (o) {
    if (o.hanhDongTS === 'LOI') k.loi++; else if (o.hanhDongTS === 'TAO_MOI') k.taoMoi++; else k.capNhat++;
    if (o.hanhDongBH === 'THEM') k.bhThem++; else if (o.hanhDongBH === 'DA_CO') k.bhDaCo++; else if (o.hanhDongBH === 'CAP_NHAT') k.bhCapNhat++;
    if (o.congTyMoi && o.bh && !moi[tsdbChuanTieuDe_(o.bh.congTy)]) { moi[tsdbChuanTieuDe_(o.bh.congTy)] = 1; k.congTyMoi++; }
  });
  return k;
}
/** XEM TRƯỚC (không ghi): tt = { maHD?, tenFile, base64 }. Mô phỏng TUẦN TỰ: dòng sau thấy kết quả của dòng trước trong cùng file. */
function xemTruocCapNhatTSDB(tt) {
  yeuCauDangNhap_(); tt = tt || {};
  var ng = tsdbNguCanh_(String(tt.maHD || '').trim()), bo = tsdbBocDong_(docSheetTuExcel_(tt.base64, tt.tenFile)), dem = 0;
  var dong = bo.map(function (b) {
    var o = tsdbChuanHoaDong_(b.raw, b.soDongExcel); o.sheet = b.sheet; o.raw = b.raw; tsdbPhanLoai_(o, ng);
    if (o.hanhDongTS !== 'LOI') tsdbGhiNho_(o, ng, o.maTSHienCo || '(mới ' + (++dem) + ')', o.maBHHienCo || '(BH mới ' + dem + ')', false);
    return o;
  });
  return { maHD: ng.hd ? String(ng.hd.MaHD) : '', soHopDong: ng.hd ? ng.hd.SoHopDong || '' : '', dong: dong, tomTat: tsdbTomTat_(dong), loaiTaiSan: LOAI_TAI_SAN_ };
}
/** Số lớn nhất ở cuối các mã (TS-0007 → 7) của một tập khoá — để cấp mã kế tiếp bằng bộ đếm trong khoá, không quét lại bảng mỗi dòng. */
function soMaLonNhat_(khoa) { var max = 0; Object.keys(khoa).forEach(function (k) { var m = String(k).match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); }); return max; }
function maTuSo_(tienTo, so) { return tienTo + '-' + String(so).padStart(4, '0'); }
/**
 * ÁP DỤNG: tt = { maHD?, dong: [{ dong, raw, revisionTS?, revisionBH? }] } (dòng từ xem trước). Máy chủ chuẩn hoá và phân loại LẠI từng dòng từ giá trị THÔ (không tin kết quả xem trước), theo thứ tự file
 * (dòng sau thấy số do dòng trước vừa ghi). Tài sản/hợp đồng bảo hiểm có sẵn chỉ được ghi nếu phiên bản KHỚP phiên bản lúc xem trước (người khác sửa giữa chừng → dòng bị từ chối, không ghi đè).
 * Ghi theo LÔ: đọc mỗi bảng cần thiết đúng một lần (vị trí dòng, bộ đếm mã), mỗi hợp đồng bảo hiểm ghi một khối + xác minh khối đó, dọn thế hệ cũ dồn một lượt cuối, flush một lần —
 * số ô đọc tăng tuyến tính (không bậc hai) theo số dòng. Kiểm tra phiên bản, quyền và cơ chế chốt thế hệ giữ nguyên (cùng ghiHopDongBH_ với nhập tay).
 * Kết quả ok=false khi có dòng đã ghi tài sản nhưng bảo hiểm chưa ghi (loiBH; chuaXacDinh = cần Quản trị xác minh); không có trạng thái “cha không con”.
 */
function apDungCapNhatTSDB(tt) {
  yeuCauDangNhap_(); tt = tt || {};
  var dsDong = Array.isArray(tt.dong) ? tt.dong : []; if (!dsDong.length) throw new Error('Không có dòng nào để cập nhật.');
  if (dsDong.length > CAP_NHAT_TSDB_TOI_DA_) throw new Error('Tối đa ' + CAP_NHAT_TSDB_TOI_DA_ + ' dòng mỗi lần.');
  var me = layDanhTinh_().email || emailNguoiDung_();
  return voiKhoa_(function () {
    var bg = taoBoGhiBH_(true), bgTS = boGhiBang_(SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_);
    var ng = tsdbNguCanh_(String(tt.maHD || '').trim());
    var soTS = soMaLonNhat_(bgViTri_(bgTS, 'MaTS')), soBH = soMaLonNhat_(bg.cha.viTri);
    var kq = { taoMoi: 0, capNhat: 0, bhThem: 0, bhCapNhat: 0, bhDaCo: 0, congTyMoi: 0, boQua: [], loiBH: [], canhBao: [], chiTiet: [], canXacMinh: [] }, khoaHD = {};
    dsDong.forEach(function (x, i) {
      var o = tsdbPhanLoai_(tsdbChuanHoaDong_((x && x.raw) || {}, (x && x.dong) || (i + 1)), ng);
      if (o.hanhDongTS === 'LOI') { kq.boQua.push({ dong: o.dong, loi: o.loi.join(' ') }); return; }
      var maTS = o.maTSHienCo, co = maTS ? ng.dsTS.filter(function (t) { return String(t.MaTS) === maTS; })[0] : null;
      if (co && !ng.suaTS[maTS]) { // chống ghi đè: phiên bản hiện tại phải bằng phiên bản lúc xem trước
        var kiVong = x && x.revisionTS;
        if (kiVong === undefined || kiVong === null || String(kiVong) === '') { kq.boQua.push({ dong: o.dong, loi: 'Thiếu phiên bản tài sản lúc xem trước — đọc lại file rồi áp dụng.' }); return; }
        if (Number(kiVong) !== soTheHe_(co.Revision)) { kq.boQua.push({ dong: o.dong, loi: 'Tài sản ' + maTS + ' đã được người khác thay đổi sau khi bạn xem trước (phiên bản ' + soTheHe_(co.Revision) + ' ≠ ' + kiVong + ') — đọc lại file.' }); return; }
      }
      var cuBH = o.bh && o.hanhDongBH === 'CAP_NHAT' ? ng.bhMap[tsdbKhoaBH_(o, maTS)] : null;
      if (cuBH && ng.khoaBH && ng.khoaBH[cuBH.maBH]) { kq.boQua.push({ dong: o.dong, loi: 'Hợp đồng bảo hiểm ' + cuBH.maBH + ' đang ở trạng thái CHƯA XÁC ĐỊNH sau một lần ghi lỗi — dừng ghi tiếp; Quản trị xác minh trước.' }); return; }
      if (cuBH && !ng.suaBH[cuBH.maBH]) {
        var kv2 = x && x.revisionBH;
        if (kv2 === undefined || kv2 === null || String(kv2) === '') { kq.boQua.push({ dong: o.dong, loi: 'Thiếu phiên bản hợp đồng bảo hiểm lúc xem trước — đọc lại file rồi áp dụng.' }); return; }
        if (Number(kv2) !== soTheHe_(cuBH.revision)) { kq.boQua.push({ dong: o.dong, loi: 'Hợp đồng bảo hiểm ' + cuBH.maBH + ' đã được người khác thay đổi sau khi bạn xem trước — đọc lại file.' }); return; }
      }
      try {
        var taoMoi = !maTS;
        if (maTS) {
          var cot = { NguoiGhi: me, ThoiDiemGhi: new Date(), Revision: soTheHe_(co.Revision) + 1 };
          cot.NguyenGia = o.nguyenGia === null ? '' : o.nguyenGia; cot.KhauHao = o.khauHao === null ? '' : o.khauHao; cot.GiaTriConLai = o.conLai === null ? '' : o.conLai; // đã hợp nhất với số đang lưu
          if (o.dinhGia !== null && o.dinhGia > 0) cot.GiaTriVND = o.dinhGia; if (o.ngayDinhGia) cot.NgayDinhGia = o.ngayDinhGia; if (o.loai) cot.LoaiTS = o.loai;
          capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', maTS, cot, bgTS); kq.capNhat++;
        } else {
          maTS = maTuSo_('TS', soTS + 1);
          ghiDongMoi_(SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_, { MaTS: maTS, MaHD: o.maHD, LoaiTS: o.loai || 'KHAC', MoTa: o.ten, GiaTriVND: o.dinhGia, NgayDinhGia: o.ngayDinhGia, TrangThai: TS_DANG_BAO_DAM, NguoiGhi: me, ThoiDiemGhi: new Date(),
            NguyenGia: o.nguyenGia === null ? '' : o.nguyenGia, KhauHao: o.khauHao === null ? '' : o.khauHao, GiaTriConLai: o.conLai === null ? '' : o.conLai, GhiChu: 'Nạp từ Excel', Revision: 1 }, bgTS);
          soTS++; kq.taoMoi++;
        }
        var ghiBH = '';
        if (o.bh && o.hanhDongBH === 'DA_CO') { kq.bhDaCo++; ghiBH = 'đã có'; tsdbGhiNho_(o, ng, maTS, cuBH ? cuBH.maBH : '', true); }
        else if (o.bh) {
          var cuaCha = cuBH ? docChaBH_(cuBH.maBH, bg) : null;
          var dongMoi, maBH = cuBH ? cuBH.maBH : maTuSo_('BH', soBH + 1), moi = tsdbDongCT_(o, maTS);
          if (cuBH) { // giữ nguyên các hạng mục khác của hợp đồng, thay/ thêm đúng hạng mục này; ô trống = giữ số cũ
            var thay = false, chiSoHM = tsdbTimDongHM_(cuBH.lines, moi).chiSo;
            dongMoi = cuBH.lines.map(function (l, iL) {
              if (iL !== chiSoHM) return { MaTaiSan: l.MaTaiSan, TenTaiSan: l.TenTaiSan, GiaTriBH: Number(l.GiaTriBH) || 0, PhiBH: Number(l.PhiBH) || 0, TienBH: Number(l.TienBH) || 0, TuNgay: l.TuNgay, DenNgay: l.DenNgay };
              thay = true; return { MaTaiSan: l.MaTaiSan, TenTaiSan: l.TenTaiSan, GiaTriBH: moi.GiaTriBH !== null ? moi.GiaTriBH : Number(l.GiaTriBH) || 0, PhiBH: moi.PhiBH !== null ? moi.PhiBH : Number(l.PhiBH) || 0, TienBH: moi.TienBH !== null ? moi.TienBH : Number(l.TienBH) || 0, TuNgay: moi.TuNgay, DenNgay: moi.DenNgay };
            });
            if (!thay) dongMoi.push({ MaTaiSan: moi.MaTaiSan, TenTaiSan: moi.TenTaiSan, GiaTriBH: moi.GiaTriBH || 0, PhiBH: moi.PhiBH || 0, TienBH: moi.TienBH || 0, TuNgay: moi.TuNgay, DenNgay: moi.DenNgay });
          } else dongMoi = [{ MaTaiSan: moi.MaTaiSan, TenTaiSan: moi.TenTaiSan, GiaTriBH: moi.GiaTriBH || 0, PhiBH: moi.PhiBH || 0, TienBH: moi.TienBH || 0, TuNgay: moi.TuNgay, DenNgay: moi.DenNgay }];
          var kqBH;
          try {
            kqBH = ghiHopDongBH_({ moi: !cuBH, ma: maBH, maTS: maTS, cha: { SoHDBaoHiem: o.bh.soHD, NgayKyHD: o.bh.ngayKy, CongTyBaoHiem: o.bh.congTy, GhiChu: cuaCha ? cuaCha.GhiChu : 'Nạp từ Excel' }, dong: dongMoi, me: me, chaCu: cuaCha, soDongCu: cuBH ? cuBH.lines.length : undefined, bg: bg, hoanDon: true });
          } catch (eBH) {
            tsdbGhiNho_(Object.assign({}, o, { bh: null }), ng, maTS, '', true);
            kq.loiBH.push({ dong: o.dong, maTS: maTS, taiSanDaGhi: true, loi: eBH.message, chuaXacDinh: !!eBH.chuaXacDinh, maBH: eBH.chuaXacDinh ? maBH : '' });
            if (eBH.chuaXacDinh) { if (!cuBH) soBH++; (ng.khoaBH = ng.khoaBH || {})[maBH] = true; kq.canXacMinh.push(maBH); }
            return;
          }
          if (!cuBH) soBH++;
          (kqBH.canhBao || []).forEach(function (c) { kq.canhBao.push('Dòng ' + o.dong + ': ' + c); });
          if (cuBH) kq.bhCapNhat++; else kq.bhThem++;
          ghiBH = (cuBH ? 'cập nhật ' : 'thêm ') + maBH;
          tsdbGhiNho_(o, ng, maTS, maBH, true);
          if (cuBH) ng.bhMap[tsdbKhoaBH_(o, maTS)].revision = kqBH.revision;
          var kc = tsdbChuanTieuDe_(o.bh.congTy);
          if (!(ng.khTenDaThem || {})[kc] && o.congTyMoi) { try { var r = themCongTyBaoHiem_(o.bh.congTy); if (!r.daCo) kq.congTyMoi++; (ng.khTenDaThem = ng.khTenDaThem || {})[kc] = 1; } catch (eKH) { kq.canhBao.push('Dòng ' + o.dong + ': hợp đồng bảo hiểm ĐÃ lưu nhưng chưa thêm được công ty bảo hiểm vào Khách hàng (' + eKH.message + ').'); } }
        }
        if (!o.bh || o.hanhDongBH === '') tsdbGhiNho_(o, ng, maTS, '', true);
        if (o.maHD) khoaHD[String(o.maHD)] = 1;
        kq.chiTiet.push({ dong: o.dong, maTS: maTS, taiSan: taoMoi ? 'tạo mới' : 'cập nhật', baoHiem: ghiBH });
      } catch (e) { kq.boQua.push({ dong: o.dong, loi: e.message }); }
    });
    var don = donLoBH_(bg);
    if (don.conLai !== 0) kq.canhBao.push('Đã lưu, nhưng chưa dọn xong chi tiết bảo hiểm bản cũ' + (don.conLai > 0 ? ' (còn ' + don.conLai + ' dòng không hiển thị)' : '') + (don.loi ? ' — ' + don.loi : '') + '. Quản trị có thể chạy “Dọn dữ liệu bảo hiểm thừa”.');
    try { SpreadsheetApp.flush(); ghiNhatKy_('', 'CAP_NHAT_TSDB_EXCEL', (ng.hd ? ng.hd.SoHopDong : 'nhiều HĐ') + ' | tạo ' + kq.taoMoi + ', cập nhật ' + kq.capNhat + ', BH thêm ' + kq.bhThem + ', BH sửa ' + kq.bhCapNhat + ', bỏ qua ' + kq.boQua.length + ', lỗi BH ' + kq.loiBH.length); }
    catch (eLog) { kq.canhBao.push('Dữ liệu đã lưu nhưng chưa ghi được nhật ký (' + eLog.message + ').'); }
    var thua = demChiTietThuaBH_(), hong = hopDongHongBH_(); kq.canPhucHoi = thua > 0 || hong.length > 0; kq.dongChiTietThua = thua; kq.hopDongHong = hong;
    if (thua || hong.length) kq.canhBao.push('Có ' + thua + ' dòng chi tiết bảo hiểm không hiển thị' + (hong.length ? ' và ' + hong.length + ' hợp đồng cần xác minh (' + hong.join(', ') + ')' : '') + ' — Quản trị chạy “Dọn dữ liệu bảo hiểm thừa”/“Xác minh/phục hồi bảo hiểm”.');
    kq.ok = !kq.loiBH.length; // false = có dòng đã ghi tài sản nhưng bảo hiểm chưa ghi (xem loiBH)
    return kq;
  });
}
/** Mẫu Excel để người dùng điền (3 dòng ví dụ). */
function taiMauCapNhatTSDB() {
  yeuCauDangNhap_();
  var tieuDe = Object.keys(TSDB_NHAN_).map(function (k) { return TSDB_NHAN_[k]; });
  var vd = [['', 'Nhà xưởng KCN A', 'Bất động sản', 8000000000, 3000000000, 5000000000, 5000000000, '2026-01-15', '', 'Bảo hiểm Bảo Việt', 'BH-001', '2026-02-01', 5000000000, 12000000, 5000000000, '2026-02-01', '2027-02-01'],
    ['', 'Dây chuyền sản xuất số 2', 'Động sản', 2000000000, 500000000, 1500000000, 1200000000, '2026-01-15', '', '', '', '', '', '', '', '', '']];
  return xuatBangRaFile_('Mau_cap_nhat_bao_hiem_TSDB', [{ ten: 'TSDB', dong: [tieuDe].concat(vd) }, { ten: 'Huong dan', dong: [['Cột bắt buộc: Tên tài sản. Giá trị còn lại = Nguyên giá − Khấu hao (bỏ trống thì tự tính).'], ['Giá trị định giá là số hiện ở Đăng ký thế chấp tài sản (bắt buộc khi tài sản mới).'], ['Để trống Số hợp đồng vay nếu đã chọn hợp đồng trên màn hình; điền để nạp nhiều hợp đồng cùng lúc.'], ['Bảo hiểm (tuỳ chọn): cần Công ty bảo hiểm, Ngày ký, Bảo hiểm từ ngày, Đến ngày. Nạp lại file không nhân đôi hợp đồng bảo hiểm đã có.']] }], 'xlsx');
}
/** Thêm công ty bảo hiểm vào Khách hàng (chỉ cần tên; trùng tên thì dùng lại). Trả { maKH, daCo }. */
function themCongTyBaoHiem_(ten) {
  var t = lamSachCongThuc_(String(ten || '').trim());
  if (t.length < 2 || t.length > 150) throw new Error('Tên công ty bảo hiểm phải từ 2 đến 150 ký tự.');
  var sh = getSS_().getSheetByName(SHEET_KHACHHANG), k = tsdbChuanTieuDe_(t);
  var co = sheetToObjects_(SHEET_KHACHHANG).filter(function (x) { return tsdbChuanTieuDe_(x.TenKhachHang) === k; })[0];
  if (co) return { maKH: co.MaKH, daCo: true };
  var maKH = sinhMaTuDong_(SHEET_KHACHHANG, 'KH', 3), o = { MaKH: maKH, TenKhachHang: t, GhiChu: 'Công ty bảo hiểm' };
  var headers = damBaoCotSheet_(sh, Object.keys(o));
  themDongVaoCuoiThat_(sh, headers.map(function (h) { return o.hasOwnProperty(h) ? o[h] : ''; }));
  SpreadsheetApp.flush(); tangRevision_('KHACHHANG');
  return { maKH: maKH, daCo: false };
}
function themCongTyBaoHiem(ten) {
  yeuCauDangNhap_();
  return voiKhoa_(function () { var r = themCongTyBaoHiem_(ten); if (!r.daCo) ghiNhatKy_('', 'THEM_CONG_TY_BAO_HIEM', String(ten).trim().substring(0, 150)); return r; });
}
