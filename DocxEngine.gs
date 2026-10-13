/**
 * DOCXENGINE.GS
 * DOCX TEMPLATE ENGINE — điền dữ liệu trực tiếp vào XML bên trong file .docx (không dựng lại mẫu bằng code,
 * không đi vòng qua Google Docs) nên GIỮ NGUYÊN font, căn lề, khổ giấy, header/footer, điều khoản, vùng chữ ký.
 *
 * Quy ước placeholder trong file Word:  {{NHOM.TEN}}  (chữ HOA, số, dấu gạch dưới, dấu chấm)
 *   - Placeholder chung: {{CONG_TY.TEN}}, {{HOP_DONG.SO}}, {{HO_SO.SO_TIEN}}, {{NGAY.GIAI_NGAN_DAY_DU}}, {{BANG_KE.TONG_TIEN}} ...
 *   - Placeholder dòng thụ hưởng: {{CT.TEN}}, {{CT.SO_TIEN}} ... đặt trong MỘT hàng của bảng (hàng mẫu).
 *     Engine tự nhân bản hàng đó theo số dòng ChiTietThuHuong, giữ nguyên định dạng, ô ghép (gridSpan), độ cao hàng.
 *   - Placeholder bị Word tách thành nhiều đoạn định dạng (run) vẫn được nhận dạng.
 *   - Xử lý cả thân văn bản, bảng, header, footer, chú thích cuối trang.
 *
 * Phần LÕI (docxXuLyXml_ ...) là hàm thuần xử lý chuỗi XML — chạy được cả trong Apps Script lẫn Node.js để kiểm thử.
 * Phần BỌC (docxDienMau_) dùng Utilities.unzip/zip của Apps Script.
 */

var DOCX_MIME_ = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Các phần của gói DOCX có thể chứa placeholder.
var DOCX_RE_PHAN_XU_LY_ = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

// Đoạn văn / hàng bảng / nút văn bản "trong cùng" (không chứa đoạn/hàng lồng bên trong).
var DOCX_RE_DOAN_ = /<w:p(?:\s[^>]*)?>(?:(?!<w:p[\s>])[\s\S])*?<\/w:p>/g;
var DOCX_RE_HANG_ = /<w:tr(?:\s[^>]*)?>(?:(?!<w:tr[\s>])[\s\S])*?<\/w:tr>/g;
var DOCX_RE_T_ = /<w:t(?:\s[^>]*[^\/>])?>([\s\S]*?)<\/w:t>/g;
var DOCX_RE_PH_ = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;

