// NHẤT QUÁN QUY TRÌNH còn hiệu lực: dư nợ giữa các màn hình. (Các mục bảo hiểm kiểu cũ/Excel đã gỡ.)
// không có đường ghi song song, nâng cấp cấu trúc chạy hai lần. Dữ liệu LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const Q = require('./_qlv_chung')('nhat_quan'), { ctx, mt, G, hopDong, themHoSo, rev, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const ctB = G.boDuLieu.getSheetByName('DM_CongTy'); ctB.g.push(ctB.g[0].map(k => ({ MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002' })[k] ?? ''));
const hdA = hopDong({ soHopDong: 'HD-A' }), hdB = hopDong({ soHopDong: 'HD-B', maCty: 'CTY_B' });
let _k = 0;
const taoTS = (hd, moTa, o) => J(ctx.luuTaiSanBaoDam(Object.assign({ khoaYeuCau: 'NQ' + (++_k), maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1000000000 }, o || {}))).maTS;
const dsTS = (hd) => J(ctx.layTaiSanBaoDam(hd.maHD)).rows;
const CT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 500, tuNgay: tu, denNgay: den }, o || {});
const luuBH = (maTS, chiTiet, o) => J(ctx.luuBaoHiemTaiSan(Object.assign({ maTS, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {})));
const bhCua = (ts) => J(ctx.layBaoHiemTaiSan(ts)).hopDong;
const TIEU = ['Tên tài sản', 'Giá trị định giá', 'Công ty bảo hiểm', 'Số HĐ bảo hiểm', 'Ngày ký hợp đồng bảo hiểm', 'Tiền bảo hiểm', 'Phí bảo hiểm', 'Bảo hiểm từ ngày', 'Bảo hiểm đến ngày'];
const xlsx = (dong, tieu) => { ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [tieu || TIEU].concat(dong) }]; };
const xem = (hd) => J(ctx.xemTruocCapNhatTSDB({ maHD: hd.maHD, base64: 'eA==' }));
const apDung = (hd, x) => J(ctx.apDungCapNhatTSDB({ maHD: hd.maHD, dong: x.dong }));
const H = '2026-12-31';
const dongEx = (ten, den, o) => [ten, 5000000, 'Bảo Việt', 'S1', '01/01/2026', 777, 55, '01/01/2026', den].concat(o || []);

dat('E6. Dư nợ/gốc/lãi nhất quán giữa các màn hình: chứng từ ≠ giải ngân; trả một phần, đủ, hủy; USD giữ số thực nhập', () => {
  const hd = hopDong({ soHopDong: 'HD-DUNO', hanMucVay: 2000000000 }), hom = ngay(-5);
  themHoSo({ MaHoSo: 'N1', MaHD: hd.maHD, TrangThai: 'Đã tạo hồ sơ', SoTienNhanNoLanNay: 100000000, NgayGiaiNgan: hom });
  themHoSo({ MaHoSo: 'N2', MaHD: hd.maHD, TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: 200000000, NgayGiaiNgan: hom });
  themHoSo({ MaHoSo: 'N3', MaHD: hd.maHD, TrangThai: 'Đã giải ngân', LoaiTien: 'USD', SoTienNhanNoLanNay: 1000.25, NgayGiaiNgan: hom, TyGiaBan: 25000 });
  const hm = () => J(ctx.layHanMucTinDung()).rows.find(r => r.maHD === hd.maHD), tq = () => J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay.hanMuc.tongDaDung;
  assert.deepEqual([hm().daDung, hm().dangCho], [225006250, 100000000], 'chứng từ (Đã tạo hồ sơ) chỉ là đang chờ, chưa tính dư nợ; USD quy đổi 1000,25 × 25.000');
  const tong0 = tq();
  ctx.ghiNhanTraNo('N2', { loaiTra: 'GOC', ngayTra: ngay(-2), soTien: 50000000, soThamChieu: 'UNC-N2-1', chungTu: 'UNC 1' }, rev('N2'));
  assert.equal(ctx.layTraNoHoSo('N2').duNoGoc, 150000000); assert.equal(hm().daDung, 175006250); assert.equal(tq(), tong0 - 50000000, 'Tổng quan khớp hạn mức');
  const trUSD = ctx.ghiNhanTraNo('N3', { loaiTra: 'GOC', ngayTra: ngay(-2), soTien: '400.10', soThamChieu: 'UNC-N3-1', chungTu: 'UNC 3' }, rev('N3'));
  const t3 = J(ctx.layTraNoHoSo('N3')); assert.deepEqual([t3.duNoGoc, t3.dong[0].soTien, t3.loaiTien], [600.15, 400.1, 'USD'], 'giữ số USD thực nhập, không ghi đè bằng số quy đổi');
  assert.equal(hm().daDung, 150000000 + Math.round(600.15 * 25000), 'dư nợ USD quy đổi theo dư nợ gốc USD còn lại');
  ctx.huyTraNo(trUSD.maTra, 'nhập nhầm', rev('N3')); assert.equal(ctx.layTraNoHoSo('N3').duNoGoc, 1000.25); assert.equal(hm().daDung, 150000000 + 25006250);
  ctx.ghiNhanTraNo('N2', { loaiTra: 'GOC', ngayTra: ngay(-1), soTien: 150000000, soThamChieu: 'UNC-N2-2', chungTu: 'UNC 2' }, rev('N2'));
  assert.equal(ctx.layTraNoHoSo('N2').duNoGoc, 0); assert.equal(hm().soKhoan, 1, 'khoản đã trả đủ không còn trong hạn mức');
  // gửi lại sau mất phản hồi: cùng phiên bản → XUNG_DOT; phiên bản mới nhưng cùng số tham chiếu → chặn trùng. Không nhân đôi bản ghi.
  const dem = () => J(ctx.layTraNoHoSo('N3')).dong.filter(d => d.trangThai === 'Hiệu lực').length, truoc = dem();
  const revCu = rev('N3'); ctx.ghiNhanTraNo('N3', { loaiTra: 'LAI', ngayTra: ngay(-1), soTien: 1000, soThamChieu: 'UNC-N3-LAI', chungTu: 'UNC lãi' }, revCu);
  assert.throws(() => ctx.ghiNhanTraNo('N3', { loaiTra: 'LAI', ngayTra: ngay(-1), soTien: 1000, soThamChieu: 'UNC-N3-LAI', chungTu: 'UNC lãi' }, revCu), /XUNG_DOT_PHIEN_BAN/);
  assert.throws(() => ctx.ghiNhanTraNo('N3', { loaiTra: 'LAI', ngayTra: ngay(-1), soTien: 1000, soThamChieu: 'UNC-N3-LAI', chungTu: 'UNC lãi' }, rev('N3')), /đã dùng/);
  assert.equal(dem(), truoc + 1);
});
Q.ket('nhất quán quy trình tài sản/bảo hiểm/dư nợ');
