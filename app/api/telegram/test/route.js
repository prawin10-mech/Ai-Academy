import { json, withUser } from '../../../../lib/http.js';
import { sendTelegram, botConfigured } from '../../../../lib/telegram.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Sends a short test message so the learner can see the link works.
export const POST = withUser(async ({ user, env }) => {
  if (!botConfigured(env)) return json({ error: 'Telegram is not set up on this site yet.' }, 503);
  if (!user.telegramChatId) return json({ error: 'Telegram is not linked yet.' }, 400);
  const r = await sendTelegram('✅ Test message from AI Engineer Academy. Your Telegram link works. Send /help to see what I can do.', { env, chatId: user.telegramChatId });
  if (!r.ok) return json({ error: 'Telegram did not accept the message. Try unlinking and linking again.' }, 502);
  return json({ ok: true });
}, { rate: { name: 'tgtest', max: 5, windowSec: 3600 } });
