// Kiểm thử HẠN MỨC tín dụng, TÀI SẢN BẢO ĐẢM, ĐIỀU KIỆN RÀNG BUỘC, DỰ BÁO dòng tiền, TUỔI NỢ quá hạn, BẢNG ĐIỀU HÀNH (giả lập Apps Script/Sheets).
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('han_muc'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const quanTri = (f) => { const g = ctx.laQuanTri_; ctx.laQuanTri_ = () => true; try { return f(); } finally { ctx.laQuanTri_ = g; } };

// ========== HẠN MỨC ==========
const hd = hopDong({ soHopDong: 'HD-HM', hanMucVay: 10000000 });
const hd0 = hopDong({ soHopDong: 'HD-KHONG-HM', hanMucVay: 0 });
const goc = (ma, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd.maHD, NgayGiaiNgan: Q.ngay(-20), NgayDenHan: Q.ngay(70) }, o));
goc('A', { SoTienNhanNoLanNay: 3000000 });
goc('B', { LoaiTien: 'USD', TyGiaBan: 25000, SoTienNhanNoLanNay: 100 });
goc('C', { TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 2000000 });
ctx.ghiNhanTraNo('A', { loaiTra: 'GOC', ngayTra: Q.ngay(-5), soTien: 1000000, soThamChieu: 'UNC-A1', chungTu: 'UNC A1' }, Q.rev('A'));
const dong = (r, ma) => r.rows.find(x => x.maHD === ma);
dat('Hạn mức: đã dùng = dư nợ VND (3tr − 1tr trả) + USD quy đổi (100 × 25.000 = 2,5tr) = 4,5tr; còn lại 5,5tr; đang chờ 2tr; 45% → ok', () => {
  const r = ctx.layHanMucTinDung(), d = dong(r, hd.maHD);
  assert.equal(d.hanMuc, 10000000); assert.equal(d.daDung, 4500000); assert.equal(d.conLai, 5500000); assert.equal(d.dangCho, 2000000);
  assert.equal(d.conLaiSauCho, 3500000); assert.equal(d.tyLe, 45); assert.equal(d.muc, 'ok'); assert.equal(d.soKhoan, 2);
});
dat('Hợp đồng không khai báo hạn mức và không có khoản vay → không liệt kê; tổng chỉ cộng hợp đồng có hạn mức', () => {
  const r = ctx.layHanMucTinDung(); assert.equal(dong(r, hd0.maHD), undefined);
  assert.equal(r.tongHanMuc, 10000000); assert.equal(r.tongDaDung, 4500000);
});
dat('Ngưỡng: 80% → luu_y; 95% → cao; vượt → vuot (và tự khôi phục khi tất toán)', () => {
  goc('D', { SoTienNhanNoLanNay: 4000000 }); // 8,5tr = 85%
  assert.equal(dong(ctx.layHanMucTinDung(), hd.maHD).muc, 'luu_y');
  goc('E', { SoTienNhanNoLanNay: 1000000 }); // 9,5tr = 95%
  assert.equal(dong(ctx.layHanMucTinDung(), hd.maHD).muc, 'cao');
  goc('F', { SoTienNhanNoLanNay: 1000000 }); // 10,5tr
  const r = ctx.layHanMucTinDung(); assert.equal(dong(r, hd.maHD).muc, 'vuot'); assert.equal(r.soVuot, 1);
  assert.equal(r.rows[0].maHD, hd.maHD); // sắp xếp: vượt lên đầu
});
dat('Kiểm tra hạn mức hồ sơ: C (2tr) khi đã dùng 10,5tr → vượt, chặn; ghi rõ số liệu', () => {
  const k = ctx.kiemTraHanMucHoSo('C');
  assert.equal(k.apDung, true); assert.equal(k.vuot, true); assert.equal(k.chan, true); assert.equal(k.daDung, 10500000);
  assert.match(k.thongBao, /vượt hạn mức còn lại 0 VND/);
});
dat('Xác nhận giải ngân bị CHẶN khi vượt hạn mức; tắt cấu hình thì không chặn', () => {
  ctx.kiemTraDuDieuKienGiaiNgan_ = () => ({ loi: [] }); // cô lập kiểm tra hạn mức khỏi điều kiện bộ chứng từ
  const tt = { ngayThucTe: Q.homNay(), soThamChieuNH: 'BIDV-GN-001', soTienThucTe: 2000000, taiLieuXacNhan: 'Giấy báo nợ 001' };
  assert.throws(() => ctx.xacNhanGiaiNganThucTe('C', tt, Q.rev('C')), /vượt hạn mức còn lại 0 VND/);
  quanTri(() => ctx.luuThietLapQuanLyVay({ CHAN_VUOT_HAN_MUC: 0 }));
  const kq = ctx.xacNhanGiaiNganThucTe('C', tt, Q.rev('C'));
  assert.equal(kq.trangThai, 'Đã giải ngân');
  quanTri(() => ctx.luuThietLapQuanLyVay({ CHAN_VUOT_HAN_MUC: 1 }));
});
dat('Hợp đồng không có hạn mức → không áp dụng, không chặn', () => {
  themHoSo({ MaHoSo: 'G', MaHD: hd0.maHD, TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 999999999, NgayGiaiNgan: Q.ngay(-1), NgayDenHan: Q.ngay(90) });
  const k = ctx.kiemTraHanMucHoSo('G'); assert.equal(k.apDung, false); assert.equal(k.chan, false);
});
dat('Cấu hình ngưỡng: lưu 70/90, ngưỡng thấp ≥ cao bị từ chối', () => {
  quanTri(() => { assert.throws(() => ctx.luuThietLapQuanLyVay({ NGUONG_CB_HAN_MUC_1: 96 }), /nhỏ hơn ngưỡng cảnh báo cao/); ctx.luuThietLapQuanLyVay({ NGUONG_CB_HAN_MUC_1: 70, NGUONG_CB_HAN_MUC_2: 90 }); });
  assert.equal(ctx.layThietLapQuanLyVay().NGUONG_CB_HAN_MUC_1, '70');
  quanTri(() => ctx.luuThietLapQuanLyVay({ NGUONG_CB_HAN_MUC_1: 80, NGUONG_CB_HAN_MUC_2: 95 }));
});

