'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import courses from '../data/courses.json';
import quizzes from '../data/quizzes.json';
import topicsData from '../data/topics.json';
import papers from '../data/papers.json';
import seed from '../data/daily-seed.json';
import { buildQuiz, courseProgress, freshState, normalizeState, streak as calcStreak } from '../lib/scoring.js';
import { mergeState } from '../lib/state.js';
import { dateInZone } from '../lib/dates.js';

const Ctx = createContext(null);
export const useAcademy = () => useContext(Ctx);

const LS_STATE = 'ai-academy-state-v2';
const LS_KEY = 'ai-academy-key';

export const TOPICS = topicsData.topics;
export const PHASES = topicsData.phases;
export const COURSES = courses;
export const PAPERS = papers;
export const QUIZ = quizzes;

const LESSONS = {};
courses.forEach((c) => c.lessons.forEach((l, idx) => { LESSONS[l.id] = { course: c, lesson: l, idx }; }));
export { LESSONS };
export const courseById = (id) => courses.find((c) => c.id === id) || null;

const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dubai'; } catch { return 'Asia/Dubai'; } };
export const todayLocal = () => dateInZone(new Date(), localTz());

function readLS(k) { try { return localStorage.getItem(k); } catch { return null; } }
function writeLS(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }

export default function Providers({ children }) {
  const [state, setState] = useState(freshState());
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState('Loading');
  const [needKey, setNeedKey] = useState(false);
  const [plans, setPlans] = useState(seed);
  const [feed, setFeed] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const stateRef = useRef(state);
  const keyRef = useRef('');
  const saveTimer = useRef(null);
  const saving = useRef(false);
  const again = useRef(false);
  const errCount = useRef(0);

  const api = useCallback(async (path, opts = {}) => {
    const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
    if (keyRef.current) headers['x-access-key'] = keyRef.current;
    const res = await fetch(path, { ...opts, headers });
    if (res.status === 401) { setNeedKey(true); throw new Error('unauthorized'); }
    return res;
  }, []);

  const report = useCallback((type, message) => {
    if (!keyRef.current && needKey) return;
    api('/api/log', { method: 'POST', body: JSON.stringify({ type, message }) }).catch(() => {});
  }, [api, needKey]);

  const flush = useCallback(async () => {
    if (saving.current) { again.current = true; return; }
    saving.current = true;
    const snap = stateRef.current;
    const wrote = writeLS(LS_STATE, JSON.stringify(snap));
    try {
      await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: snap }) });
      setSync('Synced');
    } catch (e) {
      setSync(wrote ? 'Saved on this device' : 'Not saved');
    }
    saving.current = false;
    if (again.current) { again.current = false; flush(); }
  }, [api]);

  const update = useCallback((fn) => {
    const next = fn(stateRef.current);
    next.updatedAt = Date.now();
    stateRef.current = next;
    setState(next);
    setSync('Saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 800);
  }, [flush]);

  const load = useCallback(async () => {
    let local = null;
    try { local = JSON.parse(readLS(LS_STATE) || 'null'); } catch { local = null; }
    let s = normalizeState(local);
    try {
      const res = await api('/api/state');
      if (res.ok) {
        const data = await res.json();
        s = mergeState(data.state, s);
        setSync(data.store === 'file' ? 'Synced (dev file store)' : 'Synced');
      } else {
        setSync('Saved on this device');
      }
    } catch (e) {
      if (String(e.message) !== 'unauthorized') setSync('Offline: saved on this device');
    }
    stateRef.current = s;
    setState(s);
    setReady(true);
    api('/api/daily').then((r) => r.json()).then((d) => {
      if (d.plans && d.plans.length) setPlans(d.plans);
      if (d.feed) setFeed(d.feed);
    }).catch(() => {});
  }, [api]);

  useEffect(() => {
    keyRef.current = readLS(LS_KEY) || '';
    load();
    const onErr = (e) => {
      if (errCount.current++ >= 3) return;
      report('client_error', String((e && (e.message || (e.reason && e.reason.message))) || 'unknown error').slice(0, 300));
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onErr);
    const onHide = () => { if (document.visibilityState === 'hidden' && saveTimer.current) { clearTimeout(saveTimer.current); flush(); } };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onErr);
      document.removeEventListener('visibilitychange', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitKey = useCallback((k) => {
    keyRef.current = k.trim();
    writeLS(LS_KEY, keyRef.current);
    setNeedKey(false);
    load();
  }, [load]);

  /* ---------- actions ---------- */
  const markDay = (s) => { s.days = { ...s.days, [todayLocal()]: 1 }; };

  const toggleDone = useCallback((id) => {
    let completedCourse = null;
    update((s) => {
      const n = { ...s, done: { ...s.done } };
      if (n.done[id]) delete n.done[id];
      else {
        n.done[id] = 1;
        markDay(n);
        const c = LESSONS[id] && LESSONS[id].course;
        if (c && courseProgress(n, c).pct === 100) completedCourse = c;
      }
      return n;
    });
    if (completedCourse) report('course_complete', `Finished "${completedCourse.title}".`);
  }, [update, report]);

  const tick = useCallback((key) => toggleDone(key), [toggleDone]);

  const setNote = useCallback((id, text) => update((s) => { const n = { ...s, notes: { ...s.notes, [id]: text } }; markDay(n); return n; }), [update]);
  const setLast = useCallback((id) => update((s) => ({ ...s, last: id })), [update]);
  const setEmbed = useCallback((v) => update((s) => ({ ...s, embed: v })), [update]);

  const setPaper = useCallback((id, patch) => {
    let finished = false;
    update((s) => {
      const prev = s.papers[id] || { status: 'todo', pass: [false, false, false], note: '' };
      const cur = { ...prev, ...patch };
      if (patch.status === 'done' && prev.status !== 'done') finished = true;
      const n = { ...s, papers: { ...s.papers, [id]: cur } };
      if (patch.status || patch.pass) markDay(n);
      return n;
    });
    if (finished) {
      const p = papers.find((x) => x.id === id);
      report('paper_done', `Finished reading "${p ? p.title : id}".`);
    }
  }, [update, report]);

  const startQuiz = useCallback((topics, mode) => {
    setQuiz(buildQuiz(stateRef.current, quizzes, topics, 5, mode));
  }, []);

  const answer = useCallback((i) => {
    setQuiz((q) => {
      if (!q || q.picked != null) return q;
      const it = q.items[q.i];
      return { ...q, picked: i, results: [...q.results, { id: it.id, t: it.t, ok: i === it.a }] };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    const q = quiz;
    if (!q) return;
    const i = q.i + 1;
    if (i >= q.items.length) {
      const score = q.results.filter((r) => r.ok).length;
      const attempt = { ts: Date.now(), day: todayLocal(), mode: q.mode, topics: q.topics, score, total: q.results.length, qs: q.results };
      update((s) => { const n = { ...s, attempts: [...s.attempts, attempt].slice(-300) }; markDay(n); return n; });
      api('/api/attempts', { method: 'POST', body: JSON.stringify({ attempt }) }).catch(() => {});
      setQuiz({ ...q, picked: null, i, done: true });
    } else {
      setQuiz({ ...q, picked: null, i });
    }
  }, [quiz, update, api]);

  const exitQuiz = useCallback(() => setQuiz(null), []);

  const value = useMemo(() => ({
    state, ready, sync, plans, feed, quiz,
    streak: calcStreak(state, todayLocal()),
    toggleDone, tick, setNote, setLast, setEmbed, setPaper, startQuiz, answer, nextQuestion, exitQuiz, api,
  }), [state, ready, sync, plans, feed, quiz, toggleDone, tick, setNote, setLast, setEmbed, setPaper, startQuiz, answer, nextQuestion, exitQuiz, api]);

  if (needKey) return <KeyGate onSubmit={submitKey} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function KeyGate({ onSubmit }) {
  const [v, setV] = useState('');
  return (
    <div className="shell">
      <main style={{ paddingBlock: 48 }}>
        <div className="panel stack" style={{ maxWidth: 420 }}>
          <h1>AI Engineer Academy</h1>
          <p className="lead">This site is private. Enter your access key.</p>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v); }}>
            <input type="password" value={v} onChange={(e) => setV(e.target.value)} aria-label="Access key" autoComplete="current-password" className="field" />
            <button className="btn primary" type="submit">Continue</button>
          </form>
        </div>
      </main>
    </div>
  );
}
