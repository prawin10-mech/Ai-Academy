// The daily job for all learners: refresh the shared paper feed once, then send each linked learner their digest
// when it is due in their own time zone. Plans for other learners are created lazily when they open the site.
import { addDays, dateInZone, prettyDate } from './dates.js';
import { activityOn, evaluate, streak, totals } from './scoring.js';
import { fetchFeed } from './feed.js';
import { fetchRadar } from './radar.js';
import { ensurePlan } from './planner.js';
import { escapeHtml, sendTelegram } from './telegram.js';
import { logEvent } from './log.js';

export function localHour(now, tz) {
  try {
    const h = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now);
    return parseInt(h, 10);
  } catch { return now.getUTCHours(); }
}

export function buildDigest({ name = '', date, state, courses, topics, plan, feedItems, radarItems = [], errors = [], appUrl }) {
  const ev = evaluate(state, topics);
  const t = totals(state, courses);
  const s = streak(state, date);
  const yday = activityOn(state, addDays(date, -1));
  const lines = [];
  lines.push(`📚 <b>AI Academy</b> · ${escapeHtml(prettyDate(date))}${name ? ` · ${escapeHtml(name)}` : ''}`);
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
  const launches = radarItems.filter((r) => r.vendor && r.source !== 'Hugging Face trending').slice(0, 3);
  if (launches.length) {
    lines.push('');
    lines.push('<b>New in AI</b>');
    for (const r of launches) lines.push(`• [${escapeHtml(r.vendor)}] <a href="${escapeHtml(r.url)}">${escapeHtml(r.title.slice(0, 100))}</a>`);
  }
  if (feedItems.length) {
    lines.push('');
    lines.push('<b>New papers</b>');
    for (const p of feedItems.slice(0, 3)) lines.push(`• <a href="${escapeHtml(p.url)}">${escapeHtml(p.title.slice(0, 110))}</a>`);
  }
  if (errors.length) { lines.push(''); lines.push(`⚠️ ${escapeHtml(errors.join('; '))}`); }
  if (appUrl) { lines.push(''); lines.push(`<a href="${escapeHtml(appUrl)}">Open the academy</a>`); }
  return lines.join('\n');
}

export function digestDue(user, now, force = false) {
  if (!user.telegramChatId) return false;
  if (force) return true;
  if (user.digest === false) return false;
  const tz = user.tz || 'UTC';
  const date = dateInZone(now, tz);
  if (user.lastDigestDate === date) return false;
  // Send from the chosen hour until 12 hours later, so an hourly trigger that misses a beat still catches up.
  const h = localHour(now, tz);
  const from = user.digestHour ?? 7;
  return h >= from && h < from + 12;
}

export async function runDaily({ store, env = process.env, fetchFn = fetch, now = new Date(), courses, topics, papers, force = false, budgetMs = Number(env.CRON_BUDGET_MS) || 45000 }) {
  const started = Date.now();
  const appUrl = env.APP_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');

  // 1) shared paper feed, once per UTC day
  const feed = await fetchFeed(fetchFn);
  const utcDay = dateInZone(now, 'UTC');
  if (feed.items.length) await store.putFeed(utcDay, feed.items);
  const feedItems = feed.items.length ? feed.items : ((await store.latestFeed())?.items || []);

  // 1b) shared AI radar (model launches and tools)
  const radar = await fetchRadar(fetchFn, now.getTime());
  if (radar.items.length) await store.putRadar(utcDay, radar.items);
  const radarItems = radar.items.length ? radar.items : ((await store.latestRadar())?.items || []);

  // 2) per-learner digests
  const stats = { sent: 0, failed: 0, skipped: 0, unlinked: 0, truncated: false };
  let after = '';
  outer: for (;;) {
    const page = await store.listLinkedUsers({ after, limit: 100 });
    if (!page.length) break;
    after = page[page.length - 1].id;
    for (let i = 0; i < page.length; i += 8) {
      if (Date.now() - started > budgetMs) { stats.truncated = true; break outer; }
      await Promise.all(page.slice(i, i + 8).map(async (user) => {
        try {
          if (!digestDue(user, now, force)) { stats.skipped++; return; }
          const state = await store.getState(user.id);
          const { plan, date } = await ensurePlan(store, user, state, { courses, topics, papers, feedItems, now, force });
          const text = buildDigest({ name: user.name, date, state, courses, topics, plan, feedItems, radarItems, errors: [], appUrl });
          const r = await sendTelegram(text, { env, fetchFn, chatId: user.telegramChatId });
          if (r.ok) {
            await store.updateUser(user.id, { lastDigestDate: date });
            await logEvent(store, { user, type: 'daily_digest', message: `Digest for ${date} sent.`, env, fetchFn, telegram: false });
            stats.sent++;
          } else if (r.skipped) {
            stats.skipped++;
          } else {
            stats.failed++;
            // 403 = the learner blocked the bot, 400 = chat no longer exists: stop trying.
            if (r.status === 403 || r.status === 400) { await store.updateUser(user.id, { telegramChatId: undefined }); stats.unlinked++; }
            await logEvent(store, { user, type: 'daily_digest', level: 'warn', message: `Digest failed: ${r.reason}`, env, fetchFn, telegram: false });
          }
        } catch (e) {
          stats.failed++;
          await logEvent(store, { type: 'cron_error', level: 'warn', message: `Digest for ${user.id} failed: ${String(e.message || e).slice(0, 200)}`, env, fetchFn, telegram: false });
        }
      }));
    }
  }

  // 3) owner summary
  const problems = [...feed.errors, ...radar.errors];
  if (stats.truncated) problems.push('time budget reached, some learners were not processed');
  const msg = `Digests sent ${stats.sent}, failed ${stats.failed}, skipped ${stats.skipped}${stats.unlinked ? `, unlinked ${stats.unlinked}` : ''}. Feed: ${feedItems.length} papers, radar: ${radarItems.length} items.${problems.length ? ' ' + problems.join('; ') : ''}`;
  if (stats.sent || stats.failed || problems.length || force) {
    await logEvent(store, { type: problems.length || stats.failed ? 'cron_error' : 'cron_summary', level: problems.length || stats.failed ? 'warn' : 'info', message: msg, env, fetchFn });
  }
  return { ok: true, date: utcDay, ...stats, feedCount: feedItems.length, radarCount: radarItems.length, feedErrors: [...feed.errors, ...radar.errors], message: msg };
}
