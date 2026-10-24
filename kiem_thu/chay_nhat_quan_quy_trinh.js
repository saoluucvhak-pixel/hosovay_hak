// NHẤT QUÁN QUY TRÌNH: định danh hạng mục bảo hiểm (nhập tay = Excel), xem trước = áp dụng, gửi lại không trùng, quyền nguồn+đích, dư nợ giữa các màn hình,
// không có đường ghi song song, nâng cấp cấu trúc chạy hai lần. Dữ liệu LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const Q = require('./_qlv_chung')('nhat_quan'), { ctx, mt, G, hopDong, themHoSo, rev, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const ctB = G.boDuLieu.getSheetByName('DM_CongTy'); ctB.g.push(ctB.g[0].map(k => ({ MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002' })[k] ?? ''));
const hdA = hopDong({ soHopDong: 'HD-A' }), hdB = hopDong({ soHopDong: 'HD-B', maCty: 'CTY_B' });
let _k = 0;
const taoTS = (hd, moTa, o) => J(ctx.luuTaiSanBaoDam(Object.assign({ khoaYeuCau: 'NQ' + (++_k), maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1000000000 }, o || {}))).maTS;
const dsTS = (hd) => J(ctx.layTaiSanBaoDam(hd.maHD)).rows;
const CT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 500, tuNgay: tu, denNgay: den }, o || {});
const luuBH = (maTS, chiTiet, o) => J(ctx.luuBaoHiemTaiSan(Object.assign({ maTS, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {})));
const bhCua = (ts) => J(ctx.layBaoHiemTaiSan(ts)).hopDong;
const TIEU = ['Tên tài sản', 'Giá trị định giá', 'Công ty bảo hiểm', 'Số HĐ bảo hiểm', 'Ngày ký hợp đồng bảo hiểm', 'Tiền bảo hiểm', 'Phí bảo hiểm', 'Bảo hiểm từ ngày', 'Bảo hiểm đến ngày'];
const xlsx = (dong, tieu) => { ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [tieu || TIEU].concat(dong) }]; };
const xem = (hd) => J(ctx.xemTruocCapNhatTSDB({ maHD: hd.maHD, base64: 'eA==' }));
const apDung = (hd, x) => J(ctx.apDungCapNhatTSDB({ maHD: hd.maHD, dong: x.dong }));
const H = '2026-12-31';
const dongEx = (ten, den, o) => [ten, 5000000, 'Bảo Việt', 'S1', '01/01/2026', 777, 55, '01/01/2026', den].concat(o || []);

