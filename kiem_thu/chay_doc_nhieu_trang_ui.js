/* Giao diện ĐỌC TÀI LIỆU NHIỀU TRANG + ĐỐI CHIẾU trên Chromium thật (pdf.js thật từ cdnjs, google.script.run GIẢ LẬP — không có OCR Google thật).
 * Tệp PDF do test tự sinh (không dùng chứng từ thật). Tùy chọn: node kiem_thu/chay_doc_nhieu_trang_ui.js [thư_mục_ra] [tệp.pdf thật để thử thêm]
 * Kiểm: dựng đủ mọi trang thành ảnh JPEG + lấy lớp chữ, gửi TỪNG trang lên docTrangTaiLieu, gom → bảng mỗi chứng từ 1 dòng, bỏ chọn/sửa tiền
 * cập nhật tổng, lưu gửi đúng tệp gốc + các dòng đã chọn; bảng đối chiếu hiện khớp/lệch/thiếu. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const goc = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || '/tmp/doc_nhieu_trang_ui'), pdfThat = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const M = require('./_mau_ocr_hoa_don');
const inc = (n) => fs.readFileSync(path.join(goc, n + '.html'), 'utf8');
const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');

/** PDF tối giản N trang, mỗi trang vài dòng chữ ASCII (Helvetica) — đủ để pdf.js dựng ảnh + lấy lớp chữ. */
function taoPdf(dsTrang) {
  const obj = [], add = (s) => { obj.push(s); return obj.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids = [];
  const pagesIdx = obj.length + 1 + dsTrang.length * 2; // số hiệu đối tượng Pages (đặt cuối)
  dsTrang.forEach((dong) => {
    const noiDung = 'BT /F1 14 Tf 60 780 Td ' + dong.map((d, i) => (i ? '0 -22 Td ' : '') + '(' + d.replace(/[()\\]/g, '') + ') Tj').join(' ') + ' ET';
    const c = add('<< /Length ' + noiDung.length + ' >>\nstream\n' + noiDung + '\nendstream');
    kids.push(add('<< /Type /Page /Parent ' + pagesIdx + ' 0 R /MediaBox [0 0 595 842] /Contents ' + c + ' 0 R /Resources << /Font << /F1 ' + font + ' 0 R >> >> >>'));
  });
  add('<< /Type /Pages /Kids [' + kids.map(k => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>');
  const cat = add('<< /Type /Catalog /Pages ' + pagesIdx + ' 0 R >>');
  let s = '%PDF-1.4\n'; const off = [];
  obj.forEach((o, i) => { off.push(s.length); s += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const x = s.length;
  s += 'xref\n0 ' + (obj.length + 1) + '\n0000000000 65535 f \n' + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + 'trailer\n<< /Size ' + (obj.length + 1) + ' /Root ' + cat + ' 0 R >>\nstartxref\n' + x + '\n%%EOF';
  return Buffer.from(s, 'latin1');
}

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('  [ĐẠT] ' + m); };
(async () => {
  const vm = require('node:vm'), ctxS = { console }; vm.createContext(ctxS);
  ['OCRSERVICE.gs', 'HOADONNHIEUTRANG.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(goc, f), 'utf8'), ctxS, { filename: f }));
  const gomThat = (ds) => ({ soTrang: ds.length, chungTu: JSON.parse(JSON.stringify(ctxS.gomTrangThanhChungTu_(ds, [M.MST_CONG_TY]))) }); // dùng đúng hàm gom của máy chủ
  const pdf = taoPdf(M.TEP_A.map((t, i) => ['HOA DON GIA TRI GIA TANG trang ' + (i + 1), 'So: ' + M.KQ_A[i].so, 'Tong cong: ' + M.KQ_A[i].tong]));
  const tepPdf = path.join(out, 'mau_7_trang.pdf'); fs.writeFileSync(tepPdf, pdf);

  const b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] });
  const chay = async (tep, vanBanTrang) => {
    const c = await b.newContext({ viewport: { width: 1366, height: 900 } });
    await c.route('https://fonts.googleapis.com/**', r => r.abort()); await c.route('http://hak.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await c.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    const pg = await c.newPage(); const loi = []; pg.on('pageerror', e => loi.push(e.message));
    await pg.goto('http://hak.test/'); await pg.waitForTimeout(150);
    await pg.exposeFunction('__gom', (ds) => gomThat(ds.map(t => ({ soTrang: t.soTrang, vanBan: vanBanTrang ? vanBanTrang[t.soTrang - 1] : t.vanBan }))));
    await pg.evaluate(() => {
      window.__goi = [];
      window.hakRun_ = function () {
        let ok, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } };
        px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return (...a) => {
          window.__goi.push({ ten, a });
          const tra = (v) => setTimeout(() => ok(JSON.parse(JSON.stringify(v))), 0);
          if (ten === 'docTrangTaiLieu') tra({ soTrang: a[0].soTrang, nguon: 'OCR', vanBan: a[0].lopChu });
          else if (ten === 'gomChungTuTuTrang') window.__gom(a[0]).then(tra);
          else if (ten === 'luuChungTuNhieuTrang') tra({ ok: true, soDong: a[2].length, tenFile: a[1].ten, maTaiLieu: 'TL0099', maHoaDon: [] });
          else tra(null);
        }; } });
        return px;
      };
    });
    const ketQua = await pg.evaluate((tenTep) => new Promise((res) => {
      fetch('/tep').catch(() => {}); // không dùng mạng cho tệp: tệp đưa vào qua input
      res(tenTep);
    }), path.basename(tep));
    // Đưa tệp qua input ẩn rồi gọi đúng luồng đọc nhiều trang
    await pg.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = '__tep'; document.body.appendChild(i); });
    await pg.setInputFiles('#__tep', tep);
    await pg.evaluate(() => { window.__xong = undefined; docTepNhieuTrang_(document.getElementById('__tep').files[0], 'HS-UI', (kq) => { window.__xong = kq; }); });
    await pg.waitForFunction(() => document.querySelectorAll('#dnt_ketQua tbody tr').length > 0 || /⚠/.test(document.getElementById('dnt_tienDo').textContent), null, { timeout: 120000 });
    return { c, pg, loi, ketQua };
  };

  // ---- 1. PDF 7 trang tự sinh
  let { c, pg, loi } = await chay(tepPdf, M.TEP_A);
  const goiTrang = await pg.evaluate(() => window.__goi.filter(g => g.ten === 'docTrangTaiLieu').map(g => ({ so: g.a[0].soTrang, lop: g.a[0].lopChu, anh: g.a[0].anhBase64.length, mime: g.a[0].mime })));
  ok(goiTrang.length === 7 && goiTrang.every((g, i) => g.so === i + 1), 'pdf.js dựng đủ 7 trang, gửi TỪNG trang lên docTrangTaiLieu theo thứ tự');
  ok(goiTrang.every(g => g.mime === 'image/jpeg' && g.anh > 5000 && g.anh < 8 * 1024 * 1024 * 1.4), 'Mỗi trang kèm ảnh JPEG (đủ lớn để OCR, dưới trần 8 MB)');
  ok(goiTrang.every((g, i) => g.lop.includes('So: ' + M.KQ_A[i].so)), 'Lớp chữ của từng trang được lấy kèm (để máy chủ dùng thay OCR khi đủ tốt)');
  ok(await pg.$$eval('#dnt_ketQua tbody tr', r => r.length) === 7, 'Bảng xem lại: 7 chứng từ, mỗi chứng từ 1 dòng');
  const tongHien = await pg.$eval('#dnt_ketQua tfoot', e => e.textContent), tong7 = M.KQ_A.reduce((s, x) => s + x.tong, 0);
  ok(/Đã chọn 7\/7/.test(tongHien) && tongHien.includes(fmt(tong7)), 'Dòng tổng: đã chọn 7/7, tổng tiền ' + fmt(tong7));
  await pg.click('#dnt_ketQua tbody tr:nth-child(3) .dnt-chon');
  ok(/Đã chọn 6\/7/.test(await pg.$eval('#dnt_ketQua tfoot', e => e.textContent)), 'Bỏ chọn 1 dòng: tổng cập nhật (6/7)');
  await pg.fill('#dnt_ketQua tbody tr:nth-child(1) .dnt-o[data-k="tongTien"]', '40.000.000'); await pg.press('#dnt_ketQua tbody tr:nth-child(1) .dnt-o[data-k="tongTien"]', 'Tab');
  ok((await pg.$eval('#dnt_ketQua tfoot', e => e.textContent)).includes(fmt(tong7 - 17250000 - (40716000 - 40000000))), 'Sửa tổng tiền 1 dòng → tổng chọn cập nhật đúng');
  await pg.screenshot({ path: path.join(out, 'bang_xem_sua.png') });
  await pg.click('#dnt_nutLuu'); await pg.waitForFunction(() => window.__xong !== undefined);
  const luu = await pg.evaluate(() => window.__goi.filter(g => g.ten === 'luuChungTuNhieuTrang')[0].a);
  ok(luu[0] === 'HS-UI' && luu[1].ten === 'mau_7_trang.pdf' && Buffer.from(luu[1].base64, 'base64').length === pdf.length, 'Lưu: đúng hồ sơ, gửi đúng TỆP GỐC (đủ byte)');
  ok(luu[2].length === 6 && luu[2][0].tongTien === 40000000 && !luu[2].some(x => x.soHoaDon === '00008322') && luu[2].every(x => x.trangTu && x.trangDen), 'Chỉ gửi 6 dòng đã chọn, kèm số trang và tiền đã sửa');
  ok(await pg.$eval('#modalDocNhieuTrang', e => getComputedStyle(e).display === 'none'), 'Lưu xong đóng bảng');
  await pg.screenshot({ path: path.join(out, 'doc_nhieu_trang.png') });

  // ---- 2. Bảng đối chiếu
  await pg.evaluate(() => {
    const kq = { maHoSo: 'HS-UI', loaiTien: 'VND', soTienHoSo: 1066135847, canhBaoTien: '',
      dong: [{ loai: 'Hóa đơn GTGT', kyHieu: '1C26TBR', soHoaDon: '00002141', ngay: '13/10/2026', ncc: 'CAO SU', mst: '0301234567', trang: '1', tienChungTu: 40716000, dongHoSo: [{ stt: 1, nguoiHuong: 'CAO SU', soTien: 40716000, soTienVND: 40716000, cachGhep: 'SO_HOA_DON' }], tienHoSo: 40716000, chenhLech: 0, trangThai: 'KHOP' },
        { loai: 'Hóa đơn GTGT', kyHieu: '1K26TQA', soHoaDon: '00008321', ngay: '22/10/2026', ncc: 'XĂNG DẦU', mst: '4300111222-020', trang: '2', tienChungTu: 17250000, dongHoSo: [{ stt: 2, nguoiHuong: 'XĂNG DẦU', soTien: 17000000, soTienVND: 17000000, cachGhep: 'SO_HOA_DON' }], tienHoSo: 17000000, chenhLech: -250000, trangThai: 'LECH' },
        { loai: 'Hóa đơn GTGT', kyHieu: '1K26TQA', soHoaDon: '00008322', ngay: '22/10/2026', ncc: 'XĂNG DẦU', mst: '4300111222-020', trang: '3', tienChungTu: 17250000, dongHoSo: [], tienHoSo: 0, chenhLech: -17250000, trangThai: 'CHUA_DUNG' }],
      dongThieuChungTu: [{ stt: 4, nguoiHuong: 'NCC KHÁC', loaiChungTu: 'Thanh toán tiền hàng', taiLieuSo: '99999', soTien: 5000000, soTienVND: 5000000 }],
      luong: { coDongLuong: true, tienHoSo: 61650000, tienBangLuong: 61650000, chenhLech: 0, khop: true },
      tong: { chungTu: 75216000, chungTuDaGhep: 57966000, chiTietHoSo: 124366000, chenhLech: 4750000, soKhop: 1, soLech: 1, soChuaDung: 1, soThieu: 1 } };
    window.hakRun_ = function () { let ok, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } }; px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return () => setTimeout(() => ok(kq), 0); } }); return px; };
    moDoiChieuTaiLieu_('HS-UI');
  });
  await pg.waitForSelector('#dctl_noiDung table');
  const dc = await pg.$eval('#dctl_noiDung', e => e.textContent);
  ok(/Khớp 1 · Lệch 1 · Chứng từ chưa gắn 1 · Dòng hồ sơ thiếu chứng từ 1/.test(dc) && dc.includes('Chênh lệch: 4.750.000'), 'Đối chiếu: tóm tắt khớp/lệch/chưa gắn/thiếu + chênh lệch tổng');
  ok(await pg.$$eval('#dctl_noiDung table:first-of-type tbody tr', r => r.length) === 3 && dc.includes('-250.000') && /Dòng thụ hưởng chưa có chứng từ/.test(dc) && /Bảng lương đã tải: 61\.650\.000/.test(dc), 'Mỗi chứng từ 1 dòng, chênh lệch từng dòng, dòng thiếu chứng từ, phần lương');
  await pg.screenshot({ path: path.join(out, 'doi_chieu.png') });
  // ---- 3. Bảng tổng hợp bảng lương (theo tệp + bộ phận) và bảo hiểm (theo tháng, 2 nguồn)
  await pg.evaluate(() => {
    el_('luong_tonghop_tep').innerHTML = htmlTongHopLuongTheoTep_([{ maTaiLieu: 'TL1', maHoSo: 'HS-UI', thang: '09/2026', tenFile: 'Luong T9.xlsx', soNguoi: 12, coSTK: 12, tongTien: 123456000, tongThucLinhBoPhan: 123456000, khopBoPhan: true,
      boPhan: [{ boPhan: 'Bộ phận A', soNguoi: 7, thucLinh: 60000000, bhxh: 4800000, bhyt: 900000, bhtn: 600000, kpcd: 300000 }, { boPhan: 'Lương tài xế', soNguoi: 5, thucLinh: 63456000, bhxh: 2400000, bhyt: 450000, bhtn: 300000, kpcd: 150000 }] }]);
    el_('bh_tonghop').innerHTML = htmlTongHopBaoHiem_([{ thang: '10/2026',
      bangBH: [{ nguon: 'OCR', tenFile: 'BH T10 mau.pdf', trang: '1–2', soLaoDong: 32, mucLuong: 200000000, dnDong: 43000000, nldDong: 21000000, tongNop: 64000000, maHoSo: 'HS-UI' }],
      tongBangBH: { soLaoDong: 32, dnDong: 43000000, nldDong: 21000000, tongNop: 64000000 } }]);
  });
  const th = await pg.$eval('#luong_tonghop_tep', e => e.textContent), bhx = await pg.$eval('#bh_tonghop', e => e.textContent);
  ok(/12 người \(12 có STK\)/.test(th) && th.includes('123.456.000') && /✓ khớp/.test(th) && th.includes('Bộ phận A') && th.includes('4.800.000'), 'Bảng tổng hợp bảng lương: theo tệp/tháng (số người, có STK, tổng, khớp bộ phận) + từng bộ phận với khấu trừ BH');
  ok(!bhx.includes('Bảng lương') && !/Chênh lệch/.test(bhx) && bhx.includes('Bảng đóng BH (trang 1–2)') && bhx.includes('OCR') && bhx.includes('64.000.000') && bhx.includes('43.000.000'), 'Bảng tổng hợp bảo hiểm: chỉ nguồn OCR/nhập riêng, độc lập với bảng lương');
  ok(!loi.length, 'Không lỗi JavaScript' + (loi.length ? ': ' + loi.join(' | ') : ''));
  await c.close();

  // ---- 4. Trang scan nằm ngang: OCR kém → tự thử xoay 90° rồi 270°, giữ bản điểm cao nhất (ở đây bản 270° đọc ra bảng bảo hiểm)
  const pdf1 = taoPdf([['DONG BAO HIEM (trang nam ngang)']]), tep1 = path.join(out, 'bao_hiem_ngang.pdf'); fs.writeFileSync(tep1, pdf1);
  ({ c, pg, loi } = await chay(tep1, [M.TEP_B[0] + '\n' + M.TEP_B[1]]));
  await pg.close();
  const pg2 = await c.newPage(); pg2.on('pageerror', e => loi.push(e.message));
  await pg2.goto('http://hak.test/'); await pg2.waitForTimeout(150);
  await pg2.evaluate((vb) => {
    window.__goi = []; window.__lan = 0;
    window.hakRun_ = function () {
      let ok, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } };
      px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return (...a) => {
        window.__goi.push({ ten, anh: a[0] && a[0].anhBase64 ? a[0].anhBase64.length : 0 });
        const tra = (v) => setTimeout(() => ok(JSON.parse(JSON.stringify(v))), 0);
        if (ten === 'docTrangTaiLieu') { const lan = window.__lan++; tra(lan < 2 ? { soTrang: 1, nguon: 'OCR', vanBan: 'ia ndd .I rnn', diem: 5 + lan, nenThuXoay: true } : { soTrang: 1, nguon: 'OCR', vanBan: vb, diem: 60, nenThuXoay: false }); }
        else if (ten === 'gomChungTuTuTrang') window.__gom(a[0]).then(tra);
        else tra(null);
      }; } });
      return px;
    };
  }, M.TEP_B[0] + '\n' + M.TEP_B[1]);
  await pg2.exposeFunction('__gom', (ds) => gomThat(ds));
  await pg2.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = '__tep'; document.body.appendChild(i); });
  await pg2.setInputFiles('#__tep', tep1);
  await pg2.evaluate(() => { docTepNhieuTrang_(document.getElementById('__tep').files[0], 'HS-UI', () => {}); });
  await pg2.waitForFunction(() => document.querySelectorAll('#dnt_ketQua tbody tr').length > 0, null, { timeout: 120000 });
  const goiXoay = await pg2.evaluate(() => window.__goi.filter(g => g.ten === 'docTrangTaiLieu').length);
  const hang = await pg2.$eval('#dnt_ketQua tbody tr', e => e.textContent);
  ok(goiXoay === 3, 'Trang OCR kém được gửi lại 2 lần (xoay 90°, 270°) — tổng 3 lần');
  const tongO = await pg2.$eval('#dnt_ketQua tbody tr .dnt-o[data-k="tongTien"]', e => e.value);
  ok(/Bảng đóng bảo hiểm/.test(hang) && hang.includes('10/2026') && hang.includes('32 LĐ') && tongO === '64.000.000' && hang.includes('DN 43.000.000') && await pg2.$eval('#dnt_ketQua tbody tr .dnt-chon', e => e.checked),
    'Giữ bản xoay đọc tốt nhất → bảng bảo hiểm: tháng, số LĐ, mức lương, DN/NLĐ, tổng nộp ' + tongO + '; được chọn sẵn để lưu');
  ok(!loi.length, 'Không lỗi JavaScript (luồng xoay trang)' + (loi.length ? ': ' + loi.join(' | ') : ''));
  await pg2.screenshot({ path: path.join(out, 'bao_hiem_xoay.png') });
  // ---- 5. Google giới hạn tốc độ OCR: trang bị giới hạn được chờ rồi đọc lại (không bỏ trang, không báo lỗi trang)
  await pg2.evaluate((vb) => {
    window.__goi = []; window.__lan = 0; DNT_CHO_GIOI_HAN_MS_ = 30; DNT_NGHI_GIUA_OCR_MS_ = 0;
    const cu = window.hakRun_;
    window.hakRun_ = function () {
      let ok, px; const ch = { withSuccessHandler(f) { ok = f; return px; }, withFailureHandler() { return px; } };
      px = new Proxy(ch, { get(t, ten) { if (ten in t) return t[ten]; return (...a) => {
        window.__goi.push({ ten });
        const tra = (v) => setTimeout(() => ok(JSON.parse(JSON.stringify(v))), 0);
        if (ten === 'docTrangTaiLieu') { const lan = window.__lan++; tra(lan < 2 ? { soTrang: 1, nguon: 'LOI', gioiHan: true, vanBan: '', loi: 'OCR trang 1 lỗi: Google đang giới hạn số lần OCR' } : { soTrang: 1, nguon: 'OCR', vanBan: vb, diem: 60, nenThuXoay: false }); }
        else if (ten === 'gomChungTuTuTrang') window.__gom(a[0]).then(tra);
        else tra(null);
      }; } });
      return px;
    };
    document.getElementById('dnt_ketQua').innerHTML = '';
    try { localStorage.setItem('hak_che_do_ocr', 'GOOGLE'); } catch (e) { /* bỏ qua */ } // ca này kiểm nhịp chờ của Google
    docTepNhieuTrang_(document.getElementById('__tep').files[0], 'HS-UI', () => {});
  }, M.TEP_B[0] + '\n' + M.TEP_B[1]);
  await pg2.waitForFunction(() => document.querySelectorAll('#dnt_ketQua tbody tr').length > 0, null, { timeout: 120000 });
  const gh = await pg2.evaluate(() => ({ goi: window.__goi.filter(g => g.ten === 'docTrangTaiLieu').length, tienDo: document.getElementById('dnt_tienDo').textContent, an: document.getElementById('dnt_tienDo').style.display }));
  ok(gh.goi === 3 && !/giới hạn/.test(gh.an === 'none' ? '' : gh.tienDo), 'Bị Google giới hạn OCR 2 lần: chờ rồi đọc lại đúng trang (3 lần gọi), đọc được, không còn báo lỗi trang ' + JSON.stringify(gh));
  await c.close();

  // ---- 3. (tùy chọn) PDF thật trên máy người chạy — không đưa vào repo
  if (pdfThat) {
    ({ c, pg, loi } = await chay(path.resolve(pdfThat), null));
    const g = await pg.evaluate(() => window.__goi.filter(x => x.ten === 'docTrangTaiLieu').map(x => ({ so: x.a[0].soTrang, kb: Math.round(x.a[0].anhBase64.length * 0.75 / 1024), chu: x.a[0].lopChu.length })));
    console.log('  [PDF THẬT] ' + path.basename(pdfThat) + ': ' + g.length + ' trang → ' + g.map(x => 'tr' + x.so + ' ' + x.kb + 'KB/lớp chữ ' + x.chu).join(', '));
    ok(g.length > 0 && !loi.length, 'PDF thật dựng được mọi trang, không lỗi JavaScript');
    await pg.screenshot({ path: path.join(out, 'pdf_that.png') });
    await c.close();
  }
  await b.close();
  console.log('\nTỔNG: ' + n + ' kiểm tra giao diện đọc nhiều trang / đối chiếu đạt, 0 lỗi. Ảnh: ' + out);
})().catch(e => { console.error('LỖI:', e); process.exit(1); });
function fmt(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
