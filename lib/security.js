// Passwords, signed session cookies, rate limits and request checks. Node crypto only, no dependencies.
import { randomBytes, scrypt as scryptCb, timingSafeEqual as tse, createHmac } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const COOKIE = 'academy_session';
const MAX_AGE = 60 * 60 * 24 * 30;

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(pw, stored) {
  try {
    const [alg, saltHex, hashHex] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const expected = Buffer.from(hashHex, 'hex');
    const key = await scrypt(pw, Buffer.from(saltHex, 'hex'), expected.length);
    return tse(key, expected);
  } catch { return false; }
}

function secret(env) {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 16) return env.SESSION_SECRET;
  if (env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set (16+ characters)');
  return 'dev-only-secret-change-me';
}

const b64 = (s) => Buffer.from(s).toString('base64url');

export function signSession(payload, env = process.env) {
  const body = b64(JSON.stringify(payload));
  const mac = createHmac('sha256', secret(env)).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verifySession(token, env = process.env, now = Date.now()) {
  if (!token || typeof token !== 'string') return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const good = createHmac('sha256', secret(env)).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(good);
  if (a.length !== b.length || !tse(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p.uid || !p.exp || p.exp < now) return null;
    return p;
  } catch { return null; }
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(user, env = process.env, now = Date.now()) {
  const token = signSession({ uid: user.id, tv: user.tokenVersion || 0, exp: now + MAX_AGE * 1000 }, env);
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie(env = process.env) {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

// Returns the signed-in user or null. Also rejects sessions revoked by a password change.
export async function getSessionUser(request, store, env = process.env) {
  const token = parseCookies(request.headers.get('cookie'))[COOKIE];
  const p = verifySession(token, env);
  if (!p) return null;
  const user = await store.getUserById(p.uid);
  if (!user || (user.tokenVersion || 0) !== (p.tv || 0)) return null;
  // The account whose email equals ADMIN_EMAIL is the owner, even if it was created before the variable was set.
  const adminEmail = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (adminEmail && String(user.email || '').toLowerCase() === adminEmail && !user.admin) return { ...user, admin: true };
  return user;
}

// Mutating requests must come from our own origin (defence in depth on top of SameSite=Lax).
export function sameOrigin(request) {
  const m = request.method;
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return true;
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser clients
  try { return new URL(origin).host === (request.headers.get('host') || new URL(request.url).host); } catch { return false; }
}

export function clientIp(request) {
  const xf = request.headers.get('x-forwarded-for');
  return (xf ? xf.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
}

export function randomId(bytes = 12) { return randomBytes(bytes).toString('hex'); }

// Throws-free limiter: true when the caller is over the limit.
export async function limited(store, key, max, windowSec) {
  const n = await store.hit(key, windowSec);
  return n > max;
}

// Constant-time string comparison for secrets.
export function timingSafeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  const len = Math.max(x.length, y.length, 1);
  const px = Buffer.alloc(len); x.copy(px);
  const py = Buffer.alloc(len); y.copy(py);
  return tse(px, py) && x.length === y.length;
}
