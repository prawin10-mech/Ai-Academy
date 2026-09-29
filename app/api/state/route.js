import { getStore } from '../../../lib/db.js';
import { checkAccess, json } from '../../../lib/auth.js';
import { mergeState } from '../../../lib/state.js';
import { normalizeState } from '../../../lib/scoring.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  if (!checkAccess(request)) return json({ error: 'unauthorized' }, 401);
  try {
    const store = await getStore();
    return json({ state: normalizeState(await store.getState()), store: store.kind });
  } catch (e) {
    return json({ error: 'storage unavailable', detail: String(e.message || e) }, 503);
  }
}

export async function PUT(request) {
  if (!checkAccess(request)) return json({ error: 'unauthorized' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400); }
  if (!body || typeof body.state !== 'object') return json({ error: 'state required' }, 400);
  if (JSON.stringify(body.state).length > 900000) return json({ error: 'state too large' }, 413);
  try {
    const store = await getStore();
    const merged = mergeState(await store.getState(), body.state);
    await store.putState(merged);
    return json({ state: merged, store: store.kind });
  } catch (e) {
    return json({ error: 'storage unavailable', detail: String(e.message || e) }, 503);
  }
}
