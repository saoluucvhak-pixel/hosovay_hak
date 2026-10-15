/* ĐO HIỆU NĂNG THEO QUY MÔ DỮ LIỆU (100 / 1.000 / 5.000 / 10.000 hồ sơ) trên dịch vụ Apps Script GIẢ LẬP.
 * Đo: số lần đọc/ghi range, số ô đọc/ghi (đại diện cho tải lên Google Sheets) và thời gian CPU Node (KHÔNG phải độ trễ Google thật).
 * Kết luận về thời gian phản hồi THẬT trên Google Sheets/Drive KHÔNG thể rút ra từ đây — phải đo trên Apps Script thật.
 * node kiem_thu/chay_hieu_nang.js [thư_mục_ra] [N1,N2,...]      Sinh BAO_CAO_HIEU_NANG.md */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..'), RA = path.resolve(process.argv[2] || '/tmp/hosovay_hieu_nang'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const CO = (process.argv[3] || '100,1000,5000,10000').split(',').map(Number);
const _l = console.log; console.warn = () => {}; console.error = () => {}; console.log = () => {};
const TI = require('./gia_lap_apps_script');
const dong = [];

function chayQuyMo(N) {
  const { ctx, mt } = TI(GOC, path.join(RA, '_tam' + N)); const G = mt.__;
  ctx.initializeSpreadsheet();
  const cty = ctx.luuCongTy({ tenCty: 'CTY PERF', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
  const hd = ctx.luuHopDong({ maCty: cty.maCty, soHopDong: 'HD-PERF', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 9e12 });
  // nạp dữ liệu hàng loạt thẳng vào sheet (giống dữ liệu đã tích luỹ)
  const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), ct = G.boDuLieu.getSheetByName('ChiTietThuHuong');
  const hh = sh.g[0], hc = ct.g[0];
  for (let i = 1; i <= N; i++) {
    const ma = 'HS' + String(100000 + i);
    const r = hh.map(() => ''); const set = (k, v) => { const c = hh.indexOf(k); if (c >= 0) r[c] = v; };
    set('MaHoSo', ma); set('MaHD', hd.maHD); set('LoaiTien', 'VND'); set('SoTienNhanNoLanNay', 3000000); set('DuNoHienTai', 1000000); set('TrangThai', i % 3 === 0 ? 'Đã tạo hồ sơ' : 'Nháp');
    set('NgayGiaiNgan', new Date(2026, i % 12, 1 + (i % 28))); set('NgayTao', new Date(2026, i % 12, 1)); set('Revision', 1); set('SoGiayNhanNo', 'GNN-' + i); set('LoaiHoSoGiaiNgan', '');
    sh.g.push(r);
    for (let k = 1; k <= 2; k++) { const c = hc.map(() => ''); const sc = (kk, v) => { const x = hc.indexOf(kk); if (x >= 0) c[x] = v; }; sc('MaHoSo', ma); sc('STT', k); sc('TenNguoiHuong', 'NCC ' + (i % 50)); sc('SoTaiKhoan', '1234' + i); sc('SoTien', k === 1 ? 1000000 : 2000000); sc('SoTienQuyDoi', k === 1 ? 1000000 : 2000000); sc('LoaiTien', 'VND'); ct.g.push(c); }
  }
  ctx.tangRevision_('HOSO');
  const maGiua = 'HS' + String(100000 + Math.ceil(N / 2)), maCuoi = 'HS' + String(100000 + N);
  const do_ = (ten, f) => {
    mt.__soLanDocRange = 0; mt.__soODoc = 0; mt.__soLanGhiRange = 0; mt.__soOGhi = 0;
    const t0 = process.hrtime.bigint(); let ok = true, loi = ''; try { f(); } catch (e) { ok = false; loi = String(e.message).slice(0, 80); }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    dong.push({ N, ten, ms: Math.round(ms * 10) / 10, docRange: mt.__soLanDocRange, oDoc: mt.__soODoc, ghiRange: mt.__soLanGhiRange, oGhi: mt.__soOGhi, ok, loi });
  };
  mt.__email = 'ketoan@example.com';
  do_('Tải danh sách (layDuLieuKhoiTao, bỏ qua cache)', () => ctx.layDuLieuKhoiTao({ boQuaCache: true }));
  do_('Tải danh sách (layDuLieuKhoiTao, cache danh mục)', () => ctx.layDuLieuKhoiTao({}));
  do_('Tìm kiếm/lọc hồ sơ (locDanhSachHoSo)', () => ctx.locDanhSachHoSo({ tuKhoa: 'GNN-' + Math.ceil(N / 2) }));
  do_('Mở một hồ sơ (layDuLieuDayDu)', () => ctx.layDuLieuDayDu(maGiua));
  do_('Lưu sửa một hồ sơ (luuHoSoGiaiNgan)', () => { const h = ctx.layHoSoTheoMa_(maCuoi); ctx.luuHoSoGiaiNgan({ maHoSo: maCuoi, expectedRevision: h.Revision, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 1000000, soTienNhanNoLanNay: 3000000, soGiayNhanNo: 'GNN-X', ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: [{ tenNguoiHuong: 'NCC 1', soTaiKhoan: '1', taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt', soTien: 1000000, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' }, { tenNguoiHuong: 'NCC 2', soTaiKhoan: '2', taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt', soTien: 2000000, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' }] }); });
  do_('Báo cáo tiền vay (layBaoCaoTienVay)', () => ctx.layBaoCaoTienVay('', '', '', '', '', true));
  do_('Báo cáo đối soát (layBaoCaoDoiSoat)', () => ctx.layBaoCaoDoiSoat());
}
CO.forEach(chayQuyMo);

let md = '# BÁO CÁO HIỆU NĂNG THEO QUY MÔ DỮ LIỆU\n\n> **Môi trường:** dịch vụ Apps Script GIẢ LẬP (Node). Cột "ms" là **thời gian CPU của Node**, KHÔNG phải độ trễ Google Sheets/Drive thật. Các cột "lần đọc/ô đọc" phản ánh KHỐI LƯỢNG truy cập Sheets (đo được, so sánh tương đối giữa các quy mô). **Chưa có số đo trên Google Apps Script thật** — không được kết luận hệ thống "đạt hiệu năng" trên môi trường thật từ báo cáo này.\n\n';
CO.forEach(N => {
  md += `## ${N.toLocaleString('vi-VN')} hồ sơ (+ ${(N * 2).toLocaleString('vi-VN')} dòng chi tiết)\n\n| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | lần ghi range | ô ghi | kết quả |\n|---|---:|---:|---:|---:|---:|---|\n` + dong.filter(d => d.N === N).map(d => `| ${d.ten} | ${d.ms} | ${d.docRange} | ${d.oDoc.toLocaleString('vi-VN')} | ${d.ghiRange} | ${d.oGhi.toLocaleString('vi-VN')} | ${d.ok ? 'OK' : 'LỖI: ' + d.loi} |`).join('\n') + '\n\n';
});
fs.writeFileSync(path.join(RA, 'BAO_CAO_HIEU_NANG.md'), md);
_l(md);
// Ngưỡng hồi quy: SỐ LẦN đọc range không được phụ thuộc số hồ sơ (chống O(N) / O(N²) lần gọi Sheets).
const NGUONG = { 'Báo cáo đối soát (layBaoCaoDoiSoat)': 20, 'Mở một hồ sơ (layDuLieuDayDu)': 10, 'Tìm kiếm/lọc hồ sơ (locDanhSachHoSo)': 10, 'Lưu sửa một hồ sơ (luuHoSoGiaiNgan)': 40, 'Tải danh sách (layDuLieuKhoiTao, bỏ qua cache)': 10, 'Báo cáo tiền vay (layBaoCaoTienVay)': 10 };
dong.forEach(d => { const g = NGUONG[d.ten]; if (g !== undefined && d.docRange > g) { d.ok = false; d.loi = `số lần đọc range ${d.docRange} > ngưỡng ${g} (tăng theo quy mô)`; } });
const loi = dong.filter(d => !d.ok).length;
_l(`TỔNG: ${dong.length} phép đo trên ${CO.length} quy mô, ${loi} lỗi. Báo cáo: ${path.join(RA, 'BAO_CAO_HIEU_NANG.md')}`);
process.exit(loi ? 1 : 0);
