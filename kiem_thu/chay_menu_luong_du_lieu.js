const fs=require('fs'),path=require('path'),a=require('assert/strict'),cp=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
cp.execFileSync(process.execPath,[path.join(root,'tools/sinh_menu_luong.cjs'),'--kiem']);
(async()=>{const read=n=>fs.readFileSync(path.join(root,n+'.html'),'utf8');
const html=read('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>read(n)).replace(/<\?=\s*\w+\s*\?>/g,'').replace('    hakKhoiDong_();','/* QA */');
const b=await chromium.launch({headless:true,executablePath:process.env.HAK_BROWSER_PATH});
try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
await p.route('https://fonts.googleapis.com/**',r=>r.abort());await p.route('http://flow.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
await p.addInitScript(()=>{window.google={script:{run:new Proxy({},{get:()=>()=>{}})}};});await p.goto('http://flow.test');
await p.evaluate(()=>{window.dongBoNeuMayChuDoi_=()=>{};chuyenTab('luongdulieu');});
a.equal(await p.locator('#tab-luongdulieu').isVisible(),true);a.equal(await p.locator('#tab-huongdan').isVisible(),false);
a.equal(await p.locator('#tabBtn-luongdulieu').getAttribute('aria-current'),'page');a.equal(await p.locator('#ldd details').count(),22);
for(const theme of ['light','dark'])for(const width of [360,1280]){await p.setViewportSize({width,height:900});await p.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
await p.locator('#ldd summary').first().click();a.ok(await p.locator('#ldd details').first().getAttribute('open')!==null);
const overflow=await p.locator('#ldd').evaluate(el=>el.scrollWidth>el.clientWidth+1);a.equal(overflow,false,theme+' '+width+' horizontal overflow');await p.locator('#ldd summary').first().click();}
fs.mkdirSync(path.join(__dirname,'ket_qua_hak'),{recursive:true});await p.evaluate(()=>{window.scrollTo(0,0);document.querySelector('#ldd').scrollIntoView({block:'start'});});await p.screenshot({path:path.join(__dirname,'ket_qua_hak','luong_du_lieu_dark.png')});a.deepEqual(errors,[]);console.log('PASS schema drift, menu navigation, 22 tables, light/dark mobile/desktop, no JS errors');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
