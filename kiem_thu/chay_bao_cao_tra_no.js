// Kiểm thử trạng thái tất toán suy ra từ số dư, lọc "Trả một phần", và báo cáo khế ước vay.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_bao_cao_tra_no');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
mt.__email = 'ketoan@example.com';
const c = ctx.luuCongTy({ tenCty: 'Công ty thử', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'DN' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: c.maCty, soHopDong: 'HDT', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV', hanMucVay: 1e12 });
const sh = mt.__.boDuLieu.getSheetByName('HoSoGiaiNgan');
const them = (ma, loai, goc) => sh.g.push(sh.g[0].map(k => ({ MaHoSo: ma, MaHD: hd.maHD, LoaiTien: loai, TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: goc, NgayGiaiNgan: '2026-01-01', NgayDenHan: '2026-12-31', Revision: 1 }[k] ?? '')));
them('A', 'VND', 1000000);  // chưa trả
them('B', 'VND', 1000000);  // trả một phần
them('C', 'USD', 500);      // đủ gốc, chưa tất toán (USD)
them('D', 'VND', 800000);   // đã tất toán
ctx.tangRevision_('HOSO');
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };
const rev = (ma) => ctx.soRevision_(ctx.layHoSoTheoMa_(ma));

ctx.ghiNhanTraNo('B', { loaiTra: 'GOC', ngayTra: '2026-02-01', soTien: 300000, soThamChieu: 'UNC-B1', chungTu: 'UNC B1' }, rev('B'));
ctx.ghiNhanTraNo('B', { loaiTra: 'LAI', ngayTra: '2026-02-10', soTien: 20000, soThamChieu: 'UNC-B2', chungTu: 'UNC B2' }, rev('B'));
ctx.ghiNhanTraNo('C', { loaiTra: 'GOC', ngayTra: '2026-02-01', soTien: 500, soThamChieu: 'UNC-C1', chungTu: 'UNC C1' }, rev('C'));
ctx.ghiNhanTraNo('D', { loaiTra: 'GOC', ngayTra: '2026-02-01', soTien: 800000, soThamChieu: 'UNC-D1', chungTu: 'UNC D1' }, rev('D'));
ctx.capNhatTatToanHoSo('D', { daTatToan: true, ngay: '2026-02-02', ghiChu: 'Trả đủ, tất toán' }, rev('D'));

const trang = (ma) => ctx.layTrangTatToan({ trangThai: 'TAT_CA' }).data.find(r => r.maHoSo === ma).trangThaiTraNo;
assert.equal(trang('A'), 'CHUA_TRA'); assert.equal(trang('B'), 'TRA_MOT_PHAN');
assert.equal(trang('C'), 'DU_GOC_CHUA_TAT_TOAN'); assert.equal(trang('D'), 'DA_TAT_TOAN');
dat('Trạng thái suy ra đúng: chưa trả / trả một phần / đủ gốc chưa tất toán / đã tất toán');

const mot = ctx.layTrangTatToan({ trangThai: 'MOT_PHAN' }).data.map(r => r.maHoSo);
assert.equal(JSON.stringify(mot), JSON.stringify(['B']));
dat('Bộ lọc "Trả một phần" chỉ trả khoản B');

// Tất toán ngoài hệ thống khi còn dư nợ
ctx.capNhatTatToanHoSo('A', { daTatToan: true, ngay: '2026-03-01', ghiChu: 'Khách trả ngoài hệ thống', xacNhanDaTraDuNgoaiHeThong: true }, rev('A'));
assert.equal(trang('A'), 'TAT_TOAN_NGOAI_HE_THONG');
dat('Tất toán ngoài hệ thống (còn dư nợ) được gắn nhãn riêng');

const bc = ctx.layBaoCaoTraNo({ nhom: 'DANG_THEO_DOI' });
assert.equal(JSON.stringify(bc.rows.map(r => r.maHoSo)), JSON.stringify(['B', 'C']));
const b = bc.rows.find(r => r.maHoSo === 'B');
assert.equal(b.daTraGoc, 300000); assert.equal(b.duNoGoc, 700000); assert.equal(b.daTraLai, 20000); assert.equal(b.soLanTra, 2); assert.equal(b.ngayTraGanNhat, '2026-02-10');
dat('Báo cáo đang theo dõi: B có đã trả gốc 300.000, dư nợ 700.000, lãi 20.000, 2 lần trả');
assert.equal(bc.tongHop.VND.duNoGoc, 700000); assert.equal(bc.tongHop.USD.duNoGoc, 0); assert.equal(bc.tongHop.USD.daTraGoc, 500);
dat('Tổng hợp theo loại tiền đúng (VND và USD tách riêng)');

const da = ctx.layBaoCaoTraNo({ nhom: 'DA_TAT_TOAN' });
assert.equal(JSON.stringify(da.rows.map(r => r.maHoSo)), JSON.stringify(['A', 'D'])); // A: tất toán ngoài hệ thống, còn dư nợ hiển thị trong báo cáo
const tatCa = ctx.layBaoCaoTraNo({ nhom: 'TAT_CA' });
assert.equal(tatCa.tongSo, 4);
assert.equal(tatCa.demTrangThai.TAT_TOAN_NGOAI_HE_THONG, 1);
dat('Báo cáo đã tất toán và tất cả khớp số lượng theo trạng thái');

assert.throws(() => ctx.layBaoCaoTraNo({ nhom: 'XYZ' }), /không hợp lệ/);
dat('Nhóm báo cáo sai bị chặn');

console.log('\nTỔNG: ' + ok + ' kiểm tra báo cáo khế ước đạt, 0 lỗi');
