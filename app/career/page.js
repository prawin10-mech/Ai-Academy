'use client';
import Link from 'next/link';
import { useState } from 'react';
import { EXERCISES, INTERVIEW, PROJECTS, TOPICS, useAcademy } from '../../components/Providers.js';
import { WEIGHTS, readiness } from '../../lib/readiness.js';

const CHECKLIST = [
  ['portfolio', 'Portfolio', [
    'Three public GitHub repos with a clear README: what it does, architecture, how to run, results',
    'Each project shows measured results (eval numbers, latency, cost), not only screenshots',
    'A live demo link or a short screen recording for your best project',
    'Pinned repos on your GitHub profile and a short profile README',
  ]],
  ['resume', 'Resume and profile', [
    'One page. Lead with projects and measurable results, then experience',
    'Every bullet follows: action, what you built, measurable result (use your real numbers)',
    'MERN experience framed as an advantage: you can ship the whole product around the model',
    'LinkedIn headline says what you build ("AI application engineer: RAG, agents, evals") and links your best repo',
  ]],
  ['apply', 'Applying', [
    'A list of 30 target companies that build with LLMs, including startups and product teams at larger companies',
    'Apply to 5 to 10 roles a week with a tailored first paragraph that names a project relevant to the role',
    'Ask for referrals: message one person per company with a specific, short question',
    'Keep a tracker: role, date, status, next step, what you learned',
  ]],
  ['interviews', 'Interviews', [
    'You can explain RAG, agents, evals and cost control out loud in two minutes each',
    'You have practised one system design question a day for a week',
    'You have three stories ready: a hard bug, a decision with trade-offs, learning something fast',
    'You can walk through one project end to end, including what did not work',
  ]],
];

export default function Career() {
  const { state, savePractice, setProject } = useAcademy();
  const [, force] = useState(0);
  const r = readiness(state, { topics: TOPICS, exercises: EXERCISES, projects: PROJECTS, interview: INTERVIEW });
  const checks = (state.projects && state.projects.__checklist) || {};
  const toggle = (k) => { setProject('__checklist', { milestones: { ...checks, [k]: checks[k] ? 0 : 1 } }); force((x) => x + 1); };

  return (
    <>
      <div className="stack">
        <div className="eyebrow">Career track</div>
        <h1>Job readiness</h1>
        <p className="lead">An estimate based on evidence you have produced. It cannot promise a job, but it tells you honestly what is strong and what is missing.</p>
      </div>

      <div className="panel stack">
        <div className="row between">
          <div><div className="dial">{r.total}<span style={{ fontSize: '1.1rem', color: 'var(--muted)' }}> / 100</span></div><strong>{r.label}</strong></div>
          <div className="stack" style={{ maxWidth: 420, gap: 4 }}><div className="eyebrow">Next best action</div><p>{r.next}</p></div>
        </div>
        <div className="stack">
          {Object.keys(r.parts).map((k) => (
            <div className="topicrow" key={k}>
              <span>{r.parts[k].label}<br /><small className="lead">{r.parts[k].detail}</small></span>
              <div className={`bar ${r.parts[k].score >= 0.7 ? 'ok' : r.parts[k].score >= 0.4 ? 'warn' : 'bad'}`}><i style={{ width: `${Math.round(r.parts[k].score * 100)}%` }} /></div>
              <span className="pill">{Math.round(r.parts[k].score * WEIGHTS[k])}/{WEIGHTS[k]}</span>
            </div>
          ))}
        </div>
        <p className="lead" style={{ fontSize: '0.88rem' }}>To reach Job-ready you need at least 60% on skills, 50% on exercises and 60% on project milestones, as well as a total of 75.</p>
      </div>

      <section className="stack">
        <h2>Portfolio projects</h2>
        <div className="grid">
          {PROJECTS.map((p) => {
            const done = (state.projects[p.id] && state.projects[p.id].milestones) || {};
            const n = p.milestones.filter((_, i) => done[i]).length;
            return (
              <Link key={p.id} href={`/career/projects/${p.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="row"><span className="pill">{p.level}</span><span className="pill">{p.hours} h</span>{p.id === 'p4-finetune' && <span className="pill warn">Stretch</span>}</div>
                <h3>{p.title}</h3>
                <span className="meta">{p.why}</span>
                <div className="bar"><i style={{ width: `${Math.round((100 * n) / p.milestones.length)}%` }} /></div>
                <span className="meta">{n} of {p.milestones.length} milestones</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <h2>Interview practice</h2>
        <div className="panel row between">
          <span>{INTERVIEW.technical.length} technical, {INTERVIEW.design.length} system design and {INTERVIEW.behavioral.length} behavioral questions with model answers.</span>
          <Link className="btn primary" href="/career/interview">Start practising</Link>
        </div>
      </section>

      {CHECKLIST.map(([key, title, items]) => (
        <section className="stack" key={key} id={key}>
          <h2>{title}</h2>
          <div className="panel">
            {items.map((t, i) => {
              const k = `${key}:${i}`;
              return (
                <div className="check" key={k} style={{ gridTemplateColumns: '22px 1fr' }}>
                  <input type="checkbox" id={k} checked={!!checks[k]} onChange={() => toggle(k)} />
                  <label htmlFor={k}>{t}</label>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
