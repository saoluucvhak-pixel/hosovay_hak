/* HỒI QUY các chức năng cũ (không liên quan DOCX): hồ sơ, hợp đồng, khách hàng, hoá đơn đính kèm, báo cáo, khoá trạng thái, xoá hồ sơ.
 * Chạy NGUYÊN mã *.gs với dịch vụ Apps Script giả lập.  node kiem_thu/chay_hoi_quy.js */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_hoi_quy'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
require('./gia_lap_apps_script').khachHangDungRevision(ctx); // trình duyệt đúng quy định: luôn gửi expectedRevision hiện hành
const G = mt.__;
const kq = []; let loi = 0;
const dat = (n, t, ok, g) => { kq.push([n, t, ok ? 'ĐẠT' : 'LỖI', g || '']); if (!ok) loi++; };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
const ob = (t) => ctx.sheetToObjects_(t);
process.on('uncaughtException', (e) => { in_(); console.log('LỖI BẤT NGỜ:', e.stack.split('\n').slice(0, 5).join('\n')); process.exit(2); });
function in_() { let n = ''; kq.forEach(([a, b, c, d]) => { if (a !== n) { console.log('\n== ' + a); n = a; } console.log(`  [${c}] ${b}${c === 'LỖI' && d ? '  → ' + String(d).slice(0, 300) : ''}`); }); }
const xml = (so, tien, mst) => `<HDon><DLHDon><TTChung><KHHDon>C26TAA</KHHDon><SHDon>${so}</SHDon><NLap>2026-09-15</NLap></TTChung><NDHDon><NBan><Ten>CÔNG TY NCC A</Ten><MST>${mst}</MST></NBan><NMua><Ten>CÔNG TY TNHH HIỆP VĨNH AN</Ten><MST>0400000000</MST></NMua><TToan><TgTTTBSo>${tien}</TgTTTBSo></TToan></NDHDon></DLHDon></HDon>`;

