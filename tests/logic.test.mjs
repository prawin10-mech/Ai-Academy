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
import { runDaily, buildDigest, digestDue, localHour } from '../lib/daily.js';
import { checkCron } from '../lib/cron-auth.js';
import { hashPassword, verifyPassword, signSession, verifySession, sessionCookie, parseCookies, sameOrigin } from '../lib/security.js';
import { registerUser, loginUser, validateSignup, changePassword } from '../lib/users.js';
import { handleUpdate, webhookAuthorized } from '../lib/bot.js';
import { logEvent } from '../lib/log.js';
import { buildPath, defaultProfile, effectiveSkill, placementTopics } from '../lib/path.js';
import { dateInZone, addDays } from '../lib/dates.js';

const j = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const courses = j('courses.json');
const quizzes = j('quizzes.json');
const { topics } = j('topics.json');
const papers = j('papers.json');

const ENV = { SESSION_SECRET: 'test-secret-0123456789' };
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


test('dates', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(dateInZone(new Date('2026-09-29T21:00:00Z'), 'Asia/Dubai'), '2026-09-30');
});



test('explanation content covers every course, lesson, paper and glossary link', () => {
  const guides = j('course-guides.json');
  const pg = j('paper-guides.json');
  const gl = j('glossary.json');
  for (const c of courses) {
    const g = guides[c.id];
    assert.ok(g, c.id);
    assert.ok(g.plain && g.learn.length >= 3 && g.concepts.length >= 3 && g.mern && g.pitfall && g.prereq, c.id);
    for (const l of c.lessons) assert.ok(g.lessons[l.id], l.id);
  }
  for (const p of papers) {
    const g = pg[p.id];
    assert.ok(g && g.eli5 && g.analogy && g.problem && g.idea && g.terms.length >= 3 && g.lookFor.length === 3 && g.skip && g.limits && g.tryIt, p.id);
  }
  const terms = new Set(gl.map((x) => x.term));
  assert.equal(terms.size, gl.length);
  for (const g of gl) { assert.ok(topics[g.topic]); for (const r of g.related) assert.ok(terms.has(r), r); }
});

test('every practice exercise: solution passes, starter fails, ids valid', async () => {
  const { runCases } = await import('../lib/runner.js');
  const ex = j('exercises.json');
  const ids = new Set(courses.map((c) => c.id));
  assert.equal(new Set(ex.map((e) => e.id)).size, ex.length);
  for (const e of ex) {
    assert.ok(ids.has(e.course), e.id);
    assert.ok(topics[e.topic], e.id);
    assert.equal(e.hints.length, 3, e.id);
    assert.ok(e.cases.filter((c) => c.hidden).length >= 2, e.id);
    const sol = runCases(e.solution, e.fn, e.cases, { tol: e.tol });
    assert.equal(sol.compileError, null, e.id);
    assert.ok(sol.results.every((r) => r.pass), `${e.id} solution fails: ${JSON.stringify(sol.results.filter((r) => !r.pass))}`);
    const st = runCases(e.starter, e.fn, e.cases, { tol: e.tol });
    assert.equal(st.compileError, null, e.id);
    assert.ok(st.results.some((r) => !r.pass), `${e.id} starter already passes`);
  }
});

test('career content is consistent', () => {
  const pr = j('projects.json');
  const iv = j('interview.json');
  const ids = new Set(courses.map((c) => c.id));
  assert.equal(pr.length, 6);
  for (const p of pr) { for (const r of p.requires) assert.ok(ids.has(r), r); for (const t of p.topics) assert.ok(topics[t]); assert.ok(p.milestones.length >= 4 && p.rubric.length >= 4); }
  assert.equal(iv.technical.length, 54);
  assert.equal(iv.design.length, 6);
  assert.equal(iv.behavioral.length, 8);
});

