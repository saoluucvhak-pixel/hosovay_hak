/** Tổng nguyên tệ chỉ để trình bày, không sửa số tiền hoặc quy tắc quy đổi. */
function tongNguyenTeBaoCao_(rows) {
  var tong = { VND: 0, USD: 0 };
  rows.forEach(function (r) { tong[r.loaiTien === 'USD' ? 'USD' : 'VND'] += Number(r.soTienVay) || 0; });
  return formatSo_(tong.VND) + ' VND | ' + formatSo_(tong.USD) + ' USD';
}
function moTaPhamViBaoCao_(options) {
  options = options || {};
  return 'Lọc theo ngày ' + (options.loaiNgay === 'THUC_TE' ? 'THỰC TẾ' : 'DỰ KIẾN') +
    (options.chiThieuNgay ? ' | Chỉ hồ sơ thiếu ngày' : '') +
    ' | Nguyên tệ VND/USD tách riêng; quy đổi VND để tham khảo.';
}
