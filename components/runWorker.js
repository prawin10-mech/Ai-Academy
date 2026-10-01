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
