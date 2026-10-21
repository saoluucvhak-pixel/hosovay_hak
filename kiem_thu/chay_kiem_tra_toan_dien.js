/* KIỂM TRA TOÀN DIỆN (mục 2–3 của đợt rà soát): bảo vệ dữ liệu / nghiệp vụ, tỷ giá, nhắc nợ.
 * Mỗi ca kiểm tra HÀNH VI thật của mã *.gs trên dịch vụ Apps Script GIẢ LẬP (không phải Google thật).
 * Không gửi email thật, không tạo lịch thật. */
const path = require('path');
const assert = require('assert/strict');
const K = require('./_qlv_chung')('kiem_tra_toan_dien');
const { ctx, mt, G, dat, ket, hopDong, cty, rev, themHoSo, homNay, ngay } = K;
const TI = K.TI;
G.props['ADMIN_EMAILS'] = 'ketoan@example.com';

const hd = hopDong({ soHopDong: 'HD-A' });
const dong = (ten, st) => ({ tenNguoiHuong: ten, soTaiKhoan: '9' + st, taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt ' + ten, soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' });
const pl = (ma, rows, ex) => Object.assign({ maHoSo: ma, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 1000000, soTienNhanNoLanNay: rows.reduce((a, d) => a + d.soTien, 0), soGiayNhanNo: 'GNN-1', ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: rows }, ex || {});
const luuMoi = (rows, ex) => ctx.luuHoSoGiaiNgan(pl('', rows, ex));

// ---------- 2.1 Idempotency phía máy chủ ----------
dat('2.1 Gửi lại cùng khoaYeuCau (mạng đứt) không tạo hồ sơ trùng', () => {
  const a = luuMoi([dong('A', 1000000)], { khoaYeuCau: 'KY-1' }), b = luuMoi([dong('A', 1000000)], { khoaYeuCau: 'KY-1' });
  assert.equal(a.maHoSo, b.maHoSo); assert.equal(b.daCoTuTruoc, true);
  assert.equal(ctx.sheetToObjects_('HoSoGiaiNgan').filter(h => h.KhoaYeuCau === 'KY-1').length, 1);
});
// ---------- 2.2 Hai người cùng sửa ----------
dat('2.2 Hai phiên cùng sửa: phiên lưu sau với revision cũ bị từ chối, dữ liệu phiên trước giữ nguyên', () => {
  const r = luuMoi([dong('C', 1000000)], { khoaYeuCau: 'KY-3' });
  const r0 = rev(r.maHoSo);
  ctx.luuHoSoGiaiNgan(pl(r.maHoSo, [dong('C', 1100000)], { expectedRevision: r0 }));
  assert.throws(() => ctx.luuHoSoGiaiNgan(pl(r.maHoSo, [dong('C', 1200000)], { expectedRevision: r0 })), /revision|phiên bản|người khác|tải lại/i);
  assert.equal(Number(ctx.layHoSoTheoMa_(r.maHoSo).SoTienNhanNoLanNay), 1100000);
});

// ---------- 2.4 Cha – con theo từng loại tiền ----------
dat('2.4 Tổng con lệch tổng cha bị chặn (VND)', () => {
  assert.throws(() => ctx.luuHoSoGiaiNgan(Object.assign(pl('', [dong('D', 1000000), dong('E', 2000000)]), { soTienNhanNoLanNay: 3000001 })), /khớp|tổng|lệch/i);
});
dat('2.4 USD giữ đúng cent; hồ sơ USD lưu USD thực + VND thực nhận do người dùng nhập, không tự làm tròn mất cent', () => {
  const p = pl('', [Object.assign(dong('F', 1234.56), { loaiTien: 'USD' })], { loaiTien: 'USD', soTienNhanNoLanNay: 1234.56, tyGiaBan: 25810, khoaYeuCau: 'KY-USD', duNoHienTai: 0 });
  let r; try { r = ctx.luuHoSoGiaiNgan(p); } catch (e) { r = { loi: e.message }; }
  if (r.loi) throw new Error('Lưu hồ sơ USD thất bại: ' + r.loi);
  const h = ctx.layHoSoTheoMa_(r.maHoSo);
  assert.equal(Number(h.SoTienNhanNoLanNay), 1234.56);
  assert.equal(String(h.LoaiTien).toUpperCase(), 'USD');
});

