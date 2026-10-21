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
/** Trạng thái tất toán suy ra từ số dư (không phụ thuộc cờ thủ công). */
var NHAN_TRANG_THAI_TRA_NO = {
  CHUA_TRA: 'Chưa trả gốc', TRA_MOT_PHAN: 'Trả một phần', DU_GOC_CHUA_TAT_TOAN: 'Đủ gốc, chưa tất toán',
  DA_TAT_TOAN: 'Đã tất toán', TAT_TOAN_NGOAI_HE_THONG: 'Tất toán ngoài hệ thống (còn dư nợ)'
};
function trangThaiTraNo_(h, traMap) {
  var duNo = duNoGocConLai_(h, traMap), daTra = (traMap || {})[String(h.MaHoSo)] || 0;
  if (daTatToanHoSo_(h)) return duNo > 0 ? 'TAT_TOAN_NGOAI_HE_THONG' : 'DA_TAT_TOAN';
  if (duNo <= 0) return 'DU_GOC_CHUA_TAT_TOAN';
  return daTra > 0 ? 'TRA_MOT_PHAN' : 'CHUA_TRA';
}
function layTrangTatToan(tuyChon) {
  yeuCauDangNhap_();var o=tuyChon||{},tra=layTraCuuDanhMuc_();
  var all=khoanVayTrongPhamVi_(docDanhSachHoSo_(false),tra,phamViCongTyNguoiDung_());
  var traMap=tongTraGocTheoHoSo_(docTraNo_());
  var search=chuanKhongDau_(String(o.search||'')).trim(),state=o.trangThai||'CHUA',loai=String(o.loaiTien||'');
  if(['CHUA','MOT_PHAN','DA','TAT_CA'].indexOf(state)<0)throw new Error('Bộ lọc tất toán không hợp lệ.');
  var rows=all.filter(function(h){
    if(state==='CHUA'&&daTatToanHoSo_(h)||state==='DA'&&!daTatToanHoSo_(h))return false;
    if(state==='MOT_PHAN'&&(daTatToanHoSo_(h)||trangThaiTraNo_(h,traMap)!=='TRA_MOT_PHAN'))return false;
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
        duNoGoc:duNoGocConLai_(h,traMap),daTraGoc:traMap[String(h.MaHoSo)]||0,trangThaiTraNo:trangThaiTraNo_(h,traMap),nhanTrangThai:NHAN_TRANG_THAI_TRA_NO[trangThaiTraNo_(h,traMap)]};
    })};
}
/** Báo cáo khế ước vay: đang theo dõi / đã tất toán / tất cả, kèm tổng theo loại tiền. Chỉ đọc. */
function layBaoCaoTraNo(tuyChon) {
  yeuCauDangNhap_();
  var o = tuyChon || {}, nhom = o.nhom || 'DANG_THEO_DOI';
  if (['DANG_THEO_DOI', 'DA_TAT_TOAN', 'TAT_CA'].indexOf(nhom) < 0) throw new Error('Nhóm báo cáo không hợp lệ.');
  var tra = layTraCuuDanhMuc_(), ds = docTraNo_(), traMap = tongTraGocTheoHoSo_(ds), hop = tongHopTraNoTheoHoSo_(ds);
  var all = khoanVayTrongPhamVi_(docDanhSachHoSo_(false), tra, phamViCongTyNguoiDung_());
  var tong = {}, dem = {};
  var rows = all.filter(function (h) {
    if (nhom === 'DANG_THEO_DOI' && daTatToanHoSo_(h)) return false;
    if (nhom === 'DA_TAT_TOAN' && !daTatToanHoSo_(h)) return false;
    return true;
  }).sort(function (a, b) { return String(a.MaHoSo).localeCompare(String(b.MaHoSo)); }).map(function (h) {
    var k = String(h.MaHoSo), hd = tra.hd[String(h.MaHD)] || {}, ct = tra.cty[String(hd.MaCty)] || {}, t = hop[k] || {};
    var loai = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    var st = trangThaiTraNo_(h, traMap), goc = Number(h.SoTienNhanNoLanNay) || 0, duNo = duNoGocConLai_(h, traMap);
    var g = tong[loai] || (tong[loai] = { soKhoan: 0, goc: 0, daTraGoc: 0, daTraLai: 0, duNoGoc: 0 });
    g.soKhoan++; g.goc = congSoTien_(g.goc, goc); g.daTraGoc = congSoTien_(g.daTraGoc, t.daTraGoc || 0);
    g.daTraLai = congSoTien_(g.daTraLai, t.daTraLai || 0); g.duNoGoc = congSoTien_(g.duNoGoc, duNo);
    dem[st] = (dem[st] || 0) + 1;
    return { maHoSo: k, tenCty: ct.TenCty || '', soHopDong: hd.SoHopDong || '', loaiTien: loai,
      ngayGiaiNgan: ngayIsoCuaO_(h.NgayGiaiNgan), ngayDenHan: ngayIsoCuaO_(h.NgayDenHan),
      goc: goc, daTraGoc: t.daTraGoc || 0, duNoGoc: duNo, daTraLai: t.daTraLai || 0,
      soLanTra: t.soLan || 0, ngayTraGanNhat: t.ngayCuoi || '', trangThai: st, nhanTrangThai: NHAN_TRANG_THAI_TRA_NO[st] };
  });
  return { ngayBaoCao: homNayVN_(), nhom: nhom, tongSo: rows.length, rows: rows.slice(0, 500), tongHop: tong, demTrangThai: dem };
}
function duLieuRuiRoKhoanVay_(rows, tra, phamVi, traMap) {
  return rows.filter(function(h) {
    var hd=tra.hd[String(h.MaHD)], allowed=!phamVi.length || (hd && phamVi.indexOf(String(hd.MaCty))>=0);
    return allowed && !laDaXoa_(h.DaXoa) && !daTatToanHoSo_(h) && h.TrangThai===TT_DA_GIAI_NGAN && String(h.LoaiTien).toUpperCase()==='USD' && duNoGocConLai_(h,traMap)>0; // chỉ khoản còn dư nợ gốc
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

/* ===================== BÁO CÁO TIỀN VAY TỔNG HỢP (3 nhóm, chỉ đọc) ===================== */
/** Lịch sử tỷ giá thủ công/tự động, tăng dần theo ngày: [{ngay, ty}]. */
function docLichSuTyGia_() {
  if (!getSS_().getSheetByName(SHEET_TY_GIA_THU_CONG)) return [];
  return sheetToObjects_(SHEET_TY_GIA_THU_CONG)
    .map(function (r) { return { ngay: ngayIsoCuaO_(r.Ngay), ty: Number(r.TyGiaBan) || 0 }; })
    .filter(function (r) { return r.ngay && r.ty > 0; })
    .sort(function (a, b) { return a.ngay < b.ngay ? -1 : (a.ngay > b.ngay ? 1 : 0); });
}
/** Tỷ giá áp dụng cho ngày: bản ghi gần nhất trước hoặc đúng ngày. null nếu chưa có. */
function tyGiaTaiNgay_(lichSu, ngay) {
  var best = null;
  (lichSu || []).forEach(function (r) { if (ngay && r.ngay <= ngay) best = r; });
  return best ? { ty: best.ty, dungNgay: best.ngay === ngay, ngayCo: best.ngay } : null;
}
/**
 * Báo cáo tổng hợp tiền vay:
 *  • tab2 — mọi khoản đã giải ngân, nhóm: CON_DU (chưa trả gốc) | MOT_PHAN (tất toán 1 phần) | TAT_TOAN.
 *  • tab3 — dư nợ theo hạn: khoản chưa tất toán sắp xếp theo ngày đến hạn tăng dần (quá hạn đứng đầu), khoản đã tất toán xuống cuối.
 *  • tab4 — chênh lệch tỷ giá (khoản USD): mỗi lần trả gốc / lần tất toán ngoài hệ thống. Lãi(+)/lỗ(−) = gốc × (TG giải ngân − TG ngày trả).
 * Tỷ giá ngày trả lấy theo sheet TyGiaThuCong; thiếu tỷ giá thì đánh dấu, KHÔNG tính.
 */
function layBaoCaoTienVayTongHop() {
  yeuCauDangNhap_();
  var tra = layTraCuuDanhMuc_(), ds = docTraNo_(), traMap = tongTraGocTheoHoSo_(ds), hop = tongHopTraNoTheoHoSo_(ds);
  var lichSu = docLichSuTyGia_(), today = homNayVN_();
  var nhac = Number(layCauHinh_('NGAY_NHAC_TRUOC_HAN')) || CB_SAP_DEN_HAN_NGAY;
  var gocTheoHoSo = {};
  ds.forEach(function (r) {
    if (r.LoaiTra !== TRA_GOC || r.TrangThai !== TRA_HIEU_LUC) return;
    (gocTheoHoSo[String(r.MaHoSo)] = gocTheoHoSo[String(r.MaHoSo)] || []).push(r);
  });
  var all = khoanVayTrongPhamVi_(docDanhSachHoSo_(false), tra, phamViCongTyNguoiDung_());
  var tab2 = [], tab3 = [], tab4 = [];
  all.forEach(function (h) {
    var k = String(h.MaHoSo), hd = tra.hd[String(h.MaHD)] || {}, ct = tra.cty[String(hd.MaCty)] || {}, t = hop[k] || {};
    var loai = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    var st = trangThaiTraNo_(h, traMap), goc = Number(h.SoTienNhanNoLanNay) || 0, duNo = duNoGocConLai_(h, traMap);
    var daTT = !!daTatToanHoSo_(h), nhom = daTT ? 'TAT_TOAN' : ((t.daTraGoc || 0) > 0 || duNo <= 0 ? 'MOT_PHAN' : 'CON_DU');
    var ngayGN = ngayIsoCuaO_(h.NgayGiaiNgan), ngayTT = ngayIsoCuaO_(h.NgayTatToan), due = ngayIsoCuaO_(h.NgayDenHan);
    var nen = { maHoSo: k, tenCty: ct.TenCty || '', soHopDong: hd.SoHopDong || '', loaiTien: loai, ngayGiaiNgan: ngayGN,
      goc: goc, daTraGoc: t.daTraGoc || 0, duNoGoc: duNo, daTraLai: t.daTraLai || 0, soLanTra: t.soLan || 0,
      ngayTraGanNhat: t.ngayCuoi || '', ngayTatToan: daTT ? ngayTT : '', ngayDenHan: due, nhom: nhom, nhanTrangThai: NHAN_TRANG_THAI_TRA_NO[st] };
    tab2.push(nen);
    // Tab 3: mức độ đến hạn
    var mucDo = daTT ? 'DA_TAT_TOAN' : (!due ? 'CHUA_CO_HAN' : (due < today ? 'QUA_HAN' : (soNgayGiuaIso_(today, due) <= nhac ? 'SAP_DEN_HAN' : 'TRONG_HAN')));
    tab3.push(Object.assign({}, nen, { mucDo: mucDo, soNgayConLai: due && !daTT ? soNgayGiuaIso_(today, due) : '' }));
    // Tab 4: chênh lệch tỷ giá (chỉ khoản USD có trả gốc hoặc tất toán ngoài hệ thống)
    if (loai !== 'USD') return;
    var tyGia0 = Number(h.TyGiaBan) || 0;
    var dong = (gocTheoHoSo[k] || []).map(function (r) { return { ngay: ngayIsoCuaO_(r.NgayTra), tien: Number(r.SoTien) || 0, loai: 'TRẢ GỐC', soThamChieu: r.SoThamChieu || '' }; });
    if (daTT && duNo > 0) dong.push({ ngay: ngayTT, tien: duNo, loai: 'TẤT TOÁN NGOÀI HỆ THỐNG', soThamChieu: '' });
    dong.sort(function (a, b) { return a.ngay < b.ngay ? -1 : (a.ngay > b.ngay ? 1 : 0); });
    dong.forEach(function (d) {
      var tg = tyGiaTaiNgay_(lichSu, d.ngay);
      var thieu = !tyGia0 ? 'THIEU_TY_GIA_GIAI_NGAN' : (!tg ? 'THIEU_TY_GIA_NGAY_TRA' : '');
      var lai = thieu ? '' : Math.round(d.tien * (tyGia0 - tg.ty));
      tab4.push({ maHoSo: k, tenCty: ct.TenCty || '', soHopDong: hd.SoHopDong || '', ngayGiaiNgan: ngayGN, goc: d.tien,
        loaiGiaoDich: d.loai, ngayGiaoDich: d.ngay, soThamChieu: d.soThamChieu, tyGiaGiaiNgan: tyGia0,
        tyGiaNgayGiaoDich: tg ? tg.ty : '', ngayTyGiaDung: tg ? tg.ngayCo : '', chenhLechVND: lai, canhBao: thieu,
        nhom: nhom, nhanTrangThai: NHAN_TRANG_THAI_TRA_NO[st] });
    });
  });
  var rank = { QUA_HAN: 0, SAP_DEN_HAN: 1, TRONG_HAN: 2, CHUA_CO_HAN: 3, DA_TAT_TOAN: 4 };
  tab3.sort(function (a, b) {
    if (a.mucDo === 'DA_TAT_TOAN' || b.mucDo === 'DA_TAT_TOAN') {
      if (a.mucDo !== b.mucDo) return rank[a.mucDo] - rank[b.mucDo];
      return String(b.ngayTatToan).localeCompare(String(a.ngayTatToan));
    }
    var da = a.ngayDenHan || '9999-12-31', db = b.ngayDenHan || '9999-12-31';
    return da < db ? -1 : (da > db ? 1 : a.maHoSo.localeCompare(b.maHoSo));
  });
  tab2.sort(function (a, b) { return a.maHoSo.localeCompare(b.maHoSo); });
  var tongTab4 = { VND: 0, soDongThieuTyGia: 0 };
  tab4.forEach(function (d) { if (d.canhBao) tongTab4.soDongThieuTyGia++; else tongTab4.VND += d.chenhLechVND; });
  return { ngayBaoCao: today, tyGiaMoiNhat: lichSu.length ? lichSu[lichSu.length - 1] : null,
    tab2: tab2, tab3: tab3, tab4: tab4, tongTab4: tongTab4, nguonTyGia: 'Sheet TyGiaThuCong (tỷ giá ngày trả lấy bản ghi gần nhất trước hoặc đúng ngày)' };
}
