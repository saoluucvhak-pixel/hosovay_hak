/* KIỂM THỬ TÍCH HỢP luồng phát hành: chạy NGUYÊN mã *.gs với dịch vụ Apps Script được giả lập (gia_lap_apps_script.js).
 * Chạy: node kiem_thu/chay_tich_hop.js <thư_mục_ra>  →  sau đó: python3 kiem_thu/kiem_tra_docx.py <thư_mục_ra>
 * In bảng kết quả từng khẳng định (ĐẠT/LỖI). Thoát mã 1 nếu có lỗi. */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const RA = path.resolve(process.argv[2] || path.join(GOC, 'kiem_thu', 'ket_qua_tich_hop'));
fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const { ctx, mt, run } = require('./gia_lap_apps_script')(GOC, path.join(RA, '_tam'));
const G = mt.__;
const kq = []; let loi = 0;
function inKetQua() { let nhom = ''; kq.forEach(([n, t, k, g]) => { if (n !== nhom) { console.log('\n== ' + n); nhom = n; } console.log(`  [${k}] ${t}${k === 'LỖI' && g ? '  → ' + g : ''}`); }); }
process.on('uncaughtException', (e) => { inKetQua(); console.log('\nLỖI BẤT NGỜ:', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(2); });
function dat(nhom, ten, dieuKien, ghiChu) { kq.push([nhom, ten, dieuKien ? 'ĐẠT' : 'LỖI', ghiChu || '']); if (!dieuKien) loi++; }
function thu(f) { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } }
const doc = (f) => fs.readFileSync(path.join(GOC, 'mau_thu', f)).toString('base64');
const bang = (maHoSo) => { const r = ctx.sheetToObjects_('HoSoGiaiNgan').filter(x => x.MaHoSo === maHoSo)[0]; return r; };
const idTuUrl = (u) => String(u).split('/').pop();

// ---------- 0. Khởi tạo ----------
ctx.initializeSpreadsheet();
const shHs = G.boDuLieu.getSheetByName('HoSoGiaiNgan');
const hdrHs = shHs.g[0];
dat('Khởi tạo', 'Có tab DM_MauVanBan, LichSuPhatHanhTaiLieu, NhatKyHeThong', ['DM_MauVanBan', 'LichSuPhatHanhTaiLieu', 'NhatKyHeThong'].every(n => G.boDuLieu.getSheetByName(n)));
dat('Khởi tạo', 'Có cột link tách riêng DOCX/PDF/XLSX', ['Link_VanBanDeNghi_DOCX', 'Link_ChungTuThanhToan_DOCX', 'Link_ChungTuThanhToan_XLSX', 'Link_ChungTuThanhToan_PDF', 'Link_HDMBNgoaiTe_DOCX'].every(c => hdrHs.indexOf(c) >= 0));

