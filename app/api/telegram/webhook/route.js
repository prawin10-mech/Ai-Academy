import { getStore, json } from '../../../../lib/http.js';
import { handleUpdate, webhookAuthorized } from '../../../../lib/bot.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Telegram calls this when someone messages the bot. Register it once with scripts/set-webhook.mjs.
export async function POST(request) {
  if (!webhookAuthorized(request)) return json({ error: 'unauthorized' }, 401);
  let update;
  try { update = await request.json(); } catch { return json({ ok: true }); }
  try {
    const store = await getStore();
    await handleUpdate({ store, update });
  } catch { /* always answer 200 so Telegram does not retry forever */ }
  return json({ ok: true });
}
