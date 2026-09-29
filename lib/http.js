// Shared route plumbing: JSON responses, same-origin check, session lookup.
import { getStore } from './db.js';
import { clientIp, getSessionUser, limited, sameOrigin } from './security.js';

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
}

export async function readJson(request, maxBytes = 900000) {
  try {
    const text = await request.text();
    if (text.length > maxBytes) return { tooBig: true };
    return { body: JSON.parse(text) };
  } catch { return { invalid: true }; }
}

// Wrap a handler that needs a signed-in user. It receives ({ request, store, user, env }).
export function withUser(handler, { rate } = {}) {
  return async (request) => {
    if (!sameOrigin(request)) return json({ error: 'bad origin' }, 403);
    let store;
    try { store = await getStore(); } catch (e) { return json({ error: 'storage unavailable' }, 503); }
    let user;
    try { user = await getSessionUser(request, store); } catch { return json({ error: 'server misconfigured' }, 500); }
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (rate && (await limited(store, `u:${user.id}:${rate.name}`, rate.max, rate.windowSec))) return json({ error: 'Too many requests. Try again shortly.' }, 429);
    try { return await handler({ request, store, user, env: process.env }); } catch (e) { return json({ error: 'server error' }, 500); }
  };
}

export { clientIp, getStore, limited };
