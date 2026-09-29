import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { freshState, mastery, buildQuiz, streak, evaluate, level } from '../lib/scoring.js';
import { makePlan } from '../lib/plan.js';
import { parseArxivAtom, parseHfDaily, rankFeed, fetchFeed } from '../lib/feed.js';
import { chunkText, escapeHtml, sendTelegram } from '../lib/telegram.js';
import { mergeState } from '../lib/state.js';
import { createFileStore } from '../lib/db.js';
import { runDaily, buildDigest } from '../lib/daily.js';
import { checkAccess, checkCron } from '../lib/auth.js';
import { dateInZone, addDays } from '../lib/dates.js';

const j = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const courses = j('courses.json');
const quizzes = j('quizzes.json');
const { topics } = j('topics.json');
const papers = j('papers.json');

const attempt = (topic, oks, ts = Date.now()) => ({ ts, mode: 'course', topics: [topic], score: oks.filter(Boolean).length, total: oks.length, qs: oks.map((ok, i) => ({ id: `${topic}:${i}`, t: topic, ok })) });

test('data integrity', () => {
  const ids = new Set(courses.map((c) => c.id));
  for (const p of papers) assert.ok(ids.has(p.after), p.id);
  for (const p of papers) assert.ok(topics[p.topic], p.id);
  for (const c of courses) assert.ok(topics[c.topic]);
  for (const t of Object.keys(topics)) assert.equal(quizzes[t].length, 5);
  const lids = courses.flatMap((c) => c.lessons.map((l) => l.id));
  assert.equal(new Set(lids).size, lids.length);
});

test('mastery needs 3 answers and uses last 10', () => {
  const s = freshState();
  assert.equal(mastery(s, 'ml'), null);
  s.attempts.push(attempt('ml', [true, false]));
  assert.equal(mastery(s, 'ml'), null);
  s.attempts.push(attempt('ml', [true, true]));
  assert.equal(mastery(s, 'ml'), 75);
  assert.equal(level(75).tone, 'warn');
});

test('buildQuiz picks n unique questions, correct index tracks shuffle', () => {
  const s = freshState();
  const q = buildQuiz(s, quizzes, Object.keys(topics), 5, 'daily');
  assert.equal(q.items.length, 5);
  assert.equal(new Set(q.items.map((i) => i.id)).size, 5);
  for (const it of q.items) {
    const [t, i] = it.id.split(':');
    assert.equal(it.o[it.a], quizzes[t][+i].o[quizzes[t][+i].a]);
  }
});

test('missed questions come back more often', () => {
  const s = freshState();
  s.attempts.push(attempt('ml', [false, true, true]));
  let hits = 0;
  for (let n = 0; n < 300; n++) {
    const q = buildQuiz(s, quizzes, ['ml'], 1, 'course');
    if (q.items[0].id === 'ml:0') hits++;
  }
  assert.ok(hits > 300 * 0.27, `missed question picked ${hits}/300`);
});

test('streak counts back from today or yesterday', () => {
  const s = freshState();
  s.days = { '2026-09-27': 1, '2026-09-28': 1 };
  assert.equal(streak(s, '2026-09-29'), 2);
  s.days['2026-09-29'] = 1;
  assert.equal(streak(s, '2026-09-29'), 3);
  assert.equal(streak(freshState(), '2026-09-29'), 0);
});

test('plan targets the weakest topic and its next lesson', () => {
  const s = freshState();
  s.attempts.push(attempt('rag', [false, false, true]));
  s.attempts.push(attempt('ml', [true, true, true]));
  const plan = makePlan({ state: s, courses, topics, papers, newPapers: [], date: '2026-09-30' });
  assert.equal(plan.topic, 'rag');
  assert.match(plan.tasks[0].t, /Continue:/);
  assert.ok(plan.tasks.some((t) => t.quiz));
  assert.ok(plan.tasks.some((t) => t.paper));
  const ev = evaluate(s, topics);
  assert.equal(ev.focus, 'rag');
});

test('feed parsers', () => {
  const xml = `<feed><entry><id>http://arxiv.org/abs/2601.01234v2</id><title>Big &amp; Small
 Language Models</title><summary> We study LLM agents. </summary><published>2026-09-28T10:00:00Z</published><author><name>A B</name></author></entry></feed>`;
  const a = parseArxivAtom(xml);
  assert.equal(a[0].id, '2601.01234');
  assert.equal(a[0].title, 'Big & Small Language Models');
  const h = parseHfDaily([{ paper: { id: '2601.9', title: 'X', summary: 'y', upvotes: 30, authors: [{ name: 'Z' }] } }, { nope: 1 }]);
  assert.equal(h.length, 1);
  assert.equal(rankFeed([...a, ...h, ...h]).length, 2);
});

test('fetchFeed survives a failing source', async () => {
  const f = async (url) => {
    if (url.includes('arxiv')) return { ok: false, status: 503, text: async () => '' };
    return { ok: true, text: async () => JSON.stringify([{ paper: { id: '1', title: 'T' } }]) };
  };
  const r = await fetchFeed(f);
  assert.equal(r.items.length, 1);
  assert.match(r.errors[0], /arXiv/);
});

