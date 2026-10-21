/* Portable regression runner; Google services are simulated, not deployed. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'kiem_thu', 'ket_qua_hak');
fs.mkdirSync(out, { recursive: true });
const suites = ['chay_tat_toan', 'chay_so_sanh_vay', 'chay_dinh_dang', 'chay_cha_con', 'chay_mau_3_truong_hop', 'chay_thu_logic', 'chay_usd_cent', 'chay_hak', 'chay_dong_goi', 'chay_hoi_quy', 'chay_trang_thai', 'chay_dong_bo', 'chay_dang_nhap', 'chay_quy_trinh', 'chay_bao_mat', 'chay_hieu_nang', 'chay_phan_trang', 'chay_tra_no', 'chay_bao_cao_tra_no', 'chay_lich_tra_no', 'chay_canh_bao_phien_ban', 'chay_ty_gia_tu_dong', 'chay_doi_soat_tien', 'chay_kiem_main_21_10', 'chay_no_cot_tien', 'chay_tai_khoan_van_ban', 'chay_thu_muc_mau', 'chay_tai_khoan_trich_no', 'chay_tk_trich_no_mon', 'chay_hash_tk_trich_no', 'chay_bao_cao_tien_vay_tong_hop', 'chay_phan_bo', 'chay_han_muc', 'chay_nhac_no', 'chay_doi_soat_sao_ke', 'chay_duyet_hai_cap', 'chay_hieu_nang_quan_ly_vay', 'chay_kiem_tra_toan_dien', 'chay_unc_hai_khoan', 'chay_luong_day_du'];
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
