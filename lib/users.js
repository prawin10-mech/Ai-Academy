// Account rules (validation and flows) kept separate from HTTP so they can be tested directly.
import { hashPassword, randomId, verifyPassword } from './security.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(e) { return String(e || '').trim().toLowerCase(); }

export function validTimeZone(tz) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

export function validateSignup({ email, password, name, tz }) {
  const em = normalizeEmail(email);
  if (!EMAIL_RE.test(em) || em.length > 200) return { error: 'Enter a valid email address.' };
  if (typeof password !== 'string' || password.length < 8) return { error: 'Use a password with at least 8 characters.' };
  if (password.length > 200) return { error: 'That password is too long.' };
  if (password.toLowerCase() === em || /^(password|12345678|qwertyui)/i.test(password)) return { error: 'Choose a less common password.' };
  return { email: em, name: String(name || '').trim().slice(0, 60), tz: validTimeZone(tz) ? tz : 'UTC' };
}

export async function registerUser(store, input, env = process.env) {
  const v = validateSignup(input);
  if (v.error) return { error: v.error, status: 400 };
  const user = {
    id: randomId(12),
    email: v.email,
    name: v.name,
    passHash: await hashPassword(input.password),
    tz: v.tz,
    digest: true,
    digestHour: 7,
    tokenVersion: 0,
    createdAt: Date.now(),
    admin: !!(env.ADMIN_EMAIL && normalizeEmail(env.ADMIN_EMAIL) === v.email),
  };
  try { await store.createUser(user); } catch (e) {
    if (e && e.code === 'EXISTS') return { error: 'That email is already registered. Sign in instead.', status: 409 };
    throw e;
  }
  return { user };
}

// A dummy hash makes "no such user" take as long as "wrong password".
const DUMMY = 'scrypt$00000000000000000000000000000000$' + '00'.repeat(64);

export async function loginUser(store, { email, password }) {
  const em = normalizeEmail(email);
  const user = await store.getUserByEmail(em);
  const ok = await verifyPassword(String(password || ''), user ? user.passHash : DUMMY);
  if (!user || !ok) return { error: 'Email or password is incorrect.', status: 401 };
  return { user };
}

export function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name || '', tz: u.tz || 'UTC', admin: !!u.admin,
    digest: u.digest !== false, digestHour: u.digestHour ?? 7, telegramLinked: !!u.telegramChatId, skin: u.skin || 'auto', createdAt: u.createdAt,
  };
}

export async function changePassword(store, user, { current, next }) {
  if (!(await verifyPassword(String(current || ''), user.passHash))) return { error: 'Current password is incorrect.', status: 403 };
  if (typeof next !== 'string' || next.length < 8 || next.length > 200) return { error: 'Use a new password with at least 8 characters.', status: 400 };
  const updated = await store.updateUser(user.id, { passHash: await hashPassword(next), tokenVersion: (user.tokenVersion || 0) + 1 });
  return { user: updated };
}
