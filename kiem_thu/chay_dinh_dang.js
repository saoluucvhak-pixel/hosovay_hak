const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const {ctx,mt}=require('./gia_lap_apps_script')(root,path.resolve(process.argv[2]||'kiem_thu/ket_qua_dinh_dang'));
ctx.initializeSpreadsheet();
const browser=vm.createContext({});
const js=fs.readFileSync(path.join(root,'JavaScript.html'),'utf8');
const start=js.indexOf('function taoBoDinhDang_()'),end=js.indexOf('\n}',start)+2;
const server=fs.readFileSync(path.join(root,'DinhDang.gs'),'utf8');
assert.equal(js.slice(start,end),server.slice(server.indexOf('function taoBoDinhDang_()'),server.indexOf('\n}',server.indexOf('function taoBoDinhDang_()'))+2),'Client/server rule parity');
vm.runInContext(js.slice(start,end)+';var rules=taoBoDinhDang_();',browser);
let checks=0;const ok=(f)=>{f();checks++;};
for(const nghin of ['.',',',' ',"'",''])for(const le of ['.',','])if(nghin!==le)for(const soLe of [0,1,2,6]){
 const c={nghin,le,soLe,ngay:'dd/MM/yyyy'},rules=ctx.taoBoDinhDang_();
 for(const v of [0,0.01,100.25,1234567.5,0.3])ok(()=>{
  const text=rules.number(v,c);assert.equal(browser.rules.number(v,c),text);assert.equal(rules.parse(text,c,2),v);assert.equal(browser.rules.parse(text,c,2),v);
 });
 ok(()=>assert.equal(rules.parse(rules.number(25000,c),c,0),25000));
}
for(const [format,expected]of [['dd/MM/yyyy','03/04/2026'],['MM/dd/yyyy','04/03/2026'],['yyyy-MM-dd','2026-04-03'],['dd-MM-yyyy','03-04-2026'],['dd.MM.yyyy','03.04.2026'],['yyyy/MM/dd','2026/04/03']])ok(()=>{
 assert.equal(browser.rules.day('2026-04-03',{ngay:format}),expected);assert.equal(ctx.taoBoDinhDang_().day('03/04/2026',{ngay:format}),expected);
});
ok(()=>assert.throws(()=>ctx.luuDinhDangHienThi({nghin:'.',le:'.'}),/khác nhau/));
ok(()=>assert.throws(()=>ctx.taoBoDinhDang_().parse('1,23,456.50',{nghin:',',le:'.'},2),/hàng nghìn/));
ok(()=>assert.throws(()=>ctx.taoBoDinhDang_().parse('100.25',{nghin:',',le:'.'},0),/thập phân/));
ok(()=>assert.throws(()=>ctx.taoBoDinhDang_().parse('100.251',{nghin:',',le:'.'},2),/thập phân/));
ok(()=>assert.throws(()=>ctx.taoBoDinhDang_().config({soLe:2.5})));
const data=ctx.layDuLieuThuNghiem_('USD',2),snapshot=JSON.stringify(data),usd=ctx.soTienUSDBangChu_(100.25);
const saved=ctx.luuDinhDangHienThi({nghin:',',le:'.',soLe:2,ngay:'MM/dd/yyyy'});
ok(()=>assert.equal(ctx.layDinhDang_().nghin,','));
ok(()=>assert.equal(ctx.layDuLieuKhoiTao({mien:['CONGTY']}).data.dinhDang.le,'.'));
ok(()=>assert.equal(ctx.layCauHinhHeThong().dinhDang.soLe,2));
ok(()=>assert.equal(ctx.formatSo_(1234567.5),'1,234,567.50'));
ok(()=>assert.equal(ctx.ngayChoMau_('2026-04-03'),'04/03/2026'));
ok(()=>assert.equal(ctx.chuanNgay_('2026-04-03'),'03/04/2026'));
const numeric='<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>{{HO_SO.SO_TIEN}}</t></is></c></row></sheetData></worksheet>';
const result=ctx.xlsxXuLyGoi_({'xl/worksheets/sheet1.xml':numeric},{'HO_SO.SO_TIEN':ctx.formatSo_(25000.5)},[]);
ok(()=>assert.match(result.phan['xl/worksheets/sheet1.xml'],/<v>25000\.5<\/v>/));
ok(()=>assert.equal(ctx.soTienUSDBangChu_(100.25),usd));
ok(()=>assert.equal(JSON.stringify(data),snapshot));
// Round trip through actual save/read APIs: numbers and ISO days retain their values.
require('./gia_lap_apps_script').dangKyNguoiThuong(ctx);
const company=ctx.luuCongTy({tenCty:'FORMAT TEST'}),contract=ctx.luuHopDong({maCty:company.maCty,soHopDong:'FMT',tinhTrang:'Đang hiệu lực',hanMucVay:100000000});
const stored=ctx.luuHoSoGiaiNgan({maHD:contract.maHD,loaiTien:'USD',tyGiaBan:25000,ngayGiaiNgan:'2026-04-03',ngayGiayNhanNo:'2026-04-03',soTienNhanNoLanNay:100.25,chiTiet:[{tenNguoiHuong:'Đặng Mỹ',soTien:100.25}]});
ok(()=>assert.equal(ctx.layHoSoTheoMa_(stored.maHoSo).SoTienNhanNoLanNay,100.25));
const before=JSON.stringify(ctx.layHoSoTheoMa_(stored.maHoSo));ctx.luuDinhDangHienThi({nghin:'.',le:',',soLe:0,ngay:'yyyy-MM-dd'});
ok(()=>assert.equal(JSON.stringify(ctx.layHoSoTheoMa_(stored.maHoSo)),before));
const auth=ctx.yeuCauQuanTri_;try{ctx.yeuCauQuanTri_=()=>{throw Error('denied');};const previous=JSON.stringify(ctx.layDinhDang_());ok(()=>assert.throws(()=>ctx.luuDinhDangHienThi(saved),/denied/));ok(()=>assert.equal(JSON.stringify(ctx.layDinhDang_()),previous));}finally{ctx.yeuCauQuanTri_=auth;}
console.log('PASS '+checks+' kiểm tra định dạng: phân cách, số lẻ, ngày, XLSX giữ số, dữ liệu không đổi và quyền quản trị');
