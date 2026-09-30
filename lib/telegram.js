// Telegram Bot API helper. Secrets come from env only; nothing is hard-coded.
export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Split on line boundaries so no message exceeds Telegram's 4096 character limit.
export function chunkText(text, max = 3800) {
  const lines = String(text).split('\n');
  const out = [];
  let cur = '';
  for (const line of lines) {
    const piece = line.length > max ? line.slice(0, max) : line;
    if ((cur + '\n' + piece).length > max && cur) {
      out.push(cur);
      cur = piece;
    } else {
      cur = cur ? cur + '\n' + piece : piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// The bot exists when a token is set. Admin alerts also need TELEGRAM_CHAT_ID (the owner's own chat).
export function botConfigured(env = process.env) { return !!env.TELEGRAM_BOT_TOKEN; }
export function telegramConfigured(env = process.env) { return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID); }

// text must already be valid Telegram HTML (use escapeHtml on any dynamic value).
export async function sendTelegram(text, { env = process.env, fetchFn = fetch, chatId } = {}) {
  const target = chatId || env.TELEGRAM_CHAT_ID;
  if (!env.TELEGRAM_BOT_TOKEN || !target) return { ok: false, skipped: true, reason: 'Telegram bot or chat not configured' };
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const results = [];
  for (const part of chunkText(text)) {
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: target, text: part, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      const body = await res.json().catch(() => ({}));
      results.push({ ok: res.ok && body.ok !== false, status: res.status, description: body.description });
    } catch (e) {
      // Never include the URL in errors: it contains the bot token.
      results.push({ ok: false, status: 0, description: String(e.message || e).replace(env.TELEGRAM_BOT_TOKEN, '***') });
    }
  }
  const failed = results.find((r) => !r.ok);
  return failed ? { ok: false, status: failed.status, reason: failed.description || `HTTP ${failed.status}`, parts: results.length } : { ok: true, parts: results.length };
}

// Checks the bot against Telegram and explains what is wrong, in plain words. Never returns the token.
export async function telegramDiagnostics({ env = process.env, fetchFn = fetch, appUrl = '' } = {}) {
  const out = { problems: [] };
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) { out.problems.push('TELEGRAM_BOT_TOKEN is not set.'); return out; }
  if (!env.TELEGRAM_BOT_USERNAME) out.problems.push('TELEGRAM_BOT_USERNAME is not set, so the Link Telegram button is hidden.');
  if (!env.TELEGRAM_WEBHOOK_SECRET) out.problems.push('TELEGRAM_WEBHOOK_SECRET is not set, so every message from Telegram is rejected.');
  else if (!/^[A-Za-z0-9_-]{1,256}$/.test(env.TELEGRAM_WEBHOOK_SECRET)) out.problems.push('TELEGRAM_WEBHOOK_SECRET has characters Telegram does not allow. Use only letters, numbers, _ and -.');
  const call = async (method) => {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/${method}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
    return res.json().catch(() => ({}));
  };
  try {
    const me = await call('getMe');
    if (!me.ok) out.problems.push(`Telegram rejected the bot token (${me.description || 'unknown error'}). Copy the token again from BotFather.`);
    else {
      out.botUsername = me.result.username;
      const want = String(env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
      if (want && want.toLowerCase() !== String(me.result.username).toLowerCase()) out.problems.push(`TELEGRAM_BOT_USERNAME is "${want}" but the token belongs to "${me.result.username}". The Link button opens the wrong bot.`);
    }
    const wh = await call('getWebhookInfo');
    if (wh.ok) {
      const info = wh.result || {};
      out.webhookUrl = info.url || '';
      out.pendingUpdates = info.pending_update_count || 0;
      if (info.last_error_message) { out.lastError = info.last_error_message; out.lastErrorAt = info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null; }
      if (!info.url) out.problems.push('No webhook is registered. Run scripts/set-webhook.mjs once.');
      else {
        if (appUrl && !info.url.startsWith(appUrl.replace(/\/$/, ''))) out.problems.push(`The webhook points to ${info.url}, not your site (${appUrl}).`);
        if (!info.url.endsWith('/api/telegram/webhook')) out.problems.push('The webhook URL does not end with /api/telegram/webhook.');
      }
      if (info.last_error_message) out.problems.push(`Telegram could not deliver to your site: ${info.last_error_message}`);
    }
  } catch (e) {
    out.problems.push(`Could not reach Telegram: ${String((e && e.message) || e).replace(token, '***')}`);
  }
  return out;
}
