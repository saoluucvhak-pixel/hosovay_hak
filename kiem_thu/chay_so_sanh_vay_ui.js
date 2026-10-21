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
 const snapshot=await page.evaluate(()=>JSON.stringify(AppDataStore.entities));await page.click('#tabBtn-sosanh');
 ok(await page.locator('#tab-sosanh').isVisible(),'Menu is wired to real navigation');ok(await page.inputValue('#ss_need')==='15.000.000.000','Example principal formatted');
 await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();ok(await page.locator('#ss_result').isVisible(),'Analysis created: '+await page.locator('#ss_error').textContent()+'; JS '+errors.join(';')); 

 await page.fill('#ss_rateUSD','');await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();ok(await page.locator('#ss_error').isVisible()&&!(await page.locator('#ss_result').isVisible()),'Missing interest rate is not silently zero');
 await page.fill('#ss_rateUSD','0');await page.locator('#ss_sell').focus();await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();ok(await page.evaluate(()=>SS_LAST_&&SS_LAST_.interestUSD===0)&&await page.inputValue('#ss_rateUSD')==='0','Explicit zero interest survives blur');
 await page.selectOption('#ss_basis','ACT365');await page.fill('#ss_days','');await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();ok(await page.locator('#ss_error').isVisible(),'ACT day count must not default silently');
 await page.getByRole('button',{name:'Dùng số ví dụ',exact:true}).click();await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();

 const baseline=await page.evaluate(()=>({principal:SS_LAST_.principal,saving:SS_LAST_.rows[0].saving,break:SS_LAST_.driftBefore,source:SS_LAST_.input.source}));
 ok(baseline.principal===580945.01&&Math.abs(baseline.saving-168479732.8)<.001,'Independent financial values from actual form');
 ok(await page.locator('#ss_result .ss-scenarios').first().locator('tbody tr').count()===4,'Exactly four FX scenarios');
 await page.fill('#ss_sell','20.000');ok(!await page.locator('#ss_result').isVisible(),'Changing input hides stale result');ok(await page.locator('#ss_csv').isDisabled(),'Stale report cannot export');
 await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();ok(await page.locator('#ss_error').isVisible(),'Invalid buy/sell quote is rejected');
 await page.getByRole('button',{name:'Dùng số ví dụ',exact:true}).click();await page.selectOption('#ss_source','USD');await page.fill('#ss_availableUSD','1.000.000');await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();
 ok(await page.evaluate(()=>SS_LAST_.missing===0&&SS_LAST_.coverage===100),'USD revenue can cover full debt');
 ok(await page.evaluate(x=>Math.abs(SS_LAST_.rows[0].saving-x)<.001,baseline.saving),'Own USD changes liquidity, not free economic cost');
 await page.fill('#ss_company','<img src=x onerror="window.__xss=1">');await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();
 ok(await page.locator('#ss_result img').count()===0&&await page.evaluate(()=>!window.__xss),'Company name HTML is escaped');
 await page.fill('#ss_company','=SUM(1,1)');await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();
 const waitDownload=page.waitForEvent('download');await page.click('#ss_csv');const download=await waitDownload;await download.saveAs(path.join(out,'comparison.csv'));const csv=fs.readFileSync(path.join(out,'comparison.csv'),'utf8');ok(csv.includes("'=SUM(1,1)"),'CSV neutralizes spreadsheet formulas');ok(csv.includes('580945.01'),'CSV preserves canonical numbers');
 await page.evaluate(()=>apDungDinhDang_({nghin:',',le:'.',soLe:2,ngay:'yyyy-MM-dd'}));await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();
 ok(await page.evaluate(()=>SS_LAST_.principal===580945.01),'Custom number format preserves results');
 await page.getByRole('button',{name:'Dùng số ví dụ',exact:true}).click();await page.fill('#ss_company','DOANH NGHIỆP THỬ NGHIỆM');await page.evaluate(()=>apDungDinhDang_({nghin:'.',le:',',soLe:0,ngay:'dd/MM/yyyy'}));await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();

 await page.getByRole('button',{name:'Dùng số ví dụ',exact:true}).click();
 await page.evaluate(()=>{ssEl_('principalUSD').value='';ssEl_('need').value=fmtTien(25820000000);ssEl_('buy').value=fmtTyGia(25690);ssEl_('need').dispatchEvent(new Event('input',{bubbles:true}));});
 const goiY=await page.evaluate(()=>({ph:ssEl_('principalUSD').placeholder,val:ssEl_('principalUSD').value,hint:ssEl_('usdHint').textContent,calc:(function(){ssEl_('sell').value=fmtTyGia(26070);var r=taoBoSoSanhVay_().calculate(ssPayload_());return r.principal;})()}));
 ok(goiY.val===''&&goiY.hint.includes('Tự suy ra')&&goiY.calc===1005060.34&&goiY.ph.replace(/[^0-9]/g,'')==='100506034','Gõ nhu cầu VND hiện gốc USD suy ra (khớp bộ tính, ô vẫn trống): '+JSON.stringify(goiY));
 await page.evaluate(()=>{ssEl_('principalUSD').value='1.000';ssEl_('principalUSD').dispatchEvent(new Event('input',{bubbles:true}));});
 ok(await page.evaluate(()=>ssEl_('usdHint').textContent===''&&ssEl_('principalUSD').placeholder===''),'Nhập tay gốc USD thì bỏ gợi ý');
 // Phân cách hàng nghìn NGAY KHI GÕ (gõ từng phím), kể cả chèn giữa chuỗi; con trỏ không nhảy về cuối
 await page.evaluate(()=>apDungDinhDang_({nghin:'.',le:',',soLe:0,ngay:'dd/MM/yyyy'}));
 await page.fill('#ss_need','');await page.locator('#ss_need').focus();await page.keyboard.type('25820000000');
 ok(await page.inputValue('#ss_need')==='25.820.000.000','Gõ từng phím VND: phân cách ngay khi gõ');
 await page.evaluate(()=>{var e=ssEl_('need');e.setSelectionRange(3,3);});await page.keyboard.type('9');
 const giua=await page.evaluate(()=>{var e=ssEl_('need');return {v:e.value,c:e.selectionStart};});
 ok(giua.v==='259.820.000.000'&&giua.c===3,'Chèn giữa chuỗi vẫn phân cách đúng, con trỏ đứng sau chữ số vừa gõ: '+JSON.stringify(giua));
 await page.keyboard.press('Backspace');await page.keyboard.press('Backspace');
 ok(await page.inputValue('#ss_need')==='2.820.000.000','Xóa giữa chuỗi: phân cách lại đúng: '+await page.inputValue('#ss_need'));
 await page.fill('#ss_availableUSD','');await page.locator('#ss_availableUSD').focus();await page.keyboard.type('1234567,5');
 ok(await page.inputValue('#ss_availableUSD')==='1.234.567,5','USD: nhóm phần nguyên, giữ phần thập phân khi gõ');
 await page.keyboard.type('x');ok(await page.evaluate(()=>ssEl_('availableUSD').classList.contains('tien-loi')),'Ký tự lạ vẫn bị đánh dấu lỗi');
 await page.evaluate(()=>{window.__hakCu=hakRun_;hakRun_=function(){var px;var ch={withSuccessHandler:function(){return px;},withFailureHandler:function(){return px;}};return px=new Proxy(ch,{get:function(t,k){return k in t?t[k]:function(){};}});};chuyenTabKhongKiem_('tygia');});
 await page.locator('#tg_nhap').focus();await page.keyboard.type('25857,5');
 ok(await page.inputValue('#tg_nhap')==='25.857,5','Menu Cập nhật tỷ giá: phân cách hàng nghìn và có phần thập phân khi gõ: '+await page.inputValue('#tg_nhap'));
 await page.fill('#tg_nhap','');await page.keyboard.type('25857');ok(await page.inputValue('#tg_nhap')==='25.857','Ô tỷ giá: gõ 25857 → 25.857');
 await page.fill('#tg_nhap','');await page.fill('#tg_mua','');await page.locator('#tg_mua').focus();await page.keyboard.type('25690');await page.locator('#tg_nhap').focus();await page.keyboard.type('26070');
 await page.waitForTimeout(50);ok(await page.inputValue('#tg_mua')==='25.690'&&await page.inputValue('#tg_nhap')==='26.070'&&(await page.textContent('#tg_bq')).trim()==='25.880','Menu tỷ giá: gõ MUA 25690 + BÁN 26070 → phân cách ngay và bình quân mua–bán 25.880: '+await page.textContent('#tg_bq'));
 await page.fill('#tg_mua','');await page.locator('#tg_mua').focus();await page.keyboard.type('27000');await page.waitForTimeout(50);ok(/lớn hơn/.test(await page.textContent('#tg_bq')),'Giá mua lớn hơn giá bán được cảnh báo ngay');
 ok(await page.locator('#tg_nhatKyCard').count()===1&&await page.locator('#tg_nhatKy').count()===1,'Menu tỷ giá có bảng Nhật ký thay đổi (thời điểm, người, giá trước)');
 await page.evaluate(()=>{hakRun_=window.__hakCu;chuyenTabKhongKiem_('sosanh');window.__cloud.length=0;});
 const imported=await page.evaluate(()=>{
   var old=hakRun_,calls=[];
   hakRun_=function(){var success,failure;var chain={withSuccessHandler(fn){success=fn;return chain;},withFailureHandler(fn){failure=fn;return chain;},layTrangHoSo(q){calls.push(q);success({success:true,data:[{maHoSo:'USD_TEST',loaiTien:'USD',soTien:100000,tenCty:'Công ty thử',soGiayNhanNo:'GNN1',trangThai:'Nháp'}],pagination:{page:1,totalPages:2,totalRows:31}});},layDuLieuDayDu(id){calls.push(id);success({hoSo:{LoaiTien:'USD',SoTienNhanNoLanNay:100000,PhienBanTien:2,USDBan:100000,VNDThucNhan:2581999900,TyGiaBan:25820,ThoiHanChoVay_Ngay:183},congTy:{TenCty:'Công ty thử'},hopDong:{'LaiSuatTrongHan_%':4.2}});}};return chain;};
   ssTaiHoSo_(1);ssEl_('loan').value='USD_TEST';ssChonHoSo_();
   var result={calls,principal:ssEl_('principalUSD').value,need:ssEl_('need').value,days:ssEl_('days').value,missing:ssEl_('sell').value===''&&ssEl_('rateVND').value==='',taxOff:!ssEl_('taxEnabled').checked};
   ssEl_('sell').value=fmtTyGia(25890);ssEl_('rateVND').value=fmtTyGia(7);ssTinh_();result.analyzed=SS_LAST_&&SS_LAST_.principal===100000&&SS_LAST_.loan==='USD_TEST';
   try{ssDienHoSo_({hoSo:{LoaiTien:'USD',SoTienNhanNoLanNay:100000,PhienBanTien:2,USDBan:50000}});result.partialRejected=false;}catch(e){result.partialRejected=true;}
   hakRun_=old;return result;
 });
 ok(imported.calls[0].filters.loaiTien==='USD'&&imported.calls[0].pageSize===30,'USD picker queries server with pagination');
 ok(imported.calls[1]==='USD_TEST','Selected record reads full detail');
 ok(imported.principal==='100.000'&&imported.need==='2.581.999.900','Real parent USD and VND values preserved');
 ok(imported.days==='183'&&imported.missing&&imported.taxOff,'Term imported, missing quotes cleared, tax assumption disabled');
 ok(imported.analyzed,'Analysis retains actual USD principal and source record');
 ok(imported.partialRejected,'Partial conversion is not silently treated as full conversion');
 await page.selectOption('#ss_loan','');ok(await page.inputValue('#ss_need')===''&&await page.inputValue('#ss_principalUSD')===''&&await page.inputValue('#ss_rateUSD')===''&&await page.evaluate(()=>SS_LOAN_===''&&SS_LAST_===null)&&await page.locator('#ss_loan option').first().textContent()==='Phương án khác — tự nhập','Manual alternative clears loan amounts, source and stale analysis');
 await page.getByRole('button',{name:'Dùng số ví dụ',exact:true}).click();await page.getByRole('button',{name:'Tính so sánh',exact:true}).click();
 for(const mode of ['light','dark']){await page.evaluate(m=>HAK_UI_.update({mode:m}),mode);for(const vp of [{width:1366,height:900},{width:1920,height:1080},{width:390,height:844}]){await page.setViewportSize(vp);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),mode+' '+vp.width+' no page overflow');if(vp.width===1366){await page.locator('.topbar').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,mode+'_menu.png')});}if(vp.width===1366||vp.width===390)await page.screenshot({path:path.join(out,mode+'_'+vp.width+'.png'),fullPage:true});}}
 await page.setViewportSize({width:1366,height:900});await page.evaluate(m=>HAK_UI_.update({mode:m}),'light');
 {const bd=await page.evaluate(()=>{var r=SS_LAST_,h=document.querySelector('#ss_result .sc-card');return {co:!!h,svg:document.querySelectorAll('#ss_result .sc-svg').length,hv:/Tỷ giá HÒA VỐN/.test(h.textContent)&&h.textContent.includes(ssSo_(r.breakBefore,2)),cot:document.querySelectorAll('#ss_result .sc-cot-loi, #ss_result .sc-cot-lo').length,bienAn:!!document.querySelector('#ss_result .sc-bb-bar'),duong:document.querySelectorAll('#ss_result .sc-usd, #ss_result .sc-vnd').length,khongNaN:!/NaN|undefined/.test(h.innerHTML)};});
 ok(bd.co&&bd.svg===2&&bd.hv&&bd.cot===8&&bd.bienAn&&bd.duong===2&&bd.khongNaN,'Biểu đồ so sánh: đường chi phí USD/VND, điểm hòa vốn có nhãn, 4 kịch bản × 2 cột, biên an toàn, không NaN: '+JSON.stringify(bd));}
 await page.evaluate(()=>{window.__didPrint=false;window.print=()=>{window.__didPrint=true;};});await page.click('#ss_print');ok(await page.evaluate(()=>window.__didPrint&&!document.body.classList.contains('ss-print')),'Print action cleans up screen state');
 await page.evaluate(()=>document.body.classList.add('ss-print'));await page.pdf({path:path.join(out,'SO_SANH_VAY_VI_DU.pdf'),format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});await page.evaluate(()=>document.body.classList.remove('ss-print'));
 ok(await page.evaluate(x=>JSON.stringify(AppDataStore.entities)===x,snapshot),'Calculator never changes business store');ok(await page.evaluate(()=>window.__cloud.length===0),'Calculator does not call a Google write or read API');ok(errors.length===0,'No JS errors: '+errors.join(';'));
 await browser.close();fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({checks,errors,baseline,environment:'Chromium, local fixture, no live financial records'},null,2));console.log('PASS '+checks+' kiểm tra menu so sánh: 4 kịch bản, định dạng, thu USD, CSV, in, sáng/tối, mobile, không ghi dữ liệu');
})().catch(async e=>{if(browser)await browser.close();console.error(e);process.exitCode=1;});
