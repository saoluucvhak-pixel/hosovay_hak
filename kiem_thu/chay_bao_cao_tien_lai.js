// BÁO CÁO TÍNH TIỀN LÃI theo hồ sơ / hợp đồng / thời gian (tháng). Số liệu tính tay, giả lập Apps Script/Sheets — chưa chạy trên Google thật.
// Quy ước: lãi trong hạn = dư nợ gốc thực tế từng ngày × lãi suất hợp đồng ÷ cơ số (365 hoặc 360); tính từ ngày giải ngân (gồm) đến ngày đến hạn / ngày tất toán (không gồm).
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('bao_cao_tien_lai'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hd1 = hopDong({ soHopDong: 'HD-L1', laiSuatTrongHan: 10 }), hd2 = hopDong({ soHopDong: 'HD-L2', laiSuatTrongHan: 5 });
ctx.damBaoCotSheet_(G.boDuLieu.getSheetByName('HoSoGiaiNgan'), ['DaTatToan', 'NgayTatToan']);
const hs = (ma, hd, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd.maHD, NgayGiaiNgan: '2026-01-10', NgayDenHan: '2026-12-31', SoTienNhanNoLanNay: 365000000, SoGiayNhanNo: 'GNN-' + ma }, o));
hs('L-A', hd1); hs('L-B', hd1, { LoaiTien: 'USD', TyGiaBan: 25000, SoTienNhanNoLanNay: 36500 }); hs('L-C', hd2, { SoTienNhanNoLanNay: 73000000 });
hs('L-D', hd1, { DaTatToan: true, NgayTatToan: '2026-02-15' }); hs('L-E', hd1, { TrangThai: 'Đã tạo hồ sơ' });
ctx.ghiNhanTraNo('L-A', { loaiTra: 'GOC', ngayTra: '2026-03-11', soTien: 165000000, soThamChieu: 'UNC-1', chungTu: 'UNC 1' }, Q.rev('L-A'));
ctx.ghiNhanTraNo('L-A', { loaiTra: 'LAI', ngayTra: '2026-03-05', soTien: 2000000, soThamChieu: 'UNC-2', chungTu: 'UNC 2' }, Q.rev('L-A'));

// --- lãi quá hạn/phạt + quy đổi USD: khoản quá hạn không trả, tỷ giá cuối tháng
hs('L-X', hd1, { NgayGiaiNgan: '2026-05-01', NgayDenHan: '2026-06-30' });
const shTG = G.boDuLieu.getSheetByName('TyGiaThuCong') || ctx.ensureSheet_(G.boDuLieu, 'TyGiaThuCong', ['Ngay', 'TyGiaBan', 'Nguon', 'NguoiGhi', 'ThoiDiemGhi']);
[['2026-01-31', 24000], ['2026-02-28', 25000], ['2026-03-31', 26000], ['2026-07-31', 27000]].forEach(([n, t]) => shTG.g.push(shTG.g[0].map(k => ({ Ngay: n, TyGiaBan: t })[k] ?? '')));
const lay = (o) => J(ctx.layBaoCaoTienLai(o));
const hang = (r, ma) => r.theoHoSo.find(x => x.maHoSo === ma);

