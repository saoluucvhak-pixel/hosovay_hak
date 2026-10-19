/* ĐỐI CHIẾU DỮ LIỆU GOOGLE SHEETS TRƯỚC/SAU TỪNG NGHIỆP VỤ + TƯƠNG ĐƯƠNG GIỮA MÃ CŨ VÀ MÃ MỚI.
 *   node kiem_thu/doi_chieu_du_lieu.js chay <thư_mục_repo> <ra.json>     chạy chuỗi nghiệp vụ, chụp Sheets trước/sau từng bước
 *   node kiem_thu/doi_chieu_du_lieu.js bao-cao <cu.json> <moi.json> <ra.md>  so sánh trạng thái cuối cũ↔mới + sinh BAO_CAO_DOI_CHIEU_DU_LIEU.md
 * Dữ liệu là Google Sheets GIẢ LẬP (không phải Sheets thật) và dữ liệu thử — không dùng dữ liệu thật. */
const fs = require('fs'), path = require('path');
const TI = require('./gia_lap_apps_script');
const THEO_DOI = ['DM_CongTy', 'DM_HopDongVay', 'DM_KhachHang', 'HoSoGiaiNgan', 'ChiTietThuHuong', 'LichSuTrangThaiHoSo', 'BaoCaoTienVay_Draft'];
const KHOA = { DM_CongTy: ['MaCty'], DM_HopDongVay: ['MaHD'], DM_KhachHang: ['MaKH'], HoSoGiaiNgan: ['MaHoSo'], ChiTietThuHuong: ['MaHoSo', 'STT'], LichSuTrangThaiHoSo: ['MaHoSo', 'TuTrangThai', 'DenTrangThai', 'Revision'], BaoCaoTienVay_Draft: ['MaHoSo', 'TenNguoiHuong'] };
const BO_QUA_COT = ['CapNhatLuc', 'NgayTao', 'NgayXoa', 'NgayHopDong', 'Luc', 'ThoiGian', 'NgayCapNhat', 'KhoaYeuCau']; // thời điểm chạy / mã ngẫu nhiên

function chuanHoa(v) { if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10); return v === undefined || v === null ? '' : v; }
function chup(G) {
  const kq = {};
  THEO_DOI.forEach(t => {
    const sh = G.boDuLieu.getSheetByName(t); if (!sh) { kq[t] = { cot: [], dong: {} }; return; }
    const h = sh.g[0] || [], dong = {};
    sh.g.slice(1).forEach((r, i) => { if (!r.length || r.every(x => x === '' || x === undefined)) return;
      const o = {}; h.forEach((c, j) => { if (BO_QUA_COT.indexOf(c) < 0) o[c] = chuanHoa(r[j]); });
      const k = (KHOA[t] || [h[0]]).map(c => o[c]).join('|') || ('#' + i); dong[k in dong ? k + '#' + i : k] = o; });
    kq[t] = { cot: h.filter(c => BO_QUA_COT.indexOf(c) < 0), dong };
  });
  return kq;
}
function khacBiet(a, b) {
  const kq = {};
  THEO_DOI.forEach(t => {
    const A = a[t].dong, B = b[t].dong, them = Object.keys(B).filter(k => !(k in A)), xoa = Object.keys(A).filter(k => !(k in B)), doi = [];
    Object.keys(B).filter(k => k in A).forEach(k => Object.keys(B[k]).forEach(c => { if (JSON.stringify(A[k][c]) !== JSON.stringify(B[k][c])) doi.push({ khoa: k, cot: c, truoc: A[k][c], sau: B[k][c] }); }));
    if (them.length || xoa.length || doi.length) kq[t] = { dongTruoc: Object.keys(A).length, dongSau: Object.keys(B).length, them, xoa, doi };
  });
  return kq;
}
/** Bất biến dữ liệu (kiểm sau MỖI nghiệp vụ). */
function batBien(S) {
  const loi = [], hs = S.HoSoGiaiNgan.dong, ct = S.ChiTietThuHuong.dong, hd = S.DM_HopDongVay.dong, tong = {}, dem = {};
  Object.keys(ct).forEach(k => { const c = ct[k]; tong[c.MaHoSo] = (tong[c.MaHoSo] || 0) + (Number(c.SoTien) || 0); dem[c.MaHoSo] = (dem[c.MaHoSo] || 0) + 1; });
  Object.keys(hs).forEach(k => { const h = hs[k]; const daXoa = h.DaXoa === true || h.DaXoa === 'TRUE';
    if (!h.MaHoSo) loi.push('hồ sơ thiếu mã');
    if (!hd[h.MaHD]) loi.push(h.MaHoSo + ': hợp đồng ' + h.MaHD + ' không tồn tại');
    if (!dem[h.MaHoSo]) loi.push(h.MaHoSo + ': không có dòng chi tiết');
    else if ((Number(h.SoTienNhanNoLanNay) || 0) !== tong[h.MaHoSo]) loi.push(h.MaHoSo + ': tổng cha ' + h.SoTienNhanNoLanNay + ' ≠ tổng con ' + tong[h.MaHoSo]);
    if (['Nháp', 'Đã tạo hồ sơ', 'Đã giải ngân', 'Đã hủy'].indexOf(h.TrangThai) < 0) loi.push(h.MaHoSo + ': trạng thái lạ ' + h.TrangThai);
    if (String(h.LoaiTien || 'VND') === 'USD' || true) { ['SoTienNhanNoLanNay'].forEach(c => { const v = Number(h[c]); if (!Number.isFinite(v) || v < 0) loi.push(h.MaHoSo + ': ' + c + ' không hợp lệ'); }); }
  });
  Object.keys(ct).forEach(k => { if (!hs[ct[k].MaHoSo]) loi.push('chi tiết mồ côi: ' + k); });
  return { soHoSo: Object.keys(hs).length, soChiTiet: Object.keys(ct).length, loi };
}

