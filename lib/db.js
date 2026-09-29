// Storage with two interchangeable backends behind one interface.
//  - MongoDB Atlas when MONGODB_URI is set (production).
//  - A JSON file otherwise (local development only; ephemeral on serverless hosts).
// The mongodb package is imported lazily so the app still starts without it.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { freshState } from './scoring.js';

const COLL = { state: 'state', daily: 'daily', logs: 'logs', feed: 'feed' };

export function createFileStore(file) {
  let cache = null;
  async function load() {
    if (cache) return cache;
    try { cache = JSON.parse(await fs.readFile(file, 'utf8')); } catch { cache = {}; }
    cache.state = cache.state || null;
    cache.daily = cache.daily || {};
    cache.logs = cache.logs || [];
    cache.feed = cache.feed || {};
    return cache;
  }
  async function save() {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(cache));
  }
  return {
    kind: 'file',
    async getState() { return (await load()).state || freshState(); },
    async putState(s) { (await load()).state = s; await save(); },
    async getDaily(date) { return (await load()).daily[date] || null; },
    async putDaily(entry) { (await load()).daily[entry.date] = entry; await save(); },
    async listDaily(limit = 14) {
      const d = (await load()).daily;
      return Object.keys(d).sort().reverse().slice(0, limit).map((k) => d[k]);
    },
    async addLog(entry) {
      const c = await load();
      c.logs.push(entry);
      if (c.logs.length > 500) c.logs = c.logs.slice(-500);
      await save();
    },
    async listLogs(limit = 100) { return [...(await load()).logs].reverse().slice(0, limit); },
    async getFeed(date) { return (await load()).feed[date] || null; },
    async putFeed(date, items) { (await load()).feed[date] = { date, items }; await save(); },
    async latestFeed() {
      const f = (await load()).feed;
      const k = Object.keys(f).sort().pop();
      return k ? f[k] : null;
    },
  };
}

export function createMongoStore(db) {
  const stateC = db.collection(COLL.state);
  const dailyC = db.collection(COLL.daily);
  const logsC = db.collection(COLL.logs);
  const feedC = db.collection(COLL.feed);
  const strip = (d) => { if (d) delete d._id; return d; };
  return {
    kind: 'mongodb',
    async getState() { return strip(await stateC.findOne({ _id: 'learner' })) || freshState(); },
    async putState(s) { await stateC.replaceOne({ _id: 'learner' }, { _id: 'learner', ...s }, { upsert: true }); },
    async getDaily(date) { return strip(await dailyC.findOne({ _id: date })); },
    async putDaily(entry) { await dailyC.replaceOne({ _id: entry.date }, { _id: entry.date, ...entry }, { upsert: true }); },
    async listDaily(limit = 14) { return (await dailyC.find({}).sort({ _id: -1 }).limit(limit).toArray()).map(strip); },
    async addLog(entry) { await logsC.insertOne({ ...entry }); },
    async listLogs(limit = 100) { return (await logsC.find({}).sort({ ts: -1 }).limit(limit).toArray()).map(strip); },
    async getFeed(date) { return strip(await feedC.findOne({ _id: date })); },
    async putFeed(date, items) { await feedC.replaceOne({ _id: date }, { _id: date, date, items }, { upsert: true }); },
    async latestFeed() { return strip((await feedC.find({}).sort({ _id: -1 }).limit(1).toArray())[0] || null); },
  };
}

export async function getStore(env = process.env) {
  const g = globalThis;
  if (g.__academyStore) return g.__academyStore;
  let store;
  if (env.MONGODB_URI) {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    await client.connect();
    const db = client.db(env.MONGODB_DB || 'ai_academy');
    await logsIndex(db);
    store = createMongoStore(db);
  } else {
    store = createFileStore(env.DATA_FILE || path.join(env.VERCEL ? '/tmp' : '.data', 'academy.json'));
  }
  g.__academyStore = store;
  return store;
}

async function logsIndex(db) {
  try {
    // Keep 90 days of logs.
    await db.collection(COLL.logs).createIndex({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
  } catch { /* index creation is best effort */ }
}
