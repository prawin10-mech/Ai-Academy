import { getStore } from '../../../lib/db.js';
import { checkAccess, json } from '../../../lib/auth.js';
import { logEvent } from '../../../lib/log.js';
import { evaluate, normalizeState, streak } from '../../../lib/scoring.js';
import { dateInZone, DEFAULT_TZ } from '../../../lib/dates.js';
import { STREAK_MILESTONES } from '../../../lib/events.js';
import topicsData from '../../../data/topics.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function valid(a) {
  return a && typeof a.ts === 'number' && (a.mode === 'daily' || a.mode === 'course') && Number.isInteger(a.score) && Number.isInteger(a.total) &&
    a.total > 0 && a.total <= 20 && Array.isArray(a.qs) && a.qs.length === a.total && a.qs.every((q) => typeof q.id === 'string' && topicsData.topics[q.t] && typeof q.ok === 'boolean');
}

export async function POST(request) {
  if (!checkAccess(request)) return json({ error: 'unauthorized' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const a = body && body.attempt;
  if (!valid(a)) return json({ error: 'invalid attempt' }, 400);
  try {
    const store = await getStore();
    const state = normalizeState(await store.getState());
    if (!state.attempts.some((x) => x.ts === a.ts && x.mode === a.mode)) state.attempts.push(a);
    state.attempts = state.attempts.slice(-300);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(a.day || '') ? a.day : dateInZone(new Date(), process.env.TZ_NAME || DEFAULT_TZ);
    state.days[day] = 1;

    const ev = evaluate(state, topicsData.topics);
    const weakest = ev.rows.filter((r) => r.mastery != null).sort((x, y) => x.mastery - y.mastery)[0];
    const pct = Math.round((100 * a.score) / a.total);
    await logEvent(store, {
      type: a.mode === 'daily' ? 'quiz_daily_done' : 'quiz_course_done',
      message: `Score ${a.score}/${a.total} (${pct}%).${weakest ? ` Weakest topic: ${weakest.name} ${weakest.mastery}%.` : ''}`,
      data: { score: a.score, total: a.total, topics: a.topics },
    });

    const s = streak(state, day);
    if (STREAK_MILESTONES.includes(s) && state.milestone?.date !== day) {
      state.milestone = { n: s, date: day };
      await logEvent(store, { type: 'streak_milestone', message: `${s}-day streak. Keep it going.` });
    }
    await store.putState(state);
    return json({ ok: true, streak: s });
  } catch (e) {
    return json({ error: 'storage unavailable', detail: String(e.message || e) }, 503);
  }
}
