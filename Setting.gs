/**
 * SETTINGS.GS
 * Đọc/ghi cấu hình liên kết Sheet "Sổ chi tiết mua hàng", thư mục Drive lưu hồ sơ, thư mục xuất
 * theo mẫu và 5 file MẪU THẬT — phục vụ tab "Cài đặt" trên giao diện Web App.
 *
 * Mục đích: cho phép ÁP DỤNG ứng dụng này cho 1 công ty khác mà KHÔNG cần sửa code — chỉ cần dán
 * link/ID tương ứng vào tab "Cài đặt" rồi bấm "Lưu cấu hình". Giá trị được lưu vào Script Properties
 * (riêng cho từng bản triển khai/bản sao Apps Script), và luôn được đọc qua CauHinh_() ở Code.gs.
 */

/** Trả về cấu hình hiện tại (đã lưu qua tab Cài đặt, hoặc giá trị mặc định nếu chưa cấu hình) để hiển thị lên form. */
function layCauHinhHeThong() {
  yeuCauDangNhap_();
  yeuCauQuanTri_('xem cấu hình hệ thống');
  var c = CauHinh_(), p = PropertiesService.getScriptProperties();
  c.cheDoRender = (p.getProperty('CH_CHE_DO_RENDER') || 'XML').toUpperCase();
  c.renderUrl = p.getProperty('CH_RENDER_URL') || '';
  c.daCoRenderToken = !!p.getProperty('CH_RENDER_TOKEN'); // token KHÔNG bao giờ trả về giao diện
  return c;
}

/**
 * Lưu cấu hình từ tab "Cài đặt". Mỗi trường trong payload có thể là link Google Sheets/Docs/Drive
 * đầy đủ hoặc mã ID thuần — sẽ tự trích mã ID trước khi lưu. Để trống 1 trường sẽ XOÁ cấu hình đã
 * lưu của trường đó (quay về dùng giá trị mặc định).
 */
function luuCauHinhHeThong(payload) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('lưu cấu hình hệ thống');
  payload = payload || {};
  var p = PropertiesService.getScriptProperties();
  var anhXa = {
    ssMuaHangId: 'CH_SS_MUA_HANG_ID',
    sheetMuaHang: 'CH_SHEET_MUA_HANG',
    thuMucGocId: 'CH_THU_MUC_GOC_ID',
    thuMucXuatTheoMauId: 'CH_THU_MUC_XUAT_THEO_MAU_ID',
    templateVanBanDeNghiId: 'CH_TEMPLATE_VANBAN_DENGHI_ID',
    templateGiayNhanNoId: 'CH_TEMPLATE_GIAYNHANNO_ID',
    templateUNC4LienId: 'CH_TEMPLATE_UNC_4LIEN_ID',
    templateBangKeHDGiaiNganId: 'CH_TEMPLATE_BANGKE_HD_GIAINGAN_ID',
    templateBangKeUNC4LienId: 'CH_TEMPLATE_BANGKE_UNC_4LIEN_ID'
  };
  Object.keys(anhXa).forEach(function (khoa) {
    var raw = String(payload[khoa] || '').trim();
    // "sheetMuaHang" là TÊN tab (không phải link/ID) nên giữ nguyên chuỗi, không trích ID.
    var giaTri = (khoa === 'sheetMuaHang') ? raw : trichIdTuLink_(raw);
    if (giaTri) {
      p.setProperty(anhXa[khoa], giaTri);
    } else {
      p.deleteProperty(anhXa[khoa]);
    }
  });
  // Chế độ điền mẫu: XML (mặc định) hoặc EXTERNAL (bộ xử lý ngoài; bắt buộc có URL — không âm thầm gọi dịch vụ ngoài).
  var che = String(payload.cheDoRender || 'XML').toUpperCase();
  if (['XML', 'EXTERNAL'].indexOf(che) < 0) throw new Error('Chế độ điền mẫu phải là XML hoặc EXTERNAL.');
  var url = String(payload.renderUrl || '').trim();
  if (che === 'EXTERNAL' && !/^https:\/\//.test(url)) throw new Error('Chế độ EXTERNAL cần URL dịch vụ bắt đầu bằng https://');
  p.setProperty('CH_CHE_DO_RENDER', che);
  if (url) p.setProperty('CH_RENDER_URL', url); else p.deleteProperty('CH_RENDER_URL');
  if (String(payload.renderToken || '').trim()) p.setProperty('CH_RENDER_TOKEN', String(payload.renderToken).trim());
  ghiNhatKy_('', 'CAU_HINH_HE_THONG', 'Lưu cấu hình (chế độ điền mẫu=' + che + ')');
  return { ok: true };
}

