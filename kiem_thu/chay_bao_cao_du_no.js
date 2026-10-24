// BÁO CÁO DƯ NỢ THEO KỲ / TẠI NGÀY: dư nợ đầu kỳ + phát sinh tăng − phát sinh giảm = cuối kỳ; tại ngày quá khứ không bị giao dịch sau đó ảnh hưởng; khớp dư nợ hiện tại; xuất file khớp màn hình.
// Dữ liệu lưu thực tế trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('du_no_ky'), { ctx, mt, G, hopDong, themHoSo, rev, ngay, cty, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const ctB = G.boDuLieu.getSheetByName('DM_CongTy'); ctB.g.push(ctB.g[0].map(k => ({ MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002' })[k] ?? ''));
const hdA = hopDong({ soHopDong: 'HD-A', hanMucVay: 5e12 }), hdB = hopDong({ soHopDong: 'HD-B', maCty: 'CTY_B', hanMucVay: 5e12 });
const tra = (ma, loai, soTien, d, ref) => ctx.ghiNhanTraNo(ma, { loaiTra: loai, ngayTra: ngay(d), soTien, soThamChieu: 'REF-' + ref, chungTu: 'CT ' + ref }, rev(ma));
// V1 VND 1 tỷ (-60), trả 300tr (-30), 100tr (-10) · U1 USD 10.000,55 (-50) trả 2.500,25 (-20) · V2 500tr (-40) trả đủ (-10) + tất toán (-9) · T1 200tr (-45) tất toán NGOÀI hệ thống (-5) khi còn nợ
// N1 chỉ tạo chứng từ · X1 đã hủy · W1 thuộc công ty B
themHoSo({ MaHoSo: 'V1', MaHD: hdA.maHD, SoTienNhanNoLanNay: 1000000000, NgayGiaiNgan: ngay(-60), NgayDenHan: ngay(30) });
themHoSo({ MaHoSo: 'U1', MaHD: hdA.maHD, LoaiTien: 'USD', TyGiaBan: 25000, SoTienNhanNoLanNay: 10000.55, NgayGiaiNgan: ngay(-50), NgayDenHan: ngay(40) });
themHoSo({ MaHoSo: 'V2', MaHD: hdA.maHD, SoTienNhanNoLanNay: 500000000, NgayGiaiNgan: ngay(-40), NgayDenHan: ngay(50) });
themHoSo({ MaHoSo: 'T1', MaHD: hdA.maHD, SoTienNhanNoLanNay: 200000000, NgayGiaiNgan: ngay(-45), NgayDenHan: ngay(50) });
themHoSo({ MaHoSo: 'N1', MaHD: hdA.maHD, TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 999000000, NgayGiaiNgan: ngay(-3) });
themHoSo({ MaHoSo: 'X1', MaHD: hdA.maHD, TrangThai: 'Đã hủy', SoTienNhanNoLanNay: 888000000, NgayGiaiNgan: ngay(-3) });
themHoSo({ MaHoSo: 'W1', MaHD: hdB.maHD, SoTienNhanNoLanNay: 300000000, NgayGiaiNgan: ngay(-20), NgayDenHan: ngay(60) });
tra('V1', 'GOC', 300000000, -30, 'A1'); tra('V1', 'GOC', 100000000, -10, 'A2'); tra('V1', 'LAI', 5000000, -10, 'A2L'); tra('U1', 'GOC', '2500.25', -20, 'B1'); tra('V2', 'GOC', 500000000, -10, 'C1');
ctx.capNhatTatToanHoSo('V2', { daTatToan: true, ngay: ngay(-9), ghiChu: 'Tất toán' }, rev('V2'));
ctx.capNhatTatToanHoSo('T1', { daTatToan: true, ngay: ngay(-5), ghiChu: 'Đã trả đủ ngoài hệ thống', xacNhanDaTraDuNgoaiHeThong: true }, rev('T1'));
const bc = (tu, den, o) => J(ctx.layBaoCaoDuNoTheoKy(Object.assign({ tuNgay: ngay(tu), denNgay: ngay(den) }, o || {})));
const cong = (a, b) => Math.round((a + b) * 100) / 100;

