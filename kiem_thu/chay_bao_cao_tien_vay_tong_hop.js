// Kiểm thử báo cáo tiền vay tổng hợp: tab 2 (nhóm), tab 3 (sắp theo hạn), tab 4 (chênh lệch tỷ giá USD).
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_bao_cao_tien_vay_tong_hop');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
mt.__email = 'ketoan@example.com';
const c = ctx.luuCongTy({ tenCty: 'Công ty thử', maSoThue: '0400000002', nguoiDaiDien: 'A', diaChiTruSo: 'DN' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: c.maCty, soHopDong: 'HDTH', ngayHopDong: '2026-01-01', tenNganHang: 'VCB', hanMucVay: 1e12 });
const sh = mt.__.boDuLieu.getSheetByName('HoSoGiaiNgan');
const them = (ma, loai, goc, tyGia, due) => sh.g.push(sh.g[0].map(k => ({ MaHoSo: ma, MaHD: hd.maHD, LoaiTien: loai, TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: goc, TyGiaBan: tyGia || 0, NgayGiaiNgan: '2026-01-01', NgayDenHan: due || '2026-12-31', Revision: 1 }[k] ?? '')));
them('A', 'VND', 1000000, 0, '2020-01-01');   // quá hạn, chưa trả
them('B', 'VND', 1000000);                     // trả một phần (VND)
them('C', 'USD', 500, 25000);                  // trả đủ gốc 1 lần, chưa tất toán
them('D', 'VND', 800000);                      // tất toán
them('E', 'USD', 1000, 25000);                 // tất toán ngoài hệ thống (còn dư nợ)
them('G', 'USD', 300, 0);                      // thiếu tỷ giá giải ngân
ctx.tangRevision_('HOSO');
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };
const rev = (ma) => ctx.soRevision_(ctx.layHoSoTheoMa_(ma));

ctx.ghiTyGiaThuCong({ ngay: '2026-01-01', tyGiaBan: '25.000' });
ctx.ghiTyGiaThuCong({ ngay: '2026-02-01', tyGiaBan: '25.500' });
ctx.ghiNhanTraNo('B', { loaiTra: 'GOC', ngayTra: '2026-02-01', soTien: 300000, soThamChieu: 'UNC-B1', chungTu: 'UNC B1' }, rev('B'));
ctx.ghiNhanTraNo('C', { loaiTra: 'GOC', ngayTra: '2026-02-01', soTien: 500, soThamChieu: 'UNC-C1', chungTu: 'UNC C1' }, rev('C'));
ctx.ghiNhanTraNo('D', { loaiTra: 'GOC', ngayTra: '2026-02-01', soTien: 800000, soThamChieu: 'UNC-D1', chungTu: 'UNC D1' }, rev('D'));
ctx.capNhatTatToanHoSo('D', { daTatToan: true, ngay: '2026-02-02', ghiChu: 'Trả đủ, tất toán' }, rev('D'));
ctx.ghiNhanTraNo('G', { loaiTra: 'GOC', ngayTra: '2026-01-15', soTien: 100, soThamChieu: 'UNC-G1', chungTu: 'UNC G1' }, rev('G'));
ctx.capNhatTatToanHoSo('E', { daTatToan: true, ngay: '2026-03-01', ghiChu: 'Khách trả ngoài hệ thống', xacNhanDaTraDuNgoaiHeThong: true }, rev('E'));

const bc = ctx.layBaoCaoTienVayTongHop();

// Tab 2: phân nhóm
const nhom = (ma) => bc.tab2.find(r => r.maHoSo === ma).nhom;
assert.equal(nhom('A'), 'CON_DU'); assert.equal(nhom('B'), 'MOT_PHAN'); assert.equal(nhom('C'), 'MOT_PHAN');
assert.equal(nhom('D'), 'TAT_TOAN'); assert.equal(nhom('E'), 'TAT_TOAN'); assert.equal(nhom('G'), 'MOT_PHAN');
assert.equal(bc.tab2.find(r => r.maHoSo === 'B').duNoGoc, 700000);
dat('Tab 2 phân nhóm đúng: đã giải ngân / tất toán 1 phần / tất toán');

// Tab 3: quá hạn đứng đầu, khoản đã tất toán xuống cuối theo ngày tất toán giảm dần
assert.equal(bc.tab3[0].maHoSo, 'A'); assert.equal(bc.tab3[0].mucDo, 'QUA_HAN');
assert.equal(JSON.stringify(bc.tab3.slice(-2).map(r => r.maHoSo)), JSON.stringify(['E', 'D']));
assert.ok(bc.tab3.slice(0, -2).every(r => r.mucDo !== 'DA_TAT_TOAN'));
dat('Tab 3 sắp theo hạn: quá hạn đứng đầu, đã tất toán xuống cuối (E trước D)');

// Tab 4: chênh lệch tỷ giá USD. Lãi(+)/lỗ(−) = gốc × (TG giải ngân − TG ngày trả)
const dong = (ma) => bc.tab4.filter(r => r.maHoSo === ma);
const c4 = dong('C')[0];
assert.equal(c4.goc, 500); assert.equal(c4.tyGiaGiaiNgan, 25000); assert.equal(c4.tyGiaNgayGiaoDich, 25500); assert.equal(c4.chenhLechVND, -250000);
const e4 = dong('E')[0];
assert.equal(e4.loaiGiaoDich, 'TẤT TOÁN NGOÀI HỆ THỐNG'); assert.equal(e4.goc, 1000); assert.equal(e4.ngayTyGiaDung, '2026-02-01'); assert.equal(e4.chenhLechVND, -500000);
dat('Tab 4: lỗ tỷ giá đúng (C −250.000; E −500.000 dùng tỷ giá gần nhất trước ngày)');

const g4 = dong('G')[0];
assert.equal(g4.canhBao, 'THIEU_TY_GIA_GIAI_NGAN'); assert.equal(g4.chenhLechVND, '');
assert.equal(bc.tongTab4.VND, -750000); assert.equal(bc.tongTab4.soDongThieuTyGia, 1);
assert.ok(!dong('B').length && !dong('D').length && !dong('A').length); // VND không có chênh lệch tỷ giá
dat('Dòng thiếu tỷ giá bị đánh dấu, không cộng; tổng tỷ giá = −750.000; khoản VND không xuất hiện');

console.log('\nTỔNG: ' + ok + ' kiểm tra báo cáo tiền vay tổng hợp đạt, 0 lỗi');
