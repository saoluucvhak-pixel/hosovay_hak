/**
 * MAUNOIDUNG.GS — MẪU NỘI DUNG THANH TOÁN (ô "-- Chọn mẫu nội dung --" ở Danh sách thụ hưởng).
 * Lưu ở sheet MauNoiDungThanhToan; vai trò Quản trị tự thêm / sửa / xoá trong tab Cài đặt, không cần sửa mã.
 * Chỗ tự điền: {so} = số hoá đơn (ô "Tài liệu số" của dòng), {ngay} = ngày hoá đơn — dòng chưa có số/ngày thì bỏ luôn
 * chữ "số"/"ngày" đi kèm (đúng như 2 mẫu cũ). Sheet chưa có hoặc rỗng → 2 mẫu mặc định.
 */
var SHEET_MAU_NOI_DUNG = 'MauNoiDungThanhToan';
var COT_MAU_NOI_DUNG_ = ['MaMau', 'TenMau', 'NoiDung', 'ThuTu', 'NgayCapNhat', 'NguoiCapNhat'];
var MAU_NOI_DUNG_MAC_DINH_ = [
  { maMau: 'hang', tenMau: 'Thanh toán tiền hàng theo hoá đơn...', noiDung: 'Thanh toán tiền hàng theo hoá đơn số {so} ngày {ngay}' },
  { maMau: 'cp', tenMau: 'Thanh toán chi phí theo hoá đơn...', noiDung: 'Thanh toán chi phí theo hoá đơn số {so} ngày {ngay}' }
];

function layMauNoiDungThanhToan() {
  yeuCauDangNhap_();
  var sh = getSS_().getSheetByName(SHEET_MAU_NOI_DUNG);
  var ds = (sh && sh.getLastRow() >= 2) ? sheetToObjects_(SHEET_MAU_NOI_DUNG)
    .filter(function (r) { return String(r.TenMau || '').trim() && String(r.NoiDung || '').trim(); })
    .map(function (r, i) { return { maMau: String(r.MaMau || ''), tenMau: String(r.TenMau).trim(), noiDung: String(r.NoiDung).trim(), thuTu: Number(r.ThuTu) || i + 1 }; })
    .sort(function (a, b) { return a.thuTu - b.thuTu; }) : [];
  return ds.length ? ds : MAU_NOI_DUNG_MAC_DINH_.map(function (m, i) { return { maMau: m.maMau, tenMau: m.tenMau, noiDung: m.noiDung, thuTu: i + 1 }; });
}

/** Chỉ Quản trị. Ghi lại TOÀN BỘ danh sách theo thứ tự trên màn hình (thêm/sửa/xoá trong 1 lần lưu). Tên 1–80 ký tự, không trùng;
 *  nội dung 1–200 ký tự; tối đa 50 mẫu. Danh sách rỗng → xoá hết, quay về 2 mẫu mặc định. */
function luuMauNoiDungThanhToan(ds) {
  yeuCauDangNhap_();
  yeuCauQuanTri_('lưu mẫu nội dung thanh toán');
  var kq = [], daCo = {};
  (ds || []).forEach(function (x) {
    var ten = String((x && x.tenMau) || '').replace(/\s+/g, ' ').trim(), nd = String((x && x.noiDung) || '').replace(/\s+/g, ' ').trim();
    if (!ten && !nd) return; // dòng trống trên màn hình
    if (!ten) throw new Error('Mẫu "' + nd.substring(0, 30) + '…" chưa có tên hiển thị.');
    if (!nd) throw new Error('Mẫu "' + ten + '" chưa có nội dung.');
    if (ten.length > 80) throw new Error('Tên mẫu "' + ten.substring(0, 30) + '…" dài quá 80 ký tự.');
    if (nd.length > 200) throw new Error('Nội dung mẫu "' + ten + '" dài quá 200 ký tự.');
    if (daCo[ten.toLowerCase()]) throw new Error('Trùng tên mẫu: "' + ten + '".');
    daCo[ten.toLowerCase()] = true;
    var ma = String((x && x.maMau) || '').trim() || ('M' + Utilities.getUuid().replace(/-/g, '').substring(0, 8));
    kq.push([ma, ten, nd, kq.length + 1]);
  });
  if (kq.length > 50) throw new Error('Tối đa 50 mẫu nội dung.');
  var sh = ensureSheet_(getSS_(), SHEET_MAU_NOI_DUNG, COT_MAU_NOI_DUNG_), cu = Math.max(0, sh.getLastRow() - 1), n = COT_MAU_NOI_DUNG_.length;
  var nguoi = ''; try { nguoi = emailNguoiDung_(); } catch (e) { nguoi = ''; }
  var moi = kq.map(function (r) { return r.concat([new Date(), nguoi]); });
  while (moi.length < cu) moi.push(COT_MAU_NOI_DUNG_.map(function () { return ''; })); // xoá dòng cũ thừa bằng cách ghi trống (không xoá dòng)
  if (moi.length) sh.getRange(2, 1, moi.length, n).setValues(moi);
  ghiNhatKy_('', 'LUU_MAU_NOI_DUNG', kq.length + ' mẫu nội dung thanh toán');
  return layMauNoiDungThanhToan();
}