// ========== TÀI SẢN BẢO ĐẢM ==========
let maTS;
dat('Tài sản bảo đảm: thêm, kiểm tra đầu vào, tổng giá trị và tỷ lệ dư nợ/giá trị', () => {
  assert.throws(() => ctx.luuTaiSanBaoDam({ khoaYeuCau: 'K' + Math.random(), maHD: hd.maHD, loai: 'XXX', moTa: 'Nhà xưởng', giaTri: 1000 }), /Loại tài sản/);
  assert.throws(() => ctx.luuTaiSanBaoDam({ khoaYeuCau: 'K' + Math.random(), maHD: hd.maHD, loai: 'BDS', moTa: 'Nhà xưởng', giaTri: 0 }), /lớn hơn 0/);
  assert.throws(() => ctx.luuTaiSanBaoDam({ khoaYeuCau: 'K' + Math.random(), maHD: 'KHONG-CO', loai: 'BDS', moTa: 'Nhà xưởng', giaTri: 1000 }), /Không tìm thấy hợp đồng/);
  assert.throws(() => ctx.luuTaiSanBaoDam({ khoaYeuCau: 'K' + Math.random(), maHD: hd.maHD, loai: 'BDS', moTa: 'Nhà xưởng', giaTri: 1000, ngayDinhGia: '2999-01-01' }), /tương lai|không được/i);
  maTS = ctx.luuTaiSanBaoDam({ khoaYeuCau: 'K' + Math.random(), maHD: hd.maHD, loai: 'BDS', moTa: 'Nhà xưởng KCN', giaTri: 30000000, ngayDinhGia: Q.ngay(-30), ngayHetHanBaoHiem: Q.ngay(10), soHDBaoDam: 'HĐTC 01' }).maTS;
  ctx.luuTaiSanBaoDam({ khoaYeuCau: 'K' + Math.random(), maHD: hd.maHD, loai: 'DONG_SAN', moTa: 'Xe tải', giaTri: 20000000, ngayHetHanBaoHiem: Q.ngay(-3) });
  const r = ctx.layTaiSanBaoDam(hd.maHD);
  assert.equal(r.rows.length, 2); assert.equal(r.tongGiaTriDangBaoDam, 50000000);
  assert.deepEqual(Array.from(r.rows.map(x => x.canhBaoBaoHiem)), ['SAP_HET', 'QUA_HAN']);
  const hm = dong(ctx.layHanMucTinDung(), hd.maHD);
  assert.equal(hm.giaTriBaoDam, 50000000); assert.equal(hm.tyLeVayTrenTaiSan, Math.round(10500000 + 2000000 > 0 ? hm.daDung / 50000000 * 10000 : 0) / 100);
});
dat('Giải chấp: cần lý do; tài sản đã giải chấp không sửa được và không tính vào tổng', () => {
  const revTS = () => ctx.layTaiSanBaoDam(hd.maHD).rows.find(r => r.maTS === maTS).revision;
  assert.throws(() => ctx.giaiChapTaiSan(maTS, 'Đã tất toán HĐ'), /Thiếu phiên bản/);
  assert.throws(() => ctx.giaiChapTaiSan(maTS, 'x', revTS()), /lý do/);
  ctx.giaiChapTaiSan(maTS, 'Đã tất toán HĐ, giải chấp theo biên bản 01', revTS());
  assert.throws(() => ctx.giaiChapTaiSan(maTS, 'lại lần nữa', 99), /đã giải chấp/);
  assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: maTS, maHD: hd.maHD, loai: 'BDS', moTa: 'Sửa', giaTri: 1000 }), /đã giải chấp/);
  assert.equal(ctx.layTaiSanBaoDam(hd.maHD).tongGiaTriDangBaoDam, 20000000);
});

