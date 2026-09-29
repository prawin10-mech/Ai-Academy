import { json, withUser } from '../../../../lib/http.js';
import { publicUser } from '../../../../lib/users.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withUser(async ({ store, user }) => {
  const u = await store.updateUser(user.id, { telegramChatId: undefined, telegramLinkToken: undefined, telegramLinkExpires: undefined });
  return json({ user: publicUser(u) });
});
