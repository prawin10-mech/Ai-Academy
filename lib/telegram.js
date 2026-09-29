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

export function telegramConfigured(env = process.env) {
  return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

// text must already be valid Telegram HTML (use escapeHtml on any dynamic value).
export async function sendTelegram(text, { env = process.env, fetchFn = fetch } = {}) {
  if (!telegramConfigured(env)) return { ok: false, skipped: true, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' };
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const results = [];
  for (const part of chunkText(text)) {
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: part, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      const body = await res.json().catch(() => ({}));
      results.push({ ok: res.ok && body.ok !== false, status: res.status, description: body.description });
    } catch (e) {
      // Never include the URL in errors: it contains the bot token.
      results.push({ ok: false, status: 0, description: String(e.message || e).replace(env.TELEGRAM_BOT_TOKEN, '***') });
    }
  }
  const failed = results.find((r) => !r.ok);
  return failed ? { ok: false, reason: failed.description || `HTTP ${failed.status}`, parts: results.length } : { ok: true, parts: results.length };
}