const mkStore = () => createFileStore(null);
const tgOk = (sent) => async (url, opts) => {
  if (String(url).startsWith('https://api.telegram.org')) { const b = JSON.parse(opts.body); sent.push(b); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
  if (String(url).includes('arxiv')) return { ok: true, text: async () => '<feed><entry><id>http://arxiv.org/abs/2601.00001v1</id><title>Agents paper</title><summary>agent</summary><published>2026-09-28T00:00:00Z</published></entry></feed>' };
  return { ok: true, text: async () => '[]' };
};

test('passwords and sessions', async () => {
  const h = await hashPassword('correct horse');
  assert.ok(await verifyPassword('correct horse', h));
  assert.ok(!(await verifyPassword('wrong', h)));
  assert.ok(!(await verifyPassword('x', 'garbage')));
  const tok = signSession({ uid: 'u1', tv: 0, exp: Date.now() + 1000 }, ENV);
  assert.equal(verifySession(tok, ENV).uid, 'u1');
  assert.equal(verifySession(tok + 'x', ENV), null);
  assert.equal(verifySession(signSession({ uid: 'u1', exp: 1 }, ENV), ENV), null);
  assert.equal(verifySession(tok, { SESSION_SECRET: 'another-secret-0123456' }), null);
  assert.throws(() => signSession({}, { NODE_ENV: 'production' }));
  const c = sessionCookie({ id: 'u1' }, { ...ENV, NODE_ENV: 'production' });
  assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Lax/);
  assert.equal(parseCookies('a=1; academy_session=abc').academy_session, 'abc');
  const req = (h, m = 'POST') => ({ method: m, url: 'https://x.test/api', headers: new Map(Object.entries(h)) });
  assert.equal(sameOrigin(req({ origin: 'https://evil.test', host: 'x.test' })), false);
  assert.equal(sameOrigin(req({ origin: 'https://x.test', host: 'x.test' })), true);
  assert.equal(sameOrigin(req({ origin: 'https://evil.test' }, 'GET')), true);
});

test('register, login, duplicate, weak input, password change', async () => {
  const store = mkStore();
  assert.match(validateSignup({ email: 'bad', password: 'longenough1' }).error, /email/);
  assert.match(validateSignup({ email: 'a@b.co', password: 'short' }).error, /8/);
  const r = await registerUser(store, { email: ' Ada@Example.com ', password: 'longenough1', name: 'Ada', tz: 'Asia/Dubai' }, { ADMIN_EMAIL: 'ada@example.com' });
  assert.equal(r.user.email, 'ada@example.com');
  assert.equal(r.user.admin, true);
  assert.ok(!('password' in r.user));
  assert.equal((await registerUser(store, { email: 'ada@example.com', password: 'longenough1' })).status, 409);
  assert.equal((await loginUser(store, { email: 'ADA@example.com', password: 'longenough1' })).user.id, r.user.id);
  assert.equal((await loginUser(store, { email: 'ada@example.com', password: 'nope' })).status, 401);
  assert.equal((await loginUser(store, { email: 'nobody@example.com', password: 'nope' })).status, 401);
  const ch = await changePassword(store, r.user, { current: 'longenough1', next: 'brandnewpass' });
  assert.equal(ch.user.tokenVersion, 1);
  assert.equal((await changePassword(store, ch.user, { current: 'bad', next: 'brandnewpass2' })).status, 403);
  assert.equal(validateSignup({ email: 'a@b.co', password: 'longenough1', tz: 'Not/AZone' }).tz, 'UTC');
});

test('users are isolated and deletion removes everything', async () => {
  const store = mkStore();
  const a = (await registerUser(store, { email: 'a@x.co', password: 'longenough1' })).user;
  const b = (await registerUser(store, { email: 'b@x.co', password: 'longenough1' })).user;
  await store.putState(a.id, { ...freshState(), done: { x: 1 } });
  await store.putPlan(a.id, { date: '2026-09-29', focus: 'A' });
  await logEvent(store, { user: a, type: 'lesson_complete', message: 'hi' });
  assert.deepEqual((await store.getState(b.id)).done, {});
  assert.equal((await store.listLogs(b.id)).length, 0);
  assert.equal((await store.listLogs(a.id)).length, 1);
  const exp = await store.exportUser(a.id);
  assert.ok(!('passHash' in exp.user)); assert.equal(exp.state.done.x, 1);
  await store.deleteUser(a.id);
  assert.equal(await store.getUserById(a.id), null);
  assert.equal((await store.listPlans(a.id)).length, 0);
  assert.ok(await store.getUserById(b.id));
  assert.equal(await store.hit('k', 60), 1); assert.equal(await store.hit('k', 60), 2);
});

