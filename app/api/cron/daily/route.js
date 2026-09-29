import { getStore } from '../../../../lib/db.js';
import { checkCron, json } from '../../../../lib/auth.js';
import { runDaily } from '../../../../lib/daily.js';
import { logEvent } from '../../../../lib/log.js';
import courses from '../../../../data/courses.json';
import quizzes from '../../../../data/topics.json';
import papers from '../../../../data/papers.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel Cron calls this with GET. Add ?force=1 to rebuild today's plan and resend the digest.
export async function GET(request) {
  if (!checkCron(request)) return json({ error: 'unauthorized' }, 401);
  const force = new URL(request.url).searchParams.get('force') === '1';
  let store;
  try {
    store = await getStore();
    const r = await runDaily({ store, courses, topics: quizzes.topics, papers, force });
    return json({ ok: r.ok, date: r.date, skipped: !!r.skipped, telegram: r.telegram ? (r.telegram.ok ? 'sent' : r.telegram.skipped ? 'not configured' : 'failed') : undefined, feedCount: r.feedCount, feedErrors: r.feedErrors });
  } catch (e) {
    // Storage or unexpected failure: still try to tell the learner.
    try { await logEvent(store || { addLog: async () => {} }, { type: 'cron_error', level: 'error', message: `Daily job failed: ${String(e.message || e).slice(0, 300)}` }); } catch { /* ignore */ }
    return json({ ok: false, error: 'daily job failed' }, 500);
  }
}
