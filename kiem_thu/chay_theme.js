/* Real Chromium, local HTTP origin and real localStorage; no live Google data. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||'kiem_thu/ket_qua_theme');fs.mkdirSync(out,{recursive:true});
const inc=n=>fs.readFileSync(path.join(root,n+'.html'),'utf8');
let html=inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>inc(n)).replace(/<\?=\s*\w+\s*\?>/g,'');
html=html.replace('    hakKhoiDong_();','    /* No cloud bootstrap in isolated visual test. */');
let checks=0;const ok=(condition,message)=>{assert.ok(condition,message);checks++;};
let runningBrowser;
(async()=>{
 const browser=runningBrowser=await chromium.launch({headless:true,...(process.env.HAK_BROWSER_PATH?{executablePath:process.env.HAK_BROWSER_PATH}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1366,height:768},colorScheme:'light'});
 await context.route('https://fonts.googleapis.com/**',r=>r.abort());
 await context.route('http://hak-ui.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
 await context.addInitScript(()=>{window.__cloud=[];window.google={script:{run:(function run(){return new Proxy({},{get:(_,key)=>key==='withSuccessHandler'||key==='withFailureHandler'?()=>run():(...args)=>{window.__cloud.push([key,args]);}});})()}};});
 const pg=await context.newPage(),errors=[];pg.on('pageerror',e=>errors.push(e.message));await pg.goto('http://hak-ui.test/');
 const snapshot=await pg.evaluate(()=>JSON.stringify(AppDataStore.entities));
 function contrast(a,b){const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)});const lum=c=>{const x=rgb(c);return .2126*x[0]+.7152*x[1]+.0722*x[2]};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 const evidence=[];
 for(const skin of ['luxe','classic','neutral','champagne'])for(const mode of ['light','dark']){
  await pg.selectOption('#ui_skin',skin);await pg.selectOption('#ui_mode',mode);
  ok(await pg.evaluate(([s,m])=>document.documentElement.dataset.skin===s&&document.documentElement.dataset.theme===m,[skin,mode]),skin+' '+mode);
  const colors=await pg.evaluate(()=>['body','.card','table.detail th','#hd_soHopDong','.btn-primary','#chanDoanKetNoi'].map(sel=>{const e=document.querySelector(sel),s=getComputedStyle(e);return{sel,fg:s.color,bg:s.backgroundColor}}));
  for(const c of colors)ok(contrast(c.fg,c.bg)>=4.5,skin+' '+mode+' contrast '+c.sel+': '+JSON.stringify(c));
  for(const viewport of [{width:1366,height:768},{width:1920,height:1080},{width:390,height:844}]){
   await pg.setViewportSize(viewport);
   for(const tab of ['tongquan','hopdong','congty','khachhang','hoso','sosanh','tattoan','baocao','dinhkem','caidat','huongdan']){
    await pg.evaluate(t=>{document.querySelectorAll('.tab-panel').forEach(e=>e.style.display='none');document.getElementById('tab-'+t).style.display='block';},tab);
    ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),skin+' '+mode+' '+viewport.width+' overflow '+tab);
   }
  }
  await pg.setViewportSize({width:1366,height:768});
  await pg.evaluate(()=>{document.querySelectorAll('.tab-panel').forEach(e=>e.style.display='none');document.getElementById('tab-tongquan').style.display='block';});
  await pg.screenshot({path:path.join(out,skin+'_'+mode+'.png')});evidence.push({skin,mode,colors});
 }
 ok(await pg.evaluate(x=>JSON.stringify(AppDataStore.entities)===x,snapshot),'Themes do not change business store');
 ok(await pg.evaluate(()=>window.__cloud.length===0),'Themes never call Google APIs');
 await pg.selectOption('#ui_density','compact');await pg.click('#ui_nav');
 ok(await pg.evaluate(()=>document.documentElement.dataset.navCollapsed==='true'&&document.getElementById('ui_nav').getAttribute('aria-expanded')==='false'),'Collapsed nav ARIA');
 const pref=await pg.evaluate(()=>JSON.parse(localStorage.getItem('hak.hosovay.ui.v1')));
 await pg.reload();ok(await pg.evaluate(p=>JSON.stringify(HAK_UI_.read())===JSON.stringify(p),pref),'Preferences survive reload');
 await pg.click('#ui_nav');await pg.selectOption('#ui_mode','system');await pg.emulateMedia({colorScheme:'dark'});await pg.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 ok(await pg.evaluate(()=>document.documentElement.dataset.theme==='dark'),'System dark follows machine');
 await pg.emulateMedia({colorScheme:'light'});await pg.waitForFunction(()=>document.documentElement.dataset.theme==='light');ok(await pg.evaluate(()=>document.documentElement.dataset.theme==='light'),'System light follows machine');
 await pg.locator('#ui_nav').focus();await pg.keyboard.press('Control+k');
 ok(await pg.locator('#ui_quick').isVisible(),'Ctrl K opens actual navigator');
 await pg.fill('#ui_query','khach');ok(await pg.locator('#ui_results button').count()===1,'Vietnamese search without accents');
 await pg.keyboard.press('Enter');ok(await pg.locator('#tab-khachhang').isVisible(),'Result uses existing screen navigation');
 await pg.keyboard.press('Control+k');await pg.fill('#ui_query','no-result-zz');ok(await pg.locator('#ui_results').innerText()==='Không có màn hình phù hợp.','No result state');
 await pg.keyboard.press('Escape');ok(!await pg.locator('#ui_quick').isVisible(),'Escape closes quick navigator');
 await pg.evaluate(()=>localStorage.setItem('hak.hosovay.ui.v1','invalid json'));await pg.reload();ok(await pg.evaluate(()=>HAK_UI_.read().skin==='luxe'),'Corrupt storage fallback');
 const blocked=await browser.newContext();await blocked.route('http://hak-ui.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await blocked.route('https://fonts.googleapis.com/**',r=>r.abort());
 await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}));const blockedPage=await blocked.newPage();await blockedPage.goto('http://hak-ui.test/');await blockedPage.selectOption('#ui_mode','dark');ok(await blockedPage.evaluate(()=>document.documentElement.dataset.theme==='dark'),'Blocked localStorage still usable');await blocked.close();
 ok(errors.length===0,'No browser JS errors: '+errors.join('; '));
 await browser.close();fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({checks,passed:checks,errors,evidence,environment:'Chromium on local fixture, Google APIs stubbed'},null,2));console.log('PASS '+checks+' kiểm tra 8 giao diện × 3 kích thước, tương phản, lưu tùy chọn, tìm nhanh, bàn phím và không ghi dữ liệu');
})().catch(async e=>{if(runningBrowser)await runningBrowser.close();console.error(e);process.exitCode=1;});