// ========== ĐIỀU KIỆN RÀNG BUỘC ==========
dat('Đánh giá chỉ tiêu (≤ / ≥, biên an toàn 10%)', () => {
  const d = ctx.danhGiaRangBuoc_;
  assert.equal(d('<=', 80, 70), 'DAT'); assert.equal(d('<=', 80, 73), 'SAP_VI_PHAM'); assert.equal(d('<=', 80, 80), 'SAP_VI_PHAM'); assert.equal(d('<=', 80, 80.01), 'VI_PHAM');
  assert.equal(d('>=', 120, 150), 'DAT'); assert.equal(d('>=', 120, 130), 'SAP_VI_PHAM'); assert.equal(d('>=', 120, 119.9), 'VI_PHAM'); assert.equal(d('>=', 1.2, null), 'CHUA_CO_DU_LIEU');
});
let rbTay, rbHM;
dat('Khai báo chỉ tiêu: chỉ quản trị; nhập tay (doanh thu về BIDV ≥ 120%) + tự tính (dư nợ/hạn mức ≤ 80%)', () => {
  const goc2 = ctx.laQuanTri_; ctx.laQuanTri_ = () => false;
  assert.throws(() => ctx.luuDieuKienRangBuoc({ maHD: hd.maHD, tenChiTieu: 'Doanh thu', loai: 'THU_CONG', toanTu: '>=', nguong: 120 }), /quản trị|quyền/i);
  ctx.laQuanTri_ = goc2;
  quanTri(() => {
    assert.throws(() => ctx.luuDieuKienRangBuoc({ maHD: hd.maHD, tenChiTieu: 'Doanh thu', loai: 'THU_CONG', toanTu: '=', nguong: 120 }), /Toán tử/);
    assert.throws(() => ctx.luuDieuKienRangBuoc({ maHD: hd.maHD, tenChiTieu: 'Doanh thu', loai: 'THU_CONG', toanTu: '>=', nguong: 'abc' }), /phải là số/);
    rbTay = ctx.luuDieuKienRangBuoc({ maHD: hd.maHD, tenChiTieu: 'Doanh thu về BIDV / doanh số giải ngân', loai: 'THU_CONG', toanTu: '>=', nguong: '120', donVi: '%', kyKiemTraNgay: 90 }).maRB;
    rbHM = ctx.luuDieuKienRangBuoc({ maHD: hd.maHD, tenChiTieu: 'Dư nợ / hạn mức', loai: 'TY_LE_HAN_MUC', toanTu: '<=', nguong: '80' }).maRB;
  });
  const r = ctx.layDieuKienRangBuoc(hd.maHD);
  assert.equal(r.rows.length, 2);
  const tay = r.rows.find(x => x.maRB === rbTay), hm = r.rows.find(x => x.maRB === rbHM);
  assert.equal(tay.trangThai, 'CHUA_CO_DU_LIEU'); assert.equal(hm.giaTri, 125); assert.equal(hm.trangThai, 'VI_PHAM'); assert.equal(hm.tuDong, true);
});
dat('Cập nhật giá trị nhập tay: 118,5 < 120 → vi phạm; 125 → sắp vi phạm; chỉ tiêu tự tính không nhập tay; quá kỳ kiểm tra → quá hạn cập nhật', () => {
  assert.throws(() => ctx.capNhatGiaTriRangBuoc(rbHM, 50, Q.homNay()), /tự tính/);
  ctx.capNhatGiaTriRangBuoc(rbTay, '118,5', Q.homNay());
  assert.equal(ctx.layDieuKienRangBuoc(hd.maHD).rows.find(x => x.maRB === rbTay).trangThai, 'VI_PHAM');
  ctx.capNhatGiaTriRangBuoc(rbTay, 125, Q.homNay());
  assert.equal(ctx.layDieuKienRangBuoc(hd.maHD).rows.find(x => x.maRB === rbTay).trangThai, 'SAP_VI_PHAM');
  ctx.capNhatGiaTriRangBuoc(rbTay, 150, Q.ngay(-100));
  assert.equal(ctx.layDieuKienRangBuoc(hd.maHD).rows.find(x => x.maRB === rbTay).trangThai, 'QUA_HAN_CAP_NHAT');
});
dat('Ngừng áp dụng chỉ tiêu → biến mất khỏi danh sách; sắp xếp: vi phạm lên đầu', () => {
  assert.equal(ctx.layDieuKienRangBuoc(hd.maHD).rows[0].trangThai, 'VI_PHAM');
  quanTri(() => ctx.xoaDieuKienRangBuoc(rbHM));
  assert.equal(ctx.layDieuKienRangBuoc(hd.maHD).rows.length, 1);
});

