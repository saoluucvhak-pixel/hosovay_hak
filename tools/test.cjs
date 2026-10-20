/* Portable regression runner; Google services are simulated, not deployed. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'kiem_thu', 'ket_qua_hak');
fs.mkdirSync(out, { recursive: true });
const suites = ['chay_cha_con', 'chay_mau_3_truong_hop', 'chay_thu_logic', 'chay_usd_cent', 'chay_hak', 'chay_dong_goi', 'chay_hoi_quy', 'chay_trang_thai', 'chay_dong_bo', 'chay_dang_nhap', 'chay_quy_trinh', 'chay_bao_mat', 'chay_hieu_nang', 'chay_phan_trang'];
const results = [];
for (const suite of suites) {
  const destination = path.resolve(out, suite);
  if (!destination.startsWith(out + path.sep)) throw new Error('Unsafe output path');
  // TC30 recursively runs document/PDF suites requiring LibreOffice. Run those explicitly via chay_tat_ca.sh.
  const env = suite === 'chay_quy_trinh' ? { ...process.env, BO_QUA_TC30: '1' } : process.env;
  const result = cp.spawnSync(process.execPath, [path.join(root, 'kiem_thu', suite + '.js'), destination], { cwd: root, env, encoding: 'utf8', timeout: 900000 });
  fs.writeFileSync(path.join(out, suite + '.log'), (result.stdout || '') + (result.stderr || '') + (result.error ? String(result.error) : ''));
  const summary = (result.stdout || '').trim().split(/\r?\n/).slice(-1)[0];
  results.push({ suite, passed: result.status === 0, summary, skipped: suite === 'chay_quy_trinh' ? ['TC30: recursive document/PDF regression requires full environment'] : [] });
  console.log((result.status === 0 ? 'PASS ' : 'FAIL ') + suite + ': ' + summary);
}
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(results, null, 2) + '\n');
if (results.some(r => !r.passed)) process.exitCode = 1;
