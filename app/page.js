'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COURSES, LESSONS, TOPICS, todayLocal, useAcademy } from '../components/Providers.js';
import { evaluate, firstCourseForTopic, totals } from '../lib/scoring.js';
import { prettyDate } from '../lib/dates.js';

export default function Today() {
  const router = useRouter();
  const { state, streak, plans, feed, tick, startQuiz, ready } = useAcademy();
  const today = todayLocal();
  const ev = evaluate(state, TOPICS);
  const t = totals(state, COURSES);
  const plan = plans.filter((p) => p.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  const older = plans.filter((p) => !plan || p.date !== plan.date).sort((a, b) => (a.date < b.date ? 1 : -1));
  const focusCourse = ev.focus ? firstCourseForTopic(COURSES, ev.focus) : null;
  const last = state.last && LESSONS[state.last] ? LESSONS[state.last] : null;

  const daily = () => { startQuiz(Object.keys(TOPICS), 'daily'); router.push('/quiz'); };
  const topicQuiz = (topic) => { startQuiz([topic], 'course'); router.push('/quiz'); };

  return (
    <>
      <div className="stack">
        <div className="eyebrow">{prettyDate(today)}</div>
        <h1>Today</h1>
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
