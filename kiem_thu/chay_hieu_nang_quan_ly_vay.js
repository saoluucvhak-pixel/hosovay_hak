/* ĐO HIỆU NĂNG các API QUẢN LÝ VAY theo quy mô (100 / 1.000 / 5.000 khoản đang vay) trên dịch vụ Apps Script GIẢ LẬP.
 * Đo SỐ LẦN đọc range (không được tăng theo số khoản) và thời gian CPU Node (KHÔNG phải độ trễ Google thật).
 * node kiem_thu/chay_hieu_nang_quan_ly_vay.js [thư_mục_ra] [N1,N2,...] */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..'), RA = path.resolve(process.argv[2] || '/tmp/hosovay_hieu_nang_qlv'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const CO = (process.argv[3] || '100,1000,5000').split(',').map(Number);
const _l = console.log; console.warn = () => {}; console.error = () => {}; console.log = () => {};
const TI = require('./gia_lap_apps_script'); const dong = [];
function chay(N) {
  const { ctx, mt } = TI(GOC, path.join(RA, '_tam' + N)); const G = mt.__; ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx); mt.__email = 'ketoan@example.com';
  const cty = ctx.luuCongTy({ tenCty: 'CTY PERF', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
  const hds = []; for (let i = 0; i < 20; i++) hds.push(ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-P' + i, ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 9e12, laiSuatTrongHan: 10, kyHanTraLai: 'Hàng tháng', kyHanTraGoc: 'Hàng quý' }));
  const today = ctx.homNayVN_(), cong = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), hh = sh.g[0], tn = ctx.ensureSheet_(G.boDuLieu, 'TraNoHoSo', ctx.COT_TRA_NO_), ht = tn.g[0];
  for (let i = 1; i <= N; i++) {
    const r = hh.map(() => ''), set = (k, v) => { const c = hh.indexOf(k); if (c >= 0) r[c] = v; }, usd = i % 5 === 0;
    set('MaHoSo', 'HS' + (100000 + i)); set('MaHD', hds[i % 20].maHD); set('LoaiTien', usd ? 'USD' : 'VND'); set('TyGiaBan', usd ? 25000 : ''); set('SoTienNhanNoLanNay', usd ? 1000 + i : 3000000 + i);
    set('TrangThai', 'Đã giải ngân'); set('NgayGiaiNgan', cong(today, -(30 + i % 200))); set('NgayDenHan', cong(today, (i % 3 === 0 ? -(i % 90) : 120 + i % 200))); set('Revision', 1); set('SoGiayNhanNo', 'GNN-' + i);
    sh.g.push(r);
    if (i % 4 === 0) { const t = ht.map(() => ''), st = (k, v) => { const c = ht.indexOf(k); if (c >= 0) t[c] = v; }; st('MaTra', 'TN-' + i); st('MaHoSo', 'HS' + (100000 + i)); st('NgayTra', cong(today, -5)); st('LoaiTra', 'GOC'); st('SoTien', usd ? 100 : 500000); st('LoaiTien', usd ? 'USD' : 'VND'); st('SoThamChieu', 'REF' + i); st('TrangThai', 'Hiệu lực'); tn.g.push(t); }
  }
  ctx.tangRevision_('HOSO'); ctx.ghiTyGiaThuCong({ ngay: today, tyGiaBan: 26000, ghiChu: 'perf' });
  const saoKe = 'Ngày;Số tham chiếu;Ghi nợ;Ghi có\n' + Array.from({ length: 300 }, (_, i) => cong(today, -5).split('-').reverse().join('/') + ';REF' + (i * 4 + 4) + ';' + (i % 2 ? '500.000' : '') + ';' + (i % 2 ? '' : '1.000')).join('\n');
  const do_ = (ten, f) => { mt.__soLanDocRange = 0; mt.__soODoc = 0; const t0 = process.hrtime.bigint(); let ok = true, loi = ''; try { f(); } catch (e) { ok = false; loi = String(e.message).slice(0, 80); }
    dong.push({ N, ten, ms: Math.round(Number(process.hrtime.bigint() - t0) / 1e5) / 10, docRange: mt.__soLanDocRange, oDoc: mt.__soODoc, ok, loi }); };
  do_('Hạn mức tín dụng (layHanMucTinDung)', () => ctx.layHanMucTinDung());
  do_('Dự báo dòng tiền 12 tháng (layDuBaoDongTien)', () => ctx.layDuBaoDongTien({ soThang: 12 }));
  do_('Phân tích nợ quá hạn (layPhanTichQuaHan)', () => ctx.layPhanTichQuaHan());
  do_('Ràng buộc (layDieuKienRangBuoc)', () => ctx.layDieuKienRangBuoc(''));
  do_('Bảng điều hành (layBangDieuHanh)', () => ctx.layBangDieuHanh());
  do_('Bản tin nhắc nợ (xemTruocNhacNo)', () => ctx.xemTruocNhacNo());
  do_('Đối soát sao kê 300 dòng (doiSoatSaoKe)', () => ctx.doiSoatSaoKe(saoKe, {}));
  do_('Gợi ý phân bổ tiền trả 1 hồ sơ (layGoiYPhanBoTra)', () => ctx.layGoiYPhanBoTra('HS100003', 10000, today));
}
CO.forEach(chay);
let md = '# BÁO CÁO HIỆU NĂNG — QUẢN LÝ VAY\n\n> **Môi trường:** dịch vụ Apps Script GIẢ LẬP (Node). “ms” là thời gian CPU của Node, KHÔNG phải độ trễ Google Sheets thật. Thước đo có ý nghĩa: **số lần đọc range không được tăng theo số khoản**.\n\n';
CO.forEach(N => { md += `## ${N.toLocaleString('vi-VN')} khoản đang vay\n\n| Thao tác | ms (CPU giả lập) | lần đọc range | ô đọc | kết quả |\n|---|---:|---:|---:|---|\n`; dong.filter(d => d.N === N).forEach(d => { md += `| ${d.ten} | ${d.ms} | ${d.docRange} | ${d.oDoc} | ${d.ok ? 'OK' : 'LỖI: ' + d.loi} |\n`; }); md += '\n'; });
fs.writeFileSync(path.join(RA, 'BAO_CAO_HIEU_NANG_QUAN_LY_VAY.md'), md); _l(md);
// Hồi quy: số lần đọc range ở quy mô lớn nhất không vượt ngưỡng cố định và không lớn hơn quy mô nhỏ nhất quá 2 lần.
const NGUONG = 60;
const nhoNhat = Math.min.apply(null, CO), lonNhat = Math.max.apply(null, CO);
dong.filter(d => d.N === lonNhat).forEach(d => { const n0 = dong.find(x => x.N === nhoNhat && x.ten === d.ten);
  if (d.docRange > NGUONG) { d.ok = false; d.loi = `số lần đọc range ${d.docRange} > ${NGUONG}`; }
  if (CO.length > 1 && d.docRange > n0.docRange * 2 + 5) { d.ok = false; d.loi = `số lần đọc range tăng theo quy mô (${n0.docRange} → ${d.docRange})`; } });
const loi = dong.filter(d => !d.ok).length;
_l(`TỔNG: ${dong.length} phép đo trên ${CO.length} quy mô, ${loi} lỗi. Báo cáo: ${path.join(RA, 'BAO_CAO_HIEU_NANG_QUAN_LY_VAY.md')}`);
process.exit(loi ? 1 : 0);
