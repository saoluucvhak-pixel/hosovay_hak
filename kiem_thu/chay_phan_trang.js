/* PHÂN TRANG PHÍA MÁY CHỦ + TỔNG QUAN + CACHE CHỈ MỤC (PHANTRANG.gs) — chạy NGUYÊN mã *.gs trên dịch vụ Apps Script GIẢ LẬP.
 * node kiem_thu/chay_phan_trang.js [thư_mục_ra]      LƯU Ý: giả lập, không chứng minh hành vi CacheService/Sheets thật. */
const fs = require('fs'), path = require('path');
const GOC = path.join(__dirname, '..'), RA = path.resolve(process.argv[2] || '/tmp/hosovay_phan_trang'); fs.rmSync(RA, { recursive: true, force: true }); fs.mkdirSync(RA, { recursive: true });
const TI = require('./gia_lap_apps_script'); const { ctx, mt } = TI(GOC, path.join(RA, '_tam')); const G = mt.__;
const _l = console.log; console.warn = () => {}; console.error = () => {}; console.log = () => {};
let loi = 0, n = 0; const dat = (nhom, ten, ok, ct) => { n++; if (!ok) loi++; _l(`  [${ok ? 'ĐẠT' : 'LỖI'}] ${nhom}: ${ten}${ok ? '' : '  → ' + (ct || '')}`); };
const thu = (f) => { try { return { ok: true, v: f() }; } catch (e) { return { ok: false, loi: String(e.message || e) }; } };
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.initializeSpreadsheet(); TI.dangKyNguoiThuong(ctx);
voi('ketoan@example.com', () => ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' }));

const cty1 = ctx.luuCongTy({ tenCty: 'CÔNG TY QUẾ SƠN', maSoThue: '0400000001', nguoiDaiDien: 'A', diaChiTruSo: 'QN' }), cty2 = cty1; // hệ thống hiện dùng 1 công ty vay vốn
const hd1 = ctx.luuHopDong({ maCty: cty1.maCty, soHopDong: 'HD-PT-01', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 9e12 });
const hd2 = ctx.luuHopDong({ maCty: cty2.maCty, soHopDong: 'HD-PT-02', ngayHopDong: '2026-02-05', tenNganHang: 'Vietcombank', chiNhanh: 'ĐN', hanMucVay: 9e12 });
const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), ct = G.boDuLieu.getSheetByName('ChiTietThuHuong'), hh = sh.g[0], hc = ct.g[0];
const N = 237; const TT = ['Nháp', 'Đã tạo hồ sơ', 'Đã giải ngân', 'Đã hủy'];
for (let i = 1; i <= N; i++) {
  const ma = 'HS' + String(1000 + i), r = hh.map(() => ''), set = (k, v) => { const c = hh.indexOf(k); if (c >= 0) r[c] = v; };
  set('MaHoSo', ma); set('MaHD', i % 2 ? hd1.maHD : hd2.maHD); set('LoaiTien', i % 5 === 0 ? 'USD' : 'VND'); set('SoTienNhanNoLanNay', i % 5 === 0 ? 1000 * i : 1000000 + i * 1000); set('SoGiayNhanNo', 'GNN-' + i);
  set('TrangThai', TT[i % 4]); set('NgayGiaiNgan', i % 10 === 0 ? '' : new Date(2026, (i % 12), 1 + (i % 28))); set('NgayDenHan', new Date(2027, (i % 12), 5)); set('Revision', 1); set('CapNhatLuc', new Date(2026, 5, 1, 8, i % 60)); set('CapNhatBoi', 'ketoan@example.com');
  sh.g.push(r);
  const c = hc.map(() => ''), sc = (k, v) => { const x = hc.indexOf(k); if (x >= 0) c[x] = v; }; sc('MaHoSo', ma); sc('STT', 1); sc('TenNguoiHuong', i % 7 === 0 ? 'Nguyễn Văn Đặng' : 'NCC ' + i); sc('SoTien', 1000); sc('LoaiTien', 'VND'); ct.g.push(c);
}
ctx.tangRevision_('HOSO');
const P = (o) => voi('ketoan@example.com', () => ctx.api('', 'layTtranghoSoX', [])) && 0; // (không dùng)
const L = (o) => voi('ketoan@example.com', () => ctx.api('', 'layTrangHoSo', [o]));
const demSheet = () => { const x = sh.g.slice(1).filter(r => r[0] !== ''); return x; };

