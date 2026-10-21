/**
 * TABLERENDERER.GS
 * Nhân bản HÀNG MẪU của bảng thụ hưởng theo số dòng ChiTietThuHuong, thao tác trên cấu trúc bảng thật:
 *  - DOCX: hàng <w:tr> chứa {{CT.*}} được nhân bản (giữ độ cao, border, căn lề, ô ghép ngang, tiêu đề lặp trang).
 *  - XLSX: hàng chứa {{CT.*}} được nhân bản; các hàng bên dưới dời xuống, công thức (SUM...), ô ghép, vùng in,
 *    dimension, conditional formatting... được cập nhật theo.
 */

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

// =========================================================================
// XLSX: nhân bản hàng + dời tham chiếu (công thức, ô ghép, vùng in, ...)
// =========================================================================

function xlsxSoCot_(chu) {
  var n = 0;
  for (var i = 0; i < chu.length; i++) n = n * 26 + (chu.charCodeAt(i) - 64);
  return n;
}

function xlsxTenCot_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/**
 * Hàng mới tương ứng hàng gốc `r` khi đặt ở ĐẦU khối nhân bản: dời theo tổng delta của các sự kiện nằm TRƯỚC hàng đó.
 * Hàng nằm ngay tại hàng mẫu -> hàng đầu tiên của khối.
 */
function xlsxHangDau_(r, suKien) {
  var d = 0;
  suKien.forEach(function (e) { if (e.at < r) d += e.delta; });
  return r + d;
}

/** Hàng mới khi là CUỐI một vùng (range): hàng mẫu -> hàng cuối của khối nhân bản (vùng tự giãn: SUM(E7:E7) -> SUM(E7:E26)). */
function xlsxHangCuoi_(r, suKien) {
  var d = 0;
  suKien.forEach(function (e) { if (e.at <= r) d += e.delta; });
  return r + d;
}

/**
 * Dời tham chiếu ô trong 1 công thức theo các sự kiện chèn hàng. Bỏ qua chuỗi trong "…" và tham chiếu sang sheet khác.
 * `hang0`/`lech`: tham chiếu đơn (tương đối) trỏ đúng hàng `hang0` được cộng thêm `lech` — dùng cho công thức của các bản
 * nhân bản (tham chiếu cùng hàng với hàng mẫu).
 */
function xlsxDichCongThuc_(f, suKien, hang0, lech) {
  var re = /"[^"]*"|(?:'[^']+'!|[A-Za-z_][A-Za-z0-9_.]*!)?(?<![A-Za-z0-9_.])(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?(?![A-Za-z0-9_(])/g;
  return f.replace(re, function (m, a1, c1, a2, r1, a3, c2, a4, r2) {
    if (m.charAt(0) === '"') return m;
    if (m.indexOf('!') >= 0) return m; // sheet khác: không đụng
    var n1 = parseInt(r1, 10);
    if (r2 === undefined) {
      var moi = xlsxHangDau_(n1, suKien);
      if (hang0 !== undefined && !a2 && moi === hang0) moi += lech;
      return a1 + c1 + a2 + moi;
    }
    return a1 + c1 + a2 + xlsxHangDau_(n1, suKien) + ':' + a3 + c2 + a4 + xlsxHangCuoi_(parseInt(r2, 10), suKien);
  });
}

/** Dời danh sách vùng "A1:B2 C3 ..." (sqref/ref). */
function xlsxDichSqref_(sq, suKien) {
  return sq.replace(/([A-Z]{1,3})(\d+)(?::([A-Z]{1,3})(\d+))?/g, function (m, c1, r1, c2, r2) {
    if (r2 === undefined) return c1 + xlsxHangDau_(parseInt(r1, 10), suKien);
    return c1 + xlsxHangDau_(parseInt(r1, 10), suKien) + ':' + c2 + xlsxHangCuoi_(parseInt(r2, 10), suKien);
  });
}

/**
 * Nhân bản các hàng mẫu (hàng có {{CT.*}}) của 1 sheet; hàng khác chỉ đánh số lại. `dsHang` = [{r, ...}].
 * @return {{hang:Array<{goc:Object, r:number, lan:number, dong:Object}>, suKien:Array, soBanMoiHangMau:Object}}
 */
function xlsxMoRongHang_(dsHang, laHangMau, dsDong, canhBao, thongKe) {
  var hangMau = dsHang.filter(laHangMau);
  if (hangMau.length > 1 && dsDong.length > 1) {
    throw new Error('Mẫu Excel có ' + hangMau.length + ' hàng chứa {{CT.*}} nhưng hồ sơ có ' + dsDong.length + ' người thụ hưởng — mẫu nhiều dòng chỉ được có ĐÚNG 1 hàng mẫu.');
  }
  var ra = [], suKien = [], dich = 0, soBan = {};
  dsHang.forEach(function (h) {
    if (!laHangMau(h)) { ra.push({ goc: h, r: h.r + dich, lan: -1 }); return; }
    thongKe.soHangMau++;
    var n = dsDong.length;
    if (!n) { canhBao.push('Hồ sơ không có dòng thụ hưởng nào — hàng mẫu bị bỏ.'); suKien.push({ at: h.r, delta: -1 }); dich -= 1; return; }
    for (var i = 0; i < n; i++) { ra.push({ goc: h, r: h.r + dich + i, lan: i, dong: dsDong[i] }); thongKe.soHangTao++; }
    soBan[h.r] = n;
    if (n > 1) suKien.push({ at: h.r, delta: n - 1 });
    dich += n - 1;
  });
  return { hang: ra, suKien: suKien, soBan: soBan };
}

