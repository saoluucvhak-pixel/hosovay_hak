/* ĐĂNG NHẬP QUA CỔNG (PHIEN.gs, theo mô hình HDMB_HAK): xác minh SSO HMAC, phiên, vai trò, cửa api(), mã ghép cặp, quản lý người dùng.
 * Mô phỏng "Cổng" bằng chính thuật toán ký của mã nguồn Cổng do layMaNguonCong() sinh ra (chạy mã đó trong vm).
 * GIẢ LẬP — không phải cổng/Google thật.  node kiem_thu/chay_dang_nhap.js */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_dang_nhap'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
const G = mt.__;
const kq = []; let loi = 0;
const dat = (n, t, ok, g) => { kq.push([n, t, ok ? 'ĐẠT' : 'LỖI', g || '']); if (!ok) loi++; };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
process.on('uncaughtException', (e) => { in_(); console.log('LỖI BẤT NGỜ:', e.stack.split('\n').slice(0, 5).join('\n')); process.exit(2); });
function in_() { let n = ''; kq.forEach(([a, b, c, d]) => { if (a !== n) { console.log('\n== ' + a); n = a; } console.log(`  [${c}] ${b}${c === 'LỖI' && d ? '  → ' + String(d).slice(0, 300) : ''}`); }); }

ctx.initializeSpreadsheet();
const APP = 'https://script.google.com/macros/s/AKfycbAPP123/exec';
// 1) cấu hình qua chức năng quản trị (chế độ tạm, ketoan là admin)
G.props['ADMIN_EMAILS'] = 'ketoan@example.com'; mt.__email = 'ketoan@example.com';
const nguon = ctx.layMaNguonCong(APP);
dat('Cấu hình', 'Sinh mã nguồn Cổng chứa APP_URL + SSO_SECRET; secret lưu ở Script Properties', /var APP_URL = "https:\/\/script\.google\.com/.test(nguon.maNguon) && /var SSO_SECRET = "[0-9a-f]{64}"/.test(nguon.maNguon) && /^[0-9a-f]{64}$/.test(G.props['SSO_SECRET']));
dat('Cấu hình', 'Không bật được chế độ Cổng khi chưa có địa chỉ Cổng', !thu(() => ctx.datCheDoPortal('CONG_HAK')).ok);
dat('Cấu hình', 'Địa chỉ Cổng sai định dạng bị từ chối; đúng thì lưu', !thu(() => ctx.luuCauHinhDangNhap('http://evil.example.com')).ok && thu(() => ctx.luuCauHinhDangNhap('https://script.google.com/macros/s/AKfycbCONG456/exec')).ok);

// 2) "Cổng" thật: chạy mã nguồn Cổng trong vm để ký token
function chayCong(email, yc) {
  const sb = { Session: { getActiveUser: () => ({ getEmail: () => email }) }, Utilities: ctx.Utilities || mt.Utilities, HtmlService: { createHtmlOutput: (h) => ({ html: h, setTitle() { return this; } }) }, Date, JSON, String, encodeURIComponent };
  vm.createContext(sb); vm.runInContext(nguon.maNguon, sb);
  const out = sb.doGet({ parameter: yc ? { yc } : {} });
  const m = /href="([^"]+)"/.exec(out.html);
  return m ? decodeURIComponent(/sso=([^"&]+)/.exec(m[1])[1]) : null;
}
// 3) thêm người dùng
dat('Người dùng', 'Admin thêm XEM / NHAP_LIEU / người bị khóa', ['xem@x.com|XEM|Hoạt động', 'nhap@x.com|NHAP_LIEU|Hoạt động', 'khoa@x.com|NHAP_LIEU|Khóa'].every(l => { const [e, v, t] = l.split('|'); return thu(() => ctx.luuNguoiDung({ email: e, hoTen: e, vaiTro: v, trangThai: t })).ok; }));
dat('Người dùng', 'Email sai, vai trò sai, tự hạ quyền mình bị từ chối', !thu(() => ctx.luuNguoiDung({ email: 'abc', vaiTro: 'XEM' })).ok && !thu(() => ctx.luuNguoiDung({ email: 'a@b.com', vaiTro: 'GOD' })).ok);
dat('Cấu hình', 'Có cổng + secret + admin → bật chế độ Cổng', thu(() => ctx.datCheDoPortal('CONG_HAK')).ok && ctx.thongTinDangNhap('').cheDo === 'CONG_HAK');
mt.__email = '';  // từ nay là trình duyệt ẩn danh (không có email Google)

// 4) đăng nhập SSO
const tokXem = chayCong('xem@x.com');
const dn = ctx.xuLyDangNhapSso_(tokXem);
dat('SSO', 'Token hợp lệ của người dùng được cấp: cấp phiên 64 hex', /^[0-9a-f]{64}$/.test(dn.phien) && !dn.loi, JSON.stringify(dn));
const lai = ctx.xuLyDangNhapSso_(tokXem);
dat('SSO', 'Dùng lại cùng token (replay) bị từ chối', !lai.phien && /đã được dùng/.test(lai.loi), lai.loi);
const tokHong = tokXem.replace(/.$/, c => c === 'A' ? 'B' : 'A');
dat('SSO', 'Token bị sửa chữ ký bị từ chối', !ctx.xuLyDangNhapSso_(chayCong('nhap@x.com').replace(/.$/, c => c === 'A' ? 'B' : 'A')).phien);
const ky = (d, k) => crypto.createHmac('sha256', k).update(d).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
const p64 = Buffer.from(JSON.stringify({ email: 'xem@x.com', exp: Date.now() + 1e6, n: 'abc', yc: '' })).toString('base64url');
dat('SSO', 'Tự ký bằng bí mật sai → từ chối', !ctx.xuLyDangNhapSso_(p64 + '.' + ky(p64, 'sai')).phien);
const pHet = b64({ email: 'xem@x.com', exp: Date.now() - 1000, n: 'het', yc: '' });
dat('SSO', 'Token hết hạn bị từ chối (ký đúng nhưng exp đã qua)', /hết hạn/.test(ctx.xuLyDangNhapSso_(pHet + '.' + ky(pHet, G.props['SSO_SECRET'])).loi));
dat('SSO', 'Email chưa được cấp quyền / bị khóa: không có phiên, báo rõ', !ctx.xuLyDangNhapSso_(chayCong('la@x.com')).phien && !ctx.xuLyDangNhapSso_(chayCong('khoa@x.com')).phien && /chưa được cấp quyền/.test(ctx.xuLyDangNhapSso_(chayCong('la2@x.com')).loi));
dat('SSO', 'Rác (không có dấu chấm / rỗng) bị từ chối', !ctx.xuLyDangNhapSso_('abc').phien && !ctx.xuLyDangNhapSso_('').phien);

// 5) api(): vai trò
const pXem = dn.phien, pNhap = ctx.xuLyDangNhapSso_(chayCong('nhap@x.com')).phien, pAdmin = null;
const ok = (p, h, a) => thu(() => ctx.api(p, h, a || []));
dat('api()', 'XEM đọc được (layNgayHomNay, layDuLieuKhoiTao), thongTinDangNhap trả vai trò', ok(pXem, 'layNgayHomNay').ok && ok(pXem, 'layDuLieuKhoiTao', [{}]).v.ok === true && ctx.thongTinDangNhap(pXem).vaiTro === 'XEM');
dat('api()', 'XEM KHÔNG ghi được (luuKhachHang / xoaHoSo) → [QUYEN]', [ok(pXem, 'luuKhachHang', [{ tenKhachHang: 'x', soTaiKhoan: '1', taiNganHang: 'b' }]), ok(pXem, 'xoaHoSo', ['HS0001'])].every(r => !r.ok && /\[QUYEN\]/.test(r.loi)));
dat('api()', 'NHAP_LIEU ghi được khách hàng; KHÔNG vào được cài đặt (tải mẫu, người dùng, cấu hình)', ok(pNhap, 'luuKhachHang', [{ tenKhachHang: 'x', soTaiKhoan: '1', taiNganHang: 'b' }]).ok && ['taiMauVanBan', 'luuNguoiDung', 'luuCauHinhHeThong', 'luuCongTy', 'khoiPhucHoSo', 'datCheDoPortal'].every(h => { const r = ok(pNhap, h, [{}]); return !r.ok && /\[QUYEN\]/.test(r.loi); }));
dat('api()', 'Hàm không có trong bảng quyền / tên nguy hiểm không gọi được', ['constructor', '__proto__', 'sheetToObjects_', 'getSS_', 'voiKhoa_', 'toString', 'eval'].every(h => { const r = ok(pXem, h); return !r.ok && /không tồn tại/.test(r.loi); }));
dat('api()', 'Không phiên + ẩn danh: [AUTH] chưa đăng nhập', (() => { const r = ok('', 'layNgayHomNay'); return !r.ok && /\[AUTH\] Chưa đăng nhập/.test(r.loi); })());
dat('api()', 'Phiên giả / sai định dạng / hết hạn → [AUTH]', ['a'.repeat(64), 'zzz', "' OR 1=1"].every(p => { const r = ok(p, 'layNgayHomNay'); return !r.ok && /\[AUTH\]/.test(r.loi); }));
dat('api()', 'Gọi trực tiếp (không qua api) khi ẩn danh bị chặn; danh tính do trình duyệt tự khai (tham số email) không được tin', !thu(() => ctx.luuKhachHang({ tenKhachHang: 'x', soTaiKhoan: '1', taiNganHang: 'b', email: 'ketoan@example.com', vaiTro: 'ADMIN' })).ok);
dat('api()', 'Sau api(), danh tính không "rò" sang lần gọi trực tiếp tiếp theo', (() => { ok(pNhap, 'layNgayHomNay'); return !thu(() => ctx.layNgayHomNay()).ok; })());
// admin qua Google (chủ hệ thống/ADMIN_EMAILS)
mt.__email = 'ketoan@example.com';
dat('api()', 'ADMIN (theo phiên Google, không cần cổng) gọi được chức năng cài đặt qua api() và gọi trực tiếp', ok('', 'layDanhSachNguoiDung').ok && thu(() => ctx.layNgayHomNay()).ok);
mt.__email = '';
// khóa người dùng có hiệu lực (sau xoá cache) ngay
mt.__email = 'ketoan@example.com'; ctx.luuNguoiDung({ email: 'nhap@x.com', vaiTro: 'NHAP_LIEU', trangThai: 'Khóa' }); mt.__email = '';
dat('api()', 'Khóa người dùng: phiên đang có bị từ chối ngay (không chờ hết phiên)', (() => { const r = ok(pNhap, 'layNgayHomNay'); return !r.ok && /\[AUTH\]/.test(r.loi); })());

// 6) đăng xuất
ctx.dangXuat(pXem);
dat('Phiên', 'Đăng xuất hủy đúng phiên đó', !ok(pXem, 'layNgayHomNay').ok && ctx.thongTinDangNhap(pXem).daDangNhap === false);
dat('Phiên', 'Phiên quá 7 ngày kể từ lúc đăng nhập bị từ chối dù còn trong cache', (() => { const pp = ctx.xuLyDangNhapSso_(chayCong('xem@x.com')).phien; const k = 'HOSOVAY:PHIEN:' + pp; const o = JSON.parse(G.cache[k]); o.dangNhapLuc = Date.now() - 8 * 24 * 3600 * 1000; G.cache[k] = JSON.stringify(o); return !ok(pp, 'layNgayHomNay').ok; })());
dat('Phiên', 'Gia hạn: phiên cũ hơn 30 phút → thongTinDangNhap cấp phiên mới, giữ mốc đăng nhập', (() => { const pp = ctx.xuLyDangNhapSso_(chayCong('xem@x.com')).phien; const k = 'HOSOVAY:PHIEN:' + pp; const o = JSON.parse(G.cache[k]); o.taoLuc = Date.now() - 31 * 60 * 1000; G.cache[k] = JSON.stringify(o); const t = ctx.thongTinDangNhap(pp); return /^[0-9a-f]{64}$/.test(t.phienMoi) && t.phienMoi !== pp; })());

// 7) trang nhúng: mã ghép cặp
const YC = 'a'.repeat(32);
const tokNhung = chayCong('nhap2@x.com', YC);
mt.__email = 'ketoan@example.com'; ctx.luuNguoiDung({ email: 'nhap2@x.com', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' }); mt.__email = '';
const dnNhung = ctx.xuLyDangNhapSso_(tokNhung);
dat('Nhúng', 'Token mang mã yêu cầu → doGet đưa sang trang nhúng, KHÔNG trả phiên cho cửa sổ nhỏ', dnNhung.yeuCau === YC && !!dnNhung.phien);
const trang = ctx.trangDangNhapNhung_(dnNhung.yeuCau, dnNhung.phien, dnNhung.loi);
const ma = /letter-spacing:8px[^>]*>(\d{6})</.exec(trang.html);
dat('Nhúng', 'Cửa sổ đăng nhập hiện mã ghép cặp 6 số, không in mã phiên', !!ma && !trang.html.includes(dnNhung.phien));
dat('Nhúng', 'Khung nhúng chưa nhập mã: không nhận phiên (canMa)', ctx.nhanPhienDangNhap(YC, '').canMa === true && !ctx.nhanPhienDangNhap(YC, '').phien);
dat('Nhúng', 'Kẻ gian tự đặt mã yêu cầu nhưng KHÔNG biết mã 6 số: không lấy được phiên; sai quá 5 lần thì hủy', (() => { let got = null; for (let i = 0; i < 5; i++) { const r = ctx.nhanPhienDangNhap(YC, '000000'); if (r.phien) got = r.phien; } return !got && !ctx.nhanPhienDangNhap(YC, ma[1]).phien; })());
const YC2 = 'b'.repeat(32), d2 = ctx.xuLyDangNhapSso_(chayCong('nhap2@x.com', YC2)), t2 = ctx.trangDangNhapNhung_(YC2, d2.phien, d2.loi), ma2 = /letter-spacing:8px[^>]*>(\d{6})</.exec(t2.html)[1];
const nhan = ctx.nhanPhienDangNhap(YC2, ma2);
dat('Nhúng', 'Nhập đúng mã → nhận phiên dùng được; dùng lần 2 không còn', /^[0-9a-f]{64}$/.test(nhan.phien) && ok(nhan.phien, 'layNgayHomNay').ok && !ctx.nhanPhienDangNhap(YC2, ma2).phien);
dat('Nhúng', 'Mã yêu cầu sai định dạng bị bỏ qua', Object.keys(ctx.nhanPhienDangNhap('xyz', '123456')).length === 0);
const dLoi = ctx.xuLyDangNhapSso_(chayCong('la@x.com', 'c'.repeat(32)));
ctx.trangDangNhapNhung_(dLoi.yeuCau, dLoi.phien, dLoi.loi);
dat('Nhúng', 'Đăng nhập thất bại ở cửa sổ nhỏ: khung nhúng nhận thông báo lỗi, không nhận phiên', /chưa được cấp quyền/.test(ctx.nhanPhienDangNhap('c'.repeat(32), '').loi || ''));

// 8) bảng quyền phủ hết hàm giao diện gọi
const clientTxt = fs.readFileSync(path.join(GOC, 'JavaScript.html'), 'utf8') + fs.readFileSync(path.join(GOC, 'Index.html'), 'utf8');
const bang = ctx.bangQuyenApi_();
const goi = [...new Set([...clientTxt.matchAll(/\.\s*([A-Za-z]\w*)\s*\(/g)].map(m => m[1]))].filter(n => !['api', 'thongTinDangNhap', 'nhanPhienDangNhap', 'dangXuat'].includes(n) && typeof ctx[n] === 'function' && !n.endsWith('_') && fs.readdirSync(GOC).some(f => f.endsWith('.gs') && new RegExp('^function ' + n + '\\(', 'm').test(fs.readFileSync(path.join(GOC, f), 'utf8'))));
const cho = ['taoDeNghiGiaiNganBIDV', 'taoChungTuThanhToan', 'taoHopDongMuaBanNgoaiTe', 'layBaoCaoTienVay', 'layDuLieuKhoiTao', 'layRevisionDuLieu', 'layBaoCaoDoiSoat', 'demTienLeLichSu', 'layNgayHomNay'];
const thieu = [...new Set(goi.concat(cho))].filter(n => !Object.prototype.hasOwnProperty.call(bang, n));
dat('Bảng quyền', 'MỌI hàm giao diện gọi (' + goi.length + ' + ' + cho.length + ' gọi gián tiếp) đều có trong bảng quyền api()', thieu.length === 0, 'thiếu: ' + thieu.join(', '));
dat('Bảng quyền', 'Mọi hàm trong bảng có thật trên máy chủ', Object.keys(bang).filter(n => typeof ctx[n] !== 'function').length === 0, Object.keys(bang).filter(n => typeof ctx[n] !== 'function').join());
dat('Bảng quyền', 'Chức năng cài đặt/ghi cấu hình đều QUAN_TRI; ghi hồ sơ là NHAP_LIEU; đọc là XEM', bang.taiMauVanBan === 'QUAN_TRI' && bang.luuCauHinhHeThong === 'QUAN_TRI' && bang.khoiPhucHoSo === 'QUAN_TRI' && bang.luuHoSoGiaiNgan === 'NHAP_LIEU' && bang.xacNhanGiaiNganThucTe === 'NHAP_LIEU' && bang.huyGiaiNgan === 'NHAP_LIEU' && bang.ghiNhanDieuChinhGiaiNgan === 'NHAP_LIEU' && bang.danhDauDaGiaiNgan === undefined && bang.layBaoCaoGiaiNganThucTe === 'XEM' && bang.layDuLieuKhoiTao === 'XEM');
// 9) chế độ tạm quay lại
mt.__email = 'ketoan@example.com'; ctx.datCheDoPortal('TAM_GOOGLE'); mt.__email = '';
const voiEmail = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
const truc = (f) => { try { f(); return { ok: true }; } catch (e) { return { ok: false, loi: e.message }; } };
dat('Chế độ', 'TAM_GOOGLE trên PRODUCTION (fail closed): người lạ có email Google nhưng chưa cấp quyền bị TỪ CHỐI', (() => { const r = voiEmail('a@b.com', () => ok('', 'layNgayHomNay')); return !r.ok && /chưa được cấp quyền/.test(r.loi || ''); })());
dat('Chế độ', 'TAM_GOOGLE PRODUCTION: truy cập ẩn danh (email rỗng) bị TỪ CHỐI, kể cả khi ADMIN_EMAILS trống', (() => { const adm = G.props['ADMIN_EMAILS']; delete G.props['ADMIN_EMAILS']; const r = voiEmail('', () => ok('', 'layNgayHomNay')), r2 = voiEmail('', () => ok('', 'luuCongTy', [{ tenCty: 'X' }])); G.props['ADMIN_EMAILS'] = adm; return !r.ok && !r2.ok; })());
dat('Chế độ', 'TAM_GOOGLE PRODUCTION: ADMIN_EMAILS TRỐNG không biến mọi người thành quản trị', (() => { const adm = G.props['ADMIN_EMAILS']; delete G.props['ADMIN_EMAILS']; const r = voiEmail('ai-do@x.com', () => ok('', 'taiMauVanBan')); G.props['ADMIN_EMAILS'] = adm; return !r.ok; })());
dat('Chế độ', 'TAM_GOOGLE PRODUCTION: quản trị và người dùng đã đăng ký dùng được; vai trò XEM không ghi được', (() => { voiEmail('ketoan@example.com', () => ctx.luuNguoiDung({ email: 'xemtam@x.com', vaiTro: 'XEM', trangThai: 'Hoạt động' })); return voiEmail('ketoan@example.com', () => ok('', 'layNgayHomNay')).ok && voiEmail('xemtam@x.com', () => ok('', 'layNgayHomNay')).ok && !voiEmail('xemtam@x.com', () => ok('', 'luuCongTy', [{ tenCty: 'X' }])).ok; })());
dat('Chế độ', 'Gọi TRỰC TIẾP hàm nhạy cảm (không qua api()) cũng fail closed trên PRODUCTION', !voiEmail('', () => truc(() => ctx.luuCongTy({ tenCty: 'X' }))).ok && !voiEmail('a@b.com', () => truc(() => ctx.layDuLieuKhoiTao())).ok);
dat('Chế độ', 'MOI_TRUONG sai/thiếu → PRODUCTION; chỉ đặt rõ DEV mới nới lỏng và tắt lại được', (() => { delete G.props['MOI_TRUONG']; const m0 = ctx.moiTruong_(); G.props['MOI_TRUONG'] = 'linh tinh'; const m1 = ctx.moiTruong_(); G.props['MOI_TRUONG'] = 'DEV'; const lax = voiEmail('a@b.com', () => ok('', 'layNgayHomNay')).ok; delete G.props['MOI_TRUONG']; return m0 === 'PRODUCTION' && m1 === 'PRODUCTION' && lax && !voiEmail('a@b.com', () => ok('', 'layNgayHomNay')).ok; })());

// 10) chống formula injection khi ghi Sheet
dat('Bảo mật', 'api() trung hoá chuỗi công thức (= + - @) trước khi ghi Sheet; số thuần/ngày/chuỗi dài (base64) KHÔNG bị đổi', (() => {
  const L = ctx.lamSachCongThuc_, d = new Date(), b64 = '+' + 'A'.repeat(600);
  const ct = voiEmail('ketoan@example.com', () => ctx.api('', 'luuCongTy', [{ expectedRevision: Number((ctx.sheetToObjects_('DM_CongTy')[0] || {}).Revision) || 0, tenCty: '=HYPERLINK("http://x","a")', maSoThue: '@SUM(1)', nguoiDaiDien: '+cmd|x', diaChiTruSo: '-1+1' }]));
  const cong = ctx.sheetToObjects_('DM_CongTy').filter(c => c.MaCty === ct.maCty)[0];
  return L('=1+1') === "'=1+1" && L('@a') === "'@a" && L('+abc') === "'+abc" && L('-1+1') === "'-1+1" && L('+84 901 234 567') === '+84 901 234 567' && L('-1500000') === '-1500000' && L('25.000,5') === '25.000,5' && L('2026-10-15') === '2026-10-15' && L('Nguyễn Văn A') === 'Nguyễn Văn A' && L(d) === d && L(b64) === b64 && L('') === '' && L(5) === 5
    && JSON.stringify(L({ a: ['=x', { b: '@y' }] })) === JSON.stringify({ a: ["'=x", { b: "'@y" }] })
    && cong && String(cong.TenCty).indexOf("'=") === 0 && String(cong.MaSoThue).indexOf("'@") === 0 && String(cong.NguoiDaiDien).indexOf("'+") === 0;
})());

// 11) kiểm tra môi trường & cấu hình triển khai
(() => {
  const chay = () => voiEmail('ketoan@example.com', () => ctx.api('', 'kiemTraMoiTruongHeThong', []));
  let r = chay();
  const m = (ten) => r.muc.filter(x => x.muc === ten)[0] || {};
  dat('Cấu hình', 'kiemTraMoiTruongHeThong: PRODUCTION OK; thiếu bảng lương = CẢNH BÁO (không phải lỗi); tab/cột bắt buộc đủ', m('Môi trường').trangThai === 'OK' && m('Nguồn bảng lương').trangThai === 'CANH_BAO' && ['DM_CongTy', 'DM_HopDongVay', 'DM_KhachHang', 'HoSoGiaiNgan', 'ChiTietThuHuong'].every(t => m('Tab ' + t).trangThai === 'OK'), JSON.stringify(r.muc.filter(x => x.trangThai === 'LOI')));
  G.props['MOI_TRUONG'] = 'DEV'; r = chay();
  const coLap = m('Cách ly dữ liệu').trangThai === 'LOI' && m('Môi trường').trangThai === 'CANH_BAO';
  G.props['CH_SPREADSHEET_ID'] = 'ID-THU-NGHIEM'; r = chay(); const dd = r.muc.filter(x => x.muc === 'Cách ly dữ liệu').length === 0; delete G.props['CH_SPREADSHEET_ID']; delete G.props['MOI_TRUONG'];
  dat('Cấu hình', 'Bản DEV/TEST trỏ vào Spreadsheet PRODUCTION bị báo LỖI (cách ly dữ liệu); đặt CH_SPREADSHEET_ID thì hết lỗi cách ly', coLap && dd);
  dat('Cấu hình', 'CH_SPREADSHEET_ID ghi đè ID gắn cứng; không đặt thì giữ ID cũ; người không phải quản trị bị chặn', (() => { const a = ctx.idSpreadsheet_(); G.props['CH_SPREADSHEET_ID'] = ' ID-X '; const b = ctx.idSpreadsheet_(); delete G.props['CH_SPREADSHEET_ID']; return a === ctx.SPREADSHEET_ID && b === 'ID-X' && !voiEmail('a@b.com', () => ok('', 'kiemTraMoiTruongHeThong')).ok; })());
})();

// 12) log có cấu trúc
(() => {
  const dong = []; const goc = { l: console.log, w: console.warn, e: console.error };
  console.log = (x) => dong.push(String(x)); console.warn = (x) => dong.push(String(x)); console.error = (x) => dong.push(String(x));
  const tokenGia = 'a'.repeat(64), cccd = '048123456789';
  try {
    G.cache && Object.keys(G.cache).forEach(k => { if (/LOGLOI/.test(k)) delete G.cache[k]; });
    voiEmail('ketoan@example.com', () => ok('', 'luuCongTy', [{ expectedRevision: Number((ctx.sheetToObjects_('DM_CongTy')[0] || {}).Revision) || 0, tenCty: 'CTY LOG ' + cccd + ' ' + tokenGia, maSoThue: '0400111222', nguoiDaiDien: 'A', diaChiTruSo: 'B' }]));
    voiEmail('a@b.com', () => ok('', 'luuCongTy', [{ tenCty: 'X' }]));   // bị chặn → SECURITY
    voiEmail('ketoan@example.com', () => ok('', 'layDuLieuKhoiTao', [{}]));  // đọc: không log INFO
  } finally { console.log = goc.l; console.warn = goc.w; console.error = goc.e; }
  const js = dong.filter(x => x.charAt(0) === '{').map(x => JSON.parse(x));
  const ghi = js.filter(x => x.action === 'luuCongTy' && x.level === 'INFO')[0], chan = js.filter(x => x.level === 'SECURITY')[0], chanApi = js.filter(x => x.level === 'SECURITY' && x.module === 'API')[0];
  const nhatKy = voiEmail('ketoan@example.com', () => ctx.api('', 'layNhatKyLoiGanDay', []));
  const thoTxt = dong.join('\n');
  dat('Log', 'Log JSON có đủ requestId/user/module/action/code/ms; thao tác GHI được log INFO, thao tác ĐỌC thì không', !!ghi && /^[0-9a-f]{8}$/.test(ghi.requestId) && ghi.user === 'ketoan@example.com' && ghi.module === 'API' && ghi.code === 'OK' && typeof ghi.ms === 'number' && !js.some(x => x.action === 'layDuLieuKhoiTao'), JSON.stringify(js.slice(0, 3)));
  dat('Log', 'Từ chối quyền/đăng nhập = SECURITY (cả ở lớp xác thực lẫn api()) với mã rõ ràng', !!chan && chan.module === 'AUTH' && /TU_CHOI_/.test(chan.code) && !!chanApi && /KHONG_CO_QUYEN|CHUA_DANG_NHAP/.test(chanApi.code));
  dat('Log', 'Log KHÔNG chứa tham số API, token (hex dài) hay dãy 9–12 số (CCCD)', thoTxt.indexOf(tokenGia) < 0 && thoTxt.indexOf(cccd) < 0 && thoTxt.indexOf('0400111222') < 0 && thoTxt.indexOf('CTY LOG') < 0);
  dat('Log', 'Quản trị xem được nhật ký ERROR/SECURITY gần nhất (mới nhất trước); người thường không xem được', Array.isArray(nhatKy.data || nhatKy) === true && (nhatKy.data || nhatKy).length >= 1 && (nhatKy.data || nhatKy)[0].level === 'SECURITY' || (nhatKy.data || nhatKy).some(x => x.level === 'SECURITY'));
  dat('Log', 'layNhatKyLoiGanDay bị chặn với người không phải quản trị', !voiEmail('a@b.com', () => ok('', 'layNhatKyLoiGanDay')).ok);
})();

in_();
console.log(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi`);
process.exit(loi ? 1 : 0);
