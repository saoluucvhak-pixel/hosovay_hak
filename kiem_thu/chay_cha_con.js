const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const out=path.resolve(process.argv[2]||'kiem_thu/ket_qua_cha_con');fs.mkdirSync(out,{recursive:true});
const {ctx}=require('./gia_lap_apps_script')(path.join(__dirname,'..'),out);ctx.initializeSpreadsheet();require('./gia_lap_apps_script').dangKyNguoiThuong(ctx);
const c=ctx.luuCongTy({tenCty:'CÔNG TY MÔ PHỎNG HAK'}),h=ctx.luuHopDong({maCty:c.maCty,soHopDong:'HD-MO-PHONG',tinhTrang:'Đang hiệu lực',hanMucVay:50000000000});
const base={phienBanTien:2,maHD:h.maHD,loaiTien:'USD',duNoHienTai:0,ngayGiaiNgan:'2026-10-19',thoiHanChoVayNgay:180};
const line=(soTien,loaiTien='VND',i=1)=>({tenNguoiHuong:'Đơn vị thụ hưởng '+i,soTaiKhoan:'0000123'+i,taiNganHang:'BIDV',noiDungThanhToan:'Giải ngân món '+i,loaiTien,soTien});
const amounts=[999999920,500000110,3224705380,2254593407,61724077,239462600,23253000,53155844,32549869,274551768,67089780];
const cases=[
{name:'1-mon',...base,soTienNhanNoLanNay:19394.88,usdBan:19394.88,tyGiaBan:25780,vndThucNhan:500000006,chiTiet:[line(500000006)]},
{name:'2-mon',...base,soTienNhanNoLanNay:97012.03,usdBan:97012.03,tyGiaBan:25770,vndThucNhan:2500000013,chiTiet:[line(1499999801,'VND',1),line(1000000212,'VND',2)]},
{name:'nhieu-mon',...base,soTienNhanNoLanNay:300236.34,usdBan:300236.34,tyGiaBan:25750,vndThucNhan:7731085755,chiTiet:amounts.map((v,i)=>line(v,'VND',i+1))},
{name:'hon-hop',...base,soTienNhanNoLanNay:1000,usdBan:800,tyGiaBan:25000,vndThucNhan:20000000,chiTiet:[line(20000000,'VND'),line(200,'USD',2)]}
];
let checks=0;const ok=(f)=>{f();checks++};const results=[];
for(const p of cases){const s=ctx.luuHoSoGiaiNgan(p),hs=ctx.layHoSoTheoMa_(s.maHoSo),ct=ctx.layChiTietTheoHoSo_(s.maHoSo);ok(()=>assert.equal(hs.VNDThucNhan,p.vndThucNhan));ok(()=>assert.equal(hs.USDBan,p.usdBan));ok(()=>assert.equal(ct.length,p.chiTiet.length));ok(()=>assert.equal(ct[0].SoTaiKhoan,p.chiTiet[0].soTaiKhoan));ok(()=>assert.equal(ctx.kiemTraTienDePhatHanh_({hoSo:hs,chiTiet:ct}).tong,p.soTienNhanNoLanNay));ok(()=>assert.ok(ct.every(x=>x.MaHoSo===s.maHoSo&&x.MaChiTiet)));ok(()=>assert.equal(new Set(ct.map(x=>x.MaChiTiet)).size,ct.length));const map=ctx.taoBienDayDu_({hoSo:hs,chiTiet:ct,hopDong:ctx.layHopDongTheoMa_(h.maHD),congTy:ctx.layCongTyTheoMa_(c.maCty)});ok(()=>assert.equal(map['HO_SO.VND_THUC_NHAN'],ctx.formatSo_(p.vndThucNhan)));results.push({name:p.name,saved:s,hoSo:hs,chiTiet:ct,map});}
const mixed=results[3];ok(()=>assert.equal(mixed.chiTiet[1].LoaiTien,'USD'));ok(()=>assert.equal(mixed.chiTiet[1].SoTienQuyDoi,0));ok(()=>assert.equal(mixed.map['BANG_KE.TONG_VND'],'20.000.000'));ok(()=>assert.equal(mixed.map['BANG_KE.TONG_USD'],'200'));
const bad={...cases[1],name:'lech-phan-bo',chiTiet:[line(1499999801),line(1000000211,'VND',2)]};const saveBad=ctx.luuHoSoGiaiNgan(bad),hsBad=ctx.layHoSoTheoMa_(saveBad.maHoSo),ctBad=ctx.layChiTietTheoHoSo_(saveBad.maHoSo);ok(()=>assert.equal(hsBad.TrangThai,ctx.TT_NHAP));ok(()=>assert.throws(()=>ctx.kiemTraTienDePhatHanh_({hoSo:hsBad,chiTiet:ctBad}),/VND chưa phân bổ/));results.push({name:bad.name,saved:saveBad,hoSo:hsBad,chiTiet:ctBad});
const fxBad={...cases[0],vndThucNhan:500000007,chiTiet:[line(500000007)]};ok(()=>assert.throws(()=>ctx.kiemTraTienChaCon_(fxBad,true),/lệch quy đổi/));
for(const p of [{...cases[0],chiTiet:[line(-1)]},{...cases[0],chiTiet:[line(1.2)]},{...cases[0],chiTiet:[line('0,123','USD')]},{...cases[0],chiTiet:[line(1,'EUR')]}])ok(()=>assert.throws(()=>ctx.luuHoSoGiaiNgan(p)));
const first=results[0];const upd={...cases[0],maHoSo:first.saved.maHoSo,expectedRevision:first.saved.revision,chiTiet:first.chiTiet.map((x,i)=>({...cases[0].chiTiet[i],maChiTiet:x.MaChiTiet}))};const u=ctx.luuHoSoGiaiNgan(upd);ok(()=>assert.equal(ctx.layChiTietTheoHoSo_(u.maHoSo)[0].MaChiTiet,first.chiTiet[0].MaChiTiet));ok(()=>assert.throws(()=>ctx.luuHoSoGiaiNgan(upd)));ok(()=>assert.throws(()=>ctx.luuHoSoGiaiNgan({...upd,expectedRevision:u.revision,phienBanTien:1})));

