/** Danh mục gốc → đăng ký thế chấp / hợp đồng bảo hiểm độc lập.
 * Mỗi lần lưu là một phiên bản bất biến. Ghi và xác minh con trước, chốt cha sau.
 * Không sửa/xóa lịch sử và không tự chuyển dữ liệu cũ khi chưa xác định được từng tài sản. */
var TS2_COT_ = ['Ma', 'Revision', 'MaCty', 'Phien', 'KhoaYeuCau', 'NoiDung', 'SoDong', 'ThoiDiem', 'NguoiGhi'];
var TS2_CT_ = ['MaCha', 'Phien', 'STT', 'MaTaiSan', 'NoiDung'];
var TS2_BANG_ = { TS: 'DM_TaiSan', DK: 'DangKyTheChap', BH: 'BaoHiemDanhMuc' };
// Bộ nhớ chỉ sống trong lượt báo cáo voiBoNhoBH_, không dùng cache xuyên người/công ty.
function ts2Doc_(ten) { return docSheetBaoDam_(ten); }
function ts2Quyen_(ghi) {
  yeuCauDangNhap_();
  if (ghi) xoaBoNhoBH_(); // kiểm tra ghi phải đọc mới sau khi vào khóa
  if (ghi && !coQuyenApi_(layDanhTinh_().vaiTro, Q_NHAP_)) throw new Error('Không có quyền nhập tài sản.');
}
function ts2CongTy_(ma) {
  var tra = layTraCuuDanhMuc_(), pv = phamViCongTyNguoiDung_();
  if (!Object.prototype.hasOwnProperty.call(tra.cty,String(ma)) || (pv.length && pv.indexOf(String(ma)) < 0)) throw new Error('Công ty ngoài phạm vi được cấp.');
  return String(ma);
}
function ts2Text_(v, ten, max, batBuoc) {
  var s = String(v === undefined || v === null ? '' : v).trim();
  if ((batBuoc && !s) || s.length > max) throw new Error(ten + ' bắt buộc và tối đa ' + max + ' ký tự.');
  return s;
}
function ts2Parse_(r) {
  var o; try { o = JSON.parse(r.NoiDung); } catch(e) { throw new Error('Dữ liệu tài sản hỏng: ' + r.Ma); }
  return Object.assign(o, { ma: String(r.Ma), revision: Number(r.Revision), maCty: String(r.MaCty), phien: String(r.Phien), thoiDiem: String(r.ThoiDiem), nguoiGhi: String(r.NguoiGhi) });
}
function ts2HienHanh_(loai, maCty) {
  var map = {};
  ts2Doc_(TS2_BANG_[loai]).forEach(function(r) { if (maCty && String(r.MaCty)!==maCty) return; if (!r.Phien || !r.NoiDung) throw new Error('Bản ghi chưa đủ dữ liệu: ' + r.Ma); if (!map[r.Ma] || Number(r.Revision) > Number(map[r.Ma].Revision)) map[r.Ma] = r; });
  return Object.keys(map).map(function(k) { return ts2Parse_(map[k]); });
}
/** Lập chỉ mục một lần thay vì quét toàn bộ chi tiết cho mỗi bản cha. */
function ts2ChiMuc_(rows) {
  var by=Object.create(null);
  rows.forEach(function(r){var key=JSON.stringify([String(r.MaCha),String(r.Phien)]);(by[key]||(by[key]=[])).push(r);});
  return {by:by};
}
function ts2ChiTiet_(loai, p, nguon) {
  if (loai === 'TS') return [];
  var source=nguon||ts2ChiMuc_(ts2Doc_(TS2_BANG_[loai]+'ChiTiet'));
  var rows=(source.by ? (source.by[JSON.stringify([p.ma,p.phien])]||[]) : source.filter(function(r){return String(r.MaCha)===p.ma&&String(r.Phien)===p.phien;})).slice().sort(function(a,b){return Number(a.STT)-Number(b.STT);});
  if (rows.length !== p.soDong) throw new Error('Thiếu chi tiết của ' + p.ma + '; cần kiểm tra dữ liệu.');
  return rows.map(function(r) { return JSON.parse(r.NoiDung); });
}
function ts2ThuLai_(loai, tt) {
  if (!tt || !/^[A-Za-z0-9_-]{8,80}$/.test(String(tt.khoaYeuCau || ''))) throw new Error('Khóa yêu cầu không hợp lệ.');
  var r=ts2Doc_(TS2_BANG_[loai]).filter(function(x){return x.KhoaYeuCau===tt.khoaYeuCau;})[0];
  if(!r)return null; ts2CongTy_(r.MaCty);var o=ts2Parse_(r);
  if(o.yeuCau!==JSON.stringify(tt))throw new Error('Khóa yêu cầu đã dùng cho nội dung khác.');
  ts2ChiTiet_(loai,o);return {ma:o.ma,revision:o.revision,trungLap:true};
}
function ts2Ghi_(loai, tt, data, lines) {
  var ten = TS2_BANG_[loai], rows = ts2Doc_(ten), ma = String(tt.ma || ''), key = ts2Text_(tt.khoaYeuCau, 'Khóa yêu cầu', 80, true);
  var noiDung = JSON.stringify(data), payload = JSON.stringify({ data: data, lines: lines });
  if (payload.length > 44000) throw new Error('Quá nhiều dữ liệu trong một lần lưu; tối đa 44.000 ký tự.');
  var retry = rows.filter(function(r) { return r.KhoaYeuCau === key; })[0];
  if (retry) {
    if (String(retry.MaCty) !== String(data.maCty)) throw new Error('Khóa yêu cầu đã được dùng.');
    var rp = ts2Parse_(retry), rl = ts2ChiTiet_(loai, rp);
    if (rp.payload !== payload) throw new Error('Khóa yêu cầu đã dùng cho nội dung khác.');
    return { ma: rp.ma, revision: rp.revision, trungLap: true };
  }
  var old = ma ? ts2HienHanh_(loai).filter(function(r) { return r.ma === ma; })[0] : null;
  if (ma && !old) throw new Error('Không tìm thấy ' + ma);
  if (old) { ts2CongTy_(old.maCty); if (old.maCty !== data.maCty) throw new Error('Không chuyển công ty của bản ghi đã có.'); if (Number(tt.expectedRevision) !== old.revision) throw new Error('XUNG_DOT_PHIEN_BAN: tải lại trước khi sửa.'); }
  ma = ma || loai + '-' + Utilities.getUuid();
  var rev = old ? old.revision + 1 : 1, phien = Utilities.getUuid();
  data = Object.assign({}, data, { soDong: lines.length, payload: payload, yeuCau: JSON.stringify(tt) });
  noiDung = JSON.stringify(data);
  if (noiDung.length > 48000) throw new Error('Nội dung bản ghi vượt giới hạn lưu trữ.');
  var parent = { Ma: ma, Revision: rev, MaCty: data.maCty, Phien: phien, KhoaYeuCau: key, NoiDung: noiDung, SoDong: lines.length, ThoiDiem: new Date(), NguoiGhi: layDanhTinh_().email || emailNguoiDung_() };
  if (lines.length) {
    xoaBoNhoBH_(); // không để lần đọc xác minh lấy bản trước khi ghi
    var sh = ensureSheet_(getSS_(), ten + 'ChiTiet', TS2_CT_), vals = lines.map(function(d,i) { return [ma, phien, i+1, d.maTaiSan, JSON.stringify(d)]; });
    sh.getRange(timDongThatCuoiCung_(sh)+1,1,vals.length,TS2_CT_.length).setValues(vals); SpreadsheetApp.flush();
    var doc = ts2Doc_(ten + 'ChiTiet').filter(function(r) { return r.Phien === phien; });
    if (doc.length !== lines.length || doc.some(function(r,i) { return r.NoiDung !== vals[i][4] || Number(r.STT) !== i+1; })) throw new Error('Chưa chốt: chi tiết ghi không đầy đủ. Có thể thử lại.');
  }
  xoaBoNhoBH_();
  var err = null;
  try { var cha = ensureSheet_(getSS_(), ten, TS2_COT_); themDongVaoCuoiThat_(cha, TS2_COT_.map(function(k) { return parent[k]; })); SpreadsheetApp.flush(); } catch(e) { err = e; }
  var saved;
  try { saved = ts2Doc_(ten).filter(function(r) { return r.Phien === phien && r.NoiDung === noiDung; })[0]; }
  catch(e2) { throw new Error('CHUA_XAC_DINH: giữ nguyên biểu mẫu và thử lại cùng yêu cầu để xác minh.'); }
  if (!saved) throw new Error('Chưa chốt bản ghi: ' + (err ? err.message : 'đọc lại không khớp'));
  xoaBoNhoBH_();
  return { ma: ma, revision: rev, canhBao: err ? ['Đã xác minh lưu thành công sau lỗi phản hồi.'] : [] };
}
function ts2TaiSan_(ma, cty) {
  var a = ts2HienHanh_('TS').filter(function(r) { return r.ma === ma; })[0];
  if (!a || a.maCty !== cty) throw new Error('Tài sản không thuộc danh mục công ty: ' + ma);
  return a;
}
function ts2Chon_(rows, cty) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new Error('Chọn từ 1 đến 100 tài sản.');
  var seen = {}, map = {}; ts2HienHanh_('TS').forEach(function(a) { if(a.maCty === cty) map[a.ma] = a; });
  return rows.map(function(r) {
    var a = map[r.maTaiSan]; if (!a || a.trangThai !== 'Đang dùng') throw new Error('Tài sản không hợp lệ: ' + r.maTaiSan);
    if(r.expectedAssetRevision!=null&&Number(r.expectedAssetRevision)!==a.revision)throw new Error('XUNG_DOT_TAI_SAN: tài sản đã thay đổi; tải lại danh mục trước khi lưu.');
    if (seen[a.ma]) throw new Error('Tài sản được chọn trùng: ' + a.ten); seen[a.ma] = true;
    return { maTaiSan: a.ma, assetRevision:a.revision, ten: a.ten, chuSoHuu: a.chuSoHuu, loaiChuSoHuu: a.loaiChuSoHuu, diaDiem: a.diaDiem, nguyenGia: a.nguyenGia, khauHao: a.khauHao, conLai: a.conLai };
  });
}
function luuDanhMucTaiSan(tt) {
  ts2Quyen_(true); return voiKhoa_(function() {
    tt = tt || {}; var retry=ts2ThuLai_('TS',tt);if(retry)return retry; var cty = ts2CongTy_(tt.maCty), ng = docTienNguyen_(tt.nguyenGia, 'Nguyên giá', true), kh = docTienNguyen_(tt.khauHao, 'Khấu hao', true);
    if (kh > ng) throw new Error('Khấu hao vượt nguyên giá.');
    var duplicate=ts2HienHanh_('TS',cty).filter(function(a){return a.ma!==tt.ma && String(tt.soHieu||'').trim() && String(a.soHieu||'').trim().toLocaleUpperCase()===String(tt.soHieu).trim().toLocaleUpperCase();})[0];
    if(duplicate)throw new Error('Số hiệu/giấy tờ đã có ở tài sản '+duplicate.ma+' — '+duplicate.ten+'. Mở tài sản này để cập nhật.');
    if(tt.ma){var existing=ts2TaiSan_(tt.ma,cty);if(existing.trangThai!=='Đang dùng')throw new Error('Tài sản đã ngừng sử dụng; không sửa để tự kích hoạt lại.');}
    if (['Công ty','Tổ chức khác','Cá nhân'].indexOf(tt.loaiChuSoHuu) < 0) throw new Error('Chọn loại chủ sở hữu.');
    if (!LOAI_TAI_SAN_[tt.loai]) throw new Error('Chọn loại tài sản.');
    return ts2Ghi_('TS',tt,{maCty:cty,ten:ts2Text_(tt.ten,'Tên tài sản',200,true),loai:tt.loai,loaiChuSoHuu:tt.loaiChuSoHuu,chuSoHuu:ts2Text_(tt.chuSoHuu,'Chủ sở hữu',200,true),diaDiem:ts2Text_(tt.diaDiem,'Địa điểm tài sản',500,true),soHieu:ts2Text_(tt.soHieu,'Số hiệu/giấy tờ',150,false),nguyenGia:ng,khauHao:kh,conLai:congSoTien_(ng,-kh),trangThai:'Đang dùng'},[]);
  });
}
function luuDangKyTheChap(tt) {
  ts2Quyen_(true); return voiKhoa_(function() {
    tt=tt||{};var retry=ts2ThuLai_('DK',tt);if(retry)return retry;var hd=hopDongTrongPhamVi_(tt.maHD),cty=ts2CongTy_(hd.MaCty),lines=ts2Chon_(tt.chiTiet,cty), mode=tt.cheDo;
    var registrations=ts2HienHanh_('DK'), detail=ts2ChiMuc_(ts2Doc_('DangKyTheChapChiTiet'));
    registrations.forEach(function(d){if(d.ma===tt.ma || d.maCty!==cty)return;
      if(d.soDangKy===String(tt.soDangKy||'').trim())throw new Error('Mã đăng ký đã tồn tại; mở bản ghi để cập nhật.');
      if(d.maHD===tt.maHD && d.trangThai==='Đang bảo đảm' && ts2ChiTiet_('DK',d,detail).some(function(l){return lines.some(function(a){return a.maTaiSan===l.maTaiSan;});}))throw new Error('Tài sản đã thuộc đăng ký đang bảo đảm của hợp đồng vay này.');
    });
    if (mode !== 'NHOM' && mode !== 'TUNG_TAI_SAN') throw new Error('Chọn cách định giá.');
    var total=mode==='NHOM'?docTienNguyen_(tt.giaTri,'Tổng giá trị định giá'):0;
    lines.forEach(function(l,i){l.giaTriDinhGia=mode==='NHOM'?'':docTienNguyen_(tt.chiTiet[i].giaTriDinhGia,'Định giá '+l.ten);if(mode!=='NHOM') total=congSoTien_(total,l.giaTriDinhGia);});
    if (!(total>0)) throw new Error('Giá trị định giá phải lớn hơn 0.');
    var old=tt.ma?ts2HienHanh_('DK').filter(function(r){return r.ma===tt.ma;})[0]:null;
    if (old && old.trangThai!=='Đang bảo đảm') throw new Error('Đăng ký đã giải chấp.');
    if (old && old.maHD!==tt.maHD) throw new Error('Không đổi hợp đồng vay của đăng ký; tạo đăng ký mới.');
    return ts2Ghi_('DK',tt,{maCty:cty,maHD:tt.maHD,soDangKy:ts2Text_(tt.soDangKy,'Mã đăng ký thế chấp',100,true),ngayDangKy:ngayChuanISO_(tt.ngayDangKy,'Ngày đăng ký',true),ngayDinhGia:ngayChuanISO_(tt.ngayDinhGia,'Ngày định giá',true),donViDinhGia:ts2Text_(tt.donViDinhGia,'Đơn vị định giá',200,true),soChungThu:ts2Text_(tt.soChungThu,'Số chứng thư',100,true),soHDBaoDam:ts2Text_(tt.soHDBaoDam,'Số hợp đồng bảo đảm',100,true),cheDo:mode,giaTri:total,trangThai:'Đang bảo đảm'},lines);
  });
}
function luuBaoHiemDanhMuc(tt) {
  ts2Quyen_(true);return voiKhoa_(function(){
    tt=tt||{};var retry=ts2ThuLai_('BH',tt);if(retry)return retry;var cty=ts2CongTy_(tt.maCty),lines=ts2Chon_(tt.chiTiet,cty),old=tt.ma?ts2HienHanh_('BH').filter(function(r){return r.ma===tt.ma;})[0]:null;
    if(ts2HienHanh_('BH').some(function(b){return b.ma!==tt.ma && b.maCty===cty && b.soHopDong===String(tt.soHopDong||'').trim() && b.congTyBH===String(tt.congTyBH||'').trim() && b.ngayKy===tt.ngayKy;}))throw new Error('Hợp đồng bảo hiểm đã có; mở bản ghi để sửa.');
    if(old && old.trangThai!=='Hiệu lực') throw new Error('Hợp đồng đã hủy.');
    lines.forEach(function(l,i){var r=tt.chiTiet[i];l.giaTriTaiSanBH=docTienNguyen_(r.giaTriTaiSanBH,'Giá trị tài sản được bảo hiểm',true);if(l.giaTriTaiSanBH<=0)throw new Error('Giá trị tài sản được bảo hiểm phải lớn hơn 0.');l.soTienBH=docTienNguyen_(r.soTienBH,'Số tiền bảo hiểm',true);if(l.soTienBH<=0)throw new Error('Số tiền bảo hiểm phải lớn hơn 0.');var fee=ts2PhiBaoHiem_(r,l.giaTriTaiSanBH);Object.keys(fee).forEach(function(k){l[k]=fee[k];});l.tuNgay=ngayChuanISO_(r.tuNgay,'Bảo hiểm từ ngày',false);l.denNgay=ngayChuanISO_(r.denNgay,'Bảo hiểm đến ngày',false);if(l.denNgay<l.tuNgay)throw new Error('Đến ngày không được trước từ ngày.');});
    return ts2Ghi_('BH',tt,{maCty:cty,soHopDong:ts2Text_(tt.soHopDong,'Số hợp đồng bảo hiểm',100,true),congTyBH:ts2Text_(tt.congTyBH,'Công ty bảo hiểm',200,true),ngayKy:ngayChuanISO_(tt.ngayKy,'Ngày ký',true),trangThai:'Hiệu lực'},lines);
  });
}
function doiTrangThaiTaiSanDanhMuc(tt) {
  ts2Quyen_(true);return voiKhoa_(function(){
    if(!tt || ['TS','DK','BH'].indexOf(tt.loai)<0)throw new Error('Loại thao tác không hợp lệ.');
    var retry=ts2ThuLai_(tt.loai,tt);if(retry)return retry;var old=ts2HienHanh_(tt.loai).filter(function(r){return r.ma===tt.ma;})[0];if(!old)throw new Error('Không tìm thấy bản ghi.');ts2CongTy_(old.maCty);
    if(old.trangThai!==(tt.loai==='TS'?'Đang dùng':tt.loai==='DK'?'Đang bảo đảm':'Hiệu lực'))throw new Error('Bản ghi đã kết thúc; không cập nhật trạng thái lần nữa.');
    var data=JSON.parse(old.payload).data, lines=ts2ChiTiet_(tt.loai,old);if(tt.loai==='TS'){
      ['DK','BH'].forEach(function(k){var idx=ts2ChiMuc_(ts2Doc_(TS2_BANG_[k]+'ChiTiet'));ts2HienHanh_(k,old.maCty).forEach(function(p){if(p.trangThai!==(k==='DK'?'Đang bảo đảm':'Hiệu lực'))return;var linked=ts2ChiTiet_(k,p,idx).some(function(l){return l.maTaiSan===old.ma&&(k==='DK'||l.denNgay>=homNayVN_());});if(linked)throw new Error('Không thể ngừng tài sản: còn ràng buộc '+p.ma);});});
      if(['Ngừng sử dụng','Đã thanh lý'].indexOf(tt.trangThai)<0)throw new Error('Chọn trạng thái tài sản.');
    }
    data.trangThai=tt.loai==='TS'?tt.trangThai:tt.loai==='DK'?'Đã giải chấp':'Đã hủy';data.lyDo=ts2Text_(tt.lyDo,'Lý do/chứng từ',500,true);data.ngayKetThuc=ngayChuanISO_(tt.ngay,'Ngày thực tế',true);
    if(data.ngayKetThuc<(data.ngayDangKy||data.ngayKy))throw new Error('Ngày kết thúc không được trước ngày bắt đầu.');
    return ts2Ghi_(tt.loai,tt,data,lines);
  });
}
function layTaiSanDanhMuc(maCty, view) {
  ts2Quyen_(false);maCty=ts2CongTy_(maCty);var all={};
  ['TS','DK','BH'].forEach(function(k){if(view==='DK'&&k==='BH'){all[k]=[];return;}var ct=k==='TS'?[]:ts2ChiMuc_(ts2Doc_(TS2_BANG_[k]+'ChiTiet'));all[k]=ts2HienHanh_(k,maCty).map(function(r){r.chiTiet=ts2ChiTiet_(k,r,ct);delete r.payload;delete r.yeuCau;return r;});});
  var today=homNayVN_(),dkMap={},dkLabels={},bhMap={};
  all.DK.forEach(function(d){if(d.trangThai==='Đang bảo đảm')d.chiTiet.forEach(function(l){(dkMap[l.maTaiSan]||(dkMap[l.maTaiSan]=[])).push(d.ma);(dkLabels[l.maTaiSan]||(dkLabels[l.maTaiSan]=[])).push(d.soDangKy+' / '+d.maHD);});});
  all.BH.forEach(function(b){if(b.trangThai==='Hiệu lực')b.chiTiet.forEach(function(l){(bhMap[l.maTaiSan]||(bhMap[l.maTaiSan]=[])).push({key:l.maTaiSan,ten:l.ten,tu:l.tuNgay,den:l.denNgay});});});
  all.TS.forEach(function(a){a.dangKy=dkMap[a.ma]||[];a.baoHiem=bhDanhGiaHangMuc_(bhMap[a.ma]||[],today);});
  var hd=layTraCuuDanhMuc_().hd;
  all.cu=ts2Doc_(SHEET_TAI_SAN_BAO_DAM).filter(function(r){return hd[r.MaHD]&&String(hd[r.MaHD].MaCty)===maCty;}).map(function(r){return {ma:r.MaTS,ten:r.MoTa,maHD:r.MaHD,giaTri:r.GiaTriVND};});
  all.BH.forEach(function(b){var coverage=bhDanhGiaHangMuc_(b.chiTiet.map(function(l){return {key:l.maTaiSan,ten:l.ten,tu:l.tuNgay,den:l.denNgay};}),today);b.tinhTrangBaoHiem=b.trangThai==='Đã hủy'?'Đã hủy':coverage?coverage.tinhTrang:'CHUA_BAO_HIEM';});
  all.TS.forEach(function(a){a.dangKyChiTiet=dkLabels[a.ma]||[];});
  if(['TS','DK','BH'].indexOf(view)>=0){['DK','BH'].forEach(function(k){if(k!==view)all[k]=[];});}
  return all;
}
function layLichSuTaiSanDanhMuc(loai,ma) {
  ts2Quyen_(false);if(!TS2_BANG_[loai])throw new Error('Loại không hợp lệ.');var rows=ts2Doc_(TS2_BANG_[loai]).filter(function(r){return r.Ma===ma;});if(!rows.length)throw new Error('Không tìm thấy bản ghi.');ts2CongTy_(rows[0].MaCty);
  var ct=loai==='TS'?[]:ts2ChiMuc_(ts2Doc_(TS2_BANG_[loai]+'ChiTiet'));
  return rows.map(function(r){var o=ts2Parse_(r);o.chiTiet=ts2ChiTiet_(loai,o,ct);delete o.payload;delete o.yeuCau;return o;}).sort(function(a,b){return b.revision-a.revision;});
}
/** Adapter báo cáo: đăng ký mới là một nhóm, không đếm thêm từng tài sản vào tổng định giá. */
function ts2DangKyBaoCao_() {
  return ts2HienHanh_('DK').map(function(d){return {MaTS:d.ma,MaHD:d.maHD,LoaiTS:'KHAC',MoTa:'Đăng ký '+d.soHDBaoDam+' ('+d.soDong+' tài sản)',GiaTriVND:d.giaTri,NgayDinhGia:d.ngayDinhGia,SoHDBaoDam:d.soHDBaoDam,TrangThai:d.trangThai,Revision:d.revision,NguonDanhMuc:true,SoTaiSan:d.soDong};});
}
/** Đọc một lần mỗi bảng con. Cảnh báo khi bất kỳ tài sản nào trong đăng ký chưa được bảo vệ. */
function ts2BaoHiemBaoCao_(today) {
  var kq={},dc=ts2ChiMuc_(ts2Doc_('DangKyTheChapChiTiet')),bc=ts2ChiMuc_(ts2Doc_('BaoHiemDanhMucChiTiet')),intervals={},policies={};
  ts2HienHanh_('BH').forEach(function(b){if(b.trangThai!=='Hiệu lực')return;ts2ChiTiet_('BH',b,bc).forEach(function(l){(intervals[l.maTaiSan]||(intervals[l.maTaiSan]=[])).push({key:l.maTaiSan,ten:l.ten,tu:l.tuNgay,den:l.denNgay});(policies[l.maTaiSan]||(policies[l.maTaiSan]={}))[b.ma]=true;});});
  ts2HienHanh_('DK').forEach(function(d){var items=ts2ChiTiet_('DK',d,dc),all=[],missing=[],ps={};items.forEach(function(l){if(!intervals[l.maTaiSan])missing.push(l.ten);else all=all.concat(intervals[l.maTaiSan]);Object.keys(policies[l.maTaiSan]||{}).forEach(function(id){ps[id]=true;});});var b=bhDanhGiaHangMuc_(all,today),o={han:b?b.ngayHetHan:'',soHD:Object.keys(ps).length,tinhTrang:b?b.tinhTrang:'CHUA_BAO_HIEM',hangMuc:b?b.hangMuc:'',ngayBatDau:b?b.ngayBatDau:'',ngayLienQuan:b?b.ngayLienQuan:'',soNgay:b?b.soNgay:null,hangMucChiTiet:b?b.hangMucChiTiet:[]};if(missing.length){o.tinhTrang='CHUA_BAO_HIEM';o.hangMuc=missing.join(', ');}kq[d.ma]=o;});return kq;
}
/** Kiểm tra hiện hành và lịch sử mà không sửa dữ liệu. Chi tiết chưa có cha (lần ghi chưa chốt) không tham gia nghiệp vụ. */
function ts2KiemTraQuanHe_() {
  var errors=[],assets={},contracts=layTraCuuDanhMuc_().hd;
  try {ts2HienHanh_('TS').forEach(function(a){assets[a.ma]=a;});}catch(e){return [e.message];}
  ['DK','BH'].forEach(function(k){var ct=ts2ChiMuc_(ts2Doc_(TS2_BANG_[k]+'ChiTiet'));ts2Doc_(TS2_BANG_[k]).forEach(function(row){try{var p=ts2Parse_(row);if(k==='DK'&&(!contracts[p.maHD]||String(contracts[p.maHD].MaCty)!==p.maCty))errors.push(p.ma+': hợp đồng vay thiếu hoặc khác công ty');var seen={};ts2ChiTiet_(k,p,ct).forEach(function(l){if(!assets[l.maTaiSan]||assets[l.maTaiSan].maCty!==p.maCty)errors.push(p.ma+': tài sản thiếu hoặc khác công ty '+l.maTaiSan);if(seen[l.maTaiSan])errors.push(p.ma+': tài sản trùng '+l.maTaiSan);seen[l.maTaiSan]=true;});}catch(e){errors.push(String(row.Ma)+': '+e.message);}});});return errors;
}

