import { getStore, json } from '../../../lib/http.js';
import { getSessionUser } from '../../../lib/security.js';
import { botConfigured, telegramConfigured } from '../../../lib/telegram.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public: liveness only. The owner (ADMIN_EMAIL account) also sees configuration flags, never values.
export async function GET(request) {
  const out = { ok: true };
  try {
    const store = await getStore();
    const user = await getSessionUser(request, store);
    await store.getState('health-probe');
    if (user && user.admin) {
      out.store = store.kind;
      out.users = (await store.countUsers?.()) ?? null;
      out.botConfigured = botConfigured();
      out.adminChatConfigured = telegramConfigured();
      out.botUsernameSet = !!process.env.TELEGRAM_BOT_USERNAME;
      out.webhookSecretSet = !!process.env.TELEGRAM_WEBHOOK_SECRET;
      out.cronSecretSet = !!process.env.CRON_SECRET;
      out.sessionSecretSet = !!process.env.SESSION_SECRET;
    }
  } catch { out.ok = false; out.storage = globalThis.__academyStoreError || 'unavailable'; }
  return json(out, out.ok ? 200 : 503);
}