const vndCase={...base,loaiTien:'VND',soTienNhanNoLanNay:1000000,vndThucNhan:1000000,chiTiet:[line(1000000)]};ok(()=>assert.equal(ctx.kiemTraTienChaCon_(vndCase,true).tongVND,1000000));
const usdOnly={...base,soTienNhanNoLanNay:0.3,usdBan:0,tyGiaBan:0,vndThucNhan:0,chiTiet:[line(0.1,'USD'),line(0.2,'USD',2)]};ok(()=>assert.equal(ctx.kiemTraTienChaCon_(usdOnly,true).tongUSD,0.3));
ok(()=>assert.throws(()=>ctx.kiemTraTienChaCon_({...cases[0],usdBan:cases[0].usdBan+1},false),/vượt/));
ok(()=>assert.throws(()=>ctx.kiemTraTienChaCon_({...cases[0],tyGiaBan:0},false),/tỷ giá/));
ok(()=>assert.throws(()=>ctx.kiemTraTienChaCon_({...vndCase,chiTiet:[line(1,'USD')]},false),/không hợp lệ/));
const legacy=ctx.kiemTraTienHoSo_({loaiTien:'USD',duNoHienTai:0,tyGiaBan:25000,soTienNhanNoLanNay:0.3,chiTiet:[{soTien:0.1},{soTien:0.2}]});ok(()=>assert.equal(legacy.soTienLanNay,0.3));ok(()=>assert.equal(legacy.chiTiet[0].soTienQuyDoi,2500));
const md={hoSo:mixed.hoSo,chiTiet:mixed.chiTiet,hopDong:ctx.layHopDongTheoMa_(h.maHD),congTy:ctx.layCongTyTheoMa_(c.maCty)};
ok(()=>assert.equal(ctx.taoBienTheoTaiLieu_(md,ctx.CT_HDMB)['HO_SO.SO_TIEN'],'800'));
ok(()=>assert.equal(ctx.taoBienTheoTaiLieu_(md,ctx.CT_THANH_TOAN)['HO_SO.SO_TIEN'],''));
ok(()=>assert.equal(ctx.taoBienDong_(mixed.chiTiet[0],1,'USD')['CT.LOAI_TIEN'],'VND'));
ok(()=>assert.match(ctx.taoBienDong_(mixed.chiTiet[1],2,'USD')['CT.SO_TIEN_BANG_CHU'],/đô la/));
const once={...cases[0],khoaYeuCau:'MO_PHONG_IDEMPOTENCY'};const a=ctx.luuHoSoGiaiNgan(once),b=ctx.luuHoSoGiaiNgan(once);ok(()=>assert.equal(a.maHoSo,b.maHoSo));


const snapshot=JSON.stringify(ctx.layHoSoTheoMa_(u.maHoSo)), snapshotCt=JSON.stringify(ctx.layChiTietTheoHoSo_(u.maHoSo),(k,v)=>k==='_row'?undefined:v), verifyOriginal=ctx.xacMinhChaCon_;
try { ctx.xacMinhChaCon_=()=>['Lỗi kiểm chứng được mô phỏng'];ok(()=>assert.throws(()=>ctx.luuHoSoGiaiNgan({...upd,expectedRevision:u.revision}),/dữ liệu cũ/)); } finally {ctx.xacMinhChaCon_=verifyOriginal;}
ok(()=>assert.equal(JSON.stringify(ctx.layHoSoTheoMa_(u.maHoSo)),snapshot));ok(()=>assert.equal(JSON.stringify(ctx.layChiTietTheoHoSo_(u.maHoSo),(k,v)=>k==='_row'?undefined:v),snapshotCt));
ok(()=>assert.throws(()=>ctx.kiemTraTienDePhatHanh_({hoSo:{...mixed.hoSo,SoTienBangChu:'SAI'},chiTiet:mixed.chiTiet}),/bằng chữ/));
const corrupted=JSON.parse(JSON.stringify(mixed.chiTiet));corrupted[0].SoTienQuyDoi=1;ok(()=>assert.throws(()=>ctx.kiemTraTienDePhatHanh_({hoSo:mixed.hoSo,chiTiet:corrupted}),/không khớp/));