dat('Theo hồ sơ (01/02–31/03/2026, 59 ngày): lãi tính tay từng khoản; khoản chưa giải ngân không có; tất toán sớm dừng lãi đúng ngày', () => {
  const r = lay({ tuNgay: '2026-02-01', denNgay: '2026-03-31' });
  assert.deepEqual(r.theoHoSo.map(x => x.maHoSo).sort(), ['L-A', 'L-B', 'L-C', 'L-D'], 'L-X đến hạn 30/06: chưa quá hạn trong khoảng này');
  assert.equal(hang(r, 'L-A').lai, 2800000 + 1000000 + 1150685, 'A: Feb 28×100.000 + Mar 10×100.000 + 21 ngày × dư nợ 200tr'); assert.equal(hang(r, 'L-A').soNgay, 59);
  assert.equal(hang(r, 'L-B').lai, 590); assert.equal(hang(r, 'L-B').loaiTien, 'USD');
  assert.equal(hang(r, 'L-C').lai, 590000); assert.equal(hang(r, 'L-C').laiSuat, 5);
  assert.equal(hang(r, 'L-D').lai, 1400000, 'D tất toán 15/02: tính 01–14/02'); assert.equal(hang(r, 'L-D').soNgay, 14);
  assert.equal(hang(r, 'L-A').laiDaTra, 2000000, 'lãi đã trả trong kỳ (tham khảo)');
  assert.equal(hang(r, 'L-A').duNoBinhQuan, Math.round((365000000 * 38 + 200000000 * 21) / 59), 'dư nợ bình quân theo ngày');
});
dat('Theo hợp đồng: cộng đúng theo từng hợp đồng, VND và USD không cộng lẫn', () => {
  const r = lay({ tuNgay: '2026-02-01', denNgay: '2026-03-31' }), h1 = r.theoHopDong.find(x => x.soHopDong === 'HD-L1'), h2 = r.theoHopDong.find(x => x.soHopDong === 'HD-L2');
  assert.deepEqual([h1.soKhoan, h1.lai.VND, h1.lai.USD], [3, 2800000 + 1000000 + 1150685 + 1400000, 590]); assert.deepEqual([h2.soKhoan, h2.lai.VND || 0, h2.lai.USD || 0], [1, 590000, 0]);
  assert.deepEqual(r.tong, { VND: 2800000 + 1000000 + 1150685 + 1400000 + 590000, USD: 590 });
});
dat('Theo thời gian (tháng): lãi từng tháng, tách theo loại tiền; cộng các tháng = tổng', () => {
  const r = lay({ tuNgay: '2026-02-01', denNgay: '2026-03-31' }), t = (m) => r.theoThang.find(x => x.thang === m);
  assert.deepEqual(r.theoThang.map(x => x.thang), ['2026-02', '2026-03']);
  assert.deepEqual([t('2026-02').lai.VND, t('2026-02').lai.USD, t('2026-02').soNgay], [2800000 + 1400000 + 280000, 280, 28]);
  assert.deepEqual([t('2026-03').lai.VND, t('2026-03').lai.USD], [1000000 + 1150685 + 310000, 310]);
  assert.equal(t('2026-02').lai.VND + t('2026-03').lai.VND, r.tong.VND); assert.equal(t('2026-02').lai.USD + t('2026-03').lai.USD, r.tong.USD);
  assert.ok(r.chiTiet.length >= 7 && r.chiTiet.every(x => x.maHoSo && x.thang && typeof x.lai === 'number'), 'chi tiết hồ sơ × tháng để xuất CSV');
});
dat('Biên: bắt đầu từ ngày giải ngân; khoảng sau ngày đến hạn không tính; lọc loại tiền; khoảng sát ngày đến hạn', () => {
  assert.equal(hang(lay({ tuNgay: '2026-01-01', denNgay: '2026-01-31' }), 'L-A').lai, 2200000, 'từ 10/01 đến 31/01 = 22 ngày');
  assert.equal(lay({ tuNgay: '2027-01-01', denNgay: '2027-02-01', baoGomLaiPhat: false }).theoHoSo.length, 0, 'sau ngày đến hạn không còn lãi trong hạn');
  assert.equal(hang(lay({ tuNgay: '2026-12-30', denNgay: '2027-01-05' }), 'L-C').soNgay, 1, 'ngày đến hạn 31/12 không tính lãi → chỉ còn 30/12');
});

