const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const out=path.resolve(process.argv[2]||'kiem_thu/ket_qua_mau_3_truong_hop');fs.mkdirSync(out,{recursive:true});
const {ctx}=require('./gia_lap_apps_script')(path.join(__dirname,'..'),out);ctx.initializeSpreadsheet();
const sh=ctx.ensureSheet_(ctx.getSS_(),ctx.SHEET_MAU_VAN_BAN,ctx.COT_MAU_VAN_BAN_);
const entries=[['ONE',1,1,'BIDV'],['TWO',2,2,'BIDV'],['MANY',3,9999,'BIDV'],['OTHER_BANK',1,1,'VCB'],['OLD_OVERLAP',1,9999,'BIDV']].map(([MaMau,SoNguoiHuongTu,SoNguoiHuongDen,NganHang])=>({MaMau,SoNguoiHuongTu,SoNguoiHuongDen,NganHang,LoaiTaiLieu:'HDTD',LoaiTien:'USD',PhienBan:1,TrangThai:ctx.TT_HIEU_LUC,MacDinh:MaMau==='OTHER_BANK'||MaMau==='OLD_OVERLAP'}));
for(const m of entries)ctx.themDongVaoCuoiThat_(sh,ctx.COT_MAU_VAN_BAN_.map(k=>m[k]??''));
for(const code of ['ONE','TWO','MANY'])ctx.datMauMacDinh(code,1,true);
const list=ctx.docDanhSachMau_(true);
for(const code of ['ONE','TWO','MANY','OTHER_BANK'])assert.equal(list.find(x=>x.MaMau===code).MacDinh,true,code);
assert.equal(list.find(x=>x.MaMau==='OLD_OVERLAP').MacDinh,false);
for(const [n,code]of [[1,'ONE'],[2,'TWO'],[3,'MANY'],[30,'MANY']])assert.equal(ctx.chonMauTuDanhSach_(list,'HDTD','USD',n,'BIDV').MaMau,code);
for(const lt of ['USD','VND']){const d=ctx.layDuLieuThuNghiem_(lt,2),m=ctx.taoBienDayDu_(d);assert.equal(m['HO_SO.USD_BAN'],lt==='USD'?ctx.formatSo_(d.hoSo.SoTienNhanNoLanNay):'0');assert.equal(m['HO_SO.VND_THUC_NHAN'],m['HO_SO.SO_TIEN_QUY_DOI']);assert.notEqual(m['BANG_KE.TONG_VND'],'');}
const read=ctx.docDanhSachMau_;
try{ctx.docDanhSachMau_=()=>[{MaMau:'V2_ONLY',LoaiTaiLieu:'HDTD',LoaiTien:'USD',TrangThai:ctx.TT_HIEU_LUC,GhiChu:'[TIEN_V2]',SoNguoiHuongTu:1,SoNguoiHuongDen:1}];assert.equal(ctx.chonMauTaiLieu_('HDTD','USD',1,'BIDV',1),null);assert.equal(ctx.chonMauTaiLieu_('HDTD','USD',1,'BIDV',2).MaMau,'V2_ONLY');}finally{ctx.docDanhSachMau_=read;}
const printPart=xml=>({getName:()=> 'xl/worksheets/sheet1.xml',getDataAsString:()=>xml});
const printXml='<worksheet><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><pageMargins left="0.5"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>';
const print=ctx.tuyChonPdfTheoMauXlsx_([printPart(printXml)]);assert.equal(print.scale,'2');assert.equal(print.portrait,'false');assert.equal(print.left_margin,'0.5');assert.equal(ctx.tuyChonPdfTheoMauXlsx_([printPart(printXml.replace('paperSize="9"','paperSize="8"'))]),null);
const two=ctx.layDuLieuThuNghiem_('USD',2);Object.assign(two.hoSo,{PhienBanTien:2,SoTienNhanNoLanNay:200.5,USDBan:100.25,VNDThucNhan:2506250,TyGiaBan:25000,SoTienBangChu:ctx.soTienUSDBangChu_(200.5)});
Object.assign(two.chiTiet[0],{LoaiTien:'VND',SoTien:2506250,SoTienQuyDoi:2506250,SoTaiKhoan:'000011'});Object.assign(two.chiTiet[1],{LoaiTien:'USD',SoTien:100.25,SoTienQuyDoi:0,SoTaiKhoan:'000022'});
const mon=ctx.taoBienDayDu_(two);assert.equal(mon['MON_1.SO_TAI_KHOAN'],'000011');assert.equal(mon['MON_2.SO_TAI_KHOAN'],'000022');assert.equal(mon['MON_1.LOAI_TIEN'],'VND');assert.equal(mon['MON_2.LOAI_TIEN'],'USD');assert.equal(mon['MON_1.SO_TIEN_VN'],'2.506.250');assert.equal(mon['MON_2.SO_TIEN_VN'],'100,25');assert.equal(mon['MON_1.TAI_KHOAN_TRICH_NO'],two.congTy.TaiKhoanVND);assert.equal(mon['MON_2.TAI_KHOAN_TRICH_NO'],two.congTy.TaiKhoanUSD);
const onePage=printXml.replace('orientation="landscape"','orientation="portrait"').replace('fitToHeight="0"','fitToHeight="1"');const multi=ctx.tuyChonPdfTheoMauXlsx_([printPart(onePage),{getName:()=> 'xl/worksheets/sheet2.xml',getDataAsString:()=>onePage}]);assert.equal(multi.scale,'4');assert.equal(multi.portrait,'true');
console.log('PASS 31 assertions: defaults, model compatibility, two independent UNC currencies/accounts and PDF layout');
