// GIAO DỊCH GHI BẢO HIỂM (thế hệ không tái sử dụng, kết quả chưa xác định không bị xoá theo suy đoán), khoá yêu cầu tạo tài sản, phiên bản bắt buộc.
// Kiểm tra DỮ LIỆU LƯU THỰC TẾ trong Sheets giả lập; chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('giao_dich_bh'), { ctx, mt, G, hopDong, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const hdA = hopDong({ soHopDong: 'HD-A' });
let _k = 0;
const taoTS = (hd, moTa, o) => J(ctx.luuTaiSanBaoDam(Object.assign({ khoaYeuCau: 'K' + (++_k), maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1000000000 }, o || {}))).maTS;
const CT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 500, tuNgay: tu, denNgay: den }, o || {});
const luuBH = (maTS, chiTiet, o) => J(ctx.luuBaoHiemTaiSan(Object.assign({ maTS, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {})));
const bhCua = (ts, maBH) => J(ctx.layBaoHiemTaiSan(ts)).hopDong.find(h => h.maBH === maBH);
const tenCT = (ts, maBH) => bhCua(ts, maBH).chiTiet.map(c => c.tenTaiSan);
const rawCT = (maBH) => ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').filter(c => c.MaBH === maBH);
const theHeRaw = (maBH) => J(rawCT(maBH).map(c => c.TenTaiSan + '@' + c.TheHe).sort());
const sua = (ts, maBH, chiTiet, o) => ctx.luuBaoHiemTaiSan(Object.assign({ maTS: ts, maBH, expectedRevision: bhCua(ts, maBH).revision, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {}));
const chen = (ten, thayThe, f) => { const goc = ctx[ten]; ctx[ten] = thayThe(goc); try { return f(); } finally { ctx[ten] = goc; } };
const loiCua = (f) => { try { f(); return ''; } catch (e) { return e.message; } };
const H = '2026-12-31';
const loiCha = (g) => (t, k, m, c) => { if (t === 'BaoHiemTaiSan') throw new Error('Lỗi cập nhật cha'); return g(t, k, m, c); };
const khongXoa = () => () => { throw new Error('Lỗi xoá'); };

dat('A1. Thế hệ không tái sử dụng: ghi dở còn lại (cha lỗi + dọn lỗi) rồi lưu lại → chỉ hiện đúng dòng lần sau, tổng tiền không cộng trùng', () => {
  const ts = taoTS(hdA, 'Cụm A1'), r = luuBH(ts, [CT('Gốc', '2026-01-01', H)]);
  const l1 = chen('capNhatDongTheoMa_', loiCha, () => chen('xoaDongAnToan_', khongXoa, () => loiCua(() => sua(ts, r.maBH, [CT('Ghi dở', '2026-01-01', H, { tienBH: 7000 })]))));
  assert.match(l1, /Chưa lưu/); assert.deepEqual(tenCT(ts, r.maBH), ['Gốc'], 'ghi dở vô hình');
  assert.equal(rawCT(r.maBH).length, 2, 'dòng ghi dở còn trong sheet (dọn lỗi)');
  const ok = J(sua(ts, r.maBH, [CT('Lần sau', '2026-01-01', H, { tienBH: 900 })]));
  assert.deepEqual(tenCT(ts, r.maBH), ['Lần sau'], 'chỉ hiện dòng của lần lưu thành công — không lẫn "Ghi dở"');
  assert.equal(bhCua(ts, r.maBH).tong.tienBH, 900, 'tổng tiền không cộng trùng ghi dở (7000)');
  assert.equal(ok.revision, r.revision + 1);
});
dat('A2. Nhiều lần thất bại liên tiếp + dọn lỗi + chạy lại: mỗi lần dùng thế hệ riêng; dọn sau cùng sạch; tổng tiền đúng', () => {
  const ts = taoTS(hdA, 'Cụm A2'), r = luuBH(ts, [CT('G', '2026-01-01', H, { tienBH: 100 })]);
  for (let i = 1; i <= 3; i++) chen('capNhatDongTheoMa_', loiCha, () => chen('xoaDongAnToan_', khongXoa, () => loiCua(() => sua(ts, r.maBH, [CT('Dở' + i, '2026-01-01', H, { tienBH: 1000 * i }), CT('Dở' + i + 'b', '2026-01-01', H, { tienBH: 1 })]))));
  const gens = new Set(rawCT(r.maBH).filter(c => /^Dở/.test(c.TenTaiSan)).map(c => c.TheHe)); assert.equal(gens.size, 3, 'ba lần lỗi = ba thế hệ riêng, không dùng chung');
  assert.deepEqual(tenCT(ts, r.maBH), ['G']); assert.ok(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, 'còn dòng ghi dở cần dọn');
  J(sua(ts, r.maBH, [CT('Cuối', '2026-01-01', H, { tienBH: 55 })]));
  assert.deepEqual([tenCT(ts, r.maBH), bhCua(ts, r.maBH).tong.tienBH], [['Cuối'], 55]);
  assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, false, 'lần lưu thành công đã dọn cả các thế hệ ghi dở còn sót'); const don = J(ctx.donChiTietBaoHiemThua()); assert.equal(don.daXoa, 0);
  assert.deepEqual(theHeRaw(r.maBH).map(x => x.split('@')[0]), ['Cuối'], 'chỉ còn thế hệ hiện hành');
  assert.deepEqual(tenCT(ts, r.maBH), ['Cuối']);
});
dat('A3. Trước chốt phải xác minh số dòng/STT/nội dung của đúng giao dịch: thiếu một dòng ghi âm thầm → KHÔNG chốt, bản cũ còn nguyên', () => {
  const ts = taoTS(hdA, 'Cụm A3'), r = luuBH(ts, [CT('Gốc', '2026-01-01', H)]);
  let n = 0;
  const loi = chen('ghiNhieuDong_', (goc) => (t, c, ds, b) => { if (t === 'BaoHiemTaiSanChiTiet') { const giu = ds.filter(o => o.TenTaiSan !== 'M2'); n += ds.length - giu.length; return goc(t, c, giu, b); } return goc(t, c, ds, b); }, () => loiCua(() => sua(ts, r.maBH, [CT('M1', '2026-01-01', H), CT('M2', '2026-01-01', H)])));
  assert.equal(n, 1); assert.match(loi, /Chưa lưu/); assert.deepEqual(tenCT(ts, r.maBH), ['Gốc']); assert.equal(bhCua(ts, r.maBH).revision, r.revision);
  assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, false, 'dòng ghi dở đã dọn');
});
dat('B1. Cha ghi THÀNH CÔNG nhưng ném lỗi, đọc cha cũng lỗi (chưa xác định): KHÔNG xoá gì; thông báo không nhận "đã đọc lại"; xác minh sau → bản mới đủ chi tiết', () => {
  const ts = taoTS(hdA, 'Cụm B1'), r = luuBH(ts, [CT('Cũ1', '2026-01-01', H), CT('Cũ2', '2026-01-01', H)]);
  let loi = '';
  chen('capNhatDongTheoMa_', (g) => (t, k, m, c) => { g(t, k, m, c); if (t === 'BaoHiemTaiSan') throw new Error('Lỗi sau ghi'); }, () =>
    chen('docChaBH_', () => () => { throw new Error('Không đọc được'); }, () => { loi = loiCua(() => sua(ts, r.maBH, [CT('Mới1', '2026-01-01', H, { tienBH: 11 })])); }));
  assert.match(loi, /CHƯA XÁC ĐỊNH/i); assert.doesNotMatch(loi, /đã đọc lại|Dữ liệu cũ còn nguyên|xác minh sạch/i);
  const th = theHeRaw(r.maBH); assert.equal(th.length, 3, 'giữ nguyên cả bản cũ lẫn bản mới (không xoá theo suy đoán)');
  assert.deepEqual(tenCT(ts, r.maBH), ['Mới1'], 'cha thật đã trỏ thế hệ mới và chi tiết mới còn đó');
  const kq = J(ctx.xacMinhPhucHoiBaoHiem(r.maBH)); assert.equal(kq.trangThai, 'DA_CHOT'); assert.deepEqual(tenCT(ts, r.maBH), ['Mới1']);
  assert.equal(rawCT(r.maBH).length, 1, 'xác minh xong mới dọn thế hệ cũ'); assert.equal(J(ctx.xacMinhPhucHoiBaoHiem(r.maBH)).trangThai, 'DA_CHOT', 'idempotent');
});
dat('B2. Chưa xác định nhưng thật ra cha KHÔNG ghi: bản cũ còn nguyên, bản mới là ghi dở → xác minh dọn đúng phần ghi dở', () => {
  const ts = taoTS(hdA, 'Cụm B2'), r = luuBH(ts, [CT('Cũ', '2026-01-01', H)]);
  const loi = chen('capNhatDongTheoMa_', loiCha, () => chen('docChaBH_', () => () => { throw new Error('Không đọc được'); }, () => loiCua(() => sua(ts, r.maBH, [CT('Mới', '2026-01-01', H)]))));
  assert.match(loi, /CHƯA XÁC ĐỊNH/i); assert.deepEqual(tenCT(ts, r.maBH), ['Cũ']); assert.equal(rawCT(r.maBH).length, 2, 'giữ cả hai để xác minh');
  const kq = J(ctx.xacMinhPhucHoiBaoHiem(r.maBH)); assert.equal(kq.trangThai, 'CHUA_CHOT_DA_DON'); assert.deepEqual(tenCT(ts, r.maBH), ['Cũ']); assert.equal(rawCT(r.maBH).length, 1);
  assert.equal(bhCua(ts, r.maBH).revision, r.revision);
});
dat('B3. Cha đã trỏ thế hệ mới nhưng chi tiết mới mất (hỏng dữ liệu): phát hiện, không dọn bản cũ, phục hồi về bản cũ nhất quán (đủ số dòng) và ghi dấu vết', () => {
  const ts = taoTS(hdA, 'Cụm B3'), r = luuBH(ts, [CT('Cũ1', '2026-01-01', H, { tienBH: 5 }), CT('Cũ2', '2026-01-01', H, { tienBH: 6 })], { soHDBaoHiem: 'OLD' });
  // lỗi sau ghi + không đọc được + (mô phỏng) dòng chi tiết mới bị mất trước khi ai kịp xác minh
  chen('capNhatDongTheoMa_', (g) => (t, k, m, c) => { g(t, k, m, c); if (t === 'BaoHiemTaiSan') throw new Error('Lỗi sau ghi'); }, () =>
    chen('docChaBH_', () => () => { throw new Error('Không đọc được'); }, () => loiCua(() => sua(ts, r.maBH, [CT('Mới', '2026-01-01', H)], { soHDBaoHiem: 'NEW' }))));
  const sh = G.boDuLieu.getSheetByName('BaoHiemTaiSanChiTiet'), c0 = sh.g[0], iT = c0.indexOf('TenTaiSan');
  sh.g = sh.g.filter((row, i) => i === 0 || row[iT] !== 'Mới');
  const tt = J(ctx.layTrangThaiToanVenBaoHiem()); assert.ok(tt.canPhucHoi && tt.hopDongHong.length === 1, 'phát hiện cha trỏ thế hệ không đủ chi tiết');
  assert.equal(J(ctx.donChiTietBaoHiemThua()).daXoa, 0, 'KHÔNG dọn bản cũ khi hiện hành chưa đủ');
  assert.equal(rawCT(r.maBH).length, 2);
  const kq = J(ctx.xacMinhPhucHoiBaoHiem(r.maBH)); assert.equal(kq.trangThai, 'DA_PHUC_HOI');
  assert.deepEqual([bhCua(ts, r.maBH).soHDBaoHiem, tenCT(ts, r.maBH)], ['OLD', ['Cũ1', 'Cũ2']], 'cha + con cùng bản cũ');
  assert.equal(bhCua(ts, r.maBH).revision, r.revision + 2 - 0 > 0 ? bhCua(ts, r.maBH).revision : 0);
  assert.equal(J(ctx.xacMinhPhucHoiBaoHiem(r.maBH)).trangThai, 'DA_CHOT');
  const nk = ctx.docSheetBaoDam_('GiaoDichBaoHiem'); assert.ok(nk.some(x => x.MaBH === r.maBH && /PHUC_HOI/.test(x.TrangThai)), 'có dấu vết giao dịch');
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'xacMinhPhucHoiBaoHiem', [r.maBH])), /quyền|QUYEN/i);
});
dat('B4. Lỗi ở từng bước: trước ghi (không đọc được mã thế hệ), flush sau ghi chi tiết, sau commit đọc lại, dọn bản cũ — dữ liệu thật đúng', () => {
  const ts = taoTS(hdA, 'Cụm B4'), r = luuBH(ts, [CT('X', '2026-01-01', H)]);
  // trước ghi: không xác định được thế hệ an toàn → không ghi gì
  const truoc = chen('docTheHeDaDungBH_', () => () => { throw new Error('Không đọc được chi tiết'); }, () => loiCua(() => sua(ts, r.maBH, [CT('Y', '2026-01-01', H)])));
  assert.match(truoc, /Chưa lưu/); assert.deepEqual(tenCT(ts, r.maBH), ['X']); assert.equal(rawCT(r.maBH).length, 1, 'chưa ghi dòng nào');
  // sau commit đọc lại lỗi: cha ghi OK không ném → thành công, cảnh báo chưa xác minh được, KHÔNG dọn bản cũ
  const ok = chen('docChaBH_', () => () => { throw new Error('Không đọc được'); }, () => J(sua(ts, r.maBH, [CT('Z', '2026-01-01', H)])));
  assert.deepEqual(tenCT(ts, r.maBH), ['Z']); assert.ok(ok.canhBao.length >= 1);
  ctx.donChiTietBaoHiemThua(); assert.deepEqual(theHeRaw(r.maBH).map(x => x.split('@')[0]), ['Z']);
});

