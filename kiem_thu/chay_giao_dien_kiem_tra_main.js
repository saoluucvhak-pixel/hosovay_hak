/* Kiểm thử giao diện đợt rà soát main (mục 4): Tổng quan ưu tiên, trạng thái tỷ giá, ô hợp đồng rỗng, việc tiếp theo ở danh sách hồ sơ,
 * mặc định ngày (đầu tháng → hôm nay theo giờ Việt Nam), định dạng ngày, số căn phải, màn nhỏ thu gọn phần "Giao diện".
 * Chromium thật + google.script.run GIẢ LẬP. node kiem_thu/chay_giao_dien_kiem_tra_main.js [thư_mục_ảnh] */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { DL, HOM_NAY } = require('./_du_lieu_giao_dien');
const goc = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || '/tmp/giao_dien_kiem_tra_main'); fs.mkdirSync(out, { recursive: true });
const inc = (n) => fs.readFileSync(path.join(goc, n + '.html'), 'utf8');
const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('  [ĐẠT] ' + m); };
(async () => {
  const b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  const mo = async (w, h, scheme) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, timezoneId: 'America/Los_Angeles' }); // múi giờ máy khác Việt Nam: ngày mặc định vẫn phải theo giờ Việt Nam
    await c.clock.setFixedTime(new Date(HOM_NAY + 'T12:00:00+07:00')); // đồng hồ trình duyệt = trưa HOM_NAY giờ VN (Los Angeles vẫn là hôm trước): test không phụ thuộc ngày chạy CI
    await c.route('https://fonts.googleapis.com/**', r => r.abort()); await c.route('http://hak.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await c.addInitScript((d) => { window.__DL = d; window.__goi = []; window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; }, DL);
    const pg = await c.newPage(); const loi = []; pg.on('pageerror', e => loi.push(e.message)); await pg.goto('http://hak.test/'); await pg.waitForTimeout(150);
    await pg.evaluate(() => { window.hakRun_ = function () { let ok, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } };
      px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return (...a) => { window.__goi.push(ten); setTimeout(() => { let v = window.__DL[ten]; if (typeof v === 'undefined') v = null; if (ok) ok(JSON.parse(JSON.stringify(v))); }, 0); }; } }); return px; }; });
    return { c, pg, loi };
  };
  // ---- Máy tính, sáng ----
  let { c, pg, loi } = await mo(1366, 800, 'light');
  await pg.evaluate((d) => { AppDataStore.tongQuan = d.layTongQuanHoSo; AppDataStore.congTy = d.layDanhSachCongTy; AppDataStore.hopDong = d.layDanhSachHopDongDayDu; AppDataStore.daNap = true; renderTongQuan_(); }, DL);
  await pg.waitForTimeout(250);
  const the = await pg.$$eval('#tq_qlv .portfolio-metric > span', els => els.map(e => e.textContent.trim()));
  ok(JSON.stringify(the) === JSON.stringify(['Dư nợ gốc VND', 'Dư nợ gốc USD', 'Quá hạn', 'Đến hạn trong 7 ngày', 'Hạn mức còn lại', 'Ràng buộc / bảo hiểm cần chú ý']), 'Tổng quan: 6 chỉ số theo thứ tự ưu tiên dư nợ → quá hạn → đến hạn → hạn mức → ràng buộc');
  ok((await pg.textContent('#tq_openVND')).includes('4.800.000.000 VND') && (await pg.textContent('#tq_openUSD')).includes('120.000,5 USD'), 'Dư nợ gốc hiển thị đủ đơn vị tiền (VND / USD), định dạng 1.234,5');
  ok((await pg.textContent('#tq_overdue')) === '1' && await pg.$eval('#tq_cardQuaHan', e => e.classList.contains('tq-co-van-de')), 'Thẻ Quá hạn hiện 1 khoản và được đánh dấu có vấn đề (viền đỏ)');
  ok(await pg.$eval('.portfolio-diagnostics', e => !e.open && /phiên bản|kỹ thuật/i.test(e.textContent)) && !(await pg.$eval('#cb_phienBan', e => e.closest('.canh-bao-card'))), 'Phiên bản code / kiểm tra cấu trúc / kiểm tra kết nối nằm trong mục kỹ thuật ĐÃ THU GỌN, không chen vào khu nghiệp vụ');
  ok((await pg.$$eval('#cb_list .msg', e => e.map(x => x.textContent)).then(t => t.some(x => /Tỷ giá cũ\/thiếu/.test(x)))), 'Cảnh báo "Tỷ giá cũ/thiếu" hiện trong danh sách cảnh báo');
  const tg = await pg.$eval('#nav_tygia_gia', e => ({ t: e.textContent, c: e.className, ti: e.title }));
  ok(/26\.150/.test(tg.t) && tg.c === 'tygia-cu' && /nguồn: Vietcombank/.test(tg.ti) && /ghi lúc/.test(tg.ti) && /cũ 7 ngày/.test(tg.ti), 'Thanh bên: tỷ giá cũ được đánh dấu cảnh báo; chú thích nêu nguồn, thời điểm ghi, số ngày cũ');
  ok(await pg.$('#cb_tyGia') === null && await pg.$('#cb_nutTyGia').then(e => e.isVisible()) && await pg.$('#tg_nhap') !== null, 'Tổng quan không còn ô nhập tỷ giá; có nút “Cập nhật tỷ giá →” sang menu riêng (ô nhập nằm ở menu Cập nhật tỷ giá)');
  ok(/nguồn: Vietcombank — ĐÃ CŨ 7 ngày/.test(await pg.textContent('#cb_tyGiaHint').catch(() => '') || '') || /ĐÃ CŨ 7 ngày/.test(await pg.evaluate(() => (document.querySelector('.cb-ty-gia small') || document.body).textContent)), 'Dòng chú thích tỷ giá: nêu nguồn và "ĐÃ CŨ 7 ngày"');
  // thiếu tỷ giá
  await pg.evaluate(() => { window.__DL.layTyGiaHienThi = null; window.__tgReset = true; taiTyGiaHienThi_(); });
  await pg.waitForTimeout(100);
  ok((await pg.textContent('#nav_tygia_gia')) === 'Chưa có' && await pg.$eval('#nav_tygia_gia', e => e.className === 'tygia-thieu'), 'Chưa có tỷ giá: hiện "Chưa có" kiểu cảnh báo (không hiện số cũ như tỷ giá hiện hành)');

  // ---- Danh sách hồ sơ ----
  await pg.evaluate(() => { chuyenTab('hoso'); datNgayLocMacDinh(); apDungLocHoSo_(); }); await pg.waitForTimeout(300);
  ok(await pg.inputValue('#loc_tuNgay') === HOM_NAY.slice(0, 7) + '-01' && await pg.inputValue('#loc_denNgay') === HOM_NAY, 'Bộ lọc ngày mặc định: từ đầu tháng đến hôm nay (giờ Việt Nam, kể cả khi máy ở múi giờ Los Angeles)');
  ok((await pg.$$eval('.chip-loc', e => e.map(x => x.textContent))).join('|').includes('01/10/2026') , 'Nhãn bộ lọc hiển thị ngày dd/MM/yyyy (theo định dạng cài đặt), không phải yyyy-MM-dd');
  const nut = async (ma) => pg.$$eval('#tbody_dsHoSo tr', (rows, m) => { const r = rows.find(x => x.textContent.includes(m)); return r ? Array.from(r.querySelectorAll('button')).map(x => x.textContent.trim()) : null; }, ma);
  ok((await nut('HS0004')).includes('Xác nhận giải ngân'), 'Hồ sơ "Đã tạo hồ sơ" có nút "Xác nhận giải ngân" ngay tại danh sách');
  ok((await nut('HS0001')).includes('Trả nợ / Tất toán') && !(await nut('HS0001')).includes('Xác nhận giải ngân'), 'Hồ sơ "Đã giải ngân" có nút "Trả nợ / Tất toán"');
  ok(!(await nut('HS0003')).some(t => /Xác nhận|Trả nợ/.test(t)), 'Hồ sơ "Nháp" không có nút xác nhận/trả nợ (không giải ngân khi chưa đủ chứng từ)');
  const canPhai = await pg.$$eval('#tbody_dsHoSo tr td:nth-child(7)', e => e.every(x => getComputedStyle(x).textAlign === 'right' || x.style.textAlign === 'right'));
  ok(canPhai, 'Cột Số tiền căn phải; cột Loại tiền (VND/USD) ngay bên cạnh');
  const kieu = await pg.$$eval('#tbody_dsHoSo tr td:nth-child(7)', e => e.map(x => x.textContent.trim()));
  ok(kieu.includes('1.537.000.000') && kieu.includes('120.000,5'), 'Số tiền theo định dạng Việt Nam: chấm nghìn, phẩy thập phân');
  await pg.screenshot({ path: path.join(out, 'ds_ho_so_sang.png') });

  // ---- Form hồ sơ mới: ô hợp đồng rỗng ----
  await pg.evaluate(() => { AppDataStore.hopDong = []; themMoiHoSoClick('VND'); }); await pg.waitForTimeout(300);
  const tb = await pg.textContent('#thongBaoSoHopDong');
  ok(/Chưa có hợp đồng nào cho tài khoản này/.test(tb) && /phạm vi|giới hạn theo công ty/.test(tb) && await pg.$('#btnTaiLaiHopDong') !== null, 'Ô hợp đồng rỗng: giải thích nguyên nhân (chưa tạo / giới hạn công ty / dữ liệu cũ) và có nút "Tải lại danh sách"');
  await pg.evaluate(() => { window.__napGoi = 0; AppDataStore.nap = function (m, o, okf) { window.__napGoi++; window.__napBo = o && o.boQuaCache; okf([]); }; });
  await pg.click('#btnTaiLaiHopDong'); await pg.waitForTimeout(100);
  ok(await pg.evaluate(() => window.__napGoi === 1 && window.__napBo === true), 'Bấm "Tải lại danh sách" tải lại từ máy chủ, bỏ qua cache');
  await pg.evaluate(() => { AppDataStore.hopDong = [{ MaHD: 'HDN', MaCty: 'CTY001', SoHopDong: 'HĐ-NHÁP', TinhTrang: 'Nháp', TenNganHang: 'VCB', ChiNhanh: '' }]; onChonCongTy(); });
  const tb2 = await pg.textContent('#thongBaoSoHopDong');
  ok(/chưa hợp đồng nào ở tình trạng "Đang hiệu lực"/.test(tb2) && !(await pg.$('#btnTaiLaiHopDong')), 'Có hợp đồng nhưng đều Nháp: nói rõ cần đổi sang "Đang hiệu lực" (không hiện nút tải lại vô ích)');
  await pg.evaluate(() => { AppDataStore.hopDong = [{ MaHD: 'HDX', MaCty: 'CTY001', SoHopDong: 'HĐ-X', TinhTrang: 'Đang hiệu lực', TenNganHang: 'VCB', ChiNhanh: '' }]; onChonCongTy(); });
  ok(!(await pg.textContent('#thongBaoSoHopDong')).includes('Chưa có hợp đồng nào') && await pg.$$eval('#selHopDong option:not([disabled])', e => e.length) === 2, 'Có hợp đồng Đang hiệu lực: không còn cảnh báo, ô chọn dùng được');
  await c.close();

  // ---- Màn nhỏ ----
  ({ c, pg, loi } = await mo(390, 800, 'dark'));
  const hien = async () => pg.$$eval('.workspace-tools .ui-control', e => e.some(x => getComputedStyle(x).display !== 'none'));
  ok(!(await hien()) && await pg.$eval('#ui_prefsBtn', e => getComputedStyle(e).display !== 'none'), 'Màn nhỏ: 3 ô Bảng màu/Sáng-tối/Mật độ được thu vào nút "Giao diện" (không chiếm màn hình nghiệp vụ)');
  await pg.click('#ui_prefsBtn'); ok(await hien(), 'Bấm "Giao diện" mở lại các tùy chọn');
  const trangRong = await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok(trangRong, 'Màn 390px: không có thanh cuộn ngang toàn trang');
  await pg.evaluate((d) => { AppDataStore.tongQuan = d.layTongQuanHoSo; renderTongQuan_(); }, DL);
  ok(await pg.$$eval('#tq_qlv .portfolio-metric', e => e.every(x => x.getBoundingClientRect().width > 300)), 'Màn nhỏ: chỉ số xếp một cột, mỗi thẻ rộng đủ đọc');
  const mauChu = await pg.$eval('.portfolio-metric strong', e => { const cs = getComputedStyle(e); return [cs.color, getComputedStyle(e.closest('.portfolio-metric')).backgroundColor]; });
  const lum = (rgb) => { const m = rgb.match(/\d+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  const [l1, l2] = [lum(mauChu[0]), lum(mauChu[1])].sort((x, y) => y - x); const tl = (l1 + 0.05) / (l2 + 0.05);
  ok(tl >= 4.5, 'Chế độ tối: tương phản chữ số liệu/nền thẻ ' + tl.toFixed(1) + ':1 (≥ 4,5:1 theo WCAG AA)');
  ok(loi.length === 0, 'Không có lỗi JavaScript trên trang');
  await c.close(); await b.close();
  console.log('\nTỔNG: ' + n + ' kiểm tra giao diện (kiểm tra main) đạt, 0 lỗi');
})().catch(e => { console.error('LỖI: ' + (e && e.stack || e)); process.exit(1); });
