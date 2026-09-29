import { getStore, json } from '../../../../lib/http.js';
import { checkCron } from '../../../../lib/cron-auth.js';
import { runDaily } from '../../../../lib/daily.js';
import { logEvent } from '../../../../lib/log.js';
import courses from '../../../../data/courses.json';
import topicsData from '../../../../data/topics.json';
import papers from '../../../../data/papers.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Call this hourly (GitHub Actions or Vercel Pro cron) so each learner's digest goes out at their own morning.
// It is safe to call more often: a learner gets at most one digest per local day. ?force=1 resends to everyone linked.
export async function GET(request) {
  if (!checkCron(request)) return json({ error: 'unauthorized' }, 401);
  const force = new URL(request.url).searchParams.get('force') === '1';
  let store;
  try {
    store = await getStore();
    const r = await runDaily({ store, courses, topics: topicsData.topics, papers, force });
    return json({ ok: r.ok, date: r.date, sent: r.sent, failed: r.failed, skipped: r.skipped, unlinked: r.unlinked, truncated: r.truncated, feedCount: r.feedCount, radarCount: r.radarCount, problems: r.feedErrors });
  } catch (e) {
    try { await logEvent(store || { addLog: async () => {} }, { type: 'cron_error', level: 'error', message: `Daily job failed: ${String(e.message || e).slice(0, 300)}` }); } catch { /* ignore */ }
    return json({ ok: false, error: 'daily job failed' }, 500);
  }
}
