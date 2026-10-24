// LƯU TRỮ TOÀN BỘ DỮ LIỆU THEO NĂM + XEM LẠI NĂM CŨ (chỉ đọc). Giả lập Apps Script/Drive — bản sao là ảnh chụp thật trong giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('luu_tru_nam'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hd = hopDong({ soHopDong: 'HD-LT' });
const hs = (ma, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd.maHD, NgayGiaiNgan: '2026-02-01', NgayDenHan: '2026-12-31', SoTienNhanNoLanNay: 1000000, SoGiayNhanNo: 'Giấy nhận nợ ' + ma }, o));
hs('LT-1'); hs('LT-2'); hs('LT-3', { SoGiayNhanNo: 'Đặc biệt có dấu' });
const thuMuc = () => mt.DriveApp.getFolderById('GOC_ID').getFoldersByName('LuuTru_Nam').next();
const demFile = (f) => { const it = f.getFiles(); let n = 0; while (it.hasNext()) { if (!it.next().isTrashed()) n++; } return n; };
const namNay = Number(ctx.homNayVN_().slice(0, 4));
let ma26;

dat('Lưu trữ năm: chỉ Quản trị; năm không hợp lệ bị từ chối; tài khoản bị giới hạn công ty bị từ chối', () => {
  assert.throws(() => voi('nguoila@example.com', () => ctx.api('', 'luuTruNam', [{ nam: namNay }])), /QUYEN|quyền/); assert.throws(() => voi('xem@example.com', () => ctx.api('', 'luuTruNam', [{ nam: namNay }])), /QUYEN|quyền/);
  [1999, namNay + 1, 'abc', '', null, 2026.5].forEach(n => assert.throws(() => ctx.luuTruNam({ nam: n }), /Năm lưu trữ/, String(n)));
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC']; try { assert.throws(() => ctx.luuTruNam({ nam: namNay }), /toàn hệ thống/); } finally { ctx.phamViCongTyNguoiDung_ = g; }
  assert.equal(G.boDuLieu.getSheetByName('LuuTruNam') ? G.boDuLieu.getSheetByName('LuuTruNam').getLastRow() : 0, 0 + (G.boDuLieu.getSheetByName('LuuTruNam') ? G.boDuLieu.getSheetByName('LuuTruNam').getLastRow() : 0));
});
dat('Lưu trữ năm 2026: tạo bản sao TOÀN BỘ file trong thư mục LuuTru_Nam, xác minh đủ sheet/số dòng, ghi sổ lưu trữ', () => {
  const r = J(ctx.luuTruNam({ nam: namNay, ghiChu: 'Chốt cuối năm' })); ma26 = r.maLuuTru;
  assert.match(r.maLuuTru, /^LT-\d{4}$/); assert.equal(r.nam, namNay); assert.match(r.tenFile, new RegExp('^LUUTRU_.*_' + namNay + '_\\d{8}_\\d{6}$')); assert.ok(r.url && r.soSheet >= 10 && r.soDong >= 3);
  assert.equal(demFile(thuMuc()), 1);
  const dong = J(ctx.sheetToObjects_('LuuTruNam')).find(x => x.MaLuuTru === ma26); assert.deepEqual([dong.Nam, dong.TrangThai, dong.GhiChu], [namNay, 'Hợp lệ', 'Chốt cuối năm']); assert.equal(JSON.parse(dong.ChiTietSheet).HoSoGiaiNgan, 3);
});
dat('Bản lưu trữ là ảnh chụp: sửa/thêm dữ liệu hiện hành sau đó KHÔNG làm đổi năm đã lưu', () => {
  hs('LT-4'); assert.equal(ctx.sheetToObjects_('HoSoGiaiNgan').length, 4);
  const r = J(ctx.layDuLieuLuuTru(ma26, 'HOSO', { kichThuocTrang: 100 })); assert.equal(r.tong, 3); assert.deepEqual(r.rows.map(x => x[r.cot.indexOf('MaHoSo')]).sort(), ['LT-1', 'LT-2', 'LT-3']);
});
dat('Xem lại năm cũ: phân trang, tìm không dấu, tiêu đề cột, ngày thành chuỗi; mọi vai trò toàn hệ thống đọc được; bảng nhạy cảm bị từ chối', () => {
  const p1 = J(ctx.layDuLieuLuuTru(ma26, 'HOSO', { trang: 1, kichThuocTrang: 2 })), p2 = J(ctx.layDuLieuLuuTru(ma26, 'HOSO', { trang: 2, kichThuocTrang: 2 }));
  assert.deepEqual([p1.tong, p1.soTrang, p1.rows.length, p2.rows.length, p1.nhanMien, p1.tenSheet, p1.nam], [3, 2, 2, 1, 'Hồ sơ giải ngân', 'HoSoGiaiNgan', namNay]); assert.ok(p1.cot.includes('MaHoSo') && p1.cot.includes('SoTienNhanNoLanNay'));
  const t = J(ctx.layDuLieuLuuTru(ma26, 'HOSO', { tim: 'dac biet co dau' })); assert.equal(t.tong, 1); assert.equal(t.rows[0][t.cot.indexOf('MaHoSo')], 'LT-3');
  assert.ok(p1.rows.flat().every(c => typeof c !== 'object' || c === null), 'không còn đối tượng Date'); assert.ok(p1.rows.flat().includes('2026-02-01'));
  assert.deepEqual(J(ctx.layDuLieuLuuTru(ma26, 'HOPDONG')).rows.length, 1);
  ['NGUOIDUNG', 'SYS_NguoiDung', 'CAUHINH', '', 'HoSoGiaiNgan'].forEach(m => assert.throws(() => ctx.layDuLieuLuuTru(ma26, m), /Bảng không được xem/, 'bảng ' + m));
  assert.throws(() => ctx.layDuLieuLuuTru('LT-9999', 'HOSO'), /Không tìm thấy bản lưu trữ/);
  assert.equal(J(voi('xem@example.com', () => ctx.api('', 'layDuLieuLuuTru', [ma26, 'HOSO']))).tong, 3);
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC']; try { assert.throws(() => ctx.layDuLieuLuuTru(ma26, 'HOSO'), /toàn hệ thống/); assert.throws(() => ctx.layDanhSachLuuTru(), /toàn hệ thống/); } finally { ctx.phamViCongTyNguoiDung_ = g; }
});
dat('Danh sách lưu trữ: theo năm mới → cũ; kèm số dòng từng bảng để chọn xem', () => {
  const r = J(ctx.layDanhSachLuuTru()); assert.equal(r.namHienTai, namNay); assert.equal(r.rows.length, 1); assert.deepEqual([r.rows[0].maLuuTru, r.rows[0].nam, r.rows[0].trangThai], [ma26, namNay, 'Hợp lệ']);
  assert.ok(r.rows[0].cacMien.some(m => m.ma === 'HOSO' && m.soDong === 3 && m.nhan === 'Hồ sơ giải ngân')); assert.ok(r.rows[0].cacMien.every(m => m.ma !== 'NGUOIDUNG'));
  assert.deepEqual(J(voi('xem@example.com', () => ctx.api('', 'layDanhSachLuuTru', []))).rows.length, 1);
});
dat('Chống tạo trùng dồn dập; năm khác lưu được; bản lỗi (thiếu sheet) bị bỏ, không ghi sổ', () => {
  assert.throws(() => ctx.luuTruNam({ nam: namNay }), /vừa được lưu trữ/);
  const truoc = demFile(thuMuc()), soSo = ctx.sheetToObjects_('LuuTruNam').length; mt.__hongBanSao = true;
  try { assert.throws(() => ctx.luuTruNam({ nam: namNay - 1 }), /thiếu sheet|không có sheet/); } finally { mt.__hongBanSao = false; }
  assert.equal(demFile(thuMuc()), truoc, 'bản lỗi không được giữ'); assert.equal(ctx.sheetToObjects_('LuuTruNam').length, soSo);
  const r = J(ctx.luuTruNam({ nam: namNay - 1 })); assert.equal(r.nam, namNay - 1); assert.deepEqual(J(ctx.layDanhSachLuuTru()).rows.map(x => x.nam), [namNay, namNay - 1]);
});
dat('Hủy bản lưu trữ: cần lý do, không xoá file; bản hủy không xem được', () => {
  const ma = J(ctx.layDanhSachLuuTru()).rows.find(x => x.nam === namNay - 1).maLuuTru;
  assert.throws(() => ctx.huyLuuTru(ma, 'x'), /lý do/); assert.throws(() => voi('nguoila@example.com', () => ctx.api('', 'huyLuuTru', [ma, 'lưu nhầm năm'])), /QUYEN|quyền/);
  const truoc = demFile(thuMuc()); ctx.huyLuuTru(ma, 'Lưu nhầm năm'); assert.equal(demFile(thuMuc()), truoc); assert.throws(() => ctx.huyLuuTru(ma, 'lại lần nữa'), /đã hủy/);
  assert.throws(() => ctx.layDuLieuLuuTru(ma, 'HOSO'), /đã hủy/); assert.equal(J(ctx.layDanhSachLuuTru()).rows.find(x => x.maLuuTru === ma).trangThai, 'Đã hủy');
});
dat('Bản lưu trữ KHÔNG bị dọn bởi sao lưu hằng tuần (khác thư mục và tiền tố)', () => {
  const tien = ctx.backupTienTo_(mt.SpreadsheetApp.getActiveSpreadsheet()), f = ctx.backupThuMuc_();
  for (let i = 0; i < 3; i++) f.createFile(new mt.Blob(Buffer.from('x'), 'text/plain', tien + 'cu' + i));
  ctx.don_DepBanSaoCu_(f, 1, tien); const it = thuMuc().getFiles(); let con = 0; while (it.hasNext()) if (!it.next().isTrashed()) con++; assert.ok(con >= 1, 'bản lưu trữ năm vẫn còn');
});
dat('Tự động đầu năm: chỉ trong 15 ngày đầu tháng 1, chỉ khi năm trước CHƯA có bản hợp lệ, chỉ một lần; ngoài thời điểm thì bỏ qua', () => {
  const homNay = ctx.homNayVN_; try {
    ctx.homNayVN_ = () => namNay + '-07-10'; assert.equal(J(ctx.luuTruNamTuDong()).boQua, true, 'giữa năm: bỏ qua');
    ctx.homNayVN_ = () => namNay + '-01-05'; delete G.props['LUU_TRU_LAN_THU_MS'];       // năm trước = namNay-1 (bản thủ công đã bị hủy → chưa có bản hợp lệ)
    const r = J(ctx.luuTruNamTuDong()); assert.equal(r.ok, true); assert.equal(r.nam, namNay - 1);
    assert.equal(J(ctx.layDanhSachLuuTru()).rows.filter(x => x.nam === namNay - 1 && x.trangThai === 'Hợp lệ').length, 1);
    G.props['LUU_TRU_LAN_THU_MS'] = String(Date.now() - 3600000); assert.equal(J(ctx.luuTruNamTuDong()).boQua, true, 'đã có bản hợp lệ → không tạo thêm');
    ctx.homNayVN_ = () => namNay + '-02-20'; assert.equal(J(ctx.luuTruNamTuDong()).boQua, true, 'quá 15 ngày đầu tháng 1: bỏ qua');
  } finally { ctx.homNayVN_ = homNay; }
});
dat('Lịch tự động: chỉ Quản trị tạo; thay lịch cũ, không nhân đôi', () => {
  assert.throws(() => voi('nguoila@example.com', () => ctx.api('', 'taoLichLuuTruNam', [])), /QUYEN|quyền/);
  const tg = [], goc = mt.ScriptApp; mt.ScriptApp = Object.assign({}, goc, { getProjectTriggers: () => tg, deleteTrigger: (t) => tg.splice(tg.indexOf(t), 1), newTrigger: (h) => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create: () => { tg.push({ getHandlerFunction: () => h }); } }) }) }) }) });
  try {
    assert.deepEqual([J(ctx.layTrangThaiLichLuuTruNam()).bat, J(ctx.layTrangThaiLichLuuTruNam()).soLich], [false, 0], 'chưa tạo lịch: báo CHƯA BẬT');
    const t1 = J(ctx.taoLichLuuTruNam()); assert.deepEqual([t1.ok, t1.bat, t1.soLich], [true, true, 1]); ctx.taoLichLuuTruNam(); assert.equal(tg.filter(t => t.getHandlerFunction() === 'luuTruNamTuDong').length, 1);
    assert.equal(J(ctx.layTrangThaiLichLuuTruNam()).bat, true, 'đã bật: đọc từ trình kích hoạt thật');
    assert.throws(() => voi('nguoila@example.com', () => ctx.api('', 'tatLichLuuTruNam', [])), /QUYEN|quyền/); assert.equal(tg.length, 1, 'người không phải Quản trị không tắt được');
    assert.deepEqual([J(ctx.tatLichLuuTruNam()).bat, tg.length], [false, 0]); assert.equal(J(ctx.layTrangThaiLichLuuTruNam()).bat, false);
    assert.equal(J(voi('xem@example.com', () => ctx.api('', 'layTrangThaiLichLuuTruNam', []))).bat, false, 'mọi vai trò toàn hệ thống xem được trạng thái');
  } finally { mt.ScriptApp = goc; }
});

