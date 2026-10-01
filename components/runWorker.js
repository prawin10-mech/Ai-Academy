// Runs the learner's code in a Web Worker with no network access. Returns { compileError, results, logs, timeout }.
export function runInWorker(code, fn, cases, tol, ms = 3000) {
  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker('/api/runner');
    } catch (e) {
      resolve({ compileError: 'Your browser blocked the practice runner.', results: [], logs: [] });
      return;
    }
    const finish = (r) => { clearTimeout(t); worker.terminate(); resolve(r); };
    const t = setTimeout(() => finish({ compileError: null, timeout: true, results: [], logs: [] }), ms);
    worker.onmessage = (e) => finish(e.data);
    worker.onerror = (e) => finish({ compileError: e.message || 'Runner error', results: [], logs: [] });
    worker.postMessage({ code, fn, cases, opts: { tol } });
  });
}

// ---- Python (Pyodide) ----
// One worker is kept alive so Pyodide (about 10 MB, cached by the browser) loads once per visit.
let pyWorker = null;
let pyReady = null;

function startPy() {
  if (pyWorker && pyReady) return pyReady;
  const w = new Worker('/api/pyrunner');
  pyWorker = w;
  pyReady = new Promise((resolve) => {
    const t = setTimeout(() => { resetPy(); resolve({ error: 'The Python engine took too long to load. Check your connection and try again.' }); }, 60000);
    w.onmessage = (e) => { clearTimeout(t); if (e.data && e.data.ready) resolve({ ok: true }); else { resetPy(); resolve({ error: 'Could not load the Python engine. Check your connection and try again.' }); } };
    w.onerror = () => { clearTimeout(t); resetPy(); resolve({ error: 'Could not load the Python engine. Check your connection and try again.' }); };
    w.postMessage({ type: 'init' });
  });
  return pyReady;
}
function resetPy() { try { if (pyWorker) pyWorker.terminate(); } catch { /* ignore */ } pyWorker = null; pyReady = null; }

/** Starts loading Python in the background, for example when the learner opens a Python exercise. */
export function warmPython() { try { startPy(); } catch { /* ignore */ } }

export async function runPythonInWorker(code, fn, cases, tol, ms = 3000) {
  let ready;
  try { ready = await startPy(); } catch { return { compileError: 'Your browser blocked the Python runner.', results: [], logs: [] }; }
  if (ready.error) return { compileError: ready.error, results: [], logs: [] };
  const w = pyWorker;
  return new Promise((resolve) => {
    // Python cannot be interrupted, so a runaway loop is cut off by ending the worker (it reloads from cache next time).
    const t = setTimeout(() => { resetPy(); resolve({ compileError: null, timeout: true, results: [], logs: [] }); }, ms);
    w.onmessage = (e) => { clearTimeout(t); resolve(e.data); };
    w.onerror = (e) => { clearTimeout(t); resetPy(); resolve({ compileError: (e && e.message) || 'Runner error', results: [], logs: [] }); };
    w.postMessage({ type: 'run', code, fn, cases, tol: tol || 0 });
  });
}
