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
function tsdbNgay_(v, ten) {
  if (v === null || v === undefined || String(v).trim() === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  return ngayChuanISO_(String(v).trim(), ten, false);
}
function tsdbTien_(v, ten) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  return docTienNguyen_(soTuChuoiHoacSo_(v), ten, false);
}
/** Chuẩn hoá 1 dòng đã có sẵn các trường chữ/số thô → đối tượng sạch + danh sách lỗi (dùng cho cả xem trước lẫn áp dụng). */
function tsdbChuanHoaDong_(r, soDong) {
  var o = { dong: soDong, loi: [], canhBao: [] }, bat = function (f) { try { return f(); } catch (e) { o.loi.push(e.message); return null; } };
  o.maTS = String(r.maTS || '').trim().substring(0, 40);
  o.ten = lamSachCongThuc_(String(r.ten || '').trim());
  if (o.ten.length < 3 || o.ten.length > 300) o.loi.push('Tên tài sản bắt buộc (3–300 ký tự).');
  o.loai = r.loai === undefined || r.loai === '' ? '' : (LOAI_TAI_SAN_[r.loai] ? r.loai : tsdbLoaiTuChu_(r.loai));
  o.nguyenGia = bat(function () { return tsdbTien_(r.nguyenGia, 'Nguyên giá'); }); o.khauHao = bat(function () { return tsdbTien_(r.khauHao, 'Khấu hao'); });
  o.conLai = bat(function () { return tsdbTien_(r.conLai, 'Giá trị còn lại'); }); o.dinhGia = bat(function () { return tsdbTien_(r.dinhGia, 'Giá trị định giá'); });
  o.ngayDinhGia = bat(function () { return tsdbNgay_(r.ngayDinhGia, 'Ngày định giá'); }) || '';
  o.soHDVay = String(r.soHDVay || '').trim();
  if (o.nguyenGia !== null && o.khauHao !== null) {
    if (o.khauHao > o.nguyenGia) o.loi.push('Khấu hao (' + o.khauHao + ') lớn hơn nguyên giá (' + o.nguyenGia + ').');
    else if (o.conLai === null) o.conLai = o.nguyenGia - o.khauHao;
    else if (o.conLai !== o.nguyenGia - o.khauHao) o.loi.push('Giá trị còn lại (' + o.conLai + ') ≠ nguyên giá − khấu hao (' + (o.nguyenGia - o.khauHao) + ').');
  }
  var coBH = ['congTyBH', 'soHDBH', 'ngayKyBH', 'giaTriBH', 'phiBH', 'tienBH', 'tuNgay', 'denNgay'].some(function (k) { return String(r[k] === undefined || r[k] === null ? '' : r[k]).trim() !== ''; });
  o.bh = null;
  if (coBH) {
    var b = { congTy: lamSachCongThuc_(String(r.congTyBH || '').trim()), soHD: lamSachCongThuc_(String(r.soHDBH || '').trim()), ngayKy: '', giaTriBH: 0, phiBH: 0, tienBH: 0, tuNgay: '', denNgay: '' };
    if (b.congTy.length < 2 || b.congTy.length > 150) o.loi.push('Bảo hiểm: Công ty bảo hiểm bắt buộc (2–150 ký tự).');
    if (b.soHD.length > 80) o.loi.push('Bảo hiểm: Số hợp đồng bảo hiểm tối đa 80 ký tự.');
    b.ngayKy = bat(function () { var d = tsdbNgay_(r.ngayKyBH, 'Ngày ký hợp đồng bảo hiểm'); if (!d) throw new Error('Bảo hiểm: thiếu Ngày ký hợp đồng bảo hiểm.'); return d; }) || '';
    b.tuNgay = bat(function () { var d = tsdbNgay_(r.tuNgay, 'Bảo hiểm từ ngày'); if (!d) throw new Error('Bảo hiểm: thiếu Bảo hiểm từ ngày.'); return d; }) || '';
    b.denNgay = bat(function () { var d = tsdbNgay_(r.denNgay, 'Bảo hiểm đến ngày'); if (!d) throw new Error('Bảo hiểm: thiếu Đến ngày.'); return d; }) || '';
    if (b.tuNgay && b.denNgay && b.denNgay < b.tuNgay) o.loi.push('Bảo hiểm: Đến ngày không được trước Từ ngày.');
    b.giaTriBH = bat(function () { return tsdbTien_(r.giaTriBH, 'Giá trị bảo hiểm'); }) || 0; b.phiBH = bat(function () { return tsdbTien_(r.phiBH, 'Phí bảo hiểm'); }) || 0; b.tienBH = bat(function () { return tsdbTien_(r.tienBH, 'Tiền bảo hiểm'); }) || 0;
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
      var dau = ro.filter(function (x) { return typeof x === 'string' && x.trim() !== ''; })[0];
      if (/^(tong|tong cong|cong)( |$)/.test(tsdbChuanTieuDe_(dau || ''))) continue; // dòng tổng cộng/ký tên cuối bảng
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
function tsdbTimTS_(dsTS, maHD, o) {
  var dang = dsTS.filter(function (t) { return String(t.MaHD) === String(maHD) && t.TrangThai === TS_DANG_BAO_DAM; });
  if (o.maTS) { var theoMa = dang.filter(function (t) { return String(t.MaTS) === o.maTS; })[0]; if (theoMa) return theoMa; }
  var k = tsdbChuanTieuDe_(o.ten); return dang.filter(function (t) { return tsdbChuanTieuDe_(t.MoTa) === k; })[0] || null;
}
function tsdbKhoaBH_(o, maTS) { return [maTS, tsdbChuanTieuDe_(o.bh.soHD), tsdbChuanTieuDe_(o.bh.congTy), o.bh.ngayKy].join('|'); }
/** Phân loại 1 dòng đã chuẩn hoá theo dữ liệu hiện có: gắn hành động tài sản/bảo hiểm, hợp đồng đích và lỗi theo hợp đồng. */
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
  var co = o.maHD ? tsdbTimTS_(ngCanh.dsTS, o.maHD, o) : null;
  o.maTSHienCo = co ? String(co.MaTS) : ''; o.hanhDongTS = o.loi.length ? 'LOI' : (co ? 'CAP_NHAT' : 'TAO_MOI');
  if (!co && o.dinhGia === null && !o.loi.length) { o.loi.push('Tạo tài sản mới cần Giá trị định giá.'); o.hanhDongTS = 'LOI'; }
  if (!co && o.dinhGia !== null && !(o.dinhGia > 0) && !o.loi.length) { o.loi.push('Giá trị định giá phải lớn hơn 0.'); o.hanhDongTS = 'LOI'; }
  if (!co && !o.loai && !o.loi.length) o.canhBao.push('Chưa có Loại tài sản — dùng “Khác”.');
  if (o.maTS && !co && !o.loi.length) o.canhBao.push('Mã “' + o.maTS + '” chưa có trong hợp đồng — tạo mới với mã tự sinh.');
  o.hanhDongBH = '';
  if (o.bh && !o.loi.length) {
    var kBH = tsdbKhoaBH_(o, o.maTSHienCo), daCo = co && ngCanh.bhDaCo[kBH];
    o.hanhDongBH = daCo ? 'DA_CO' : 'THEM'; o.congTyMoi = !ngCanh.khTen[tsdbChuanTieuDe_(o.bh.congTy)];
  }
  return o;
}
function tsdbNguCanh_(maHD) {
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_(), hd = null;
  if (maHD) { hopDongTrongPhamVi_(maHD); hd = tra.hd[String(maHD)]; if (!hd) throw new Error('Không tìm thấy hợp đồng vay ' + maHD + '.'); }
  var dsTS = docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM), bhDaCo = {}, khTen = {};
  docSheetBaoDam_(SHEET_BAO_HIEM_TS).filter(function (b) { return b.TrangThai === BH_HIEU_LUC; }).forEach(function (b) { bhDaCo[[String(b.MaTS), tsdbChuanTieuDe_(b.SoHDBaoHiem), tsdbChuanTieuDe_(b.CongTyBaoHiem), ngayIsoCuaO_(b.NgayKyHD)].join('|')] = 1; });
  (getSS_().getSheetByName(SHEET_KHACHHANG) ? sheetToObjects_(SHEET_KHACHHANG) : []).forEach(function (k) { khTen[tsdbChuanTieuDe_(k.TenKhachHang)] = 1; });
  return { tra: tra, pv: pv, hd: hd, dsTS: dsTS, bhDaCo: bhDaCo, khTen: khTen };
}
function tsdbTomTat_(dsDong) {
  var k = { tong: dsDong.length, taoMoi: 0, capNhat: 0, loi: 0, bhThem: 0, bhDaCo: 0, congTyMoi: 0 }, moi = {};
  dsDong.forEach(function (o) {
    if (o.hanhDongTS === 'LOI') k.loi++; else if (o.hanhDongTS === 'TAO_MOI') k.taoMoi++; else k.capNhat++;
    if (o.hanhDongBH === 'THEM') k.bhThem++; else if (o.hanhDongBH === 'DA_CO') k.bhDaCo++;
    if (o.congTyMoi && o.bh && !moi[tsdbChuanTieuDe_(o.bh.congTy)]) { moi[tsdbChuanTieuDe_(o.bh.congTy)] = 1; k.congTyMoi++; }
  });
  return k;
}
/** XEM TRƯỚC (không ghi): tt = { maHD?, tenFile, base64 }. maHD rỗng thì mỗi dòng phải có “Số hợp đồng vay”. */
function xemTruocCapNhatTSDB(tt) {
  yeuCauDangNhap_(); tt = tt || {};
  var ng = tsdbNguCanh_(String(tt.maHD || '').trim()), bo = tsdbBocDong_(docSheetTuExcel_(tt.base64, tt.tenFile));
  var dong = bo.map(function (b) { var o = tsdbChuanHoaDong_(b.raw, b.soDongExcel); o.sheet = b.sheet; o.raw = b.raw; return tsdbPhanLoai_(o, ng); });
  return { maHD: ng.hd ? String(ng.hd.MaHD) : '', soHopDong: ng.hd ? ng.hd.SoHopDong || '' : '', dong: dong, tomTat: tsdbTomTat_(dong), loaiTaiSan: LOAI_TAI_SAN_ };
}
/**
 * ÁP DỤNG: tt = { maHD?, dong: [dòng từ xem trước] }. Máy chủ chuẩn hoá và phân loại LẠI từng dòng (không tin kết quả xem trước); dòng lỗi bị bỏ qua và báo lại.
 */