test('telegram linking: token, expiry, one chat per account, stop', async () => {
  const store = mkStore();
  const a = (await registerUser(store, { email: 'a@x.co', password: 'longenough1', name: 'Ada' })).user;
  const b = (await registerUser(store, { email: 'b@x.co', password: 'longenough1' })).user;
  const sent = [];
  const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_WEBHOOK_SECRET: 's' };
  const fetchFn = tgOk(sent);
  const upd = (text, chat = 111) => ({ message: { text, chat: { id: chat, type: 'private' } } });
  await store.updateUser(a.id, { telegramLinkToken: 'tokentoken12345', telegramLinkExpires: Date.now() + 60000 });
  assert.equal((await handleUpdate({ store, update: upd('/start tokentoken12345'), env, fetchFn })).action, 'linked');
  assert.equal((await store.getUserById(a.id)).telegramChatId, '111');
  assert.equal((await store.getUserById(a.id)).telegramLinkToken, undefined);
  assert.equal((await handleUpdate({ store, update: upd('/start tokentoken12345'), env, fetchFn })).action, 'expired');
  await store.updateUser(b.id, { telegramLinkToken: 'othertoken12345', telegramLinkExpires: Date.now() - 1 });
  assert.equal((await handleUpdate({ store, update: upd('/start othertoken12345', 222), env, fetchFn })).action, 'expired');
  await store.updateUser(b.id, { telegramLinkToken: 'othertoken12345', telegramLinkExpires: Date.now() + 60000 });
  await handleUpdate({ store, update: upd('/start othertoken12345', 111), env, fetchFn });
  assert.equal((await store.getUserById(a.id)).telegramChatId, undefined, 'chat moved to the newest account');
  assert.equal((await store.getUserById(b.id)).telegramChatId, '111');
  assert.equal((await handleUpdate({ store, update: upd('/stop'), env, fetchFn })).action, 'stopped');
  assert.equal((await store.getUserById(b.id)).telegramChatId, undefined);
  assert.equal((await handleUpdate({ store, update: { message: { text: '/start', chat: { id: 5, type: 'group' } } }, env, fetchFn })).handled, false);
  const hdr = (v) => ({ headers: new Map([['x-telegram-bot-api-secret-token', v]]) });
  assert.equal(webhookAuthorized(hdr('s'), env), true);
  assert.equal(webhookAuthorized(hdr('no'), env), false);
  assert.equal(webhookAuthorized(hdr('s'), {}), false);
});

test('logEvent routes to the user chat, the admin chat, or nowhere', async () => {
  const store = mkStore();
  const sent = [];
  const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '999' };
  const fetchFn = tgOk(sent);
  const linked = { id: 'u', telegramChatId: '111', digest: true };
  await logEvent(store, { user: linked, type: 'quiz_daily_done', message: 'x', env, fetchFn });
  await logEvent(store, { user: linked, type: 'lesson_complete', message: 'x', env, fetchFn });
  await logEvent(store, { user: linked, type: 'client_error', message: 'x', env, fetchFn });
  await logEvent(store, { user: { id: 'v' }, type: 'quiz_daily_done', message: 'x', env, fetchFn });
  await logEvent(store, { user: { ...linked, digest: false }, type: 'quiz_daily_done', message: 'x', env, fetchFn });
  assert.deepEqual(sent.map((s) => s.chat_id), ['111', '999']);
});

test('digest schedule follows each learner time zone', () => {
  const u = { telegramChatId: '1', tz: 'Asia/Dubai', digestHour: 7 };
  assert.equal(localHour(new Date('2026-09-29T03:00:00Z'), 'Asia/Dubai'), 7);
  assert.equal(digestDue(u, new Date('2026-09-29T03:00:00Z')), true);
  assert.equal(digestDue(u, new Date('2026-09-29T02:00:00Z')), false);
  assert.equal(digestDue({ ...u, lastDigestDate: '2026-09-29' }, new Date('2026-09-29T03:00:00Z')), false);
  assert.equal(digestDue({ ...u, digest: false }, new Date('2026-09-29T03:00:00Z')), false);
  assert.equal(digestDue({ ...u, telegramChatId: undefined }, new Date('2026-09-29T03:00:00Z'), true), false);
  assert.equal(digestDue({ ...u, digest: false }, new Date('2026-09-29T02:00:00Z'), true), true);
  assert.equal(digestDue({ ...u, tz: 'America/New_York' }, new Date('2026-09-29T03:00:00Z')), false);
});