/**
 * Kiểm tra từng link/ID trong payload có mở/truy cập được không — dùng cho nút "Kiểm tra kết nối"
 * ở tab Cài đặt, chạy TRƯỚC khi lưu để người dùng biết ngay có dán sai link/ID hay không, hoặc
 * tài khoản chạy Apps Script chưa có quyền truy cập file/thư mục đó. Trường nào để trống thì bỏ
 * qua (không kiểm tra), vì sẽ dùng lại giá trị mặc định/đã lưu trước đó.
 * @return {{ten:string, ok:boolean, thongBao:string}[]}
 */
function kiemTraCauHinh(payload) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('kiểm tra cấu hình hệ thống');
  payload = payload || {};
  var ketQua = [];

  function thu(nhan, hanhDong) {
    try {
      hanhDong();
      ketQua.push({ ten: nhan, ok: true, thongBao: 'Truy cập được.' });
    } catch (e) {
      ketQua.push({ ten: nhan, ok: false, thongBao: e.message });
    }
  }

  var ssMuaHangId = trichIdTuLink_(payload.ssMuaHangId || '');
  var sheetMuaHang = String(payload.sheetMuaHang || '').trim();
  if (ssMuaHangId) {
    thu('Sheet "Sổ chi tiết mua hàng"', function () {
      var ss = SpreadsheetApp.openById(ssMuaHangId);
      if (sheetMuaHang) {
        var sh = ss.getSheetByName(sheetMuaHang);
        if (!sh) throw new Error('Mở được Sheet nhưng KHÔNG tìm thấy tab "' + sheetMuaHang + '" trong đó.');
      }
    });
  }

  var thuMucGocId = trichIdTuLink_(payload.thuMucGocId || '');
  if (thuMucGocId) {
    thu('Thư mục gốc lưu hồ sơ', function () { DriveApp.getFolderById(thuMucGocId).getName(); });
  }

  var thuMucXuatTheoMauId = trichIdTuLink_(payload.thuMucXuatTheoMauId || '');
  if (thuMucXuatTheoMauId) {
    thu('Thư mục xuất 5 văn bản theo mẫu', function () { DriveApp.getFolderById(thuMucXuatTheoMauId).getName(); });
  }

  var cacFileMau = {
    templateVanBanDeNghiId: 'File mẫu: Văn bản đề nghị giải ngân',
    templateGiayNhanNoId: 'File mẫu: Giấy nhận nợ',
    templateUNC4LienId: 'File mẫu: Uỷ nhiệm chi 4 liên',
    templateBangKeHDGiaiNganId: 'File mẫu: Bảng kê tài liệu MĐSDV',
    templateBangKeUNC4LienId: 'File mẫu: Phụ lục 02 - Bảng kê UNC'
  };
  Object.keys(cacFileMau).forEach(function (khoa) {
    var id = trichIdTuLink_(payload[khoa] || '');
    if (!id) return;
    thu(cacFileMau[khoa], (function (fid) {
      return function () { DriveApp.getFileById(fid).getName(); };
    })(id));
  });

  return ketQua;
}

/**
 * Trích mã ID từ 1 link Google Sheets/Docs (dạng .../d/ID/...) hoặc Drive folder (dạng
 * .../folders/ID) hoặc link dạng ?id=ID. Nếu chuỗi truyền vào đã là 1 mã ID thuần (không phải
 * link) thì giữ nguyên. Không parse được thì trả lại chuỗi gốc để người dùng tự biết mà sửa lại.
 */
function trichIdTuLink_(link) {
  link = String(link || '').trim();
  if (!link) return '';
  var m = link.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (m) return m[1];
  m = link.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (m) return m[1];
  m = link.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (m) return m[1];
  return link;
}


