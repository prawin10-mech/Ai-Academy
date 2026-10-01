import { workerSource } from '../../../lib/runner.js';

export const dynamic = 'force-static';
export const runtime = 'nodejs';

// The practice runner worker. It needs eval to run the learner's code, so it is served from its own URL with its own
// strict policy: eval allowed, but no network, no frames, nothing else. The rest of the site keeps a policy without eval.
export async function GET() {
  return new Response(workerSource(), {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-eval'; connect-src 'none'",
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}
