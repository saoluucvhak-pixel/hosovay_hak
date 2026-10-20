const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const {ctx,results,c,h}=require('./chay_cha_con');
const out=path.resolve(process.argv[2]||'kiem_thu/ket_qua_cha_con');
const root=path.join(__dirname,'..');
let html=fs.readFileSync(path.join(root,'Index.html'),'utf8').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>fs.readFileSync(path.join(root,n+'.html'),'utf8')).replace(/<\?=\s*\w+\s*\?>/g,'');
html=html.replace('    hakKhoiDong_();','    /* Bootstrap do bộ mô phỏng cung cấp. */');
const stub=`window.google={script:{run:(function make(ok,fail){return new Proxy({},{get:(_,k)=>k==='withSuccessHandler'?(f)=>make(f,fail):k==='withFailureHandler'?(f)=>make(ok,f):(...a)=>{window.callServer(k,a).then(r=>{if(ok)ok(r)}).catch(e=>{if(fail)fail({message:e.message})})}})})(null,null)}};`;
html=html.replace('<head>','<head><script>'+stub+'</script>');
(async()=>{const browser=await chromium.launch({...(process.env.HAK_BROWSER_PATH ? {executablePath:process.env.HAK_BROWSER_PATH} : (process.platform==='win32' ? {executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'} : {})),headless:true});const page=await browser.newPage({viewport:{width:1700,height:1100},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());
await page.exposeFunction('callServer',(method,args)=>{if(method==='api'){method=args[1];args=args[2];}if(method==='layDanhSachChungTuHoSo'||method==='layDanhMucTaiLieuKem'||method==='layLoaiHoSoGiaiNgan')return [];if(method==='luuHoSoGiaiNgan')return ctx.luuHoSoGiaiNgan(...args);return [];});
await page.setContent(html,{waitUntil:'load'});
for(const r of results){let hs=ctx.layHoSoTheoMa_(r.saved.maHoSo),ct=ctx.layChiTietTheoHoSo_(r.saved.maHoSo);const data={hoSo:JSON.parse(JSON.stringify(hs)),chiTiet:JSON.parse(JSON.stringify(ct)),hopDong:JSON.parse(JSON.stringify(ctx.layHopDongTheoMa_(h.maHD))),congTy:JSON.parse(JSON.stringify(ctx.layCongTyTheoMa_(c.maCty)))};
await page.evaluate(d=>{MA_HO_SO_DANG_SUA=d.hoSo.MaHoSo;AppDataStore.congTy=[d.congTy];AppDataStore.hopDong=[d.hopDong];napDanhMucVaoGiaoDien_();dienDuLieuVaoForm(d);document.querySelectorAll('.tab-panel').forEach(e=>e.style.display='none');document.getElementById('tab-hoso').style.display='block';document.getElementById('hoso-view-list').style.display='none';document.getElementById('hoso-view-detail').style.display='block';document.querySelectorAll('.hoso-tab-panel').forEach(e=>e.style.display='none');chuyenTabChiTietHoSo('thuhuong');document.getElementById('hoso_tieuDeChiTiet').textContent='MÔ PHỎNG · '+(d.chiTiet.length===1?'Vay 1 món':d.chiTiet.length===2?'Vay 2 món':'Vay nhiều món');capNhatTongTien();},data);
const payload=await page.evaluate(()=>thuThapDuLieuForm());assert.equal(payload.phienBanTien,2);assert.equal(payload.vndThucNhan,hs.VNDThucNhan);assert.deepEqual(payload.chiTiet.map(x=>[x.loaiTien,x.soTien]),JSON.parse(JSON.stringify(ct.map(x=>[x.LoaiTien,x.SoTien]))));
const response=await page.evaluate(p=>window.callServer('api',['','luuHoSoGiaiNgan',[p]]),payload);assert.equal(response.maHoSo,hs.MaHoSo);assert.ok(response.revision>hs.Revision);
const status=await page.locator('#doiSoatChaCon').textContent();if(r.name==='lech-phan-bo')assert.match(status,/CHƯA KHỚP/);else assert.match(status,/ĐỐI CHIẾU KHỚP/);
await page.locator('#hoso-view-detail').screenshot({path:path.join(out,r.name+'.png')});
if(r.name==='2-mon'){await page.evaluate(()=>{document.getElementById('hosoTab-thuhuong').style.display='none';chuyenTabChiTietHoSo('giaynhanno');});await page.locator('#hoso-view-detail').screenshot({path:path.join(out,'bang-cha.png')});}
}
assert.deepEqual(errors,[]);await browser.close();console.log('PASS trình duyệt: 5 trường hợp, payload đúng tiền và loại, không lỗi JavaScript; xuất 6 ảnh giao diện thật trong môi trường mô phỏng.');})().catch(e=>{console.error(e);process.exit(1)});
