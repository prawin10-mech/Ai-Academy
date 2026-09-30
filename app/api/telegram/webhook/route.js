import { getStore, json } from '../../../../lib/http.js';
import { handleUpdate, webhookAuthorized } from '../../../../lib/bot.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Telegram calls this when someone messages the bot. Register it once with scripts/set-webhook.mjs.
export async function POST(request) {
  if (!webhookAuthorized(request)) {
    console.warn('[telegram] webhook rejected: secret missing or does not match TELEGRAM_WEBHOOK_SECRET');
    return json({ error: 'unauthorized' }, 401);
  }
  let update;
  try { update = await request.json(); } catch { return json({ ok: true }); }
  try {
    const store = await getStore();
    await handleUpdate({ store, update });
  } catch (e) {
    // Answer 200 so Telegram does not retry forever, but leave a trace in the server logs.
    console.error('[telegram] webhook handler failed:', String((e && e.message) || e).slice(0, 200));
  }
  return json({ ok: true });
}
