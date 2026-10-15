/**
 * DOCUMENTRENDERER.GS
 * Điền dữ liệu vào TÀI LIỆU MẪU bằng cách sửa trực tiếp XML bên trong gói Office (không dựng lại mẫu bằng code,
 * không đi vòng qua Google Docs) nên GIỮ NGUYÊN font, căn lề, khổ giấy, logo, header/footer, điều khoản, vùng chữ ký.
 *
 *  - DOCX (Word): thân văn bản, bảng, header, footer, chú thích. Placeholder bị Word tách thành nhiều run vẫn được nhận dạng.
 *  - XLSX (Excel): mọi sheet có placeholder (ô văn bản hoặc ô số), giữ định dạng ô, ô ghép, logo, công thức.
 *  - Quy ước placeholder: {{NHOM.TEN}} (chữ HOA, số, gạch dưới, dấu chấm). {{CT.*}} đặt trong MỘT hàng bảng/hàng Excel:
 *    hàng đó được nhân bản theo số dòng thụ hưởng (xem TableRenderer.gs).
 *
 * Phần LÕI (docxXuLyXml_, xlsxXuLyGoi_ ...) là hàm thuần xử lý chuỗi XML — chạy được cả trong Apps Script lẫn Node.js để
 * kiểm thử. Phần BỌC (docxDienMau_, xlsxDienMau_) dùng Utilities.unzip/zip của Apps Script.
 * renderTaiLieu_() là điểm vào duy nhất, chọn bộ xử lý theo đuôi file (và bộ xử lý ngoài nếu được cấu hình — chế độ B).
 */

/** Giải nén gói Office (.docx/.xlsx). Apps Script chỉ giải nén Blob có ContentType "application/zip" — blob có MIME của Word/Excel báo
 *  "Invalid argument: ContentType. Should be of type: application/zip". Tạo bản sao blob với kiểu zip rồi giải nén. */
function giaiNenOffice_(blob) {
  return Utilities.unzip(Utilities.newBlob(blob.getBytes(), 'application/zip', blob.getName()));
}

var DOCX_MIME_ = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Các phần của gói DOCX có thể chứa placeholder.
var DOCX_RE_PHAN_XU_LY_ = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

// Đoạn văn / hàng bảng / nút văn bản "trong cùng" (không chứa đoạn/hàng lồng bên trong).
var DOCX_RE_DOAN_ = /<w:p(?:\s[^>]*)?>(?:(?!<w:p[\s>])[\s\S])*?<\/w:p>/g;
var DOCX_RE_HANG_ = /<w:tr(?:\s[^>]*)?>(?:(?!<w:tr[\s>])[\s\S])*?<\/w:tr>/g;
var DOCX_RE_T_ = /<w:t(?:\s[^>]*[^\/>])?>([\s\S]*?)<\/w:t>/g;
var DOCX_RE_PH_ = /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g;

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
  var cacPhan = giaiNenOffice_(blobMau);
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

// =========================================================================
// XLSX (Excel)
// =========================================================================

