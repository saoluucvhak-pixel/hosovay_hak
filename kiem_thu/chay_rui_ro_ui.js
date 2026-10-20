const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||'kiem_thu/ket_qua_so_sanh_ui');fs.mkdirSync(out,{recursive:true});
const inc=n=>fs.readFileSync(path.join(root,n+'.html'),'utf8');
let html=inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>inc(n)).replace(/<\?=\s*\w+\s*\?>/g,'').replace('    hakKhoiDong_();','    /* Isolated financial calculator QA, no cloud bootstrap. */');
let checks=0,browser;const ok=(condition,msg)=>{assert.ok(condition,msg);checks++;};
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.HAK_BROWSER_PATH?{executablePath:process.env.HAK_BROWSER_PATH}:{}),args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true,colorScheme:'light'});
 await ctx.route('https://fonts.googleapis.com/**',r=>r.abort());await ctx.route('http://hak-comparison.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
 await ctx.addInitScript(()=>{window.__cloud=[];window.google={script:{run:(function run(){return new Proxy({},{get:(_,key)=>key==='withSuccessHandler'||key==='withFailureHandler'?()=>run():(...args)=>{window.__cloud.push([key,args]);}});})()}};});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://hak-comparison.test/');

 const assert=require('assert/strict');
 await page.evaluate(()=>{AppDataStore.tongQuan={tongHoSo:3,daGiaiNgan:3,daHuy:0,choXuLy:0,hoSoVND:0,hoSoUSD:3,ganDay:[],ruiRoUSD:[{maHoSo:'USD_MO_01',tenCty:'DOANH NGHIỆP MÔ PHỎNG',soGiayNhanNo:'GNN-01',gocUSD:100000.25,tyGiaGoc:25820,ngayDenHan:'2026-11-20',revision:5},{maHoSo:'USD_MO_02',tenCty:'DOANH NGHIỆP MÔ PHỎNG',soGiayNhanNo:'GNN-02',gocUSD:50000,tyGiaGoc:26000,ngayDenHan:'2026-12-20',revision:2}]};});
 await page.click('#tabBtn-tongquan');await page.fill('#rr_sell','26.200');await page.getByRole('button',{name:'Đánh giá theo tỷ giá nhập',exact:true}).click();
 assert.equal(await page.locator('#rr_result tbody tr').count(),2);assert.match(await page.locator('#rr_result').textContent(),/USD_MO_01/);assert.match(await page.locator('#rr_result').textContent(),/48.000.095/);
 await page.screenshot({path:path.join(out,'tong_quan_rui_ro.png'),fullPage:true});
 const settle=await page.evaluate(()=>{var args,oldRun=hakRun_,oldRefresh=capNhatHoSoGocVaTongQuan_,oldPrompt=window.prompt,oldConfirm=window.confirm;window.prompt=(q)=>q.indexOf('Ngày')===0?ngayHienHanhVN_():'Đã trả hết theo xác nhận NH';window.confirm=()=>true;hakRun_=()=>{var cb;var chain={withSuccessHandler(f){cb=f;return chain;},withFailureHandler(){return chain;},capNhatTatToanHoSo(...a){args=a;cb({daTatToan:true});}};return chain;};capNhatHoSoGocVaTongQuan_=()=>{AppDataStore.tongQuan.ruiRoUSD.shift();rrVe_();};rrTatToan_(0);hakRun_=oldRun;capNhatHoSoGocVaTongQuan_=oldRefresh;window.prompt=oldPrompt;window.confirm=oldConfirm;return args;});
 assert.equal(settle[0],'USD_MO_01');assert.equal(settle[1].daTatToan,true);assert.equal(settle[2],5);assert.equal(await page.locator('#rr_result tbody tr').count(),1);assert.ok(!(await page.locator('#rr_result').textContent()).includes('USD_MO_01'));
 await page.fill('#rr_sell','26.300');assert.equal(await page.locator('#rr_result').isVisible(),false);assert.equal(errors.length,0,errors.join(';'));
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await browser.close();console.log('PASS risk dashboard: 2 open loans, FX delta, settlement revision, removal, stale result, mobile');
})().catch(e=>{console.error(e);process.exitCode=1;});