function chay(repo, ra) {
  const { ctx, mt } = TI(path.resolve(repo), path.join(path.dirname(path.resolve(ra)), '_tam_data_flow')); const G = mt.__;
  const _l = console.log; console.log = () => {}; console.warn = () => {}; console.error = () => {};
  ctx.initializeSpreadsheet(); mt.__email = 'ketoan@example.com';
  const goi = (ten, args) => ctx.api('', ten, args), buoc = [];
  let truoc = chup(G);
  const thucHien = (ten, mota, fn, kyVong) => {
    let loiNghiepVu = '', kq; try { kq = fn(); } catch (e) { loiNghiepVu = String(e.message).slice(0, 120); }
    const sau = chup(G), kb = khacBiet(truoc, sau), bb = batBien(sau);
    buoc.push({ ten, mota, kyVong, loiNghiepVu, khac: kb, batBien: bb, tomTat: tomTat(kb) }); truoc = sau; return kq;
  };
  const tomTat = (kb) => Object.keys(kb).map(t => `${t}: ${kb[t].dongTruoc}→${kb[t].dongSau} dòng, +${kb[t].them.length}/−${kb[t].xoa.length}/~${kb[t].doi.length} ô`).join('; ') || '(không đổi)';
  const dong = (ten, st, lt) => ({ tenNguoiHuong: ten, soTaiKhoan: '9' + st, taiNganHang: 'BIDV', loaiChungTu: 'Thanh toán tiền hàng', noiDungThanhToan: 'tt ' + ten, soTien: st, taiLieuSo: 'HD1', ngayTaiLieu: '15/09/2026' });
  const pl = (hd, rows, ex) => Object.assign({ maHoSo: '', maHD: hd, loaiTien: 'VND', duNoHienTai: 1000000, soTienNhanNoLanNay: rows.reduce((a, d) => a + d.soTien, 0), soGiayNhanNo: 'GNN-DC-1', ngayGiayNhanNo: '2026-09-15', ngayGiaiNgan: '2026-09-15', ngayDenHan: '2026-12-14', thoiHanChoVayNgay: 90, chiTiet: rows }, ex || {});

  const cty = thucHien('B01', 'Lưu công ty vay vốn', () => goi('luuCongTy', [{ tenCty: 'CÔNG TY ĐỐI CHIẾU', maSoThue: '0400000099', nguoiDaiDien: 'A', diaChiTruSo: 'ĐN' }]), 'thêm 1 dòng DM_CongTy');
  const hd1 = thucHien('B02', 'Lưu hợp đồng vay thứ 1', () => goi('luuHopDong', [{ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-DC-01', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 5000000000 }]), 'thêm 1 dòng DM_HopDongVay');
  const hd2 = thucHien('B03', 'Lưu hợp đồng vay thứ 2', () => goi('luuHopDong', [{ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-DC-02', ngayHopDong: '2026-02-05', tenNganHang: 'Vietcombank', chiNhanh: 'ĐN', hanMucVay: 2000000000 }]), 'thêm 1 dòng DM_HopDongVay');
  thucHien('B04', 'Bấm lưu hợp đồng trùng số (lỗi bấm 2 lần)', () => goi('luuHopDong', [{ tinhTrang: 'Đang hiệu lực', maCty: cty.maCty, soHopDong: 'HD-DC-01', ngayHopDong: '2026-01-05', tenNganHang: 'BIDV', chiNhanh: 'QN', hanMucVay: 5000000000 }]), 'bị chặn, Sheet không đổi');
  const a = thucHien('B05', 'Tạo hồ sơ VND 2 dòng thụ hưởng (1.000.000 + 2.000.000)', () => goi('luuHoSoGiaiNgan', [pl(hd1.maHD, [dong('NCC A', 1000000), dong('NCC B', 2000000)], { khoaYeuCau: 'K-DC-1' })]), '+1 HoSoGiaiNgan, +2 ChiTietThuHuong, tổng khớp');
  thucHien('B06', 'Gửi lại đúng yêu cầu vừa lưu (mất mạng rồi bấm lại, cùng khoaYeuCau)', () => goi('luuHoSoGiaiNgan', [pl(hd1.maHD, [dong('NCC A', 1000000), dong('NCC B', 2000000)], { khoaYeuCau: 'K-DC-1' })]), 'không tạo hồ sơ trùng');
  const b = thucHien('B07', 'Tạo hồ sơ USD 1 dòng (25.000 USD, tỷ giá 25.810)', () => goi('luuHoSoGiaiNgan', [pl(hd2.maHD, [dong('NCC Mỹ', 25000)], { loaiTien: 'USD', tyGiaBan: 25810, soGiayNhanNo: 'GNN-DC-2', khoaYeuCau: 'K-DC-2' })]), '+1 hồ sơ USD, SoTienQuyDoi = 645.250.000');
  thucHien('B08', 'Sửa hồ sơ VND: đổi số tiền và thêm dòng thứ 3', () => goi('luuHoSoGiaiNgan', [pl(hd1.maHD, [dong('NCC A', 1000000), dong('NCC B', 2500000), dong('NCC C', 500000)], { maHoSo: a.maHoSo, expectedRevision: 1 })]), 'chi tiết thay đúng 3 dòng, tổng cha 4.000.000, Revision 2');
  thucHien('B09', 'Lưu bằng revision CŨ (người khác đã sửa) — phải bị từ chối', () => goi('luuHoSoGiaiNgan', [pl(hd1.maHD, [dong('NCC A', 999)], { maHoSo: a.maHoSo, expectedRevision: 1 })]), 'báo xung đột, Sheet không đổi');
  thucHien('B10', 'Cập nhật thông tin phi tiền tệ (số giấy nhận nợ, tên người hưởng)', () => goi('capNhatThongTinPhiTienTe', [{ maHoSo: a.maHoSo, expectedRevision: 2, soGiayNhanNo: 'GNN-DC-SUA', chiTiet: [{ tenNguoiHuong: 'NCC A (sửa)' }, { tenNguoiHuong: 'NCC B' }, { tenNguoiHuong: 'NCC C' }] }]), 'số tiền KHÔNG đổi, Revision 3');
  // chỉ ĐỌC: phải KHÔNG làm đổi bất kỳ ô nào
  const doc = ['layDuLieuKhoiTao', 'locDanhSachHoSo', 'layBaoCaoTienVay', 'layBaoCaoDoiSoat', 'layRevisionDuLieu', 'layNgayHomNay'];
  const moi = typeof ctx.layTrangHoSo === 'function'; if (moi) doc.push('layTrangHoSo', 'layTongQuanHoSo');
  thucHien('B11', 'Các thao tác chỉ ĐỌC (danh sách, tìm kiếm, tổng quan, báo cáo, đối soát)', () => { doc.forEach(h => { goi(h, h === 'layBaoCaoTienVay' ? ['', '', '', '', '', true] : (h === 'locDanhSachHoSo' ? [{}] : (h === 'layDuLieuKhoiTao' ? [{}] : (h === 'layTrangHoSo' ? [{ page: 1, pageSize: 50 }] : [])))); }); goi('layDuLieuDayDu', [a.maHoSo]); }, 'Sheet KHÔNG đổi');
  thucHien('B12', 'Xoá mềm hồ sơ USD', () => goi('xoaHoSo', [b.maHoSo, { expectedRevision: 1, lyDo: 'nhập nhầm' }]), 'DaXoa=TRUE, dòng cha/con còn nguyên');
  thucHien('B13', 'Khôi phục hồ sơ USD (quản trị)', () => goi('khoiPhucHoSo', [b.maHoSo, 2]), 'DaXoa=FALSE, Revision tăng');
  const cuoi = chup(G); const kb = { ops: buoc, trangThaiCuoi: cuoi, batBienCuoi: batBien(cuoi), repo: path.resolve(repo), coPhanTrang: moi };
  fs.writeFileSync(ra, JSON.stringify(kb, null, 1)); console.log = _l;
  console.log(`đã ghi ${ra}: ${buoc.length} bước, bất biến cuối: ${kb.batBienCuoi.loi.length} lỗi, ${kb.batBienCuoi.soHoSo} hồ sơ / ${kb.batBienCuoi.soChiTiet} chi tiết`);
}

function baoCao(fCu, fMoi, ra) {
  const cu = JSON.parse(fs.readFileSync(fCu, 'utf8')), moi = JSON.parse(fs.readFileSync(fMoi, 'utf8'));
  const kbCuoi = khacBiet(cu.trangThaiCuoi, moi.trangThaiCuoi);
  const khacTheoBuoc = moi.ops.map((o, i) => ({ id: o.ten, khac: JSON.stringify(o.khac) !== JSON.stringify(cu.ops[i].khac) || o.loiNghiepVu !== cu.ops[i].loiNghiepVu, cu: cu.ops[i], moi: o }));
  let md = '# BÁO CÁO ĐỐI CHIẾU DỮ LIỆU GOOGLE SHEETS TRƯỚC/SAU NGHIỆP VỤ\n\n> **Môi trường:** Google Sheets GIẢ LẬP + dữ liệu thử (không phải dữ liệu thật, không phải Google thật). Mỗi bước chụp toàn bộ các sheet theo dõi trước/sau, so từng ô, kiểm tra bất biến (tổng cha = tổng con, không chi tiết mồ côi, hợp đồng tồn tại, trạng thái hợp lệ, số tiền hợp lệ). Cùng chuỗi bước được chạy trên **mã cũ (main trước nâng cấp)** và **mã mới** để chứng minh nâng cấp không làm đổi dữ liệu nghiệp vụ.\n\n';
  md += `**Kết luận tổng:** bất biến sau mọi bước — mã mới: ${moi.ops.reduce((a, o) => a + o.batBien.loi.length, 0)} lỗi; mã cũ: ${cu.ops.reduce((a, o) => a + o.batBien.loi.length, 0)} lỗi. Số ô khác nhau giữa trạng thái Sheets CUỐI của mã cũ và mã mới: **${Object.keys(kbCuoi).reduce((a, t) => a + kbCuoi[t].them.length + kbCuoi[t].xoa.length + kbCuoi[t].doi.length, 0)}**.\n\n`;
  md += '## 1. Từng bước: dữ liệu Sheets trước → sau (mã MỚI)\n\n| Bước | Nghiệp vụ | Kỳ vọng | Kết quả nghiệp vụ | Thay đổi trong Sheets (dòng trước→sau, +thêm/−xoá/~ô đổi) | Bất biến |\n|---|---|---|---|---|---|\n';
  moi.ops.forEach(o => { md += `| ${o.ten} | ${o.mota} | ${o.kyVong} | ${o.loiNghiepVu ? 'Từ chối: ' + o.loiNghiepVu.replace(/\|/g, '/') : 'Thành công'} | ${o.tomTat} | ${o.batBien.loi.length ? 'LỖI: ' + o.batBien.loi.slice(0, 2).join('; ') : 'Đạt (' + o.batBien.soHoSo + ' hồ sơ / ' + o.batBien.soChiTiet + ' chi tiết)'} |\n`; });
  md += '\n## 2. Chi tiết ô thay đổi (mã MỚI)\n';
  moi.ops.forEach(o => { const ts = Object.keys(o.khac); if (!ts.length) { md += `\n**${o.ten}** — Sheets không đổi.\n`; return; }
    md += `\n**${o.ten}** — ${o.mota}\n`; ts.forEach(t => { const k = o.khac[t]; md += `- \`${t}\`: ${k.dongTruoc}→${k.dongSau} dòng`; if (k.them.length) md += `; thêm: ${k.them.slice(0, 4).join(', ')}${k.them.length > 4 ? '…' : ''}`; if (k.xoa.length) md += `; xoá: ${k.xoa.slice(0, 4).join(', ')}`; if (k.doi.length) md += `; ô đổi: ` + k.doi.slice(0, 6).map(d => `${d.khoa}.${d.cot} ${JSON.stringify(d.truoc)}→${JSON.stringify(d.sau)}`).join(' · ') + (k.doi.length > 6 ? ` (+${k.doi.length - 6})` : ''); md += '\n'; }); });
  md += '\n## 3. Tương đương mã cũ ↔ mã mới, từng bước\n\n| Bước | Giống nhau? | Ghi chú |\n|---|---|---|\n';
  khacTheoBuoc.forEach(x => { md += `| ${x.id} | ${x.khac ? '**KHÁC**' : 'Giống'} | ${x.khac ? 'cũ: ' + (x.cu.loiNghiepVu ? 'từ chối "' + x.cu.loiNghiepVu.replace(/\|/g, '/') + '"' : x.cu.tomTat) + ' → mới: ' + (x.moi.loiNghiepVu ? 'từ chối "' + x.moi.loiNghiepVu.replace(/\|/g, '/') + '"' : x.moi.tomTat) : ''} |\n`; });
  md += '\n## 4. Khác biệt trạng thái Sheets CUỐI (cũ vs mới)\n\n' + (Object.keys(kbCuoi).length ? Object.keys(kbCuoi).map(t => `- \`${t}\`: cũ ${kbCuoi[t].dongTruoc} dòng, mới ${kbCuoi[t].dongSau} dòng; chỉ có ở mới: ${kbCuoi[t].them.join(', ') || '—'}; chỉ có ở cũ: ${kbCuoi[t].xoa.join(', ') || '—'}; ô khác: ${kbCuoi[t].doi.length}`).join('\n') : 'Không có: hai trạng thái Sheets cuối **giống hệt** nhau (bỏ qua các cột thời điểm và mã ngẫu nhiên).') + '\n';
  md += '\n## 5. Giới hạn\n- Dữ liệu thử trong Sheets giả lập; chưa đối chiếu trên Google Sheets thật (độ trễ, định dạng ô, giới hạn dòng, quyền chia sẻ).\n- Cột thời điểm (CapNhatLuc, NgayTao…) và mã yêu cầu ngẫu nhiên bị bỏ qua khi so sánh.\n- Chuỗi bước không gồm phát hành chứng từ (cần mẫu DOCX và Drive) — phần đó được kiểm riêng ở `chay_tich_hop*.js`.\n';
  fs.writeFileSync(ra, md); console.log('đã ghi ' + ra);
  const loi = moi.ops.reduce((a, o) => a + o.batBien.loi.length, 0); process.exit(loi ? 1 : 0);
}
const [, , lenh, a1, a2, a3] = process.argv;
if (lenh === 'chay') chay(a1, a2); else if (lenh === 'bao-cao') baoCao(a1, a2, a3); else { console.log('Dùng: chay <repo> <ra.json> | bao-cao <cu.json> <moi.json> <ra.md>'); process.exit(2); }
