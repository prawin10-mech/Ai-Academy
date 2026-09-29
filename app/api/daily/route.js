import { getStore } from '../../../lib/db.js';
import { checkAccess, json } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Latest generated plans plus the newest paper feed. The UI falls back to data/daily-seed.json when empty.
export async function GET(request) {
  if (!checkAccess(request)) return json({ error: 'unauthorized' }, 401);
  try {
    const store = await getStore();
    const [plans, feed] = await Promise.all([store.listDaily(14), store.latestFeed()]);
    return json({ plans, feed: feed ? feed.items : [], feedDate: feed ? feed.date : null });
  } catch (e) {
    return json({ plans: [], feed: [], error: 'storage unavailable' }, 200);
  }
}
