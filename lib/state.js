// Merge a client state into the server state. Last write wins for done/notes/papers/embed/last;
// attempts and active days are unions so nothing is ever lost between devices.
import { normalizeState } from './scoring.js';

export function mergeState(server, client) {
  const a = normalizeState(server);
  const b = normalizeState(client);
  const newer = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;
  const seen = new Set();
  const attempts = [];
  for (const at of [...a.attempts, ...b.attempts]) {
    const k = `${at.ts}:${at.mode}`;
    if (seen.has(k)) continue;
    seen.add(k);
    attempts.push(at);
  }
  attempts.sort((x, y) => x.ts - y.ts);
  return {
    ...newer,
    v: 2,
    attempts: attempts.slice(-300),
    days: { ...a.days, ...b.days },
    milestone: (a.milestone?.date || '') >= (b.milestone?.date || '') ? a.milestone || null : b.milestone || null,
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
  };
}
