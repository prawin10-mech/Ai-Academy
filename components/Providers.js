'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import courses from '../data/courses.json';
import quizzes from '../data/quizzes.json';
import topicsData from '../data/topics.json';
import papers from '../data/papers.json';
import seed from '../data/daily-seed.json';
import courseGuides from '../data/course-guides.json';
import paperGuides from '../data/paper-guides.json';
import glossary from '../data/glossary.json';
import exercises from '../data/exercises.json';
import projects from '../data/projects.json';
import interview from '../data/interview.json';
import roadmap from '../data/roadmap.json';
import { buildQuiz, courseProgress, freshState, normalizeState, streak as calcStreak } from '../lib/scoring.js';
import { mergeState } from '../lib/state.js';
import { dateInZone } from '../lib/dates.js';
import { usePathname } from 'next/navigation';
import AuthScreen from './AuthScreen.js';
import Shell from './Shell.js';

const Ctx = createContext(null);
export const useAcademy = () => useContext(Ctx);

const LS_GUEST = 'ai-academy-state-v2';
const lsUser = (id) => `ai-academy-state-u-${id}`;

export const TOPICS = topicsData.topics;
export const PHASES = topicsData.phases;
export const COURSES = courses;
export const PAPERS = papers;
export const QUIZ = quizzes;
export const GUIDES = courseGuides;
export const PAPER_GUIDES = paperGuides;
export const GLOSSARY = glossary;
export const EXERCISES = exercises;
export const PROJECTS = projects;
export const INTERVIEW = interview;
export const ROADMAP = roadmap;

const LESSONS = {};
courses.forEach((c) => c.lessons.forEach((l, idx) => { LESSONS[l.id] = { course: c, lesson: l, idx }; }));
export { LESSONS };
export const courseById = (id) => courses.find((c) => c.id === id) || null;

const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
export const todayLocal = () => dateInZone(new Date(), localTz());
export { localTz };

function readLS(k) { try { return localStorage.getItem(k); } catch { return null; } }
function writeLS(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }

