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
  var v = PropertiesService.getScriptProperties().getProperty('DM_TAI_LIEU_KEM');
  if (v) {
    try { var a = JSON.parse(v); if (Array.isArray(a) && a.length) return a.map(String); } catch (e) { /* dùng mặc định */ }
  }
  return DM_TAI_LIEU_KEM_MAC_DINH_.slice();
}

/** Chỉ quản trị viên. Mỗi mục 1–80 ký tự, không chứa dấu phẩy/chấm phẩy (dùng để tách khi đọc lại), tối đa 30 mục. */
function luuDanhMucTaiLieuKem(ds) {
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
