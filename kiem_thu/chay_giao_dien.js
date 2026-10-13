/* Kiểm thử giao diện (trình duyệt Chromium + Playwright) với google.script.run GIẢ LẬP. Chỉ kiểm tra phía trình duyệt:
 * không có Apps Script thật phía sau. Chạy: node kiem_thu/chay_giao_dien.js [thư_mục_ảnh] */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_giao_dien'); fs.mkdirSync(RA, { recursive: true });
const inc = (t) => fs.readFileSync(path.join(GOC, t + '.html'), 'utf8');
let html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (m, n) => inc(n));
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
        const args = Array.from(arguments); window.__goi.push([ten, args]);
        const kq = window.__tra[ten]; let v = typeof kq === 'function' ? kq.apply(null, args) : kq;
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
    capNhatThongTinPhiTienTe: (p) => ({ maHoSo: p.maHoSo, trangThai: 'Nháp' }),
    luuHoSoGiaiNgan: (p) => ({ maHoSo: 'HS9', trangThai: 'Nháp' })
  }; };
  await pg.setContent(html, { waitUntil: 'domcontentloaded' });
  await pg.evaluate(nap);
  await pg.waitForTimeout(400);
  dat('Trang nạp không lỗi JavaScript', loiJs.length === 0, loiJs.join(' | '));

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
  await pg.evaluate(() => lichSuChungTuClick('CHUNG_TU_THANH_TOAN')); await pg.waitForTimeout(300);
  const lsm = await pg.textContent('#modalLichSuCT_tbody');
  dat('Lịch sử chứng từ hồ sơ (modal): L2 hiệu lực + L1 đã thay thế, link XLSX/PDF', await pg.isVisible('#modalLichSuCT') && /L2/.test(lsm) && /L1/.test(lsm) && /Đã thay thế/.test(lsm) && /645\.250\.000/.test(lsm));
  await pg.evaluate(() => { document.getElementById('modalLichSuCT').style.display = 'none'; });
  await pg.evaluate(() => { document.querySelectorAll('.ct-chon').forEach(c => { c.checked = c.value !== 'CHUNG_TU_THANH_TOAN'; }); xuatCacTaiLieuDaChon(); }); await pg.waitForTimeout(900);
  const mb = await pg.textContent('#msgBox');
  dat('Xuất nhiều tài liệu đã chọn: tổng hợp kết quả từng tài liệu (✅ Đề nghị, ❌ HDMB kèm lý do)', /Văn bản đề nghị giải ngân.*✅/.test(mb) && /HDMB_NGOAI_TE — ❌ Thiếu/.test(mb), mb);
  await pg.evaluate(() => moGoogleClick('HS0001-CHUNG_TU_THANH_TOAN-L2')); await pg.waitForTimeout(300);
  dat('"Mở bằng Google" gọi moBanGoogleCuaTaiLieu', await pg.evaluate(() => window.__goi.filter(g => g[0] === 'moBanGoogleCuaTaiLieu').length === 1));

  await pg.evaluate(() => { window.luuHoSo = window.__luuGoc; });
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
  dat('Không lỗi JavaScript trong suốt phiên', loiJs.length === 0, loiJs.join(' | '));
  await b.close();
  console.log(ket.join('\n') + `\n\nTỔNG: ${ket.length} khẳng định, ${ket.length - loi} đạt, ${loi} lỗi. Ảnh: ${RA}`);
  process.exit(loi ? 1 : 0);
})().catch(e => { console.log(ket.join('\n')); console.log('LỖI CHẠY:', e.message.split('\n')[0]); process.exit(2); });
