// Owner dashboard numbers. Pure functions so they can be tested without a database.
const DAY = 86400000;

export function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!domain) return '';
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(local.length - 2, 5)))}@${domain}`;
}

// users: [{id,email,name,createdAt,telegramChatId,digest}], states: { [uid]: {updatedAt,profile,done,practice} }
export function computeStats(users, states = {}, now = Date.now(), tzOffsetMin = 240) {
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
  return {
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
