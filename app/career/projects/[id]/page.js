'use client';
import Link from 'next/link';
import { COURSES, PROJECTS, TOPICS, useAcademy } from '../../../../components/Providers.js';
import { courseProgress } from '../../../../lib/scoring.js';

export default function Project({ params }) {
  const p = PROJECTS.find((x) => x.id === params.id);
  const { state, setProject } = useAcademy();
  if (!p) return <div className="stack"><h1>Project not found</h1><Link className="btn" href="/career">Back</Link></div>;
  const st = state.projects[p.id] || { milestones: {}, repo: '', demo: '', rubric: {} };
  const ms = st.milestones || {};
  const rub = st.rubric || {};
  const n = p.milestones.filter((_, i) => ms[i]).length;
  const prereq = p.requires.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);

  return (
    <>
      <div className="stack">
        <Link className="linkbtn" href="/career" style={{ alignSelf: 'flex-start' }}>Career</Link>
        <div className="row"><span className="pill">{p.level}</span><span className="pill">about {p.hours} h</span>{p.topics.map((t) => <span key={t} className="pill">{TOPICS[t]}</span>)}</div>
        <h1>{p.title}</h1>
        <p className="lead">{p.brief}</p>
        <p><strong>What a hiring manager learns:</strong> {p.why}</p>
      </div>

      {prereq.length > 0 && (
        <div className="panel stack">
          <div className="eyebrow">Learn first</div>
          {prereq.map((c) => <div key={c.id} className="row between"><Link href={`/courses/${c.id}`}>{c.title}</Link><span className="pill">{courseProgress(state, c).pct}%</span></div>)}
        </div>
      )}

      <section className="stack">
        <h2>Milestones ({n}/{p.milestones.length})</h2>
        <div className="panel">
          {p.milestones.map((m, i) => (
            <div className="check" key={i} style={{ gridTemplateColumns: '22px 1fr' }}>
              <input type="checkbox" id={`m${i}`} checked={!!ms[i]} onChange={() => setProject(p.id, { milestones: { ...ms, [i]: ms[i] ? 0 : 1 } })} />
              <label htmlFor={`m${i}`}><strong>{m.title}</strong><br /><span className="lead">Done when: {m.done}</span></label>
            </div>
          ))}
        </div>
      </section>

      <div className="grid">
        <div className="panel stack"><h3>Suggested stack</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{p.stack.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div className="panel stack"><h3>Deliverables</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{p.deliverables.map((s) => <li key={s}>{s}</li>)}</ul></div>
      </div>

      <section className="stack">
        <h2>Self-review rubric</h2>
        <p className="lead">Before you call it done, check every line honestly. A reviewer will.</p>
        <div className="panel">
          {p.rubric.map((r, i) => (
            <div className="check" key={i} style={{ gridTemplateColumns: '22px 1fr' }}>
              <input type="checkbox" id={`r${i}`} checked={!!rub[i]} onChange={() => setProject(p.id, { rubric: { ...rub, [i]: rub[i] ? 0 : 1 } })} />
              <label htmlFor={`r${i}`}>{r}</label>
            </div>
          ))}
        </div>
      </section>

      <div className="grid">
        <div className="panel stack"><h3>Common mistakes</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{p.pitfalls.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div className="panel stack"><h3>Stretch goals</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{p.stretch.map((s) => <li key={s}>{s}</li>)}</ul></div>
      </div>

      <div className="panel stack">
        <h3>Your links</h3>
        <label className="stack" style={{ gap: 4 }}>Repository URL<input className="field" value={st.repo || ''} placeholder="https://github.com/you/project" onChange={(e) => setProject(p.id, { repo: e.target.value.slice(0, 300) })} /></label>
        <label className="stack" style={{ gap: 4 }}>Demo URL<input className="field" value={st.demo || ''} placeholder="https://" onChange={(e) => setProject(p.id, { demo: e.target.value.slice(0, 300) })} /></label>
      </div>

      <div className="panel stack">
        <h3>Resume bullet</h3>
        <p className="lead">Replace the brackets with your real, measured numbers. Never invent them.</p>
        <p className="why">{p.resumeBullet}</p>
        <div className="row">{p.skills.map((s) => <span className="pill" key={s}>{s}</span>)}</div>
      </div>
    </>
  );
}
