// Practice-lab test runner. runCases is deliberately self-contained (no imports, no outer references) because
// the browser sends its source text into a Web Worker. It also runs directly in Node for the exercise tests.
// Exercises are plain JavaScript: the learner writes a function, the cases call it with JSON arguments
// and compare the JSON result (numbers with an optional tolerance).
export function runCases(code, fnName, cases, opts) {
  const tol = (opts && opts.tol) || 0;
  const logs = [];
  const out = { compileError: null, results: [], logs };

  function same(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) && Number.isNaN(b)) return true;
      return a === b || Math.abs(a - b) <= tol;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i] && same(a[k], b[k]));
  }
  function show(v) {
    try {
      if (v === undefined) return 'undefined';
      const s = JSON.stringify(v);
      return s.length > 300 ? s.slice(0, 300) + '…' : s;
    } catch { return String(v); }
  }

  let fn;
  try {
    const fake = { log: (...a) => { if (logs.length < 50) logs.push(a.map((x) => (typeof x === 'string' ? x : show(x))).join(' ')); } };
    // eslint-disable-next-line no-new-func
    fn = new Function('console', `${code}\n;return typeof ${fnName} === 'function' ? ${fnName} : undefined;`)(fake);
  } catch (e) {
    out.compileError = String((e && e.message) || e);
    return out;
  }
  if (typeof fn !== 'function') {
    out.compileError = `Define a function named ${fnName}.`;
    return out;
  }
  cases.forEach((c, i) => {
    const r = { name: c.name || `Case ${i + 1}`, hidden: !!c.hidden, pass: false, actual: undefined, expected: c.expect, error: null };
    try {
      const args = JSON.parse(JSON.stringify(c.args || []));
      const actual = fn(...args);
      r.actual = actual;
      r.pass = same(actual, c.expect);
      if (actual === undefined) r.error = 'Your function returned undefined. Did you forget to return a value?';
    } catch (e) {
      r.error = String((e && e.message) || e);
    }
    out.results.push({ name: r.name, hidden: r.hidden, pass: r.pass, error: r.error, actual: r.hidden ? undefined : show(r.actual), expected: r.hidden ? undefined : show(r.expected) });
  });
  return out;
}

// Source text for the Web Worker: blocks network access, runs the cases, replies with the result.
export function workerSource() {
  return `
    const runCases = ${runCases.toString()};
    self.fetch = undefined; self.XMLHttpRequest = undefined; self.WebSocket = undefined; self.importScripts = undefined; self.indexedDB = undefined;
    self.onmessage = (e) => {
      const { code, fn, cases, opts } = e.data;
      try { self.postMessage(runCases(code, fn, cases, opts)); }
      catch (err) { self.postMessage({ compileError: String(err && err.message || err), results: [], logs: [] }); }
    };
  `;
}
