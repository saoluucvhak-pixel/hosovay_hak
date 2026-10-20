/** Tất toán theo từng hồ sơ, độc lập với trạng thái hợp đồng/giải ngân. */
function daTatToanHoSo_(h) { return h && (h.DaTatToan === true || String(h.DaTatToan).toUpperCase() === 'TRUE'); }
function duLieuRuiRoKhoanVay_(rows, tra, phamVi) {
  return rows.filter(function(h) {
    var hd=tra.hd[String(h.MaHD)], allowed=!phamVi.length || (hd && phamVi.indexOf(String(hd.MaCty))>=0);
    return allowed && !laDaXoa_(h.DaXoa) && !daTatToanHoSo_(h) && h.TrangThai===TT_DA_GIAI_NGAN && String(h.LoaiTien).toUpperCase()==='USD';
  }).map(function(h) {
    var hd=tra.hd[String(h.MaHD)]||{},ct=tra.cty[String(hd.MaCty)]||{};
    return {maHoSo:String(h.MaHoSo),tenCty:ct.TenCty||'',soGiayNhanNo:h.SoGiayNhanNo||'',soHopDong:hd.SoHopDong||'',gocUSD:Number(h.SoTienNhanNoLanNay)||0,tyGiaGoc:Number(h.TyGiaBan)||0,ngayDenHan:ngayIsoCuaO_(h.NgayDenHan),revision:soRevision_(h)};
  });
}
function capNhatTatToanHoSo(maHoSo, tt, expectedRevision) {
  yeuCauDangNhap_();
  return voiKhoa_(function() {
    tt=tt||{};var h=layHoSoTheoMa_(maHoSo);if(!h||laDaXoa_(h.DaXoa))throw new Error('Không tìm thấy hồ sơ.');
    var pv=phamViCongTyNguoiDung_(),hd=layTraCuuDanhMuc_().hd[String(h.MaHD)];
    if(pv.length&&(!hd||pv.indexOf(String(hd.MaCty))<0))throw new Error('Hồ sơ ngoài phạm vi công ty được cấp.');
    kiemTraRevisionBatBuoc_(h,expectedRevision);
    if(h.TrangThai!==TT_DA_GIAI_NGAN)throw new Error('Chỉ đánh dấu tất toán cho hồ sơ đã giải ngân.');
    if(typeof tt.daTatToan!=='boolean')throw new Error('Trạng thái tất toán không hợp lệ.');
    var lyDo=String(tt.ghiChu||'').trim();if(lyDo.length<3||lyDo.length>500)throw new Error('Nhập ghi chú/bằng chứng tất toán hoặc lý do mở lại (3–500 ký tự).');
    var ngay=tt.daTatToan?ngayChuanISO_(tt.ngay,'Ngày tất toán',true):'';
    if(ngay&&ngayIsoCuaO_(h.NgayGiaiNgan)&&ngay<ngayIsoCuaO_(h.NgayGiaiNgan))throw new Error('Ngày tất toán không được trước ngày giải ngân.');
    if(daTatToanHoSo_(h)===tt.daTatToan)throw new Error('Trạng thái đã thay đổi. Hãy tải lại hồ sơ.');
    var sh=getSS_().getSheetByName(SHEET_HOSO);
    damBaoCotSheet_(sh,['DaTatToan','NgayTatToan','GhiChuTatToan','NguoiTatToan','TatToanCapNhatLuc']);damBaoCotHoSoDomain_();
    var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0],row=timDongHoSo_(sh,headers,maHoSo);
    if(!row)throw new Error('Không tìm thấy dòng hồ sơ.');
    var now=new Date(),me=layDanhTinh_().email||emailNguoiDung_(),rev=soRevision_(h)+1;
    ghiCotHoSo_(sh,headers,row,{DaTatToan:tt.daTatToan,NgayTatToan:ngay,GhiChuTatToan:lamSachCongThuc_(lyDo),NguoiTatToan:me,TatToanCapNhatLuc:now,Revision:rev,CapNhatLuc:now,CapNhatBoi:me});
    SpreadsheetApp.flush();tangRevision_('HOSO');ghiNhatKy_(maHoSo,tt.daTatToan?'TAT_TOAN_HO_SO':'MO_LAI_HO_SO_TAT_TOAN',ngay+' | '+lyDo);
    return {maHoSo:maHoSo,daTatToan:tt.daTatToan,ngayTatToan:ngay,revision:rev};
  });
}
