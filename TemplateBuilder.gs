/**
 * TEMPLATEBUILDER.GS
 * TRÌNH TẠO MẪU TỪ FILE WORD THÔ: người dùng tải 1 file .docx ĐÃ ĐIỀN DỮ LIỆU THẬT (chưa có {{...}}), xem danh sách đoạn văn,
 * bôi chọn phần chữ cần thay bằng trường dữ liệu (hoặc nhận "gợi ý tự động" theo dữ liệu công ty/hợp đồng đã lưu), chọn hàng
 * mẫu cho bảng thụ hưởng, xoá các hàng thừa -> hệ thống chèn {{KHOÁ}} vào ĐÚNG chỗ (giữ định dạng của chữ đầu tiên bị thay) rồi
 * tải lên thành mẫu như bình thường (taiMauVanBan). Thêm mẫu mới KHÔNG phải sửa code.
 *
 * Phần LÕI (docx*Tho_) thuần chuỗi/XML, chạy được ngoài Apps Script để kiểm thử.
 * Mã đoạn: "<phần>#<số thứ tự đoạn trong phần>", ví dụ "word/document.xml#17" (cùng một bộ tách đoạn ở liệt kê và áp dụng).
 */

var BUILDER_RE_PHAN_ = /^word\/(document|header\d*|footer\d*)\.xml$/;
var BUILDER_RE_TOKEN_ = /<w:(tbl|tr|tc)(?=[\s>\/])|<\/w:(tbl|tr|tc)>/g;

// ---------------------------------------------------------------------------------------------------------------------
// LÕI: liệt kê đoạn văn
// ---------------------------------------------------------------------------------------------------------------------

/** Văn bản hiển thị của 1 đoạn (chỉ nối các <w:t>) và danh sách nút <w:t>. */
function docxVanBanDoan_(p) {
  var full = '', m, re = new RegExp(DOCX_RE_T_.source, 'g'), nodes = [];
  while ((m = re.exec(p)) !== null) {
    var t = docxGiaiMa_(m[1]);
    nodes.push({ s: m.index, e: m.index + m[0].length, t: t, from: full.length });
    full += t;
  }
  return { text: full, nodes: nodes };
}

/**
 * Liệt kê đoạn văn của 1 phần XML: [{id, chiSo, text, viTri, trongBang, bang, hang, hangId}]
 * hangId = thứ tự hàng bảng (cùng bộ tách DOCX_RE_HANG_) — dùng để xoá hàng thừa.
 */
function docxLietKeDoanTho_(xml, tenPhan) {
  var hang = [], mh, reH = new RegExp(DOCX_RE_HANG_.source, 'g');
  while ((mh = reH.exec(xml)) !== null) hang.push({ s: mh.index, e: mh.index + mh[0].length });

  var tok = [], mt, reT = new RegExp(BUILDER_RE_TOKEN_.source, 'g');
  while ((mt = reT.exec(xml)) !== null) tok.push({ pos: mt.index, mo: !!mt[1], loai: mt[1] || mt[2] });
  var ti = 0, stack = [], soBang = 0;
  function tienToi(pos) {
    while (ti < tok.length && tok[ti].pos < pos) {
      var t = tok[ti++];
      if (t.mo) {
        if (t.loai === 'tbl') { soBang++; stack.push({ bang: soBang, hang: 0, o: 0 }); }
        else if (stack.length) { var tp = stack[stack.length - 1]; if (t.loai === 'tr') { tp.hang++; tp.o = 0; } else tp.o++; }
      } else if (t.loai === 'tbl') stack.pop();
    }
  }

  var kq = [], chiSo = 0, mp, reP = new RegExp(DOCX_RE_DOAN_.source, 'g'), hi = 0;
  while ((mp = reP.exec(xml)) !== null) {
    tienToi(mp.index);
    var vb = docxVanBanDoan_(mp[0]);
    var tp = stack.length ? stack[stack.length - 1] : null;
    while (hi < hang.length && hang[hi].e <= mp.index) hi++;
    var hangId = (hi < hang.length && hang[hi].s <= mp.index && mp.index < hang[hi].e) ? hi : -1;
    kq.push({
      id: tenPhan + '#' + chiSo, chiSo: chiSo, text: vb.text,
      viTri: tenPhan === 'word/document.xml' ? (tp ? ('Bảng ' + tp.bang + ', hàng ' + tp.hang + ', ô ' + tp.o) : 'Nội dung') : (/header/.test(tenPhan) ? 'Đầu trang' : 'Chân trang'),
      trongBang: !!tp, bang: tp ? tp.bang : 0, hang: tp ? tp.hang : 0, o: tp ? tp.o : 0, hangId: hangId
    });
    chiSo++;
  }
  return kq;
}

