// Kiểm thử lịch trả nợ theo kỳ, lãi theo dư nợ thực tế, cấu hình ACT/365–ACT/360 và số ngày nhắc.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_lich_tra_no');
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

// Cấu hình mặc định ACT/365, nhắc 7 ngày
let lich = ctx.layLichTraNo('L1');
assert.equal(lich.coSoNgay, 365);
assert.equal(lich.laiRows.length, 3);
assert.deepEqual([lich.laiRows[0].laiPhaiTra, lich.laiRows[1].laiPhaiTra, lich.laiRows[2].laiPhaiTra], [10192, 9205, 10192]);
assert.equal(lich.gocRows.length, 1); assert.equal(lich.gocRows[0].gocPhaiTra, 1000000); assert.equal(lich.gocRows[0].ngayDen, '2026-04-01');
dat('Lịch lãi hàng tháng ACT/365: 10.192 / 9.205 / 10.192; gốc trả một lần cuối kỳ 1.000.000');

// Trả gốc 500.000 ngày 15/02: kỳ 2 chỉ tính trên phần dư nợ còn lại sau ngày đó
ctx.ghiNhanTraNo('L1', { loaiTra: 'GOC', ngayTra: '2026-02-15', soTien: 500000, soThamChieu: 'UNC-L1', chungTu: 'UNC L1' }, rev());
lich = ctx.layLichTraNo('L1');
assert.equal(lich.laiRows[1].laiPhaiTra, 6904);  // 1e6×12%×14/365 + 5e5×12%×14/365
dat('Lãi theo dư nợ thực tế: kỳ 2 còn 6.904 sau khi trả gốc giữa kỳ');

// Trả lãi kỳ 1 đủ 10.192 ngày 01/02 → kỳ 1 đã trả đủ, kỳ 2 quá hạn (ngày hôm nay sau 01/03)
ctx.ghiNhanTraNo('L1', { loaiTra: 'LAI', ngayTra: '2026-02-01', soTien: 10192, soThamChieu: 'UNC-L2', chungTu: 'UNC L2' }, rev());
lich = ctx.layLichTraNo('L1');
assert.equal(lich.laiRows[0].trangThai, 'DA_TRA_DU');
assert.equal(lich.laiRows[1].conNo, 6904);
assert.equal(lich.laiRows[1].trangThai, 'QUA_HAN');
dat('Trạng thái kỳ: kỳ đã trả đủ = DA_TRA_DU; kỳ chưa trả và đã qua hạn = QUA_HAN');

// Cấu hình: người thường không sửa được; quản trị lưu ACT/360 và 10 ngày nhắc
const quyenGoc = ctx.laQuanTri_; ctx.laQuanTri_ = () => false;
assert.throws(() => ctx.luuThietLapNhacNo({ ngayNhacTruocHan: 10, quyUocNgayLai: 'ACT/360' }), /quản trị|quyền/i);
ctx.laQuanTri_ = quyenGoc;
dat('Người không phải quản trị không sửa được cấu hình');
const laQuanTriGoc = ctx.laQuanTri_;
ctx.laQuanTri_ = () => true;   // giả lập đăng nhập quản trị
ctx.luuThietLapNhacNo({ ngayNhacTruocHan: 10, quyUocNgayLai: 'ACT/360' });
ctx.laQuanTri_ = laQuanTriGoc;
const cfg = ctx.layThietLapNhacNo();
assert.equal(cfg.ngayNhacTruocHan, 10); assert.equal(cfg.quyUocNgayLai, 'ACT/360');
lich = ctx.layLichTraNo('L1');
assert.equal(lich.coSoNgay, 360);
assert.equal(lich.laiRows[0].laiPhaiTra, 10333);   // 1e6×12%×31/360
dat('Quản trị lưu ACT/360 và 10 ngày nhắc; lịch lãi kỳ 1 đổi thành 10.333');

ctx.laQuanTri_ = () => true;
assert.throws(() => ctx.luuThietLapNhacNo({ ngayNhacTruocHan: 0, quyUocNgayLai: 'ACT/365' }), /từ 1 đến 60/);
assert.throws(() => ctx.luuThietLapNhacNo({ ngayNhacTruocHan: 5, quyUocNgayLai: 'ACT/999' }), /ACT\/365 hoặc ACT\/360/);
ctx.laQuanTri_ = laQuanTriGoc;
dat('Số ngày nhắc ngoài 1–60 và quy ước lạ bị chặn');

// Kỳ hạn đọc từ chữ
assert.equal(ctx.parseKyThang_('Hàng quý', 1), 3);
assert.equal(ctx.parseKyThang_('6 tháng', 1), 6);
assert.equal(ctx.parseKyThang_('Cuối kỳ', 1), 0);
dat('Đọc đúng kỳ hạn: hàng quý = 3, 6 tháng = 6, cuối kỳ = 0');

console.log('\nTỔNG: ' + ok + ' kiểm tra lịch trả nợ đạt, 0 lỗi');
