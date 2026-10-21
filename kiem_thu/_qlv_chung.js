/* Dữ liệu dùng chung cho bộ kiểm thử QUẢN LÝ VAY (hạn mức, phân bổ, dự báo, nhắc nợ, đối soát, duyệt hai cấp, tài sản/ràng buộc).
 * Giả lập Apps Script/Sheets — không phải môi trường Google thật. */
const path = require('path');
module.exports = function khoiTao(ten) {
  const root = path.resolve(__dirname, '..');
  const out = path.join(require('os').tmpdir(), 'hosovay_' + ten);
  const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);
  ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx); mt.__email = 'ketoan@example.com';
  const G = mt.__;
  const homNay = () => ctx.homNayVN_();
  const cong = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const ngay = (n) => cong(homNay(), n);
  const cty = ctx.luuCongTy({ tenCty: 'Công ty thử', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'DN' });
  const hopDong = (o) => ctx.luuHopDong(Object.assign({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HDT', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV', hanMucVay: 1000000000,
    laiSuatTrongHan: 12, kyHanTraGoc: 'Cuối kỳ', kyHanTraLai: 'Hàng tháng' }, o || {}));
  /** Thêm thẳng 1 dòng hồ sơ vào sheet (bỏ qua quy trình tạo chứng từ) rồi tăng revision. */
  const themHoSo = (o) => {
    const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan');
    const h = Object.assign({ LoaiTien: 'VND', TrangThai: 'Đã giải ngân', Revision: 1, TyGiaBan: '' }, o);
    sh.g.push(sh.g[0].map(k => h[k] ?? ''));
    ctx.tangRevision_('HOSO');
    return h.MaHoSo;
  };
  const rev = (ma) => ctx.soRevision_(ctx.layHoSoTheoMa_(ma));
  let ok = 0, loi = 0;
  const dat = (ten2, f) => { try { f(); ok++; console.log('PASS ' + ten2); } catch (e) { loi++; console.log('FAIL ' + ten2 + ' → ' + (e && e.message)); } };
  const ket = (nhan) => { console.log('\nTỔNG: ' + ok + ' kiểm tra ' + nhan + ' đạt, ' + loi + ' lỗi'); process.exit(loi ? 1 : 0); };
  return { TI, ctx, mt, G, homNay, cong, ngay, cty, hopDong, themHoSo, rev, dat, ket };
};
