import { getStore } from '../../../lib/db.js';
import { checkAccess, json } from '../../../lib/auth.js';
import { logEvent } from '../../../lib/log.js';
import { CLIENT_EVENTS, EVENTS } from '../../../lib/events.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const errWindow = { start: 0, n: 0 };

export async function GET(request) {
  if (!checkAccess(request)) return json({ error: 'unauthorized' }, 401);
  try {
    const store = await getStore();
    const logs = await store.listLogs(100);
    return json({ logs: logs.map((l) => ({ ts: l.ts, type: l.type, level: l.level, message: l.message, telegram: !!(EVENTS[l.type] && EVENTS[l.type].telegram) })) });
  } catch {
    return json({ logs: [], error: 'storage unavailable' });
  }
}

export async function POST(request) {
  if (!checkAccess(request)) return json({ error: 'unauthorized' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  if (!body || !CLIENT_EVENTS.includes(body.type) || typeof body.message !== 'string') return json({ error: 'invalid event' }, 400);

  let telegram;
  if (body.type === 'client_error') {
    // At most 3 browser errors per 10 minutes reach Telegram.
    const now = Date.now();
    if (now - errWindow.start > 600000) { errWindow.start = now; errWindow.n = 0; }
    errWindow.n++;
    telegram = errWindow.n <= 3;
  }
  try {
    const store = await getStore();
    const r = await logEvent(store, { type: body.type, level: body.type === 'client_error' ? 'error' : 'info', message: body.message, telegram });
    return json({ ok: true, telegram: r.telegram ? !!r.telegram.ok : false });
  } catch {
    return json({ ok: false }, 503);
  }
}
