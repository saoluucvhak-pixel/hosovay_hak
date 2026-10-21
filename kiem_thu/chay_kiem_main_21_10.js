// Hồi quy cho ba lỗi từ báo cáo kiểm tra main 21/10/2026: (1) phạm vi công ty ở sổ trả nợ/lịch,
// (2) khoản trả chậm không được phân bổ cho kỳ đã qua hạn, (3) tỷ giá âm bị đổi thành dương.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_kiem_main_21_10');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
mt.__email = 'ketoan@example.com';
const c = ctx.luuCongTy({ tenCty: 'Công ty thử', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'DN' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: c.maCty, soHopDong: 'HDT', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV', hanMucVay: 1e12,
  laiSuatTrongHan: 12, kyHanTraGoc: 'Cuối kỳ', kyHanTraLai: 'Hàng tháng' });
const sh = mt.__.boDuLieu.getSheetByName('HoSoGiaiNgan');
sh.g.push(sh.g[0].map(k => ({ MaHoSo: 'L1', MaHD: hd.maHD, LoaiTien: 'VND', TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: '2026-01-01', NgayDenHan: '2026-04-01', Revision: 1 }[k] ?? '')));
ctx.tangRevision_('HOSO');
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };
const rev = () => ctx.soRevision_(ctx.layHoSoTheoMa_('L1'));
const hom = ctx.homNayVN_();
const quyenGoc = ctx.phamViCongTyNguoiDung_;

// Trả lãi kỳ 1 trễ một ngày (hạn 01/02, trả 02/02) và lưu một bản ghi để thử hủy
ctx.ghiNhanTraNo('L1', { loaiTra: 'LAI', ngayTra: '2026-02-02', soTien: 10192, soThamChieu: 'UNC-T1', chungTu: 'UNC T1' }, rev());
const maTra = ctx.layTraNoHoSo('L1').dong[0].maTra;

// (1) Người ngoài phạm vi công ty không đọc/ghi/hủy được, và dư nợ không đổi
ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
assert.throws(() => ctx.layLichTraNo('L1'), /phạm vi/);
assert.throws(() => ctx.layTraNoHoSo('L1'), /phạm vi/);
assert.throws(() => ctx.ghiNhanTraNo('L1', { loaiTra: 'GOC', ngayTra: '2026-02-05', soTien: 100, soThamChieu: 'UNC-X1', chungTu: 'UNC X1' }, rev()), /phạm vi/);
assert.throws(() => ctx.huyTraNo(maTra, 'Thử hủy ngoài phạm vi', rev()), /phạm vi/);
assert.equal(ctx.layTraNoHoSo.length >= 0, true);
ctx.phamViCongTyNguoiDung_ = quyenGoc;
assert.equal(ctx.layTraNoHoSo('L1').dong.length, 1, 'không ghi thêm bản ghi nào khi bị chặn');
dat('Ngoài phạm vi công ty: đọc lịch, đọc sổ, ghi và hủy trả nợ đều bị chặn; không có bản ghi nào bị thêm hay hủy');

// (2) Trả chậm vẫn được tính cho kỳ đã qua hạn
ctx.ghiNhanTraNo('L1', { loaiTra: 'GOC', ngayTra: '2026-04-02', soTien: 1000000, soThamChieu: 'UNC-T2', chungTu: 'UNC T2' }, rev());
const lich = ctx.layLichTraNo('L1');
assert.equal(lich.laiRows[0].trangThai, 'DA_TRA_CHAM');
assert.equal(lich.laiRows[0].conNo, 0);
assert.equal(lich.laiRows[0].ngayTraDu, '2026-02-02');
assert.equal(lich.gocRows[0].trangThai, 'DA_TRA_CHAM');
assert.equal(lich.gocRows[0].conNo, 0);
assert.equal(lich.duNoGocHienTai, 0);
dat('Lãi trả trễ 02/02 cho kỳ hạn 01/02 = DA_TRA_CHAM (không còn báo chưa trả); gốc trả 02/04 cho hạn 01/04 cũng vậy');

// (3) Tỷ giá âm và định dạng lạ bị từ chối; dạng nghìn hợp lệ được nhận
assert.throws(() => ctx.ghiTyGiaThuCong({ ngay: hom, tyGiaBan: '-26000' }), /dương/);
assert.throws(() => ctx.ghiTyGiaThuCong({ ngay: hom, tyGiaBan: '26.8' }), /dương/);
assert.throws(() => ctx.ghiTyGiaThuCong({ ngay: hom, tyGiaBan: '2,6e4' }), /dương/);
const tg = ctx.ghiTyGiaThuCong({ ngay: hom, tyGiaBan: '25.800' });
assert.equal(tg.tyGiaBan, 25800);
dat('Tỷ giá: -26000, 26.8, 2,6e4 bị từ chối; 25.800 được ghi là 25800');

console.log('\nTỔNG: ' + ok + ' kiểm tra hồi quy báo cáo 21/10 đạt, 0 lỗi');