dat('Lãi quá hạn/phạt (ước tính, theo cấu hình 150% lãi trong hạn): khoản không trả sau đến hạn 30/06 → tháng 7 phạt 31 ngày × 150.000; có cột riêng, không lẫn lãi trong hạn', () => {
  const r = lay({ tuNgay: '2026-07-01', denNgay: '2026-07-31' }), x = hang(r, 'L-X');
  assert.deepEqual([x.lai, x.soNgay, x.laiPhat], [0, 0, 150000 * 31], 'phạt = 31 ngày × (365tr × 15% ÷ 365)'); assert.deepEqual(r.tongPhat, { VND: 4650000 }); assert.deepEqual(r.theoThang.map(t => [t.thang, t.laiPhat.VND]), [['2026-07', 4650000]]);
  assert.equal(r.theoHopDong.find(h => h.soHopDong === 'HD-L1').laiPhat.VND, 4650000 + 0); assert.ok(r.chiTiet.some(c => c.maHoSo === 'L-X' && c.laiPhat === 4650000 && c.lai === 0));
  assert.deepEqual(lay({ tuNgay: '2026-07-01', denNgay: '2026-07-31', baoGomLaiPhat: false }).theoHoSo.find(x => x.maHoSo === 'L-X'), undefined, 'tắt lãi phạt: khoản chỉ có phạt không còn');
  const t = lay({ tuNgay: '2026-07-15', denNgay: '2026-08-10' }); assert.deepEqual(t.theoThang.map(m => [m.thang, m.laiPhat.VND]), [['2026-07', 150000 * 17], ['2026-08', 150000 * 10]], 'chia theo tháng: 15–31/07 = 17 ngày, 01–10/08 = 10 ngày');
  assert.equal(t.tongPhat.VND, 150000 * 27);
});
dat('Quy đổi USD → VND theo tỷ giá CUỐI THÁNG trong sổ tỷ giá; thiếu tỷ giá thì không tính và báo; tổng quy đổi tách riêng khỏi VND/USD', () => {
  const r = lay({ tuNgay: '2026-02-01', denNgay: '2026-03-31' }), b = hang(r, 'L-B');
  assert.equal(b.quyDoiVND, 280 * 25000 + 310 * 26000); assert.deepEqual(r.chiTiet.filter(c => c.maHoSo === 'L-B').map(c => [c.thang, c.tyGia, c.quyDoiVND]), [['2026-02', 25000, 7000000], ['2026-03', 26000, 8060000]]);
  assert.deepEqual(r.theoThang.map(t => [t.thang, t.tyGiaCuoiThang]), [['2026-02', 25000], ['2026-03', 26000]]);
  const vnd = 2800000 + 1000000 + 1150685 + 1400000 + 590000; assert.deepEqual(r.tongQuyDoi, { laiTrongHan: vnd + 15060000, laiPhat: 0, tong: vnd + 15060000, soDongThieuTyGia: 0 }); assert.deepEqual(r.tong, { VND: vnd, USD: 590 });
  assert.equal(hang(r, 'L-A').quyDoiVND, hang(r, 'L-A').lai, 'khoản VND: quy đổi = chính nó');
  const k = lay({ tuNgay: '2026-04-01', denNgay: '2026-04-30' }), kb = hang(k, 'L-B'); assert.equal(kb.quyDoiVND, 300 * 26000); // tháng 4 chưa có tỷ giá 30/04 → dùng bản ghi gần nhất trước (31/03)
  assert.deepEqual(k.chiTiet.filter(c => c.maHoSo === 'L-B').map(c => c.tyGia), [26000]);
  shTG.g.splice(1, shTG.g.length); const m = lay({ tuNgay: '2026-02-01', denNgay: '2026-03-31' }); assert.equal(hang(m, 'L-B').quyDoiVND, null); assert.equal(m.tongQuyDoi.soDongThieuTyGia, 2); assert.match(hang(m, 'L-B').canhBao, /THIEU_TY_GIA/);
  [['2026-01-31', 24000], ['2026-02-28', 25000], ['2026-03-31', 26000], ['2026-07-31', 27000]].forEach(([n, t]) => shTG.g.push(shTG.g[0].map(kk => ({ Ngay: n, TyGiaBan: t })[kk] ?? '')));
});
dat('Kiểm tra đầu vào + quyền + phạm vi', () => {
  assert.throws(() => ctx.layBaoCaoTienLai({ tuNgay: '2026-03-01', denNgay: '2026-02-01' }), /không được trước/);
  assert.throws(() => ctx.layBaoCaoTienLai({ tuNgay: 'abc', denNgay: '2026-02-01' }), /không hợp lệ/);
  assert.throws(() => ctx.layBaoCaoTienLai({ tuNgay: '2000-01-01', denNgay: '2026-02-01' }), /tối đa/);
  assert.deepEqual(lay({ tuNgay: '2026-02-01', denNgay: '2026-03-31', loaiTien: 'USD' }).theoHoSo.map(x => x.maHoSo), ['L-B']);
  const c = mt.__email; mt.__email = 'xem@example.com';
  try { assert.equal(J(ctx.api('', 'layBaoCaoTienLai', [{ tuNgay: '2026-02-01', denNgay: '2026-03-31' }])).theoHoSo.length, 4); } finally { mt.__email = c; }
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try { assert.equal(lay({ tuNgay: '2026-02-01', denNgay: '2026-03-31' }).theoHoSo.length, 0); } finally { ctx.phamViCongTyNguoiDung_ = goc; }
});
dat('Đối chiếu chéo với lịch trả nợ (tinhLichTraNo_): tổng lãi cả vòng đời khoản vay khớp (chỉ khác do làm tròn theo kỳ, ≤ 1 đơn vị/tháng)', () => {
  ['L-A', 'L-C'].forEach(ma => {
    const lich = J(ctx.layLichTraNo(ma)), r = lay({ tuNgay: '2026-01-01', denNgay: '2026-12-30' });
    assert.ok(Math.abs(hang(r, ma).lai - lich.tong.laiPhaiTra) <= 12, ma + ': báo cáo ' + hang(r, ma).lai + ' ≠ lịch ' + lich.tong.laiPhaiTra);
  });
});

