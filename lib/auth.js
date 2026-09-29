// Single-user app: one shared ACCESS_KEY protects the API. If it is unset (local dev) the API is open.
export function timingSafeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

export function accessRequired(env = process.env) {
  return !!env.ACCESS_KEY;
}

export function checkAccess(request, env = process.env) {
  if (!env.ACCESS_KEY) return true;
  return timingSafeEqual(request.headers.get('x-access-key'), env.ACCESS_KEY);
}

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". ACCESS_KEY also works for manual runs.
export function checkCron(request, env = process.env) {
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (env.CRON_SECRET && timingSafeEqual(bearer, env.CRON_SECRET)) return true;
  if (env.ACCESS_KEY && timingSafeEqual(request.headers.get('x-access-key'), env.ACCESS_KEY)) return true;
  return !env.CRON_SECRET && !env.ACCESS_KEY; // open only when nothing is configured (local dev)
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
