// Kiểm thử sổ trả nợ (TRANONO.gs): dư nợ gốc, chặn vượt dư nợ, chặn trùng tham chiếu, hủy, chặn tất toán khi còn dư nợ.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_tra_no');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);

ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
mt.__email = 'ketoan@example.com';

const c = ctx.luuCongTy({ tenCty: 'Công ty thử', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'DN' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: c.maCty, soHopDong: 'HDT', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV', hanMucVay: 1e12 });
const sh = mt.__.boDuLieu.getSheetByName('HoSoGiaiNgan');
sh.g.push(sh.g[0].map(k => ({ MaHoSo: 'HS1', MaHD: hd.maHD, LoaiTien: 'VND', TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: '2026-01-01', Revision: 1 }[k] ?? '')));
ctx.tangRevision_('HOSO');

const rev = () => ctx.soRevision_(ctx.layHoSoTheoMa_('HS1'));
const duNo = () => ctx.layTraNoHoSo('HS1').duNoGoc;
let ok = 0;
const dat = (ten) => { ok++; console.log('PASS ' + ten); };

// 1. Trả gốc hợp lệ → dư nợ giảm
let r1 = ctx.ghiNhanTraNo('HS1', { loaiTra: 'GOC', ngayTra: '2026-02-01', soTien: 300000, soThamChieu: 'UNC001', chungTu: 'UNC 001 ngày 01/02' }, rev());
assert.equal(duNo(), 700000);
dat('Trả gốc 300.000 → dư nợ gốc còn 700.000');

// 2. Trả gốc vượt dư nợ → bị chặn
assert.throws(() => ctx.ghiNhanTraNo('HS1', { loaiTra: 'GOC', ngayTra: '2026-02-05', soTien: 800000, soThamChieu: 'UNC002', chungTu: 'UNC 002' }, rev()), /vượt dư nợ/);
assert.equal(duNo(), 700000);
dat('Trả gốc vượt dư nợ bị chặn, dư nợ không đổi');

// 3. Trùng số tham chiếu giao dịch → bị chặn
assert.throws(() => ctx.ghiNhanTraNo('HS1', { loaiTra: 'GOC', ngayTra: '2026-02-06', soTien: 100000, soThamChieu: 'unc001', chungTu: 'UNC 001 lặp' }, rev()), /đã dùng/);
dat('Trùng số tham chiếu (không phân biệt hoa thường) bị chặn');

// 4. Trả lãi không làm thay đổi dư nợ gốc
ctx.ghiNhanTraNo('HS1', { loaiTra: 'LAI', ngayTra: '2026-02-10', soTien: 50000, soThamChieu: 'UNC003', chungTu: 'UNC 003 lãi' }, rev());
assert.equal(duNo(), 700000);
assert.equal(ctx.layTraNoHoSo('HS1').daTraLai, 50000);
dat('Trả lãi ghi nhận riêng, dư nợ gốc giữ nguyên');

// 5. Revision cũ → bị chặn (xung đột đa phiên)
assert.throws(() => ctx.ghiNhanTraNo('HS1', { loaiTra: 'GOC', ngayTra: '2026-02-11', soTien: 10000, soThamChieu: 'UNC004', chungTu: 'UNC 004' }, 1));
dat('Revision cũ bị chặn');

// 6. Hủy bản ghi gốc → dư nợ trở lại; bắt buộc có lý do
assert.throws(() => ctx.huyTraNo(r1.maTra, '', rev()), /lý do/);
ctx.huyTraNo(r1.maTra, 'Nhập nhầm số tiền', rev());
assert.equal(duNo(), 1000000);
dat('Hủy bản ghi trả gốc (không xoá) khôi phục dư nợ; bắt buộc có lý do');

// 7. Tất toán khi còn dư nợ → bị chặn; khi trả đủ thì được
assert.throws(() => ctx.capNhatTatToanHoSo('HS1', { daTatToan: true, ngay: '2026-02-20', ghiChu: 'Thử tất toán sớm' }, rev()), /Còn dư nợ/);
dat('Tất toán khi còn dư nợ gốc bị chặn');
ctx.ghiNhanTraNo('HS1', { loaiTra: 'GOC', ngayTra: '2026-02-20', soTien: 1000000, soThamChieu: 'UNC005', chungTu: 'UNC 005 trả đủ' }, rev());
assert.equal(duNo(), 0);
ctx.capNhatTatToanHoSo('HS1', { daTatToan: true, ngay: '2026-02-20', ghiChu: 'Đã trả đủ gốc theo UNC 005' }, rev());
dat('Trả đủ gốc → dư nợ 0 → cho phép tất toán');

// 8. Hồ sơ đã tất toán: không cho trả thêm
assert.throws(() => ctx.ghiNhanTraNo('HS1', { loaiTra: 'GOC', ngayTra: '2026-03-01', soTien: 1, soThamChieu: 'UNC006', chungTu: 'UNC 006' }, rev()), /tất toán/);
dat('Đã tất toán → chặn ghi nhận trả nợ mới');

console.log('\nTỔNG: ' + ok + ' kiểm tra sổ trả nợ đạt, 0 lỗi');
