import { json, readJson, withUser } from '../../../../lib/http.js';
import { changePassword } from '../../../../lib/users.js';
import { sessionCookie } from '../../../../lib/security.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withUser(async ({ request, store, user }) => {
  const { body } = await readJson(request, 2000);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  const r = await changePassword(store, user, { current: body.current, next: body.next });
  if (r.error) return json({ error: r.error }, r.status);
  // Old sessions on other devices stop working; this one gets a fresh cookie.
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(r.user) });
}, { rate: { name: 'pw', max: 5, windowSec: 900 } });
