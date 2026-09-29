'use client';
import Link from 'next/link';
import { COURSES, GUIDES, PHASES, TOPICS, useAcademy } from '../../components/Providers.js';
import { courseProgress, mastery } from '../../lib/scoring.js';

export default function Courses() {
  const { state } = useAcademy();
  return (
    <>
      <div className="stack">
        <div className="eyebrow">{COURSES.length} courses in five phases</div>
        <h1>Courses</h1>
        <p className="lead">Videos play in the page. Each course has a checklist, notes and a quiz.</p>
      </div>
      {[1, 2, 3, 4, 5].map((ph) => {
        const list = COURSES.filter((c) => c.phase === ph);
        if (!list.length) return null;
        return (
          <section className="stack" key={ph}>
            <h2>Phase {ph}: {PHASES[ph]}</h2>
            <div className="grid">
              {list.map((c) => {
                const p = courseProgress(state, c);
                const m = mastery(state, c.topic);
                const costTone = /^Free/.test(c.cost) ? 'ok' : /Paid/.test(c.cost) ? 'warn' : '';
                return (
                  <Link key={c.id} href={`/courses/${c.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="row">
                      <span className="pill">{TOPICS[c.topic]}</span>
                      <span className={`pill ${costTone}`}>{c.cost}</span>
                    </div>
                    <h3>{c.title}</h3>
                    <span className="meta">{c.by} · about {c.hrs} h</span>
                    {GUIDES[c.id] && <span className="meta">{GUIDES[c.id].plain.split('. ')[0].replace(/\.$/, '')}.</span>}
                    <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
                    <span className="meta">{p.done} of {p.total} steps done{m != null ? ` · topic ${m}%` : ''}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
