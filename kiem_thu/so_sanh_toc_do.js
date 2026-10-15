/* ĐO TRƯỚC/SAU: cùng một kịch bản người dùng chạy trên MÃ NGUỒN CŨ (thư mục repo cũ) và MỚI, cùng dữ liệu, ghi JSON.
 * node kiem_thu/so_sanh_toc_do.js <thư_mục_repo_chứa_*.gs> <file_json_ra> [N1,N2,...]
 * Đo: số lần đọc range, số ô đọc, kích thước phản hồi gửi về trình duyệt (KB) và thời gian CPU Node (trung vị 5 lần).
 * Môi trường GIẢ LẬP: "ms" KHÔNG phải độ trễ Google thật. Số ô/lần đọc/KB là khối lượng thật phải qua Sheets và mạng. */
const fs = require('fs'), path = require('path');
if (process.argv[2] === 'bao-cao') { // node so_sanh_toc_do.js bao-cao <truoc.json> <sau.json> <ra.md>
  const T = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).ket, S = JSON.parse(fs.readFileSync(process.argv[4], 'utf8')).ket, key = (r) => r.N + '|' + r.buoc;
  const M = {}; S.forEach(r => { M[key(r)] = r; });
  const pct = (a, b) => a === 0 ? (b === 0 ? '—' : '+∞') : (b === a ? '0%' : (b < a ? '−' : '+') + Math.abs(Math.round((b - a) / a * 100)) + '%');
  const f = (n) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  let md = '# BÁO CÁO ĐỐI CHIẾU TỐC ĐỘ TRƯỚC / SAU NÂNG CẤP (PHÂN TRANG MÁY CHỦ + CHỈ MỤC CACHE + ĐỌC CÓ CHỌN LỌC)\n\n';
  md += '> **Môi trường: dịch vụ Apps Script/Sheets GIẢ LẬP (Node).** Cột **ms = thời gian CPU của Node** (trung vị 5 lần), KHÔNG phải độ trễ Google thật. Các cột **lần đọc / ô đọc / KB gửi trình duyệt** là khối lượng thật phải đi qua Google Sheets và mạng — đây mới là chỉ số đáng tin để so sánh trước/sau. **Chưa đo trên Google Apps Script thật nên chưa thể kết luận các chỉ tiêu 2 giây / 3 giây đã đạt hay chưa.** "Trước" = mã `main` ngay trước nâng cấp; "Sau" = mã mới; cùng dữ liệu, cùng kịch bản.\n\n';
  md += '"Cache nóng" = chỉ mục cache còn hiệu lực; "cache lạnh" = ngay sau khi dữ liệu vừa đổi (revision mới → phải đọc lại Sheets một lần) hoặc cache bị mất.\n\n';
  [...new Set(T.map(r => r.N))].forEach(N => {
    md += `## ${N.toLocaleString('vi-VN')} hồ sơ (${(N * 2).toLocaleString('vi-VN')} dòng chi tiết)\n\n| Thao tác | Lần đọc trước→sau | Ô đọc trước→sau | KB về trình duyệt trước→sau | CPU ms trước→sau | Δ ô đọc | Δ KB | Δ ms |\n|---|---:|---:|---:|---:|---:|---:|---:|\n`;
    T.filter(r => r.N === N).forEach(a => { const b = M[key(a)]; if (!b) return; md += `| ${a.buoc} | ${a.docRange} → ${b.docRange} | ${f(a.oDoc)} → ${f(b.oDoc)} | ${f(a.kb)} → ${f(b.kb)} | ${f(a.ms)} → ${f(b.ms)} | ${pct(a.oDoc, b.oDoc)} | ${pct(a.kb, b.kb)} | ${pct(a.ms, b.ms)} |\n`; });
    md += '\n';
  });
  md += '## Đọc kết quả (trung thực)\n- **Mở WebApp, làm mới danh sách:** trình duyệt không còn tải cả danh sách hồ sơ (10.000 hồ sơ ≈ 10,7 MB JSON → ≈ 21 KB cho 50 dòng + tổng quan). Đây là cải thiện lớn nhất và không phụ thuộc môi trường giả lập.\n- **Cache nóng:** tìm kiếm, lọc, chuyển trang không đọc Sheets (0 ô). **Cache lạnh** (sau mỗi lần ghi): đọc Sheets MỘT lần để dựng chỉ mục — ngang chi phí cũ cho MỘT lần đọc danh sách, nhưng sau đó mọi trang/lọc/tìm kiếm tiếp theo đều dùng chỉ mục.\n- **Chuyển trang:** mã cũ cắt trang ở trình duyệt (không gọi máy chủ, nhưng phải tải trước toàn bộ). Mã mới gọi máy chủ mỗi lần chuyển trang (≈ 16 KB, cache nóng không đọc Sheets) — **chậm hơn về độ trễ mạng mỗi lần bấm**, đổi lại không phải tải trước toàn bộ.\n- **Mở chi tiết:** không đổi (đã tối ưu ở đợt trước).\n- **Lưu hồ sơ:** số ô đọc giảm mạnh nhờ bỏ đọc cả sheet để tìm khoá yêu cầu và sao lưu chi tiết cũ; sheet báo cáo nháp BaoCaoTienVay_Draft chỉ dựng lại sau mỗi lần lưu khi dữ liệu ≤ 1.000 dòng chi tiết. Xem các dòng "6. Lưu".\n- Chỉ mục cache có TTL 5 phút: dữ liệu sửa TRỰC TIẾP trên Google Sheets (ngoài WebApp) có thể hiển thị chậm tới 5 phút hoặc khi bấm làm mới.\n';
  fs.writeFileSync(process.argv[5], md); console.log('đã ghi ' + process.argv[5]); process.exit(0);
}
const REPO = path.resolve(process.argv[2] || path.join(__dirname, '..')), RA = process.argv[3] || '/tmp/so_sanh.json', CO = (process.argv[4] || '100,1000,5000,10000').split(',').map(Number);
const TI = require(path.join(__dirname, 'gia_lap_apps_script'));
const _l = console.log; console.warn = () => {}; console.error = () => {}; console.log = () => {};
const ket = [];

