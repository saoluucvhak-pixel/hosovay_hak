// GỢI Ý/CẢNH BÁO TÊN HẠNG MỤC khi gia hạn bảo hiểm: tên gần giống hạng mục đã có nhưng KHÁC khoá → báo (hạng mục cũ sẽ báo hết/hở); tên đúng hoặc không liên quan → không báo.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('goi_y_hm'), { ctx, mt, G, hopDong, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const hd = hopDong({ soHopDong: 'HD-GY' });
let _k = 0; const taoTS = (moTa) => J(ctx.luuTaiSanBaoDam({ khoaYeuCau: 'GY' + (++_k), maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1e9 })).maTS;
const CT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 500, tuNgay: tu, denNgay: den }, o || {});
const luu = (ts, chiTiet, o) => J(ctx.luuBaoHiemTaiSan(Object.assign({ maTS: ts, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {})));
dat('G1. Gia hạn gõ lệch tên (“Kho A” → “Kho A1” / “kho  a.” / “Khô A”) → cảnh báo gần giống; tên đúng hoặc không liên quan → không cảnh báo', () => {
  const ts = taoTS('Cụm kho'), r1 = luu(ts, [CT('Kho A', ngay(-300), ngay(60)), CT('Máy phát điện', ngay(-300), ngay(60))]); assert.deepEqual(r1.canhBao, []);
  const dung = luu(ts, [CT('Kho A', ngay(61), ngay(425))], { soHDBaoHiem: 'S2' }); assert.deepEqual(dung.canhBao.filter(c => /gần giống/.test(c)), [], 'đúng tên: không cảnh báo');
  const lech = luu(ts, [CT('Kho A1', ngay(61), ngay(425)), CT('Thiết bị văn phòng', ngay(61), ngay(425))], { soHDBaoHiem: 'S3' });
  const gy = lech.canhBao.filter(c => /gần giống/.test(c)); assert.equal(gy.length, 1, lech.canhBao.join('|')); assert.match(gy[0], /“Kho A1”.*“Kho A”.*KHÁC/); assert.doesNotMatch(gy[0], /Thiết bị văn phòng/);
  const khac = ['kho  a.', 'Khô A', 'KHO-A'].map((t, i) => luu(ts, [CT(t, ngay(61), ngay(425))], { soHDBaoHiem: 'T' + i }).canhBao.filter(c => /gần giống/.test(c)));
  assert.deepEqual(khac.map(a => a.length), [0, 0, 0], 'khác hoa/thường, dấu, dấu câu, khoảng trắng = CÙNG khoá → không cần cảnh báo (và đánh giá hạng mục sẽ nối liền)');
});
dat('G2. Cảnh báo chỉ để người dùng chú ý — không chặn lưu; hạng mục có mã riêng khớp mã thì không cảnh báo; cảnh báo ghi rõ hợp đồng nguồn', () => {
  const ts = taoTS('Cụm 2'), a = luu(ts, [CT('Nhà xưởng', ngay(-200), ngay(100), { maTaiSan: 'NX-1' })]);
  const b = luu(ts, [CT('Nha xuong 2', ngay(101), ngay(465), { maTaiSan: 'NX-1' })], { soHDBaoHiem: 'S9' }); assert.deepEqual(b.canhBao.filter(c => /gần giống/.test(c)), [], 'cùng mã NX-1 = cùng hạng mục');
  const c = luu(ts, [CT('Nhà xưởng B', ngay(101), ngay(465))], { soHDBaoHiem: 'S10' }); assert.ok(c.maBH, 'vẫn lưu'); const w = c.canhBao.find(x => /gần giống/.test(x)); assert.ok(w); assert.match(w, new RegExp(a.maBH));
});
Q.ket('gợi ý tên hạng mục bảo hiểm');