ctx.initializeSpreadsheet();
// ---- Công ty / Hợp đồng / Khách hàng ----
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', maSoThue: '0400000000', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
const cty2 = ctx.luuCongTy({ maCty: 'KHAC', tenCty: 'CÔNG TY SỬA TÊN', maSoThue: '0400000000' });
dat('Công ty', 'Hệ thống chỉ quản lý 1 công ty: lưu lần 2 cập nhật đúng dòng cũ, không tạo dòng mới', cty2.maCty === cty.maCty && ob('DM_CongTy').length === 1 && ob('DM_CongTy')[0].TenCty === 'CÔNG TY SỬA TÊN');
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-01', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 5000000000 });
const hd2 = ctx.luuHopDong({ maHD: hd.maHD, expectedRevision: Number(ctx.layHopDongTheoMa_(hd.maHD).Revision) || 0, maCty: cty.maCty, soHopDong: 'HD-01-SUA', hanMucVay: 6000000000 });
dat('Hợp đồng vay', 'Tạo + sửa hợp đồng (cùng mã), hạn mức số nguyên, danh sách đọc lại đúng', hd2.maHD === hd.maHD && ctx.layDanhSachHopDongDayDu().length === 1 && ctx.layDanhSachHopDongDayDu()[0].SoHopDong === 'HD-01-SUA' && ctx.layDanhSachHopDongDayDu()[0].HanMucVay === 6000000000);
const hanMucLe = thu(() => ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-X', hanMucVay: '5.000.000,5' }));
dat('Hợp đồng vay', 'Hạn mức có số lẻ bị từ chối (quy tắc tiền nguyên) và KHÔNG tạo hợp đồng', !hanMucLe.ok && ctx.layDanhSachHopDongDayDu().length === 1);
const kh = ctx.luuKhachHang({ tenKhachHang: 'NCC A', soTaiKhoan: '123', taiNganHang: 'BIDV', maSoThue: '111' });
ctx.luuKhachHang({ maKH: kh.maKH, tenKhachHang: 'NCC A (sửa)', soTaiKhoan: '123', taiNganHang: 'BIDV' });
dat('Khách hàng', 'Tạo + sửa khách hàng; bắt buộc tên/TK/ngân hàng', ob('DM_KhachHang').length === 1 && ob('DM_KhachHang')[0].TenKhachHang === 'NCC A (sửa)' && !thu(() => ctx.luuKhachHang({ tenKhachHang: 'x' })).ok);

// ---- Hồ sơ: tạo / sửa / đọc ----
const dong = (ten, st) => ({ tenNguoiHuong: ten, soTaiKhoan: '9' + st, taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt ' + ten, soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' });
const pl = (ma, ds) => ({ maHoSo: ma, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 1000000, soTienNhanNoLanNay: ds.reduce((a, d) => a + d.soTien, 0), soGiayNhanNo: 'GNN-1', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: ds });
const h1 = ctx.luuHoSoGiaiNgan(pl('', [dong('A', 1000000), dong('B', 2000000), dong('C', 3000000)]));
dat('Hồ sơ', 'Tạo hồ sơ mới: mã HS0001, trạng thái Nháp, 3 dòng chi tiết', h1.maHoSo === 'HS0001' && h1.trangThai === 'Nháp' && ctx.layChiTietTheoHoSo_(h1.maHoSo).length === 3);
const sua = ctx.luuHoSoGiaiNgan(pl(h1.maHoSo, [dong('A', 1500000), dong('B', 2000000)]));
dat('Hồ sơ', 'Sửa hồ sơ (cùng mã): không nhân đôi hồ sơ, chi tiết thay đúng (2 dòng, tổng 3.500.000)', sua.maHoSo === 'HS0001' && ob('HoSoGiaiNgan').length === 1 && ctx.layChiTietTheoHoSo_('HS0001').length === 2 && ctx.layHoSoTheoMa_('HS0001').SoTienNhanNoLanNay === 3500000);
dat('Hồ sơ', 'Số tiền bằng chữ lưu đúng; tiền quy đổi = tiền (VND)', ctx.layHoSoTheoMa_('HS0001').SoTienBangChu === 'Ba triệu, năm trăm ngàn đồng chẵn' && ctx.layChiTietTheoHoSo_('HS0001').every(c => c.SoTienQuyDoi === c.SoTien), ctx.layHoSoTheoMa_('HS0001').SoTienBangChu);
const full = thu(() => ctx.layDuLieuDayDu('HS0001'));
dat('Hồ sơ', 'Đọc đầy đủ hồ sơ + hợp đồng + công ty + chi tiết (ngày thành chuỗi)', full.ok && full.v.hopDong.SoHopDong === 'HD-01-SUA' && full.v.congTy.TenCty === 'CÔNG TY SỬA TÊN' && full.v.chiTiet.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(full.v.hoSo.NgayGiaiNgan), full.loi);
const h2 = ctx.luuHoSoGiaiNgan(pl('', [dong('D', 700000)]));
const loc = ctx.locDanhSachHoSo({ tenNguoiHuong: 'd' });
dat('Hồ sơ', 'Lọc danh sách theo người hưởng / mã hồ sơ / loại tiền', loc.length === 1 && loc[0].maHoSo === h2.maHoSo && ctx.locDanhSachHoSo({ maHoSo: 'HS0001' }).length === 1 && ctx.locDanhSachHoSo({ loaiTien: 'USD' }).length === 0);
const bc = ctx.layBaoCaoTienVay('', '', '', '', '');
dat('Báo cáo', 'Báo cáo tiền vay: 3 dòng chi tiết, tổng 4.200.000, không dòng nào cần rà soát', bc.length === 3 && bc.reduce((a, r) => a + r.soTienVay, 0) === 4200000 && bc.every(r => !r.canRaSoat));
const draft = ctx.capNhatBaoCaoDraft_();
dat('Báo cáo', 'Sheet nháp báo cáo được dựng lại đủ dòng', G.boDuLieu.getSheetByName('BaoCaoTienVay_Draft').getLastRow() === 4);
dat('Toàn vẹn', 'Báo cáo tổng quan: layToanBoHoSoGoc trả đủ hồ sơ', ctx.layToanBoHoSoGoc().length === 2);

// ---- Hoá đơn đính kèm ----
const enc = (s) => Buffer.from(s, 'utf8').toString('base64');
const t1 = thu(() => ctx.taiLenTaiLieuHoSo('HS0001', 'HoaDonGTGT', 'hd1.xml', 'text/xml', enc(xml('0000101', '25000000.00', '0311111111'))));
dat('Hoá đơn đính kèm', 'Tải hoá đơn XML "25000000.00": đọc đúng 25.000.000 (không phải 2,5 tỷ), tự thêm nhà cung cấp theo MST', t1.ok && t1.v.docDuoc && ob('BangKeHoaDon')[0].SoTien === 25000000 && ob('BangKeHoaDon')[0].SoHoaDon === 'C26TAA-0000101' && ob('DM_KhachHang').some(k => k.MaKH === '0311111111'), t1.loi);
const t2 = thu(() => ctx.taiLenTaiLieuHoSo('HS0001', 'HoaDonGTGT', 'hd2.xml', 'text/xml', enc(xml('0000102', '1234.56', '0322222222'))));
dat('Hoá đơn đính kèm', 'Hoá đơn có xu "1234.56": KHÔNG tự cắt/làm tròn — số tiền để trống (0) để nhập tay', t2.ok && ob('BangKeHoaDon').filter(r => r.SoHoaDon === 'C26TAA-0000102')[0].SoTien === 0, t2.loi);
const ds = ctx.layBangTongHopHoaDon();
dat('Hoá đơn đính kèm', 'Bảng tổng hợp hoá đơn đọc lại 2 dòng; sửa tay số tiền nguyên được, số lẻ bị từ chối', ds.length === 2 && thu(() => ctx.capNhatHoaDonThuCong(ds[0].maHoaDon, { soHoaDon: 'X', soTien: 1500000 })).ok && !thu(() => ctx.capNhatHoaDonThuCong(ds[0].maHoaDon, { soHoaDon: 'X', soTien: '1.500.000,5' })).ok);
const goiY = ctx.layDanhSachTaiLieuTheoNhaCungCap('CÔNG TY NCC A', 'HS0001');
dat('Hoá đơn đính kèm', 'Gợi ý hoá đơn theo nhà cung cấp hoạt động (nguồn hoá đơn đã tải lên)', Array.isArray(goiY));
const tl = ctx.layTaiLieuTheoHoSo('HS0001');
dat('Hoá đơn đính kèm', 'Danh sách tài liệu của hồ sơ: 2 file, lưu trong thư mục HS0001/HoaDonGTGT', tl.length === 2 && G.goc.con.find(c => c.ten === 'HS0001').con.some(c => c.ten === 'HoaDonGTGT'));
const loaiLa = thu(() => ctx.taiLenTaiLieuHoSo('HS0001', 'Khac', 'x', 'x', enc('x')));
dat('Hoá đơn đính kèm', 'Loại tài liệu không hợp lệ bị từ chối', !loaiLa.ok);

// ---- Khoá trạng thái / huỷ / xoá ----
ctx.capNhatLinkHoSo_('HS0001', 'TrangThai', 'Đã giải ngân'); // dựng sẵn trạng thái; chuyển thật kiểm ở chay_trang_thai.js
const sk = thu(() => ctx.luuHoSoGiaiNgan(pl('HS0001', [dong('A', 1)])));
const xk = thu(() => ctx.xoaHoSo('HS0001'));
dat('Khoá hồ sơ', 'Hồ sơ "Đã giải ngân": không sửa, không xoá, không chuyển về Nháp', !sk.ok && !xk.ok && !thu(() => ctx.chuyenHoSoVeNhap('HS0001')).ok && ctx.layHoSoTheoMa_('HS0001').SoTienNhanNoLanNay === 3500000);
ctx.capNhatLinkHoSo_('HS0001', 'TrangThai', 'Đã hủy');
dat('Khoá hồ sơ', 'Huỷ giải ngân → "Đã hủy"; báo cáo mặc định loại hồ sơ đã huỷ, báo cáo "Đã hủy"/toàn bộ vẫn xem được', ctx.layHoSoTheoMa_('HS0001').TrangThai === 'Đã hủy' && ctx.layBaoCaoTienVay('', '', '', '', '').length === 1 && ctx.layBaoCaoTienVay('', '', '', 'Đã hủy', '').length === 2 && ctx.layBaoCaoTienVay('', '', '', '', '', true).length === 3);
// xoá hồ sơ Nháp: dữ liệu hồ sơ mất nhưng tài liệu đã phát hành (lịch sử + file Drive) giữ nguyên
const file = G.goc.createFolder('x').createFile(new G.Blob(Buffer.from('docx'), 'a', 'phat_hanh.docx'));
ctx.ghiPhatHanh_({ MaTaiLieu: h2.maHoSo + '-DE_NGHI_GIAI_NGAN-L1', MaHoSo: h2.maHoSo, LoaiTaiLieu: 'DE_NGHI_GIAI_NGAN', SoLan: 1, TrangThai: 'Hiệu lực', LinkDocx: file.getUrl(), FileIdChinh: file.getId() });
const xo = thu(() => ctx.xoaHoSo(h2.maHoSo, { xacNhanCoTaiLieu: true }));
dat('Xoá hồ sơ', 'Xoá MỀM hồ sơ Nháp: ẩn khỏi danh sách, KHÔNG xoá dòng/chi tiết; LỊCH SỬ PHÁT HÀNH và file đã phát hành KHÔNG bị xoá', xo.ok && !ctx.layHoSoTheoMa_(h2.maHoSo) && ctx.layChiTietTheoHoSo_(h2.maHoSo).length === 1 && ctx.layLichSuPhatHanh(h2.maHoSo).length === 1 && !file.daXoa, xo.loi);
dat('Nhật ký', 'Nhật ký ghi tạo/xoá mềm', ['TAO_HO_SO', 'XOA_MEM_HO_SO'].every(h => ob('NhatKyHeThong').some(x => x.HanhDong === h)));

in_();
console.log(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi`);
process.exit(loi ? 1 : 0);