dat('C1. Gửi lại cùng yêu cầu tạo tài sản (khoaYeuCau) → trả đúng tài sản cũ; hai tài sản thật trùng tên vẫn tạo được; thiếu khoá → từ chối', () => {
  const tt = { khoaYeuCau: 'REQ-1', maHD: hdA.maHD, loai: 'BDS', moTa: 'Nhà xưởng giống tên', giaTri: 1000000 };
  const a = J(ctx.luuTaiSanBaoDam(tt)), b = J(ctx.luuTaiSanBaoDam(tt)); assert.equal(a.maTS, b.maTS); assert.equal(b.trungLap, true);
  assert.equal(ctx.docSheetBaoDam_('TaiSanBaoDam').filter(t => t.MoTa === 'Nhà xưởng giống tên').length, 1);
  const c = J(ctx.luuTaiSanBaoDam(Object.assign({}, tt, { khoaYeuCau: 'REQ-2' }))); assert.notEqual(c.maTS, a.maTS, 'hai tài sản thật trùng tên là hợp lệ');
  assert.throws(() => ctx.luuTaiSanBaoDam({ maHD: hdA.maHD, loai: 'BDS', moTa: 'Thiếu khoá', giaTri: 1 }), /khoá yêu cầu|khoaYeuCau/i);
  assert.throws(() => ctx.luuTaiSanBaoDam(Object.assign({}, tt, { giaTri: 2000000 })), /khoá yêu cầu.*khác|đã dùng/i, 'cùng khoá nhưng nội dung khác bị chặn, không âm thầm trả bản cũ');
});
dat('C2. Hủy/giải chấp bắt buộc expectedRevision ở máy chủ; sai phiên bản → XUNG_DOT kèm dữ liệu hiện tại', () => {
  const ts = taoTS(hdA, 'Cụm C2'), r = luuBH(ts, [CT('K', '2026-01-01', H)]);
  assert.throws(() => ctx.huyBaoHiemTaiSan(r.maBH, 'lý do hủy'), /Thiếu phiên bản/);
  assert.throws(() => ctx.giaiChapTaiSan(ts, 'lý do giải chấp'), /Thiếu phiên bản/);
  assert.throws(() => ctx.huyBaoHiemTaiSan(r.maBH, 'lý do hủy', r.revision + 5), /XUNG_DOT_PHIEN_BAN/);
  assert.equal(bhCua(ts, r.maBH).trangThai, 'Hiệu lực');
  const e = loiCua(() => ctx.giaiChapTaiSan(ts, 'lý do giải chấp', 99)); assert.match(e, /^XUNG_DOT_PHIEN_BAN\|/);
  ctx.huyBaoHiemTaiSan(r.maBH, 'lý do hủy', r.revision); assert.equal(bhCua(ts, r.maBH).trangThai, 'Đã hủy');
});
dat('A4. Dọn không đụng thế hệ hiện hành; lỗi flush SAU chốt vẫn xác minh đúng; xác minh/phục hồi idempotent; mọi thay đổi có dấu vết', () => {
  const ts = taoTS(hdA, 'Cụm A4'), r = luuBH(ts, [CT('Hiện hành', '2026-01-01', H)], { soHDBaoHiem: 'S-A4' });
  const gHienHanh = J(ctx.docSheetBaoDam_('BaoHiemTaiSan')).find(h => h.MaBH === r.maBH).TheHe;
  const d = J(ctx.donChiTietBH_(r.maBH, gHienHanh, 'DUNG', gHienHanh)); assert.equal(d.daDon, false); assert.match(d.loi, /từ chối/); assert.deepEqual(tenCT(ts, r.maBH), ['Hiện hành'], 'thế hệ đang hiển thị không bị xoá');
  // flush lỗi NGAY SAU khi chốt cha: dữ liệu thật đã chốt → đọc lại xác nhận, không dọn nhầm, không báo "chưa lưu"
  const goc = ctx.SpreadsheetApp; let lanFlush = 0; ctx.SpreadsheetApp = Object.assign({}, goc, { flush: () => { if (++lanFlush === 2) throw new Error('Lỗi flush sau chốt'); } });
  let ok; try { ok = J(sua(ts, r.maBH, [CT('Sau flush', '2026-01-01', H, { tienBH: 321 })])); } finally { ctx.SpreadsheetApp = goc; }
  assert.deepEqual([tenCT(ts, r.maBH), bhCua(ts, r.maBH).tong.tienBH], [['Sau flush'], 321]); assert.ok(ok.canhBao.some(x => /đã ĐỌC LẠI và xác nhận/.test(x)), ok.canhBao.join('|'));
  assert.equal(rawCT(r.maBH).length, 1, 'bản cũ chỉ được dọn sau khi đã xác nhận');
  // chưa xác định → xác minh hai lần: kết quả như nhau, không sinh thêm xoá
  chen('capNhatDongTheoMa_', (g) => (t, k, m, c, b) => { g(t, k, m, c, b); if (t === 'BaoHiemTaiSan') throw new Error('Lỗi sau ghi'); }, () => chen('docChaBH_', () => () => { throw new Error('Không đọc được'); }, () => loiCua(() => sua(ts, r.maBH, [CT('Chờ xác minh', '2026-01-01', H)]))));
  const lan1 = J(ctx.xacMinhPhucHoiBaoHiem(r.maBH)), soGD = ctx.docSheetBaoDam_('GiaoDichBaoHiem').length, lan2 = J(ctx.xacMinhPhucHoiBaoHiem(r.maBH));
  assert.deepEqual([lan1.trangThai, lan2.trangThai, tenCT(ts, r.maBH)], ['DA_CHOT', 'DA_CHOT', ['Chờ xác minh']]); assert.equal(ctx.docSheetBaoDam_('GiaoDichBaoHiem').length, soGD, 'lần xác minh thứ hai không làm gì thêm');
  const vet = ctx.docSheetBaoDam_('GiaoDichBaoHiem').filter(x => x.MaBH === r.maBH); assert.ok(vet.some(x => x.TrangThai === 'CHO_CHOT') && vet.some(x => x.TrangThai === 'CHUA_XAC_DINH') && vet.some(x => /^XAC_MINH/.test(x.TrangThai)), vet.map(x => x.TrangThai).join());
  assert.ok(vet.every(x => x.MaGD && x.NguoiGhi && x.ThoiDiemGhi), 'dấu vết có mã giao dịch, người ghi, thời điểm');
  const maGD = new Set(vet.map(x => x.MaGD)); assert.equal(maGD.size >= 3, true, 'mỗi giao dịch có mã riêng');
});
Q.ket('giao dịch ghi bảo hiểm / khoá yêu cầu / phiên bản');