// ---------------------------------------------------------------------------------------------------------------------
// LÕI: áp dụng ánh xạ
// ---------------------------------------------------------------------------------------------------------------------

/** Đặt căn lề cho đoạn p (chèn <w:jc> đúng thứ tự trong <w:pPr>). */
function docxDatCanhLe_(p, kieu) {
  var jc = '<w:jc w:val="' + kieu + '"/>';
  var mo = /^<w:p(?:\s[^>]*)?>/.exec(p);
  if (!mo) return p;
  if (/<w:pPr>[\s\S]*?<\/w:pPr>/.test(p)) {
    return p.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/, function (_, ben) {
      if (/<w:jc\s[^>]*\/>/.test(ben)) return '<w:pPr>' + ben.replace(/<w:jc\s[^>]*\/>/, jc) + '</w:pPr>';
      var sau = /<w:(textDirection|textAlignment|textboxTightWrap|outlineLvl|divId|cnfStyle|rPr|sectPr|pPrChange)[\s>\/]/.exec(ben);
      return '<w:pPr>' + (sau ? ben.substring(0, sau.index) + jc + ben.substring(sau.index) : ben + jc) + '</w:pPr>';
    });
  }
  if (/^<w:p(?:\s[^>]*)?\/>/.test(p)) return p;
  return mo[0] + '<w:pPr>' + jc + '</w:pPr>' + p.substring(mo[0].length);
}

/**
 * Thay các khoảng [s,e) trong văn bản đoạn bằng "{{KHOÁ}}". Chữ mới nằm trong <w:t> đầu tiên mà khoảng chạm tới
 * (giữ định dạng của run đó); phần còn lại của khoảng bị bỏ khỏi các run khác. Đoạn không đổi giữ nguyên từng byte.
 */
function docxChenPlaceholderDoan_(p, dsAnhXa) {
  var vb = docxVanBanDoan_(p), nodes = vb.nodes;
  var ds = dsAnhXa.slice().sort(function (a, b) { return a.s - b.s; });
  function nodeChua(pos) { for (var i = nodes.length - 1; i >= 0; i--) if (nodes[i].from <= pos) return i; return 0; }
  // Chèn (s = e) vào cuối nút liền trước khi vị trí rơi đúng ranh giới hai nút (tránh nhảy qua <w:tab/> nằm giữa).
  function nodeChen(pos) { for (var i = nodes.length - 1; i > 0; i--) if (nodes[i].from < pos) return i; return 0; }
  var dau = ds.map(function (a) { return a.s === a.e ? nodeChen(a.s) : nodeChua(a.s); });
  var kq = p;
  for (var n = nodes.length - 1; n >= 0; n--) {
    var ns = nodes[n].from, ne = ns + nodes[n].t.length, pos = ns, out = '', doi = false;
    for (var k = 0; k < ds.length; k++) {
      var a = ds[k];
      var lo = Math.max(ns, a.s), hi = Math.min(ne, a.e);
      if (lo >= hi && dau[k] !== n) continue;
      if (hi < lo) hi = lo;
      out += nodes[n].t.substring(pos - ns, lo - ns);
      if (dau[k] === n) out += '{{' + a.khoa + '}}';
      pos = Math.max(pos, hi); doi = true;
    }
    if (!doi) continue;
    out += nodes[n].t.substring(pos - ns);
    kq = kq.substring(0, nodes[n].s) + '<w:t xml:space="preserve">' + docxMaHoa_(out) + '</w:t>' + kq.substring(nodes[n].e);
  }
  return kq;
}

/**
 * Áp dụng ánh xạ cho 1 phần XML.
 * @param {string} xml
 * @param {string} tenPhan
 * @param {{doan:string, s:number, e:number, chuoi:string, khoa:string}[]} anhXa  (doan = mã đoạn)
 * @param {function(string):{kieu:string}} tra  tra kiểu của khoá (từ từ điển)
 * @return {{xml:string, soThay:number, loi:string[]}}
 */
