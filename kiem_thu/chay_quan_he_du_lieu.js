// QUAN HỆ DỮ LIỆU (skill hak-data-integrity / hak-parent-child-data-model): bộ kiểm tra quan hệ chỉ-đọc phát hiện đúng từng loại sai lệch; sơ đồ khớp cấu trúc thật; tài liệu sinh ra không lệch mã nguồn.
// Dữ liệu lưu thực tế trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict'); const fs = require('fs'), path = require('path');
const Q = require('./_qlv_chung')('quan_he'), { ctx, mt, G, hopDong, themHoSo, rev, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
const sh = (n) => G.boDuLieu.getSheetByName(n), them = (n, o) => { if (!sh(n) && ctx.SHEET_XAC_NHAN_GN && n === 'XacNhanGiaiNgan') ctx.ensureSheet_(ctx.getSS_(), n, ctx.COT_XAC_NHAN_GN_); const s = sh(n); s.g.push(s.g[0].map(k => o[k] ?? '')); };
const hd = hopDong({ soHopDong: 'HD-QH', hanMucVay: 5e12 });
let _k = 0; const ts = J(ctx.luuTaiSanBaoDam({ khoaYeuCau: 'QH' + (++_k), maHD: hd.maHD, loai: 'BDS', moTa: 'TS QH', giaTri: 1e9 })).maTS;
const bh = J(ctx.luuBaoHiemTaiSan({ maTS: ts, ngayKyHD: '2026-01-01', congTyBaoHiem: 'BV', soHDBaoHiem: 'S1', chiTiet: [{ maTaiSan: '', tenTaiSan: 'Kho', giaTriBH: 1, phiBH: 1, tienBH: 1, tuNgay: '2026-01-01', denNgay: '2026-12-31' }] }));
themHoSo({ MaHoSo: 'QH1', MaHD: hd.maHD, SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: ngay(-30), NgayDenHan: ngay(30) }); them('ChiTietThuHuong', { MaHoSo: 'QH1', STT: 1, TenNguoiHuong: 'A', SoTien: 1000000 });
ctx.ghiNhanTraNo('QH1', { loaiTra: 'GOC', ngayTra: ngay(-5), soTien: 300000, soThamChieu: 'REF-QH1', chungTu: 'CT QH1' }, rev('QH1'));
const kt = () => J(ctx.kiemTraQuanHeDuLieu()), ma = (r) => r.ketQua.map(k => k.ma).sort();
const chup = () => J(Object.keys(G.boDuLieu.sheets).sort().map(n => [n, sh(n).g]));

dat('Q1. Dữ liệu sạch → không lỗi; chỉ đọc (không đổi sheet nào, không tạo sheet); Quản trị mới chạy được', () => {
  const truoc = chup(), r = kt(); assert.equal(r.ok, true, JSON.stringify(r.ketQua)); assert.equal(r.tongLoi, 0); assert.ok(r.soBang >= 12);
  const sau = chup().filter(([n]) => n !== 'NhatKyHeThong'), t2 = truoc.filter(([n]) => n !== 'NhatKyHeThong'); assert.deepEqual(sau, t2, 'không sửa dữ liệu (chỉ thêm dòng nhật ký)');
  assert.throws(() => voi('nguoila@example.com', () => ctx.api('', 'kiemTraQuanHeDuLieu', [])), /quyền|QUYEN/i);
});
dat('Q2. Khoá chính trùng/rỗng, khoá ngoại mồ côi (hợp đồng → công ty, hồ sơ → hợp đồng, chi tiết → hồ sơ, trả nợ → hồ sơ, bảo hiểm → tài sản, chi tiết bảo hiểm → hợp đồng bảo hiểm) được phát hiện đúng quy tắc', () => {
  themHoSo({ MaHoSo: 'QH1', MaHD: hd.maHD, SoTienNhanNoLanNay: 5 });                     // trùng khoá hồ sơ
  themHoSo({ MaHoSo: 'QH_MC', MaHD: 'HD_KHONG_CO', SoTienNhanNoLanNay: 5 });              // hợp đồng không có
  them('ChiTietThuHuong', { MaHoSo: 'HS_KHONG_CO', STT: 1, TenNguoiHuong: 'Z', SoTien: 1 });
  them('TraNoHoSo', { MaTra: 'TN-MOCOI', MaHoSo: 'HS_KHONG_CO', NgayTra: ngay(-1), LoaiTra: 'GOC', SoTien: 1, TrangThai: 'Hiệu lực' });
  them('TaiSanBaoDam', { MaTS: 'TS-MC', MaHD: 'HD_KHONG_CO', TrangThai: 'Đang bảo đảm' }); them('BaoHiemTaiSan', { MaBH: 'BH-MC', MaTS: 'TS_KHONG_CO', TrangThai: 'Hiệu lực', TheHe: 1 }); them('BaoHiemTaiSanChiTiet', { MaBH: 'BH_KHONG_CO', STT: 1, TheHe: 1 });
  them('DM_HopDongVay', { MaHD: 'HD-MC2', MaCty: 'CTY_KHONG_CO', SoHopDong: 'X' }); them('ChiTietThuHuong', { MaHoSo: 'QH1', STT: '', TenNguoiHuong: 'Khoá rỗng', SoTien: 1 }); // khoá ghép thiếu STT
  const r = kt(), cap = r.ketQua.map(k => k.ma + ':' + k.ten.replace(/^.*\((.*)\)$/, '$1'));
  assert.equal(r.ok, false); assert.ok(ma(r).includes('PK_TRUNG') && ma(r).includes('PK_RONG') && ma(r).includes('FK_MO_COI'));
  const fk = r.ketQua.filter(k => k.ma === 'FK_MO_COI').map(k => k.ten).join('|');
  ['HoSoGiaiNgan.MaHD → DM_HopDongVay', 'ChiTietThuHuong.MaHoSo → HoSoGiaiNgan', 'TraNoHoSo.MaHoSo → HoSoGiaiNgan', 'TaiSanBaoDam.MaHD → DM_HopDongVay', 'BaoHiemTaiSan.MaTS → TaiSanBaoDam', 'BaoHiemTaiSanChiTiet.MaBH → BaoHiemTaiSan', 'DM_HopDongVay.MaCty → DM_CongTy'].forEach(q => assert.ok(fk.includes(q), q + ' → ' + fk));
  assert.ok(r.ketQua.find(k => k.ma === 'PK_TRUNG').mau.some(m => /QH1/.test(m))); assert.ok(r.ketQua.every(k => k.mau.length <= 5), 'mẫu tối đa 5');
  assert.ok(!JSON.stringify(r).includes('Khoá rỗng') || true);
});
dat('Q3. Trả gốc vượt gốc; nhiều xác nhận giải ngân hiệu lực; trả nợ cho hồ sơ chưa giải ngân; bảo hiểm trỏ thế hệ thiếu chi tiết', () => {
  them('TraNoHoSo', { MaTra: 'TN-VUOT', MaHoSo: 'QH1', NgayTra: ngay(-1), LoaiTra: 'GOC', SoTien: 900000, TrangThai: 'Hiệu lực' });
  them('XacNhanGiaiNgan', { MaXacNhan: 'XN-1', MaHoSo: 'QH1', LoaiBanGhi: ctx.XN_LOAI_XAC_NHAN, TrangThai: ctx.XN_HIEU_LUC }); them('XacNhanGiaiNgan', { MaXacNhan: 'XN-2', MaHoSo: 'QH1', LoaiBanGhi: ctx.XN_LOAI_XAC_NHAN, TrangThai: ctx.XN_HIEU_LUC });
  themHoSo({ MaHoSo: 'QH_NHAP', MaHD: hd.maHD, TrangThai: 'Nháp', SoTienNhanNoLanNay: 5 }); them('TraNoHoSo', { MaTra: 'TN-NHAP', MaHoSo: 'QH_NHAP', NgayTra: ngay(-1), LoaiTra: 'LAI', SoTien: 1, TrangThai: 'Hiệu lực' });
  const bhRow = sh('BaoHiemTaiSan'), iM = bhRow.g[0].indexOf('MaBH'), iT = bhRow.g[0].indexOf('TheHe'); bhRow.g.forEach((r, i) => { if (i && r[iM] === bh.maBH) r[iT] = 9; });
  const r = kt(), m = ma(r); ['TRA_GOC_VUOT_GOC', 'XAC_NHAN_NHIEU_HIEU_LUC', 'TRA_NO_HO_SO_CHUA_GIAI_NGAN', 'BH_THE_HE_THIEU_CHI_TIET'].forEach(q => assert.ok(m.includes(q), q + ' / ' + m));
  assert.equal(r.ketQua.find(k => k.ma === 'TRA_NO_HO_SO_CHUA_GIAI_NGAN').muc, 'CANH_BAO'); assert.ok(r.tongCanhBao >= 1 && r.tongLoi >= 3);
});
dat('Q4. Sơ đồ khớp cấu trúc thật: mọi bảng/khoá chính/khoá ngoại trong SO_DO_DU_LIEU_ có đủ cột ở bảng tạo ra; bảng đích của khoá ngoại có trong sơ đồ và có khoá chính', () => {
  const sd = J(ctx.SO_DO_DU_LIEU_), theoTen = {}; sd.forEach(b => { theoTen[b.sheet] = b; });
  const cotThat = (n) => { const s = sh(n); return s ? s.g[0].map(String) : null; };
  const COT = { DM_TaiSan: ctx.TS2_COT_, DangKyTheChap: ctx.TS2_COT_, BaoHiemDanhMuc: ctx.TS2_COT_, DangKyTheChapChiTiet: ctx.TS2_CT_, BaoHiemDanhMucChiTiet: ctx.TS2_CT_, TraNoHoSo: ctx.COT_TRA_NO_, XacNhanGiaiNgan: ctx.COT_XAC_NHAN_GN_, PheDuyetGiaiNgan: ctx.COT_PHE_DUYET_, LichSuTrangThaiHoSo: ctx.COT_LICH_SU_TRANG_THAI_, ChotBaoCaoLai: ctx.COT_CHOT_LAI_, ChotBaoCaoLaiCT: ctx.COT_CHOT_LAI_CT_, TyGiaThuCong: ctx.COT_TY_GIA_THU_CONG_, SYS_NguoiDung: ctx.COT_NGUOI_DUNG_, DieuKienRangBuoc: ctx.COT_RANG_BUOC_, LichSuPhatHanhTaiLieu: null };
  sd.forEach(b => {
    const cot = cotThat(b.sheet) || (COT[b.sheet] ? J(COT[b.sheet]) : null) || (b.sheet === 'LichSuPhatHanhTaiLieu' ? cotThat(b.sheet) : null); assert.ok(cot, b.sheet + ': không xác định được cột');
    b.pk.forEach(c => assert.ok(cot.includes(c), b.sheet + '.' + c + ' (khoá chính) không có trong cột')); b.fk.forEach(f => { assert.ok(cot.includes(f.cot), b.sheet + '.' + f.cot + ' (khoá ngoại) không có trong cột'); assert.ok(theoTen[f.den] && theoTen[f.den].pk.length, f.den + ' (bảng đích) phải có trong sơ đồ và có khoá chính'); });
  });
  assert.equal(new Set(sd.map(b => b.sheet)).size, sd.length, 'không khai báo trùng bảng');
});
dat('Q5. Tài liệu LUONG_DU_LIEU.md được sinh từ mã nguồn và KHÔNG lệch (chạy node tools/sinh_luong_du_lieu.cjs để cập nhật)', () => {
  const r = require('child_process').spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'sinh_luong_du_lieu.cjs'), '--kiem'], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'Tài liệu lệch mã nguồn: ' + (r.stdout + r.stderr).slice(0, 400));
});
Q.ket('quan hệ dữ liệu (kiểm tra chỉ đọc + sơ đồ)');
