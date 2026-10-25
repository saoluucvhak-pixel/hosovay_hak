// CHỐNG GHI TRÙNG khi bấm/tải lặp: điều kiện ràng buộc, hóa đơn tải lại, bảng lương tải lại. Dữ liệu LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('chong_trung_tl'), { ctx, G, hopDong, themHoSo, dat } = Q;
const n = (s) => { const x = G.boDuLieu.getSheetByName(s); return x ? x.g.length - 1 : 0; };
const hd = hopDong({ soHopDong: 'HD-CT' }); themHoSo({ MaHoSo: 'HS1', MaHD: hd.maHD, SoTienNhanNoLanNay: 5 }); themHoSo({ MaHoSo: 'HS2', MaHD: hd.maHD, SoTienNhanNoLanNay: 5 });
const xml = (so, tien, mst, kh = 'C26TAA') => `<HDon><DLHDon><TTChung><KHHDon>${kh}</KHHDon><SHDon>${so}</SHDon><NLap>2026-09-15</NLap></TTChung><NDHDon><NBan><Ten>CÔNG TY NCC A</Ten><MST>${mst}</MST></NBan><NMua><Ten>CÔNG TY TNHH HIỆP VĨNH AN</Ten><MST>0400000000</MST></NMua><TToan><TgTTTBSo>${tien}</TgTTTBSo></TToan></NDHDon></DLHDon></HDon>`;
const enc = (s) => Buffer.from(s, 'utf8').toString('base64'), up = (ma, ten, x) => ctx.taiLenTaiLieuHoSo(ma, 'HoaDonGTGT', ten, 'text/xml', enc(x));
dat('T1. Điều kiện ràng buộc: lưu hai lần cùng chỉ tiêu (cùng hợp đồng, loại, toán tử; tên khác dấu/khoảng trắng) chỉ tạo MỘT dòng; khác toán tử hoặc đã ngừng áp dụng thì được tạo mới', () => {
  const loai = Object.keys(ctx.LOAI_RANG_BUOC_)[0], rb = { maHD: hd.maHD, tenChiTieu: 'Tỷ lệ vay/tài sản', loai, toanTu: '<=', nguong: 70 }, b = n('DieuKienRangBuoc');
  const a = ctx.luuDieuKienRangBuoc(rb); assert.throws(() => ctx.luuDieuKienRangBuoc(Object.assign({}, rb, { tenChiTieu: 'TY LE  VAY/TAI SAN' })), /đã có điều kiện/); assert.equal(n('DieuKienRangBuoc') - b, 1);
  ctx.luuDieuKienRangBuoc(Object.assign({}, rb, { toanTu: '>=' })); assert.equal(n('DieuKienRangBuoc') - b, 2);
  assert.equal(ctx.luuDieuKienRangBuoc(Object.assign({}, rb, { maRB: a.maRB, nguong: 65 })).daSua, true, 'sửa chính nó không bị coi là trùng');
});
dat('T2. Hóa đơn XML tải hai lần (cùng hồ sơ hoặc hồ sơ khác): chỉ MỘT dòng bảng kê, có cảnh báo, không đếm là “chưa đọc được”; hóa đơn khác số vẫn ghi', () => {
  const x = xml('0000101', '25000000.00', '0311111111'), b = n('BangKeHoaDon'); up('HS1', 'a.xml', x); const r2 = up('HS2', 'b.xml', x);
  assert.equal(n('BangKeHoaDon') - b, 1); assert.equal(r2.soDongDoc, 0); assert.ok(r2.canhBao.some(c => /đã có trong sổ/.test(c)), JSON.stringify(r2.canhBao));
  const r3 = up('HS1', 'c.xml', xml('0000102', '1000000.00', '0311111111')); assert.equal(n('BangKeHoaDon') - b, 2); assert.equal(r3.soDongDoc, 1);
});
dat('T3. Hóa đơn cùng số nhưng KHÁC ký hiệu hoặc khác MST người bán là hóa đơn khác → vẫn ghi', () => {
  const b = n('BangKeHoaDon'); up('HS1', 'd.xml', xml('0000200', '1000000.00', '0311111111', 'C26TAA')); up('HS1', 'e.xml', xml('0000200', '2000000.00', '0311111111', 'C26TBB')); up('HS1', 'f.xml', xml('0000200', '3000000.00', '0322222222', 'C26TAA'));
  assert.equal(n('BangKeHoaDon') - b, 3);
});
dat('T4. Bảng lương tải lại cùng hồ sơ: không ghi thêm dòng (cảnh báo rõ); hồ sơ khác vẫn ghi', () => {
  const cu = ctx.trichXuatBangLuongTuFile_;
  try {
    ctx.trichXuatBangLuongTuFile_ = () => { const a = [{ hoTen: 'Nguyễn Văn A', thang: '10/2026', soTien: 25569000, soTaiKhoan: '111', nganHang: 'BIDV' }, { hoTen: 'Trần Thị B', thang: '10/2026', soTien: 1000000, soTaiKhoan: '222', nganHang: 'BIDV' }]; a.canhBao = []; a.boPhan = []; return a; };
    const b = n('BangKeBangLuong'), g = (ma) => ctx.taiLenTaiLieuHoSo(ma, 'BangLuong', 'l.xlsx', 'application/vnd.ms-excel', enc('x'));
    g('HS1'); assert.equal(n('BangKeBangLuong') - b, 2); const r = g('HS1'); assert.equal(n('BangKeBangLuong') - b, 2); assert.ok(r.canhBao.some(c => /đã có trong hồ sơ/.test(c)));
    g('HS2'); assert.equal(n('BangKeBangLuong') - b, 4);
  } finally { ctx.trichXuatBangLuongTuFile_ = cu; }
});
dat('T5. Bảng lương: hai người CÙNG họ tên + tháng + số tiền nhưng KHÁC tài khoản/ngân hàng là hai khoản chi → giữ cả hai; tải lại đúng bảng đó vẫn không ghi thêm', () => {
  const cu = ctx.trichXuatBangLuongTuFile_;
  try {
    const b = n('BangKeBangLuong'), dong = (tk, nh) => ({ hoTen: 'Nguyễn Văn A', thang: '10/2026', soTien: 1000000, soTaiKhoan: tk, nganHang: nh });
    const dat1 = (ds) => { ctx.trichXuatBangLuongTuFile_ = () => { const a = ds.slice(); a.canhBao = []; a.boPhan = []; return a; }; return ctx.taiLenTaiLieuHoSo('HS2', 'BangLuong', 'l.xlsx', 'application/vnd.ms-excel', enc('x')); };
    dat1([dong('111', 'BIDV')]); assert.equal(n('BangKeBangLuong') - b, 1);
    dat1([dong('222', 'BIDV')]); assert.equal(n('BangKeBangLuong') - b, 2, 'khác tài khoản → giữ');
    dat1([dong('111', 'Vietcombank')]); assert.equal(n('BangKeBangLuong') - b, 3, 'khác ngân hàng → giữ');
    const r = dat1([dong('111', 'BIDV'), dong('222', 'BIDV')]); assert.equal(n('BangKeBangLuong') - b, 3, 'tải lại đúng hai dòng đã có → không thêm'); assert.ok(r.canhBao.some(c => /đã có trong hồ sơ/.test(c)));
  } finally { ctx.trichXuatBangLuongTuFile_ = cu; }
});
dat('T6. Chống trùng đồng thời: bước ĐỌC sổ hóa đơn/bảng lương để kiểm trùng diễn ra TRONG vùng khóa ghi (cùng vùng khóa với bước ghi)', () => {
  const doc = [], goc1 = ctx.soHoaDonDaCo_, goc2 = ctx.sheetToObjects_, cuL = ctx.trichXuatBangLuongTuFile_;
  try {
    ctx.soHoaDonDaCo_ = function () { doc.push(['hoadon', ctx._khoaDangGiu_]); return goc1.apply(this, arguments); };
    ctx.sheetToObjects_ = function (ten) { if (ten === 'BangKeBangLuong') doc.push(['luong', ctx._khoaDangGiu_]); return goc2.apply(this, arguments); };
    up('HS1', 'k.xml', xml('0000999', '5000000.00', '0311111111'));
    ctx.trichXuatBangLuongTuFile_ = () => { const a = [{ hoTen: 'Lê C', thang: '10/2026', soTien: 7, soTaiKhoan: '9', nganHang: 'X' }]; a.canhBao = []; a.boPhan = []; return a; };
    ctx.taiLenTaiLieuHoSo('HS1', 'BangLuong', 'k.xlsx', 'application/vnd.ms-excel', enc('x'));
  } finally { ctx.soHoaDonDaCo_ = goc1; ctx.sheetToObjects_ = goc2; ctx.trichXuatBangLuongTuFile_ = cuL; }
  assert.ok(doc.some(d => d[0] === 'hoadon') && doc.some(d => d[0] === 'luong'), JSON.stringify(doc));
  doc.forEach(d => assert.ok(d[1] > 0, 'đọc kiểm trùng ' + d[0] + ' ngoài vùng khóa'));
});
dat('T7. Lương: trùng trong lô, tổng bộ phận khi tải lại/nhập một phần, lỗi đọc phải dừng ghi', () => {
  themHoSo({ MaHoSo: 'HS3', MaHD: hd.maHD, SoTienNhanNoLanNay: 5 });
  const cu = ctx.trichXuatBangLuongTuFile_, doc = ctx.sheetToObjects_;
  const dong = (tk) => ({ hoTen: 'Nguyễn A', thang: '10/2026', soTien: 1000000, soTaiKhoan: tk, nganHang: 'BIDV' });
  const upload = (rows) => {
    ctx.trichXuatBangLuongTuFile_ = () => {const a = rows.slice(); a.canhBao=[]; a.boPhan=[{thang:'10/2026',boPhan:'A',soNguoi:rows.length,thucLinh:rows.length*1000000,bhxh:0,bhyt:0,bhtn:0,kpcd:0}];return a;};
    return ctx.taiLenTaiLieuHoSo('HS3','BangLuong','l.xlsx','application/vnd.ms-excel',enc('x'));
  };
  try {
    const b=n('BangKeBangLuong'), bp=n('TongHopLuongBoPhan');
    upload([dong('301')]); upload([dong('301')]);
    assert.equal(n('BangKeBangLuong')-b,1);assert.equal(n('TongHopLuongBoPhan')-bp,1);
    const partial=upload([dong('301'),dong('302'),dong('302')]);
    assert.equal(n('BangKeBangLuong')-b,2);assert.equal(n('TongHopLuongBoPhan')-bp,1);
    assert.ok(partial.canhBao.some(x=>/lặp trong file/.test(x)));
    assert.ok(partial.canhBao.some(x=>/chưa lưu tổng bộ phận/.test(x)));
    const groups=ctx.layTongHopBangLuong('HS3');
    assert.equal(groups.find(x=>x.maTaiLieu===partial.maTaiLieu).khopBoPhan,false);
    assert.equal(groups.find(x=>x.boPhan.length).khopBoPhan,true);
    let injected=false;
    ctx.sheetToObjects_=function(name){if(name==='BangKeBangLuong'&&!injected){injected=true;throw new Error('Sheets unavailable');}return doc.apply(this,arguments);};
    assert.throws(()=>upload([dong('301')]),/Không đọc được sổ lương/);
    assert.equal(injected,true);assert.equal(n('BangKeBangLuong')-b,2);assert.equal(n('TongHopLuongBoPhan')-bp,1);
    ctx.sheetToObjects_=doc;
    // Dữ liệu cũ có tổng bộ phận nhưng không có chi tiết phải bị đánh dấu lệch.
    const sh=G.boDuLieu.getSheetByName('TongHopLuongBoPhan');
    ctx.themDongVaoCuoiThat_(sh,['LEGACY','HS3','10/2026','A',1,1000000,0,0,0,0,new Date()]);
    assert.equal(ctx.layTongHopBangLuong('HS3').find(x=>x.maTaiLieu==='LEGACY').khopBoPhan,false);
  } finally {ctx.trichXuatBangLuongTuFile_=cu;ctx.sheetToObjects_=doc;}
});
dat('T7. Ghi lương: lỗi khi ghi TỔNG BỘ PHẬN sau khi đã ghi chi tiết → HOÀN TÁC chi tiết (có xác minh), báo lỗi rõ; thử lại ghi đủ MỘT lần; không hoàn tác được → CHUA_XAC_DINH, không nói đã xong', () => {
  const cu = ctx.trichXuatBangLuongTuFile_, gocThem = ctx.themDongVaoCuoiThat_, gocXoa = ctx.xoaDongAnToan_;
  const nguon = () => { const a = [{ hoTen: 'Phạm D', thang: '10/2026', soTien: 1000000, soTaiKhoan: '777', nganHang: 'BIDV' }, { hoTen: 'Hồ E', thang: '10/2026', soTien: 2000000, soTaiKhoan: '888', nganHang: 'BIDV' }]; a.canhBao = []; a.boPhan = [{ thang: '10/2026', boPhan: 'Kho', soNguoi: 2, thucLinh: 3000000, bhxh: 0, bhyt: 0, bhtn: 0, kpcd: 0 }]; return a; };
  const nBP = () => { const x = G.boDuLieu.getSheetByName('TongHopLuongBoPhan'); return x ? x.g.length - 1 : 0; }, tai = () => ctx.taiLenTaiLieuHoSo('HS2', 'BangLuong', 'bp.xlsx', 'application/vnd.ms-excel', enc('x'));
  try {
    ctx.trichXuatBangLuongTuFile_ = nguon; const b = n('BangKeBangLuong'), bp0 = nBP();
    ctx.themDongVaoCuoiThat_ = function (sh) { if (sh.getName() === 'TongHopLuongBoPhan') throw new Error('Lỗi ghi tổng giả lập'); return gocThem.apply(this, arguments); };
    assert.throws(tai, /hoàn tác|Lỗi ghi tổng/); assert.equal(n('BangKeBangLuong') - b, 0, 'chi tiết phải được hoàn tác'); assert.equal(nBP() - bp0, 0);
    ctx.themDongVaoCuoiThat_ = gocThem; const r = tai(); assert.equal(r.soDongDoc, 2); assert.equal(n('BangKeBangLuong') - b, 2); assert.equal(nBP() - bp0, 1, 'thử lại: chi tiết + tổng đúng một lần');
    const r2 = tai(); assert.equal(n('BangKeBangLuong') - b, 2, 'tải lại lần nữa không thêm'); assert.equal(nBP() - bp0, 1);
    // không hoàn tác được
    ctx.trichXuatBangLuongTuFile_ = () => { const a = nguon(); a.forEach((d, i) => { d.hoTen += ' Z'; }); return a; };
    ctx.themDongVaoCuoiThat_ = function (sh) { if (sh.getName() === 'TongHopLuongBoPhan') throw new Error('Lỗi ghi tổng giả lập 2'); return gocThem.apply(this, arguments); };
    ctx.xoaDongAnToan_ = function () { throw new Error('Không xoá được'); };
    assert.throws(tai, /CHUA_XAC_DINH/);
  } finally { ctx.trichXuatBangLuongTuFile_ = cu; ctx.themDongVaoCuoiThat_ = gocThem; ctx.xoaDongAnToan_ = gocXoa; }
});
Q.ket('chống ghi trùng khi bấm/tải lặp');
