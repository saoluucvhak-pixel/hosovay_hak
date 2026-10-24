// GIAO DIỆN: báo cáo "6. Dư nợ theo kỳ", xung đột khi sửa khách hàng / công ty (giữ nội dung đang nhập), khoá yêu cầu tạo khách hàng, gợi ý tên hạng mục bảo hiểm, nút kiểm tra môi trường thật.
// Chromium + google.script.run GIẢ LẬP (không phải Google thật).
const assert = require('assert/strict'); const fs = require('fs'), path = require('path');
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA: chưa cài Playwright'); process.exit(0); }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA: không có Chromium'); process.exit(0); }
  let loiTest = 0; const ok = (t) => console.log('PASS ' + t), hong = (t, e) => { loiTest++; console.log('FAIL ' + t + ' → ' + (e && e.message)); };
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://nl.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://nl.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40)), txt = (id) => document.getElementById(id).textContent; let xungDot = false;
      const bao = { tuNgay: '2026-10-01', denNgay: '2026-10-24', loaiTien: '', tong: { VND: { soKhoan: 2, dauKy: 1000000000, tang: 300000000, giamTra: 400000000, giamTatToan: 0, cuoiKy: 900000000, cuoiKyQuyDoiVND: 900000000, soKhoanThieuTyGia: 0 }, USD: { soKhoan: 1, dauKy: 0, tang: 10000.55, giamTra: 2500.25, giamTatToan: 0, cuoiKy: 7500.3, cuoiKyQuyDoiVND: 187507500, soKhoanThieuTyGia: 0 } }, quyDoiVNDTong: 1087507500, soKhoanThieuTyGia: 0, tongSoKhoan: 3, biCat: false,
        rows: [{ maHoSo: 'V1', soHopDong: 'HD-A', tenCty: 'Cty', loaiTien: 'VND', dauKy: 1000000000, tang: 0, giamTra: 400000000, giamTatToan: 0, cuoiKy: 600000000, cuoiKyQuyDoiVND: 600000000 }, { maHoSo: 'U1', soHopDong: 'HD-A', tenCty: 'Cty', loaiTien: 'USD', dauKy: 0, tang: 10000.55, giamTra: 2500.25, giamTatToan: 0, cuoiKy: 7500.3, cuoiKyQuyDoiVND: 187507500, thieuTyGia: false }] };
      const KH = [{ MaKH: 'KH001', TenKhachHang: 'Công ty Bán A', MaSoThue: '0100109106', SoTaiKhoan: '111', TaiNganHang: 'BIDV', DiaChi: '', Revision: 3 }];
      window.hakRun_ = () => { let ok, bad, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler(f) { bad = f; return P; } };
        const dang = (ten, tra, loiMsg) => { x[ten] = function (...a) { goi.push([ten, JSON.stringify(a)]); setTimeout(() => { const l = loiMsg && loiMsg(); if (l) bad({ message: l }); else ok(tra(...a)); }, 0); return P; }; };
        dang('layBaoCaoDuNoTheoKy', () => bao); dang('xuatBaoCaoDuNo', () => ({ tenFile: 'DuNo.xlsx', mime: 'x', base64: 'eA==', soDong: 3 }));
        dang('luuKhachHang', (p0) => ({ maKH: p0.maKH || 'KH002', revision: (Number(p0.expectedRevision) || 0) + 1 }), () => { if (xungDot) { xungDot = false; KH[0] = Object.assign({}, KH[0], { SoTaiKhoan: 'TK-NGUOI-KHAC', Revision: 4 }); return 'XUNG_DOT_PHIEN_BAN|4|Khách hàng KH001 đã được người khác thay đổi'; } return ''; });
        dang('luuCongTy', () => ({ maCty: 'CTY001', revision: 6 })); dang('kiemTraMoiTruongThat', () => ({ ok: false, soLoi: 1, buoc: [{ ten: 'Múi giờ', ok: false, ms: 5, ghi: 'sai múi giờ' }, { ten: 'Ghi khối', ok: true, ms: 120, ghi: '' }], ghiChu: 'ms là thời gian thật' }));
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      window.confirm = () => true; window.hoiXacNhan = (m, f) => f(); const loiHien = []; window.baoLoi = (m) => loiHien.push(String((m && m.message) || m)); window.baoThanhCong = () => {};
      window.AppDataStore.nap = function (m, t, f) { window.AppDataStore.khachHang = KH.slice(); if (f) f(); };
      AppDataStore.khachHang = KH.slice(); AppDataStore.congTy = [{ MaCty: 'CTY001', TenCty: 'Cty', Revision: 5 }]; AppDataStore.hopDong = [];
      // 1) Báo cáo 6
      chuyenTab('baocao'); chuyenBcSub_(6); await cho(); const mac = { tu: el_('bcDuNo_tuNgay').value, den: el_('bcDuNo_denNgay').value };
      taiBcDuNo_(); await cho(); if (!goi.find(g => g[0] === 'layBaoCaoDuNoTheoKy')) throw new Error('không gọi layBaoCaoDuNoTheoKy; goi=' + JSON.stringify(goi) + ' tom=' + txt('bcDuNo_tom')); const bc = { tom: txt('bcDuNo_tom'), dong: [...document.querySelectorAll('#bcDuNo_bang tbody tr')].map(r => r.textContent), goi: JSON.parse(goi.find(g => g[0] === 'layBaoCaoDuNoTheoKy')[1])[0] };
      el_('bcDuNo_loaiTien').value = 'USD'; goi.length = 0; xuatFileBcDuNo_('xlsx'); await cho(); const xuat = JSON.parse(goi.find(g => g[0] === 'xuatBaoCaoDuNo')[1])[0];
      // 2) Khách hàng: tạo mới gửi khoá yêu cầu giữ nguyên khi gửi lại; sửa gửi phiên bản; xung đột giữ nội dung
      themKhachHangMoiClick(); ['tenKhachHang', 'soTaiKhoan', 'taiNganHang'].forEach(k => { el_('kh_' + k).value = k + 'X'; }); goi.length = 0; luuKhachHangClick(); await cho();
      if (!goi.find(g => g[0] === 'luuKhachHang')) throw new Error('khong goi luuKhachHang; loi=' + loiHien.join('/') + ' goi=' + JSON.stringify(goi)); const taoMoi = JSON.parse(goi.find(g => g[0] === 'luuKhachHang')[1])[0];
      moKhachHangChiTiet('KH001'); el_('kh_soTaiKhoan').value = 'TK-DANG-GO'; goi.length = 0; xungDot = true; luuKhachHangClick(); await cho();
      const sua = JSON.parse(goi.find(g => g[0] === 'luuKhachHang')[1])[0]; const kh = { loi: loiHien.slice(-1)[0], stk: el_('kh_soTaiKhoan').value, banner: txt('kh_xungDot'), nutDe: !!document.querySelector('#kh_xungDot .btn-danger') };
      goi.length = 0; khLuuDe_(); await cho(); const de = JSON.parse(goi.find(g => g[0] === 'luuKhachHang')[1])[0];
      // 3) Công ty gửi phiên bản
      napFormCongTyDuyNhat_ && napFormCongTyDuyNhat_(); goi.length = 0; luuCongTyClick(); await cho(); const cty = goi.find(g => g[0] === 'luuCongTy') ? JSON.parse(goi.find(g => g[0] === 'luuCongTy')[1])[0] : null;
      // 4) kiểm tra môi trường thật
      chuyenTab('caidat'); chuyenTabCaiDat_('dongbo'); kiemTraMoiTruongClick_(); await cho(); const mt = txt('cd_moiTruong');
      return { mac, bc, xuat, taoMoi, sua, kh, de, cty, mt };
    });
    const homNay = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })), y = homNay.getFullYear(), m = String(homNay.getMonth() + 1).padStart(2, '0'), d = String(homNay.getDate()).padStart(2, '0');
    assert.deepEqual([kq.mac.tu, kq.mac.den], [`${y}-${m}-01`, `${y}-${m}-${d}`], 'bộ lọc mặc định: đầu tháng → hôm nay');
    assert.match(kq.bc.tom, /VND.*đầu kỳ 1\.000\.000\.000 \+ tăng 300\.000\.000 − trả gốc 400\.000\.000 − tất toán ngoài hệ thống 0 = cuối kỳ 900\.000\.000/); assert.match(kq.bc.tom, /USD.*cuối kỳ 7\.500,30.*187\.507\.500 VND/); assert.equal(kq.bc.dong.length, 2);
    assert.deepEqual([kq.xuat.loaiTien, kq.xuat.dinhDang], ['USD', 'xlsx']);
    ok('Giao diện: báo cáo “6. Dư nợ theo kỳ” — bộ lọc mặc định đầu tháng → hôm nay; hiện phương trình đầu kỳ + tăng − giảm = cuối kỳ từng loại tiền (USD tròn cent); xuất file đúng bộ lọc');
    assert.ok(/^KH/.test(kq.taoMoi.khoaYeuCau) && kq.taoMoi.khoaYeuCau.length > 8 && kq.taoMoi.expectedRevision === undefined, 'tạo mới: có khoá yêu cầu, không phiên bản');
    assert.deepEqual([kq.sua.maKH, kq.sua.expectedRevision, kq.sua.khoaYeuCau], ['KH001', 3, ''], 'sửa: gửi phiên bản đang xem');
    assert.match(kq.kh.loi, /XUNG_DOT_PHIEN_BAN/); assert.equal(kq.kh.stk, 'TK-DANG-GO', 'nội dung đang nhập được giữ'); assert.match(kq.kh.banner, /Có người khác vừa sửa khách hàng KH001.*GIỮ NGUYÊN.*TK-NGUOI-KHAC.*phiên bản 4/); assert.ok(kq.kh.nutDe);
    assert.deepEqual([kq.de.expectedRevision, kq.de.soTaiKhoan], [4, 'TK-DANG-GO'], 'lưu đè gửi phiên bản MỚI sau khi xác nhận');
    ok('Giao diện: khách hàng — khoá yêu cầu khi tạo, phiên bản khi sửa, xung đột giữ nội dung đang nhập và hiện bản của người khác để chọn nạp bản mới hoặc lưu đè');
    assert.ok(kq.cty && kq.cty.expectedRevision === 5, 'công ty gửi phiên bản đang xem: ' + JSON.stringify(kq.cty));
    ok('Giao diện: sửa công ty gửi phiên bản đang xem');
    assert.match(kq.mt, /Có 1 bước KHÔNG đạt/); assert.match(kq.mt, /Múi giờ.*✖ Không đạt.*5/); assert.match(kq.mt, /Ghi khối.*✔ Đạt.*120/);
    ok('Giao diện: nút “Kiểm tra môi trường & đo tốc độ thật” hiện từng bước kèm thời gian và kết quả đạt/không đạt bằng chữ');
    assert.deepEqual(loi, [], 'không lỗi JavaScript');
  } catch (e) { hong('Giao diện nhập liệu mới', e); }
  await b.close(); console.log('\nTỔNG: giao diện nhập liệu mới — ' + loiTest + ' lỗi'); process.exit(loiTest ? 1 : 0);
})();
