import { json, readJson, withUser } from '../../../lib/http.js';
import { logEvent } from '../../../lib/log.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// "Report a problem": stored on the learner's log and sent to the site owner's Telegram.
export const POST = withUser(async ({ request, store, user, env }) => {
  const { body } = await readJson(request, 3000);
  const msg = body && typeof body.message === 'string' ? body.message.trim().slice(0, 500) : '';
  if (msg.length < 5) return json({ error: 'Please describe the problem in a few words.' }, 400);
  const where = typeof body.page === 'string' ? body.page.slice(0, 120) : '';
  await logEvent(store, { user, type: 'feedback', message: `${where ? `[${where}] ` : ''}${msg}`, env });
  return json({ ok: true });
}, { rate: { name: 'fb', max: 5, windowSec: 3600 } });
