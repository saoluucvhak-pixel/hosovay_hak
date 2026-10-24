// NHẬP LIỆU KHÔNG CHỒNG LẤN: OCR đọc lại / lưu lại cùng tài liệu không cộng trùng hóa đơn; hóa đơn khác nhau không bị coi là trùng chỉ vì trùng số hoặc nhà cung cấp.
// Giả lập Apps Script (OCR Drive được thay bằng văn bản mẫu); chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('nhap_lieu'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const M = require('./_mau_ocr_hoa_don');
const J = (x) => JSON.parse(JSON.stringify(x));
const hd = hopDong(), ma = themHoSo({ MaHoSo: 'HS-NL', MaHD: hd.maHD, TrangThai: 'Nháp', SoTienNhanNoLanNay: 100000000 }), ma2 = themHoSo({ MaHoSo: 'HS-NL2', MaHD: hd.maHD, TrangThai: 'Nháp', SoTienNhanNoLanNay: 100000000 });
const pdf = { ten: 'hd.pdf', mime: 'application/pdf', base64: Buffer.from('%PDF-1.4 gia lap').toString('base64') };
const ct = (o) => Object.assign({ loai: 'HOA_DON', loaiChungTu: 'HOA_DON_GTGT', kyHieu: '1C26TAA', soHoaDon: '123', ngayHoaDon: '15/09/2026', tenBan: 'Công ty Bán A', mstBan: '0100109106', mstMua: '0400000001', tongTien: 11000000, tienTruocThue: 10000000, tienThue: 1000000, trangTu: 1, trangDen: 1, tinCay: 'CAO', canhBao: [], nguonDoc: 'OCR' }, o || {});
const dem = (m) => J(ctx.sheetToObjects_('BangKeHoaDon')).filter(r => !m || r.MaHoSo === m).length;
const tong = (m) => ctx.sheetToObjects_('BangKeHoaDon').filter(r => r.MaHoSo === m).reduce((a, r) => a + (Number(r.SoTien) || 0), 0);

dat('N1. Lưu lại cùng tài liệu (mất phản hồi / OCR đọc lại): hóa đơn không bị nhân đôi, tổng tiền không cộng trùng, không sinh thêm tệp', () => {
  const tl0 = ctx.sheetToObjects_('TaiLieuDinhKem').length;
  const a = J(ctx.luuChungTuNhieuTrang(ma, pdf, [ct()]));
  assert.equal(a.soDong, 1); assert.equal(tong(ma), 11000000);
  const b = J(ctx.luuChungTuNhieuTrang(ma, pdf, [ct()]));
  assert.equal(dem(ma), 1, 'chỉ còn đúng một dòng hóa đơn'); assert.equal(tong(ma), 11000000, 'tổng tiền không bị cộng trùng');
  assert.equal(b.soDong, 0); assert.equal(b.boQuaTrung.length, 1); assert.equal(b.boQuaTrung[0].maHoaDon, a.maHoaDon[0]);
  assert.equal(ctx.sheetToObjects_('TaiLieuDinhKem').length, tl0 + 1, 'không tạo thêm tệp/thư mục khi mọi chứng từ đã có');
  // cùng một lần lưu có hai dòng giống hệt: chỉ lưu một
  const c = J(ctx.luuChungTuNhieuTrang(ma2, pdf, [ct({ soHoaDon: '777' }), ct({ soHoaDon: '777', trangTu: 2, trangDen: 2 })]));
  assert.equal(c.soDong, 1); assert.equal(c.boQuaTrung.length, 1); assert.equal(dem(ma2), 1);
});
dat('N2. Hóa đơn KHÁC nhau vẫn được lưu: cùng số khác ký hiệu, cùng số khác nhà cung cấp (MST), cùng nhà cung cấp khác số; hoá đơn không đủ khoá không bị coi là trùng', () => {
  const m3 = themHoSo({ MaHoSo: 'HS-NL3', MaHD: hd.maHD, TrangThai: 'Nháp', SoTienNhanNoLanNay: 1 });
  const r = J(ctx.luuChungTuNhieuTrang(m3, pdf, [ct({ soHoaDon: '900' }), ct({ soHoaDon: '900', kyHieu: '1C26TBB', trangTu: 2, trangDen: 2 }), ct({ soHoaDon: '900', mstBan: '0300588569', tenBan: 'Công ty Bán B', trangTu: 3, trangDen: 3 }), ct({ soHoaDon: '901', trangTu: 4, trangDen: 4 }),
    ct({ soHoaDon: '', mstBan: '', kyHieu: '', tenBan: 'Công ty Bán A', tongTien: 500000, trangTu: 5, trangDen: 5 }), ct({ soHoaDon: '', mstBan: '', kyHieu: '', tenBan: 'Công ty Bán A', tongTien: 500000, trangTu: 6, trangDen: 6 })]));
  assert.equal(r.soDong, 6, 'không gộp/bỏ nhầm: ' + JSON.stringify(r.boQuaTrung)); assert.equal(dem(m3), 6);
  const r2 = J(ctx.luuChungTuNhieuTrang(m3, pdf, [ct({ soHoaDon: '900', kyHieu: '' })])); assert.equal(r2.soDong, 0, 'cùng MST + số, một bên thiếu ký hiệu: coi là cùng hóa đơn'); assert.equal(dem(m3), 6);
});
dat('N3. Nhiều trang cùng một hóa đơn gộp thành 1 chứng từ; hai hóa đơn cùng nhà cung cấp/cùng số khác ký hiệu KHÔNG bị gộp', () => {
  const g = J(ctx.gomChungTuTuTrang(M.TEP_A.map((v, i) => ({ soTrang: i + 1, vanBan: v })))); assert.equal(g.chungTu.length, 7);
  const so = new Set(g.chungTu.map(c => c.mstBan + '|' + c.kyHieu + '|' + c.soHoaDon)); assert.equal(so.size, g.chungTu.length, 'mỗi hóa đơn một khoá riêng');
  const trang = (so, kh, tien) => 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG\nKý hiệu: ' + kh + '\nSố: ' + so + '\nNgày 15 tháng 09 năm 2026\nĐơn vị bán hàng: CÔNG TY BÁN A\nMã số thuế: 0100109106\nĐơn vị mua: CÔNG TY THỬ\nMã số thuế: 0400000001\nTổng cộng tiền thanh toán: ' + tien + '\n';
  const h = J(ctx.gomChungTuTuTrang([{ soTrang: 1, vanBan: trang('555', '1C26TAA', '1.000.000') }, { soTrang: 2, vanBan: trang('555', '1C26TBB', '2.000.000') }, { soTrang: 3, vanBan: trang('556', '1C26TAA', '3.000.000') }]));
  assert.equal(h.chungTu.length, 3, 'không gộp các hóa đơn khác nhau chỉ vì trùng số hoặc nhà cung cấp: ' + h.chungTu.map(c => c.kyHieu + '/' + c.soHoaDon).join(','));
  assert.equal(h.chungTu.filter(c => c.trungVoi).length, 0);
});
Q.ket('nhập liệu không chồng lấn (OCR/hóa đơn)');
