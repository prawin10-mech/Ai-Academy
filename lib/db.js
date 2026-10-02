// Storage with two interchangeable backends behind one interface.
//  - MongoDB Atlas when MONGODB_URI is set (production).
//  - A JSON file otherwise (local development only; ephemeral on serverless hosts).
// The mongodb package is imported lazily so the app still starts without it.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { freshState } from './scoring.js';

const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

// ---------------------------------------------------------------- file backend
export function createFileStore(file) {
  let cache = null;
  async function load() {
    if (cache) return cache;
    try { cache = JSON.parse(await fs.readFile(file, 'utf8')); } catch { cache = {}; }
    cache.users = cache.users || {};
    cache.states = cache.states || {};
    cache.plans = cache.plans || {};
    cache.logs = cache.logs || [];
    cache.feed = cache.feed || {};
    cache.radar = cache.radar || {};
    cache.meta = cache.meta || {};
    return cache;
  }
  async function save() {
    if (!file) return;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(cache));
  }
  const hits = new Map(); // rate limits live in memory only

  return {
    kind: 'file',
    // users
    async createUser(u) {
      const c = await load();
      if (Object.values(c.users).some((x) => x.email === u.email)) throw Object.assign(new Error('exists'), { code: 'EXISTS' });
      c.users[u.id] = clone(u);
      await save();
      return clone(u);
    },
    async getUserById(id) { return clone((await load()).users[id] || null); },
    async getUserByEmail(email) { return clone(Object.values((await load()).users).find((x) => x.email === email) || null); },
    async getUserByLinkToken(token) { return clone(Object.values((await load()).users).find((x) => x.telegramLinkToken && x.telegramLinkToken === token) || null); },
    async getUserByChat(chatId) { return clone(Object.values((await load()).users).find((x) => x.telegramChatId && x.telegramChatId === String(chatId)) || null); },
    async updateUser(id, patch) {
      const c = await load();
      if (!c.users[id]) return null;
      for (const [k, v] of Object.entries(patch)) { if (v === undefined) delete c.users[id][k]; else c.users[id][k] = clone(v); }
      await save();
      return clone(c.users[id]);
    },
    async listLinkedUsers({ after = '', limit = 100 } = {}) {
      const c = await load();
      return Object.values(c.users).filter((u) => u.telegramChatId && u.id > after).sort((a, b) => (a.id < b.id ? -1 : 1)).slice(0, limit).map(clone);
    },
    async countUsers() { return Object.keys((await load()).users).length; },
    // Owner stats: safe fields only (never password hashes or link tokens).
    async statsData(limit = 5000) {
      const c = await load();
      const users = Object.values(c.users).slice(0, limit).map((u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.createdAt, telegramChatId: u.telegramChatId, digest: u.digest }));
      const states = {};
      for (const u of users) { const s = c.states[u.id]; if (s) states[u.id] = { updatedAt: s.updatedAt, profile: !!s.profile, done: s.done, practice: s.practice }; }
      return clone({ users, states });
    },
    async deleteUser(id) {
      const c = await load();
      delete c.users[id];
      delete c.states[id];
      for (const k of Object.keys(c.plans)) if (k.startsWith(`${id}:`)) delete c.plans[k];
      c.logs = c.logs.filter((l) => l.uid !== id);
      await save();
    },
    // per-user state
    async getState(uid) { return clone((await load()).states[uid]) || freshState(); },
    async putState(uid, s) { (await load()).states[uid] = clone(s); await save(); },
    // per-user plans
    async getPlan(uid, date) { return clone((await load()).plans[`${uid}:${date}`] || null); },
    async putPlan(uid, entry) { (await load()).plans[`${uid}:${entry.date}`] = clone(entry); await save(); },
    async listPlans(uid, limit = 14) {
      const c = await load();
      return Object.keys(c.plans).filter((k) => k.startsWith(`${uid}:`)).sort().reverse().slice(0, limit).map((k) => clone(c.plans[k]));
    },
    // logs (uid null = system)
    async addLog(entry) {
      const c = await load();
      c.logs.push(clone(entry));
      if (c.logs.length > 2000) c.logs = c.logs.slice(-2000);
      await save();
    },
    async listLogs(uid, limit = 100) { return (await load()).logs.filter((l) => (l.uid || null) === (uid || null)).slice(-limit).reverse().map(clone); },
    // global paper feed
    async putFeed(date, items) { (await load()).feed[date] = { date, items }; await save(); },
    async latestFeed() {
      const f = (await load()).feed;
      const k = Object.keys(f).sort().pop();
      return k ? clone(f[k]) : null;
    },
    async putRadar(date, items) { (await load()).radar[date] = { date, items }; await save(); },
    async latestRadar() {
      const f = (await load()).radar;
      const k = Object.keys(f).sort().pop();
      return k ? clone(f[k]) : null;
    },
    // rate limiting: returns the count of hits in the current window
    async hit(key, windowSec) {
      const now = Date.now();
      const h = hits.get(key);
      if (!h || h.until < now) { hits.set(key, { n: 1, until: now + windowSec * 1000 }); return 1; }
      h.n++;
      return h.n;
    },
    async exportUser(uid) {
      const c = await load();
      const user = clone(c.users[uid]);
      if (user) { delete user.passHash; delete user.telegramLinkToken; }
      return { user, state: clone(c.states[uid]) || null, plans: await this.listPlans(uid, 400), logs: await this.listLogs(uid, 1000) };
    },
  };
}

