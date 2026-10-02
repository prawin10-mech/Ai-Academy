// The public address of the site, used for share links and search engines.
export function siteUrl(env = process.env) {
  const fixed = String(env.APP_URL || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//.test(fixed)) return fixed;
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export const SITE_NAME = 'AI Engineer Academy';
export const SITE_TAGLINE = 'Become a hireable AI engineer in 6 months';
export const SITE_DESC = 'A free, job-focused 26-week path for developers: agentic AI, RAG, evals and production, with Python and JavaScript practice that runs in your browser.';

// Share-card numbers come from a URL anyone can edit, so they are clamped and the name is cleaned.
export function cardParams(q = {}) {
  const num = (v, max) => { const n = parseInt(Array.isArray(v) ? v[0] : v, 10); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };
  const rawName = String(Array.isArray(q.n) ? q.n[0] : q.n || '');
  const name = rawName.replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 20);
  return { week: Math.max(1, num(q.w, 26)), streak: num(q.s, 999), lessons: num(q.l, 9999), solved: num(q.p, 999), name };
}
export function cardQuery({ week, streak, lessons, solved, name }) {
  const p = new URLSearchParams({ w: String(week), s: String(streak), l: String(lessons), p: String(solved) });
  if (name) p.set('n', name);
  return p.toString();
}
