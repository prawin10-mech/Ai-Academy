// Job-readiness estimate. It measures evidence (quizzes, passed exercises, project milestones, interview practice,
// consistency), never promises a job. Each part reports what is missing so the learner knows what to do next.
import { mastery } from './scoring.js';

const TOPIC_WEIGHT = { python: 1, math: 0.5, ml: 1, dl: 0.75, transformers: 1, llm: 1.5, rag: 1.5, agents: 1.5, mlops: 1 };
export const WEIGHTS = { knowledge: 30, practice: 20, projects: 30, interview: 10, consistency: 10 };

const clamp = (x) => Math.max(0, Math.min(1, x));

export function readiness(state, { topics, exercises, projects, interview }) {
  // knowledge: measured mastery only; unassessed topics count as zero
  let kn = 0;
  let kw = 0;
  const weakTopics = [];
  for (const t of Object.keys(topics)) {
    const w = TOPIC_WEIGHT[t] ?? 1;
    const m = mastery(state, t);
    kw += w;
    kn += w * ((m ?? 0) / 100);
    if (m == null || m < 70) weakTopics.push({ topic: t, mastery: m, weight: w });
  }
  const knowledge = kw ? kn / kw : 0;

  // practice: passed exercises, half credit if the solution was viewed first
  let pr = 0;
  for (const e of exercises) {
    const p = state.practice && state.practice[e.id];
    if (p && p.passed) pr += p.peeked ? 0.5 : 1;
  }
  const practice = exercises.length ? pr / exercises.length : 0;

  // projects: milestones ticked on the required projects
  const required = projects.filter((p) => p.required !== false);
  let ms = 0;
  let mt = 0;
  for (const p of required) {
    const done = (state.projects && state.projects[p.id] && state.projects[p.id].milestones) || {};
    mt += p.milestones.length;
    ms += p.milestones.filter((_, i) => done[i]).length;
  }
  const projectScore = mt ? ms / mt : 0;

  // interview: self-rated answers, solid = 1, partly = 0.5
  const all = [...interview.technical, ...interview.design, ...interview.behavioral];
  let iv = 0;
  for (const q of all) {
    const r = state.interview && state.interview[q.id];
    iv += r === 2 ? 1 : r === 1 ? 0.5 : 0;
  }
  const interviewScore = all.length ? iv / all.length : 0;

  // consistency: active days in the last 28 (20 active days = full marks)
  const today = new Date();
  let active = 0;
  for (let i = 0; i < 28; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i)).toISOString().slice(0, 10);
    if (state.days && state.days[d]) active++;
  }
  const consistency = clamp(active / 20);

  const parts = {
    knowledge: { score: knowledge, label: 'Skills measured by quizzes', detail: weakTopics.length ? `${weakTopics.length} topics below 70% or not yet assessed` : 'All topics at 70% or better' },
    practice: { score: practice, label: 'Coding exercises passed', detail: `${Math.round(pr * 10) / 10} of ${exercises.length} exercises` },
    projects: { score: projectScore, label: 'Portfolio project milestones', detail: `${ms} of ${mt} milestones on the required projects` },
    interview: { score: interviewScore, label: 'Interview answers you can give', detail: `${Math.round(iv)} of ${all.length} questions rated solid` },
    consistency: { score: consistency, label: 'Steady study (last 28 days)', detail: `${active} active days` },
  };
  let total = 0;
  for (const k of Object.keys(parts)) total += parts[k].score * WEIGHTS[k];
  total = Math.round(total);

  const gates = { knowledge: knowledge >= 0.6, practice: practice >= 0.5, projects: projectScore >= 0.6 };
  let label = total < 25 ? 'Getting started' : total < 50 ? 'Building your base' : total < 75 ? 'Nearly interview-ready' : 'Job-ready';
  if (label === 'Job-ready' && !(gates.knowledge && gates.practice && gates.projects)) label = 'Nearly interview-ready';

  // the biggest weighted gap is the next best action
  const order = Object.keys(parts).sort((a, b) => (1 - parts[b].score) * WEIGHTS[b] - (1 - parts[a].score) * WEIGHTS[a]);
  const next = { knowledge: 'Take quizzes on your weakest topics.', practice: 'Pass another coding exercise in the Practice lab.', projects: 'Tick off the next project milestone.', interview: 'Practise interview questions and rate your answers honestly.', consistency: 'Study a little every day: even 20 minutes keeps the streak.' }[order[0]];
  return { total, label, parts, gates, nextArea: order[0], next, weakTopics };
}
