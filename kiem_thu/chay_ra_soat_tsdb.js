// TÁI HIỆN & KHOÁ CÁC LỖI RÀ SOÁT 24/10/2026 (luồng tài sản thế chấp + bảo hiểm + nhập Excel). Giả lập Apps Script/Sheets — chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('ra_soat_tsdb'), { ctx, mt, G, hopDong, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const SH = (n) => G.boDuLieu.getSheetByName(n);
const ct = SH('DM_CongTy'); ct.g.push(ct.g[0].map(k => ({ MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002' })[k] ?? ''));
const hdA = hopDong({ soHopDong: 'HD-A' }), hdB = hopDong({ soHopDong: 'HD-B', maCty: 'CTY_B' });
const taoTS = (hd, moTa, o) => J(ctx.luuTaiSanBaoDam(Object.assign({ maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1000000000 }, o || {}))).maTS;
const bhCT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 0, tuNgay: tu, denNgay: den }, o || {});
const luuBH = (maTS, chiTiet, o) => ctx.luuBaoHiemTaiSan(Object.assign({ maTS, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {}));

dat('1. Không sửa/chuyển tài sản của công ty khác (kiểm tra cả hợp đồng GỐC)', () => {
  const tsB = taoTS(hdB, 'Kho của B');
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => [hdA.maCty];
  try {
    assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: tsB, maHD: hdA.maHD, loai: 'BDS', moTa: 'Chiếm của B', giaTri: 1 }), /phạm vi/);
    assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: tsB, maHD: hdB.maHD, loai: 'BDS', moTa: 'Sửa trực tiếp', giaTri: 1 }), /phạm vi/);
  } finally { ctx.phamViCongTyNguoiDung_ = g; }
  const r = J(ctx.layTaiSanBaoDam(hdB.maHD)).rows.find(t => t.maTS === tsB); assert.deepEqual([r.moTa, r.giaTri, r.maHD], ['Kho của B', 1000000000, hdB.maHD], 'không đổi');
  ctx.phamViCongTyNguoiDung_ = () => []; const moi = taoTS(hdA, 'TS chuyển'); assert.ok(J(ctx.luuTaiSanBaoDam({ maTS: moi, maHD: hdB.maHD, loai: 'BDS', moTa: 'TS chuyển', giaTri: 5 })).daSua, 'toàn hệ thống được chuyển (có nhật ký)');
});
dat('2. Nguyên giá/khấu hao/còn lại: hợp nhất với số ĐANG LƯU (nhập tay và Excel)', () => {
  const ts = taoTS(hdA, 'Máy A', { nguyenGia: 1000, khauHao: 200 });
  assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'Máy A', giaTri: 5, khauHao: 1200 }), /Khấu hao \(1200\) không được lớn hơn nguyên giá \(1000\)/);
  const ok = J(ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'Máy A', giaTri: 5, khauHao: 300 })); const r = J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts);
  assert.deepEqual([r.nguyenGia, r.khauHao, r.giaTriConLai], [1000, 300, 700], 'còn lại tính lại theo số mới'); assert.ok(ok.daSua);
  ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Tên tài sản', 'Khấu hao'], ['Máy A', 1200]] }];
  const xem = J(ctx.xemTruocCapNhatTSDB({ maHD: hdA.maHD, base64: 'eA==' })).dong[0]; assert.equal(xem.hanhDongTS, 'LOI'); assert.match(xem.loi.join(' '), /Khấu hao \(1200\) không được lớn hơn nguyên giá \(1000\)/);
  const ap = J(ctx.apDungCapNhatTSDB({ maHD: hdA.maHD, dong: [xem] })); assert.deepEqual([ap.capNhat, ap.boQua.length], [0, 1]); assert.equal(J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts).khauHao, 300, 'dữ liệu không đổi');
  ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Tên tài sản', 'Khấu hao'], ['Máy A', 400]] }];
  const x2 = J(ctx.xemTruocCapNhatTSDB({ maHD: hdA.maHD, base64: 'eA==' })).dong[0]; assert.deepEqual([x2.hanhDongTS, x2.nguyenGia, x2.khauHao, x2.conLai, x2.truoc.kh], ['CAP_NHAT', 1000, 400, 600, 300], 'xem trước thấy số sau hợp nhất và số trước');
  J(ctx.apDungCapNhatTSDB({ maHD: hdA.maHD, dong: [x2] })); const r2 = J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts); assert.deepEqual([r2.nguyenGia, r2.khauHao, r2.giaTriConLai], [1000, 400, 600]);
});
dat('3. Cảnh báo bảo hiểm theo TỪNG hạng mục: hạng mục đã hết không bị che; chưa tới ngày bắt đầu; gia hạn liền mạch thì không báo', () => {
  const ts = taoTS(hdA, 'Cụm kho');
  luuBH(ts, [bhCT('Kho A', ngay(-400), ngay(-1)), bhCT('Kho B', ngay(-10), ngay(100))], { soHDBaoHiem: 'S-AB' });
  const r1 = J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts); assert.equal(r1.canhBaoBaoHiem, 'QUA_HAN', 'Kho A hết hôm qua dù Kho B còn 100 ngày'); assert.equal(r1.ngayHetHanBaoHiem, ngay(-1));
  const ts2 = taoTS(hdA, 'Nhà mới'); luuBH(ts2, [bhCT('Nhà mới', ngay(20), ngay(100))], { soHDBaoHiem: 'S-NEW' });
  const r2 = J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts2); assert.equal(r2.canhBaoBaoHiem, 'CHUA_HIEU_LUC', 'hiện chưa có bảo hiểm hiệu lực'); assert.equal(r2.ngayHetHanBaoHiem, ngay(20)); assert.ok(J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay.chiTietBaoHiem.some(d => d.maTS === ts2 && d.muc === 'CHUA_HIEU_LUC'));
  const ts3 = taoTS(hdA, 'Xưởng gia hạn'); luuBH(ts3, [bhCT('Xưởng', ngay(-200), ngay(5))], { soHDBaoHiem: 'S-1' }); luuBH(ts3, [bhCT('Xưởng', ngay(6), ngay(365))], { soHDBaoHiem: 'S-2' });
  const r3 = J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts3); assert.deepEqual([r3.canhBaoBaoHiem, r3.ngayHetHanBaoHiem], ['', ngay(365)], 'gia hạn nối liền → hết hạn ở cuối chuỗi, không báo hợp đồng cũ');
  const ts4 = taoTS(hdA, 'Xưởng hở'); luuBH(ts4, [bhCT('Xưởng', ngay(-200), ngay(-50))], { soHDBaoHiem: 'S-3' }); luuBH(ts4, [bhCT('Xưởng', ngay(30), ngay(365))], { soHDBaoHiem: 'S-4' });
  assert.equal(J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts4).canhBaoBaoHiem, 'CHUA_HIEU_LUC', 'có khoảng trống đến khi hợp đồng mới bắt đầu');
  const ts5 = taoTS(hdA, 'Xưởng sắp hết'); luuBH(ts5, [bhCT('Xưởng', ngay(-100), ngay(7))], { soHDBaoHiem: 'S-5' }); assert.equal(J(ctx.layTaiSanBaoDam(hdA.maHD)).rows.find(t => t.maTS === ts5).canhBaoBaoHiem, 'SAP_HET');
});
dat('4. Sửa bảo hiểm lỗi giữa chừng KHÔNG làm mất chi tiết cũ', () => {
  const ts = taoTS(hdA, 'TS sửa BH'); const r = J(luuBH(ts, [bhCT('Hạng mục 1', '2026-01-01', '2026-12-31'), bhCT('Hạng mục 2', '2026-01-01', '2026-12-31')], { soHDBaoHiem: 'S-EDIT' }));
  const chiTiet = () => J(ctx.layBaoHiemTaiSan(ts)).hopDong.find(h => h.maBH === r.maBH).chiTiet.map(c => c.tenTaiSan);
  assert.deepEqual(chiTiet(), ['Hạng mục 1', 'Hạng mục 2']);
  const sh = SH('BaoHiemTaiSanChiTiet'), goc = sh.getRange.bind(sh); let demGhi = 0; sh.loiGhi = null;
  const ghiGoc = ctx.ghiDongMoi_; ctx.ghiDongMoi_ = (ten, cot, o) => { if (ten === 'BaoHiemTaiSanChiTiet' && o.TenTaiSan === 'Mới 2' && !mt.__khoiPhuc) throw new Error('Lỗi ghi giả lập'); return ghiGoc(ten, cot, o); };
  try { assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: ts, maBH: r.maBH, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S-EDIT', chiTiet: [bhCT('Mới 1', '2026-01-01', '2026-12-31'), bhCT('Mới 2', '2026-01-01', '2026-12-31')] }), /Dữ liệu cũ đã được giữ nguyên/); } finally { ctx.ghiDongMoi_ = ghiGoc; }
  assert.deepEqual(chiTiet(), ['Hạng mục 1', 'Hạng mục 2'], 'chi tiết cũ còn nguyên sau lỗi'); assert.equal(J(ctx.layBaoHiemTaiSan(ts)).hopDong.find(h => h.maBH === r.maBH).chiTiet.map(c => c.stt).join(), '1,2');
  J(ctx.luuBaoHiemTaiSan({ maTS: ts, maBH: r.maBH, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S-EDIT', chiTiet: [bhCT('Mới 1', '2026-01-01', '2026-12-31')] })); assert.deepEqual(chiTiet(), ['Mới 1'], 'không lỗi thì thay đúng');
});
dat('5. Nạp Excel: lỗi ghi bảo hiểm không để lại hợp đồng dở dang, kết quả nói rõ tài sản đã ghi / bảo hiểm chưa ghi', () => {
  ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Tên tài sản', 'Giá trị định giá', 'Công ty bảo hiểm', 'Ngày ký hợp đồng bảo hiểm', 'Bảo hiểm từ ngày', 'Đến ngày'], ['Máy cán', 5000000, 'PVI', '01/02/2026', '01/02/2026', '01/02/2027']] }];
  const xem = J(ctx.xemTruocCapNhatTSDB({ maHD: hdA.maHD, base64: 'eA==' })), bhTruoc = ctx.docSheetBaoDam_('BaoHiemTaiSan').length, ctTruoc = ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').length;
  const ghiGoc = ctx.ghiDongMoi_; ctx.ghiDongMoi_ = (ten, cot, o) => { if (ten === 'BaoHiemTaiSan') throw new Error('Lỗi ghi giả lập'); return ghiGoc(ten, cot, o); };
  let kq; try { kq = J(ctx.apDungCapNhatTSDB({ maHD: hdA.maHD, dong: xem.dong })); } finally { ctx.ghiDongMoi_ = ghiGoc; }
  assert.equal(kq.ok, false); assert.deepEqual([kq.taoMoi, kq.bhThem, kq.loiBH.length, kq.loiBH[0].taiSanDaGhi], [1, 0, 1, true]); assert.match(kq.loiBH[0].loi, /Bảo hiểm KHÔNG được ghi/);
  assert.deepEqual([ctx.docSheetBaoDam_('BaoHiemTaiSan').length, ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').length], [bhTruoc, ctTruoc], 'không còn cha rỗng / chi tiết mồ côi');
  const xem2 = J(ctx.xemTruocCapNhatTSDB({ maHD: hdA.maHD, base64: 'eA==' })); assert.deepEqual([xem2.dong[0].hanhDongTS, xem2.dong[0].hanhDongBH], ['CAP_NHAT', 'THEM'], 'chạy lại: cập nhật tài sản đã tạo, thêm bảo hiểm còn thiếu');
  const k2 = J(ctx.apDungCapNhatTSDB({ maHD: hdA.maHD, dong: xem2.dong })); assert.deepEqual([k2.ok, k2.taoMoi, k2.capNhat, k2.bhThem], [true, 0, 1, 1]);
});
dat('6. Nạp Excel: không bỏ tài sản có tên “Cổng…”, “Công trình…”, “Tổng kho”; chỉ bỏ dòng Tổng cộng thật', () => {
  ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['STT', 'Tên tài sản', 'Giá trị định giá'], [1, 'Cổng nhà máy', 100], [2, 'Công trình phụ', 200], [3, 'Tổng kho', 300], [4, 'Nhà xưởng', 400], ['Tổng cộng', '', 1000], ['', 'Cộng', 1000], ['', '', 5]] }];
  const xem = J(ctx.xemTruocCapNhatTSDB({ maHD: hdA.maHD, base64: 'eA==' }));
  assert.deepEqual(xem.dong.map(d => d.ten), ['Cổng nhà máy', 'Công trình phụ', 'Tổng kho', 'Nhà xưởng', ''], 'chỉ bỏ 2 dòng tổng; dòng dữ liệu không tên vẫn hiện (báo lỗi, không mất âm thầm)');
  assert.equal(xem.dong[4].hanhDongTS, 'LOI');
});
dat('7. Lưu bảo hiểm bị từ chối KHÔNG thêm công ty vào Khách hàng', () => {
  const ts = taoTS(hdA, 'TS kiểm KH'), soKH = () => ctx.docSheetBaoDam_('DM_KhachHang').length, truoc = soKH();
  assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: ts, maBH: 'BH-9999', ngayKyHD: '2026-01-01', congTyBaoHiem: 'Công ty ma', chiTiet: [bhCT('X', '2026-01-01', '2026-12-31')] }), /Không tìm thấy hợp đồng bảo hiểm/);
  assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: ts, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Công ty ma', chiTiet: [bhCT('X', '2026-12-31', '2026-01-01')] }), /không được trước/);
  assert.equal(soKH(), truoc, 'từ chối thì không đổi danh mục');
  luuBH(ts, [bhCT('X', '2026-01-01', '2026-12-31')], { congTyBaoHiem: 'Công ty thật', soHDBaoHiem: 'S-KH' }); assert.equal(soKH(), truoc + 1);
});
dat('8. Gửi lại cùng yêu cầu tạo bảo hiểm không nhân đôi; trùng số/ngày ký nhưng nội dung khác bị chặn rõ ràng', () => {
  const ts = taoTS(hdA, 'TS lặp'), yc = { maTS: ts, ngayKyHD: '2026-03-01', congTyBaoHiem: 'PTI', soHDBaoHiem: 'S-LAP', chiTiet: [bhCT('TS lặp', '2026-03-01', '2027-03-01')] };
  const a = J(ctx.luuBaoHiemTaiSan(yc)), b = J(ctx.luuBaoHiemTaiSan(yc)); assert.equal(a.trungLap, undefined); assert.deepEqual([b.trungLap, b.maBH], [true, a.maBH]);
  assert.equal(J(ctx.layBaoHiemTaiSan(ts)).hopDong.length, 1, 'chỉ 1 hợp đồng bảo hiểm');
  assert.throws(() => ctx.luuBaoHiemTaiSan(Object.assign({}, yc, { chiTiet: [bhCT('TS lặp', '2026-03-01', '2027-03-01', { giaTriBH: 999999 })] })), /cùng số “S-LAP”.*nội dung chi tiết khác/);
  assert.equal(J(ctx.luuBaoHiemTaiSan(Object.assign({}, yc, { soHDBaoHiem: 'S-LAP-PL1', chiTiet: [bhCT('TS lặp', '2027-03-02', '2028-03-01')] }))).trungLap, undefined, 'phụ lục/gia hạn (số khác) tạo được');
  assert.equal(J(ctx.layBaoHiemTaiSan(ts)).hopDong.length, 2);
});
dat('9. Nạp Excel: Mã tài sản sai/không thuộc hợp đồng/trùng tên không âm thầm sửa tài sản khác', () => {
  const t1 = taoTS(hdA, 'Máy trùng tên', { nguyenGia: 100 }), t2 = taoTS(hdA, 'Máy trùng tên'), tB = taoTS(hdB, 'Kho riêng B');
  const doc = (v) => { ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Mã tài sản', 'Tên tài sản', 'Giá trị định giá'], v] }]; return J(ctx.xemTruocCapNhatTSDB({ maHD: hdA.maHD, base64: 'eA==' })).dong[0]; };
  assert.match(doc(['TS-TYPO', 'Máy trùng tên', 5]).loi.join(' '), /Mã tài sản “TS-TYPO” không có trong hệ thống/);
  assert.match(doc([tB, 'Kho riêng B', 5]).loi.join(' '), /thuộc hợp đồng khác/);
  assert.match(doc(['', 'Máy trùng tên', 5]).loi.join(' '), /Có 2 tài sản cùng tên/);
  const dung = doc([t1, 'Máy trùng tên', 7]); assert.deepEqual([dung.hanhDongTS, dung.maTSHienCo], ['CAP_NHAT', t1]);
  ctx.giaiChapTaiSan(t2, 'giải chấp thử'); assert.match(doc([t2, 'Máy trùng tên', 5]).loi.join(' '), /đã giải chấp/);
});
Q.ket('rà soát luồng tài sản thế chấp và bảo hiểm');