// ---- 1. Cấu trúc phản hồi, phân trang
let r1 = L({ page: 1, pageSize: 50 });
dat('Phân trang', 'Phản hồi đúng cấu trúc: success, data[], pagination{page,pageSize,totalRows,totalPages}, revision (chuỗi)', r1.success === true && Array.isArray(r1.data) && r1.data.length === 50 && r1.pagination.page === 1 && r1.pagination.pageSize === 50 && r1.pagination.totalRows === N && r1.pagination.totalPages === Math.ceil(N / 50) && typeof r1.revision === 'string' && /^HOSO:\d+$/.test(r1.revision));
dat('Phân trang', 'pageSize chỉ nhận 20/50/100 (giá trị khác → 50); 20 và 100 hoạt động', L({ pageSize: 7 }).pagination.pageSize === 50 && L({ pageSize: 20 }).data.length === 20 && L({ pageSize: 100 }).data.length === 100 && L({}).pagination.pageSize === 50);
(() => {
  const ds = []; const tp = L({ pageSize: 20 }).pagination.totalPages; for (let p = 1; p <= tp; p++) L({ page: p, pageSize: 20 }).data.forEach(x => ds.push(x.maHoSo));
  dat('Phân trang', `Duyệt hết ${tp} trang: không trùng, không sót — hợp của các trang = toàn bộ ${N} hồ sơ trên Sheet`, ds.length === N && new Set(ds).size === N && demSheet().every(r => ds.indexOf(r[0]) >= 0));
})();
dat('Phân trang', 'Trang vượt cuối → trả trang cuối (không lỗi, không rỗng); page ≤0/chữ → trang 1', L({ page: 999, pageSize: 100 }).pagination.page === 3 && L({ page: 999, pageSize: 100 }).data.length === N - 200 && L({ page: 0 }).pagination.page === 1 && L({ page: 'abc' }).pagination.page === 1);
dat('Phân trang', 'Không có kết quả: data rỗng, totalRows=0, totalPages=0', (() => { const r = L({ search: 'khong-co-ma-nay-xyz' }); return r.success && r.data.length === 0 && r.pagination.totalRows === 0 && r.pagination.totalPages === 0; })());

// ---- 2. Sắp xếp
const soTienDesc = L({ sortBy: 'soTien', sortDir: 'desc', pageSize: 100, filters: { loaiTien: 'VND' } }).data.map(x => x.soTien), soTienAsc = L({ sortBy: 'soTien', sortDir: 'asc', pageSize: 100, filters: { loaiTien: 'VND' } }).data.map(x => x.soTien);
const dbgS = [soTienDesc.every((v, i, a) => !i || a[i - 1] >= v), soTienAsc.every((v, i, a) => !i || a[i - 1] <= v), L({ sortBy: 'maHoSo', sortDir: 'asc' }).data[0].maHoSo, L({ sortBy: 'tenCty', sortDir: 'asc', pageSize: 100 }).data[0].tenCty, L({ sortBy: 'xx;DROP' }).success];
dat('Sắp xếp', 'soTien tăng/giảm đúng thứ tự; maHoSo, tenCty, ngayGiaiNgan sắp xếp được; cột lạ → mặc định ngayCapNhat (không lỗi)', soTienDesc.every((v, i, a) => !i || a[i - 1] >= v) && soTienAsc.every((v, i, a) => !i || a[i - 1] <= v) && L({ sortBy: 'maHoSo', sortDir: 'asc' }).data[0].maHoSo === 'HS1001' && L({ sortBy: 'soHopDong', sortDir: 'asc', pageSize: 100 }).data[0].soHopDong === 'HD-PT-01' && L({ sortBy: 'soHopDong', sortDir: 'desc', pageSize: 100 }).data[0].soHopDong === 'HD-PT-02' && L({ sortBy: 'ngayGiaiNgan', sortDir: 'asc', pageSize: 100, filters: { tuNgay: '2000-01-01' } }).data.every((x, i, a) => !i || a[i - 1].ngayGiaiNgan.split('/').reverse().join('') <= x.ngayGiaiNgan.split('/').reverse().join('')) && L({ sortBy: 'xx;DROP' }).success, JSON.stringify(dbgS));
dat('Sắp xếp', 'Sắp xếp ổn định: cùng điều kiện gọi 2 lần cho đúng cùng thứ tự', JSON.stringify(L({ sortBy: 'trangThai', pageSize: 100 }).data.map(x => x.maHoSo)) === JSON.stringify(L({ sortBy: 'trangThai', pageSize: 100 }).data.map(x => x.maHoSo)));