const draftHD=ctx.luuHopDong({maCty:c.maCty,soHopDong:'HD-NHAP'});ok(()=>assert.equal(ctx.layHopDongTheoMa_(draftHD.maHD).TinhTrang,'Nháp'));ok(()=>assert.throws(()=>ctx.luuHoSoGiaiNgan({...cases[0],maHD:draftHD.maHD}),/Đang hiệu lực/));
const editHD={maHD:draftHD.maHD,maCty:c.maCty,soHopDong:'HD-NHAP',tinhTrang:'Đang hiệu lực',expectedRevision:1};ctx.luuHopDong(editHD);ok(()=>assert.throws(()=>ctx.luuHopDong(editHD)));ok(()=>assert.throws(()=>ctx.luuHopDong({...editHD,expectedRevision:2,soHopDong:'HD-MO-PHONG'}),/trùng/));
for(const status of ['Nháp','Hết hiệu lực','Đã tất toán']){ctx.luuHopDong({...editHD,tinhTrang:status,expectedRevision:ctx.layHopDongTheoMa_(draftHD.maHD).Revision});ok(()=>assert.throws(()=>ctx.luuHoSoGiaiNgan({...cases[0],maHD:draftHD.maHD}),/Đang hiệu lực/));}
ok(()=>assert.throws(()=>ctx.xoaHopDong(h.maHD,ctx.layHopDongTheoMa_(h.maHD).Revision),/liên kết/));ctx.xoaHopDong(draftHD.maHD,ctx.layHopDongTheoMa_(draftHD.maHD).Revision);ok(()=>assert.ok(!ctx.layHopDongTheoMa_(draftHD.maHD)));


const vm=require('node:vm'),front=fs.readFileSync(path.join(__dirname,'..','JavaScript.html'),'utf8');
const dateSource=front.slice(front.indexOf('  function ngayHienHanhVN_()'),front.indexOf('  function xoaLocNgayVaTai_',front.indexOf('  function ngayHienHanhVN_()')));
for(const [utc,want] of [['2026-10-19T12:00:00Z','2026-10-19'],['2026-10-31T18:00:00Z','2026-11-01'],['2028-02-28T18:00:00Z','2028-02-29'],['2026-12-31T18:00:00Z','2027-01-01']]){
const RealDate=Date,Fixed=class extends RealDate{constructor(...a){super(...(a.length?a:[utc]));}},els={};
const dc=vm.createContext({Date:Fixed,Intl,AppDataStore:{ngayServer:'2000-01-01'},NGAY_HOM_NAY_SERVER:'2000-01-01',HS_LOC_:{filters:{},page:2},document:{getElementById:id=>els[id]||(els[id]={})}});vm.runInContext(dateSource,dc);dc.datNgayLocMacDinh();ok(()=>assert.equal(els.loc_tuNgay.value,want.slice(0,7)+'-01'));ok(()=>assert.equal(els.loc_denNgay.value,want));dc.HS_LOC_.filters={};dc.datNgayLocMacDinh();ok(()=>assert.equal(Object.keys(dc.HS_LOC_.filters).length,0));}


ok(()=>assert.equal(ctx.loaiTienTaiLieu_({hoSo:results[0].hoSo,chiTiet:results[0].chiTiet},ctx.CT_THANH_TOAN),'VND'));
ok(()=>assert.equal(ctx.loaiTienTaiLieu_(md,ctx.CT_THANH_TOAN),'TAT_CA'));
ok(()=>assert.equal(ctx.loaiTienTaiLieu_(md,ctx.CT_HDMB),'USD'));
ok(()=>assert.equal(ctx.loaiTienTaiLieu_({hoSo:{LoaiTien:'USD'},chiTiet:[]},ctx.CT_THANH_TOAN),'USD'));


const dVnd={hoSo:results[0].hoSo,chiTiet:results[0].chiTiet,hopDong:ctx.layHopDongTheoMa_(h.maHD),congTy:ctx.layCongTyTheoMa_(c.maCty)};
const originalTemplate=ctx.tepMauTheoMuc_;try{ctx.tepMauTheoMuc_=()=>({getBytes:()=>[]});const guard=ctx.dienVaKiemTraMau_({LoaiTaiLieu:ctx.CT_DE_NGHI,LoaiTien:'USD',LoaiFile:'docx',placeholder:['CT.SO_TIEN']},dVnd,'test.docx');ok(()=>assert.ok(guard.loi.some(x=>x.includes('loại tiền thực trả'))));}finally{ctx.tepMauTheoMuc_=originalTemplate;}

fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,results},null,2));console.log('PASS '+checks+' kiểm tra cha–con: lưu, mở, ánh xạ, lỗi tiền, xung đột, không hạ phiên bản.');

module.exports={ctx,results,c,h,checks};
