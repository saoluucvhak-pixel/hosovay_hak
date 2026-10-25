/** Tất toán theo từng hồ sơ, độc lập với trạng thái hợp đồng/giải ngân. */
function daTatToanHoSo_(h) { return h && (h.DaTatToan === true || String(h.DaTatToan).toUpperCase() === 'TRUE'); }
function khoanVayTrongPhamVi_(rows, tra, pv) {
  var loc = rows.filter(function(h) {
    var hd=tra.hd[String(h.MaHD)];
    return !laDaXoa_(h.DaXoa) && h.TrangThai===TT_DA_GIAI_NGAN && (!pv.length||(hd&&pv.indexOf(String(hd.MaCty))>=0));
  });
  // Mọi phép tính trên khoản vay (lãi, lịch trả, tất toán, dư nợ, dự báo) dùng ngày THỰC giải ngân theo xác nhận ngân hàng; hồ sơ gốc không bị sửa.
  if (!loc.length) return loc;
  var map = ngayThucGiaiNganTheoHoSo_();
  return loc.map(function (h) { return hoSoVoiNgayThuc_(h, map); });
}
function thongKeTatToan_(rows, traMap) {
  var today=homNayVN_(),end=new Date(today+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+7);
  var last=end.toISOString().slice(0,10),r={chuaTatToan:0,daTatToan:0,gocUSD:0,gocVND:0,sapDenHan:0,quaHan:0};
  rows.forEach(function(h){
    if(daTatToanHoSo_(h)){r.daTatToan++;return;}r.chuaTatToan++;
    var duNo=duNoGocConLai_(h,traMap);
    if(String(h.LoaiTien).toUpperCase()==='USD')r.gocUSD=congSoTien_(r.gocUSD,duNo);
    else r.gocVND=congSoTien_(r.gocVND,duNo);
    var due=ngayIsoCuaO_(h.NgayDenHan);if(!(duNo>0))return; // đã trả đủ gốc: không còn quá hạn/đến hạn
    if(due&&due<today)r.quaHan++;else if(due&&due<=last)r.sapDenHan++;
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
        ngayDenHan:ngayIsoCuaO_(h.NgayDenHan),soNgayDenHan:(!daTatToanHoSo_(h)&&ngayIsoCuaO_(h.NgayDenHan))?soNgayGiuaIso_(homNayVN_(),ngayIsoCuaO_(h.NgayDenHan)):null,daTatToan:!!daTatToanHoSo_(h),ngayTatToan:ngayIsoCuaO_(h.NgayTatToan),revision:soRevision_(h),
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
    var ngayGNTT=ngayIsoCuaO_(hoSoVoiNgayThuc_(h).NgayGiaiNgan);if(ngay&&ngayGNTT&&ngay<ngayGNTT)throw new Error('Ngày tất toán không được trước ngày giải ngân.');
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


/* ===================== BÁO CÁO TÍNH TIỀN LÃI (theo hồ sơ / hợp đồng / thời gian) ===================== */
var BC_LAI_SO_NGAY_TOI_DA_ = 3700;
/**
 * Lãi phát sinh của 1 khoản vay trong khoảng [s, e) theo từng THÁNG: mỗi đoạn không vắt qua đầu tháng và không vắt qua ngày trả gốc,
 * lãi đoạn = dư nợ gốc đầu đoạn × lãi suất năm ÷ 100 × số ngày ÷ cơ số (cùng công thức với lịch trả nợ — tinhLichTraNo_). Thuần, không đọc sheet.
 * gocTra: [{ngay:'yyyy-MM-dd', tien}]. Trả { 'yyyy-MM': { lai (chưa làm tròn), soNgay, tichDuNoNgay } }.
 */
function tinhLaiTheoThang_(goc, gocTra, lsNam, coSo, s, e) {
  var kq = {};
  if (!(s < e)) return kq;
  var cuts = [s, e], d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
  for (var m = d.toISOString().slice(0, 10); m < e; ) { if (m > s) cuts.push(m); var n = new Date(m + 'T00:00:00Z'); n.setUTCMonth(n.getUTCMonth() + 1); m = n.toISOString().slice(0, 10); }
  (gocTra || []).forEach(function (p) { if (p.ngay > s && p.ngay < e && cuts.indexOf(p.ngay) < 0) cuts.push(p.ngay); });
  cuts.sort();
  var duNoTai = function (t) { return duNoGocTaiNgay_(goc, gocTra, t); };
  for (var i = 0; i < cuts.length - 1; i++) {
    var days = soNgayGiuaIso_(cuts[i], cuts[i + 1]); if (days <= 0) continue;
    var du = duNoTai(cuts[i]), k = cuts[i].slice(0, 7), o = kq[k] || (kq[k] = { lai: 0, soNgay: 0, tichDuNoNgay: 0 });
    o.lai += du * lsNam / 100 * days / coSo; o.soNgay += days; o.tichDuNoNgay += du * days;
  }
  return kq;
}
/** Các tháng [{thang:'yyyy-MM', a, b}] phủ khoảng [s, e) (a gồm, b không gồm), mỗi đoạn nằm trọn trong một tháng. */
function bcLaiChiaThang_(s, e) {
  var kq = [], a = s;
  while (a < e) {
    var d = new Date(a + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
    var b = d.toISOString().slice(0, 10); if (b > e) b = e;
    kq.push({ thang: a.slice(0, 7), a: a, b: b }); a = b;
  }
  return kq;
}
/**
 * Báo cáo tính tiền lãi của các khoản đã giải ngân trong khoảng [tuNgay, denNgay] (gồm cả hai đầu), 3 cách nhìn: theo hồ sơ, theo hợp đồng, theo tháng.
 *  • Lãi TRONG HẠN: dư nợ gốc thực tế từng ngày × lãi suất hợp đồng ÷ cơ số, từ ngày giải ngân (gồm) đến ngày đến hạn / tất toán (không gồm).
 *  • Lãi QUÁ HẠN / PHẠT (ƯỚC TÍNH, tuỳ chọn baoGomLaiPhat, mặc định có): phần lãi phạt phát sinh trong khoảng theo đúng công thức lãi phạt của Quản lý vay (tinhLaiPhat_: % lãi quá hạn trên gốc quá hạn, lãi chậm trả trên lãi quá hạn).
 *  • QUY ĐỔI VND: khoản USD × tỷ giá CUỐI THÁNG (bản ghi gần nhất trước hoặc đúng ngày trong sổ TyGiaThuCong); thiếu tỷ giá thì KHÔNG tính (quyDoiVND = null) và báo.
 * Mỗi (hồ sơ, tháng) làm tròn theo loại tiền rồi mới cộng nên ba cách nhìn luôn khớp tổng. VND và USD không cộng lẫn (chỉ tongQuyDoi là VND đã quy đổi). Chỉ đọc.
 * @param {{tuNgay:string, denNgay:string, loaiTien:string=, baoGomLaiPhat:boolean=}} tuyChon  để trống tuNgay/denNgay = từ 01/01 năm nay đến hôm nay.
 */
function layBaoCaoTienLai(tuyChon) {
  yeuCauDangNhap_();
  var o = tuyChon || {}, today = homNayVN_();
  var tu = o.tuNgay ? ngayChuanISO_(o.tuNgay, 'Từ ngày', false) : today.slice(0, 4) + '-01-01', den = o.denNgay ? ngayChuanISO_(o.denNgay, 'Đến ngày', false) : today;
  if (den < tu) throw new Error('Đến ngày (' + den + ') không được trước Từ ngày (' + tu + ').');
  if (soNgayGiuaIso_(tu, den) + 1 > BC_LAI_SO_NGAY_TOI_DA_) throw new Error('Khoảng thời gian tối đa ' + BC_LAI_SO_NGAY_TOI_DA_ + ' ngày (khoảng 10 năm).');
  var loaiLoc = String(o.loaiTien || '').toUpperCase(); if (loaiLoc && loaiLoc !== 'VND' && loaiLoc !== 'USD') throw new Error('Loại tiền không hợp lệ.');
  var coPhat = o.baoGomLaiPhat !== false;
  var denLoai = new Date(den + 'T00:00:00Z'); denLoai.setUTCDate(denLoai.getUTCDate() + 1); var e0 = denLoai.toISOString().slice(0, 10); // cận trên không gồm
  var cfg = cauHinhLichTra_(), tra = layTraCuuDanhMuc_(), ds = docTraNo_().filter(function (r) { return r.TrangThai === TRA_HIEU_LUC; }), qh = coPhat ? thamSoQuaHan_() : null, lichSuTy = docLichSuTyGia_();
  var gocTra = {}, laiTra = {}, dsKhoan = {};
  ds.forEach(function (r) {
    var k = String(r.MaHoSo), ngay = String(r.NgayTra || '').substring(0, 10), tien = Number(r.SoTien) || 0;
    (dsKhoan[k] = dsKhoan[k] || []).push(r);
    if (r.LoaiTra === TRA_GOC) (gocTra[k] = gocTra[k] || []).push({ ngay: ngay, tien: tien });
    else if (r.LoaiTra === TRA_LAI && ngay >= tu && ngay <= den) laiTra[k] = congSoTien_(laiTra[k] || 0, tien);
  });
  var theoHoSo = [], chiTiet = [], hopDong = {}, thang = {}, tong = {}, tongPhat = {}, qd = { laiTrongHan: 0, laiPhat: 0, thieu: 0 };
  var cong = function (obj, k, v) { obj[k] = congSoTien_(obj[k] || 0, v); };
  khoanVayTrongPhamVi_(docDanhSachHoSo_(false), tra, phamViCongTyNguoiDung_()).forEach(function (h) {
    var k = String(h.MaHoSo), hd = tra.hd[String(h.MaHD)] || {}, ct = tra.cty[String(hd.MaCty)] || {}, loai = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND';
    if (loaiLoc && loai !== loaiLoc) return;
    var gocKV = Number(h.SoTienNhanNoLanNay) || 0, gn = ngayIsoCuaO_(h.NgayGiaiNgan), dh = ngayIsoCuaO_(h.NgayDenHan), tt = daTatToanHoSo_(h) ? ngayIsoCuaO_(h.NgayTatToan) : '', ls = Number(hd['LaiSuatTrongHan_%']) || 0, canhBao = [];
    var thieuNgay = !gn || !dh || !(gocKV > 0); if (thieuNgay) canhBao.push('THIEU_NGAY_HOAC_SO_TIEN'); else if (!(ls > 0)) canhBao.push('LAI_SUAT_BANG_0');
    var ketThuc = dh && tt && tt < dh ? tt : dh, s = gn && gn > tu ? gn : tu, e = ketThuc && ketThuc < e0 ? ketThuc : e0;
    var cacThang = thieuNgay ? {} : tinhLaiTheoThang_(gocKV, gocTra[k] || [], ls, cfg.coSo, s, e), phatThang = {};
    if (coPhat && !thieuNgay && dh && dh < e0) { // lãi phạt ước tính theo từng tháng: P(cuối đoạn) − P(đầu đoạn)
      var sP = dh > tu ? dh : tu, eP = tt && tt < e0 ? tt : e0, P = function (x) { return tinhLaiPhat_(h, hd, dsKhoan[k] || [], { coSo: cfg.coSo, nhac: cfg.nhac, today: x }, qh).tong; };
      try { bcLaiChiaThang_(sP, eP).forEach(function (seg) { var v = Math.max(0, congSoTien_(P(seg.b), -P(seg.a))); if (v > 0) phatThang[seg.thang] = lamTronTienKy_(v, loai); }); }
      catch (eP2) { canhBao.push('PHAT_KHONG_TINH_DUOC'); }
    }
    var cacKy = Object.keys(cacThang).concat(Object.keys(phatThang).filter(function (m) { return !cacThang[m]; })).sort();
    if (!cacKy.length && !canhBao.length) return; // không phát sinh gì trong khoảng → không liệt kê
    var lai = 0, phat = 0, soNgay = 0, tich = 0, quyDoi = 0, thieuTy = 0;
    cacKy.forEach(function (m) {
      var x = cacThang[m] || { lai: 0, soNgay: 0, tichDuNoNgay: 0 }, l = lamTronTienKy_(x.lai, loai), p = phatThang[m] || 0;
      var ngayCuoi = (function () { var d = new Date(m + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); var c = d.toISOString().slice(0, 10); return c > den ? den : c; })();
      var tg = loai === 'USD' ? tyGiaTaiNgay_(lichSuTy, ngayCuoi) : { ty: 1 }, qdv = tg ? Math.round((l + p) * tg.ty) : null;
      lai = congSoTien_(lai, l); phat = congSoTien_(phat, p); soNgay += x.soNgay; tich += x.tichDuNoNgay; if (qdv === null) thieuTy++; else quyDoi += qdv;
      chiTiet.push({ maHoSo: k, maHD: String(h.MaHD), soHopDong: hd.SoHopDong || '', loaiTien: loai, thang: m, soNgay: x.soNgay, duNoBinhQuan: x.soNgay ? Math.round(x.tichDuNoNgay / x.soNgay) : 0, laiSuat: ls, lai: l, laiPhat: p, tyGia: loai === 'USD' ? (tg ? tg.ty : null) : 1, quyDoiVND: qdv });
      var t = thang[m] || (thang[m] = { thang: m, soNgay: 0, soKhoan: {}, lai: {}, laiPhat: {}, quyDoiVND: 0, thieuTyGia: 0, tyGiaCuoiThang: null });
      t.soNgay = Math.max(t.soNgay, x.soNgay); t.soKhoan[k] = 1; cong(t.lai, loai, l); if (p) cong(t.laiPhat, loai, p); if (qdv === null) t.thieuTyGia++; else t.quyDoiVND += qdv; if (loai === 'USD' && tg) t.tyGiaCuoiThang = tg.ty;
    });
    var kv = { maHoSo: k, soGiayNhanNo: h.SoGiayNhanNo || '', tenCty: ct.TenCty || '', maHD: String(h.MaHD), soHopDong: hd.SoHopDong || '', loaiTien: loai, goc: gocKV, laiSuat: ls, ngayGiaiNgan: gn, ngayDenHan: dh,
      ngayTatToan: tt, tuNgayTinh: Object.keys(cacThang).length ? s : '', denNgayTinh: Object.keys(cacThang).length ? (function () { var d2 = new Date(e + 'T00:00:00Z'); d2.setUTCDate(d2.getUTCDate() - 1); return d2.toISOString().slice(0, 10); })() : '',
      soNgay: soNgay, duNoBinhQuan: soNgay ? Math.round(tich / soNgay) : 0, lai: lai, laiPhat: phat, laiDaTra: laiTra[k] || 0, quyDoiVND: thieuTy ? null : quyDoi, canhBao: canhBao.concat(thieuTy ? ['THIEU_TY_GIA'] : []).join(',') };
    theoHoSo.push(kv);
    var hh = hopDong[kv.maHD] || (hopDong[kv.maHD] = { maHD: kv.maHD, soHopDong: kv.soHopDong, tenCty: kv.tenCty, soKhoan: 0, laiSuat: ls, lai: {}, laiPhat: {}, laiDaTra: {}, quyDoiVND: 0, thieuTyGia: 0 });
    hh.soKhoan++; cong(hh.lai, loai, lai); if (phat) cong(hh.laiPhat, loai, phat); cong(hh.laiDaTra, loai, kv.laiDaTra); if (thieuTy) hh.thieuTyGia += thieuTy; else hh.quyDoiVND += quyDoi;
    cong(tong, loai, lai); if (phat) cong(tongPhat, loai, phat);
    qd.thieu += thieuTy;
    // tổng quy đổi tách lãi trong hạn / lãi phạt (cùng tỷ giá từng tháng)
    chiTiet.filter(function (c) { return c.maHoSo === k && c.quyDoiVND !== null; }).forEach(function (c) { var tg2 = c.tyGia || 1; qd.laiTrongHan += Math.round(c.lai * tg2); qd.laiPhat += Math.round(c.laiPhat * tg2); });
  });
  theoHoSo.sort(function (a, b) { return a.maHoSo.localeCompare(b.maHoSo); });
  return { tuNgay: tu, denNgay: den, soNgayKhoang: soNgayGiuaIso_(tu, den) + 1, coSoNgay: cfg.coSo, loaiTien: loaiLoc, coLaiPhat: coPhat, theoHoSo: theoHoSo,
    theoHopDong: Object.keys(hopDong).map(function (k) { return hopDong[k]; }).sort(function (a, b) { return String(a.soHopDong).localeCompare(String(b.soHopDong)); }),
    theoThang: Object.keys(thang).sort().map(function (m) { var t = thang[m]; return { thang: m, soNgay: t.soNgay, soKhoan: Object.keys(t.soKhoan).length, lai: t.lai, laiPhat: t.laiPhat, quyDoiVND: t.thieuTyGia ? null : t.quyDoiVND, tyGiaCuoiThang: t.tyGiaCuoiThang }; }),
    chiTiet: chiTiet.sort(function (a, b) { return a.thang < b.thang ? -1 : (a.thang > b.thang ? 1 : a.maHoSo.localeCompare(b.maHoSo)); }), tong: tong, tongPhat: tongPhat,
    tongQuyDoi: { laiTrongHan: qd.laiTrongHan, laiPhat: qd.laiPhat, tong: qd.laiTrongHan + qd.laiPhat, soDongThieuTyGia: qd.thieu },
    ghiChu: 'Lãi trong hạn theo dư nợ gốc thực tế từng ngày × lãi suất hợp đồng ÷ ' + cfg.coSo + '; từ ngày giải ngân (gồm) đến ngày đến hạn/tất toán (không gồm). Lãi quá hạn/phạt là số ƯỚC TÍNH theo cấu hình lãi quá hạn (đối chiếu thông báo của ngân hàng). Quy đổi USD theo tỷ giá cuối tháng trong sổ tỷ giá. VND và USD không cộng lẫn.' };
}

/* ===================== THEO DÕI TẤT TOÁN THEO NGÀY ===================== */
var TT_NGAY_TOI_DA_ = 400;
/**
 * Theo dõi 1 khoản vay THEO TỪNG NGÀY trong khoảng [tuNgay, denNgay] (mặc định: 30 ngày trước đến 30 ngày sau hôm nay; tối đa 400 ngày mỗi lần): dư nợ gốc cuối ngày,
 * lãi trong hạn phát sinh trong ngày và LŨY KẾ từ ngày giải ngân, số ngày còn lại tới hạn, tiền trả gốc/lãi/lãi phạt trong ngày và các SỰ KIỆN (giải ngân, đến hạn kỳ lãi/kỳ gốc,
 * trả nợ, đến hạn khoản vay, tất toán). Ngày sau hôm nay là DỰ KIẾN (theo dư nợ hiện tại). Cùng công thức với lịch trả nợ: dư nợ gốc thực tế × lãi suất hợp đồng ÷ cơ số ngày;
 * tính từ ngày giải ngân (gồm) đến ngày đến hạn/tất toán (không gồm). Không gồm lãi quá hạn/lãi phạt. Chỉ đọc.
 */
function layTheoDoiTatToanTheoNgay(maHoSo, tuyChon) {
  yeuCauDangNhap_();
  var h = layHoSoTheoMa_(maHoSo), tra = layTraCuuDanhMuc_();
  var kvMot = h ? khoanVayTrongPhamVi_([h], tra, phamViCongTyNguoiDung_()) : []; if (kvMot.length) h = kvMot[0]; // bản tính theo ngày THỰC giải ngân
  if (!h || !kvMot.length) throw new Error('Không tìm thấy khoản đã giải ngân trong phạm vi được cấp.');
  var o = tuyChon || {}, today = homNayVN_(), cfg = cauHinhLichTra_(), hd = tra.hd[String(h.MaHD)] || {};
  var gn = ngayIsoCuaO_(h.NgayGiaiNgan), dh = ngayIsoCuaO_(h.NgayDenHan), daTT = !!daTatToanHoSo_(h), tt = daTT ? ngayIsoCuaO_(h.NgayTatToan) : '', goc = Number(h.SoTienNhanNoLanNay) || 0, ls = Number(hd['LaiSuatTrongHan_%']) || 0;
  if (!gn || !dh || !(goc > 0)) throw new Error('Khoản vay thiếu ngày giải ngân, ngày đến hạn hoặc số tiền nên chưa theo dõi theo ngày được.');
  var cong = function (iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  var tu = o.tuNgay ? ngayChuanISO_(o.tuNgay, 'Từ ngày', false) : cong(today, -30), den = o.denNgay ? ngayChuanISO_(o.denNgay, 'Đến ngày', false) : cong(today, 30);
  if (den < tu) throw new Error('Đến ngày (' + den + ') không được trước Từ ngày (' + tu + ').');
  if (soNgayGiuaIso_(tu, den) + 1 > TT_NGAY_TOI_DA_) throw new Error('Mỗi lần xem tối đa ' + TT_NGAY_TOI_DA_ + ' ngày — chọn khoảng ngắn hơn.');
  var loai = String(h.LoaiTien || 'VND').toUpperCase() === 'USD' ? 'USD' : 'VND', ketThuc = tt && tt < dh ? tt : dh;
  var ds = docTraNo_().filter(function (r) { return String(r.MaHoSo) === String(maHoSo) && r.TrangThai === TRA_HIEU_LUC; });
  var gocTra = [], suKienNgay = {}, traNgay = {};
  var them = function (d, nhan) { (suKienNgay[d] = suKienNgay[d] || []).push(nhan); };
  ds.forEach(function (r) {
    var d = String(r.NgayTra || '').substring(0, 10), t = Number(r.SoTien) || 0, k = d + '|' + r.LoaiTra, x = traNgay[d] = traNgay[d] || { goc: 0, lai: 0, phat: 0 };
    if (r.LoaiTra === TRA_GOC) { gocTra.push({ ngay: d, tien: t }); x.goc = congSoTien_(x.goc, t); them(d, 'Trả gốc ' + formatSo_(t)); }
    else if (r.LoaiTra === TRA_LAI) { x.lai = congSoTien_(x.lai, t); them(d, 'Trả lãi ' + formatSo_(t)); }
    else if (r.LoaiTra === TRA_PHAT) { x.phat = congSoTien_(x.phat, t); them(d, 'Trả lãi phạt ' + formatSo_(t)); }
  });
  them(gn, 'Giải ngân ' + formatSo_(goc)); them(dh, 'Đến hạn khoản vay'); if (tt) them(tt, 'Tất toán');
  try {
    var lich = tinhLichTraNo_(h, hd, ds, cfg);
    lich.laiRows.forEach(function (k) { them(k.denNgay, 'Đến hạn trả lãi kỳ ' + k.ky); }); lich.gocRows.forEach(function (k) { them(k.ngayDen, 'Đến hạn trả gốc kỳ ' + k.ky); });
  } catch (eLich) { /* thiếu thông tin lịch: vẫn theo dõi được theo ngày */ }
  var duNoTai = function (t) { return duNoGocTaiNgay_(goc, gocTra, t); };
  var s = tu > gn ? tu : gn, e = den < ketThuc ? den : ketThuc, rows = [], sGocTra = 0, sLaiTra = 0, sLai = 0;
  if (s <= e) {
    var truoc = tinhLaiTheoThang_(goc, gocTra, ls, cfg.coSo, gn, s), luyKe = 0;
    Object.keys(truoc).forEach(function (m) { luyKe += truoc[m].lai; });
    for (var d = s; d <= e; d = cong(d, 1)) {
      var du = duNoTai(d), laiNgay = d < ketThuc ? du * ls / 100 / cfg.coSo : 0, t = traNgay[d] || { goc: 0, lai: 0, phat: 0 };
      luyKe += laiNgay; sLai += laiNgay; sGocTra = congSoTien_(sGocTra, t.goc); sLaiTra = congSoTien_(sLaiTra, t.lai);
      rows.push({ ngay: d, soNgayDenHan: daTT ? null : soNgayGiuaIso_(d, dh), duNoGocCuoiNgay: du, laiNgay: lamTronTienKy_(laiNgay, loai), laiLuyKe: lamTronTienKy_(luyKe, loai), gocTra: t.goc, laiTra: t.lai, phatTra: t.phat,
        suKien: suKienNgay[d] || [], duKien: d > today });
    }
  }
  return { maHoSo: String(maHoSo), loaiTien: loai, goc: goc, laiSuat: ls, coSoNgay: cfg.coSo, ngayGiaiNgan: gn, ngayDenHan: dh, ngayTatToan: tt, ngayKetThuc: ketThuc, hienTai: today, tuNgay: tu, denNgay: den,
    rows: rows, tong: { laiPhatSinh: lamTronTienKy_(sLai, loai), gocTra: sGocTra, laiTra: sLaiTra },
    ghiChu: 'Lãi trong hạn theo dư nợ gốc thực tế từng ngày × lãi suất hợp đồng ÷ ' + cfg.coSo + ', từ ngày giải ngân (gồm) đến ngày đến hạn/tất toán (không gồm); không gồm lãi quá hạn/lãi phạt. Ngày sau hôm nay là dự kiến.' };
}