dat('D1. Đầu kỳ + tăng − giảm = cuối kỳ cho mọi kỳ và từng khoản (VND nguyên đồng, USD tròn cent); tổng theo loại tiền = tổng các khoản', () => {
  [[-70, 0], [-60, -60], [-45, -11], [-30, -30], [-20, -9], [-9, 0], [-5, -5], [-100, -61]].forEach(([tu, den]) => {
    const r = bc(tu, den);
    r.rows.forEach(k => assert.equal(cong(cong(k.dauKy, k.tang), -(k.giamTra + k.giamTatToan)), k.cuoiKy, `${k.maHoSo} kỳ ${tu}..${den}`));
    ['VND', 'USD'].forEach(lt => { const t = r.tong[lt]; if (!t) return; const kh = r.rows.filter(k => k.loaiTien === lt); const s = (f) => kh.reduce((a, k) => cong(a, k[f]), 0);
      assert.deepEqual([t.dauKy, t.tang, t.giamTra, t.giamTatToan, t.cuoiKy], [s('dauKy'), s('tang'), s('giamTra'), s('giamTatToan'), s('cuoiKy')], lt + ' tổng khớp');
      assert.equal(cong(cong(t.dauKy, t.tang), -(t.giamTra + t.giamTatToan)), t.cuoiKy, lt + ' đầu + tăng − giảm = cuối'); });
  });
  const r = bc(-70, 0), k = (m) => r.rows.find(x => x.maHoSo === m);
  assert.deepEqual([k('V1').dauKy, k('V1').tang, k('V1').giamTra, k('V1').cuoiKy], [0, 1000000000, 400000000, 600000000]);
  assert.deepEqual([k('U1').tang, k('U1').giamTra, k('U1').cuoiKy], [10000.55, 2500.25, 7500.3], 'USD tròn cent');
  assert.deepEqual([k('V2').tang, k('V2').giamTra, k('V2').giamTatToan, k('V2').cuoiKy], [500000000, 500000000, 0, 0]);
  assert.deepEqual([k('T1').tang, k('T1').giamTra, k('T1').giamTatToan, k('T1').cuoiKy], [200000000, 0, 200000000, 0], 'tất toán ngoài hệ thống là phát sinh GIẢM riêng, ghi đúng kỳ');
  assert.ok(!r.rows.some(x => ['N1', 'X1'].includes(x.maHoSo)), 'chứng từ chưa giải ngân / hồ sơ hủy không phải dư nợ');
});
dat('D2. Dư nợ cuối kỳ tại hôm nay = dư nợ hiện tại ở Sổ trả nợ / Báo cáo trả nợ / Hạn mức (VND và USD riêng)', () => {
  const r = bc(-100, 0), tn = J(ctx.layBaoCaoTraNo({ nhom: 'DANG_THEO_DOI' })).tongHop;
  assert.equal(r.tong.VND.cuoiKy, tn.VND.duNoGoc); assert.equal(r.tong.USD.cuoiKy, tn.USD.duNoGoc); assert.equal(r.tong.VND.cuoiKy, 600000000 + 300000000); assert.equal(r.tong.USD.cuoiKy, 7500.3);
  const hm = J(ctx.layHanMucTinDung()).tongDaDung; assert.equal(hm, r.tong.VND.cuoiKy + Math.round(r.tong.USD.cuoiKy * 25000), 'quy đổi hạn mức = VND + USD × tỷ giá hồ sơ');
  assert.equal(r.tong.USD.cuoiKyQuyDoiVND, Math.round(7500.3 * 25000)); assert.equal(r.quyDoiVNDTong, r.tong.VND.cuoiKy + r.tong.USD.cuoiKyQuyDoiVND);
});
dat('D3. Báo cáo "tại ngày" quá khứ KHÔNG đổi khi có giao dịch SAU ngày đó; kỳ tương lai/hôm nay đổi', () => {
  const truoc = bc(-100, -35), t0 = bc(-100, 0); tra('V1', 'GOC', 50000000, -20, 'LATE'); tra('W1', 'GOC', 10000000, -2, 'LATE2');
  const sau = bc(-100, -35); assert.deepEqual(J(sau.rows), J(truoc.rows)); assert.deepEqual(J(sau.tong), J(truoc.tong));
  const t1 = bc(-100, 0); assert.equal(t1.tong.VND.cuoiKy, t0.tong.VND.cuoiKy - 60000000, 'hôm nay phản ánh giao dịch mới');
  const ngayDon = bc(-35, -35); assert.equal(ngayDon.tong.VND.dauKy, ngayDon.tong.VND.cuoiKy - ngayDon.tong.VND.tang + ngayDon.tong.VND.giamTra + ngayDon.tong.VND.giamTatToan);
});
dat('D4. Hủy lần trả: dư nợ các kỳ có ngày trả đó được tính lại đúng, lịch sử giữ lại; mở lại tất toán đưa phát sinh giảm tất toán về 0', () => {
  const a = tra('V1', 'GOC', 20000000, -4, 'HUY'), cu = bc(-100, 0).tong.VND.cuoiKy; ctx.huyTraNo(a.maTra, 'Nhập nhầm', rev('V1'));
  assert.equal(bc(-100, 0).tong.VND.cuoiKy, cu + 20000000);
  const k1 = bc(-100, 0).rows.find(x => x.maHoSo === 'T1'); assert.equal(k1.giamTatToan, 200000000);
  ctx.capNhatTatToanHoSo('T1', { daTatToan: false, ngay: '', ghiChu: 'Mở lại để đối soát' }, rev('T1')); const k2 = bc(-100, 0).rows.find(x => x.maHoSo === 'T1'); assert.deepEqual([k2.giamTatToan, k2.cuoiKy], [0, 200000000]);
});
dat('D5. Phạm vi công ty và quyền: người giới hạn công ty A không thấy khoản công ty B; Xem đọc được; loại tiền lọc đúng; tham số sai bị từ chối', () => {
  const day = bc(-100, 0); assert.ok(day.rows.some(r => r.maHoSo === 'W1'));
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => [cty.maCty];
  try { const r = bc(-100, 0); assert.ok(!r.rows.some(x => x.maHoSo === 'W1')); assert.ok(r.rows.length >= 4); } finally { ctx.phamViCongTyNguoiDung_ = goc; }
  assert.equal(J(voi('xem@example.com', () => ctx.api('', 'layBaoCaoDuNoTheoKy', [{ tuNgay: ngay(-10), denNgay: ngay(0) }]))).tuNgay, ngay(-10));
  const u = bc(-100, 0, { loaiTien: 'USD' }); assert.ok(u.rows.every(r => r.loaiTien === 'USD')); assert.equal(Object.keys(u.tong).join(), 'USD');
  assert.throws(() => bc(0, -1), /không được trước/); assert.throws(() => bc(-1, 0, { loaiTien: 'EUR' }), /Loại tiền/); assert.throws(() => ctx.layBaoCaoDuNoTheoKy({ tuNgay: 'abc', denNgay: ngay(0) }), /Từ ngày/);
});
dat('D6. File Excel xuất giữ đúng giá trị, đơn vị tiền, ngày và bộ lọc so với màn hình', () => {
  const docFile = (r) => JSON.parse(Buffer.from(r.base64, 'base64').toString('utf8')), man = bc(-100, 0, { loaiTien: 'VND' });
  const r = J(ctx.xuatBaoCaoDuNo({ tuNgay: ngay(-100), denNgay: ngay(0), loaiTien: 'VND', dinhDang: 'xlsx' })), f = docFile(r);
  assert.match(r.tenFile, new RegExp('DuNo_' + ngay(-100) + '_' + ngay(0))); assert.deepEqual(f.map(s => s.ten), ['Tổng hợp theo loại tiền', 'Chi tiết theo khoản']);
  const ct = f[1].g, dau = ct[0], cot = (t) => dau.findIndex(c => String(c).indexOf(t) === 0);
  assert.ok(cot('Mã hồ sơ') >= 0 && cot('Dư nợ đầu kỳ') >= 0 && cot('Dư nợ cuối kỳ') >= 0 && cot('Loại tiền') >= 0);
  man.rows.forEach(k => { const h = ct.find(x => x[cot('Mã hồ sơ')] === k.maHoSo); assert.ok(h, k.maHoSo); assert.equal(h[cot('Dư nợ đầu kỳ')], k.dauKy); assert.equal(h[cot('Dư nợ cuối kỳ')], k.cuoiKy); assert.equal(h[cot('Loại tiền')], 'VND'); });
  assert.ok(!ct.some(x => x[cot('Mã hồ sơ')] === 'U1'), 'bộ lọc VND: không có khoản USD'); const tH = f[0].g, iC = tH[0].indexOf('Dư nợ cuối kỳ'); assert.equal(tH.find(x => x[0] === 'VND')[iC], man.tong.VND.cuoiKy);
});
Q.ket('báo cáo dư nợ theo kỳ / tại ngày');
