import { json, withUser } from '../../../../lib/http.js';
import { computeStats } from '../../../../lib/adminStats.js';
import { botConfigured } from '../../../../lib/telegram.js';
import courses from '../../../../data/courses.json';
import exercises from '../../../../data/exercises.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const catalog = {
  exercises: exercises.map((e) => ({ id: e.id, title: e.title })),
  courses: courses.map((c) => ({ id: c.id, title: c.title, lessons: c.lessons.map((l) => l.id) })),
};

const csvCell = (v) => { const t = String(v == null ? '' : v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

// Owner only. Aggregate numbers, the 10 newest sign-ups (emails masked), a health summary and an optional CSV.
export const GET = withUser(async ({ request, store, user, env }) => {
  if (!user.admin) return json({ error: 'forbidden' }, 403);
  const { users, states } = await store.statsData();
  const stats = computeStats(users, states, Date.now(), 240, catalog);
  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const rows = [['section', 'name', 'value', 'extra']];
    for (const [k, v] of Object.entries({ users: stats.total, new7d: stats.new7d, new30d: stats.new30d, active7d: stats.active7d, telegramLinked: stats.telegramLinked })) rows.push(['summary', k, v, '']);
    for (const f of stats.funnel) rows.push(['funnel', f.label, f.count, `${f.pct}%`]);
    for (const k of ['d1', 'd7', 'd30']) rows.push(['retention', k, stats.retention[k].returned, `of ${stats.retention[k].eligible}`]);
    for (const d of stats.signupsPerDay) rows.push(['signups', d.date, d.count, '']);
    for (const e of stats.content.hardest) rows.push(['hard-exercise', e.title, e.rate, `${e.passed}/${e.tried} passed`]);
    for (const c of stats.content.topCourses) rows.push(['top-course', c.title, c.starters, `${c.avgPct}% avg done`]);
    return new Response(toCsv(rows), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="academy-stats.csv"', 'cache-control': 'no-store' } });
  }
  const feed = await store.latestFeed().catch(() => null);
  const radar = await store.latestRadar().catch(() => null);
  const health = {
    storage: store.kind,
    botConfigured: botConfigured(env),
    webhookSecretSet: !!env.TELEGRAM_WEBHOOK_SECRET,
    cronSecretSet: !!env.CRON_SECRET,
    appUrlSet: !!env.APP_URL,
    lastDailyFeed: feed && feed.date || null,
    lastRadar: radar && radar.date || null,
  };
  return json({ stats, health, storage: store.kind, capped: users.length >= 5000 });
}, { rate: { name: 'adminstats', max: 60, windowSec: 3600 } });
