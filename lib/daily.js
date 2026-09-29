// The daily job: refresh the paper feed, evaluate the learner, write today's plan, send the digest.
import { dateInZone, prettyDate, DEFAULT_TZ, addDays } from './dates.js';
import { activityOn, evaluate, streak, totals } from './scoring.js';
import { fetchFeed } from './feed.js';
import { makePlan } from './plan.js';
import { escapeHtml, sendTelegram } from './telegram.js';
import { logEvent } from './log.js';

export function buildDigest({ date, state, courses, topics, plan, papers, feedItems, errors, appUrl }) {
  const ev = evaluate(state, topics);
  const t = totals(state, courses);
  const s = streak(state, date);
  const yday = activityOn(state, addDays(date, -1));
  const lines = [];
  lines.push(`📚 <b>AI Academy</b> · ${escapeHtml(prettyDate(date))}`);
  lines.push('');
  lines.push(`🔥 Streak: <b>${s}</b> day${s === 1 ? '' : 's'} · Steps done: <b>${t.done}/${t.total}</b>`);
  lines.push(yday.quizzes ? `Yesterday: ${yday.quizzes} quiz${yday.quizzes === 1 ? '' : 'zes'}, ${yday.correct}/${yday.answered} correct` : `Yesterday: ${yday.active ? 'studied, no quiz' : 'no activity'}`);
  lines.push('');
  lines.push('<b>Evaluation</b>');
  const rows = [...ev.rows].sort((a, b) => (a.mastery ?? 101) - (b.mastery ?? 101));
  for (const r of rows) {
    const icon = r.mastery == null ? '⚪' : r.mastery >= 80 ? '🟢' : r.mastery >= 50 ? '🟡' : '🔴';
    lines.push(`${icon} ${escapeHtml(r.name)}: ${r.mastery == null ? 'not assessed' : r.mastery + '%'}`);
  }
  lines.push('');
  lines.push(`🎯 <b>Focus:</b> ${escapeHtml(plan.focus)}`);
  lines.push(escapeHtml(plan.why));
  lines.push('');
  lines.push("<b>Today's plan</b>");
  plan.tasks.forEach((tk, i) => lines.push(`${i + 1}. ${escapeHtml(tk.t)}`));
  if (feedItems.length) {
    lines.push('');
    lines.push('<b>New papers</b>');
    for (const p of feedItems.slice(0, 3)) lines.push(`• <a href="${escapeHtml(p.url)}">${escapeHtml(p.title.slice(0, 110))}</a>`);
  }
  if (errors.length) {
    lines.push('');
    lines.push(`⚠️ ${escapeHtml(errors.join('; '))}`);
  }
  if (appUrl) {
    lines.push('');
    lines.push(`<a href="${escapeHtml(appUrl)}">Open the academy</a>`);
  }
  return lines.join('\n');
}

export async function runDaily({ store, env = process.env, fetchFn = fetch, now = new Date(), courses, topics, papers, force = false }) {
  const tz = env.TZ_NAME || DEFAULT_TZ;
  const date = dateInZone(now, tz);
  const state = await store.getState();

  const existing = await store.getDaily(date);
  if (existing && !force) {
    await logEvent(store, { type: 'cron_ok', message: `Plan for ${date} already exists, skipped.`, env, fetchFn });
    return { ok: true, skipped: true, date };
  }

  const feed = await fetchFeed(fetchFn);
  if (feed.items.length) await store.putFeed(date, feed.items);
  const feedItems = feed.items.length ? feed.items : ((await store.latestFeed())?.items || []);

  const plan = makePlan({ state, courses, topics, papers, newPapers: feedItems, date });
  await store.putDaily(plan);

  const appUrl = env.APP_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  const digest = buildDigest({ date, state, courses, topics, plan, papers, feedItems, errors: feed.errors, appUrl });
  const tg = await sendTelegram(digest, { env, fetchFn });

  await logEvent(store, { type: 'daily_digest', message: `Digest for ${date}. Telegram: ${tg.ok ? 'sent' : tg.skipped ? 'not configured' : 'failed - ' + tg.reason}`, data: { tasks: plan.tasks.length, feed: feedItems.length }, env, fetchFn, telegram: false });
  if (feed.errors.length || (!tg.ok && !tg.skipped)) {
    await logEvent(store, { type: 'cron_error', level: 'warn', message: [...feed.errors, !tg.ok && !tg.skipped ? `Telegram: ${tg.reason}` : null].filter(Boolean).join('; '), env, fetchFn, telegram: !!tg.ok });
  }
  return { ok: true, date, plan, telegram: tg, feedCount: feedItems.length, feedErrors: feed.errors };
}