// ---------------------------------------------------------------------------------------------------------------------
// DANH MỤC "TÀI LIỆU KÈM THEO" — các loại tài liệu hay đính kèm đề nghị giải ngân (chọn bằng ô tick khi lập hồ sơ).
// Mỗi hồ sơ tick khác nhau → dòng "Tài liệu liên quan: …" của văn bản đề nghị khác nhau. Sửa danh mục ở Cài đặt, không cần sửa mã.
// ---------------------------------------------------------------------------------------------------------------------
var DM_TAI_LIEU_KEM_MAC_DINH_ = ['Hóa đơn GTGT', 'Bảng lương', 'Hợp đồng kinh tế', 'Biên bản nghiệm thu', 'Phiếu nhập kho', 'Giấy đề nghị thanh toán'];

/** Ai cũng đọc được (cần khi lập hồ sơ). */
function layDanhMucTaiLieuKem() {
  yeuCauDangNhap_();
  var v = PropertiesService.getScriptProperties().getProperty('DM_TAI_LIEU_KEM');
  if (v) {
    try { var a = JSON.parse(v); if (Array.isArray(a) && a.length) return a.map(String); } catch (e) { /* dùng mặc định */ }
  }
  return DM_TAI_LIEU_KEM_MAC_DINH_.slice();
}

/** Chỉ quản trị viên. Mỗi mục 1–80 ký tự, không chứa dấu phẩy/chấm phẩy (dùng để tách khi đọc lại), tối đa 30 mục. */
function luuDanhMucTaiLieuKem(ds) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('lưu danh mục tài liệu kèm theo');
  var kq = [];
  (ds || []).forEach(function (x) {
    var t = String(x === null || x === undefined ? '' : x).replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (t.length > 80) throw new Error('Mục "' + t.substring(0, 30) + '…" dài quá 80 ký tự.');
    if (/[,;]/.test(t)) throw new Error('Mục "' + t + '" có dấu phẩy/chấm phẩy — hãy bỏ (mỗi tài liệu một dòng).');
    if (kq.indexOf(t) < 0) kq.push(t);
  });
  if (kq.length > 30) throw new Error('Tối đa 30 mục.');
  if (!kq.length) { PropertiesService.getScriptProperties().deleteProperty('DM_TAI_LIEU_KEM'); ghiNhatKy_('', 'DM_TAI_LIEU_KEM', 'Về danh mục mặc định'); return DM_TAI_LIEU_KEM_MAC_DINH_.slice(); }
  PropertiesService.getScriptProperties().setProperty('DM_TAI_LIEU_KEM', JSON.stringify(kq));
  ghiNhatKy_('', 'DM_TAI_LIEU_KEM', kq.join(' | '));
  return kq;
}


// ---------------------------------------------------------------------------------------------------------------------
// LOẠI TÀI LIỆU — 3 loại hệ thống (Văn bản đề nghị, UNC/Bảng kê, HĐ mua bán ngoại tệ) + loại do NGƯỜI DÙNG tự thêm
// (ví dụ "Giấy nhận nợ", "Tờ trình"). Loại tự thêm chỉ lập từ MẪU đã tải lên (Quản lý mẫu văn bản), không cần sửa mã.
// ---------------------------------------------------------------------------------------------------------------------

/** Ai cũng đọc được: [{ma, ten, heThong, loaiTien, batBuoc, nganHang, thuTu, trangThai, mauHieuLuc, apDungLoaiHoSo[]}] (đã sắp theo thứ tự phát hành). */
function layDanhMucLoaiTaiLieu() {
  yeuCauDangNhap_();
  var mau = [];
  try { mau = docDanhSachMau_().filter(function (m) { return m.TrangThai === TT_HIEU_LUC; }); } catch (e) { mau = []; }
  var loaiHS = layLoaiHoSoGiaiNgan();
  return dsCauHinhLoaiTaiLieu_().map(function (c) {
    return { ma: c.ma, ten: c.ten, heThong: c.heThong, loaiTien: c.loaiTien, batBuoc: c.batBuoc, nganHang: c.nganHang, thuTu: c.thuTu, trangThai: c.trangThai,
      mauHieuLuc: mau.filter(function (m) { return m.LoaiTaiLieu === c.ma; }).length,
      apDungLoaiHoSo: loaiHS.filter(function (l) { return l.tl.indexOf(c.ma) >= 0; }).map(function (l) { return l.ten; }) };
  });
}

