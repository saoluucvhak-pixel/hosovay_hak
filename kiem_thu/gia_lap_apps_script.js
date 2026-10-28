/* GIẢ LẬP các dịch vụ Google Apps Script bằng Node.js để chạy NGUYÊN mã nguồn *.gs của repo ngoài Google.
 * LƯU Ý: đây là MÔ PHỎNG (Sheets/Drive/Lock/zip trong bộ nhớ + đĩa tạm). PDF được tạo bằng LibreOffice, không phải
 * bằng Google. Kết quả chạy ở đây chứng minh LOGIC và định dạng DOCX; KHÔNG thay thế việc chạy thử trên Google thật. */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process'), crypto = require('crypto'), os = require('os');

function taoMoiTruong(gocRepo, thuMucTam) {
  fs.mkdirSync(thuMucTam, { recursive: true });
  let demId = 0;
  const id = (p) => p + (++demId).toString(36).padStart(6, '0') + 'x'.repeat(20);

  // ---------- Blob ----------
  class Blob {
    constructor(bytes, type, name) { this.bytes = Buffer.from(bytes); this.type = type || 'application/octet-stream'; this.name = name || ''; }
    getName() { return this.name; } setName(n) { this.name = n; return this; }
    getBytes() { return Array.from(this.bytes).map(b => b > 127 ? b - 256 : b); }
    getDataAsString(cs) { return this.bytes.toString('utf8'); }
    getContentType() { return this.type; } setContentType(t) { this.type = t; return this; }
    getBlob() { return this; } getAs(t) { return this; }
  }

  // ---------- Utilities ----------
  const Utilities = {
    formatDate: (d, tz, f) => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {}); return /^[yMdHms\-\/: _.]+$/.test(String(f)) && /[Hms]/.test(String(f)) ? String(f).replace(/yyyy/g, p.year).replace(/MM/g, p.month).replace(/dd/g, p.day).replace(/HH/g, p.hour === '24' ? '00' : p.hour).replace(/mm/g, p.minute).replace(/ss/g, p.second) : (f === 'dd' ? p.day : f === 'MM' ? p.month : f === 'yyyy' ? p.year : f === 'yyyy-MM-dd' ? `${p.year}-${p.month}-${p.day}` : f === 'MM/yyyy' ? `${p.month}/${p.year}` : `${p.day}/${p.month}/${p.year}`); },
    computeDigest: (alg, s) => Array.from(crypto.createHash('md5').update(typeof s === 'string' ? s : Buffer.from(s)).digest()).map(b => b > 127 ? b - 256 : b),
    DigestAlgorithm: { MD5: 'MD5' },
    base64Decode: (s) => Array.from(Buffer.from(s, 'base64')).map(b => b > 127 ? b - 256 : b),
    base64Encode: (b) => Buffer.from(b).toString('base64'),
    newBlob: (data, type, name) => new Blob(typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data.map ? data.map(b => b & 255) : data), type, name),
    sleep: (ms) => { mt.__sleep = (mt.__sleep || 0) + 1; mt.__sleepMs = (mt.__sleepMs || 0) + (ms || 0); },
    getUuid: () => require('crypto').randomUUID(),
    computeHmacSha256Signature: (v, key) => Array.from(crypto.createHmac('sha256', typeof key === 'string' ? key : Buffer.from(key)).update(typeof v === 'string' ? v : Buffer.from(v)).digest()).map(b => b > 127 ? b - 256 : b),
    base64EncodeWebSafe: (v) => (typeof v === 'string' ? Buffer.from(v, 'utf8') : Buffer.from(v.map(b => b & 255))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    base64DecodeWebSafe: (s) => Array.from(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64')).map(b => b > 127 ? b - 256 : b),
    Charset: { UTF_8: 'UTF-8' },
    unzip: (blob) => {
      if (blob.type !== 'application/zip') throw new Error('Invalid argument: ContentType. Should be of type: application/zip'); // đúng hành vi Apps Script thật
      const d = fs.mkdtempSync(path.join(thuMucTam, 'uz_')); const f = path.join(d, 'in.zip'); fs.writeFileSync(f, blob.bytes);
      const out = path.join(d, 'x'); fs.mkdirSync(out);
      try {
        if (process.platform === 'win32') cp.execFileSync(process.env.HAK_PYTHON || 'python', ['-m', 'zipfile', '-e', f, out], { stdio: 'ignore' });
        else cp.execFileSync('unzip', ['-o', '-q', f, '-d', out], { stdio: 'ignore' });
      } catch (e) { throw new Error('Exception: Invalid argument: blob (không phải zip): ' + e.message); }
      const ds = []; (function walk(dir) { fs.readdirSync(dir, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(dir, e.name)) : ds.push(path.relative(out, path.join(dir, e.name)))); })(out);
      const kq = ds.map(r => new Blob(fs.readFileSync(path.join(out, r)), 'application/octet-stream', r.split(path.sep).join('/')));
      fs.rmSync(d, { recursive: true, force: true }); return kq;
    },
    zip: (blobs, name) => {
      const d = fs.mkdtempSync(path.join(thuMucTam, 'z_')); const src = path.join(d, 's'); fs.mkdirSync(src);
      blobs.forEach(b => { const p = path.join(src, b.name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, b.bytes); });
      const out = path.join(d, 'o.zip');
      if (process.platform === 'win32') {
        const code = 'import pathlib,sys,zipfile; root=pathlib.Path(sys.argv[1]); z=zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(root).as_posix()) for p in sorted(root.rglob("*")) if p.is_file()]; z.close()';
        cp.execFileSync(process.env.HAK_PYTHON || 'python', ['-c', code, src, out]);
      } else cp.execFileSync('zip', ['-X', '-q', '-r', out, '.'], { cwd: src });
      const r = new Blob(fs.readFileSync(out), 'application/zip', name); fs.rmSync(d, { recursive: true, force: true }); return r;
    }
  };

  // ---------- XmlService (kiểm tra cân thẻ) ----------
  const XmlService = {
    parse: (xml) => {
      const st = []; const re = /<(\/?)([A-Za-z0-9_:.-]+)([^>]*?)(\/?)>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g; let m;
      while ((m = re.exec(xml))) {
        if (!m[2]) continue; if (m[4]) continue;
        if (m[1]) { const t = st.pop(); if (t !== m[2]) throw new Error('XML không cân thẻ: ' + t + ' vs ' + m[2]); } else st.push(m[2]);
      }
      if (st.length) throw new Error('XML thiếu thẻ đóng: ' + st.pop());
      return {};
    }
  };

  // ---------- Sheets ----------
  class Range {
    constructor(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr || 1; this.nc = nc || 1; }
    getValues() { mt.__soLanDocRange = (mt.__soLanDocRange || 0) + 1; mt.__soODoc = (mt.__soODoc || 0) + this.nr * this.nc; if (mt.__traDoc && this.nr * this.nc > mt.__traDoc) (mt.__dauVet = mt.__dauVet || []).push(this.sh.name + ' ' + this.nr * this.nc + ' ← ' + new Error().stack.split('\n').slice(2, 7).map(x => x.trim().replace(/^at /, '').replace(/ \(.*[\\/]/, ' (')).join(' ⟵ ')); { const tk = (mt.__odocTheoSheet = mt.__odocTheoSheet || {}); const tn = this.sh.ten || this.sh.name || '?'; tk[tn] = (tk[tn] || 0) + this.nr * this.nc; } const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.g[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; }
    getValue() { return this.getValues()[0][0]; }
    setValues(vs) { this.sh.guard(); mt.__soLanGhiRange = (mt.__soLanGhiRange || 0) + 1; mt.__soOGhi = (mt.__soOGhi || 0) + vs.reduce((a, r) => a + r.length, 0); vs.forEach((row, i) => row.forEach((v, j) => { const R = this.r - 1 + i; while (this.sh.g.length <= R) this.sh.g.push([]); const rr = this.sh.g[R]; while (rr.length < this.c - 1 + j) rr.push(''); rr[this.c - 1 + j] = v; })); return this; }
    setValue(v) { return this.setValues([[v]]); }
    // Giả lập công thức: lưu văn bản công thức; getValue() trả đúng văn bản đó (tức "chưa tính xong"), test có thể ghi đè giá trị đã tính bằng setValue.
    setFormula(f) { this.congThuc = String(f); return this.setValue(String(f)); }
    getFormula() { return /^=/.test(String(this.getValue())) ? String(this.getValue()) : ''; }
    getA1Notation() { return 'R' + this.r + 'C' + this.c; }
    setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; } setNumberFormat() { return this; } setHorizontalAlignment() { return this; } setWrap() { return this; } setFontSize() { return this; } createFilter() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.g = []; this.loiGhi = null; }
    guard() { if (this.loiGhi && this.loiGhi.conLai-- <= 0) { const e = this.loiGhi.err; this.loiGhi = null; throw new Error(e); } }
    getName() { return this.name; } setName(n) { this.name = n; }
    getLastRow() { let l = 0; this.g.forEach((r, i) => { if (r.some(v => v !== '' && v !== null && v !== undefined)) l = i + 1; }); return l; }
    getLastColumn() { return this.g.reduce((m, r) => Math.max(m, r.length), 0); }
    getRange(r, c, nr, nc) {
      if (typeof r === 'string') { // ký hiệu A1 của MỘT ô (VD 'A1', 'B1') — đủ cho các sheet phụ
        const m = /^([A-Z]+)(\d+)$/.exec(r); if (!m) throw new Error('Giả lập chỉ hỗ trợ ô đơn dạng A1: ' + r);
        let col = 0; for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64; return new Range(this, Number(m[2]), col, 1, 1);
      }
      return new Range(this, r, c, nr, nc);
    }
    getDataRange() { return new Range(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
    // Lưới thật = các dòng có dữ liệu + dòng trống dư (thua). Sheet do ensureSheet_ tạo ở đây KHÔNG có dòng dư (như sheet đã cắt gọn)
    // và Google Sheets từ chối xoá khi không còn dòng nào ngoài dòng cố định → giả lập đúng lỗi đó.
    getMaxRows() { return this.g.length + (this.thua || 0); } getFrozenRows() { return this.frozen || 0; }
    insertRowsAfter(r, n) { this.thua = (this.thua || 0) + (n || 1); } insertRowAfter(r) { this.insertRowsAfter(r, 1); }
    chanXoaHet_(n) { if (this.getMaxRows() - n - this.getFrozenRows() < 1) throw new Error('Exception: Sorry, it is not possible to delete all non-frozen rows.'); }
    deleteRow(r) { this.chanXoaHet_(1); if (r <= this.g.length) this.g.splice(r - 1, 1); else this.thua--; }
    deleteRows(r, n) { this.chanXoaHet_(n); const tren = Math.max(0, Math.min(n, this.g.length - r + 1)); this.g.splice(r - 1, tren); this.thua = (this.thua || 0) - (n - tren); }
    appendRow(row) { this.g[this.getLastRow()] = row; }
    clearContents() { this.g = []; } setFrozenRows(n) { this.frozen = n || 0; } autoResizeColumns() {} setColumnWidth() {} setColumnWidths() {}
  }
  class Spreadsheet {
    constructor(idx, ten) { this.id = idx; this.ten = ten; this.sheets = {}; }
    getSheetByName(n) { return this.sheets[n] || null; }
    insertSheet(n) { return this.sheets[n] = new Sheet(n); } deleteSheet(sh) { delete this.sheets[sh.name]; } getSpreadsheetTimeZone() { return 'Asia/Ho_Chi_Minh'; }
    getSheets() { return Object.values(this.sheets); }
    getName() { return this.ten; } getId() { return this.id; } getUrl() { return 'https://sheet.example/' + this.id; }
  }
  const boDuLieu = new Spreadsheet('SS_CHINH', 'Hồ sơ vay'), banSaoSheet = {};
  const SpreadsheetApp = {
    openById: (i) => banSaoSheet[i] || boDuLieu, getActiveSpreadsheet: () => boDuLieu, flush: () => {},
    create: (ten) => { // bảng tính tạm (xuất Excel/PDF): đăng ký như file Google để UrlFetchApp xuất được
      const c = taoFile(new Blob(Buffer.from('ss'), 'application/vnd.google-apps.spreadsheet', ten), true), b = new Spreadsheet(c.id, ten); b.sheets['Sheet1'] = new Sheet('Sheet1'); b.taoBangTam = true; banSaoSheet[c.id] = b; return b;
    },
    getUi: () => ({ alert: () => {}, createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }) })
  };

  // ---------- Drive ----------
  const dsFile = {}, dsFolder = {};
  function taoFolder(ten) {
    const f = { id: id('FOLDER'), ten, con: [], files: [], cha: [] }; dsFolder[f.id] = f;
    f.getParents = () => { let i = 0; return { hasNext: () => i < f.cha.length, next: () => f.cha[i++] }; };
    f.getName = () => ten; f.getId = () => f.id; f.getUrl = () => 'https://drive.example/folder/' + f.id;
    f.getFoldersByName = (n) => { const l = f.con.filter(c => c.ten === n); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
    f.createFolder = (n) => { const c = taoFolder(n); c.cha.push(f); f.con.push(c); return c; };
    f.createFile = (blob) => { const x = taoFile(blob); x.cha.push(f); f.files.push(x); return x; };
    f.addFile = (x) => { f.files.push(x); if (x.cha && x.cha.indexOf(f) < 0) x.cha.push(f); return f; };
    f.removeFile = (x) => { f.files = f.files.filter(y => y !== x); if (x.cha) x.cha = x.cha.filter(y => y !== f); return f; };
    f.getFiles = () => { let i = 0; return { hasNext: () => i < f.files.length, next: () => f.files[i++] }; };
    f.getFilesByName = (n) => { const l = f.files.filter(x => x.getName() === n); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
    return f;
  }
  function taoFile(blob, googleDoc) {
    const x = { id: id('FILE'), blob, googleDoc: !!googleDoc, daXoa: false, cha: [] };
    x.getParents = () => { let i = 0; return { hasNext: () => i < x.cha.length, next: () => x.cha[i++] }; };
    x.getId = () => x.id; x.getName = () => x.blob.name; x.getUrl = () => 'https://drive.example/file/' + x.id;
    x.getMimeType = () => x.blob.type; x.setName = (n) => { x.blob.name = n; return x; }; x.getBlob = () => new Blob(x.blob.bytes, x.blob.type, x.blob.name); x.setTrashed = (v) => { x.daXoa = v; };
    x.getSize = () => x.blob.bytes.length; x.getId = () => x.id;
    x.makeCopy = (ten, folder) => { if (mt.__hongSaoTep && mt.__hongSaoTep(x)) throw new Error(mt.__hongSaoLoi || 'Lỗi giả lập khi sao chép'); const c = taoFile(new Blob(mt.__saiKichThuoc ? Buffer.concat([x.blob.bytes, Buffer.from('!')]) : x.blob.bytes, x.blob.type, ten || x.blob.name)); if (folder) { folder.files.push(c); c.cha.push(folder); } return c; };
    x.moTa = ''; x.getDescription = () => x.moTa; x.setDescription = (d) => { x.moTa = String(d); return x; };
    x.getDateCreated = () => x.ngayTao || new Date(); x.isTrashed = () => !!x.daXoa;
    x.getAs = (mime) => {
      if (mime !== 'application/pdf') return x.blob;
      if (mt.__boQuaPdf) return new Blob(Buffer.from('%PDF-1.4 gia lap'), 'application/pdf', 'x.pdf'); // test quy trình: không cần LibreOffice
      const d = fs.mkdtempSync(path.join(thuMucTam, 'pdf_')); const duoi = /\.xlsx$/i.test(x.blob.name) ? 'xlsx' : 'docx'; const f = path.join(d, 'tam.' + duoi); fs.writeFileSync(f, x.blob.bytes);
      try { cp.execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', d, f], { stdio: 'ignore', timeout: 180000 }); } catch (e) { throw new Error('Không chuyển được sang PDF'); }
      const pdf = new Blob(fs.readFileSync(path.join(d, 'tam.pdf')), 'application/pdf', 'x.pdf'); fs.rmSync(d, { recursive: true, force: true }); return pdf;
    };
    dsFile[x.id] = x; return x;
  }
  // File Sheet chính trên Drive: makeCopy tạo bản sao (có thể giả lập hỏng bằng mt.__hongBanSao) và đăng ký Spreadsheet bản sao.
  (function () {
    const f = taoFile(new Blob(Buffer.from('ss'), 'application/vnd.google-apps.spreadsheet', 'Hồ sơ vay')); delete dsFile[f.id]; f.id = 'SS_CHINH'; dsFile['SS_CHINH'] = f;
    f.makeCopy = (ten) => {
      const c = taoFile(new Blob(Buffer.from('ss'), 'application/vnd.google-apps.spreadsheet', ten));
      const b = new Spreadsheet(c.id, ten); if (!mt.__hongBanSao) Object.keys(boDuLieu.sheets).forEach(n => { const g = boDuLieu.sheets[n], x = new Sheet(n); x.g = structuredClone(g.g); x.thua = g.thua; x.frozen = g.frozen; b.sheets[n] = x; }); banSaoSheet[c.id] = b; return c; // ảnh chụp THẬT: dữ liệu bản sao không đổi khi bản gốc đổi
    };
  })();
  const goc = taoFolder('GOC'); dsFolder['GOC_ID'] = goc;
  const root = taoFolder('ROOT');
  const DriveApp = {
    getRootFolder: () => root,
    getFolderById: (i) => { if (!dsFolder[i]) throw new Error('Không tìm thấy thư mục ' + i); return dsFolder[i]; },
    getFileById: (i) => { if (!dsFile[i]) throw new Error('Không tìm thấy file ' + i); return dsFile[i]; },
    createFile: (blob) => taoFile(blob),
    getStorageUsed: () => mt.__driveDaDung ?? 1000, getStorageLimit: () => mt.__driveGioiHan ?? 15000000000
  };
  const Drive = { Files: { insert: (res, blob) => { const x = taoFile(new Blob(blob.bytes, blob.type, blob.name), true); return { id: x.id, title: res.title }; } } };

  const props = { ADMIN_EMAILS: 'ketoan@example.com' }, cache = {}; // mặc định như PRODUCTION: người dùng thử là quản trị đã cấu hình
  const nhatKyKhoa = { tryLock: () => true };
  const mt = {
    Blob, Utilities, XmlService, SpreadsheetApp, DriveApp, Drive,
    LockService: { getScriptLock: () => ({ tryLock: () => nhatKyKhoa.tryLock(), releaseLock: () => {}, waitLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] === undefined ? null : props[k], setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
    Session: { getScriptTimeZone: () => 'Asia/Ho_Chi_Minh', getActiveUser: () => ({ getEmail: () => mt.__email }), getEffectiveUser: () => ({ getEmail: () => 'chu@example.com' }) },
    MimeType: { PDF: 'application/pdf' },
    UrlFetchApp: { fetch: (url, opts) => mt.__fetch(url, opts) },
    ScriptApp: { getOAuthToken: () => 'TOKEN' },
    CacheService: { getScriptCache: () => ({ get: k => { mt.__cacheGet = (mt.__cacheGet || 0) + 1; return cache[k] === undefined ? null : cache[k]; }, put: (k, v, ttl) => { cache[k] = v; (mt.__cacheTtl = mt.__cacheTtl || {})[k] = ttl; }, remove: k => { delete cache[k]; } }) },
    HtmlService: { createHtmlOutput: (h) => ({ html: String(h), title: '', setTitle(t) { this.title = t; return this; } }) },
    console, Math, Date, JSON, Number, String, Object, Array, RegExp, Error, BigInt, isNaN, isFinite, parseInt, parseFloat,
    __email: 'ketoan@example.com', __fetch: (url, opts) => {
      const match = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)\/export\?(.+)$/.exec(url);
      if (match && banSaoSheet[match[1]] && banSaoSheet[match[1]].taoBangTam) { // xuất bảng tạm: trả JSON các sheet để test đọc lại
        const q = new URLSearchParams(match[2]); (mt.__xuatTam = mt.__xuatTam || []).push({ url, dinhDang: q.get('format'), auth: opts?.headers?.Authorization });
        if (mt.__xuatLoi) return { getResponseCode: () => mt.__xuatLoi, getBlob: () => null };
        const nd = JSON.stringify(Object.values(banSaoSheet[match[1]].sheets).map(x => ({ ten: x.name, g: x.g })));
        return { getResponseCode: () => 200, getBlob: () => new Blob(Buffer.from(nd), q.get('format') === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'x') };
      }
      if (!match || !dsFile[match[1]] || !dsFile[match[1]].googleDoc) throw new Error('UrlFetchApp chưa được giả lập: chỉ hỗ trợ PDF của file Google thử.');
      const query = new URLSearchParams(match[2]);
      if (query.get('format') !== 'pdf' || !['2','4'].includes(query.get('scale')) || opts?.headers?.Authorization !== 'Bearer TOKEN') throw new Error('Yêu cầu xuất PDF thử không hợp lệ.');
      (mt.__pdfExportRequests || (mt.__pdfExportRequests = [])).push({url,scale:query.get('scale')});
      return { getResponseCode: () => 200, getBlob: () => dsFile[match[1]].getAs('application/pdf') };
    }
  };
  mt.__ = { boDuLieu, dsFile, dsFolder, goc, props, nhatKyKhoa, Blob, cache };
  const ctx = vm.createContext(mt);
  fs.readdirSync(goc_).filter(f => f.endsWith('.gs')).forEach(f => vm.runInContext(fs.readFileSync(path.join(goc_, f), 'utf8'), ctx, { filename: f }));
  // Gắn cố định ID thư mục gốc cho cấu hình
  vm.runInContext("THU_MUC_GOC_ID = 'GOC_ID'; SPREADSHEET_ID = 'SS_CHINH';", ctx);
  return { ctx, mt, run: (c) => vm.runInContext(c, ctx) };
}
var goc_;
module.exports = function (gocRepo, tam) { goc_ = gocRepo; return taoMoiTruong(gocRepo, tam); };

/**
 * TIỆN ÍCH KIỂM THỬ.
 *  • khachHangDungRevision(ctx): mô phỏng một TRÌNH DUYỆT ĐÚNG QUY ĐỊNH — mọi lời gọi cập nhật hồ sơ luôn kèm expectedRevision hiện hành (nếu test không tự truyền).
 *    Dùng cho các test cũ không nhằm kiểm tra revision. Test kiểm tra revision/quy trình (chay_quy_trinh.js) KHÔNG dùng hàm này. ctx.__goc giữ hàm gốc.
 *  • xacNhanHopLe(ctx, maHoSo, ghiDe): gọi xacNhanGiaiNganThucTe với thông tin hợp lệ (ngày hôm nay, số tham chiếu duy nhất, đủ số tiền).
 */
module.exports.khachHangDungRevision = function (ctx) {
  const goc = ctx.__goc = ctx.__goc || {};
  const rev = (ma) => { const h = ctx.layHoSoTheoMa_(ma); return h ? (Number(h.Revision) || 0) : undefined; };
  const boc = (ten, lay) => { goc[ten] = goc[ten] || ctx[ten]; const f = goc[ten]; ctx[ten] = function () { const a = Array.from(arguments); lay(a); return f.apply(null, a); }; };
  const opt = (a, i, ma) => { a[i] = Object.assign({ expectedRevision: rev(ma) }, a[i] || {}); };
  ['taoTronBoTheoMau', 'taoDeNghiGiaiNganBIDV', 'taoChungTuThanhToan', 'taoHopDongMuaBanNgoaiTe'].forEach((t) => boc(t, (a) => opt(a, 1, a[0])));
  boc('taoChungTuTuyChon', (a) => opt(a, 2, a[0]));
  boc('phatHanhChungTu_', (a) => { if (a[3] === undefined || a[3].expectedRevision === undefined) a[3] = Object.assign({ expectedRevision: rev(a[0]) }, a[3] || {}); });
  boc('chuyenHoSoVeNhap', (a) => { if (a[2] === undefined) a[2] = rev(a[0]); });
  boc('xoaHoSo', (a) => opt(a, 1, a[0]));
  boc('luuHoSoGiaiNgan', (a) => { const p = a[0]; if (p && p.maHoSo && p.expectedRevision === undefined) a[0] = Object.assign({}, p, { expectedRevision: rev(p.maHoSo) }); });
  boc('capNhatThongTinPhiTienTe', (a) => { const p = a[0]; if (p && p.maHoSo && p.expectedRevision === undefined) a[0] = Object.assign({}, p, { expectedRevision: rev(p.maHoSo) }); });
  boc('khoiPhucHoSo', (a) => { if (a[1] === undefined) { const h = ctx.sheetToObjects_('HoSoGiaiNgan').filter((x) => x.MaHoSo === a[0])[0]; a[1] = h ? (Number(h.Revision) || 0) : undefined; } });
  return ctx;
};
let _demXN = 0;
module.exports.xacNhanHopLe = function (ctx, maHoSo, ghiDe) {
  const h = ctx.layHoSoTheoMa_(maHoSo), hom = new Date().toISOString().slice(0, 10);
  return ctx.xacNhanGiaiNganThucTe(maHoSo, Object.assign({ ngayThucTe: hom, soThamChieuNH: 'FT' + (++_demXN) + Date.now(), soTienThucTe: h.SoTienNhanNoLanNay, taiLieuXacNhan: 'Sao kê NH số ' + _demXN, ghiChu: 'test' }, ghiDe || {}), (Number(h.Revision) || 0));
};

/** Đăng ký "người dùng thường" nguoila@example.com (vai trò NHAP_LIEU) — PRODUCTION fail-closed chỉ cho người đã được cấp quyền. Gọi ngay sau initializeSpreadsheet() (khi người gọi mặc định là quản trị). */
module.exports.dangKyNguoiThuong = function (ctx) { ctx.luuNguoiDung({ email: 'nguoila@example.com', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' }); };
