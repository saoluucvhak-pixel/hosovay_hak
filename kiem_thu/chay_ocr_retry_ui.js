// Real browser UI, mocked Drive responses and PDF renderer; no live OCR or documents.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const inc=n=>fs.readFileSync(path.join(root,n+'.html'),'utf8');
const html=inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>inc(n)).replace(/<\?=\s*\w+\s*\?>/g,'').replace('    hakKhoiDong_();','/* isolated QA */');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.HAK_BROWSER_PATH?{executablePath:process.env.HAK_BROWSER_PATH}:{}),args:['--no-sandbox']});
 try {
 const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://fonts.googleapis.com/**',r=>r.abort());
 await p.route('http://ocr.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
 await p.addInitScript(()=>{window.google={script:{run:new Proxy({},{get:()=>()=>{}})}};});await p.goto('http://ocr.test');
 await p.evaluate(()=>{
  window.calls=[];window.waits=[];window.release=false;window.hold=false;window.pending=[];
  const timer=window.setTimeout.bind(window);
  window.setTimeout=(f,ms)=>{if(ms>=2000){waits.push(ms);if(hold){pending.push(f);return 0;}return timer(f,0);}return timer(f,ms);};
  window.pdfjsLib={getDocument:()=>({promise:Promise.resolve({numPages:2,getPage:()=>Promise.resolve({getTextContent:()=>Promise.resolve({items:[]}),getViewport:({scale})=>({width:100*scale,height:100*scale}),render:()=>({promise:Promise.resolve()})})})})};
  window.hakRun_=()=>{let success;const x={withSuccessHandler(f){success=f;return x;},withFailureHandler(){return x;},docTrangTaiLieu(t){calls.push(t.soTrang);timer(()=>success(t.soTrang===2&&!release?{soTrang:2,nguon:'LOI',thuLai:true,loi:'Google đang giới hạn OCR'}:{soTrang:t.soTrang,nguon:'OCR',vanBan:'PAGE'+t.soTrang,diem:50}),0);},gomChungTuTuTrang(ds){window.grouped=ds;timer(()=>success({chungTu:[{trangTu:1,trangDen:1,tongTien:100,tinCay:'CAO',canhBao:['Lệch thuế']},{trangTu:2,trangDen:2,tongTien:200,tinCay:'CAO',canhBao:[]}]}),0);}};return x;};
  window.start=()=>{try{localStorage.setItem('hak_che_do_ocr','GOOGLE');}catch(e){} docTepNhieuTrang_(new File(['dummy'],'test.pdf',{type:'application/pdf'}),'HS-TEST',()=>{});}; // kiểm thử nhịp chờ của Google: chế độ Chỉ Google
  start();
 });
 await p.waitForSelector('#dnt_thuLai');
 assert.deepEqual(await p.evaluate(()=>calls),[1,2,2,2,2]);
 assert.equal(await p.evaluate(()=>typeof grouped),'undefined');
 const waits=await p.evaluate(()=>waits);assert(waits.some(x=>x>=15000&&x<16000));assert(waits.some(x=>x>=30000&&x<31000));assert(waits.some(x=>x>=60000&&x<61000));
 await p.evaluate(()=>release=true);await p.click('#dnt_thuLai');await p.waitForFunction(()=>window.grouped);
 assert.deepEqual(await p.evaluate(()=>grouped.map(x=>x.soTrang)),[1,2]);
 assert.deepEqual(await p.evaluate(()=>calls),[1,2,2,2,2,2]);
 assert.deepEqual(await p.evaluate(()=>DNT_.chungTu.map(x=>x.chon)),[false,true]);
 await p.evaluate(()=>{dongDocNhieuTrang_();calls=[];release=false;hold=true;start();});
 await p.waitForFunction(()=>pending.length>0);
 await p.evaluate(()=>{dongDocNhieuTrang_();pending.splice(0).forEach(f=>f());});
 await p.waitForTimeout(100);assert.deepEqual(await p.evaluate(()=>calls),[1]);assert.deepEqual(errors,[]);
 console.log('PASS OCR UI: bounded backoff, pause, resume without rereading, no grouping failed pages, conflicting row not selected, cancel stops pending calls');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