// Danh mục placeholder hợp lệ — nguồn duy nhất để kiểm tra mẫu khi tải lên và để người dùng tra cứu.
var DOCX_KHOA_CHUNG_ = [
  'CONG_TY.TEN', 'CONG_TY.TEN_VIET_TAT', 'CONG_TY.MST', 'CONG_TY.MA_CIF', 'CONG_TY.DIA_CHI', 'CONG_TY.DIEN_THOAI',
  'CONG_TY.FAX', 'CONG_TY.NGUOI_DAI_DIEN', 'CONG_TY.CHUC_VU', 'CONG_TY.GIAY_UY_QUYEN_SO', 'CONG_TY.GIAY_UY_QUYEN_NGAY',
  'CONG_TY.NGUOI_LAP_BIEU', 'CONG_TY.TK_VND', 'CONG_TY.TK_USD',
  'HOP_DONG.SO', 'HOP_DONG.NGAY', 'HOP_DONG.NGAN_HANG', 'HOP_DONG.CHI_NHANH', 'HOP_DONG.DIA_CHI_CHI_NHANH',
  'HOP_DONG.MST_CHI_NHANH', 'HOP_DONG.HAN_MUC', 'HOP_DONG.LAI_SUAT', 'HOP_DONG.LAI_SUAT_QUA_HAN', 'HOP_DONG.LAI_SUAT_CHAM_TRA',
  'HOP_DONG.KY_HAN_TRA_GOC', 'HOP_DONG.KY_HAN_TRA_LAI', 'HOP_DONG.NGUOI_DAI_DIEN_NH', 'HOP_DONG.CHUC_VU_NH',
  'HOP_DONG.GIAY_UY_QUYEN_NH', 'HOP_DONG.DIEN_THOAI_NH', 'HOP_DONG.HD_KHUNG_MBNT_SO', 'HOP_DONG.HD_KHUNG_MBNT_NGAY',
  'HO_SO.MA', 'HO_SO.SO_GIAY_NHAN_NO', 'HO_SO.NGAY_GIAY_NHAN_NO', 'HO_SO.LOAI_TIEN', 'HO_SO.DON_VI_TIEN', 'HO_SO.TY_GIA',
  'HO_SO.SO_TIEN', 'HO_SO.SO_TIEN_BANG_CHU', 'HO_SO.SO_TIEN_QUY_DOI', 'HO_SO.SO_TIEN_QUY_DOI_BANG_CHU', 'HO_SO.DU_NO',
  'HO_SO.PHUONG_THUC', 'HO_SO.MUC_DICH', 'HO_SO.THOI_HAN_NGAY', 'HO_SO.NGAY_GIAI_NGAN', 'HO_SO.NGAY_DEN_HAN',
  'HO_SO.TAI_LIEU_CHUNG_MINH', 'HO_SO.NGUOI_LAP_BIEU', 'HO_SO.SO_THAM_CHIEU', 'HO_SO.SO_DONG',
  'NGAY.HOM_NAY', 'NGAY.GIAI_NGAN_DAY_DU', 'NGAY.GIAI_NGAN_DD', 'NGAY.GIAI_NGAN_MM', 'NGAY.GIAI_NGAN_YYYY',
  'BANG_KE.TONG_TIEN', 'BANG_KE.TONG_TIEN_QUY_DOI', 'BANG_KE.TONG_TIEN_BANG_CHU', 'BANG_KE.SO_DONG'
];
var DOCX_KHOA_DONG_ = [
  'CT.STT', 'CT.STT_2', 'CT.TEN', 'CT.SO_TK', 'CT.NGAN_HANG', 'CT.LOAI_CHUNG_TU', 'CT.SO_TAI_LIEU', 'CT.NGAY_TAI_LIEU',
  'CT.NOI_DUNG', 'CT.SO_TIEN', 'CT.SO_TIEN_QUY_DOI', 'CT.SO_TIEN_BANG_CHU', 'CT.CHUYEN_NHANH', 'CT.DON_VI_LAP', 'CT.GHI_CHU'
];

// ---------- Tiện ích XML ----------

function docxGiaiMa_(s) {
  return String(s).replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, function (m, g) {
    if (g === 'lt') return '<';
    if (g === 'gt') return '>';
    if (g === 'amp') return '&';
    if (g === 'quot') return '"';
    if (g === 'apos') return "'";
    return g.charAt(1) === 'x' ? String.fromCharCode(parseInt(g.substring(2), 16)) : String.fromCharCode(parseInt(g.substring(1), 10));
  });
}

function docxMaHoa_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Giá trị -> nội dung nằm BÊN TRONG 1 thẻ <w:t>; xuống dòng (\n) thành <w:br/>. */
function docxMaHoaGiaTri_(v) {
  var s = String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  return docxMaHoa_(s).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
}

// ---------- Bước 1: gom placeholder bị tách thành nhiều run về 1 run ----------

/**
 * Với mỗi đoạn văn có placeholder, đưa trọn "{{KEY}}" vào đúng 1 thẻ <w:t> (run đầu tiên mà placeholder chạm tới,
 * giữ nguyên định dạng của run đó). Đoạn không có placeholder được giữ NGUYÊN từng byte.
 */
