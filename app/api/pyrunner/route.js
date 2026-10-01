import { pyWorkerSource } from '../../../lib/pyrunner.js';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

// The Python practice worker (Pyodide). Own policy: eval and WebAssembly allowed, and the only host it may reach is the
// Pyodide CDN. Once Pyodide has loaded the worker also removes fetch, so learner code has no network at all.
export async function GET() {
  return new Response(pyWorkerSource(), {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net",
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}
