// Pure learner-evaluation logic. Works on the state object and static data, no I/O.
import { addDays } from './dates.js';

export function freshState() {
  return { v: 2, updatedAt: 0, profile: null, startedAt: null, done: {}, notes: {}, papers: {}, practice: {}, projects: {}, interview: {}, attempts: [], days: {}, last: null, embed: null };
}

export function normalizeState(s) {
  return Object.assign(freshState(), s || {});
}

export function answersFor(state, topic) {
  const out = [];
  for (const a of state.attempts || []) for (const q of a.qs || []) if (q.t === topic) out.push(q.ok ? 1 : 0);
  return out;
}

export function mastery(state, topic) {
  const arr = answersFor(state, topic).slice(-10);
  if (arr.length < 3) return null;
  return Math.round((100 * arr.reduce((a, b) => a + b, 0)) / arr.length);
}

export function level(m) {
  if (m == null) return { label: 'Not assessed', tone: '' };
  if (m >= 80) return { label: 'Solid', tone: 'ok' };
  if (m >= 50) return { label: 'Getting there', tone: 'warn' };
  return { label: 'Needs work', tone: 'bad' };
}

// true = last answer right, false = last answer wrong, null = never seen
export function seenQ(state, id) {
  let r = null;
  for (const a of state.attempts || []) for (const q of a.qs || []) if (q.id === id) r = q.ok;
  return r;
}

export function buildQuiz(state, quizData, topics, n, mode, rng = Math.random) {
  const pool = [];
  for (const t of topics) {
    const m = mastery(state, t);
    const weak = m == null ? 1.5 : 1 + (100 - m) / 50;
    (quizData[t] || []).forEach((q, i) => {
      const id = `${t}:${i}`;
      const s = seenQ(state, id);
      pool.push({ id, t, src: q, w: weak * (s === false ? 3 : s === null ? 2 : 1) });
    });
  }
  const chosen = [];
  while (chosen.length < n && pool.length) {
    const total = pool.reduce((a, b) => a + b.w, 0);
    let r = rng() * total;
    let k = 0;
    for (; k < pool.length - 1; k++) {
      r -= pool[k].w;
      if (r <= 0) break;
    }
    chosen.push(pool.splice(k, 1)[0]);
  }
  const items = chosen.map((c) => {
    const idx = c.src.o.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return { id: c.id, t: c.t, q: c.src.q, o: idx.map((i) => c.src.o[i]), a: idx.indexOf(c.src.a), why: c.src.why };
  });
  return { mode, topics, items, i: 0, picked: null, results: [], done: false };
}

export function courseProgress(state, course) {
  let d = 0;
  for (const l of course.lessons) if (state.done[l.id]) d++;
  const total = course.lessons.length;
  return { done: d, total, pct: total ? Math.round((100 * d) / total) : 0 };
}

export function streak(state, todayIso) {
  let n = 0;
  let d = todayIso;
  if (!state.days[d]) d = addDays(d, -1);
  while (state.days[d]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function firstCourseForTopic(courses, topic) {
  return courses.find((c) => c.topic === topic) || null;
}

// The next lesson the learner has not finished, walking courses in phase order for a topic.
export function nextLessonForTopic(state, courses, topic) {
  const list = courses.filter((c) => c.topic === topic).sort((a, b) => a.phase - b.phase);
  for (const c of list) {
    const l = c.lessons.find((x) => !state.done[x.id]);
    if (l) return { course: c, lesson: l };
  }
  return null;
}

// Learner evaluation: one row per topic, plus the recommended focus.
export function evaluate(state, topics) {
  const rows = Object.keys(topics).map((t) => {
    const m = mastery(state, t);
    return { topic: t, name: topics[t], mastery: m, answered: answersFor(state, t).length, ...level(m) };
  });
  const assessed = rows.filter((r) => r.mastery != null && r.mastery < 80).sort((a, b) => a.mastery - b.mastery);
  const untouched = rows.filter((r) => r.answered === 0);
  let focus = null;
  let reason = 'All assessed topics are solid. Move on to the next phase.';
  if (assessed.length) {
    focus = assessed[0].topic;
    reason = `Review ${assessed[0].name} (${assessed[0].mastery}% recent accuracy).`;
  } else if (untouched.length) {
    focus = untouched[0].topic;
    reason = `Take a first quiz on ${untouched[0].name} to see where you stand.`;
  }
  return { rows, focus, reason };
}

export function totals(state, courses) {
  let total = 0;
  let done = 0;
  for (const c of courses) {
    const p = courseProgress(state, c);
    total += p.total;
    done += p.done;
  }
  return { total, done };
}

export function activityOn(state, iso) {
  const start = Date.parse(`${iso}T00:00:00Z`);
  const end = start + 86400000;
  let quizzes = 0;
  let answered = 0;
  let correct = 0;
  for (const a of state.attempts || []) {
    // attempt.day is set by the client in the learner's own zone; fall back to UTC ts range.
    const inDay = a.day ? a.day === iso : a.ts >= start && a.ts < end;
    if (!inDay) continue;
    quizzes++;
    answered += a.total;
    correct += a.score;
  }
  return { quizzes, answered, correct, active: !!state.days[iso] };
}