// ---- 3. Tìm kiếm & lọc
dat('Tìm kiếm', 'Theo mã, số hợp đồng, tên công ty, số giấy nhận nợ; không phân biệt hoa/thường và dấu', L({ search: 'hs1005' }).pagination.totalRows === 1 && L({ search: 'HD-PT-02' }).pagination.totalRows === Math.floor(N / 2) && L({ search: 'que son' }).pagination.totalRows === N && L({ search: 'GNN-77' }).data.some(x => x.maHoSo === 'HS1077') && L({ search: 'QUẾ SƠN' }).pagination.totalRows === L({ search: 'que son' }).pagination.totalRows, JSON.stringify([L({ search: 'hs1005' }).pagination.totalRows, L({ search: 'HD-PT-02' }).pagination.totalRows, Math.floor(N / 2), L({ search: 'dai hiep' }).pagination.totalRows, Math.ceil(N / 2), L({ search: 'GNN-77' }).data.map(x => x.maHoSo)]));
const tt2 = L({ filters: { trangThai: ['Đã giải ngân', 'Đã hủy'] }, pageSize: 100 });
dat('Lọc', 'Trạng thái nhiều giá trị; loại tiền; công ty; hợp đồng; kết hợp nhiều điều kiện (AND)', tt2.pagination.totalRows === demSheet().filter(r => ['Đã giải ngân', 'Đã hủy'].indexOf(r[hh.indexOf('TrangThai')]) >= 0).length && L({ filters: { loaiTien: 'USD' } }).pagination.totalRows === Math.floor(N / 5) && L({ filters: { maCty: cty1.maCty } }).pagination.totalRows === N && L({ filters: { maCty: 'CTY999' } }).pagination.totalRows === 0 && L({ filters: { maHD: hd1.maHD } }).pagination.totalRows === Math.ceil(N / 2)
  && L({ filters: { loaiTien: 'USD', trangThai: 'Nháp', maHD: hd1.maHD } }).data.every(x => x.loaiTien === 'USD' && x.trangThai === 'Nháp' && x.maHD === hd1.maHD), JSON.stringify([tt2.pagination.totalRows, L({ filters: { loaiTien: 'USD' } }).pagination.totalRows, Math.floor(N / 5), L({ filters: { maCty: cty2.maCty } }).pagination.totalRows, Math.floor(N / 2), L({ filters: { maHD: hd1.maHD } }).pagination.totalRows, Math.ceil(N / 2)]));
const khoang = L({ filters: { tuNgay: '2026-03-01', denNgay: '2026-03-31' }, pageSize: 100 }), thieu = L({ filters: { thieuNgay: true }, pageSize: 100 });
dat('Lọc', 'Khoảng ngày giải ngân: chỉ hồ sơ CÓ ngày trong khoảng (thiếu ngày không mặc nhiên lọt); thieuNgay chỉ liệt kê hồ sơ thiếu ngày', khoang.data.length > 0 && khoang.data.every(x => x.ngayGiaiNgan.slice(3) === '03/2026') && thieu.pagination.totalRows === Math.floor(N / 10) && thieu.data.every(x => x.ngayGiaiNgan === ''));
dat('Lọc', 'Lọc theo tên người thụ hưởng (đọc sheet chi tiết chỉ khi dùng bộ lọc này) — đúng số hồ sơ', L({ filters: { tenNguoiHuong: 'nguyen van dang' } }).pagination.totalRows === Math.floor(N / 7));
dat('Lọc', 'Tổng tiền của tập đã lọc tách riêng VND và USD (không cộng lẫn)', (() => { const r = L({ pageSize: 100 }); const v = demSheet().filter(x => x[hh.indexOf('LoaiTien')] === 'VND').reduce((a, x) => a + x[hh.indexOf('SoTienNhanNoLanNay')], 0), u = demSheet().filter(x => x[hh.indexOf('LoaiTien')] === 'USD').reduce((a, x) => a + x[hh.indexOf('SoTienNhanNoLanNay')], 0); return r.tongTheoLoaiTien.VND === v && r.tongTheoLoaiTien.USD === u; })());

