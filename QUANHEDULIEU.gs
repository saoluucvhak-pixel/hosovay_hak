/**
 * SƠ ĐỒ QUAN HỆ DỮ LIỆU + KIỂM TRA TOÀN VẸN QUAN HỆ (chỉ đọc).
 * Một nguồn duy nhất: SO_DO_DU_LIEU_ mô tả bảng → khoá chính → khoá ngoại → ai ghi → chính sách xoá → chống trùng/phiên bản.
 * Dùng cho (1) kiemTraQuanHeDuLieu (Quản trị) và (2) bộ sinh tài liệu LUONG_DU_LIEU.md (tools/sinh_luong_du_lieu.cjs) — tài liệu và bộ kiểm tra không thể lệch nhau.
 * Báo cáo CHỈ liệt kê sai lệch (mã khoá, không kèm dữ liệu nhạy cảm); KHÔNG sửa/xoá gì. Chuỗi hồ sơ → chi tiết → xác nhận → tổng tiền đã có ở “Chạy đối soát” (layBaoCaoDoiSoat).
 * cho phép rỗng = true: khoá ngoại có thể để trống một cách hợp lệ (VD tài liệu chưa gắn hồ sơ).
 */
var SO_DO_DU_LIEU_ = [
  {"sheet":"DM_TaiSan","nhom":"Danh mục tài sản mới","pk":["Ma","Revision"],"fk":[{"cot":"MaCty","den":"DM_CongTy","moTa":"Công ty quản lý, khác chủ sở hữu"}],"ghi":["luuDanhMucTaiSan","doiTrangThaiTaiSanDanhMuc"],"xoa":"Không xóa; giữ lịch sử phiên bản","chongTrung":"Khóa yêu cầu; kiểm liên kết MaTaiSan trong ts2KiemTraQuanHe_","phienBan":"Revision + expectedRevision; chỉ thêm dòng; chi tiết theo Phien"},
  {"sheet":"DangKyTheChap","nhom":"Danh mục tài sản mới","pk":["Ma","Revision"],"fk":[{"cot":"MaCty","den":"DM_CongTy","moTa":"Công ty quản lý, khác chủ sở hữu"}],"ghi":["luuDangKyTheChap","doiTrangThaiTaiSanDanhMuc"],"xoa":"Không xóa; giữ lịch sử phiên bản","chongTrung":"Khóa yêu cầu; kiểm liên kết MaTaiSan trong ts2KiemTraQuanHe_","phienBan":"Revision + expectedRevision; chỉ thêm dòng; chi tiết theo Phien"},
  {"sheet":"BaoHiemDanhMuc","nhom":"Danh mục tài sản mới","pk":["Ma","Revision"],"fk":[{"cot":"MaCty","den":"DM_CongTy","moTa":"Công ty quản lý, khác chủ sở hữu"}],"ghi":["luuBaoHiemDanhMuc","doiTrangThaiTaiSanDanhMuc"],"xoa":"Không xóa; giữ lịch sử phiên bản","chongTrung":"Khóa yêu cầu; kiểm liên kết MaTaiSan trong ts2KiemTraQuanHe_","phienBan":"Revision + expectedRevision; chỉ thêm dòng; chi tiết theo Phien"},
  {"sheet":"DangKyTheChapChiTiet","nhom":"Danh mục tài sản mới","pk":["MaCha","Phien","STT"],"fk":[],"ghi":["luuDangKyTheChap","doiTrangThaiTaiSanDanhMuc"],"xoa":"Không xóa; giữ lịch sử phiên bản","chongTrung":"Khóa yêu cầu; kiểm liên kết MaTaiSan trong ts2KiemTraQuanHe_","phienBan":"Theo Phien của cha; MaTaiSan tham chiếu mã danh mục"},
  {"sheet":"BaoHiemDanhMucChiTiet","nhom":"Danh mục tài sản mới","pk":["MaCha","Phien","STT"],"fk":[],"ghi":["luuBaoHiemDanhMuc","doiTrangThaiTaiSanDanhMuc"],"xoa":"Không xóa; giữ lịch sử phiên bản","chongTrung":"Khóa yêu cầu; kiểm liên kết MaTaiSan trong ts2KiemTraQuanHe_","phienBan":"Theo Phien của cha; MaTaiSan tham chiếu mã danh mục"},
  { sheet: 'DM_CongTy', nhom: 'Danh mục', pk: ['MaCty'], fk: [], ghi: ['luuCongTy'], xoa: 'Không có chức năng xoá (chỉ sửa)', chongTrung: 'Hệ thống một công ty; sửa theo đúng mã', phienBan: 'Revision + expectedRevision (bắt buộc khi sửa)' },
  { sheet: 'DM_HopDongVay', nhom: 'Danh mục', pk: ['MaHD'], fk: [{ cot: 'MaCty', den: 'DM_CongTy', moTa: 'công ty vay vốn' }], ghi: ['luuHopDong', 'xoaHopDong'], xoa: 'Chỉ xoá khi chưa có hồ sơ/tài sản tham chiếu (RESTRICT)', chongTrung: 'Không trùng số hợp đồng trong cùng công ty', phienBan: 'Revision + expectedRevision' },
  { sheet: 'DM_KhachHang', nhom: 'Danh mục', pk: ['MaKH'], fk: [], ghi: ['luuKhachHang', 'upsertKhachHangTheoMST_ (OCR)', 'themCongTyBaoHiem_'], xoa: 'xoaKhachHang: quản trị, kiểm tra phiên bản; chặn khi dùng trong thụ hưởng hoặc bảo hiểm', chongTrung: 'khoaYeuCau khi tạo (gửi lại không tạo bản trùng); OCR theo MST', phienBan: 'Revision + expectedRevision (bắt buộc khi sửa/xóa)' },
  { sheet: 'HoSoGiaiNgan', nhom: 'Giải ngân (CHA)', pk: ['MaHoSo'], fk: [{ cot: 'MaHD', den: 'DM_HopDongVay', moTa: 'hợp đồng Đang hiệu lực' }], ghi: ['luuHoSoGiaiNgan', 'chuyenHoSoVeNhap', 'taoTronBoTheoMau', 'xacNhanGiaiNganThucTe', 'capNhatTatToanHoSo', 'xoaHoSo'], xoa: 'Xoá mềm (DaXoa), giữ lịch sử', chongTrung: 'khoaYeuCau khi tạo', phienBan: 'Revision + expectedRevision (bắt buộc)' },
  { sheet: 'ChiTietThuHuong', nhom: 'Giải ngân (CON)', pk: ['MaHoSo', 'STT'], fk: [{ cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ cha' }], ghi: ['luuHoSoGiaiNgan (cùng lần ghi với cha; có nhật ký ghi dở để phục hồi)'], xoa: 'Giữ cùng hồ sơ cha (xoá mềm cha)', chongTrung: 'Theo hồ sơ cha', phienBan: 'Theo Revision của hồ sơ cha' },
  { sheet: 'XacNhanGiaiNgan', nhom: 'Giải ngân thực tế', pk: ['MaXacNhan'], fk: [{ cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ' }], ghi: ['xacNhanGiaiNganThucTe', 'ghiNhanDieuChinhGiaiNgan', 'huyGiaiNgan'], xoa: 'Không xoá; hủy bỏ bằng trạng thái', chongTrung: 'Một xác nhận hiệu lực/hồ sơ; số tham chiếu NH không trùng', phienBan: 'Theo Revision hồ sơ' },
  { sheet: 'TraNoHoSo', nhom: 'Trả nợ', pk: ['MaTra'], fk: [{ cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'khoản vay' }], ghi: ['ghiNhanTraNo', 'ghiNhanTraNoGop', 'huyTraNo'], xoa: 'Không xoá; hủy bỏ kèm lý do', chongTrung: 'Số tham chiếu giao dịch NH không trùng', phienBan: 'Theo Revision hồ sơ (bắt buộc)' },
  { sheet: 'PheDuyetGiaiNgan', nhom: 'Duyệt', pk: ['MaPheDuyet'], fk: [{ cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ' }], ghi: ['guiPheDuyet', 'quyetDinhPheDuyet'], xoa: 'Không xoá', chongTrung: 'Gắn RevisionGui', phienBan: 'RevisionGui = Revision hồ sơ lúc gửi' },
  { sheet: 'LichSuTrangThaiHoSo', nhom: 'Nhật ký', pk: [], fk: [{ cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ' }], ghi: ['chuyenTrangThaiHoSo_'], xoa: 'Chỉ thêm dòng', chongTrung: '—', phienBan: '—' },
  { sheet: 'LichSuPhatHanhTaiLieu', nhom: 'Chứng từ', pk: [], fk: [{ cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ' }], ghi: ['taoTronBoTheoMau', 'taoChungTuThanhToan', 'taoDeNghiGiaiNganBIDV'], xoa: 'Giữ lịch sử; bản cũ đánh dấu Đã thay thế', chongTrung: 'Hash dữ liệu + hash mẫu', phienBan: 'RevisionHoSo lúc phát hành' },
  { sheet: 'TaiLieuDinhKem', nhom: 'Tài liệu', pk: ['MaTaiLieu'], fk: [{ cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ (rỗng = chưa gắn)', choPhepRong: true }], ghi: ['taiLenTaiLieuHoSo', 'luuChungTuNhieuTrang'], xoa: 'xoaTaiLieuDinhKem (kèm hoá đơn con)', chongTrung: 'Hoá đơn trùng (MST + số + ký hiệu) chỉ lưu một lần', phienBan: '—' },
  { sheet: 'BangKeHoaDon', nhom: 'Tài liệu (CON)', pk: ['MaHoaDon'], fk: [{ cot: 'MaTaiLieu', den: 'TaiLieuDinhKem', moTa: 'tệp gốc', choPhepRong: true }, { cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ (rỗng = chưa gắn)', choPhepRong: true }], ghi: ['luuChungTuNhieuTrang', 'capNhatHoaDonThuCong'], xoa: 'xoaHoaDonDaTai', chongTrung: 'MST + số + ký hiệu', phienBan: '—' },
  { sheet: 'BangKeBangLuong', nhom: 'Tài liệu (CON)', pk: ['MaDongLuong'], fk: [{ cot: 'MaTaiLieu', den: 'TaiLieuDinhKem', moTa: 'tệp gốc', choPhepRong: true }, { cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ', choPhepRong: true }], ghi: ['taiLenTaiLieuHoSo'], xoa: 'Cùng tệp gốc', chongTrung: '—', phienBan: '—' },
  { sheet: 'TaiSanBaoDam', nhom: 'Tài sản thế chấp', pk: ['MaTS'], fk: [{ cot: 'MaHD', den: 'DM_HopDongVay', moTa: 'hợp đồng vay' }], ghi: ['luuTaiSanBaoDam', 'giaiChapTaiSan', 'apDungCapNhatTSDB (Excel)'], xoa: 'Không xoá; giải chấp = đổi trạng thái, giữ bảo hiểm và lịch sử', chongTrung: 'khoaYeuCau khi tạo; Excel khớp mã/tên trong hợp đồng', phienBan: 'Revision + expectedRevision (bắt buộc)' },
  { sheet: 'BaoHiemTaiSan', nhom: 'Bảo hiểm (CHA)', pk: ['MaBH'], fk: [{ cot: 'MaTS', den: 'TaiSanBaoDam', moTa: 'tài sản thế chấp' }], ghi: ['luuBaoHiemTaiSan', 'huyBaoHiemTaiSan', 'apDungCapNhatTSDB (qua ghiHopDongBH_)', 'xacMinhPhucHoiBaoHiem'], xoa: 'Không xoá; hủy bằng trạng thái', chongTrung: 'Cùng tài sản + số HĐ + công ty + ngày ký + nội dung', phienBan: 'Revision + TheHe (thế hệ chi tiết) + SoDong' },
  { sheet: 'BaoHiemTaiSanChiTiet', nhom: 'Bảo hiểm (CON)', pk: ['MaBH', 'TheHe', 'STT'], fk: [{ cot: 'MaBH', den: 'BaoHiemTaiSan', moTa: 'hợp đồng bảo hiểm cha' }], ghi: ['ghiHopDongBH_ (một khối, thế hệ mới, đọc lại trước khi chốt)'], xoa: 'Dòng thế hệ khác thế hệ của cha = vô hình; chỉ dọn sau khi bản chốt được xác nhận', chongTrung: 'TheHe tăng đơn điệu, không tái sử dụng', phienBan: 'Theo TheHe của cha' },
  { sheet: 'GiaoDichBaoHiem', nhom: 'Bảo hiểm (dấu vết)', pk: [], fk: [{ cot: 'MaBH', den: 'BaoHiemTaiSan', moTa: 'hợp đồng bảo hiểm' }], ghi: ['ghiHopDongBH_', 'xacMinhPhucHoiBaoHiem'], xoa: 'Chỉ thêm dòng', chongTrung: 'MaGD riêng mỗi giao dịch', phienBan: '—' },
  { sheet: 'DieuKienRangBuoc', nhom: 'Quản lý vay', pk: ['MaRB'], fk: [{ cot: 'MaHD', den: 'DM_HopDongVay', moTa: 'hợp đồng', choPhepRong: true }], ghi: ['luuDieuKienRangBuoc', 'capNhatGiaTriRangBuoc', 'xoaDieuKienRangBuoc'], xoa: 'xoaDieuKienRangBuoc', chongTrung: '—', phienBan: '—' },
  { sheet: 'ChotBaoCaoLai', nhom: 'Báo cáo đã chốt (CHA)', pk: ['MaChot'], fk: [], ghi: ['chotBaoCaoLai', 'huyChotLai'], xoa: 'Không xoá; hủy chốt kèm lý do', chongTrung: 'Không chồng khoảng ngày kỳ đã chốt', phienBan: '—' },
  { sheet: 'ChotBaoCaoLaiCT', nhom: 'Báo cáo đã chốt (CON)', pk: [], fk: [{ cot: 'MaChot', den: 'ChotBaoCaoLai', moTa: 'kỳ chốt' }, { cot: 'MaHoSo', den: 'HoSoGiaiNgan', moTa: 'hồ sơ' }], ghi: ['chotBaoCaoLai'], xoa: 'Giữ cùng kỳ chốt', chongTrung: '—', phienBan: '—' },
  { sheet: 'TyGiaThuCong', nhom: 'Tỷ giá', pk: ['Ngay'], fk: [], ghi: ['ghiTyGiaThuCong'], xoa: 'Không xoá', chongTrung: 'Mỗi ngày một dòng; ghi đè phải xác nhận', phienBan: '—' },
  { sheet: 'SYS_NguoiDung', nhom: 'Hệ thống', pk: ['Email'], fk: [], ghi: ['luuNguoiDung'], xoa: 'Vô hiệu bằng trạng thái', chongTrung: 'Email duy nhất', phienBan: '—' }
];
var QH_MAU_TOI_DA_ = 5;
function qhDoc_(ten) { var sh = getSS_().getSheetByName(ten); return sh ? sheetToObjects_(ten) : null; }
function qhKhoa_(r, cols) { return cols.map(function (c) { var v = r[c]; return v instanceof Date ? ngayIsoCuaO_(v) : String(v === null || v === undefined ? '' : v).trim(); }).join('|'); }
/**
 * Kiểm tra quan hệ giữa các bảng theo SO_DO_DU_LIEU_ (chỉ đọc, Quản trị): khoá chính rỗng/trùng, khoá ngoại mồ côi, trả nợ vượt gốc, nhiều xác nhận giải ngân hiệu lực, bảo hiểm trỏ thế hệ thiếu chi tiết.
 * Trả { ok, tongLoi, tongCanhBao, soBang, bangChuaCo:[], ketQua:[{ma, ten, muc, soLuong, mau:[]}], ghiChu }.
 */
function kiemTraQuanHeDuLieu() {
  yeuCauDangNhap_(); yeuCauQuanTri_('kiểm tra quan hệ dữ liệu');
  var du = {}, ket = [], chua = [];
  SO_DO_DU_LIEU_.forEach(function (b) { du[b.sheet] = qhDoc_(b.sheet); if (du[b.sheet] === null) chua.push(b.sheet); });
  var them = function (ma, ten, muc, ds) { if (ds.length) ket.push({ ma: ma, ten: ten, muc: muc, soLuong: ds.length, mau: ds.slice(0, QH_MAU_TOI_DA_) }); };
  var tapKhoa = {};
  SO_DO_DU_LIEU_.forEach(function (b) { var rows = du[b.sheet]; if (!rows || !b.pk.length) return; var s = tapKhoa[b.sheet] = {}; rows.forEach(function (r) { s[qhKhoa_(r, b.pk)] = true; }); });
  SO_DO_DU_LIEU_.forEach(function (b) {
    var rows = du[b.sheet]; if (!rows) return;
    if (b.pk.length) {
      var dem = {}, rong = [], trung = [];
      rows.forEach(function (r) {
        var k = qhKhoa_(r, b.pk); if (b.pk.some(function (c) { return String(r[c] === undefined || r[c] === null ? '' : r[c]).trim() === ''; })) { rong.push(b.sheet + ' dòng ' + (r._row || '?')); return; }
        dem[k] = (dem[k] || 0) + 1; if (dem[k] === 2) trung.push(b.sheet + ': ' + k);
      });
      them('PK_RONG', 'Khoá chính để trống', 'LOI', rong); them('PK_TRUNG', 'Khoá chính bị trùng', 'LOI', trung);
    }
    (b.fk || []).forEach(function (f) {
      var cha = tapKhoa[f.den]; if (!cha) return;
      var moCoi = [], thieu = [];
      rows.forEach(function (r) {
        var v = String(r[f.cot] === undefined || r[f.cot] === null ? '' : r[f.cot]).trim(), id = b.pk.length ? qhKhoa_(r, b.pk) : ('dòng ' + (r._row || '?'));
        if (!v) { if (!f.choPhepRong) thieu.push(b.sheet + '[' + id + '].' + f.cot + ' để trống'); return; }
        if (!cha[v]) moCoi.push(b.sheet + '[' + id + '].' + f.cot + ' → ' + f.den + '.' + v + ' không tồn tại');
      });
      them('FK_MO_COI', 'Khoá ngoại trỏ tới bản ghi không tồn tại (' + b.sheet + '.' + f.cot + ' → ' + f.den + ')', 'LOI', moCoi);
      them('FK_RONG', 'Khoá ngoại bắt buộc bị để trống (' + b.sheet + '.' + f.cot + ')', 'LOI', thieu);
    });
  });
  // Trả nợ: tổng gốc hiệu lực không vượt gốc hồ sơ; trả nợ chỉ cho hồ sơ Đã giải ngân
  var hoSo = du['HoSoGiaiNgan'], tn = du['TraNoHoSo'];
  if (hoSo && tn) {
    var theoMa = {}; hoSo.forEach(function (h) { theoMa[String(h.MaHoSo)] = h; });
    var traGoc = {}, vuot = [], saiTT = [], daBao = {};
    tn.forEach(function (r) {
      if (r.TrangThai !== TRA_HIEU_LUC) return; var k = String(r.MaHoSo), h = theoMa[k]; if (!h) return;
      if (r.LoaiTra === TRA_GOC) traGoc[k] = congSoTien_(traGoc[k] || 0, Number(r.SoTien) || 0);
      if (h.TrangThai !== TT_DA_GIAI_NGAN && !daBao[k]) { daBao[k] = 1; saiTT.push('TraNoHoSo → ' + k + ' (trạng thái hồ sơ: ' + h.TrangThai + ')'); }
    });
    Object.keys(traGoc).forEach(function (k) { var g = Number(theoMa[k].SoTienNhanNoLanNay) || 0; if (traGoc[k] > g) vuot.push(k + ': đã trả gốc ' + traGoc[k] + ' > gốc ' + g); });
    them('TRA_GOC_VUOT_GOC', 'Tổng trả gốc hiệu lực vượt số tiền hồ sơ', 'LOI', vuot); them('TRA_NO_HO_SO_CHUA_GIAI_NGAN', 'Có trả nợ hiệu lực nhưng hồ sơ không ở trạng thái Đã giải ngân', 'CANH_BAO', saiTT);
  }
  // Xác nhận giải ngân: tối đa một xác nhận hiệu lực loại “xác nhận” cho mỗi hồ sơ
  var xn = du['XacNhanGiaiNgan'];
  if (xn) { var dx = {}, nhieu = []; xn.forEach(function (r) { if (r.TrangThai !== XN_HIEU_LUC || r.LoaiBanGhi !== XN_LOAI_XAC_NHAN) return; var k = String(r.MaHoSo); dx[k] = (dx[k] || 0) + 1; if (dx[k] === 2) nhieu.push(k + ': nhiều hơn một xác nhận giải ngân hiệu lực'); }); them('XAC_NHAN_NHIEU_HIEU_LUC', 'Hồ sơ có nhiều xác nhận giải ngân hiệu lực', 'LOI', nhieu); }
  // Bảo hiểm: hợp đồng cha trỏ thế hệ thiếu chi tiết
  if (du['BaoHiemTaiSan'] && du['BaoHiemTaiSanChiTiet']) { try { them('BH_THE_HE_THIEU_CHI_TIET', 'Hợp đồng bảo hiểm trỏ thế hệ chi tiết không đủ dòng (dùng “Xác minh/phục hồi”)', 'LOI', hopDongHongBH_().map(function (m) { return m; })); } catch (e) { ket.push({ ma: 'BH_KHONG_KIEM_DUOC', ten: 'Không kiểm được thế hệ bảo hiểm: ' + e.message, muc: 'CANH_BAO', soLuong: 1, mau: [] }); } }
  them('TAI_SAN_DANH_MUC_QUAN_HE', 'Quan hệ danh mục tài sản / thế chấp / bảo hiểm', 'LOI', ts2KiemTraQuanHe_());
  var loi = ket.filter(function (k) { return k.muc === 'LOI'; }).reduce(function (a, k) { return a + k.soLuong; }, 0), cb = ket.filter(function (k) { return k.muc === 'CANH_BAO'; }).reduce(function (a, k) { return a + k.soLuong; }, 0);
  try { ghiNhatKy_('', 'KIEM_TRA_QUAN_HE_DU_LIEU', loi + ' lỗi, ' + cb + ' cảnh báo, ' + (SO_DO_DU_LIEU_.length - chua.length) + ' bảng'); } catch (eLog) { /* không chặn */ }
  return { ok: loi === 0, tongLoi: loi, tongCanhBao: cb, soBang: SO_DO_DU_LIEU_.length - chua.length, bangChuaCo: chua, ketQua: ket,
    ghiChu: 'Chỉ đọc — không sửa dữ liệu. Chuỗi hồ sơ ↔ chi tiết thụ hưởng ↔ xác nhận giải ngân ↔ tổng tiền: xem “Chạy đối soát” ở Báo cáo. Bảng chưa tạo (chưa từng ghi) được bỏ qua.' };
}