function docxGopPlaceholderDoan_(p) {
  if (p.indexOf('{') < 0) return p;
  var nodes = [], full = '', m;
  var re = new RegExp(DOCX_RE_T_.source, 'g');
  while ((m = re.exec(p)) !== null) {
    var txt = docxGiaiMa_(m[1]);
    nodes.push({ s: m.index, e: m.index + m[0].length, t: txt, from: full.length, out: '' });
    full += txt;
  }
  if (full.indexOf('{{') < 0) return p;

  var khop = [], reP = new RegExp(DOCX_RE_PH_.source, 'g');
  while ((m = reP.exec(full)) !== null) khop.push({ s: m.index, e: m.index + m[0].length, key: m[1] });
  if (!khop.length) return p;

  function nodeCuaViTri(pos) {
    for (var i = nodes.length - 1; i >= 0; i--) if (nodes[i].from <= pos) return i;
    return 0;
  }
  var i = 0, k = 0;
  while (i < full.length) {
    if (k < khop.length && i === khop[k].s) {
      nodes[nodeCuaViTri(i)].out += '{{' + khop[k].key + '}}';
      i = khop[k].e; k++;
    } else {
      nodes[nodeCuaViTri(i)].out += full.charAt(i);
      i++;
    }
  }
  var kq = p;
  for (var n = nodes.length - 1; n >= 0; n--) {
    var nd = nodes[n];
    // Không đổi và không chứa placeholder -> giữ nguyên byte. Nút chứa placeholder luôn được ghi lại với xml:space="preserve"
    // để Word không cắt khoảng trắng đầu/cuối của giá trị sẽ điền vào.
    if (nd.out === nd.t && nd.out.indexOf('{{') < 0) continue;
    kq = kq.substring(0, nd.s) + '<w:t xml:space="preserve">' + docxMaHoa_(nd.out) + '</w:t>' + kq.substring(nd.e);
  }
  return kq;
}

function docxChuanHoaPlaceholder_(xml) {
  return xml.replace(DOCX_RE_DOAN_, function (p) { return docxGopPlaceholderDoan_(p); });
}

// ---------- Bước 2: nhân bản hàng bảng mẫu theo số dòng thụ hưởng ----------

function docxBoDinhDanhTrung_(hangXml) {
  return hangXml
    .replace(/<w:bookmarkStart\b[^>]*\/>/g, '').replace(/<w:bookmarkEnd\b[^>]*\/>/g, '')
    .replace(/\sw14:paraId="[^"]*"/g, '').replace(/\sw14:textId="[^"]*"/g, '');
}

function docxThayBienDong_(hangXml, dong, conLai) {
  return hangXml.replace(DOCX_RE_PH_, function (m, key) {
    if (key.indexOf('CT.') !== 0) return m; // placeholder chung trong hàng mẫu: xử lý ở bước 3
    if (dong.hasOwnProperty(key)) return docxMaHoaGiaTri_(dong[key]);
    if (conLai.indexOf(key) < 0) conLai.push(key);
    return m;
  });
}

/**
 * Hàng bảng (<w:tr>) chứa {{CT.*}} là HÀNG MẪU: được thay bằng N hàng (N = số dòng thụ hưởng).
 * dsDong: mảng object { 'CT.TEN': '...', 'CT.SO_TIEN': '10.000', ... }.
 */
function docxMoRongHangBang_(xml, dsDong, conLai, canhBao, thongKe) {
  return xml.replace(DOCX_RE_HANG_, function (hang) {
    if (hang.indexOf('{{CT.') < 0) return hang;
    if (/<w:vMerge\b/.test(hang)) {
      canhBao.push('Hàng mẫu có ô ghép dọc (vMerge) — nhân bản có thể lệch bố cục, nên bỏ ghép dọc ở hàng mẫu.');
    }
    thongKe.soHangMau++;
    if (!dsDong.length) {
      canhBao.push('Hồ sơ không có dòng thụ hưởng nào — hàng mẫu bị bỏ.');
      return '';
    }
    var kq = '';
    for (var i = 0; i < dsDong.length; i++) {
      var h = docxThayBienDong_(hang, dsDong[i], conLai);
      kq += (i === 0) ? h : docxBoDinhDanhTrung_(h);
      thongKe.soHangTao++;
    }
    return kq;
  });
}

// ---------- Bước 3: thay placeholder chung ----------

