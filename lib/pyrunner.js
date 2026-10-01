// Python practice runner. PY_RUNNER is Python source; it runs inside Pyodide in the browser and in plain python3 for the repo tests,
// so both use the exact same comparison rules as the JavaScript runner (lib/runner.js).
export const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

export const PY_RUNNER = String.raw`
import json, math, sys, io, copy

def _is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)

def _same(a, b, tol):
    if _is_num(a) and _is_num(b):
        if isinstance(a, float) and isinstance(b, float) and math.isnan(a) and math.isnan(b):
            return True
        return a == b or abs(a - b) <= tol
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if a is None or b is None:
        return a is b
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(_same(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return sorted(a.keys()) == sorted(b.keys()) and all(_same(a[k], b[k], tol) for k in a)
    return type(a) == type(b) and a == b

def _show(v):
    try:
        s = json.dumps(v)
    except Exception:
        s = repr(v)
    return s if len(s) <= 300 else s[:300] + '...'

def _jsonable(v):
    # tuples become lists, sets are rejected so the learner returns a list instead
    if isinstance(v, tuple):
        return [_jsonable(x) for x in v]
    if isinstance(v, list):
        return [_jsonable(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _jsonable(x) for k, x in v.items()}
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    raise TypeError('Return numbers, strings, booleans, None, lists or dicts. Got ' + type(v).__name__ + '.')

def run_cases_json(code, fn_name, cases_json, tol):
    cases = json.loads(cases_json)
    out = {'compileError': None, 'results': [], 'logs': []}
    ns = {'__name__': '__main__'}
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        try:
            exec(compile(code, '<your code>', 'exec'), ns)
        except SyntaxError as e:
            out['compileError'] = 'Line %s: %s' % (e.lineno, e.msg)
            return json.dumps(out)
        except Exception as e:
            out['compileError'] = '%s: %s' % (type(e).__name__, e)
            return json.dumps(out)
        fn = ns.get(fn_name)
        if not callable(fn):
            out['compileError'] = 'Define a function named %s.' % fn_name
            return json.dumps(out)
        for i, c in enumerate(cases):
            name = c.get('name') or ('Case %d' % (i + 1))
            hidden = bool(c.get('hidden'))
            expected = c.get('expect')
            passed = False
            err = None
            actual = None
            try:
                args = copy.deepcopy(c.get('args') or [])
                actual = _jsonable(fn(*args))
                passed = _same(actual, expected, tol)
                if actual is None and expected is not None:
                    err = 'Your function returned None. Did you forget to return a value?'
            except Exception as e:
                err = '%s: %s' % (type(e).__name__, e)
            out['results'].append({'name': name, 'hidden': hidden, 'pass': bool(passed), 'error': err,
                                   'actual': None if hidden else _show(actual), 'expected': None if hidden else _show(expected)})
    finally:
        sys.stdout = old
    lines = buf.getvalue().split('\n')
    out['logs'] = [l for l in lines if l != ''][:50]
    return json.dumps(out)
`;

// Worker source (served from /api/pyrunner). Loads Pyodide once, cuts network access, then runs cases on request.
export function pyWorkerSource() {
  return `
    importScripts(${JSON.stringify(`${PYODIDE_BASE}pyodide.js`)});
    const RUNNER = ${JSON.stringify(PY_RUNNER)};
    let py = null;
    let starting = null;
    function start() {
      if (!starting) {
        starting = (async () => {
          py = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE)} });
          py.runPython(RUNNER);
          // After loading, learner code gets no network: these are what Python's js module would use.
          self.fetch = undefined; self.XMLHttpRequest = undefined; self.WebSocket = undefined; self.importScripts = undefined;
        })();
      }
      return starting;
    }
    self.onmessage = async (e) => {
      const m = e.data || {};
      try {
        await start();
        if (m.type === 'init') { self.postMessage({ ready: true }); return; }
        const fn = py.globals.get('run_cases_json');
        const res = fn(m.code, m.fn, JSON.stringify(m.cases), m.tol || 0);
        fn.destroy && fn.destroy();
        self.postMessage(JSON.parse(res));
      } catch (err) {
        self.postMessage({ compileError: String((err && err.message) || err), results: [], logs: [], loadError: m.type === 'init' });
      }
    };
  `;
}