test('telegram chunking, escaping and no-config skip', async () => {
  assert.equal(escapeHtml('<a&b>'), '&lt;a&amp;b&gt;');
  const parts = chunkText(Array.from({ length: 200 }, (_, i) => 'line ' + i + ' ' + 'x'.repeat(50)).join('\n'));
  assert.ok(parts.length > 1 && parts.every((p) => p.length <= 3800));
  assert.equal((await sendTelegram('hi', { env: {} })).skipped, true);
  const calls = [];
  const r = await sendTelegram('hi', { env: { TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '1' }, fetchFn: async (u, o) => { calls.push([u, JSON.parse(o.body)]); return { ok: true, status: 200, json: async () => ({ ok: true }) }; } });
  assert.equal(r.ok, true);
  assert.equal(calls[0][0], 'https://api.telegram.org/botT/sendMessage');
  assert.equal(calls[0][1].parse_mode, 'HTML');
  const bad = await sendTelegram('hi', { env: { TELEGRAM_BOT_TOKEN: 'SECRET', TELEGRAM_CHAT_ID: '1' }, fetchFn: async () => { throw new Error('fail https://api.telegram.org/botSECRET/x'); } });
  assert.equal(bad.ok, false);
  assert.ok(!bad.reason.includes('SECRET'));
});

test('mergeState unions attempts and days, newest wins on the rest', () => {
  const a = { ...freshState(), updatedAt: 10, done: { x: 1 }, days: { '2026-09-01': 1 }, attempts: [attempt('ml', [true], 1)] };
  const b = { ...freshState(), updatedAt: 20, done: {}, days: { '2026-09-02': 1 }, attempts: [attempt('ml', [true], 1), attempt('ml', [false], 2)] };
  const m = mergeState(a, b);
  assert.deepEqual(m.done, {});
  assert.equal(m.attempts.length, 2);
  assert.equal(Object.keys(m.days).length, 2);
  assert.equal(m.updatedAt, 20);
});

test('auth', () => {
  const req = (h) => ({ headers: new Map(Object.entries(h)) });
  assert.equal(checkAccess(req({}), {}), true);
  assert.equal(checkAccess(req({ 'x-access-key': 'k' }), { ACCESS_KEY: 'k' }), true);
  assert.equal(checkAccess(req({ 'x-access-key': 'no' }), { ACCESS_KEY: 'k' }), false);
  assert.equal(checkCron(req({ authorization: 'Bearer s' }), { CRON_SECRET: 's' }), true);
  assert.equal(checkCron(req({}), { CRON_SECRET: 's' }), false);
});

test('dates', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(dateInZone(new Date('2026-09-29T21:00:00Z'), 'Asia/Dubai'), '2026-09-30');
});

test('runDaily end to end with file store and fake network', async () => {
  const file = path.join(tmpdir(), `academy-${Date.now()}.json`);
  const store = createFileStore(file);
  const sent = [];
  const fetchFn = async (url, opts) => {
    if (url.startsWith('https://api.telegram.org')) { sent.push(JSON.parse(opts.body).text); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
    if (url.includes('arxiv')) return { ok: true, text: async () => '<feed><entry><id>http://arxiv.org/abs/2601.00001v1</id><title>Agents paper</title><summary>agent</summary><published>2026-09-28T00:00:00Z</published></entry></feed>' };
    return { ok: true, text: async () => '[]' };
  };
  const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1', TZ_NAME: 'Asia/Dubai' };
  const now = new Date('2026-09-29T03:00:00Z');
  const r = await runDaily({ store, env, fetchFn, now, courses, topics, papers });
  assert.equal(r.date, '2026-09-29');
  assert.equal(r.telegram.ok, true);
  assert.match(sent[0], /AI Academy/);
  assert.match(sent[0], /Agents paper/);
  assert.equal((await store.getDaily('2026-09-29')).date, '2026-09-29');
  const again = await runDaily({ store, env, fetchFn, now, courses, topics, papers });
  assert.equal(again.skipped, true);
  assert.equal(sent.length, 1);
  const logs = await store.listLogs();
  assert.ok(logs.some((l) => l.type === 'daily_digest'));
  const forced = await runDaily({ store, env, fetchFn, now, courses, topics, papers, force: true });
  assert.equal(forced.skipped, undefined);
  assert.equal(sent.length, 2);
});

test('digest is valid-looking Telegram HTML and under the limit', () => {
  const s = freshState();
  const plan = makePlan({ state: s, courses, topics, papers, newPapers: [], date: '2026-09-29' });
  const d = buildDigest({ date: '2026-09-29', state: s, courses, topics, plan, papers, feedItems: [], errors: [], appUrl: 'https://x.test' });
  assert.ok(d.length < 3800);
  assert.ok(!/<(?!\/?(b|a)[ >])/.test(d.replace(/<a href="[^"]*">/g, '<a>')));
});
