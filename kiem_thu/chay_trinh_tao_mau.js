/* TRÌNH TẠO MẪU (TEMPLATEBUILDER.gs) — vòng khép kín, không dùng file gốc của công ty:
 *  1) đăng ký mẫu HDTD_VND_NHIEU_KHOAN, phát hành 1 chứng từ thật (5 người thụ hưởng) → đó là "file Word thô đã điền số liệu";
 *  2) phanTichTepTho → gợi ý tự động; xoá hàng ví dụ thừa; taoMauTuAnhXa → mẫu mới;
 *  3) đăng ký mẫu mới và phát hành lại cho hồ sơ khác → kết quả phải đúng số liệu của hồ sơ khác;
 *  + các tình huống lỗi (nội dung đổi, chồng vùng, khoá lạ, không phải quản trị, không phải .docx).
 * node kiem_thu/chay_trinh_tao_mau.js <thư_mục_ra> */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_trinh_tao'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
require('./gia_lap_apps_script').khachHangDungRevision(ctx); // trình duyệt đúng quy định: luôn gửi expectedRevision hiện hành
const G = mt.__;
const kq = []; let loi = 0;
const dat = (nhom, ten, ok, g) => { kq.push([nhom, ten, ok ? 'ĐẠT' : 'LỖI', g || '']); if (!ok) loi++; };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
const idUrl = (u) => String(u).split('/').pop();
function in_() { let n = ''; kq.forEach(([a, b, c, d]) => { if (a !== n) { console.log('\n== ' + a); n = a; } console.log(`  [${c}] ${b}${c === 'LỖI' && d ? '  → ' + String(d).slice(0, 300) : ''}`); }); }
process.on('uncaughtException', (e) => { in_(); console.log('LỖI BẤT NGỜ:', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(2); });

ctx.initializeSpreadsheet(); require('./gia_lap_apps_script').dangKyNguoiThuong(ctx);
G.props['ADMIN_EMAILS'] = 'ketoan@example.com';
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HOÀNG ANH KHÔI', maCIF: '0401447476', maSoThue: '0401447476', diaChiTruSo: 'Thửa đất số 1182, tờ bản đồ số 38, thôn Thạch Nham Tây, xã Bà Nà, Đà Nẵng', dienThoai: '0913.413.214', nguoiDaiDien: 'Võ Văn Phụng', chucchVu: 'Giám đốc', chucVu: 'Giám đốc', taiKhoanVND: '562.0.727.934', taiKhoanUSD: '562.0.011.163' });
const hd = ctx.luuHopDong({ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: '02/2026/8100173/HĐTD', ngayHopDong: '2026-09-04', tenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', chiNhanh: 'Chi nhánh Quảng Nam', hanMucVay: 50000000000 });
const b64 = (f) => fs.readFileSync(path.join(GOC, 'mau_that', f)).toString('base64');
function taoHoSo(n, tong, ten0) {
  const co = Math.floor(tong / n);
  const chiTiet = Array.from({ length: n }, (_, i) => ({ tenNguoiHuong: i === 0 ? ten0 : 'CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG ' + i, soTaiKhoan: '1234567' + String(i).padStart(3, '0'), taiNganHang: 'Ngân hàng thử nghiệm - CN Quảng Nam', loaiTien: 'VND', noiDungThanhToan: 'Chuyển tiền bốc xếp theo hóa đơn ' + (12000 + i), loaiChungTu: 'Thanh toán tiền hàng', soTien: i === n - 1 ? tong - co * (n - 1) : co, taiLieuSo: 'HĐ ' + (1000 + i), ngayTaiLieu: '13/10/2026', chuyenTienNhanh: 'N' }));
  return ctx.luuHoSoGiaiNgan({ maHD: hd.maHD, soGiayNhanNo: '02.25/2026/8100173/HĐTD', ngayGiayNhanNo: '2026-10-13', duNoHienTai: 0, loaiTien: 'VND', tyGiaBan: 0, soTienNhanNoLanNay: tong, phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'Thanh toán chi phí', thoiHanChoVayNgay: 178, ngayGiaiNgan: '2026-10-13', ngayDenHan: '2027-04-09', taiLieuChungMinhMucDich: 'Hóa đơn GTGT', nguoiLapBieu: 'Kế toán', chiTiet });
}

// ---------- 1. File Word thô = chứng từ đã phát hành ----------
const r0 = thu(() => ctx.taiMauVanBan({ maMau: 'GOC', tenMau: 'Mẫu gốc', loaiTien: 'VND', loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', dieuKienSoDong: '2+', tenFile: 'g.docx' }, b64('HDTD_VND_NHIEU_KHOAN.docx')));
dat('Chuẩn bị', 'Đăng ký mẫu gốc HDTD_VND_NHIEU_KHOAN', r0.ok, r0.loi);
const hsMa = taoHoSo(5, 463520000, 'CÔNG TY TNHH HOÀNG ANH KHÔI').maHoSo;
const ph = thu(() => ctx.taoDeNghiGiaiNganBIDV(hsMa));
dat('Chuẩn bị', 'Phát hành chứng từ thật 5 người → dùng làm "file Word thô"', ph.ok && ph.v.loaiFile === 'docx', ph.loi);
const tho = G.dsFile[ph.v.fileIdChinh].blob.bytes;
fs.writeFileSync(path.join(RA, 'tho.docx'), tho);
const thoB64 = tho.toString('base64');

// ---------- 2. Phân tích ----------
const pt = thu(() => ctx.phanTichTepTho(thoB64, 'tho.docx'));
dat('Phân tích', 'phanTichTepTho chạy được', pt.ok, pt.loi);
const P = pt.v;
dat('Phân tích', 'Liệt kê đoạn có chữ, kèm vị trí; nhận ra bảng và hàng bảng', P.doan.length > 40 && P.doan.some(d => d.trongBang && d.hangId >= 0 && /^Bảng \d+, hàng \d+, ô \d+$/.test(d.viTri)) && P.doan.every(d => /^word\/.*#\d+$/.test(d.id)));
dat('Phân tích', 'File chưa có {{...}}: daCoPlaceholder = false', P.daCoPlaceholder === false);
const gy = (khoa) => P.goiY.filter(g => g.khoa === khoa);
dat('Phân tích', 'Gợi ý khớp dữ liệu công ty: tên, địa chỉ, MST, điện thoại, tài khoản VND/USD, người đại diện', ['CONG_TY.TEN', 'CONG_TY.DIA_CHI', 'CONG_TY.MA_SO_THUE', 'CONG_TY.DIEN_THOAI', 'CONG_TY.TAI_KHOAN_VND', 'CONG_TY.TAI_KHOAN_USD', 'CONG_TY.NGUOI_DAI_DIEN'].every(k => gy(k).length >= 1), P.goiY.map(g => g.khoa).join(','));
dat('Phân tích', 'Gợi ý khớp dữ liệu hợp đồng: số hợp đồng, ngày ký, tên ngân hàng', ['HOP_DONG.SO_HOP_DONG', 'HOP_DONG.NGAY_KY', 'HOP_DONG.TEN_NGAN_HANG'].every(k => gy(k).length >= 1));
dat('Phân tích', 'Gợi ý theo nhãn: Thời hạn vay, Số tiền vay, Bằng chữ, ngày tháng năm', ['HO_SO.THOI_HAN_VAY', 'HO_SO.SO_TIEN', 'HO_SO.SO_TIEN_BANG_CHU', 'NGAY.GIAI_NGAN_DAY_DU'].every(k => gy(k).length >= 1));
dat('Phân tích', 'Gợi ý bảng thụ hưởng (hàng dữ liệu đầu): STT, nội dung, số tiền, tên, số TK, ngân hàng — số TK/ngân hàng bỏ nhãn "Số TK :" / "Tại :"',
  ['CT.STT_2', 'CT.NOI_DUNG', 'CT.SO_TIEN_QUY_DOI', 'CT.TEN_NGUOI_HUONG', 'CT.SO_TAI_KHOAN', 'CT.NGAN_HANG'].every(k => gy(k).length === 1) && gy('CT.SO_TAI_KHOAN')[0].chuoi === '1234567000' && /^Ngân hàng thử nghiệm/.test(gy('CT.NGAN_HANG')[0].chuoi), JSON.stringify(gy('CT.SO_TAI_KHOAN')));
dat('Phân tích', 'Mọi gợi ý nhất quán với văn bản đoạn (chuoi = text[s,e)), không chồng nhau', P.goiY.every(g => { const d = P.doan.find(x => x.id === g.doan); return d && d.text.substring(g.s, g.e) === g.chuoi; }) &&
  P.goiY.every((g, i) => P.goiY.every((h, j) => i === j || g.doan !== h.doan || g.e <= h.s || h.e <= g.s)));

// ---------- 3. Tạo mẫu: áp dụng gợi ý + xoá hàng thừa ----------
const bangThuHuong = P.doan.filter(d => d.trongBang && gy('CT.STT_2').length && d.bang === P.doan.find(x => x.id === gy('CT.STT_2')[0].doan).bang);
const hangDauDL = P.doan.find(x => x.id === gy('CT.STT_2')[0].doan).hang;
const hangTC = bangThuHuong.find(d => d.text.trim() === 'TC').hang;
const xoa = [...new Set(bangThuHuong.filter(d => d.hang > hangDauDL && d.hang < hangTC).map(d => d.hangId))].map(h => ({ phan: 'word/document.xml', hangId: h }));
const axTC = (() => { const o = bangThuHuong.find(d => d.hang === hangTC && /\d\./.test(d.text)); const m = /[\d.]+/.exec(o.text); return { doan: o.id, s: m.index, e: m.index + m[0].length, chuoi: m[0], khoa: 'BANG_KE.TONG_TIEN_QUY_DOI' }; })();
const ax = P.goiY.map(g => ({ doan: g.doan, s: g.s, e: g.e, chuoi: g.chuoi, khoa: g.khoa })).concat([axTC]);
dat('Tạo mẫu', 'Có 4 hàng ví dụ thừa cần xoá (5 người - 1 hàng mẫu)', xoa.length === 4, JSON.stringify(xoa));
const out = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', ax, xoa));
dat('Tạo mẫu', 'taoMauTuAnhXa thành công, mẫu hợp lệ, có hàng mẫu {{CT.*}}, xoá đúng 4 hàng', out.ok && out.v.hopLe && out.v.coHangMau && out.v.soHangXoa === 4 && out.v.soThay === ax.length, out.loi || JSON.stringify(out.v && out.v.loi));
const mauMoi = Buffer.from(out.v.base64, 'base64'); fs.writeFileSync(path.join(RA, 'mau_moi.docx'), mauMoi);
dat('Tạo mẫu', 'Placeholder trong mẫu mới đủ: CONG_TY.*, HOP_DONG.*, HO_SO.*, CT.*, BANG_KE.*', ['CONG_TY.TEN', 'HOP_DONG.SO_HOP_DONG', 'HO_SO.SO_TIEN', 'CT.TEN_NGUOI_HUONG', 'BANG_KE.TONG_TIEN_QUY_DOI', 'NGAY.GIAI_NGAN_DAY_DU'].every(k => out.v.placeholder.indexOf(k) >= 0));
dat('Tạo mẫu', 'Tên file ra = <tên>_mau.docx', out.v.tenFile === 'tho_mau.docx');

// ---------- 4. Đăng ký mẫu mới và phát hành lại cho hồ sơ KHÁC ----------
ctx.datTrangThaiMau('GOC', 1, 'Hết hiệu lực');
const r1 = thu(() => ctx.taiMauVanBan({ maMau: 'HDTD_MOI', tenMau: 'Mẫu tạo bằng trình tạo', loaiTien: 'VND', loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', dieuKienSoDong: '2+', tenFile: out.v.tenFile }, out.v.base64));
dat('Phát hành lại', 'Đăng ký mẫu do trình tạo sinh ra (qua taiMauVanBan, không sửa code)', r1.ok, r1.loi);
const hs2 = taoHoSo(3, 150000000, 'NGUYỄN VĂN B').maHoSo;
const ph2 = thu(() => ctx.taoDeNghiGiaiNganBIDV(hs2));
dat('Phát hành lại', 'Hồ sơ khác (3 người, 150.000.000) phát hành bằng mẫu mới', ph2.ok && ph2.v.mau === 'HDTD_MOI', ph2.loi);
const bytes2 = G.dsFile[ph2.v.fileIdChinh].blob.bytes; fs.writeFileSync(path.join(RA, 'chung_tu_moi.docx'), bytes2);
fs.writeFileSync(path.join(RA, 'chung_tu_moi.json'), JSON.stringify({ tong: 150000000, ten: ['NGUYỄN VĂN B', 'CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG 1', 'CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG 2'], bangChu: ctx.soThanhChuVN(150000000), soDong: 3 }));
if (ph2.v.pdfUrl) fs.writeFileSync(path.join(RA, 'chung_tu_moi.pdf'), G.dsFile[idUrl(ph2.v.pdfUrl)].blob.bytes);
// tên người hưởng của hồ sơ cũ KHÔNG được lọt vào chứng từ mới
const xmlMoi = require('child_process').execFileSync('unzip', ['-p', path.join(RA, 'chung_tu_moi.docx'), 'word/document.xml']).toString('utf8');
const chu = xmlMoi.replace(/<[^>]+>/g, ' ');
dat('Phát hành lại', 'Chứng từ mới mang số liệu hồ sơ MỚI (150.000.000, 3 người) và không còn số liệu hồ sơ gốc (463.520.000)', /150\.000\.000/.test(chu) && /NGUYỄN VĂN B/.test(chu) && !/463\.520\.000/.test(chu) && (chu.match(/CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG/g) || []).length === 2);
dat('Phát hành lại', 'Không còn {{ }}; bằng chữ đúng "Một trăm năm mươi triệu đồng chẵn"', !/\{\{|\}\}/.test(chu) && /Một trăm năm mươi triệu đồng chẵn/.test(chu));

// ---------- 5. Lỗi ----------
const base = { doan: ax[0].doan, s: ax[0].s, e: ax[0].e, chuoi: ax[0].chuoi, khoa: ax[0].khoa };
let t = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', [Object.assign({}, base, { chuoi: 'chữ khác' })], []));
dat('Lỗi', 'Nội dung vùng đã đổi so với lúc chọn → từ chối, nêu lý do', !t.ok && /đã khác lúc chọn/.test(t.loi), t.loi);
t = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', [base, Object.assign({}, base, { s: base.s + 1, e: base.e - 1, chuoi: base.chuoi.substring(1, base.chuoi.length - 1) })], []));
dat('Lỗi', 'Hai vùng chồng nhau → từ chối', !t.ok && /chồng/.test(t.loi), t.loi);
t = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', [Object.assign({}, base, { khoa: 'CONG_TY.KHONG_CO' })], []));
dat('Lỗi', 'Khoá không có trong danh mục placeholder → từ chối', !t.ok && /không có trong danh mục/.test(t.loi), t.loi);
t = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', [Object.assign({}, base, { e: 999999, chuoi: 'x' })], []));
dat('Lỗi', 'Vị trí ngoài đoạn → từ chối', !t.ok && /ngoài đoạn/.test(t.loi), t.loi);
t = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', [Object.assign({}, base, { doan: 'word/document.xml#99999' })], []));
dat('Lỗi', 'Mã đoạn không tồn tại → từ chối (không âm thầm bỏ qua)', !t.ok && /không áp dụng được/.test(t.loi), t.loi);
t = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', [], []));
dat('Lỗi', 'Chưa chọn vùng nào → từ chối', !t.ok && /Chưa chọn vùng/.test(t.loi), t.loi);
t = thu(() => ctx.phanTichTepTho(thoB64, 'tho.xlsx'));
dat('Lỗi', 'File không phải .docx → từ chối', !t.ok && /\.docx/.test(t.loi), t.loi);
t = thu(() => ctx.phanTichTepTho(Buffer.from('không phải zip').toString('base64'), 'x.docx'));
dat('Lỗi', 'File .docx hỏng (không giải nén được) → thông báo rõ', !t.ok && /Không mở được file/.test(t.loi), t.loi);
mt.__email = 'nguoila@example.com';
t = thu(() => ctx.phanTichTepTho(thoB64, 'tho.docx')); const t2 = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', ax, xoa));
dat('Lỗi', 'Không phải quản trị: bị chặn phân tích và tạo mẫu', !t.ok && !t2.ok && /quyền quản trị|dành cho Quản trị/.test(t.loi) && /quyền quản trị|dành cho Quản trị/.test(t2.loi));
mt.__email = 'ketoan@example.com';

// ---------- 6. Chèn tại vị trí (không thay chữ) + căn lề ----------
const dTL = P.doan.find(d => /^Tài liệu liên quan/.test(d.text));
const cuoi = dTL.text.length;
t = thu(() => ctx.taoMauTuAnhXa(thoB64, 'tho.docx', [{ doan: dTL.id, s: cuoi, e: cuoi, chuoi: '', khoa: 'HO_SO.TAI_LIEU_CHUNG_MINH' }], []));
let xmlT = '';
if (t.ok) { fs.writeFileSync(path.join(RA, 'chen.docx'), Buffer.from(t.v.base64, 'base64')); xmlT = require('child_process').execFileSync('unzip', ['-p', path.join(RA, 'chen.docx'), 'word/document.xml']).toString('utf8'); }
const vanChen = xmlT.replace(/<w:tab\/>/g, '\t').replace(/<[^>]+>/g, '');
dat('Chèn', 'Chèn {{HO_SO.TAI_LIEU_CHUNG_MINH}} cuối đoạn "Tài liệu liên quan: Hóa đơn GTGT", TRƯỚC <w:tab/>; không mất chữ nào', /Tài liệu liên quan: Hóa đơn GTGT\{\{HO_SO\.TAI_LIEU_CHUNG_MINH\}\}\t/.test(vanChen), t.loi || (vanChen.match(/Tài liệu liên quan[^\n]{0,80}/) || [''])[0]);
const sttMau = out.ok ? require('child_process').execFileSync('unzip', ['-p', path.join(RA, 'mau_moi.docx'), 'word/document.xml']).toString('utf8') : '';
const tienParas = (sttMau.match(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?\{\{CT\.SO_TIEN_QUY_DOI\}\}(?:(?!<w:p[ >])[\s\S])*?<\/w:p>/) || [''])[0];
const sttParas = (sttMau.match(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?\{\{CT\.STT_2\}\}(?:(?!<w:p[ >])[\s\S])*?<\/w:p>/) || [''])[0];
const tenParas = (sttMau.match(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?\{\{CT\.TEN_NGUOI_HUONG\}\}(?:(?!<w:p[ >])[\s\S])*?<\/w:p>/) || [''])[0];
dat('Căn lề', 'Ô tiền trong bảng → canh phải; STT → canh giữa; tên → canh trái (đúng quy ước)', /<w:jc w:val="right"\/>/.test(tienParas) && /<w:jc w:val="center"\/>/.test(sttParas) && /<w:jc w:val="left"\/>/.test(tenParas), [tienParas.match(/<w:jc[^>]*>/), sttParas.match(/<w:jc[^>]*>/), tenParas.match(/<w:jc[^>]*>/)].join(' | '));

in_();
console.log(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi`);
fs.writeFileSync(path.join(RA, 'ket_qua.txt'), kq.map(x => x.join(' | ')).join('\n'));
process.exit(loi ? 1 : 0);
