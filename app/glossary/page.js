'use client';
import { useState } from 'react';
import { GLOSSARY, TOPICS } from '../../components/Providers.js';

export default function Glossary() {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState('all');
  const [focus, setFocus] = useState(null);
  const list = GLOSSARY.filter((g) => (topic === 'all' || g.topic === topic) && (!q || `${g.term} ${g.plain}`.toLowerCase().includes(q.toLowerCase())));
  const topics = [...new Set(GLOSSARY.map((g) => g.topic))];

  return (
    <>
      <div className="stack">
        <div className="eyebrow">{GLOSSARY.length} terms in plain language</div>
        <h1>Glossary</h1>
        <p className="lead">Every term has a simple definition, a comparison to something you know from web development, and an example.</p>
        <input type="search" placeholder="Search terms" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search terms" />
        <div className="filters" role="group" aria-label="Topic">
          <button className="chip" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>All</button>
          {topics.map((t) => <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{TOPICS[t]}</button>)}
        </div>
      </div>
      {!list.length && <div className="panel flat"><p className="lead">No terms match.</p></div>}
      <div className="grid">
        {list.map((g) => (
          <div className="card" key={g.term} id={g.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')} style={focus === g.term ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="row"><span className="pill">{TOPICS[g.topic]}</span></div>
            <h3>{g.term}</h3>
            <p>{g.plain}</p>
            <p className="lead"><strong>Think of it as:</strong> {g.analogy}</p>
            <p className="lead"><strong>Example:</strong> {g.example}</p>
            {g.related.length > 0 && (
              <div className="row">
                <span className="meta">Related:</span>
                {g.related.map((r) => <button key={r} className="chip" aria-pressed={false} onClick={() => { setTopic('all'); setQ(r); setFocus(r); }}>{r}</button>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
