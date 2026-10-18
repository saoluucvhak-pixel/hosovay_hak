/* HAK_CODE_QUALITY_TEST adapter: include Apps Script (.gs) and inline browser JS. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { scan, htmlReport } = require('./vendor/hak-quality.cjs');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'reports');
fs.mkdirSync(out, { recursive: true });
const staging = fs.mkdtempSync(path.join(out, 'scan-')), names = new Map(), syntax = [];
function stage(dir, rel = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'reports', 'node_modules', 'vendor'].includes(entry.name) || entry.name.startsWith('ket_qua')) continue;
    const relative = path.posix.join(rel, entry.name), full = path.join(dir, entry.name);
    if (entry.isDirectory()) { stage(full, relative); continue; }
    if (!entry.isFile() || !/\.(gs|js|cjs|html|json|css)$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, 'utf8');
    const target = relative.replace(/\.gs$/, '.gs.js');
    names.set(target, relative);
    fs.mkdirSync(path.dirname(path.join(staging, target)), { recursive: true });
    fs.writeFileSync(path.join(staging, target), source);
    const scripts = /\.(gs|js|cjs)$/.test(entry.name) ? [source] : Array.from(source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi), m => m[1]);
    scripts.forEach((code, i) => {
      try { new vm.Script(code, { filename: relative }); }
      catch (e) { syntax.push({ rule: 'syntax', severity: 'error', file: relative, line: 0, message: e.message }); }
      if (entry.name.endsWith('.html') && code.trim()) {
        const scriptPath = relative + '.' + i + '.js'; names.set(scriptPath, relative);
        fs.writeFileSync(path.join(staging, scriptPath), code);
      }
    });
  }
}
stage(root);
const report = scan(staging);
report.root = path.basename(root);
report.files.forEach(f => { f.path = names.get(f.path) || f.path; });
report.findings.forEach(f => { f.file = names.get(f.file) || f.file; });
// The upstream regex also flags rule names inside string literals. Keep those visible as suppressions.
const literalFalsePositive = f => {
  if (f.rule !== 'debugger' || f.file !== 'tools/check.cjs') return false;
  const line = fs.readFileSync(__filename, 'utf8').split(/\r?\n/)[f.line - 1] || '';
  const withoutStrings = line.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '');
  return !/\bdebugger\b/.test(withoutStrings);
};
report.suppressions = report.findings.filter(literalFalsePositive);
report.findings = report.findings.filter(f => !literalFalsePositive(f));
report.findings.push(...syntax);
report.summary.findings = report.findings.length;
report.checkedAt = new Date().toISOString();
report.limitations = ['Static regex analyzer; does not resolve Apps Script global dependencies.', 'Long files are advisory; syntax errors, debugger statements and dependency cycles fail the check.'];
fs.writeFileSync(path.join(out, 'quality-report.json'), JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'dashboard.html'), htmlReport(report));
console.log(JSON.stringify(report.summary));
const blocking = report.findings.filter(f => ['syntax', 'debugger', 'dependency-cycle'].includes(f.rule));
blocking.forEach(f => console.error(f.file + ': ' + f.message));
if (blocking.length) process.exitCode = 1;
