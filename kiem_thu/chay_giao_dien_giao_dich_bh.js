// GIAO DIỆN luồng nhập → sửa → xung đột → phục hồi (Chromium + google.script.run GIẢ LẬP; KHÔNG phải Google thật).
// Kiểm tra: khoá yêu cầu tạo tài sản giữ nguyên khi gửi lại; xung đột hai phiên giữ nội dung đang nhập; màn hình xác minh/phục hồi nói đúng kết quả máy chủ; kết quả Excel "chưa xác định".
// Ảnh chụp (MÔ PHỎNG) lưu ở thư mục HAK_ANH_DIR (mặc định: thư mục tạm).
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), os = require('os');
const anhDir = process.env.HAK_ANH_DIR || path.join(os.tmpdir(), 'hosovay_anh_giao_dich'); fs.mkdirSync(anhDir, { recursive: true });
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA giao diện giao dịch bảo hiểm: chưa cài Playwright'); process.exit(0); }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA giao diện giao dịch bảo hiểm: không có Chromium'); process.exit(0); }
  let loiTest = 0;
  const ok = (ten) => console.log('PASS ' + ten), hong = (ten, e) => { loiTest++; console.log('FAIL ' + ten + ' → ' + (e && e.message)); };
  try {
    const p = await b.newPage({ viewport: { width: 1180, height: 900 } }); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://gd.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://gd.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40)), txt = (id) => document.getElementById(id).textContent;
      let hongLuu = 1, revBH = 4, conflict = false, trangThaiXM = 'DA_CHOT';
      const hopDongBH = () => ({ maBH: 'BH-0003', soHDBaoHiem: revBH > 4 ? 'S-NGUOI-KHAC' : 'S-GOC', ngayKyHD: '2026-01-05', congTyBaoHiem: 'Bảo Việt', trangThai: 'Hiệu lực', ghiChu: '', lyDoHuy: '', denNgayCuoi: '2027-01-05', soNgay: 200, canhBao: '', tinhTrangRieng: 'DANG_BAO_HIEM', revision: revBH,
        chiTiet: [{ stt: 1, maTaiSan: '', tenTaiSan: 'Kho A', giaTriBH: 5, phiBH: 1, tienBH: revBH > 4 ? 999 : 1, tuNgay: '2026-01-05', denNgay: '2027-01-05', tinhTrang: 'DANG_BAO_HIEM' }], tong: { giaTriBH: 5, phiBH: 1, tienBH: 1 } });
      window.hakRun_ = () => { let ok, bad, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler(f) { bad = f; return P; } };
        const dang = (ten, tra, loiMsg) => { x[ten] = function (...a) { goi.push([ten, JSON.stringify(a)]); setTimeout(() => { const l = loiMsg && loiMsg(); if (l) bad({ message: l }); else ok(tra(...a)); }, 0); return P; }; };
        dang('layTaiSanBaoDam', () => ({ rows: [], tongGiaTriDangBaoDam: 0, loaiTaiSan: { BDS: 'BĐS' } }));
        dang('layBaoHiemTaiSan', () => ({ maTS: 'TS-1', maHD: 'HD1', soHopDong: 'HD-A', moTa: 'Tài sản thử', giaTri: 100, trangThai: 'Đang bảo đảm', revisionTS: 2, nguongCanhBaoNgay: 15, baoVe: null, hopDong: [hopDongBH()] }));
        dang('luuTaiSanBaoDam', () => ({ maTS: 'TS-9', daSua: false, revision: 1 }), () => (hongLuu-- > 0 ? 'Mất kết nối giả lập' : ''));
        dang('luuBaoHiemTaiSan', () => ({ maBH: 'BH-0003', revision: 6, canhBao: [] }), () => { if (conflict) { revBH = 5; conflict = false; return 'XUNG_DOT_PHIEN_BAN|5|Hợp đồng bảo hiểm BH-0003 đã được người khác thay đổi'; } return ''; });
        dang('layTrangThaiToanVenBaoHiem', () => ({ dongMoCoi: 0, dongTheHeCu: 1, hopDongHong: ['BH-0003'], canXacMinh: ['BH-0003', 'BH-0008'], canPhucHoi: true }));
        dang('xacMinhPhucHoiBaoHiem', () => ({ maBH: 'BH-0003', trangThai: window.__ttXM || 'DA_CHOT', thongBao: 'Không có thế hệ nào đủ dữ liệu.' }));
        dang('apDungCapNhatTSDB', () => window.__apDungKq);
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      window.hoiXacNhan = (m, f) => f(); const loiHien = []; window.baoLoi = (m) => { loiHien.push(String((m && m.message) || m)); }; const dongHien = []; window.baoThanhCong = (m) => { dongHien.push(String(m)); };
      AppDataStore.hopDong = [{ MaHD: 'HD1', MaCty: 'C1', SoHopDong: 'HD-A', TenNganHang: 'BIDV', NgayHopDong: '2026-01-01', HanMucVay: 1e9, Revision: 1 }]; AppDataStore.congTy = [{ MaCty: 'C1', TenCty: 'Cty' }];
      MA_HD_DANG_XEM = 'HD1';
      // 1) đăng ký thế chấp: lần đầu mất kết nối → bấm lại phải gửi CÙNG khoá yêu cầu; mở form mới → khoá mới
      moModalTheChap_(); el_('tc_moTa').value = 'Nhà xưởng A'; el_('tc_giaTri').value = '1.000.000'; goi.length = 0; luuTheChapClick_(); await cho(); luuTheChapClick_(); await cho();
      const luu = goi.filter(g => g[0] === 'luuTaiSanBaoDam').map(g => JSON.parse(g[1])[0].khoaYeuCau); const khoaCu = luu[0]; dongModalTheChap_(); moModalTheChap_();
      const khoaMoi = TC_KHOA_YC_;
      // 2) hai phiên cùng sửa hợp đồng bảo hiểm
      moModalBaoHiemTS_('TS-1'); await cho(); suaBaoHiemTS_('BH-0003'); el_('bhts_soHD').value = 'S-NGUOI-DANG-GO'; const buoc1 = txt('bhts_ds');
      conflict = true; loiHien.length = 0; luuBaoHiemTSClick_(); await cho();
      const tt = { banner: txt('bhts_xungDot'), soHDForm: el_('bhts_soHD').value, dsMoi: txt('bhts_ds'), loi: loiHien.join(' | ') };
      window.__anh1 = true;
      return { luu, khoaCu, khoaMoi, tt, buoc1 };
    });
    assert.equal(kq.luu.length, 2); assert.ok(kq.luu[0] && kq.luu[0] === kq.luu[1], 'gửi lại dùng CÙNG khoá yêu cầu'); assert.notEqual(kq.khoaMoi, kq.khoaCu, 'form mới = khoá mới');
    assert.deepEqual([kq.tt.soHDForm, /S-NGUOI-KHAC/.test(kq.tt.dsMoi), /999/.test(kq.tt.dsMoi)], ['S-NGUOI-DANG-GO', true, true], 'giữ nội dung đang nhập + hiện bản của người khác để đối chiếu');
    assert.match(kq.tt.banner, /Có người khác vừa sửa hợp đồng BH-0003.*GIỮ NGUYÊN/); assert.match(kq.tt.loi, /XUNG_DOT_PHIEN_BAN/);
    await p.screenshot({ path: path.join(anhDir, '02_xung_dot_hai_phien_MO_PHONG.png') });
    ok('Giao diện: khoá yêu cầu tạo tài sản giữ nguyên khi gửi lại; xung đột hai phiên giữ nội dung đang nhập và hiện bản mới để đối chiếu');
    // 3) màn hình xác minh/phục hồi
    const kq2 = await p.evaluate(async () => {
      const cho = () => new Promise(r => setTimeout(r, 40)), txt = (id) => document.getElementById(id).textContent, dongHien = [], loiHien = [];
      window.baoThanhCong = (m) => { dongHien.push(String(m)); }; window.baoLoi = (m) => { loiHien.push(String((m && m.message) || m)); };
      dongModalBaoHiemTS_(); kiemTraToanVenBHClick_(); await cho();
      const ds = { st: txt('cd_toanVenBH'), khung: txt('cd_hopDongHongBH'), nutDon: getComputedStyle(el_('cd_btnDonBH')).display, soNut: document.querySelectorAll('#cd_hopDongHongBH button').length };
      window.__goiXM = []; const g = window.hakRun_; window.hakRun_ = () => { const x = g(); return x; };
      xacMinhBHClick_('BH-0003'); await cho(); const m1 = dongHien.slice(); const l1 = loiHien.slice();
      return { ds, m1, l1 };
    });
    assert.match(kq2.ds.st, /1 dòng chi tiết bảo hiểm không hiển thị/); assert.match(kq2.ds.khung, /đang trỏ bản thiếu chi tiết.*BH-0003/); assert.equal(kq2.ds.soNut, 2); assert.equal(kq2.ds.nutDon, 'none', 'có hợp đồng hỏng thì không cho dọn hàng loạt');
    assert.match(kq2.m1.join(' '), /Đã xác nhận bản mới nhất của BH-0003 đã được lưu đầy đủ/);
    await p.evaluate(() => { document.getElementById('cd_dongbo') && document.getElementById('cd_dongbo').scrollIntoView(); });
    await p.screenshot({ path: path.join(anhDir, '03_man_hinh_xac_minh_phuc_hoi_MO_PHONG.png') });
    ok('Giao diện: màn hình xác minh/phục hồi liệt kê hợp đồng cần xử lý, không cho dọn hàng loạt khi có hợp đồng hỏng, và báo đúng kết quả máy chủ');
    // 4) kết quả máy chủ khác nhau được diễn đạt đúng, KHÔNG thành "đã dọn" chung chung
    const kq3 = await p.evaluate(async () => {
      const cho = () => new Promise(r => setTimeout(r, 40)), out = {};
      for (const tt of ['CHUA_CHOT_DA_DON', 'DA_PHUC_HOI', 'KHONG_PHUC_HOI_DUOC']) {
        const hien = [], loi = []; window.baoThanhCong = (m) => hien.push(String(m)); window.baoLoi = (m) => loi.push(String((m && m.message) || m));
        window.__ttXM = tt; xacMinhBHClick_('BH-0003'); await cho(); out[tt] = { hien: hien.join(' '), loi: loi.join(' ') };
      }
      return out;
    });
    assert.match(kq3.CHUA_CHOT_DA_DON.hien, /CHƯA thành công.*vẫn là bản cũ/); assert.match(kq3.DA_PHUC_HOI.hien, /phục hồi.*về bản trước đó đủ chi tiết/); assert.equal(kq3.KHONG_PHUC_HOI_DUOC.hien, ''); assert.match(kq3.KHONG_PHUC_HOI_DUOC.loi, /Không có thế hệ nào đủ dữ liệu/);
    ok('Giao diện: mỗi kết quả xác minh (chưa chốt đã dọn / đã phục hồi / không phục hồi được) được báo đúng, không nói "đã dọn" khi chưa kiểm');
    // 5) kết quả nạp Excel với hợp đồng CHƯA XÁC ĐỊNH
    const kq4 = await p.evaluate(async () => {
      const cho = () => new Promise(r => setTimeout(r, 40));
      window.__apDungKq = { ok: false, taoMoi: 1, capNhat: 0, bhThem: 0, bhDaCo: 0, boQua: [], canhBao: [], loiBH: [{ dong: 2, maTS: 'TS-0005', loi: 'CHƯA XÁC ĐỊNH kết quả lưu hợp đồng bảo hiểm BH-0009', chuaXacDinh: true }], canXacMinh: ['BH-0009'] };
      CNBH_DU_LIEU_ = { dong: [{ dong: 2, hanhDongTS: 'TAO_MOI', raw: {} }], tomTat: { taoMoi: 1, capNhat: 0, bhThem: 1, bhCapNhat: 0, loi: 0 } }; el_('cnbh_btnApDung').style.display = ''; cnbhApDung_(); await cho();
      return document.getElementById('cnbh_status').textContent;
    });
    await p.screenshot({ path: path.join(anhDir, '04_ket_qua_excel_chua_xac_dinh_MO_PHONG.png') });
    assert.match(kq4, /CHƯA XÁC ĐỊNH kết quả ghi hợp đồng BH-0009/); assert.match(kq4, /GIỮ NGUYÊN, đừng nạp lại file/); assert.doesNotMatch(kq4, /còn nguyên; đọc lại file/);
    ok('Giao diện: kết quả nạp Excel nói đúng khi hợp đồng bảo hiểm CHƯA XÁC ĐỊNH (giữ dữ liệu, không bảo nạp lại)');
    assert.deepEqual(loi, [], 'không lỗi JavaScript');
  } catch (e) { hong('Giao diện giao dịch bảo hiểm', e); }
  await b.close();
  console.log('\nTỔNG: giao diện giao dịch bảo hiểm — ' + loiTest + ' lỗi. Ảnh MÔ PHỎNG: ' + anhDir);
  process.exit(loiTest ? 1 : 0);
})();
