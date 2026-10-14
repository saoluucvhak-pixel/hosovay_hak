/* TÍCH HỢP với 5 MẪU THẬT (mau_that/*): đăng ký mẫu → tạo hồ sơ → Tạo trọn bộ (DOCX + XLSX) → kiểm tra link/lịch sử/dữ liệu bắt buộc/
 * chống sửa mẫu/chế độ B... Dịch vụ Apps Script được GIẢ LẬP (gia_lap_apps_script.js); PDF do LibreOffice tạo.
 * node kiem_thu/chay_tich_hop_mau_that.js <thư_mục_ra>  →  python3 kiem_thu/kiem_tra_mau_that.py <thư_mục_ra> */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || '/tmp/hosovay_ih_mau_that'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
const G = mt.__;
const kq = []; let loi = 0;
const dat = (nhom, ten, ok, g) => { kq.push([nhom, ten, ok ? 'ĐẠT' : 'LỖI', g || '']); if (!ok) loi++; };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
const b64 = (f) => fs.readFileSync(path.join(GOC, 'mau_that', f)).toString('base64');
const idUrl = (u) => String(u).split('/').pop();
const bang = (ma) => ctx.sheetToObjects_('HoSoGiaiNgan').filter(x => x.MaHoSo === ma)[0];
process.on('uncaughtException', (e) => { in_(); console.log('LỖI BẤT NGỜ:', e.stack.split('\n').slice(0, 5).join('\n')); process.exit(2); });
function in_() { let n = ''; kq.forEach(([a, b, c, d]) => { if (a !== n) { console.log('\n== ' + a); n = a; } console.log(`  [${c}] ${b}${c === 'LỖI' && d ? '  → ' + String(d).slice(0, 300) : ''}`); }); }

