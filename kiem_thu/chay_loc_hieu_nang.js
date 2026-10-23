const assert = require('assert/strict');
const Q = require('./_qlv_chung')('loc_hieu_nang'), c = Q.ctx;
const hd = Q.hopDong();
Q.themHoSo({ MaHoSo: 'PERF1', MaHD: hd.maHD });
Q.themHoSo({ MaHoSo: 'PERF2', MaHD: hd.maHD, LoaiTien: 'USD' });
const original = c.sheetToObjects_;
let detailReads = 0;
c.sheetToObjects_ = function (name) {
  if (name === c.SHEET_CHITIET) {
    detailReads++;
    return [{ MaHoSo: 'PERF1', TenNguoiHuong: 'Nguyễn Văn An' }, { MaHoSo: 'PERF1', TenNguoiHuong: 'Nguyễn Văn An' }, { MaHoSo: 'PERF2', TenNguoiHuong: 'Bình' }];
  }
  return original(name);
};
Q.dat('Danh sách thường và bộ lọc tiền không đọc bảng con', () => {
  assert.equal(c.locDanhSachHoSo({}).length, 2);
  assert.equal(c.locDanhSachHoSo({ loaiTien: 'USD' })[0].maHoSo, 'PERF2');
  assert.equal(detailReads, 0);
});
Q.dat('Lọc người hưởng hoa thường, không lặp hồ sơ và không khớp', () => {
  const rows = c.locDanhSachHoSo({ tenNguoiHuong: 'nguyễn văn an' });
  assert.equal(rows.length, 1); assert.equal(rows[0].maHoSo, 'PERF1');
  assert.equal(c.locDanhSachHoSo({ tenNguoiHuong: 'khong ton tai' }).length, 0);
  assert.equal(detailReads, 2);
});
Q.dat('Kết hợp bộ lọc người hưởng với tiền tệ', () => {
  assert.equal(c.locDanhSachHoSo({ tenNguoiHuong: 'nguyễn', loaiTien: 'USD' }).length, 0);
});
Q.ket('hiệu năng lọc hồ sơ');
