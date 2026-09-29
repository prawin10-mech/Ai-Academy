import { getStore, json, readJson, clientIp, limited } from '../../../../lib/http.js';
import { registerUser, publicUser } from '../../../../lib/users.js';
import { sameOrigin, sessionCookie } from '../../../../lib/security.js';
import { logEvent } from '../../../../lib/log.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'bad origin' }, 403);
  const { body } = await readJson(request, 5000);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  let store;
  try { store = await getStore(); } catch { return json({ error: 'Storage unavailable.' }, 503); }
  const ip = clientIp(request);
  if (await limited(store, `reg:${ip}`, 5, 3600)) return json({ error: 'Too many sign-ups from this network. Try again later.' }, 429);
  if (body.website) return json({ error: 'Invalid request.' }, 400); // honeypot field, humans leave it empty
  const r = await registerUser(store, body);
  if (r.error) return json({ error: r.error }, r.status);
  await logEvent(store, { user: r.user, type: 'account_created', message: 'Account created.' });
  await logEvent(store, { type: 'new_signup', message: `New learner joined (${(await store.countUsers?.()) ?? '?'} total).` });
  return json({ user: publicUser(r.user) }, 201, { 'set-cookie': sessionCookie(r.user) });
}