var XLSX_MIME_ = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
var XLSX_RE_CT_ = /\{\{\s*CT\./;

function xlsxThuocTinh_(attrs, ten) {
  var m = new RegExp('\\b' + ten + '="([^"]*)"').exec(attrs);
  return m ? m[1] : null;
}

function xlsxBoThuocTinh_(attrs, ten) {
  return attrs.replace(new RegExp('\\s' + ten + '="[^"]*"'), '');
}

/** sharedStrings.xml -> [{text, rich}] theo thứ tự <si> (bỏ phần phiên âm <rPh>). */
function xlsxDocSharedStrings_(xml) {
  var ds = [];
  if (!xml) return ds;
  var re = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g, m;
  while ((m = re.exec(xml)) !== null) {
    var inner = (m[1] || '').replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
    var txt = '', rt, reT = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
    while ((rt = reT.exec(inner)) !== null) txt += docxGiaiMa_(rt[1] || '');
    ds.push({ text: txt, rich: /<r[\s>]/.test(inner) });
  }
  return ds;
}

function xlsxGiaTriV_(inner) {
  var m = /<v>([\s\S]*?)<\/v>/.exec(inner || '');
  return m ? m[1] : '';
}

function xlsxVanBanO_(c, ss) {
  if (c.t === 's') { var i = parseInt(xlsxGiaTriV_(c.inner), 10); return ss[i] ? ss[i].text : ''; }
  if (c.t === 'inlineStr') {
    var txt = '', m, re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
    while ((m = re.exec(c.inner)) !== null) txt += docxGiaiMa_(m[1] || '');
    return txt;
  }
  return '';
}

/** Đọc các hàng của <sheetData>. Hàng: {r, attrs (không gồm r), cells:[{col, attrs (không gồm r), t, inner, text, f, fAttrs, rich}]}. */
function xlsxDocHang_(inner, ss) {
  var ds = [], m, reRow = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  while ((m = reRow.exec(inner)) !== null) {
    var r = parseInt(xlsxThuocTinh_(m[1], 'r'), 10);
    var h = { r: r, attrs: xlsxBoThuocTinh_(m[1], 'r').replace(/\/$/, ''), cells: [] };
    var cm, reC = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, body = m[2] || '';
    while ((cm = reC.exec(body)) !== null) {
      var ref = xlsxThuocTinh_(cm[1], 'r') || '', col = xlsxSoCot_(ref.replace(/\d+/g, ''));
      var c = { col: col, attrs: xlsxBoThuocTinh_(cm[1], 'r'), t: xlsxThuocTinh_(cm[1], 't'), inner: cm[2] || '' };
      var fm = /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(c.inner);
      c.f = fm ? docxGiaiMa_(fm[2] || '') : null;
      c.fAttrs = fm ? fm[1].replace(/\/$/, '') : '';
      c.text = fm ? '' : xlsxVanBanO_(c, ss);
      var si = (c.t === 's') ? ss[parseInt(xlsxGiaTriV_(c.inner), 10)] : null;
      c.rich = !!(si && si.rich);
      h.cells.push(c);
    }
    ds.push(h);
  }
  return ds;
}

/** Ô điền xong: số (giữ định dạng số của ô) hoặc chuỗi nội tuyến. */
function xlsxDienO_(c, mapRow, td, conLai, canhBao) {
  var text = c.text;
  var moi = { col: c.col, attrs: xlsxBoThuocTinh_(c.attrs, 't'), t: null, inner: '', f: null, fAttrs: '' };
  var mSo = /^\s*\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\s*$/.exec(text);
  if (mSo && mapRow.hasOwnProperty(mSo[1])) {
    var e = td[mSo[1]], v = String(mapRow[mSo[1]]);
    if (e && (e.kieu === 'tien' || e.kieu === 'so') && /^\d{1,3}(\.\d{3})*$|^\d+$/.test(v)) {
      moi.inner = '<v>' + Number(v.replace(/\./g, '')) + '</v>';
      return { cell: moi, ngoac: false };
    }
  }
  if (c.rich) canhBao.push('Ô Excel có định dạng chữ trộn (rich text) chứa placeholder: định dạng chữ BÊN TRONG ô bị đơn giản hoá thành 1 kiểu.');
  var ngoac = false;
  var kq = text.replace(DOCX_RE_PH_, function (m, key) {
    if (mapRow.hasOwnProperty(key) && mapRow[key] !== undefined && mapRow[key] !== null) return String(mapRow[key]);
    if (conLai.indexOf(key) < 0) conLai.push(key);
    return m;
  });
  if (/\{\{|\}\}/.test(kq)) ngoac = true;
  if (kq !== '') {
    moi.attrs += ' t="inlineStr"';
    moi.inner = '<is><t xml:space="preserve">' + docxMaHoa_(kq.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')) + '</t></is>';
  }
  return { cell: moi, ngoac: ngoac, giaTri: kq };
}

function xlsxXmlHang_(r, attrs, cells) {
  var xml = '<row r="' + r + '"' + attrs;
  if (!cells.length) return xml + '/>';
  return xml + '>' + cells.map(function (c) {
    return '<c r="' + xlsxTenCot_(c.col) + r + '"' + c.attrs + (c.inner ? '>' + c.inner + '</c>' : '/>');
  }).join('') + '</row>';
}

/** Độ rộng các cột (ký tự) từ <cols> của sheet: {chỉ_số_cột(1..): width}. Mặc định 8.43. */
function xlsxDoRongCot_(xml) {
  var kq = {}, mC = /<cols\s*>([\s\S]*?)<\/cols>/.exec(xml);
  if (!mC) return kq;
  mC[1].replace(/<col\b[^>]*\/>/g, function (t) {
    var mn = parseInt(xlsxThuocTinh_(t, 'min'), 10), mx = parseInt(xlsxThuocTinh_(t, 'max'), 10), w = parseFloat(xlsxThuocTinh_(t, 'width'));
    if (mn > 0 && mx >= mn && mx < 200 && w > 0) for (var i = mn; i <= mx; i++) kq[i] = w;
    return t;
  });
  return kq;
}
/** Ô ghép NGANG trong 1 hàng: {"hàng:cột": số cột ghép}. Chữ trong ô ghép được xuống dòng theo TỔNG độ rộng các cột ghép. */
function xlsxDoOGhepNgang_(xml) {
  var kq = {}, re = /<mergeCell\b[^>]*\bref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g, m;
  while ((m = re.exec(xml)) !== null) {
    if (m[2] !== m[4]) continue;
    var c1 = xlsxSoCot_(m[1]), c2 = xlsxSoCot_(m[3]);
    if (c2 > c1) kq[m[2] + ':' + c1] = c2 - c1 + 1;
  }
  return kq;
}
/**
 * Hàng nhân bản từ hàng mẫu có thể chứa chữ DÀI (tên, nội dung) bị xuống dòng: Excel/Google không tự nới hàng đã có chiều cao cố định và mép chữ chạm viền.
 * Ước lượng số dòng theo độ rộng cột (hơi dư để không bị cắt) và đặt chiều cao hàng tường minh (không nhỏ hơn chiều cao của hàng mẫu).
 */
function xlsxChieuCaoHang_(attrsGoc, dsOChu, rongCot) {
  var thapNhat = parseFloat(xlsxThuocTinh_(attrsGoc + ' ', 'ht')) || 0, dong = 1;
  dsOChu.forEach(function (o) {
    var w = 0, nc = o.ghep || 1, ci;
    for (ci = 0; ci < nc; ci++) w += rongCot[o.col + ci] || 8.43;
    var cpl = Math.max(3, Math.floor(w - 2)), n = 0; // trừ lề thụt ô; chữ HOA rộng hơn ~20% (xem độ dài bên dưới)
    String(o.text || '').split(/\r?\n/).forEach(function (doan) {
      var t = 0, dem = 1; // gói theo từ để ước lượng đúng hơn chia đều theo ký tự
      doan.split(/\s+/).forEach(function (tu) { var l = Math.ceil(tu.replace(/[^A-ZÀ-Ỵ0-9]/g, '').length * 0.25 + tu.length); if (t === 0) t = l; else if (t + 1 + l <= cpl) t += 1 + l; else { dem++; t = l; } while (t > cpl) { dem++; t -= cpl; } });
      n += dem;
    });
    dong = Math.max(dong, n);
  });
  var ht = Math.max(thapNhat, dong <= 1 ? 0 : dong * 13.5 + 10);
  return ht > 0 ? ht : 0;
}

/**
 * LÕI: xử lý 1 sheet. Trả về xml mới + các sự kiện chèn hàng (để dời tham chiếu ở cấp workbook).
 * @return {{xml:string, conLai:string[], canhBao:string[], conNgoac:string[], suKien:Array, coPlaceholder:boolean}}
 */
function xlsxXuLySheet_(xml, ss, map, dsDong, thongKe) {
  var kq = { xml: xml, conLai: [], canhBao: [], conNgoac: [], suKien: [], coPlaceholder: false };
  var mSd = /<sheetData\s*>([\s\S]*?)<\/sheetData>/.exec(xml);
  if (!mSd) return kq;
  var dsHang = xlsxDocHang_(mSd[1], ss);
  if (!dsHang.some(function (h) { return h.cells.some(function (c) { return c.text.indexOf('{{') >= 0; }); })) return kq;
  kq.coPlaceholder = true;
  var td = tuDienPlaceholder_();
  var laHangMau = function (h) { return h.cells.some(function (c) { return XLSX_RE_CT_.test(c.text); }); };
  var mr = xlsxMoRongHang_(dsHang, laHangMau, dsDong, kq.canhBao, thongKe);
  kq.suKien = mr.suKien;
  if (mr.suKien.length && /<drawing\b/.test(xml)) kq.canhBao.push('Sheet có hình/logo và có hàng được nhân bản: hình neo bên dưới hàng mẫu có thể không dời theo.');

  var rongCot = xlsxDoRongCot_(xml), ghepNgang = xlsxDoOGhepNgang_(xml);
  var cacHangIn = [], hangDuLieuCuoi = 0; // để chèn ngắt trang: {r, ht}
  var rowsXml = mr.hang.map(function (o) {
    var h = o.goc, mapRow = map;
    if (o.dong) { mapRow = {}; Object.keys(map).forEach(function (k) { mapRow[k] = map[k]; }); Object.keys(o.dong).forEach(function (k) { mapRow[k] = o.dong[k]; }); }
    else if (dsDong.length === 1) { mapRow = {}; Object.keys(map).forEach(function (k) { mapRow[k] = map[k]; }); Object.keys(dsDong[0]).forEach(function (k) { mapRow[k] = dsDong[0][k]; }); }
    var hangDau = xlsxHangDau_(h.r, mr.suKien), chuHang = [];
    var cells = h.cells.map(function (c) {
      var moi;
      if (c.f !== null) {
        // ô công thức: dời tham chiếu; bỏ giá trị lưu sẵn (Excel tính lại khi mở — workbook đặt fullCalcOnLoad)
        var f = xlsxDichCongThuc_(c.f, mr.suKien, o.lan > 0 ? hangDau : undefined, o.lan > 0 ? o.lan : 0);
        var fa = c.fAttrs.replace(/\bref="([^"]*)"/, function (m, g) { return 'ref="' + xlsxDichSqref_(g, mr.suKien) + '"'; });
        moi = { col: c.col, attrs: xlsxBoThuocTinh_(c.attrs, 't'), inner: '<f' + fa + '>' + docxMaHoa_(f) + '</f>' };
        return moi;
      }
      if (c.text.indexOf('{{') < 0) return { col: c.col, attrs: c.attrs, inner: c.inner };
      var d = xlsxDienO_(c, mapRow, td, kq.conLai, kq.canhBao);
      if (d.ngoac) kq.conNgoac.push('Ô ' + xlsxTenCot_(c.col) + o.r + ': ' + String(d.giaTri).substring(0, 80));
      if (d.giaTri) chuHang.push({ col: c.col, text: d.giaTri });
      return d.cell;
    });
    var attrsHang = h.attrs;
    if (o.lan >= 0) { // chỉ hàng nhân bản từ hàng mẫu {{CT.*}}
      var chieuCao = xlsxChieuCaoHang_(h.attrs, chuHang.map(function (u) { return { col: u.col, text: u.text, ghep: ghepNgang[h.r + ':' + u.col] || 1 }; }), rongCot);
      if (chieuCao > 0) attrsHang = h.attrs.replace(/\s(ht|customHeight)="[^"]*"/g, '') + ' ht="' + chieuCao + '" customHeight="1"';
    }
    cacHangIn.push({ r: o.r, ht: parseFloat(xlsxThuocTinh_(attrsHang + ' ', 'ht')) || 0 });
    if (o.lan >= 0) hangDuLieuCuoi = o.r;
    return xlsxXmlHang_(o.r, attrsHang, cells);
  }).join('');

  var x = xml.replace(mSd[0], function () { return '<sheetData>' + rowsXml + '</sheetData>'; });
  if (mr.suKien.length) {
    x = x.replace(/<mergeCells\b[^>]*>([\s\S]*?)<\/mergeCells>/, function (m, inner) {
      var refs = []; inner.replace(/<mergeCell\b[^>]*\bref="([^"]*)"[^>]*\/>/g, function (mm, g) { refs.push(g); return mm; });
      var moi = xlsxDichOGhep_(refs, mr.suKien, mr.soBan);
      return '<mergeCells count="' + moi.length + '">' + moi.map(function (g) { return '<mergeCell ref="' + g + '"/>'; }).join('') + '</mergeCells>';
    });
    x = x.replace(/<dimension\b[^>]*\bref="([^"]*)"/, function (m, g) { return m.replace(g, xlsxDichSqref_(g, mr.suKien)); });
    x = x.replace(/\bsqref="([^"]*)"/g, function (m, g) { return 'sqref="' + xlsxDichSqref_(g, mr.suKien) + '"'; });
    x = x.replace(/<hyperlink\b[^>]*\bref="([^"]*)"/g, function (m, g) { return m.replace('ref="' + g + '"', 'ref="' + xlsxDichSqref_(g, mr.suKien) + '"'); });
    x = x.replace(/<brk\b([^>]*)\bid="(\d+)"/g, function (m, a, id) { return '<brk' + a + 'id="' + xlsxHangDau_(parseInt(id, 10), mr.suKien) + '"'; });
  }
  if (hangDuLieuCuoi) x = xlsxChenNgatTrang_(x, cacHangIn, hangDuLieuCuoi);
  kq.xml = x;
  return kq;
}

