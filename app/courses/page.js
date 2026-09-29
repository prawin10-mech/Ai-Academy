'use client';
import Link from 'next/link';
import { useState } from 'react';
import { COURSES, GUIDES, PHASES, TOPICS, useAcademy } from '../../components/Providers.js';
import { courseProgress, mastery } from '../../lib/scoring.js';
import { buildPath } from '../../lib/path.js';

const GROUP_TITLE = {
  learn: 'Learn now',
  review: 'Fast-track (you know part of this)',
  skip: 'You can skip these',
  optional: 'Optional extras',
  done: 'Finished',
};
const TONE = { learn: 'accent', review: 'warn', skip: 'ok', optional: '', done: 'ok' };

function CourseCard({ c, state, badge, reason }) {
  const p = courseProgress(state, c);
  const m = mastery(state, c.topic);
  const costTone = /^Free/.test(c.cost) ? 'ok' : /Paid/.test(c.cost) ? 'warn' : '';
  return (
    <Link href={`/courses/${c.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="row">
        <span className="pill">{TOPICS[c.topic]}</span>
        <span className={`pill ${costTone}`}>{c.cost}</span>
        {badge && <span className={`pill ${TONE[badge] || ''}`}>{GROUP_TITLE[badge].split(' (')[0]}</span>}
      </div>
      <h3>{c.title}</h3>
      <span className="meta">{c.by} · about {c.hrs} h</span>
      {reason ? <span className="meta">{reason}</span> : GUIDES[c.id] && <span className="meta">{GUIDES[c.id].plain.split('. ')[0].replace(/\.$/, '')}.</span>}
      <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
      <span className="meta">{p.done} of {p.total} steps done{m != null ? ` · topic ${m}%` : ''}</span>
    </Link>
  );
}

export default function Courses() {
  const { state } = useAcademy();
  const [view, setView] = useState(state.profile ? 'path' : 'all');
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const found = query ? COURSES.filter((c) => `${c.title} ${c.provider || ''} ${c.topic || ''} ${(GUIDES[c.id] && GUIDES[c.id].plain) || ''}`.toLowerCase().includes(query)) : [];
  const path = buildPath(state, COURSES, TOPICS);
  const core = COURSES.filter((c) => c.track !== 'archive');
  const archive = COURSES.filter((c) => c.track === 'archive');

  return (
    <>
      <div className="stack">
        <div className="eyebrow">{core.length} job-focused courses · {archive.length} optional deep dives</div>
        <h1>Courses</h1>
        <p className="lead">Every course here was picked because it builds a skill employers ask for. Videos play in the page. Each has a checklist, notes, explanations and a quiz.</p>
        <p className="meta">Nothing is locked. Open any course whenever you like; the path only suggests an order.</p>
        <input className="field search" type="search" placeholder="Search all courses" aria-label="Search courses" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={view === 'path'} onClick={() => setView('path')}>Your path</button>
          <button role="tab" aria-selected={view === 'all'} onClick={() => setView('all')}>By phase</button>
          <button role="tab" aria-selected={view === 'archive'} onClick={() => setView('archive')}>Deep dives</button>
        </div>
      </div>

      {query && (
        <section className="stack">
          <h2>{found.length} {found.length === 1 ? 'course' : 'courses'} match</h2>
          {found.length ? <div className="grid">{found.map((c) => <CourseCard key={c.id} c={c} state={state} />)}</div> : <p className="lead">Nothing matches. Try a shorter word such as rag, agents or python.</p>}
        </section>
      )}

      {!query && view === 'path' && (
        !state.profile ? (
          <div className="panel stack"><h2>Get a path that fits you</h2><p className="lead">Tell us what you already know and we will mark what to learn, fast-track or skip.</p><div className="row"><Link className="btn primary" href="/start">Shape my path</Link></div></div>
        ) : (
          <>
            <div className="panel row between">
              <div>
                <div className="eyebrow">Time to finish the core courses</div>
                <strong>{path.hoursLeft} hours · about {path.weeksLeft} weeks</strong> at {state.profile.hoursPerWeek} hours a week
              </div>
              <div className="row">
                {path.nextUp && <Link className="btn primary" href={`/courses/${path.nextUp.course.id}`}>Next up: {path.nextUp.course.title}</Link>}
                <Link className="btn" href="/start">Edit my background</Link>
              </div>
            </div>
            {path.groups.filter((g) => g.items.length && g.status !== 'optional').map((g) => (
              <section className="stack" key={g.status}>
                <h2>{GROUP_TITLE[g.status]}</h2>
                <div className="grid">{g.items.map((x) => <CourseCard key={x.course.id} c={x.course} state={state} badge={g.status} reason={x.reason} />)}</div>
              </section>
            ))}
            <details className="panel">
              <summary>Optional extras ({path.groups.find((g) => g.status === 'optional').items.length})</summary>
              <div className="grid" style={{ marginTop: 12 }}>
                {path.groups.find((g) => g.status === 'optional').items.map((x) => <CourseCard key={x.course.id} c={x.course} state={state} reason={x.reason} />)}
              </div>
            </details>
          </>
        )
      )}

      {!query && view === 'all' && [1, 2, 3, 4, 5].map((ph) => {
        const list = core.filter((c) => c.phase === ph);
        if (!list.length) return null;
        return (
          <section className="stack" key={ph}>
            <h2>Phase {ph}: {PHASES[ph]}</h2>
            <div className="grid">{list.map((c) => <CourseCard key={c.id} c={c} state={state} />)}</div>
          </section>
        );
      })}

      {!query && view === 'archive' && (
        <section className="stack">
          <p className="lead">Good courses, but not needed to get hired as an AI application engineer. Take them later if you want more theory or research depth.</p>
          <div className="grid">{archive.map((c) => <CourseCard key={c.id} c={c} state={state} />)}</div>
        </section>
      )}
    </>
  );
}
