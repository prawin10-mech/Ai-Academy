import { getStore, json } from '../../../../lib/http.js';
import { getSessionUser } from '../../../../lib/security.js';
import { publicUser } from '../../../../lib/users.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const store = await getStore();
    const user = await getSessionUser(request, store);
    return json({ user: user ? publicUser(user) : null, botUsername: process.env.TELEGRAM_BOT_USERNAME || null });
  } catch {
    return json({ user: null, error: 'unavailable' }, 503);
  }
}
