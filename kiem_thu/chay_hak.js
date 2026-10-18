const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const {ctx} = require('./gia_lap_apps_script')(root, path.resolve(process.argv[2] || path.join(__dirname, 'ket_qua_hak/hak'), '_tam'));
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
test('Reject reversed, invalid and unsupported filters before reading Sheets', () => {
  assert.throws(() => ctx.layTrangHoSo_({filters:{tuNgay:'2026-10-20',denNgay:'2026-10-01'}}), /Từ ngày/);
  assert.throws(() => ctx.layTrangHoSo_({filters:{tuNgay:'2026-02-31'}}), /không hợp lệ/);
  assert.throws(() => ctx.layTrangHoSo_({filters:{unknown:'x'}}), /chưa hỗ trợ/);
});
test('Filter preserves rows and supports Vietnamese search and combined conditions', () => {
  const row = ['HS1','HD1','GNN1','2026-10-17','','VND',100,'Nháp',1,2,0,''];
  const missing = ['HS2','HD1','GNN2','','','USD',20,'Nháp',1,3,0,''];
  const rows = [row, missing], snapshot = JSON.stringify(rows);
  const config = ctx.taoBoLocHoSoHak_({trangThai:['Nháp'],tuNgay:'2026-10-01',denNgay:'2026-10-31'}, 'dang');
  const context = {tra:{hd:{HD1:{MaCty:'CT1'}},cty:{CT1:{TenCty:'Đặng An'}}},nguoi:null};
  const result = ctx.HAK_SF_.filterRows(rows,config.config,config.state,context);
  assert.equal(result.rows.length,1); assert.equal(result.rows[0][0],'HS1');
  assert.equal(JSON.stringify(rows),snapshot);
  assert.ok(ctx.HAK_SF_.scopeText(config.config,config.state).includes('2026') || ctx.HAK_SF_.scopeText(config.config,config.state).includes('10/'));
});
test('Single-page XLSX print settings are honored without shrinking long tables', () => {
  const part = xml => ({getName:()=> 'xl/worksheets/sheet1.xml',getDataAsString:()=>xml});
  const xml = '<worksheet><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><pageMargins left="0.4" right="0.4" top="0.35" bottom="0.35"/><pageSetup orientation="portrait" paperSize="9" fitToHeight="1" fitToWidth="1"/></worksheet>';
  const options = ctx.tuyChonPdfMotTrangXlsx_([part(xml)]);
  assert.equal(options.scale,'4'); assert.equal(options.size,'A4'); assert.equal(options.portrait,'true'); assert.equal(options.top_margin,'0.35');
  assert.equal(ctx.tuyChonPdfMotTrangXlsx_([part(xml.replace('fitToHeight="1"','fitToHeight="0"'))]),null);
  assert.equal(ctx.tuyChonPdfMotTrangXlsx_([part(xml),part(xml)]),null);
  assert.equal(ctx.tuyChonPdfMotTrangXlsx_([part(xml.replace('paperSize="9"','paperSize="8"'))]),null);
});

test('Template repair handles XML character entities and preserves unrelated cells', () => {
  vm.runInContext(fs.readFileSync(path.join(root,'tools/google-repair-templates.gs'),'utf8'),ctx);
  const counts = [0];
  const xml = '<c r="E8"><is><t>S&#7889; ti&#7873;n (USD)</t></is></c><c r="A1"><is><t>Account USD</t></is></c>';
  const fixed = ctx.suaNhanBangKeVndXml_(xml,[['Số tiền (USD)','Số tiền (VND)']],counts);
  assert.equal(counts[0],1); assert.ok(fixed.includes('<t>Số tiền (VND)</t>'));
  assert.ok(fixed.includes('<c r="A1"><is><t>Account USD</t></is></c>'));
});

