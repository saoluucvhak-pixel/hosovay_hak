/** Tất toán theo từng hồ sơ, độc lập với trạng thái hợp đồng/giải ngân. */
function daTatToanHoSo_(h) { return h && (h.DaTatToan === true || String(h.DaTatToan).toUpperCase() === 'TRUE'); }
function khoanVayTrongPhamVi_(rows, tra, pv) {
  return rows.filter(function(h) {
    var hd=tra.hd[String(h.MaHD)];
    return !laDaXoa_(h.DaXoa) && h.TrangThai===TT_DA_GIAI_NGAN && (!pv.length||(hd&&pv.indexOf(String(hd.MaCty))>=0));
  });
}
function thongKeTatToan_(rows, traMap) {
  var today=homNayVN_(),end=new Date(today+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+7);
  var last=end.toISOString().slice(0,10),r={chuaTatToan:0,daTatToan:0,gocUSD:0,gocVND:0,sapDenHan:0,quaHan:0};
  rows.forEach(function(h){
    if(daTatToanHoSo_(h)){r.daTatToan++;return;}r.chuaTatToan++;
    var duNo=duNoGocConLai_(h,traMap);
    if(String(h.LoaiTien).toUpperCase()==='USD')r.gocUSD=congSoTien_(r.gocUSD,duNo);
    else r.gocVND=congSoTien_(r.gocVND,duNo);
    var due=ngayIsoCuaO_(h.NgayDenHan);if(due&&due<today)r.quaHan++;else if(due&&due<=last)r.sapDenHan++;
  });return r;
}
function layTrangTatToan(tuyChon) {
  yeuCauDangNhap_();var o=tuyChon||{},tra=layTraCuuDanhMuc_();
  var all=khoanVayTrongPhamVi_(docDanhSachHoSo_(false),tra,phamViCongTyNguoiDung_());
  var traMap=tongTraGocTheoHoSo_(docTraNo_());
  var search=chuanKhongDau_(String(o.search||'')).trim(),state=o.trangThai||'CHUA',loai=String(o.loaiTien||'');
  if(['CHUA','DA','TAT_CA'].indexOf(state)<0)throw new Error('Bộ lọc tất toán không hợp lệ.');
  var rows=all.filter(function(h){
    if(state==='CHUA'&&daTatToanHoSo_(h)||state==='DA'&&!daTatToanHoSo_(h))return false;
    if(loai&&String(h.LoaiTien).toUpperCase()!==loai)return false;
    var hd=tra.hd[String(h.MaHD)]||{},ct=tra.cty[String(hd.MaCty)]||{};
    return !search||chuanKhongDau_([h.MaHoSo,h.SoGiayNhanNo,hd.SoHopDong,ct.TenCty].join(' ')).indexOf(search)>=0;
  }).sort(function(a,b){return String(b.MaHoSo).localeCompare(String(a.MaHoSo));});
  var total=rows.length,pages=Math.ceil(total/30),page=Math.min(Math.max(1,parseInt(o.page,10)||1),Math.max(1,pages));
  return {success:true,summary:thongKeTatToan_(all,traMap),pagination:{page:page,totalPages:pages,totalRows:total,pageSize:30},
    data:rows.slice((page-1)*30,page*30).map(function(h){
      var hd=tra.hd[String(h.MaHD)]||{},ct=tra.cty[String(hd.MaCty)]||{};
      return {maHoSo:String(h.MaHoSo),soGiayNhanNo:h.SoGiayNhanNo||'',soHopDong:hd.SoHopDong||'',tenCty:ct.TenCty||'',loaiTien:h.LoaiTien||'VND',soTien:Number(h.SoTienNhanNoLanNay)||0,
        ngayDenHan:ngayIsoCuaO_(h.NgayDenHan),daTatToan:!!daTatToanHoSo_(h),ngayTatToan:ngayIsoCuaO_(h.NgayTatToan),revision:soRevision_(h),
        duNoGoc:duNoGocConLai_(h,traMap),daTraGoc:traMap[String(h.MaHoSo)]||0};
    })};
}
function duLieuRuiRoKhoanVay_(rows, tra, phamVi, traMap) {
  return rows.filter(function(h) {
    var hd=tra.hd[String(h.MaHD)], allowed=!phamVi.length || (hd && phamVi.indexOf(String(hd.MaCty))>=0);
    return allowed && !laDaXoa_(h.DaXoa) && !daTatToanHoSo_(h) && h.TrangThai===TT_DA_GIAI_NGAN && String(h.LoaiTien).toUpperCase()==='USD';
  }).map(function(h) {
    var hd=tra.hd[String(h.MaHD)]||{},ct=tra.cty[String(hd.MaCty)]||{};
    return {maHoSo:String(h.MaHoSo),tenCty:ct.TenCty||'',soGiayNhanNo:h.SoGiayNhanNo||'',soHopDong:hd.SoHopDong||'',gocUSD:duNoGocConLai_(h,traMap),tyGiaGoc:Number(h.TyGiaBan)||0,ngayDenHan:ngayIsoCuaO_(h.NgayDenHan),revision:soRevision_(h)};
  });
}
function layChiTietTatToan(maHoSo) {
  yeuCauDangNhap_();var h=layHoSoTheoMa_(maHoSo),tra=layTraCuuDanhMuc_(),pv=phamViCongTyNguoiDung_();
  if(!h||!khoanVayTrongPhamVi_([h],tra,pv).length)throw new Error('Không tìm thấy khoản đã giải ngân trong phạm vi được cấp.');
  var hd=tra.hd[String(h.MaHD)]||{},ct=tra.cty[String(hd.MaCty)]||{};
  return {hoSo:chuyenDoiDateThanhChuoi_(h),hopDong:{SoHopDong:hd.SoHopDong||''},congTy:{TenCty:ct.TenCty||''}};
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
    var duNoHienTai=tt.daTatToan?duNoGocConLai_(h,tongTraGocTheoHoSo_(docTraNo_())):0;
    var traNgoai=tt.daTatToan&&tt.xacNhanDaTraDuNgoaiHeThong===true;
    if(tt.daTatToan&&duNoHienTai>0&&!traNgoai)throw new Error('Còn dư nợ gốc '+formatSo_(duNoHienTai)+' '+(String(h.LoaiTien).toUpperCase()==='USD'?'USD':'VND')+'. Ghi nhận trả đủ gốc ở mục "Sổ trả nợ" trước, hoặc tick xác nhận đã trả đủ ngoài hệ thống.');
    if(traNgoai)lyDo='[Đã trả đủ ngoài hệ thống, dư nợ ghi nhận '+formatSo_(duNoHienTai)+'] '+lyDo;
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
