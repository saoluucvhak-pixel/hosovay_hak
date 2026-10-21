/* Giao diện QUẢN LÝ VAY trên Chromium thật (Playwright). google.script.run được thay bằng bộ giả lập trả dữ liệu mẫu — KHÔNG gọi Google thật.
 * node kiem_thu/chay_quan_ly_vay_ui.js [thư_mục_ảnh] */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || 'kiem_thu/ket_qua_quan_ly_vay_ui'); fs.mkdirSync(out, { recursive: true });
const inc = (n) => fs.readFileSync(path.join(root, n + '.html'), 'utf8');
const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '    /* QA cô lập: không khởi động đám mây. */');
let checks = 0, browser; const ok = (c, m) => { assert.ok(c, m); checks++; console.log('  [ĐẠT] ' + m); };
const DL = {
  layBangDieuHanh: { ngay: '2026-10-21', hanMuc: { tongHanMuc: 10000000, tongDaDung: 8500000, tongConLai: 1500000, soVuot: 0, top: [] }, phaiTra3Thang: { vnd: 1234567, usd: 250.5 }, quaHanTrongDuBao: {}, thangDauTien: {}, quaHan: { tong: 2, bac: [] },
    rangBuoc: { VI_PHAM: 1, SAP_VI_PHAM: 1 }, soTaiSanDangBaoDam: 2, tongGiaTriBaoDam: 50000000, tyGia: { tyGiaBan: 26000, ngay: '2026-10-21' },
    viecCanLam: [{ muc: 'cao', loai: 'QUA_HAN', maHoSo: 'HS-1', moTa: 'HS-1 quá hạn 35 ngày (31–60 ngày).' }, { muc: 'vua', loai: 'HAN_MUC', maHD: 'HD1', moTa: 'Hợp đồng HD-A đã dùng 85% hạn mức.' }, { muc: 'cao', loai: 'RANG_BUOC', maHD: 'HD1', moTa: '<img src=x onerror="window.__xss=1"> vi phạm' }] },
  layHanMucTinDung: { ngay: '2026-10-21', tongHanMuc: 20000000, tongDaDung: 17000000, tongConLai: 3000000, rows: [
    { maHD: 'HD1', soHopDong: '=cmd|calc', tenCty: 'Cty A', hanMuc: 10000000, daDung: 10500000, dangCho: 0, conLai: -500000, tyLe: 105, muc: 'vuot', soKhoan: 3, thieuTyGia: 0, giaTriBaoDam: 50000000, tyLeVayTrenTaiSan: 21 },
    { maHD: 'HD2', soHopDong: 'HD-B', tenCty: 'Cty B', hanMuc: 10000000, daDung: 6500000, dangCho: 1000000, conLai: 3500000, tyLe: 65, muc: 'ok', soKhoan: 1, thieuTyGia: 0, giaTriBaoDam: 0, tyLeVayTrenTaiSan: null },
    { maHD: 'HD3', soHopDong: 'HD-C', tenCty: 'Cty C', hanMuc: 0, daDung: 0, dangCho: 0, conLai: null, tyLe: 0, muc: 'chua_khai_bao', soKhoan: 1, thieuTyGia: 0, giaTriBaoDam: 0, tyLeVayTrenTaiSan: null }] },
  layDuBaoDongTien: (a) => { const n = a.soThang; const m = (i) => ({ thang: '2026-' + String(10 + i).padStart(2, '0'), VND: { goc: i === 0 ? 1000 : 0, lai: 200 }, USD: { goc: 0, lai: i === 1 ? 50 : 0 }, tongVND: i === 0 ? 1200 : 200, tongUSD: i === 1 ? 50 : 0, quyDoiVND: i === 1 ? [1000, 1500, 2000].map(x => x + 200) : [i === 0 ? 1200 : 200, i === 0 ? 1200 : 200, i === 0 ? 1200 : 200] });
    const z = { VND: { goc: 0, lai: 0 }, USD: { goc: 0, lai: 0 }, tongVND: 0, tongUSD: 0, quyDoiVND: [0, 0, 0] };
    return { ngay: '2026-10-21', soThang: n, kichBan: [-a.bienDoTyGia, 0, a.bienDoTyGia], tyGiaDungQuyDoi: { tyGiaBan: 26000, ngay: '2026-10-21' }, soKhoan: 4, boQua: [], quaHan: Object.assign({}, z, { VND: { goc: 500, lai: 20 }, tongVND: 520, quyDoiVND: [520, 520, 520] }),
      thang: Array.from({ length: n }, (_, i) => m(i)), sauKyDuBao: z, tong: Object.assign({}, z, { tongVND: 2000, tongUSD: 50, quyDoiVND: [2000, 2500, 3000] }), ghiChu: 'Lãi các kỳ tương lai tính trên dư nợ hiện tại.' }; },
  layPhanTichQuaHan: { ngay: '2026-10-21', tongQuaHan: 1, bac: [{ ma: 'B1_30', nhan: '1–30 ngày', soKhoan: 0, VND: { duNoGoc: 0, quaHanGoc: 0, quaHanLai: 0 }, USD: { duNoGoc: 0, quaHanGoc: 0, quaHanLai: 0 } }, { ma: 'B31_60', nhan: '31–60 ngày', soKhoan: 1, VND: { duNoGoc: 600000, quaHanGoc: 600000, quaHanLai: 11836 }, USD: { duNoGoc: 0, quaHanGoc: 0, quaHanLai: 0 } },
    { ma: 'HIEN_HANH', nhan: 'Chưa quá hạn', soKhoan: 3, VND: { duNoGoc: 5000000, quaHanGoc: 0, quaHanLai: 0 }, USD: { duNoGoc: 100, quaHanGoc: 0, quaHanLai: 0 } }],
    rows: [{ maHoSo: 'HS-1', soHopDong: 'HD-A', tenCty: 'Cty A', loaiTien: 'VND', duNoGoc: 600000, soNgayQuaHan: 35, bac: 'B31_60', nhanBac: '31–60 ngày', ngayQuaHanCuNhat: '2026-09-16', quaHanGoc: 600000, quaHanLai: 11836, laiPhatUocTinh: 4932 }] },
  layDieuKienRangBuoc: { rows: [{ maRB: 'RB-0001', maHD: 'HD1', soHopDong: 'HD-A', tenCty: 'Cty A', tenChiTieu: 'Doanh thu về BIDV', loai: 'THU_CONG', nhanLoai: 'Nhập tay theo kỳ', toanTu: '>=', nguong: 120, donVi: '%', giaTri: 118.5, ngayCapNhat: '2026-10-01', tuDong: false, trangThai: 'VI_PHAM', nhanTrangThai: 'Vi phạm' },
    { maRB: 'RB-0002', maHD: 'HD1', soHopDong: 'HD-A', tenCty: 'Cty A', tenChiTieu: 'Dư nợ / hạn mức', loai: 'TY_LE_HAN_MUC', nhanLoai: 'Tự tính', toanTu: '<=', nguong: 80, donVi: '%', giaTri: 105, ngayCapNhat: '2026-10-21', tuDong: true, trangThai: 'VI_PHAM', nhanTrangThai: 'Vi phạm' }], dem: { VI_PHAM: 2 } },
  layTaiSanBaoDam: { rows: [{ maTS: 'TS-0001', maHD: 'HD1', soHopDong: 'HD-A', loai: 'BDS', nhanLoai: 'Bất động sản', moTa: 'Nhà xưởng <b>x</b>', giaTri: 30000000, ngayHetHanBaoHiem: '2026-11-01', canhBaoBaoHiem: 'SAP_HET', soNgayBaoHiem: 11, trangThai: 'Đang bảo đảm' }], tongGiaTriDangBaoDam: 30000000, loaiTaiSan: { BDS: 'Bất động sản', DONG_SAN: 'Động sản' } },
  doiSoatSaoKe: { loaiTienMacDinh: 'VND', khoang: { tu: '2026-10-20', den: '2026-10-21' }, loiPhanTich: [], dem: { KHOP: 1, LECH_SO_TIEN: 1, KHONG_CO: 1 }, nhan: { KHOP: 'Khớp', LECH_SO_TIEN: 'Lệch số tiền', KHONG_CO: 'Không có trong hệ thống' },
    dong: [{ stt: 1, ngay: '2026-10-20', thamChieu: 'GN-1', noiDung: '<img src=x onerror="window.__xss2=1">', huong: 'VAO', soTien: 5000000, loaiTien: 'VND', ketQua: 'KHOP', nhanKetQua: 'Khớp', ungVien: { maHoSo: 'HS-1', ref: 'GN-1', ngay: '2026-10-20', soTien: 5000000, chenhLech: 0 }, soUngVien: 0 },
      { stt: 2, ngay: '2026-10-21', thamChieu: 'TT-9', noiDung: '', huong: 'RA', soTien: 19000, loaiTien: 'VND', ketQua: 'LECH_SO_TIEN', nhanKetQua: 'Lệch số tiền', ungVien: { maHoSo: 'HS-1', ref: 'TT-9', ngay: '2026-10-21', soTien: 20000, chenhLech: -1000 }, soUngVien: 0 },
      { stt: 3, ngay: '2026-10-21', thamChieu: 'X', noiDung: 'Phí', huong: 'RA', soTien: 11000, loaiTien: 'VND', ketQua: 'KHONG_CO', nhanKetQua: 'Không có trong hệ thống', ungVien: null, soUngVien: 0 }],
    thieuTrenSaoKe: [{ nguon: 'TRA_NO', maHoSo: 'HS-2', ref: 'TT-77', ngay: '2026-10-21', soTien: 300000, loaiTien: 'VND', huong: 'RA' }] },
  layDanhSachPheDuyet: { batBuoc: true, toiLaQuanTri: true, email: 'duyet@x.vn', soChoDuyet: 1, rows: [
    { maPheDuyet: 'PD-0002', maHoSo: 'HS-9', revisionGui: 3, revisionHienTai: 3, trangThai: 'Chờ duyệt', nguoiGui: 'lap@x.vn', thoiDiemGui: '2026-10-21T08:00:00Z', ghiChuGui: 'Nhờ duyệt', nguoiDuyet: '', lyDo: '', hopLe: false, daLoiThoi: false, toiLaNguoiGui: false, coTheDuyet: true },
    { maPheDuyet: 'PD-0001', maHoSo: 'HS-8', revisionGui: 2, revisionHienTai: 5, trangThai: 'Đã duyệt', nguoiGui: 'lap@x.vn', thoiDiemGui: '2026-10-20T08:00:00Z', ghiChuGui: '', nguoiDuyet: 'duyet@x.vn', lyDo: 'Đủ', hopLe: false, daLoiThoi: true, toiLaNguoiGui: false, coTheDuyet: false }] },
  layThietLapQuanLyVay: { CHAN_VUOT_HAN_MUC: '1', BAT_DUYET_HAI_CAP: '0', NGUONG_CB_HAN_MUC_1: '80', NGUONG_CB_HAN_MUC_2: '95', THU_TU_PHAN_BO: 'PHAT,LAI,GOC', TY_LE_LAI_QUA_HAN: '150', LAI_CHAM_TRA_NAM: '0', NHAC_EMAIL_BAT: '0', NHAC_EMAIL_NHAN: '', NHAC_CALENDAR_BAT: '1' },
  xemTruocNhacNo: { co: true, ngay: '2026-10-21', tieuDe: '[Hồ sơ vay] 21/10/2026: 1 khoản quá hạn', soMuc: 1, nhom: [{ ten: 'NỢ QUÁ HẠN (1 khoản)', dong: ['HS-1: kỳ cũ nhất quá hạn 35 ngày'] }], nguoiNhan: ['a@x.vn'], emailBat: false, calendarBat: true },
  layGoiYPhanBoTra: { ngayTra: '2026-10-21', soTien: 20000, loaiTien: 'VND', thuTu: ['PHAT', 'LAI', 'GOC'], phat: 4932, lai: 15068, goc: 0, thua: 0, conPhaiTra: { phat: 4932, lai: 29589, gocDenHan: 1000000, duNoGoc: 1000000, tong: 1034521 } },
  layTyGiaHienThi: { tyGiaBan: 26000, ngay: '2026-10-21', nguon: 'Vietcombank' },
  ghiNhanTraNoGop: { parts: [{ loai: 'PHAT' }, { loai: 'LAI' }], revision: 9, duNoGoc: 1000000 },
};
(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true, colorScheme: 'light' });
  await ctx.route('https://fonts.googleapis.com/**', r => r.abort()); await ctx.route('http://hak-qlv.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
  await ctx.addInitScript((DLs) => {
    window.__goi = []; window.__xss = 0; window.google = { script: { run: (function run() { return new Proxy({}, { get: (_, k) => (k === 'withSuccessHandler' || k === 'withFailureHandler') ? () => run() : () => {} }); })() } };
    window.__DL = DLs;
  }, JSON.parse(JSON.stringify(DL, (k, v) => typeof v === 'function' ? undefined : v)));
  const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.stack || e.message)); page.on('dialog', d => d.accept('Lý do thử'));
  await page.goto('http://hak-qlv.test/');
  // Thay hakRun_ bằng bộ giả lập trả dữ liệu mẫu (đồng bộ hoá theo tên hàm)
  await page.evaluate(() => {
    window.__goi = []; window.__loi = {};
    window.__dong = (ten) => { const d = window.__DL[ten]; return d; };
    window.hakRun_ = function () {
      let ok, fail, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler(f) { fail = f; return px; } };
      px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return (...args) => { window.__goi.push([ten, args]); setTimeout(() => { if (window.__loi[ten]) return fail && fail(new Error(window.__loi[ten])); const dl = window.__DL[ten]; const v = ten === 'layDuBaoDongTien' ? window.__duBao(args[0]) : (dl === undefined ? { ok: true, maPheDuyet: 'PD-0003', maRB: 'RB-9', maTS: 'TS-9', den: 'a@x.vn', soMuc: 1, tao: 1, go: 0, loi: 0, tong: 1, moTa: 'ok', giaTri: 1, revision: 1, hanMuc: { apDung: false } } : dl); ok && ok(JSON.parse(JSON.stringify(v))); }, 0); }; } });
      return px;
    };
  });
  await page.evaluate((src) => { window.__duBao = eval('(' + src + ')'); }, DL.layDuBaoDongTien.toString());
  const goi = () => page.evaluate(() => window.__goi.slice()); const xoaGoi = () => page.evaluate(() => { window.__goi = []; });
  const cho = (ms = 120) => page.waitForTimeout(ms);

  // ---- điều hướng + điều hành ----
  await page.click('#tabBtn-qlvay'); await cho(300);
  ok(await page.locator('#tab-qlvay').isVisible() && await page.locator('#pageTitle').textContent() === 'Quản lý vay', 'Mục “Quản lý vay” trên menu mở đúng màn hình, tiêu đề đúng');
  ok(await page.locator('#qv_kpi .qv-kpi').count() === 6, 'Bảng điều hành có 6 chỉ số');
  ok((await page.locator('#qv_kpi').innerText()).includes('1.500.000') && (await page.locator('#qv_kpi').innerText()).includes('1.234.567'), 'Chỉ số hiển thị hạn mức còn lại 1.500.000 và phải trả 3 tháng 1.234.567 (định dạng nghìn)');
  ok(await page.locator('#qv_todo li').count() === 3 && await page.evaluate(() => !window.__xss), 'Việc cần làm: 3 mục; HTML trong mô tả bị escape (không thực thi)');
  ok(await page.locator('#qv_dotQuaHan').isVisible(), 'Chấm đỏ số khoản quá hạn hiện trên tab “Nợ quá hạn”');
  await page.evaluate(() => { window.ttChonMa_ = (m) => { window.__mo = m; }; });
  await page.locator('#qv_todo li.qv-cao button').first().click(); await cho(500);
  ok(await page.locator('#tab-tattoan').isVisible() && await page.evaluate(() => window.__mo === 'HS-1'), 'Nút “Mở khoản vay” chuyển sang màn Tất toán và mở đúng hồ sơ');
  await page.click('#tabBtn-tongquan'); await cho(300); await xoaGoi();
  await page.evaluate(() => { AppDataStore.tongQuan = Object.assign(AppDataStore.tongQuan || {}, { quanLyVay: { hanMuc: { tongHanMuc: 10000000, tongDaDung: 8500000, tongConLai: 1500000, soVuot: 0 }, rangBuoc: { VI_PHAM: 1, SAP_VI_PHAM: 1 }, baoHiemCanChuY: 1 } }); renderTongQuan_(); }); await cho(200);
  ok((await page.locator('#tq_hmConLai').textContent()).includes('1.500.000') && (await page.locator('#tq_rbSo').textContent()) === '3', 'Tổng quan có thẻ hạn mức còn lại + ràng buộc/bảo hiểm cần chú ý (từ dữ liệu tổng quan)');
  ok(!(await goi()).some(x => x[0] === 'layBangDieuHanh'), 'Tổng quan KHÔNG gọi thêm máy chủ cho thẻ điều hành (không tăng số lần gọi khi mở trang)');
  await page.evaluate(() => { AppDataStore.tongQuan.quanLyVay = null; renderTongQuan_(); });
  ok((await page.locator('#tq_hmConLai').textContent()) === '—', 'Thiếu dữ liệu quản lý vay → thẻ hiện “—”, Tổng quan không lỗi');
  await page.click('#tabBtn-qlvay'); await cho(150);

  // ---- hạn mức ----
  await page.click('[data-qv="hanmuc"]'); await cho();
  ok(await page.locator('#qv_hmRows tr').count() === 3, 'Hạn mức: 3 dòng hợp đồng');
  ok(await page.locator('#qv_hmRows tr').first().locator('.qv-bar i.qv-m-vuot').count() === 1 && (await page.locator('#qv_hmRows tr').first().locator('.qv-bar i').getAttribute('style')).includes('width:100%'), 'Vượt hạn mức: thanh đỏ, chiều rộng chặn ở 100%');
  ok((await page.locator('#qv_hmRows tr').nth(2).innerText()).includes('Chưa khai báo'), 'Hợp đồng chưa khai báo hạn mức hiện rõ, không có thanh');
  let dl = page.waitForEvent('download'); await page.click('#qv_p_hanmuc .btn'); const f1 = await dl; await f1.saveAs(path.join(out, 'han_muc.csv'));
  const csv1 = fs.readFileSync(path.join(out, 'han_muc.csv'), 'utf8');
  ok(csv1.charCodeAt(0) === 0xFEFF && csv1.includes("'=cmd|calc"), 'CSV hạn mức có BOM UTF-8 và vô hiệu công thức (=cmd → \'=cmd)');

  // ---- dòng tiền ----
  await xoaGoi(); await page.click('[data-qv="dongtien"]'); await cho();
  ok(await page.locator('#qv_dtBars .qv-bar-row').count() === 13, 'Dòng tiền mặc định 12 tháng: 1 hàng quá hạn + 12 tháng = 13 thanh');
  await page.selectOption('#qv_dtThang', '6'); await page.fill('#qv_dtBien', '8'); await xoaGoi(); await page.click('#qv_p_dongtien .btn-primary'); await cho();
  const g1 = (await goi()).find(x => x[0] === 'layDuBaoDongTien');
  ok(g1 && g1[1][0].soThang === 6 && g1[1][0].bienDoTyGia === 8 && await page.locator('#qv_dtBars .qv-bar-row').count() === 7, 'Đổi sang 6 tháng, biên độ 8% → gọi đúng tham số và vẽ lại 7 thanh');
  ok((await page.locator('#qv_dtK0').textContent()).includes('-8') && (await page.locator('#qv_dtK2').textContent()).includes('+8'), 'Tiêu đề cột kịch bản theo biên độ (-8% / +8%)');

  // ---- nợ quá hạn ----
  await page.click('[data-qv="quahan"]'); await cho();
  ok(await page.locator('#qv_qhBac .qv-kpi').count() === 3 && await page.locator('#qv_qhRows tr').count() === 1 && (await page.locator('#qv_qhRows').innerText()).includes('35 ngày'), 'Nợ quá hạn: thẻ theo bậc và danh sách khoản quá hạn kèm số ngày');
  ok((await page.locator('#qv_qhRows').innerText()).includes('4.932'), 'Hiển thị lãi phạt ước tính 4.932');

  // ---- ràng buộc & tài sản ----
  await xoaGoi(); await page.click('[data-qv="baodam"]'); await cho();
  ok(await page.locator('#qv_rbRows tr').count() === 2 && await page.locator('#qv_tsRows tr').count() === 1, 'Ràng buộc: 2 chỉ tiêu; tài sản: 1');
  ok(await page.locator('#qv_tsRows b').count() === 1 && !(await page.locator('#qv_tsRows').innerHTML()).includes('<b>x</b>'), 'Mô tả tài sản được escape (không chèn thẻ HTML)');
  await page.fill('#qv_gt_RB-0001', '125,5'); await xoaGoi(); await page.locator('#qv_rbRows tr').first().locator('button', { hasText: 'Cập nhật' }).click(); await cho();
  const g2 = (await goi()).find(x => x[0] === 'capNhatGiaTriRangBuoc'); ok(g2 && g2[1][0] === 'RB-0001' && g2[1][1] === '125,5', 'Cập nhật giá trị chỉ tiêu nhập tay gọi đúng API');
  ok(await page.locator('#qv_rbRows tr').nth(1).locator('input').count() === 0, 'Chỉ tiêu tự tính không có ô nhập tay');
  await page.fill('#qv_tsMoTa', 'Xe tải 5 tấn'); await page.fill('#qv_tsGiaTri', '900000000'); await xoaGoi(); await page.locator('#qv_p_baodam button', { hasText: 'Lưu tài sản' }).click(); await cho();
  const g3 = (await goi()).find(x => x[0] === 'luuTaiSanBaoDam'); ok(g3 && g3[1][0].moTa === 'Xe tải 5 tấn' && g3[1][0].giaTri === '900000000', 'Đăng ký tài sản gọi đúng API');
  await xoaGoi(); await page.locator('#qv_tsRows button', { hasText: 'Giải chấp' }).click(); await cho();
  const g4 = (await goi()).find(x => x[0] === 'giaiChapTaiSan'); ok(g4 && g4[1][0] === 'TS-0001' && g4[1][1] === 'Lý do thử', 'Giải chấp yêu cầu lý do và gọi đúng API');

  // ---- sao kê ----
  await xoaGoi(); await page.click('[data-qv="saoke"]'); await cho();
  await page.fill('#qv_skText', 'Ngày;Số tiền\n20/10/2026;5.000.000'); await page.selectOption('#qv_skTien', 'USD'); await page.locator('#qv_p_saoke .btn-primary').click(); await cho();
  const g5 = (await goi()).find(x => x[0] === 'doiSoatSaoKe'); ok(g5 && g5[1][0].includes('5.000.000') && g5[1][1].loaiTien === 'USD', 'Đối soát gửi nguyên văn sao kê và loại tiền');
  ok(await page.locator('#qv_skRows tr').count() === 3 && await page.locator('#qv_skTom .qv-kpi').count() === 3 && await page.locator('#qv_skThieu tr').count() === 1, 'Kết quả: 3 dòng, 3 ô tổng hợp, 1 dòng “thiếu trên sao kê”');
  ok(await page.evaluate(() => !window.__xss2) && await page.locator('#qv_skRows img').count() === 0, 'Nội dung sao kê chứa HTML bị escape');
  dl = page.waitForEvent('download'); await page.locator('#qv_p_saoke .btn-secondary').click(); const f2 = await dl; await f2.saveAs(path.join(out, 'sao_ke.csv'));
  ok(fs.readFileSync(path.join(out, 'sao_ke.csv'), 'utf8').split('\r\n').length === 4, 'Xuất kết quả đối soát: tiêu đề + 3 dòng');

  // ---- duyệt ----
  await xoaGoi(); await page.click('[data-qv="duyet"]'); await cho();
  ok(await page.locator('#qv_dyRows tr').count() === 2 && (await page.locator('#qv_dyTrangThai').textContent()).includes('ĐANG BẬT'), 'Duyệt: 2 phiếu; hiển thị trạng thái bật duyệt hai cấp');
  ok((await page.locator('#qv_dyRows tr').nth(1).innerText()).includes('lỗi thời'), 'Phiếu “Đã duyệt” mà hồ sơ đã đổi revision được gắn nhãn lỗi thời');
  await xoaGoi(); await page.locator('#qv_dyRows button', { hasText: 'Duyệt' }).first().click(); await cho();
  const g6 = (await goi()).find(x => x[0] === 'quyetDinhPheDuyet'); ok(g6 && g6[1][0] === 'PD-0002' && g6[1][1] === 'DUYET', 'Bấm Duyệt gọi quyetDinhPheDuyet(PD-0002, DUYET)');
  await page.fill('#qv_dyMa', 'HS-5'); await xoaGoi(); await page.locator('#qv_p_duyet .btn-primary').first().click(); await cho(); 
  ok((await goi()).some(x => x[0] === 'layDuLieuDayDu' && x[1][0] === 'HS-5'), 'Gửi duyệt đọc hồ sơ để lấy revision trước khi gửi');

  // ---- cài đặt ----
  await xoaGoi(); await page.click('[data-qv="caidat"]'); await cho();
  ok(await page.locator('#qv_cs_CHAN_VUOT_HAN_MUC').isChecked() && !await page.locator('#qv_cs_BAT_DUYET_HAI_CAP').isChecked() && await page.inputValue('#qv_cs_TY_LE_LAI_QUA_HAN') === '150', 'Cài đặt nạp đúng giá trị hiện tại');
  await page.check('#qv_cs_BAT_DUYET_HAI_CAP'); await page.fill('#qv_cs_NHAC_EMAIL_NHAN', 'ketoan@x.vn'); await page.check('#qv_cs_NHAC_EMAIL_BAT'); await xoaGoi(); await page.locator('#qv_p_caidat button', { hasText: 'Lưu cài đặt' }).click(); await cho();
  const g7 = (await goi()).find(x => x[0] === 'luuThietLapQuanLyVay')[1][0]; ok(g7.BAT_DUYET_HAI_CAP === 1 && g7.NHAC_EMAIL_BAT === 1 && g7.NHAC_EMAIL_NHAN === 'ketoan@x.vn' && g7.THU_TU_PHAN_BO === 'PHAT,LAI,GOC', 'Lưu cài đặt gửi đủ khoá với giá trị đúng kiểu');
  await page.locator('#qv_p_caidat button', { hasText: 'Xem trước' }).click(); await cho();
  ok((await page.locator('#qv_nhacText').textContent()).includes('NỢ QUÁ HẠN (1 khoản)') && (await page.locator('#qv_nhacText').textContent()).includes('a@x.vn'), 'Xem trước bản tin nhắc nợ');
  await page.evaluate(() => { window.HAK_NGUOI_DUNG = { cheDo: 'CONG_HAK', vaiTro: 'NHAP_LIEU', daDangNhap: true }; });
  await page.click('[data-qv="duyet"]'); await page.click('[data-qv="caidat"]'); await page.evaluate(() => { QV_.da = {}; qvTai_('caidat'); }); await cho();
  ok(await page.locator('#qv_cs_CHAN_VUOT_HAN_MUC').isDisabled() && !await page.locator('#tab-qlvay .qv-admin').first().isVisible(), 'Người không phải quản trị: cài đặt bị khoá, nút quản trị ẩn');
  await page.evaluate(() => { window.HAK_NGUOI_DUNG = null; });

  // ---- hướng dẫn nằm trong menu “Hướng dẫn sử dụng” ----
  await page.click('#tabBtn-huongdan'); await cho(150);
  ok(await page.locator('#tab-huongdan').isVisible() && await page.locator('#qv_huongdan').isVisible(), 'Hướng dẫn Quản lý vay nằm ngay trong menu “Hướng dẫn sử dụng”');
  ok(await page.locator('#qv_huongdan details.qv-hd').count() === 13, 'Có 13 mục (chuẩn bị, 10 tính năng, lộ trình, sự cố)');
  ok(await page.locator('[data-qv="huongdan"]').count() === 0, 'Màn Quản lý vay không còn thẻ “Hướng dẫn” riêng');
  await page.locator('#qv_huongdan button', { hasText: 'Mở tất cả' }).click(); ok(await page.locator('#qv_huongdan details.qv-hd[open]').count() === 13, 'Nút “Mở tất cả” mở đủ 13 mục');
  const nhanHD = await page.locator('#qv_huongdan').evaluate(e => e.textContent), nhanCS = await page.locator('#tab-qlvay').evaluate(e => e.innerHTML + [...e.querySelectorAll('button')].map(b => b.textContent).join('|'));
  const phaiKhop = ['Chặn xác nhận giải ngân khi vượt hạn mức', 'Bắt buộc duyệt hai cấp trước khi xác nhận giải ngân', 'Gửi email nhắc nợ hằng ngày', 'Tạo sự kiện Google Calendar', 'Email nhận nhắc nợ', 'Thứ tự phân bổ tiền trả', 'Xem trước bản tin', 'Gửi thử cho tôi', 'Đồng bộ Calendar ngay', 'Tạo lịch chạy hằng ngày', 'Lưu cài đặt', 'Xem dự báo', 'Gửi duyệt', 'Đối soát', 'Giải chấp', 'Lưu tài sản', 'Khai báo chỉ tiêu mới', 'Ghi nhận trả nợ'];
  const lech = phaiKhop.filter(t => !nhanCS.includes(t) || !nhanHD.toLowerCase().includes(t.toLowerCase()));
  ok(lech.length === 0, 'Tên nút/ô trong hướng dẫn KHỚP đúng nhãn thật trên màn hình' + (lech.length ? ' — lệch: ' + lech.join('; ') : ''));
  await page.locator('#qv_huongdan button', { hasText: 'Thu gọn tất cả' }).click(); ok(await page.locator('#qv_huongdan details.qv-hd[open]').count() === 0, 'Nút “Thu gọn tất cả” đóng hết');
  await page.locator('#qv_hd_hanmuc').evaluate(d => d.open = true); await page.locator('#qv_hd_hanmuc button', { hasText: 'Mở màn này' }).click(); await cho(250);
  ok(await page.locator('#tab-qlvay').isVisible() && await page.locator('#qv_p_hanmuc').isVisible(), 'Nút “Mở màn này” chuyển sang Quản lý vay đúng thẻ Hạn mức');
  await page.locator('#tab-qlvay .workspace-heading button', { hasText: 'Hướng dẫn sử dụng' }).click(); await cho(250);
  ok(await page.locator('#tab-huongdan').isVisible(), 'Nút “Hướng dẫn sử dụng” ở màn Quản lý vay mở lại menu Hướng dẫn');
  await page.click('#tabBtn-qlvay'); await cho(150);

  // ---- lỗi máy chủ hiển thị rõ ----
  await page.evaluate(() => { window.__loi.layHanMucTinDung = 'Máy chủ bận'; QV_.da = {}; }); await page.click('[data-qv="hanmuc"]'); await cho();
  ok((await page.locator('#qv_status').textContent()).includes('Máy chủ bận') && await page.locator('#qv_status.msg-err').count() === 1, 'Lỗi máy chủ hiện rõ trên màn hình');
  await page.evaluate(() => { window.__loi = {}; });

  // ---- Tất toán: trả gộp ----
  await page.click('#tabBtn-tattoan'); await cho(200);
  await page.evaluate(() => { TT_SELECTED_ = { maHoSo: 'HS-1', revision: 8, daTatToan: false }; document.getElementById('tt_form').hidden = false; document.getElementById('tt_traForm').hidden = false; });
  await page.selectOption('#tt_traLoai', 'GOP'); await page.fill('#tt_traNgay', '2026-10-21'); await page.fill('#tt_traSoTien', '20000'); await page.fill('#tt_traTC', 'TT-2026-1'); await page.fill('#tt_traCT', 'UNC 1'); await xoaGoi();
  await page.click('#tt_traBtn'); await cho();
  ok((await goi()).some(x => x[0] === 'layGoiYPhanBoTra' && x[1][0] === 'HS-1' && x[1][1] === '20000' && x[1][2] === '2026-10-21') && await page.inputValue('#tt_gopPhat') === '4932' && await page.inputValue('#tt_gopLai') === '15068', 'Trả gộp: gợi ý phân bổ (lãi phạt 4.932 / lãi 15.068 / gốc 0) hiện để chỉnh');
  await page.fill('#tt_gopLai', '15000'); await page.fill('#tt_gopPhat', '5000'); await xoaGoi(); await page.locator('#tt_gop .btn-primary').click(); await cho();
  const g8 = (await goi()).find(x => x[0] === 'ghiNhanTraNoGop'); ok(g8 && g8[1][0] === 'HS-1' && g8[1][1].phanBo.phat === '5000' && g8[1][1].phanBo.lai === '15000' && g8[1][1].soThamChieu === 'TT-2026-1' && g8[1][2] === 8, 'Ghi nhận trả gộp gửi phân bổ đã chỉnh + revision');

  // ---- tương thích: không tràn ngang, sáng/tối, di động ----
  for (const mode of ['light', 'dark']) for (const w of [1366, 390]) {
    await page.setViewportSize({ width: w, height: 800 }); await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
    await page.click('#tabBtn-qlvay'); await cho(100);
    for (const t of ['dieuhanh', 'hanmuc', 'dongtien', 'quahan', 'baodam', 'saoke', 'duyet', 'caidat']) {
      await page.evaluate((x) => { qvChuyen_(x); }, t); await cho(60);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'Không tràn ngang: ' + t + ' · ' + mode + ' · ' + w + 'px');
    }
  }
  await page.setViewportSize({ width: 1366, height: 900 }); await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; qvChuyen_('dieuhanh'); }); await cho(100);
  await page.screenshot({ path: path.join(out, 'quan_ly_vay_dieu_hanh.png'), fullPage: false });
  await page.evaluate(() => qvChuyen_('hanmuc')); await cho(100); await page.screenshot({ path: path.join(out, 'quan_ly_vay_han_muc.png') });
  ok(errors.length === 0, 'Không có lỗi JavaScript trên trang' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log('\nTỔNG: ' + checks + ' khẳng định, ' + checks + ' đạt, 0 lỗi. Ảnh: ' + out);
})().catch(async (e) => { console.error('LỖI: ' + (e && e.message)); if (browser) await browser.close().catch(() => {}); process.exit(1); });