(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('báo cáo tính tiền lãi'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('báo cáo tính tiền lãi'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://lai.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://lai.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40)), csv = [];
      const res = { tuNgay: '2026-02-01', denNgay: '2026-03-31', soNgayKhoang: 59, coSoNgay: 365, tong: { VND: 5390685, USD: 590 }, ghiChu: 'Lãi trong hạn ...',
        theoHoSo: [{ maHoSo: 'L-A', soGiayNhanNo: 'GNN-A', tenCty: 'Cty A', maHD: 'HD1', soHopDong: 'HD-L1', loaiTien: 'VND', goc: 365000000, laiSuat: 10, ngayGiaiNgan: '2026-01-10', ngayDenHan: '2026-12-31', ngayTatToan: '', tuNgayTinh: '2026-02-01', denNgayTinh: '2026-03-31', soNgay: 59, duNoBinhQuan: 306271186, lai: 4950685, laiDaTra: 2000000, canhBao: '' },
          { maHoSo: 'L-B', soGiayNhanNo: '', tenCty: 'Cty A', maHD: 'HD1', soHopDong: 'HD-L1', loaiTien: 'USD', goc: 36500, laiSuat: 10, ngayGiaiNgan: '2026-01-10', ngayDenHan: '2026-12-31', ngayTatToan: '', tuNgayTinh: '2026-02-01', denNgayTinh: '2026-03-31', soNgay: 59, duNoBinhQuan: 36500, lai: 590, laiDaTra: 0, canhBao: '' }],
        theoHopDong: [{ maHD: 'HD1', soHopDong: 'HD-L1', tenCty: 'Cty A', soKhoan: 2, laiSuat: 10, lai: { VND: 4950685, USD: 590 }, laiDaTra: { VND: 2000000 } }],
        theoThang: [{ thang: '2026-02', soNgay: 28, soKhoan: 2, lai: { VND: 2800000, USD: 280 } }, { thang: '2026-03', soNgay: 31, soKhoan: 2, lai: { VND: 2150685, USD: 310 } }],
        chiTiet: [{ maHoSo: 'L-A', soHopDong: 'HD-L1', loaiTien: 'VND', thang: '2026-02', soNgay: 28, duNoBinhQuan: 365000000, laiSuat: 10, lai: 2800000 }] };
      window.hakRun_ = () => { let ok, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler() { return P; } };
        x.layBaoCaoTienLai = function (...a) { goi.push(JSON.stringify(a)); setTimeout(() => ok(res), 0); return P; };
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      window.qvCsv_ = (ten, hdr, rows) => csv.push({ ten, hdr, rows });
      document.getElementById('tabBtn-baocao').click(); chuyenBcSub_(5); await cho();
      const d = { tu: el_('bcLai_tuNgay').value, den: el_('bcLai_denNgay').value, goi: goi.slice(), tom: el_('bcLai_tomTat').textContent };
      document.getElementById('bcLai_loaiTien').value = 'USD'; document.getElementById('bcLai_tuNgay').value = '2026-02-01'; document.getElementById('bcLai_denNgay').value = '2026-03-31'; goi.length = 0; taiBcLai_(); await cho();
      const hoso = { goi: goi.slice(), dong: [...document.querySelectorAll('#bcLai_tbHoSo tbody tr')].map(r => r.textContent) };
      chuyenBcLaiView_('hopdong'); const hd = { hien: getComputedStyle(el_('bcLaiView-hopdong')).display, an: getComputedStyle(el_('bcLaiView-hoso')).display, dong: [...document.querySelectorAll('#bcLai_tbHopDong tbody tr')].map(r => r.textContent) };
      chuyenBcLaiView_('thang'); const th = [...document.querySelectorAll('#bcLai_tbThang tbody tr')].map(r => r.textContent);
      xuatCsvBcLai_();
      const pad = parseFloat(getComputedStyle(document.querySelector('#bcLai_tbHoSo th.cot-tien')).paddingRight);
      return { d, hoso, hd, th, csv, pad };
    });
    assert.match(kq.d.tu, /^\d{4}-01-01$/); assert.match(kq.d.den, /^\d{4}-\d{2}-\d{2}$/); assert.equal(kq.d.goi.length, 1, 'mở thẻ lần đầu tự tính');
    assert.deepEqual(JSON.parse(kq.hoso.goi[0]), [{ tuNgay: '2026-02-01', denNgay: '2026-03-31', loaiTien: 'USD' }]);
    assert.ok(kq.hoso.dong.length === 2 && /L-A/.test(kq.hoso.dong[0]) && /4\.950\.685/.test(kq.hoso.dong[0]) && /01\/02\/2026 → 31\/03\/2026/.test(kq.hoso.dong[0]) && kq.hoso.dong[0].includes('306.271.186'), kq.hoso.dong[0]);
    assert.notEqual(kq.hd.hien, 'none'); assert.equal(kq.hd.an, 'none'); assert.ok(/HD-L1/.test(kq.hd.dong[0]) && /4\.950\.685/.test(kq.hd.dong[0]) && /590/.test(kq.hd.dong[0]));
    assert.deepEqual(kq.th.map(t => /^0[23]\/2026/.test(t)), [true, true]); assert.ok(/2\.800\.000/.test(kq.th[0]) && /2\.150\.685/.test(kq.th[1]));
    assert.equal(kq.csv.length, 1); assert.equal(kq.csv[0].ten, 'tien_lai_2026-02-01_2026-03-31'); assert.deepEqual(kq.csv[0].hdr.slice(0, 3), ['Tháng', 'Mã hồ sơ', 'Số hợp đồng']); assert.equal(kq.csv[0].rows[0][7], 2800000);
    assert.ok(kq.pad >= 20, 'cột số tiền có khoảng đệm'); assert.deepEqual(loi, []);
    console.log('PASS Giao diện: Báo cáo tiền vay › 5. Tính tiền lãi — chọn khoảng ngày/loại tiền, xem theo hồ sơ / hợp đồng / tháng, xuất CSV');
  } catch (e) { console.log('FAIL Giao diện tính tiền lãi → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('báo cáo tính tiền lãi');
})();
