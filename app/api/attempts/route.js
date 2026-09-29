import { json, readJson, withUser } from '../../../lib/http.js';
import { logEvent } from '../../../lib/log.js';
import { evaluate, normalizeState, streak } from '../../../lib/scoring.js';
import { dateInZone } from '../../../lib/dates.js';
import { STREAK_MILESTONES } from '../../../lib/events.js';
import topicsData from '../../../data/topics.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function valid(a) {
  return a && typeof a.ts === 'number' && ['daily', 'course', 'placement'].includes(a.mode) && Number.isInteger(a.score) && Number.isInteger(a.total) &&
    a.total > 0 && a.total <= 30 && Array.isArray(a.qs) && a.qs.length === a.total &&
    a.qs.every((q) => typeof q.id === 'string' && topicsData.topics[q.t] && typeof q.ok === 'boolean');
}

export const POST = withUser(async ({ request, store, user, env }) => {
  const { body } = await readJson(request, 20000);
  const a = body && body.attempt;
  if (!valid(a)) return json({ error: 'invalid attempt' }, 400);
  const state = normalizeState(await store.getState(user.id));
  if (!state.attempts.some((x) => x.ts === a.ts && x.mode === a.mode)) state.attempts.push(a);
  state.attempts = state.attempts.slice(-300);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(a.day || '') ? a.day : dateInZone(new Date(), user.tz || 'UTC');
  state.days[day] = 1;

  const ev = evaluate(state, topicsData.topics);
  const weakest = ev.rows.filter((r) => r.mastery != null).sort((x, y) => x.mastery - y.mastery)[0];
  const pct = Math.round((100 * a.score) / a.total);
  const type = a.mode === 'daily' ? 'quiz_daily_done' : 'quiz_course_done';
  await logEvent(store, {
    user, type, env,
    message: `Score ${a.score}/${a.total} (${pct}%).${weakest ? ` Weakest topic: ${weakest.name} ${weakest.mastery}%.` : ''}`,
    data: { score: a.score, total: a.total, topics: a.topics },
  });

  const s = streak(state, day);
  if (STREAK_MILESTONES.includes(s) && state.milestone?.date !== day) {
    state.milestone = { n: s, date: day };
    await logEvent(store, { user, type: 'streak_milestone', message: `${s}-day streak. Keep it going.`, env });
  }
  await store.putState(user.id, state);
  return json({ ok: true, streak: s });
}, { rate: { name: 'att', max: 60, windowSec: 600 } });
