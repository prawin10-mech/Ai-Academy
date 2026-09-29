import { withUser } from '../../../../lib/http.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withUser(async ({ store, user }) => {
  const data = await store.exportUser(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="ai-academy-data.json"', 'cache-control': 'no-store' },
  });
});
