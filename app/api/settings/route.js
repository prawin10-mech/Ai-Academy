import { json, readJson, withUser } from '../../../lib/http.js';
import { publicUser, validTimeZone } from '../../../lib/users.js';
import { SKIN_IDS } from '../../../lib/skins.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const PATCH = withUser(async ({ request, store, user }) => {
  const { body } = await readJson(request, 2000);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  const patch = {};
  if (typeof body.name === 'string') patch.name = body.name.trim().slice(0, 60);
  if (typeof body.tz === 'string' && validTimeZone(body.tz)) patch.tz = body.tz;
  if (typeof body.digest === 'boolean') patch.digest = body.digest;
  if (Number.isInteger(body.digestHour) && body.digestHour >= 0 && body.digestHour <= 23) patch.digestHour = body.digestHour;
  if (typeof body.skin === 'string' && SKIN_IDS.includes(body.skin)) patch.skin = body.skin;
  const updated = await store.updateUser(user.id, patch);
  return json({ user: publicUser(updated) });
});