/**
 * Chỉ quản trị viên. ds = [{ma, ten, loaiTien, batBuoc, nganHang, thuTu, trangThai}]:
 *  • mục có mã = 1 trong 3 loại HỆ THỐNG → chỉ cập nhật batBuoc / nganHang / thuTu / trangThai (không đổi tên, loại tiền);
 *  • mục khác = loại TỰ THÊM (mã chữ HOA/số/gạch dưới 3–40 ký tự, bắt đầu bằng chữ). Danh sách không chứa loại tự thêm nào = bỏ hết loại tự thêm.
 * Không cho bỏ loại đang có mẫu hiệu lực (ngừng mẫu trước). Loại bắt buộc phải có mẫu hiệu lực khi phát hành (loại hệ thống có biểu mẫu dựng sẵn).
 */
function luuLoaiTaiLieuTuyChinh(ds) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('lưu loại tài liệu');
  var kq = [], dung = {}, cfgHT = {}, thuTuOk = function (v, mac) { if (v === '' || v === undefined || v === null) return mac; var n = Number(v); if (!isFinite(n) || n < 0 || n > 9999 || Math.floor(n) !== n) throw new Error('Thứ tự phát hành phải là số nguyên 0–9999.'); return n; };
  (ds || []).forEach(function (x) {
    var ma = String((x && x.ma) || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (NHAN_CHUNG_TU_[ma]) { // loại hệ thống: chỉ chỉnh thuộc tính cấu hình
      cfgHT[ma] = { batBuoc: x.batBuoc !== false && x.batBuoc !== 'false', nganHang: String(x.nganHang || '').replace(/\s+/g, ' ').trim().substring(0, 80), thuTu: thuTuOk(x.thuTu, THU_TU_HE_THONG_MAC_DINH_[ma]), trangThai: x.trangThai === 'NGUNG' ? 'NGUNG' : 'DUNG' };
      return;
    }
    var ten = String((x && x.ten) || '').replace(/\s+/g, ' ').trim();
    if (!ma && !ten) return;
    if (!/^[A-Z][A-Z0-9_]{2,39}$/.test(ma)) throw new Error('Mã loại "' + (x.ma || '') + '" không hợp lệ: chữ HOA/số/gạch dưới, 3–40 ký tự, bắt đầu bằng chữ (VD: GIAY_NHAN_NO).');
    if (dung[ma]) throw new Error('Trùng mã loại: ' + ma);
    if (!ten) throw new Error('Loại "' + ma + '" chưa có tên hiển thị.');
    if (ten.length > 80) throw new Error('Tên loại "' + ten.substring(0, 30) + '…" dài quá 80 ký tự.');
    dung[ma] = true;
    kq.push({ ma: ma, ten: ten, loaiTien: ['USD', 'VND'].indexOf(x.loaiTien) >= 0 ? x.loaiTien : 'TAT_CA', batBuoc: x.batBuoc === true || x.batBuoc === 'true',
      nganHang: String(x.nganHang || '').replace(/\s+/g, ' ').trim().substring(0, 80), thuTu: thuTuOk(x.thuTu, 100 + kq.length), trangThai: x.trangThai === 'NGUNG' ? 'NGUNG' : 'DUNG' });
  });
  if (kq.length > 30) throw new Error('Tối đa 30 loại tài liệu tự thêm.');
  var cu = layLoaiTaiLieuTuyChinh_(), mau = [];
  try { mau = sheetToObjects_(SHEET_MAU_VAN_BAN); } catch (e) { mau = []; }
  cu.forEach(function (c) {
    if (dung[c.ma]) return;
    var dangDung = mau.filter(function (m) { return m.LoaiTaiLieu === c.ma && m.TrangThai === TT_HIEU_LUC; });
    if (dangDung.length) throw new Error('Không bỏ được loại "' + c.ten + '": đang có ' + dangDung.length + ' mẫu hiệu lực dùng loại này (Quản lý mẫu văn bản → Ngừng mẫu trước).');
  });
  var p = PropertiesService.getScriptProperties();
  if (!kq.length) p.deleteProperty(KHOA_LOAI_TL_TUY_CHINH_); else p.setProperty(KHOA_LOAI_TL_TUY_CHINH_, JSON.stringify(kq));
  if (Object.keys(cfgHT).length) {
    var hien = {}; try { hien = JSON.parse(p.getProperty(KHOA_CAU_HINH_LOAI_HE_THONG_) || '{}') || {}; } catch (e2) { hien = {}; }
    Object.keys(cfgHT).forEach(function (m) { hien[m] = cfgHT[m]; });
    p.setProperty(KHOA_CAU_HINH_LOAI_HE_THONG_, JSON.stringify(hien));
  }
  ghiNhatKy_('', 'LOAI_TAI_LIEU', kq.map(function (x) { return x.ma + '=' + x.ten + ' (' + x.loaiTien + (x.batBuoc ? ', bắt buộc' : '') + ')'; }).join(' | ') + (Object.keys(cfgHT).length ? ' | HỆ THỐNG: ' + JSON.stringify(cfgHT) : '') || '(không có loại tự thêm)');
  return layDanhMucLoaiTaiLieu();
}

