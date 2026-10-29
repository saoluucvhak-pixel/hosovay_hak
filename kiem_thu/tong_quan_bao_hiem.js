// TỔNG QUAN BẢO HIỂM theo DANH MỤC MỚI: tài sản đang thế chấp, tình trạng từng tài sản, phí/số tiền đang hiệu lực, phạm vi công ty. Giả lập Apps Script/Sheets — chưa chạy trên Google thật.
const assert = require('assert'); const Q = require('./_qlv_chung')('tong_quan_bh'), { ctx, mt } = Q;
const c = Q.cty.maCty, h = Q.hopDong().maHD, J = (x) => JSON.parse(JSON.stringify(x)); let a, b, dk, k = 0;
const tq = () => J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay, bh = () => tq().baoHiem;
const taiSan = (ten) => ctx.luuDanhMucTaiSan({ maCty: c, ten, loai: 'DONG_SAN', loaiChuSoHuu: 'Công ty', chuSoHuu: 'HAK', diaDiem: 'Kho', nguyenGia: 1000000, khauHao: 200000, khoaYeuCau: 'tq_ts_' + String(++k).padStart(4, '0') });
const mua = (ts, tu, den, o) => ctx.luuBaoHiemDanhMuc(Object.assign({ maCty: c, khoaYeuCau: 'tq_bh_' + String(++k).padStart(4, '0'), soHopDong: 'BH/' + k, congTyBH: 'BIC', ngayKy: Q.ngay(-30), chiTiet: [{ maTaiSan: ts, giaTriTaiSanBH: 800000, soTienBH: 700000, phiBH: 1000, tuNgay: tu, denNgay: den }] }, o || {}));
Q.dat('Chưa có đăng ký thế chấp: thẻ bảo hiểm không có tài sản cần bảo hiểm', () => {
  a = taiSan('Máy A'); b = taiSan('Máy B'); const x = bh(); assert.equal(x.soTaiSanCan, 0); assert.equal(x.tongCanChuY, 0); assert.equal(x.soHopDong, 0);
});
Q.dat('Thế chấp 2 tài sản, chỉ mua bảo hiểm cho 1: tài sản kia CHƯA BẢO HIỂM, đứng đầu danh sách cần xử lý', () => {
  dk = ctx.luuDangKyTheChap({ maHD: h, khoaYeuCau: 'tq_dk_001', soDangKy: 'DK/TQ', soHDBaoDam: 'TC/TQ', ngayDangKy: Q.ngay(0), ngayDinhGia: Q.ngay(0), donViDinhGia: 'BIDV', soChungThu: 'CT/1', cheDo: 'NHOM', giaTri: 1500000, chiTiet: [{ maTaiSan: a.ma }, { maTaiSan: b.ma }] });
  const bhA = mua(a.ma, Q.ngay(-10), Q.ngay(300)); const x = bh();
  assert.equal(x.soTaiSanCan, 2); assert.equal(x.dem.DANG_BAO_HIEM, 1); assert.equal(x.dem.CHUA_BAO_HIEM, 1); assert.equal(x.soHopDong, 1);
  assert.equal(x.tongCanChuY, 1); assert.equal(x.canChuY[0].maTS, b.ma); assert.equal(x.canChuY[0].muc, 'CHUA_BAO_HIEM'); assert.equal(x.canChuY[0].maHD, h); assert.equal(x.canChuY[0].soDangKy, 'DK/TQ');
  assert.equal(x.tongPhi, 1000); assert.equal(x.tongTienBH, 700000); assert.equal(x.tongGiaTriBH, 800000); assert.equal(x.tyLeBaoHiem, 87.5);
  assert.equal(tq().baoHiemCanChuY, 1, 'chỉ số trên Tổng quan = số tài sản cần xử lý');
});
Q.dat('Sắp hết trong 15 ngày → SAP_HET kèm số ngày; 16 ngày thì chưa cảnh báo', () => {
  const p = mua(b.ma, Q.ngay(-10), Q.ngay(10)); let x = bh();
  assert.equal(x.dem.SAP_HET, 1); assert.equal(x.dem.CHUA_BAO_HIEM, 0); assert.equal(x.canChuY[0].muc, 'SAP_HET'); assert.equal(x.canChuY[0].soNgay, 10);
  assert.equal(x.tongPhi, 2000, 'phí cộng cả hai hợp đồng đang hiệu lực hôm nay');
  ctx.luuBaoHiemDanhMuc({ maCty: c, khoaYeuCau: 'tq_bh_gh', ma: p.ma, expectedRevision: 1, soHopDong: 'BH/' + k, congTyBH: 'BIC', ngayKy: Q.ngay(-30), chiTiet: [{ maTaiSan: b.ma, giaTriTaiSanBH: 800000, soTienBH: 700000, phiBH: 1000, tuNgay: Q.ngay(-10), denNgay: Q.ngay(16) }] });
  x = bh(); assert.equal(x.dem.SAP_HET, 0); assert.equal(x.tongCanChuY, 0); assert.equal(x.dem.DANG_BAO_HIEM, 2);
});
Q.dat('Hợp đồng bảo hiểm HẾT HẠN và hợp đồng bị HỦY: không tính phí, tài sản báo QUA_HAN / CHUA_BAO_HIEM', () => {
  const c0 = ctx.luuDanhMucTaiSan({ maCty: c, ten: 'Máy C', loai: 'DONG_SAN', loaiChuSoHuu: 'Công ty', chuSoHuu: 'HAK', diaDiem: 'Kho', nguyenGia: 1000000, khauHao: 0, khoaYeuCau: 'tq_ts_ccc' });
  ctx.luuDangKyTheChap({ maHD: h, khoaYeuCau: 'tq_dk_002', soDangKy: 'DK/TQ2', soHDBaoDam: 'TC/TQ2', ngayDangKy: Q.ngay(0), ngayDinhGia: Q.ngay(0), donViDinhGia: 'BIDV', soChungThu: 'CT/2', cheDo: 'NHOM', giaTri: 900000, chiTiet: [{ maTaiSan: c0.ma }] });
  const het = mua(c0.ma, Q.ngay(-400), Q.ngay(-5)); let x = bh(); const dong = x.canChuY.find(r => r.maTS === c0.ma);
  assert.equal(dong.muc, 'QUA_HAN'); assert.equal(dong.han, Q.ngay(-5)); assert.equal(x.dem.QUA_HAN, 1); assert.equal(x.tongPhi, 2000, 'hợp đồng hết hạn không tính phí');
  ctx.doiTrangThaiTaiSanDanhMuc({ loai: 'BH', ma: het.ma, expectedRevision: 1, khoaYeuCau: 'tq_huy_001', lyDo: 'Hủy theo chứng từ', ngay: Q.ngay(0) });
  x = bh(); assert.equal(x.canChuY.find(r => r.maTS === c0.ma).muc, 'CHUA_BAO_HIEM'); assert.equal(x.soHopDong, 2);
});
Q.dat('Giải chấp đăng ký: tài sản không còn "cần bảo hiểm"', () => {
  const truoc = bh().soTaiSanCan; ctx.doiTrangThaiTaiSanDanhMuc({ loai: 'DK', ma: dk.ma, expectedRevision: 1, khoaYeuCau: 'tq_gc_001', lyDo: 'Biên bản giải chấp', ngay: Q.ngay(0) });
  assert.equal(bh().soTaiSanCan, truoc - 2);
});
Q.dat('Phạm vi công ty: người dùng ngoài phạm vi không thấy dữ liệu bảo hiểm của công ty khác', () => {
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CONG_TY_KHAC'];
  try { const x = ctx.ts2TongQuanBaoHiem_(); assert.equal(x.soHopDong, 0); assert.equal(x.soTaiSanCan, 0); assert.equal(x.tongPhi, 0); assert.equal(x.canChuY.length, 0); } finally { ctx.phamViCongTyNguoiDung_ = g; }
});
Q.dat('Lỗi dữ liệu bảo hiểm chỉ làm mất thẻ bảo hiểm, không làm hỏng Tổng quan', () => {
  const g = ctx.ts2TongQuanBaoHiem_; ctx.ts2TongQuanBaoHiem_ = () => { throw new Error('Lỗi giả lập'); };
  try { const t = J(ctx.layTongQuanHoSo({ boQuaCache: true })); assert.ok(t.quanLyVay, 'vẫn có hạn mức'); assert.equal(t.quanLyVay.baoHiem, null); assert.equal(t.quanLyVay.baoHiemCanChuY, 0); } finally { ctx.ts2TongQuanBaoHiem_ = g; }
});
Q.ket('Tổng quan bảo hiểm (danh mục mới)');