ctx.initializeSpreadsheet();
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HOÀNG ANH KHÔI', maCIF: '0401447476', maSoThue: '0401447476', diaChiTruSo: 'Thửa đất số 1182, tờ bản đồ số 38, thôn Thạch Nham Tây, xã Bà Nà, Đà Nẵng', dienThoai: '0913.413.214', nguoiDaiDien: 'Võ Văn Phụng', chucVu: 'Giám đốc', taiKhoanVND: '562.0.727.934', taiKhoanUSD: '562.0.011.163' });
const hd = ctx.luuHopDong({ maCty: cty.maCty, soHopDong: '02/2026/8100173/HĐTD', ngayHopDong: '2026-09-04', tenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', chiNhanh: 'Chi nhánh Quảng Nam', diaChiChiNhanh: 'Xã Xuân Phú, thành phố Đà Nẵng', dienThoaiNH: '0235.3687888', giayUyQuyenNH: '993/GUQ-BIDV.QNA ngày 01/07/2026', hanMucVay: 50000000000, soHopDongKhungMBNT: '01/2026/MBNT/BIDV-HAK', ngayHopDongKhungMBNT: '2026-01-05' });
G.props['ADMIN_EMAILS'] = 'ketoan@example.com';

// ---------- 1. Đăng ký 5 mẫu thật ----------
const MAU = [
  ['HDTD_USD_1', 'HDTD_USD_1_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '1'], ['HDTD_USD_N', 'HDTD_USD_NHIEU_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '2-999'],
  ['UNC_BIDV', 'UNC_1_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '1'], ['BANG_KE_BIDV', 'BANG_KE_NHIEU_KHOAN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '2+'],
  ['HDMB_BIDV', 'HDMB_USD.docx', 'USD', 'HDMB_NGOAI_TE', '1+'],
  ['HDTD_VND_1', 'HDTD_VND_1_KHOAN.docx', 'VND', 'DE_NGHI_GIAI_NGAN', '1'], ['HDTD_VND_N', 'HDTD_VND_NHIEU_KHOAN.docx', 'VND', 'DE_NGHI_GIAI_NGAN', '2-999']
];
MAU.forEach(([ma, f, lt, lct, dk]) => {
  const r = thu(() => ctx.taiMauVanBan({ maMau: ma, tenMau: 'Mẫu thật ' + ma, nganHang: 'BIDV', loaiTien: lt, loaiTaiLieu: lct, dieuKienSoDong: dk, tenFile: f }, b64(f)));
  dat('Tải mẫu thật', `${f}: tải thành công (${r.ok ? r.v.loaiFile + ', ' + r.v.placeholder.length + ' placeholder' : ''})`, r.ok && r.v.phienBan === 1, r.loi);
});
const ds = ctx.layDanhSachMauVanBan();
dat('Tải mẫu thật', 'Có 5 mẫu DOCX + 2 mẫu XLSX; điều kiện số dòng "2+" = 2–9999', ds.length === 7 && ds.filter(m => m.loaiFile === 'xlsx').length === 2 && ds.find(m => m.maMau === 'BANG_KE_BIDV').dieuKien === '2+');
const dsUnc = ctx.layDanhSachMauVanBan().find(m => m.maMau === 'UNC_BIDV');
dat('Tải mẫu thật', 'Mẫu UNC (Excel nhiều hàng chứa {{CT.*}}) được CẢNH BÁO chỉ dùng cho 1 người thụ hưởng', /chỉ dùng được cho hồ sơ có đúng 1 người/.test(dsUnc.canhBao), dsUnc.canhBao);
dat('Tải mẫu thật', 'Tải mẫu Word KHÔNG hiện cảnh báo giả "Hồ sơ không có dòng thụ hưởng"', ds.filter(m => m.loaiFile === 'docx').every(m => !/không có dòng thụ hưởng/.test(m.canhBao)), JSON.stringify(ds.map(m => m.canhBao)));
const kiemLai = ctx.kiemTraLaiMau('UNC_BIDV', 1);
dat('Tải mẫu thật', 'Kiểm tra lại mẫu: nguyên vẹn (hash), hợp lệ', kiemLai.hopLe && kiemLai.nguyenVen, JSON.stringify(kiemLai.loi));

// ---------- 2. Hồ sơ + trọn bộ ----------
const tenNhan = (i) => i === 0 ? 'CÔNG TY TNHH HOÀNG ANH KHÔI' : 'CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG ' + i;
function taoHoSo(lt, n, tong, tyGia, extra) {
  const co = Math.floor(tong / n);
  const chiTiet = Array.from({ length: n }, (_, i) => ({ tenNguoiHuong: tenNhan(i), soTaiKhoan: '1234567' + String(i).padStart(3, '0'), taiNganHang: 'Ngân hàng thử nghiệm - CN Quảng Nam', loaiTien: lt, noiDungThanhToan: i === 0 ? 'Giải ngân mua keo lá tràm' : 'Chuyển tiền bốc xếp theo hóa đơn ' + (12000 + i), loaiChungTu: 'Thanh toán tiền hàng', soTien: i === n - 1 ? tong - co * (n - 1) : co, taiLieuSo: i === 0 ? 'UNC' : 'HĐ ' + (1000 + i), ngayTaiLieu: '13/10/2026', chuyenTienNhanh: 'N' }));
  return ctx.luuHoSoGiaiNgan(Object.assign({ maHD: hd.maHD, soGiayNhanNo: '02.25/2026/8100173/HĐTD', ngayGiayNhanNo: '2026-10-13', duNoHienTai: 0, loaiTien: lt, tyGiaBan: lt === 'USD' ? tyGia : 0, soTienNhanNoLanNay: tong, phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'Thanh toán chi phí của công ty', thoiHanChoVayNgay: 178, ngayGiaiNgan: '2026-10-13', ngayDenHan: '2027-04-09', taiLieuChungMinhMucDich: 'Hóa đơn GTGT', nguoiLapBieu: 'Kế toán', chiTiet }, extra || {}));
}
const KB = [['USD', 1, 25000], ['USD', 5, 25000], ['USD', 20, 25000], ['VND', 5, 463520000]];
const hsKB = {};
KB.forEach(([lt, n, tong], idx) => {
  const nhan = `${lt} ${tong.toLocaleString('vi-VN')} – ${n} dòng`;
  const ma = taoHoSo(lt, n, tong, 25810).maHoSo; hsKB[nhan] = ma;
  const r = thu(() => ctx.taoTronBoTheoMau(ma));
  dat('Trọn bộ', `${nhan}: tạo trọn bộ thành công`, r.ok, r.loi);
  if (!r.ok) return;
  const R = r.v, usd = lt === 'USD';
  const mauDN = usd ? (n === 1 ? 'HDTD_USD_1' : 'HDTD_USD_N') : (n === 1 ? 'HDTD_VND_1' : 'HDTD_VND_N');
  dat('Trọn bộ', `${nhan}: Đề nghị dùng mẫu ${mauDN}`, R.vanBanDeNghi.mau === mauDN && R.vanBanDeNghi.loaiFile === 'docx');
  const mauCT = n === 1 ? 'UNC_BIDV' : 'BANG_KE_BIDV';
  dat('Trọn bộ', `${nhan}: Chứng từ thanh toán = ${mauCT} (${n === 1 ? 'UNC 1 người' : 'Bảng kê nhiều người'}) dạng XLSX`, R.chungTuThanhToan.mau === mauCT && R.chungTuThanhToan.loaiFile === 'xlsx');
  dat('Trọn bộ', `${nhan}: ${usd ? 'có' : 'KHÔNG có'} Hợp đồng mua bán ngoại tệ`, usd ? (R.hdmbNgoaiTe && R.hdmbNgoaiTe.mau === 'HDMB_BIDV') : R.hdmbNgoaiTe === null);
  const row = bang(ma);
  dat('Link', `${nhan}: XLSX → cột _XLSX (file .xlsx thật), PDF → cột _PDF (%PDF), _DOCX trống`, row.Link_ChungTuThanhToan_XLSX === R.chungTuThanhToan.xlsxUrl && !row.Link_ChungTuThanhToan_DOCX && row.Link_ChungTuThanhToan_PDF === R.chungTuThanhToan.pdfUrl &&
    G.dsFile[idUrl(row.Link_ChungTuThanhToan_PDF)].blob.bytes.slice(0, 4).toString() === '%PDF' && /\.xlsx$/.test(G.dsFile[idUrl(row.Link_ChungTuThanhToan_XLSX)].getName()));
  if (usd) dat('Link', `${nhan}: Đề nghị → _DOCX/_PDF đúng; HDMB → _DOCX/_PDF đúng`, row.Link_VanBanDeNghi_DOCX === R.vanBanDeNghi.docxUrl && row.Link_VanBanDeNghi_PDF === R.vanBanDeNghi.pdfUrl && row.Link_HDMBNgoaiTe_DOCX === R.hdmbNgoaiTe.docxUrl && row.Link_HDMBNgoaiTe_PDF === R.hdmbNgoaiTe.pdfUrl);
  // tệp lưu đúng thư mục DOCX/ XLSX/ PDF/ của hồ sơ
  const thuMucHS = G.goc.con.find(c => c.ten === ma);
  const tenCon = thuMucHS ? thuMucHS.con.map(c => c.ten).sort().join(',') : '';
  dat('Lưu trữ', `${nhan}: thư mục hồ sơ có DOCX,PDF,XLSX`, tenCon === 'DOCX,PDF,XLSX', tenCon);
  const dsLS = ctx.layLichSuPhatHanh(ma);
  dat('Lịch sử', `${nhan}: ghi ${usd ? 3 : 2} tài liệu, đều "Hiệu lực", có hash dữ liệu + hash mẫu`, dsLS.length === (usd ? 3 : 2) && dsLS.every(x => x.trangThai === 'Hiệu lực'));
  // lưu file để kiểm tra độc lập bằng Python
  const dsd = ctx.taoDanhSachBienDong_(ctx.layDuLieuDayDu(ma));
  const luu = (x, ten, mauFile, lai) => { fs.writeFileSync(path.join(RA, ten + path.extname(mauFile)), G.dsFile[x.fileIdChinh].blob.bytes); if (x.pdfUrl) fs.writeFileSync(path.join(RA, ten + '.pdf'), G.dsFile[idUrl(x.pdfUrl)].blob.bytes);
    const tongQd = dsd.reduce((a, c) => a + ctx.docTienNguyen_(c['CT.SO_TIEN_QUY_DOI']), 0);
    fs.writeFileSync(path.join(RA, ten + '.json'), JSON.stringify({ ten, mau: mauFile, loai: lt, soDong: n, tongTien: tong, tongBangSo: ctx.formatSo_(tong), tongQuyDoi: tongQd, tongBangChu: ctx.soTienUSDBangChu_ ? (usd ? ctx.soTienUSDBangChu_(tong) : ctx.soThanhChuVN(tong)) : '', cacDong: dsd.map(c => ({ ten: c['CT.TEN_NGUOI_HUONG'], soTien: c['CT.SO_TIEN'], quyDoi: c['CT.SO_TIEN_QUY_DOI'] })), engine: { conLai: [], conNgoac: [] } })); };
  luu(R.vanBanDeNghi, `ih${idx + 1}_hdtd`, (usd ? 'HDTD_USD_' : 'HDTD_VND_') + (n === 1 ? '1_KHOAN.docx' : 'NHIEU_KHOAN.docx'));
  if (usd) { luu(R.hdmbNgoaiTe, `ih${idx + 1}_hdmb`, 'HDMB_USD.docx'); }
  luu(R.chungTuThanhToan, `ih${idx + 1}_ct`, n === 1 ? 'UNC_1_KHOAN.xlsx' : 'BANG_KE_NHIEU_KHOAN.xlsx');
});

// ---------- 3. Danh sách chứng từ hồ sơ + xem trước ----------
const maU5 = hsKB['USD 25.000 – 5 dòng'];
const dsCT = ctx.layDanhSachChungTuHoSo(maU5);
dat('Danh sách chứng từ', 'Hiện đủ 3 tài liệu cho hồ sơ USD (Đề nghị, Bảng kê, HDMB) kèm mẫu/phiên bản/ngân hàng/loại tiền/người tạo', dsCT.length === 3 && dsCT.every(x => x.maMau && x.phienBanMau === 1 && x.nganHang === 'BIDV' && x.loaiTien === 'USD' && x.trangThai === 'Đã phát hành' && x.nguoiTao && x.linkPdf), JSON.stringify(dsCT.map(x => x.maMau)));
dat('Danh sách chứng từ', 'Tên tài liệu thể hiện "Bảng kê ... 5 người thụ hưởng"', /Bảng kê.*5 người/.test(dsCT[1].tenTaiLieu), dsCT[1].tenTaiLieu);
const soLsTruoc = ctx.layLichSuPhatHanh(maU5).length;
const xt = thu(() => ctx.xemTruocChungTu(maU5, 'CHUNG_TU_THANH_TOAN'));
dat('Xem trước', 'Xem trước chứng từ hồ sơ: có file + PDF, KHÔNG ghi lịch sử phát hành', xt.ok && xt.v.linkFile && xt.v.linkPdf && ctx.layLichSuPhatHanh(maU5).length === soLsTruoc, xt.loi);
const xtm = thu(() => ctx.xemTruocMau('BANG_KE_BIDV', 1, ''));
dat('Xem trước', 'Xem trước MẪU với dữ liệu thử: đạt, tạo file XLSX + PDF, không đụng dữ liệu sản xuất', xtm.ok && xtm.v.dat && xtm.v.duLieu === 'dữ liệu thử' && xtm.v.linkPdf && ctx.sheetToObjects_('HoSoGiaiNgan').length === KB.length, xtm.loi || JSON.stringify(xtm.v && xtm.v.loi));
const xtd = thu(() => ctx.xemTruocMau('HDTD_USD_N', 1, ''));
dat('Xem trước', 'Xem trước mẫu DOCX nhiều khoản với dữ liệu thử: đạt', xtd.ok && xtd.v.dat && xtd.v.soDong >= 2, xtd.loi || JSON.stringify(xtd.v && xtd.v.loi));

// ---------- 4. Dữ liệu bắt buộc ----------
const maThieu = taoHoSo('USD', 2, 25000, 25810).maHoSo;
const shCty = G.boDuLieu.getSheetByName('DM_CongTy'); const hC = shCty.g[0];
const cu = shCty.g[1][hC.indexOf('NguoiDaiDien')]; shCty.g[1][hC.indexOf('NguoiDaiDien')] = '';
const thieu = thu(() => ctx.taoDeNghiGiaiNganBIDV(maThieu));
dat('Dữ liệu bắt buộc', 'Thiếu người đại diện (bắt buộc, mẫu có dùng) → chặn, nêu {{CONG_TY.NGUOI_DAI_DIEN}} + nguồn DM_CongTy.NguoiDaiDien', !thieu.ok && /\{\{CONG_TY\.NGUOI_DAI_DIEN\}\}/.test(thieu.loi) && /DM_CongTy\.NguoiDaiDien/.test(thieu.loi), thieu.loi);
const lsLoi = ctx.layLichSuPhatHanh(maThieu).filter(x => x.trangThai === 'Lỗi');
dat('Dữ liệu bắt buộc', 'Lần lỗi được GHI vào lịch sử (trạng thái Lỗi + thông báo), không chiếm số lần phát hành', lsLoi.length === 1 && /NGUOI_DAI_DIEN/.test(lsLoi[0].thongBaoLoi), JSON.stringify(lsLoi));
shCty.g[1][hC.indexOf('Fax')] = ''; // Fax tuỳ chọn: trống không chặn
shCty.g[1][hC.indexOf('NguoiDaiDien')] = cu;
const ok2 = thu(() => ctx.taoDeNghiGiaiNganBIDV(maThieu));
dat('Dữ liệu bắt buộc', 'Bổ sung dữ liệu → phát hành được (L1 vì lần lỗi không chiếm số)', ok2.ok && ok2.v.soLan === 1, ok2.loi);

// ---------- 5. Mẫu là bất biến ----------
const mauGoc = ctx.sheetToObjects_('DM_MauVanBan').find(m => m.MaMau === 'UNC_BIDV');
const tep = G.dsFile[mauGoc.FileDocxId]; const byteCu = Buffer.from(tep.blob.bytes); tep.blob.bytes = Buffer.concat([byteCu, Buffer.from('x')]);
const hong = thu(() => ctx.taoChungTuThanhToan(taoHoSo('USD', 1, 25000, 25810).maHoSo));
dat('Bất biến mẫu', 'File mẫu bị sửa ngoài hệ thống (hash khác) → CHẶN phát hành, yêu cầu tải phiên bản mới', !hong.ok && /đã bị thay đổi/.test(hong.loi), hong.loi);
const kl = ctx.kiemTraLaiMau('UNC_BIDV', 1);
dat('Bất biến mẫu', 'Kiểm tra lại mẫu phát hiện thay đổi', !kl.hopLe && !kl.nguyenVen);
tep.blob.bytes = byteCu;
const khoiPhuc = thu(() => ctx.taoChungTuThanhToan(taoHoSo('USD', 1, 25000, 25810).maHoSo));
dat('Bất biến mẫu', 'Khôi phục file đúng → phát hành lại được', khoiPhuc.ok, khoiPhuc.loi);

// ---------- 6. Phiên bản/khôi phục/mặc định/lịch sử mẫu ----------
const v2 = thu(() => ctx.taiMauVanBan({ maMau: 'UNC_BIDV', tenMau: 'UNC bản 2', nganHang: 'BIDV', loaiTien: 'TAT_CA', loaiTaiLieu: 'CHUNG_TU_THANH_TOAN', dieuKienSoDong: '1', tenFile: 'UNC_1_KHOAN.xlsx', macDinh: true }, b64('UNC_1_KHOAN.xlsx')));
dat('Phiên bản mẫu', 'Tải lại cùng mã → v2, đặt mặc định', v2.ok && v2.v.phienBan === 2 && ctx.layDanhSachMauVanBan().find(m => m.maMau === 'UNC_BIDV' && m.phienBan === 2).macDinh, v2.loi);
dat('Phiên bản mẫu', 'Chọn mẫu → v2 (hiệu lực, cache đã được làm mới)', ctx.chonMauTaiLieu_('CHUNG_TU_THANH_TOAN', 'USD', 1, 'BIDV').PhienBan === 2);
ctx.datTrangThaiMau('UNC_BIDV', 1, 'Hiệu lực');
dat('Phiên bản mẫu', 'KHÔI PHỤC v1 → v1 hiệu lực, v2 hết hiệu lực', ctx.chonMauTaiLieu_('CHUNG_TU_THANH_TOAN', 'USD', 1, 'BIDV').PhienBan === 1);
const lsm = ctx.layLichSuChinhSuaMau('UNC_BIDV');
dat('Phiên bản mẫu', 'Lịch sử chỉnh sửa mẫu ghi đủ: tải lên, đổi trạng thái, mặc định', lsm.some(x => x.hanhDong === 'MAU_TAI_LEN') && lsm.some(x => x.hanhDong === 'MAU_DOI_TRANG_THAI') && lsm.some(x => x.hanhDong === 'MAU_MAC_DINH'), JSON.stringify(lsm.map(x => x.hanhDong)));

// ---------- 7. Mở bằng Google ----------
const lsU5 = ctx.layLichSuPhatHanh(maU5).find(x => x.loaiTaiLieu === 'CHUNG_TU_THANH_TOAN');
const g1 = thu(() => ctx.moBanGoogleCuaTaiLieu(lsU5.maTaiLieu)), g2 = thu(() => ctx.moBanGoogleCuaTaiLieu(lsU5.maTaiLieu));
dat('Mở bằng Google', 'Tạo bản Google Sheets từ XLSX đã phát hành (không đụng file gốc); lần 2 dùng lại bản đã tạo', g1.ok && g1.v.moi && g2.ok && !g2.v.moi && g1.v.url === g2.v.url, g1.loi || g2.loi);

// ---------- 8. Chế độ B (bộ xử lý ngoài) ----------
let goiNgoai = 0;
mt.__fetch = (url, opts) => { goiNgoai++; const j = JSON.parse(opts.payload);
  const blob = new G.Blob(Buffer.from(j.mau, 'base64'), 'x', 'mau.' + j.loaiFile);
  const r = j.loaiFile === 'xlsx' ? ctx.xlsxDienMau_(blob, j.bien, j.dong, j.tenRa) : ctx.docxDienMau_(blob, j.bien, j.dong, j.tenRa);
  return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ tep: r.blob.bytes.toString('base64'), conLai: r.conLai, canhBao: r.canhBao, conNgoac: r.conNgoac, soHangMau: r.soHangMau, soHangTao: r.soHangTao }) }; };
