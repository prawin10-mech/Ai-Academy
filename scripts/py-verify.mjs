// Checks Python versions of the exercises with a local python3, using the same runner the browser uses.
// Usage: node scripts/py-verify.mjs file.json   where file.json is { "<exercise id>": { fn, starter, solution } }
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PY_RUNNER } from '../lib/pyrunner.js';

export function runPyLocal(code, fn, cases, tol = 0) {
  const dir = mkdtempSync(path.join(tmpdir(), 'pyrun-'));
  const file = path.join(dir, 'run.py');
  writeFileSync(file, `${PY_RUNNER}\nimport sys, json\nd = json.load(sys.stdin)\nprint('@@RESULT@@' + run_cases_json(d['code'], d['fn'], json.dumps(d['cases']), d['tol']))\n`);
  const r = spawnSync('python3', [file], { input: JSON.stringify({ code, fn, cases, tol }), encoding: 'utf8', timeout: 10000 });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('@@RESULT@@'));
  if (!line) return { compileError: `runner failed: ${(r.stderr || '').slice(-300) || (r.error && r.error.message) || 'timeout'}`, results: [], logs: [] };
  return JSON.parse(line.slice(10));
}

if (process.argv[1] && process.argv[1].endsWith('py-verify.mjs')) {
  const ex = JSON.parse(readFileSync(new URL('../data/exercises.json', import.meta.url), 'utf8'));
  const byId = Object.fromEntries(ex.map((e) => [e.id, e]));
  const mine = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  let bad = 0;
  for (const [id, p] of Object.entries(mine)) {
    const e = byId[id];
    if (!e) { console.log(`${id}: unknown exercise`); bad++; continue; }
    const sol = runPyLocal(p.solution, p.fn, e.cases, e.tol || 0);
    const st = runPyLocal(p.starter, p.fn, e.cases, e.tol || 0);
    const solOk = !sol.compileError && sol.results.length === e.cases.length && sol.results.every((r) => r.pass);
    const stFail = st.compileError ? false : st.results.every((r) => !r.pass);
    if (!solOk || !stFail) {
      bad++;
      console.log(`${id}: solution ${solOk ? 'ok' : 'FAILS'}, starter ${stFail ? 'fails (good)' : 'DOES NOT FAIL ALL CASES'}`);
      if (!solOk) console.log('   ', sol.compileError || JSON.stringify(sol.results.filter((r) => !r.pass).slice(0, 2)));
      if (!stFail) console.log('   ', st.compileError || 'some starter cases pass');
    } else console.log(`${id}: ok (${e.cases.length} cases)`);
  }
  console.log(bad ? `${bad} problem(s)` : 'all good');
  process.exit(bad ? 1 : 0);
}
