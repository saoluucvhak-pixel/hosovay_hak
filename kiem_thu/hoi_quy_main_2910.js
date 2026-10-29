const fs=require('fs'),path=require('path');const Q=require('./_qlv_chung')('audit_main_oct29'),{ctx}=Q;ctx.yeuCauQuanTri_=()=>{};
ctx.caiMauUNCBIDVMoi();let before=ctx.docDanhSachMau_(true).filter(m=>m.MaMau==='UNC_BIDV_ANH_1'&&m.TrangThai==='Hiệu lực')[0];
ctx.taiMauVanBan({maMau:'UNC_BIDV_ANH_1',tenMau:'Excel người dùng cập nhật',nganHang:'BIDV',loaiTien:'TAT_CA',loaiTaiLieu:ctx.CT_THANH_TOAN,dieuKienSoDong:'1',tenFile:'edited.xlsx',macDinh:true},fs.readFileSync(path.join(__dirname,'../mau_that/UNC_1_KHOAN.xlsx')).toString('base64'));
let edited=ctx.docDanhSachMau_(true).filter(m=>m.MaMau==='UNC_BIDV_ANH_1'&&m.TrangThai==='Hiệu lực')[0];ctx.caiMauUNCBIDVMoi();let after=ctx.docDanhSachMau_(true).filter(m=>m.MaMau==='UNC_BIDV_ANH_1'&&m.TrangThai==='Hiệu lực')[0];console.log(JSON.stringify({case:'installer_replaces_user_update',before:before.PhienBan,edited:edited.PhienBan,after:after.PhienBan,reverted:before.HashFile===after.HashFile,editedNoLongerActive:edited.HashFile!==after.HashFile}));
const h1=Q.hopDong({soHopDong:'H1'}).maHD,h2=Q.hopDong({soHopDong:'H2'}).maHD;
const a=ctx.luuDanhMucTaiSan({maCty:Q.cty.maCty,ten:'A',loai:'DONG_SAN',loaiChuSoHuu:'Công ty',chuSoHuu:'HAK',diaDiem:'Kho',nguyenGia:1000000,khauHao:0,khoaYeuCau:'audit_asset_001'});
for(const [i,hd] of [h1,h2].entries())ctx.luuDangKyTheChap({maHD:hd,khoaYeuCau:'audit_registration_'+i,soDangKy:'REG'+i,soHDBaoDam:'BD'+i,ngayDangKy:Q.ngay(0),ngayDinhGia:Q.ngay(0),donViDinhGia:'BIDV',soChungThu:'CT'+i,cheDo:'NHOM',giaTri:1000000,chiTiet:[{maTaiSan:a.ma}]});
console.log(JSON.stringify({case:'two_contract_asset_warning',contracts:[h1,h2],warning:ctx.ts2TongQuanBaoHiem_().canChuY}));

const assert=require('assert');assert.equal(after.PhienBan,edited.PhienBan);assert.equal(after.HashFile,edited.HashFile);assert.equal(ctx.ts2TongQuanBaoHiem_().canChuY[0].lienKet.length,2);console.log('PASS giữ mẫu Excel mới và đủ hai hợp đồng liên quan');