/** Ô ghép nằm gọn trong 1 hàng mẫu được nhân theo từng bản; các ô ghép khác dời theo. `soBan` = {hàngGốc: số bản}. */
function xlsxDichOGhep_(dsRef, suKien, soBan) {
  var kq = [];
  dsRef.forEach(function (ref) {
    var m = ref.match(/^([A-Z]{1,3})(\d+):([A-Z]{1,3})(\d+)$/);
    if (!m) { kq.push(xlsxDichSqref_(ref, suKien)); return; }
    var r1 = parseInt(m[2], 10), r2 = parseInt(m[4], 10);
    if (r1 === r2 && soBan[r1]) {
      var dau = xlsxHangDau_(r1, suKien);
      for (var i = 0; i < soBan[r1]; i++) kq.push(m[1] + (dau + i) + ':' + m[3] + (dau + i));
    } else {
      kq.push(m[1] + xlsxHangDau_(r1, suKien) + ':' + m[3] + xlsxHangCuoi_(r2, suKien));
    }
  });
  return kq;
}

// ---------- Nới cột số tiền: tránh ngắt dòng giữa số tiền trong ô hẹp ----------

var DOCX_RE_O_SO_TIEN_ = /\{\{\s*(?:[A-Za-z0-9_]+\.)?SO_TIEN(?:_VN|_QUY_DOI)?\s*\}\}/;
var DOCX_SO_TIEN_TOI_THIEU_ = 2400; // twip (~4,2 cm): đủ cho "1.234.567.890 VND" cỡ 11pt
var DOCX_COT_NHUONG_TOI_THIEU_ = 1500; // twip: cột nhường không hẹp hơn mức này

/**
 * Trong mỗi bảng có ô số tiền, nếu cột đó hẹp hơn DOCX_SO_TIEN_TOI_THIEU_ thì nới ra
 * và lấy phần chênh từ cột rộng nhất khác (tổng bề rộng bảng giữ nguyên).
 * Bỏ qua bảng có ô gộp ngang (gridSpan) để không làm lệch lưới.
 */
function docxNoRongCotTien_(xml, canhBao) {
  return xml.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, function (tbl) {
    if ((tbl.match(/<w:tbl(?:\s|>)/g) || []).length > 1) return tbl; // bảng lồng nhau: bỏ qua
    var mGrid = tbl.match(/<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/);
    if (!mGrid) return tbl;
    var grid = (mGrid[1].match(/<w:gridCol\b[^>]*\/>/g) || []).map(function (g) { return Number((g.match(/w:w="(\d+)"/) || [])[1]) || 0; });
    if (!grid.length) return tbl;
    if (/<w:gridSpan\b/.test(tbl)) return tbl;
    var cot = -1;
    var hang = tbl.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) || [];
    hang.forEach(function (tr) {
      if (cot >= 0) return;
      var o = (tr.match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) || []);
      o.forEach(function (tc, i) { if (cot < 0 && DOCX_RE_O_SO_TIEN_.test(tc)) cot = i; });
    });
    if (cot < 0 || cot >= grid.length) return tbl;
    var hien = grid[cot];
    if (hien >= DOCX_SO_TIEN_TOI_THIEU_) return tbl;
    var can = DOCX_SO_TIEN_TOI_THIEU_ - hien;
    var nhuong = -1;
    grid.forEach(function (w, i) { if (i !== cot && (nhuong < 0 || w > grid[nhuong])) nhuong = i; });
    if (nhuong < 0) return tbl;
    var lay = Math.min(can, Math.max(0, grid[nhuong] - DOCX_COT_NHUONG_TOI_THIEU_));
    if (lay <= 0) { canhBao.push('Cột số tiền trong mẫu hẹp, không đủ chỗ để nới tự động — nên nới cột trong Word.'); return tbl; }
    if (lay < can) canhBao.push('Cột số tiền chỉ nới được ' + lay + ' twip (cần ' + can + ') — kiểm tra lại bố cục khi in.');
    var moi = grid.slice(); moi[cot] += lay; moi[nhuong] -= lay;
    function ghiLuoi(xmlLuoi) {
      var i = 0;
      return xmlLuoi.replace(/<w:gridCol\b[^>]*\/>/g, function (g) { var w = moi[i++]; return g.replace(/w:w="\d+"/, 'w:w="' + w + '"'); });
    }
    function ghiO(tc, col, w) {
      return tc.replace(/<w:tcW\b[^>]*\/>/, function (t) { return t.replace(/w:w="\d+"/, 'w:w="' + w + '"'); });
    }
    var ketQua = tbl.replace(mGrid[0], '<w:tblGrid>' + ghiLuoi(mGrid[1]) + '</w:tblGrid>');
    ketQua = ketQua.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, function (tr) {
      var col = 0;
      return tr.replace(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g, function (tc) {
        var c = col++;
        if (c === cot) return ghiO(tc, c, moi[cot]);
        if (c === nhuong) return ghiO(tc, c, moi[nhuong]);
        return tc;
      });
    });
    return ketQua;
  });
}