/**
 * Bảng kê dài: tránh TRANG CUỐI chỉ còn "Tổng cộng / chữ ký" (hoặc chỉ chữ ký) mà không có dòng dữ liệu nào.
 * Ước lượng cách chia trang (khổ giấy, lề, tỉ lệ vừa-khít-chiều-ngang, chiều cao hàng); nếu phần cuối (từ hàng sau dòng dữ liệu cuối đến hết)
 * bị tách khỏi dòng dữ liệu cuối thì chèn NGẮT TRANG trước vài dòng dữ liệu cuối để chúng đi cùng phần cuối. Chỉ thêm <rowBreaks>, không đổi gì khác.
 */
function xlsxChenNgatTrang_(x, hang, hangDuLieuCuoi) {
  try {
    if (/<rowBreaks\b/.test(x) || !hang.length) return x;
    if (/fitToPage="1"/.test(x) && /fitToHeight="1"/.test(x)) return x; // mẫu ép vừa đúng 1 trang (VD UNC 2 liên): không chèn ngắt
    var ps = /<pageSetup\b[^>]*>/.exec(x), thuocTinh = ps ? ps[0] : '';
    var kho = parseInt(xlsxThuocTinh_(thuocTinh, 'paperSize'), 10) || 1;
    var giay = kho === 9 ? [595.3, 841.9] : (kho === 8 ? [841.9, 1190.6] : (kho === 5 ? [612, 1008] : [612, 792]));
    if (/orientation="landscape"/.test(thuocTinh)) giay = [giay[1], giay[0]];
    var le = /<pageMargins\b[^>]*>/.exec(x), leT = le ? le[0] : '';
    var num = function (n, mac) { var v = parseFloat(xlsxThuocTinh_(leT, n)); return (isNaN(v) ? mac : v) * 72; };
    var rongIn = giay[0] - num('left', 0.7) - num('right', 0.7), caoIn = giay[1] - num('top', 0.75) - num('bottom', 0.75);
    var rongCot = xlsxDoRongCot_(x), tongRong = 0, k;
    for (k in rongCot) if (rongCot.hasOwnProperty(k)) tongRong += (rongCot[k] * 7 + 5) * 0.75;
    var tiLe = parseFloat(xlsxThuocTinh_(thuocTinh, 'scale')) / 100 || 1;
    if (/fitToPage="1"/.test(x) && tongRong > 0) tiLe = Math.min(1, rongIn / tongRong);
    var cap = caoIn / tiLe * 0.9; // dư 10%: bộ dựng PDF của Excel/Google/LibreOffice đo độ rộng cột khác nhau vài %
    var macDinh = parseFloat(xlsxThuocTinh_((/<sheetFormatPr\b[^>]*>/.exec(x) || [''])[0], 'defaultRowHeight')) || 15;
    var ds = hang.map(function (h) { return { r: h.r, ht: h.ht || macDinh }; });
    var iCuoi = -1, i, tong = 0;
    for (i = 0; i < ds.length; i++) { tong += ds[i].ht; if (ds[i].r === hangDuLieuCuoi) iCuoi = i; }
    if (iCuoi < 1 || iCuoi >= ds.length - 1) return x;
    if (tong <= cap) return x; // chắc chắn vừa 1 trang
    var iDau = iCuoi; while (iDau > 0 && ds[iDau - 1].r === ds[iDau].r - 1 && ds[iDau - 1].ht === ds[iDau].ht) iDau--;
    var hangTieuDe = iDau > 0 ? ds[iDau - 1].ht : 0; // tiêu đề cột lặp lại ở các trang sau: hàng đứng ngay trước dòng dữ liệu đầu
    var dau = 0; for (i = iCuoi + 1; i < ds.length; i++) dau += ds[i].ht;
    var m = 0; tong = dau + hangTieuDe;
    while (m < 3 && iCuoi - m > 0 && tong + ds[iCuoi - m].ht <= cap) { tong += ds[iCuoi - m].ht; m++; }
    if (m < 1) return x;
    var idNgat = ds[iCuoi - m].r; // ngắt SAU hàng này
    var chen = '<rowBreaks count="1" manualBreakCount="1"><brk id="' + idNgat + '" max="16383" man="1"/></rowBreaks>';
    var re = /<(drawing|legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b|<\/worksheet>/;
    var mv = re.exec(x);
    return mv ? x.slice(0, mv.index) + chen + x.slice(mv.index) : x;
  } catch (e) {
    return x; // ước lượng hỏng thì để nguyên, không làm hỏng tài liệu
  }
}

/** Danh sách sheet: [{ten, phan}] theo workbook.xml + workbook.xml.rels. */
function xlsxLietKeSheet_(phan) {
  var wb = phan['xl/workbook.xml'] || '', rels = phan['xl/_rels/workbook.xml.rels'] || '';
  var dsRel = {}, m;
  var reR = /<Relationship\b[^>]*\/>/g;
  while ((m = reR.exec(rels)) !== null) {
    var id = xlsxThuocTinh_(m[0], 'Id'), tg = xlsxThuocTinh_(m[0], 'Target');
    if (id && tg) dsRel[id] = ('xl/' + tg.replace(/^\/?(xl\/)?/, ''));
  }
  var kq = [], reS = /<sheet\b[^>]*\/>/g;
  while ((m = reS.exec(wb)) !== null) {
    var ten = docxGiaiMa_(xlsxThuocTinh_(m[0], 'name') || ''), rid = (/\br:id="([^"]*)"/.exec(m[0]) || [])[1];
    if (rid && dsRel[rid] && phan[dsRel[rid]] !== undefined) kq.push({ ten: ten, phan: dsRel[rid] });
  }
  if (!kq.length) Object.keys(phan).filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(k); }).sort().forEach(function (k, i) { kq.push({ ten: 'Sheet' + (i + 1), phan: k }); });
  return kq;
}