/** Tỷ lệ là phần trăm, tối đa 6 chữ số thập phân. Số tiền VND làm tròn half-up đến đồng. */
function ts2PhiBaoHiem_(r, giaTri) {
  var mode=r.cheDoPhi || 'THU_CONG',raw=r.tyLePhi==null?'':String(r.tyLePhi).trim().replace(',','.');
  if(['TU_DONG','THU_CONG'].indexOf(mode)<0)throw new Error('Chọn cách tính phí bảo hiểm.');
  var rate=null,calculated=null;
  if(raw!==''){
    if(!/^\d+(?:\.\d{1,6})?$/.test(raw)||Number(raw)>100)throw new Error('Tỷ lệ phí phải từ 0 đến 100%, tối đa 6 số thập phân.');
    rate=Number(raw);var units=Math.round(rate*1000000);
    calculated=Number((BigInt(giaTri)*BigInt(units)+BigInt(50000000))/BigInt(100000000));
  }
  if(mode==='TU_DONG'&&rate===null)throw new Error('Nhập tỷ lệ phí để tính tự động.');
  return {tyLePhi:rate,cheDoPhi:mode,phiTheoTyLe:calculated,lyDoPhi:ts2Text_(r.lyDoPhi,'Lý do phí nhập tay',500,false),phiBH:mode==='TU_DONG'?calculated:docTienNguyen_(r.phiBH,'Phí bảo hiểm',true)};
}
