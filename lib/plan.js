// Rule-based daily plan from the learner evaluation. No model call, so it is deterministic and testable.
import { evaluate, nextLessonForTopic, streak } from './scoring.js';
import { buildPath } from './path.js';

const NEWS_URL = 'https://claude.ai/code/artifact/511df208-f1f5-4644-baa9-f82b25a5929b';

export function makePlan({ state, courses, topics, papers = [], newPapers = [], date, newsUrl = NEWS_URL }) {
  const ev = evaluate(state, topics);
  const tasks = [];
  let focusTopic = ev.focus;

  // With a profile, the path decides the focus unless a topic is clearly weak (below 50%).
  const weak = ev.rows.filter((r) => r.mastery != null && r.mastery < 50).sort((a, b) => a.mastery - b.mastery)[0];
  let pathNote = '';
  if (state.profile && !weak) {
    const path = buildPath(state, courses, topics);
    if (path.nextUp) {
      focusTopic = path.nextUp.course.topic;
      pathNote = `Next on your path: ${path.nextUp.course.title}. About ${path.weeksLeft} week${path.weeksLeft === 1 ? '' : 's'} left at your pace.`;
    }
  }

  // 1) Learning task: the next unfinished lesson for the focus topic, else the next unfinished lesson anywhere.
  let next = focusTopic ? nextLessonForTopic(state, courses, focusTopic) : null;
  if (!next) {
    const order = [...courses].sort((a, b) => a.phase - b.phase);
    for (const c of order) {
      const l = c.lessons.find((x) => !state.done[x.id]);
      if (l) {
        next = { course: c, lesson: l };
        focusTopic = focusTopic || c.topic;
        break;
      }
    }
  }
  if (next) tasks.push({ t: `Continue: ${next.lesson.t} (${next.course.title})`, ref: next.lesson.id });

  // 2) Quiz task.
  tasks.push({ t: 'Take the Daily 5 quiz', quiz: true });

  // 3) One paper for the focus topic that is not finished yet.
  const paper = papers.find((p) => p.topic === focusTopic && (state.papers?.[p.id]?.status || 'todo') !== 'done');
  if (paper) tasks.push({ t: `Read pass 1 of "${paper.title}"`, paper: paper.id, url: `https://arxiv.org/abs/${paper.id}` });

  // 4) News.
  if (newPapers.length) tasks.push({ t: `Skim new paper: ${newPapers[0].title}`, url: newPapers[0].url });
  tasks.push({ t: "Skim today's AI news", url: newsUrl });

  const s = streak(state, date);
  const focus = focusTopic ? topics[focusTopic] : 'Keep going';
  const why = `${pathNote || ev.reason}${s ? ` You are on a ${s}-day streak.` : ' Finish one thing today to start a streak.'}`;
  return { date, focus, why, tasks, topic: focusTopic || null, generated: true };
}