/**
 * LÕI: xử lý cả gói XLSX đã giải nén thành {tênPhần: chuỗiXML}. Trả về các phần ĐÃ SỬA ({tênPhần: xml | null = xoá}).
 */
function xlsxXuLyGoi_(phan, map, dsDong) {
  var ss = xlsxDocSharedStrings_(phan['xl/sharedStrings.xml']);
  var kq = { phan: {}, conLai: [], canhBao: [], conNgoac: [], soHangMau: 0, soHangTao: 0, soSheet: 0 };
  var tk = { soHangMau: 0, soHangTao: 0 }, suKienTheoSheet = {};
  xlsxLietKeSheet_(phan).forEach(function (sh) {
    var r = xlsxXuLySheet_(phan[sh.phan], ss, map, dsDong, tk);
    if (!r.coPlaceholder) return;
    kq.phan[sh.phan] = r.xml; kq.soSheet++;
    r.conLai.forEach(function (k) { if (kq.conLai.indexOf(k) < 0) kq.conLai.push(k); });
    r.canhBao.forEach(function (c) { if (kq.canhBao.indexOf(c) < 0) kq.canhBao.push(c); });
    r.conNgoac.forEach(function (c) { kq.conNgoac.push(sh.ten + '!' + c); });
    if (r.suKien.length) suKienTheoSheet[sh.ten] = r.suKien;
  });
  kq.soHangMau = tk.soHangMau; kq.soHangTao = tk.soHangTao;
  if (!kq.soSheet) return kq;

  // workbook.xml: vùng in/tên đã đặt dời theo hàng chèn; bắt Excel tính lại công thức khi mở.
  var wb = phan['xl/workbook.xml'] || '';
  wb = wb.replace(/<definedName\b([^>]*)>([\s\S]*?)<\/definedName>/g, function (m, a, noiDung) {
    var s = docxGiaiMa_(noiDung), pm = /^('([^']+)'|([A-Za-z0-9_.]+))!(.*)$/.exec(s);
    if (!pm) return m;
    var ev = suKienTheoSheet[pm[2] || pm[3]];
    if (!ev) return m;
    return '<definedName' + a + '>' + docxMaHoa_(s.substring(0, s.length - pm[4].length) + xlsxDichCongThuc_(pm[4], ev)) + '</definedName>';
  });
  if (/<calcPr\b/.test(wb)) wb = wb.replace(/<calcPr\b([^>]*?)\/>/, function (m, a) { return '<calcPr' + a.replace(/\sfullCalcOnLoad="[^"]*"/, '') + ' fullCalcOnLoad="1"/>'; });
  else if (/<\/definedNames>/.test(wb)) wb = wb.replace('</definedNames>', '</definedNames><calcPr fullCalcOnLoad="1"/>');
  else wb = wb.replace('</sheets>', '</sheets><calcPr fullCalcOnLoad="1"/>');
  kq.phan['xl/workbook.xml'] = wb;
  // calcChain cũ không còn đúng sau khi dời hàng -> xoá (Excel tự dựng lại).
  if (phan['xl/calcChain.xml'] !== undefined) {
    kq.phan['xl/calcChain.xml'] = null;
    if (phan['[Content_Types].xml']) kq.phan['[Content_Types].xml'] = phan['[Content_Types].xml'].replace(/<Override\b[^>]*calcChain[^>]*\/>/g, '');
    if (phan['xl/_rels/workbook.xml.rels']) kq.phan['xl/_rels/workbook.xml.rels'] = phan['xl/_rels/workbook.xml.rels'].replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, '');
  }
  return kq;
}