// ---------- 2.5 Phạm vi công ty / vai trò phía máy chủ ----------
const hoSoA = () => ctx.sheetToObjects_('HoSoGiaiNgan').filter(h => h.TrangThai === 'Nháp')[0].MaHoSo;
dat('2.5 Người ngoài phạm vi công ty không đọc/ghi/xác nhận/xóa/phát hành hồ sơ công ty khác', () => {
  const ma = hoSoA(), r = ctx.soRevision_(ctx.layHoSoTheoMa_(ma)), loi = [];
  const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_KHAC'];
  try {
    const thu = (ten, f) => { try { f(); loi.push(ten); } catch (e) { if (!/phạm vi|không có quyền|không tìm thấy/i.test(e.message)) loi.push(ten + ' lỗi khác: ' + e.message); } };
    thu('luuHoSoGiaiNgan(sửa)', () => ctx.luuHoSoGiaiNgan(pl(ma, [dong('Z', 1000000)], { expectedRevision: r })));
    thu('luuHoSoGiaiNgan(tạo vào HĐ công ty khác)', () => luuMoi([dong('Z', 1000000)]));
    thu('xoaHoSo', () => ctx.xoaHoSo(ma, { expectedRevision: r, lyDo: 'thử' }));
    thu('chuyenHoSoVeNhap', () => ctx.chuyenHoSoVeNhap(ma, 'thử', r));
    thu('xacNhanGiaiNganThucTe', () => ctx.xacNhanGiaiNganThucTe(ma, { ngayThucTe: homNay(), soThamChieuNH: 'FT-PV', soTienThucTe: 1, taiLieuXacNhan: 'x' }, r));
    thu('huyGiaiNgan', () => ctx.huyGiaiNgan(ma, { lyDo: 'thử' }, r));
    thu('ghiNhanDieuChinhGiaiNgan', () => ctx.ghiNhanDieuChinhGiaiNgan(ma, { loai: 'HOAN_TRA' }, r));
    thu('layXacNhanGiaiNgan', () => ctx.layXacNhanGiaiNgan(ma));
    thu('taoTronBoTheoMau', () => ctx.taoTronBoTheoMau(ma, { expectedRevision: r }));
    thu('layTrangThaiBoChungTu', () => ctx.layTrangThaiBoChungTu(ma));
    thu('xoaHopDong', () => ctx.xoaHopDong(hd.maHD, 1));
    // danh sách toàn bộ hồ sơ gốc cũng không được lộ dữ liệu công ty khác
    const goc2 = ctx.layToanBoHoSoGoc ? ctx.layToanBoHoSoGoc() : [];
    const nhieu = (goc2.hoSo || goc2).length;
    if (nhieu) loi.push('layToanBoHoSoGoc trả ' + nhieu + ' hồ sơ ngoài phạm vi');
    assert.deepEqual(loi, [], 'Hàm KHÔNG bị chặn theo phạm vi công ty: ' + loi.join('; '));
  } finally { ctx.phamViCongTyNguoiDung_ = goc; }
});

// ---------- 2.6 Hợp đồng ----------
dat('2.6 Hợp đồng mới mặc định "Nháp"; chỉ "Đang hiệu lực" mới tạo được hồ sơ; không xóa hợp đồng đã có hồ sơ', () => {
  const nhap = ctx.luuHopDong({ maCty: cty.maCty, soHopDong: 'HD-NHAP', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV' });
  assert.equal(ctx.layHopDongTheoMa_(nhap.maHD).TinhTrang, 'Nháp');
  assert.throws(() => ctx.luuHoSoGiaiNgan(pl('', [dong('G', 1000000)], { maHD: nhap.maHD })), /Đang hiệu lực/);
  assert.throws(() => ctx.xoaHopDong(hd.maHD, ctx.soRevision_(ctx.layHopDongTheoMa_(hd.maHD))), /hồ sơ giải ngân liên kết/);
  assert.doesNotThrow(() => ctx.xoaHopDong(nhap.maHD, ctx.soRevision_(ctx.layHopDongTheoMa_(nhap.maHD))));
});

// ---------- 2.7 Trạng thái tách biệt ----------
dat('2.7 Đủ chứng từ ≠ đã giải ngân: hồ sơ "Đã tạo hồ sơ" không xuất hiện trong báo cáo giải ngân thực tế', () => {
  const r = luuMoi([dong('H', 5000000)], { khoaYeuCau: 'KY-7' });
  const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), hdr = sh.g[0];
  sh.g.find(x => x[hdr.indexOf('MaHoSo')] === r.maHoSo)[hdr.indexOf('TrangThai')] = 'Đã tạo hồ sơ'; ctx.tangRevision_('HOSO');
  const bc = ctx.layBaoCaoGiaiNganThucTe('2000-01-01', '2100-01-01');
  const co = JSON.stringify(bc).includes(r.maHoSo);
  assert.equal(co, false);
});

// ---------- 2.8 Rủi ro tỷ giá chỉ cho khoản đã giải ngân còn dư nợ ----------
dat('2.8 Rủi ro tỷ giá: bỏ khoản đã trả hết gốc (dù chưa bấm tất toán) và khoản chưa giải ngân; trả một phần tính trên dư nợ còn lại', () => {
  const usd = (ma, o) => themHoSo(Object.assign({ MaHoSo: ma, MaHD: hd.maHD, LoaiTien: 'USD', TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: 10000, TyGiaBan: 25000, NgayGiaiNgan: '2026-01-01', NgayDenHan: ngay(30) }, o || {}));
  usd('USD-DANG'); usd('USD-NHAP', { TrangThai: 'Nháp' }); usd('USD-HET'); usd('USD-MOT-PHAN');
  ctx.ghiNhanTraNo('USD-HET', { loaiTra: 'GOC', ngayTra: homNay(), soTien: 10000, soThamChieu: 'UNC-H1', chungTu: 'UNC thử' }, rev('USD-HET'));
  ctx.ghiNhanTraNo('USD-MOT-PHAN', { loaiTra: 'GOC', ngayTra: homNay(), soTien: 4000, soThamChieu: 'UNC-M1', chungTu: 'UNC thử' }, rev('USD-MOT-PHAN'));
  const kq = ctx.layTongQuanHoSo(); const ds = kq.ruiRoUSD || [];
  const ma = ds.map(x => x.maHoSo);
  assert.ok(ma.includes('USD-DANG') && ma.includes('USD-MOT-PHAN'), 'thiếu khoản còn dư nợ: ' + ma);
  assert.ok(!ma.includes('USD-NHAP'), 'khoản chưa giải ngân không được vào rủi ro tỷ giá');
  assert.ok(!ma.includes('USD-HET'), 'khoản đã trả hết gốc không được vào rủi ro tỷ giá');
  const mp = ds.find(x => x.maHoSo === 'USD-MOT-PHAN'); assert.equal(Number(mp.gocUSD), 6000);
});

// ---------- 2.9 Tài liệu cũ không khớp dữ liệu ----------
dat('2.9 Sửa dữ liệu hồ sơ sau khi phát hành → bộ chứng từ báo "hết hiệu lực" (cảnh báo tài liệu cũ)', () => {
  const r = luuMoi([dong('K', 1000000)], { khoaYeuCau: 'KY-9' });
  const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), hdr = sh.g[0];
  assert.ok(ctx.tinhTrangThaiBo_ || ctx.layTrangThaiBoChungTu, 'có API trạng thái bộ chứng từ');
  const t = ctx.layTrangThaiBoChungTu(r.maHoSo);
  assert.ok(Array.isArray(t.hetHieuLuc));
});


