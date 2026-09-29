'use client';
import Link from 'next/link';
import { COURSES, EXERCISES, PROJECTS, ROADMAP, TOPICS, courseById, todayLocal, useAcademy } from '../../components/Providers.js';
import { courseProgress } from '../../lib/scoring.js';
import { buildPath } from '../../lib/path.js';

const daysBetween = (a, b) => Math.floor((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

export default function Roadmap() {
  const { state } = useAcademy();
  const path = buildPath(state, COURSES, TOPICS);
  const status = Object.fromEntries(path.items.map((x) => [x.course.id, x.status]));
  const startedAt = state.startedAt || todayLocal();
  const currentWeek = Math.max(1, Math.min(ROADMAP.weeks.length, Math.floor(daysBetween(startedAt, todayLocal()) / 7) + 1));
  const weekDone = (w) => {
    const items = w.courses.map((c) => courseById(c.id)).filter(Boolean);
    const ex = (w.exercises || []).map((id) => state.practice[id] && state.practice[id].passed);
    const parts = [...items.map((c) => courseProgress(state, c).pct >= 60), ...ex];
    return parts.length > 0 && parts.every(Boolean);
  };

  return (
    <>
      <div className="stack">
        <div className="eyebrow">{ROADMAP.weeks.length} weeks · about {ROADMAP.hoursPerWeek} hours a week</div>
        <h1>{ROADMAP.title}</h1>
        <p className="lead">A plan built around what employers hire AI application engineers for: LLM apps, RAG, agents, evals and shipping. Courses you already know are marked so you can skip them. You started on {startedAt}, so this is week {currentWeek}.</p>
        {!state.profile && <div className="panel row between"><span>Set your background so skills you already have are skipped.</span><Link className="btn primary" href="/start">Shape my path</Link></div>}
      </div>

      {ROADMAP.months.map((m) => (
        <section className="stack" key={m.m}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="eyebrow">Month {m.m}</div>
            <h2>{m.title}</h2>
            <p className="lead">{m.goal}</p>
          </div>
          {ROADMAP.weeks.filter((w) => w.m === m.m).map((w) => {
            const done = weekDone(w);
            const cls = w.w === currentWeek ? 'now' : done ? 'done' : '';
            const proj = w.project ? PROJECTS.find((p) => p.id === w.project.id) : null;
            return (
              <article key={w.w} className={`week stack ${cls}`}>
                <div className="row">
                  <strong>Week {w.w}: {w.title}</strong>
                  {w.w === currentWeek && <span className="pill accent">This week</span>}
                  {done && <span className="pill ok">On track</span>}
                </div>
                <p className="lead">{w.outcome}</p>
                {w.courses.length > 0 && (
                  <ul className="stack" style={{ margin: 0, paddingLeft: 20, gap: 4 }}>
                    {w.courses.map((c) => {
                      const course = courseById(c.id);
                      const st = status[c.id];
                      const p = courseProgress(state, course);
                      return (
                        <li key={c.id}>
                          <Link href={`/courses/${c.id}`}>{course.title}</Link>
                          {c.note ? <span className="lead"> · {c.note}</span> : null}{' '}
                          {(st === 'skip' || st === 'optional') && <span className="pill">{st === 'skip' ? 'You can skip this' : 'Optional for you'}</span>}
                          {st === 'review' && <span className="pill warn">Fast-track</span>}
                          {p.pct > 0 && <span className="pill">{p.pct}%</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(w.exercises || []).length > 0 && (
                  <div className="row">
                    <span className="meta">Practice:</span>
                    {w.exercises.map((id) => {
                      const e = EXERCISES.find((x) => x.id === id);
                      const ok = state.practice[id] && state.practice[id].passed;
                      return <Link key={id} href={`/practice/${id}`} className={`pill ${ok ? 'ok' : ''}`}>{e.title}{ok ? ' ✓' : ''}</Link>;
                    })}
                  </div>
                )}
                {proj && <p><strong>Project:</strong> <Link href={`/career/projects/${proj.id}`}>{proj.title}</Link>{w.project.note ? <span className="lead"> · {w.project.note}</span> : null}</p>}
                {w.checkpoint && <p className="lead">{w.checkpoint}</p>}
                {w.interview && <p><Link href="/career/interview">Interview practice</Link><span className="lead"> this week</span></p>}
                {w.career && <p><Link href="/career">Open the career checklist</Link></p>}
              </article>
            );
          })}
        </section>
      ))}
      <div className="panel"><p className="lead">{ROADMAP.optional.note} <Link href="/career/projects/p4-finetune">Open the fine-tuning project</Link>.</p></div>
    </>
  );
}
