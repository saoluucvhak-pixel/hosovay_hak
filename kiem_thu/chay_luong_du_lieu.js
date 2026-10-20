/* Assert persisted state after each synthetic operation; never reads/writes production. */
const fs=require('node:fs'), path=require('node:path'), cp=require('node:child_process'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), out=path.resolve(process.argv[2] || path.join(__dirname,'ket_qua_full/data_flow'));
fs.mkdirSync(out,{recursive:true}); const file=path.join(out,'snapshots.json');
cp.execFileSync(process.execPath,[path.join(__dirname,'doi_chieu_du_lieu.js'),'chay',root,file],{cwd:root,stdio:'inherit'});
const result=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(result.ops.length,13);
for(const step of result.ops) {
  assert.equal(step.batBien.loi.length,0,step.ten+': '+step.batBien.loi.join(';'));
  if(step.ten==='B04') assert.match(step.loiNghiepVu,/trùng/);
  else if(step.ten==='B09') assert.match(step.loiNghiepVu,/XUNG_DOT_PHIEN_BAN/);
  else assert.equal(step.loiNghiepVu,'',step.ten+': unexpected failure');
  if(['B04','B06','B09','B11'].includes(step.ten)) assert.deepEqual(step.khac,{},step.ten+': unexpectedly changed persisted cells');
}
const records=Object.values(result.trangThaiCuoi.HoSoGiaiNgan.dong), details=Object.values(result.trangThaiCuoi.ChiTietThuHuong.dong);
assert.equal(records.length,2); assert.equal(details.length,4);
const vnd=records.find(r=>r.LoaiTien==='VND'), usd=records.find(r=>r.LoaiTien==='USD');
assert.equal(Number(vnd.SoTienNhanNoLanNay),4000000); assert.equal(Number(usd.SoTienNhanNoLanNay),25000);
assert.equal(Number(vnd.Revision),3); assert.equal(Number(usd.Revision),3);
assert.ok(!usd.DaXoa || String(usd.DaXoa).toUpperCase()==='FALSE');
assert.equal(details.filter(d=>d.MaHoSo===vnd.MaHoSo).length,3);
assert.equal(details.filter(d=>d.MaHoSo===usd.MaHoSo).reduce((sum,d)=>sum+Number(d.SoTienQuyDoi),0),645250000);
console.log('DATA FLOW: 13/13 operation snapshots verified; retries/conflicts/reads do not mutate stored cells');
