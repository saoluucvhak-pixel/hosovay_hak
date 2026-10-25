// Sinh LUONG_DU_LIEU.md từ MÃ NGUỒN (SO_DO_DU_LIEU_, cột thật của Sheet, bảng quyền API, bảng chuyển trạng thái).
// node tools/sinh_luong_du_lieu.cjs        → ghi LUONG_DU_LIEU.md
// node tools/sinh_luong_du_lieu.cjs --kiem → chỉ so sánh; thoát 1 nếu tài liệu lệch mã nguồn.
// Chỉ chạy trên bộ giả lập trong bộ nhớ; không chạm Google thật, không chứa dữ liệu vận hành.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), file = path.join(root, 'LUONG_DU_LIEU.md');
const TI = require(path.join(root, 'kiem_thu/gia_lap_apps_script')), { ctx, mt } = TI(root, path.join(require('os').tmpdir(), 'hosovay_luong'));
ctx.initializeSpreadsheet(); const sheets = mt.__.boDuLieu;
const J = (x) => JSON.parse(JSON.stringify(x));
const sd = J(ctx.SO_DO_DU_LIEU_), quyen = J(ctx.bangQuyenApi_()), chuyen = J(ctx.CHUYEN_TRANG_THAI_);
const NHAN = { XEM: 'Xem', NHAP_LIEU: 'Nhập liệu', QUAN_TRI: 'Quản trị' };
const COT = { TraNoHoSo: 'COT_TRA_NO_', XacNhanGiaiNgan: 'COT_XAC_NHAN_GN_', PheDuyetGiaiNgan: 'COT_PHE_DUYET_', LichSuTrangThaiHoSo: 'COT_LICH_SU_TRANG_THAI_', ChotBaoCaoLai: 'COT_CHOT_LAI_', ChotBaoCaoLaiCT: 'COT_CHOT_LAI_CT_', TyGiaThuCong: 'COT_TY_GIA_THU_CONG_', SYS_NguoiDung: 'COT_NGUOI_DUNG_', DieuKienRangBuoc: 'COT_RANG_BUOC_' };
const cotCua = (b) => { const s = sheets.getSheetByName(b.sheet); if (s) return s.g[0].map(String); return COT[b.sheet] && ctx[COT[b.sheet]] ? J(ctx[COT[b.sheet]]).map(String) : []; };
const id = (s) => s.replace(/[^A-Za-z0-9_]/g, '_'), esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const tenHam = (g) => String(g).replace(/\s*\(.*$/, '').replace(/_$/, '').trim();
const L = [];
L.push('# Luồng dữ liệu HAK VAY', '', '> **Tài liệu SINH TỰ ĐỘNG từ mã nguồn** bằng `node tools/sinh_luong_du_lieu.cjs` — không sửa tay. Bộ kiểm thử `chay_quan_he_du_lieu` báo lỗi nếu tài liệu lệch mã.',
  '> Nguồn sự thật: `SO_DO_DU_LIEU_` (QUANHEDULIEU.gs), cột thật do `initializeSpreadsheet`, `bangQuyenApi_` (PHIEN.gs), `CHUYEN_TRANG_THAI_` (HOSODOMAIN.gs).',
  '> Phương pháp: skill `hak-data-integrity` + `hak-parent-child-data-model` (kho hak_ai_skills). Chưa kiểm chứng trên Google Sheets thật (chỉ bộ giả lập); không chứa dữ liệu vận hành.', '');
L.push('## 1. Sơ đồ quan hệ (ERD)', '', '```mermaid', 'erDiagram');
sd.forEach(b => b.fk.forEach(f => L.push('  ' + id(f.den) + ' ' + (f.choPhepRong ? '|o--o{' : '||--o{') + ' ' + id(b.sheet) + ' : "' + f.cot + '"')));
sd.forEach(b => { const c = cotCua(b); L.push('  ' + id(b.sheet) + ' {'); c.slice(0, 40).forEach(k => L.push('    string ' + id(k) + (b.pk.includes(k) ? ' PK' : (b.fk.some(f => f.cot === k) ? ' FK' : '')))); L.push('  }'); });
L.push('```', '', '`|o--o{` = khoá ngoại được phép để trống. Bảng không có khoá chính (nhật ký/dấu vết) chỉ thêm dòng.', '');
L.push('## 2. Luồng nghiệp vụ chính', '', '```mermaid', 'flowchart LR',
  '  DM[DM_CongTy → DM_HopDongVay] --> HS[HoSoGiaiNgan + ChiTietThuHuong]', '  HS --> PD[PheDuyetGiaiNgan]', '  PD --> XN[XacNhanGiaiNgan]', '  XN --> TN[TraNoHoSo]', '  HS --> TL[TaiLieuDinhKem → BangKeHoaDon / BangKeBangLuong]', '  HS --> LS[LichSuTrangThaiHoSo]',
  '  DM --> TS[TaiSanBaoDam]', '  TS --> BH[BaoHiemTaiSan]', '  BH --> BHCT[BaoHiemTaiSanChiTiet theo TheHe]', '  BH --> GD[GiaoDichBaoHiem]', '  TN --> BC[Báo cáo dư nợ / lãi]', '  BC --> CH[ChotBaoCaoLai + ChotBaoCaoLaiCT]', '```', '');
L.push('## 3. Vòng đời hồ sơ (trạng thái hợp lệ)', '', '```mermaid', 'stateDiagram-v2');
Object.keys(chuyen).forEach(tu => chuyen[tu].forEach(den => L.push('  ' + (tu ? '"' + tu + '"' : '[*]') + ' --> "' + den + '"')));
L.push('```', '', 'Chỉ hồ sơ **Đã giải ngân** tính vào dư nợ. Chuyển trạng thái ngoài bảng trên bị từ chối ở máy chủ.', '');
L.push('## 4. Từ điển dữ liệu', '');
sd.forEach(b => {
  L.push('### ' + b.sheet + ' — ' + b.nhom, '', '- Khoá chính: ' + (b.pk.length ? '`' + b.pk.join(', ') + '`' : '*(không có — chỉ thêm dòng)*'));
  L.push('- Khoá ngoại: ' + (b.fk.length ? b.fk.map(f => '`' + f.cot + '` → `' + f.den + '` (' + f.moTa + (f.choPhepRong ? '; được để trống' : '') + ')').join('; ') : '—'));
  L.push('- Ghi bởi: ' + b.ghi.map(g => '`' + g + '`').join(', ')); L.push('- Xoá: ' + b.xoa); L.push('- Chống trùng: ' + b.chongTrung); L.push('- Phiên bản/đồng thời: ' + b.phienBan);
  L.push('- Cột (' + cotCua(b).length + '): ' + (cotCua(b).map(c => '`' + c + '`').join(' ') || '—'), '');
});
L.push('## 5. Ma trận CRUD × quyền (API ghi theo bảng)', '', '| Bảng | Hàm ghi | Quyền tối thiểu |', '|---|---|---|');
sd.forEach(b => { const q = b.ghi.map(g => { const h = tenHam(g); return quyen[h] ? NHAN[quyen[h]] : '—'; }); const ok = q.filter(x => x !== '—'); const rank = ['Xem', 'Nhập liệu', 'Quản trị']; const cao = ok.length ? ok.reduce((a, x) => rank.indexOf(x) > rank.indexOf(a) ? x : a, ok[0]) : 'nội bộ (không có API trực tiếp)'; L.push('| ' + b.sheet + ' | ' + esc(b.ghi.map(tenHam).join(', ')) + ' | ' + cao + ' (mức cao nhất trong các hàm ghi) |'); });
const dem = {}; Object.values(quyen).forEach(v => { dem[v] = (dem[v] || 0) + 1; });
L.push('', 'Tổng API công khai: **' + Object.keys(quyen).length + '** — ' + Object.keys(dem).sort().map(k => NHAN[k] + ': ' + dem[k]).join(', ') + '. Mọi hàm công khai phải có trong `bangQuyenApi_` (có kiểm thử); chức năng kiểm tra không sửa dữ liệu nghiệp vụ, nhưng có thể ghi nhật ký kiểm tra.', '');
L.push('### 5.1 Hợp đồng API (đầu vào/đầu ra) theo nhóm quyền', '');
Object.keys(NHAN).forEach(k => { const ds = Object.keys(quyen).filter(h => quyen[h] === k).sort(); L.push('**' + NHAN[k] + ' (' + ds.length + ')**: ' + ds.map(d => '`' + d + '`').join(' '), ''); });
L.push('Luồng kiểm soát dự kiến của API ghi (cơ chế phiên bản/chống trùng cụ thể xem từng bảng, không áp dụng đồng nhất cho mọi API): người gọi đã đăng nhập → kiểm quyền vai trò → khoá ghi (`LockService`) → kiểm `expectedRevision` (sửa) hoặc `khoaYeuCau` (tạo) → ghi → nhật ký. Lỗi xung đột: `XUNG_DOT_PHIEN_BAN|<revision hiện tại>|<thông báo>`.', '');
L.push('## 6. Bất biến → kiểm tra', '', '| Mã | Bất biến | Nơi kiểm |', '|---|---|---|',
  '| PK_RONG / PK_TRUNG | Khoá chính không rỗng, không trùng | `kiemTraQuanHeDuLieu` |', '| FK_MO_COI / FK_RONG | Khoá ngoại phải trỏ tới bản ghi có thật (trừ cột cho phép trống) | `kiemTraQuanHeDuLieu` |',
  '| TRA_GOC_VUOT_GOC | Tổng trả gốc hiệu lực ≤ gốc giải ngân | `kiemTraQuanHeDuLieu`, `layBaoCaoDoiSoat` |', '| TRA_NO_HO_SO_CHUA_GIAI_NGAN | Chỉ hồ sơ Đã giải ngân mới có trả nợ (cảnh báo) | `kiemTraQuanHeDuLieu` |',
  '| XAC_NHAN_NHIEU_HIEU_LUC | Mỗi hồ sơ tối đa một xác nhận giải ngân hiệu lực | `kiemTraQuanHeDuLieu` |', '| BH_THE_HE_THIEU_CHI_TIET | Hợp đồng bảo hiểm trỏ thế hệ có đủ dòng chi tiết | `kiemTraQuanHeDuLieu`, `layTrangThaiToanVenBaoHiem` |',
  '| Tổng chi tiết = tổng hồ sơ | Tổng người thụ hưởng khớp số tiền hồ sơ | `layBaoCaoDoiSoat` |', '| Revision đơn điệu | Sửa phải kèm `expectedRevision` khớp | các test `chay_*` về phiên bản |', '');
L.push('## 7. Kế hoạch di chuyển (migration)', '', '1. Chỉ **thêm** cột/bảng, không đổi tên/xoá cột cũ (`nangCapCauTrucBaoDam_`, VERSION.gs); dữ liệu cũ đọc được khi cột mới rỗng.', '2. Chạy trên **bản sao** file dữ liệu trước; chạy “Kiểm tra môi trường thật” và “Kiểm tra quan hệ dữ liệu” (chỉ đọc).', '3. Nếu có lỗi quan hệ: xuất danh sách mã khoá, sửa tay từng bản ghi sau khi đối chiếu chứng từ — **không** tự sửa hàng loạt.', '4. Rollback: khôi phục bản sao/lịch sử phiên bản Google Sheets; cột thêm mới có thể bỏ qua.', '');
L.push('## 8. Rủi ro còn lại (báo cáo trung thực)', '', '- Chưa chạy trên Google Sheets thật: múi giờ, kiểu dữ liệu đọc lại, tốc độ thật chỉ kiểm bằng “Kiểm tra môi trường thật” khi người dùng chạy.', '- Google Sheets không có giao dịch: ghi nhiều bảng có thể dở dang → đã có nhật ký ghi dở/`GiaoDichBaoHiem` và công cụ phục hồi, nhưng không tương đương giao dịch CSDL.', '- Khoá ngoại không do Sheets cưỡng chế: sửa tay trực tiếp trên Sheet có thể tạo mồ côi → dùng “Kiểm tra quan hệ dữ liệu” định kỳ.', '- Khoá chính là chuỗi do ứng dụng sinh; sửa tay có thể gây trùng (đã có kiểm tra PK_TRUNG).', '');
const out = L.join('\n');
if (process.argv.includes('--kiem')) { const cu = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : ''; if (cu !== out.replace(/\r\n/g, '\n')) { console.log('LUONG_DU_LIEU.md lệch mã nguồn — chạy: node tools/sinh_luong_du_lieu.cjs'); process.exit(1); } console.log('LUONG_DU_LIEU.md khớp mã nguồn'); process.exit(0); }
fs.writeFileSync(file, out); console.log('Đã ghi ' + file + ' (' + out.length + ' ký tự)');
