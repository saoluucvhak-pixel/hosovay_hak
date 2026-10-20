/** Adapter HAK Smart Filter: lọc toàn bộ chỉ mục đã giới hạn quyền, trước phân trang. */
function taoBoLocHoSoHak_(f, search) {
  var allowed = ['trangThai', 'loaiTien', 'maCty', 'maHD', 'tuNgay', 'denNgay', 'thieuNgay', 'tenNguoiHuong'];
  Object.keys(f).forEach(function (key) {
    if (allowed.indexOf(key) < 0) throw new Error('Điều kiện lọc chưa hỗ trợ: ' + key);
  });
  var state = HAK_SF_.empty();
  state.q = String(search || '');
  ['tuNgay', 'denNgay'].forEach(function (key) {
    if (!f[key]) return;
    var day = HAK_SF_.parseVN(String(f[key]));
    if (!day) throw new Error('Ngày lọc không hợp lệ: ' + key);
    state[key === 'tuNgay' ? 'tu' : 'den'] = day;
  });
  var problem = HAK_SF_.dateProblem(state);
  if (problem) throw new Error(problem);
  if (f.trangThai) state.sel.trangThai = [].concat(f.trangThai).map(String);
  ['loaiTien', 'maCty', 'maHD', 'tenNguoiHuong'].forEach(function (key) {
    if (f[key]) state.one[key] = key === 'loaiTien' ? String(f[key]).toUpperCase() : String(f[key]);
  });
  if (f.thieuNgay) state.flag.thieuNgay = true;
  return { state: state, config: {
    screenId: 'hosovay-hoso',
    fields: [
      { key: 'trangThai', type: 'multi', label: 'Trạng thái', match: function (r, v) { return v.indexOf(r[CM_.TT]) >= 0 || !v.length; } },
      { key: 'loaiTien', type: 'enum', label: 'Loại tiền', match: function (r, v) { return r[CM_.LOAI] === v; } },
      { key: 'maCty', type: 'enum', label: 'Công ty', match: function (r, v, c) { var h = c.tra.hd[r[CM_.HD]]; return !!h && String(h.MaCty) === v; } },
      { key: 'maHD', type: 'enum', label: 'Hợp đồng', match: function (r, v) { return r[CM_.HD] === v; } },
      { key: 'tenNguoiHuong', type: 'enum', label: 'Người hưởng', match: function (r, v, c) { return !!(c.nguoi && c.nguoi[r[CM_.MA]]); } },
      { key: 'thieuNgay', type: 'bool', label: 'Thiếu ngày', match: function (r) { return !r[CM_.NGAY_GN]; } }
    ],
    matchDate: function (r, tu, den) { var day = r[CM_.NGAY_GN]; return !!day && (!tu || day >= tu) && (!den || day <= den); },
    matchQ: function (r, q, c) {
      var h = c.tra.hd[r[CM_.HD]], company = h ? c.tra.cty[String(h.MaCty)] : null;
      return HAK_SF_.hay([r[CM_.MA], r[CM_.GNN], h ? h.SoHopDong : '', company ? company.TenCty : '', h ? h.TenNganHang : '', r[CM_.TT]]).indexOf(q) >= 0;
    }
  } };
}
