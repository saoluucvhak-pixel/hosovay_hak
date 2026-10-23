// Hồi quy 4 lỗi sửa trực tiếp trên main (23/10): (1) lộ dữ liệu ngoài phạm vi công ty ở các API tổng hợp lương/bảo hiểm/hoá đơn,
// (2) đọc bảng lương dừng nhầm ở tên "Công…", (3) createDemoSheet đụng hạ tầng dùng chung, (4) docSoTienBangChu_ sai đơn vị ghép ("nghìn tỷ").
// Giả lập Apps Script/Sheets — chỉ dữ liệu giả lập, không chạm dữ liệu vận hành. Chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('sua_loi_23_10'), { ctx, mt, G, themHoSo, hopDong, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
const api = (e, ten, ...a) => J(voi(e, () => ctx.api('', ten, a)));
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });

// ======================= 1. PHẠM VI CÔNG TY =======================
const SH = (ten) => G.boDuLieu.getSheetByName(ten);
const them = (ten, o) => { const sh = SH(ten); sh.g.push(sh.g[0].map(k => o[k] ?? '')); };
const hdA = hopDong({ soHopDong: 'HD-A' });                                  // công ty A = công ty thử có sẵn
them('DM_CongTy', { MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002' });
them('DM_HopDongVay', { MaHD: 'HD_B', MaCty: 'CTY_B', SoHopDong: 'HD-B' });
ctx.tangRevision_('CONGTY'); ctx.tangRevision_('HOPDONG');
const maCtyA = String(Q.cty.maCty);
const hsA = themHoSo({ MaHoSo: 'HS-A', MaHD: hdA.maHD }), hsB = themHoSo({ MaHoSo: 'HS-B', MaHD: 'HD_B' });
ctx.damBaoCotSheet_(SH('BangKeHoaDon'), ctx.COT_BANGKE_HOADON_MO_RONG_);
ctx.ensureSheet_(G.boDuLieu, ctx.SHEET_TONGHOP_LUONG_BP, ctx.COT_TONGHOP_LUONG_BP_);
[['TL-A', hsA, 'Luong_A.xlsx'], ['TL-B', hsB, 'Luong_B.xlsx'], ['TL-N', '', 'Luong_chua_gan.xlsx']].forEach(([tl, hs, ten]) => {
  them('TaiLieuDinhKem', { MaTaiLieu: tl, MaHoSo: hs, LoaiTaiLieu: 'BangLuong', TenFile: ten, LinkFile: 'https://drive.example/' + tl });
  const so = tl === 'TL-A' ? 1000 : tl === 'TL-B' ? 7000000 : 500000000;
  them('BangKeBangLuong', { MaDongLuong: 'BL-' + tl, MaTaiLieu: tl, MaHoSo: hs, HoTen: 'Người ' + tl, Thang: '10/2026', SoTien: so });
  them(ctx.SHEET_TONGHOP_LUONG_BP, { MaTaiLieu: tl, MaHoSo: hs, Thang: '10/2026', BoPhan: 'BP ' + tl, SoNguoi: 1, ThucLinh: so, BHXH: so / 10, BHYT: so / 100, BHTN: so / 100, KPCD: so / 200 });
  them('BangKeHoaDon', { MaHoaDon: 'HD-' + tl, MaTaiLieu: tl, MaHoSo: hs, SoHoaDon: '00' + so, MST: '0301234567', TenNhaCungCap: 'NCC ' + tl, SoTien: so, DocDuoc: 'CO', LoaiChungTu: 'BAO_HIEM', Thang: '10/2026',
    SoLaoDong: 5, MucLuongDongBH: so, DNDong: so / 2, NLDDong: so / 4, TrangTu: 1, TrangDen: 1 });
  them('BangKeHoaDon', { MaHoaDon: 'HDX-' + tl, MaTaiLieu: tl, MaHoSo: hs, SoHoaDon: '9' + so, MST: '0309999999', TenNhaCungCap: 'NCC khác ' + tl, SoTien: so, DocDuoc: 'CO', LoaiChungTu: 'HOA_DON_GTGT' });
});
let phamVi = [];                                                             // phạm vi công ty do Cổng cấp (rỗng = toàn hệ thống)
const goc = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => phamVi;
const voiPV = (pv, f) => { const c = phamVi; phamVi = pv; try { return f(); } finally { phamVi = c; } };
const chuoi = (x) => JSON.stringify(x);
const khongLo = (x, ...cam) => cam.forEach(c => assert.ok(!chuoi(x).includes(c), 'lộ "' + c + '" trong ' + chuoi(x).slice(0, 300)));

dat('Phạm vi: tổng hợp bảng lương chỉ thấy tệp/bộ phận của hồ sơ trong công ty được cấp; toàn hệ thống thấy đủ', () => {
  voiPV([maCtyA], () => {
    const r = api('xem@example.com', 'layTongHopBangLuong');
    assert.deepEqual(r.map(g => g.maTaiLieu), ['TL-A']); assert.equal(r[0].tongTien, 1000); assert.equal(r[0].boPhan.length, 1); assert.equal(r[0].boPhan[0].thucLinh, 1000);
    khongLo(r, 'TL-B', 'TL-N', 'HS-B', 'Luong_B', 'Luong_chua_gan', '7000000', '500000000');
  });
  const tat = api('xem@example.com', 'layTongHopBangLuong');
  assert.deepEqual(tat.map(g => g.maTaiLieu).sort(), ['TL-A', 'TL-B', 'TL-N']);
});
dat('Phạm vi: tổng hợp bảo hiểm cùng tháng không cộng dồn số của công ty khác; tài liệu chưa gắn hồ sơ bị ẩn với người bị giới hạn', () => {
  voiPV([maCtyA], () => {
    const t = api('xem@example.com', 'layTongHopBaoHiem').find(x => x.thang === '10/2026');
    assert.equal(t.luong.soNguoi, 1); assert.equal(t.luong.bhxh, 100); assert.equal(t.bangBH.length, 1); assert.equal(t.tongBangBH.tongNop, 1000);
    khongLo(t, 'Luong_B', 'Luong_chua_gan', 'HD-TL-B', 'HD-TL-N', 'BP TL-B', 'BP TL-N');
  });
  const tat = api('xem@example.com', 'layTongHopBaoHiem').find(x => x.thang === '10/2026');
  assert.equal(tat.luong.soNguoi, 3); assert.equal(tat.bangBH.length, 3);
});
dat('Phạm vi: API đọc hoá đơn/lương/tài liệu và gom nhiều trang không lộ dòng ngoài phạm vi (kể cả cờ "đã có trong sổ")', () => {
  voiPV([maCtyA], () => {
    const hd = api('xem@example.com', 'layBangTongHopHoaDon'); assert.ok(hd.length && hd.every(h => h.maHoSo === hsA)); khongLo(hd, 'HD-TL-B', 'HDX-TL-B', 'HD-TL-N');
    const lg = api('xem@example.com', 'layBangTongHopBangLuong'); assert.deepEqual(lg.map(l => l.maHoSo), [hsA]);
    assert.deepEqual(api('xem@example.com', 'layTaiLieuTheoHoSo', hsA).map(t => t.maTaiLieu), ['TL-A']);
    assert.throws(() => api('xem@example.com', 'layTaiLieuTheoHoSo', hsB), /phạm vi/);
    const trang = [{ soTrang: 1, vanBan: 'HÓA ĐƠN GIÁ TRỊ GIA TĂNG\nKý hiệu: 1C26TAA Số: 9' + 7000000 + '\nNgày 22 tháng 10 năm 2026\nMã số thuế: 0309999999\nTổng cộng tiền thanh toán: 7.000.000' }];
    khongLo(api('ketoan@example.com', 'gomChungTuTuTrang', trang).chungTu.map(c => c.trungVoi), 'HDX-TL-B', 'HS-B');
  });
});
dat('Phạm vi: gọi TRỰC TIẾP (không qua api) bởi quản trị bị giới hạn công ty vẫn lọc phía máy chủ; quản trị toàn hệ thống thấy đủ', () => {
  voiPV([maCtyA], () => {
    assert.deepEqual(J(voi('ketoan@example.com', () => ctx.layTongHopBangLuong())).map(g => g.maTaiLieu), ['TL-A']);
    assert.equal(J(voi('ketoan@example.com', () => ctx.layTongHopBaoHiem())).find(x => x.thang === '10/2026').bangBH.length, 1);
  });
  assert.equal(J(voi('ketoan@example.com', () => ctx.layTongHopBangLuong())).length, 3);
  voiPV(['CTY_KHONG_CO'], () => { assert.deepEqual(J(voi('ketoan@example.com', () => ctx.layTongHopBangLuong())), []); });
});
ctx.phamViCongTyNguoiDung_ = goc;

// ======================= 2. ĐỌC BẢNG LƯƠNG =======================
const chuyen = (ds, stt) => ({ ten: 'chuyển lương', values: [['Công ty Thử'], ['LƯƠNG THÁNG 09/2026'], ['STT', 'HỌ TÊN', 'SỐ TÀI KHOẢN', 'SỐ TIỀN', 'TẠI NGÂN HÀNG']]
  .concat(ds.map(([t, s], i) => [stt ? i + 1 : '', t, '10' + i, s, 'BIDV'])).concat([['', 'Tổng cộng', '', ds.reduce((a, d) => a + d[1], 0), ''], ['', 'Người lập biểu', '', '', ''], ['', 'Kế toán trưởng', '', '', ''], ['', 'Giám đốc', '', '', '']]) });
dat('Bảng lương: tên bắt đầu bằng "Công"/"Tống" không bị coi là dòng tổng — đủ 3 người, tổng 6 triệu', () => {
  [true, false].forEach(stt => {
    let r = J(ctx.docBangLuongTuSheets_([chuyen([['An', 1000000], ['Công Minh', 2000000], ['Bình', 3000000]], stt)]));
    assert.deepEqual(r.dong.map(d => d.hoTen), ['An', 'Công Minh', 'Bình']); assert.equal(r.dong.reduce((a, d) => a + d.soTien, 0), 6000000);
    r = J(ctx.docBangLuongTuSheets_([chuyen([['Tống Văn Hải', 1500000], ['Cống Thị Mai', 2500000], ['Công Thanh', 1000000], ['Tổng Hợp Lan', 500000], ['Giám Khoa', 700000], ['Kế Anh', 800000]], stt)]));
    assert.deepEqual(r.dong.map(d => d.hoTen), ['Tống Văn Hải', 'Cống Thị Mai', 'Công Thanh', 'Tổng Hợp Lan', 'Giám Khoa', 'Kế Anh']);
  });
});
dat('Bảng lương: dòng "Tổng cộng"/"Cộng"/chữ ký thật vẫn dừng đọc (không tính vào lương); bố cục Thực lĩnh cũng đúng', () => {
  ['Tổng cộng', 'TỔNG CỘNG :', 'Tổng', 'Cộng', 'Tổng số', 'Người lập biểu', 'Kế toán trưởng', 'Giám đốc'].forEach(nhan => {
    const sh = chuyen([['An', 1000000], ['Công Minh', 2000000]], true); sh.values.splice(5, 4, ['', nhan, '', 3000000, ''], ['', 'Lẽ ra không đọc', '', 9999999, '']);
    const r = J(ctx.docBangLuongTuSheets_([sh])); assert.deepEqual(r.dong.map(d => d.hoTen), ['An', 'Công Minh'], nhan);
  });
  const vp = { ten: 'Lương VP', values: [['THÁNG 09/2026'], ['TT', 'Họ và tên', 'Thực lĩnh'], [1, 'An', 1000000], [2, 'Công Minh', 2000000], [3, 'Bình', 3000000], ['', 'Tổng cộng', 6000000], ['', 'Giám đốc', '']] };
  const r = J(ctx.docBangLuongTuSheets_([vp])); assert.deepEqual(r.dong.map(d => d.hoTen), ['An', 'Công Minh', 'Bình']); assert.equal(r.boPhan[0].soNguoi, 3); assert.equal(r.boPhan[0].thucLinh, 6000000);
});

// ======================= 3. createDemoSheet =======================
const chup = () => chuoi({ props: G.props, ss: Object.keys(G.boDuLieu.sheets).sort().map(n => [n, SH(n).g]) });
const taoGia = (ghiDe) => {
  const Sp = Object.getPrototypeOf(G.boDuLieu).constructor, nhat = { tao: [], datActive: [], rac: [], demo: null }, cu = { SpreadsheetApp: ctx.SpreadsheetApp, DriveApp: ctx.DriveApp };
  let active = G.boDuLieu;
  ctx.SpreadsheetApp = Object.assign({}, cu.SpreadsheetApp, {
    create: (ten) => { const s = new Sp('SS_DEMO_' + nhat.tao.length, ten); nhat.tao.push(ten); nhat.demo = s; return s; },
    setActiveSpreadsheet: (s) => { nhat.datActive.push(s.getId()); active = s; }, getActiveSpreadsheet: () => active, openById: (i) => (nhat.demo && i === nhat.demo.getId()) ? nhat.demo : cu.SpreadsheetApp.openById(i)
  });
  ctx.DriveApp = Object.assign({}, cu.DriveApp, { getFileById: (i) => (nhat.demo && i === nhat.demo.getId()) ? { setTrashed: (v) => nhat.rac.push(v) } : cu.DriveApp.getFileById(i) });
  return Object.assign(nhat, { active: () => active, khoiPhuc: () => { ctx.SpreadsheetApp = cu.SpreadsheetApp; ctx.DriveApp = cu.DriveApp; } });
};
dat('Demo: người không có quyền Quản trị bị chặn TRƯỚC khi tạo bất kỳ Sheet nào; hạ tầng không đổi', () => {
  const g = taoGia(), truoc = chup();
  try {
    ['xem@example.com', 'nguoila@example.com', ''].forEach(e => { assert.throws(() => voi(e, () => ctx.createDemoSheet()), /AUTH|QUYEN|quyền|đăng nhập/i, e); });
    assert.deepEqual(g.tao, []); assert.deepEqual(g.datActive, []);
  } finally { g.khoiPhuc(); }
  assert.equal(chup(), truoc);
});
dat('Demo: Quản trị tạo Sheet demo riêng (đủ cấu trúc), KHÔNG đổi Sheet đang hoạt động/cấu hình/Sheet vận hành', () => {
  const g = taoGia(), truoc = chup();
  try {
    voi('ketoan@example.com', () => ctx.createDemoSheet());
    assert.equal(g.tao.length, 1); assert.deepEqual(g.datActive, [], 'không gọi setActiveSpreadsheet'); assert.equal(g.active(), G.boDuLieu);
    assert.ok(g.demo.getSheetByName('HoSoGiaiNgan') && g.demo.getSheetByName('DM_CongTy'), 'Sheet demo có cấu trúc');
  } finally { g.khoiPhuc(); }
  assert.equal(chup(), truoc);
});
dat('Demo: khởi tạo demo thất bại → ném lỗi, bỏ Sheet demo dở dang, Sheet vận hành/cấu hình/Sheet đang hoạt động không đổi', () => {
  const g = taoGia(), truoc = chup(), ensure = ctx.ensureSheet_;
  try {
    ctx.ensureSheet_ = (ss, ten, cot) => { if (ss === g.demo && ten === ctx.SHEET_HOSO) throw new Error('Lỗi giả lập khi khởi tạo demo'); return ensure(ss, ten, cot); };
    assert.throws(() => voi('ketoan@example.com', () => ctx.createDemoSheet()), /Lỗi giả lập/);
    assert.deepEqual(g.datActive, []); assert.equal(g.active(), G.boDuLieu); assert.deepEqual(g.rac, [true], 'Sheet demo dở dang được bỏ vào thùng rác');
  } finally { ctx.ensureSheet_ = ensure; g.khoiPhuc(); }
  assert.equal(chup(), truoc);
});

// ======================= 4. docSoTienBangChu_ =======================
dat('Số tiền bằng chữ: đơn vị ghép (nghìn tỷ, triệu tỷ, nghìn triệu) và các cấp thông thường', () => {
  [['Một nghìn tỷ đồng', 1e12], ['Hai nghìn ba trăm tỷ đồng', 2.3e12], ['Một triệu tỷ đồng', 1e15], ['Hai nghìn triệu đồng', 2e9], ['Hai tỷ ba nghìn triệu đồng', 5e9],
    ['Một nghìn tỷ không trăm linh năm triệu đồng', 1000005000000], ['Mười hai nghìn tỷ ba trăm triệu bốn trăm nghìn đồng chẵn', 12000300400000],
    ['Một tỷ đồng', 1e9], ['Một trăm hai mươi tỷ đồng', 120e9], ['Hai tỷ ba trăm triệu bốn trăm năm mươi sáu nghìn bảy trăm tám mươi chín đồng', 2300456789],
    ['Một trăm nghìn đồng', 100000], ['Năm trăm triệu đồng', 5e8], ['Chín trăm chín mươi chín nghìn chín trăm chín mươi chín đồng', 999999], ['Một nghìn đồng', 1000]]
    .forEach(([c, so]) => assert.equal(ctx.docSoTienBangChu_(c), so, c));
});
dat('Số tiền bằng chữ: không, linh/lẻ, mốt/một, tư/bốn, lăm/năm, biến thể không dấu/tỉ', () => {
  [['không đồng', 0], ['Không trăm linh năm nghìn đồng', 5000], ['Một triệu lẻ năm đồng', 1000005], ['Hai mươi mốt nghìn đồng', 21000], ['Hai mươi một nghìn đồng', 21000], ['Bốn mươi tư nghìn', 44000], ['Bốn mươi bốn nghìn', 44000],
    ['Mười lăm nghìn', 15000], ['Mười năm nghìn', 15000], ['Hai mươi lăm nghìn', 25000], ['Hai mươi năm nghìn', 25000], ['Một trăm linh một đồng', 101], ['Một trăm lẻ tư đồng', 104], ['MOT TY HAI TRAM TRIEU DONG', 1200000000], ['Hai tỉ đồng', 2e9]]
    .forEach(([c, so]) => assert.equal(ctx.docSoTienBangChu_(c), so, c));
});
dat('Số tiền bằng chữ: chuỗi không hợp lệ → 0; vượt giới hạn số nguyên an toàn → 0 (không báo đọc thành công)', () => {
  ['', null, undefined, 'abc xyz', '12345', 'đồng chẵn', 'tỷ tỷ tỷ', 'Một tỷ tỷ đồng', 'Chín nghìn tỷ tỷ'].forEach(c => assert.equal(ctx.docSoTienBangChu_(c), 0, String(c)));
  const MAX = 'Chín triệu không trăm linh bảy nghìn một trăm chín mươi chín tỷ hai trăm năm mươi bốn triệu bảy trăm bốn mươi nghìn chín trăm chín mươi mốt đồng';
  assert.equal(ctx.docSoTienBangChu_(MAX), Number.MAX_SAFE_INTEGER, 'đúng giới hạn thì đọc được');
  assert.equal(ctx.docSoTienBangChu_(MAX.replace('chín mươi mốt', 'chín mươi hai')), 0, 'vượt 1 đơn vị → từ chối');
  assert.equal(ctx.docSoTienBangChu_('Chín triệu chín trăm chín mươi chín nghìn chín trăm chín mươi chín tỷ đồng'), 0);
});
Q.ket('sửa lỗi 23/10 (phạm vi công ty, bảng lương, demo, số tiền bằng chữ)');
