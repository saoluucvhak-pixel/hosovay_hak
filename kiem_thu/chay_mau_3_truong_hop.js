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
const originalFile=ctx.tepMauTheoMuc_;
try{ctx.tepMauTheoMuc_=()=>({getBytes:()=>[]});const blocked=ctx.dienVaKiemTraMau_({GhiChu:'[TIEN_V2]',LoaiTaiLieu:ctx.CT_THANH_TOAN,placeholder:['MON_1.LOAI_TIEN','MON_2.LOAI_TIEN']},ctx.layDuLieuThuNghiem_('USD',3),'wrong.xlsx');assert.ok(blocked.loi.some(x=>x.includes('v2')));assert.ok(blocked.loi.some(x=>x.includes('đúng 2 món')));}finally{ctx.tepMauTheoMuc_=originalFile;}
const originalRender=ctx.dienVaKiemTraMau_;
try{ctx.docDanhSachMau_=()=>[{MaMau:'FIXED2',PhienBan:1,LoaiTien:'VND',LoaiTaiLieu:ctx.CT_THANH_TOAN,GhiChu:'[TIEN_V2]',SoNguoiHuongTu:2,SoNguoiHuongDen:2}];ctx.dienVaKiemTraMau_=()=>({loi:['SAMPLE_BLOCK'],canhBao:[]});const preview=ctx.xemTruocMau('FIXED2',1,'');assert.equal(preview.dat,false);assert.equal(preview.linkFile,'');}finally{ctx.docDanhSachMau_=read;ctx.dienVaKiemTraMau_=originalRender;}
console.log('PASS 35 assertions: independent UNC data/currencies, model/count guards, preview errors and PDF layout');

// UNC: bỏ dấu riêng trường tiền bằng chữ; bảo toàn tên người hưởng, tiền và tài liệu khác.
assert.equal(ctx.tienBangChuKhongDau_('Đồng đô la Mỹ và hai mươi lăm cent'), 'Dong do la My va hai muoi lam cent');
const savedRender=ctx.renderTaiLieu_, savedFile=ctx.tepMauTheoMuc_;
try {
  ctx.tepMauTheoMuc_=()=>({getBytes:()=>[]});
  ctx.renderTaiLieu_=(blob,type,map,rows)=>({blob:{},conLai:[],conNgoac:[],canhBao:[],soHangMau:0,soHangTao:0});
  for (const n of [1,2]) for (const currency of ['VND','USD']) {
    const d=ctx.layDuLieuThuNghiem_(currency,n); d.chiTiet[0].TenNguoiHuong='Đặng Thị Mỹ';
    const original=JSON.stringify(d), accented=ctx.taoBienTheoTaiLieu_(d,ctx.CT_THANH_TOAN);
    const m={MaMau:'HAK26_UNC_'+currency,TenFile:'UNC_'+n+'.xlsx',LoaiFile:'xlsx',LoaiTaiLieu:ctx.CT_THANH_TOAN};
    const result=ctx.dienVaKiemTraMau_(m,d,'unc.xlsx');
    assert.equal(result.loi.length,0);
    for(const record of [result.map,...result.dsDong]) for(const k of Object.keys(record).filter(k=>/_BANG_CHU$/.test(k))) assert.ok(!/[^\x00-\x7F]/.test(record[k]),k);
    assert.equal(result.dsDong[0]['CT.TEN_NGUOI_HUONG'],'Đặng Thị Mỹ');
    assert.equal(result.map['HO_SO.SO_TIEN'],accented['HO_SO.SO_TIEN']);
    assert.equal(JSON.stringify(d),original);
    for(const other of [{MaMau:'BANG_KE',TenFile:'BANG_KE.xlsx',LoaiTaiLieu:ctx.CT_THANH_TOAN},{MaMau:'HDTD',TenFile:'HDTD.xlsx',LoaiTaiLieu:'HDTD'}]) {
      const untouched=ctx.dienVaKiemTraMau_(Object.assign({LoaiFile:'xlsx'},other),d,'other.xlsx');
      assert.equal(untouched.map['HO_SO.SO_TIEN_BANG_CHU'],ctx.taoBienTheoTaiLieu_(d,other.LoaiTaiLieu)['HO_SO.SO_TIEN_BANG_CHU']);
    }
  }
} finally {ctx.renderTaiLieu_=savedRender;ctx.tepMauTheoMuc_=savedFile;}
console.log('PASS UNC amount words: 1/2 recipients, VND/USD, other fields and documents preserved');