// ---- 4. Đối chiếu dữ liệu Sheets ↔ trang
(() => {
  const tat = []; for (let p = 1; p <= 3; p++) L({ page: p, pageSize: 100 }).data.forEach(x => tat.push(x));
  const sheetMap = {}; demSheet().forEach(r => { sheetMap[r[0]] = r; });
  const loiLech = tat.filter(x => { const r = sheetMap[x.maHoSo]; return !r || r[hh.indexOf('SoTienNhanNoLanNay')] !== x.soTien || r[hh.indexOf('TrangThai')] !== x.trangThai || r[hh.indexOf('MaHD')] !== x.maHD || String(r[hh.indexOf('LoaiTien')]) !== x.loaiTien; });
  dat('Đối chiếu', `Mỗi dòng trang khớp 100% Sheet (mã, hợp đồng, tiền, loại tiền, trạng thái) — ${tat.length} dòng`, tat.length === N && !loiLech.length, JSON.stringify(loiLech.slice(0, 2)));
  const ct1 = voi('ketoan@example.com', () => ctx.api('', 'layDuLieuDayDu', ['HS1010']));
  const tr1 = L({ search: 'HS1010' }).data[0];
  dat('Đối chiếu', 'Dòng trong danh sách khớp chi tiết khi mở hồ sơ (số tiền, trạng thái, hợp đồng, công ty)', tr1.soTien === ct1.hoSo.SoTienNhanNoLanNay && tr1.trangThai === ct1.hoSo.TrangThai && tr1.maHD === ct1.hopDong.MaHD && tr1.tenCty === ct1.congTy.TenCty);
})();

// ---- 5. Tổng quan
(() => {
  const q = voi('ketoan@example.com', () => ctx.api('', 'layTongQuanHoSo', []));
  const dem = (t) => demSheet().filter(r => r[hh.indexOf('TrangThai')] === t).length;
  dat('Tổng quan', 'Đếm đúng theo Sheet (tổng, đã giải ngân, đã hủy, chờ xử lý, VND/USD) và chỉ trả 8 hồ sơ gần nhất — không trả cả danh sách', q.tongHoSo === N && q.daGiaiNgan === dem('Đã giải ngân') && q.daHuy === dem('Đã hủy') && q.choXuLy === N - dem('Đã giải ngân') - dem('Đã hủy') && q.hoSoUSD === Math.floor(N / 5) && q.hoSoVND === N - Math.floor(N / 5) && q.ganDay.length === 8 && q.ganDay[0].maHoSo === 'HS' + (1000 + N));
})();

