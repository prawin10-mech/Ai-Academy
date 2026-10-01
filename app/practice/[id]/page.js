'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { COURSES, EXERCISES, TOPICS, useAcademy } from '../../../components/Providers.js';
import { runInWorker } from '../../../components/runWorker.js';
import CodeEditor from '../../../components/CodeEditor.js';

export default function Exercise({ params }) {
  const ex = EXERCISES.find((e) => e.id === params.id);
  const { state, savePractice, reportEvent, ready } = useAcademy();
  const saved = ex ? state.practice[ex.id] : null;
  const [code, setCode] = useState('');
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hints, setHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (ready && ex && !loaded.current) { loaded.current = true; setCode((saved && saved.code) || ex.starter); }
  }, [ready, ex, saved]);

  if (!ex) return <div className="stack"><h1>Exercise not found</h1><Link className="btn" href="/practice">All exercises</Link></div>;
  const course = COURSES.find((c) => c.id === ex.course);
  const idx = EXERCISES.findIndex((e) => e.id === ex.id);
  const nextEx = [...EXERCISES.slice(idx + 1), ...EXERCISES.slice(0, idx)].find((e) => !(state.practice[e.id] && state.practice[e.id].passed));
  const change = (v) => { setCode(v); savePractice(ex.id, { code: v }); };

  const runTests = async () => {
    setBusy(true);
    const r = await runInWorker(code, ex.fn, ex.cases, ex.tol);
    setRun(r);
    setBusy(false);
    const allPass = !r.compileError && !r.timeout && r.results.length > 0 && r.results.every((x) => x.pass);
    const first = !(saved && saved.passed);
    savePractice(ex.id, { attempts: ((saved && saved.attempts) || 0) + 1, ...(allPass ? { passed: true } : {}) });
    if (allPass && first) reportEvent('lesson_complete', `Passed exercise "${ex.title}".`);
  };

  const passedNow = run && !run.compileError && !run.timeout && run.results.length > 0 && run.results.every((x) => x.pass);
  const failed = run ? run.results.filter((x) => !x.pass).length : 0;

  return (
    <>
      <div className="stack">
        <Link className="linkbtn" href="/practice" style={{ alignSelf: 'flex-start' }}>All exercises</Link>
        <div className="row"><span className="pill">{TOPICS[ex.topic]}</span><span className="pill">{ex.level}</span><span className="pill">{ex.minutes} min</span>{saved && saved.passed && <span className={`pill ${saved.peeked ? 'warn' : 'ok'}`}>{saved.peeked ? 'Passed with solution' : 'Passed'}</span>}</div>
        <h1>{ex.title}</h1>
        <p className="lead">{ex.story}</p>
        {course && <p className="lead">Learn it first in <Link href={`/courses/${course.id}`}>{course.title}</Link>.</p>}
      </div>

      <div className="split even">
        <div className="panel stack"><h3>Task</h3><p style={{ whiteSpace: 'pre-wrap' }}>{ex.task}</p></div>
        <div className="stack">
          <h3>Your code</h3>
          <CodeEditor value={code} onChange={change} onRun={runTests} disabled={!ready} />
          <div className="row">
            <button className="btn primary" onClick={runTests} disabled={busy || !ready}>{busy ? <><span className="spinner" aria-hidden="true" />Running</> : 'Run tests'}</button>
            <button className="btn" onClick={() => { change(ex.starter); setRun(null); }}>Reset</button>
          </div>
          <span className="lead" style={{ fontSize: '0.85rem' }}>Runs in your browser in a sandbox with no network.</span>
        </div>
      </div>

      {run && (
        <div className="panel stack" role="region" aria-label="Test results">
          {run.compileError && <p className="err">{run.compileError}</p>}
          {run.timeout && <p className="err">Your code ran longer than 3 seconds. Check for an infinite loop.</p>}
          {!run.compileError && !run.timeout && (
            <>
              <h3>{passedNow ? 'All tests passed' : `${failed} of ${run.results.length} tests failed`}</h3>
              {run.results.map((r, i) => (
                <div className="result" key={i}>
                  <span className={`pill ${r.pass ? 'ok' : 'bad'}`}>{r.pass ? '✓' : '✗'}</span>
                  <div className="stack" style={{ gap: 2 }}>
                    <strong>{r.name}{r.hidden ? ' (hidden)' : ''}</strong>
                    {!r.pass && !r.hidden && <span>Expected <code>{r.expected}</code> but got <code>{r.actual}</code></span>}
                    {!r.pass && r.hidden && <span className="lead">A hidden case failed. Think about edge cases.</span>}
                    {r.error && <span className="err">{r.error}</span>}
                  </div>
                </div>
              ))}
              {run.logs.length > 0 && <details><summary>Console output</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{run.logs.join('\n')}</pre></details>}
            </>
          )}
        </div>
      )}

      {passedNow && (
        <div className="panel stack">
          <div className="eyebrow">Why it works</div>
          <p>{ex.explain}</p>
          <p className="lead"><strong>In production:</strong> {ex.connects}</p>
          <div className="row">{nextEx ? <Link className="btn primary" href={`/practice/${nextEx.id}`}>Next: {nextEx.title}</Link> : <span className="pill ok">All exercises passed</span>}<Link className="btn" href="/practice">All exercises</Link></div>
        </div>
      )}

      <div className="panel stack">
        <h3>Stuck?</h3>
        {ex.hints.slice(0, hints).map((h, i) => <p key={i}><strong>Hint {i + 1}.</strong> {h}</p>)}
        <div className="row">
          {hints < ex.hints.length && <button className="btn small" onClick={() => setHints(hints + 1)}>{hints ? 'Next hint' : 'Show a hint'}</button>}
          {!showSolution && <button className="btn small" onClick={() => { setShowSolution(true); if (!(saved && saved.passed)) savePractice(ex.id, { peeked: true }); }}>Show solution</button>}
        </div>
        {showSolution && (
          <div className="stack">
            <p className="lead">Passing after viewing the solution counts for half credit in your readiness score. Try to write it yourself first.</p>
            <pre className="why" style={{ overflow: 'auto', margin: 0, font: '0.88rem/1.5 var(--font-mono)' }}>{ex.solution}</pre>
            <p>{ex.explain}</p>
          </div>
        )}
      </div>
    </>
  );
}
