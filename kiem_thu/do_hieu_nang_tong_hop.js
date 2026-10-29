// ĐO số lượt/ô đọc của các màn hình TỔNG HỢP khi có 100/1.000/5.000 hồ sơ (kèm tài sản + hợp đồng bảo hiểm tương ứng). Mock Node — KHÔNG phải thời gian Google thật.
// Chạy: node kiem_thu/do_hieu_nang_tong_hop.js  (in bảng; không phải bài test đạt/trượt).
const Q = require('./_qlv_chung')('do_tong_hop'), { ctx, mt, G, hopDong, ngay } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const hd = hopDong({ soHopDong: 'HD-DO', hanMucVay: 1e15 });
const them = (ten, n, f) => { const sh = G.boDuLieu.getSheetByName(ten); for (let i = 1; i <= n; i++) { const o = f(i); sh.g.push(sh.g[0].map(k => o[k] ?? '')); } };
const kq = [], tuNgay = ngay(-100), denNgay = ngay(200);
const dem0 = () => { mt.__soLanDocRange = 0; mt.__soODoc = 0; mt.__soLanGhiRange = 0; mt.__soOGhi = 0; };
let daCo = 0;
[100, 1000, 5000].forEach((n) => {
  const them_n = n - daCo; daCo = n;
  const da = ctx.sheetToObjects_('HoSoGiaiNgan').length;
  them('HoSoGiaiNgan', them_n, (i) => ({ MaHoSo: 'DO' + (da + i), MaHD: hd.maHD, LoaiTien: 'VND', TrangThai: 'Đã giải ngân', Revision: 1, SoTienNhanNoLanNay: 1000000, NgayGiaiNgan: ngay(-50), NgayTao: ngay(-50) }));
  const ts0 = ctx.sheetToObjects_('TaiSanBaoDam').length;
  them('TaiSanBaoDam', them_n, (i) => ({ MaTS: 'TS-' + String(ts0 + i).padStart(6, '0'), MaHD: hd.maHD, LoaiTS: 'BDS', MoTa: 'Tài sản ' + (ts0 + i), GiaTriVND: 1e9, TrangThai: 'Đang bảo đảm', Revision: 1 }));
  ctx.tangRevision_('HOSO');
  const dong = { n };
  [['layTaiSanBaoDam', () => ctx.layTaiSanBaoDam('')], ['layTongQuanHoSo', () => ctx.layTongQuanHoSo({ boQuaCache: true })], ['layHanMucTinDung', () => ctx.layHanMucTinDung()], ['layBangDieuHanh', () => ctx.layBangDieuHanh()]].forEach(([ten, f]) => {
    dem0(); const t0 = process.hrtime.bigint(); f(); const ms = Number(process.hrtime.bigint() - t0) / 1e6; dong[ten] = { docLuot: mt.__soLanDocRange, docO: mt.__soODoc, ms: Math.round(ms) };
  });
  kq.push(dong);
});
console.log(JSON.stringify(kq));
console.log('\n| hồ sơ | màn hình | lượt đọc | ô đọc | ms (mock) |\n|---|---|---|---|---|');
kq.forEach(d => Object.keys(d).filter(k => k !== 'n').forEach(k => console.log('| ' + d.n + ' | ' + k + ' | ' + d[k].docLuot + ' | ' + d[k].docO + ' | ' + d[k].ms + ' |')));