export default function Providers({ children }) {
  const pathname = usePathname() || '/';
  const [mode, setMode] = useState('loading'); // loading | anon | guest | user
  const [user, setUser] = useState(null);
  const [botUsername, setBotUsername] = useState(null);
  const [state, setState] = useState(freshState());
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState('Loading');
  const [plans, setPlans] = useState(seed);
  const [feed, setFeed] = useState([]);
  const [radar, setRadar] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const stateRef = useRef(state);
  const modeRef = useRef('loading');
  const userRef = useRef(null);
  const saveTimer = useRef(null);
  const saving = useRef(false);
  const again = useRef(false);
  const errCount = useRef(0);

  const setModeBoth = (m) => { modeRef.current = m; setMode(m); };

  const api = useCallback(async (path, opts = {}) => {
    const headers = { ...(opts.body ? { 'content-type': 'application/json' } : {}), ...(opts.headers || {}) };
    const res = await fetch(path, { ...opts, headers, credentials: 'same-origin' });
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      userRef.current = null; setUser(null); setModeBoth('anon');
      throw new Error('unauthorized');
    }
    return res;
  }, []);

  const storageKey = () => (modeRef.current === 'user' && userRef.current ? lsUser(userRef.current.id) : LS_GUEST);

  const flush = useCallback(async () => {
    if (saving.current) { again.current = true; return; }
    saving.current = true;
    const snap = stateRef.current;
    const wrote = writeLS(storageKey(), JSON.stringify(snap));
    if (modeRef.current === 'user') {
      try {
        await api('/api/state', { method: 'PUT', body: JSON.stringify({ state: snap }) });
        setSync('Synced');
      } catch { setSync(wrote ? 'Saved on this device' : 'Not saved'); }
    } else {
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

  const loadUserData = useCallback(async () => {
    let local = null;
    try { local = JSON.parse(readLS(lsUser(userRef.current.id)) || 'null'); } catch { local = null; }
    // a guest who signs up keeps what they did as a guest
    let guest = null;
    try { guest = JSON.parse(readLS(LS_GUEST) || 'null'); } catch { guest = null; }
    let s = mergeState(mergeState(freshState(), guest), local);
    try {
      const res = await api('/api/state');
      if (res.ok) { const d = await res.json(); s = mergeState(d.state, s); setSync('Synced'); }
    } catch { setSync('Saved on this device'); }
    if (!s.startedAt) s.startedAt = todayLocal();
    stateRef.current = s;
    setState(s);
    setReady(true);
    flush();
    api('/api/daily').then((r) => r.json()).then((d) => { if (d.plans && d.plans.length) setPlans(d.plans); if (d.feed) setFeed(d.feed); }).catch(() => {});
    api('/api/radar').then((r) => r.json()).then((d) => setRadar(d.items || [])).catch(() => {});
  }, [api, flush]);

  const loadGuest = useCallback(() => {
    let s = freshState();
    try { s = normalizeState(JSON.parse(readLS(LS_GUEST) || 'null')); } catch { /* fresh */ }
    if (!s.startedAt) s.startedAt = todayLocal();
    stateRef.current = s;
    setState(s);
    setReady(true);
    setSync('Saved on this device');
  }, []);

  useEffect(() => {
    (async () => {
      let me = null;
      try { const r = await fetch('/api/auth/me', { credentials: 'same-origin' }); const d = await r.json(); me = d.user; setBotUsername(d.botUsername || null); } catch { /* offline */ }
      if (me) { userRef.current = me; setUser(me); setModeBoth('user'); await loadUserData(); }
      else if (readLS('ai-academy-guest') === '1') { setModeBoth('guest'); loadGuest(); }
      else setModeBoth('anon');
    })();
    const onErr = (e) => {
      if (errCount.current++ >= 3 || modeRef.current !== 'user') return;
      api('/api/log', { method: 'POST', body: JSON.stringify({ type: 'client_error', message: String((e && (e.message || (e.reason && e.reason.message))) || 'unknown error').slice(0, 300) }) }).catch(() => {});
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onErr);
    const onHide = () => { if (document.visibilityState === 'hidden' && saveTimer.current) { clearTimeout(saveTimer.current); flush(); } };
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onErr); document.removeEventListener('visibilitychange', onHide); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- account actions ---------- */
  const authCall = useCallback(async (path, body) => {
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return { error: d.error || 'Something went wrong. Try again.' };
    userRef.current = d.user; setUser(d.user); setModeBoth('user');
    await loadUserData();
    return { ok: true };
  }, [loadUserData]);

  const login = useCallback((email, password) => authCall('/api/auth/login', { email, password }), [authCall]);
  const register = useCallback((email, password, name, website) => authCall('/api/auth/register', { email, password, name, tz: localTz(), website }), [authCall]);

  const continueGuest = useCallback(() => {
    writeLS('ai-academy-guest', '1');
    setModeBoth('guest');
    loadGuest();
  }, [loadGuest]);

  const logout = useCallback(async () => {
    clearTimeout(saveTimer.current);
    if (modeRef.current === 'user') { await flush(); try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch { /* ignore */ } }
    try { localStorage.removeItem('ai-academy-guest'); } catch { /* ignore */ }
    userRef.current = null; setUser(null);
    stateRef.current = freshState(); setState(stateRef.current);
    setReady(false); setQuiz(null); setPlans(seed); setFeed([]); setRadar([]);
    setModeBoth('anon');
  }, [flush]);

  const refreshUser = useCallback((u) => { userRef.current = u; setUser(u); }, []);
  const reportEvent = useCallback((type, message) => {
    if (modeRef.current !== 'user') return;
    api('/api/log', { method: 'POST', body: JSON.stringify({ type, message }) }).catch(() => {});
  }, [api]);

  /* ---------- learning actions ---------- */
  const markDay = (s) => { s.days = { ...s.days, [todayLocal()]: 1 }; };

  const toggleDone = useCallback((id) => {
    let completed = null;
    update((s) => {
      const n = { ...s, done: { ...s.done } };
      if (n.done[id]) delete n.done[id];
      else {
        n.done[id] = 1; markDay(n);
        const c = LESSONS[id] && LESSONS[id].course;
        if (c && courseProgress(n, c).pct === 100) completed = c;
      }
      return n;
    });
    if (completed) reportEvent('course_complete', `Finished "${completed.title}".`);
  }, [update, reportEvent]);

  const setNote = useCallback((id, text) => update((s) => { const n = { ...s, notes: { ...s.notes, [id]: text } }; markDay(n); return n; }), [update]);
  const setLast = useCallback((id) => update((s) => ({ ...s, last: id })), [update]);
  const setEmbed = useCallback((v) => update((s) => ({ ...s, embed: v })), [update]);
  const setProfile = useCallback((profile) => update((s) => ({ ...s, profile: { ...profile, at: Date.now() } })), [update]);

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
    if (finished) { const p = papers.find((x) => x.id === id); reportEvent('paper_done', `Finished reading "${p ? p.title : id}".`); }
  }, [update, reportEvent]);

  const savePractice = useCallback((id, patch) => update((s) => {
    const prev = s.practice[id] || { attempts: 0, passed: false, peeked: false, code: '' };
    const cur = { ...prev, ...patch };
    if (cur.code && cur.code.length > 8000) cur.code = cur.code.slice(0, 8000);
    const n = { ...s, practice: { ...s.practice, [id]: cur } };
    if (patch.attempts != null || patch.passed) markDay(n);
    return n;
  }), [update]);

  const setProject = useCallback((id, patch) => update((s) => {
    const prev = s.projects[id] || { milestones: {}, repo: '', demo: '' };
    const n = { ...s, projects: { ...s.projects, [id]: { ...prev, ...patch } } };
    if (patch.milestones) markDay(n);
    return n;
  }), [update]);

  const rateInterview = useCallback((id, v) => update((s) => ({ ...s, interview: { ...s.interview, [id]: v } })), [update]);

  const startQuiz = useCallback((topics, qmode, n = 5) => { setQuiz(buildQuiz(stateRef.current, quizzes, topics, n, qmode)); }, []);

  const answer = useCallback((i) => {
    setQuiz((q) => {
      if (!q || q.picked != null) return q;
      const it = q.items[q.i];
      return { ...q, picked: i, results: [...q.results, { id: it.id, t: it.t, ok: i === it.a, pick: i }] };
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
      if (modeRef.current === 'user') api('/api/attempts', { method: 'POST', body: JSON.stringify({ attempt }) }).catch(() => {});
      setQuiz({ ...q, picked: null, i, done: true });
    } else setQuiz({ ...q, picked: null, i });
  }, [quiz, update, api]);

  const exitQuiz = useCallback(() => setQuiz(null), []);

  const value = useMemo(() => ({
    mode, user, botUsername, state, ready, sync, plans, feed, radar, quiz,
    streak: calcStreak(state, todayLocal()),
    login, register, continueGuest, logout, refreshUser, reportEvent,
    toggleDone, tick: toggleDone, setNote, setLast, setEmbed, setProfile, setPaper, savePractice, setProject, rateInterview,
    startQuiz, answer, nextQuestion, exitQuiz, api,
  }), [mode, user, botUsername, state, ready, sync, plans, feed, radar, quiz, login, register, continueGuest, logout, refreshUser, reportEvent, toggleDone, setNote, setLast, setEmbed, setProfile, setPaper, savePractice, setProject, rateInterview, startQuiz, answer, nextQuestion, exitQuiz, api]);

  if (mode === 'loading') return <div className="shell"><main><p className="lead" style={{ paddingBlock: 48 }}>Loading</p></main></div>;
  if (mode === 'anon' && pathname === '/privacy') return <div className="shell"><main style={{ paddingBlock: 32 }}>{children}</main></div>;
  if (mode === 'anon') return <AuthScreen onLogin={login} onRegister={register} onGuest={continueGuest} />;
  return <Ctx.Provider value={value}><Shell>{children}</Shell></Ctx.Provider>;
}
