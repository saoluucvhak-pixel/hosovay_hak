const fs=require('fs'),path=require('path'),a=require('assert/strict');let chromium=null;try{({chromium}=require('playwright'))}catch(e){}
(async()=>{const read=n=>fs.readFileSync(path.join(__dirname,'..',n+'.html'),'utf8');const html=read('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>read(n)).replace(/<\?=\s*\w+\s*\?>/g,'').replace('    hakKhoiDong_();','/* QA */');
if(!chromium){console.log('BỎ QUA giao diện: chưa cài Playwright');process.exit(0)}const b=await chromium.launch({headless:true,executablePath:process.env.HAK_BROWSER_PATH});try{const p=await b.newPage({viewport:{width:1280,height:900}});await p.route('https://fonts.googleapis.com/**',r=>r.abort());await p.route('http://manual.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await p.addInitScript(()=>{window.google={script:{run:new Proxy({},{get:()=>()=>{}})}};});await p.goto('http://manual.test');
const result=await p.evaluate(async()=>{
 AppDataStore.khachHang=[{MaKH:'KH1',TenKhachHang:'Khách thiếu tài khoản',Revision:1},{MaKH:'KH2',TenKhachHang:'Khách đủ thông tin',SoTaiKhoan:'001234',TaiNganHang:'BIDV'}];renderBangKhachHang_();document.documentElement.setAttribute('data-theme','dark');chuyenTab('khachhang');
 const td=el_('tbody_dsKhachHang').querySelector('td');return {color:getComputedStyle(td).color,bg:getComputedStyle(td).backgroundColor,deleteButton:el_('tbody_dsKhachHang').textContent.includes('Xóa')};
});a.ok(result.deleteButton);a.notEqual(result.color,result.bg);
const out=path.join(__dirname,'ket_qua_hak','khach_hang_dark.png');await p.screenshot({path:out});console.log('PASS bảng Khách hàng giao diện tối + nút Xóa; screenshot '+out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
