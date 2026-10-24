// HƯỚNG DẪN SỬ DỤNG › Quy trình trực quan (A–F): nội dung, liên kết, nút điều hướng KHÔNG ghi dữ liệu, tên menu/nút khớp giao diện thật, bố cục responsive, sáng/tối, không chỉ dùng màu, không ảnh chứa chữ.
// Chromium + google.script.run GIẢ LẬP (không phải Google thật). Ảnh chụp (MÔ PHỎNG) lưu ở HAK_ANH_DIR (mặc định thư mục tạm).
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), os = require('os');
const anhDir = process.env.HAK_ANH_DIR || path.join(os.tmpdir(), 'hosovay_anh_huong_dan'); fs.mkdirSync(anhDir, { recursive: true });
(async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('BỎ QUA giao diện Hướng dẫn: chưa cài Playwright'); process.exit(0); }
  const inc = (n, bo) => (bo && bo.includes(n)) ? '' : fs.readFileSync(path.join(__dirname, '..', n + '.html'), 'utf8');
  const dung = (bo) => inc('Index', bo).replace(/<\?!=\s*include\('(\w+)'\);\s*\?>/g, (_, n) => inc(n, bo)).replace(/<\?=\s*\w+\s*\?>/g, '').replace('    hakKhoiDong_();', '/* QA */');
  const html = dung([]), htmlKhongHD = dung(['HuongDanQuyTrinh']);
  let b; try { b = await chromium.launch({ headless: true, ...(process.env.HAK_BROWSER_PATH ? { executablePath: process.env.HAK_BROWSER_PATH } : {}), args: ['--no-sandbox'] }); } catch (e) { console.log('BỎ QUA giao diện Hướng dẫn: không có Chromium'); process.exit(0); }
  let loiTest = 0; const ok = (t) => console.log('PASS ' + t), hong = (t, e) => { loiTest++; console.log('FAIL ' + t + ' → ' + (e && e.message)); };
  const bo = (s) => String(s).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const loi = [];
    p.on('pageerror', e => loi.push(e.message));
    await p.route('https://fonts.googleapis.com/**', r => r.abort()); await p.route('http://hd.test/**', r => r.fulfill({ contentType: 'text/html', body: html }));
    await p.addInitScript(() => { window.__goiMayChu = []; window.google = { script: { run: new Proxy({}, { get: (t, k) => k === 'withSuccessHandler' || k === 'withFailureHandler' ? function () { return window.google.script.run; } : function () { window.__goiMayChu.push(String(k)); return window.google.script.run; } }) } }; });
    await p.goto('http://hd.test');
    await p.evaluate(() => { window.hakRun_ = () => window.google.script.run; chuyenTab('huongdan'); });

    // 1) cấu trúc: 6 thẻ, đúng một panel hiện, chuyển thẻ cập nhật aria-selected
    const cauTruc = await p.evaluate(() => {
      const tabs = [...document.querySelectorAll('#hdq [role="tab"]')], out = { soThe: tabs.length, ten: tabs.map(t => t.textContent.trim()), chuyen: [] };
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(k => { hdqChon_(k); const hien = [...document.querySelectorAll('#hdq [role="tabpanel"]')].filter(x => !x.hidden).map(x => x.id); out.chuyen.push([k, hien.join(), document.getElementById('hdqT-' + k).getAttribute('aria-selected'), document.querySelectorAll('#hdq [aria-selected="true"]').length, document.querySelectorAll('#hdqP-' + k + ' li.hdq-step').length]); });
      hdqChon_('A'); return out;
    });
    assert.equal(cauTruc.soThe, 6); assert.deepEqual(cauTruc.ten.map(t => t[0]), ['A', 'B', 'C', 'D', 'E', 'F']);
    cauTruc.chuyen.forEach(([k, hien, sel, soSel, soBuoc]) => { assert.equal(hien, 'hdqP-' + k); assert.equal(sel, 'true'); assert.equal(soSel, 1); assert.ok(soBuoc >= 4, k + ' có ' + soBuoc + ' bước'); });
    ok('Hướng dẫn: 6 quy trình A–F, mỗi quy trình ≥ 4 bước, chuyển thẻ đúng, chỉ một thẻ được chọn');

    // 2) mỗi bước có đủ: Vào / Nhập / Điều kiện / Kết quả / Ảnh hưởng
    const buoc = await p.evaluate(() => [...document.querySelectorAll('#hdq li.hdq-step')].map(li => ({ ten: li.querySelector('h4').textContent, dt: [...li.querySelectorAll('dt')].map(x => x.textContent.trim()) })));
    const can = ['Vào', 'Nhập', 'Điều kiện sang bước sau', 'Kết quả', 'Ảnh hưởng']; buoc.forEach(x => assert.deepEqual(x.dt, can, x.ten));
    ok('Hướng dẫn: mỗi bước (' + buoc.length + ' bước) có đủ Vào · Nhập · Điều kiện sang bước sau · Kết quả · Ảnh hưởng');

    // 3) nút "Mở màn hình" chỉ điều hướng: không gọi máy chủ ghi, không đổi dữ liệu
    const nut = await p.evaluate(async () => {
      const ds = [...document.querySelectorAll('#hdq .hdq-mo')], kq = []; window.__goiMayChu.length = 0;
      for (const n of ds) {
        const ten = /hdqMo_\('([^']+)'\)/.exec(n.getAttribute('onclick'))[1]; const g0 = window.__goiMayChu.length; n.click(); await new Promise(r => setTimeout(r, 30));
        const [tab, phu] = ten.split(':'), hien = document.getElementById('tab-' + tab) && document.getElementById('tab-' + tab).style.display !== 'none';
        kq.push({ ten, hien, goi: window.__goiMayChu.slice(g0) }); chuyenTab('huongdan');
      }
      return kq;
    });
    assert.ok(nut.length >= 12, 'số nút mở màn hình: ' + nut.length);
    nut.forEach(x => { assert.equal(x.hien, true, x.ten + ' phải mở đúng màn hình'); x.goi.forEach(g => assert.match(g, /^(lay|tai|kiemTra|xem|doc|moDoc|nap)/i, x.ten + ' không được gọi hàm ghi: ' + g)); });
    const ghi = nut.flatMap(x => x.goi).filter(g => /^(luu|xacNhan|ghiNhan|capNhat|huy|giaiChap|tatToan|apDung|tao|xoa|chot)/i.test(g)); assert.deepEqual(ghi, []);
    ok('Hướng dẫn: ' + nut.length + ' nút “Mở màn hình” chỉ chuyển màn hình; không gọi hàm lưu / xác nhận giải ngân / ghi nhận trả nợ / tất toán');

    // 4) tên menu/nút trong hướng dẫn khớp giao diện thật
    const menus = await p.evaluate(() => [...new Set([...document.querySelectorAll('#hdq .hdq-menu')].map(x => x.textContent))]);
    const bien = (s) => bo(s).replace(/&amp;/g, '&').toLowerCase(); const nguon = bien(htmlKhongHD.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&'));
    const thieu = menus.filter(m => !nguon.includes(bien(m)) && !nguon.includes(bien(m).replace(/\s*\/\s*/g, ' / ')));
    assert.deepEqual(thieu, [], 'tên menu/nút không có trong giao diện: ' + thieu.join(' | '));
    ok('Hướng dẫn: ' + menus.length + ' tên menu/nút (Cài đặt, Hồ sơ giải ngân, Xác nhận giải ngân thực tế…) đều có đúng tên trong giao diện thật');

    // 5) không ảnh chứa chữ; nhãn rẽ nhánh có chữ + ký hiệu (không chỉ màu)
    const trinhBay = await p.evaluate(() => ({ anh: document.querySelectorAll('#hdq img, #hdq svg image, #hdq canvas').length, nhan: [...document.querySelectorAll('#hdq .hdq-ra .hdq-nhan')].map(x => x.textContent.trim()), tag: [...document.querySelectorAll('#hdq .hdq-tag')].map(x => x.textContent.trim()), rong: [...document.querySelectorAll('#hdq .hdq-ra > div')].every(d => d.querySelector('.hdq-nhan')) }));
    assert.equal(trinhBay.anh, 0); assert.ok(trinhBay.nhan.length >= 9 && trinhBay.nhan.every(t => t.length >= 4), trinhBay.nhan.join('|')); assert.ok(trinhBay.rong);
    assert.ok(trinhBay.tag.length >= 3 && trinhBay.tag.every(t => /SỐ MINH HỌA/.test(t)), 'ví dụ phải ghi rõ SỐ MINH HỌA');
    ok('Hướng dẫn: không dùng ảnh chứa chữ; mỗi nhánh có nhãn chữ (✔/✖/ℹ + lời); mọi ví dụ ghi rõ SỐ MINH HỌA');

    // 6) không tràn ngang ở 360 / 768 / 1280; chụp ảnh sáng/tối
    for (const [w, h] of [[360, 800], [768, 900], [1280, 900]]) {
      await p.setViewportSize({ width: w, height: h });
      for (const k of ['A', 'B', 'C', 'D', 'E', 'F']) {
        await p.evaluate((kk) => { chuyenTab('huongdan'); hdqChon_(kk); }, k);
        const r = await p.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, cw: document.scrollingElement.clientWidth, thanTran: [...document.querySelectorAll('#hdq .hdq-card, #hdq .hdq-ra > div, #hdq .hdq-note')].filter(e => e.scrollWidth > e.clientWidth + 2).length }));
        assert.ok(r.sw <= r.cw + 1, `${w}px, quy trình ${k}: trang tràn ngang (${r.sw} > ${r.cw})`); assert.equal(r.thanTran, 0, `${w}px, quy trình ${k}: có thẻ tràn chữ`);
      }
    }
    ok('Hướng dẫn: không tràn ngang ở 360 / 768 / 1280 px (bảng rộng cuộn trong khung riêng)');

    // 7) tương phản chữ/nền ≥ 4,5:1 ở 4 bảng màu × sáng/tối
    const tuongPhan = await p.evaluate(() => {
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
      const tp = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
      const nenThat = (e) => { while (e) { const bg = getComputedStyle(e).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) && !/,\s*0\.\d+\)$/.test(bg)) return bg; e = e.parentElement; } return 'rgb(255,255,255)'; };
      const kq = [];
      chuyenTab('huongdan'); hdqChon_('B');
      for (const skin of ['luxe', 'classic', 'neutral', 'champagne']) for (const theme of ['light', 'dark']) {
        document.documentElement.setAttribute('data-skin', skin); document.documentElement.setAttribute('data-theme', theme);
        const mau = [['dd', '#hdqP-B .hdq-card dd'], ['dt', '#hdqP-B .hdq-card dt'], ['h4', '#hdqP-B .hdq-card h4'], ['menu', '#hdqP-B .hdq-menu'], ['ghichu', '#hdqP-B .hdq-note'], ['nhan', '#hdqP-B .hdq-re .hdq-hd'], ['nut', '#hdqP-B .hdq-mo'], ['tabChon', '#hdqT-B'], ['tabKhong', '#hdqT-A'], ['tag', '#hdqP-B .hdq-tag']];
        for (const [ten, sel] of mau) { const e = document.querySelector(sel); if (!e) continue; const fg = getComputedStyle(e).color, bg = nenThat(e); kq.push({ skin, theme, ten, tp: Math.round(tp(fg, bg) * 100) / 100 }); }
      }
      document.documentElement.removeAttribute('data-skin'); document.documentElement.setAttribute('data-theme', 'light');
      return kq;
    });
    const kem = tuongPhan.filter(x => x.tp < 4.5); assert.deepEqual(kem, [], 'tương phản dưới 4,5:1: ' + JSON.stringify(kem));
    ok('Hướng dẫn: tương phản chữ/nền ≥ 4,5:1 ở ' + tuongPhan.length + ' tổ hợp (4 bảng màu × sáng/tối × thành phần)');

    // 8) ảnh chụp mô phỏng
    await p.setViewportSize({ width: 1280, height: 900 });
    for (const [k, theme] of [['A', 'light'], ['B', 'light'], ['D', 'dark'], ['F', 'light']]) {
      await p.evaluate(([kk, th]) => { document.documentElement.setAttribute('data-theme', th); chuyenTab('huongdan'); hdqChon_(kk); document.getElementById('hdq').scrollIntoView(); }, [k, theme]);
      await p.locator('#hdq').screenshot({ path: path.join(anhDir, `huong_dan_${k}_${theme}_MO_PHONG.png`) });
    }
    await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); hdqChon_('C'); });
    await p.locator('#hdq').screenshot({ path: path.join(anhDir, 'huong_dan_C_dien_thoai_MO_PHONG.png') });
    ok('Hướng dẫn: đã chụp ảnh MÔ PHỎNG vào ' + anhDir);
    assert.deepEqual(loi, [], 'không lỗi JavaScript');
  } catch (e) { hong('Giao diện Hướng dẫn sử dụng', e); }
  await b.close();
  console.log('\nTỔNG: giao diện Hướng dẫn sử dụng — ' + loiTest + ' lỗi. Ảnh MÔ PHỎNG: ' + anhDir);
  process.exit(loiTest ? 1 : 0);
})();
