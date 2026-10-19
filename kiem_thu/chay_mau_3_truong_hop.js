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
console.log('PASS 15 assertions: independent defaults for 1/2/3+, bank scope, legacy money fields');
