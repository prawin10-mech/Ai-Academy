// Personalised course structure. Input: what the learner says they know (profile), what quizzes measured,
// and what they finished. Output: every course labelled and ordered, with reasons and time estimates.
import { courseProgress, mastery } from './scoring.js';

export const TOPIC_ORDER = ['python', 'math', 'ml', 'dl', 'transformers', 'llm', 'rag', 'agents', 'mlops'];

// 0 none, 1 basic, 2 comfortable, 3 strong
export const SKILL_LEVELS = [
  { v: 0, label: 'New to it' },
  { v: 1, label: 'Basics' },
  { v: 2, label: 'Comfortable' },
  { v: 3, label: 'Strong' },
];

// One-line self-check per topic so people rate themselves against something concrete.
export const SELF_CHECK = {
  python: 'Can you write a Python script that reads a CSV, cleans it and prints summary numbers?',
  math: 'Can you explain what a derivative, a matrix product and a probability distribution are?',
  ml: 'Can you explain train/test split, overfitting and how you would evaluate a classifier?',
  dl: 'Can you explain backpropagation and train a small neural network in PyTorch?',
  transformers: 'Can you explain self-attention and why transformers replaced RNNs?',
  llm: 'Have you built with LLM APIs: prompting, structured output, fine-tuning ideas?',
  rag: 'Can you build retrieval over your own documents with embeddings and a vector store?',
  agents: 'Have you built an agent that calls tools in a loop and handled its failures?',
  mlops: 'Have you served a model behind an API, containerised it and monitored it?',
};

export const BACKGROUNDS = {
  new: { label: 'New to programming', skills: { python: 0, math: 0, ml: 0, dl: 0, transformers: 0, llm: 0, rag: 0, agents: 0, mlops: 0 } },
  web: { label: 'Web developer (JavaScript / MERN)', skills: { python: 1, math: 1, ml: 0, dl: 0, transformers: 0, llm: 1, rag: 0, agents: 0, mlops: 2 } },
  python: { label: 'Python developer', skills: { python: 3, math: 1, ml: 1, dl: 0, transformers: 0, llm: 1, rag: 0, agents: 0, mlops: 1 } },
  data: { label: 'Data analyst or data scientist', skills: { python: 3, math: 2, ml: 2, dl: 1, transformers: 0, llm: 1, rag: 0, agents: 0, mlops: 1 } },
  ml: { label: 'ML practitioner', skills: { python: 3, math: 3, ml: 3, dl: 2, transformers: 1, llm: 2, rag: 1, agents: 0, mlops: 1 } },
};

// Deep dives a job-focused (application) learner can defer.
export const DEEP_DIVES = ['ml-cs229', 'dl-d2l', 'tr-cs224n', 'dl-fastai'];

export const GOALS = {
  app: 'Build AI products (LLM apps, RAG, agents)',
  ml: 'Become a machine learning engineer (also train models)',
};

export function defaultProfile(background = 'web') {
  return { background, skills: { ...(BACKGROUNDS[background] || BACKGROUNDS.web).skills }, goal: 'app', hoursPerWeek: 6, verified: {}, at: Date.now() };
}

// What we believe the learner knows: a measured score beats their own rating.
export function effectiveSkill(state, topic) {
  const self = Math.max(0, Math.min(3, (state.profile && state.profile.skills && state.profile.skills[topic]) ?? 0));
  const m = mastery(state, topic);
  if (m == null) return { level: self, source: 'self', mastery: null };
  const level = m >= 80 ? 3 : m >= 50 ? 2 : Math.min(self, 1);
  return { level, source: 'measured', mastery: m };
}

const STATUS_ORDER = { learn: 0, review: 1, skip: 2, optional: 3, done: 4 };

export function buildPath(state, courses, topicNames = {}) {
  const profile = state.profile;
  const goal = (profile && profile.goal) || 'app';
  const rank = {}; // position of each course within its topic
  const sorted = courses.map((c, i) => ({ c, i })).sort((a, b) => a.c.phase - b.c.phase || a.i - b.i);
  const items = sorted.map(({ c }) => {
    rank[c.topic] = (rank[c.topic] ?? -1) + 1;
    const r = rank[c.topic];
    const skill = effectiveSkill(state, c.topic);
    const prog = courseProgress(state, c);
    let status;
    let reason;
    const name = topicNames[c.topic] || c.topic;
    const basis = skill.source === 'measured' ? `you scored ${skill.mastery}% on ${name} questions` : `you rated ${name} as ${SKILL_LEVELS[skill.level].label.toLowerCase()}`;
    if (prog.pct === 100) { status = 'done'; reason = 'You finished this course.'; }
    else if (goal === 'app' && DEEP_DIVES.includes(c.id)) { status = 'optional'; reason = 'Deep dive. Do it later if you want more theory; not needed to build AI products.'; }
    else if (skill.level >= 3) { status = 'skip'; reason = `Skip or skim: ${basis}.`; }
    else if (skill.level === 2) { status = r === 0 ? 'review' : 'optional'; reason = r === 0 ? `Fast-track: ${basis}. Watch at 1.5x and do the checkpoints.` : `Optional: ${basis}, and an earlier course already covers it.`; }
    else if (skill.level === 1) { status = r === 0 ? 'learn' : r === 1 ? 'review' : 'optional'; reason = r === 0 ? `Start here: ${basis}.` : r === 1 ? 'A second angle on the same topic. Fast-track it.' : 'Extra practice.'; }
    else { status = r < 2 ? 'learn' : 'optional'; reason = r < 2 ? `Start here: ${basis}.` : 'Extra practice.'; }
    const hours = status === 'learn' ? c.hrs : status === 'review' ? Math.round(c.hrs * 0.4 * 10) / 10 : 0;
    return { course: c, status, reason, hours: Math.round(hours * (1 - prog.pct / 100) * 10) / 10, progress: prog };
  });
  const active = items.filter((x) => x.status === 'learn' || x.status === 'review');
  const nextUp = active.find((x) => x.progress.pct < 100) || null;
  const hoursLeft = Math.round(active.reduce((a, x) => a + x.hours, 0) * 10) / 10;
  const hpw = (profile && profile.hoursPerWeek) || 6;
  return {
    items,
    nextUp,
    hoursLeft,
    weeksLeft: hoursLeft ? Math.max(1, Math.ceil(hoursLeft / hpw)) : 0,
    groups: ['learn', 'review', 'skip', 'optional', 'done'].map((k) => ({ status: k, items: items.filter((x) => x.status === k).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) })),
  };
}

// Topics the placement check should test: what the learner rates 2 or 3 (claims worth verifying), strongest first, max 4.
export function placementTopics(profile) {
  if (!profile || !profile.skills) return [];
  return TOPIC_ORDER.filter((t) => profile.skills[t] >= 2).sort((a, b) => profile.skills[b] - profile.skills[a]).slice(0, 4);
}