// ---------------------------------------------------------------------------------------------------------------------
// LOẠI HỒ SƠ GIẢI NGÂN — người dùng tự đặt tên và chọn bộ tài liệu cho từng loại (Cài đặt → Cấu hình hệ thống).
// Mặc định: "Giải ngân theo HĐTD" (đủ bộ như trước đây) và "Không dùng HĐTD" (không lập văn bản đề nghị HĐTD, vẫn UNC/Bảng kê).
// Mỗi loại có danh sách `tl` = mã các loại tài liệu được lập (hệ thống + tự thêm). Hồ sơ cũ chưa có loại → loại ĐẦU TIÊN (= hành vi cũ).
// Hợp đồng mua bán ngoại tệ luôn chỉ áp dụng cho hồ sơ USD; loại tự thêm theo "áp dụng cho loại tiền" của nó.
// ---------------------------------------------------------------------------------------------------------------------
var LOAI_HO_SO_MAC_DINH_ = [
  { ten: 'Giải ngân theo HĐTD', tl: ['DE_NGHI_GIAI_NGAN', 'CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE'] },
  { ten: 'Không dùng HĐTD', tl: ['CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE'] }
];

/** Chuẩn hoá 1 loại hồ sơ: nhận dạng mới {ten, tl} hoặc dạng cũ {ten, deNghi, chungTu, hdmb}; trả cả `tl` lẫn 3 cờ hệ thống. */
function chuanHoaLoaiHoSo_(x) {
  var tl;
  if (Array.isArray(x.tl)) tl = x.tl.map(String);
  else { tl = []; if (x.deNghi) tl.push(CT_DE_NGHI); if (x.chungTu) tl.push(CT_THANH_TOAN); if (x.hdmb) tl.push(CT_HDMB); }
  var seen = {}; tl = tl.filter(function (m) { if (seen[m]) return false; seen[m] = true; return true; });
  return { ten: String(x.ten), tl: tl, deNghi: tl.indexOf(CT_DE_NGHI) >= 0, chungTu: tl.indexOf(CT_THANH_TOAN) >= 0, hdmb: tl.indexOf(CT_HDMB) >= 0 };
}

/** Ai cũng đọc được (cần khi lập hồ sơ). */
function layLoaiHoSoGiaiNgan() {
  yeuCauDangNhap_();
  var v = PropertiesService.getScriptProperties().getProperty('LOAI_HO_SO_GIAI_NGAN');
  if (v) {
    try { var a = JSON.parse(v); if (Array.isArray(a) && a.length) return a.map(chuanHoaLoaiHoSo_); } catch (e) { /* dùng mặc định */ }
  }
  return LOAI_HO_SO_MAC_DINH_.map(chuanHoaLoaiHoSo_);
}