function docxApAnhXaPhan_(xml, tenPhan, anhXa, tra) {
  var theoDoan = {}, loi = [], soThay = 0;
  anhXa.forEach(function (a) {
    var i = a.doan.indexOf('#');
    if (a.doan.substring(0, i) !== tenPhan) return;
    var so = Number(a.doan.substring(i + 1));
    (theoDoan[so] = theoDoan[so] || []).push(a);
  });
  var chiSo = 0;
  var ra = xml.replace(DOCX_RE_DOAN_, function (p) {
    var ds = theoDoan[chiSo++];
    if (!ds) return p;
    var vb = docxVanBanDoan_(p), tt = ds.slice().sort(function (a, b) { return a.s - b.s; });
    for (var k = 0; k < tt.length; k++) {
      var a = tt[k];
      if (!(a.s >= 0 && a.e >= a.s && a.e <= vb.text.length)) { loi.push('Đoạn ' + a.doan + ': vị trí chọn nằm ngoài đoạn.'); return p; }
      if (vb.text.substring(a.s, a.e) !== a.chuoi) { loi.push('Đoạn ' + a.doan + ': nội dung đã khác lúc chọn ("' + a.chuoi + '" ≠ "' + vb.text.substring(a.s, a.e) + '"). Tải lại file và chọn lại.'); return p; }
      if (k > 0 && tt[k - 1].e > a.s) { loi.push('Đoạn ' + a.doan + ': hai vùng chọn chồng lên nhau.'); return p; }
    }
    var moi = docxChenPlaceholderDoan_(p, tt);
    soThay += tt.length;
    // (a.e = a.s: CHÈN tại vị trí, không thay chữ nào.)
    // Ô bảng chỉ chứa đúng 1 trường: căn lề theo kiểu dữ liệu (tiền → phải, ngày/STT → giữa, chuỗi → trái).
    if (tt.length === 1 && tt[0].trongBang && vb.text.trim() === tt[0].chuoi.trim()) {
      var e = tra(tt[0].khoa), kieu = e ? e.kieu : '';
      var cl = /^CT\.STT/.test(tt[0].khoa) || kieu === 'ngay' ? 'center' : (kieu === 'tien' ? 'right' : (kieu === 'text' ? 'left' : ''));
      if (cl) moi = docxDatCanhLe_(moi, cl);
    }
    return moi;
  });
  return { xml: ra, soThay: soThay, loi: loi };
}

/** Xoá các hàng bảng (theo thứ tự DOCX_RE_HANG_) — dùng để bỏ hàng ví dụ thừa, giữ lại 1 hàng mẫu. */
function docxXoaHangTho_(xml, dsHang) {
  if (!dsHang.length) return { xml: xml, soXoa: 0 };
  var bo = {}; dsHang.forEach(function (h) { bo[h] = true; });
  var i = 0, so = 0;
  var ra = xml.replace(DOCX_RE_HANG_, function (h) { var xoa = bo[i++]; if (xoa) so++; return xoa ? '' : h; });
  return { xml: ra, soXoa: so };
}

// ---------------------------------------------------------------------------------------------------------------------
// GỢI Ý TỰ ĐỘNG
// ---------------------------------------------------------------------------------------------------------------------