test('Mixed currency report has independent totals', () => {
  const text = ctx.tongNguyenTeBaoCao_([{loaiTien:'VND',soTienVay:100},{loaiTien:'USD',soTienVay:20},{loaiTien:'VND',soTienVay:50}]);
  assert.ok(text.includes('150 VND')); assert.ok(text.includes('20 USD')); assert.ok(!text.includes('170'));
});
test('Report date matches actual or planned filter without changing stored dates', () => {
  const names = ['docDanhSachHoSo_', 'sheetToObjects_', 'docXacNhanGN_'];
  const saved = Object.fromEntries(names.map(n => [n,ctx[n]]));
  const record = {MaHoSo:'HS-DATE',MaHD:'HD-DATE',LoaiTien:'VND',NgayGiaiNgan:'2026-09-15',TrangThai:'Đã giải ngân'};
  const confirmation = {MaHoSo:'HS-DATE',LoaiBanGhi:ctx.XN_LOAI_XAC_NHAN,TrangThai:ctx.XN_HIEU_LUC,NgayThucTe:'2026-10-16'};
  const before = JSON.stringify([record,confirmation]);
  try {
    ctx.docDanhSachHoSo_ = () => [record];
    ctx.docXacNhanGN_ = () => [confirmation];
    ctx.sheetToObjects_ = name => name === ctx.SHEET_CHITIET ? [{MaHoSo:'HS-DATE',TenNguoiHuong:'TEST',SoTien:100,SoTienQuyDoi:100}] : [];
    const actual = ctx.layBaoCaoTienVay_('2026-10-01','2026-10-31','','','',false,{loaiNgay:'THUC_TE'});
    assert.equal(actual.length,1); assert.equal(actual[0].ngayGiaiNgan,'16/10/2026');
    assert.equal(ctx.layBaoCaoTienVay_('2026-10-01','2026-10-31','','','',false,{}).length,0);
    const planned = ctx.layBaoCaoTienVay_('2026-09-01','2026-09-30','','','',false,{});
    assert.equal(planned[0].ngayGiaiNgan,'15/09/2026');
    assert.equal(JSON.stringify([record,confirmation]),before);
  } finally { names.forEach(n => {ctx[n] = saved[n];}); }
});

test('Excel and PDF forward the same optional report filters to data service', () => {
  const sentinel = new Error('ROWS_CAPTURED'), calls = [];
  ctx.yeuCauDangNhap_ = () => {};
  ctx.layBaoCaoTienVay = (...args) => {calls.push(args);throw sentinel;};
  const options = {loaiNgay:'THUC_TE',chiThieuNgay:true};
  assert.throws(() => ctx.taoBaoCaoTienVayExcel('2026-10-01','2026-10-17','An','Nháp','USD',false,options),e=>e===sentinel);
  assert.throws(() => ctx.taoBaoCaoTienVayDoc('2026-10-01','2026-10-17','An','Người lập','Nháp','USD',options),e=>e===sentinel);
  assert.deepEqual(calls[0],calls[1]); assert.equal(calls[0][6],options);
});
test('Browser report renders mixed currency totals and export options correctly', () => {
  const source = fs.readFileSync(path.join(root,'JavaScript.html'),'utf8');
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id,{value:'',checked:false,style:{},textContent:'',innerHTML:'',appendChild(){}});
    return elements.get(id);
  };
  const browser = {document:{getElementById:element,createElement:()=>({})}, BC_DU_LIEU:[{soTienVay:100,loaiTien:'VND'},{soTienVay:20,loaiTien:'USD'}],fmtTien:String,esc:String,lopBadgeTrangThai_:()=>''};
  const context = vm.createContext(browser);
  for (const name of ['tuyChonBaoCao_', 'renderBaoCao_']) {
    const start = source.indexOf('  function '+name+'('), end = source.indexOf('\n  function ',start+1);
    vm.runInContext(source.slice(start,end),context);
  }
  element('bc_loaiNgay').value='THUC_TE';element('bc_chiThieuNgay').checked=true;
  assert.equal(context.tuyChonBaoCao_().loaiNgay,'THUC_TE');assert.equal(context.tuyChonBaoCao_().chiThieuNgay,true);
  context.renderBaoCao_();assert.equal(element('bc_tongTien').textContent,'100 VND | 20 USD');
});
console.log('TỔNG: '+passed+' nhóm kiểm thử HAK đạt, 0 lỗi');
