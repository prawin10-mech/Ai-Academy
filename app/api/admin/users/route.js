import { json, readJson, withUser } from '../../../../lib/http.js';
import { freshState } from '../../../../lib/scoring.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Owner only: find a user by email or name and see their progress counts (never notes or code).
export const GET = withUser(async ({ request, store, user }) => {
  if (!user.admin) return json({ error: 'forbidden' }, 403);
  const q = new URL(request.url).searchParams.get('q') || '';
  if (q.trim().length < 2) return json({ users: [] });
  const found = await store.searchUsers(q, 10);
  const out = [];
  for (const u of found) {
    const s = await store.getState(u.id);
    out.push({
      id: u.id, email: u.email, name: u.name || '', joined: u.createdAt || 0, telegram: !!u.telegramChatId, owner: !!u.admin,
      lessons: Object.values(s.done || {}).filter(Boolean).length,
      solved: Object.values(s.practice || {}).filter((p) => p && p.passed).length,
      lastActive: s.updatedAt || null, onboarded: !!s.profile,
    });
  }
  return json({ users: out });
}, { rate: { name: 'adminusers', max: 120, windowSec: 3600 } });

// Owner only: reset a user's progress, or delete the account. The page asks for confirmation first.
export const POST = withUser(async ({ request, store, user }) => {
  if (!user.admin) return json({ error: 'forbidden' }, 403);
  const r = await readJson(request, 2000);
  if (r.invalid || r.tooBig || !r.body) return json({ error: 'bad request' }, 400);
  const { id, action } = r.body;
  if (typeof id !== 'string' || !id) return json({ error: 'bad request' }, 400);
  if (id === user.id) return json({ error: 'You cannot change your own owner account here. Use Settings.' }, 400);
  const target = await store.getUserById(id);
  if (!target) return json({ error: 'User not found.' }, 404);
  if (action === 'reset') { await store.putState(id, freshState()); return json({ ok: true }); }
  if (action === 'delete') { await store.deleteUser(id); return json({ ok: true }); }
  return json({ error: 'bad request' }, 400);
}, { rate: { name: 'adminact', max: 30, windowSec: 3600 } });
