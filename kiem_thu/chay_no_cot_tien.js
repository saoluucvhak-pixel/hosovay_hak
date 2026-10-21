// Kiểm thử nới cột số tiền trong bảng DOCX (TABLERENDERER.gs): cột hẹp được nới, tổng bề rộng giữ nguyên.
const path = require('path');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(require('os').tmpdir(), 'hosovay_no_cot_tien');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx } = TI(root, out);
let ok = 0; const dat = (t) => { ok++; console.log('PASS ' + t); };

const o = (w, noi) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${noi}</w:t></w:r></w:p></w:tc>`;
const bang = (grid, hang) => `<w:tbl><w:tblPr><w:tblW w:w="${grid.reduce((a, b) => a + b, 0)}" w:type="dxa"/></w:tblPr><w:tblGrid>${grid.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${hang}</w:tbl>`;
const tr = (cells) => `<w:tr>${cells}</w:tr>`;
const luoi = (xml) => [...xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(m => Number(m[1]));
const tcw = (xml) => [...xml.matchAll(/<w:tcW w:w="(\d+)"/g)].map(m => Number(m[1]));

// 1. Cột số tiền 1000 twip (hẹp) bị nới lên 2400; cột rộng nhất (Tên đơn vị 6000) nhường phần chênh
const canh1 = [];
const xml1 = bang([600, 1400, 1000, 6000], tr(o(600, 'STT') + o(1400, 'Nội dung') + o(1000, '{{MON_1.SO_TIEN_VN}}') + o(6000, 'Tên đơn vị')));
const kq1 = ctx.docxNoRongCotTien_(xml1, canh1);
assert.deepEqual(luoi(kq1), [600, 1400, 2400, 4600]);
assert.equal(luoi(kq1).reduce((a, b) => a + b, 0), 9000);
assert.deepEqual(tcw(kq1), [600, 1400, 2400, 4600]);
dat('Cột số tiền 1000 → 2400, cột đơn vị 6000 → 4600, tổng bề rộng bảng 9000 giữ nguyên, tcW đồng bộ');

// 2. Cột đã đủ rộng: không đổi gì
const xml2 = bang([600, 1400, 3000, 6000], tr(o(600, 'STT') + o(1400, 'Nội dung') + o(3000, '{{CT.SO_TIEN}}') + o(6000, 'Tên')));
assert.equal(ctx.docxNoRongCotTien_(xml2, []), xml2);
dat('Cột số tiền đã đủ rộng → giữ nguyên');

// 3. Bảng không có placeholder số tiền: không đổi
const xml3 = bang([1000, 2000], tr(o(1000, 'A') + o(2000, '{{TEN_NGUOI_HUONG}}')));
assert.equal(ctx.docxNoRongCotTien_(xml3, []), xml3);
dat('Bảng không có số tiền → không đổi');

// 4. Bảng có ô gộp ngang: bỏ qua để không làm lệch lưới
const xml4 = bang([1000, 2000, 3000], tr('<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>x</w:t></w:r></w:p></w:tc>' + o(3000, '{{SO_TIEN}}')));
assert.equal(ctx.docxNoRongCotTien_(xml4, []), xml4);
dat('Bảng có gridSpan → bỏ qua');

// 5. Không đủ chỗ nhường (cột khác cũng hẹp): báo cảnh báo, không làm sai lưới
const canh5 = [];
const xml5 = bang([1500, 1000, 1500], tr(o(1500, 'A') + o(1000, '{{SO_TIEN}}') + o(1500, 'B')));
const kq5 = ctx.docxNoRongCotTien_(xml5, canh5);
assert.equal(luoi(kq5).reduce((a, b) => a + b, 0), 4000);
assert.ok(canh5.length === 1 && /không đủ chỗ/.test(canh5[0]));
dat('Không đủ chỗ nhường → cảnh báo, tổng bề rộng vẫn giữ nguyên');

// 6. Đi qua đường xử lý DOCX thật (docxXuLyXml_): cột được nới trong kết quả cuối
const kq6 = ctx.docxXuLyXml_(xml1, {}, []).xml;
assert.deepEqual(luoi(kq6), [600, 1400, 2400, 4600]);
dat('docxXuLyXml_ áp dụng nới cột trước khi thay placeholder');

console.log('\nTỔNG: ' + ok + ' kiểm tra nới cột số tiền đạt, 0 lỗi');
