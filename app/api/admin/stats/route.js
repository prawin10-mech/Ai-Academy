import { json, withUser } from '../../../../lib/http.js';
import { computeStats } from '../../../../lib/adminStats.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Owner only. Aggregate numbers plus the 10 newest sign-ups (emails masked).
export const GET = withUser(async ({ store, user }) => {
  if (!user.admin) return json({ error: 'forbidden' }, 403);
  const { users, states } = await store.statsData();
  return json({ stats: computeStats(users, states), storage: store.kind, capped: users.length >= 5000 });
}, { rate: { name: 'adminstats', max: 60, windowSec: 3600 } });