test('runDaily: many learners, own time zones, no duplicates, dead chats unlinked', async () => {
  const store = mkStore();
  const sent = [];
  const base = tgOk(sent);
  const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '999' };
  const mk = async (email, extra) => { const u = (await registerUser(store, { email, password: 'longenough1', name: email[0] })).user; return store.updateUser(u.id, extra); };
  const dubai = await mk('d@x.co', { telegramChatId: '1', tz: 'Asia/Dubai' });
  const ny = await mk('n@x.co', { telegramChatId: '2', tz: 'America/New_York' });
  const off = await mk('o@x.co', { telegramChatId: '3', tz: 'Asia/Dubai', digest: false });
  await mk('nolink@x.co', {});
  const dead = await mk('x@x.co', { telegramChatId: '4', tz: 'Asia/Dubai' });
  const fetchFn = async (url, opts) => {
    if (String(url).startsWith('https://api.telegram.org') && JSON.parse(opts.body).chat_id === '4') return { ok: false, status: 403, json: async () => ({ ok: false, description: 'Forbidden: bot was blocked by the user' }) };
    return base(url, opts);
  };
  const now = new Date('2026-09-29T03:00:00Z');
  const r = await runDaily({ store, env, fetchFn, now, courses, topics, papers });
  assert.equal(r.sent, 1); assert.equal(r.failed, 1); assert.equal(r.unlinked, 1);
  assert.equal((await store.getUserById(dead.id)).telegramChatId, undefined);
  const userMsgs = sent.filter((m) => m.chat_id === '1');
  assert.equal(userMsgs.length, 1);
  assert.match(userMsgs[0].text, /Agents paper/);
  assert.equal((await store.getUserById(dubai.id)).lastDigestDate, '2026-09-29');
  assert.ok(await store.getPlan(dubai.id, '2026-09-29'));
  assert.equal(await store.getPlan(ny.id, '2026-09-29'), null);
  assert.ok(sent.some((m) => m.chat_id === '999'), 'owner gets a summary');
  const again = await runDaily({ store, env, fetchFn, now, courses, topics, papers });
  assert.equal(again.sent, 0);
  assert.equal(sent.filter((m) => m.chat_id === '1').length, 1);
  const forced = await runDaily({ store, env, fetchFn, now, courses, topics, papers, force: true });
  assert.ok(forced.sent >= 2, 'force sends to all linked');
  assert.equal(off.telegramChatId, '3');
  const tiny = await runDaily({ store, env, fetchFn, now, courses, topics, papers, force: true, budgetMs: -1 });
  assert.equal(tiny.truncated, true);
});

test('digest text is valid Telegram HTML and under the limit', () => {
  const s = freshState();
  const plan = makePlan({ state: s, courses, topics, papers, newPapers: [], date: '2026-09-29' });
  const d = buildDigest({ name: 'A<b>', date: '2026-09-29', state: s, courses, topics, plan, feedItems: [], errors: [], appUrl: 'https://x.test' });
  assert.ok(d.length < 3800);
  assert.ok(d.includes('A&lt;b&gt;'));
});

test('cron auth is closed in production without a secret', () => {
  const req = (h) => ({ headers: new Map(Object.entries(h)) });
  assert.equal(checkCron(req({ authorization: 'Bearer s' }), { CRON_SECRET: 's' }), true);
  assert.equal(checkCron(req({}), { CRON_SECRET: 's' }), false);
  assert.equal(checkCron(req({}), { NODE_ENV: 'production' }), false);
  assert.equal(checkCron(req({}), {}), true);
});

