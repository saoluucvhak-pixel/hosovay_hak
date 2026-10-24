// HIỆU NĂNG nhập Excel tài sản/bảo hiểm trên Sheets GIẢ LẬP: số lượt đọc/ghi range, số ô đọc/ghi, thời gian giả lập (Node).
// Đây là số thao tác của mock, KHÔNG phải thời gian đáp ứng của Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('hieu_nang_tsdb'), { ctx, mt, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const dem0 = () => { mt.__soLanDocRange = 0; mt.__soODoc = 0; mt.__soLanGhiRange = 0; mt.__soOGhi = 0; };
const so = () => ({ docLuot: mt.__soLanDocRange || 0, docO: mt.__soODoc || 0, ghiLuot: mt.__soLanGhiRange || 0, ghiO: mt.__soOGhi || 0 });
const TIEU = ['Tên tài sản', 'Giá trị định giá', 'Khấu hao', 'Nguyên giá', 'Công ty bảo hiểm', 'Số HĐ bảo hiểm', 'Ngày ký hợp đồng bảo hiểm', 'Tiền bảo hiểm', 'Phí bảo hiểm', 'Bảo hiểm từ ngày', 'Bảo hiểm đến ngày'];
const nap = (n, hd, tienTo) => {
  const dong = []; for (let i = 1; i <= n; i++) dong.push([tienTo + ' ' + i, 5000000, 100, 1000, 'PVI', 'EX-' + tienTo + i, '01/02/2026', 777, 10, '01/02/2026', '01/02/2027']);
  ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [TIEU].concat(dong) }];
  const x = J(ctx.xemTruocCapNhatTSDB({ maHD: hd.maHD, base64: 'eA==' }));
  dem0(); const t0 = process.hrtime.bigint(); const k = J(ctx.apDungCapNhatTSDB({ maHD: hd.maHD, dong: x.dong })); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return Object.assign({ n, ms: Math.round(ms), ok: k.ok, taoMoi: k.taoMoi, bhThem: k.bhThem, boQua: k.boQua.length }, so());
};
const kq = {};
dat('Nhập Excel 10/100/300 dòng tài sản mới (bảng tài sản ban đầu trống): đo lượt/ô đọc ghi', () => {
  [10, 100, 300].forEach((n) => { const hd = hopDong({ soHopDong: 'HD-P' + n }); kq[n] = nap(n, hd, 'P' + n); });
  console.log(JSON.stringify(kq, null, 1));
  Object.keys(kq).forEach((n) => { assert.equal(kq[n].taoMoi, Number(n)); assert.equal(kq[n].bhThem, Number(n)); assert.equal(kq[n].boQua, 0); });
  // mục tiêu: số ô đọc không tăng bậc hai theo số dòng — 300 dòng ≤ 40 × số ô của 10 dòng (tuyến tính ≈ 30×)
  assert.ok(kq[300].docO <= 40 * Math.max(kq[10].docO, 1), 'ô đọc 300 dòng = ' + kq[300].docO + ' vs 10 dòng = ' + kq[10].docO);
  assert.ok(kq[300].docLuot <= 12 * kq[10].docLuot, 'lượt đọc 300 = ' + kq[300].docLuot + ' vs 10 = ' + kq[10].docLuot);
});
dat('Màn hình tổng hợp (Tổng quan, Bảng điều hành, Tài sản): mỗi bảng tài sản/bảo hiểm đọc TỐI ĐA một lần; bộ nhớ không giữ dữ liệu giữa các lần gọi và theo phạm vi công ty', () => {
  const hd = hopDong({ soHopDong: 'HD-TH' }), them = (ten, n, f) => { const sh = Q.G.boDuLieu.getSheetByName(ten); for (let i = 1; i <= n; i++) { const o = f(i); sh.g.push(sh.g[0].map(k => o[k] ?? '')); } };
  const N = 400; them('TaiSanBaoDam', N, (i) => ({ MaTS: 'TH-' + i, MaHD: hd.maHD, LoaiTS: 'BDS', MoTa: 'T' + i, GiaTriVND: 1e9, TrangThai: 'Đang bảo đảm', Revision: 1 }));
  them('BaoHiemTaiSan', N, (i) => ({ MaBH: 'BHT-' + i, MaTS: 'TH-' + i, SoHDBaoHiem: 'S', NgayKyHD: Q.ngay(-100), CongTyBaoHiem: 'BV', TrangThai: 'Hiệu lực', Revision: 1, TheHe: 1, SoDong: 1 }));
  them('BaoHiemTaiSanChiTiet', N, (i) => ({ MaBH: 'BHT-' + i, STT: 1, TenTaiSan: 'H', GiaTriBH: 1, PhiBH: 1, TienBH: 1, TuNgay: Q.ngay(-100), DenNgay: Q.ngay(200), TheHe: 1 }));
  const soO = (ten) => { const sh = Q.G.boDuLieu.getSheetByName(ten); return (sh.g.length) * sh.g[0].length; };
  const gioiHan = { TaiSanBaoDam: soO('TaiSanBaoDam') * 1.1, BaoHiemTaiSan: soO('BaoHiemTaiSan') * 1.1, BaoHiemTaiSanChiTiet: soO('BaoHiemTaiSanChiTiet') * 1.1 };
  [['layTongQuanHoSo', () => ctx.layTongQuanHoSo({ boQuaCache: true })], ['layBangDieuHanh', () => ctx.layBangDieuHanh()], ['layTaiSanBaoDam', () => ctx.layTaiSanBaoDam('')], ['layBaoHiemTaiSan', () => ctx.layBaoHiemTaiSan('TH-1')]].forEach(([ten, f]) => {
    mt.__odocTheoSheet = {}; f(); Object.keys(gioiHan).forEach(sh => assert.ok((mt.__odocTheoSheet[sh] || 0) <= gioiHan[sh], ten + ': ' + sh + ' đọc ' + mt.__odocTheoSheet[sh] + ' ô > giới hạn một lần ' + Math.round(gioiHan[sh])));
  });
  // không giữ dữ liệu giữa hai lần gọi: sửa thẳng sheet rồi gọi lại phải thấy ngay
  const truoc = J(ctx.layBaoHiemTaiSan('TH-1')).hopDong[0].soHDBaoHiem; const shBH = Q.G.boDuLieu.getSheetByName('BaoHiemTaiSan'); shBH.g[shBH.g.length - N][shBH.g[0].indexOf('SoHDBaoHiem')] = 'DA-SUA';
  assert.deepEqual([truoc, J(ctx.layBaoHiemTaiSan('TH-1')).hopDong[0].soHDBaoHiem], ['S', 'DA-SUA']);
  // trong một lần xử lý, ghi xong là bộ nhớ bị xoá
  ctx.voiBoNhoBH_(() => { const a = ctx.docSheetBaoDam_('BaoHiemTaiSan'); assert.equal(ctx.docSheetBaoDam_('BaoHiemTaiSan'), a, 'cùng lần xử lý dùng chung'); ctx.xoaBoNhoBH_(); assert.notEqual(ctx.docSheetBaoDam_('BaoHiemTaiSan'), a, 'sau ghi phải đọc lại'); });
  // khoá bộ nhớ theo người dùng + phạm vi công ty
  const k1 = ctx.khoaBoNhoBH_(), goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => ['CTY_X']; try { assert.notEqual(ctx.khoaBoNhoBH_(), k1); } finally { ctx.phamViCongTyNguoiDung_ = goc; }
});
Q.ket('hiệu năng nhập Excel TSĐB');
