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
    layDanhMucPlaceholder: { chung: ['HO_SO.SO_TIEN', 'CONG_TY.TEN'], dong: ['CT.TEN', 'CT.SO_TIEN'] },
    layDanhSachMauDocx: [
      { maMau: 'DE_NGHI_USD', tenMau: 'Đề nghị <USD>', nganHang: 'BIDV', loaiTien: 'USD', loaiChungTu: 'DE_NGHI_GIAI_NGAN', soNguoiTu: 1, soNguoiDen: 999, phienBan: 2, trangThai: 'Hiệu lực', tenFile: 'a.docx', linkFile: 'https://x/y', canhBao: '', placeholder: '' },
      { maMau: 'DE_NGHI_USD', tenMau: 'Đề nghị USD', nganHang: 'BIDV', loaiTien: 'USD', loaiChungTu: 'DE_NGHI_GIAI_NGAN', soNguoiTu: 1, soNguoiDen: 999, phienBan: 1, trangThai: 'Hết hiệu lực', tenFile: 'a.docx', linkFile: '', canhBao: '' }],
    taiMauDocx: (meta, b64) => ({ ok: true, maMau: meta.maMau, phienBan: 3, canhBao: ['Trùng phạm vi'], placeholder: ['HO_SO.SO_TIEN'] }),
    xemThuMauDocx: { dat: false, loi: ['Còn placeholder chưa xử lý: {{CT.XYZ}}'], canhBao: [], soHangMau: 1, soHangTao: 0, soDong: 2 },
    layLichSuPhatHanh: [{ maHoSo: 'HS0001', loai: 'Văn bản đề nghị giải ngân', soLan: 2, mau: 'DE_NGHI_USD v2', nguon: 'MAU_DOCX', trangThai: 'Hiệu lực', linkDocx: 'https://d/1', linkPdf: 'https://p/1', linkXlsx: '', soDong: 5, tongTien: 25000, nguoi: 'a@b.c', ngay: '13/10/2026' }],
    capNhatThongTinPhiTienTe: (p) => ({ maHoSo: p.maHoSo, trangThai: 'Nháp' }),
    luuHoSoGiaiNgan: (p) => ({ maHoSo: 'HS9', trangThai: 'Nháp' })
  }; };
  await pg.setContent(html, { waitUntil: 'domcontentloaded' });
  await pg.evaluate(nap);
  await pg.waitForTimeout(400);
  dat('Trang nạp không lỗi JavaScript', loiJs.length === 0, loiJs.join(' | '));

  // --- Tab Mẫu Word ---
  await pg.evaluate(() => chuyenTab('mau')); await pg.waitForTimeout(300);
  dat('Tab Mẫu Word hiện, có cảnh báo chưa cấu hình quản trị', await pg.isVisible('#tab-mau') && /Chưa cấu hình danh sách quản trị/.test(await pg.textContent('#mau_canhBaoQuyen')));
  const hang = await pg.$$eval('#mau_tbody tr', r => r.map(x => x.textContent));
  dat('Bảng mẫu hiện 2 phiên bản; ký tự < > được escape (không bị chèn HTML)', hang.length === 2 && /Đề nghị <USD>/.test(hang[0]) && (await pg.$$('#mau_tbody b, #mau_tbody USD')).length === 0, hang[0]);
  dat('Nút "Ngưng" cho bản hiệu lực, "Đặt hiệu lực" cho bản cũ', /Ngưng/.test(hang[0]) && /Đặt hiệu lực/.test(hang[1]));
  dat('Danh mục placeholder hiển thị', /\{\{HO_SO\.SO_TIEN\}\}/.test(await pg.textContent('#mau_danhMuc')));
  // tải mẫu
  const f = path.join(GOC, 'mau_thu', 'DE_NGHI_USD.docx');
  await pg.fill('#mau_ma', 'DE_NGHI_USD'); await pg.fill('#mau_ten', 'x'); await pg.setInputFiles('#mau_file', f);
  await pg.evaluate(() => taiMauLenClick()); await pg.waitForTimeout(600);
  const goi = await pg.evaluate(() => window.__goi.filter(g => g[0] === 'taiMauDocx').map(g => ({ meta: g[1][0], len: g[1][1].length })));
  dat('Tải mẫu gửi đúng meta + nội dung base64 của file .docx', goi.length === 1 && goi[0].meta.maMau === 'DE_NGHI_USD' && goi[0].meta.tenFile === 'DE_NGHI_USD.docx' && goi[0].len > 1000 && goi[0].meta.soNguoiDen === '999');
  dat('Hiện kết quả tải: v3 + cảnh báo', /v3/.test(await pg.textContent('#mau_ketQua')) && /Trùng phạm vi/.test(await pg.textContent('#mau_ketQua')));
  await pg.setInputFiles('#mau_file', { name: 'a.doc', mimeType: 'application/msword', buffer: Buffer.from('x') });
  await pg.evaluate(() => taiMauLenClick()); await pg.waitForTimeout(200);
  dat('File .doc (không phải .docx) bị chặn ngay ở trình duyệt', /\.docx/.test(await pg.textContent('#msgBox')));
  await pg.fill('#mau_maHoSoThu', 'HS0001'); await pg.evaluate(() => chayThuMauClick('DE_NGHI_USD', 2)); await pg.waitForTimeout(300);
  dat('Chạy thử mẫu hiện lỗi placeholder', /CT\.XYZ/.test(await pg.textContent('#mau_ketQuaThu')));
  await pg.evaluate(() => taiLichSuPhatHanhClick()); await pg.waitForTimeout(300);
  const ls = await pg.textContent('#mau_lichSu');
  dat('Lịch sử phát hành: DOCX/PDF tách link, tổng tiền định dạng 25.000', /DOCX/.test(ls) && /PDF/.test(ls) && /25\.000/.test(ls) && (await pg.$$('#mau_lichSu a')).length === 2);
  await pg.screenshot({ path: path.join(RA, 'tab_mau_word.png') });

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
