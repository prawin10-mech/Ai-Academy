import { json, withUser } from '../../../../lib/http.js';
import { registerWebhook, telegramDiagnostics } from '../../../../lib/telegram.js';
import { COMMANDS } from '../../../../lib/bot.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Owner only: connects the bot to this site (registers the webhook and command menu), then reports what is still wrong.
export const POST = withUser(async ({ request, user, env }) => {
  if (!user.admin) return json({ error: 'Only the owner account (ADMIN_EMAIL) can connect the bot.' }, 403);
  const base = siteBase(request, env);
  const result = await registerWebhook({ baseUrl: base, env, commands: COMMANDS, force: true });
  const diagnostics = await telegramDiagnostics({ env, appUrl: base });
  return json({ ...result, site: base, diagnostics }, result.ok ? 200 : 502);
}, { rate: { name: 'tgsetup', max: 20, windowSec: 3600 } });

export function siteBase(request, env) {
  const fixed = String(env.APP_URL || '').replace(/\/$/, '');
  if (/^https:\/\//.test(fixed)) return fixed;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `https://${host}`;
}
