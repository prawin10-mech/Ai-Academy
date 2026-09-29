'use client';
import Link from 'next/link';
import { useState } from 'react';
import { COURSES, PAPERS, TOPICS, useAcademy } from '../../components/Providers.js';

const STATUS = { todo: 'To read', reading: 'Reading', done: 'Done' };
const PASSES = ['Pass 1: skim title, abstract, headings, conclusion (10 min)', 'Pass 2: read with figures, skip proofs (1 h)', 'Pass 3: re-derive or reimplement the key idea'];

function PaperNote({ id }) {
  const { state, setPaper } = useAcademy();
  const note = (state.papers[id] && state.papers[id].note) || '';
  return (
    <div className="stack">
      <h3>Your notes</h3>
      <textarea rows={5} value={note} onChange={(e) => setPaper(id, { note: e.target.value })} placeholder="What is the core idea? What would you try with it?" aria-label="Paper notes" />
    </div>
  );
}

export default function Papers() {
  const { state, setPaper, feed } = useAcademy();
  const [topic, setTopic] = useState('all');
  const [lvl, setLvl] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState({});
  const [pdf, setPdf] = useState({});

  const st = (id) => state.papers[id] || { status: 'todo', pass: [false, false, false], note: '' };
  const list = PAPERS.filter((p) => (topic === 'all' || p.topic === topic) && (lvl === 'all' || p.level === lvl) && (status === 'all' || st(p.id).status === status) &&
    (!q || `${p.title} ${p.authors} ${p.summary}`.toLowerCase().includes(q.toLowerCase())));
  const done = PAPERS.filter((p) => st(p.id).status === 'done').length;
  const topicsUsed = [...new Set(PAPERS.map((p) => p.topic))];

  return (
    <>
      <div className="stack">
        <div className="eyebrow">{PAPERS.length} curated papers · {done} finished</div>
        <h1>Research papers</h1>
        <p className="lead">Read them in this order of difficulty. Each links to arXiv. Track the three passes and keep notes beside the paper.</p>
        <div className="bar"><i style={{ width: `${Math.round((100 * done) / PAPERS.length)}%` }} /></div>
      </div>

      <details className="panel">
        <summary>How to read a paper in three passes</summary>
        <ol className="stack" style={{ marginTop: 12 }}>
          {PASSES.map((p) => <li key={p}>{p}</li>)}
        </ol>
      </details>

      {feed.length > 0 && (
        <section className="stack">
          <h2>New this week</h2>
          <p className="lead">Pulled each morning from arXiv (cs.CL, cs.LG, cs.AI) and Hugging Face daily papers.</p>
          <div className="panel stack">
            {feed.map((p) => (
              <div key={p.id} className="stack" style={{ gap: 4 }}>
                <div className="row between">
                  <a href={p.url} target="_blank" rel="noopener noreferrer"><strong>{p.title}</strong></a>
                  <span className="pill">{p.source}</span>
                </div>
                {p.summary && <p className="lead" style={{ fontSize: '0.92rem' }}>{p.summary.length > 260 ? `${p.summary.slice(0, 260)}…` : p.summary}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="stack">
        <h2>Reading list</h2>
        <div className="filters">
          <input type="search" placeholder="Search papers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search papers" style={{ maxWidth: 260 }} />
          <select className="field" value={lvl} onChange={(e) => setLvl(e.target.value)} aria-label="Level">
            <option value="all">All levels</option>
            <option value="core">Core</option>
            <option value="advanced">Advanced</option>
          </select>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="all">Any status</option>
            {Object.keys(STATUS).map((k) => <option key={k} value={k}>{STATUS[k]}</option>)}
          </select>
        </div>
        <div className="filters" role="group" aria-label="Topic">
          <button className="chip" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>All topics</button>
          {topicsUsed.map((t) => <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{TOPICS[t]}</button>)}
        </div>

        {!list.length && <div className="panel flat"><p className="lead">No papers match these filters.</p></div>}

        {list.map((p) => {
          const s = st(p.id);
          const after = COURSES.find((c) => c.id === p.after);
          return (
            <article className="panel paper" key={p.id}>
              <div className="row">
                <span className="pill">{TOPICS[p.topic]}</span>
                <span className={`pill ${p.level === 'core' ? 'accent' : 'warn'}`}>{p.level}</span>
                <span className="pill">{p.year}</span>
                <span className={`pill ${s.status === 'done' ? 'ok' : s.status === 'reading' ? 'warn' : ''}`}>{STATUS[s.status]}</span>
              </div>
              <h3>{p.title}</h3>
              <span className="meta lead">{p.authors} · arXiv {p.id}</span>
              <p>{p.summary}</p>
              <p className="lead"><strong>Why it matters:</strong> {p.why}</p>
              {after && <p className="lead">Read after <Link href={`/courses/${after.id}`}>{after.title}</Link>.</p>}
              <div className="passes" role="group" aria-label="Reading passes">
                {PASSES.map((label, i) => (
                  <label key={i}>
                    <input
                      type="checkbox"
                      checked={!!s.pass[i]}
                      onChange={(e) => {
                        const pass = [...s.pass];
                        pass[i] = e.target.checked;
                        const patch = { pass };
                        if (pass.every(Boolean)) patch.status = 'done';
                        else if (pass.some(Boolean) && s.status === 'todo') patch.status = 'reading';
                        setPaper(p.id, patch);
                      }}
                    />
                    Pass {i + 1}
                  </label>
                ))}
              </div>
              <div className="row">
                <select className="field" value={s.status} onChange={(e) => setPaper(p.id, { status: e.target.value })} aria-label={`Status for ${p.title}`}>
                  {Object.keys(STATUS).map((k) => <option key={k} value={k}>{STATUS[k]}</option>)}
                </select>
                <a className="btn small" href={`https://arxiv.org/abs/${p.id}`} target="_blank" rel="noopener noreferrer">arXiv page</a>
                <a className="btn small" href={`https://arxiv.org/pdf/${p.id}`} target="_blank" rel="noopener noreferrer">PDF</a>
                <button className="btn small" onClick={() => setPdf((o) => ({ ...o, [p.id]: !o[p.id] }))}>{pdf[p.id] ? 'Hide inline PDF' : 'Read inline'}</button>
                <button className="btn small" onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}>{open[p.id] ? 'Hide notes' : 'Notes'}</button>
              </div>
              {pdf[p.id] && (
                <div className="stack">
                  <iframe className="pdf" title={p.title} src={`https://arxiv.org/pdf/${p.id}`} loading="lazy" />
                  <p className="lead">If the frame stays blank the publisher blocked embedding. Use the PDF button instead.</p>
                </div>
              )}
              {(open[p.id] || (s.note && s.note.trim())) && <PaperNote id={p.id} />}
            </article>
          );
        })}
      </section>
    </>
  );
}
