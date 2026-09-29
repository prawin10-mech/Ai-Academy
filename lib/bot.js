// Telegram webhook logic: linking a chat to an account, and stopping notifications.
import { escapeHtml, sendTelegram } from './telegram.js';
import { logEvent } from './log.js';
import { timingSafeEqual } from './security.js';

export function webhookAuthorized(request, env = process.env) {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return false;
  return timingSafeEqual(request.headers.get('x-telegram-bot-api-secret-token'), env.TELEGRAM_WEBHOOK_SECRET);
}

export async function handleUpdate({ store, update, env = process.env, fetchFn = fetch, now = Date.now() }) {
  const msg = update && update.message;
  if (!msg || !msg.chat || typeof msg.text !== 'string' || msg.chat.type !== 'private') return { handled: false };
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();
  const reply = (t) => sendTelegram(t, { env, fetchFn, chatId });

  const start = text.match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{8,64}))?$/);
  if (start) {
    const token = start[1];
    if (!token) {
      await reply('Welcome to <b>AI Engineer Academy</b>. To get your daily digest here, open Settings on the website, press "Link Telegram" and follow the button.');
      return { handled: true, action: 'help' };
    }
    const user = await store.getUserByLinkToken(token);
    if (!user || !user.telegramLinkExpires || user.telegramLinkExpires < now) {
      await reply('That link has expired. Open Settings on the website and press "Link Telegram" again.');
      return { handled: true, action: 'expired' };
    }
    // One chat belongs to one account.
    const other = await store.getUserByChat(chatId);
    if (other && other.id !== user.id) await store.updateUser(other.id, { telegramChatId: undefined });
    const updated = await store.updateUser(user.id, { telegramChatId: chatId, telegramLinkToken: undefined, telegramLinkExpires: undefined, digest: true });
    await logEvent(store, { user: updated, type: 'telegram_linked', message: 'Telegram linked.', env, fetchFn });
    await reply(`Linked${user.name ? `, ${escapeHtml(user.name)}` : ''}. You will get your daily digest here. Send /stop to unlink.`);
    return { handled: true, action: 'linked', userId: user.id };
  }

  if (/^\/stop(?:@\w+)?$/.test(text)) {
    const user = await store.getUserByChat(chatId);
    if (user) await store.updateUser(user.id, { telegramChatId: undefined });
    await reply('Unlinked. You will not get messages here anymore. Link again any time from Settings.');
    return { handled: true, action: 'stopped', userId: user ? user.id : null };
  }

  await reply('I only send your daily digest. Use Settings on the website to change what you get, or /stop to unlink.');
  return { handled: true, action: 'unknown' };
}
