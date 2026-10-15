/* Kiểm thử đơn vị: engine XML (tình huống biên), quy tắc tiền, nhập hoá đơn/bảng lương. Chạy: node kiem_thu/chay_thu_logic.js */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const GOC = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, Date, JSON, Number, String, Object, Array, RegExp, Error, BigInt, isNaN, isFinite, parseInt, parseFloat,
  Utilities: { formatDate: () => '01/01/2026', computeDigest: () => [1], DigestAlgorithm: { MD5: 'MD5' } } });
fs.readdirSync(GOC).filter(f => f.endsWith('.gs')).forEach(f => vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, { filename: f }));
let loi = 0, tong = 0;
function dat(ten, ok, ghi) { tong++; if (!ok) loi++; console.log(`  [${ok ? 'ĐẠT' : 'LỖI'}] ${ten}${!ok && ghi ? '  → ' + ghi : ''}`); }
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: e.message }; } };
const P = (inner) => `<w:p><w:r><w:t>${inner}</w:t></w:r></w:p>`;
const X = (body) => `<w:document><w:body>${body}</w:body></w:document>`;
const xl = (xml, map, ds) => ctx.docxXuLyXml_(xml, map || {}, ds || []);
const txt = (xml) => ctx.docxGiaiMa_((xml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''));

