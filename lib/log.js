// One entry point for logging: always stored, optionally pushed to Telegram according to events.js.
import { EVENTS } from './events.js';
import { escapeHtml, sendTelegram } from './telegram.js';

const ICON = { info: 'ℹ️', warn: '⚠️', error: '🚨' };

export function formatLog(type, level, message) {
  const meta = EVENTS[type] || { title: type };
  return `${ICON[level] || ''} <b>${escapeHtml(meta.title)}</b>\n${escapeHtml(message)}`;
}

// user: the account the event belongs to (null for system events).
// telegram: override the default routing; true/false forces or suppresses the push.
export async function logEvent(store, { user = null, type, level = 'info', message = '', data = null, env = process.env, fetchFn = fetch, telegram } = {}) {
  const meta = EVENTS[type];
  const entry = { at: new Date(), ts: Date.now(), uid: user ? user.id : null, type, level, message: String(message).slice(0, 500), data };
  try { await store.addLog(entry); } catch { /* logging must never break the request */ }

  let chatId = null;
  const route = telegram === false ? null : meta ? meta.to : null;
  if (route === 'user' && user && user.telegramChatId && user.digest !== false) chatId = user.telegramChatId;
  if (route === 'admin' && env.TELEGRAM_CHAT_ID) chatId = env.TELEGRAM_CHAT_ID;
  let sent = null;
  if (chatId && telegram !== false) {
    try { sent = await sendTelegram(formatLog(type, level, message), { env, fetchFn, chatId }); } catch { sent = { ok: false }; }
  }
  return { entry, telegram: sent };
}