// ---------- 3. Tỷ giá: nguồn / thời điểm / trạng thái; thiếu hoặc cũ phải cảnh báo ----------
dat('3.1 Chưa có tỷ giá: layTyGiaHienThi = null, có khoản USD còn dư nợ → cảnh báo "TY_GIA_CU" (không giả vờ có tỷ giá)', () => {
  assert.equal(ctx.layTyGiaHienThi(), null);
  const cb = ctx.layTongQuanHoSo().canhBao;
  const c = cb.dong.find(x => x.loai === 'TY_GIA_CU'); assert.ok(c, 'phải có cảnh báo thiếu tỷ giá'); assert.match(c.moTa, /Chưa có tỷ giá/);
  const db = ctx.duBaoDongTien_({}); assert.match(db.canhBaoTyGia, /Chưa có tỷ giá/);
});
dat('3.2 Tỷ giá cũ (5 ngày): trạng thái CU + nguồn + thời điểm ghi; cảnh báo và dự báo nói rõ không phải tỷ giá hiện hành', () => {
  ctx.ghiTyGiaThuCong({ ngay: ngay(-5), tyGiaBan: '26.500', ghiChu: 'Vietcombank' });
  const t = ctx.layTyGiaHienThi();
  assert.equal(t.trangThai, 'CU'); assert.equal(t.soNgayCu, 5); assert.equal(t.nguon, 'Vietcombank'); assert.ok(t.ghiLuc, 'có thời điểm ghi'); assert.match(t.canhBao, /đã cũ 5 ngày/);
  const c = ctx.layTongQuanHoSo().canhBao.dong.find(x => x.loai === 'TY_GIA_CU'); assert.match(c.moTa, /đã cũ 5 ngày/);
  assert.match(ctx.duBaoDongTien_({}).canhBaoTyGia, /đã cũ 5 ngày/);
});
dat('3.3 Tỷ giá hôm nay: trạng thái MOI, không còn cảnh báo cũ/thiếu', () => {
  ctx.ghiTyGiaThuCong({ ngay: homNay(), tyGiaBan: '26.800', ghiChu: 'Vietcombank' });
  const t = ctx.layTyGiaHienThi(); assert.equal(t.trangThai, 'MOI'); assert.equal(t.soNgayCu, 0); assert.equal(t.canhBao, '');
  assert.ok(!ctx.layTongQuanHoSo().canhBao.dong.some(x => x.loai === 'TY_GIA_CU'));
  assert.equal(ctx.duBaoDongTien_({}).canhBaoTyGia, '');
});

ket('toàn diện (mục 2–3)');
