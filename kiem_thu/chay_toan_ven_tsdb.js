// TOÀN VẸN DỮ LIỆU luồng tài sản thế chấp / bảo hiểm / nhập Excel: cha–con khi lỗi giữa chừng, phiên bản (hai phiên), chống lưu lặp, cảnh báo đồng bộ theo hạng mục, quyền.
// Kiểm tra DỮ LIỆU LƯU THỰC TẾ trong Sheets giả lập (không chỉ thông báo). Chưa chạy trên Google thật.
const assert = require('assert/strict');
const Q = require('./_qlv_chung')('toan_ven_tsdb'), { ctx, mt, G, hopDong, ngay, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const c = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = c; } };
ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' });
const ct0 = G.boDuLieu.getSheetByName('DM_CongTy'); ct0.g.push(ct0.g[0].map(k => ({ MaCty: 'CTY_B', TenCty: 'Công ty B', MaSoThue: '0400000002' })[k] ?? ''));
const hdA = hopDong({ soHopDong: 'HD-A' }), hdB = hopDong({ soHopDong: 'HD-B', maCty: 'CTY_B' });
const taoTS = (hd, moTa, o) => J(ctx.luuTaiSanBaoDam(Object.assign({ khoaYeuCau: 'K' + Math.random(), maHD: hd.maHD, loai: 'BDS', moTa, giaTri: 1000000000 }, o || {}))).maTS;
const dsTS = (hd) => J(ctx.layTaiSanBaoDam(hd.maHD)).rows;
const tsRow = (hd, ma) => dsTS(hd).find(t => t.maTS === ma);
const CT = (ten, tu, den, o) => Object.assign({ maTaiSan: '', tenTaiSan: ten, giaTriBH: 1000, phiBH: 10, tienBH: 0, tuNgay: tu, denNgay: den }, o || {});
const luuBH = (maTS, chiTiet, o) => J(ctx.luuBaoHiemTaiSan(Object.assign({ maTS, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {})));
const bhCua = (ts, maBH) => J(ctx.layBaoHiemTaiSan(ts)).hopDong.find(h => h.maBH === maBH);
const tenCT = (ts, maBH) => bhCua(ts, maBH).chiTiet.map(c => c.tenTaiSan);
const rawCT = (maBH) => ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').filter(c => c.MaBH === maBH);
const sua = (ts, maBH, chiTiet, o) => ctx.luuBaoHiemTaiSan(Object.assign({ maTS: ts, maBH, expectedRevision: bhCua(ts, maBH).revision, ngayKyHD: '2026-01-01', congTyBaoHiem: 'Bảo Việt', soHDBaoHiem: 'S1', chiTiet }, o || {}));
/** Chèn lỗi vào 1 hàm toàn cục của script cho đến khi xong f. */
const chen = (ten, thayThe, f) => { const goc = ctx[ten]; ctx[ten] = thayThe(goc); try { return f(); } finally { ctx[ten] = goc; } };
const A = (d) => d.ngay;
const H = '2026-12-31';

dat('1. Sửa bảo hiểm: lỗi cập nhật HỢP ĐỒNG CHA sau khi con đã ghi → cha và con vẫn nhất quán bản cũ; dọn dở dang và xác minh', () => {
  const ts = taoTS(hdA, 'Cụm kho 1'), r = luuBH(ts, [CT('Kho A', '2026-01-01', H), CT('Kho B', '2026-01-01', H)], { soHDBaoHiem: 'OLD' });
  const loi = chen('capNhatDongTheoMa_', (g) => (t, k, m, c) => { if (t === 'BaoHiemTaiSan') throw new Error('Lỗi giả lập cập nhật cha'); return g(t, k, m, c); }, () => { try { sua(ts, r.maBH, [CT('Kho mới', '2026-01-01', H)], { soHDBaoHiem: 'NEW' }); } catch (e) { return e.message; } return ''; });
  assert.match(loi, /Chưa lưu hợp đồng bảo hiểm/); assert.match(loi, /Dữ liệu cũ còn nguyên/); assert.match(loi, /đã được dọn và xác minh sạch/);
  const h = bhCua(ts, r.maBH); assert.deepEqual([h.soHDBaoHiem, h.chiTiet.map(c => c.tenTaiSan), h.revision], ['OLD', ['Kho A', 'Kho B'], r.revision], 'cha cũ + con cũ + phiên bản không đổi');
  assert.equal(rawCT(r.maBH).length, 2, 'không còn dòng thế hệ mới nào trong sheet'); assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, false);
  const ok = J(sua(ts, r.maBH, [CT('Kho mới', '2026-01-01', H)], { soHDBaoHiem: 'NEW' })); assert.deepEqual([bhCua(ts, r.maBH).soHDBaoHiem, tenCT(ts, r.maBH), ok.revision], ['NEW', ['Kho mới'], r.revision + 1]);
  assert.equal(rawCT(r.maBH).length, 1, 'thế hệ cũ đã dọn');
});
dat('2. Lỗi ở từng bước: ghi con, dọn, khôi phục, flush, commit "lỗi nhưng đã ghi", dọn thế hệ cũ, việc phụ sau lưu', () => {
  const ts = taoTS(hdA, 'Cụm kho 2'), r = luuBH(ts, [CT('K1', '2026-01-01', H), CT('K2', '2026-01-01', H)], { soHDBaoHiem: 'S-STEP' });
  const cu = () => tenCT(ts, r.maBH).join();
  // a) ghi dòng con thứ 2 lỗi
  const a = chen('ghiNhieuDong_', (g) => (t, c, ds, b) => { if (t === 'BaoHiemTaiSanChiTiet' && ds.some(o => o.TenTaiSan === 'N2')) { g(t, c, ds.slice(0, 1), b); throw new Error('Lỗi ghi con'); } return g(t, c, ds, b); }, () => { try { sua(ts, r.maBH, [CT('N1', '2026-01-01', H), CT('N2', '2026-01-01', H)]); } catch (e) { return e.message; } });
  assert.match(a, /lỗi ghi chi tiết: Lỗi ghi con/); assert.equal(cu(), 'K1,K2'); assert.equal(rawCT(r.maBH).length, 2, 'dòng ghi dở đã dọn');
  // b) ghi con lỗi VÀ dọn cũng lỗi → vẫn nhất quán, báo CHƯA dọn, có trạng thái cần phục hồi, Quản trị dọn được
  const b = chen('ghiNhieuDong_', (g) => (t, c, ds, b) => { if (t === 'BaoHiemTaiSanChiTiet' && ds.some(o => o.TenTaiSan === 'N2')) { g(t, c, ds.slice(0, 1), b); throw new Error('Lỗi ghi con'); } return g(t, c, ds, b); }, () => chen('xoaDongAnToan_', (gx) => () => { throw new Error('Lỗi xoá'); }, () => { try { sua(ts, r.maBH, [CT('N1', '2026-01-01', H), CT('N2', '2026-01-01', H)]); } catch (e) { return e.message; } }));
  assert.match(b, /CHƯA dọn được/); assert.doesNotMatch(b, /đã được dọn và xác minh sạch/); assert.equal(cu(), 'K1,K2', 'người đọc vẫn thấy đúng bản cũ');
  const tt = J(ctx.layTrangThaiToanVenBaoHiem()); assert.deepEqual([tt.canPhucHoi, tt.dongMoCoi + tt.dongTheHeCu], [true, 1]); assert.equal(rawCT(r.maBH).length, 3, 'còn 1 dòng thế hệ chờ (vô hình)');
  assert.throws(() => voi('xem@example.com', () => ctx.api('', 'donChiTietBaoHiemThua', [])), /QUYEN|quyền/); const don = J(ctx.donChiTietBaoHiemThua()); assert.equal(don.daXoa, 1); assert.equal(don.conLai.canPhucHoi, false); assert.equal(rawCT(r.maBH).length, 2);
  // c) flush lỗi ở bước ghi con
  const flushGoc = ctx.SpreadsheetApp; ctx.SpreadsheetApp = Object.assign({}, flushGoc, { flush: () => { throw new Error('Lỗi flush'); } });
  let c; try { try { sua(ts, r.maBH, [CT('F1', '2026-01-01', H)]); } catch (e) { c = e.message; } } finally { ctx.SpreadsheetApp = flushGoc; }
  assert.match(c, /Chưa lưu hợp đồng bảo hiểm/); assert.equal(cu(), 'K1,K2'); assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, false, 'flush lỗi cũng được dọn');
  // d) commit báo lỗi nhưng THỰC RA đã ghi → đọc lại xác minh, coi là đã lưu
  const d = chen('capNhatDongTheoMa_', (g) => (t, k, m, cot) => { g(t, k, m, cot); if (t === 'BaoHiemTaiSan') throw new Error('Lỗi sau khi ghi'); }, () => J(sua(ts, r.maBH, [CT('D1', '2026-01-01', H)])));
  assert.equal(cu(), 'D1'); assert.ok(d.canhBao.some(x => /đã ĐỌC LẠI và xác nhận/.test(x))); assert.equal(rawCT(r.maBH).length, 1, 'đã dọn thế hệ cũ');
  // e) dọn thế hệ cũ lỗi SAU commit → vẫn lưu, cảnh báo, trạng thái cần dọn
  const e5 = chen('xoaDongAnToan_', () => () => { throw new Error('Lỗi xoá'); }, () => J(sua(ts, r.maBH, [CT('E1', '2026-01-01', H)])));
  assert.equal(cu(), 'E1'); assert.ok(e5.canhBao.some(x => /chưa dọn được 1 dòng chi tiết bản cũ/.test(x))); assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, true); ctx.donChiTietBaoHiemThua(); assert.equal(rawCT(r.maBH).length, 1);
  // f) việc phụ sau lưu: thêm công ty vào Khách hàng và nhật ký lỗi → KHÔNG ném lỗi, báo cảnh báo, dữ liệu đã lưu
  const f = chen('themCongTyBaoHiem_', () => () => { throw new Error('Lỗi khách hàng'); }, () => chen('ghiNhatKy_', (g) => (a, b2, c2) => { if (b2 === 'SUA_BAO_HIEM_TAI_SAN') throw new Error('Lỗi nhật ký'); return g(a, b2, c2); }, () => J(sua(ts, r.maBH, [CT('P1', '2026-01-01', H)], { congTyBaoHiem: 'Công ty lạ' }))));
  assert.equal(cu(), 'P1'); assert.equal(bhCua(ts, r.maBH).congTyBaoHiem, 'Công ty lạ'); assert.equal(f.canhBao.length, 2); assert.match(f.canhBao.join(' '), /ĐÃ lưu.*chưa thêm được công ty/); assert.match(f.canhBao.join(' '), /ĐÃ lưu.*chưa ghi được nhật ký/);
});
dat('3. Thêm mới bảo hiểm: lỗi ghi cha → không có hợp đồng hiển thị, con mồ côi đã dọn; chạy lại tạo đúng 1 hợp đồng', () => {
  const ts = taoTS(hdA, 'Kho mới tạo'), them = () => luuBH(ts, [CT('X1', '2026-01-01', H), CT('X2', '2026-01-01', H)], { soHDBaoHiem: 'S-NEW' });
  const loi = chen('ghiDongMoi_', (g) => (t, c, o) => { if (t === 'BaoHiemTaiSan') throw new Error('Lỗi ghi cha'); return g(t, c, o); }, () => { try { them(); } catch (e) { return e.message; } });
  assert.match(loi, /Chưa lưu hợp đồng bảo hiểm.*lỗi cập nhật hợp đồng: Lỗi ghi cha/); assert.equal(J(ctx.layBaoHiemTaiSan(ts)).hopDong.length, 0); assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).canPhucHoi, false);
  const r = them(); assert.equal(J(ctx.layBaoHiemTaiSan(ts)).hopDong.length, 1); assert.deepEqual(tenCT(ts, r.maBH), ['X1', 'X2']);
  // con mồ côi do lỗi dọn → vô hình, không làm sai tổng/cảnh báo
  const ts2 = taoTS(hdA, 'Kho mồ côi');
  chen('ghiDongMoi_', (g) => (t, c, o) => { if (t === 'BaoHiemTaiSan') throw new Error('x'); return g(t, c, o); }, () => chen('xoaDongAnToan_', () => () => { throw new Error('y'); }, () => { try { luuBH(ts2, [CT('Y1', '2026-01-01', H)]); } catch (e) { /* mong đợi */ } }));
  assert.equal(J(ctx.layBaoHiemTaiSan(ts2)).hopDong.length, 0); assert.equal(tsRow(hdA, ts2).canhBaoBaoHiem, ''); assert.equal(J(ctx.layTrangThaiToanVenBaoHiem()).dongMoCoi, 1); ctx.donChiTietBaoHiemThua();
});
const xlsx = (dong, tieuDe) => { ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [tieuDe || ['Tên tài sản', 'Giá trị định giá', 'Khấu hao', 'Nguyên giá', 'Công ty bảo hiểm', 'Số HĐ bảo hiểm', 'Ngày ký hợp đồng bảo hiểm', 'Giá trị bảo hiểm', 'Phí bảo hiểm', 'Bảo hiểm từ ngày', 'Đến ngày'], ...dong] }]; };
const xem = (hd) => J(ctx.xemTruocCapNhatTSDB({ maHD: hd.maHD, base64: 'eA==' }));
const apDung = (hd, x) => J(ctx.apDungCapNhatTSDB({ maHD: hd.maHD, dong: x.dong }));
const dongBH = (ten, phi, den, extra) => [ten, 5000000, '', '', 'PVI', 'EX-1', '01/02/2026', 777, phi, '01/02/2026', den || '01/02/2027'].concat(extra || []);
dat('4. Nhập Excel: lỗi ghi bảo hiểm (thêm mới và cập nhật) → không dữ liệu dở dang; trạng thái nói đúng; chạy lại', () => {
  xlsx([dongBH('Máy Excel 1', 100)]); const x = xem(hdA);
  const k = chen('ghiDongMoi_', (g) => (t, c, o) => { if (t === 'BaoHiemTaiSan') throw new Error('Lỗi ghi cha'); return g(t, c, o); }, () => apDung(hdA, x));
  assert.deepEqual([k.ok, k.taoMoi, k.bhThem, k.loiBH.length, k.canPhucHoi], [false, 1, 0, 1, false]); assert.match(k.loiBH[0].loi, /Chưa lưu hợp đồng bảo hiểm.*đã được dọn và xác minh sạch/);
  const ts = dsTS(hdA).find(t => t.moTa === 'Máy Excel 1'); assert.ok(ts, 'tài sản đã ghi (nói rõ trong loiBH)'); assert.equal(J(ctx.layBaoHiemTaiSan(ts.maTS)).hopDong.length, 0);
  const x2 = xem(hdA); assert.deepEqual([x2.dong[0].hanhDongTS, x2.dong[0].hanhDongBH], ['CAP_NHAT', 'THEM']); const k2 = apDung(hdA, x2); assert.deepEqual([k2.ok, k2.bhThem, k2.taoMoi], [true, 1, 0]);
  const bh1 = J(ctx.layBaoHiemTaiSan(ts.maTS)).hopDong[0]; assert.deepEqual([bh1.chiTiet.length, bh1.chiTiet[0].phiBH], [1, 100]);
  // cập nhật hợp đồng sẵn có (đổi phí) nhưng ghi cha lỗi → bản cũ còn nguyên
  xlsx([dongBH('Máy Excel 1', 250)]); const x3 = xem(hdA); assert.equal(x3.dong[0].hanhDongBH, 'CAP_NHAT');
  const k3 = chen('capNhatDongTheoMa_', (g) => (t, kk, m, c) => { if (t === 'BaoHiemTaiSan') throw new Error('Lỗi cập nhật cha'); return g(t, kk, m, c); }, () => apDung(hdA, x3));
  assert.deepEqual([k3.ok, k3.loiBH.length, k3.bhCapNhat], [false, 1, 0]); assert.equal(J(ctx.layBaoHiemTaiSan(ts.maTS)).hopDong[0].chiTiet[0].phiBH, 100, 'phí cũ còn nguyên (nhất quán)');
});
dat('5. Excel cùng khoá bảo hiểm nhưng ĐỔI ngày/phí/số tiền → CẬP NHẬT (không bỏ qua như bản trùng); trùng hệt → DA_CO; ô trống giữ số cũ, số 0 ghi đè', () => {
  xlsx([dongBH('Máy khoá', 100)]); apDung(hdA, xem(hdA));
  const ts = dsTS(hdA).find(t => t.moTa === 'Máy khoá').maTS, lay = () => J(ctx.layBaoHiemTaiSan(ts)).hopDong[0].chiTiet[0];
  xlsx([dongBH('Máy khoá', 100)]); assert.equal(xem(hdA).dong[0].hanhDongBH, 'DA_CO');
  xlsx([dongBH('Máy khoá', 100, '01/08/2027')]); const xn = xem(hdA); assert.deepEqual([xn.dong[0].hanhDongBH, xn.dong[0].bhThayDoi], ['CAP_NHAT', ['đến ngày 2027-02-01 → 2027-08-01']]);
  const kn = apDung(hdA, xn); assert.deepEqual([kn.bhCapNhat, kn.bhThem, kn.bhDaCo], [1, 0, 0]); assert.equal(lay().denNgay, '2027-08-01'); assert.equal(J(ctx.layBaoHiemTaiSan(ts)).hopDong.length, 1, 'không tạo hợp đồng thứ hai');
  xlsx([['Máy khoá', 5000000, '', '', 'PVI', 'EX-1', '01/02/2026', 777, '', '01/02/2026', '01/08/2027']]); const xt = xem(hdA); assert.equal(xt.dong[0].hanhDongBH, 'DA_CO', 'ô phí trống = không đổi (giữ 100)'); assert.equal(lay().phiBH, 100);
  xlsx([['Máy khoá', 5000000, '', '', 'PVI', 'EX-1', '01/02/2026', 777, 0, '01/02/2026', '01/08/2027']]); const x0 = xem(hdA); assert.deepEqual([x0.dong[0].hanhDongBH, x0.dong[0].bhThayDoi], ['CAP_NHAT', ['phí BH 100 → 0']]); apDung(hdA, x0); assert.equal(lay().phiBH, 0, 'số 0 chủ động ghi đè');
  xlsx([dongBH('Máy khoá', 100, '01/08/2027', [])]); const xs = xem(hdA); xs.dong[0].raw.tienBH = 9000; xlsx([['Máy khoá', 5000000, '', '', 'PVI', 'EX-1', '01/02/2026', 777, 100, '01/02/2026', '01/08/2027']]);
});
dat('6. Nhiều dòng Excel cùng 1 tài sản: dòng sau thấy số do dòng trước vừa ghi; trùng tên mới trong file không tạo hai tài sản', () => {
  const ts = taoTS(hdA, 'Máy tuần tự', { nguyenGia: 1000, khauHao: 100 });
  xlsx([['Máy tuần tự', '', 300, '', '', '', '', '', '', '', ''], ['Máy tuần tự', '', '', 200, '', '', '', '', '', '', '']]);
  const x = xem(hdA); assert.equal(x.dong[0].hanhDongTS, 'CAP_NHAT'); assert.equal(x.dong[1].hanhDongTS, 'LOI'); assert.match(x.dong[1].loi.join(' '), /Khấu hao \(300\) không được lớn hơn nguyên giá \(200\)/, 'xem trước mô phỏng tuần tự');
  const k = apDung(hdA, x); assert.deepEqual([k.capNhat, k.boQua.length], [1, 1]); const r = tsRow(hdA, ts); assert.deepEqual([r.nguyenGia, r.khauHao, r.giaTriConLai], [1000, 300, 700], 'dòng 1 ghi, dòng 2 bị chặn');
  xlsx([['Máy mới trùng', 700, 50, 500, '', '', '', '', '', '', ''], ['Máy mới trùng', 800, 60, '', '', '', '', '', '', '', '']]);
  const x2 = xem(hdA); assert.deepEqual([x2.dong[0].hanhDongTS, x2.dong[1].hanhDongTS], ['TAO_MOI', 'CAP_NHAT']); assert.match(x2.dong[1].canhBao.join(' '), /Trùng tài sản với dòng/);
  const k2 = apDung(hdA, x2); assert.deepEqual([k2.taoMoi, k2.capNhat], [1, 1]); const moi = dsTS(hdA).filter(t => t.moTa === 'Máy mới trùng'); assert.equal(moi.length, 1); assert.deepEqual([moi[0].giaTri, moi[0].khauHao, moi[0].nguyenGia, moi[0].giaTriConLai], [800, 60, 500, 440]);
});
dat('7. Hai phiên cùng sửa: expectedRevision bắt buộc; phiên đọc cũ bị từ chối; không ghi đè; Excel xem trước rồi người khác sửa → dòng bị từ chối', () => {
  const ts = taoTS(hdA, 'TS hai phiên'), s0 = tsRow(hdA, ts).revision;
  assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'Không phiên bản', giaTri: 5 }), /Thiếu phiên bản/);
  const goiA = ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'Phiên A', giaTri: 111, expectedRevision: s0 }); assert.equal(J(goiA).revision, s0 + 1);
  assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'Phiên B cũ', giaTri: 222, expectedRevision: s0 }), /XUNG_DOT_PHIEN_BAN\|\d+\|Tài sản .* đã được người khác thay đổi/);
  assert.deepEqual([tsRow(hdA, ts).moTa, tsRow(hdA, ts).giaTri], ['Phiên A', 111], 'phiên B không ghi đè phiên A');
  assert.throws(() => ctx.giaiChapTaiSan(ts, 'giải chấp thử', s0), /XUNG_DOT_PHIEN_BAN/);
  const r = luuBH(ts, [CT('H', '2026-01-01', H)], { soHDBaoHiem: 'S-2P' }), v0 = bhCua(ts, r.maBH).revision;
  assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: ts, maBH: r.maBH, ngayKyHD: '2026-01-01', congTyBaoHiem: 'BV', chiTiet: [CT('H', '2026-01-01', H)] }), /Thiếu phiên bản/);
  J(sua(ts, r.maBH, [CT('H', '2026-01-01', H, { phiBH: 55 })], { soHDBaoHiem: 'S-2P' })); assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: ts, maBH: r.maBH, expectedRevision: v0, ngayKyHD: '2026-01-01', congTyBaoHiem: 'BV', chiTiet: [CT('H', '2026-01-01', H, { phiBH: 99 })] }), /XUNG_DOT_PHIEN_BAN/);
  assert.equal(bhCua(ts, r.maBH).chiTiet[0].phiBH, 55); assert.throws(() => ctx.huyBaoHiemTaiSan(r.maBH, 'hủy thử', v0), /XUNG_DOT_PHIEN_BAN/); assert.equal(bhCua(ts, r.maBH).trangThai, 'Hiệu lực');
  // Excel: xem trước → người khác sửa tài sản → áp dụng bị từ chối đúng dòng; bảo hiểm cũng vậy
  xlsx([['Phiên A', 999, '', '', 'Bảo Việt', 'S-2P', '01/01/2026', 1, 77, '01/01/2026', '31/12/2026']]); const xx = xem(hdA); assert.deepEqual([xx.dong[0].hanhDongTS, xx.dong[0].hanhDongBH], ['CAP_NHAT', 'CAP_NHAT']);
  ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'Phiên A', giaTri: 333, expectedRevision: tsRow(hdA, ts).revision });
  const kx = apDung(hdA, xx); assert.deepEqual([kx.capNhat, kx.boQua.length], [0, 1]); assert.match(kx.boQua[0].loi, /đã được người khác thay đổi sau khi bạn xem trước/); assert.deepEqual([tsRow(hdA, ts).giaTri, bhCua(ts, r.maBH).chiTiet[0].phiBH], [333, 55], 'không ghi đè giá trị 999 của file cũ');
  xlsx([['Phiên A', 999, '', '', 'Bảo Việt', 'S-2P', '01/01/2026', 1, 77, '01/01/2026', '31/12/2026']]); const xx2 = xem(hdA); J(sua(ts, r.maBH, [CT('H', '2026-01-01', H, { phiBH: 60 })], { soHDBaoHiem: 'S-2P' })); const kx2 = apDung(hdA, xx2); assert.equal(kx2.boQua.length, 1, 'tài sản chưa đổi nhưng HĐ bảo hiểm đã bị sửa → từ chối'); assert.equal(bhCua(ts, r.maBH).chiTiet[0].phiBH, 60);
  const xt = xem(hdA); delete xt.dong[0].revisionTS; assert.match(J(ctx.apDungCapNhatTSDB({ maHD: hdA.maHD, dong: xt.dong })).boQua[0].loi, /Thiếu phiên bản tài sản/);
});
dat('8. Gửi lại sau mất phản hồi: tạo không nhân đôi (dữ liệu thực); sửa gửi lại bị chặn bởi phiên bản, không nhân dòng', () => {
  const ts = taoTS(hdA, 'TS gửi lại'), yc = { maTS: ts, ngayKyHD: '2026-03-01', congTyBaoHiem: 'PTI', soHDBaoHiem: 'S-RE', chiTiet: [CT('TS gửi lại', '2026-03-01', '2027-03-01')] };
  const a = J(ctx.luuBaoHiemTaiSan(yc)), b = J(ctx.luuBaoHiemTaiSan(yc)); assert.deepEqual([b.trungLap, b.maBH], [true, a.maBH]); assert.equal(ctx.docSheetBaoDam_('BaoHiemTaiSan').filter(h => h.MaTS === ts).length, 1); assert.equal(ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').filter(c => c.MaBH === a.maBH).length, 1);
  const ycSua = Object.assign({}, yc, { maBH: a.maBH, expectedRevision: a.revision, chiTiet: [CT('TS gửi lại', '2026-03-01', '2027-03-01', { phiBH: 5 })] }); ctx.luuBaoHiemTaiSan(ycSua);
  assert.throws(() => ctx.luuBaoHiemTaiSan(ycSua), /XUNG_DOT_PHIEN_BAN/); assert.equal(rawCT(a.maBH).length, 1, 'gửi lại không nhân dòng chi tiết'); assert.equal(ctx.docSheetBaoDam_('BaoHiemTaiSan').filter(h => h.MaTS === ts).length, 1);
});
dat('9. Ngày và tiền: cùng quy tắc nhập tay/Excel; phân cách nghìn đúng; ô trống ≠ 0', () => {
  const tuongLai = ngay(30), ts = taoTS(hdA, 'TS ngày tiền');
  assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: ts, ngayKyHD: tuongLai, congTyBaoHiem: 'BV', chiTiet: [CT('x', '2026-01-01', H)] }), /tương lai/);
  assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'x ngày', giaTri: 5, ngayDinhGia: tuongLai, expectedRevision: tsRow(hdA, ts).revision }), /tương lai/);
  xlsx([['TS ngày tiền', 100, '', '', 'BV', 'S', tuongLai.split('-').reverse().join('/'), 1, 1, '01/01/2026', '31/12/2026']]); assert.match(xem(hdA).dong[0].loi.join(' '), /Ngày ký hợp đồng bảo hiểm.*tương lai/, 'Excel cùng quy tắc ngày ký');
  xlsx([['TS ngày tiền', 100, '', '', '', '', '', '', '', '', '']], ['Tên tài sản', 'Giá trị định giá', 'Khấu hao', 'Nguyên giá', 'Ngày định giá', 'x', 'y', 'z', 'w', 'u', 'v']); ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Tên tài sản', 'Giá trị định giá', 'Ngày định giá'], ['TS ngày tiền', 100, tuongLai.split('-').reverse().join('/')]] }]; assert.match(xem(hdA).dong[0].loi.join(' '), /Ngày định giá.*tương lai/, 'ngày định giá cùng quy tắc');
  const d = (v) => { ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Tên tài sản', 'Giá trị định giá'], ['TS tiền ' + String(v), v]] }]; return xem(hdA).dong[0]; };
  assert.deepEqual([d('1.234.567').dinhGia, d('1,234,567').dinhGia, d(1234567).dinhGia, d('1.234').dinhGia], [1234567, 1234567, 1234567, 1234], 'nhóm nghìn kiểu VN/US');
  assert.match(d('12,5').loi.join(' '), /thập phân/); assert.match(d('1.234,5').loi.join(' '), /thập phân/);
  ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Tên tài sản', 'Nguyên giá', 'Khấu hao'], ['TS ngày tiền', 0, 300]] }]; const z = xem(hdA).dong[0]; assert.equal(z.hanhDongTS, 'LOI'); assert.match(z.loi.join(' '), /Khấu hao \(300\) lớn hơn nguyên giá \(0\)/, 'số 0 là số 0, không phải ô trống');
  ctx.docSheetTuExcel_ = () => [{ ten: 'x', values: [['Tên tài sản', 'Nguyên giá', 'Khấu hao'], ['TS ngày tiền', '', 300]] }]; assert.equal(xem(hdA).dong[0].hanhDongTS, 'CAP_NHAT', 'ô trống = không nhập');
});
dat('10. Cảnh báo bảo hiểm ĐỒNG BỘ giữa bảng tài sản, modal bảo hiểm và Tổng quan; theo hạng mục; phân biệt hợp đồng riêng với bảo vệ hiện tại', () => {
  const qh = () => J(ctx.layTongQuanHoSo({ boQuaCache: true })).quanLyVay.chiTietBaoHiem;
  // a) Kho A hết hôm qua, Kho B còn 100 ngày
  const a = taoTS(hdA, 'Cụm A'), ra = luuBH(a, [CT('Kho A', ngay(-300), ngay(-1)), CT('Kho B', ngay(-300), ngay(100))], { soHDBaoHiem: 'SY-A' });
  const ta = tsRow(hdA, a), ba = J(ctx.layBaoHiemTaiSan(a));
  assert.deepEqual([ta.canhBaoBaoHiem, ta.hangMucBaoHiem, ta.ngayHetHanBaoHiem], ['QUA_HAN', 'Kho A', ngay(-1)]); assert.deepEqual([ba.baoVe.tinhTrang, ba.baoVe.hangMuc, ba.baoVe.ngayHetHan], ['QUA_HAN', 'Kho A', ngay(-1)]); assert.equal(ba.hopDong[0].canhBao, 'QUA_HAN', 'hợp đồng KHÔNG còn báo rỗng');
  assert.ok(ba.hopDong[0].chiTiet.find(c => c.tenTaiSan === 'Kho A').tinhTrang === 'QUA_HAN' && ba.hopDong[0].chiTiet.find(c => c.tenTaiSan === 'Kho B').tinhTrang === 'DANG_BAO_HIEM'); const qa = qh().find(d => d.maTS === a); assert.deepEqual([qa.muc, qa.hangMuc, qa.han], ['QUA_HAN', 'Kho A', ngay(-1)]);
  // b) bắt đầu tương lai: không dùng ngày bắt đầu làm hạn
  const b = taoTS(hdA, 'Nhà tương lai'), rb = luuBH(b, [CT('Nhà', ngay(20), ngay(200))], { soHDBaoHiem: 'SY-B' }), tb = tsRow(hdA, b), bb = J(ctx.layBaoHiemTaiSan(b));
  assert.deepEqual([tb.canhBaoBaoHiem, tb.ngayHetHanBaoHiem, tb.ngayBatDauBaoHiem, tb.soNgayBaoHiem], ['CHUA_BAT_DAU', '', ngay(20), 20]); assert.deepEqual([bb.baoVe.tinhTrang, bb.baoVe.ngayBatDau, bb.baoVe.ngayHetHan, bb.hopDong[0].canhBao], ['CHUA_BAT_DAU', ngay(20), '', 'CHUA_BAT_DAU']); assert.equal(qh().find(d => d.maTS === b).muc, 'CHUA_BAT_DAU');
  // c) gia hạn liền ngày; d) chồng ngày: hợp đồng cũ không báo, tài sản không báo
  for (const [ten, tu2] of [['Xưởng liền', ngay(6)], ['Xưởng chồng', ngay(-3)]]) {
    const c = taoTS(hdA, ten), c1 = luuBH(c, [CT('Xưởng', ngay(-200), ngay(5))], { soHDBaoHiem: 'C1-' + ten }), c2 = luuBH(c, [CT('Xưởng', tu2, ngay(365))], { soHDBaoHiem: 'C2-' + ten }), bc = J(ctx.layBaoHiemTaiSan(c));
    assert.deepEqual([tsRow(hdA, c).canhBaoBaoHiem, tsRow(hdA, c).ngayHetHanBaoHiem, bc.baoVe.canhBao], ['', ngay(365), ''], ten); assert.deepEqual([bc.hopDong.find(h => h.maBH === c1.maBH).tinhTrangRieng, bc.hopDong.find(h => h.maBH === c1.maBH).canhBao, bc.hopDong.find(h => h.maBH === c2.maBH).canhBao], ['DANG_BAO_HIEM', '', ''], 'hợp đồng cũ còn hạn ' + ten); assert.ok(!qh().some(d => d.maTS === c));
  }
  const dc = taoTS(hdA, 'Xưởng đã gia hạn'), d1 = luuBH(dc, [CT('Xưởng', ngay(-400), ngay(-30))], { soHDBaoHiem: 'D1' }), d2 = luuBH(dc, [CT('Xưởng', ngay(-29), ngay(365))], { soHDBaoHiem: 'D2' }), bd = J(ctx.layBaoHiemTaiSan(dc));
  assert.deepEqual([bd.hopDong.find(h => h.maBH === d1.maBH).tinhTrangRieng, bd.hopDong.find(h => h.maBH === d1.maBH).canhBao, tsRow(hdA, dc).canhBaoBaoHiem], ['DA_GIA_HAN', '', ''], 'hợp đồng cũ đã hết nhưng được gia hạn liên tục → không báo');
  // e) khoảng trống
  const e = taoTS(hdA, 'Xưởng hở'), e1 = luuBH(e, [CT('Xưởng', ngay(-200), ngay(-50))], { soHDBaoHiem: 'E1' }), e2 = luuBH(e, [CT('Xưởng', ngay(30), ngay(365))], { soHDBaoHiem: 'E2' }), be = J(ctx.layBaoHiemTaiSan(e)), te = tsRow(hdA, e);
  assert.deepEqual([te.canhBaoBaoHiem, te.ngayHetHanBaoHiem, te.ngayBatDauBaoHiem, te.hangMucBaoHiem], ['KHOANG_TRONG', ngay(-50), ngay(30), 'Xưởng']); assert.deepEqual([be.baoVe.tinhTrang, be.hopDong.find(h => h.maBH === e1.maBH).canhBao, be.hopDong.find(h => h.maBH === e2.maBH).canhBao], ['KHOANG_TRONG', 'QUA_HAN', 'CHUA_BAT_DAU']); assert.equal(qh().find(d => d.maTS === e).muc, 'KHOANG_TRONG');
  // f) sắp hết; tổng hợp theo hợp đồng đếm đúng
  const f = taoTS(hdA, 'Xưởng sắp hết'); luuBH(f, [CT('Xưởng', ngay(-100), ngay(7))], { soHDBaoHiem: 'F1' }); assert.deepEqual([tsRow(hdA, f).canhBaoBaoHiem, tsRow(hdA, f).soNgayBaoHiem], ['SAP_HET', 7]);
  const tom = J(ctx.tomTatBaoDamTheoHD_())[hdA.maHD]; assert.ok(tom.quaHanBaoHiem >= 3 && tom.sapHetBaoHiem >= 1);
});
dat('11. Quyền, giải chấp, hủy: chỉ xem bị chặn; giới hạn công ty (gốc và đích); giải chấp không sửa/thêm bảo hiểm; hủy/giải chấp không xoá lịch sử', () => {
  const ts = taoTS(hdA, 'TS quyền'), r = luuBH(ts, [CT('Q', '2026-01-01', H)], { soHDBaoHiem: 'S-Q' }), tsB = taoTS(hdB, 'TS của B'), rB = luuBH(tsB, [CT('QB', '2026-01-01', H)], { soHDBaoHiem: 'S-QB' });
  const revTS = tsRow(hdA, ts).revision, revBH = bhCua(ts, r.maBH).revision, revTSB = tsRow(hdB, tsB).revision, revBHB = bhCua(tsB, rB.maBH).revision;
  voi('xem@example.com', () => {
    assert.throws(() => ctx.api('', 'luuTaiSanBaoDam', [{ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'xem sửa', giaTri: 5, expectedRevision: revTS }]), /QUYEN|quyền/);
    assert.throws(() => ctx.api('', 'luuBaoHiemTaiSan', [{ maTS: ts, maBH: r.maBH, expectedRevision: revBH, ngayKyHD: '2026-01-01', congTyBaoHiem: 'BV', chiTiet: [CT('Q', '2026-01-01', H)] }]), /QUYEN|quyền/);
    assert.throws(() => ctx.api('', 'huyBaoHiemTaiSan', [r.maBH, 'xem hủy']), /QUYEN|quyền/); assert.throws(() => ctx.api('', 'giaiChapTaiSan', [ts, 'xem giải chấp']), /QUYEN|quyền/);
    assert.throws(() => ctx.api('', 'apDungCapNhatTSDB', [{ maHD: hdA.maHD, dong: [{}] }]), /QUYEN|quyền/); assert.equal(J(ctx.api('', 'layBaoHiemTaiSan', [ts])).hopDong.length, 1, 'vẫn đọc được');
  });
  const g = ctx.phamViCongTyNguoiDung_; ctx.phamViCongTyNguoiDung_ = () => [hdA.maCty];
  try {
    assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: tsB, maBH: rB.maBH, expectedRevision: revBHB, ngayKyHD: '2026-01-01', congTyBaoHiem: 'BV', chiTiet: [CT('QB', '2026-01-01', H)] }), /phạm vi/);
    assert.throws(() => ctx.huyBaoHiemTaiSan(rB.maBH, 'ngoài phạm vi'), /phạm vi/); assert.throws(() => ctx.giaiChapTaiSan(tsB, 'ngoài phạm vi'), /phạm vi/);
    assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdB.maHD, loai: 'BDS', moTa: 'chuyển sang B', giaTri: 5, expectedRevision: revTS }), /phạm vi/, 'hợp đồng ĐÍCH ngoài phạm vi');
    assert.throws(() => ctx.layBaoHiemTaiSan(tsB), /phạm vi/); assert.throws(() => ctx.xemTruocCapNhatTSDB({ maHD: hdB.maHD, base64: 'eA==' }), /phạm vi/);
  } finally { ctx.phamViCongTyNguoiDung_ = g; }
  assert.deepEqual([tsRow(hdB, tsB).moTa, tsRow(hdB, tsB).revision, bhCua(tsB, rB.maBH).trangThai, tsRow(hdA, ts).hopDongDich], ['TS của B', revTSB, 'Hiệu lực', undefined], 'không thay đổi dữ liệu ngoài phạm vi');
  const cuDem = [ctx.docSheetBaoDam_('TaiSanBaoDam').length, ctx.docSheetBaoDam_('BaoHiemTaiSan').length, ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').length];
  ctx.huyBaoHiemTaiSan(r.maBH, 'ký nhầm', revBH); assert.deepEqual([ctx.docSheetBaoDam_('BaoHiemTaiSan').length, ctx.docSheetBaoDam_('BaoHiemTaiSanChiTiet').length], [cuDem[1], cuDem[2]], 'hủy không xoá dòng nào'); const h = J(ctx.layBaoHiemTaiSan(ts)).hopDong[0]; assert.deepEqual([h.trangThai, h.lyDoHuy, h.chiTiet.length], ['Đã hủy', 'ký nhầm', 1], 'lịch sử và chi tiết còn');
  const r2 = luuBH(ts, [CT('Q2', '2026-01-01', H)], { soHDBaoHiem: 'S-Q2' }); ctx.giaiChapTaiSan(ts, 'Giải chấp thử nghiệm', tsRow(hdA, ts).revision);
  assert.deepEqual([tsRow(hdA, ts).trangThai, J(ctx.layBaoHiemTaiSan(ts)).hopDong.length, ctx.docSheetBaoDam_('TaiSanBaoDam').length], ['Đã giải chấp', 2, cuDem[0]], 'giải chấp giữ nguyên bảo hiểm và lịch sử');
  assert.throws(() => luuBH(ts, [CT('Q3', '2026-01-01', H)], { soHDBaoHiem: 'S-Q3' }), /đã giải chấp/); assert.throws(() => ctx.luuBaoHiemTaiSan({ maTS: ts, maBH: r2.maBH, expectedRevision: r2.revision, ngayKyHD: '2026-01-01', congTyBaoHiem: 'BV', chiTiet: [CT('Q2', '2026-01-01', H)] }), /đã giải chấp/);
  assert.throws(() => ctx.luuTaiSanBaoDam({ maTS: ts, maHD: hdA.maHD, loai: 'BDS', moTa: 'sửa sau giải chấp', giaTri: 5, expectedRevision: tsRow(hdA, ts).revision }), /đã giải chấp/);
  xlsx([['TS quyền', 5]]); assert.match(xem(hdA).dong[0].canhBao.join(' ') + xem(hdA).dong[0].hanhDongTS, /TAO_MOI/, 'tên trùng tài sản đã giải chấp → tạo tài sản mới, không sửa bản đã giải chấp'); assert.equal(tsRow(hdA, ts).moTa, 'TS quyền');
  assert.equal(tsRow(hdA, ts).canhBaoBaoHiem, '', 'tài sản đã giải chấp không cảnh báo bảo hiểm');
});
(async () => {
  const fs = require('fs'), path = require('path');
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA phần giao diện: chưa cài Playwright'); Q.ket('toàn vẹn dữ liệu tài sản thế chấp / bảo hiểm / Excel'); return; }
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium'); Q.ket('toàn vẹn dữ liệu tài sản thế chấp / bảo hiểm / Excel'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://tv.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://tv.test');
    const kq = await p.evaluate(async () => {
      const goi = [], cho = () => new Promise(r => setTimeout(r, 40)), txt = (id) => document.getElementById(id).textContent;
      const rows = [
        { maTS: 'TS-1', maHD: 'HD1', soHopDong: 'HD-A', nhanLoai: 'BĐS', moTa: 'Chưa bắt đầu', giaTri: 100, nguyenGia: 300, khauHao: 200, giaTriConLai: 100, ngayDinhGia: '', ngayHetHanBaoHiem: '', ngayBatDauBaoHiem: '2026-12-01', hangMucBaoHiem: 'Nhà A', canhBaoBaoHiem: 'CHUA_BAT_DAU', soNgayBaoHiem: 20, soHopDongBaoHiem: 1, trangThai: 'Đang bảo đảm', revision: 4 },
        { maTS: 'TS-2', maHD: 'HD1', soHopDong: 'HD-A', nhanLoai: 'BĐS', moTa: 'Có hở', giaTri: 100, nguyenGia: null, khauHao: null, giaTriConLai: null, ngayDinhGia: '', ngayHetHanBaoHiem: '2026-09-01', ngayBatDauBaoHiem: '2026-12-01', hangMucBaoHiem: 'Kho X', canhBaoBaoHiem: 'KHOANG_TRONG', soNgayBaoHiem: 20, soHopDongBaoHiem: 2, trangThai: 'Đang bảo đảm', revision: 7 },
        { maTS: 'TS-3', maHD: 'HD1', soHopDong: 'HD-A', nhanLoai: 'BĐS', moTa: 'Hết một hạng mục', giaTri: 100, ngayDinhGia: '', ngayHetHanBaoHiem: '2026-10-23', ngayBatDauBaoHiem: '', hangMucBaoHiem: 'Kho A', canhBaoBaoHiem: 'QUA_HAN', soNgayBaoHiem: -1, soHopDongBaoHiem: 1, trangThai: 'Đang bảo đảm', revision: 2 }];
      let conflict = false, revBH = 9;
      const bh = () => ({ maTS: 'TS-3', maHD: 'HD1', soHopDong: 'HD-A', moTa: 'Hết một hạng mục', giaTri: 100, trangThai: 'Đang bảo đảm', revisionTS: 2, nguongCanhBaoNgay: 15,
        baoVe: { tinhTrang: 'QUA_HAN', canhBao: 'QUA_HAN', hangMuc: 'Kho A', ngayHetHan: '2026-10-23', ngayBatDau: '', soNgay: -1, hangMucChichiTiet: [], hangMucChiTiet: [{ ten: 'Kho A', tinhTrang: 'QUA_HAN', ngayHetHan: '2026-10-23' }, { ten: 'Kho B', tinhTrang: 'DANG_BAO_HIEM', ngayHetHan: '2027-02-01' }] },
        hopDong: [{ maBH: 'BH-0007', soHDBaoHiem: 'S7', ngayKyHD: '2026-01-05', congTyBaoHiem: 'Bảo Việt', trangThai: 'Hiệu lực', ghiChu: '', lyDoHuy: '', denNgayCuoi: '2027-02-01', soNgay: 100, canhBao: 'QUA_HAN', tinhTrangRieng: 'QUA_HAN', revision: revBH,
          chiTiet: [{ stt: 1, maTaiSan: '', tenTaiSan: 'Kho A', giaTriBH: 5, phiBH: 1, tienBH: 0, tuNgay: '2026-01-05', denNgay: '2026-10-23', tinhTrang: 'QUA_HAN' }, { stt: 2, maTaiSan: '', tenTaiSan: 'Kho B', giaTriBH: 5, phiBH: 1, tienBH: 0, tuNgay: '2026-01-05', denNgay: '2027-02-01', tinhTrang: 'DANG_BAO_HIEM' }], tong: { giaTriBH: 10, phiBH: 2, tienBH: 0 } }] });
      window.hakRun_ = () => { let ok, bad, P; const x = { withSuccessHandler(f) { ok = f; return P; }, withFailureHandler(f) { bad = f; return P; } };
        const dang = (ten, tra, loiMsg) => { x[ten] = function (...a) { goi.push([ten, JSON.stringify(a)]); setTimeout(() => { const l = loiMsg && loiMsg(); if (l) bad({ message: l }); else ok(tra(...a)); }, 0); return P; }; };
        dang('layTaiSanBaoDam', () => ({ rows, tongGiaTriDangBaoDam: 300, loaiTaiSan: { BDS: 'BĐS' } })); dang('layBaoHiemTaiSan', bh);
        dang('luuBaoHiemTaiSan', () => ({ ok: true, maBH: 'BH-0007', revision: 10, canhBao: ['Đã lưu, nhưng chưa dọn được 1 dòng chi tiết bản cũ'] }), () => { if (conflict) { revBH = 10; return 'XUNG_DOT_PHIEN_BAN|10|Hợp đồng bảo hiểm BH-0007 đã được người khác thay đổi'; } return ''; });
        dang('huyBaoHiemTaiSan', () => ({ ok: true })); dang('giaiChapTaiSan', () => ({ ok: true })); dang('layBangTongHopHoaDon', () => []); dang('layDanhSachHoSoCuaHopDong', () => []);
        dang('layTrangThaiToanVenBaoHiem', () => ({ dongMoCoi: 1, dongTheHeCu: 2, canPhucHoi: true })); dang('donChiTietBaoHiemThua', () => ({ daXoa: 3, conLai: { canPhucHoi: false } }));
        P = new Proxy(x, { get: (t, k) => (k in t) ? t[k] : () => P }); return P; };
      window.hoiXacNhan = (m, f) => f(); let loiHien = []; const baoLoiGoc = window.baoLoi; window.baoLoi = (m) => { loiHien.push(String((m && m.message) || m)); };
      window.prompt = () => 'lý do thử';
      AppDataStore.hopDong = [{ MaHD: 'HD1', MaCty: 'C1', SoHopDong: 'HD-A', TenNganHang: 'BIDV', NgayHopDong: '2026-01-01', HanMucVay: 1e9, Revision: 1 }]; AppDataStore.congTy = [{ MaCty: 'C1', TenCty: 'Cty' }];
      moHopDongChiTiet('HD1'); await cho();
      const bang = [...document.querySelectorAll('#tbody_theChapCuaHopDong tr')].map(r => r.textContent);
      // mở lại + sửa: gửi expectedRevision = phiên bản đang xem; tạo mới thì không gửi
      [...document.querySelectorAll('#tbody_theChapCuaHopDong tr')][2].querySelector('button').click(); await cho();
      const modal = { baoVe: txt('bhts_baoVe'), ds: txt('bhts_ds') };
      suaBaoHiemTS_('BH-0007'); goi.length = 0; luuBaoHiemTSClick_(); await cho(); const luuSua = goi.find(g => g[0] === 'luuBaoHiemTaiSan'); const sauLuu = { loi: loiHien.slice() };
      napFormBHTS_(null); document.getElementById('bhts_ngayKy').value = '2026-02-01'; el_('bhts_congTy').value = 'PVI'; const r1 = document.querySelector('#tbody_bhtsChiTiet tr'); r1.querySelector('.bhts-ten').value = 'Mới'; r1.querySelector('.bhts-tu').value = '2026-02-01'; r1.querySelector('.bhts-den').value = '2027-02-01';
      goi.length = 0; luuBaoHiemTSClick_(); await cho(); const luuMoi = goi.find(g => g[0] === 'luuBaoHiemTaiSan');
      // xung đột phiên bản: báo lỗi và nạp lại dữ liệu mới
      conflict = true; suaBaoHiemTS_('BH-0007'); el_('bhts_soHD').value = 'DANG-NHAP-DO'; loiHien.length = 0; goi.length = 0; luuBaoHiemTSClick_(); await cho();
      const xungDot = { loi: loiHien.slice(), taiLai: goi.filter(g => g[0] === 'layBaoHiemTaiSan').length, formVe: BHTS_MA_BH_, soHDGiu: el_('bhts_soHD').value, banner: txt('bhts_xungDot'), nutDe: !!document.querySelector('#bhts_xungDot .btn-danger'), dsMoi: txt('bhts_ds').includes('Bảo Việt') }; conflict = false;
      // 1) nạp bản mới: bỏ phần đang nhập; 2) nhập lại rồi lưu đè có chủ đích: gửi phiên bản MỚI
      bhtsNapBanMoi_(); xungDot.sauNap = { soHD: el_('bhts_soHD').value, banner: txt('bhts_xungDot') };
      conflict = true; el_('bhts_soHD').value = 'NHAP-LAI'; goi.length = 0; luuBaoHiemTSClick_(); await cho(); conflict = false; el_('bhts_soHD').value = 'NHAP-LAI'; window.confirm = () => true; goi.length = 0; bhtsLuuDe_(); await cho(); xungDot.luuDe = goi.find(g => g[0] === 'luuBaoHiemTaiSan');
      goi.length = 0; huyBaoHiemTSClick_('BH-0007'); await cho(); const huy = goi.find(g => g[0] === 'huyBaoHiemTaiSan');
      goi.length = 0; giaiChapTaiSanClick_('TS-3', 2); await cho(); const giaiChap = goi.find(g => g[0] === 'giaiChapTaiSan');
      veCanhBaoBaoHiemTongQuan_({ chiTietBaoHiem: [{ maTS: 'TS-1', maHD: 'HD1', moTa: 'Chưa bắt đầu', soHopDong: 'HD-A', han: '', ngayBatDau: '2026-12-01', hangMuc: 'Nhà A', soNgay: 20, muc: 'CHUA_BAT_DAU' }, { maTS: 'TS-2', maHD: 'HD1', moTa: 'Có hở', soHopDong: 'HD-A', han: '2026-09-01', ngayBatDau: '2026-12-01', hangMuc: 'Kho X', soNgay: 20, muc: 'KHOANG_TRONG' }, { maTS: 'TS-3', maHD: 'HD1', moTa: 'Hết', soHopDong: 'HD-A', han: '2026-10-23', ngayBatDau: '', hangMuc: 'Kho A', soNgay: -1, muc: 'QUA_HAN' }] });
      const tq = { tom: txt('tq_cbBaoHiemTom'), ds: txt('tq_cbBaoHiemList') };
      goi.length = 0; kiemTraToanVenBHClick_(); await cho(); const tv = { st: txt('cd_toanVenBH'), nut: getComputedStyle(el_('cd_btnDonBH')).display }; donDuLieuBHClick_(); await cho();
      return { bang, modal, luuSua, luuMoi, sauLuu, xungDot, huy, giaiChap, tq, tv, goiTV: goi.map(g => g[0]) };
    });
    assert.match(kq.bang[0], /Từ 01\/12\/2026/); assert.doesNotMatch(kq.bang[0], /đến 01\/12\/2026/i); assert.match(kq.bang[0], /Chưa bắt đầu/); assert.match(kq.bang[0], /Nhà A/); assert.match(kq.bang[0], /300\.000|300/, 'nguyên giá hiện');
    assert.match(kq.bang[1], /Hết 01\/09\/2026, tiếp từ 01\/12\/2026/); assert.match(kq.bang[1], /Hở bảo hiểm/); assert.match(kq.bang[2], /23\/10\/2026.*Đã hết hạn.*Kho A/);
    assert.match(kq.modal.baoVe, /Tình trạng bảo hiểm hiện tại.*đã hết hạn 1 ngày.*23\/10\/2026.*Kho A/); assert.match(kq.modal.baoVe, /Kho B: đang bảo hiểm đến 01\/02\/2027/); assert.match(kq.modal.ds, /Đã hết hạn/);
    const sua = JSON.parse(kq.luuSua[1])[0]; assert.deepEqual([sua.maBH, sua.expectedRevision], ['BH-0007', 9], 'sửa gửi phiên bản đang xem'); assert.match(kq.sauLuu.loi.join(' '), /Lưu xong nhưng cần lưu ý.*chưa dọn được 1 dòng/);
    const moi = JSON.parse(kq.luuMoi[1])[0]; assert.deepEqual([moi.maBH, moi.expectedRevision], ['', undefined], 'tạo mới không gửi phiên bản');
    assert.match(kq.xungDot.loi.join(' '), /XUNG_DOT_PHIEN_BAN/); assert.ok(kq.xungDot.taiLai >= 1, 'nạp bản mới để đối chiếu sau xung đột'); assert.deepEqual([kq.xungDot.formVe, kq.xungDot.soHDGiu], ['BH-0007', 'DANG-NHAP-DO'], 'nội dung đang nhập được GIỮ, không bị ghi đè hay xoá');
    assert.match(kq.xungDot.banner, /Có người khác vừa sửa hợp đồng BH-0007.*GIỮ NGUYÊN/); assert.ok(kq.xungDot.nutDe && kq.xungDot.dsMoi); assert.deepEqual([kq.xungDot.sauNap.soHD, kq.xungDot.sauNap.banner], ['S7', ''], 'nạp bản mới = bỏ phần đang nhập, có chủ đích');
    const de = JSON.parse(kq.xungDot.luuDe[1])[0]; assert.deepEqual([de.soHDBaoHiem, de.expectedRevision], ['NHAP-LAI', 10], 'lưu đè gửi phiên bản MỚI nhất sau khi người dùng xác nhận');
    assert.deepEqual(JSON.parse(kq.huy[1]), ['BH-0007', 'lý do thử', 10]); assert.deepEqual(JSON.parse(kq.giaiChap[1]), ['TS-3', 'lý do thử', 2]);
    assert.match(kq.tq.tom, /3 tài sản/); assert.match(kq.tq.tom, /1 đã hết hạn, 2 chưa bắt đầu\/hở bảo hiểm/); assert.match(kq.tq.ds, /chưa bắt đầu.*bảo hiểm có hiệu lực từ 01\/12\/2026.*Nhà A/i); assert.match(kq.tq.ds, /Đang hở bảo hiểm.*hết ngày 01\/09\/2026.*bắt đầu 01\/12\/2026/); assert.match(kq.tq.ds, /đã hết hạn 1 ngày.*Kho A/);
    assert.doesNotMatch(kq.tq.ds, /đến 01\/12\/2026/, 'không dùng ngày bắt đầu làm ngày hết hạn');
    assert.match(kq.tv.st, /Có 3 dòng chi tiết bảo hiểm không hiển thị/); assert.notEqual(kq.tv.nut, 'none'); assert.ok(kq.goiTV.includes('donChiTietBaoHiemThua'));
    assert.deepEqual(loi, []);
    console.log('PASS Giao diện: bảng thế chấp / modal bảo hiểm / Tổng quan đồng bộ theo hạng mục (chưa bắt đầu, hở, hết hạn); sửa gửi phiên bản, xung đột nạp lại; hủy và giải chấp gửi phiên bản; kiểm tra/dọn dòng thừa');
  } catch (e) { console.log('FAIL Giao diện toàn vẹn tài sản/bảo hiểm → ' + e.message); await b.close(); process.exit(1); }
  await b.close();
  Q.ket('toàn vẹn dữ liệu tài sản thế chấp / bảo hiểm / Excel');
})();
