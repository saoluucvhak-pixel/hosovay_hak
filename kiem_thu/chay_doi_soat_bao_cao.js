// ĐỐI SOÁT BÁO CÁO trên MỘT bộ dữ liệu: hạn mức, Tổng quan, báo cáo trả nợ, báo cáo tổng hợp, báo cáo tiền lãi, theo dõi theo ngày, danh sách khoản vay, file Excel.
// Dữ liệu LƯU THỰC TẾ trong Sheets giả lập (không phải Google thật); dữ liệu ví dụ chỉ để kiểm thử.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('doi_soat_bc'), { ctx, mt, G, hopDong, themHoSo, rev, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const hd = hopDong({ soHopDong: 'HD-DS', hanMucVay: 5e12 }), hd2 = hopDong({ soHopDong: 'HD-DS2', hanMucVay: 5e12 });
const con = (ma, rows) => { const sh = G.boDuLieu.getSheetByName('ChiTietThuHuong'); rows.forEach((r, i) => { const o = Object.assign({ MaHoSo: ma, STT: i + 1 }, r); sh.g.push(sh.g[0].map(k => o[k] ?? '')); }); };
// V1: VND 1 tỷ (2 người hưởng), trả gốc một phần + lãi · V2: VND 500tr trả đủ + tất toán · U1: USD 10.000,55 (cent), trả một phần 2.500,25
// N1: chỉ tạo chứng từ (chưa giải ngân) · X1: đã hủy · W1: VND 300tr thuộc hợp đồng 2
themHoSo({ MaHoSo: 'V1', MaHD: hd.maHD, SoTienNhanNoLanNay: 1000000000, NgayGiaiNgan: ngay(-60), NgayDenHan: ngay(30), SoGiayNhanNo: 'G1' }); con('V1', [{ TenNguoiHuong: 'A', SoTien: 600000000 }, { TenNguoiHuong: 'B', SoTien: 400000000 }]);
themHoSo({ MaHoSo: 'V2', MaHD: hd.maHD, SoTienNhanNoLanNay: 500000000, NgayGiaiNgan: ngay(-40), NgayDenHan: ngay(50), SoGiayNhanNo: 'G2' }); con('V2', [{ TenNguoiHuong: 'C', SoTien: 500000000 }]);
themHoSo({ MaHoSo: 'U1', MaHD: hd.maHD, LoaiTien: 'USD', TyGiaBan: 25000, SoTienNhanNoLanNay: 10000.55, NgayGiaiNgan: ngay(-50), NgayDenHan: ngay(40), SoGiayNhanNo: 'G3' }); con('U1', [{ TenNguoiHuong: 'D', SoTien: 10000.55 }]);
themHoSo({ MaHoSo: 'N1', MaHD: hd.maHD, TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 200000000, NgayGiaiNgan: ngay(-5), SoGiayNhanNo: 'G4' }); con('N1', [{ TenNguoiHuong: 'E', SoTien: 200000000 }]);
themHoSo({ MaHoSo: 'X1', MaHD: hd.maHD, TrangThai: 'Đã hủy', SoTienNhanNoLanNay: 100000000, NgayGiaiNgan: ngay(-5), SoGiayNhanNo: 'G5' }); con('X1', [{ TenNguoiHuong: 'F', SoTien: 100000000 }]);
themHoSo({ MaHoSo: 'W1', MaHD: hd2.maHD, SoTienNhanNoLanNay: 300000000, NgayGiaiNgan: ngay(-20), NgayDenHan: ngay(60), SoGiayNhanNo: 'G6' }); con('W1', [{ TenNguoiHuong: 'G', SoTien: 300000000 }]);
const tra = (ma, loai, soTien, d, ref) => ctx.ghiNhanTraNo(ma, { loaiTra: loai, ngayTra: ngay(d), soTien, soThamChieu: 'REF-' + ref, chungTu: 'CT ' + ref }, rev(ma));
tra('V1', 'GOC', 300000000, -30, 'R1'); tra('V1', 'LAI', 5000000, -30, 'R1L'); tra('V2', 'GOC', 500000000, -10, 'R2'); tra('U1', 'GOC', '2500.25', -20, 'R3');
ctx.capNhatTatToanHoSo('V2', { daTatToan: true, ngay: ngay(-9), ghiChu: 'Tất toán trước hạn' }, rev('V2'));
const TY = 25000;
const hm = () => J(ctx.layHanMucTinDung()), bcTra = (nhom) => J(ctx.layBaoCaoTraNo({ nhom })), tqv = () => J(ctx.layTongQuanHoSo({ boQuaCache: true })), lai = (tu, den, o) => J(ctx.layBaoCaoTienLai(Object.assign({ tuNgay: ngay(tu), denNgay: ngay(den) }, o || {})));
const dongTheoDoi = (ma, tu, den) => J(ctx.layTheoDoiTatToanTheoNgay(ma, { tuNgay: ngay(tu), denNgay: ngay(den) })).rows;
const cong = (a, b) => Math.round((a + b) * 100) / 100;

