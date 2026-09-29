import { timingSafeEqual } from './security.js';

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". With no secret set the job is closed in production.
export function checkCron(request, env = process.env) {
  if (!env.CRON_SECRET) return env.NODE_ENV !== 'production';
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return timingSafeEqual(bearer, env.CRON_SECRET);
}