test('personalised path adapts to what the learner knows', () => {
  const web = freshState(); web.profile = defaultProfile('web');
  const ml = freshState(); ml.profile = defaultProfile('ml');
  const pw = buildPath(web, courses, topics); const pm = buildPath(ml, courses, topics);
  const st = (p, id) => p.items.find((x) => x.course.id === id).status;
  assert.equal(st(pw, 'py-dlai'), 'learn');
  assert.equal(st(pm, 'py-dlai'), 'skip');
  assert.equal(st(pw, 'ml-cs229'), 'optional');
  assert.ok(pm.hoursLeft < pw.hoursLeft);
  assert.ok(pw.weeksLeft >= 1);
  // a measured score overrides the self-rating in both directions
  const s = freshState(); s.profile = defaultProfile('ml');
  s.attempts.push(attempt('ml', [false, false, false, true]));
  assert.equal(effectiveSkill(s, 'ml').source, 'measured');
  assert.equal(effectiveSkill(s, 'ml').level, 1);
  assert.notEqual(st(buildPath(s, courses, topics), 'ml-mlcc'), 'skip');
  const w2 = freshState(); w2.profile = defaultProfile('web');
  w2.attempts.push(attempt('python', [true, true, true, true]));
  assert.equal(st(buildPath(w2, courses, topics), 'py-dlai'), 'skip');
  assert.deepEqual(placementTopics(ml.profile).length, 4);
  assert.deepEqual(placementTopics(web.profile), ['mlops']);
  // finished courses are marked done and the plan follows the path
  const plan = makePlan({ state: web, courses, topics, papers, newPapers: [], date: '2026-09-29' });
  assert.match(plan.why, /Next on your path/);
});

// ---- radar, roadmap, readiness ----
import { parseRss, parseHn, parseHfModels, vendorOf, rankRadar, fetchRadar } from '../lib/radar.js';
import { readiness } from '../lib/readiness.js';

test('radar parsers and ranking', () => {
  const rss = '<rss><item><title>Introducing GPT-5.2</title><link>https://openai.com/a</link><pubDate>Mon, 28 Sep 2026 10:00:00 GMT</pubDate></item><item><title>Gardening</title><link>https://x.com/g</link></item></rss>';
  const items = parseRss(rss, 'OpenAI news');
  assert.equal(items.length, 2);
  assert.equal(items[0].date, '2026-09-28');
  assert.ok(vendorOf('Llama 4 released'));
  const hn = parseHn({ hits: [{ title: 'Gemini 3 launch', objectID: '1', points: 300, created_at: '2026-09-29T00:00:00Z' }, { objectID: '2' }] });
  assert.equal(hn.length, 1);
  assert.equal(hn[0].url, 'https://news.ycombinator.com/item?id=1');
  const hf = parseHfModels([{ id: 'org/model', likes: 9999, pipeline_tag: 'text-generation' }, {}]);
  assert.equal(hf.length, 1);
  assert.equal(hf[0].points, 500);
  const ranked = rankRadar([...items, ...items, ...hn], Date.parse('2026-09-30'));
  assert.equal(ranked.length, 3);
  assert.notEqual(ranked[ranked.length - 1].title, 'Introducing GPT-5.2');
});

test('fetchRadar is fail-soft', async () => {
  const fake = async (url) => {
    if (String(url).includes('huggingface.co/api')) throw new Error('down');
    if (String(url).includes('hn.algolia')) return { ok: true, status: 200, text: async () => JSON.stringify({ hits: [{ title: 'Grok 5 out', objectID: '9', points: 50, created_at: '2026-09-29T00:00:00Z' }] }), json: async () => ({ hits: [] }) };
    return { ok: false, status: 500, text: async () => '', json: async () => ({}) };
  };
  const r = await fetchRadar(fake, Date.parse('2026-09-30'));
  assert.ok(r.items.length >= 1);
  assert.ok(r.errors.length >= 1);
});

test('roadmap references only real courses, exercises, projects, topics', () => {
  const j = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
  const road = j('roadmap.json');
  const courses = new Set(j('courses.json').map((c) => c.id));
  const ex = j('exercises.json');
  const exIds = new Set(ex.map((e) => e.id));
  const projs = j('projects.json');
  const pIds = new Set(projs.map((p) => p.id));
  const topics = new Set(Object.keys(j('topics.json').topics));
  assert.equal(road.weeks.length, 26);
  for (const w of road.weeks) {
    for (const c of w.courses || []) assert.ok(courses.has(c.id), `course ${c.id}`);
    for (const e of w.exercises || []) assert.ok(exIds.has(e), `exercise ${e}`);
    for (const p of [w.project].flat().filter(Boolean)) assert.ok(pIds.has(p.id || p), `project ${p.id || p}`);
    for (const q of w.quiz || []) assert.ok(topics.has(q), `topic ${q}`);
  }
});

