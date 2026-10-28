const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('BỎ QUA: chưa cài Playwright');process.exit(0);}
(async()=>{
 const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n+'.html'),'utf8');
 const html=read('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>read(n)).replace(/<\?=\s*\w+\s*\?>/g,'').replace('    hakKhoiDong_();','/* QA */');
 const browser=await chromium.launch({headless:true,executablePath:process.env.HAK_BROWSER_PATH});
 try {
  const p=await browser.newPage();await p.route('https://fonts.googleapis.com/**',r=>r.abort());await p.route('http://layout.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
  await p.addInitScript(()=>{window.google={script:{run:new Proxy({},{get:()=>()=>{}})}};});await p.goto('http://layout.test');
  await p.evaluate(()=>{el_('modalBaoHiemTS').style.display='flex';el_('bhts_tieuDe').textContent='Bảo hiểm tài sản TS-0002';napFormBHTS_(null);themDongBHTS_();});
  await p.locator('.bhts-gt').first().fill('1000000');await p.locator('.bhts-kh').first().fill('200000');
  assert.equal(await p.locator('.bhts-cl').first().evaluate(el=>el.value.replace(/\D/g,'')),'800000');
  assert.equal(await p.locator('.bhts-cl').first().evaluate(el=>el.readOnly),true);
  for(const theme of ['light','dark'])for(const width of [360,768,1280,1440]){
   await p.setViewportSize({width,height:900});await p.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
   const m=await p.evaluate(()=>{const box=document.querySelector('#modalBaoHiemTS .modal-box'),sc=document.querySelector('.bhts-detail-scroll');sc.scrollLeft=sc.scrollWidth;const last=el_('tbl_bhtsChiTiet').querySelector('tbody tr td:last-child'),r=last.getBoundingClientRect(),b=sc.getBoundingClientRect();return {box:box.scrollWidth<=box.clientWidth+1,form:el_('bhts_form').getBoundingClientRect().right<=box.getBoundingClientRect().right,last:r.right<=b.right+2,scroll:sc.scrollWidth>sc.clientWidth};});
   assert.ok(m.box&&m.form&&m.last,JSON.stringify({width,theme,...m}));
   if(width===1280&&theme==='light'){await p.evaluate(()=>document.querySelector('.bhts-detail-scroll').scrollLeft=0);fs.mkdirSync(path.join(__dirname,'ket_qua_hak'),{recursive:true});await p.screenshot({path:path.join(__dirname,'ket_qua_hak','bao_hiem_khung.png')});}
  }
  console.log('PASS modal bảo hiểm: 8 kích thước/theme, khung không tràn, cuộn được tới cột cuối');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