function builderEscRe_(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Gợi ý khoảng cần thay trong 1 đoạn.
 * @param {string} text văn bản đoạn
 * @param {{khoa:string, v:string}[]} giaTri các cặp (khoá, giá trị đang lưu) của công ty, hợp đồng
 * @return {{s:number,e:number,khoa:string,ly:string}[]} không chồng lấn, ưu tiên khoảng dài hơn
 */
function goiYTrongDoan_(text, giaTri) {
  var ung = [];
  giaTri.forEach(function (c) {
    var khoa = c.khoa, v = String(c.v === null || c.v === undefined ? '' : c.v).trim();
    if (v.length < 4) return;
    var re;
    if (/^[\d\s.\-\/]+$/.test(v) && v.replace(/\D/g, '').length >= 6) {
      // số điện thoại / tài khoản: bỏ qua khác biệt dấu chấm, khoảng trắng, gạch
      re = new RegExp(v.replace(/\D/g, '').split('').join('[\\s.\\-\\/]*'), 'g');
    } else {
      re = new RegExp(builderEscRe_(v), 'g');
    }
    var m;
    while ((m = re.exec(text)) !== null) {
      ung.push({ s: m.index, e: m.index + m[0].length, khoa: khoa, ly: 'trùng dữ liệu ' + khoa });
      if (m[0].length === 0) re.lastIndex++;
    }
  });
  // mẫu nhãn chung trong văn bản hành chính ngân hàng
  var r;
  r = /ngày\s*[.…\s]{2,}\s*tháng\s*[.…\s]{2,}\s*năm\s*[.…\s\d]*/.exec(text);
  if (r) ung.push({ s: r.index, e: r.index + r[0].replace(/\s+$/, '').length, khoa: 'NGAY.GIAI_NGAN_DAY_DU', ly: 'ngày/tháng/năm bỏ trống' });
  r = /ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}/.exec(text);
  if (r) ung.push({ s: r.index, e: r.index + r[0].length, khoa: 'NGAY.GIAI_NGAN_DAY_DU', ly: 'ngày tháng năm đã điền' });
  r = /Thời hạn vay:\s*(\d+)/.exec(text);
  if (r) ung.push({ s: r.index + r[0].length - r[1].length, e: r.index + r[0].length, khoa: 'HO_SO.THOI_HAN_VAY', ly: 'sau "Thời hạn vay"' });
  r = /(?:rút số tiền vay là|số tiền vay là|Số tiền|số tiền):?\s*([\d][\d.,]*)/.exec(text);
  if (r && /rút số tiền vay|số tiền vay/.test(r[0])) ung.push({ s: r.index + r[0].length - r[1].length, e: r.index + r[0].length, khoa: 'HO_SO.SO_TIEN', ly: 'sau "số tiền vay là"' });
  r = /Bằng chữ\s*:\s*([^()]+?)(?=\s*(?:\.?\/\.|\)|\.?$))/.exec(text);
  if (r) ung.push({ s: r.index + r[0].length - r[1].length, e: r.index + r[0].length, khoa: 'HO_SO.SO_TIEN_BANG_CHU', ly: 'sau "Bằng chữ"' });

  ung.sort(function (a, b) { return (b.e - b.s) - (a.e - a.s) || a.s - b.s; });
  var giu = [];
  ung.forEach(function (u) { if (!giu.some(function (g) { return u.s < g.e && g.s < u.e; })) giu.push(u); });
  return giu.sort(function (a, b) { return a.s - b.s; });
}

/** Gợi ý theo cấu trúc bảng thụ hưởng: nhận dạng tiêu đề cột rồi đề xuất khoá cho hàng dữ liệu đầu tiên. */
function goiYBangThuHuong_(dsDoan) {
  var theoBang = {};
  dsDoan.forEach(function (d) { if (d.trongBang) { var b = theoBang[d.bang] = theoBang[d.bang] || {}; var h = b[d.hang] = b[d.hang] || {}; (h[d.o] = h[d.o] || []).push(d); } });
  var kq = [];
  Object.keys(theoBang).forEach(function (bk) {
    var b = theoBang[bk], dsHang = Object.keys(b).map(Number).sort(function (x, y) { return x - y; });
    if (dsHang.length < 2) return;
    var tieuDe = b[dsHang[0]], tenCot = {}, coThuHuong = false;
    Object.keys(tieuDe).forEach(function (o) {
      var t = tieuDe[o].map(function (d) { return d.text; }).join(' ').toLowerCase();
      if (/thụ hưởng|số tài khoản/.test(t)) coThuHuong = true;
      tenCot[o] = t;
    });
    if (!coThuHuong) return;
    var hangDau = b[dsHang[1]];
    Object.keys(hangDau).forEach(function (o) {
      var t = tenCot[o] || '', ds = hangDau[o].filter(function (d) { return d.text.trim() !== ''; });
      if (!ds.length) return;
      function dat(d, khoa, ly, boNhan) {
        var s0 = d.text.search(/\S/), e0 = d.text.replace(/\s+$/, '').length;
        if (boNhan) { var cc = d.text.lastIndexOf(':', e0); if (cc >= 0 && cc < e0 - 1) { s0 = cc + 1; while (s0 < e0 && /\s/.test(d.text.charAt(s0))) s0++; } }
        if (s0 < 0 || e0 <= s0) return;
        kq.push({ doan: d.id, s: s0, e: e0, chuoi: d.text.substring(s0, e0), khoa: khoa, ly: ly, laBang: true });
      }
      if (/^\s*(tt|stt)\s*$/.test(t)) dat(ds[0], 'CT.STT_2', 'cột TT');
      else if (/nội dung/.test(t)) dat(ds[0], 'CT.NOI_DUNG', 'cột Nội dung');
      else if (/số tiền/.test(t) && /usd|ngoại tệ/.test(t)) dat(ds[0], 'CT.SO_TIEN', 'cột Số tiền (ngoại tệ)');
      else if (/số tiền/.test(t)) dat(ds[0], 'CT.SO_TIEN_QUY_DOI', 'cột Số tiền (đồng)');
      else if (/thụ hưởng/.test(t)) {
        if (ds[0]) dat(ds[0], 'CT.TEN_NGUOI_HUONG', 'dòng 1 cột người thụ hưởng');
        if (ds[1]) dat(ds[1], 'CT.SO_TAI_KHOAN', 'dòng 2 cột người thụ hưởng', true);
        if (ds[2]) dat(ds[2], 'CT.NGAN_HANG', 'dòng 3 cột người thụ hưởng', true);
      }
    });
  });
  return kq;
}