test('readiness: empty learner is not job-ready, gates hold', () => {
  const j = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
  const ex = j('exercises.json'); const pr = j('projects.json'); const iv = j('interview.json');
  const ctx = { topics: j('topics.json').topics, exercises: ex, projects: pr, interview: iv };
  const r = readiness(freshState(), ctx);
  assert.ok(r.total < 20);
  assert.equal(r.label, 'Getting started');
  assert.equal(r.gates.knowledge && r.gates.practice && r.gates.projects, false);
});

test('exercise ids are unique and levels are known', () => {
  const ex = JSON.parse(readFileSync(new URL('../data/exercises.json', import.meta.url), 'utf8'));
  assert.equal(new Set(ex.map((e) => e.id)).size, ex.length);
  for (const e of ex) assert.ok(['starter', 'core', 'stretch'].includes(e.level), `${e.id} level ${e.level}`);
  assert.ok(ex.length >= 46);
});

test('telegram bot commands: welcome, status, today, streak, pause, unlinked chat', async () => {
  const store = mkStore();
  const a = (await registerUser(store, { email: 'ada@x.co', password: 'longenough1', name: 'Ada', tz: 'Asia/Dubai' })).user;
  const sent = [];
  const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_WEBHOOK_SECRET: 's' };
  const fetchFn = tgOk(sent);
  const upd = (text, chat = 333) => ({ message: { text, chat: { id: chat, type: 'private' } } });
  const say = async (t, chat) => { const before = sent.length; const r = await handleUpdate({ store, update: upd(t, chat), env, fetchFn }); return { r, text: JSON.stringify(sent.slice(before)) }; };
  // not linked yet
  let x = await say('/start');
  assert.equal(x.r.action, 'help'); assert.match(x.text, /not linked/);
  x = await say('/today'); assert.equal(x.r.action, 'not_linked');
  // link, welcome lists commands
  await store.updateUser(a.id, { telegramLinkToken: 'tokentoken12345', telegramLinkExpires: Date.now() + 60000 });
  x = await say('/start tokentoken12345');
  assert.equal(x.r.action, 'linked'); assert.match(x.text, /Linked, Ada/); assert.match(x.text, /\/today/);
  x = await say('/start'); assert.equal(x.r.action, 'welcome_back'); assert.match(x.text, /a\*\*\*@x\.co/);
  x = await say('/status'); assert.match(x.text, /Digest: on/);
  x = await say('/streak'); assert.equal(x.r.action, 'streak');
  x = await say('/today'); assert.equal(x.r.action, 'today');
  x = await say('/pause'); assert.equal((await store.getUserById(a.id)).digest, false);
  x = await say('/status'); assert.match(x.text, /paused/);
  x = await say('/resume'); assert.equal((await store.getUserById(a.id)).digest, true);
  x = await say('hello there'); assert.equal(x.r.action, 'unknown'); assert.match(x.text, /\/help/);
});

import { resolveSkin, seasonal, SKIN_IDS } from '../lib/skins.js';
test('themes: seasonal, daily rotation, fixed choice', () => {
  const oct20 = new Date(2026, 9, 20); const mar3 = new Date(2026, 2, 3);
  assert.equal(seasonal(oct20), 'spooky'); assert.equal(seasonal(mar3), null);
  assert.equal(resolveSkin('auto', oct20), 'spooky'); assert.equal(resolveSkin('auto', mar3), 'classic');
  assert.equal(resolveSkin('daily', oct20), 'spooky');
  const seen = new Set(); for (let d = 1; d <= 7; d++) seen.add(resolveSkin('daily', new Date(2026, 2, d)));
  assert.ok(seen.size >= 3);
  assert.equal(resolveSkin('neon', oct20), 'neon');
  assert.equal(resolveSkin('nonsense', mar3), 'classic');
  assert.ok(SKIN_IDS.includes('hero'));
});
