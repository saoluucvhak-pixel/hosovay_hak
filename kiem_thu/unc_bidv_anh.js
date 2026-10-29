const fs=require('fs'),path=require('path');fs.mkdirSync(path.join(__dirname,'..','ban_giao','unc_build'),{recursive:true});const assert=require('assert');const Q=require('./_qlv_chung')('unc_image'),{ctx}=Q;

// Use the existing upload/parser in the simulator; only bypass account-role fixture.
ctx.yeuCauQuanTri_=()=>{};
Q.dat('Cài hai mẫu, chọn đúng BIDV 1/2 món, không ảnh hưởng ngân hàng khác',()=>{const r=ctx.caiMauUNCBIDVMoi();assert.equal(r.ok,true);for(const n of [1,2]){const m=ctx.chonMauTaiLieu_('CHUNG_TU_THANH_TOAN','USD',n,'BIDV',2);assert.equal(m.MaMau,'UNC_BIDV_ANH_'+n);assert.equal(m.loaiFile,'xlsx');}assert.equal(ctx.chonMauTaiLieu_('CHUNG_TU_THANH_TOAN','VND',1,'Vietcombank',2),null);});
Q.dat('Cài lại không tạo phiên bản trùng',()=>{const n=ctx.docDanhSachMau_(true).length;ctx.caiMauUNCBIDVMoi();assert.equal(ctx.docDanhSachMau_(true).length,n);});
Q.dat('Mẫu 1 món dùng tài khoản chọn riêng và tiền có dấu',()=>{const d=ctx.layDuLieuThuNghiem_('VND',1);d.chiTiet[0].TkTrichNoCheDo='KHAC';d.chiTiet[0].TkTrichNo='00123456789';const rows=ctx.taoDanhSachBienDong_(d);assert.equal(rows[0]['CT.TAI_KHOAN_TRICH_NO'],'00123456789');assert.match(rows[0]['CT.SO_TIEN_BANG_CHU'],/[àáảãạâăđ]/);});
Q.dat('Điền mẫu 1/2 món VND/USD không sót placeholder',()=>{for(const n of [1,2])for(const currency of ['VND','USD']){const d=ctx.layDuLieuThuNghiem_(currency,n);const m=ctx.chonMauTaiLieu_('CHUNG_TU_THANH_TOAN',currency,n,'BIDV',2);const r=ctx.dienVaKiemTraMau_(m,d,'unc.xlsx');assert.deepEqual(Array.from(r.loi),[]);require('fs').writeFileSync(require('path').join(__dirname,'..','ban_giao','unc_build','filled_'+n+'_'+currency+'.xlsx'),Buffer.from(r.blob.getBytes()));}});
Q.ket('mẫu UNC theo ảnh');

