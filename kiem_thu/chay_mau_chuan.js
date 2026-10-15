/* MẪU CHUẨN (mau_chuan/*): đăng ký → tạo hồ sơ (VND 2/5/12/20 dòng, USD 2/5/12) → phát hành bằng ĐÚNG engine → PDF (LibreOffice) → kiểm tra
 * khổ A4 NGANG (Bảng kê) / DỌC (HĐMB), số trang, không còn {{...}}, tiền dạng 1.234.567, tổng/bằng chữ/chữ ký nằm cùng trang cuối, HĐMB đủ nội dung biểu mẫu công ty.
 * node kiem_thu/chay_mau_chuan.js [thư_mục_ra]   (cần LibreOffice: soffice, poppler: pdfinfo/pdftotext)   LƯU Ý: Apps Script giả lập. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const GOC = path.join(__dirname, '..'), RA = path.resolve(process.argv[2] || '/tmp/hosovay_mau_chuan'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const TI = require('./gia_lap_apps_script'); const { ctx, mt } = TI(GOC, path.join(RA, '_tam')); TI.khachHangDungRevision(ctx); const G = mt.__;
const _l = console.log; console.warn = () => {}; console.error = () => {}; console.log = () => {};
const kq = []; let loi = 0; const dat = (nhom, ten, ok, ct) => { kq.push([nhom, ten, ok]); if (!ok) loi++; _l(`  [${ok ? 'ĐẠT' : 'LỖI'}] ${nhom}: ${ten}${ok ? '' : '  → ' + String(ct || '').slice(0, 300)}`); };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
const b64 = (f) => fs.readFileSync(path.join(GOC, 'mau_chuan', f)).toString('base64');
const idUrl = (u) => String(u).split('/').pop();
const pdfInfo = (f) => { const t = cp.execFileSync('pdfinfo', [f]).toString(); const m = t.match(/Page size:\s+([\d.]+) x ([\d.]+)/); return { trang: +t.match(/Pages:\s+(\d+)/)[1], rong: +m[1], cao: +m[2] }; };
const pdfText = (f, trang) => cp.execFileSync('pdftotext', ['-layout'].concat(trang ? ['-f', String(trang), '-l', String(trang)] : [], [f, '-'])).toString();

ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx); G.props['ADMIN_EMAILS'] = 'ketoan@example.com';
const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY TNHH HOÀNG ANH KHÔI', maCIF: '0401447476', maSoThue: '0401447476', diaChiTruSo: 'Thửa đất số 1182, tờ bản đồ số 38, thôn Thạch Nham Tây, xã Bà Nà, Đà Nẵng', dienThoai: '0913.413.214', nguoiDaiDien: 'Võ Văn Phụng', chucVu: 'Giám đốc', taiKhoanVND: '562.0.727.934', taiKhoanUSD: '562.0.011.163' });
const hd = ctx.luuHopDong({ maCty: cty.maCty, soHopDong: '02/2026/8100173/HĐTD', ngayHopDong: '2026-09-04', tenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', chiNhanh: 'Chi nhánh Quảng Nam', diaChiChiNhanh: 'Xã Xuân Phú, thành phố Đà Nẵng', dienThoaiNH: '0235.3687888', giayUyQuyenNH: '993/GUQ-BIDV.QNA ngày 01/07/2026', nguoiDaiDienNH: 'Nguyễn Văn B', chucVuNH: 'Giám đốc', hanMucVay: 50000000000, soHopDongKhungMBNT: '01/2026/MBNT/BIDV-HAK', ngayHopDongKhungMBNT: '2026-01-05' });
[['BANG_KE_VND', 'BANG_KE_VND.xlsx', 'VND', 'CHUNG_TU_THANH_TOAN', '2+'], ['BANG_KE_USD', 'BANG_KE_USD.xlsx', 'USD', 'CHUNG_TU_THANH_TOAN', '2+'], ['HDMB_USD', 'HDMB_USD.docx', 'USD', 'HDMB_NGOAI_TE', '1+'], ['UNC_2LIEN', 'UNC_2LIEN.xlsx', 'TAT_CA', 'CHUNG_TU_THANH_TOAN', '1'],
  ['HDTD_USD_1', 'HDTD_USD_1_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '1'], ['HDTD_USD_N', 'HDTD_USD_NHIEU_KHOAN.docx', 'USD', 'DE_NGHI_GIAI_NGAN', '2-999'],
  ['HDTD_VND_1', 'HDTD_VND_1_KHOAN.docx', 'VND', 'DE_NGHI_GIAI_NGAN', '1'], ['HDTD_VND_N', 'HDTD_VND_NHIEU_KHOAN.docx', 'VND', 'DE_NGHI_GIAI_NGAN', '2-999']].forEach(([ma, f, lt, lct, dk]) => {
  const r = thu(() => ctx.taiMauVanBan({ maMau: ma, tenMau: 'Mẫu chuẩn ' + ma, nganHang: 'BIDV', loaiTien: lt, loaiTaiLieu: lct, dieuKienSoDong: dk, tenFile: f }, b64(f)));
  dat('Đăng ký', `${f} tải được, không cảnh báo lỗi placeholder lạ (${r.ok ? r.v.placeholder.length + ' placeholder' : ''})`, r.ok && !(r.v.canhBao || []).some(c => /không (có|tồn tại|nhận)|lạ/i.test(c)), r.loi || JSON.stringify(r.v && r.v.canhBao));
});
function hoSo(lt, n, tong, tyGia) {
  const co = Math.floor(tong / n), nhan = (i) => i === 0 ? 'CÔNG TY TNHH HOÀNG ANH KHÔI' : 'CÔNG TY CỔ PHẦN CẢNG ĐÀ NẴNG SỐ ' + i;
  const chiTiet = Array.from({ length: n }, (_, i) => ({ tenNguoiHuong: nhan(i), soTaiKhoan: '86' + (19299999 + i * 5000000), taiNganHang: 'BIDV _ CN Quảng Nam', loaiTien: lt, noiDungThanhToan: i === 0 ? 'Giải ngân mua keo lá tràm' : 'Chuyển tiền bốc xếp theo hóa đơn số ' + (12000 + i), soTien: i === n - 1 ? tong - co * (n - 1) : co, taiLieuSo: 'HD' + i, ngayTaiLieu: '14/10/2026' }));
  return ctx.luuHoSoGiaiNgan({ maHD: hd.maHD, soGiayNhanNo: '02.26/2026/8100173/HĐTD', ngayGiayNhanNo: '2026-10-14', duNoHienTai: 0, loaiTien: lt, tyGiaBan: lt === 'USD' ? tyGia : 0, soTienNhanNoLanNay: tong, phuongThucThanhToan: 'Chuyển khoản', mucDichSuDungVon: 'Bổ sung vốn lưu động', thoiHanChoVayNgay: 90, ngayGiaiNgan: '2026-10-14', ngayDenHan: '2027-01-12', chiTiet });
}
const CA = [['VND', 2, 999981460], ['VND', 5, 463520000], ['VND', 12, 1200000000], ['VND', 20, 2000000000], ['USD', 2, 38774], ['USD', 5, 25000], ['USD', 12, 60000],
  // quét các số dòng dễ làm phần cuối (tổng cộng/chữ ký) rơi một mình sang trang mới
  ['VND', 7, 700000000], ['VND', 8, 800000000], ['VND', 9, 900000000], ['VND', 10, 1000000000], ['VND', 11, 1100000000], ['VND', 14, 1400000000], ['VND', 25, 2500000000],
  ['USD', 8, 8000], ['USD', 9, 9000], ['USD', 10, 10000], ['USD', 11, 11000]];
const co_dau_phay = (t) => /\d,\d{3}/.test(t);
CA.forEach(([lt, n, tong], idx) => {
  const ten = `${lt}_${n}`, usd = lt === 'USD', ma = hoSo(lt, n, tong, 25790).maHoSo;
  const r = thu(() => ctx.taoChungTuThanhToan(ma, { expectedRevision: 1 }));
  dat('Phát hành', `${ten}: tạo Bảng kê thành công bằng mẫu ${usd ? 'BANG_KE_USD' : 'BANG_KE_VND'}`, r.ok && r.v.mau === (usd ? 'BANG_KE_USD' : 'BANG_KE_VND') && r.v.loaiFile === 'xlsx', r.loi);
  if (!r.ok) return;
  const x = path.join(RA, `bangke_${ten}.xlsx`), pdf = path.join(RA, `bangke_${ten}.pdf`);
  fs.writeFileSync(x, G.dsFile[r.v.fileIdChinh].blob.bytes); fs.writeFileSync(pdf, G.dsFile[idUrl(r.v.pdfUrl)].blob.bytes);
  const pi = pdfInfo(pdf), t = pdfText(pdf), cuoi = pdfText(pdf, pi.trang);
  dat('Bảng kê', `${ten}: khổ A4 NGANG (${Math.round(pi.rong)}×${Math.round(pi.cao)}pt), ${pi.trang} trang`, pi.rong > pi.cao && Math.abs(pi.rong - 842) < 3 && Math.abs(pi.cao - 595) < 3 && pi.trang <= (n <= 5 ? 1 : n <= 12 ? 2 : 3), JSON.stringify(pi));
  dat('Bảng kê', `${ten}: tiêu đề đầy đủ không bị cắt, có ngày 14/10/2026, tên đơn vị/địa chỉ/MST`, /BẢNG KÊ CHUYỂN TIỀN VAY NGÀY:\s*14\/10\/2026/.test(t) && /Tên đơn vị: CÔNG TY TNHH HOÀNG ANH KHÔI/.test(t) && /Địa chỉ: Thửa đất số 1182/.test(t) && /MST: 0401447476/.test(t), t.slice(0, 400));
  dat('Bảng kê', `${ten}: không còn {{…}}; tiền dạng 1.234.567 (không dấu phẩy); đủ ${n} dòng (Stt 1…${n})`, !/\{\{|\}\}/.test(t) && !co_dau_phay(t) && new RegExp('(^|\\n)\\s*' + n + '\\s+\\S').test(t), t.slice(0, 300));
  const tongVN = ctx.formatSo_(tong);
  dat('Bảng kê', `${ten}: không có trang cuối chỉ toàn Tổng cộng/chữ ký — trang cuối còn ít nhất 1 dòng dữ liệu (Stt ${n})`, new RegExp('(^|\\n)\\s*' + n + '\\s+\\S').test(cuoi), cuoi.slice(0, 300));
  dat('Bảng kê', `${ten}: có Tổng cộng ${tongVN}; có Bằng chữ; KẾ TOÁN TRƯỞNG/NGÂN HÀNG nằm ở TRANG CUỐI`, new RegExp('Tổng cộng[\\s\\S]*' + tongVN.replace(/\./g, '\\.')).test(t) && /Bằng chữ/.test(t) && /KẾ TOÁN TRƯỞNG/.test(cuoi) && /NGÂN HÀNG/.test(cuoi), cuoi.slice(-500));
  if (usd) dat('Bảng kê', `${ten}: USD có cột "Số tiền (USD)" và "Quy đổi (VND)", tỷ giá 25.790, quy đổi đúng`, /Số tiền \(USD\)/.test(t) && /Quy đổi \(VND\)/.test(t) && /Tỷ giá: 25\.790 USD\/VND/.test(t) && new RegExp(ctx.formatSo_(tong * 25790).replace(/\./g, '\\.')).test(t), t.slice(0, 600));
  if (usd) {
    const h = thu(() => ctx.taoHopDongMuaBanNgoaiTe(ma, { expectedRevision: 1 }));
    dat('HĐMB', `${ten}: tạo Hợp đồng mua bán ngoại tệ bằng mẫu HDMB_USD (đúng mẫu công ty, KHÔNG phải biểu mẫu dựng bằng code)`, h.ok && h.v.mau === 'HDMB_USD' && h.v.nguon === 'MAU_DOCX', h.loi || JSON.stringify(h.v));
    if (!h.ok) return;
    const d = path.join(RA, `hdmb_${ten}.docx`), p = path.join(RA, `hdmb_${ten}.pdf`);
    fs.writeFileSync(d, G.dsFile[h.v.fileIdChinh].blob.bytes); fs.writeFileSync(p, G.dsFile[idUrl(h.v.pdfUrl)].blob.bytes);
    const hi = pdfInfo(p), ht = pdfText(p), htRaw = cp.execFileSync('pdftotext', ['-raw', p, '-']).toString();
    dat('HĐMB', `${ten}: A4 dọc, ${hi.trang} trang (≤ 2); nếu sang trang 2 thì trang 2 có nội dung "HIỆU LỰC" (không phải trang chỉ có chữ ký)`, hi.rong < hi.cao && hi.trang <= 2 && (hi.trang === 1 || /HIỆU LỰC CỦA HỢP ĐỒNG/.test(pdfText(p, 2))), JSON.stringify(hi));
    dat('HĐMB', `${ten}: không kẻ khung (không có đường kẻ trong trang)`, !/[─│┌┐└┘├┤┬┴┼]/.test(ht), '');
    dat('HĐMB', `${ten}: có đủ các mục của biểu mẫu công ty (tiêu đề, Căn cứ HĐ khung, Bên A/Bên B, Thông tin giao dịch, Chỉ dẫn thanh toán, Hiệu lực 1-2-3, chữ ký)`, ['HỢP ĐỒNG MUA BÁN NGOẠI TỆ GIAO NGAY', '(Áp dụng giữa BIDV và Khách hàng đã ký Hợp đồng khung A01)', 'Căn cứ Hợp đồng khung số 01/2026/MBNT/BIDV-HAK', 'BÊN A: NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM', 'BÊN B: CÔNG TY TNHH HOÀNG ANH KHÔI (Khách', 'Giấy ủy quyền số: 993/GUQ-BIDV.QNA', 'THÔNG TIN GIAO DỊCH:', 'CHỈ DẪN THANH TOÁN:', 'HIỆU LỰC CỦA HỢP ĐỒNG', 'Hợp đồng này được lập thành 02 bản', 'NGÂN HÀNG', 'KHÁCH HÀNG', 'Kế toán trưởng'].every(s => htRaw.replace(/\s+/g, ' ').indexOf(s) >= 0), htRaw.slice(0, 500));
    dat('HĐMB', `${ten}: số liệu đúng: ${ctx.formatSo_(tong)} USD, tỷ giá 25.790, thanh toán ${ctx.formatSo_(tong * 25790)} VND, bằng chữ, ngày 14/10/2026, TK USD/VND, số giấy nhận nợ; không còn {{…}}`, new RegExp('Số tiền giao dịch: ' + ctx.formatSo_(tong).replace(/\./g, '\\.') + ' USD').test(ht) && /Tỷ giá: 25\.790 USD\/VND/.test(ht) && new RegExp('Số tiền thanh toán: ' + ctx.formatSo_(tong * 25790).replace(/\./g, '\\.') + ' VND').test(ht) && /Bằng chữ:/.test(ht) && /Ngày giao dịch: 14\/10\/2026/.test(ht) && /562\.0\.011\.163/.test(ht) && /562\.0\.727\.934/.test(ht) && /02\.26\/2026\/8100173\/HĐTD/.test(ht) && !/\{\{|\}\}/.test(ht) && !co_dau_phay(ht), ht.slice(0, 900));
    dat('HĐMB', `${ten}: ☒ Bán, ☐ Mua và các ô ☐ hiển thị đúng (không thành ô vuông lỗi); không có dòng chữ kéo giãn bất thường`, /☐\s*Mua/.test(ht) && /☒\s*Bán/.test(ht) && !/\S {12,}\S/.test(ht.split('\n').filter(l => /Địa chỉ|Người đại diện|Chức vụ/.test(l)).map(l => l.trim().replace(/\s{3,}/g, '  ')).join('\n')), ht.slice(0, 700));
  }
});
// ===== UNC 1 khoản: A4 DỌC, 2 liên (2 bản UNC) trên 1 tờ, mỗi bản ~ 1/2 tờ
[['VND', 500000054], ['USD', 19372]].forEach(([lt, tong]) => {
  const ten = `UNC_${lt}`, usd = lt === 'USD', tyGia = 25790, ma = hoSo(lt, 1, tong, tyGia).maHoSo;
  const r = thu(() => ctx.taoChungTuThanhToan(ma, { expectedRevision: 1 }));
  dat('UNC', `${ten}: hồ sơ 1 khoản → dùng mẫu UNC_2LIEN`, r.ok && r.v.mau === 'UNC_2LIEN' && r.v.loaiFile === 'xlsx', r.loi || JSON.stringify(r.v));
  if (!r.ok) return;
  const x = path.join(RA, `unc_${ten}.xlsx`), pdf = path.join(RA, `unc_${ten}.pdf`);
  fs.writeFileSync(x, G.dsFile[r.v.fileIdChinh].blob.bytes); fs.writeFileSync(pdf, G.dsFile[idUrl(r.v.pdfUrl)].blob.bytes);
  const pi = pdfInfo(pdf), t = pdfText(pdf), dem = (re) => (t.match(re) || []).length, vnd = ctx.formatSo_(tong * (usd ? tyGia : 1));
  dat('UNC', `${ten}: A4 DỌC, đúng 1 trang (${Math.round(pi.rong)}×${Math.round(pi.cao)}pt, ${pi.trang} trang)`, pi.rong < pi.cao && Math.abs(pi.rong - 595) < 3 && Math.abs(pi.cao - 842) < 3 && pi.trang === 1, JSON.stringify(pi));
  dat('UNC', `${ten}: có đúng 2 liên (2 lần "ỦY NHIỆM CHI", "Liên 1", "Liên 2") và đường cắt ✂`, dem(/ỦY NHIỆM CHI/g) === 2 && /Liên 1/.test(t) && /Liên 2/.test(t) && /✂/.test(t), t.slice(0, 200));
  dat('UNC', `${ten}: mỗi thông tin xuất hiện đủ 2 lần: tên người trả, người hưởng, số tài khoản, ${vnd} VND, nội dung, ngày 14/10/2026`, dem(/CÔNG TY TNHH HOÀNG ANH KHÔI/g) >= 4 && dem(/562\.0\.727\.934|562\.0\.727\.9/g) >= 2 && dem(new RegExp(vnd.replace(/\./g, '\\.') + ' VND', 'g')) === 2 && dem(/Giải ngân mua keo lá tràm/g) === 2 && dem(/14\/10\/2026/g) === 2, t.slice(0, 600));
  dat('UNC', `${ten}: không còn {{…}}, không có dấu phẩy ngăn nghìn`, !/\{\{|\}\}/.test(t) && !co_dau_phay(t), t.slice(0, 300));
  dat('UNC', `${ten}: số tiền bằng chữ có mặt ở cả 2 liên`, dem(/Số tiền bằng chữ/g) === 2 && dem(/đồng/g) >= 2, '');
});
// ===== HĐTD: NGUYÊN BẢN (chữ y hệt mẫu thật), chỉ nới lề ô bảng
const sosanh = cp.execFileSync('python3', ['-I', '-c', `
import docx, sys, json
def van_ban(p):
    d = docx.Document(p); o = [x.text for x in d.paragraphs]
    for t in d.tables:
        for r in t.rows:
            for c in r.cells: o.append(c.text)
    return o
kq = {}
for f in ['HDTD_USD_1_KHOAN.docx','HDTD_USD_NHIEU_KHOAN.docx','HDTD_VND_1_KHOAN.docx','HDTD_VND_NHIEU_KHOAN.docx']:
    a = van_ban(sys.argv[1] + '/mau_that/' + f); b = van_ban(sys.argv[1] + '/mau_chuan/' + f)
    d = docx.Document(sys.argv[1] + '/mau_chuan/' + f)
    kq[f] = [a == b, any('tblCellMar' in t._tbl.xml for t in d.tables)]
print(json.dumps(kq))
`, GOC]).toString();
Object.entries(JSON.parse(sosanh)).forEach(([f, [giong, coLe]]) => dat('HĐTD', `${f}: chữ GIỐNG HỆT mẫu thật (nguyên bản) và có lề trong ô bảng`, giong && coLe, f));
[['USD', 1, 19372], ['USD', 5, 25000], ['USD', 20, 80000], ['VND', 1, 169360000], ['VND', 5, 463520000], ['VND', 20, 2000000000]].forEach(([lt, n, tong]) => {
  const ten = `HDTD_${lt}_${n}`, ma = hoSo(lt, n, tong, 25790).maHoSo;
  const r = thu(() => ctx.taoDeNghiGiaiNganBIDV(ma, { expectedRevision: 1 }));
  dat('HĐTD', `${ten}: tạo đề nghị giải ngân bằng mẫu ${lt === 'USD' ? 'HDTD_USD_' : 'HDTD_VND_'}${n === 1 ? '1' : 'N'}`, r.ok && r.v.mau === (lt === 'USD' ? 'HDTD_USD_' : 'HDTD_VND_') + (n === 1 ? '1' : 'N'), r.loi || JSON.stringify(r.v));
  if (!r.ok) return;
  const d = path.join(RA, `hdtd_${ten}.docx`), pdf = path.join(RA, `hdtd_${ten}.pdf`);
  fs.writeFileSync(d, G.dsFile[r.v.fileIdChinh].blob.bytes); fs.writeFileSync(pdf, G.dsFile[idUrl(r.v.pdfUrl)].blob.bytes);
  const pi = pdfInfo(pdf), t = pdfText(pdf), last = pdfText(pdf, pi.trang);
  dat('HĐTD', `${ten}: không còn {{…}}, tiền không dấu phẩy sai, đủ ${n} dòng (Stt), ${pi.trang} trang`, !/\{\{|\}\}/.test(t) && new RegExp('(^|\\n)\\s*' + String(n).padStart(2, '0') + '\\s+\\S').test(t), t.slice(0, 300));
  dat('HĐTD', `${ten}: trang cuối KHÔNG chỉ có chữ ký (có thêm nội dung cam kết/bảng)`, pi.trang === 1 || last.replace(/\s+/g, ' ').replace(/KẾ TOÁN TRƯỞNG|BÊN VAY|\(Ký[^)]*\)/g, '').trim().length > 250, last.slice(0, 300));
});
// Số dòng khác nhau chọn đúng mẫu; hồ sơ 1 dòng vẫn dùng UNC (không thuộc phạm vi bảng kê)
_l(`\nTỔNG: ${kq.length} khẳng định, ${kq.length - loi} đạt, ${loi} lỗi. File: ${RA}`);
process.exit(loi ? 1 : 0);