console.log('== Engine: tách run, ký tự đặc biệt, giữ nguyên');
let x = X(`<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Số: {{HO_SO.SO_</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>TIEN</w:t></w:r><w:r><w:t xml:space="preserve">}} đồng</w:t></w:r></w:p>`);
let r = xl(x, { 'HO_SO.SO_TIEN': '25.000' });
dat('Placeholder tách 3 run → 1 giá trị, giữ định dạng run đầu (đậm)', txt(r.xml) === 'Số: 25.000 đồng' && /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">Số: 25\.000/.test(r.xml) && r.conLai.length === 0, r.xml);
r = xl(X(P('A {{HO_SO.MA}} B')), { 'HO_SO.MA': 'C&C <x> "q" $& $1 \'z\'' });
dat('Ký tự & < > " $& $1 được mã hoá, không bị hiểu thành mẫu thay thế', txt(r.xml) === 'A C&C <x> "q" $& $1 \'z\' B', txt(r.xml));
dat('Kết quả vẫn là XML cân thẻ', (r.xml.match(/<w:t/g) || []).length === (r.xml.match(/<\/w:t>/g) || []).length);
const khong = '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Điều khoản cố định, không placeholder</w:t></w:r></w:p>';
dat('Đoạn không có placeholder giữ NGUYÊN từng byte', xl(X(khong + P('{{HO_SO.MA}}')), { 'HO_SO.MA': 'M' }).xml.indexOf(khong) >= 0);
r = xl(X(P('Q: {{KHONG.TON_TAI}} và {{HO_SO.MA}}')), { 'HO_SO.MA': 'M' });
dat('Placeholder lạ được báo (conLai) và để nguyên', r.conLai.join() === 'KHONG.TON_TAI' && /\{\{KHONG\.TON_TAI\}\}/.test(r.xml));
r = xl(X(P('Gõ sai {{HO_SO.MA} và {HO_SO.MA}}')), { 'HO_SO.MA': 'M' });
dat('Ngoặc gõ sai được phát hiện (conNgoac) để chặn phát hành', r.conNgoac.length === 1, JSON.stringify(r.conNgoac));
r = xl(X(P('{{ HO_SO.MA }}-{{HO_SO.MA}}')), { 'HO_SO.MA': 'Z' });
dat('Có khoảng trắng trong {{ KEY }} vẫn nhận', txt(r.xml) === 'Z-Z');
r = xl(X(P('a{{HO_SO.MA}}b')), { 'HO_SO.MA': ' x ' });
dat('Khoảng trắng đầu/cuối giá trị được giữ (xml:space)', /xml:space="preserve"/.test(r.xml) && txt(r.xml) === 'a x b');
r = xl(X(P('{{HO_SO.MUC_DICH}}')), { 'HO_SO.MUC_DICH': 'dòng 1\ndòng 2' });
dat('Xuống dòng trong giá trị → <w:br/>', /dòng 1<\/w:t><w:br\/><w:t xml:space="preserve">dòng 2/.test(r.xml));
r = xl(X(P('{{HO_SO.MA}}')), { 'HO_SO.MA': '{{HO_SO.MA}}' });
dat('Giá trị chứa "{{...}}" không bị đệ quy', r.conNgoac.length === 1);

console.log('== Engine: nhân bản hàng bảng');
const hang = (them) => `<w:tr ${them || ''}><w:trPr><w:cantSplit/></w:trPr><w:tc><w:p><w:bookmarkStart w:id="7" w:name="b"/><w:r><w:t>{{CT.STT}}</w:t></w:r><w:bookmarkEnd w:id="7"/></w:p></w:tc><w:tc><w:p w14:paraId="AAAA1111"><w:r><w:t>{{CT.TEN}}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>{{CT.SO_TIEN}}</w:t></w:r></w:p></w:tc></w:tr>`;
const tbl = (h) => `<w:tbl><w:tr><w:tc><w:p><w:r><w:t>TT</w:t></w:r></w:p></w:tc></w:tr>${h}<w:tr><w:tc><w:p><w:r><w:t>Tổng {{BANG_KE.TONG_TIEN}}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`;
const ds3 = [1, 2, 3].map(i => ({ 'CT.STT': String(i), 'CT.TEN': 'NCC ' + i + ' & Co', 'CT.SO_TIEN': (i * 1000).toLocaleString('vi-VN') }));
r = xl(X(tbl(hang())), { 'BANG_KE.TONG_TIEN': '6.000' }, ds3);
dat('1 hàng mẫu → 3 hàng, tiêu đề + hàng tổng nguyên vẹn', (r.xml.match(/<w:tr[ >]/g) || []).length === 5 && r.soHangMau === 1 && r.soHangTao === 3 && txt(r.xml).indexOf('Tổng 6.000') >= 0, txt(r.xml));
dat('Giá trị theo từng dòng đúng thứ tự', txt(r.xml).indexOf('TT1NCC 1 & Co1.0002NCC 2 & Co2.0003NCC 3 & Co3.000Tổng 6.000') >= 0, txt(r.xml));
dat('Bookmark/paraId trùng bị bỏ ở bản nhân bản, giữ ở hàng đầu', (r.xml.match(/bookmarkStart/g) || []).length === 1 && (r.xml.match(/w14:paraId/g) || []).length === 1);
r = xl(X(tbl(hang())), { 'BANG_KE.TONG_TIEN': '0' }, []);
dat('0 dòng thụ hưởng → hàng mẫu bỏ + cảnh báo', (r.xml.match(/<w:tr[ >]/g) || []).length === 2 && r.canhBao.some(c => /không có dòng thụ hưởng/.test(c)));
r = xl(X(tbl(hang()).replace('<w:trPr><w:cantSplit/></w:trPr><w:tc>', '<w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr>')), { 'BANG_KE.TONG_TIEN': '0' }, ds3);
dat('Hàng mẫu có vMerge → cảnh báo bố cục', r.canhBao.some(c => /vMerge/.test(c)));
r = xl(X('<w:p><w:r><w:txbxContent><w:p><w:r><w:t>{{HO_SO.MA}}</w:t></w:r></w:p></w:txbxContent></w:r></w:p>'), { 'HO_SO.MA': 'M' });
dat('Hộp văn bản (text box): vẫn thay + có cảnh báo', /M/.test(txt(r.xml)) && r.canhBao.some(c => /text box/.test(c)));
const ds20 = Array.from({ length: 20 }, (_, i) => ({ 'CT.STT': String(i + 1), 'CT.TEN': 'T' + (i + 1), 'CT.SO_TIEN': '1' }));
r = xl(X(tbl(hang())), { 'BANG_KE.TONG_TIEN': '20' }, ds20);
dat('20 dòng → 20 hàng + 2', (r.xml.match(/<w:tr[ >]/g) || []).length === 22 && r.soHangTao === 20);
const bangLong = `<w:tbl><w:tr><w:tc>${'<w:tbl>' + hang() + '</w:tbl>'}<w:p/></w:tc></w:tr></w:tbl>`;
r = xl(X(bangLong), {}, ds3);
dat('Bảng lồng nhau: hàng mẫu ở bảng con vẫn nhân bản đúng', r.soHangTao === 3);
r = xl(X(P('Người hưởng: {{CT.TEN}} - {{CT.SO_TIEN}}')), {}, [ds3[0]]);
dat('Mẫu 1 khoản: {{CT.*}} ngoài bảng điền theo dòng duy nhất', txt(r.xml) === 'Người hưởng: NCC 1 & Co - 1.000');
r = xl(X(P('Người hưởng: {{CT.TEN}}')), {}, ds3);
dat('Mẫu 1 khoản dùng cho hồ sơ 3 dòng → báo {{CT.TEN}} chưa xử lý (không điền bừa)', r.conLai.join() === 'CT.TEN');

console.log('== Quy tắc tiền');
const T = (f) => thu(f);
dat('25.000 USD hợp lệ', T(() => ctx.docTienNguyen_('25.000')).v === 25000);
dat('25.000,50 báo lỗi', !T(() => ctx.docTienNguyen_('25.000,50')).ok);
dat('25.000 VND hợp lệ', T(() => ctx.docTienNguyen_('25.000')).v === 25000);
dat('25.000,50 VND báo lỗi', !T(() => ctx.docTienNguyen_('25.000,50')).ok);
dat('0,5 báo lỗi; 15000.50 báo lỗi; 25000.5 (số) báo lỗi; -5 báo lỗi', ['0,5', '15000.50', 25000.5, '-5'].every(v => !T(() => ctx.docTienNguyen_(v)).ok));
dat('Không tự biến 25.000,50 thành 25.001 hoặc 25.000', !T(() => ctx.docTienNguyen_('25.000,50')).ok);
dat('USD bằng chữ 25000 = "Hai mươi lăm ngàn đô la Mỹ"', ctx.soTienUSDBangChu_(25000) === 'Hai mươi lăm ngàn đô la Mỹ');
dat('Không tạo chữ "cents" cho số lẻ (từ chối)', !T(() => ctx.soTienUSDBangChu_(25000.77)).ok);
dat('Bằng chữ VND 463.520.000', ctx.soThanhChuVN(463520000) === 'Bốn trăm sáu mươi ba triệu, năm trăm hai mươi ngàn đồng chẵn');
dat('Quy đổi: 25.000 × 26.145,5 = 653.637.500', ctx.quyDoiUSDSangVND_(25000, 26145.5) === 653637500);
dat('Quy đổi làm tròn nửa lên: 1 × 26145.5 = 26146; 3 × 0.1 = 0', ctx.quyDoiUSDSangVND_(1, 26145.5) === 26146 && ctx.quyDoiUSDSangVND_(3, 0.1) === 0);
const exact = (BigInt(123456789) * BigInt(2614555) + BigInt(50)) / BigInt(100);
dat('Quy đổi số lớn 123.456.789 × 26.145,55 khớp tính BigInt độc lập', ctx.quyDoiUSDSangVND_(123456789, 26145.55) === Number(exact), String(exact));
dat('Tổng tiền nguyên chính xác (không dùng số thực)', ctx.tongTienNguyen_([1, 2, 3]) === 6 && !T(() => ctx.tongTienNguyen_([1, 2.5])).ok);
dat('Tỷ giá cho phép thập phân: "26.145,5" → 26145.5; "26.145" → 26145', ctx.docTyGia_('26.145,5') === 26145.5 && ctx.docTyGia_('26.145') === 26145);

console.log('== Nhập hoá đơn / bảng lương');
dat('Nguồn "7.234.567,5" giữ đúng 7234567.5 (không cắt thành 7234)', ctx.soTuChuoiHoacSo_('7.234.567,5') === 7234567.5);
dat('Nguồn "7,234,567" (US) = 7234567; "7.234.567" (VN) = 7234567', ctx.soTuChuoiHoacSo_('7,234,567') === 7234567 && ctx.soTuChuoiHoacSo_('7.234.567') === 7234567);
dat('Nguồn số thực 7234567.5 giữ nguyên để nơi nhận từ chối', ctx.soTuChuoiHoacSo_(7234567.5) === 7234567.5);
dat('XML hoá đơn "25000000" = 25000000; "25000000.00" = 25000000 (không phải 2,5 tỷ)', ctx.soTienTuXml_('25000000') === 25000000 && ctx.soTienTuXml_('25000000.00') === 25000000);
dat('XML hoá đơn "1234.56" (có xu) → 0, không cắt/làm tròn', ctx.soTienTuXml_('1234.56') === 0);
dat('OCR "15.000.000" = 15000000; "15.000.000,00" = 15000000; "15.000.000,50" → 0', ctx.soTuChuoiTien_('15.000.000') === 15000000 && ctx.soTuChuoiTien_('15.000.000,00') === 15000000 && ctx.soTuChuoiTien_('15.000.000,50') === 0);
dat('OCR "15,000,000" (ngăn nghìn bằng phẩy) = 15000000', ctx.soTuChuoiTien_('15,000,000') === 15000000);

console.log('== Kiểm tra trước phát hành');
function dl(over) {
  const d = { hoSo: { MaHoSo: 'HS1', LoaiTien: 'USD', TyGiaBan: 26145.5, DuNoHienTai: 0, SoTienNhanNoLanNay: 25000, SoTienBangChu: 'Hai mươi lăm ngàn đô la Mỹ' },
    chiTiet: [{ SoTien: 10000, SoTienQuyDoi: 261455000 }, { SoTien: 15000, SoTienQuyDoi: 392182500 }] };
  return over ? over(d) : d;
}
dat('Dữ liệu hợp lệ → đạt', T(() => ctx.kiemTraTienDePhatHanh_(dl())).ok);
let e = T(() => ctx.kiemTraTienDePhatHanh_(dl(d => { d.chiTiet[1].SoTien = 15000.5; return d; })));
dat('Số lẻ dòng 2 → chặn, chỉ rõ "ChiTietThuHuong dòng 2 – SoTien"', !e.ok && /dòng 2 – SoTien/.test(e.loi), e.loi);
e = T(() => ctx.kiemTraTienDePhatHanh_(dl(d => { d.chiTiet[0].SoTienQuyDoi = 261455001; return d; })));
dat('Quy đổi lệch → chặn, nêu công thức ROUND', !e.ok && /ROUND\(10\.000 × 26\.145,5\)/.test(e.loi), e.loi);
e = T(() => ctx.kiemTraTienDePhatHanh_(dl(d => { d.hoSo.SoTienNhanNoLanNay = 24999; return d; })));
dat('Tổng lệch → chặn', !e.ok && /Tổng các dòng/.test(e.loi));
e = T(() => ctx.kiemTraTienDePhatHanh_(dl(d => { d.hoSo.SoTienBangChu = 'Hai mươi lăm ngàn đô la Mỹ và 50 cents'; return d; })));
dat('Bằng chữ không khớp bằng số → chặn', !e.ok && /SoTienBangChu/.test(e.loi));
e = T(() => ctx.kiemTraTienDePhatHanh_(dl(d => { d.chiTiet = []; return d; })));
dat('Không có dòng thụ hưởng → chặn', !e.ok && /chưa có dòng thụ hưởng/.test(e.loi));
e = T(() => ctx.kiemTraTienDePhatHanh_(dl(d => { d.hoSo.TyGiaBan = 0; return d; })));
dat('USD thiếu tỷ giá → chặn', !e.ok && /TyGiaBan/.test(e.loi));
e = T(() => ctx.kiemTraTienDePhatHanh_(dl(d => { d.hoSo.SoTienNhanNoLanNay = 25000.5; d.chiTiet[1].SoTien = 15000.5; return d; })));
dat('Nhiều lỗi cùng lúc → liệt kê đủ từng trường', !e.ok && /SoTienNhanNoLanNay/.test(e.loi) && /dòng 2 – SoTien/.test(e.loi));

console.log(`\nTỔNG: ${tong} khẳng định, ${tong - loi} đạt, ${loi} lỗi`);
process.exit(loi ? 1 : 0);
