import { json, readJson, withUser } from '../../../lib/http.js';
import { mergeState } from '../../../lib/state.js';
import { normalizeState } from '../../../lib/scoring.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withUser(async ({ store, user }) => json({ state: normalizeState(await store.getState(user.id)) }));

export const PUT = withUser(async ({ request, store, user }) => {
  const { body, tooBig } = await readJson(request, 900000);
  if (tooBig) return json({ error: 'state too large' }, 413);
  if (!body || typeof body.state !== 'object' || body.state === null) return json({ error: 'state required' }, 400);
  const merged = mergeState(await store.getState(user.id), body.state);
  await store.putState(user.id, merged);
  return json({ state: merged });
}, { rate: { name: 'state', max: 120, windowSec: 600 } });
