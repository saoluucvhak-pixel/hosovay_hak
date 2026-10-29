// ĐỒNG BỘ DỮ LIỆU BẢO HIỂM GIỮA CÁC MÀN: cùng một bộ dữ liệu thì Tổng quan, bảng tài sản (Hợp đồng / Quản lý vay), danh mục Tài sản & Thế chấp, nhắc nợ và bảng điều hành phải nói cùng một tình trạng. Giả lập Apps Script/Sheets — chưa chạy trên Google thật.
const assert = require('assert'); const Q = require('./_qlv_chung')('dong_bo_bh'), { ctx } = Q;
const c = Q.cty.maCty, h1 = Q.hopDong({ soHopDong: 'HD-DB1' }).maHD, h2 = Q.hopDong({ soHopDong: 'HD-DB2' }).maHD, J = (x) => JSON.parse(JSON.stringify(x)); let k = 0; const key = (p) => p + '_' + String(++k).padStart(4, '0');
const ts = (ten) => ctx.luuDanhMucTaiSan({ maCty: c, ten, loai: 'DONG_SAN', loaiChuSoHuu: 'Công ty', chuSoHuu: 'HAK', diaDiem: 'Kho', nguyenGia: 1000000, khauHao: 0, khoaYeuCau: key('dbts') });
const dk = (hd, ds, ma) => ctx.luuDangKyTheChap({ maHD: hd, khoaYeuCau: key('dbdk'), soDangKy: 'DK/' + k, soHDBaoDam: 'TC/' + k, ngayDangKy: Q.ngay(0), ngayDinhGia: Q.ngay(0), donViDinhGia: 'BIDV', soChungThu: 'CT/' + k, cheDo: 'NHOM', giaTri: 900000, chiTiet: ds.map((m) => ({ maTaiSan: m })) });
const bh = (m, tu, den) => ctx.luuBaoHiemDanhMuc({ maCty: c, khoaYeuCau: key('dbbh'), soHopDong: 'BH/' + k, congTyBH: 'BIC', ngayKy: Q.ngay(-30), chiTiet: [{ maTaiSan: m, giaTriTaiSanBH: 800000, soTienBH: 700000, phiBH: 1000, tuNgay: tu, denNgay: den }] });
let A, B, C, D, E;
Q.dat('Dữ liệu mẫu: 5 tài sản — đang BH, sắp hết, hết hạn, chưa BH, chưa thế chấp; 2 đăng ký ở 2 hợp đồng', () => {
  A = ts('Tài sản A'); B = ts('Tài sản B'); C = ts('Tài sản C'); D = ts('Tài sản D'); E = ts('Tài sản E (không thế chấp)');
  dk(h1, [A.ma, B.ma]); dk(h2, [C.ma, D.ma]);
  bh(A.ma, Q.ngay(-10), Q.ngay(200)); bh(B.ma, Q.ngay(-10), Q.ngay(9)); bh(C.ma, Q.ngay(-300), Q.ngay(-3)); bh(E.ma, Q.ngay(-10), Q.ngay(2));
});
const tinhTrangTS = () => { const m = {}; J(ctx.layTaiSanDanhMuc(c)).TS.forEach((a) => { m[a.ma] = a.baoHiem ? a.baoHiem.tinhTrang : 'CHUA_BAO_HIEM'; }); return m; };
Q.dat('Tổng quan = danh mục Tài sản & Thế chấp: cùng tình trạng cho từng tài sản đang thế chấp', () => {
  const tong = J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay.baoHiem, ttTS = tinhTrangTS(), canh = {}; tong.canChuY.forEach((r) => { canh[r.maTS] = r.muc; });
  assert.equal(tong.soTaiSanCan, 4, 'E không thế chấp nên không tính'); assert.equal(tong.dem.DANG_BAO_HIEM, 1); assert.equal(tong.dem.SAP_HET, 1); assert.equal(tong.dem.QUA_HAN, 1); assert.equal(tong.dem.CHUA_BAO_HIEM, 1);
  assert.equal(ttTS[A.ma], 'DANG_BAO_HIEM'); assert.equal(canh[A.ma], undefined);
  [[B, 'SAP_HET'], [C, 'QUA_HAN'], [D, 'CHUA_BAO_HIEM']].forEach(([a, tt]) => { assert.equal(canh[a.ma], tt, 'Tổng quan ' + a.ma); assert.equal(ttTS[a.ma], tt, 'Danh mục ' + a.ma); });
  assert.equal(canh[E.ma], undefined, 'tài sản chưa thế chấp không vào danh sách cần xử lý');
});
Q.dat('Bảng đăng ký thế chấp (Hợp đồng / Quản lý vay) nói cùng tình trạng xấu nhất của từng đăng ký', () => {
  const r1 = J(ctx.layTaiSanBaoDam(h1)).rows, r2 = J(ctx.layTaiSanBaoDam(h2)).rows;
  assert.equal(r1.length, 1); assert.equal(r1[0].canhBaoBaoHiem, 'SAP_HET'); assert.ok(r1[0].hangMucBaoHiem.includes('Tài sản B') || r1[0].hangMucBaoHiem.includes(B.ma), r1[0].hangMucBaoHiem);
  assert.equal(r2.length, 1); assert.equal(r2[0].canhBaoBaoHiem, 'CHUA_BAO_HIEM', 'đăng ký có tài sản chưa BH + tài sản hết hạn: chưa BH nặng nhất');
  const tq = J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay; assert.equal(tq.baoHiemCanChuY, 3);
});
Q.dat('Nhắc nợ và Bảng điều hành liệt kê đúng các tài sản đó (cùng số lượng, cùng mức)', () => {
  const nhom = J(ctx.dungBanTinNhacNo_()).nhom.find((g) => /^BẢO HIỂM TÀI SẢN THẾ CHẤP \(3\)/.test(g.ten)); assert.ok(nhom, 'nhóm bảo hiểm trong thư nhắc');
  ['Tài sản B', 'Tài sản C', 'Tài sản D'].forEach((t) => assert.ok(nhom.dong.some((x) => x.includes(t)), t));
  assert.ok(!nhom.dong.some((x) => x.includes('Tài sản A') || x.includes('Tài sản E')));
  const viec = J(ctx.layBangDieuHanh()).viecCanLam.filter((v) => v.loai === 'BAO_HIEM'); assert.equal(viec.length, 3);
  assert.equal(viec.filter((v) => v.muc === 'cao').length, 2, 'hết hạn + chưa BH = cao; sắp hết = vừa');
});
Q.dat('Mua bảo hiểm cho tài sản D rồi hủy hợp đồng của B: mọi màn cùng đổi, không màn nào giữ số cũ', () => {
  bh(D.ma, Q.ngay(-1), Q.ngay(365)); const bB = J(ctx.layTaiSanDanhMuc(c)).BH.find((b) => b.chiTiet[0].maTaiSan === B.ma);
  ctx.doiTrangThaiTaiSanDanhMuc({ loai: 'BH', ma: bB.ma, expectedRevision: bB.revision, khoaYeuCau: key('dbhuy'), lyDo: 'Hủy theo chứng từ', ngay: Q.ngay(0) });
  const tong = J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay.baoHiem, ttTS = tinhTrangTS();
  assert.equal(tong.dem.CHUA_BAO_HIEM, 1, 'B giờ chưa BH'); assert.equal(ttTS[B.ma], 'CHUA_BAO_HIEM'); assert.equal(ttTS[D.ma], 'DANG_BAO_HIEM');
  assert.equal(J(ctx.layTaiSanBaoDam(h1)).rows[0].canhBaoBaoHiem, 'CHUA_BAO_HIEM'); assert.equal(J(ctx.layTaiSanBaoDam(h2)).rows[0].canhBaoBaoHiem, 'QUA_HAN');
  assert.equal(tong.tongCanChuY, 2);
});
Q.ket('đồng bộ bảo hiểm giữa các màn');