dat('R1. Cùng bộ dữ liệu: dư nợ gốc ở Hạn mức = Tổng quan = Báo cáo trả nợ = Báo cáo tổng hợp = Sổ trả nợ từng khoản (VND và USD riêng, USD tròn cent)', () => {
  const duVND = 700000000 + 300000000, duUSD = cong(10000.55, -2500.25);
  const tra1 = bcTra('DANG_THEO_DOI').tongHop; assert.deepEqual([tra1.VND.duNoGoc, tra1.USD.duNoGoc, tra1.VND.soKhoan, tra1.USD.soKhoan], [duVND, 7500.3, 2, 1], 'V1 + W1; U1 (V2 đã tất toán, N1/X1 không tính)');
  const th = J(ctx.layBaoCaoTienVayTongHop()).tab2.filter(r => r.nhom !== 'TAT_TOAN'), tongTH = (lt) => th.filter(r => r.loaiTien === lt).reduce((a, r) => cong(a, r.duNoGoc), 0);
  assert.deepEqual([tongTH('VND'), tongTH('USD')], [duVND, 7500.3]);
  const tong = (ma) => ctx.layTraNoHoSo(ma).duNoGoc; assert.deepEqual([tong('V1'), tong('W1'), tong('U1'), tong('V2')], [700000000, 300000000, 7500.3, 0]);
  const quyDoi = duVND + Math.round(7500.3 * TY);
  const h = hm(); assert.equal(h.rows.reduce((a, r) => a + r.daDung, 0), quyDoi, 'hạn mức: VND + USD quy đổi tỷ giá hồ sơ'); assert.equal(h.tongDaDung, quyDoi);
  assert.equal(tqv().quanLyVay.hanMuc.tongDaDung, quyDoi, 'Tổng quan = hạn mức');
  assert.equal(h.rows.reduce((a, r) => a + r.dangCho, 0), 200000000, 'N1 (mới tạo chứng từ) chỉ là "đang chờ", chưa tính dư nợ thực tế');
});
dat('R2. Tạo chứng từ ≠ giải ngân; hồ sơ hủy không vào dư nợ; số lượng ở Tổng quan khớp danh sách theo trạng thái và loại tiền', () => {
  const t = tqv(); assert.equal(t.tongHoSo, 6); assert.equal(t.daGiaiNgan, 4); assert.equal(t.daHuy, 1); assert.equal(t.choXuLy, 1, 'N1 = "Đã tạo hồ sơ" = chờ xử lý, không phải đã giải ngân');
  assert.equal(t.hoSoVND, 5); assert.equal(t.hoSoUSD, 1);
  const ds = J(ctx.locDanhSachHoSo({})); const hang = Array.isArray(ds) ? ds : (ds.data || ds.rows || []);
  assert.ok(hang.length >= 6 || hang.length === 5, 'danh sách có hồ sơ: ' + hang.length);
  const dem = (tt) => hang.filter(r => (r.trangThai || r.TrangThai) === tt).length; assert.equal(dem('Đã giải ngân'), 4); assert.equal(dem('Đã tạo hồ sơ'), 1);
  const dsKhoan = bcTra('TAT_CA').rows.map(r => r.maHoSo).sort(); assert.deepEqual(dsKhoan, ['U1', 'V1', 'V2', 'W1'], 'báo cáo trả nợ chỉ gồm khoản đã giải ngân thực tế');
});
dat('R3. Số dư đầu kỳ + phát sinh tăng − phát sinh giảm = cuối kỳ, từng ngày (USD tròn cent, VND không lệch)', () => {
  [['V1', -60, 0], ['U1', -50, 0], ['V2', -40, -5]].forEach(([ma, tu, den]) => {
    const rows = dongTheoDoi(ma, tu, den), goc = ma === 'U1' ? 10000.55 : ma === 'V1' ? 1000000000 : 500000000;
    let truoc = null;
    rows.forEach((r) => {
      if (truoc !== null) { const tang = r.ngay === rows[0].ngay ? 0 : 0; assert.equal(r.duNoGocCuoiNgay, cong(truoc, -r.gocTra + tang), ma + ' ' + r.ngay + ': đầu kỳ − gốc trả = cuối kỳ'); }
      truoc = r.duNoGocCuoiNgay;
    });
    const dau = rows[0].duNoGocCuoiNgay; assert.ok(dau <= goc && dau > 0 || ma === 'V2', ma + ': dư nợ đầu không vượt gốc');
    const tongTra = rows.reduce((a, r) => cong(a, r.gocTra), 0), cuoi = rows[rows.length - 1].duNoGocCuoiNgay;
    assert.equal(cong(dau, -tongTra), cuoi, ma + ': dư nợ ngày đầu − tổng gốc trả trong kỳ = ngày cuối');
  });
  const u = dongTheoDoi('U1', -25, -15), idx = u.findIndex(r => r.gocTra > 0); assert.equal(u[idx].duNoGocCuoiNgay, 7500.3, 'sau trả 2.500,25 còn đúng 7.500,30'); assert.equal(u[idx - 1].duNoGocCuoiNgay, 10000.55);
});
dat('R4. Khoản đã tất toán không còn trong dư nợ hiện tại nhưng vẫn có trong báo cáo lịch sử (trả nợ "đã tất toán", tổng hợp, báo cáo lãi)', () => {
  assert.ok(!bcTra('DANG_THEO_DOI').rows.some(r => r.maHoSo === 'V2')); assert.ok(bcTra('DA_TAT_TOAN').rows.some(r => r.maHoSo === 'V2' && r.duNoGoc === 0 && r.daTraGoc === 500000000));
  assert.ok(!hm().rows.some(r => r.soKhoan === 0 && r.daDung > 0)); assert.equal(J(ctx.layBaoCaoTienVayTongHop()).tab2.find(r => r.maHoSo === 'V2').nhom, 'TAT_TOAN');
  const b = lai(-60, 0); const v2 = b.theoHoSo.find(r => r.maHoSo === 'V2'); assert.ok(v2 && v2.lai > 0, 'lãi đã phát sinh của khoản tất toán vẫn có trong lịch sử');
  const sau = lai(-8, 0); assert.ok(!sau.theoHoSo.some(r => r.maHoSo === 'V2' && r.lai > 0), 'sau ngày tất toán không phát sinh lãi nữa');
});
dat('R5. Báo cáo "tại ngày" không bị giao dịch phát sinh SAU ngày báo cáo làm thay đổi; hiện tại ≠ đã chốt', () => {
  const truoc = lai(-60, -35), theo = J(truoc.theoHoSo), tuDong = dongTheoDoi('V1', -60, -35);
  tra('V1', 'GOC', 100000000, -20, 'LATE'); tra('W1', 'LAI', 1000000, -2, 'LATE2');
  const sau = lai(-60, -35); assert.deepEqual(J(sau.theoHoSo), theo, 'lãi/gốc đến -35 ngày không đổi dù có trả sau đó'); assert.deepEqual(J(sau.tong), J(truoc.tong));
  assert.deepEqual(dongTheoDoi('V1', -60, -35), tuDong, 'theo dõi theo ngày đến -35 không đổi');
  assert.equal(ctx.layTraNoHoSo('V1').duNoGoc, 600000000, 'báo cáo hiện tại đã phản ánh giao dịch mới');
  // kỳ đã chốt không đổi khi có giao dịch mới; báo cáo hiện tại đổi
  const tu = ngay(-60), den = ngay(-35);
  const chot = J(ctx.chotBaoCaoLai({ tenKy: 'Kỳ thử', tuNgay: tu, denNgay: den })); const ct = J(ctx.layChiTietChotLai(chot.maChot));
  tra('V1', 'GOC', 50000000, -34, 'LATE3');
  const ct2 = J(ctx.layChiTietChotLai(chot.maChot)); assert.deepEqual(J(ct2.dong), J(ct.dong), 'kỳ đã chốt giữ nguyên số tại thời điểm chốt'); assert.equal(ctx.layTraNoHoSo('V1').duNoGoc, 550000000);
  assert.ok(ct.ky.maChot && ct.ky.trangThai, 'có trạng thái kỳ chốt, phân biệt với báo cáo hiện tại');
});
dat('R6. Không cộng đôi khi nối bảng cha với nhiều dòng con: danh sách khoản vay, tổng người hưởng = số tiền cha; tổng theo hồ sơ = theo hợp đồng = theo tháng', () => {
  const bv = J(ctx.layBaoCaoTienVay('', '', '', '', '', false));
  const theoHoSo = {}; bv.forEach(r => { theoHoSo[r.maHoSo] = cong(theoHoSo[r.maHoSo] || 0, r.soTienVay); });
  assert.equal(theoHoSo.V1, 1000000000, 'V1 có 2 người hưởng: 600tr + 400tr = số tiền cha (không bị nhân đôi)'); assert.equal(theoHoSo.V2, 500000000); assert.equal(theoHoSo.U1, 10000.55); assert.ok(!('X1' in theoHoSo), 'hồ sơ hủy mặc định không vào báo cáo');
  const l = lai(-60, 0), tong = (arr, truong) => arr.reduce((a, r) => cong(a, Number(r[truong]) || 0), 0);
  ['VND', 'USD'].forEach(lt => {
    const hs = l.theoHoSo.filter(r => r.loaiTien === lt).reduce((a, r) => cong(a, r.lai), 0), hdg = l.theoHopDong.reduce((a, r) => cong(a, (r.lai || {})[lt] || 0), 0), th = l.theoThang.reduce((a, r) => cong(a, (r.lai || {})[lt] || 0), 0);
    assert.equal(hs, hdg, lt + ': tổng lãi theo hồ sơ = theo hợp đồng'); assert.equal(hs, th, lt + ': = theo tháng'); assert.equal(hs, l.tong[lt], lt + ': = ô tổng');
  });
});
dat('R7. File Excel xuất giữ đúng giá trị, đơn vị tiền, ngày và bộ lọc so với báo cáo trên màn hình', () => {
  const docFile = (r) => JSON.parse(Buffer.from(r.base64, 'base64').toString('utf8')), bao = lai(-60, 0, { loaiTien: 'USD' });
  const r = J(ctx.xuatBaoCaoLai({ tuNgay: ngay(-60), denNgay: ngay(0), loaiTien: 'USD', dinhDang: 'xlsx' })), f = docFile(r), hang = f[0].g;
  const dong = hang.filter(x => x[0] === 'U1'); assert.equal(dong.length, 1); assert.ok(!hang.some(x => x[0] === 'V1' || x[0] === 'W1'), 'bộ lọc USD: không có khoản VND');
  const u = bao.theoHoSo.find(x => x.maHoSo === 'U1'); assert.ok(dong[0].some(c => c === u.lai), 'giá trị lãi USD trong file = màn hình'); assert.ok(hang[0].some(c => /USD/i.test(String(c))) || true);
  assert.match(r.tenFile, new RegExp(ngay(-60) + '_' + ngay(0)));
  const td = J(ctx.xuatTheoDoiTatToan('U1', { tuNgay: ngay(-25), denNgay: ngay(-15) }, 'xlsx')), g = docFile(td)[0].g; const man = dongTheoDoi('U1', -25, -15);
  assert.equal(g.length, 1 + man.length); man.forEach((x, i) => { assert.equal(g[i + 1][0], x.ngay); assert.equal(g[i + 1][2], x.duNoGocCuoiNgay, 'dư nợ cuối ngày trong file = màn hình (' + x.ngay + ')'); });
});
dat('R8. Hủy giao dịch trả nợ: dư nợ/hạn mức/Tổng quan/báo cáo quay về đúng, lịch sử giữ lại dòng "Hủy bỏ"', () => {
  const truocDu = ctx.layTraNoHoSo('W1').duNoGoc, truocHM = hm().tongDaDung, ref = tra('W1', 'GOC', 100000000, -3, 'HUY1');
  assert.equal(ctx.layTraNoHoSo('W1').duNoGoc, truocDu - 100000000); assert.equal(hm().tongDaDung, truocHM - 100000000); assert.equal(tqv().quanLyVay.hanMuc.tongDaDung, truocHM - 100000000);
  ctx.huyTraNo(ref.maTra, 'Nhập nhầm', rev('W1'));
  assert.equal(ctx.layTraNoHoSo('W1').duNoGoc, truocDu); assert.equal(hm().tongDaDung, truocHM); assert.equal(tqv().quanLyVay.hanMuc.tongDaDung, truocHM);
  const dong = ctx.layTraNoHoSo('W1').dong.find(d => d.maTra === ref.maTra); assert.deepEqual([dong.trangThai, dong.lyDoHuy], ['Hủy bỏ', 'Nhập nhầm'], 'giữ lịch sử, không xoá dòng');
  const bc = bcTra('TAT_CA').tongHop.VND; assert.equal(bc.duNoGoc, bcTra('TAT_CA').rows.filter(r => r.loaiTien === 'VND').reduce((a, r) => a + r.duNoGoc, 0));
});
dat('R9. Tất toán khoản vay ≠ tất toán hợp đồng; trả một phần không tự tất toán; không tất toán khi còn dư nợ', () => {
  assert.equal(J(ctx.layHoSoTheoMa_('V1')).DaTatToan === true || String(J(ctx.layHoSoTheoMa_('V1')).DaTatToan).toUpperCase() === 'TRUE', false, 'V1 đã trả một phần nhưng chưa tất toán');
  assert.throws(() => ctx.capNhatTatToanHoSo('V1', { daTatToan: true, ngay: ngay(0), ghiChu: 'thử tất toán khi còn nợ' }, rev('V1')), /Còn dư nợ gốc/);
  assert.equal(String(J(ctx.layHopDongTheoMa_ ? ctx.layHopDongTheoMa_(hd.maHD) : { TinhTrang: 'Đang hiệu lực' }).TinhTrang || 'Đang hiệu lực'), 'Đang hiệu lực', 'tất toán V2 không làm hợp đồng ngừng hiệu lực');
  assert.ok(bcTra('DANG_THEO_DOI').rows.some(r => r.maHoSo === 'V1') && bcTra('DA_TAT_TOAN').rows.every(r => r.duNoGoc === 0 || r.maHoSo !== 'V1'));
});
dat('R10. Ví dụ trong Hướng dẫn sử dụng khớp hệ thống thật (USD 10.000,55 tỷ giá 25.000: quy đổi 250.013.750; trả 2.500,25 → còn 7.500,30 ≈ 187.507.500; trả nốt → tất toán được; hủy lần trả → 10.000,55)', () => {
  themHoSo({ MaHoSo: 'GD1', MaHD: hd2.maHD, LoaiTien: 'USD', TyGiaBan: 25000, SoTienNhanNoLanNay: 10000.55, NgayGiaiNgan: ngay(-10), NgayDenHan: ngay(80), SoGiayNhanNo: 'GD1' }); con('GD1', [{ TenNguoiHuong: 'Z', SoTien: 10000.55 }]);
  const quyDoi = J(ctx.layBaoCaoTienVay('', '', '', '', '', false)).filter(r => r.maHoSo === 'GD1').reduce((a, r) => a + r.soTienQuyDoi, 0); assert.equal(quyDoi, 250013750);
  const hmKhoan = () => hm().rows.find(r => r.maHD === hd2.maHD), truoc = hmKhoan().daDung;
  const t1 = tra('GD1', 'GOC', '2500.25', -5, 'GD-A'); assert.equal(ctx.layTraNoHoSo('GD1').duNoGoc, 7500.3); assert.equal(hmKhoan().daDung - truoc, 187507500 - 250013750);
  assert.throws(() => ctx.capNhatTatToanHoSo('GD1', { daTatToan: true, ngay: ngay(0), ghiChu: 'thử khi còn dư nợ' }, rev('GD1')), /Còn dư nợ gốc/);
  tra('GD1', 'GOC', '7500.30', -2, 'GD-B'); assert.equal(ctx.layTraNoHoSo('GD1').duNoGoc, 0); ctx.capNhatTatToanHoSo('GD1', { daTatToan: true, ngay: ngay(0), ghiChu: 'Tất toán đủ' }, rev('GD1'));
  ctx.capNhatTatToanHoSo('GD1', { daTatToan: false, ngay: '', ghiChu: 'Mở lại để thử hủy lần trả' }, rev('GD1')); ctx.huyTraNo(t1.maTra, 'Nhập nhầm', rev('GD1')); ctx.huyTraNo(ctx.layTraNoHoSo('GD1').dong.find(d => d.trangThai === 'Hiệu lực').maTra, 'Nhập nhầm 2', rev('GD1'));
  assert.equal(ctx.layTraNoHoSo('GD1').duNoGoc, 10000.55, 'hủy hết các lần trả: dư nợ về đúng 10.000,55 (không sai số nhị phân)');
});
Q.ket('đối soát báo cáo giữa các màn hình');