const maB = taoHoSo('USD', 5, 25000, 25810).maHoSo;
const macDinhB = thu(() => ctx.taoHopDongMuaBanNgoaiTe(maB));
dat('Chế độ B', 'Mặc định KHÔNG gọi dịch vụ ngoài', macDinhB.ok && goiNgoai === 0, macDinhB.loi);
G.props['CH_CHE_DO_RENDER'] = 'EXTERNAL';
const chuaUrl = thu(() => ctx.taoDeNghiGiaiNganBIDV(maB));
dat('Chế độ B', 'Bật EXTERNAL nhưng chưa cấu hình URL → báo lỗi rõ, không âm thầm gọi ra ngoài', !chuaUrl.ok && /CH_RENDER_URL/.test(chuaUrl.loi) && goiNgoai === 0, chuaUrl.loi);
G.props['CH_RENDER_URL'] = 'https://render.example/api'; G.props['CH_RENDER_TOKEN'] = 'T0KEN';
const ngoai = thu(() => ctx.taoDeNghiGiaiNganBIDV(maB));
dat('Chế độ B', 'Cấu hình URL → phát hành qua bộ xử lý ngoài (adapter) và vẫn qua kiểm tra/lưu/lịch sử', ngoai.ok && goiNgoai === 1 && ngoai.v.nguon === 'MAU_DOCX' && ngoai.v.soLan === 1, ngoai.loi || ('goi=' + goiNgoai + ' soLan=' + (ngoai.v && ngoai.v.soLan) + ' daCo=' + (ngoai.v && ngoai.v.daCo)));
G.props['CH_CHE_DO_RENDER'] = 'XML'; delete G.props['CH_RENDER_URL'];