dat('E1. Hạng mục nhập tay (để trống mã / có mã riêng) rồi Excel cập nhật → vẫn MỘT hạng mục, không thêm dòng trùng', () => {
  // (a) nhập tay để trống mã
  const tsA = taoTS(hdA, 'Kho A'); luuBH(tsA, [CT('Kho A', '2026-01-01', H, { phiBH: 10 }), CT('Kho B', '2026-01-01', H)]);
  xlsx([dongEx('Kho A', '31/12/2027')]); const x = xem(hdA);
  assert.deepEqual([x.dong[0].hanhDongTS, x.dong[0].hanhDongBH], ['CAP_NHAT', 'CAP_NHAT'], 'xem trước: cập nhật đúng hạng mục, không phải "thêm hạng mục"');
  assert.ok(!x.dong[0].bhThayDoi.some(t => /thêm hạng mục/.test(t)), x.dong[0].bhThayDoi.join('; '));
  const k = apDung(hdA, x); assert.deepEqual([k.ok, k.bhCapNhat, k.bhThem], [true, 1, 0]);
  const h = bhCua(tsA); assert.equal(h.length, 1); assert.deepEqual(J(h[0].chiTiet.map(c => c.tenTaiSan)), ['Kho A', 'Kho B'], 'không có dòng trùng');
  const a = h[0].chiTiet.find(c => c.tenTaiSan === 'Kho A'); assert.deepEqual([a.denNgay, a.phiBH, a.tienBH, a.maTaiSan], ['2027-12-31', 55, 777, ''], 'cập nhật vào đúng dòng, giữ mã (trống) của nhập tay');
  // (b) nhập tay có mã riêng
  const tsC = taoTS(hdA, 'Máy C'); luuBH(tsC, [CT('Máy C', '2026-01-01', H, { maTaiSan: 'MC-01', phiBH: 10 })], { soHDBaoHiem: 'S2' });
  xlsx([['Máy C', 5000000, 'Bảo Việt', 'S2', '01/01/2026', 777, 55, '01/01/2026', '31/12/2027']]); const x2 = xem(hdA); assert.equal(x2.dong[0].hanhDongBH, 'CAP_NHAT'); apDung(hdA, x2);
  const hc = bhCua(tsC).find(b => b.soHDBaoHiem === 'S2'); assert.deepEqual([hc.chiTiet.length, hc.chiTiet[0].maTaiSan, hc.chiTiet[0].denNgay], [1, 'MC-01', '2027-12-31'], 'giữ mã riêng, không thêm hạng mục thứ hai');
  // (c) hai hạng mục cùng tên → không đoán: dòng lỗi rõ ràng, không ghi gì
  const tsD = taoTS(hdA, 'Bơm D'); luuBH(tsD, [CT('Bơm D', '2026-01-01', H, { maTaiSan: 'D1' }), CT('Bơm D', '2026-01-01', H, { maTaiSan: 'D2' })], { soHDBaoHiem: 'S3' });
  xlsx([['Bơm D', 5000000, 'Bảo Việt', 'S3', '01/01/2026', 777, 55, '01/01/2026', '31/12/2027']]); const x3 = xem(hdA);
  assert.equal(x3.dong[0].hanhDongTS, 'LOI'); assert.match(x3.dong[0].loi.join(' '), /2 hạng mục cùng tên/);
  const k3 = apDung(hdA, x3); assert.equal(k3.boQua.length, 1); assert.equal(bhCua(tsD).find(b => b.soHDBaoHiem === 'S3').chiTiet.length, 2);
  // (d) Excel tạo trước rồi nhập tay sửa → vẫn một hạng mục (đối xứng)
  xlsx([['Tài sản E', 5000000, 'Bảo Việt', 'S4', '01/01/2026', 5, 5, '01/01/2026', '31/12/2026']]); apDung(hdA, xem(hdA));
  const tsE = dsTS(hdA).find(t => t.moTa === 'Tài sản E').maTS, bE = bhCua(tsE)[0];
  luuBH(tsE, bE.chiTiet.map(c => CT(c.tenTaiSan, c.tuNgay, '2027-12-31', { maTaiSan: c.maTaiSan })).concat([CT('Hạng mục thêm tay', '2026-01-01', H)]), { maBH: bE.maBH, expectedRevision: bE.revision, soHDBaoHiem: 'S4' });
  xlsx([['Tài sản E', 5000000, 'Bảo Việt', 'S4', '01/01/2026', 6, 6, '01/01/2026', '31/12/2028']]); apDung(hdA, xem(hdA));
  assert.deepEqual(J(bhCua(tsE)[0].chiTiet.map(c => c.tenTaiSan + '@' + c.denNgay)).sort(), ['Hạng mục thêm tay@2026-12-31', 'Tài sản E@2028-12-31']);
});
dat('E2. Xem trước và áp dụng cho CÙNG kết quả: nhiều dòng (tài sản mới, cập nhật, cùng tài sản hai lần); dữ liệu lưu = dự báo của xem trước', () => {
  const ts = taoTS(hdA, 'Máy tuần tự 2', { nguyenGia: 1000, khauHao: 100 });
  xlsx([['Máy tuần tự 2', 5000000, 'PVI', 'X1', '01/02/2026', 9, 9, '01/02/2026', '01/02/2027'], ['Máy tuần tự 2', 5000000, 'PVI', 'X1', '01/02/2026', 9, 99, '01/02/2026', '01/08/2027'], ['Máy mới 2', 7000000, 'PVI', 'X2', '01/02/2026', 3, 3, '01/02/2026', '01/02/2027']]);
  const x = xem(hdA); assert.deepEqual(x.dong.map(d => [d.hanhDongTS, d.hanhDongBH]), [['CAP_NHAT', 'THEM'], ['CAP_NHAT', 'CAP_NHAT'], ['TAO_MOI', 'THEM']], 'dòng 2 thấy hợp đồng dòng 1 sẽ tạo');
  const k = apDung(hdA, x); assert.deepEqual([k.ok, k.taoMoi, k.capNhat, k.bhThem, k.bhCapNhat, k.boQua.length], [true, 1, 2, 2, 1, 0]);
  const h = bhCua(ts).find(b => b.soHDBaoHiem === 'X1'); assert.deepEqual([h.chiTiet.length, h.chiTiet[0].phiBH, h.chiTiet[0].denNgay], [1, 99, '2027-08-01'], 'dòng sau thắng, một hạng mục');
  const mo = dsTS(hdA).find(t => t.moTa === 'Máy mới 2'); assert.ok(mo); assert.equal(bhCua(mo.maTS).length, 1);
  // gửi lại đúng payload xem trước (mất phản hồi): không nhân đôi bất cứ thứ gì
  const trCT = ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').length, trBH = ctx.docSheetBaoDam_('BaoHiemTaiSan').length, trTS = ctx.docSheetBaoDam_('TaiSanBaoDam').length;
  const k2 = apDung(hdA, x); assert.equal(k2.taoMoi, 0);
  assert.deepEqual([ctx.docSheetBaoDam_('BaoHiemTaiSan').length, ctx.docSheetBaoDam_('TaiSanBaoDam').length], [trBH, trTS], 'không tạo thêm tài sản/hợp đồng khi gửi lại');
  assert.ok(ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').length >= trCT - 5); assert.equal(bhCua(mo.maTS).length, 1);
  k2.boQua.forEach(b => assert.match(b.loi, /phiên bản|người khác/i, 'gửi lại bị chặn vì phiên bản, không ghi đè'));
});
dat('E3. Excel áp dụng lỗi/xung đột giữa chừng rồi chạy lại: không nhân đôi, không mất; tổng tiền bảo hiểm không cộng trùng', () => {
  const ts = taoTS(hdA, 'Máy E3'); luuBH(ts, [CT('Máy E3', '2026-01-01', H, { tienBH: 100 })], { soHDBaoHiem: 'S-E3' });
  xlsx([['Máy E3', 5000000, 'Bảo Việt', 'S-E3', '01/01/2026', 200, 5, '01/01/2026', '31/12/2027'], ['Máy E3b', 5000000, 'Bảo Việt', 'S-E3b', '01/01/2026', 300, 5, '01/01/2026', '31/12/2027']]);
  const x = xem(hdA);
  const goc = ctx.capNhatDongTheoMa_; let dem = 0; ctx.capNhatDongTheoMa_ = (t, kh, m, c, b) => { if (t === 'BaoHiemTaiSan' && ++dem === 1) throw new Error('Lỗi cha lần 1'); return goc(t, kh, m, c, b); };
  let k; try { k = apDung(hdA, x); } finally { ctx.capNhatDongTheoMa_ = goc; }
  assert.equal(k.ok, false); assert.equal(k.loiBH.length, 1);
  assert.deepEqual([bhCua(ts).find(b => b.soHDBaoHiem === 'S-E3').tong.tienBH], [100], 'cập nhật lỗi → số cũ còn nguyên');
  const bTS = dsTS(hdA).find(t => t.moTa === 'Máy E3b'); assert.ok(bTS); assert.equal(bhCua(bTS.maTS).length, 1, 'dòng 2 vẫn ghi đủ (lỗi dòng 1 không chặn dòng 2)');
  const k2 = apDung(hdA, xem(hdA)); assert.equal(k2.ok, true);
  assert.deepEqual([bhCua(ts).find(b => b.soHDBaoHiem === 'S-E3').tong.tienBH, bhCua(bTS.maTS).length, bhCua(bTS.maTS)[0].tong.tienBH], [200, 1, 300]);
  assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, false);
});
dat('E4. Lô Excel gặp kết quả CHƯA XÁC ĐỊNH: giữ dữ liệu, dừng ghi tiếp hợp đồng đó, báo cần xác minh; dòng khác vẫn ghi', () => {
  const ts = taoTS(hdA, 'Máy E4'); luuBH(ts, [CT('Máy E4', '2026-01-01', H)], { soHDBaoHiem: 'S-E4' });
  xlsx([['Máy E4', 5000000, 'Bảo Việt', 'S-E4', '01/01/2026', 1, 1, '01/01/2026', '31/12/2027'], ['Máy E4', 5000000, 'Bảo Việt', 'S-E4', '01/01/2026', 2, 2, '01/01/2026', '31/12/2028'], ['Máy E4 khác', 5000000, 'Bảo Việt', 'S-E4b', '01/01/2026', 3, 3, '01/01/2026', '31/12/2027']]);
  const x = xem(hdA), goc = ctx.capNhatDongTheoMa_, gocDoc = ctx.docChaBH_; let dem = 0;
  ctx.capNhatDongTheoMa_ = (t, kh, m, c, b) => { if (t === 'BaoHiemTaiSan' && ++dem === 1) { goc(t, kh, m, c, b); throw new Error('Lỗi sau ghi'); } return goc(t, kh, m, c, b); };
  ctx.docChaBH_ = (ma, b) => { if (dem === 1) { dem = 2; throw new Error('Không đọc được'); } return gocDoc(ma, b); };
  let k; try { k = apDung(hdA, x); } finally { ctx.capNhatDongTheoMa_ = goc; ctx.docChaBH_ = gocDoc; }
  assert.equal(k.ok, false); assert.equal(k.loiBH[0].chuaXacDinh, true); assert.match(k.loiBH[0].loi, /CHƯA XÁC ĐỊNH/); assert.equal(k.canXacMinh.length, 1);
  assert.match(k.boQua.map(b => b.loi).join(' '), /CHƯA XÁC ĐỊNH.*dừng ghi tiếp|dừng ghi tiếp/, 'dòng 2 cùng hợp đồng bị dừng, không ghi chồng');
  const khac = dsTS(hdA).find(t => t.moTa === 'Máy E4 khác'); assert.ok(khac && bhCua(khac.maTS).length === 1, 'hợp đồng khác vẫn ghi');
  assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, true, 'còn thế hệ cũ chưa dọn → cần xác minh');
  const kq = J(ctx.xacMinhPhucHoiBaoHiem(k.canXacMinh[0])); assert.equal(kq.trangThai, 'DA_CHOT');
  const h = bhCua(ts).find(b => b.soHDBaoHiem === 'S-E4'); assert.deepEqual([h.chiTiet.length, h.chiTiet[0].tienBH], [1, 1], 'bản dòng 1 đã chốt (thực tế đã ghi), không lẫn dòng 2');
});
dat('E5. Quyền nguồn + đích: người giới hạn công ty A không đọc/sửa/chuyển/huỷ/giải chấp dữ liệu công ty B, dù đích hay nguồn trong phạm vi; Xem không ghi được', () => {
  const tsA = taoTS(hdA, 'TS của A'), tsB = taoTS(hdB, 'TS của B'), bB = luuBH(tsB, [CT('Kho B', '2026-01-01', H)], { soHDBaoHiem: 'SB' });
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => [hdA.maCty];
  try {
    const revB = dsTS(hdB).length ? 1 : 1;
    assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: tsB, maHD: hdA.maHD, loai: 'BDS', moTa: 'Cướp về A', giaTri: 1, expectedRevision: revB }), /phạm vi/, 'nguồn ngoài phạm vi');
    assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: tsA, maHD: hdB.maHD, loai: 'BDS', moTa: 'Đẩy sang B', giaTri: 1, expectedRevision: 1 }), /phạm vi/, 'đích ngoài phạm vi');
    assert.throws(() => ctx.luuTaiSanBaoDam({ khoaYeuCau: 'NQ-Z', maHD: hdB.maHD, loai: 'BDS', moTa: 'Tạo ở B', giaTri: 1 }), /phạm vi/);
    assert.throws(() => ctx.layBaoHiemTaiSan(tsB), /phạm vi|Không tìm thấy/);
    assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: tsB, ngayKyHD: '2026-01-01', congTyBaoHiem: 'X', soHDBaoHiem: 'Z', chiTiet: [CT('K', '2026-01-01', H)] }), /phạm vi|Không tìm thấy/);
    assert.throws(() => ctx.huyBaoHiemTaiSan(bB.maBH, 'lý do hủy', bB.revision), /phạm vi|Không tìm thấy/);
    assert.throws(() => ctx.giaiChapTaiSan(tsB, 'lý do giải chấp', 1), /phạm vi|Không tìm thấy/);
    xlsx([['TS Excel B', 5000000, 'Bảo Việt', 'SB2', '01/01/2026', 1, 1, '01/01/2026', '31/12/2027']]);
    assert.throws(() => xem(hdB), /phạm vi/); assert.throws(() => ctx.apDungCapNhatTSDB({ maHD: hdB.maHD, dong: [{ dong: 2, raw: {} }] }), /phạm vi/);
  } finally { ctx.phamViCongTyNguoiDung_ = goc; }
  assert.equal(J(ctx.layBaoHiemTaiSan(tsB)).hopDong.length, 1, 'dữ liệu B không đổi');
  const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
  ['luuTaiSanBaoDam', 'luuBaoHiemTaiSan', 'huyBaoHiemTaiSan', 'giaiChapTaiSan', 'apDungCapNhatTSDB', 'xacMinhPhucHoiBaoHiem', 'donChiTietBaoHiemThua'].forEach(ten => assert.throws(() => voi('xem@example.com', () => ctx.api('', ten, [{}])), /quyền|QUYEN/i, ten));
});
dat('E6. Dư nợ/gốc/lãi nhất quán giữa các màn hình: chứng từ ≠ giải ngân; trả một phần, đủ, hủy; USD giữ số thực nhập', () => {
  const hd = hopDong({ soHopDong: 'HD-DUNO', hanMucVay: 2000000000 }), hom = ngay(-5);
  themHoSo({ MaHoSo: 'N1', MaHD: hd.maHD, TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 100000000, NgayGiaiNgan: hom });
  themHoSo({ MaHoSo: 'N2', MaHD: hd.maHD, TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: 200000000, NgayGiaiNgan: hom });
  themHoSo({ MaHoSo: 'N3', MaHD: hd.maHD, TrangThai: 'Đã giải ngân', LoaiTien: 'USD', SoTienNhanNoLanNay: 1000.25, NgayGiaiNgan: hom, TyGiaBan: 25000 });
  const hm = () => J(ctx.layHanMucTinDung()).rows.find(r => r.maHD === hd.maHD), tq = () => J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay.hanMuc.tongDaDung;
  assert.deepEqual([hm().daDung, hm().dangCho], [225006250, 100000000], 'chứng từ (Đã tạo hồ sơ) chỉ là đang chờ, chưa tính dư nợ; USD quy đổi 1000,25 × 25.000');
  const tong0 = tq();
  ctx.ghiNhanTraNo('N2', { loaiTra: 'GOC', ngayTra: ngay(-2), soTien: 50000000, soThamChieu: 'UNC-N2-1', chungTu: 'UNC 1' }, rev('N2'));
  assert.equal(ctx.layTraNoHoSo('N2').duNoGoc, 150000000); assert.equal(hm().daDung, 175006250); assert.equal(tq(), tong0 - 50000000, 'Tổng quan khớp hạn mức');
  const trUSD = ctx.ghiNhanTraNo('N3', { loaiTra: 'GOC', ngayTra: ngay(-2), soTien: '400.10', soThamChieu: 'UNC-N3-1', chungTu: 'UNC 3' }, rev('N3'));
  const t3 = J(ctx.layTraNoHoSo('N3')); assert.deepEqual([t3.duNoGoc, t3.dong[0].soTien, t3.loaiTien], [600.15, 400.1, 'USD'], 'giữ số USD thực nhập, không ghi đè bằng số quy đổi');
  assert.equal(hm().daDung, 150000000 + Math.round(600.15 * 25000), 'dư nợ USD quy đổi theo dư nợ gốc USD còn lại');
  ctx.huyTraNo(trUSD.maTra, 'nhập nhầm', rev('N3')); assert.equal(ctx.layTraNoHoSo('N3').duNoGoc, 1000.25); assert.equal(hm().daDung, 150000000 + 25006250);
  ctx.ghiNhanTraNo('N2', { loaiTra: 'GOC', ngayTra: ngay(-1), soTien: 150000000, soThamChieu: 'UNC-N2-2', chungTu: 'UNC 2' }, rev('N2'));
  assert.equal(ctx.layTraNoHoSo('N2').duNoGoc, 0); assert.equal(hm().soKhoan, 1, 'khoản đã trả đủ không còn trong hạn mức');
  // gửi lại sau mất phản hồi: cùng phiên bản → XUNG_DOT; phiên bản mới nhưng cùng số tham chiếu → chặn trùng. Không nhân đôi bản ghi.
  const dem = () => J(ctx.layTraNoHoSo('N3')).dong.filter(d => d.trangThai === 'Hiệu lực').length, truoc = dem();
  const revCu = rev('N3'); ctx.ghiNhanTraNo('N3', { loaiTra: 'LAI', ngayTra: ngay(-1), soTien: 1000, soThamChieu: 'UNC-N3-LAI', chungTu: 'UNC lãi' }, revCu);
  assert.throws(() => ctx.ghiNhanTraNo('N3', { loaiTra: 'LAI', ngayTra: ngay(-1), soTien: 1000, soThamChieu: 'UNC-N3-LAI', chungTu: 'UNC lãi' }, revCu), /XUNG_DOT_PHIEN_BAN/);
  assert.throws(() => ctx.ghiNhanTraNo('N3', { loaiTra: 'LAI', ngayTra: ngay(-1), soTien: 1000, soThamChieu: 'UNC-N3-LAI', chungTu: 'UNC lãi' }, rev('N3')), /đã dùng/);
  assert.equal(dem(), truoc + 1);
});
dat('E7. Không có đường ghi song song: bảng bảo hiểm chỉ được ghi qua bộ ghi/ghiHopDongBH_ dùng chung (nhập tay và Excel cùng một service)', () => {
  const doc = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const caps = doc('CAPNHATBAOHIEM.gs');
  assert.doesNotMatch(caps, /ghiDongMoi_\(SHEET_BAO_HIEM|ghiNhieuDong_\(SHEET_BAO_HIEM|capNhatDongTheoMa_\(SHEET_BAO_HIEM/, 'Excel không tự ghi bảng bảo hiểm');
  assert.match(caps, /ghiHopDongBH_\(/); assert.match(doc('BAODAM.gs'), /ghiHopDongBH_\(\{/);
  const goi = fs.readdirSync(path.join(__dirname, '..')).filter(f => /\.gs$/.test(f) && f !== 'BAODAM.gs');
  goi.forEach(f => assert.doesNotMatch(doc(f), /SHEET_BAO_HIEM_TS_CT\b[^;\n]*(setValues|appendRow|deleteRow)/, f + ' không ghi trực tiếp bảng chi tiết bảo hiểm'));
});
dat('E8. Nâng cấp cấu trúc chạy HAI lần: dữ liệu cũ (chưa có cột Revision/TheHe/SoDong/KhoaYeuCau) không mất, tiền không đổi, vẫn đọc/sửa được', () => {
  const ss = G.boDuLieu, tenCu = ['TaiSanBaoDam', 'BaoHiemTaiSan', 'BaoHiemTaiSanChiTiet'];
  tenCu.forEach(t => { delete ss.sheets[t]; });
  const sh = (t, cot, dong) => { const s2 = ctx.ensureSheet_(ss, t, cot); s2.g.length = 0; s2.g.push(cot.slice()); dong.forEach(d => s2.g.push(d)); return s2; };
  sh('TaiSanBaoDam', ['MaTS', 'MaHD', 'LoaiTS', 'MoTa', 'GiaTriVND', 'NgayDinhGia', 'SoHDBaoDam', 'NgayHetHanBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'GiaiChapLuc', 'LyDoGiaiChap'], [['TS-0001', hdA.maHD, 'BDS', 'Tài sản cũ', 123456789, '2025-01-01', 'HDBD', '2026-12-31', 'Đang bảo đảm', '', 'cu@x', '2025-01-01', '', '']]);
  sh('BaoHiemTaiSan', ['MaBH', 'MaTS', 'SoHDBaoHiem', 'NgayKyHD', 'CongTyBaoHiem', 'TrangThai', 'GhiChu', 'NguoiGhi', 'ThoiDiemGhi', 'HuyLuc', 'LyDoHuy'], [['BH-0001', 'TS-0001', 'CU1', '2025-01-01', 'Bảo Việt', 'Hiệu lực', '', 'cu@x', '2025-01-01', '', '']]);
  sh('BaoHiemTaiSanChiTiet', ['MaBH', 'STT', 'MaTaiSan', 'TenTaiSan', 'GiaTriBH', 'PhiBH', 'TienBH', 'TuNgay', 'DenNgay'], [['BH-0001', 1, '', 'Nhà cũ', 1000, 10, 500, '2026-01-01', '2026-12-31'], ['BH-0001', 2, '', 'Kho cũ', 2000, 20, 700, '2026-01-01', '2026-12-31']]);
  const chup = () => J(['TaiSanBaoDam', 'BaoHiemTaiSan', 'BaoHiemTaiSanChiTiet'].map(t => ctx.docSheetBaoDam_(t)));
  const truoc = chup();
  ctx.nangCapCauTrucBaoDam_(); const sau1 = chup(); ctx.nangCapCauTrucBaoDam_(); const sau2 = chup();
  assert.deepEqual(sau2, sau1, 'chạy lần hai không đổi gì');
  ['TaiSanBaoDam', 'BaoHiemTaiSan', 'BaoHiemTaiSanChiTiet'].forEach((t, i) => { const dau = Object.keys(truoc[i][0]); dau.forEach(c => assert.deepEqual(sau2[i].map(r => r[c]), truoc[i].map(r => r[c]), t + '.' + c + ' không đổi')); });
  assert.deepEqual([sau2[0][0].GiaTriVND, sau2[2].map(c => c.GiaTriBH + '/' + c.PhiBH + '/' + c.TienBH).join()], [123456789, '1000/10/500,2000/20/700'], 'giá trị tài chính nguyên vẹn');
  const h = bhCua('TS-0001'); assert.deepEqual([h.length, h[0].chiTiet.map(c => c.tenTaiSan), h[0].tong.tienBH], [1, ['Nhà cũ', 'Kho cũ'], 1200], 'dữ liệu cũ (TheHe trống = thế hệ 0) vẫn hiển thị');
  assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, false, 'SoDong trống = dữ liệu cũ, coi là đủ');
  const s = luuBH('TS-0001', [CT('Chỉ còn một', '2026-01-01', H)], { maBH: 'BH-0001', expectedRevision: h[0].revision, soHDBaoHiem: 'CU1' });
  assert.deepEqual([bhCua('TS-0001')[0].chiTiet.map(c => c.tenTaiSan), s.revision], [['Chỉ còn một'], 1], 'sửa bản cũ: thế hệ mới, dọn bản cũ'); assert.equal(ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').length, 1);
});
Q.ket('nhất quán quy trình tài sản/bảo hiểm/dư nợ');