function docxThayBienChung_(xml, map, conLai) {
  return xml.replace(DOCX_RE_PH_, function (m, key) {
    if (map.hasOwnProperty(key) && map[key] !== undefined && map[key] !== null) return docxMaHoaGiaTri_(map[key]);
    if (conLai.indexOf(key) < 0) conLai.push(key);
    return m;
  });
}

/** Danh sách placeholder còn nguyên trong XML (đã gom run). */
function docxLietKePlaceholder_(xml) {
  var kq = [], m, norm = docxChuanHoaPlaceholder_(xml), re = new RegExp(DOCX_RE_PH_.source, 'g');
  while ((m = re.exec(norm)) !== null) if (kq.indexOf(m[1]) < 0) kq.push(m[1]);
  return kq;
}

/** Còn sót "{{" hoặc "}}" trong văn bản hiển thị (kể cả placeholder gõ sai) — để chặn phát hành. */
function docxConDauNgoac_(xml) {
  var kq = [];
  xml.replace(DOCX_RE_DOAN_, function (p) {
    var full = '', m, re = new RegExp(DOCX_RE_T_.source, 'g');
    while ((m = re.exec(p)) !== null) full += docxGiaiMa_(m[1]);
    if (/\{\{|\}\}/.test(full)) kq.push(full.length > 80 ? full.substring(0, 80) + '…' : full);
    return p;
  });
  return kq;
}

/**
 * LÕI: xử lý 1 phần XML của DOCX.
 * @return {{xml:string, conLai:string[], canhBao:string[], conNgoac:string[]}}
 */
function docxXuLyXml_(xml, map, dsDong) {
  var conLai = [], canhBao = [], thongKe = { soHangMau: 0, soHangTao: 0 };
  if (/<w:txbxContent\b/.test(xml)) canhBao.push('Mẫu có hộp văn bản (text box) — placeholder nằm TRONG đoạn chứa hộp văn bản có thể không được thay.');
  var x = docxChuanHoaPlaceholder_(xml);
  x = docxMoRongHangBang_(x, dsDong || [], conLai, canhBao, thongKe);
  // Mẫu 1 khoản (VD: Ủy nhiệm chi) đặt {{CT.*}} ngoài bảng: hợp lệ khi hồ sơ có ĐÚNG 1 dòng thụ hưởng.
  var mapChung = {};
  Object.keys(map || {}).forEach(function (k) { mapChung[k] = map[k]; });
  if (dsDong && dsDong.length === 1) Object.keys(dsDong[0]).forEach(function (k) { mapChung[k] = dsDong[0][k]; });
  x = docxThayBienChung_(x, mapChung, conLai);
  return { xml: x, conLai: conLai, canhBao: canhBao, conNgoac: docxConDauNgoac_(x), soHangMau: thongKe.soHangMau, soHangTao: thongKe.soHangTao };
}

// ---------- PHẦN BỌC (Apps Script): đọc/ghi gói DOCX ----------

/**
 * Điền dữ liệu vào bản sao của mẫu DOCX. KHÔNG sửa file mẫu gốc.
 * @param {Blob} blobMau file .docx mẫu
 * @param {Object} map placeholder chung
 * @param {Object[]} dsDong dữ liệu từng dòng thụ hưởng
 * @return {{blob:Blob, conLai:string[], canhBao:string[], conNgoac:string[], soPhanXuLy:number}}
 */
