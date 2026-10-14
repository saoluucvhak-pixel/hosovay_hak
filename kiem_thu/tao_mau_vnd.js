/* Tạo 2 MẪU HĐTD VND (1 khoản / nhiều khoản) từ 2 file Word thô của công ty BẰNG CHÍNH TRÌNH TẠO MẪU (TemplateBuilder.gs):
 * phanTichTepTho → chọn vùng → taoMauTuAnhXa. Đây là đúng các bước người dùng làm trên giao diện (không viết code riêng cho từng mẫu).
 *   node kiem_thu/tao_mau_vnd.js <thư_mục_chứa_2_file_gốc> [thư_mục_ra=mau_that]
 * File gốc tự dò: *HDTD_VND*MAU_1*.docx (1 khoản) và *HDTD_VND*MAU_2*.docx (nhiều khoản). Không đưa file gốc vào repo. */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..');
const SRC = path.resolve(process.argv[2] || '.'), OUT = path.resolve(process.argv[3] || path.join(GOC, 'mau_that'));
const TAM = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tmvnd_'));
const { ctx, mt } = require('./gia_lap_apps_script')(GOC, TAM);
mt.__.props['ADMIN_EMAILS'] = 'ketoan@example.com';
ctx.initializeSpreadsheet();
const cty = ctx.luuCongTy({ tenCty: 'Công ty TNHH Hoàng Anh Khôi', maCIF: '0401447476', maSoThue: '0401447476', diaChiTruSo: 'Thửa đất số 1182, tờ bản đồ số 38, thôn Thạch NhamTây,Xã Bà Nà, thành phố Đà Nẵng, Việt Nam', dienThoai: '0913.413.214', nguoiDaiDien: 'Võ Văn Phụng', chucVu: 'Giám đốc', taiKhoanVND: '562.0.727.934', taiKhoanUSD: '562.0.011.163' });
ctx.luuHopDong({ maCty: cty.maCty, soHopDong: '02/2026/8100173/HĐTD', ngayHopDong: '2026-09-04', tenNganHang: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', chiNhanh: 'Chi nhánh Quảng Nam', hanMucVay: 50000000000 });

const tim = (mau) => { const f = fs.readdirSync(SRC).filter(x => mau.test(x)); if (!f.length) throw new Error('Không thấy file ' + mau); return path.join(SRC, f[0]); };

/** Tìm vùng: trong đoạn (lọc bằng predicate) lấy khớp đầu tiên của regex; nhóm 1 (nếu có) là vùng cần thay, ngược lại cả khớp. */
function chon(ds, loc, re, khoa, { chen = false } = {}) {
  const d = ds.find(x => loc(x));
  if (!d) throw new Error('Không thấy đoạn cho ' + khoa);
  const m = re.exec(d.text); if (!m) throw new Error(`Đoạn "${d.text.slice(0, 50)}" không khớp ${re} (${khoa})`);
  const g = m[1] !== undefined ? m[1] : m[0], s = m.index + (m[1] !== undefined ? m[0].indexOf(m[1]) : 0);
  if (chen) return { doan: d.id, s: s + g.length, e: s + g.length, chuoi: '', khoa };
  return { doan: d.id, s, e: s + g.length, chuoi: g, khoa };
}

function taoMau(fileGoc, tenRa, nhieu) {
  const b64 = fs.readFileSync(fileGoc).toString('base64');
  const pt = ctx.phanTichTepTho(b64, path.basename(fileGoc));
  const ds = pt.doan, coChu = (t) => (x) => x.text.indexOf(t) >= 0 && !x.trongBang || false;
  const trong = (t) => (x) => x.text.indexOf(t) >= 0;
  let ax = [];
  // 1) Gợi ý tự động (trùng dữ liệu công ty/hợp đồng đã lưu + nhãn thường gặp + cấu trúc bảng thụ hưởng)
  pt.goiY.forEach(g => ax.push({ doan: g.doan, s: g.s, e: g.e, chuoi: g.chuoi, khoa: g.khoa }));
  const goiYKhoa = new Set(ax.map(a => a.khoa));
  // 2) Vùng người dùng chọn tay cho phần gợi ý chưa bắt được
  const them = (a) => { if (!ax.some(t => t.doan === a.doan && a.s < t.e && t.s < a.e && !(a.s === a.e && t.s === t.e && a.s !== t.s))) ax.push(a); };
  them(chon(ds, trong('Số Hợp đồng:'), /Số Hợp đồng:\s*([\d.]+\/\d{4}\/8100173(?:\/HĐTD)?)/, 'HO_SO.SO_GIAY_NHAN_NO'));
  them(chon(ds, trong('Kính gửi:'), /(Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)/, 'HOP_DONG.TEN_NGAN_HANG'));
  them(chon(ds, trong('Kính gửi:'), /(Chi nhánh Quảng Nam)/, 'HOP_DONG.CHI_NHANH'));
  them(chon(ds, trong('Bên vay:'), /Bên vay:\s*(.+?)\s*$/, 'CONG_TY.TEN'));
  them(chon(ds, trong('Địa chỉ:'), /Địa chỉ:\s*(.+?)\s*$/, 'CONG_TY.DIA_CHI'));
  them(chon(ds, trong('Điện thoại:'), /Điện thoại:\s*([\d. ]+?)\s*$/, 'CONG_TY.DIEN_THOAI'));
  them(chon(ds, trong('Giấy chứng nhận đăng ký doanh nghiệp'), /số\s+(\d{10})\s/, 'CONG_TY.MA_SO_THUE'));
  them(chon(ds, trong('Tài khoản tiền gửi VND'), /số:\s*([\d.]+)\s+tại/, 'CONG_TY.TAI_KHOAN_VND'));
  them(chon(ds, trong('Tài khoản tiền gửi USD'), /số:\s*([\d.]+)\s+tại/, 'CONG_TY.TAI_KHOAN_USD'));
  them(chon(ds, trong('Do ông:'), /Do ông:\s*(.+?)\s{2,}/, 'CONG_TY.NGUOI_DAI_DIEN'));
  them(chon(ds, trong('Do ông:'), /Chức vụ:\s*(.+?)\s+làm đại diện/, 'CONG_TY.CHUC_VU'));
  them(chon(ds, trong('Căn cứ: Hợp đồng tín dụng hạn mức'), /số:\s*(\S+)\s+ký ngày/, 'HOP_DONG.SO_HOP_DONG'));
  them(chon(ds, trong('Căn cứ: Hợp đồng tín dụng hạn mức'), /ký ngày\s+(\d{2}\/\d{2}\/\d{4})/, 'HOP_DONG.NGAY_KY'));
  them(chon(ds, trong('rút số tiền vay là'), /là:\s*([\d.,]+)\s/, 'HO_SO.SO_TIEN'));
  them(chon(ds, trong('rút số tiền vay là'), /Bằng chữ\s*:\s*(.+?đồng(?: y)?)(?=\s*\.?\/\.|\))/, 'HO_SO.SO_TIEN_BANG_CHU'));
  them(chon(ds, trong('Thời hạn vay'), /Thời hạn vay:\s*(\d+)/, 'HO_SO.THOI_HAN_VAY'));
  them(chon(ds, trong('Tài liệu liên quan'), /(Tài liệu liên quan: )/, 'HO_SO.TAI_LIEU_CHUNG_MINH', { chen: true }));
  them(chon(ds, trong('Đà Nẵng, ngày'), /(ngày\s*[.…\s]{2,}tháng\s*[.…\s]{2,}năm\s*[.…\s\d]*)/, 'NGAY.GIAI_NGAN_DAY_DU'));
  // bỏ khoảng trắng thừa ở cuối vùng "ngày … năm …"
  ax = ax.map(a => { while (a.chuoi.length && /\s$/.test(a.chuoi)) { a.chuoi = a.chuoi.slice(0, -1); a.e--; } return a; });
  // 3) Hàng bảng thừa: giữ 1 hàng mẫu (hàng dữ liệu đầu), xoá các hàng ví dụ còn lại trước hàng tổng "TC"
  const xoaHang = [];
  if (nhieu) {
    const soBang = (ds.find(x => x.trongBang && x.text.trim() === 'TC') || {}).bang;
    const bang = ds.filter(x => x.trongBang && x.bang === soBang);
    const hangTC = bang.find(x => x.text.trim() === 'TC');
    const ids = new Set(bang.filter(x => x.hang >= 3 && x.hang < hangTC.hang).map(x => x.hangId));
    ids.forEach(h => xoaHang.push({ phan: 'word/document.xml', hangId: h }));
    // hàng tổng: ô số tiền
    const o = bang.find(x => x.hang === hangTC.hang && /\d{1,3}(,\d{3})+/.test(x.text));
    const m = /[\d,]+/.exec(o.text);
    ax.push({ doan: o.id, s: m.index, e: m.index + m[0].length, chuoi: m[0], khoa: 'BANG_KE.TONG_TIEN_QUY_DOI' });
  }
  const kq = ctx.taoMauTuAnhXa(b64, path.basename(fileGoc), ax, xoaHang);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, tenRa), Buffer.from(kq.base64, 'base64'));
  console.log(`${tenRa}: ${ax.length} vùng thay (gợi ý tự động: ${pt.goiY.length}), xoá ${kq.soHangXoa} hàng, hợp lệ=${kq.hopLe}, hàng mẫu=${kq.coHangMau}, placeholder=${kq.placeholder.join(',')}`);
  if (!kq.hopLe) { console.log('LỖI:', kq.loi); process.exit(1); }
  if (kq.canhBao.length) console.log('  cảnh báo:', kq.canhBao.join(' | '));
}
taoMau(tim(/HDTD_VND.*MAU_1.*\.docx$/i), 'HDTD_VND_1_KHOAN.docx', false);
taoMau(tim(/HDTD_VND.*MAU_2.*\.docx$/i), 'HDTD_VND_NHIEU_KHOAN.docx', true);
