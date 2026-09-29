import { json, withUser } from '../../../lib/http.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withUser(async ({ store }) => {
  const r = await store.latestRadar();
  return json({ items: r ? r.items : [], date: r ? r.date : null });
}, { rate: { name: 'radar', max: 60, windowSec: 600 } });
