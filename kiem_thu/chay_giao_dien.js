/* Kiểm thử giao diện (trình duyệt Chromium + Playwright) với google.script.run GIẢ LẬP. Chỉ kiểm tra phía trình duyệt:
 * không có Apps Script thật phía sau. Chạy: node kiem_thu/chay_giao_dien.js [thư_mục_ảnh] */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_giao_dien'); fs.mkdirSync(RA, { recursive: true });
const inc = (t) => fs.readFileSync(path.join(GOC, t + '.html'), 'utf8');
let html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (m, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '');
const ket = []; let loi = 0;
const dat = (t, ok, g) => { ket.push(`  [${ok ? 'ĐẠT' : 'LỖI'}] ${t}${!ok && g ? '  → ' + g : ''}`); if (!ok) loi++; };

const STUB = `
window.__goi = []; window.__tra = window.__tra || {};
window.google = { script: { run: new Proxy({}, { get: (_, ten) => {
  if (ten === 'withSuccessHandler' || ten === 'withFailureHandler') return function () { return this._ok = null, window.__proxy(ten, arguments[0]); };
  return undefined; } }) } };
(function () {
  function tao(ok, fail) {
    return new Proxy({}, { get: (_, ten) => {
      if (ten === 'withSuccessHandler') return (f) => tao(f, fail);
      if (ten === 'withFailureHandler') return (f) => tao(ok, f);
      return function () {
        let args = Array.from(arguments), ten2 = ten; if (ten === 'api') { ten2 = args[1]; args = args[2]; }
        window.__goi.push([ten2, args]);
        const kq = window.__tra[ten2]; let v = typeof kq === 'function' ? kq.apply(null, args) : kq;
        setTimeout(function () { if (v && v.__loi) { if (fail) fail({ message: v.__loi }); } else if (ok) ok(v); }, 0);
      };
    } });
  }
  window.google.script.run = tao(null, null);
})();`;
html = html.replace('<head>', '<head><script>' + STUB + '</script>');
fs.writeFileSync(path.join(RA, 'trang.html'), html);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  const pg = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  const loiJs = []; pg.on('pageerror', e => loiJs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/fonts.googleapis|net::ERR/.test(m.text())) loiJs.push(m.text()); });
  const nap = () => { window.__tra = {
    layTrangThaiQuyen: { daCauHinh: false, quanTri: true, email: 'a@b.c' },
    thongTinDangNhap: { cheDo: 'TAM_GOOGLE', daDangNhap: true, email: 'a@b.c', vaiTro: '', vaiTroNhan: '', quyen: [], quaPhien: false, phienMoi: '', congDangNhapUrl: '' },
    layDuLieuKhoiTao: () => ({ ok: true, data: { ngay: '2026-10-14', congTy: [], hopDong: [], khachHang: [], hoSoGoc: [] }, meta: { phienBanDoc: { CONGTY: 1, HOPDONG: 1, KHACHHANG: 1, HOSO: 1 }, cache: { CONGTY: 'MISS', HOPDONG: 'MISS', KHACHHANG: 'MISS', HOSO: 'BYPASS' }, soBanGhi: { CONGTY: 0, HOPDONG: 0, KHACHHANG: 0, HOSO: 0 }, tongMs: 5 }, error: null }),
    layRevisionDuLieu: { ok: true, data: { CONGTY: 1, HOPDONG: 1, KHACHHANG: 1, HOSO: 1 }, meta: { tongMs: 1 }, error: null },
    layDanhMucPlaceholder: { chung: [{ khoa: 'HO_SO.SO_TIEN', kieu: 'tien', batBuoc: true, macDinh: '', nguon: 'HoSoGiaiNgan.SoTienNhanNoLanNay', alias: [] }, { khoa: 'CONG_TY.MA_SO_THUE', kieu: 'text', batBuoc: true, macDinh: '', nguon: 'DM_CongTy.MaSoThue', alias: ['CONG_TY.MST'] }],
      dong: [{ khoa: 'CT.TEN_NGUOI_HUONG', kieu: 'text', batBuoc: true, macDinh: '', nguon: 'ChiTietThuHuong.TenNguoiHuong', alias: ['CT.TEN'] }] },
    layDanhSachMauVanBan: [
      { maMau: 'UNC_BIDV', tenMau: 'UNC <BIDV>', nganHang: 'BIDV', loaiTaiLieu: 'CHUNG_TU_THANH_TOAN', loaiTien: 'TAT_CA', dieuKien: '1', phienBan: 2, trangThai: 'Hiệu lực', macDinh: true, loaiFile: 'xlsx', tenFile: 'u.xlsx', linkFile: 'https://x/y', canhBao: '' },
      { maMau: 'UNC_BIDV', tenMau: 'UNC BIDV', nganHang: 'BIDV', loaiTaiLieu: 'CHUNG_TU_THANH_TOAN', loaiTien: 'TAT_CA', dieuKien: '1', phienBan: 1, trangThai: 'Hết hiệu lực', macDinh: false, loaiFile: 'xlsx', tenFile: 'u.xlsx', linkFile: '', canhBao: '' }],
    taiMauVanBan: (meta, b64) => ({ ok: true, maMau: meta.maMau, phienBan: 3, loaiFile: 'xlsx', canhBao: ['Trùng phạm vi'], placeholder: ['HO_SO.SO_TIEN'] }),
    xemTruocMau: { dat: false, loi: ['Còn placeholder chưa xử lý: {{CT.XYZ}}'], canhBao: [], soHangMau: 1, soHangTao: 0, soDong: 2, duLieu: 'dữ liệu thử' },
    kiemTraLaiMau: { hopLe: true, loi: [], canhBao: [], placeholder: ['HO_SO.SO_TIEN'], nguyenVen: true },
    layLichSuChinhSuaMau: [{ thoiGian: '13/10/2026 10:00', nguoi: 'a@b.c', hanhDong: 'MAU_TAI_LEN', chiTiet: 'UNC_BIDV v2' }],
    layLichSuPhatHanh: [{ maTaiLieu: 'HS0001-CHUNG_TU_THANH_TOAN-L2', maHoSo: 'HS0001', loaiTaiLieu: 'CHUNG_TU_THANH_TOAN', loai: 'Chứng từ thanh toán (UNC / Bảng kê)', soLan: 2, mau: 'UNC_BIDV v2', nguon: 'MAU_DOCX', loaiFile: 'xlsx', trangThai: 'Hiệu lực', linkDocx: '', linkXlsx: 'https://d/1', linkPdf: 'https://p/1', soDong: 1, tongTien: 645250000, nguoi: 'a@b.c', ngay: '13/10/2026', thongBaoLoi: '', canhBao: '' },
      { maTaiLieu: 'HS0001-CHUNG_TU_THANH_TOAN-L1', maHoSo: 'HS0001', loaiTaiLieu: 'CHUNG_TU_THANH_TOAN', loai: 'Chứng từ thanh toán (UNC / Bảng kê)', soLan: 1, mau: 'UNC_BIDV v1', nguon: 'MAU_DOCX', loaiFile: 'xlsx', trangThai: 'Đã thay thế', linkDocx: '', linkXlsx: 'https://d/0', linkPdf: '', soDong: 1, tongTien: 645250000, nguoi: 'a@b.c', ngay: '12/10/2026', thongBaoLoi: '', canhBao: '' }],
    layDanhSachChungTuHoSo: [
      { loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', tenTaiLieu: 'Văn bản đề nghị giải ngân', maMau: 'HDTD_USD_1', phienBanMau: 1, loaiFile: 'docx', nganHang: 'BIDV', loaiTien: 'USD', trangThai: 'Chưa phát hành', soLan: 0, ngayTao: '', nguoiTao: '', linkDocx: '', linkPdf: '', linkXlsx: '', maTaiLieu: '', loiGanNhat: '', thuMucUrl: 'https://f/1' },
      { loaiTaiLieu: 'CHUNG_TU_THANH_TOAN', tenTaiLieu: 'Ủy nhiệm chi (UNC) — 1 người thụ hưởng', maMau: 'UNC_BIDV', phienBanMau: 2, loaiFile: 'xlsx', nganHang: 'BIDV', loaiTien: 'USD', trangThai: 'Đã phát hành', soLan: 2, ngayTao: '13/10/2026', nguoiTao: 'a@b.c', linkDocx: '', linkPdf: 'https://p/1', linkXlsx: 'https://d/1', maTaiLieu: 'HS0001-CHUNG_TU_THANH_TOAN-L2', loiGanNhat: '', thuMucUrl: 'https://f/1' },
      { loaiTaiLieu: 'HDMB_NGOAI_TE', tenTaiLieu: 'Hợp đồng mua bán ngoại tệ giao ngay', maMau: '', phienBanMau: '', loaiFile: '', nganHang: '', loaiTien: 'USD', trangThai: 'Chưa phát hành', soLan: 0, ngayTao: '', nguoiTao: '', linkDocx: '', linkPdf: '', linkXlsx: '', maTaiLieu: '', loiGanNhat: 'Thiếu {{CONG_TY.NGUOI_DAI_DIEN}}', thuMucUrl: '' }],
    taoChungTuThanhToan: (ma, tc) => ({ loai: 'Chứng từ thanh toán', soDong: 1, nguon: 'MAU_DOCX', mau: 'UNC_BIDV', phienBanMau: 2, soLan: 3, canhBao: [], xlsxUrl: 'https://d/2', pdfUrl: 'https://p/2' }),
    taoDeNghiGiaiNganBIDV: (ma, tc) => ({ loai: 'Văn bản đề nghị giải ngân', soDong: 1, nguon: 'MAU_DOCX', mau: 'HDTD_USD_1', phienBanMau: 1, soLan: 1, canhBao: [], docxUrl: 'https://d/3', pdfUrl: 'https://p/3' }),
    taoHopDongMuaBanNgoaiTe: (ma, tc) => { return { __loi: 'Thiếu {{CONG_TY.NGUOI_DAI_DIEN}}' }; },
    xemTruocChungTu: { linkFile: 'https://x/pv', linkPdf: 'https://x/pv.pdf', mau: 'UNC_BIDV v2', canhBao: [], soDong: 1 },
    moBanGoogleCuaTaiLieu: { url: 'https://docs.google.com/spreadsheets/d/XYZ', moi: true },
    layCauHinhHeThong: { ssMuaHangId: 'SS1', sheetMuaHang: 'SO_CHI_TIET', thuMucGocId: 'F1', cheDoRender: 'XML', renderUrl: '', daCoRenderToken: true },
    kiemTraCauHinh: [{ ten: 'Thư mục gốc lưu hồ sơ', ok: true, thongBao: 'Truy cập được.' }], luuCauHinhHeThong: { ok: true },
    phanTichTepTho: { doan: [
      { id: 'word/document.xml#0', text: 'Bên vay: Công ty TNHH Hoàng Anh Khôi', viTri: 'Nội dung', trongBang: false, hangId: -1 },
      { id: 'word/document.xml#1', text: 'Mã số thuế 0401447476 của công ty', viTri: 'Nội dung', trongBang: false, hangId: -1 },
      { id: 'word/document.xml#2', text: 'Người A <b>', viTri: 'Bảng 1, hàng 2, ô 1', trongBang: true, hangId: 0 },
      { id: 'word/document.xml#3', text: 'Người B', viTri: 'Bảng 1, hàng 3, ô 1', trongBang: true, hangId: 1 }],
      goiY: [{ doan: 'word/document.xml#0', s: 9, e: 36, chuoi: 'Công ty TNHH Hoàng Anh Khôi', khoa: 'CONG_TY.TEN', ly: 'trùng dữ liệu' }], daCoPlaceholder: false },
    taoMauTuAnhXa: (b64, ten, ax, xoa) => ({ base64: 'UEsDBA==', tenFile: 'm_mau.docx', soThay: ax.length, soHangXoa: xoa.length, hopLe: true, loi: [], canhBao: ['Hồ sơ không có dòng'], placeholder: ['CONG_TY.TEN', 'CONG_TY.MA_SO_THUE'], coHangMau: true }),
    locDanhSachHoSo: (bl) => (bl.tuNgay || bl.denNgay) ? [] : [{ maHoSo: 'HS0003', tenCty: 'Cty A', soHopDong: 'HD1', soGiayNhanNo: 'GNN1', ngayGiaiNgan: '15/09/2026', loaiTien: 'VND', tyGiaBan: 0, soTien: 1000000, trangThai: 'Nháp', _row: 4 }],
    layDanhMucTaiLieuKem: ['Hóa đơn GTGT', 'Bảng lương', 'Hợp đồng kinh tế'],
    luuDanhMucTaiLieuKem: (ds) => ds.map(x => x.trim()).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i),
    layLoaiHoSoGiaiNgan: [{ ten: 'Giải ngân theo HĐTD', tl: ['DE_NGHI_GIAI_NGAN', 'CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE'], deNghi: true, chungTu: true, hdmb: true },
      { ten: 'Không dùng HĐTD', tl: ['CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE'], deNghi: false, chungTu: true, hdmb: true },
      { ten: 'Đủ bộ + Giấy nhận nợ', tl: ['DE_NGHI_GIAI_NGAN', 'CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE', 'GIAY_NHAN_NO'], deNghi: true, chungTu: true, hdmb: true }],
    luuLoaiHoSoGiaiNgan: (ds) => ds.filter(x => x.ten.trim()),
    layDanhMucLoaiTaiLieu: [{ ma: 'DE_NGHI_GIAI_NGAN', ten: 'Văn bản đề nghị giải ngân', heThong: true, loaiTien: 'TAT_CA' }, { ma: 'CHUNG_TU_THANH_TOAN', ten: 'Chứng từ thanh toán (UNC / Bảng kê)', heThong: true, loaiTien: 'TAT_CA' },
      { ma: 'HDMB_NGOAI_TE', ten: 'Hợp đồng mua bán ngoại tệ', heThong: true, loaiTien: 'USD' }, { ma: 'GIAY_NHAN_NO', ten: 'Giấy nhận nợ', heThong: false, loaiTien: 'USD' }],
    luuLoaiTaiLieuTuyChinh: (ds) => [{ ma: 'DE_NGHI_GIAI_NGAN', ten: 'Văn bản đề nghị giải ngân', heThong: true, loaiTien: 'TAT_CA' }, { ma: 'CHUNG_TU_THANH_TOAN', ten: 'Chứng từ thanh toán (UNC / Bảng kê)', heThong: true, loaiTien: 'TAT_CA' },
      { ma: 'HDMB_NGOAI_TE', ten: 'Hợp đồng mua bán ngoại tệ', heThong: true, loaiTien: 'USD' }].concat(ds.map(x => ({ ma: x.ma.toUpperCase(), ten: x.ten, heThong: false, loaiTien: x.loaiTien }))),
    taoChungTuTuyChon: (ma, loai, tc) => ({ loai: 'Giấy nhận nợ', soDong: 1, nguon: 'MAU_DOCX', mau: 'GNN_USD', phienBanMau: 1, soLan: 1, canhBao: [], docxUrl: 'https://d/9', pdfUrl: 'https://p/9' }),
    xoaMauVanBan: (ma, pb) => pb === 1 ? { __loi: 'Mẫu UNC_BIDV v1 đã được dùng phát hành 3 tài liệu nên không xoá được' } : { ok: true },
    capNhatThongTinPhiTienTe: (p) => ({ maHoSo: p.maHoSo, trangThai: 'Nháp' }),
    luuHoSoGiaiNgan: (p) => ({ maHoSo: 'HS9', trangThai: 'Nháp' })
  }; };
  await pg.setContent(html, { waitUntil: 'domcontentloaded' });
  await pg.evaluate(nap);
  await pg.waitForTimeout(400);
  dat('Trang nạp không lỗi JavaScript', loiJs.length === 0, loiJs.join(' | '));

  // --- Đồng bộ dữ liệu: rỗng thật, response sai thứ tự, phiên bản cũ, lỗi thật ---
  await pg.waitForLoadState('load'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { window.__goi.length = 0; taiDuLieuBanDau(); }); await pg.waitForTimeout(400);
  const khoiTao = await pg.evaluate(() => ({ so: window.__goi.filter(g => g[0] === 'layDuLieuKhoiTao').length, moiHamMotLan: Object.values(window.__goi.reduce((a, g) => (a[g[0]] = (a[g[0]] || 0) + 1, a), {})).every(n => n === 1), daNap: AppDataStore.daNap, n: AppDataStore.hopDong.length, banner: document.getElementById('chanDoanKetNoi') ? /Không tải được/.test(document.getElementById('chanDoanKetNoi').textContent) : false }));
  dat('[TC2-UI] Sheets rỗng thật: đúng 1 lượt gọi nạp (không đọc lại), hiển thị ngay "0", không báo lỗi', khoiTao.so === 1 && khoiTao.daNap && khoiTao.n === 0 && !khoiTao.banner && khoiTao.moiHamMotLan, JSON.stringify(khoiTao));
  const thuTu = await pg.evaluate(() => {
    const cho = []; const cu = window.google.script.run; const nhan = [];
    window.google = { script: { run: { withSuccessHandler(f) { const o = { f }; return { withFailureHandler(g) { o.g = g; return new Proxy({}, { get: (_, ten) => () => { cho.push(o); } }); } }; } } } };
    RequestCoordinator.goi('thu_thutu', 'locDanhSachHoSo', [{}], (d) => nhan.push(d), () => {});
    RequestCoordinator.goi('thu_thutu', 'locDanhSachHoSo', [{}], (d) => nhan.push(d), () => {});
    cho[1].f(['MOI']); cho[0].f(['CU']); // trả về sai thứ tự
    window.google = { script: { run: cu } };
    return nhan;
  });
  dat('[TC12] Hai response sai thứ tự: chỉ response của lượt gọi MỚI NHẤT được áp dụng, response cũ bị bỏ', thuTu.length === 1 && thuTu[0][0] === 'MOI', JSON.stringify(thuTu));
  const loc3 = await pg.evaluate(() => {
    const cho = []; const cu = window.google.script.run; const nhan = [];
    window.google = { script: { run: { withSuccessHandler(f) { const o = { f }; return { withFailureHandler(g) { o.g = g; return new Proxy({}, { get: () => () => { cho.push(o); } }); } }; } } } };
    for (let i = 0; i < 3; i++) RequestCoordinator.goi('loc_hoso', 'locDanhSachHoSo', [{ i }], (d) => nhan.push(d[0]), () => {});
    cho[2].f(['L3']); cho[0].f(['L1']); cho[1].f(['L2']);
    window.google = { script: { run: cu } };
    return nhan;
  });
  dat('[TC13] Đổi bộ lọc liên tục 3 lần, response về 3-1-2: chỉ kết quả của lần lọc CUỐI được áp dụng', loc3.join() === 'L3', loc3.join());
  await pg.evaluate(() => { window.__goi.length = 0; AppDataStore.lanCuoiHoiPhienBan = 0; for (let i = 0; i < 6; i++) chuyenTab(['tongquan', 'hoso', 'khachhang', 'baocao', 'tongquan', 'hoso'][i]); }); await pg.waitForTimeout(400);
  const soHoiRev = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'layRevisionDuLieu').length);
  dat('[TC14] Chuyển tab nhanh 6 lần: chỉ MỘT lượt hỏi phiên bản (không dồn dập), không nạp lại toàn bộ', soHoiRev === 1 && await pg.evaluate(() => window.__goi.filter(g => g[0] === 'layDuLieuKhoiTao').length === 0), 'số lần hỏi = ' + soHoiRev);
  const cuHon = await pg.evaluate(() => { AppDataStore.hoSoGoc = [{ MaHoSo: 'MOI' }]; AppDataStore.phienBan.HOSO = 7; AppDataStore.ap_({ hoSoGoc: [{ MaHoSo: 'CU' }] }, { phienBanDoc: { HOSO: 5 } }); return AppDataStore.hoSoGoc[0].MaHoSo; });
  dat('Response có phiên bản CŨ HƠN dữ liệu đang giữ không ghi đè', cuHon === 'MOI');
  const loiThat = await pg.evaluate(() => { window.__tra.layDuLieuKhoiTao = () => ({ __loi: 'Lỗi cấu trúc tab "DM_HopDongVay": thiếu cột MaHD' }); AppDataStore.congTy = [{ MaCty: 'GIU' }]; taiDuLieuBanDau(); return 1; });
  await pg.waitForTimeout(300);
  const sauLoi = await pg.evaluate(() => ({ giu: AppDataStore.congTy.length, msg: document.getElementById('msgBox').textContent, so: window.__goi.filter(g => g[0] === 'layDuLieuKhoiTao').length }));
  dat('[TC17-UI] Đọc lỗi thật: hiện thông báo lỗi thật, KHÔNG thay bằng dữ liệu rỗng, KHÔNG tự thử lại', /thiếu cột MaHD/.test(sauLoi.msg) && sauLoi.giu === 1 && sauLoi.so === 1, JSON.stringify(sauLoi));
  await pg.evaluate(() => { window.__tra.layDuLieuKhoiTao = () => null; taiDuLieuBanDau(); }); await pg.waitForTimeout(300);
  dat('Phản hồi trống (null) từ máy chủ: báo lỗi rõ, không coi là rỗng hợp lệ', /phản hồi trống/.test(await pg.textContent('#msgBox')));
  await pg.evaluate(() => { window.__tra.layDuLieuKhoiTao = () => ({ ok: true, data: { ngay: 'x', congTy: [], hopDong: [], khachHang: [], hoSoGoc: [] }, meta: { phienBanDoc: { CONGTY: 2, HOPDONG: 2, KHACHHANG: 2, HOSO: 2 }, cache: {}, soBanGhi: {} } }); AppDataStore.phienBan = { CONGTY: 1, HOPDONG: 1, KHACHHANG: 1, HOSO: 1 }; window.__goi.length = 0; });
  await pg.evaluate(() => { window.__tra.layRevisionDuLieu = { ok: true, data: { CONGTY: 1, HOPDONG: 3, KHACHHANG: 1, HOSO: 1 }, meta: {}, error: null }; AppDataStore.lanCuoiHoiPhienBan = 0; dongBoNeuMayChuDoi_(true); }); await pg.waitForTimeout(400);
  const dongBo = await pg.evaluate(() => window.__goi.map(g => g[0] + (g[1][0] && g[1][0].mien ? ':' + g[1][0].mien.join('+') : '')));
  dat('[TC19] Phiên khác đổi dữ liệu: hỏi revision rồi CHỈ nạp lại miền bị đổi (HOPDONG), không nạp tất cả', dongBo.join() === 'layRevisionDuLieu,layDuLieuKhoiTao:HOPDONG', dongBo.join());
  await pg.evaluate(() => chuyenTabCaiDat_('dongbo')); await pg.waitForTimeout(150);
  const cd = await pg.textContent('#cd-dongbo');
  dat('Trang chẩn đoán đồng bộ: có phiên bản/cache và nhật ký yêu cầu, không chứa số tài khoản', /Phiên bản máy chủ/.test(cd) && /layDuLieuKhoiTao/.test(cd) && /BO_QUA_CU|OK/.test(cd) && !/\d{9,}/.test(cd));
  await pg.evaluate(() => { window.__tra.layDuLieuKhoiTao = window.__tra.layDuLieuKhoiTao; });
  // --- Bảng hồ sơ: sắp xếp, phân trang, cảnh báo chưa lưu, đối soát ---
  await pg.evaluate(() => chuyenTab('hoso')); await pg.waitForTimeout(400);
  await pg.evaluate(() => { AppDataStore.hoSoLoc = Array.from({ length: 60 }, (_, i) => ({ maHoSo: 'HS' + String(i + 1).padStart(4, '0'), tenCty: 'C', soHopDong: 'H', soGiayNhanNo: 'G', ngayGiaiNgan: '2026-09-15', loaiTien: i % 2 ? 'USD' : 'VND', soTien: (i + 1) * 1000, trangThai: 'Nháp' })); HS_SAP_XEP_ = { cot: '', huong: 1 }; HS_TRANG_ = 0; renderBangHoSo_(); });
  const p1 = await pg.evaluate(() => ({ dong: document.querySelectorAll('#tbody_dsHoSo tr').length, pt: document.getElementById('hs_phanTrang').textContent }));
  dat('Bảng hồ sơ phân trang: 60 hồ sơ → 25 dòng/trang, "Trang 1/3"', p1.dong === 25 && /Trang 1\/3/.test(p1.pt) && /60 hồ sơ/.test(p1.pt), JSON.stringify(p1));
  await pg.evaluate(() => sapXepHoSo_('soTien')); await pg.evaluate(() => sapXepHoSo_('soTien'));
  const p2 = await pg.evaluate(() => document.querySelector('#tbody_dsHoSo tr td').textContent + '|' + document.querySelector('#tbl_dsHoSo th[data-cot=soTien]').textContent);
  dat('Bấm tiêu đề "Số tiền" 2 lần → sắp GIẢM dần theo SỐ (60.000 lên đầu), tiêu đề có ▼', /^HS0060/.test(p2) && /▼/.test(p2), p2);
  await pg.evaluate(() => doiTrangHoSo_(1));
  dat('Sang trang 2 hiển thị đúng 25 dòng khác', await pg.evaluate(() => document.querySelectorAll('#tbody_dsHoSo tr').length === 25 && /Trang 2\/3/.test(document.getElementById('hs_phanTrang').textContent)));
  await pg.evaluate(() => { chuyenViewHoSo_('detail'); datFormBan_(false); document.getElementById('soGiayNhanNo').dispatchEvent(new Event('input', { bubbles: true })); quayLaiDanhSachHoSo(); });
  const c1 = await pg.evaluate(() => ({ modal: document.getElementById('modalXacNhan').style.display, nd: document.getElementById('modalXacNhanNoiDung').textContent, vienDetail: document.getElementById('hoso-view-detail').style.display }));
  dat('Có thay đổi chưa lưu: rời form bị chặn bằng hộp xác nhận, vẫn ở lại form', c1.modal === 'flex' && /CHƯA LƯU/.test(c1.nd) && c1.vienDetail !== 'none', JSON.stringify(c1));
  await pg.evaluate(() => xacNhanDongY_()); await pg.waitForTimeout(300);
  dat('Đồng ý bỏ thay đổi → về danh sách', await pg.evaluate(() => document.getElementById('hoso-view-detail').style.display === 'none'));
  await pg.evaluate(() => { window.__tra.layBaoCaoDoiSoat = { ok: true, data: { thoiDiem: 't', soHoSo: 2, soHoSoXoaMem: 1, tongHop: [{ trangThai: 'Nháp', loaiTien: 'VND', soHoSo: 1, tong: 1000000, tongQuyDoiVND: 0 }, { trangThai: 'Nháp', loaiTien: 'USD', soHoSo: 1, tong: 25000, tongQuyDoiVND: 645250000 }], kiemTra: [{ ma: 'TONG_KHOP', ten: 'Tổng hồ sơ = tổng chi tiết', soLoi: 1, chiTiet: ['HS0001: lệch'] }, { ma: 'GHI_DO_DANG', ten: 'Ghi dở dang', soLoi: 0, chiTiet: [] }], tongSoLoi: 1 }, meta: {}, error: null }; taiDoiSoat(); }); await pg.waitForTimeout(300);
  const ds = await pg.textContent('#ds_ketQua');
  dat('Đối soát hiển thị VND và USD thành 2 dòng riêng (không tổng chung), nêu lỗi toàn vẹn', /1\.000\.000 VND/.test(ds) && /25\.000 USD/.test(ds) && /645\.250\.000/.test(ds) && /1 vấn đề/.test(ds) && /HS0001: lệch/.test(ds), ds.slice(0, 200));
  // --- Đăng nhập qua Cổng ---
  await pg.evaluate(() => { window.__goi.length = 0; window.__tra.thongTinDangNhap = { cheDo: 'CONG_HAK', daDangNhap: false, congDangNhapUrl: 'https://script.google.com/macros/s/AKfycbCONG/exec', email: '', quyen: [] }; hakKhoiDong_(); }); await pg.waitForTimeout(300);
  const dnUi = await pg.evaluate(() => ({ hien: getComputedStyle(document.getElementById('hakDangNhapNen')).display, nut: document.getElementById('hakDangNhapNut').textContent, khoiTao: window.__goi.filter(g => g[0] === 'layDuLieuKhoiTao').length }));
  dat('[ĐN] Chưa đăng nhập (chế độ Cổng): hiện màn hình đăng nhập, KHÔNG nạp dữ liệu', dnUi.hien === 'flex' && /Đăng nhập bằng Google/.test(dnUi.nut) && dnUi.khoiTao === 0, JSON.stringify(dnUi));
  await pg.evaluate(() => { window.open = () => ({}); hakDangNhapCuaSoNho_('https://script.google.com/macros/s/AKfycbCONG/exec'); });
  dat('[ĐN] Đăng nhập từ trang nhúng: yêu cầu nhập mã ghép cặp 6 số', await pg.isVisible('#hakMaGhepCap') && (await pg.evaluate(() => HAK_YEU_CAU_DN)).length === 32);
  await pg.evaluate(() => { window.__goi.length = 0; window.__tra.nhanPhienDangNhap = () => ({ canMa: true, saiMa: true }); document.getElementById('hakMaGhepCap').value = '123456'; hakXacNhanMaGhepCap_(); }); await pg.waitForTimeout(250);
  dat('[ĐN] Nhập sai mã: báo sai, vẫn ở màn hình đăng nhập', /Sai mã/.test(await pg.textContent('#hakDangNhapTrangThai')) && (await pg.evaluate(() => window.__goi.find(g => g[0] === 'nhanPhienDangNhap')[1].length)) === 2);
  await pg.evaluate(() => { document.getElementById('hakDangNhapNen').classList.remove('hien'); window.__tra.thongTinDangNhap = { cheDo: 'TAM_GOOGLE', daDangNhap: true }; window.__tra.layNgayHomNay = () => ({ __loi: '[AUTH] Phiên đăng nhập đã hết hạn - vui lòng đăng nhập lại.' }); hakRun_().withSuccessHandler(() => {}).layNgayHomNay(); }); await pg.waitForTimeout(250);
  dat('[ĐN] Máy chủ trả [AUTH] (phiên hết hạn): tự hiện lại màn hình đăng nhập, lời nhắn không lộ tiền tố', await pg.evaluate(() => getComputedStyle(document.getElementById('hakDangNhapNen')).display === 'flex' && /hết hạn/.test(document.getElementById('hakDangNhapLoi').textContent) && !/\[AUTH\]/.test(document.getElementById('hakDangNhapLoi').textContent)));
  await pg.evaluate(() => { document.getElementById('hakDangNhapNen').classList.remove('hien'); delete window.__tra.layNgayHomNay; });
  // --- Tab Cài đặt → Quản lý mẫu văn bản ---
  await pg.evaluate(() => chuyenTab('caidat')); await pg.waitForTimeout(300);
  dat('Tab Cài đặt hiện, cảnh báo chưa cấu hình quản trị', await pg.isVisible('#tab-caidat') && /Chưa cấu hình danh sách quản trị/.test(await pg.textContent('#cd_canhBaoQuyen')));
  const hang = await pg.$$eval('#mau_tbody tr', r => r.map(x => x.textContent));
  dat('Bảng mẫu: 2 phiên bản; ký tự < > được escape; ⭐ mẫu mặc định', hang.length === 2 && /UNC <BIDV>/.test(hang[0]) && /⭐/.test(hang[0]) && (await pg.$$('#mau_tbody b, #mau_tbody BIDV')).length === 0, hang[0]);
  dat('Nút: bản hiệu lực có Ngưng/Bỏ mặc định/Xem trước/Kiểm tra/Lịch sử; bản cũ có Khôi phục: ' + hang[0].slice(-110), /Ngừng/.test(hang[0]) && /Bỏ mặc định/.test(hang[0]) && /Xem trước/.test(hang[0]) && /Kiểm tra/.test(hang[0]) && /Lịch sử/.test(hang[0]) && /Khôi phục/.test(hang[1]));
  const dm = await pg.textContent('#mau_danhMuc');
  dat('Danh mục placeholder: kiểu, bắt buộc, nguồn, bí danh', /HO_SO\.SO_TIEN/.test(dm) && /Bắt buộc/.test(dm) && /DM_CongTy\.MaSoThue/.test(dm) && /CONG_TY\.MST/.test(dm) && /CT\.TEN_NGUOI_HUONG/.test(dm));
  const f = path.join(GOC, 'mau_that', 'UNC_1_KHOAN.xlsx');
  await pg.fill('#mau_ma', 'UNC_BIDV'); await pg.fill('#mau_ten', 'x'); await pg.fill('#mau_dieuKien', '1'); await pg.setInputFiles('#mau_file', f); await pg.check('#mau_macDinh');
  await pg.evaluate(() => taiMauLenClick()); await pg.waitForTimeout(600);
  const goi = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taiMauVanBan').map(g => ({ meta: g[1][0], len: g[1][1].length })));
  dat('Tải mẫu .xlsx gửi đúng meta (điều kiện "1", mặc định, loại tài liệu) + nội dung base64', goi.length === 1 && goi[0].meta.maMau === 'UNC_BIDV' && goi[0].meta.tenFile === 'UNC_1_KHOAN.xlsx' && goi[0].meta.dieuKienSoDong === '1' && goi[0].meta.macDinh === true && goi[0].meta.loaiTaiLieu === 'DE_NGHI_GIAI_NGAN' && goi[0].len > 1000);
  dat('Hiện kết quả tải: v3 + cảnh báo', /v3/.test(await pg.textContent('#mau_ketQua')) && /Trùng phạm vi/.test(await pg.textContent('#mau_ketQua')));
  await pg.setInputFiles('#mau_file', { name: 'a.doc', mimeType: 'application/msword', buffer: Buffer.from('x') });
  await pg.evaluate(() => taiMauLenClick()); await pg.waitForTimeout(200);
  dat('File .doc (không phải .docx/.xlsx) bị chặn ngay ở trình duyệt', /\.docx|\.xlsx/.test(await pg.textContent('#msgBox')));
  await pg.evaluate(() => xemTruocMauClick('UNC_BIDV', 2)); await pg.waitForTimeout(300);
  dat('Xem trước mẫu (dữ liệu thử) hiện lỗi placeholder', /CT\.XYZ/.test(await pg.textContent('#mau_ketQuaThu')));
  await pg.evaluate(() => kiemTraLaiMauClick('UNC_BIDV', 2)); await pg.waitForTimeout(300);
  dat('Kiểm tra lại mẫu: nguyên vẹn', /nguyên vẹn/.test(await pg.textContent('#mau_ketQuaThu')));
  dat('Mỗi dòng mẫu có nút "Xoá"', (await pg.$$eval('#mau_tbody tr', r => r.every(x => /Xoá/.test(x.textContent)))));
  await pg.evaluate(() => xoaMauClick('UNC_BIDV', 2)); await pg.waitForTimeout(200);
  dat('Bấm Xoá → hỏi xác nhận (nêu: chỉ xoá khi chưa dùng, file vào thùng rác), chưa gọi máy chủ', await pg.isVisible('#modalXacNhan') && /CHƯA từng dùng/.test(await pg.textContent('#modalXacNhanNoiDung')) && await pg.evaluate(() => window.__goi.filter(g => g[0] === 'xoaMauVanBan').length === 0));
  await pg.evaluate(() => xacNhanDongY_()); await pg.waitForTimeout(400);
  dat('Đồng ý → gọi xoaMauVanBan(UNC_BIDV, 2), báo đã xoá, tải lại danh sách', await pg.evaluate(() => window.__goi.filter(g => g[0] === 'xoaMauVanBan').map(g => g[1].join())[0] === 'UNC_BIDV,2') && /Đã xoá mẫu/.test(await pg.textContent('#msgBox')));
  await pg.evaluate(() => xoaMauClick('UNC_BIDV', 1)); await pg.waitForTimeout(200); await pg.evaluate(() => xacNhanDongY_()); await pg.waitForTimeout(400);
  dat('Mẫu đã dùng: máy chủ từ chối → hiện lý do (không xoá)', /đã được dùng phát hành/.test(await pg.textContent('#msgBox')));
  await pg.evaluate(() => lichSuMauClick('UNC_BIDV')); await pg.waitForTimeout(300);
  dat('Lịch sử chỉnh sửa mẫu hiển thị', /MAU_TAI_LEN/.test(await pg.textContent('#mau_ketQuaThu')));
  await pg.evaluate(() => taiLichSuPhatHanhClick()); await pg.waitForTimeout(300);
  const ls = await pg.textContent('#mau_lichSu');
  dat('Lịch sử phát hành: link tệp/PDF tách riêng, tổng 645.250.000, bản cũ mờ', /XLSX/.test(ls) && /PDF/.test(ls) && /645\.250\.000/.test(ls) && (await pg.$$('#mau_lichSu a')).length === 3);
  await pg.screenshot({ path: path.join(RA, 'cai_dat_mau.png') });
  await pg.evaluate(() => chuyenTabCaiDat_('cauhinh')); await pg.waitForTimeout(300);
  dat('Cấu hình hệ thống nạp từ máy chủ; token không hiển thị lại', await pg.inputValue('#cfg_ssMuaHangId') === 'SS1' && await pg.inputValue('#cfg_cheDoRender') === 'XML' && /đã đặt/.test(await pg.getAttribute('#cfg_renderToken', 'placeholder')) && await pg.inputValue('#cfg_renderToken') === '');
  await pg.fill('#cfg_thuMucGocId', 'F2'); await pg.evaluate(() => kiemTraCauHinhClick()); await pg.waitForTimeout(300);
  dat('Kiểm tra kết nối cấu hình hiển thị kết quả', /Truy cập được/.test(await pg.textContent('#cfg_ketQua')));
  await pg.evaluate(() => luuCauHinhClick()); await pg.waitForTimeout(300);
  const cfgGoi = await pg.evaluate(() => (window.__goi.filter(g => g[0] === 'luuCauHinhHeThong')[0] || [0, [{}]])[1][0]);
  dat('Lưu cấu hình gửi đúng giá trị', cfgGoi.thuMucGocId === 'F2' && cfgGoi.cheDoRender === 'XML' && /Đã lưu/.test(await pg.textContent('#cfg_ketQua')));

  // --- Trình tạo mẫu từ file Word thô ---
  await pg.evaluate(() => chuyenTabCaiDat_('mau')); await pg.waitForTimeout(200);
  await pg.setInputFiles('#tt_file', path.join(GOC, 'mau_that', 'HDTD_USD_1_KHOAN.docx'));
  await pg.evaluate(() => trinhTaoPhanTich()); await pg.waitForTimeout(500);
  dat('Trình tạo mẫu: phân tích file → hiện 4 đoạn, gợi ý ✨ và ô chọn trường; chữ < > được escape', await pg.isVisible('#tt_khung') && (await pg.$$('.tt-dong')).length === 4 && (await pg.$$('.tt-chip-g')).length === 1 && /Người A <b>/.test(await pg.textContent('#tt_ds')) && (await pg.$$('#tt_ds .tt-text b')).length === 0 && (await pg.$$('#tt_loc option')).length === 4 && (await pg.$$('#tt_loc optgroup')).length === 3);
  await pg.evaluate(() => trinhTaoApDungGoiY());
  dat('"Áp dụng tất cả gợi ý": 1 vùng gán, đoạn 0 tô màu xanh', await pg.evaluate(() => TT_.anhXa.length === 1 && TT_.anhXa[0].chuoi === 'Công ty TNHH Hoàng Anh Khôi' && document.querySelectorAll('mark.tt-a').length === 1));
  const chonVung = (id, a, b) => pg.evaluate(([id, a, b]) => {
    const el = document.querySelector('.tt-text[data-id="' + id + '"]'), w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    function vi(k) { let n, dem = 0, cuoi = null; while ((n = w.nextNode())) { cuoi = n; if (k <= dem + n.length) return [n, k - dem]; dem += n.length; } return [cuoi, cuoi.length]; }
    w.currentNode = el; const [n1, o1] = vi(a); w.currentNode = el; const [n2, o2] = vi(b);
    const r = document.createRange(); r.setStart(n1, o1); r.setEnd(n2, o2); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    document.getElementById('tt_ds').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); }, [id, a, b]).then(() => pg.waitForTimeout(60));
  await chonVung('word/document.xml#1', 11, 21); await pg.evaluate(() => { document.getElementById('tt_loc').value = ''; trinhTaoGan(); });
  dat('Bấm "Gán vùng" khi CHƯA chọn trường → báo hướng dẫn, không gán', await pg.evaluate(() => TT_.anhXa.length === 1) && /Hãy chọn một trường dữ liệu/.test(await pg.textContent('#msgBox')));
  await pg.selectOption('#tt_loc', 'CONG_TY.MA_SO_THUE'); await pg.waitForTimeout(60);
  const v2 = await pg.evaluate(() => TT_.anhXa[1]);
  dat('Bôi chọn "0401447476" rồi CHỌN trường trong danh sách → tự gán (1 thao tác), đúng vị trí (11–21) và đúng chuỗi', v2 && v2.doan === 'word/document.xml#1' && v2.s === 11 && v2.e === 21 && v2.chuoi === '0401447476' && v2.khoa === 'CONG_TY.MA_SO_THUE', JSON.stringify(v2));
  await chonVung('word/document.xml#0', 5, 20); await pg.selectOption('#tt_loc', 'CONG_TY.MA_SO_THUE'); await pg.waitForTimeout(60);
  dat('Vùng chọn chồng vùng đã gán bị chặn', await pg.evaluate(() => TT_.anhXa.length === 2));
  await pg.selectOption('#tt_loc', ''); await chonVung('word/document.xml#1', 3, 3); await pg.selectOption('#tt_loc', 'HO_SO.SO_TIEN'); await pg.waitForTimeout(60);
  const v3 = await pg.evaluate(() => TT_.anhXa[2]);
  dat('Đặt con trỏ (không bôi chọn) → CHÈN trường tại vị trí (s = e = 3)', v3 && v3.s === 3 && v3.e === 3 && v3.chuoi === '' && v3.khoa === 'HO_SO.SO_TIEN', JSON.stringify(v3));
  dat('Vẽ lại: vùng chèn hiển thị, văn bản gốc của đoạn không đổi khi chọn tiếp (offset bù ⟦⟧)', await pg.evaluate(() => { const el = document.querySelector('.tt-text[data-id="word/document.xml#1"]'); return /⟦HO_SO\.SO_TIEN⟧/.test(el.textContent); }));
  await chonVung('word/document.xml#1', 3, 3);
  await pg.evaluate(() => { const el = document.querySelector('.tt-text[data-id="word/document.xml#1"]'); const m = el.querySelectorAll('mark'); const r = document.createRange(); r.setStartAfter(m[m.length - 1]); r.setEndAfter(m[m.length - 1]); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); document.getElementById('tt_ds').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
  dat('Chọn sau vùng đã chèn/gán vẫn tính đúng vị trí theo văn bản gốc (bỏ phần hiển thị ⟦⟧)', await pg.evaluate(() => TT_.chon && TT_.chon.s <= 33 && TT_.chon.s >= 21), await pg.evaluate(() => JSON.stringify(TT_.chon)));
  await pg.evaluate(() => { document.querySelectorAll('#tt_ds input[type=checkbox]')[1].click(); });
  dat('Tích "xoá cả hàng bảng này" (chỉ ở đoạn đầu mỗi hàng): ghi nhận 1 hàng, đoạn bị gạch', await pg.evaluate(() => Object.keys(TT_.xoa).filter(k => TT_.xoa[k]).join() === 'word/document.xml|1') && /1 hàng sẽ xoá/.test(await pg.textContent('#tt_tomTat')));
  await pg.screenshot({ path: path.join(RA, 'trinh_tao_mau.png') });
  await pg.evaluate(() => trinhTaoTaoMau()); await pg.waitForTimeout(400);
  const gt = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taoMauTuAnhXa').map(g => g[1]));
  dat('Tạo mẫu gửi: tên file, 3 vùng gán, danh sách hàng xoá {phan, hangId}', gt.length === 1 && gt[0][1] === 'HDTD_USD_1_KHOAN.docx' && gt[0][2].length === 3 && gt[0][3].length === 1 && gt[0][3][0].phan === 'word/document.xml' && gt[0][3][0].hangId === 1);
  dat('Hiện kết quả tạo mẫu + form "Thêm mẫu này" (mã, tên, ngân hàng, loại tiền, loại chứng từ, điều kiện)', /Đã chèn 3 vùng/.test(await pg.textContent('#tt_ketQuaTao')) && /Thêm mẫu này/.test(await pg.textContent('#tt_ketQuaTao')) && await pg.isVisible('#tt_ma') && (await pg.$$('#tt_lct option')).length >= 3);
  await pg.fill('#tt_ten', 'Đề nghị giải ngân mới'); await pg.selectOption('#tt_lt', 'VND'); await pg.fill('#tt_dk', '1');
  await pg.evaluate(() => { window.__goi.length = 0; trinhTaoThemMau(); }); await pg.waitForTimeout(400);
  const them = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taiMauVanBan').map(g => ({ meta: g[1][0], b64: g[1][1] })));
  dat('Bấm "➕ Thêm mẫu này": gọi taiMauVanBan với mẫu vừa tạo (không cần sang khung khác)', them.length === 1 && them[0].meta.tenFile === 'm_mau.docx' && them[0].meta.tenMau === 'Đề nghị giải ngân mới' && them[0].meta.loaiTien === 'VND' && them[0].meta.dieuKienSoDong === '1' && them[0].meta.loaiTaiLieu === 'DE_NGHI_GIAI_NGAN' && them[0].b64 === 'UEsDBA==' && /^[A-Z0-9_]+$/.test(them[0].meta.maMau), JSON.stringify(them[0] && them[0].meta));
  dat('Báo "Đã thêm mẫu ... đang hiệu lực" ngay dưới form', /Đã thêm mẫu/.test(await pg.textContent('#tt_ketQuaThem')));
  await pg.evaluate(() => trinhTaoDung());
  dat('Đường cũ "dùng làm file mẫu ở khung Tải mẫu" vẫn hoạt động', /m_mau\.docx/.test(await pg.textContent('#mau_tuTao')));
  await pg.setInputFiles('#mau_file', []); await pg.fill('#mau_ma', 'HDTD_MOI'); await pg.fill('#mau_ten', 'Mẫu mới'); await pg.fill('#mau_dieuKien', '1');
  await pg.evaluate(() => { window.__goi.length = 0; taiMauLenClick(); }); await pg.waitForTimeout(500);
  const up = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taiMauVanBan').map(g => ({ meta: g[1][0], b64: g[1][1] })));
  dat('Tải lên KHÔNG cần chọn file: dùng mẫu từ trình tạo (tên m_mau.docx, nội dung base64 của mẫu)', up.length === 1 && up[0].meta.tenFile === 'm_mau.docx' && up[0].meta.maMau === 'HDTD_MOI' && up[0].b64 === 'UEsDBA==');
  dat('Sau khi tải lên: bỏ ghi nhớ mẫu từ trình tạo', await pg.evaluate(() => window.__mauTuTrinhTao === null) && (await pg.textContent('#mau_tuTao')) === '');

  // --- Danh sách chứng từ hồ sơ ---
  await pg.evaluate(() => { window.__luuGoc = window.luuHoSo; window.luuHoSo = (cb) => cb('HS0001'); }); // hồ sơ đã lưu sẵn (kiểm thử riêng phần lưu ở mục dưới)
  await pg.evaluate(() => { chuyenTab('hoso'); chuyenViewHoSo_('detail'); document.querySelectorAll('.hoso-tab-panel').forEach(p => p.style.display = 'none'); document.getElementById('hosoTab-thuchien').style.display = 'block'; MA_HO_SO_DANG_SUA = 'HS0001'; taiDanhSachChungTuHoSo_(); });
  await pg.waitForTimeout(400);
  const ct = await pg.$$eval('#ct_tbody tr', r => r.map(x => x.textContent));
  dat('Danh sách chứng từ hồ sơ: 3 tài liệu với mã mẫu/phiên bản/ngân hàng/loại tiền/trạng thái/người tạo', ct.length === 3 && /HDTD_USD_1/.test(ct[0]) && /UNC_BIDV/.test(ct[1]) && /v2/.test(ct[1]) && /BIDV/.test(ct[1]) && /USD/.test(ct[1]) && /Đã phát hành \(lần 2\)/.test(ct[1]) && /a@b\.c/.test(ct[1]) && /biểu mẫu mặc định/.test(ct[2]), ct[1]);
  dat('Thao tác: Xem trước · Tạo/Tạo lại · DOCX/PDF/XLSX · Google · Lịch sử · Thư mục', /Xem trước/.test(ct[0]) && /Tạo chứng từ/.test(ct[0]) && /Tạo lại/.test(ct[1]) && /PDF/.test(ct[1]) && /XLSX/.test(ct[1]) && /Google/.test(ct[1]) && /Lịch sử/.test(ct[1]) && /Thư mục/.test(ct[1]) && /Lỗi gần nhất/.test(ct[2]));
  await pg.screenshot({ path: path.join(RA, 'danh_sach_chung_tu.png') });
  await pg.evaluate(() => xemTruocChungTuClick('CHUNG_TU_THANH_TOAN')); await pg.waitForTimeout(500);
  const xt = await pg.evaluate(() => ({ g: window.__goi.filter(g => g[0] === 'xemTruocChungTu').map(g => g[1]), links: document.getElementById('linksBox').textContent }));
  dat('Xem trước chứng từ gọi đúng hàm; hiện link file + PDF; KHÔNG gọi hàm phát hành', xt.g.length === 1 && xt.g[0][1] === 'CHUNG_TU_THANH_TOAN' && /Xem trước/.test(xt.links) && await pg.evaluate(() => window.__goi.filter(g => /^tao/.test(g[0])).length === 0));
  await pg.evaluate(() => { taoMotChungTu('DE_NGHI_GIAI_NGAN', false); }); await pg.waitForTimeout(600);
  const ph1 = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taoDeNghiGiaiNganBIDV').map(g => g[1]));
  dat('"Tạo chứng từ" lần đầu: gọi taoDeNghiGiaiNganBIDV(taoLai=false), thông báo nêu mẫu + lần', ph1.length === 1 && ph1[0][1].taoLai === false && /HDTD_USD_1 v1, lần 1/.test(await pg.textContent('#msgBox')), JSON.stringify(ph1));
  await pg.evaluate(() => { taoMotChungTu('CHUNG_TU_THANH_TOAN', true); }); await pg.waitForTimeout(300);
  dat('"Tạo lại" hỏi xác nhận (bản cũ được giữ nguyên) trước khi gọi máy chủ', await pg.isVisible('#modalXacNhan') && /PHIÊN BẢN MỚI/.test(await pg.textContent('#modalXacNhanNoiDung')) && await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taoChungTuThanhToan').length === 0));
  await pg.evaluate(() => xacNhanDongY_()); await pg.waitForTimeout(600);
  dat('Xác nhận → gọi taoChungTuThanhToan(taoLai=true)', await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taoChungTuThanhToan').map(g => g[1][1].taoLai)[0] === true));
  await pg.evaluate(() => { window.__goi.length = 0; taoMotChungTu('GIAY_NHAN_NO', false); }); await pg.waitForTimeout(500);
  const tc = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taoChungTuTuyChon').map(g => g[1]));
  dat('Tạo riêng loại tài liệu TỰ THÊM: gọi taoChungTuTuyChon(maHoSo, "GIAY_NHAN_NO", {taoLai:false}); thông báo đúng tên loại', tc.length === 1 && tc[0][1] === 'GIAY_NHAN_NO' && tc[0][2].taoLai === false && /Giấy nhận nợ/.test(await pg.textContent('#msgBox')), JSON.stringify(tc));
  await pg.evaluate(() => lichSuChungTuClick('CHUNG_TU_THANH_TOAN')); await pg.waitForTimeout(300);
  const lsm = await pg.textContent('#modalLichSuCT_tbody');
  dat('Lịch sử chứng từ hồ sơ (modal): L2 hiệu lực + L1 đã thay thế, link XLSX/PDF', await pg.isVisible('#modalLichSuCT') && /L2/.test(lsm) && /L1/.test(lsm) && /Đã thay thế/.test(lsm) && /645\.250\.000/.test(lsm));
  await pg.evaluate(() => { document.getElementById('modalLichSuCT').style.display = 'none'; });
  await pg.evaluate(() => { document.querySelectorAll('.ct-chon').forEach(c => { c.checked = c.value !== 'CHUNG_TU_THANH_TOAN'; }); xuatCacTaiLieuDaChon(); }); await pg.waitForTimeout(900);
  const mb = await pg.textContent('#msgBox');
  dat('Xuất nhiều tài liệu đã chọn: tổng hợp kết quả từng tài liệu (✅ Đề nghị, ❌ HDMB kèm lý do)', /Văn bản đề nghị giải ngân.*✅/.test(mb) && /Hợp đồng mua bán ngoại tệ — ❌ Thiếu/.test(mb), mb);
  await pg.evaluate(() => moGoogleClick('HS0001-CHUNG_TU_THANH_TOAN-L2')); await pg.waitForTimeout(300);
  dat('"Mở bằng Google" gọi moBanGoogleCuaTaiLieu', await pg.evaluate(() => window.__goi.filter(g => g[0] === 'moBanGoogleCuaTaiLieu').length === 1));

  await pg.evaluate(() => { window.luuHoSo = window.__luuGoc; });
  // --- Danh sách hồ sơ: bộ lọc ngày mặc định để trống ---
  await pg.evaluate(() => { chuyenTab('hoso'); datNgayLocMacDinh(); });
  dat('Bộ lọc ngày danh sách hồ sơ mặc định TRỐNG (không ẩn hồ sơ tháng trước)', await pg.inputValue('#loc_tuNgay') === '' && await pg.inputValue('#loc_denNgay') === '');
  await pg.evaluate(() => locDanhSachHoSoClick()); await pg.waitForTimeout(300);
  dat('Không lọc ngày → hiện hồ sơ ngày giải ngân 15/09/2026', /HS0003/.test(await pg.textContent('#tbody_dsHoSo')));
  await pg.fill('#loc_tuNgay', '2026-10-01'); await pg.evaluate(() => locDanhSachHoSoClick()); await pg.waitForTimeout(300);
  dat('Lọc từ 01/10 → trống, có liên kết "Bỏ lọc ngày và xem tất cả hồ sơ"', /Không có hồ sơ nào khớp/.test(await pg.textContent('#tbody_dsHoSo')) && /Bỏ lọc ngày/.test(await pg.textContent('#tbody_dsHoSo')));
  await pg.evaluate(() => xoaLocNgayVaTai_()); await pg.waitForTimeout(300);
  dat('Bấm liên kết → xoá lọc ngày và hiện lại hồ sơ', await pg.inputValue('#loc_tuNgay') === '' && /HS0003/.test(await pg.textContent('#tbody_dsHoSo')));

  // --- Tài liệu kèm theo: tick theo từng hồ sơ ---
  dat('Danh mục tài liệu kèm theo hiện thành 3 ô tick ở form hồ sơ', (await pg.$$('#tlKemBox .tlkem-chk')).length === 3);
  const tl = await pg.evaluate(() => {
    const c = document.querySelectorAll('#tlKemBox .tlkem-chk'); c[0].checked = true; c[1].checked = true;
    document.getElementById('taiLieuChungMinhMucDich').value = 'Biên bản X, Bảng lương';
    return docTaiLieuKemTuForm_(); });
  dat('Tick 2 + gõ thêm → chuỗi "Hóa đơn GTGT, Bảng lương, Biên bản X" (bỏ trùng)', tl === 'Hóa đơn GTGT, Bảng lương, Biên bản X', tl);
  const tl2 = await pg.evaluate(() => { datTaiLieuKemVaoForm_('hóa đơn gtgt, Giấy ABC; Hợp đồng kinh tế'); return { t: Array.from(document.querySelectorAll('#tlKemBox .tlkem-chk')).map(c => c.checked), f: document.getElementById('taiLieuChungMinhMucDich').value }; });
  dat('Mở hồ sơ đã lưu: mục khớp danh mục (không phân biệt hoa/thường) được tick, phần còn lại vào ô gõ thêm', JSON.stringify(tl2.t) === '[true,false,true]' && tl2.f === 'Giấy ABC', JSON.stringify(tl2));
  const tl3 = await pg.evaluate(() => { datTaiLieuKemVaoForm_(''); return { t: Array.from(document.querySelectorAll('#tlKemBox .tlkem-chk')).some(c => c.checked), f: document.getElementById('taiLieuChungMinhMucDich').value, g: docTaiLieuKemTuForm_() }; });
  dat('Hồ sơ mới: không tick gì, ô gõ thêm trống (khi lưu dùng câu mặc định)', !tl3.t && tl3.f === '' && tl3.g === '');
  await pg.evaluate(() => { chuyenTab('caidat'); chuyenTabCaiDat_('cauhinh'); }); await pg.waitForTimeout(300);
  dat('Cài đặt → Cấu hình: nạp danh mục (mỗi dòng 1 mục)', (await pg.inputValue('#cfg_dmTaiLieuKem')) === 'Hóa đơn GTGT\nBảng lương\nHợp đồng kinh tế');
  await pg.fill('#cfg_dmTaiLieuKem', 'Hóa đơn GTGT\n\nHóa đơn GTGT\nPhiếu nhập kho'); await pg.evaluate(() => luuDanhMucTaiLieuKemClick()); await pg.waitForTimeout(300);
  dat('Lưu danh mục: bỏ dòng trống/trùng, báo đã lưu', (await pg.inputValue('#cfg_dmTaiLieuKem')) === 'Hóa đơn GTGT\nPhiếu nhập kho' && /Đã lưu 2 mục/.test(await pg.textContent('#cfg_dmTaiLieuKemKq')));
  // --- Loại hồ sơ giải ngân + Loại tài liệu tự thêm ---
  await pg.evaluate(() => { chuyenTab('hoso'); });
  const lh = await pg.evaluate(() => ({ o: Array.from(document.querySelectorAll('#loaiHoSoGiaiNgan option')).map(x => x.value), v: document.getElementById('loaiHoSoGiaiNgan').value, g: document.getElementById('loaiHoSoGoiY').textContent }));
  dat('Form hồ sơ có ô "Loại hồ sơ giải ngân": 3 loại, mặc định loại đầu; gợi ý bộ chứng từ', lh.o.length === 3 && lh.v === 'Giải ngân theo HĐTD' && /Văn bản đề nghị \(HĐTD\) \+ UNC \/ Bảng kê/.test(lh.g), JSON.stringify(lh));
  const lh2 = await pg.evaluate(() => { const s = document.getElementById('loaiHoSoGiaiNgan'); s.value = 'Không dùng HĐTD'; document.getElementById('loaiTienHoSo').value = 'USD'; capNhatGoiYLoaiHoSo_(); return document.getElementById('loaiHoSoGoiY').textContent; });
  dat('Chọn "Không dùng HĐTD" + hồ sơ USD → gợi ý chỉ còn UNC/Bảng kê + HĐ mua bán ngoại tệ', /UNC \/ Bảng kê \+ Hợp đồng mua bán ngoại tệ/.test(lh2) && !/HĐTD\)/.test(lh2), lh2);
  const lh2b = await pg.evaluate(() => { const s = document.getElementById('loaiHoSoGiaiNgan'); s.value = 'Đủ bộ + Giấy nhận nợ'; capNhatGoiYLoaiHoSo_(); const usd = document.getElementById('loaiHoSoGoiY').textContent; document.getElementById('loaiTienHoSo').value = 'VND'; capNhatGoiYLoaiHoSo_(); return [usd, document.getElementById('loaiHoSoGoiY').textContent]; });
  dat('Loại có "Giấy nhận nợ" (tự thêm, chỉ USD): hồ sơ USD hiện "Giấy nhận nợ", hồ sơ VND thì KHÔNG', /Giấy nhận nợ/.test(lh2b[0]) && !/Giấy nhận nợ/.test(lh2b[1]), JSON.stringify(lh2b));
  const lh3 = await pg.evaluate(() => { datLoaiHoSoVaoForm_('KHÔNG DÙNG hđtd'); const a = document.getElementById('loaiHoSoGiaiNgan').value; datLoaiHoSoVaoForm_('loại đã xoá'); return [a, document.getElementById('loaiHoSoGiaiNgan').value]; });
  dat('Mở hồ sơ đã lưu: khớp tên không phân biệt hoa/thường; loại không còn trong danh mục → loại đầu', lh3[0] === 'Không dùng HĐTD' && lh3[1] === 'Giải ngân theo HĐTD', JSON.stringify(lh3));
  await pg.evaluate(() => { chuyenTab('caidat'); chuyenTabCaiDat_('cauhinh'); }); await pg.waitForTimeout(400);
  dat('Cài đặt → bảng Loại tài liệu: 3 loại hệ thống (chỉ đọc) + 1 loại tự thêm sửa được', await pg.$$eval('#cfg_bangLoaiTL tbody tr', r => r.length === 4 && r.filter(x => x.classList.contains('ltl-tuychinh')).length === 1 && r[3].querySelector('.ltl-ma').value === 'GIAY_NHAN_NO'));
  await pg.evaluate(() => { themDongLoaiTaiLieu_(); const tr = document.querySelectorAll('#cfg_bangLoaiTL tbody tr.ltl-tuychinh')[1]; tr.querySelector('.ltl-ma').value = 'to_trinh'; tr.querySelector('.ltl-ten').value = 'Tờ trình'; luuLoaiTaiLieuClick(); }); await pg.waitForTimeout(400);
  const lg0 = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'luuLoaiTaiLieuTuyChinh').map(g => g[1][0]));
  dat('Thêm loại "Tờ trình" và lưu: gửi 2 loại tự thêm (GIAY_NHAN_NO + to_trinh)', lg0.length === 1 && lg0[0].length === 2 && lg0[0][1].ma === 'to_trinh' && lg0[0][1].ten === 'Tờ trình' && lg0[0][1].loaiTien === 'TAT_CA', JSON.stringify(lg0));
  dat('Sau khi lưu: ô "Loại chứng từ" của phần tải mẫu có đủ loại (hệ thống + tự thêm); bảng Loại hồ sơ có thêm cột', await pg.$$eval('#mau_loaiTaiLieu option', o => o.length >= 4 && o.some(x => x.value === 'GIAY_NHAN_NO')) && await pg.$$eval('#cfg_bangLoaiHoSo thead th', th => th.length >= 5));
  dat('Cài đặt → bảng Loại hồ sơ: nạp 3 dòng, tick đúng bộ tài liệu (cột = mọi loại tài liệu)', await pg.$$eval('#cfg_bangLoaiHoSo tbody tr', r => r.length === 3 && r[1].querySelector('.lhs-chk[data-ma="DE_NGHI_GIAI_NGAN"]').checked === false && r[1].querySelector('.lhs-chk[data-ma="CHUNG_TU_THANH_TOAN"]').checked === true && r[2].querySelector('.lhs-chk[data-ma="GIAY_NHAN_NO"]').checked === true));
  await pg.evaluate(() => { themDongLoaiHoSo_(); const tr = document.querySelectorAll('#cfg_bangLoaiHoSo tbody tr')[3]; tr.querySelector('.lhs-ten').value = 'Chỉ UNC'; tr.querySelectorAll('.lhs-chk').forEach(c => { c.checked = c.getAttribute('data-ma') === 'CHUNG_TU_THANH_TOAN'; }); luuLoaiHoSoClick(); });
  await pg.waitForTimeout(300);
  const lg = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'luuLoaiHoSoGiaiNgan').map(g => g[1][0]));
  dat('Thêm loại "Chỉ UNC" (chỉ tick UNC/Bảng kê) và lưu: gửi 4 loại, loại mới có tl = [CHUNG_TU_THANH_TOAN]', lg.length === 1 && lg[0].length === 4 && lg[0][3].ten === 'Chỉ UNC' && JSON.stringify(lg[0][3].tl) === '["CHUNG_TU_THANH_TOAN"]', JSON.stringify(lg));
  dat('Báo đã lưu', /Đã lưu 4 loại/.test(await pg.textContent('#cfg_loaiHoSoKq')));

  // --- Công ty & Hợp đồng nằm trong Cài đặt ---
  dat('Nút "Công ty & Hợp đồng vay" đã chuyển khỏi menu bên trái, nằm trong Cài đặt', !(await pg.isVisible('#tabBtn-congty')) && await pg.isVisible('#cdBtn-congty'));
  await pg.evaluate(() => chuyenTab('congty')); await pg.waitForTimeout(200);
  dat('Mở Công ty & Hợp đồng từ Cài đặt: hiện panel, menu "Cài đặt" sáng, có thanh quay lại Cài đặt', await pg.isVisible('#tab-congty') && await pg.evaluate(() => document.getElementById('tabBtn-caidat').classList.contains('active')) && /Quản lý mẫu văn bản/.test(await pg.textContent('#tab-congty')));

  // --- Nhập tiền ---
  await pg.evaluate(() => chuyenTab('hoso'));
  const kq = await pg.evaluate(() => {
    const o = document.getElementById('duNoHienTai'); const rs = {};
    o.value = '25000'; nhapTienInput(o); rs.tuDinhDang = o.value;
    o.value = '25.000,50'; nhapTienInput(o); rs.coLoiPhay = o.classList.contains('tien-loi') && o.value === '25.000,50';
    try { layGiaTriSo_('25.000,50'); rs.nem = false; } catch (e) { rs.nem = true; }
    rs.ok = layGiaTriSo_('25.000'); try { layGiaTriSo_('0,5'); rs.nem05 = false; } catch (e) { rs.nem05 = true; }
    rs.fmt = fmtTien(25000) + '|' + fmtTien(1234567890) + '|' + fmtTyGia(26145.5);
    rs.qd = quyDoiVND_(25000, 26145.5);
    return rs;
  });
  dat('Gõ 25000 → tự định dạng 25.000; gõ 25.000,50 → đánh dấu lỗi, KHÔNG sửa số', kq.tuDinhDang === '25.000' && kq.coLoiPhay);
  dat('25.000,50 và 0,5 bị từ chối; 25.000 → 25000; định dạng hiển thị', kq.nem && kq.nem05 && kq.ok === 25000 && kq.fmt === '25.000|1.234.567.890|26.145,5');
  dat('Quy đổi phía trình duyệt = 653.637.500', kq.qd === 653637500);

  // --- Hồ sơ cũ có số lẻ ---
  await pg.evaluate(() => {
    DS_CONG_TY = [{ MaCty: 'CTY001', TenCty: 'X' }]; 
    dienDuLieuVaoForm({ hoSo: { MaHoSo: 'HS7', LoaiTien: 'USD', TyGiaBan: 26145.5, DuNoHienTai: 0, SoTienNhanNoLanNay: 25000.5, TrangThai: 'Nháp', SoGiayNhanNo: 'A' },
      hopDong: { MaHD: 'HD001' }, congTy: { MaCty: 'CTY001' },
      chiTiet: [{ TenNguoiHuong: 'A', SoTien: 10000, SoTienQuyDoi: 261455000 }, { TenNguoiHuong: 'B', SoTien: 15000.5, SoTienQuyDoi: 392195250.25 }] });
    MA_HO_SO_DANG_SUA = 'HS7';
    // stub không có danh mục công ty/hợp đồng: gán thẳng lựa chọn để thuThapDuLieuForm() qua bước kiểm tra chọn hợp đồng
    const sel = document.getElementById('selHopDong'); sel.innerHTML = '<option value="HD001">HD001</option>'; sel.value = 'HD001';
  });
  await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => ({ banner: document.getElementById('bannerTienLe').style.display, ct: document.getElementById('bannerTienLeChiTiet').textContent,
    ro: Array.from(document.querySelectorAll('.ct-sotien')).map(o => o.readOnly), v: Array.from(document.querySelectorAll('.ct-sotien')).map(o => o.value), tong: document.getElementById('soTienNhanNoLanNay').value }));
  dat('Hồ sơ số lẻ: banner cảnh báo hiện, liệt kê đúng ô lẻ', st.banner === 'block' && /Dòng thụ hưởng 2 – Số tiền = 15\.000,5/.test(st.ct) && /Số tiền nhận nợ lần này = 25\.000,5/.test(st.ct), st.ct);
  dat('Số tiền giữ NGUYÊN trạng (25.000,5 hiển thị, không làm tròn), ô tiền chỉ đọc', st.v[1] === '15.000,5' && st.ro.every(x => x) && st.tong === '25.000,5', JSON.stringify(st));
  await pg.evaluate(() => { chuyenViewHoSo_('detail'); document.querySelectorAll('.hoso-tab-panel').forEach(p => p.style.display = 'none'); document.getElementById('hosoTab-thuchien').style.display = 'block'; });
  await pg.screenshot({ path: path.join(RA, 'ho_so_so_le_banner.png') });
  await pg.evaluate(() => luuHoSo()); await pg.waitForTimeout(400);
  const luu = await pg.evaluate(() => ({ goi: window.__goi.filter(g => ['capNhatThongTinPhiTienTe', 'luuHoSoGiaiNgan'].includes(g[0])).map(g => g[0]), pl: (window.__goi.filter(g => g[0] === 'capNhatThongTinPhiTienTe')[0] || [0, [{}]])[1][0] }));
  dat('Lưu hồ sơ số lẻ → gọi capNhatThongTinPhiTienTe (KHÔNG luuHoSoGiaiNgan), payload không mang số tiền', luu.goi.join() === 'capNhatThongTinPhiTienTe' && luu.pl.soTienNhanNoLanNay === 0 && luu.pl.chiTiet.length === 2 && luu.pl.chiTiet.every(c => c.soTien === 0), JSON.stringify(luu.goi));
  await pg.screenshot({ path: path.join(RA, 'ho_so_so_le.png') });
  await pg.evaluate(() => moKhoaSuaTien()); await pg.waitForTimeout(200);
  const mo = await pg.evaluate(() => ({ banner: document.getElementById('bannerTienLe').style.display, v: Array.from(document.querySelectorAll('.ct-sotien')).map(o => o.value), ro: Array.from(document.querySelectorAll('.ct-sotien')).map(o => o.readOnly) }));
  dat('"Sửa số tiền": mở khoá, chỉ xoá ô lẻ (15.000,5), giữ ô nguyên (10.000)', mo.banner === 'none' && mo.v[0] === '10.000' && mo.v[1] === '' && mo.ro.every(x => !x), JSON.stringify(mo));
  await pg.evaluate(() => { document.querySelectorAll('.ct-sotien')[1].value = '15.000,50'; });
  await pg.evaluate(() => luuHoSo()); await pg.waitForTimeout(300);
  dat('Nhập lại "15.000,50" → báo lỗi, không gửi lên server', /không hợp lệ/.test(await pg.textContent('#msgBox')) && await pg.evaluate(() => window.__goi.filter(g => g[0] === 'luuHoSoGiaiNgan').length === 0));
  await pg.evaluate(() => { document.querySelectorAll('.ct-sotien')[1].value = '15.000'; });
  await pg.evaluate(() => luuHoSo()); await pg.waitForTimeout(300);
  const pl2 = await pg.evaluate(() => (window.__goi.filter(g => g[0] === 'luuHoSoGiaiNgan')[0] || [0, [{}]])[1][0]);
  dat('Nhập lại "15.000" → gửi số nguyên 15000, tổng 25000, tỷ giá 26145.5', pl2.soTienNhanNoLanNay === 25000 && pl2.chiTiet[1].soTien === 15000 && pl2.tyGiaBan === 26145.5, JSON.stringify(pl2).slice(0, 200));
  dat('Payload lưu KHÔNG mang trangThai; mang expectedRevision (phát hiện xung đột)', !('trangThai' in pl2) && 'expectedRevision' in pl2, Object.keys(pl2).join());
  await pg.evaluate(() => { MA_HO_SO_DANG_SUA = 'HS0001'; baoLoi(new Error('XUNG_DOT_PHIEN_BAN|5|Hồ sơ HS0001 đã được người khác thay đổi.')); });
  dat('Lỗi xung đột phiên bản: hiện thông báo tiếng Việt + liên kết "Tải lại hồ sơ" (không lộ mã nội bộ)', /đã được người khác thay đổi/.test(await pg.textContent('#msgBox')) && /Tải lại hồ sơ/.test(await pg.textContent('#msgBox')) && !/XUNG_DOT_PHIEN_BAN/.test(await pg.textContent('#msgBox')));
  await pg.evaluate(() => { window.__goi.length = 0; window.prompt = () => '   '; huyGiaiNganClick(); }); await pg.waitForTimeout(150); await pg.evaluate(() => xacNhanDongY_()); await pg.waitForTimeout(200);
  dat('Hủy giải ngân mà không nhập lý do: chặn ngay ở trình duyệt, không gọi máy chủ', /lý do/.test(await pg.textContent('#msgBox')) && await pg.evaluate(() => window.__goi.filter(g => g[0] === 'huyGiaiNgan').length === 0));
  dat('Không lỗi JavaScript trong suốt phiên', loiJs.length === 0, loiJs.join(' | '));
  await b.close();
  fs.writeFileSync(path.join(RA, 'ket_qua.txt'), ket.join('\n'));
  console.log(ket.join('\n') + `\n\nTỔNG: ${ket.length} khẳng định, ${ket.length - loi} đạt, ${loi} lỗi. Ảnh: ${RA}`);
  process.exit(loi ? 1 : 0);
})().catch(e => { console.log(ket.join('\n')); console.log('LỖI CHẠY:', e.message.split('\n')[0]); process.exit(2); });
