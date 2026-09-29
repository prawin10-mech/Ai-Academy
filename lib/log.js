// One entry point for logging: always stored, optionally pushed to Telegram according to events.js.
import { EVENTS } from './events.js';
import { escapeHtml, sendTelegram } from './telegram.js';

const ICON = { info: 'ℹ️', warn: '⚠️', error: '🚨' };

export function formatLog(type, level, message) {
  const meta = EVENTS[type] || { title: type };
  return `${ICON[level] || ''} <b>${escapeHtml(meta.title)}</b>\n${escapeHtml(message)}`;
}

export async function logEvent(store, { type, level = 'info', message = '', data = null, env = process.env, fetchFn = fetch, telegram } = {}) {
  const meta = EVENTS[type];
  const entry = { at: new Date(), ts: Date.now(), type, level, message: String(message).slice(0, 500), data };
  let sent = null;
  try { await store.addLog(entry); } catch { /* logging must never break the request */ }
  const wantTelegram = telegram != null ? telegram : !!(meta && meta.telegram);
  if (wantTelegram) {
    try { sent = await sendTelegram(formatLog(type, level, message), { env, fetchFn }); } catch { sent = { ok: false }; }
  }
  return { entry, telegram: sent };
}
