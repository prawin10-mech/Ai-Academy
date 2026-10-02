// Owner dashboard numbers. Pure functions so they can be tested without a database.
const DAY = 86400000;

export function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!domain) return '';
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(local.length - 2, 5)))}@${domain}`;
}

// users: [{id,email,name,createdAt,telegramChatId,digest}], states: { [uid]: {updatedAt,profile,done,practice} }
export function computeStats(users, states = {}, now = Date.now(), tzOffsetMin = 240, catalog = {}) {
  const list = Array.isArray(users) ? users : [];
  const st = (u) => states[u.id] || {};
  const since = (ms, field) => list.filter((u) => now - (field(u) || 0) <= ms && field(u)).length;
  const lastActive = (u) => Math.max(st(u).updatedAt || 0, 0);
  const dayKey = (t) => new Date(t + tzOffsetMin * 60000).toISOString().slice(0, 10);
  const perDay = {};
  for (let i = 13; i >= 0; i--) perDay[dayKey(now - i * DAY)] = 0;
  for (const u of list) { const k = dayKey(u.createdAt || 0); if (k in perDay) perDay[k]++; }
  const solved = (u) => Object.values(st(u).practice || {}).filter((p) => p && p.passed).length;
  const lessons = (u) => Object.values(st(u).done || {}).filter(Boolean).length;
  const onboarded = list.filter((u) => st(u).profile);
  const sum = (f) => list.reduce((a, u) => a + f(u), 0);
  const recent = [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 10).map((u) => ({
    name: u.name || '', email: maskEmail(u.email), joined: u.createdAt || 0, telegram: !!u.telegramChatId,
    onboarded: !!st(u).profile, lessons: lessons(u), solved: solved(u), lastActive: lastActive(u) || null,
  }));
  // Retention: of the users who signed up at least N days ago, how many were active on some day N or more days after signing up.
  const dayNum = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);
  const retained = (n) => {
    const eligible = list.filter((u) => u.createdAt && now - u.createdAt >= n * DAY);
    const back = eligible.filter((u) => { const start = dayNum(dayKey(u.createdAt)); return Object.keys(st(u).days || {}).some((d) => dayNum(d) - start >= n); });
    return { eligible: eligible.length, returned: back.length, pct: eligible.length ? Math.round((100 * back.length) / eligible.length) : null };
  };
  const funnel = [
    ['Signed up', list.length],
    ['Finished onboarding', onboarded.length],
    ['Finished a lesson', list.filter((u) => lessons(u) > 0).length],
    ['Passed an exercise', list.filter((u) => solved(u) > 0).length],
    ['Linked Telegram', list.filter((u) => u.telegramChatId).length],
    ['Active in last 7 days', since(7 * DAY, lastActive)],
  ].map(([label, count]) => ({ label, count, pct: list.length ? Math.round((100 * count) / list.length) : 0 }));
  // Streaks come from the activity days in each user's state.
  const streakOf = (u) => {
    const days = st(u).days || {};
    let d = dayKey(now); if (!days[d]) d = dayKey(now - DAY);
    let n = 0;
    while (days[d]) { n++; d = new Date(Date.parse(`${d}T00:00:00Z`) - DAY).toISOString().slice(0, 10); }
    return n;
  };
  const streaks = list.map(streakOf);
  // Content: exercise pass rates and lesson completions.
  const exercises = (catalog.exercises || []).map((e) => {
    let tried = 0; let passed = 0;
    for (const u of list) { const p = (st(u).practice || {})[e.id]; if (p && (p.attempts > 0 || p.passed)) tried++; if (p && p.passed) passed++; }
    return { id: e.id, title: e.title, tried, passed, rate: tried ? Math.round((100 * passed) / tried) : null };
  });
  const lessonCounts = {};
  for (const u of list) for (const [id, v] of Object.entries(st(u).done || {})) if (v) lessonCounts[id] = (lessonCounts[id] || 0) + 1;
  const courses = (catalog.courses || []).map((c) => {
    const total = c.lessons.length; const done = c.lessons.reduce((a, id) => a + (lessonCounts[id] || 0), 0);
    const starters = list.filter((u) => c.lessons.some((id) => (st(u).done || {})[id])).length;
    return { id: c.id, title: c.title, starters, lessonsDone: done, avgPct: starters && total ? Math.round((100 * done) / (starters * total)) : 0 };
  });
  const hardest = exercises.filter((e) => e.tried >= 3).sort((a, b) => a.rate - b.rate).slice(0, 5);
  const popularExercises = [...exercises].sort((a, b) => b.tried - a.tried).slice(0, 5).filter((e) => e.tried > 0);
  const topCourses = [...courses].sort((a, b) => b.starters - a.starters).slice(0, 5).filter((c) => c.starters > 0);
  const leastFinished = courses.filter((c) => c.starters >= 3).sort((a, b) => a.avgPct - b.avgPct).slice(0, 5);
  const langs = { python: 0, js: 0 };
  for (const u of list) for (const p of Object.values(st(u).practice || {})) { if (p && p.js) langs.js++; if (p && p.py) langs.python++; }
  return {
    retention: { d1: retained(1), d7: retained(7), d30: retained(30) },
    funnel,
    streaks: { onStreak: streaks.filter((n) => n > 0).length, best: Math.max(0, ...streaks), avg: streaks.filter((n) => n > 0).length ? Math.round((10 * streaks.filter((n) => n > 0).reduce((a, b) => a + b, 0)) / streaks.filter((n) => n > 0).length) / 10 : 0 },
    content: { hardest, popularExercises, topCourses, leastFinished },
    languages: langs,
    total: list.length,
    newToday: since(DAY, (u) => u.createdAt), new7d: since(7 * DAY, (u) => u.createdAt), new30d: since(30 * DAY, (u) => u.createdAt),
    active24h: since(DAY, lastActive), active7d: since(7 * DAY, lastActive), active30d: since(30 * DAY, lastActive),
    onboarded: onboarded.length,
    telegramLinked: list.filter((u) => u.telegramChatId).length,
    digestOn: list.filter((u) => u.telegramChatId && u.digest !== false).length,
    lessonsDone: sum(lessons), exercisesPassed: sum(solved),
    avgLessons: list.length ? Math.round((sum(lessons) / list.length) * 10) / 10 : 0,
    signupsPerDay: Object.entries(perDay).map(([date, count]) => ({ date, count })),
    recent,
  };
}
