import { getStore, json, readJson, clientIp, limited } from '../../../../lib/http.js';
import { loginUser, normalizeEmail, publicUser } from '../../../../lib/users.js';
import { sameOrigin, sessionCookie } from '../../../../lib/security.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'bad origin' }, 403);
  const { body } = await readJson(request, 5000);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  let store;
  try { store = await getStore(); } catch { return json({ error: 'Storage unavailable.' }, 503); }
  const ip = clientIp(request);
  const em = normalizeEmail(body.email);
  if ((await limited(store, `login:${ip}:${em}`, 8, 900)) || (await limited(store, `loginip:${ip}`, 40, 3600))) {
    return json({ error: 'Too many attempts. Wait a few minutes and try again.' }, 429);
  }
  const r = await loginUser(store, body);
  if (r.error) return json({ error: r.error }, r.status);
  return json({ user: publicUser(r.user) }, 200, { 'set-cookie': sessionCookie(r.user) });
}
