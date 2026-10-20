/* Complete suite: real LibreOffice/PDF validation plus simulated Google services. No silent skips. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'kiem_thu', 'ket_qua_full');
fs.mkdirSync(out, {recursive:true});
const python = process.env.HAK_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const env = {...process.env}; delete env.BO_QUA_TC30;
const stages = [];
const node = (name, dir) => stages.push({name, command:process.execPath, args:[path.join(root,'kiem_thu',name+'.js'),path.join(out,dir)]});
const py = (name, dir) => stages.push({name:name+'-'+dir,command:python,args:[path.join(root,'kiem_thu',name+'.py'),path.join(out,dir)]});
stages.push({name:'generate-fixtures',command:python,args:[path.join(root,'kiem_thu','tao_mau_thu.py')]});
node('chay_giao_dien','ui');
node('chay_dinh_dang','dinh_dang');
node('chay_theme','theme');
node('chay_cha_con','cha_con'); node('chay_cha_con_ui','cha_con_ui');
node('chay_mau_3_truong_hop','mau_3_truong_hop');
node('chay_thu_logic','logic'); node('chay_usd_cent','usd_cent'); node('chay_hak','hak');
node('chay_thu','engine'); py('kiem_tra_docx','engine');
node('chay_thu_mau_that','mau_that'); py('kiem_tra_mau_that','mau_that');
node('chay_tich_hop','tichhop'); py('kiem_tra_docx','tichhop');
node('chay_tich_hop_mau_that','ih_mau_that'); py('kiem_tra_mau_that','ih_mau_that');
node('chay_hoi_quy','hoi_quy'); node('chay_trinh_tao_mau','trinh_tao'); py('kiem_tra_trinh_tao','trinh_tao');
node('chay_dong_goi','dong_goi');
node('chay_trang_thai','trang_thai'); node('chay_dong_bo','dong_bo');
stages[stages.length-1].args.push(path.join(out,'ui'));
node('chay_dang_nhap','dang_nhap'); node('chay_quy_trinh','quy_trinh');
stages[stages.length-1].args.push(path.join(out,'ui'));
node('chay_bao_mat','bao_mat'); node('chay_hieu_nang','hieu_nang'); node('chay_phan_trang','phan_trang');
node('chay_luong_du_lieu','data_flow');
const results = [];
for(const stage of stages) {
  const started = Date.now();
  const r = cp.spawnSync(stage.command,stage.args,{cwd:root,env,encoding:'utf8',timeout:1200000,maxBuffer:30*1024*1024});
  const output = (r.stdout||'') + (r.stderr||'') + (r.error ? String(r.error) : '');
  fs.writeFileSync(path.join(out,stage.name+'.log'),output);
  const summary=(r.stdout||'').trim().split(/\r?\n/).slice(-1)[0];
  results.push({stage:stage.name,passed:r.status===0,exitCode:r.status,durationMs:Date.now()-started,summary});
  console.log((r.status===0?'PASS ':'FAIL ')+stage.name+': '+summary);
  if(r.status!==0) console.log(output.split(/\r?\n/).slice(-65).join('\n'));
  fs.writeFileSync(path.join(out,'full-summary.json'),JSON.stringify({environment:'real files and LibreOffice PDFs; simulated Google services',plannedStages:stages.length,notRunStages:stages.slice(results.length).map(s=>s.name),results},null,2)+'\n');
  if (r.status!==0 && stage.name==='chay_giao_dien') { console.log('UI gate failed; remaining document stages were not run.'); break; }
}
console.log('FULL VALIDATION: '+results.filter(r=>r.passed).length+'/'+stages.length+' stages passed; '+(stages.length-results.length)+' not run');
if(results.some(r=>!r.passed)) process.exitCode=1;
