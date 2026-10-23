/* KIỂM THỬ BẢO MẬT TỰ ĐỘNG: (1) mọi hàm công khai (không đuôi "_") phải nằm trong bảng quyền api() hoặc danh sách ngoại lệ có chủ đích;
 * (2) MỌI API trong bảng quyền phải TỪ CHỐI khi gọi TRỰC TIẾP (google.script.run bỏ qua api()) bởi người ẩn danh / chưa cấp quyền / chỉ-xem (ghi),
 * ở cả PRODUCTION-TAM_GOOGLE và CONG_HAK; (3) hàm nhạy cảm không trong bảng không bị lộ ra.
 * node kiem_thu/chay_bao_mat.js [thư_mục_ra]      LƯU Ý: giả lập Apps Script, không phải môi trường Google thật. */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..'), RA = path.resolve(process.argv[2] || '/tmp/hosovay_bao_mat'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const TI = require('./gia_lap_apps_script'); const { ctx, mt } = TI(GOC, path.join(RA, '_tam')); const G = mt.__;
const _l = console.log; console.warn = () => {}; console.error = () => {}; console.log = () => {};
let loi = 0; const kq = [];
const dat = (nhom, ten, ok, chiTiet) => { kq.push({ nhom, ten, ok: !!ok }); if (!ok) loi++; _l(`  [${ok ? 'ĐẠT' : 'LỖI'}] ${nhom}: ${ten}${ok ? '' : '  → ' + (chiTiet || '')}`); };
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: String(e.message || e) }; } };

ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx);
voi('ketoan@example.com', () => ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' }));
const bang = ctx.bangQuyenApi_();

// ---- 1. Hàm công khai ngoài bảng quyền
const KHONG_PHAI_API = new Set(['api', 'raSoatTienLeLichSu', 'initializeSpreadsheet', /* tự kiểm quyền Quản trị */ /* quản trị, tự kiểm quyền */ 'doGet', 'onOpen', 'include', 'showApp', 'cauHinhQuanTriMenu', 'raSoatTienLeLichSuMenu', 'suaLinkChungTuCuMenu', 'kiemTraMoiTruongMenu', 'lamMoiBaoCaoNhapMenu',
  'thongTinDangNhap', 'nhanPhienDangNhap', 'dangXuat', // điểm vào đăng nhập (tự kiểm phiên/mã ghép cặp)
  'saoLuuHangTuan', // đích của trình kích hoạt theo giờ: có chặn tần suất (xem Backup.gs)
  'soThanhChuVN',
  'guiNhacNoHangNgay', // đích của trình kích hoạt hằng ngày (NHACNO.gs): chỉ gửi tới email quản trị đã khai báo, tối đa 1 lần/ngày, không nhận tham số
  'chuanBiTyGiaGoogle', // đích của trình kích hoạt 8h: chỉ ghi công thức GOOGLEFINANCE vào sheet phụ, không nhận tham số, không đọc dữ liệu
  'tuDongCapNhatTyGiaVCB', // đích của trình kích hoạt hằng ngày: không nhận tham số, chỉ đọc ô GOOGLEFINANCE ở sheet phụ rồi ghi tỷ giá của hôm nay (không ghi đè tỷ giá nhập tay)
  'taoLichTuDongTyGia', // quản trị tự kiểm quyền; chỉ tạo lịch trình kích hoạt
  'luuTruNamTuDong', // đích của trình kích hoạt hằng ngày: không tham số; chỉ chạy trong 15 ngày đầu tháng 1, một lần cho mỗi năm, tối thiểu 10 phút giữa hai lần thử
  'createDemoSheet']); // hàm demo tạo sheet thử nghiệm UI/cha-con, chỉ dùng trong môi trường phát triển
const cong = []; fs.readdirSync(GOC).filter(f => f.endsWith('.gs')).forEach(f => { for (const m of fs.readFileSync(path.join(GOC, f), 'utf8').matchAll(/^function ([A-Za-z]\w*)\(/gm)) if (!m[1].endsWith('_')) cong.push(m[1]); });
const ngoai = cong.filter(n => !Object.prototype.hasOwnProperty.call(bang, n) && !KHONG_PHAI_API.has(n));
dat('Bề mặt công khai', `${cong.length} hàm công khai: mọi hàm hoặc nằm trong bảng quyền api() hoặc là ngoại lệ có chủ đích (không còn hàm dữ liệu "mồ côi")`, ngoai.length === 0, 'ngoài bảng: ' + ngoai.join(', '));

// ---- 2. Gọi trực tiếp (bỏ qua api()) bởi người không hợp lệ
const NGAN = ['luuCauHinhHeThong', 'datCheDoPortal', 'luuCauHinhDangNhap']; // đổi chế độ đăng nhập: không chạy thử trong vòng lặp (đổi trạng thái toàn cục)
const thuTrucTiep = (ten, args) => thu(() => ctx[ten].apply(null, args));
const ten = Object.keys(bang).filter(n => !NGAN.includes(n));
const khongChan = (email, quyenToiThieu) => ten.filter(n => (quyenToiThieu ? bang[n] !== 'XEM' : true)).filter(n => { const r = voi(email, () => thuTrucTiep(n, [])); return r.ok || !/\[AUTH\]|\[QUYEN\]|quyền|chưa được cấp|Chưa đăng nhập/i.test(r.loi || ''); });

const anDanh = khongChan('', false);
dat('Gọi trực tiếp', `PRODUCTION (TAM_GOOGLE): người ẩn danh bị TỪ CHỐI ở ${ten.length}/${ten.length} API`, anDanh.length === 0, anDanh.join(', '));
const laMat = khongChan('la@example.com', false);
dat('Gọi trực tiếp', 'PRODUCTION: tài khoản Google chưa được cấp quyền bị TỪ CHỐI ở mọi API', laMat.length === 0, laMat.join(', '));
const xemGhi = khongChan('xem@example.com', true);
dat('Gọi trực tiếp', 'Vai trò XEM bị TỪ CHỐI ở mọi API ghi/quản trị (kể cả gọi trực tiếp không qua api())?', xemGhi.length === 0 || xemGhi.every(n => bang[n] === 'NHAP_LIEU'), 'API ghi vẫn chạy được với XEM: ' + xemGhi.join(', '));

G.props['PORTAL_CHE_DO'] = 'CONG_HAK';
const anDanhCong = khongChan('', false), laCong = khongChan('la@example.com', false);
dat('Gọi trực tiếp', 'CONG_HAK: ẩn danh và tài khoản lạ bị TỪ CHỐI ở mọi API khi gọi trực tiếp', anDanhCong.length === 0 && laCong.length === 0, anDanhCong.concat(laCong).join(', '));
delete G.props['PORTAL_CHE_DO'];

// ---- 3. api() chặn hàm ngoài bảng quyền & hàm nội bộ
const apiNgoai = ['layHoSoTheoMa_', 'layHoSoTheoMa', 'sheetToObjects_', 'initializeSpreadsheet', 'saoLuuHangTuan', 'eval', 'constructor', '__proto__', 'ghiLog_'].map(n => voi('ketoan@example.com', () => thu(() => ctx.api('', n, []))));
dat('api()', 'api() KHÔNG chạy hàm ngoài bảng quyền, hàm nội bộ (đuôi "_") hay tên đặc biệt (eval/constructor/__proto__)', apiNgoai.every(r => !r.ok && /không tồn tại/.test(r.loi)), JSON.stringify(apiNgoai.map(r => r.loi)));

// ---- 4. Hàm hạ tầng nhạy cảm
dat('Hạ tầng', 'initializeSpreadsheet (đổi cấu trúc Sheet) và saoLuuHangTuan (tạo bản sao Drive) KHÔNG chạy được bởi người ẩn danh / lạ', (() => {
  const a = voi('', () => thu(() => ctx.initializeSpreadsheet())), b = voi('la@example.com', () => thu(() => ctx.initializeSpreadsheet()));
  return !a.ok && !b.ok;
})());
dat('Hạ tầng', 'saoLuuHangTuan chặn tần suất: lần gọi liền sau KHÔNG tạo thêm bản sao (người lạ gọi trực tiếp không làm đầy Drive)', (() => {
  delete G.props['BACKUP_LAN_CUOI_MS']; delete G.props['BACKUP_LAN_THU_MS'];
  thu(() => ctx.saoLuuHangTuan()); const daDat = !!G.props['BACKUP_LAN_CUOI_MS'];
  const r2 = thu(() => ctx.saoLuuHangTuan());
  G.props['BACKUP_LAN_CUOI_MS'] = String(Date.now() - 21 * 3600 * 1000); G.props['BACKUP_LAN_THU_MS'] = String(Date.now() - 11 * 60000); const r3 = thu(() => ctx.saoLuuHangTuan());
  return daDat && r2.ok && r2.v && r2.v.boQua === true && !(r3.ok && r3.v && r3.v.boQua);
})());

_l(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi`);
process.exit(loi ? 1 : 0);
