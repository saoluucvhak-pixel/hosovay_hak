const assert = require('assert/strict');
const Q = require('./_qlv_chung')('lai_tham_chieu'), { ctx: c, dat } = Q;
const h = { MaHoSo: 'TEST', LoaiTien: 'VND', SoTienNhanNoLanNay: 100000000, NgayGiaiNgan: '2026-01-01', NgayDenHan: '2026-04-01' };
const hd = { 'LaiSuatTrongHan_%': 12, KyHanTraLai: 'Cuối kỳ', KyHanTraGoc: 'Cuối kỳ' };
dat('Lãi cuối kỳ: một kỳ, không quá hạn trước đáo hạn, ACT/365 và ACT/360', () => {
  for (const base of [365, 360]) {
    const cfg = { coSo: base, nhac: 7, today: '2026-02-15' };
    const r = c.tinhLichTraNo_(h, hd, [], cfg);
    assert.equal(r.laiRows.length, 1); assert.equal(r.laiRows[0].denNgay, '2026-04-01');
    assert.equal(r.laiRows[0].trangThai, 'CHUA_DEN_HAN');
    assert.equal(r.tong.laiPhaiTra, Math.round(100000000 * .12 * 90 / base));
    assert.equal(c.tinhLaiPhat_(h, hd, [], cfg, { tyLeQuaHan: 150, chamTraNam: 10 }).laiPhatTrenLai, 0);
  }
});
dat('Cuối kỳ USD giảm dư nợ sau trả gốc, làm tròn cent', () => {
  const r = c.tinhLichTraNo_({ ...h, LoaiTien: 'USD', SoTienNhanNoLanNay: 1000 }, hd,
    [{ LoaiTra: 'GOC', NgayTra: '2026-02-01', SoTien: 400 }], { coSo: 365, nhac: 7, today: '2026-04-02' });
  assert.equal(r.tong.laiPhaiTra, Math.round((1000 * 31 + 600 * 59) * .12 / 365 * 100) / 100);
  assert.equal(r.laiRows[0].trangThai, 'QUA_HAN');
});
const contract = Q.hopDong();
Q.themHoSo({ MaHoSo: 'REF', MaHD: contract.maHD, SoTienNhanNoLanNay: 100000000, NgayGiaiNgan: Q.ngay(-30), NgayDenHan: Q.ngay(90) });
const pay = ref => ({ loaiTra: 'LAI', ngayTra: Q.homNay(), soTien: 100, soThamChieu: ref, chungTu: 'UNC test' });
dat('Tham chiếu hậu tố P/L/G và hoa thường không được ghi hai lần; từ chối không đổi revision', () => {
  for (const suffix of ['P', 'L', 'G']) {
    const ref = 'AUD-' + suffix;
    c.ghiNhanTraNo('REF', pay(ref), Q.rev('REF'));
    const before = JSON.stringify(c.layTraNoHoSo('REF')), rev = Q.rev('REF');
    assert.throws(() => c.ghiNhanTraNo('REF', pay(' ' + ref.toLowerCase() + ' '), rev), /đã dùng/);
    assert.equal(Q.rev('REF'), rev); assert.equal(JSON.stringify(c.layTraNoHoSo('REF')), before);
  }
});
const group = ref => ({ ngayTra: Q.homNay(), soTien: 200, soThamChieu: ref, chungTu: 'UNC test', phanBo: { phat: 0, lai: 100, goc: 100 } });
dat('Trả gộp vẫn ghi được hai phần, phát lại không tạo thêm dòng', () => {
  assert.equal(c.ghiNhanTraNoGop('REF', group('GROUP-001'), Q.rev('REF')).parts.length, 2);
  const before = JSON.stringify(c.layTraNoHoSo('REF')), rev = Q.rev('REF');
  assert.throws(() => c.ghiNhanTraNoGop('REF', group('GROUP-001'), rev), /đã dùng/);
  assert.equal(Q.rev('REF'), rev); assert.equal(JSON.stringify(c.layTraNoHoSo('REF')), before);
});
dat('Không chuyển giao dịch đơn đã ghi thành giao dịch gộp trùng mã', () => {
  c.ghiNhanTraNo('REF', pay('SINGLE-001'), Q.rev('REF'));
  assert.throws(() => c.ghiNhanTraNoGop('REF', group('SINGLE-001'), Q.rev('REF')), /đã dùng/);
});
Q.ket('hồi quy lãi cuối kỳ / tham chiếu');
