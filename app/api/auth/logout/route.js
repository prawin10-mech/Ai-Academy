import { json } from '../../../../lib/http.js';
import { clearCookie, sameOrigin } from '../../../../lib/security.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'bad origin' }, 403);
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}
