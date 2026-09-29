'use client';
import Link from 'next/link';
import { TOPICS, useAcademy } from './Providers.js';
import { level, mastery } from '../lib/scoring.js';

export default function Quiz({ onDone }) {
  const { quiz, state, answer, nextQuestion, exitQuiz, startQuiz } = useAcademy();
  if (!quiz) return null;

  if (quiz.done) {
    const score = quiz.results.filter((r) => r.ok).length;
    const total = quiz.results.length;
    const pct = Math.round((100 * score) / total);
    const seen = [...new Set(quiz.topics)];
    const missed = quiz.results.filter((r) => !r.ok).length;
    return (
      <div className="panel stack">
        <div className="eyebrow">Result</div>
        <div className="big">{score} / {total}</div>
        <div className={`bar ${pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'bad'}`}><i style={{ width: `${pct}%` }} /></div>
        <div className="stack">
          {seen.map((t) => {
            const m = mastery(state, t);
            const lv = level(m);
            return (
              <div className="row between" key={t}>
                <span>{TOPICS[t]}</span>
                <span className={`pill ${lv.tone}`}>{lv.label}{m != null ? ` ${m}%` : ''}</span>
              </div>
            );
          })}
        </div>
        {missed > 0 && <p className="lead">Missed {missed}. They will show up again soon.</p>}
        <div className="row">
          <button className="btn primary" onClick={() => startQuiz(quiz.topics, quiz.mode)}>Another round</button>
          <button className="btn" onClick={() => { exitQuiz(); if (onDone) onDone(); }}>Done</button>
          <Link className="btn" href="/progress">See progress</Link>
        </div>
      </div>
    );
  }

  const it = quiz.items[quiz.i];
  const answered = quiz.picked != null;
  return (
    <div className="panel stack">
      <div className="row between">
        <span className="eyebrow">Question {quiz.i + 1} of {quiz.items.length} · {TOPICS[it.t]}</span>
        <button className="linkbtn" onClick={() => { exitQuiz(); if (onDone) onDone(); }}>Quit</button>
      </div>
      <h2>{it.q}</h2>
      <div className="stack">
        {it.o.map((o, i) => {
          let cls = 'opt';
          if (answered) {
            if (i === it.a) cls += ' right';
            else if (i === quiz.picked) cls += ' wrong';
          }
          return (
            <button key={i} className={cls} disabled={answered} onClick={() => answer(i)}>{o}</button>
          );
        })}
      </div>
      {answered && (
        <>
          <div className="why"><strong>{quiz.picked === it.a ? 'Correct.' : 'Not quite.'}</strong> {it.why}</div>
          <div className="row">
            <button className="btn primary" onClick={nextQuestion}>{quiz.i + 1 === quiz.items.length ? 'See result' : 'Next question'}</button>
          </div>
        </>
      )}
    </div>
  );
}
