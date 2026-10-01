'use client';
import Link from 'next/link';
import { useState } from 'react';
import { EXERCISES, TOPICS, useAcademy } from '../../components/Providers.js';

export default function Practice() {
  const { state } = useAcademy();
  const [topic, setTopic] = useState('all');
  const [level, setLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const passed = EXERCISES.filter((e) => state.practice[e.id] && state.practice[e.id].passed).length;
  const topics = [...new Set(EXERCISES.map((e) => e.topic))];
  const isPassed = (e) => !!(state.practice[e.id] && state.practice[e.id].passed);
  const query = q.trim().toLowerCase();
  const list = EXERCISES.filter((e) => (topic === 'all' || e.topic === topic) && (level === 'all' || e.level === level) && (status === 'all' || (status === 'todo' ? !isPassed(e) : isPassed(e))) && (!query || `${e.title} ${e.story}`.toLowerCase().includes(query)));
  const order = { starter: 0, core: 1, stretch: 2 };
  const nextOne = [...EXERCISES].filter((e) => !isPassed(e)).sort((a, b) => (order[a.level] ?? 1) - (order[b.level] ?? 1))[0];
  return (
    <>
      <div className="stack">
        <div className="eyebrow">{passed} of {EXERCISES.length} passed</div>
        <h1>Practice lab</h1>
        <p className="lead">Write a small function in Python or JavaScript, run it, and it is tested on the spot, right in your browser. These are the building blocks of real AI systems: similarity search, evals, prompts, tool calls, rate limits.</p>
        <div className="bar"><i style={{ width: `${Math.round((100 * passed) / EXERCISES.length)}%` }} /></div>
      </div>
      <div className="filters">
        <input className="field search" type="search" placeholder="Search exercises" aria-label="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
        {nextOne && <Link className="btn primary" href={`/practice/${nextOne.id}`}>Pick one for me</Link>}
      </div>
      <div className="filters" role="group" aria-label="Level and status">
        {['all', 'starter', 'core', 'stretch'].map((l) => <button key={l} className="chip" aria-pressed={level === l} onClick={() => setLevel(l)}>{l === 'all' ? 'Any level' : l}</button>)}
        {[['all', 'Any status'], ['todo', 'Not passed'], ['done', 'Passed']].map(([k, l]) => <button key={k} className="chip" aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>)}
      </div>
      <div className="filters" role="group" aria-label="Topic">
        <button className="chip" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>All</button>
        {topics.map((t) => <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{TOPICS[t]}</button>)}
      </div>
      {!list.length && <p className="lead">No exercises match. Clear a filter to see more.</p>}
      <div className="grid">
        {list.map((e) => {
          const p = state.practice[e.id];
          return (
            <Link key={e.id} href={`/practice/${e.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="row">
                <span className="pill">{TOPICS[e.topic]}</span>
                <span className={`pill ${e.level === 'starter' ? 'accent' : e.level === 'core' ? '' : 'warn'}`}>{e.level}</span>
                {p && p.passed && <span className={`pill ${p.peeked ? 'warn' : 'ok'}`}>{p.peeked ? 'Passed with solution' : 'Passed'}</span>}
              </div>
              <h3>{e.title}</h3>
              <span className="meta">{e.python ? 'Python + JS' : 'JS'} · {e.minutes} min · {p ? `${p.attempts || 0} runs` : 'not started'}</span>
              <span className="meta">{e.story}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
