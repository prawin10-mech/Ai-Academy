'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COURSES, LESSONS, ROADMAP, TOPICS, courseById, todayLocal, useAcademy } from '../components/Providers.js';
import { evaluate, firstCourseForTopic, totals } from '../lib/scoring.js';
import { prettyDate } from '../lib/dates.js';

export default function Today() {
  const router = useRouter();
  const { state, streak, plans, feed, radar, tick, startQuiz, ready, mode, user, botUsername } = useAcademy();
  const today = todayLocal();
  const ev = evaluate(state, TOPICS);
  const t = totals(state, COURSES);
  const plan = plans.filter((p) => p.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  const older = plans.filter((p) => !plan || p.date !== plan.date).sort((a, b) => (a.date < b.date ? 1 : -1));
  const focusCourse = ev.focus ? firstCourseForTopic(COURSES, ev.focus) : null;
  const last = state.last && LESSONS[state.last] ? LESSONS[state.last] : null;

  const daysSince = state.startedAt ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${state.startedAt}T00:00:00Z`)) / 86400000) : 0;
  const weekNo = Math.max(1, Math.min(ROADMAP.weeks.length, Math.floor(daysSince / 7) + 1));
  const week = ROADMAP.weeks[weekNo - 1];
  const launches = radar.filter((r) => r.vendor && r.source !== 'Hugging Face trending').slice(0, 4);

  const daily = () => { startQuiz(Object.keys(TOPICS), 'daily'); router.push('/quiz'); };
  const topicQuiz = (topic) => { startQuiz([topic], 'course'); router.push('/quiz'); };

  return (
    <>
      <div className="stack">
        <div className="eyebrow">{prettyDate(today)}</div>
        {mode === 'user' && botUsername && user && !user.telegramLinked && <div className="panel row between"><span>📲 Get your daily plan on Telegram. It takes 10 seconds.</span><Link className="btn small" href="/settings">Link Telegram</Link></div>}
        <h1>Today</h1>
      </div>

      {!state.profile && (
        <div className="panel row between">
          <div><strong>Shape your path</strong><p className="lead">Tell us what you already know so we skip it and put your time where it counts.</p></div>
          <Link className="btn primary" href="/start">Start (2 minutes)</Link>
        </div>
      )}
      {mode === 'guest' && <p className="lead">You are a guest: progress stays in this browser. Use Create account in the menu to keep it, sync devices and get Telegram digests.</p>}

      <div className="panel stack">
        <div className="row between"><div className="eyebrow">Week {weekNo} of {ROADMAP.weeks.length}</div><Link className="linkbtn" href="/roadmap">Full roadmap</Link></div>
        <h3>{week.title}</h3>
        <p className="lead">{week.outcome}</p>
        <div className="row">
          {week.courses.slice(0, 3).map((c) => <Link key={c.id} className="pill accent" href={`/courses/${c.id}`}>{courseById(c.id).title}</Link>)}
          {(week.exercises || []).slice(0, 2).map((id) => <Link key={id} className="pill" href={`/practice/${id}`}>Practice: {id.replace('ex-', '')}</Link>)}
          {week.project && <Link className="pill warn" href={`/career/projects/${week.project.id}`}>Project</Link>}
        </div>
      </div>

      <div className="grid">
        <div className="panel stack">
          <div className="eyebrow">Streak</div>
          <div className="big">{streak}</div>
          <p className="lead">{streak ? `day${streak === 1 ? '' : 's'} in a row with study activity.` : 'Finish a lesson or a quiz today to start one.'}</p>
        </div>
        <div className="panel stack">
          <div className="eyebrow">Steps done</div>
          <div className="big">{t.done}<span style={{ fontSize: '1rem', color: 'var(--muted)' }}> / {t.total}</span></div>
          <div className="bar"><i style={{ width: `${t.total ? Math.round((100 * t.done) / t.total) : 0}%` }} /></div>
        </div>
        <div className="panel stack">
          <div className="eyebrow">Suggested focus</div>
          <p>{ev.reason}</p>
          {ev.focus && (
            <div className="row">
              <button className="btn small primary" onClick={() => topicQuiz(ev.focus)}>Quiz me on this</button>
              {focusCourse && <Link className="btn small" href={`/courses/${focusCourse.id}`}>Open course</Link>}
            </div>
          )}
        </div>
      </div>

      {last && (
        <div className="panel row between">
          <div>
            <div className="eyebrow">Continue</div>
            <h3>{last.lesson.t}</h3>
            <p className="lead">{last.course.title}</p>
          </div>
          <Link className="btn primary" href={`/courses/${last.course.id}`}>Resume</Link>
        </div>
      )}

      <section className="stack">
        <h2>Today&apos;s plan</h2>
        {plan ? (
          <div className="panel stack">
            <div className="row between">
              <h3>{plan.focus}</h3>
              <span className="pill accent">{plan.date}</span>
            </div>
            {plan.why && <p className="lead">{plan.why}</p>}
            <div>
              {plan.tasks.map((tk, i) => {
                const key = `dt:${plan.date}:${i}`;
                let action = null;
                if (tk.quiz) action = <button className="btn small primary" onClick={daily}>Start</button>;
                else if (tk.ref && LESSONS[tk.ref]) action = <Link className="btn small" href={`/courses/${LESSONS[tk.ref].course.id}`}>Open</Link>;
                else if (tk.paper) action = <Link className="btn small" href="/papers">Open</Link>;
                else if (tk.url) action = <a className="btn small" href={tk.url} target="_blank" rel="noopener noreferrer">Open</a>;
                return (
                  <div className="check" key={key}>
                    <input type="checkbox" id={key} checked={!!state.done[key]} onChange={() => tick(key)} />
                    <label htmlFor={key}>{tk.t}</label>
                    {action}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="lead">{ready ? 'No plan for today yet. The daily job writes one each morning.' : 'Loading'}</p>
        )}
        <div className="row">
          <button className="btn primary" onClick={daily}>Daily 5 quiz</button>
          <span className="lead">Five questions chosen from your weakest topics and questions you missed before.</span>
        </div>
      </section>

      {launches.length > 0 && (
        <section className="stack">
          <h2>New in AI</h2>
          <div className="panel stack">
            {launches.map((r) => (
              <div key={r.id} className="row between"><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a><span className="pill accent">{r.vendor}</span></div>
            ))}
            <Link className="linkbtn" href="/radar">Open the AI radar</Link>
          </div>
        </section>
      )}

      {feed.length > 0 && (
        <section className="stack">
          <h2>New papers</h2>
          <div className="panel stack">
            {feed.slice(0, 5).map((p) => (
              <div key={p.id} className="row between">
                <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                <span className="pill">{p.source}</span>
              </div>
            ))}
            <Link className="linkbtn" href="/papers">See all on the Papers page</Link>
          </div>
        </section>
      )}

      {older.length > 0 && (
        <details className="panel">
          <summary>Earlier days ({older.length})</summary>
          <div className="stack" style={{ marginTop: 12 }}>
            {older.map((e) => <div key={e.date}><strong>{e.date}</strong> {e.focus}</div>)}
          </div>
        </details>
      )}
    </>
  );
}
