// Mẫu nội dung thanh toán do Quản trị tự thêm/sửa/xoá — máy chủ trên giả lập Apps Script + ô chọn mẫu trên trình duyệt thật (máy chủ giả lập).
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const Q = require('./_qlv_chung')('mau_noi_dung'), { ctx, mt, dat } = Q;
const J = (x) => JSON.parse(JSON.stringify(x));
const voi = (e, f) => { const cu = mt.__email; mt.__email = e; try { return f(); } finally { mt.__email = cu; } };
const api = (e, ten, ...a) => J(voi(e, () => ctx.api('', ten, a)));
voi('ketoan@example.com', () => { ctx.luuNguoiDung({ email: 'xem@example.com', vaiTro: 'XEM', trangThai: 'Hoạt động' }); ctx.luuNguoiDung({ email: 'nhap@example.com', vaiTro: 'NHAP_LIEU', trangThai: 'Hoạt động' }); });

dat('Chưa cấu hình: trả 2 mẫu mặc định (giữ đúng 2 mẫu cũ); mọi vai trò đều đọc được', () => {
  const ds = api('xem@example.com', 'layMauNoiDungThanhToan');
  assert.deepEqual(ds.map(m => m.maMau), ['hang', 'cp']);
  assert.match(ds[0].noiDung, /^Thanh toán tiền hàng theo hoá đơn số \{so\} ngày \{ngay\}$/);
});
dat('Quản trị thêm / sửa / xoá trong 1 lần lưu: giữ thứ tự, giữ mã mẫu cũ, mẫu mới có mã; lưu vào sheet MauNoiDungThanhToan', () => {
  let ds = api('ketoan@example.com', 'layMauNoiDungThanhToan');
  ds = api('ketoan@example.com', 'luuMauNoiDungThanhToan', [
    { maMau: 'hang', tenMau: 'Tiền hàng theo HĐ', noiDung: 'Thanh toán tiền hàng theo hoá đơn số {so} ngày {ngay}' },
    { tenMau: 'Mua keo lá tràm', noiDung: 'Thanh toán tiền mua keo lá tràm theo hoá đơn số {so} ngày {ngay}' },
    { tenMau: '', noiDung: '' } // dòng trống bỏ qua
  ]); // bỏ mẫu "cp" = xoá
  assert.deepEqual(ds.map(m => m.tenMau), ['Tiền hàng theo HĐ', 'Mua keo lá tràm']);
  assert.equal(ds[0].maMau, 'hang'); assert.match(ds[1].maMau, /^M[0-9a-f]{8}$/);
  const rows = ctx.sheetToObjects_(ctx.SHEET_MAU_NOI_DUNG).filter(r => r.TenMau);
  assert.equal(rows.length, 2); assert.equal(rows[1].NguoiCapNhat, 'ketoan@example.com');
  ds = api('ketoan@example.com', 'luuMauNoiDungThanhToan', [ds[1]]); // xoá bớt → dòng thừa trong sheet được ghi trống
  assert.deepEqual(api('xem@example.com', 'layMauNoiDungThanhToan').map(m => m.tenMau), ['Mua keo lá tràm']);
});
dat('Kiểm tra dữ liệu: thiếu tên/nội dung, trùng tên, quá dài, quá 50 mẫu → báo lỗi, không ghi gì', () => {
  const truoc = JSON.stringify(api('ketoan@example.com', 'layMauNoiDungThanhToan'));
  assert.throws(() => api('ketoan@example.com', 'luuMauNoiDungThanhToan', [{ tenMau: 'A', noiDung: '' }]), /chưa có nội dung/);
  assert.throws(() => api('ketoan@example.com', 'luuMauNoiDungThanhToan', [{ tenMau: '', noiDung: 'x' }]), /chưa có tên/);
  assert.throws(() => api('ketoan@example.com', 'luuMauNoiDungThanhToan', [{ tenMau: 'A', noiDung: 'x' }, { tenMau: 'a', noiDung: 'y' }]), /Trùng tên mẫu/);
  assert.throws(() => api('ketoan@example.com', 'luuMauNoiDungThanhToan', [{ tenMau: 'A', noiDung: 'x'.repeat(201) }]), /dài quá 200/);
  assert.throws(() => api('ketoan@example.com', 'luuMauNoiDungThanhToan', Array.from({ length: 51 }, (_, i) => ({ tenMau: 'M' + i, noiDung: 'x' }))), /Tối đa 50/);
  assert.equal(JSON.stringify(api('ketoan@example.com', 'layMauNoiDungThanhToan')), truoc);
});
dat('Chỉ Quản trị được lưu: Nhập liệu và Chỉ xem bị từ chối', () => {
  assert.throws(() => api('nhap@example.com', 'luuMauNoiDungThanhToan', [{ tenMau: 'X', noiDung: 'y' }]), /\[QUYEN\]/);
  assert.throws(() => api('xem@example.com', 'luuMauNoiDungThanhToan', [{ tenMau: 'X', noiDung: 'y' }]), /\[QUYEN\]/);
});
dat('Xoá hết rồi lưu → quay về 2 mẫu mặc định', () => {
  assert.deepEqual(api('ketoan@example.com', 'luuMauNoiDungThanhToan', []).map(m => m.maMau), ['hang', 'cp']);
});

