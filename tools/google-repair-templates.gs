/** Chạy bằng trình chỉnh sửa trên bản TEST; không cài vào dự án vận hành.
 * Sửa đúng ba nhãn của mẫu BK_GIAINGAN_VND thành PHIÊN BẢN MỚI; không ghi đè file cũ.
 */
function hakRepairVndTemplate() {
  yeuCauDangNhap_(); yeuCauQuanTri_('sửa nhãn mẫu thử');
  if (moiTruong_() !== 'TEST' || idSpreadsheet_() === SPREADSHEET_ID) throw new Error('Chỉ chạy trên TEST tách riêng.');
  var matches = docDanhSachMau_(true).filter(function (m) { return m.MaMau === 'BK_GIAINGAN_VND' && m.TrangThai === TT_HIEU_LUC; });
  if (matches.length !== 1) throw new Error('Cần đúng một phiên bản mẫu hiệu lực.');
  var m = matches[0];
  if (m.LoaiTien !== 'VND' || m.LoaiFile !== 'xlsx') throw new Error('Sai loại tiền hoặc định dạng mẫu.');
  var source = tepMauTheoMuc_(m);
  if (m.HashFile && bamDuLieu_(Utilities.base64Encode(source.getBytes())) !== m.HashFile) throw new Error('Hash mẫu nguồn đã đổi.');
  var replacements = [
    ['Số tiền (USD)', 'Số tiền (VND)'],
    ['Bằng chữ (USD): {{BANG_KE.TONG_TIEN_BANG_CHU}}', 'Bằng chữ (VND): {{BANG_KE.TONG_TIEN_BANG_CHU}}'],
    ['Tỷ giá: {{HO_SO.TY_GIA}} USD/VND', 'Loại tiền: VND']
  ];
  var counts = [0,0,0];
  var parts = Utilities.unzip(source).map(function (part) {
    if (!/^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(part.getName())) return part;
    var text = part.getDataAsString();
    replacements.forEach(function (pair, i) { var a = text.split(pair[0]); counts[i] += a.length - 1; text = a.join(pair[1]); });
    return Utilities.newBlob(text, 'application/xml', part.getName());
  });
  if (counts.some(function (n) { return n !== 1; })) throw new Error('Nhãn nguồn không đúng mẫu đã duyệt: ' + counts.join(',') + '. Không sửa.');
  var fixed = Utilities.zip(parts, 'BK_GIAINGAN_VND.xlsx');
  var result = taiMauVanBan({maMau:m.MaMau,tenMau:m.TenMau,nganHang:m.NganHang,loaiTaiLieu:m.LoaiTaiLieu,loaiTien:'VND',
    dieuKienSoDong:m.DieuKienSoDong,tenFile:'BK_GIAINGAN_VND.xlsx',macDinh:m.MacDinh,
    ghiChu:'TEST: sửa nhãn USD và dòng tỷ giá trong mẫu VND; giữ nguyên số tiền/công thức/bố cục.'}, Utilities.base64Encode(fixed.getBytes()));
  console.log(JSON.stringify(result));
}