// ---------- Loại hồ sơ giải ngân (tuỳ chọn bộ chứng từ) ----------
const dsLoai0 = ctx.layLoaiHoSoGiaiNgan();
dat('Loại hồ sơ', 'Mặc định có 2 loại: "Giải ngân theo HĐTD" (đủ bộ) và "Không dùng HĐTD"', dsLoai0.length === 2 && dsLoai0[0].ten === 'Giải ngân theo HĐTD' && dsLoai0[0].deNghi && dsLoai0[1].ten === 'Không dùng HĐTD' && !dsLoai0[1].deNghi && dsLoai0[1].chungTu);
const hsKhongHD = taoHoSo('USD', 2, 25000, 25810, { loaiHoSoGiaiNgan: 'Không dùng HĐTD' });
dat('Loại hồ sơ', 'Hồ sơ lưu đúng loại đã chọn (cột LoaiHoSoGiaiNgan)', bang(hsKhongHD.maHoSo).LoaiHoSoGiaiNgan === 'Không dùng HĐTD', JSON.stringify(bang(hsKhongHD.maHoSo)));
const dsCtKhong = ctx.layDanhSachChungTuHoSo(hsKhongHD.maHoSo);
dat('Loại hồ sơ', 'Danh sách chứng từ của hồ sơ "Không dùng HĐTD" (USD): chỉ Bảng kê + HĐMB, KHÔNG có Văn bản đề nghị', dsCtKhong.length === 2 && dsCtKhong.every(x => x.loaiTaiLieu !== 'DE_NGHI_GIAI_NGAN') && dsCtKhong[0].loaiHoSo === 'Không dùng HĐTD', JSON.stringify(dsCtKhong.map(x => x.loaiTaiLieu)));
const trKhong = thu(() => ctx.taoTronBoTheoMau(hsKhongHD.maHoSo));
dat('Loại hồ sơ', 'Tạo trọn bộ hồ sơ "Không dùng HĐTD": vẫn có UNC/Bảng kê + HĐMB (USD), vanBanDeNghi = null', trKhong.ok && trKhong.v.vanBanDeNghi === null && trKhong.v.chungTuThanhToan && trKhong.v.chungTuThanhToan.mau === 'BANG_KE_BIDV' && trKhong.v.hdmbNgoaiTe && trKhong.v.loaiHoSo === 'Không dùng HĐTD', trKhong.loi);
dat('Loại hồ sơ', 'Không phát hành văn bản đề nghị cho hồ sơ này (lịch sử chỉ có 2 tài liệu)', ctx.layLichSuPhatHanh(hsKhongHD.maHoSo).filter(x => x.trangThai === 'Hiệu lực').length === 2 && !bang(hsKhongHD.maHoSo).Link_VanBanDeNghi_DOCX);
const gKhong = thu(() => ctx.taoDeNghiGiaiNganBIDV(hsKhongHD.maHoSo));
dat('Loại hồ sơ', 'Gọi riêng "Tạo văn bản đề nghị" cho hồ sơ loại này → báo rõ nguyên nhân, không tạo file', !gKhong.ok && /không dùng "Văn bản đề nghị giải ngân"/.test(gKhong.loi) && /Không dùng HĐTD/.test(gKhong.loi), gKhong.loi);
const hsVndKhong = taoHoSo('VND', 2, 463520000, 0, { loaiHoSoGiaiNgan: 'Không dùng HĐTD' });
const trVnd = thu(() => ctx.taoTronBoTheoMau(hsVndKhong.maHoSo));
dat('Loại hồ sơ', 'Hồ sơ VND "Không dùng HĐTD": chỉ có Bảng kê (không HĐMB vì VND)', trVnd.ok && trVnd.v.vanBanDeNghi === null && trVnd.v.hdmbNgoaiTe === null && trVnd.v.chungTuThanhToan.mau === 'BANG_KE_BIDV', trVnd.loi);
const hsCu = taoHoSo('USD', 2, 25000, 25810); // không chọn loại (hồ sơ cũ) → loại đầu tiên = đủ bộ
dat('Loại hồ sơ', 'Hồ sơ chưa có loại (như hồ sơ cũ) → dùng loại ĐẦU TIÊN: đủ 3 chứng từ như trước', ctx.layDanhSachChungTuHoSo(hsCu.maHoSo).length === 3);
// Người dùng tự đặt loại mới: "Chỉ UNC"
const luuLoai = thu(() => ctx.luuLoaiHoSoGiaiNgan([{ ten: 'Giải ngân theo HĐTD', deNghi: true, chungTu: true, hdmb: true }, { ten: ' Chỉ UNC ', deNghi: false, chungTu: true, hdmb: false }]));
dat('Loại hồ sơ', 'Quản trị tự thêm loại "Chỉ UNC" (bỏ HĐTD và HĐMB)', luuLoai.ok && ctx.layLoaiHoSoGiaiNgan().length === 2 && ctx.layLoaiHoSoGiaiNgan()[1].ten === 'Chỉ UNC', luuLoai.loi);
const hsChiUnc = taoHoSo('USD', 1, 25000, 25810, { loaiHoSoGiaiNgan: 'Chỉ UNC' });
const trUnc = thu(() => ctx.taoTronBoTheoMau(hsChiUnc.maHoSo));
dat('Loại hồ sơ', 'Hồ sơ USD loại "Chỉ UNC": chỉ UNC, không HĐTD, không HĐMB', trUnc.ok && trUnc.v.vanBanDeNghi === null && trUnc.v.hdmbNgoaiTe === null && trUnc.v.chungTuThanhToan.mau === 'UNC_BIDV', trUnc.loi);
// Đổi loại của hồ sơ đã có (cập nhật): lưu lại với loại khác
const capNhatLoai = thu(() => ctx.luuHoSoGiaiNgan({ maHoSo: hsChiUnc.maHoSo, maHD: hd.maHD, loaiTien: 'USD', tyGiaBan: 25810, soGiayNhanNo: '02.25/2026/8100173/HĐTD', ngayGiayNhanNo: '2026-10-13', duNoHienTai: 0, soTienNhanNoLanNay: 25000, phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'x', thoiHanChoVayNgay: 178, ngayGiaiNgan: '2026-10-13', ngayDenHan: '2027-04-09', loaiHoSoGiaiNgan: 'Giải ngân theo HĐTD', chiTiet: ctx.layChiTietTheoHoSo(hsChiUnc.maHoSo).map(c => ({ tenNguoiHuong: c.TenNguoiHuong, soTaiKhoan: c.SoTaiKhoan, taiNganHang: c.TaiNganHang, loaiTien: 'USD', noiDungThanhToan: c.NoiDungThanhToan, soTien: c.SoTien, taiLieuSo: c.TaiLieuSo, ngayTaiLieu: '13/10/2026' })) }));
dat('Loại hồ sơ', 'Đổi loại của hồ sơ đã lưu sang "Giải ngân theo HĐTD" → danh sách chứng từ có đủ 3', capNhatLoai.ok && ctx.layDanhSachChungTuHoSo(hsChiUnc.maHoSo).length === 3 && bang(hsChiUnc.maHoSo).LoaiHoSoGiaiNgan === 'Giải ngân theo HĐTD', capNhatLoai.loi);
dat('Loại hồ sơ', 'Tên trùng / dài quá bị từ chối; danh sách rỗng → về mặc định', !thu(() => ctx.luuLoaiHoSoGiaiNgan([{ ten: 'A', chungTu: true }, { ten: 'a', chungTu: true }])).ok && !thu(() => ctx.luuLoaiHoSoGiaiNgan([{ ten: 'x'.repeat(61) }])).ok && thu(() => ctx.luuLoaiHoSoGiaiNgan([])).ok && ctx.layLoaiHoSoGiaiNgan().length === 2 && ctx.layLoaiHoSoGiaiNgan()[0].ten === 'Giải ngân theo HĐTD');
mt.__email = 'nguoila@example.com';
dat('Loại hồ sơ', 'Không phải quản trị: đọc được danh mục nhưng KHÔNG lưu được', ctx.layLoaiHoSoGiaiNgan().length === 2 && !thu(() => ctx.luuLoaiHoSoGiaiNgan([{ ten: 'Z', chungTu: true }])).ok);
mt.__email = 'ketoan@example.com';

