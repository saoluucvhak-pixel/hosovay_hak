// CHỐNG GHI TRÙNG khi bấm/tải lặp: điều kiện ràng buộc, hóa đơn tải lại, bảng lương tải lại. Dữ liệu LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('chong_trung_tl'), { ctx, G, hopDong, themHoSo, dat } = Q;
const n = (s) => { const x = G.boDuLieu.getSheetByName(s); return x ? x.g.length - 1 : 0; };
const hd = hopDong({ soHopDong: 'HD-CT' }); themHoSo({ MaHoSo: 'HS1', MaHD: hd.maHD, SoTienNhanNoLanNay: 5 }); themHoSo({ MaHoSo: 'HS2', MaHD: hd.maHD, SoTienNhanNoLanNay: 5 });
const xml = (so, tien, mst, kh = 'C26TAA') => `<HDon><DLHDon><TTChung><KHHDon>${kh}</KHHDon><SHDon>${so}</SHDon><NLap>2026-09-15</NLap></TTChung><NDHDon><NBan><Ten>CÔNG TY NCC A</Ten><MST>${mst}</MST></NBan><NMua><Ten>CÔNG TY TNHH HIỆP VĨNH AN</Ten><MST>0400000000</MST></NMua><TToan><TgTTTBSo>${tien}</TgTTTBSo></TToan></NDHDon></DLHDon></HDon>`;
const enc = (s) => Buffer.from(s, 'utf8').toString('base64'), up = (ma, ten, x) => ctx.taiLenTaiLieuHoSo(ma, 'HoaDonGTGT', ten, 'text/xml', enc(x));
dat('T1. Điều kiện ràng buộc: lưu hai lần cùng chỉ tiêu (cùng hợp đồng, loại, toán tử; tên khác dấu/khoảng trắng) chỉ tạo MỘT dòng; khác toán tử hoặc đã ngừng áp dụng thì được tạo mới', () => {
  const loai = Object.keys(ctx.LOAI_RANG_BUOC_)[0], rb = { maHD: hd.maHD, tenChiTieu: 'Tỷ lệ vay/tài sản', loai, toanTu: '<=', nguong: 70 }, b = n('DieuKienRangBuoc');
  const a = ctx.luuDieuKienRangBuoc(rb); assert.throws(() => ctx.luuDieuKienRangBuoc(Object.assign({}, rb, { tenChiTieu: 'TY LE  VAY/TAI SAN' })), /đã có điều kiện/); assert.equal(n('DieuKienRangBuoc') - b, 1);
  ctx.luuDieuKienRangBuoc(Object.assign({}, rb, { toanTu: '>=' })); assert.equal(n('DieuKienRangBuoc') - b, 2);
  assert.equal(ctx.luuDieuKienRangBuoc(Object.assign({}, rb, { maRB: a.maRB, nguong: 65 })).daSua, true, 'sửa chính nó không bị coi là trùng');
});
dat('T2. Hóa đơn XML tải hai lần (cùng hồ sơ hoặc hồ sơ khác): chỉ MỘT dòng bảng kê, có cảnh báo, không đếm là “chưa đọc được”; hóa đơn khác số vẫn ghi', () => {
  const x = xml('0000101', '25000000.00', '0311111111'), b = n('BangKeHoaDon'); up('HS1', 'a.xml', x); const r2 = up('HS2', 'b.xml', x);
  assert.equal(n('BangKeHoaDon') - b, 1); assert.equal(r2.soDongDoc, 0); assert.ok(r2.canhBao.some(c => /đã có trong sổ/.test(c)), JSON.stringify(r2.canhBao));
  const r3 = up('HS1', 'c.xml', xml('0000102', '1000000.00', '0311111111')); assert.equal(n('BangKeHoaDon') - b, 2); assert.equal(r3.soDongDoc, 1);
});
dat('T3. Hóa đơn cùng số nhưng KHÁC ký hiệu hoặc khác MST người bán là hóa đơn khác → vẫn ghi', () => {
  const b = n('BangKeHoaDon'); up('HS1', 'd.xml', xml('0000200', '1000000.00', '0311111111', 'C26TAA')); up('HS1', 'e.xml', xml('0000200', '2000000.00', '0311111111', 'C26TBB')); up('HS1', 'f.xml', xml('0000200', '3000000.00', '0322222222', 'C26TAA'));
  assert.equal(n('BangKeHoaDon') - b, 3);
});
dat('T4. Bảng lương tải lại cùng hồ sơ: không ghi thêm dòng (cảnh báo rõ); hồ sơ khác vẫn ghi', () => {
  const cu = ctx.trichXuatBangLuongTuFile_;
  try {
    ctx.trichXuatBangLuongTuFile_ = () => { const a = [{ hoTen: 'Nguyễn Văn A', thang: '10/2026', soTien: 25569000, soTaiKhoan: '111', nganHang: 'BIDV' }, { hoTen: 'Trần Thị B', thang: '10/2026', soTien: 1000000, soTaiKhoan: '222', nganHang: 'BIDV' }]; a.canhBao = []; a.boPhan = []; return a; };
    const b = n('BangKeBangLuong'), g = (ma) => ctx.taiLenTaiLieuHoSo(ma, 'BangLuong', 'l.xlsx', 'application/vnd.ms-excel', enc('x'));
    g('HS1'); assert.equal(n('BangKeBangLuong') - b, 2); const r = g('HS1'); assert.equal(n('BangKeBangLuong') - b, 2); assert.ok(r.canhBao.some(c => /đã có trong hồ sơ/.test(c)));
    g('HS2'); assert.equal(n('BangKeBangLuong') - b, 4);
  } finally { ctx.trichXuatBangLuongTuFile_ = cu; }
});
Q.ket('chống ghi trùng khi bấm/tải lặp');