const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HIỆP VĨNH AN', maCIF: '0312345678', diaChiTruSo: '123 Đường A, Đà Nẵng', dienThoai: '0236 111 222', nguoiDaiDien: 'Trần Văn Giám Đốc', chucVu: 'Giám đốc', taiKhoanVND: '5110000111', taiKhoanUSD: '5110000222' });
const hd = ctx.luuHopDong({ maCty: cty.maCty, soHopDong: '0126/2026/HDTD-BIDV', ngayHopDong: '2026-01-05', tenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', chiNhanh: 'Chi nhánh Quảng Nam', hanMucVay: 50000000000, laiSuatTrongHan: 6.5, laiSuatLaiChamTra: 9.75, soHopDongKhungMBNT: 'A01/2026', ngayHopDongKhungMBNT: '2026-01-06' });

// ---------- 1. Phân quyền + tải mẫu ----------
mt.__email = 'nguoila@example.com'; G.props['ADMIN_EMAILS'] = 'ketoan@example.com';
const tuChoi = thu(() => ctx.taiMauVanBan({ maMau: 'X', tenMau: 'X', loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', dieuKienSoDong: '1' }, doc('DE_NGHI_USD.docx')));
dat('Phân quyền', 'Người không phải quản trị bị chặn tải mẫu', !tuChoi.ok && /quyền quản trị/.test(tuChoi.loi), tuChoi.loi);
dat('Phân quyền', 'Người không phải quản trị bị chặn xem danh sách mẫu + cấu hình', !thu(() => ctx.layDanhSachMauVanBan()).ok && !thu(() => ctx.layCauHinhHeThong()).ok);
mt.__email = 'ketoan@example.com';

const MAU = [
  ['DE_NGHI_USD', 'DE_NGHI_USD.docx', 'USD', 'DE_NGHI_GIAI_NGAN', 1, 999], ['DE_NGHI_VND', 'DE_NGHI_VND.docx', 'VND', 'DE_NGHI_GIAI_NGAN', 1, 999],
  ['UNC_USD', 'UNC_USD_1_KHOAN.docx', 'USD', 'CHUNG_TU_THANH_TOAN', 1, 1], ['UNC_VND', 'UNC_VND_1_KHOAN.docx', 'VND', 'CHUNG_TU_THANH_TOAN', 1, 1],
  ['BANG_KE_USD', 'BANG_KE_USD.docx', 'USD', 'CHUNG_TU_THANH_TOAN', 2, 999], ['BANG_KE_VND', 'BANG_KE_VND.docx', 'VND', 'CHUNG_TU_THANH_TOAN', 2, 999],
  ['HDMB_USD', 'HDMB_USD.docx', 'USD', 'HDMB_NGOAI_TE', 1, 999]
];
MAU.forEach(([ma, file, lt, lct, tu, den]) => {
  const r = thu(() => ctx.taiMauVanBan({ maMau: ma, tenMau: 'Mẫu ' + ma, nganHang: 'BIDV', loaiTien: lt, loaiTaiLieu: lct, dieuKienSoDong: tu + '-' + den, tenFile: file }, doc(file)));
  dat('Tải mẫu', 'Tải ' + ma + ' thành công, v1, hiệu lực', r.ok && r.v.phienBan === 1, r.ok ? ('placeholder=' + r.v.placeholder.length) : r.loi);
});
const dsMau = ctx.layDanhSachMauVanBan();
dat('Tải mẫu', 'Danh sách mẫu có đủ 7 mẫu hiệu lực', dsMau.length === 7 && dsMau.every(m => m.trangThai === 'Hiệu lực'));

// mẫu lỗi bị từ chối (không lưu)
const xauXa = thu(() => ctx.taiMauVanBan({ maMau: 'XAU', tenMau: 'x', loaiTien: 'USD', loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', dieuKienSoDong: '1-9' }, Buffer.from('khong phai docx').toString('base64')));
dat('Tải mẫu', 'File không phải .docx hợp lệ bị từ chối', !xauXa.ok, xauXa.loi);
const khongHangMau = thu(() => ctx.taiMauVanBan({ maMau: 'UNC_NHIEU', tenMau: 'x', loaiTien: 'USD', loaiTaiLieu: 'CHUNG_TU_THANH_TOAN', dieuKienSoDong: '1-5' }, doc('UNC_USD_1_KHOAN.docx')));
dat('Tải mẫu', 'Mẫu áp dụng nhiều người nhưng không có hàng {{CT.*}} bị từ chối', !khongHangMau.ok && /hàng/.test(khongHangMau.loi), khongHangMau.loi);
dat('Tải mẫu', 'Mẫu bị từ chối KHÔNG được lưu', ctx.layDanhSachMauVanBan().length === 7);

// ---------- 2. Chọn mẫu ----------
const chon = (lct, lt, n) => { const m = ctx.chonMauTaiLieu_(lct, lt, n, 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam'); return m ? m.MaMau : null; };
dat('Chọn mẫu', 'Chứng từ USD 1 dòng → UNC_USD', chon('CHUNG_TU_THANH_TOAN', 'USD', 1) === 'UNC_USD');
dat('Chọn mẫu', 'Chứng từ USD 2 và 20 dòng → BANG_KE_USD', chon('CHUNG_TU_THANH_TOAN', 'USD', 2) === 'BANG_KE_USD' && chon('CHUNG_TU_THANH_TOAN', 'USD', 20) === 'BANG_KE_USD');
dat('Chọn mẫu', 'Chứng từ VND 1 → UNC_VND; 5 → BANG_KE_VND', chon('CHUNG_TU_THANH_TOAN', 'VND', 1) === 'UNC_VND' && chon('CHUNG_TU_THANH_TOAN', 'VND', 5) === 'BANG_KE_VND');
dat('Chọn mẫu', 'Đề nghị VND → DE_NGHI_VND, USD → DE_NGHI_USD', chon('DE_NGHI_GIAI_NGAN', 'VND', 3) === 'DE_NGHI_VND' && chon('DE_NGHI_GIAI_NGAN', 'USD', 3) === 'DE_NGHI_USD');
dat('Chọn mẫu', 'HDMB cho hồ sơ VND → không có mẫu', chon('HDMB_NGOAI_TE', 'VND', 1) === null);
dat('Chọn mẫu', 'Ngân hàng khác (VCB) → không chọn mẫu BIDV', ctx.chonMauTaiLieu_('DE_NGHI_GIAI_NGAN', 'USD', 1, 'Ngân hàng TMCP Ngoại thương Việt Nam') === null);

// ---------- 3. Tạo hồ sơ + phát hành ----------
const TY_GIA = 26145.5;
function taoHoSo(loaiTien, soTien) {
  const usd = loaiTien === 'USD';
  const chiTiet = soTien.map((st, i) => ({ tenNguoiHuong: `CÔNG TY TNHH NHÀ CUNG CẤP SỐ ${i + 1} & ĐỐI TÁC <A>`, soTaiKhoan: '1234567' + String(i).padStart(3, '0'), taiNganHang: 'Ngân hàng TMCP Ngoại thương Việt Nam - CN Quảng Nam', loaiTien, noiDungThanhToan: `Thanh toán tiền keo theo hóa đơn số ${100 + i}`, loaiChungTu: 'Thanh toán tiền hàng', soTien: st, taiLieuSo: 'HD' + (100 + i), ngayTaiLieu: '15/09/2026', chuyenTienNhanh: 'N' }));
  return ctx.luuHoSoGiaiNgan({ maHD: hd.maHD, soGiayNhanNo: '48/2026-09', ngayGiayNhanNo: '2026-09-14', duNoHienTai: 1500000000, loaiTien, tyGiaBan: usd ? TY_GIA : 0, soTienNhanNoLanNay: soTien.reduce((a, b) => a + b, 0), phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'Thanh toán tiền keo', thoiHanChoVayNgay: 90, ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', taiLieuChungMinhMucDich: 'Hóa đơn GTGT', nguoiLapBieu: 'Nguyễn Thị Kế Toán', soThamChieu: 'TC-26-09', chiTiet });
}
const chia = (tong, n) => { const co = Math.floor(tong / n); return Array.from({ length: n }, (_, i) => i === n - 1 ? tong - co * (n - 1) : co); };
function luuFile(url, ten) { const f = G.dsFile[idTuUrl(url)]; fs.writeFileSync(path.join(RA, ten), f.blob.bytes); return f; }

const kichBan = [
  ['USD', [25000], 'USD 25.000 – 1 dòng'], ['USD', [10000, 15000], 'USD 25.000 – 2 dòng'], ['USD', chia(25000, 5), 'USD 25.000 – 5 dòng'], ['USD', chia(25000, 20), 'USD 25.000 – 20 dòng'],
  ['VND', [463520000], 'VND – 1 dòng'], ['VND', chia(463520000, 5), 'VND – 5 dòng'], ['VND', chia(463520000, 20), 'VND – 20 dòng']
];
let stt = 0; const hoSoTheoKB = {};
kichBan.forEach(([lt, ds, nhan]) => {
  stt++;
  const luu = thu(() => taoHoSo(lt, ds));
  dat('Lưu hồ sơ', nhan + ': lưu thành công', luu.ok, luu.ok ? luu.v.maHoSo : luu.loi);
  if (!luu.ok) return;
  const ma = luu.v.maHoSo; hoSoTheoKB[nhan] = ma;
  const r = thu(() => ctx.taoTronBoTheoMau(ma));
  dat('Phát hành', nhan + ': tạo trọn bộ thành công', r.ok, r.ok ? '' : r.loi);
  if (!r.ok) return;
  const R = r.v, usd = lt === 'USD', tong = ds.reduce((a, b) => a + b, 0);
  dat('Phát hành', nhan + ': mọi chứng từ sinh từ MẪU DOCX (không dùng code mặc định)', R.vanBanDeNghi.nguon === 'MAU_DOCX' && R.chungTuThanhToan.nguon === 'MAU_DOCX' && (!usd || R.hdmbNgoaiTe.nguon === 'MAU_DOCX'), `${R.vanBanDeNghi.mau}/${R.chungTuThanhToan.mau}/${R.hdmbNgoaiTe ? R.hdmbNgoaiTe.mau : '-'}`);
  const mauCT = ds.length === 1 ? (usd ? 'UNC_USD' : 'UNC_VND') : (usd ? 'BANG_KE_USD' : 'BANG_KE_VND');
  dat('Phát hành', nhan + ': chọn đúng mẫu chứng từ ' + mauCT, R.chungTuThanhToan.mau === mauCT);
  dat('Phát hành', nhan + ': trạng thái hồ sơ → Đã tạo hồ sơ', R.trangThai === 'Đã tạo hồ sơ');
  // lưu file để kiểm tra độc lập
  const mauFile = { DE_NGHI_USD: 'DE_NGHI_USD', DE_NGHI_VND: 'DE_NGHI_VND', UNC_USD: 'UNC_USD_1_KHOAN', UNC_VND: 'UNC_VND_1_KHOAN', BANG_KE_USD: 'BANG_KE_USD', BANG_KE_VND: 'BANG_KE_VND' };
  const bd = ctx.taoBienDayDu_(ctx.layDuLieuDayDu(ma), { homNay: '13/10/2026' });
  const dsd = ctx.taoDanhSachBienDong_(ctx.layDuLieuDayDu(ma));
  [['de_nghi', R.vanBanDeNghi], ['chung_tu', R.chungTuThanhToan]].forEach(([loai, x]) => {
    const ten = `th_${stt}_${loai}`;
    luuFile(x.docxUrl, ten + '.docx'); if (x.pdfUrl) luuFile(x.pdfUrl, ten + '.pdf');
    fs.writeFileSync(path.join(RA, ten + '.json'), JSON.stringify({ ten, maHoSo: ma, mau: mauFile[x.mau], loai: lt, soDong: ds.length, tongTien: tong, tongBangSo: bd['HO_SO.SO_TIEN'], tongBangChu: bd['HO_SO.SO_TIEN_BANG_CHU'], tongQuyDoi: 0, tyGia: bd['HO_SO.TY_GIA'], cacDong: dsd.map(z => ({ soTien: z['CT.SO_TIEN'], quyDoi: z['CT.SO_TIEN_QUY_DOI'], ten: z['CT.TEN'] })), engine: { conLai: [], conNgoac: [] } }));
  });
  if (usd) { luuFile(R.hdmbNgoaiTe.docxUrl, `th_${stt}_hdmb.docx`); }
  // link đúng cột
  const row = bang(ma);
  dat('Link', nhan + ': Link_VanBanDeNghi_DOCX = file DOCX, _PDF = file PDF', row.Link_VanBanDeNghi_DOCX === R.vanBanDeNghi.docxUrl && row.Link_VanBanDeNghi_PDF === R.vanBanDeNghi.pdfUrl && row.Link_VanBanDeNghi_DOCX !== row.Link_VanBanDeNghi_PDF);
  dat('Link', nhan + ': Link_ChungTuThanhToan_DOCX/PDF đúng, KHÔNG có XLSX giả', row.Link_ChungTuThanhToan_DOCX === R.chungTuThanhToan.docxUrl && row.Link_ChungTuThanhToan_PDF === R.chungTuThanhToan.pdfUrl && !row.Link_ChungTuThanhToan_XLSX);
  dat('Link', nhan + ': PDF là file PDF thật', G.dsFile[idTuUrl(row.Link_VanBanDeNghi_PDF)].blob.bytes.slice(0, 4).toString() === '%PDF');
  const dsPh = ctx.layLichSuPhatHanh(ma);
  dat('Nhật ký', nhan + ': ghi lịch sử phát hành ' + (usd ? 3 : 2) + ' chứng từ, trạng thái Hiệu lực', dsPh.length === (usd ? 3 : 2) && dsPh.every(x => x.trangThai === 'Hiệu lực'));
});

// ---------- 4. Phiên bản mới + không ghi đè bản đã phát hành ----------
const maUsd5 = hoSoTheoKB['USD 25.000 – 5 dòng'];
const truoc = ctx.layLichSuPhatHanh(maUsd5).filter(x => x.loaiTaiLieu === 'DE_NGHI_GIAI_NGAN')[0];
const fileCu = G.dsFile[idTuUrl(truoc.linkDocx)].blob.bytes.length;
const noiDungCu = Buffer.from(G.dsFile[idTuUrl(truoc.linkDocx)].blob.bytes).toString('hex');
const v2 = thu(() => ctx.taiMauVanBan({ maMau: 'DE_NGHI_USD', tenMau: 'Mẫu DE_NGHI_USD (bản 2)', nganHang: 'BIDV', loaiTien: 'USD', loaiTaiLieu: 'DE_NGHI_GIAI_NGAN', dieuKienSoDong: '1-999', tenFile: 'DE_NGHI_USD.docx' }, doc('DE_NGHI_USD.docx')));
dat('Phiên bản', 'Tải lại cùng mã → v2', v2.ok && v2.v.phienBan === 2);
const dsMau2 = ctx.layDanhSachMauVanBan().filter(m => m.maMau === 'DE_NGHI_USD');
dat('Phiên bản', 'v1 → Hết hiệu lực, v2 → Hiệu lực (giữ cả 2 file)', dsMau2.length === 2 && dsMau2.filter(m => m.trangThai === 'Hiệu lực').length === 1 && dsMau2.find(m => m.phienBan === 2).trangThai === 'Hiệu lực');
const lai = thu(() => ctx.taoDeNghiGiaiNganBIDV(maUsd5));
dat('Phiên bản', 'Phát hành lại dùng mẫu v2, lần L2', lai.ok && lai.v.phienBanMau === 2 && lai.v.soLan === 2, lai.ok ? '' : lai.loi);
const sau = ctx.layLichSuPhatHanh(maUsd5).filter(x => x.loaiTaiLieu === 'DE_NGHI_GIAI_NGAN');
dat('Phiên bản', 'Bản L1 → "Đã thay thế", L2 → "Hiệu lực"; cả 2 còn tồn tại', sau.length === 2 && sau.find(x => x.soLan === 1).trangThai === 'Đã thay thế' && sau.find(x => x.soLan === 2).trangThai === 'Hiệu lực');
dat('Phiên bản', 'File L1 đã phát hành KHÔNG bị đổi/xoá', !G.dsFile[idTuUrl(truoc.linkDocx)].daXoa && Buffer.from(G.dsFile[idTuUrl(truoc.linkDocx)].blob.bytes).toString('hex') === noiDungCu && G.dsFile[idTuUrl(truoc.linkDocx)].id !== G.dsFile[idTuUrl(sau.find(x => x.soLan === 2).linkDocx)].id);
const mauCuV1 = G.dsFile[ctx.sheetToObjects_('DM_MauVanBan').find(m => m.MaMau === 'DE_NGHI_USD' && m.PhienBan === 1).FileDocxId];
dat('Phiên bản', 'File mẫu gốc v1 không bị sửa khi phát hành', Buffer.compare(mauCuV1.blob.bytes, fs.readFileSync(path.join(GOC, 'mau_thu', 'DE_NGHI_USD.docx'))) === 0);

// ---------- 5. Dữ liệu lịch sử có số lẻ ----------
// Dựng hồ sơ "lịch sử": ghi THẲNG vào Sheet các số lẻ (mô phỏng dữ liệu cũ, trước khi áp quy tắc số nguyên).
const maLS = taoHoSo('USD', [10000, 15000]).maHoSo;
const shCt = G.boDuLieu.getSheetByName('ChiTietThuHuong'); const hCt = shCt.g[0];
const dongCt = shCt.g.findIndex((r, i) => i > 0 && r[0] === maLS && r[hCt.indexOf('STT')] === 2);
shCt.g[dongCt][hCt.indexOf('SoTien')] = 15000.5; shCt.g[dongCt][hCt.indexOf('SoTienQuyDoi')] = 392195250.25;
const dongHs = shHs.g.findIndex((r, i) => i > 0 && r[0] === maLS);
shHs.g[dongHs][hdrHs.indexOf('SoTienNhanNoLanNay')] = 25000.5; shHs.g[dongHs][hdrHs.indexOf('SoTienBangChu')] = 'Hai mươi lăm ngàn đô la Mỹ và năm mươi cents';
const chup = () => JSON.stringify([shHs.g[dongHs], shCt.g[dongCt]]);
const nguyenTrang = chup();

const xem = thu(() => ctx.layDuLieuDayDu(maLS));
dat('Số lẻ lịch sử', 'Vẫn xem được dữ liệu nguyên trạng (không tự làm tròn)', xem.ok && xem.v.hoSo.SoTienNhanNoLanNay === 25000.5 && xem.v.chiTiet[1].SoTien === 15000.5);
const chan = thu(() => ctx.taoTronBoTheoMau(maLS));
dat('Số lẻ lịch sử', 'Phát hành bị CHẶN và nêu rõ trường cần sửa', !chan.ok && /ChiTietThuHuong dòng 2/.test(chan.loi) && /SoTienNhanNoLanNay/.test(chan.loi), chan.loi && chan.loi.split('\n').slice(0, 4).join(' / '));
dat('Số lẻ lịch sử', 'Chặn phát hành không tạo file/ghi log mới', ctx.layLichSuPhatHanh(maLS).length === 0);
const bc = thu(() => ctx.taoBaoCaoTienVayDoc('', '', '', 'Kế toán', '', ''));
const rows = ctx.layBaoCaoTienVay('', '', '', '', '');
dat('Số lẻ lịch sử', 'Báo cáo đánh dấu dòng cần rà soát (canRaSoat) thay vì làm tròn', rows.some(r => r.maHoSo === maLS && r.canRaSoat && r.soTienVay === 15000.5));
const ls = ctx.raSoatTienLeLichSu();
dat('Số lẻ lịch sử', 'Rà soát liệt kê đúng 3 ô lẻ và ghi tab CanRaSoat_TienLe', ls.length === 3 && !!G.boDuLieu.getSheetByName('CanRaSoat_TienLe'), JSON.stringify(ls.map(x => x.cot)));
dat('Số lẻ lịch sử', 'Rà soát KHÔNG đổi dữ liệu gốc', chup() === nguyenTrang);

const payloadPhiTien = { maHoSo: maLS, maHD: hd.maHD, soGiayNhanNo: '48/2026-09-SUA', ngayGiayNhanNo: '2026-09-14', phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'Mục đích mới', thoiHanChoVayNgay: 90, ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', taiLieuChungMinhMucDich: 'x', nguoiLapBieu: 'Người mới', soThamChieu: 'SUA-1', chiTiet: [{ tenNguoiHuong: 'NCC 1 (đổi tên)', soTaiKhoan: '111', taiNganHang: 'NH', noiDungThanhToan: 'nd', loaiChungTu: 'lct', chuyenTienNhanh: 'N', taiLieuSo: 'A1', ngayTaiLieu: '01/09/2026', donViLapTaiLieu: 'NCC 1', ghiChu: '' }, { tenNguoiHuong: 'NCC 2 (đổi tên)', soTaiKhoan: '222', taiNganHang: 'NH', noiDungThanhToan: 'nd2', loaiChungTu: 'lct', chuyenTienNhanh: 'N', taiLieuSo: 'A2', ngayTaiLieu: '02/09/2026', donViLapTaiLieu: 'NCC 2', ghiChu: '' }] };
const capNhat = thu(() => ctx.capNhatThongTinPhiTienTe(payloadPhiTien));
const hsSau = bang(maLS), ctSau = ctx.layChiTietTheoHoSo(maLS);
dat('Số lẻ lịch sử', 'Sửa thông tin phi tiền tệ thành công', capNhat.ok && hsSau.SoGiayNhanNo === '48/2026-09-SUA' && ctSau[1].TenNguoiHuong === 'NCC 2 (đổi tên)', capNhat.loi);
dat('Số lẻ lịch sử', 'Giữ NGUYÊN tuyệt đối mọi số tiền cũ (25000.5; 15000.5; 392195250.25; bằng chữ cũ)', hsSau.SoTienNhanNoLanNay === 25000.5 && ctSau[1].SoTien === 15000.5 && ctSau[1].SoTienQuyDoi === 392195250.25 && hsSau.SoTienBangChu === 'Hai mươi lăm ngàn đô la Mỹ và năm mươi cents' && ctSau[0].SoTien === 10000);
dat('Số lẻ lịch sử', 'Không mất dòng chi tiết (vẫn 2 dòng)', ctSau.length === 2);
const doiSoDong = thu(() => ctx.capNhatThongTinPhiTienTe(Object.assign({}, payloadPhiTien, { chiTiet: [payloadPhiTien.chiTiet[0]] })));
dat('Số lẻ lịch sử', 'Đổi số dòng ở chế độ giữ nguyên bị từ chối', !doiSoDong.ok, doiSoDong.loi);
const nhapSaiLe = thu(() => ctx.luuHoSoGiaiNgan(Object.assign(taoPayloadLoi(), {})));
function taoPayloadLoi() { return { maHoSo: maLS, maHD: hd.maHD, loaiTien: 'USD', tyGiaBan: TY_GIA, duNoHienTai: 0, soTienNhanNoLanNay: 25000, chiTiet: [{ tenNguoiHuong: 'A', soTien: '10.000' }, { tenNguoiHuong: 'B', soTien: '15.000,50' }] }; }
dat('Số lẻ lịch sử', 'Lưu với "15.000,50" bị từ chối, dữ liệu cũ vẫn nguyên', !nhapSaiLe.ok && /15\.000,50/.test(nhapSaiLe.loi) && bang(maLS).SoTienNhanNoLanNay === 25000.5 && ctx.layChiTietTheoHoSo(maLS)[1].SoTien === 15000.5, nhapSaiLe.loi);
const sua = thu(() => ctx.luuHoSoGiaiNgan({ maHoSo: maLS, maHD: hd.maHD, loaiTien: 'USD', tyGiaBan: TY_GIA, duNoHienTai: 1500000000, soTienNhanNoLanNay: 25000, soGiayNhanNo: '48/2026-09-SUA', ngayGiaiNgan: '2026-09-15', chiTiet: [{ tenNguoiHuong: 'NCC 1', soTaiKhoan: '111', taiNganHang: 'NH', soTien: 10000 }, { tenNguoiHuong: 'NCC 2', soTaiKhoan: '222', taiNganHang: 'NH', soTien: 15000 }] }));
dat('Số lẻ lịch sử', 'Nhập lại số NGUYÊN mới → lưu được, số cũ thay bằng 25.000/15.000', sua.ok && bang(maLS).SoTienNhanNoLanNay === 25000 && ctx.layChiTietTheoHoSo(maLS)[1].SoTien === 15000 && ctx.layChiTietTheoHoSo(maLS)[1].SoTienQuyDoi === 392182500, sua.loi);
const nk = ctx.sheetToObjects_('NhatKyHeThong').filter(x => x.MaHoSo === maLS).map(x => x.HanhDong + ':' + x.ChiTiet);
dat('Nhật ký', 'Nhật ký ghi vết giá trị lẻ CŨ khi bị thay bằng số nguyên mới', nk.some(x => /SUA_HO_SO/.test(x) && /15000[.,]5|15\.000,5/.test(x)) && nk.some(x => /SUA_PHI_TIEN_TE/.test(x)), nk.join(' || ').slice(0, 220));
const sauSua = thu(() => ctx.taoTronBoTheoMau(maLS));
dat('Số lẻ lịch sử', 'Sau khi sửa thành số nguyên → phát hành được', sauSua.ok, sauSua.loi);

// ---------- 6. An toàn dữ liệu khi ghi nhiều dòng ----------
const maAT = taoHoSo('VND', chia(1000000, 4)).maHoSo;
const truocAT = JSON.stringify(ctx.layChiTietTheoHoSo(maAT).map(x => [x.STT, x.SoTien, x.TenNguoiHuong]));
shCt.loiGhi = { conLai: 0, err: 'Mô phỏng lỗi ghi Sheet giữa chừng' };
const ghiLoi = thu(() => ctx.luuHoSoGiaiNgan({ maHoSo: maAT, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 0, soTienNhanNoLanNay: 600000, chiTiet: [{ tenNguoiHuong: 'X', soTien: 100000 }, { tenNguoiHuong: 'Y', soTien: 500000 }] }));
shCt.loiGhi = null;
const sauAT = JSON.stringify(ctx.layChiTietTheoHoSo(maAT).map(x => [x.STT, x.SoTien, x.TenNguoiHuong]));
dat('An toàn dữ liệu', 'Ghi chi tiết lỗi giữa chừng → báo lỗi và PHỤC HỒI nguyên trạng 4 dòng cũ', !ghiLoi.ok && truocAT === sauAT && /giữ nguyên/.test(ghiLoi.loi), ghiLoi.loi);
dat('An toàn dữ liệu', 'Hồ sơ cha cũng được phục hồi (tổng vẫn 1.000.000)', bang(maAT).SoTienNhanNoLanNay === 1000000);
const khongKhop = thu(() => ctx.luuHoSoGiaiNgan({ maHoSo: maAT, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 0, soTienNhanNoLanNay: 999, chiTiet: [{ tenNguoiHuong: 'X', soTien: 1000 }] }));
dat('An toàn dữ liệu', 'Tổng khác tổng dòng bị từ chối', !khongKhop.ok && /không bằng tổng/.test(khongKhop.loi), khongKhop.loi);
G.nhatKyKhoa.tryLock = () => false;
const bi = thu(() => ctx.luuHoSoGiaiNgan({ maHoSo: maAT, maHD: hd.maHD, loaiTien: 'VND', duNoHienTai: 0, soTienNhanNoLanNay: 1, chiTiet: [{ tenNguoiHuong: 'X', soTien: 1 }] }));
const bi2 = thu(() => ctx.phatHanhChungTu_(maAT, 'DE_NGHI_GIAI_NGAN', null));
G.nhatKyKhoa.tryLock = () => true;
dat('Đồng thời', 'Khi đang có thao tác khác (khoá bận): lưu và phát hành đều bị từ chối rõ ràng', !bi.ok && /thử lại/.test(bi.loi) && !bi2.ok && /thử lại/.test(bi2.loi));

// ---------- 7. Khoá trạng thái ----------
ctx.danhDauDaGiaiNgan(hoSoTheoKB['VND – 1 dòng']);
const suaKhoa = thu(() => ctx.luuHoSoGiaiNgan({ maHoSo: hoSoTheoKB['VND – 1 dòng'], maHD: hd.maHD, loaiTien: 'VND', soTienNhanNoLanNay: 1, chiTiet: [{ tenNguoiHuong: 'X', soTien: 1 }] }));
dat('Khoá hồ sơ', 'Hồ sơ "Đã giải ngân" không sửa được', !suaKhoa.ok && /không thể sửa/.test(suaKhoa.loi));
const phatLaiKhoa = thu(() => ctx.taoDeNghiGiaiNganBIDV(hoSoTheoKB['VND – 1 dòng']));
dat('Chống trùng', 'Bấm lại ngay với cùng dữ liệu + cùng mẫu → dùng lại bản vừa tạo (không sinh file trùng)', phatLaiKhoa.ok && phatLaiKhoa.v.daCo === true && phatLaiKhoa.v.soLan === 1, phatLaiKhoa.loi);
const phatLai2 = thu(() => ctx.taoDeNghiGiaiNganBIDV(hoSoTheoKB['VND – 1 dòng'], { taoLai: true }));
dat('Khoá hồ sơ', 'Hồ sơ "Đã giải ngân" + "Tạo lại" = bản MỚI (L2), bản cũ giữ nguyên', phatLai2.ok && phatLai2.v.soLan === 2 && !phatLai2.v.daCo, phatLai2.loi);
ctx.huyGiaiNgan(hoSoTheoKB['VND – 1 dòng']);
const phatHuy = thu(() => ctx.taoDeNghiGiaiNganBIDV(hoSoTheoKB['VND – 1 dòng']));
dat('Khoá hồ sơ', 'Hồ sơ "Đã hủy" không phát hành chứng từ mới', !phatHuy.ok && /đã hủy/.test(phatHuy.loi));

// ---------- 9. Nhánh mặc định (chưa có mẫu DOCX) + tách đúng cột link ----------
// Dựng biểu mẫu bằng code dùng DocumentApp/Sheets thật của Google nên ở đây chỉ giả lập đầu ra để kiểm tra phần NỐI + GHI LINK.
ctx.taoDeNghiMacDinh_ = () => ({ docUrl: 'https://docs.example/DOC1', pdfUrl: 'https://drive.example/file/PDF1' });
ctx.taoChungTuMacDinh_ = () => ({ sheetUrl: 'https://sheet.example/S1', xlsxUrl: 'https://drive.example/file/XLSX1', pdfUrl: 'https://drive.example/file/PDF2', loai: 'Bảng kê chuyển tiền vay (nhiều khoản)' });
ctx.datTrangThaiMau('DE_NGHI_VND', 1, 'Hết hiệu lực'); ctx.datTrangThaiMau('BANG_KE_VND', 1, 'Hết hiệu lực');
const maMD = taoHoSo('VND', chia(300000, 3)).maHoSo;
const md = thu(() => ({ a: ctx.taoDeNghiGiaiNganBIDV(maMD), b: ctx.taoChungTuThanhToan(maMD) }));
if (!md.ok) console.log('DEBUG md:', md.loi);
dat('Nhánh mặc định', 'Không có mẫu hiệu lực → dùng biểu mẫu mặc định và nói rõ trong kết quả', md.ok && md.v.a.nguon === 'MAC_DINH_CODE' && md.v.a.canhBao.some(x => /Chưa có mẫu hiệu lực/.test(x)), md.loi);
const rMD = bang(maMD);
dat('Link', 'Mặc định: XLSX vào cột _XLSX, PDF vào cột _PDF (hết lỗi ghi xlsx vào _PDF)', rMD.Link_ChungTuThanhToan_XLSX === 'https://drive.example/file/XLSX1' && rMD.Link_ChungTuThanhToan_PDF === 'https://drive.example/file/PDF2' && rMD.Link_ChungTuThanhToan === 'https://sheet.example/S1' && rMD.Link_VanBanDeNghi === 'https://docs.example/DOC1' && !rMD.Link_VanBanDeNghi_DOCX);
const batMau = thu(() => ctx.phatHanhChungTu_(maMD, 'DE_NGHI_GIAI_NGAN', null, { batBuocMau: true }));
dat('Nhánh mặc định', 'Chế độ bắt buộc mẫu: báo lỗi hướng dẫn tải mẫu thay vì dùng mặc định', !batMau.ok && /Quản lý mẫu văn bản/.test(batMau.loi));
ctx.datTrangThaiMau('DE_NGHI_VND', 1, 'Hiệu lực'); ctx.datTrangThaiMau('BANG_KE_VND', 1, 'Hiệu lực');

// Sửa link cũ: dữ liệu cũ có xlsx nằm ở cột _PDF
const hCols = shHs.g[0], dMD = shHs.g.findIndex((r, i) => i > 0 && r[0] === maMD);
const fx = G.dsFile[idTuUrl('https://drive.example/file/XLSX1')] || null;
const xl = ctx.DriveApp.createFile(new G.Blob(Buffer.from('x'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'a.xlsx'));
xl.getMimeType = () => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const pf = ctx.DriveApp.createFile(new G.Blob(Buffer.from('%PDF'), 'application/pdf', 'a.pdf')); pf.getMimeType = () => 'application/pdf';
const maCu = taoHoSo('VND', [5000]).maHoSo, maCu2 = taoHoSo('VND', [6000]).maHoSo;
[[maCu, xl.getUrl()], [maCu2, pf.getUrl()]].forEach(([m, u]) => { const i = shHs.g.findIndex((r, k) => k > 0 && r[0] === m); shHs.g[i][hCols.indexOf('Link_ChungTuThanhToan_PDF')] = u; });
const sl = thu(() => ctx.suaLinkChungTuCuMenu());
dat('Dữ liệu cũ', 'Sửa link cũ: chỉ chuyển link .xlsx sang cột XLSX; PDF thật giữ nguyên', sl.ok && sl.v.length === 1 && bang(maCu).Link_ChungTuThanhToan_XLSX === xl.getUrl() && !bang(maCu).Link_ChungTuThanhToan_PDF && bang(maCu2).Link_ChungTuThanhToan_PDF === pf.getUrl() && !bang(maCu2).Link_ChungTuThanhToan_XLSX, sl.loi);

// ---------- 8. Không còn placeholder / không mất hồ sơ ----------
const tatCa = ctx.sheetToObjects_('HoSoGiaiNgan');
dat('Toàn vẹn', 'Không mất hồ sơ: đủ 7 kịch bản + hồ sơ lịch sử + hồ sơ an toàn (+3 hồ sơ phụ ở mục 9)', tatCa.length === kichBan.length + 2 + 3, String(tatCa.length));
const hsPh = ctx.sheetToObjects_('LichSuPhatHanhTaiLieu');
dat('Toàn vẹn', 'Mọi bản phát hành từ mẫu đều ghi mẫu+phiên bản+hash dữ liệu', hsPh.filter(x => x.Nguon === 'MAU_DOCX').every(x => x.MaMau && x.PhienBanMau && x.HashDuLieu && x.FileIdChinh && x.HashMau));

// ---------- In kết quả ----------
let nhom = ''; kq.forEach(([n, t, k, g]) => { if (n !== nhom) { console.log('\n== ' + n); nhom = n; } console.log(`  [${k}] ${t}${k === 'LỖI' && g ? '  → ' + g : ''}`); });
console.log(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi`);
fs.writeFileSync(path.join(RA, 'ket_qua_tich_hop.txt'), kq.map(x => x.join(' | ')).join('\n'));
process.exit(loi ? 1 : 0);