function docxDienMau_(blobMau, map, dsDong, tenFileRa) {
  var cacPhan = Utilities.unzip(blobMau);
  var ra = [], conLai = [], canhBao = [], conNgoac = [], soPhan = 0, soHangMau = 0, soHangTao = 0;
  cacPhan.forEach(function (f) {
    var ten = f.getName();
    if (!DOCX_RE_PHAN_XU_LY_.test(ten)) { ra.push(f); return; }
    var kq = docxXuLyXml_(f.getDataAsString('UTF-8'), map, dsDong);
    try { XmlService.parse(kq.xml); } catch (e) {
      throw new Error('Phần "' + ten + '" của mẫu sau khi điền không còn là XML hợp lệ: ' + e.message);
    }
    kq.conLai.forEach(function (k) { if (conLai.indexOf(k) < 0) conLai.push(k); });
    kq.canhBao.forEach(function (c) { if (canhBao.indexOf(c) < 0) canhBao.push(c); });
    kq.conNgoac.forEach(function (c) { conNgoac.push(ten + ': ' + c); });
    ra.push(Utilities.newBlob(kq.xml, 'application/xml', ten));
    soPhan++; soHangMau += kq.soHangMau; soHangTao += kq.soHangTao;
  });
  var zip = Utilities.zip(ra, tenFileRa || 'ket_qua.docx');
  zip.setContentType(DOCX_MIME_);
  return { blob: zip, conLai: conLai, canhBao: canhBao, conNgoac: conNgoac, soPhanXuLy: soPhan, soHangMau: soHangMau, soHangTao: soHangTao };
}

/**
 * Phân tích 1 file mẫu DOCX khi tải lên: gói hợp lệ?, placeholder đang dùng, placeholder lạ, cảnh báo bố cục.
 * @return {{hopLe:boolean, loi:string[], canhBao:string[], placeholder:string[], placeholderLa:string[], coHangMau:boolean}}
 */
function docxPhanTichMau_(blobMau) {
  var loi = [], canhBao = [], phs = [], coHangMau = false;
  var cacPhan;
  try { cacPhan = Utilities.unzip(blobMau); } catch (e) {
    return { hopLe: false, loi: ['File không phải gói .docx hợp lệ (không giải nén được): ' + e.message], canhBao: [], placeholder: [], placeholderLa: [], coHangMau: false };
  }
  var ten = cacPhan.map(function (f) { return f.getName(); });
  if (ten.indexOf('word/document.xml') < 0) loi.push('Thiếu word/document.xml — không phải file Word (.docx).');
  if (ten.indexOf('[Content_Types].xml') < 0) loi.push('Thiếu [Content_Types].xml — file .docx bị hỏng.');
  cacPhan.forEach(function (f) {
    var t = f.getName();
    if (!DOCX_RE_PHAN_XU_LY_.test(t)) return;
    var xml = f.getDataAsString('UTF-8');
    docxLietKePlaceholder_(xml).forEach(function (k) { if (phs.indexOf(k) < 0) phs.push(k); });
    // "Hàng mẫu" = {{CT.*}} nằm TRONG 1 hàng bảng (<w:tr>) — chỉ khi đó mới nhân bản được; {{CT.*}} ngoài bảng chỉ dùng cho mẫu 1 khoản.
    docxChuanHoaPlaceholder_(xml).replace(DOCX_RE_HANG_, function (h) { if (h.indexOf('{{CT.') >= 0) coHangMau = true; return h; });
    docxXuLyXml_(xml, {}, []).canhBao.forEach(function (c) { if (canhBao.indexOf(c) < 0) canhBao.push(c); });
    // Chỉ báo ngoặc lạc/placeholder gõ sai: bỏ các placeholder ĐÚNG khuôn rồi xem còn "{{" hay "}}" nào không.
    docxConDauNgoac_(docxChuanHoaPlaceholder_(xml).replace(DOCX_RE_PH_, '')).forEach(function (c) {
      loi.push('Placeholder gõ sai/chưa đóng ngoặc trong ' + t + ': "' + c + '"');
    });
  });
  var la = phs.filter(function (k) { return DOCX_KHOA_CHUNG_.indexOf(k) < 0 && DOCX_KHOA_DONG_.indexOf(k) < 0; });
  if (la.length) loi.push('Placeholder không có trong danh mục: ' + la.map(function (k) { return '{{' + k + '}}'; }).join(', '));
  if (!phs.length) canhBao.push('Mẫu chưa có placeholder {{...}} nào.');
  return { hopLe: loi.length === 0, loi: loi, canhBao: canhBao, placeholder: phs, placeholderLa: la, coHangMau: coHangMau };
}