// --------------------------------------------------------------- mongo backend
export function createMongoStore(db) {
  const users = db.collection('users');
  const states = db.collection('states');
  const plans = db.collection('plans');
  const logs = db.collection('logs');
  const feed = db.collection('feed');
  const limits = db.collection('ratelimits');
  const radar = db.collection('radar');
  const strip = (d) => { if (d) { d.id = d.id || d._id; delete d._id; } return d; };
  const stripPlain = (d) => { if (d) delete d._id; return d; };

  const store = {
    kind: 'mongodb',
    async createUser(u) {
      try { await users.insertOne({ _id: u.id, ...u }); } catch (e) { if (e && e.code === 11000) throw Object.assign(new Error('exists'), { code: 'EXISTS' }); throw e; }
      return u;
    },
    async getUserById(id) { return strip(await users.findOne({ _id: id })); },
    async getUserByEmail(email) { return strip(await users.findOne({ email })); },
    async getUserByLinkToken(token) { return strip(await users.findOne({ telegramLinkToken: token })); },
    async getUserByChat(chatId) { return strip(await users.findOne({ telegramChatId: String(chatId) })); },
    async updateUser(id, patch) {
      const set = {};
      const unset = {};
      for (const [k, v] of Object.entries(patch)) { if (v === undefined) unset[k] = ''; else set[k] = v; }
      const upd = {};
      if (Object.keys(set).length) upd.$set = set;
      if (Object.keys(unset).length) upd.$unset = unset;
      if (!Object.keys(upd).length) return store.getUserById(id);
      return strip(await users.findOneAndUpdate({ _id: id }, upd, { returnDocument: 'after' }));
    },
    async listLinkedUsers({ after = '', limit = 100 } = {}) {
      return (await users.find({ telegramChatId: { $exists: true }, _id: { $gt: after } }).sort({ _id: 1 }).limit(limit).toArray()).map(strip);
    },
    async countUsers() { return users.estimatedDocumentCount(); },
    async statsData(limit = 5000) {
      const list = (await users.find({}, { projection: { email: 1, name: 1, createdAt: 1, telegramChatId: 1, digest: 1 } }).limit(limit).toArray()).map(strip);
      const docs = await states.find({ _id: { $in: list.map((u) => u.id) } }, { projection: { updatedAt: 1, profile: 1, done: 1, practice: 1 } }).toArray();
      const out = {};
      for (const d of docs) out[d._id] = { updatedAt: d.updatedAt, profile: !!d.profile, done: d.done, practice: d.practice };
      return { users: list, states: out };
    },
    async deleteUser(id) {
      await Promise.all([users.deleteOne({ _id: id }), states.deleteOne({ _id: id }), plans.deleteMany({ uid: id }), logs.deleteMany({ uid: id })]);
    },
    async getState(uid) { return stripPlain(await states.findOne({ _id: uid })) || freshState(); },
    async putState(uid, s) { await states.replaceOne({ _id: uid }, { _id: uid, ...s }, { upsert: true }); },
    async getPlan(uid, date) { return stripPlain(await plans.findOne({ _id: `${uid}:${date}` })); },
    async putPlan(uid, entry) { await plans.replaceOne({ _id: `${uid}:${entry.date}` }, { _id: `${uid}:${entry.date}`, uid, ...entry }, { upsert: true }); },
    async listPlans(uid, limit = 14) { return (await plans.find({ uid }).sort({ date: -1 }).limit(limit).toArray()).map(stripPlain); },
    async addLog(entry) { await logs.insertOne({ ...entry, uid: entry.uid || null }); },
    async listLogs(uid, limit = 100) { return (await logs.find({ uid: uid || null }).sort({ ts: -1 }).limit(limit).toArray()).map(stripPlain); },
    async putFeed(date, items) { await feed.replaceOne({ _id: date }, { _id: date, date, items }, { upsert: true }); },
    async latestFeed() { return stripPlain((await feed.find({}).sort({ _id: -1 }).limit(1).toArray())[0] || null); },
    async putRadar(date, items) { await radar.replaceOne({ _id: date }, { _id: date, date, items }, { upsert: true }); },
    async latestRadar() { return stripPlain((await radar.find({}).sort({ _id: -1 }).limit(1).toArray())[0] || null); },
    async hit(key, windowSec) {
      const now = new Date();
      const r = await limits.findOneAndUpdate(
        { _id: key, expiresAt: { $gt: now } },
        { $inc: { n: 1 } },
        { returnDocument: 'after' },
      );
      if (r) return r.n;
      await limits.replaceOne({ _id: key }, { _id: key, n: 1, expiresAt: new Date(now.getTime() + windowSec * 1000) }, { upsert: true });
      return 1;
    },
    async exportUser(uid) {
      const user = strip(await users.findOne({ _id: uid }));
      if (user) { delete user.passHash; delete user.telegramLinkToken; }
      return { user, state: stripPlain(await states.findOne({ _id: uid })), plans: await store.listPlans(uid, 400), logs: await store.listLogs(uid, 1000) };
    },
  };
  return store;
}