var XLSX_RE_PHAN_DOC_ = /^(\[Content_Types\]\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/calcChain\.xml|xl\/worksheets\/sheet\d+\.xml)$/;

function xlsxDienMau_(blobMau, map, dsDong, tenFileRa) {
  var cacPhan = giaiNenOffice_(blobMau), phan = {};
  cacPhan.forEach(function (f) { if (XLSX_RE_PHAN_DOC_.test(f.getName())) phan[f.getName()] = f.getDataAsString('UTF-8'); });
  var kq = xlsxXuLyGoi_(phan, map, dsDong), ra = [];
  Object.keys(kq.phan).forEach(function (k) { if (kq.phan[k] !== null && /^xl\/worksheets\//.test(k)) { try { XmlService.parse(kq.phan[k]); } catch (e) { throw new Error('Phần "' + k + '" của mẫu sau khi điền không còn là XML hợp lệ: ' + e.message); } } });
  cacPhan.forEach(function (f) {
    var ten = f.getName();
    if (kq.phan.hasOwnProperty(ten)) { if (kq.phan[ten] !== null) ra.push(Utilities.newBlob(kq.phan[ten], 'application/xml', ten)); }
    else ra.push(f);
  });
  var zip = Utilities.zip(ra, tenFileRa || 'ket_qua.xlsx');
  zip.setContentType(XLSX_MIME_);
  return { blob: zip, conLai: kq.conLai, canhBao: kq.canhBao, conNgoac: kq.conNgoac, soPhanXuLy: kq.soSheet, soHangMau: kq.soHangMau, soHangTao: kq.soHangTao };
}

/** Phân tích mẫu XLSX (thuần): placeholder, hàng mẫu, cảnh báo, ngoặc lạc. */
function xlsxPhanTichGoi_(phan) {
  var ss = xlsxDocSharedStrings_(phan['xl/sharedStrings.xml']);
  var kq = { loi: [], canhBao: [], placeholder: [], coHangMau: false };
  var soHangMau = 0;
  xlsxLietKeSheet_(phan).forEach(function (sh) {
    var xml = phan[sh.phan], mSd = /<sheetData\s*>([\s\S]*?)<\/sheetData>/.exec(xml);
    if (!mSd) return;
    xlsxDocHang_(mSd[1], ss).forEach(function (h) {
      var coCT = false;
      h.cells.forEach(function (c) {
        if (c.text.indexOf('{{') < 0 && c.text.indexOf('}}') < 0) return;
        var mm, re = new RegExp(DOCX_RE_PH_.source, 'g');
        while ((mm = re.exec(c.text)) !== null) { if (kq.placeholder.indexOf(mm[1]) < 0) kq.placeholder.push(mm[1]); }
        if (/\{\{|\}\}/.test(c.text.replace(DOCX_RE_PH_, ''))) kq.loi.push('Placeholder gõ sai/chưa đóng ngoặc ở ' + sh.ten + '!' + xlsxTenCot_(c.col) + h.r + ': "' + c.text.substring(0, 60) + '"');
        if (XLSX_RE_CT_.test(c.text)) coCT = true;
        if (c.rich) kq.canhBao.push('Ô ' + sh.ten + '!' + xlsxTenCot_(c.col) + h.r + ' có chữ trộn nhiều định dạng chứa placeholder — định dạng bên trong ô sẽ bị đơn giản hoá.');
      });
      if (coCT) { kq.coHangMau = true; soHangMau++; }
    });
  });
  if (soHangMau > 1) kq.canhBao.push('Có ' + soHangMau + ' hàng chứa {{CT.*}}: mẫu chỉ dùng được cho hồ sơ có đúng 1 người thụ hưởng (UNC). Mẫu bảng kê nhiều dòng chỉ được có 1 hàng mẫu.');
  if (!kq.placeholder.length) kq.canhBao.push('Mẫu chưa có placeholder {{...}} nào.');
  return kq;
}

// =========================================================================
// ĐIỂM VÀO CHUNG
// =========================================================================

function loaiFileTuTen_(ten) {
  var m = /\.(docx|xlsx)$/i.exec(String(ten || ''));
  return m ? m[1].toLowerCase() : '';
}

/** Phân tích mẫu khi tải lên (DOCX hoặc XLSX) + đối chiếu từ điển placeholder. */
function phanTichMauTaiLieu_(blobMau, loaiFile) {
  var goc;
  if (loaiFile === 'xlsx') {
    var phan = {}, cacPhan;
    try { cacPhan = giaiNenOffice_(blobMau); } catch (e) {
      return { hopLe: false, loi: ['File không phải gói .xlsx hợp lệ (không giải nén được): ' + e.message], canhBao: [], placeholder: [], placeholderLa: [], coHangMau: false };
    }
    var ten = cacPhan.map(function (f) { return f.getName(); });
    cacPhan.forEach(function (f) { if (XLSX_RE_PHAN_DOC_.test(f.getName())) phan[f.getName()] = f.getDataAsString('UTF-8'); });
    goc = xlsxPhanTichGoi_(phan);
    if (ten.indexOf('xl/workbook.xml') < 0) goc.loi.push('Thiếu xl/workbook.xml — không phải file Excel (.xlsx).');
    if (ten.indexOf('[Content_Types].xml') < 0) goc.loi.push('Thiếu [Content_Types].xml — file .xlsx bị hỏng.');
  } else {
    goc = docxPhanTichMau_(blobMau);
  }
  var td = tuDienPlaceholder_();
  var la = goc.placeholder.filter(function (k) { return !td[k]; });
  if (la.length) goc.loi.push('Placeholder không có trong danh mục: ' + la.map(function (k) { return '{{' + k + '}}'; }).join(', '));
  return { hopLe: goc.loi.length === 0, loi: goc.loi, canhBao: goc.canhBao, placeholder: goc.placeholder, placeholderLa: la, coHangMau: goc.coHangMau };
}

/** Phân tích mẫu DOCX (thuần, chưa đối chiếu từ điển). */
function docxPhanTichMau_(blobMau) {
  var loi = [], canhBao = [], phs = [], coHangMau = false, cacPhan;
  try { cacPhan = giaiNenOffice_(blobMau); } catch (e) {
    return { loi: ['File không phải gói .docx hợp lệ (không giải nén được): ' + e.message], canhBao: [], placeholder: [], coHangMau: false };
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
    // (Phân tích chạy với 0 dòng dữ liệu → bỏ cảnh báo "Hồ sơ không có dòng thụ hưởng" vì chỉ đúng lúc phát hành.)
    docxXuLyXml_(xml, {}, []).canhBao.forEach(function (c) { if (canhBao.indexOf(c) < 0 && !/không có dòng thụ hưởng/.test(c)) canhBao.push(c); });
    // Chỉ báo ngoặc lạc/placeholder gõ sai: bỏ các placeholder ĐÚNG khuôn rồi xem còn "{{" hay "}}" nào không.
    docxConDauNgoac_(docxChuanHoaPlaceholder_(xml).replace(DOCX_RE_PH_, '')).forEach(function (c) {
      loi.push('Placeholder gõ sai/chưa đóng ngoặc trong ' + t + ': "' + c + '"');
    });
  });
  if (!phs.length) canhBao.push('Mẫu chưa có placeholder {{...}} nào.');
  return { loi: loi, canhBao: canhBao, placeholder: phs, coHangMau: coHangMau };
}

/** Chế độ xử lý: 'XML' (mặc định, trong Apps Script) hoặc 'EXTERNAL' (bộ xử lý DOCX chuyên dụng — chế độ B, phải cấu hình tường minh). */
function cheDoRender_() {
  return (PropertiesService.getScriptProperties().getProperty('CH_CHE_DO_RENDER') || 'XML').toUpperCase();
}

/** ĐIỂM VÀO DUY NHẤT để điền mẫu. Chọn bộ xử lý theo đuôi file; chế độ B chỉ chạy khi được cấu hình rõ. */
function renderTaiLieu_(blobMau, loaiFile, map, dsDong, tenRa) {
  if (cheDoRender_() === 'EXTERNAL') return renderQuaDichVuNgoai_(blobMau, loaiFile, map, dsDong, tenRa);
  return loaiFile === 'xlsx' ? xlsxDienMau_(blobMau, map, dsDong, tenRa) : docxDienMau_(blobMau, map, dsDong, tenRa);
}

/**
 * CHẾ ĐỘ B — adapter cho bộ xử lý DOCX chuyên dụng (vd docxtpl chạy trên dịch vụ riêng). KHÔNG bật mặc định, KHÔNG tự triển
 * khai dịch vụ và KHÔNG phát sinh chi phí: chỉ chạy khi Script Properties CH_CHE_DO_RENDER = EXTERNAL và đã đặt
 * CH_RENDER_URL (+ CH_RENDER_TOKEN). Hợp đồng giao tiếp (JSON):
 *   POST {loaiFile, tenRa, mau: base64, bien: {khoá: chuỗi}, dong: [{khoá: chuỗi}]}
 *   -> 200 {tep: base64, conLai: [], canhBao: [], conNgoac: [], soHangMau: n, soHangTao: n}
 */
function renderQuaDichVuNgoai_(blobMau, loaiFile, map, dsDong, tenRa) {
  var p = PropertiesService.getScriptProperties();
  var url = p.getProperty('CH_RENDER_URL'), token = p.getProperty('CH_RENDER_TOKEN');
  if (!url) throw new Error('Chế độ xử lý ngoài (EXTERNAL) chưa có CH_RENDER_URL. Đặt URL dịch vụ hoặc chuyển CH_CHE_DO_RENDER về XML.');
  var resp = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: token ? { Authorization: 'Bearer ' + token } : {},
    payload: JSON.stringify({ loaiFile: loaiFile, tenRa: tenRa || '', mau: Utilities.base64Encode(blobMau.getBytes()), bien: map, dong: dsDong })
  });
  if (resp.getResponseCode() !== 200) throw new Error('Dịch vụ điền mẫu ngoài trả lỗi ' + resp.getResponseCode() + ': ' + String(resp.getContentText()).substring(0, 200));
  var j = JSON.parse(resp.getContentText());
  if (!j.tep) throw new Error('Dịch vụ điền mẫu ngoài không trả về tệp.');
  var blob = Utilities.newBlob(Utilities.base64Decode(j.tep), loaiFile === 'xlsx' ? XLSX_MIME_ : DOCX_MIME_, tenRa || ('ket_qua.' + loaiFile));
  return { blob: blob, conLai: j.conLai || [], canhBao: j.canhBao || [], conNgoac: j.conNgoac || [], soPhanXuLy: 1, soHangMau: j.soHangMau || 0, soHangTao: j.soHangTao || 0 };
}
