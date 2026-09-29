import { getStore } from '../../../lib/db.js';
import { accessRequired, checkAccess, json } from '../../../lib/auth.js';
import { telegramConfigured } from '../../../lib/telegram.js';
import { logEvent } from '../../../lib/log.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public: tells the UI whether a key is needed. Config booleans only, never values.
// With a valid key, ?telegram=1 sends a test message so you can confirm the bot works.
export async function GET(request) {
  const authed = checkAccess(request);
  const out = { ok: true, accessRequired: accessRequired() };
  if (!authed) return json(out);
  out.telegramConfigured = telegramConfigured();
  out.cronSecretSet = !!process.env.CRON_SECRET;
  out.mongoConfigured = !!process.env.MONGODB_URI;
  try {
    const store = await getStore();
    out.store = store.kind;
    await store.getState();
    if (new URL(request.url).searchParams.get('telegram') === '1') {
      const r = await logEvent(store, { type: 'health_test', message: 'AI Academy can reach this chat.' });
      out.telegramTest = r.telegram ? (r.telegram.ok ? 'sent' : r.telegram.skipped ? 'not configured' : `failed: ${r.telegram.reason}`) : 'not sent';
    }
  } catch (e) {
    out.ok = false;
    out.storeError = String(e.message || e).slice(0, 200);
  }
  return json(out, out.ok ? 200 : 503);
}
