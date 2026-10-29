// GIAO DỊCH GHI TÀI SẢN BẢO ĐẢM: khoá yêu cầu tạo tài sản (gửi lại không nhân đôi), phiên bản bắt buộc khi giải chấp. (Phần bảo hiểm kiểu cũ đã gỡ.)
// Kiểm tra DỮ LIỆU LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('giao_dich_bh'), { ctx, mt, G, hopDong, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hdA = hopDong({ soHopDong: 'HD-A' });
let _k = 0;
const taoTS = (hd, moTa, o) => J(ctx.luuTaiSanBaoDam(Object.assign({ khoaYeuCau: 'K' + (++_k), maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1000000000 }, o || {}))).maTS;
const CT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 500, tuNgay: tu, denNgay: den }, o || {});
const luuBH = (maTS, chiTiet, o) => J(ctx.luuBaoHiemTaiSan(Object.assign({ maTS, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {})));
const bhCua = (ts, maBH) => J(ctx.layBaoHiemTaiSan(ts)).hopDong.find(h => h.maBH === maBH);
const tenCT = (ts, maBH) => bhCua(ts, maBH).chiTiet.map(c => c.tenTaiSan);
const rawCT = (maBH) => ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').filter(c => c.MaBH === maBH);
const theHeRaw = (maBH) => J(rawCT(maBH).map(c => c.TenTaiSan + '@' + c.TheHe).sort());
const sua = (ts, maBH, chiTiet, o) => ctx.luuBaoHiemTaiSan(Object.assign({ maTS: ts, maBH, expectedRevision: bhCua(ts, maBH).revision, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {}));
const chen = (ten, thayThe, f) => { const goc = ctx[ten]; ctx[ten] = thayThe(goc); try { return f(); } finally { ctx[ten] = goc; } };
const loiCua = (f) => { try { f(); return ''; } catch (e) { return e.message; } };
const H = '2026-12-31';
const loiCha = (g) => (t, k, m, c) => { if (t === 'BaoHiemTaiSan') throw new Error('Lỗi cập nhật cha'); return g(t, k, m, c); };
const khongXoa = () => () => { throw new Error('Lỗi xoá'); };


dat('C1. Gửi lại cùng yêu cầu tạo tài sản (khoaYeuCau) → trả đúng tài sản cũ; hai tài sản thật trùng tên vẫn tạo được; thiếu khoá → từ chối', () => {
  const tt = { khoaYeuCau: 'REQ-1', maHD: hdA.maHD, loai: 'BDS', moTa: 'Nhà xưởng giống tên', giaTri: 1000000 };
  const a = J(ctx.luuTaiSanBaoDam(tt)), b = J(ctx.luuTaiSanBaoDam(tt)); assert.equal(a.maTS, b.maTS); assert.equal(b.trungLap, true);
  assert.equal(ctx.docSheetBaoDam_('TaiSanBaoDam').filter(t => t.MoTa === 'Nhà xưởng giống tên').length, 1);
  const c = J(ctx.luuTaiSanBaoDam(Object.assign({}, tt, { khoaYeuCau: 'REQ-2' }))); assert.notEqual(c.maTS, a.maTS, 'hai tài sản thật trùng tên là hợp lệ');
  assert.throws(() => ctx.luuTaiSanBaoDam({ maHD: hdA.maHD, loai: 'BDS', moTa: 'Thiếu khoá', giaTri: 1 }), /khoá yêu cầu|khoaYeuCau/i);
  assert.throws(() => ctx.luuTaiSanBaoDam(Object.assign({}, tt, { giaTri: 2000000 })), /khoá yêu cầu.*khác|đã dùng/i, 'cùng khoá nhưng nội dung khác bị chặn, không âm thầm trả bản cũ');
});
dat('C2. Giải chấp bắt buộc expectedRevision ở máy chủ; sai phiên bản → XUNG_DOT kèm dữ liệu hiện tại', () => {
  const ts = taoTS(hdA, 'Cụm C2');
  assert.throws(() => ctx.giaiChapTaiSan(ts, 'lý do giải chấp'), /Thiếu phiên bản/);
  const e = loiCua(() => ctx.giaiChapTaiSan(ts, 'lý do giải chấp', 99)); assert.match(e, /^XUNG_DOT_PHIEN_BAN\|/);
  const hien = ctx.layTaiSanBaoDam(hdA.maHD).rows.find(r => r.maTS === ts); ctx.giaiChapTaiSan(ts, 'lý do giải chấp', hien.revision);
  assert.equal(ctx.layTaiSanBaoDam(hdA.maHD).rows.find(r => r.maTS === ts).trangThai, 'Đã giải chấp');
});
Q.ket('giao dịch ghi bảo hiểm / khoá yêu cầu / phiên bản');
