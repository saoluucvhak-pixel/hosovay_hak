const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||'kiem_thu/ket_qua_so_sanh');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'SoSanhVay.html'),'utf8'),start=source.indexOf('function taoBoSoSanhVay_()'),end=source.indexOf('/* END COMPARISON CORE */');
const ctx=vm.createContext({});vm.runInContext(source.slice(start,end)+';var calculate=taoBoSoSanhVay_().calculate;',ctx);
const base={need:15000000000,months:6,buy:25820,sell:25890,rateVND:7,rateUSD:4.2};
let checks=0;function eq(v,w,tol=0){assert.ok(Math.abs(v-w)<=tol,v+' != '+w);checks++;}
function bad(p){assert.throws(()=>ctx.calculate(Object.assign({},base,p)));checks++;}
let r=ctx.calculate(base);
const actual=ctx.calculate(Object.assign({},base,{need:2581999900,principalUSD:100000}));eq(actual.principal,100000);eq(actual.surplus,100);eq(actual.atRate('break',actual.breakBefore).saving,0,.001);bad({principalUSD:1.001});bad({principalUSD:0});

// Golden values independently calculated with Python Decimal, CEILING and HALF_UP.
eq(r.principal,580945.01);eq(r.interestUSD,12199.85);eq(r.interestVND,525000000);eq(r.surplus,158.2,1e-7);eq(r.breakBefore,26174.044833162678,1e-8);eq(r.driftBefore,1.097121796688598,1e-10);
eq(r.rows[0].saving,168479732.8,.0001);eq(r.rows[1].saving,-61868073.581,.0001);eq(r.rows[3].saving,-368998482.089,.0001);
eq(r.rows[0].taxUSD,r.rows[0].cost*.2,.0001);eq(r.rows[0].vndAfter,420000000);eq(r.breakBefore,r.breakAfter,1e-8);
eq(r.atRate('break',r.breakBefore).saving,0,.0001);eq(r.atRate('after',r.breakAfter).savingAfter,0,.0001);
const same=ctx.calculate(Object.assign({},base,{need:26000000000,buy:26000,sell:26000,rateVND:7,rateUSD:7}));eq(same.rows[0].saving,0); // Equal rates and no spread, with no rounding difference.
const half=ctx.calculate({need:100,months:6,rateVND:1,rateUSD:1,buy:100,sell:100});eq(half.principal,1);eq(half.interestUSD,.01);eq(half.interestVND,1);
for(const source of ['VND','USD','MIXED'])for(const availableUSD of [0,100000,1000000]){
 const v=ctx.calculate(Object.assign({},base,{source,availableUSD}));eq(v.rows[0].cost,r.rows[0].cost);eq(v.missing+v.owned,v.debtUSD,1e-8);eq(v.owned,source==='VND'?0:Math.min(availableUSD,v.debtUSD));
}
for(const tax of [0,15,17,20,50])for(const deductInterest of [0,50,100])for(const deductFx of [0,50,100]){
 const v=ctx.calculate(Object.assign({},base,{tax,deductInterest,deductFx}));eq(v.atRate('after',v.breakAfter).savingAfter,0,.001);
 const down=v.atRate('down',v.input.buy*.9);assert.ok(down.fx<0);checks++;eq(down.taxUSD,(down.interestAtDue*deductInterest/100+down.fx)*tax/100,.001);
}
for(const deductFx of [0,100]){const unfavorable=ctx.calculate(Object.assign({},base,{rateVND:4,rateUSD:12,deductFx}));assert.ok(unfavorable.breakAfter<unfavorable.input.buy);checks++;eq(unfavorable.atRate('after gain',unfavorable.breakAfter).savingAfter,0,.001);}
const noTax=ctx.calculate(Object.assign({},base,{taxEnabled:false}));eq(noTax.rows[0].taxUSD,0);eq(noTax.rows[0].after,noTax.rows[0].cost);
const noLoss=ctx.calculate(Object.assign({},base,{deductFx:0}));assert.ok(noLoss.breakAfter<r.breakAfter);checks++;
const act360=ctx.calculate(Object.assign({},base,{basis:'ACT360',days:180}));eq(act360.interestUSD,r.interestUSD);eq(act360.interestVND,r.interestVND);
const act365=ctx.calculate(Object.assign({},base,{basis:'ACT365',days:180}));assert.ok(act365.interestVND<r.interestVND);checks++;
for(const need of [1,99,1000000,15000000000])for(const buy of [25820,25820.55]){const v=ctx.calculate(Object.assign({},base,{need,buy}));assert.ok(v.surplus>=0&&v.surplus<buy/100+.0001);checks++;}
for(const p of [{need:0},{need:1.5},{buy:0},{sell:100},{months:0},{months:6.5},{rateUSD:-1},{tax:100},{deductFx:101},{availableUSD:.001},{need:Infinity},{taxEnabled:'yes'},{basis:'wrong'}])bad(p);
const input=Object.assign({},base),snap=JSON.stringify(input);ctx.calculate(input);assert.equal(JSON.stringify(input),snap);checks++;
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({checks,example:r,independentReference:'Python Decimal CEILING USD principal, HALF_UP interest'},(k,v)=>typeof v==='function'?undefined:v,2));
console.log('PASS '+checks+' kiểm tra so sánh vay: gốc cent, spread, 4 kịch bản, hòa vốn trước/sau thuế, nguồn USD, ACT/360/365 và đầu vào lỗi');
