import { json, readJson, withUser } from '../../../lib/http.js';
import { verifyPassword, clearCookie } from '../../../lib/security.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Permanently deletes the account and everything stored for it. Requires the password.
export const DELETE = withUser(async ({ request, store, user }) => {
  const { body } = await readJson(request, 2000);
  if (!body || !(await verifyPassword(String(body.password || ''), user.passHash))) return json({ error: 'Password is incorrect.' }, 403);
  await store.deleteUser(user.id);
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}, { rate: { name: 'del', max: 5, windowSec: 900 } });