/** Chỉ quản trị viên. Tên 1–60 ký tự, không trùng; tối đa 15 loại. Mã tài liệu phải thuộc danh mục. Danh sách rỗng → về mặc định. */
function luuLoaiHoSoGiaiNgan(ds) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('lưu loại hồ sơ giải ngân');
  var kq = [], ten = {}, hopLe = {};
  layDanhMucLoaiTaiLieu().forEach(function (l) { hopLe[l.ma] = true; });
  (ds || []).forEach(function (x) {
    var t = String((x && x.ten) || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (t.length > 60) throw new Error('Tên loại "' + t.substring(0, 30) + '…" dài quá 60 ký tự.');
    if (ten[t.toLowerCase()]) throw new Error('Trùng tên loại hồ sơ: "' + t + '".');
    ten[t.toLowerCase()] = true;
    var c = chuanHoaLoaiHoSo_({ ten: t, tl: x.tl, deNghi: x.deNghi, chungTu: x.chungTu, hdmb: x.hdmb });
    c.tl.forEach(function (m) { if (!hopLe[m]) throw new Error('Loại tài liệu "' + m + '" không có trong danh mục (loại "' + t + '").'); });
    kq.push({ ten: c.ten, tl: c.tl });
  });
  if (kq.length > 15) throw new Error('Tối đa 15 loại hồ sơ.');
  var p = PropertiesService.getScriptProperties();
  if (!kq.length) { p.deleteProperty('LOAI_HO_SO_GIAI_NGAN'); ghiNhatKy_('', 'LOAI_HO_SO', 'Về danh mục mặc định'); return layLoaiHoSoGiaiNgan(); }
  p.setProperty('LOAI_HO_SO_GIAI_NGAN', JSON.stringify(kq));
  ghiNhatKy_('', 'LOAI_HO_SO', kq.map(function (x) { return x.ten + ' [' + x.tl.join(',') + ']'; }).join(' | '));
  return layLoaiHoSoGiaiNgan();
}

/** Cấu hình loại của 1 hồ sơ (theo tên đã lưu trong hồ sơ; không có/không còn trong danh mục → loại đầu tiên). */
function loaiHoSoCuaHoSo_(hoSo) {
  var ds = layLoaiHoSoGiaiNgan(), ten = String((hoSo && hoSo.LoaiHoSoGiaiNgan) || '').trim().toLowerCase();
  var l = ds.filter(function (x) { return x.ten.toLowerCase() === ten; })[0] || ds[0];
  return l;
}

/**
 * Loại tài liệu hồ sơ này ĐƯỢC phát hành, theo THỨ TỰ phát hành: thuộc bộ của loại hồ sơ, đang dùng, đúng loại tiền (HĐMB chỉ USD) và đúng ngân hàng áp dụng.
 * @param {Object} hoSo  @param {string=} tenNganHang  tên ngân hàng của hợp đồng (bỏ trống → tra theo MaHD của hồ sơ)
 */
function dsChungTuApDung_(hoSo, tenNganHang) {
  var l = loaiHoSoCuaHoSo_(hoSo), usd = String((hoSo && hoSo.LoaiTien) || 'VND').toUpperCase() === 'USD';
  if (tenNganHang === undefined) {
    tenNganHang = '';
    try { var hd = hoSo && hoSo.MaHD ? layHopDongTheoMa_(hoSo.MaHD) : null; tenNganHang = hd ? (hd.TenNganHang || '') : ''; } catch (e) { tenNganHang = ''; }
  }
  return dsCauHinhLoaiTaiLieu_().filter(function (c) {
    if (l.tl.indexOf(c.ma) < 0 || c.trangThai === 'NGUNG') return false;
    if (c.ma === CT_HDMB && (!usd || (Number(hoSo.PhienBanTien) === 2 && !(Number(hoSo.USDBan) > 0)))) return false;
    if (c.loaiTien === 'USD' && !usd) return false;
    if (c.loaiTien === 'VND' && usd) return false;
    return nganHangKhop_(c.nganHang, tenNganHang);
  }).map(function (c) { return c.ma; });
}

/** Trong số loại áp dụng: loại BẮT BUỘC phải phát hành hợp lệ mới được hoàn tất bộ / giải ngân. */
function dsChungTuBatBuoc_(hoSo, tenNganHang) {
  var bb = {}; dsCauHinhLoaiTaiLieu_().forEach(function (c) { bb[c.ma] = c.batBuoc; });
  return dsChungTuApDung_(hoSo, tenNganHang).filter(function (m) { return bb[m]; });
}
