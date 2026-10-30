/* Tạo gói mã triển khai RIÊNG cho một công ty mới (không chứa ID Sheet/Drive của HAK).
 * Dùng: node tools/tao_goi_trien_khai.cjs "Đại Hiệp" "CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ ĐẠI HIỆP" [thư_mục_đích]
 * Không sửa mã nguồn gốc (HAK); chỉ ghi vào thư mục đích. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const ten = process.argv[2] || 'Đại Hiệp';
const tenDayDu = process.argv[3] || ten;
const dich = path.resolve(process.argv[4] || path.join(root, 'reports', 'goi_' + ten.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/\W+/g, '_')));
const HAK_IDS = ['1Txv6FRkjsJRCcHJvjeX7RM65vZ7CdY_aMsiqMOglhIM', '1KdbvfpXI3EBaFlq4bfv9ZSala-D3Pe-6tZZYQArt-vU', '1OmF33Lb03Iu2Tzk0-08nBYFBY9u_OM3t'];

function thayMot(s, tu, den, nhan) { if (!s.includes(tu)) throw new Error('Không tìm thấy đoạn cần thay: ' + nhan); return s.split(tu).join(den); }

fs.rmSync(dich, { recursive: true, force: true });
fs.mkdirSync(dich, { recursive: true });
for (const f of fs.readdirSync(root)) {
  if (!/\.(gs|html)$/.test(f) && f !== 'appsscript.json') continue;
  fs.copyFileSync(path.join(root, f), path.join(dich, f));
}

// Bộ mẫu thật dùng chung (mẫu Đại Hiệp giống HAK): kèm theo để tải lên tab "Mẫu Word" của Sheet mới.
if (fs.existsSync(path.join(root, 'mau_that'))) fs.cpSync(path.join(root, 'mau_that'), path.join(dich, 'mau_that'), { recursive: true });

// Code.gs: bỏ ID HAK, rơi về Sheet đang gắn script; thiếu cấu hình thì báo lỗi rõ thay vì đọc nhầm dữ liệu.
let code = fs.readFileSync(path.join(dich, 'Code.gs'), 'utf8');
code = thayMot(code, "var SPREADSHEET_ID = '" + HAK_IDS[0] + "';", "var SPREADSHEET_ID = ''; // để trống: dùng CH_SPREADSHEET_ID (Script Properties) hoặc Sheet đang gắn script", 'SPREADSHEET_ID');
code = thayMot(code, "var SS_MUA_HANG_ID = '" + HAK_IDS[1] + "';", "var SS_MUA_HANG_ID = ''; // tuỳ chọn: Sổ chi tiết mua hàng (CH_SS_MUA_HANG_ID)", 'SS_MUA_HANG_ID');
code = thayMot(code, "var THU_MUC_GOC_ID = '" + HAK_IDS[2] + "';", "var THU_MUC_GOC_ID = ''; // do khoiTaoCongTyMoi() tạo và lưu vào CH_THU_MUC_GOC_ID", 'THU_MUC_GOC_ID');
code = thayMot(code, "  return v || SPREADSHEET_ID;\n}", "  if (v || SPREADSHEET_ID) return v || SPREADSHEET_ID;\n  var dang = null;\n  try { dang = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { dang = null; }\n  if (dang) return dang.getId();\n  throw new Error('Chưa cấu hình Google Sheet dữ liệu. Mở Apps Script gắn với Sheet của công ty và chạy khoiTaoCongTyMoi() một lần.');\n}", 'idSpreadsheet_');
code = code.split('\n').filter(function (d) { return !/^\/\/ https:\/\/(docs|drive)\.google\.com\//.test(d); }).join('\n');
fs.writeFileSync(path.join(dich, 'Code.gs'), code);

// Thương hiệu trong thư nhắc nợ.
let nn = fs.readFileSync(path.join(dich, 'NHACNO.gs'), 'utf8');
nn = nn.split('Hồ sơ vay HAK').join('Hồ sơ vay ' + ten);
fs.writeFileSync(path.join(dich, 'NHACNO.gs'), nn);

// Hàm khởi tạo một lần, chạy trong trình soạn Apps Script.
fs.writeFileSync(path.join(dich, 'KHOITAOCONGTY.gs'), `/**
 * Khởi tạo MỘT LẦN cho ${tenDayDu}: gắn Sheet dữ liệu, tạo thư mục Drive gốc, dựng cấu trúc các tab.
 * Chạy từ trình soạn Apps Script (Extensions > Apps Script) của CHÍNH Google Sheet của công ty. Chạy lại an toàn:
 * không tạo thư mục thứ hai nếu đã có, không xoá dữ liệu.
 */
function khoiTaoCongTyMoi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Hãy mở Apps Script từ menu Extensions của Google Sheet công ty rồi chạy lại.');
  var p = PropertiesService.getScriptProperties();
  p.setProperty('CH_SPREADSHEET_ID', ss.getId());
  var idThuMuc = String(p.getProperty('CH_THU_MUC_GOC_ID') || '');
  var thuMuc = null;
  if (idThuMuc) { try { thuMuc = DriveApp.getFolderById(idThuMuc); } catch (e) { thuMuc = null; } }
  if (!thuMuc) {
    thuMuc = DriveApp.createFolder('Hồ sơ vay ${ten} — dữ liệu');
    p.setProperty('CH_THU_MUC_GOC_ID', thuMuc.getId());
  }
  khoiTaoCauTrucSheet_(ss);
  var kq = 'Sheet: ' + ss.getName() + ' (' + ss.getId() + ')\\nThư mục Drive gốc: ' + thuMuc.getUrl();
  Logger.log(kq);
  try { SpreadsheetApp.getUi().alert('Đã khởi tạo xong.\\n' + kq); } catch (e) { /* chạy từ trình soạn không có UI */ }
  return kq;
}
`);

// Kiểm tra gói không còn ID HAK.
const loi = [];
for (const f of fs.readdirSync(dich)) {
  const s = fs.readFileSync(path.join(dich, f), 'utf8');
  for (const id of HAK_IDS) if (s.includes(id)) loi.push(f + ' còn ' + id);
}
if (loi.length) { console.error('GÓI CÒN ID HAK:\n' + loi.join('\n')); process.exit(1); }
console.log('Đã tạo gói: ' + dich + ' (' + fs.readdirSync(dich).length + ' tệp), không còn ID HAK.');