// ---------------------------------------------------------------------------------------------------------------------
// PHẦN BỌC (Apps Script)
// ---------------------------------------------------------------------------------------------------------------------

function builderGiaTriDaLuu_() {
  var kq = [];
  function them(khoa, v) { if (v !== undefined && v !== null && String(v) !== '') kq.push({ khoa: khoa, v: String(v) }); }
  var congTy = [], hopDong = [];
  try { congTy = sheetToObjects_(SHEET_CONGTY) || []; } catch (e) { congTy = []; }
  try { hopDong = sheetToObjects_(SHEET_HOPDONG) || []; } catch (e) { hopDong = []; }
  var mapCt = { TEN: 'TenCty', TEN_VIET_TAT: 'TenVietTat', DIA_CHI: 'DiaChiTruSo', MA_SO_THUE: 'MaSoThue', MA_CIF: 'MaCIF', DIEN_THOAI: 'DienThoai', FAX: 'Fax',
    NGUOI_DAI_DIEN: 'NguoiDaiDien', CHUC_VU: 'ChucVu', TAI_KHOAN_VND: 'TaiKhoanVND', TAI_KHOAN_USD: 'TaiKhoanUSD' };
  var mapHd = { SO_HOP_DONG: 'SoHopDong', TEN_NGAN_HANG: 'TenNganHang', CHI_NHANH: 'ChiNhanh', DIA_CHI_CHI_NHANH: 'DiaChiChiNhanh',
    NGUOI_DAI_DIEN_NH: 'NguoiDaiDienNH', CHUC_VU_NH: 'ChucVuNH' };
  congTy.forEach(function (h) { Object.keys(mapCt).forEach(function (k) { them('CONG_TY.' + k, h[mapCt[k]]); }); });
  hopDong.forEach(function (h) {
    Object.keys(mapHd).forEach(function (k) { them('HOP_DONG.' + k, h[mapHd[k]]); });
    if (h.NgayHopDong) them('HOP_DONG.NGAY_KY', ngayChoMau_(h.NgayHopDong));
  });
  return kq;
}

/** Giải nén .docx tải lên -> các phần cần xử lý. */
function builderMoGoi_(base64, tenFile) {
  if (loaiFileTuTen_(tenFile) !== 'docx') throw new Error('Trình tạo mẫu hiện chỉ nhận file Word .docx (Excel: gõ {{...}} trực tiếp trong ô theo hướng dẫn).');
  if (!base64) throw new Error('Chưa chọn file.');
  var bytes = Utilities.base64Decode(base64);
  if (bytes.length > KICH_THUOC_MAU_TOI_DA_) throw new Error('File quá lớn (tối đa 10 MB).');
  var cacPhan;
  try { cacPhan = giaiNenOffice_(Utilities.newBlob(bytes, DOCX_MIME_, tenFile)); } catch (e) { throw new Error('Không mở được file .docx: ' + e.message); }
  return cacPhan;
}

/**
 * Bước 1: đọc file Word thô -> danh sách đoạn văn + gợi ý.
 * @return {{tenFile:string, doan:Object[], goiY:Object[], soHang:Object[], daCoPlaceholder:boolean}}
 */