async function ensureIndexes(db) {
  const tryIdx = async (c, spec, opts) => { try { await db.collection(c).createIndex(spec, opts); } catch { /* best effort */ } };
  await tryIdx('users', { email: 1 }, { unique: true });
  await tryIdx('users', { telegramChatId: 1 }, { sparse: true });
  await tryIdx('users', { telegramLinkToken: 1 }, { sparse: true });
  await tryIdx('plans', { uid: 1, date: -1 });
  await tryIdx('logs', { uid: 1, ts: -1 });
  await tryIdx('logs', { at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
  await tryIdx('ratelimits', { expiresAt: 1 }, { expireAfterSeconds: 0 });
}

export async function getStore(env = process.env) {
  const g = globalThis;
  if (g.__academyStore) return g.__academyStore;
  let store;
  if (env.MONGODB_URI) {
    try {
      const { MongoClient } = await import('mongodb');
      const client = new MongoClient(env.MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const db = client.db(env.MONGODB_DB || 'ai_academy');
      await ensureIndexes(db);
      store = createMongoStore(db);
      g.__academyStoreError = null;
    } catch (e) {
      // Keep a short, secret-free reason so /api/health and the logs can say what is wrong.
      const msg = String((e && e.message) || e).replace(/mongodb(\+srv)?:\/\/\S+/gi, '[uri]').slice(0, 200);
      g.__academyStoreError = msg;
      console.error('[store] MongoDB connection failed:', msg);
      throw e;
    }
  } else {
    store = createFileStore(env.DATA_FILE || path.join(env.VERCEL ? '/tmp' : '.data', 'academy.json'));
  }
  g.__academyStore = store;
  return store;
}