// ---------- Loại tài liệu TỰ THÊM (không sửa mã) ----------
const dmLTL0 = ctx.layDanhMucLoaiTaiLieu();
dat('Loại tài liệu', 'Danh mục gốc có đúng 3 loại hệ thống (đề nghị, UNC/Bảng kê, HĐMB-chỉ USD)', dmLTL0.length === 3 && dmLTL0.every(x => x.heThong) && dmLTL0[2].loaiTien === 'USD');
dat('Loại tài liệu', 'Mã không hợp lệ / trùng loại hệ thống / thiếu tên bị từ chối', !thu(() => ctx.luuLoaiTaiLieuTuyChinh([{ ma: '1AB', ten: 'x' }])).ok && !thu(() => ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'HDMB_NGOAI_TE', ten: 'x' }])).ok && !thu(() => ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'GIAY_NHAN_NO', ten: '' }])).ok && !thu(() => ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'AAA', ten: 'a' }, { ma: 'aaa', ten: 'b' }])).ok);
const luuTL = thu(() => ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'giay nhan no', ten: ' Giấy nhận nợ ', loaiTien: 'USD' }]));
dat('Loại tài liệu', 'Thêm loại "Giấy nhận nợ" (mã tự chuẩn hoá GIAY_NHAN_NO, áp dụng hồ sơ USD)', luuTL.ok && ctx.layDanhMucLoaiTaiLieu().length === 4 && ctx.layDanhMucLoaiTaiLieu()[3].ma === 'GIAY_NHAN_NO' && ctx.layDanhMucLoaiTaiLieu()[3].ten === 'Giấy nhận nợ' && !ctx.layDanhMucLoaiTaiLieu()[3].heThong, luuTL.loi);
const tMau = thu(() => ctx.taiMauVanBan({ maMau: 'GNN_USD', tenMau: 'Giấy nhận nợ (mẫu thử)', loaiTien: 'USD', loaiTaiLieu: 'GIAY_NHAN_NO', tenFile: 'HDMB_USD.docx' }, b64('HDMB_USD.docx')));
dat('Loại tài liệu', 'Tải mẫu cho loại tự thêm (không đòi hàng bảng người thụ hưởng; điều kiện số người để trống → "1+")', tMau.ok && ctx.layDanhSachMauVanBan().find(m => m.maMau === 'GNN_USD').dieuKien === '1+' && ctx.layDanhSachMauVanBan().find(m => m.maMau === 'GNN_USD').loaiTaiLieu === 'GIAY_NHAN_NO', tMau.loi);
dat('Loại tài liệu', 'Loại tài liệu không có trong danh mục bị từ chối khi tải mẫu', !thu(() => ctx.taiMauVanBan({ maMau: 'ZZZ', tenMau: 'z', loaiTaiLieu: 'KHONG_CO', tenFile: 'HDMB_USD.docx' }, b64('HDMB_USD.docx'))).ok);
dat('Loại tài liệu', 'Không bỏ được loại đang có mẫu hiệu lực', !thu(() => ctx.luuLoaiTaiLieuTuyChinh([])).ok && ctx.layDanhMucLoaiTaiLieu().length === 4);
dat('Loại tài liệu', 'Loại hồ sơ dùng mã tài liệu không có trong danh mục bị từ chối', !thu(() => ctx.luuLoaiHoSoGiaiNgan([{ ten: 'X', tl: ['KHONG_CO'] }])).ok);
const luuLH2 = thu(() => ctx.luuLoaiHoSoGiaiNgan([{ ten: 'Giải ngân theo HĐTD', tl: ['DE_NGHI_GIAI_NGAN', 'CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE'] }, { ten: 'Đủ bộ + Giấy nhận nợ', tl: ['DE_NGHI_GIAI_NGAN', 'CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE', 'GIAY_NHAN_NO'] }]));
dat('Loại tài liệu', 'Tạo loại hồ sơ "Đủ bộ + Giấy nhận nợ" (tick thêm loại tự thêm)', luuLH2.ok && ctx.layLoaiHoSoGiaiNgan()[1].tl.indexOf('GIAY_NHAN_NO') >= 0, luuLH2.loi);
const hsGNN = taoHoSo('USD', 2, 25000, 25810, { loaiHoSoGiaiNgan: 'Đủ bộ + Giấy nhận nợ' });
const dsGNN = ctx.layDanhSachChungTuHoSo(hsGNN.maHoSo);
dat('Loại tài liệu', 'Danh sách chứng từ hồ sơ có 4 tài liệu, loại tự thêm hiển thị đúng tên + mẫu', dsGNN.length === 4 && dsGNN[3].loaiTaiLieu === 'GIAY_NHAN_NO' && dsGNN[3].tenTaiLieu === 'Giấy nhận nợ' && dsGNN[3].maMau === 'GNN_USD', JSON.stringify(dsGNN.map(x => [x.loaiTaiLieu, x.maMau])));
const trGNN = thu(() => ctx.taoTronBoTheoMau(hsGNN.maHoSo));
dat('Loại tài liệu', 'Tạo trọn bộ: lập cả loại tự thêm từ mẫu (khac[0] có mẫu GNN_USD, file docx, link PDF)', trGNN.ok && trGNN.v.khac.length === 1 && trGNN.v.khac[0].mau === 'GNN_USD' && trGNN.v.khac[0].loaiFile === 'docx' && !!trGNN.v.khac[0].pdfUrl && trGNN.v.khac[0].loaiTaiLieu === 'GIAY_NHAN_NO', trGNN.loi || JSON.stringify(trGNN.v && trGNN.v.khac));
dat('Loại tài liệu', 'Lịch sử phát hành ghi đủ 4 tài liệu (kể cả loại tự thêm); tệp nằm trong thư mục DOCX của hồ sơ, tên GIAY_NHAN_NO_..._L1', ctx.layLichSuPhatHanh(hsGNN.maHoSo).filter(x => x.trangThai === 'Hiệu lực').length === 4 && /GIAY_NHAN_NO_.*_L1\.docx$/.test(G.dsFile[trGNN.v.khac[0].fileIdChinh].getName()), G.dsFile[trGNN.v.khac[0].fileIdChinh] && G.dsFile[trGNN.v.khac[0].fileIdChinh].getName());
const rieng = thu(() => ctx.taoChungTuTuyChon(hsGNN.maHoSo, 'GIAY_NHAN_NO', { taoLai: true }));
dat('Loại tài liệu', 'Tạo riêng + "tạo lại" cho loại tự thêm → phiên bản L2, bản L1 chuyển "Đã thay thế"', rieng.ok && rieng.v.soLan === 2 && ctx.layLichSuPhatHanh(hsGNN.maHoSo).filter(x => x.loaiTaiLieu === 'GIAY_NHAN_NO' && x.trangThai === 'Đã thay thế').length === 1, rieng.loi);
const hsGNNvnd = taoHoSo('VND', 2, 463520000, 0, { loaiHoSoGiaiNgan: 'Đủ bộ + Giấy nhận nợ' });
dat('Loại tài liệu', 'Loại tự thêm "chỉ USD": hồ sơ VND không có loại này trong danh sách', ctx.layDanhSachChungTuHoSo(hsGNNvnd.maHoSo).every(x => x.loaiTaiLieu !== 'GIAY_NHAN_NO') && ctx.layDanhSachChungTuHoSo(hsGNNvnd.maHoSo).length === 2);
const guiVnd = thu(() => ctx.taoChungTuTuyChon(hsGNNvnd.maHoSo, 'GIAY_NHAN_NO', {}));
dat('Loại tài liệu', 'Gọi tạo loại này cho hồ sơ VND → không tạo file, báo vì sao', !guiVnd.ok, guiVnd.loi);
// loại tự thêm chưa có mẫu phù hợp: bỏ qua trong trọn bộ, không làm hỏng cả bộ
ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'GIAY_NHAN_NO', ten: 'Giấy nhận nợ', loaiTien: 'USD' }, { ma: 'TO_TRINH', ten: 'Tờ trình', loaiTien: 'TAT_CA' }]);
ctx.luuLoaiHoSoGiaiNgan([{ ten: 'Giải ngân theo HĐTD', tl: ['DE_NGHI_GIAI_NGAN', 'CHUNG_TU_THANH_TOAN', 'HDMB_NGOAI_TE'] }, { ten: 'Có tờ trình', tl: ['CHUNG_TU_THANH_TOAN', 'TO_TRINH'] }]);
const hsTT = taoHoSo('USD', 1, 25000, 25810, { loaiHoSoGiaiNgan: 'Có tờ trình' });
const trTT = thu(() => ctx.taoTronBoTheoMau(hsTT.maHoSo));
dat('Loại tài liệu', 'Loại tự thêm CHƯA có mẫu: trọn bộ vẫn lập UNC, mục "Tờ trình" được bỏ qua kèm lý do (không lỗi cả bộ)', trTT.ok && trTT.v.chungTuThanhToan && trTT.v.khac.length === 1 && trTT.v.khac[0].boQua === true && /Chưa có mẫu/.test(trTT.v.khac[0].lyDo), trTT.loi);
// dọn: ngừng mẫu, bỏ loại → về mặc định
ctx.datTrangThaiMau('GNN_USD', 1, 'Hết hiệu lực');
dat('Loại tài liệu', 'Sau khi ngừng mẫu: bỏ được các loại tự thêm; loại hồ sơ về mặc định', thu(() => ctx.luuLoaiTaiLieuTuyChinh([])).ok && ctx.layDanhMucLoaiTaiLieu().length === 3 && thu(() => ctx.luuLoaiHoSoGiaiNgan([])).ok && ctx.layLoaiHoSoGiaiNgan().length === 2);
mt.__email = 'nguoila@example.com';
dat('Loại tài liệu', 'Không phải quản trị: đọc được danh mục nhưng KHÔNG lưu được loại tài liệu', ctx.layDanhMucLoaiTaiLieu().length === 3 && !thu(() => ctx.luuLoaiTaiLieuTuyChinh([{ ma: 'ABC', ten: 'x' }])).ok);
mt.__email = 'ketoan@example.com';