function phanTichTepTho(base64, tenFile) {
  yeuCauQuanTri_('tạo mẫu từ file Word');
  var cacPhan = builderMoGoi_(base64, tenFile), doan = [], dsHangBang = [], coPh = false;
  cacPhan.forEach(function (f) {
    var ten = f.getName();
    if (!BUILDER_RE_PHAN_.test(ten)) return;
    var xml = f.getDataAsString('UTF-8');
    if (/\{\{\s*[A-Za-z0-9_.]+\s*\}\}/.test(xml)) coPh = true;
    docxLietKeDoanTho_(xml, ten).forEach(function (d) { doan.push(d); });
  });
  var gtLuu = builderGiaTriDaLuu_(), goiY = [];
  doan.forEach(function (d) {
    if (!d.text.trim()) return;
    goiYTrongDoan_(d.text, gtLuu).forEach(function (g) {
      goiY.push({ doan: d.id, s: g.s, e: g.e, chuoi: d.text.substring(g.s, g.e), khoa: g.khoa, ly: g.ly });
    });
  });
  var chiDoanCoChu = doan.filter(function (d) { return d.text.trim() !== ''; });
  goiYBangThuHuong_(chiDoanCoChu).forEach(function (g) { goiY.push(g); });
  // bỏ gợi ý chồng nhau giữa hai nguồn (ưu tiên gợi ý bảng)
  var tot = [];
  goiY.sort(function (a, b) { return (b.laBang ? 1 : 0) - (a.laBang ? 1 : 0); }).forEach(function (g) {
    if (!tot.some(function (t) { return t.doan === g.doan && g.s < t.e && t.s < g.e; })) tot.push(g);
  });
  return { tenFile: tenFile, doan: chiDoanCoChu, goiY: tot, daCoPlaceholder: coPh, tongSoDoan: doan.length };
}

/**
 * Bước 2: áp dụng ánh xạ -> trả về file .docx đã chèn placeholder (base64) + phân tích mẫu, CHƯA lưu gì.
 * anhXa = [{doan, s, e, chuoi, khoa}], xoaHang = [{phan, hangId}]
 */
function taoMauTuAnhXa(base64, tenFile, anhXa, xoaHang) {
  yeuCauQuanTri_('tạo mẫu từ file Word');
  anhXa = anhXa || []; xoaHang = xoaHang || [];
  if (!anhXa.length) throw new Error('Chưa chọn vùng nào để thay bằng trường dữ liệu.');
  var td = tuDienPlaceholder_();
  anhXa.forEach(function (a) { if (!td[a.khoa]) throw new Error('Trường "' + a.khoa + '" không có trong danh mục placeholder.'); });
  var cacPhan = builderMoGoi_(base64, tenFile), ra = [], loi = [], soThay = 0, soXoa = 0;
  var tra = function (k) { return td[k] ? { kieu: td[k].kieu } : null; };
  // gắn cờ 'trongBang' cho từng vùng (cần để căn lề) -> tính lại từ danh sách đoạn
  var trongBang = {};
  cacPhan.forEach(function (f) {
    if (!BUILDER_RE_PHAN_.test(f.getName())) return;
    docxLietKeDoanTho_(f.getDataAsString('UTF-8'), f.getName()).forEach(function (d) { trongBang[d.id] = d.trongBang; });
  });
  anhXa = anhXa.map(function (a) { return { doan: String(a.doan), s: Number(a.s), e: Number(a.e), chuoi: String(a.chuoi), khoa: String(a.khoa), trongBang: !!trongBang[a.doan] }; });

  cacPhan.forEach(function (f) {
    var ten = f.getName();
    if (!BUILDER_RE_PHAN_.test(ten)) { ra.push(f); return; }
    var xml = f.getDataAsString('UTF-8');
    var kq = docxApAnhXaPhan_(xml, ten, anhXa, tra);
    kq.loi.forEach(function (l) { loi.push(l); });
    var dsHang = xoaHang.filter(function (h) { return h.phan === ten; }).map(function (h) { return Number(h.hangId); });
    var x = docxXoaHangTho_(kq.xml, dsHang);
    try { XmlService.parse(x.xml); } catch (e) { throw new Error('Phần "' + ten + '" sau khi chèn không còn là XML hợp lệ: ' + e.message); }
    soThay += kq.soThay; soXoa += x.soXoa;
    ra.push(Utilities.newBlob(x.xml, 'application/xml', ten));
  });
  if (!loi.length && soThay !== anhXa.length) loi.push((anhXa.length - soThay) + ' vùng không áp dụng được (mã đoạn không tồn tại trong file).');
  if (loi.length) throw new Error('Không áp dụng được:\n• ' + loi.join('\n• '));
  var ten2 = String(tenFile).replace(/\.docx$/i, '') + '_mau.docx';
  var zip = Utilities.zip(ra, ten2); zip.setContentType(DOCX_MIME_);
  var pt = phanTichMauTaiLieu_(zip, 'docx');
  return { base64: Utilities.base64Encode(zip.getBytes()), tenFile: ten2, soThay: soThay, soHangXoa: soXoa, hopLe: pt.hopLe, loi: pt.loi, canhBao: pt.canhBao,
    placeholder: pt.placeholder, coHangMau: pt.coHangMau };
}
