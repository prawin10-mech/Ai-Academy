'use client';
import Link from 'next/link';
import { useState } from 'react';
import { INTERVIEW, TOPICS, useAcademy } from '../../../components/Providers.js';

const RATE = [[0, 'Missed it'], [1, 'Partly'], [2, 'Solid']];

function Rating({ id }) {
  const { state, rateInterview } = useAcademy();
  const v = state.interview[id];
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="meta">Be honest: how did your own answer compare?</span>
      <div className="filters">{RATE.map(([n, l]) => <button key={n} className="chip" aria-pressed={v === n} onClick={() => rateInterview(id, n)}>{l}</button>)}</div>
    </div>
  );
}

export default function Interview() {
  const { state } = useAcademy();
  const [tab, setTab] = useState('technical');
  const [topic, setTopic] = useState('all');
  const [open, setOpen] = useState({});
  const tog = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const solid = (arr) => arr.filter((q) => state.interview[q.id] === 2).length;
  const list = INTERVIEW.technical.filter((q) => topic === 'all' || q.topic === topic);

  return (
    <>
      <div className="stack">
        <Link className="linkbtn" href="/career" style={{ alignSelf: 'flex-start' }}>Career</Link>
        <h1>Interview practice</h1>
        <p className="lead">Read the question, answer out loud first, then open the model answer. Rate yourself honestly. Questions you miss are the ones to repeat.</p>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'technical'} onClick={() => setTab('technical')}>Technical ({solid(INTERVIEW.technical)}/{INTERVIEW.technical.length})</button>
          <button role="tab" aria-selected={tab === 'design'} onClick={() => setTab('design')}>System design ({solid(INTERVIEW.design)}/{INTERVIEW.design.length})</button>
          <button role="tab" aria-selected={tab === 'behavioral'} onClick={() => setTab('behavioral')}>Behavioral ({solid(INTERVIEW.behavioral)}/{INTERVIEW.behavioral.length})</button>
        </div>
      </div>

      {tab === 'technical' && (
        <>
          <div className="filters" role="group" aria-label="Topic">
            <button className="chip" aria-pressed={topic === 'all'} onClick={() => setTopic('all')}>All</button>
            {Object.keys(TOPICS).map((t) => <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{TOPICS[t]}</button>)}
          </div>
          {list.map((q) => (
            <article className="panel stack" key={q.id}>
              <div className="row"><span className="pill">{TOPICS[q.topic]}</span><span className="pill">{q.level}</span>{state.interview[q.id] === 2 && <span className="pill ok">Solid</span>}{state.interview[q.id] === 0 && <span className="pill bad">Missed</span>}</div>
              <h3>{q.q}</h3>
              <div className="row"><button className="btn small" onClick={() => tog(q.id)}>{open[q.id] ? 'Hide model answer' : 'Show model answer'}</button></div>
              {open[q.id] && (
                <div className="stack">
                  <p className="why">{q.answer}</p>
                  <p><strong>Follow-ups:</strong> {q.followUps.join(' ')}</p>
                  <p className="lead"><strong>A weak answer:</strong> {q.weak}</p>
                  <Rating id={q.id} />
                </div>
              )}
            </article>
          ))}
        </>
      )}

      {tab === 'design' && INTERVIEW.design.map((q) => (
        <article className="panel stack" key={q.id}>
          <h3>{q.q}</h3>
          <div className="row"><button className="btn small" onClick={() => tog(q.id)}>{open[q.id] ? 'Hide approach' : 'Show a strong approach'}</button></div>
          {open[q.id] && (
            <div className="stack">
              <div><strong>Ask first</strong><ul style={{ margin: 0, paddingLeft: 20 }}>{q.clarify.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><strong>Approach</strong><ol style={{ margin: 0, paddingLeft: 20 }}>{q.approach.map((x) => <li key={x}>{x}</li>)}</ol></div>
              <div><strong>Trade-offs to mention</strong><ul style={{ margin: 0, paddingLeft: 20 }}>{q.tradeoffs.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <p className="lead"><strong>Common mistakes:</strong> {q.mistakes.join(' ')}</p>
              <Rating id={q.id} />
            </div>
          )}
        </article>
      ))}

      {tab === 'behavioral' && INTERVIEW.behavioral.map((q) => (
        <article className="panel stack" key={q.id}>
          <h3>{q.q}</h3>
          <div className="row"><button className="btn small" onClick={() => tog(q.id)}>{open[q.id] ? 'Hide guidance' : 'Show guidance'}</button></div>
          {open[q.id] && (
            <div className="stack">
              <p className="why">{q.tip}</p>
              <p><strong>Outline:</strong> {q.example}</p>
              <p className="lead">Write your own story in your notes, then say it out loud in under two minutes.</p>
              <Rating id={q.id} />
            </div>
          )}
        </article>
      ))}
    </>
  );
}
