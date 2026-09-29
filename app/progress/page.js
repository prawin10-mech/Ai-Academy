'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COURSES, TOPICS, useAcademy } from '../../components/Providers.js';
import { answersFor, courseProgress, evaluate, level, mastery } from '../../lib/scoring.js';

export default function Progress() {
  const router = useRouter();
  const { state, startQuiz } = useAcademy();
  const ev = evaluate(state, TOPICS);
  const recent = state.attempts.slice(-8).reverse();

  return (
    <>
      <div className="stack">
        <div className="eyebrow">How you are doing</div>
        <h1>Progress</h1>
      </div>

      <div className="panel stack">
        <div className="eyebrow">Next best step</div>
        <p>{ev.reason}</p>
        {ev.focus && (
          <div className="row">
            <button className="btn small primary" onClick={() => { startQuiz([ev.focus], 'course'); router.push('/quiz'); }}>Start a quiz</button>
          </div>
        )}
      </div>

      <section className="stack">
        <h2>Topic mastery</h2>
        <p className="lead">Accuracy on your last ten answers per topic. A topic needs at least three answers to be assessed.</p>
        <div className="panel stack">
          {Object.keys(TOPICS).map((t) => {
            const m = mastery(state, t);
            const lv = level(m);
            return (
              <div className="topicrow" key={t}>
                <span>{TOPICS[t]}<br /><small className="lead">{answersFor(state, t).length} answered</small></span>
                <div className={`bar ${lv.tone}`}><i style={{ width: `${m == null ? 0 : m}%` }} /></div>
                <span className={`pill ${lv.tone}`}>{m == null ? 'n/a' : `${m}%`}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2>Course progress</h2>
        <div className="panel stack">
          {COURSES.map((c) => {
            const p = courseProgress(state, c);
            return (
              <div className="topicrow" key={c.id}>
                <Link href={`/courses/${c.id}`}>{c.title}</Link>
                <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
                <span className="pill">{p.done}/{p.total}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2>Recent quizzes</h2>
        {!recent.length ? (
          <div className="panel flat"><p className="lead">No quizzes yet. Take the Daily 5 on the Today page.</p></div>
        ) : (
          <div className="panel tw">
            <table>
              <thead><tr><th>When</th><th>Type</th><th>Topics</th><th>Score</th></tr></thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={`${a.ts}:${a.mode}`}>
                    <td>{new Date(a.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    <td>{a.mode === 'daily' ? 'Daily 5' : 'Course'}</td>
                    <td>{a.topics.map((t) => TOPICS[t]).join(', ')}</td>
                    <td>{a.score}/{a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
