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
test('Mixed currency report has independent totals', () => {
  const text = ctx.tongNguyenTeBaoCao_([{loaiTien:'VND',soTienVay:100},{loaiTien:'USD',soTienVay:20},{loaiTien:'VND',soTienVay:50}]);
  assert.ok(text.includes('150 VND')); assert.ok(text.includes('20 USD')); assert.ok(!text.includes('170'));
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