function chay(N) {
  const { ctx, mt } = TI(REPO, '/tmp/ss_tam_' + path.basename(REPO) + '_' + N); const G = mt.__;
  ctx.initializeSpreadsheet();
  const cty = ctx.luuCongTy({ tenCty: 'CÔNG TY SO SÁNH', maSoThue: '0400000009', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' });
  const hds = [1, 2, 3, 4].map(i => ctx.luuHopDong({ maCty: cty.maCty, soHopDong: 'HD-SS-' + i, ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 9e12 }));
  const sh = G.boDuLieu.getSheetByName('HoSoGiaiNgan'), ct = G.boDuLieu.getSheetByName('ChiTietThuHuong'), hh = sh.g[0], hc = ct.g[0];
  const TT = ['Nháp', 'Đã tạo hồ sơ', 'Đã giải ngân', 'Đã hủy'];
  for (let i = 1; i <= N; i++) {
    const ma = 'HS' + String(100000 + i), r = hh.map(() => ''), set = (k, v) => { const c = hh.indexOf(k); if (c >= 0) r[c] = v; };
    set('MaHoSo', ma); set('MaHD', hds[i % 4].maHD); set('LoaiTien', i % 5 === 0 ? 'USD' : 'VND'); set('SoTienNhanNoLanNay', 3000000); set('DuNoHienTai', 1000000); set('TrangThai', TT[i % 4]);
    set('NgayGiaiNgan', new Date(2026, i % 12, 1 + (i % 28))); set('NgayDenHan', new Date(2027, i % 12, 5)); set('NgayTao', new Date(2026, i % 12, 1)); set('Revision', 1); set('SoGiayNhanNo', 'GNN-' + i); set('CapNhatLuc', new Date(2026, 5, 1, 8, i % 60));
    sh.g.push(r);
    for (let k = 1; k <= 2; k++) { const c = hc.map(() => ''), sc = (kk, v) => { const x = hc.indexOf(kk); if (x >= 0) c[x] = v; }; sc('MaHoSo', ma); sc('STT', k); sc('TenNguoiHuong', 'NCC ' + (i % 50)); sc('SoTaiKhoan', '1234' + i); sc('SoTien', k === 1 ? 1000000 : 2000000); sc('SoTienQuyDoi', k === 1 ? 1000000 : 2000000); sc('LoaiTien', 'VND'); ct.g.push(c); }
  }
  ctx.tangRevision_('HOSO'); mt.__email = 'ketoan@example.com';
  const co = typeof ctx.layTrangHoSo === 'function';
  const goi = (ten, args) => ctx.api('', ten, args);
  const kich = (v) => Math.round(JSON.stringify(v === undefined ? null : v).length / 102.4) / 10; // KB
  const buoc = (ten, fn) => { // fn trả mảng [{ham,args}] hoặc thực thi trực tiếp; đo 5 lần, lấy trung vị
    const mau = [];
    for (let k = 0; k < 5; k++) {
      if (ten.indexOf('lạnh') >= 0) Object.keys(G.cache).forEach(x => delete G.cache[x]);
      mt.__soLanDocRange = 0; mt.__soODoc = 0; const t0 = process.hrtime.bigint(); let kb = 0, loi = '';
      try { kb = fn(); } catch (e) { loi = String(e.message).slice(0, 60); }
      mau.push({ ms: Number(process.hrtime.bigint() - t0) / 1e6, docRange: mt.__soLanDocRange, oDoc: mt.__soODoc, kb, loi });
    }
    mau.sort((a, b) => a.ms - b.ms); const m = mau[2];
    ket.push({ N, buoc: ten, ms: Math.round(m.ms * 10) / 10, docRange: m.docRange, oDoc: m.oDoc, kb: m.kb, loi: m.loi });
  };
  const luuMoi = (so) => goi('luuHoSoGiaiNgan', [{ maHoSo: '', maHD: hds[0].maHD, loaiTien: 'VND', duNoHienTai: 1, soTienNhanNoLanNay: 3000000, soGiayNhanNo: 'GNN-SS-' + so, ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: [{ tenNguoiHuong: 'A', soTaiKhoan: '1', taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt', soTien: 1000000, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' }, { tenNguoiHuong: 'B', soTaiKhoan: '2', taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt', soTien: 2000000, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' }] }]);

  // S1 — Mở WebApp: tải dữ liệu khởi tạo + danh sách (50 dòng đầu) + tổng quan
  buoc('1. Mở WebApp và hiện danh sách hồ sơ (lần đầu/cache lạnh)', () => {
    if (co) return kich(goi('layDuLieuKhoiTao', [{ mien: ['CONGTY', 'HOPDONG', 'KHACHHANG'] }])) + kich(goi('layTongQuanHoSo', [{}])) + kich(goi('layTrangHoSo', [{ page: 1, pageSize: 50 }]));
    return kich(goi('layDuLieuKhoiTao', [{}])) + kich(goi('locDanhSachHoSo', [{}]));
  });
  buoc('1b. Mở WebApp và hiện danh sách hồ sơ (cache nóng)', () => {
    if (co) return kich(goi('layDuLieuKhoiTao', [{ mien: ['CONGTY', 'HOPDONG', 'KHACHHANG'] }])) + kich(goi('layTongQuanHoSo', [{}])) + kich(goi('layTrangHoSo', [{ page: 1, pageSize: 50 }]));
    return kich(goi('layDuLieuKhoiTao', [{}])) + kich(goi('locDanhSachHoSo', [{}]));
  });
  const hai = (ten, fn) => { buoc(ten + ' — cache nóng', fn); buoc(ten + ' — cache lạnh (ngay sau khi dữ liệu vừa đổi)', fn); };
  hai('2. Tìm kiếm một hồ sơ theo mã', () => co ? kich(goi('layTrangHoSo', [{ search: 'HS' + (100000 + Math.ceil(N / 2)), page: 1, pageSize: 50 }])) : kich(goi('locDanhSachHoSo', [{ maHoSo: 'HS' + (100000 + Math.ceil(N / 2)) }])));
  hai('3. Lọc: USD + khoảng ngày giải ngân (trang 1)', () => co ? kich(goi('layTrangHoSo', [{ filters: { loaiTien: 'USD', tuNgay: '2026-03-01', denNgay: '2026-06-30' }, page: 1, pageSize: 50 }])) : kich(goi('locDanhSachHoSo', [{ loaiTien: 'USD', tuNgay: '2026-03-01', denNgay: '2026-06-30' }])));
  hai('4. Chuyển sang trang 2', () => co ? kich(goi('layTrangHoSo', [{ page: 2, pageSize: 50 }])) : 0 /* cũ: cắt trang ở trình duyệt, không gọi máy chủ */);
  buoc('5. Mở chi tiết một hồ sơ', () => kich(goi('layDuLieuDayDu', ['HS' + (100000 + Math.ceil(N / 2))])));
  let k = 0;
  buoc('6. Lưu một hồ sơ mới (2 dòng thụ hưởng)', () => kich(luuMoi(++k)));
  hai('7. Làm mới danh sách sau khi lưu', () => {
    if (co) return kich(goi('layTongQuanHoSo', [{}])) + kich(goi('layTrangHoSo', [{ page: 1, pageSize: 50 }]));
    return kich(goi('layDuLieuKhoiTao', [{ mien: ['HOSO'], boQuaCache: true }])) + kich(goi('locDanhSachHoSo', [{}]));
  });
}
CO.forEach(chay);
fs.writeFileSync(RA, JSON.stringify({ repo: REPO, coPhanTrang: ket.length ? true : false, ket }, null, 1));
_l('xong ' + RA + ' (' + ket.length + ' phép đo)');
