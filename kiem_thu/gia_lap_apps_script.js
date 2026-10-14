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
    formatDate: (d, tz, f) => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d).reduce((a, x) => (a[x.type] = x.value, a), {}); return f === 'dd' ? p.day : f === 'MM' ? p.month : f === 'yyyy' ? p.year : f === 'yyyy-MM-dd' ? `${p.year}-${p.month}-${p.day}` : f === 'MM/yyyy' ? `${p.month}/${p.year}` : `${p.day}/${p.month}/${p.year}`; },
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
      try { cp.execFileSync('unzip', ['-o', '-q', f, '-d', out], { stdio: 'ignore' }); } catch (e) { throw new Error('Exception: Invalid argument: blob (không phải zip)'); }
      const ds = []; (function walk(dir) { fs.readdirSync(dir, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(dir, e.name)) : ds.push(path.relative(out, path.join(dir, e.name)))); })(out);
      const kq = ds.map(r => new Blob(fs.readFileSync(path.join(out, r)), 'application/octet-stream', r));
      fs.rmSync(d, { recursive: true, force: true }); return kq;
    },
    zip: (blobs, name) => {
      const d = fs.mkdtempSync(path.join(thuMucTam, 'z_')); const src = path.join(d, 's'); fs.mkdirSync(src);
      blobs.forEach(b => { const p = path.join(src, b.name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, b.bytes); });
      const out = path.join(d, 'o.zip');
      cp.execFileSync('zip', ['-X', '-q', '-r', out, '.'], { cwd: src });
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
    getValues() { mt.__soLanDocRange = (mt.__soLanDocRange || 0) + 1; const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.g[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; }
    getValue() { return this.getValues()[0][0]; }
    setValues(vs) { this.sh.guard(); vs.forEach((row, i) => row.forEach((v, j) => { const R = this.r - 1 + i; while (this.sh.g.length <= R) this.sh.g.push([]); const rr = this.sh.g[R]; while (rr.length < this.c - 1 + j) rr.push(''); rr[this.c - 1 + j] = v; })); return this; }
    setValue(v) { return this.setValues([[v]]); }
    getA1Notation() { return 'R' + this.r + 'C' + this.c; }
    setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; } setNumberFormat() { return this; } setHorizontalAlignment() { return this; } setWrap() { return this; } setFontSize() { return this; } createFilter() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.g = []; this.loiGhi = null; }
    guard() { if (this.loiGhi && this.loiGhi.conLai-- <= 0) { const e = this.loiGhi.err; this.loiGhi = null; throw new Error(e); } }
    getName() { return this.name; } setName(n) { this.name = n; }
    getLastRow() { let l = 0; this.g.forEach((r, i) => { if (r.some(v => v !== '' && v !== null && v !== undefined)) l = i + 1; }); return l; }
    getLastColumn() { return this.g.reduce((m, r) => Math.max(m, r.length), 0); }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
    getDataRange() { return new Range(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
    deleteRow(r) { this.g.splice(r - 1, 1); }
    deleteRows(r, n) { this.g.splice(r - 1, n); }
    appendRow(row) { this.g[this.getLastRow()] = row; }
    clearContents() { this.g = []; } setFrozenRows() {} autoResizeColumns() {} setColumnWidth() {} setColumnWidths() {}
  }
  class Spreadsheet {
    constructor(idx, ten) { this.id = idx; this.ten = ten; this.sheets = {}; }
    getSheetByName(n) { return this.sheets[n] || null; }
    insertSheet(n) { return this.sheets[n] = new Sheet(n); }
    getSheets() { return Object.values(this.sheets); }
    getName() { return this.ten; } getId() { return this.id; } getUrl() { return 'https://sheet.example/' + this.id; }
  }
  const boDuLieu = new Spreadsheet('SS_CHINH', 'Hồ sơ vay');
  const SpreadsheetApp = {
    openById: () => boDuLieu, getActiveSpreadsheet: () => boDuLieu, flush: () => {},
    getUi: () => ({ alert: () => {}, createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }) })
  };

  // ---------- Drive ----------
  const dsFile = {}, dsFolder = {};
  function taoFolder(ten) {
    const f = { id: id('FOLDER'), ten, con: [], files: [] }; dsFolder[f.id] = f;
    f.getName = () => ten; f.getId = () => f.id; f.getUrl = () => 'https://drive.example/folder/' + f.id;
    f.getFoldersByName = (n) => { const l = f.con.filter(c => c.ten === n); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
    f.createFolder = (n) => { const c = taoFolder(n); f.con.push(c); return c; };
    f.createFile = (blob) => { const x = taoFile(blob); f.files.push(x); return x; };
    f.addFile = (x) => { f.files.push(x); return f; };
    f.getFiles = () => { let i = 0; return { hasNext: () => i < f.files.length, next: () => f.files[i++] }; };
    f.getFilesByName = (n) => { const l = f.files.filter(x => x.getName() === n); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
    return f;
  }
  function taoFile(blob, googleDoc) {
    const x = { id: id('FILE'), blob, googleDoc: !!googleDoc, daXoa: false };
    x.getId = () => x.id; x.getName = () => x.blob.name; x.getUrl = () => 'https://drive.example/file/' + x.id;
    x.getMimeType = () => x.blob.type; x.setName = (n) => { x.blob.name = n; return x; }; x.getBlob = () => new Blob(x.blob.bytes, x.blob.type, x.blob.name); x.setTrashed = (v) => { x.daXoa = v; };
    x.getAs = (mime) => {
      if (mime !== 'application/pdf') return x.blob;
      const d = fs.mkdtempSync(path.join(thuMucTam, 'pdf_')); const duoi = /\.xlsx$/i.test(x.blob.name) ? 'xlsx' : 'docx'; const f = path.join(d, 'tam.' + duoi); fs.writeFileSync(f, x.blob.bytes);
      try { cp.execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', d, f], { stdio: 'ignore', timeout: 180000 }); } catch (e) { throw new Error('Không chuyển được sang PDF'); }
      const pdf = new Blob(fs.readFileSync(path.join(d, 'tam.pdf')), 'application/pdf', 'x.pdf'); fs.rmSync(d, { recursive: true, force: true }); return pdf;
    };
    dsFile[x.id] = x; return x;
  }
  const goc = taoFolder('GOC'); dsFolder['GOC_ID'] = goc;
  const root = taoFolder('ROOT');
  const DriveApp = {
    getRootFolder: () => root,
    getFolderById: (i) => { if (!dsFolder[i]) throw new Error('Không tìm thấy thư mục ' + i); return dsFolder[i]; },
    getFileById: (i) => { if (!dsFile[i]) throw new Error('Không tìm thấy file ' + i); return dsFile[i]; },
    createFile: (blob) => taoFile(blob)
  };
  const Drive = { Files: { insert: (res, blob) => { const x = taoFile(new Blob(blob.bytes, blob.type, blob.name), true); return { id: x.id, title: res.title }; } } };

  const props = {}, cache = {};
  const nhatKyKhoa = { tryLock: () => true };
  const mt = {
    Blob, Utilities, XmlService, SpreadsheetApp, DriveApp, Drive,
    LockService: { getScriptLock: () => ({ tryLock: () => nhatKyKhoa.tryLock(), releaseLock: () => {}, waitLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] === undefined ? null : props[k], setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
    Session: { getActiveUser: () => ({ getEmail: () => mt.__email }), getEffectiveUser: () => ({ getEmail: () => 'chu@example.com' }) },
    MimeType: { PDF: 'application/pdf' },
    UrlFetchApp: { fetch: (url, opts) => mt.__fetch(url, opts) },
    ScriptApp: { getOAuthToken: () => 'TOKEN' },
    CacheService: { getScriptCache: () => ({ get: k => { mt.__cacheGet = (mt.__cacheGet || 0) + 1; return cache[k] === undefined ? null : cache[k]; }, put: (k, v, ttl) => { cache[k] = v; (mt.__cacheTtl = mt.__cacheTtl || {})[k] = ttl; }, remove: k => { delete cache[k]; } }) },
    HtmlService: { createHtmlOutput: (h) => ({ html: String(h), title: '', setTitle(t) { this.title = t; return this; } }) },
    console, Math, Date, JSON, Number, String, Object, Array, RegExp, Error, BigInt, isNaN, isFinite, parseInt, parseFloat,
    __email: 'ketoan@example.com', __fetch: () => { throw new Error('UrlFetchApp chưa được giả lập'); }
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
