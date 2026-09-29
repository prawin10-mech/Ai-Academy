// Run the daily job from your own machine: node --env-file=.env.local scripts/run-daily.mjs [--force]
import { readFileSync } from 'node:fs';
import { getStore } from '../lib/db.js';
import { runDaily } from '../lib/daily.js';

const j = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const store = await getStore();
const r = await runDaily({ store, courses: j('courses.json'), topics: j('topics.json').topics, papers: j('papers.json'), force: process.argv.includes('--force') });
console.log(JSON.stringify({ ok: r.ok, date: r.date, sent: r.sent, failed: r.failed, skipped: r.skipped, unlinked: r.unlinked, truncated: r.truncated, papers: r.feedCount, radar: r.radarCount, problems: r.feedErrors }, null, 2));
process.exit(0);