// ---- Trình duyệt: ô chọn mẫu lấy từ máy chủ, điền {so}/{ngay}, thiếu thì bỏ chữ "số"/"ngày"; bảng sửa mẫu ở Cài đặt
(async () => {
  const { chromium } = require('playwright');
  const inc = n => fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const html = inc('Index').replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  let b;
  try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); }
  catch (e) { console.log('BỎ QUA phần giao diện: không có Chromium (' + String(e.message).split(String.fromCharCode(10))[0] + ')'); Q.ket('mẫu nội dung thanh toán'); return; }
  try {
    const p = await b.newPage(); const loi = []; p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort());
    await p.route('http://mau.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => {} }) } }; });
    await p.goto('http://mau.test');
    const kq = await p.evaluate(async () => {
      window.__luu = null;
      window.hakRun_ = () => { let ok; const x = { withSuccessHandler(f) { ok = f; return x; }, withFailureHandler() { return x; },
        layMauNoiDungThanhToan() { setTimeout(() => ok([{ maMau: 'hang', tenMau: 'Tiền hàng', noiDung: 'Thanh toán tiền hàng theo hoá đơn số {so} ngày {ngay}' }, { maMau: 'M1', tenMau: 'Mua keo', noiDung: 'Mua keo lá tràm HĐ số {so} ngày {ngay}' }]), 0); },
        luuMauNoiDungThanhToan(ds) { window.__luu = ds; setTimeout(() => ok(ds.map((m, i) => Object.assign({ maMau: m.maMau || 'MN' + i }, m))), 0); } }; return x; };
      themDong({ TenNguoiHuong: 'A', TaiLieuSo: '0000777', NgayTaiLieu: '05/10/2026' });
      themDong({ TenNguoiHuong: 'B' });
      taiMauNoiDung_(); await new Promise(r => setTimeout(r, 30));
      const rows = document.querySelectorAll('#tbodyChiTiet tr'), sel = rows[0].querySelector('select.ct-maund');
      const opts = [...sel.options].map(o => o.textContent);
      sel.value = 'M1'; apDungMauNoiDung(sel); const nd1 = rows[0].querySelector('.ct-noidung').value;
      const sel2 = rows[1].querySelector('select.ct-maund'); sel2.value = 'hang'; apDungMauNoiDung(sel2); const nd2 = rows[1].querySelector('.ct-noidung').value;
      const bang = document.querySelectorAll('#cfg_bangMauND tbody tr').length;
      themDongMauNoiDung_(); const moi = [...document.querySelectorAll('#cfg_bangMauND tbody tr')].pop();
      moi.querySelector('.mnd-ten').value = 'Phí vận chuyển'; moi.querySelector('.mnd-nd').value = 'Thanh toán cước vận chuyển hoá đơn {so}'; moi.querySelector('.mnd-nd').dispatchEvent(new Event('input'));
      const xem = moi.querySelector('.mnd-xem').textContent;
      document.querySelector('#cfg_bangMauND tbody tr').querySelector('button').click(); // xoá mẫu đầu
      luuMauNoiDungClick(); await new Promise(r => setTimeout(r, 30));
      return { opts, nd1, nd2, bang, xem, luu: window.__luu, optsSau: [...rows[0].querySelector('select.ct-maund').options].map(o => o.textContent), kqLuu: document.getElementById('cfg_mauNDKq').textContent, chon: sel.value };
    });
    assert.deepEqual(kq.opts, ['-- Chọn mẫu nội dung --', 'Tiền hàng', 'Mua keo']);
    assert.equal(kq.nd1, 'Mua keo lá tràm HĐ số 0000777 ngày 05/10/2026');
    assert.equal(kq.nd2, 'Thanh toán tiền hàng theo hoá đơn', 'chưa có số/ngày: bỏ chữ "số"/"ngày"');
    assert.equal(kq.chon, '', 'ô chọn trở về mặc định');
    assert.equal(kq.bang, 2); assert.match(kq.xem, /Thanh toán cước vận chuyển hoá đơn 0000123/);
    assert.deepEqual(kq.luu.map(m => m.tenMau), ['Mua keo', 'Phí vận chuyển']); assert.equal(kq.luu[0].maMau, 'M1');
    assert.deepEqual(kq.optsSau, ['-- Chọn mẫu nội dung --', 'Mua keo', 'Phí vận chuyển']); assert.match(kq.kqLuu, /Đã lưu 2 mẫu/);
    assert.deepEqual(loi, []);
    console.log('PASS Giao diện: ô chọn mẫu lấy từ danh sách đã lưu, điền số/ngày (thiếu thì bỏ chữ số/ngày), bảng Cài đặt thêm/xoá/xem thử/lưu, ô chọn cập nhật ngay');
  } catch (e) { console.log('FAIL Giao diện mẫu nội dung → ' + e.message); process.exitCode = 1; }
  finally { await b.close(); }
  Q.ket('mẫu nội dung thanh toán');
})();
