import { json, readJson, withUser } from '../../../lib/http.js';
import { logEvent } from '../../../lib/log.js';
import { CLIENT_EVENTS, EVENTS } from '../../../lib/events.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const errWindow = { start: 0, n: 0 };

export const GET = withUser(async ({ store, user }) => {
  const logs = await store.listLogs(user.id, 100);
  return json({ logs: logs.map((l) => ({ ts: l.ts, type: l.type, level: l.level, message: l.message, telegram: !!(EVENTS[l.type] && EVENTS[l.type].to === 'user') })) });
});

export const POST = withUser(async ({ request, store, user, env }) => {
  const { body } = await readJson(request, 3000);
  if (!body || !CLIENT_EVENTS.includes(body.type) || typeof body.message !== 'string') return json({ error: 'invalid event' }, 400);
  let telegram;
  if (body.type === 'client_error') {
    // At most 3 browser errors per 10 minutes reach the owner's Telegram.
    const now = Date.now();
    if (now - errWindow.start > 600000) { errWindow.start = now; errWindow.n = 0; }
    errWindow.n++;
    telegram = errWindow.n <= 3 ? undefined : false;
  }
  await logEvent(store, { user, type: body.type, level: body.type === 'client_error' ? 'error' : 'info', message: body.message, telegram, env });
  return json({ ok: true });
}, { rate: { name: 'log', max: 200, windowSec: 600 } });
