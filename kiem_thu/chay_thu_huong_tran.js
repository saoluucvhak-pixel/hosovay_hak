// Kiểm thử: bảng "Danh sách thụ hưởng" không làm tràn màn hình, kể cả khi bật "Chi tiết thanh toán" (1366px và 1024px).
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const inc=n=>fs.readFileSync(path.join(root,n+'.html'),'utf8');
const html=inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g,(_,n)=>inc(n)).replace(/<\?=\s*\w+\s*\?>/g,'').replace('    hakKhoiDong_();','    /* QA: không khởi động đám mây */');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.HAK_BROWSER_PATH?{executablePath:process.env.HAK_BROWSER_PATH}:{}),args:['--no-sandbox']});
 let ok=0;
 for (const width of [1366,1024]) {
  const ctx=await browser.newContext({viewport:{width:width,height:900}});
  await ctx.route('https://fonts.googleapis.com/**',r=>r.abort());
  await ctx.route('http://hak-comparison.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
  const page=await ctx.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://hak-comparison.test/');
  await page.evaluate(()=>{
    let el=document.getElementById('hosoTab-thuhuong'); while(el){ if(el.style&&el.style.display==='none') el.style.display='block'; el=el.parentElement; }
    document.getElementById('hosoTab-thuhuong').style.display='block';
    const tb=document.getElementById('tbodyChiTiet');
    tb.innerHTML='<tr><td>1</td><td>Người nhận</td><td>8619299999</td><td>BIDV _ CN Quảng Nam</td><td>Thanh toán tiền keo</td><td>Giải ngân mua keo lá tràm</td><td>VND</td><td>1.499.999.906</td><td></td><td></td><td></td><td></td></tr>';
    document.getElementById('tblChiTiet').classList.add('show-payment-details');
  });
  const r=await page.evaluate(()=>{const card=document.querySelector('#hosoTab-thuhuong .card').getBoundingClientRect();const vung=document.querySelector('#tblChiTiet').closest('.hak-table-region');return {sw:document.documentElement.scrollWidth,iw:innerWidth,card:Math.round(card.right),cardW:Math.round(card.width),vungOk:!!vung,vungW:vung?Math.round(vung.getBoundingClientRect().width):-1};});
  assert.ok(r.sw<=r.iw+2, width+'px: trang tràn ngang (scrollWidth '+r.sw+' > '+r.iw+')');
  assert.ok(r.card<=r.iw+2, width+'px: thẻ thụ hưởng vượt màn hình (phải='+r.card+')');
  assert.ok(r.vungOk, width+'px: bảng thụ hưởng không nằm trong vùng cuộn riêng của thẻ');
  assert.ok(r.vungW<=r.cardW, width+'px: vùng bảng ('+r.vungW+') rộng hơn thẻ ('+r.cardW+')');
  assert.equal(errors.length,0,'lỗi JS: '+errors.join('; '));
  ok+=5; console.log('PASS '+width+'px: không tràn, thẻ vừa khung, không lỗi JS');
  await ctx.close();
 }
 await browser.close();
 console.log('\nTỔNG: '+ok+' kiểm tra thụ hưởng không tràn, 0 lỗi');
})().catch(e=>{console.error('FAIL', e.message); process.exit(1);});