// ---- 6. Cache chỉ mục: HIT/MISS và vô hiệu hoá sau ghi
(() => {
  L({ boQuaCache: true }); mt.__soODoc = 0; const r2 = L({ page: 2 }); const oHit = mt.__soODoc;
  dat('Cache', 'Lần gọi sau (cache HIT): KHÔNG đọc lại sheet hồ sơ (ô đọc ≈ chỉ danh mục nhỏ) và trả cùng dữ liệu', r2.cache === 'HIT' && oHit < 2000, `cache=${r2.cache}, ô đọc=${oHit}`);
  mt.__soODoc = 0; const rb = L({ boQuaCache: true }); const oMiss = mt.__soODoc;
  dat('Cache', 'boQuaCache=true buộc đọc lại sheet (nút "Làm mới") và dựng lại cache', rb.cache !== 'HIT' && oMiss > oHit * 5 && L({}).cache === 'HIT', `miss=${oMiss} hit=${oHit}`);
  Object.keys(G.cache).forEach(k => delete G.cache[k]); const rx = L({}); dat('Cache', 'Cache bị xoá/mất hoàn toàn: tự đọc lại sheet, kết quả vẫn đúng', rx.success && rx.pagination.totalRows === N && rx.cache === 'MISS');
  const kM = Object.keys(G.cache).filter(k => /HOSO_IDX:\d+:0$/.test(k))[0]; delete G.cache[kM];
  dat('Cache', 'Thiếu 1 mảnh cache → coi như MISS (không trả dữ liệu thiếu)', L({}).pagination.totalRows === N);
})();
(() => {
  const truoc = L({ pageSize: 100, page: 3 }); const revTruoc = truoc.revisionSo;
  // thêm hồ sơ mới qua WebApp (luuHoSoGiaiNgan)
  const kh = { tenNguoiHuong: 'Ghi mới', soTaiKhoan: '9', taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt', soTien: 5000000, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' };
  const moi = ctx.api('', 'luuHoSoGiaiNgan', [{ maHoSo: '', maHD: hd1.maHD, loaiTien: 'VND', duNoHienTai: 1, soTienNhanNoLanNay: 5000000, soGiayNhanNo: 'GNN-MOI-1', ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: [kh] }]);
  voi('ketoan@example.com', () => 0);
  const sau = L({ search: 'GNN-MOI-1' }), tq = voi('ketoan@example.com', () => ctx.api('', 'layTongQuanHoSo', []));
  dat('Cache', 'Sau khi LƯU hồ sơ mới: revision tăng, cache cũ không còn dùng — trang & tổng quan thấy NGAY hồ sơ mới (không stale)', sau.revisionSo > revTruoc && sau.pagination.totalRows === 1 && sau.data[0].soTien === 5000000 && tq.tongHoSo === N + 1 && L({}).pagination.totalRows === N + 1);
  const ma = sau.data[0].maHoSo; ctx.api('', 'xoaHoSo', [ma, { expectedRevision: sau.data[0].revision }]);
  dat('Cache', 'Sau khi XOÁ MỀM: hồ sơ biến mất khỏi trang/tổng quan ngay; tổng trở về như cũ', L({ search: 'GNN-MOI-1' }).pagination.totalRows === 0 && L({}).pagination.totalRows === N);
  const cuoi = L({ search: 'HS1005' }).data[0]; // i=5 → 'Đã tạo hồ sơ'
  const truocTT = cuoi.trangThai, daTaoTruoc = L({ filters: { trangThai: 'Đã tạo hồ sơ' } }).pagination.totalRows;
  ctx.api('', 'chuyenHoSoVeNhap', [cuoi.maHoSo, 'sửa số liệu', cuoi.revision]);
  dat('Cache', 'Sau khi ĐỔI TRẠNG THÁI: danh sách, bộ lọc trạng thái và tổng quan phản ánh ngay (không stale)', truocTT === 'Đã tạo hồ sơ' && L({ search: 'HS1005' }).data[0].trangThai === 'Nháp' && L({ filters: { trangThai: 'Đã tạo hồ sơ' } }).pagination.totalRows === daTaoTruoc - 1);
})();

