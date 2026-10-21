// Kiểm thử: cảnh báo khoản vay (sắp đến hạn / quá hạn / tỷ giá), tỷ giá thủ công, phiên bản và kiểm tra cấu trúc.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_canh_bao');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, out);

ctx.initializeSpreadsheet();
TI.dangKyNguoiThuong(ctx);
mt.__email = 'ketoan@example.com';
const c = ctx.luuCongTy({ tenCty: 'Công ty thử', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'DN' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: c.maCty, soHopDong: 'HDT', ngayHopDong: '2026-01-01', tenNganHang: 'BIDV', hanMucVay: 1e12 });
const sh = mt.__.boDuLieu.getSheetByName('HoSoGiaiNgan');
const hom = ctx.homNayVN_();
const cong = (n) => new Date(Date.parse(hom + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const dong = (o) => sh.g[0].map(k => ({ MaHD: hd.maHD, LoaiTien: 'VND', TrangThai: 'Đã giải ngân', SoTienNhanNoLanNay: 1000000, TyGiaBan: 25000, NgayGiaiNgan: '2026-01-01', Revision: 1, ...o }[k] ?? ''));
sh.g.push(dong({ MaHoSo: 'QH', NgayDenHan: cong(-3) }));          // quá hạn 3 ngày
sh.g.push(dong({ MaHoSo: 'SH', NgayDenHan: cong(5) }));           // sắp đến hạn 5 ngày
sh.g.push(dong({ MaHoSo: 'XA', NgayDenHan: cong(60) }));          // chưa tới hạn → không cảnh báo
sh.g.push(dong({ MaHoSo: 'US', LoaiTien: 'USD', NgayDenHan: cong(60), TyGiaBan: 25000 })); // tỷ giá lệch
ctx.tangRevision_('HOSO');
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };

// Tỷ giá thủ công: chặn giá vô lý, chặn trùng ngày, ghi đúng
assert.throws(() => ctx.ghiTyGiaThuCong({ ngay: hom, tyGiaBan: '12' }), /25\.800/);
const t1 = ctx.ghiTyGiaThuCong({ ngay: hom, tyGiaBan: '25.800', ghiChu: 'Vietcombank giờ 10h' });
assert.equal(t1.tyGiaBan, 25800);
assert.throws(() => ctx.ghiTyGiaThuCong({ ngay: hom, tyGiaBan: '25800' }), /Đã có tỷ giá/);
dat('Tỷ giá thủ công: chặn ngoài khoảng, chặn trùng ngày, ghi đúng số');

// Cảnh báo: quá hạn, sắp đến hạn, tỷ giá lệch ≥1%; khoản chưa tới hạn không hiện
const cb = ctx.layTongQuanHoSo({ boQuaCache: true }).canhBao;
const theo = (ma, loai) => cb.dong.find(d => d.maHoSo === ma && d.loai === loai);
assert.ok(theo('QH', 'QUA_HAN') && theo('QH', 'QUA_HAN').soNgay === 3);
assert.ok(theo('SH', 'SAP_DEN_HAN') && theo('SH', 'SAP_DEN_HAN').soNgay === 5);
assert.ok(!cb.dong.some(d => d.maHoSo === 'XA'));
assert.ok(theo('US', 'TY_GIA'), 'USD lệch 3,2% phải có cảnh báo tỷ giá');
assert.ok(!cb.dong.some(d => d.maHoSo === 'SH' && d.loai === 'TY_GIA'), 'VND không cảnh báo tỷ giá');
assert.equal(cb.dong[0].loai, 'QUA_HAN', 'quá hạn xếp đầu');
dat('Cảnh báo: quá hạn, sắp đến hạn 7 ngày, tỷ giá vượt ngưỡng; khoản chưa tới hạn và VND không bị gán tỷ giá');

// Khoản đã tất toán (trả đủ gốc) không còn cảnh báo
ctx.ghiNhanTraNo('QH', { loaiTra: 'GOC', ngayTra: cong(0), soTien: 1000000, soThamChieu: 'UNC-QH', chungTu: 'UNC trả đủ' }, ctx.soRevision_(ctx.layHoSoTheoMa_('QH')));
const cb2 = ctx.layTongQuanHoSo({ boQuaCache: true }).canhBao;
assert.ok(!cb2.dong.some(d => d.maHoSo === 'QH'), 'đã trả đủ gốc → hết cảnh báo');
dat('Trả đủ gốc → khoản hết cảnh báo quá hạn');

// Phiên bản và kiểm tra cấu trúc
const pb = ctx.layPhienBanUngDung();
assert.match(pb.version, /^\d{4}\.\d{2}\.\d{2}/);
const ct = ctx.kiemTraCauTrucDuLieu();
assert.equal(ct.duBatBuoc, true);
assert.ok(ct.ketQua.find(k => k.sheet === 'HoSoGiaiNgan').trangThai === 'DU');
dat('Phiên bản ' + pb.version + ' hiển thị; kiểm tra cấu trúc bắt buộc đủ');

// Thiếu cột bắt buộc → báo đúng tên cột, không tự sửa
const hdr = sh.g[0]; const idx = hdr.indexOf('NgayDenHan'); const bak = hdr[idx]; hdr[idx] = 'NgayDenHanX';
const ct2 = ctx.kiemTraCauTrucDuLieu();
assert.equal(ct2.duBatBuoc, false);
assert.ok(ct2.ketQua.find(k => k.sheet === 'HoSoGiaiNgan').thieu.includes('NgayDenHan'));
hdr[idx] = bak;
dat('Thiếu cột NgayDenHan được báo đúng tên; không sửa dữ liệu');

console.log('\nTỔNG: ' + ok + ' kiểm tra cảnh báo/phiên bản đạt, 0 lỗi');