// ========== DỰ BÁO / TUỔI NỢ (thuần) ==========
const lichGia = (loai, gocRows, laiRows) => ({ k: { maHoSo: 'X', loai: loai }, lich: { gocRows: gocRows, laiRows: laiRows } });
dat('Dự báo thuần: quá hạn / từng tháng / sau kỳ; VND và USD tách riêng; kỳ đã trả đủ (conNo 0) không tính', () => {
  const ds = [
    lichGia('VND', [{ ngayDen: '2026-05-31', conNo: 1000 }, { ngayDen: '2026-10-15', conNo: 500 }], [{ denNgay: '2026-06-15', conNo: 100 }, { denNgay: '2026-07-01', conNo: 0 }, { denNgay: '2026-06-20', conNo: 50 }]),
    lichGia('USD', [{ ngayDen: '2026-06-30', conNo: 200.5 }], [{ denNgay: '2026-06-30', conNo: 10.25 }, { denNgay: '2027-09-01', conNo: 7 }])
  ];
  const g = J(ctx.gomDongTienTheoThang_(ds, '2026-06-10', 3));   // 06, 07, 08
  assert.deepEqual(g.thang.map(x => x.thang), ['2026-06', '2026-07', '2026-08']);
  assert.deepEqual(g.quaHan.VND, { goc: 1000, lai: 0 }); assert.equal(g.quaHan.soKy, 1);
  assert.deepEqual(g.thang[0].VND, { goc: 0, lai: 150 }); assert.deepEqual(g.thang[0].USD, { goc: 200.5, lai: 10.25 });
  assert.deepEqual(g.thang[1].VND, { goc: 0, lai: 0 });
  assert.deepEqual(g.sau.VND, { goc: 500, lai: 0 }); assert.deepEqual(g.sau.USD, { goc: 0, lai: 7 });
});
dat('Dự báo thuần: bất biến — quá hạn + các tháng + sau kỳ = tổng mọi kỳ còn nợ', () => {
  const ds = [lichGia('VND', [{ ngayDen: '2025-01-01', conNo: 11 }, { ngayDen: '2026-06-10', conNo: 22 }, { ngayDen: '2030-01-01', conNo: 33 }], [{ denNgay: '2026-12-31', conNo: 44 }])];
  const g = J(ctx.gomDongTienTheoThang_(ds, '2026-06-10', 6)); let t = g.quaHan.VND.goc + g.quaHan.VND.lai + g.sau.VND.goc + g.sau.VND.lai;
  g.thang.forEach(m => { t += m.VND.goc + m.VND.lai; });
  assert.equal(t, 11 + 22 + 33 + 44);
});
dat('Tuổi nợ thuần: kỳ quá hạn cũ nhất quyết định bậc; không quá hạn → HIEN_HANH', () => {
  const l = { gocRows: [{ ngayDen: '2026-05-01', conNo: 100 }], laiRows: [{ denNgay: '2026-03-01', conNo: 5 }, { denNgay: '2026-04-01', conNo: 0 }] };
  const t = J(ctx.tuoiNoQuaHan_(l, '2026-06-10'));
  assert.equal(t.soNgay, 101); assert.equal(t.bac, 'B90P'); assert.deepEqual(t.soTienQuaHan, { goc: 100, lai: 5 });
  assert.equal(ctx.tuoiNoQuaHan_({ gocRows: [{ ngayDen: '2026-06-10', conNo: 9 }], laiRows: [] }, '2026-06-10').bac, 'HIEN_HANH');
  assert.equal(ctx.bacQuaHan_(1), 'B1_30'); assert.equal(ctx.bacQuaHan_(30), 'B1_30'); assert.equal(ctx.bacQuaHan_(31), 'B31_60'); assert.equal(ctx.bacQuaHan_(90), 'B61_90'); assert.equal(ctx.bacQuaHan_(91), 'B90P');
});
// ========== DỰ BÁO / TUỔI NỢ (tích hợp) ==========
const hd2 = hopDong({ soHopDong: 'HD-DB', hanMucVay: 0, laiSuatTrongHan: 12, kyHanTraLai: 'Hàng tháng', kyHanTraGoc: 'Cuối kỳ' });
themHoSo({ MaHoSo: 'Q1', MaHD: hd2.maHD, SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: Q.ngay(-100), NgayDenHan: Q.ngay(-35) });  // quá hạn 35 ngày
themHoSo({ MaHoSo: 'Q2', MaHD: hd2.maHD, SoTienNhanNoLanNay: 2000000, NgayGiaiNgan: Q.ngay(-30), NgayDenHan: Q.ngay(60) });   // chưa quá hạn
themHoSo({ MaHoSo: 'Q3', MaHD: hd2.maHD, LoaiTien: 'USD', TyGiaBan: 25000, SoTienNhanNoLanNay: 1000, NgayGiaiNgan: Q.ngay(-30), NgayDenHan: Q.ngay(45) });
dat('Tuổi nợ (tích hợp): Q1 quá hạn → có bậc; Q2/Q3 chưa quá hạn; tổng số khoản khớp', () => {
  const r = ctx.layPhanTichQuaHan();
  const q1 = r.rows.find(x => x.maHoSo === 'Q1'); assert.ok(q1 && q1.soNgayQuaHan >= 35); assert.ok(q1.laiPhatUocTinh >= 0);
  assert.ok(!r.rows.some(x => x.maHoSo === 'Q2' || x.maHoSo === 'Q3'));
  const tong = r.bac.reduce((a, b) => a + b.soKhoan, 0), dangVay = ctx.danhSachKhoanDangVay_().rows.length;
  assert.equal(tong, dangVay);
});
dat('Dự báo (tích hợp): bất biến tổng + USD tách riêng + quy đổi kịch bản ± biên độ', () => {
  ctx.ghiTyGiaThuCong({ ngay: Q.homNay(), tyGiaBan: 25000, ghiChu: 'thử' });
  const r = ctx.layDuBaoDongTien({ soThang: 6, bienDoTyGia: 10 });
  assert.equal(r.soThang, 6); assert.equal(r.thang.length, 6); assert.deepEqual(Array.from(r.kichBan), [-10, 0, 10]);
  const usd = r.tong.tongUSD, vnd = r.tong.tongVND;
  assert.ok(usd > 0 && vnd > 0);
  assert.equal(r.tong.quyDoiVND[1], vnd + Math.round(usd * 25000)); assert.equal(r.tong.quyDoiVND[0], vnd + Math.round(usd * 25000 * 0.9)); assert.equal(r.tong.quyDoiVND[2], vnd + Math.round(usd * 25000 * 1.1));
  assert.ok(r.quaHan.tongVND >= 1000000);  // gốc Q1 đã quá hạn
  assert.throws(() => ctx.layDuBaoDongTien({ soThang: 0 }), /từ 1 đến 24/); assert.throws(() => ctx.layDuBaoDongTien({ bienDoTyGia: 50 }), /0 đến 30/);
});
dat('Bảng điều hành: tổng hợp đủ các khối; việc cần làm có cảnh báo quá hạn/hạn mức/ràng buộc/bảo hiểm', () => {
  const b = ctx.layBangDieuHanh();
  assert.ok(b.hanMuc.tongHanMuc > 0); assert.ok(b.quaHan.tong >= 1); assert.ok(Array.isArray(b.viecCanLam) && b.viecCanLam.length >= 2);
  const loai = new Set(Array.from(b.viecCanLam.map(x => x.loai))); assert.ok(loai.has('QUA_HAN') && loai.has('HAN_MUC'));
  assert.equal(b.soTaiSanDangBaoDam, 1);
});
dat('Tổng quan: layTongQuanHoSo kèm quanLyVay (nhẹ) khớp với báo cáo hạn mức/ràng buộc; lỗi dữ liệu không làm hỏng Tổng quan', () => {
  const tq = ctx.layTongQuanHoSo({ boQuaCache: true }), hm = ctx.layHanMucTinDung(), rb = ctx.layDieuKienRangBuoc('');
  assert.ok(tq.quanLyVay, 'có quanLyVay');
  assert.equal(tq.quanLyVay.hanMuc.tongConLai, hm.tongConLai); assert.equal(tq.quanLyVay.hanMuc.tongDaDung, hm.tongDaDung); assert.equal(tq.quanLyVay.hanMuc.soVuot, hm.soVuot);
  assert.deepEqual(J(tq.quanLyVay.rangBuoc), J(rb.dem));
  const g = ctx.hanMucTinDung_; ctx.hanMucTinDung_ = () => { throw new Error('hỏng'); };
  try { const tq2 = ctx.layTongQuanHoSo({}); assert.equal(tq2.quanLyVay, null); assert.ok(tq2.tongHoSo > 0); } finally { ctx.hanMucTinDung_ = g; }
});
dat('Menu Ngân hàng tham chiếu: lưu/đọc đường link ở cài đặt, chỉ nhận http(s), để trống được', () => {
  assert.equal(ctx.layThietLapQuanLyVay().NGAN_HANG_THAM_CHIEU_URL, '');
  quanTri(() => ctx.luuThietLapQuanLyVay({ NGAN_HANG_THAM_CHIEU_URL: ' https://www.vietcombank.com.vn/vi-VN ' }));
  assert.equal(ctx.layThietLapQuanLyVay().NGAN_HANG_THAM_CHIEU_URL, 'https://www.vietcombank.com.vn/vi-VN');
  ['javascript:alert(1)', 'ftp://a.b', 'https://a b.vn', 'abc'].forEach(u => assert.throws(() => quanTri(() => ctx.luuThietLapQuanLyVay({ NGAN_HANG_THAM_CHIEU_URL: u })), /Ngân hàng tham chiếu/));
  quanTri(() => ctx.luuThietLapQuanLyVay({ NGAN_HANG_THAM_CHIEU_URL: '' }));
  assert.equal(ctx.layThietLapQuanLyVay().NGAN_HANG_THAM_CHIEU_URL, '');
  const fs = require('fs'), idx = fs.readFileSync(__dirname + '/../Index.html', 'utf8');
  assert.ok(/id="nav-nganhang-thamchieu"/.test(idx) && /id="cfg_nhtcUrl"/.test(idx));
  const js = fs.readFileSync(__dirname + '/../JavaScript.html', 'utf8'), i0 = js.indexOf('var NGAN_HANG_THEO_TEN_MIEN_'), i1 = js.indexOf('function hienNganHangThamChieu_');
  const ten = new Function(js.slice(i0, i1) + ';return tenNganHangTuLink_;')();
  assert.equal(ten('https://www.vietcombank.com.vn/vi-VN'), 'Vietcombank'); assert.equal(ten('https://ibank.bidv.com.vn/x'), 'BIDV');
  assert.equal(ten('https://evil-bidv.com.vn.x.com'), 'evil-bidv.com.vn.x.com'); assert.equal(ten(''), '');
});
Q.ket('hạn mức / bảo đảm / ràng buộc / dự báo');