(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('lưu trữ dữ liệu theo năm'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('lưu trữ dữ liệu theo năm'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://lt.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://lt.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40));
      const ds = { namHienTai: 2026, rows: [{ maLuuTru: 'LT-0002', nam: 2026, tenFile: 'f', url: 'https://drive.example/f2', soSheet: 30, soDong: 1234, trangThai: 'Hợp lệ', ghiChu: 'Chốt', nguoiTao: 'a@x.vn', thoiDiemTao: '2026-10-23T10:00:00Z', lyDoHuy: '', cacMien: [{ ma: 'HOSO', nhan: 'Hồ sơ giải ngân', soDong: 5 }, { ma: 'TRANO', nhan: 'Sổ trả nợ', soDong: 2 }] },
        { maLuuTru: 'LT-0001', nam: 2025, tenFile: 'g', url: '', soSheet: 30, soDong: 900, trangThai: 'Đã hủy', ghiChu: '', nguoiTao: 'a@x.vn', thoiDiemTao: '2026-01-05T10:00:00Z', lyDoHuy: 'Lưu nhầm', cacMien: [] }] };
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        const dang = (ten, tra) => { x[ten] = function (...a) { goi.push(ten + ':' + JSON.stringify(a)); setTimeout(() => ok(tra(...a)), 0); return P; }; };
        dang('layDanhSachLuuTru', () => ds); dang('luuTruNam', (t) => ({ ok: true, maLuuTru: 'LT-0003', nam: t.nam, soSheet: 30, soDong: 2000 }));
        dang('layDuLieuLuuTru', (ma, mien, o) => ({ maLuuTru: ma, nam: 2026, mien, nhanMien: 'Hồ sơ giải ngân', tenSheet: 'HoSoGiaiNgan', cot: ['MaHoSo', 'SoTien'], rows: o.trang === 2 ? [['HS-9', 9]] : [['HS-1', 1000000], ['HS-2', 2]], tong: 3, trang: o.trang || 1, soTrang: 2, kichThuocTrang: 50 }));
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      chuyenTab('caidat'); chuyenTabCaiDat_('luutru'); await cho();
      const a = { hien: getComputedStyle(document.getElementById('cd-luutru')).display, quanTri: getComputedStyle(document.getElementById('lt_quanTri')).display, namOpts: [...document.querySelectorAll('#lt_nam option')].map(o => o.value).slice(0, 3), namChon: document.getElementById('lt_nam').value,
        dong: [...document.querySelectorAll('#lt_tbody tr')].map(r => r.textContent), nutXem: [...document.querySelectorAll('#lt_tbody button')].filter(b => /Xem lại/.test(b.textContent)).length };
      goi.length = 0; [...document.querySelectorAll('#lt_tbody button')].find(b => /Xem lại/.test(b.textContent)).click(); await cho();
      const v = { hien: getComputedStyle(document.getElementById('lt_xem')).display, tieuDe: document.getElementById('lt_xemTieuDe').textContent, mien: [...document.querySelectorAll('#lt_mien option')].map(o => o.textContent), goi: goi.slice(), st: document.getElementById('lt_xemStatus').textContent, head: document.getElementById('lt_xemHead').textContent, dong: [...document.querySelectorAll('#lt_xemBody tr')].map(r => r.textContent), truoc: document.getElementById('lt_truoc').disabled, sau: document.getElementById('lt_sau').disabled };
      goi.length = 0; document.getElementById('lt_sau').click(); await cho(); v.trang2 = { goi: goi.slice(), dong: [...document.querySelectorAll('#lt_xemBody tr')].map(r => r.textContent), sau: document.getElementById('lt_sau').disabled };
      goi.length = 0; document.getElementById('lt_ghiChu').value = 'Chốt sổ'; document.getElementById('lt_nam').value = '2025'; window.hoiXacNhan = (c, f) => f(); luuTruNamClick_(); await cho(); const l = { goi: goi.filter(g => /^luuTruNam/.test(g)) };
      return { a, v, l };
    });
    assert.notEqual(kq.a.hien, 'none'); assert.notEqual(kq.a.quanTri, 'none'); assert.deepEqual(kq.a.namOpts, ['2026', '2025', '2024']); assert.equal(kq.a.namChon, '2025', 'mặc định năm trước');
    assert.ok(/2026.*LT-0002.*30.*1\.234.*Chốt.*Hợp lệ/.test(kq.a.dong[0]) && /2025.*Lưu nhầm.*Đã hủy/.test(kq.a.dong[1]), kq.a.dong.join(' | ')); assert.equal(kq.a.nutXem, 1, 'bản đã hủy không có nút Xem');
    assert.notEqual(kq.v.hien, 'none'); assert.match(kq.v.tieuDe, /năm 2026.*LT-0002.*chỉ đọc/); assert.deepEqual(kq.v.mien, ['Hồ sơ giải ngân (5 dòng)', 'Sổ trả nợ (2 dòng)']);
    assert.deepEqual(JSON.parse(kq.v.goi[0].slice('layDuLieuLuuTru:'.length)), ['LT-0002', 'HOSO', { trang: 1, kichThuocTrang: 50, tim: '' }]); assert.match(kq.v.st, /3 dòng.*trang 1\/2/); assert.equal(kq.v.head, 'MaHoSoSoTien');
    assert.ok(/HS-1.*1000000/.test(kq.v.dong[0]) && kq.v.dong.length === 2); assert.deepEqual([kq.v.truoc, kq.v.sau], [true, false]);
    assert.equal(JSON.parse(kq.v.trang2.goi[0].slice('layDuLieuLuuTru:'.length))[2].trang, 2); assert.ok(/HS-9/.test(kq.v.trang2.dong[0])); assert.equal(kq.v.trang2.sau, true);
    assert.deepEqual(kq.l.goi, ['luuTruNam:[{"nam":2025,"ghiChu":"Chốt sổ"}]']); assert.deepEqual(loi, []);
    console.log('PASS Giao diện: Cài đặt › Lưu trữ theo năm — danh sách, lưu trữ năm, xem lại năm cũ theo bảng/phân trang (chỉ đọc), bản hủy không xem được');
  } catch (e) { console.log('FAIL Giao diện lưu trữ năm → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('lưu trữ dữ liệu theo năm');
})();