// ---------- Danh mục tài liệu kèm theo ----------
dat('Tài liệu kèm theo', 'Danh mục mặc định có "Hóa đơn GTGT", "Bảng lương"', ctx.layDanhMucTaiLieuKem().indexOf('Hóa đơn GTGT') >= 0 && ctx.layDanhMucTaiLieuKem().indexOf('Bảng lương') >= 0);
const dmLuu = thu(() => ctx.luuDanhMucTaiLieuKem([' Hóa đơn GTGT ', '', 'Hóa đơn GTGT', 'Phiếu nhập kho']));
dat('Tài liệu kèm theo', 'Quản trị lưu danh mục: cắt khoảng trắng, bỏ trống/trùng; đọc lại đúng', dmLuu.ok && JSON.stringify(ctx.layDanhMucTaiLieuKem()) === JSON.stringify(['Hóa đơn GTGT', 'Phiếu nhập kho']), dmLuu.loi);
dat('Tài liệu kèm theo', 'Mục có dấu phẩy bị từ chối', !thu(() => ctx.luuDanhMucTaiLieuKem(['A, B'])).ok);
dat('Tài liệu kèm theo', 'Lưu danh mục rỗng → trở về mặc định', thu(() => ctx.luuDanhMucTaiLieuKem([])).ok && ctx.layDanhMucTaiLieuKem().length === 6);
mt.__email = 'nguoila@example.com';
dat('Tài liệu kèm theo', 'Không phải quản trị: đọc được danh mục nhưng KHÔNG lưu được', ctx.layDanhMucTaiLieuKem().length === 6 && !thu(() => ctx.luuDanhMucTaiLieuKem(['X'])).ok);
mt.__email = 'ketoan@example.com';

// ---------- 9. Phân quyền ----------
mt.__email = 'nguoila@example.com';
const cam = ['layDanhSachMauVanBan', 'datMauMacDinh', 'layLichSuChinhSuaMau'].map(f => thu(() => ctx[f]('UNC_BIDV', 1, true)));
dat('Phân quyền', 'Không phải quản trị: bị chặn xem/đổi mẫu, mặc định, lịch sử mẫu', cam.every(x => !x.ok && /quyền quản trị/.test(x.loi)));
dat('Phân quyền', 'Không phải quản trị: vẫn LẬP/PHÁT HÀNH chứng từ và xem danh sách chứng từ hồ sơ', thu(() => ctx.layDanhSachChungTuHoSo(maU5)).ok);
mt.__email = 'ketoan@example.com';

in_();
console.log(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi`);
fs.writeFileSync(path.join(RA, 'ket_qua.txt'), kq.map(x => x.join(' | ')).join('\n'));
process.exit(loi ? 1 : 0);
