// Kiểm thử ĐỌC TÀI LIỆU NHIỀU TRANG (hóa đơn PDF scan/điện tử) + ĐỐI CHIẾU với hồ sơ giải ngân + ĐỌC BẢNG LƯƠNG nhiều sheet.
// Giả lập Apps Script; OCR của Google Drive được thay bằng văn bản mẫu (kiem_thu/_mau_ocr_hoa_don.js, bố cục theo 2 tệp PDF thật, tên/MST giả).
// Chưa chạy trên Google thật: chất lượng OCR thật của Drive chưa được đo ở đây.
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const Q = require('./_qlv_chung')('ocr_nhieu_trang'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const M = require('./_mau_ocr_hoa_don');
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
const api = (e, ten, ...a) => J(voi(e, () => ctx.api('', ten, a)));
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const trangCua = (tep) => tep.map((v, i) => ({ soTrang: i + 1, vanBan: v }));
const soSanh = (ct, e) => {
  const sai = [];
  const k = (ten, a, b) => { if (b !== undefined && a !== b) sai.push(ten + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); };
  k('trang', ct.trangTu + '-' + ct.trangDen, e.trang && e.trang.join('-')); k('loai', ct.loaiChungTu, e.loaiChungTu); k('kyHieu', ct.kyHieu, e.kyHieu); k('so', ct.soHoaDon, e.so);
  k('ngay', ct.ngayHoaDon, e.ngay); k('mstBan', ct.mstBan, e.mstBan); k('tong', ct.tongTien, e.tong); k('truocThue', ct.tienTruocThue, e.truoc); k('thue', ct.tienThue, e.thue);
  return sai;
};

dat('Số tiền viết bằng chữ → số (mốt, lăm, tư, không trăm, mười, dấu phẩy, "đồng chẵn")', () => {
  [['Bốn mươi triệu bảy trăm mười sáu nghìn đồng chẵn./.', 40716000], ['Chín trăm bốn mươi mốt triệu, bảy trăm sáu mươi chín nghìn, tám trăm bốn mươi bảy đồng chẵn', 941769847],
    ['Mười bốn triệu, không trăm bảy mươi lăm nghìn, bảy trăm đồng chẵn', 14075700], ['Hai mươi mốt triệu một trăm hai mươi mốt nghìn ba trăm hai mươi tám đồng', 21121328],
    ['Tám mươi tư triệu, một trăm bốn mươi ba nghìn, bảy trăm đồng chẵn', 84143700], ['Một tỷ hai trăm linh năm triệu đồng', 1205000000], ['Mười lăm triệu bảy trăm năm mươi nghìn đồng chẵn.', 15750000],
    ['không đọc được gì ở đây cả', 0]].forEach(([chu, so]) => assert.equal(ctx.docSoTienBangChu_(chu), so, chu));
});
dat('Tệp 7 trang, mỗi trang 1 hóa đơn GTGT (nhiều nhà cung cấp, nhãn khác nhau): đúng 7 dòng, đúng ký hiệu/số/ngày/MST bên bán/trước thuế/thuế/tổng, tin cậy cao', () => {
  const ds = J(ctx.gomTrangThanhChungTu_(trangCua(M.TEP_A), [M.MST_CONG_TY]));
  assert.equal(ds.length, 7);
  ds.forEach((ct, i) => { assert.deepEqual(soSanh(ct, M.KQ_A[i]), [], 'chứng từ ' + (i + 1)); assert.equal(ct.tinCay, 'CAO', 'chứng từ ' + (i + 1) + ': ' + ct.canhBao); assert.equal(ct.tongBangChu, ct.tongTien); });
  assert.match(ds[0].tenBan, /CAO SU MẪU/); assert.match(ds[3].tenBan, /CẢNG MẪU/); assert.match(ds[4].tenBan, /GIÁM ĐỊNH MẪU/, 'không có nhãn "Đơn vị bán": lấy tên phía trên MST bên bán');
  assert.ok(ds.every(ct => ct.mstMua.startsWith(M.MST_CONG_TY)), 'MST bên mua là công ty mình');
  assert.equal(ds[1].tienThue, 0, 'ô thuế để trống (KKKNT) không lấy nhầm tổng tiền dòng dưới');
});
dat('Tệp 9 trang lẫn loại: bảng bảo hiểm 2 trang gộp 1, thông báo tiền điện, hóa đơn GTGT, 3 hóa đơn bán hàng, hóa đơn 2 trang ("tiếp theo trang trước") gộp 1 dòng', () => {
  const ds = J(ctx.gomTrangThanhChungTu_(trangCua(M.TEP_B), [M.MST_CONG_TY]));
  assert.equal(ds.length, 7);
  ds.forEach((ct, i) => assert.deepEqual(soSanh(ct, M.KQ_B[i]), [], 'chứng từ ' + (i + 1)));
  assert.deepEqual(ds[0].baoHiem, M.KQ_B[0].baoHiem); assert.equal(ds[0].tinCay, 'CAO'); assert.equal(ds[0].tenBan, 'Bảo hiểm xã hội');
  assert.match(ds[0].dienGiai, /tháng 10\/2026 — 32 lao động/);
  assert.match(ds[1].tenBan, /CÔNG TY ĐIỆN LỰC MẪU/); assert.equal(ds[1].tenLoai, 'Thông báo tiền điện');
  assert.equal(ds[6].trangTu, 8); assert.equal(ds[6].trangDen, 9); assert.equal(ds[6].tinCay, 'CAO');
});
dat('Bảng bảo hiểm: dòng "Tổng cộng" đảo cột / thiếu cột vẫn tìm đúng DN + NLĐ = tổng nộp; không thấy tổng thì tin cậy thấp; tỷ lệ lạ thì cảnh báo', () => {
  let bh = J(ctx.trichBaoHiem_('BẢO HIỂM THÁNG 9/2026\nTỔNG CỘNG 21.000.000 200.000.000 64.000.000 43.000.000'));
  assert.deepEqual([bh.thang, bh.mucLuong, bh.dnDong, bh.nldDong, bh.tongNop], ['09/2026', 200000000, 43000000, 21000000, 64000000]);
  let ds = J(ctx.gomTrangThanhChungTu_([{ soTrang: 1, vanBan: 'ĐÓNG BẢO HIỂM THÁNG 10/2026\nBHXH BHYT\n1 Nguyễn Văn A 8.000.000' }], [M.MST_CONG_TY]));
  assert.equal(ds[0].tinCay, 'THAP'); assert.ok(ds[0].canhBao.some(c => /Tổng cộng/.test(c)));
  ds = J(ctx.gomTrangThanhChungTu_([{ soTrang: 1, vanBan: 'ĐÓNG BẢO HIỂM THÁNG 10/2026\nBHXH\nTỔNG CỘNG 100.000.000 20.000.000 10.000.000 30.000.000' }], [M.MST_CONG_TY]));
  assert.equal(ds[0].tongTien, 30000000); assert.equal(ds[0].tinCay, 'TRUNG_BINH'); assert.ok(ds[0].canhBao.some(c => /21,5%/.test(c)));
});
dat('Điểm chữ OCR: chữ rời rạc không dấu (trang scan nằm ngang) điểm thấp → máy chủ báo "nên thử xoay"; chữ tốt thì không', () => {
  const rac = 'ia ndd ., .I .n e .e ,u ,t ,a ,d n n n e e d d d I l n n e e e, ; :e .e I 9 6 8 7 rnn u u n nn ru rn i 1 l l l l', cu = ctx.ocrAnhThanhVanBan_;
  assert.ok(ctx.diemVanBan_(rac) < ctx.DIEM_CHU_TOI_THIEU_); assert.ok(ctx.diemVanBan_(M.TEP_A[0]) >= ctx.DIEM_CHU_TOI_THIEU_); assert.ok(ctx.diemVanBan_(M.TEP_B[0]) >= ctx.DIEM_CHU_TOI_THIEU_);
  try {
    ctx.ocrAnhThanhVanBan_ = () => rac;
    const r = J(ctx.docTrangTaiLieu({ soTrang: 1, anhBase64: Buffer.from('x').toString('base64'), mime: 'image/jpeg' }));
    assert.equal(r.nenThuXoay, true);
    ctx.ocrAnhThanhVanBan_ = () => M.TEP_B[0];
    assert.equal(J(ctx.docTrangTaiLieu({ soTrang: 1, anhBase64: Buffer.from('x').toString('base64'), mime: 'image/jpeg' })).nenThuXoay, false);
  } finally { ctx.ocrAnhThanhVanBan_ = cu; }
});
dat('Trang không rõ loại ngay sau hóa đơn chưa thấy tổng tiền được nối vào hóa đơn đó; tài liệu lạ đứng riêng', () => {
  const p1 = M.TEP_A[0].split('Cộng tiền hàng')[0], p2 = 'Cộng tiền hàng: 37.700.000\nThuế suất GTGT: 8% Cộng tiền thuế GTGT: 3.016.000\nTổng cộng tiền thanh toán: 40.716.000';
  const ds = J(ctx.gomTrangThanhChungTu_([{ soTrang: 1, vanBan: p1 }, { soTrang: 2, vanBan: p2 }, { soTrang: 3, vanBan: 'Biên bản giao nhận hàng hóa\nNgày 01/10/2026' }], [M.MST_CONG_TY]));
  assert.equal(ds.length, 2); assert.equal(ds[0].trangDen, 2); assert.equal(ds[0].tongTien, 40716000); assert.equal(ds[1].loaiChungTu, 'KHAC');
});
dat('Lớp chữ PDF: lớp chữ tốt dùng luôn (không OCR); lớp chữ OCR kém của PDF scan (vd "HoA Dor{ GrA") bị loại → OCR ảnh trang; OCR lỗi 1 trang không làm hỏng cả tệp', () => {
  let goiOCR = 0; const cu = ctx.ocrAnhThanhVanBan_;
  try {
    ctx.ocrAnhThanhVanBan_ = () => { goiOCR++; return M.TEP_A[1]; };
    const anh = Buffer.from('JPEG-gia').toString('base64');
    let r = api('ketoan@example.com', 'docTrangTaiLieu', { soTrang: 1, lopChu: M.TEP_A[0], anhBase64: anh, mime: 'image/jpeg' });
    assert.equal(r.nguon, 'LOP_CHU'); assert.equal(goiOCR, 0);
    r = api('ketoan@example.com', 'docTrangTaiLieu', { soTrang: 2, lopChu: 'HoA Dor{ GrA TRr GrA rANc vtlu sti- xytrlpu: 1C26TBR si5: fi)002141 Donvi brinhang: CONC TY CO PHAN CAO SU BEN T HANH Mas6thuii: 03 01 1 5029 5 Eia chi: LO d 3-1 Khu CN Tdy Bic Cri Chi', anhBase64: anh, mime: 'image/jpeg' });
    assert.equal(r.nguon, 'OCR'); assert.equal(goiOCR, 1); assert.match(r.vanBan, /00008321/);
    ctx.ocrAnhThanhVanBan_ = () => { throw new Error('Drive API chưa bật'); };
    r = api('ketoan@example.com', 'docTrangTaiLieu', { soTrang: 3, lopChu: '', anhBase64: anh, mime: 'image/jpeg' });
    assert.equal(r.nguon, 'LOI'); assert.match(r.loi, /OCR trang 3 lỗi: Drive API chưa bật/);
    assert.equal(api('ketoan@example.com', 'docTrangTaiLieu', { soTrang: 4 }).nguon, 'TRONG');
  } finally { ctx.ocrAnhThanhVanBan_ = cu; }
});
dat('OCR gửi Drive đúng loại ẢNH (image/jpeg|png), không ghi loại Google Doc — Drive thật từ chối "OCR is not supported for files of type application/vnd.google-apps.document"', () => {
  const cuDrive = ctx.Drive, cuDoc = ctx.DocumentApp, gui = [];
  try {
    ctx.Drive = { Files: { insert: (res, blob, opt) => {
      if (opt && opt.ocr && /google-apps/.test(res.mimeType || '')) throw new Error('API call to drive.files.insert failed with error: OCR is not supported for files of type ' + res.mimeType);
      gui.push({ mime: res.mimeType, ocr: !!(opt && opt.ocr), lang: opt && opt.ocrLanguage }); return { id: 'DOC_OCR_' + gui.length };
    } } };
    ctx.DocumentApp = { openById: () => ({ getBody: () => ({ getText: () => 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG' }) }) };
    assert.equal(ctx.ocrAnhThanhVanBan_(new mt.Blob(Buffer.from('JPEG'), 'image/jpeg', 'trang_1.jpg')), 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG');
    ctx.ocrAnhThanhVanBan_(new mt.Blob(Buffer.from('PNG'), 'image/png', 'trang_2.png'));
    ctx.ocrAnhThanhVanBan_(new mt.Blob(Buffer.from('X'), '', 'trang_3'));
    assert.deepEqual(J(gui), [{ mime: 'image/jpeg', ocr: true, lang: 'vi' }, { mime: 'image/png', ocr: true, lang: 'vi' }, { mime: 'image/jpeg', ocr: true, lang: 'vi' }]);
    const r = api('ketoan@example.com', 'docTrangTaiLieu', { soTrang: 1, lopChu: '', anhBase64: Buffer.from('JPEG').toString('base64'), mime: 'image/jpeg' });
    assert.notEqual(r.nguon, 'LOI', 'qua docTrangTaiLieu không còn lỗi OCR: ' + (r.loi || '')); assert.equal(r.nguon, 'OCR');
  } finally { ctx.Drive = cuDrive; ctx.DocumentApp = cuDoc; }
});
dat('Bảng tổng bị OCR dàn 1 dòng (nhãn trước, số sau) → tách đúng trước thuế / thuế / tổng; ô thuế để trống (KKKNT) → thuế 0, không vớ số dòng dưới', () => {
  const dau = 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG\nKý hiệu: 1K26TXD\nSố: 00000777\nNgày 22 tháng 10 năm 2026\nĐơn vị bán hàng: CHI NHÁNH CÔNG TY XĂNG DẦU MẪU\nMã số thuế: 0400222333-020\nTên đơn vị: CÔNG TY THỬ NGHIỆM\nMã số thuế: 0400000001\n';
  let c = J(ctx.trichTruongChungTu_(dau + 'Cộng tiền hàng: Tiền thuế GTGT (10%): Tổng cộng tiền thanh toán: 10.000.000 1.000.000 11.000.000\n', [M.MST_CONG_TY]));
  assert.deepEqual([c.tienTruocThue, c.tienThue, c.tongTien], [10000000, 1000000, 11000000]);
  c = J(ctx.trichTruongChungTu_(dau + 'Cộng tiền hàng Tiền thuế GTGT Tổng cộng tiền thanh toán\n10.000.000 1.000.000 11.000.000\n', [M.MST_CONG_TY]));
  assert.deepEqual([c.tienTruocThue, c.tienThue, c.tongTien], [10000000, 1000000, 11000000], 'nhãn 1 dòng, số dòng kế');
  const kkknt = 'Cộng tiền hàng trước thuế: 9.300.000\nThuế suất GTGT:KKKNT Tiền thuế GTGT:\n9.300.000\nTổng cộng tiền thanh toán: 9.300.000\n';
  c = J(ctx.trichTruongChungTu_(dau + kkknt, [M.MST_CONG_TY]));
  assert.deepEqual([c.tienTruocThue, c.tienThue, c.tongTien], [9300000, 0, 9300000], 'KKKNT: thuế 0');
  assert.ok(!ctx.kiemChungTu_(Object.assign({ loaiChungTu: 'HOA_DON' }, c)).canhBao.some(x => /Trước thuế \+ thuế/.test(x)));
  c = J(ctx.trichTruongChungTu_(dau + kkknt.replace('Thuế suất GTGT:KKKNT ', ''), [M.MST_CONG_TY]));
  assert.equal(c.tienThue, 0, 'không ghi thuế suất: thuế = tổng là vô lý → 0');
});
dat('Google giới hạn số lần OCR: máy chủ KHÔNG ngủ chờ, trả cờ gioiHan để trình duyệt giãn nhịp và đọc lại trang; không báo nhầm "kiểm tra Drive API"', () => {
  const cuDrive = ctx.Drive, cuDoc = ctx.DocumentApp; mt.__sleep = 0;
  try {
    ctx.Drive = { Files: { insert: () => { throw new Error('API call to drive.files.insert failed with error: User rate limit exceeded for OCR'); } } };
    const r = api('ketoan@example.com', 'docTrangTaiLieu', { soTrang: 5, lopChu: '', anhBase64: Buffer.from('J').toString('base64'), mime: 'image/jpeg' });
    assert.equal(r.nguon, 'LOI'); assert.equal(r.gioiHan, true); assert.match(r.loi, /giới hạn số lần OCR/); assert.ok(!/kiểm tra Drive API/.test(r.loi)); assert.equal(mt.__sleep, 0, 'không sleep');
    ctx.Drive = { Files: { insert: () => { throw new Error('Drive is not defined'); } } };
    const r2 = api('ketoan@example.com', 'docTrangTaiLieu', { soTrang: 6, lopChu: '', anhBase64: Buffer.from('J').toString('base64'), mime: 'image/jpeg' });
    assert.equal(r2.gioiHan, false); assert.match(r2.loi, /kiểm tra Drive API/);
  } finally { ctx.Drive = cuDrive; ctx.DocumentApp = cuDoc; }
});
const hd = hopDong();
const ma = themHoSo({ MaHoSo: 'HS-OCR', MaHD: hd.maHD, LoaiTien: 'VND', TrangThai: 'Nháp', SoTienNhanNoLanNay: 1066135847 });
const pdf = { ten: 'HD mau.pdf', mime: 'application/pdf', base64: Buffer.from('%PDF-1.4 gia lap 7 trang').toString('base64') };
let daLuu;
dat('Lưu: tệp gốc 1 lần + mỗi chứng từ 1 dòng BangKeHoaDon (trang từ–đến, ký hiệu, trước thuế, thuế, loại, tin cậy); NCC tự vào danh mục khách hàng', () => {
  const g = api('ketoan@example.com', 'gomChungTuTuTrang', trangCua(M.TEP_A));
  assert.equal(g.chungTu.length, 7); assert.ok(g.chungTu.every(c => !c.trungVoi));
  const tl0 = ctx.sheetToObjects_('TaiLieuDinhKem').length, hd0 = ctx.sheetToObjects_('BangKeHoaDon').length;
  daLuu = api('ketoan@example.com', 'luuChungTuNhieuTrang', ma, pdf, g.chungTu);
  assert.equal(daLuu.soDong, 7); assert.equal(daLuu.maHoaDon.length, 7);
  assert.equal(ctx.sheetToObjects_('TaiLieuDinhKem').length, tl0 + 1, 'tệp gốc chỉ lưu 1 lần');
  const ds = J(ctx.sheetToObjects_('BangKeHoaDon')).slice(hd0);
  assert.equal(ds.length, 7);
  assert.ok(ds.every(r => r.MaTaiLieu === daLuu.maTaiLieu && r.MaHoSo === ma && r.LoaiChungTu === 'HOA_DON_GTGT' && r.TinCay === 'CAO'));
  assert.deepEqual(ds.map(r => [r.TrangTu, r.TrangDen]), [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7]]);
  assert.equal(ds[3].SoHoaDon, '15944'); assert.equal(ds[3].KyHieu, '1K26TTB'); assert.equal(ds[3].TienTruocThue, 872009118); assert.equal(ds[3].TienThue, 69760729); assert.equal(ds[3].SoTien, 941769847);
  assert.ok(ctx.sheetToObjects_(ctx.SHEET_KHACHHANG).some(k => String(k.MaSoThue || k.MaKH) === '0400222333'), 'NCC theo MST đã vào danh mục khách hàng');
  const th = J(ctx.layBangTongHopHoaDon()).find(h => h.soHoaDon === '15944'); assert.equal(th.trangTu, 4); assert.equal(th.kyHieu, '1K26TTB');
});
dat('Tải lại cùng tệp: cả 7 hóa đơn được đánh dấu "đã có trong sổ" và mặc định không chọn; trùng trong cùng tệp cũng được báo', () => {
  const g = api('ketoan@example.com', 'gomChungTuTuTrang', trangCua(M.TEP_A));
  assert.ok(g.chungTu.every(c => c.trungVoi && c.trungVoi.maHoSo === ma && c.canhBao.some(x => /đã có trong sổ/.test(x))));
  const g2 = J(ctx.gomChungTuTuTrang(trangCua([M.TEP_B[3], M.TEP_B[3]])));
  assert.ok(g2.chungTu[1].canhBao.some(x => /Trùng với chứng từ trang 1/.test(x)));
});
dat('Lưu chặn dữ liệu sai: tiền lẻ/âm, không chọn dòng nào, thiếu tệp, hồ sơ không có', () => {
  const ct = J(ctx.gomTrangThanhChungTu_(trangCua([M.TEP_B[3]]), [M.MST_CONG_TY]));
  assert.throws(() => ctx.luuChungTuNhieuTrang(ma, pdf, [Object.assign({}, ct[0], { tongTien: 1500.5 })]), /phần thập phân/);
  assert.throws(() => ctx.luuChungTuNhieuTrang(ma, pdf, [Object.assign({}, ct[0], { tongTien: -5 })]), /âm/);
  assert.throws(() => ctx.luuChungTuNhieuTrang(ma, pdf, []), /Chưa chọn chứng từ/);
  assert.throws(() => ctx.luuChungTuNhieuTrang(ma, {}, ct), /Thiếu tệp gốc/);
  assert.throws(() => ctx.luuChungTuNhieuTrang('KHONG-CO', pdf, ct), /Không tìm thấy hồ sơ/);
});
dat('Quyền: Chỉ xem không đọc/gom/lưu được (Nhập liệu trở lên); Chỉ xem vẫn XEM được bảng đối chiếu', () => {
  assert.throws(() => api('xem@example.com', 'docTrangTaiLieu', { soTrang: 1 }), /\[QUYEN\]/);
  assert.throws(() => api('xem@example.com', 'gomChungTuTuTrang', trangCua(M.TEP_A)), /\[QUYEN\]/);
  assert.throws(() => api('xem@example.com', 'luuChungTuNhieuTrang', ma, pdf, []), /\[QUYEN\]/);
  assert.equal(api('xem@example.com', 'doiChieuTaiLieuHoSo', ma).maHoSo, ma);
  assert.equal(ctx.bangQuyenApi_().luuChungTuNhieuTrang, 'NHAP_LIEU'); assert.equal(ctx.bangQuyenApi_().doiChieuTaiLieuHoSo, 'XEM');
});
dat('Đối chiếu: ghép theo số hóa đơn trong "Tài liệu số" (khớp / lệch tiền), ghép theo đúng số tiền khi dòng không ghi số HĐ, dòng thiếu chứng từ, chứng từ chưa gắn, lương so với bảng lương', () => {
  const sh = G.boDuLieu.getSheetByName('ChiTietThuHuong'), cot = sh.g[0];
  const them = (o) => sh.g.push(cot.map(k => (Object.assign({ MaHoSo: ma, LoaiTien: 'VND', SoTienQuyDoi: '' }, o))[k] ?? ''));
  them({ STT: 1, TenNguoiHuong: 'CÔNG TY CỔ PHẦN CAO SU MẪU', LoaiChungTu: 'Thanh toán tiền hàng', SoTien: 40716000, TaiLieuSo: 'HĐ 00002141' });
  them({ STT: 2, TenNguoiHuong: 'XĂNG DẦU MẪU', LoaiChungTu: 'Thanh toán tiền hàng', SoTien: 17000000, TaiLieuSo: '8321' });
  them({ STT: 3, TenNguoiHuong: 'CẢNG MẪU', LoaiChungTu: 'Thanh toán tiền hàng', SoTien: 941769847, TaiLieuSo: '' });
  them({ STT: 4, TenNguoiHuong: 'NHÀ CUNG CẤP KHÁC', LoaiChungTu: 'Thanh toán tiền hàng', SoTien: 5000000, TaiLieuSo: '99999' });
  them({ STT: 5, TenNguoiHuong: 'Lương tháng 9', LoaiChungTu: 'Thanh toán lương', SoTien: 61650000, TaiLieuSo: 'BL T9' });
  G.boDuLieu.getSheetByName('BangKeBangLuong').g.push(['BL90001', 'TL9', ma, 'A', '09/2026', 60000000, new Date()], ['BL90002', 'TL9', ma, 'B', '09/2026', 1650000, new Date()]);
  const r = api('ketoan@example.com', 'doiChieuTaiLieuHoSo', ma);
  const theoSo = (so) => r.dong.find(d => d.soHoaDon === so);
  assert.equal(theoSo('00002141').trangThai, 'KHOP'); assert.equal(theoSo('00002141').dongHoSo[0].cachGhep, 'SO_HOA_DON');
  assert.equal(theoSo('00008321').trangThai, 'LECH'); assert.equal(theoSo('00008321').chenhLech, -250000);
  assert.equal(theoSo('15944').trangThai, 'KHOP'); assert.equal(theoSo('15944').dongHoSo[0].cachGhep, 'SO_TIEN');
  assert.equal(theoSo('00008322').trangThai, 'CHUA_DUNG'); assert.equal(theoSo('15944').trang, '4');
  assert.deepEqual(r.dongThieuChungTu.map(c => c.stt), [4]);
  assert.deepEqual([r.luong.tienHoSo, r.luong.tienBangLuong, r.luong.khop], [61650000, 61650000, true]);
  assert.equal(r.tong.soKhop, 2); assert.equal(r.tong.soLech, 1); assert.equal(r.tong.soChuaDung, 4); assert.equal(r.tong.soThieu, 1);
  assert.equal(r.tong.chungTuDaGhep, 40716000 + 17250000 + 941769847);
  assert.equal(r.tong.chenhLech, (40716000 + 17000000 + 941769847 + 5000000 + 61650000) - (40716000 + 17250000 + 941769847) - 61650000);
});
dat('Bảng lương nhiều sheet: lấy sheet CHUYỂN LƯƠNG (Họ tên + Số tài khoản + Số tiền), tiêu đề 2 tầng ở dòng 6–7, tháng từ tiêu đề, tự kiểm với "Tổng cộng" ở sheet tổng hợp', () => {
  const bangLuong = { ten: 'Lương VP', values: [['CÔNG TY THỬ'], [''], ['BẢNG THANH TOÁN TIỀN LƯƠNG'], ['Tháng 09 năm 2026'], [''],
    ['TT', 'HỌ VÀ TÊN', 'Lương Thời Gian', '', 'Các khoản phải khấu trừ', 'Kỳ II Thực lĩnh'], ['', '', 'Ngày công', 'Số Tiền', 'BHXH(8%)', 'Số tiền'],
    [1, 'Nguyễn Văn A', 26, 19500000, 397440, 18978000], [2, 'Trần Thị B', 26, 10000000, 364320, 9499000], ['', 'Tổng cộng', '', '', '', 28477000]] };
  const chuyen = { ten: 'chuyển lương', values: [['Công ty Thử'], ['LƯƠNG THÁNG 09/2026'], ['STT', 'HỌ TÊN', 'NGÀY SINH', 'SỐ CCCD', 'SỐ TÀI KHOẢN', 'SỐ TIỀN', 'TẠI NGÂN HÀNG'],
    [1, 'Nguyễn Văn A', '1989-10-20', '000000000001', '1111111111', 18978000, 'BIDV'], [2, 'Trần Thị B', '1986-01-06', '000000000002', '2222222222', 9499000, 'BIDV'], [3, 'Lê Văn C', '', '', '3333333333', 6999000, 'VCB'], ['', 'TỔNG CỘNG', '', '', '', 35476000]] };
  const tongHop = { ten: 'Bảng Tổng hợp', values: [['BẢNG TỔNG HỢP'], ['STT', 'BỘ PHẬN', 'SỐ TIỀN'], [1, 'Văn phòng', 28477000], [2, 'Khác', 6999000], ['TỔNG CỘNG :', '', 35476000]] };
  let r = J(ctx.docBangLuongTuSheets_([bangLuong, tongHop, chuyen]));
  assert.deepEqual(r.sheetDoc, ['chuyển lương']); assert.equal(r.dong.length, 3); assert.equal(r.tongFile, 35476000);
  assert.deepEqual(r.canhBao, ['Tổng thực lĩnh các bộ phận (28477000) khác tổng sheet chuyển lương (35476000).'], 'khớp sheet tổng hợp; chỉ báo bộ phận thiếu người (mẫu chỉ có 1 sheet bộ phận)');
  assert.deepEqual(r.dong.map(d => [d.thang, d.soTien, d.soTaiKhoan, d.nganHang]), [['09/2026', 18978000, '1111111111', 'BIDV'], ['09/2026', 9499000, '2222222222', 'BIDV'], ['09/2026', 6999000, '3333333333', 'VCB']]);
  r = J(ctx.docBangLuongTuSheets_([bangLuong]));
  assert.deepEqual(r.dong.map(d => [d.hoTen, d.soTien, d.thang]), [['Nguyễn Văn A', 18978000, '09/2026'], ['Trần Thị B', 9499000, '09/2026']], 'không có sheet chuyển khoản: lấy cột Thực lĩnh');
  tongHop.values[4][2] = 35000000;
  assert.match(J(ctx.docBangLuongTuSheets_([chuyen, tongHop])).canhBao[0], /khác dòng "Tổng cộng"/);
  assert.equal(ctx.docBangLuongTuSheets_([{ ten: 'S', values: [['Tháng', 'Họ và tên', 'Số tiền'], ['09/2026', 'A', 1]] }]), null, 'bố cục cũ: để cách đọc cũ xử lý');
});
dat('Giao diện: PDF/ảnh hóa đơn đi luồng đọc nhiều trang (cả modal đính kèm lẫn tải nhanh trong hồ sơ); có bảng xem/sửa + đối chiếu; pdf.js bản cố định từ cdnjs', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'JavaScript.html'), 'utf8'), ix = fs.readFileSync(path.join(__dirname, '..', 'Index.html'), 'utf8');
  assert.ok(/if \(MODAL_TAILIEU_LOAI === 'HoaDonGTGT' && laTepDocNhieuTrang_\(file\)\)/.test(js) && /if \(loaiTaiLieu === 'HoaDonGTGT' && laTepDocNhieuTrang_\(file\)\)/.test(js));
  assert.ok(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.11\.174\/pdf\.min\.js/.test(js));
  ['\\.docTrangTaiLieu\\(t\\)', 'gui\\(tiep, tot\\)', '\\.layTongHopBangLuong\\(\\)', '\\.layTongHopBaoHiem\\(\\)', '\\.gomChungTuTuTrang\\(', '\\.luuChungTuNhieuTrang\\(DNT_\\.maHoSo', '\\.doiChieuTaiLieuHoSo\\(maHoSo\\)', 'moDoiChieuTaiLieu_\\(\\\\\'\' \\+ escAttr_\\(r\\.maHoSo\\)'].forEach(re => assert.ok(new RegExp(re).test(js), re));
  ['id="modalDocNhieuTrang"', 'id="modalDoiChieuTL"', 'id="btnDoiChieuTL"', '<th style="width:120px;">Đối chiếu</th>', 'id="bh_tonghop"', 'id="luong_tonghop_tep"', 'Bảng tổng hợp bảo hiểm'].forEach(s => assert.ok(ix.includes(s), s));
});
dat('Bảng lương: tổng theo BỘ PHẬN (từng sheet: số người, thực lĩnh, khấu trừ BHXH/BHYT/BHTN/KPCĐ phần NLĐ, bỏ cột gộp BHXH-KPCĐ) + cảnh báo khi tổng bộ phận lệch sheet chuyển lương', () => {
  const vp = { ten: 'Lương VP', values: [['CÔNG TY THỬ'], ['THÁNG 09/2026'], ['TT', 'Họ và tên', 'Chức vụ', 'Lương thời gian', '', 'Các khoản khấu trừ', '', '', '', '', 'Thực lĩnh'],
    ['', '', '', 'Ngày công', 'Số Tiền', 'BHXH (8%)', 'BHYT (1,5%)', 'BH Thất Nghiệp (1%)', 'KPCĐ (0.5%)', 'BHXH-KPCĐ', 'Số tiền'],
    [1, 'Nguyễn Văn A', 'GĐ', 26, 26500000, 640000, 120000, 80000, 40000, 880000, 25569000], [2, 'Trần Thị B', 'KT', 26, 9000000, 426000, 79875, 53250, 26625, 585750, 9148000], ['', 'Tổng cộng']] };
  const ch = { ten: 'chuyển lương', values: [['LƯƠNG THÁNG 09/2026'], ['STT', 'HỌ TÊN', 'SỐ TÀI KHOẢN', 'SỐ TIỀN', 'TẠI NGÂN HÀNG'], [1, 'Nguyễn Văn A', '111', 25569000, 'BIDV'], [2, 'Trần Thị B', '222', 9148000, 'BIDV']] };
  let r = J(ctx.docBangLuongTuSheets_([vp, ch]));
  assert.deepEqual(r.sheetDoc, ['chuyển lương']); assert.deepEqual(r.canhBao, []);
  assert.deepEqual(r.boPhan, [{ boPhan: 'Lương VP', thang: '09/2026', soNguoi: 2, thucLinh: 34717000, bhxh: 1066000, bhyt: 199875, bhtn: 133250, kpcd: 66625 }]);
  ch.values[3][3] = 9000000;
  assert.match(J(ctx.docBangLuongTuSheets_([vp, ch])).canhBao.join(' '), /Tổng thực lĩnh các bộ phận \(34717000\) khác tổng sheet chuyển lương \(34569000\)/);
});
dat('Tải bảng lương: lưu dòng từng người (kèm STK, ngân hàng) + tổng theo bộ phận; bảng tổng hợp bảng lương gom theo tệp/tháng, khớp tổng bộ phận', () => {
  const cu = ctx.trichXuatBangLuongTuFile_;
  try {
    ctx.trichXuatBangLuongTuFile_ = () => { const a = [{ hoTen: 'Nguyễn Văn A', thang: '10/2026', soTien: 25569000, soTaiKhoan: '111', nganHang: 'BIDV' }, { hoTen: 'Trần Thị B', thang: '10/2026', soTien: 9148000, soTaiKhoan: '', nganHang: '' }];
      a.canhBao = []; a.boPhan = [{ boPhan: 'Lương VP', thang: '10/2026', soNguoi: 2, thucLinh: 34717000, bhxh: 16000000, bhyt: 3000000, bhtn: 2000000, kpcd: 66625 }]; return a; };
    const kq = J(ctx.taiLenTaiLieuHoSo(ma, 'BangLuong', 'Luong T10.xlsx', 'application/vnd.ms-excel', Buffer.from('xlsx').toString('base64')));
    assert.equal(kq.soDongDoc, 2);
    const g = J(ctx.layTongHopBangLuong()).find(x => x.maTaiLieu === kq.maTaiLieu);
    assert.deepEqual([g.thang, g.soNguoi, g.coSTK, g.tongTien, g.tongThucLinhBoPhan, g.khopBoPhan, g.tenFile, g.maHoSo], ['10/2026', 2, 1, 34717000, 34717000, true, 'Luong T10.xlsx', ma]);
    assert.equal(J(ctx.layBangTongHopBangLuong()).find(d => d.hoTen === 'Nguyễn Văn A' && d.thang === '10/2026').soTaiKhoan, '111');
  } finally { ctx.trichXuatBangLuongTuFile_ = cu; }
});
dat('Bảng tổng hợp BẢO HIỂM theo tháng: bảng lương (NLĐ khấu trừ theo bộ phận) + bảng đóng BH đã lưu (số LĐ, mức lương, DN, NLĐ, tổng nộp) → chênh lệch NLĐ', () => {
  const g = api('ketoan@example.com', 'gomChungTuTuTrang', trangCua(M.TEP_B.slice(0, 2)));
  assert.equal(g.chungTu[0].loaiChungTu, 'BAO_HIEM');
  api('ketoan@example.com', 'luuChungTuNhieuTrang', ma, { ten: 'BH T10 mau.pdf', mime: 'application/pdf', base64: Buffer.from('%PDF').toString('base64') }, g.chungTu);
  const dongBH = J(ctx.sheetToObjects_('BangKeHoaDon')).find(r => r.LoaiChungTu === 'BAO_HIEM');
  assert.deepEqual([dongBH.Thang, dongBH.SoLaoDong, dongBH.MucLuongDongBH, dongBH.DNDong, dongBH.NLDDong, dongBH.SoTien, dongBH.TenNhaCungCap], ['10/2026', 32, 200000000, 43000000, 21000000, 64000000, 'Bảo hiểm xã hội']);
  const t10 = api('xem@example.com', 'layTongHopBaoHiem').find(t => t.thang === '10/2026');
  assert.equal(t10.luong.nldBH, 16000000 + 3000000 + 2000000); assert.equal(t10.luong.kpcd, 66625);
  assert.deepEqual(t10.tongBangBH, { soLaoDong: 32, dnDong: 43000000, nldDong: 21000000, tongNop: 64000000 });
  assert.equal(t10.chenhLechNLD, 0, 'NLĐ khấu trừ trong bảng lương = NLĐ đóng trong bảng BH');
  assert.equal(t10.bangBH[0].tenFile, 'BH T10 mau.pdf'); assert.equal(t10.bangBH[0].trang, '1–2');
});
dat('Giới hạn OCR: trả mã thử lại, không dùng lớp chữ hỏng và không báo nhầm chưa bật API', () => {
  const cu = ctx.ocrAnhThanhVanBan_;
  try {
    ctx.ocrAnhThanhVanBan_ = () => { throw new Error('User rate limit exceeded for OCR'); };
    const r = ctx.docTrangTaiLieu({ soTrang: 3, lopChu: 'HoA Dor{ GrA', anhBase64: 'eA==', mime: 'image/jpeg' });
    assert.equal(r.thuLai, true); assert.equal(r.maLoi, 'OCR_RATE_LIMIT'); assert.equal(r.vanBan, '');
    assert.ok(!/Drive API/.test(r.loi));
    ctx.ocrAnhThanhVanBan_ = () => { throw new Error('Permission denied'); };
    assert.equal(ctx.docTrangTaiLieu({ anhBase64: 'eA==' }).thuLai, false);
  } finally { ctx.ocrAnhThanhVanBan_ = cu; }
});
dat('Thuế trống và tổng tiền nối cùng dòng: không lấy nhầm tổng làm thuế; mâu thuẫn tiền không tin cậy cao', () => {
  const t = M.TEP_A[1].replace('Tiền thuế GTGT:\nTổng cộng', 'Tiền thuế GTGT: Tổng cộng');
  const r = ctx.trichTruongChungTu_(t, [M.MST_CONG_TY]);
  assert.equal(r.tienThue, 0); assert.equal(r.tongTien, 17250000);
  const k = ctx.kiemChungTu_({ loai: 'HOA_DON', soHoaDon: '1', mstBan: '0301234567', ngayHoaDon: '22/10/2026',
    tongTien: 17250000, tongBangChu: 17250000, tienTruocThue: 17250000, tienThue: 17250000 });
  assert.notEqual(k.tinCay, 'CAO'); assert.ok(k.canhBao.length);
});
Q.ket('đọc tài liệu nhiều trang / đối chiếu / bảng lương');
