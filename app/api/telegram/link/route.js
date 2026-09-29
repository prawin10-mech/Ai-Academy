import { json, withUser } from '../../../../lib/http.js';
import { randomId } from '../../../../lib/security.js';
import { botConfigured } from '../../../../lib/telegram.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Creates a one-time link (valid 15 minutes). Opening it in Telegram and pressing Start links that chat.
export const POST = withUser(async ({ store, user, env }) => {
  if (!botConfigured(env) || !env.TELEGRAM_BOT_USERNAME) return json({ error: 'Telegram is not set up on this site yet.' }, 503);
  const token = randomId(16);
  await store.updateUser(user.id, { telegramLinkToken: token, telegramLinkExpires: Date.now() + 15 * 60 * 1000 });
  return json({ url: `https://t.me/${env.TELEGRAM_BOT_USERNAME.replace(/^@/, '')}?start=${token}`, expiresInMinutes: 15 });
}, { rate: { name: 'tglink', max: 10, windowSec: 3600 } });