function apDungCapNhatTSDB(tt) {
  yeuCauDangNhap_(); tt = tt || {};
  var dsDong = Array.isArray(tt.dong) ? tt.dong : []; if (!dsDong.length) throw new Error('Không có dòng nào để cập nhật.');
  if (dsDong.length > CAP_NHAT_TSDB_TOI_DA_) throw new Error('Tối đa ' + CAP_NHAT_TSDB_TOI_DA_ + ' dòng mỗi lần.');
  var me = layDanhTinh_().email || emailNguoiDung_();
  return voiKhoa_(function () {
    var ng = tsdbNguCanh_(String(tt.maHD || '').trim()), shTS = ensureSheet_(getSS_(), SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_);
    damBaoCotSheet_(shTS, COT_TAI_SAN_); ensureSheet_(getSS_(), SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_); ensureSheet_(getSS_(), SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_);
    var kq = { taoMoi: 0, capNhat: 0, bhThem: 0, bhDaCo: 0, congTyMoi: 0, boQua: [], chiTiet: [] };
    dsDong.forEach(function (x, i) {
      var o = tsdbPhanLoai_(tsdbChuanHoaDong_((x && x.raw) || {}, (x && x.dong) || (i + 1)), ng);
      if (o.hanhDongTS === 'LOI') { kq.boQua.push({ dong: o.dong, loi: o.loi.join(' ') }); return; }
      var maTS = o.maTSHienCo, loi = null;
      try {
        if (maTS) {
          var cot = { NguoiGhi: me, ThoiDiemGhi: new Date() };
          if (o.nguyenGia !== null) cot.NguyenGia = o.nguyenGia; if (o.khauHao !== null) cot.KhauHao = o.khauHao; if (o.conLai !== null) cot.GiaTriConLai = o.conLai;
          if (o.dinhGia !== null && o.dinhGia > 0) cot.GiaTriVND = o.dinhGia; if (o.ngayDinhGia) cot.NgayDinhGia = o.ngayDinhGia; if (o.loai) cot.LoaiTS = o.loai;
          capNhatDongTheoMa_(SHEET_TAI_SAN_BAO_DAM, 'MaTS', maTS, cot); kq.capNhat++;
        } else {
          maTS = maBaoDamMoi_('TS', docSheetBaoDam_(SHEET_TAI_SAN_BAO_DAM), 'MaTS');
          ghiDongMoi_(SHEET_TAI_SAN_BAO_DAM, COT_TAI_SAN_, { MaTS: maTS, MaHD: o.maHD, LoaiTS: o.loai || 'KHAC', MoTa: o.ten, GiaTriVND: o.dinhGia, NgayDinhGia: o.ngayDinhGia, TrangThai: TS_DANG_BAO_DAM, NguoiGhi: me, ThoiDiemGhi: new Date(),
            NguyenGia: o.nguyenGia === null ? '' : o.nguyenGia, KhauHao: o.khauHao === null ? '' : o.khauHao, GiaTriConLai: o.conLai === null ? '' : o.conLai, GhiChu: 'Nạp từ Excel' });
          ng.dsTS.push({ MaTS: maTS, MaHD: o.maHD, MoTa: o.ten, TrangThai: TS_DANG_BAO_DAM }); kq.taoMoi++;
        }
        var ghiBH = '';
        if (o.bh) {
          var kBH = tsdbKhoaBH_(o, maTS);
          if (ng.bhDaCo[kBH]) { kq.bhDaCo++; ghiBH = 'đã có'; }
          else {
            if (!ng.khTen[tsdbChuanTieuDe_(o.bh.congTy)]) { themCongTyBaoHiem_(o.bh.congTy); ng.khTen[tsdbChuanTieuDe_(o.bh.congTy)] = 1; kq.congTyMoi++; }
            var maBH = maBaoDamMoi_('BH', docSheetBaoDam_(SHEET_BAO_HIEM_TS), 'MaBH');
            ghiDongMoi_(SHEET_BAO_HIEM_TS, COT_BAO_HIEM_TS_, { MaBH: maBH, MaTS: maTS, SoHDBaoHiem: o.bh.soHD, NgayKyHD: o.bh.ngayKy, CongTyBaoHiem: o.bh.congTy, TrangThai: BH_HIEU_LUC, GhiChu: 'Nạp từ Excel', NguoiGhi: me, ThoiDiemGhi: new Date() });
            ghiDongMoi_(SHEET_BAO_HIEM_TS_CT, COT_BAO_HIEM_TS_CT_, { MaBH: maBH, STT: 1, MaTaiSan: maTS, TenTaiSan: o.ten, GiaTriBH: o.bh.giaTriBH, PhiBH: o.bh.phiBH, TienBH: o.bh.tienBH, TuNgay: o.bh.tuNgay, DenNgay: o.bh.denNgay });
            ng.bhDaCo[kBH] = 1; kq.bhThem++; ghiBH = maBH;
          }
        }
        kq.chiTiet.push({ dong: o.dong, maTS: maTS, taiSan: o.maTSHienCo ? 'cập nhật' : 'tạo mới', baoHiem: ghiBH });
      } catch (e) { kq.boQua.push({ dong: o.dong, loi: e.message }); }
    });
    SpreadsheetApp.flush();
    ghiNhatKy_('', 'CAP_NHAT_TSDB_EXCEL', (ng.hd ? ng.hd.SoHopDong : 'nhiều HĐ') + ' | tạo ' + kq.taoMoi + ', cập nhật ' + kq.capNhat + ', BH thêm ' + kq.bhThem + ', bỏ qua ' + kq.boQua.length);
    kq.ok = true; return kq;
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
