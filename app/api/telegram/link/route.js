import { json, withUser } from '../../../../lib/http.js';
import { randomId } from '../../../../lib/security.js';
import { botConfigured, registerWebhook } from '../../../../lib/telegram.js';
import { COMMANDS } from '../../../../lib/bot.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Creates a one-time link (valid 15 minutes). Opening it in Telegram and pressing Start links that chat.
export const POST = withUser(async ({ request, store, user, env }) => {
  if (!botConfigured(env) || !env.TELEGRAM_BOT_USERNAME) return json({ error: 'Telegram is not set up on this site yet.' }, 503);
  // Self-heal: make sure Telegram knows where to send messages, so /start is never met with silence.
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const base = /^https:\/\//.test(env.APP_URL || '') ? env.APP_URL : `https://${host}`;
  const hook = await registerWebhook({ baseUrl: base, env, commands: COMMANDS }).catch(() => ({ ok: false }));
  const token = randomId(16);
  await store.updateUser(user.id, { telegramLinkToken: token, telegramLinkExpires: Date.now() + 15 * 60 * 1000 });
  return json({ url: `https://t.me/${env.TELEGRAM_BOT_USERNAME.replace(/^@/, '')}?start=${token}`, expiresInMinutes: 15, ...(hook.ok ? {} : { warning: hook.reason || 'Could not register the bot webhook.' }) });
}, { rate: { name: 'tglink', max: 10, windowSec: 3600 } });