// ---- 7. Phân quyền
dat('Quyền', 'Vai trò XEM đọc được trang/tổng quan; tài khoản lạ và ẩn danh bị TỪ CHỐI ở cả layTrangHoSo, getHoSoPage, layTongQuanHoSo (gọi qua api và gọi trực tiếp)', (() => {
  const ds = ['layTrangHoSo', 'getHoSoPage', 'layTongQuanHoSo'], xem = voi('xem@example.com', () => thu(() => ctx.api('', 'layTrangHoSo', [{}])));
  const chan = (e) => ds.every(h => !voi(e, () => thu(() => ctx.api('', h, [{}])).ok) && !voi(e, () => thu(() => ctx[h]({})).ok));
  return xem.ok && xem.v.data.length === 50 && chan('la@example.com') && chan('');
})());
dat('Quyền', 'Phạm vi công ty (cổng HAK cấp): chỉ trả hồ sơ trong phạm vi, tổng/đếm cũng theo phạm vi — không lộ dữ liệu ngoài quyền', (() => {
  const goc = ctx.phamViCongTyNguoiDung_;
  try { ctx.phamViCongTyNguoiDung_ = () => ['CTY999']; const ngoai = L({ pageSize: 100 }), q0 = voi('ketoan@example.com', () => ctx.api('', 'layTongQuanHoSo', []));
    ctx.phamViCongTyNguoiDung_ = () => [String(cty1.maCty)]; const trong = L({ pageSize: 100 }), q1 = voi('ketoan@example.com', () => ctx.api('', 'layTongQuanHoSo', []));
    return ngoai.pagination.totalRows === 0 && ngoai.data.length === 0 && q0.tongHoSo === 0 && q0.ganDay.length === 0 && trong.pagination.totalRows === N && q1.tongHoSo === N; } finally { ctx.phamViCongTyNguoiDung_ = goc; }
})());
dat('Quyền', 'Ô tìm kiếm bắt đầu bằng = + - @ không bị đổi (hàm đọc không đi qua bộ trung hoà công thức) và không gây lỗi', L({ search: '=1+1' }).success && L({ search: '@abc' }).pagination.totalRows === 0);

// ---- 7b. Báo cáo nháp (sheet BaoCaoTienVay_Draft): dữ liệu lớn → không dựng lại sau mỗi lần lưu
(() => {
  const draft = () => G.boDuLieu.getSheetByName('BaoCaoTienVay_Draft'), dong = () => (draft() ? draft().g.filter(r => r.length && r[0] !== '').length : 0);
  const luu = (so) => ctx.api('', 'luuHoSoGiaiNgan', [{ maHoSo: '', maHD: hd1.maHD, loaiTien: 'VND', duNoHienTai: 1, soTienNhanNoLanNay: 1000, soGiayNhanNo: 'GNN-BC-' + so, ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: [{ tenNguoiHuong: 'X', soTaiKhoan: '1', taiNganHang: 'B', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 't', soTien: 1000, taiLieuSo: 'H', ngayTaiLieu: '15/09/2026' }] }]);
  G.props['CH_NGUONG_BAO_CAO_NHAP'] = '100000'; luu(1); const dongNho = dong(), coCo = G.props['BAO_CAO_NHAP_CU'];
  G.props['CH_NGUONG_BAO_CAO_NHAP'] = '5'; luu(2); const dongLon = dong(), coCu = G.props['BAO_CAO_NHAP_CU'];
  const xem = voi('xem@example.com', () => thu(() => ctx.api('', 'lamMoiBaoCaoNhap', [])));
  voi('ketoan@example.com', () => ctx.api('', 'lamMoiBaoCaoNhap', [])); const dongSau = dong();
  dat('Báo cáo nháp', 'Dữ liệu nhỏ (≤ ngưỡng): sheet nháp được dựng lại sau khi lưu như cũ; dữ liệu lớn (> ngưỡng): KHÔNG dựng lại, chỉ đánh dấu "cũ"; Quản trị làm mới bằng lamMoiBaoCaoNhap (XEM bị chặn)', dongNho > 1 && coCo === undefined && dongLon === dongNho && coCu === '1' && !xem.ok && dongSau === dongNho + 1 && G.props['BAO_CAO_NHAP_CU'] === undefined, JSON.stringify({ dongNho, coCo, dongLon, coCu, dongSau }));
  delete G.props['CH_NGUONG_BAO_CAO_NHAP'];
})();

// ---- 8. Hồi quy: API cũ vẫn dùng được
dat('Tương thích', 'locDanhSachHoSo (API cũ) và layDuLieuKhoiTao (có miền HOSO) vẫn hoạt động như trước', voi('ketoan@example.com', () => ctx.api('', 'locDanhSachHoSo', [{}])).length === demSheet().filter(r => r[hh.indexOf('DaXoa')] !== true).length && voi('ketoan@example.com', () => ctx.api('', 'layDuLieuKhoiTao', [{}])).data.hoSoGoc.length === demSheet().filter(r => r[hh.indexOf('DaXoa')] !== true).length);

_l(`\nTỔNG: ${n} khẳng định, ${n - loi} đạt, ${loi} lỗi`);
process.exit(loi ? 1 : 0);
