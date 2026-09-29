'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GUIDES, LESSONS, PAPERS, TOPICS, courseById, useAcademy } from '../../../components/Providers.js';
import Player from '../../../components/Player.js';
import NotesEditor from '../../../components/NotesEditor.js';
import Quiz from '../../../components/Quiz.js';
import { courseProgress, level, mastery } from '../../../lib/scoring.js';

export default function CoursePage({ params }) {
  const { state, toggleDone, setLast, startQuiz, quiz } = useAcademy();
  const course = courseById(params.id);
  const [lessonId, setLessonId] = useState(null);
  const [tab, setTab] = useState('learn');

  useEffect(() => {
    if (!course) return;
    const last = state.last && LESSONS[state.last] && LESSONS[state.last].course.id === course.id ? state.last : null;
    setLessonId((cur) => cur || last || course.lessons[0].id);
    // only on first load of this course
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course && course.id]);

  if (!course) {
    return (
      <div className="stack">
        <h1>Course not found</h1>
        <Link className="btn" href="/courses">All courses</Link>
      </div>
    );
  }

  const guide = GUIDES[course.id] || null;
  const p = courseProgress(state, course);
  const lesson = (lessonId && LESSONS[lessonId] && LESSONS[lessonId].course.id === course.id ? LESSONS[lessonId].lesson : course.lessons[0]);
  const m = mastery(state, course.topic);
  const lv = level(m);
  const relatedPapers = PAPERS.filter((x) => x.after === course.id);
  const hasQuizForCourse = quiz && quiz.mode === 'course' && quiz.topics.length === 1 && quiz.topics[0] === course.topic;

  return (
    <>
      <div className="stack">
        <Link className="linkbtn" href="/courses" style={{ alignSelf: 'flex-start' }}>All courses</Link>
        <div className="eyebrow">Phase {course.phase} · {TOPICS[course.topic]} · {course.by}</div>
        <h1>{course.title}</h1>
        <p className="lead">{course.about}</p>
        <div className="row">
          <a className="btn small" href={course.url} target="_blank" rel="noopener noreferrer">Course home</a>
          <span className="pill">{course.cost}</span>
          <span className="pill">{p.done}/{p.total} done</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'learn'} onClick={() => setTab('learn')}>Learn</button>
        {guide && <button role="tab" aria-selected={tab === 'explained'} onClick={() => setTab('explained')}>Explained</button>}
        <button role="tab" aria-selected={tab === 'quiz'} onClick={() => setTab('quiz')}>Quiz</button>
      </div>

      {tab === 'explained' && guide && (
        <div className="stack">
          <div className="panel stack">
            <div className="eyebrow">In plain words</div>
            <p>{guide.plain}</p>
            <div className="eyebrow">You will be able to</div>
            <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
              {guide.learn.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <p className="lead"><strong>Know first:</strong> {guide.prereq}</p>
          </div>
          <h2>Key ideas</h2>
          <div className="grid">
            {guide.concepts.map((k) => (
              <div className="card" key={k.term}>
                <h3>{k.term}</h3>
                <p>{k.plain}</p>
                <p className="lead"><strong>Think of it as:</strong> {k.analogy}</p>
              </div>
            ))}
          </div>
          <div className="panel stack">
            <p><strong>For a MERN developer:</strong> {guide.mern}</p>
            <p><strong>Common mistake:</strong> {guide.pitfall}</p>
          </div>
          <p className="lead">Stuck on a word? <Link href="/glossary">Open the glossary</Link>.</p>
        </div>
      )}

      {tab === 'quiz' && (
        hasQuizForCourse ? (
          <Quiz onDone={() => setTab('learn')} />
        ) : (
          <div className="panel stack">
            <h2>{TOPICS[course.topic]} quiz</h2>
            <p className="lead">
              Wrong answers come back more often in later quizzes. Topic status: <span className={`pill ${lv.tone}`}>{lv.label}{m != null ? ` ${m}%` : ''}</span>
            </p>
            <div className="row">
              <button className="btn primary" onClick={() => startQuiz([course.topic], 'course')}>Start quiz</button>
            </div>
          </div>
        )
      )}

      {tab === 'learn' && (
        <div className="split">
          <div className="lessons" role="list">
            {course.lessons.map((x) => (
              <button key={x.id} className="lesson" role="listitem" aria-current={x.id === lesson.id} onClick={() => { setLessonId(x.id); setLast(x.id); }}>
                <span className={`tick${state.done[x.id] ? ' done' : ''}`} />
                <span>
                  {x.t}
                  <small>{x.k === 'video' ? 'Video' : x.k === 'task' ? 'Practice' : 'Reading'}{x.min ? ` · ${x.min} min` : ''}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="stack">
            <h2>{lesson.t}</h2>
            <Player course={course} lesson={lesson} />
            {guide && guide.lessons && guide.lessons[lesson.id] && (
              <div className="why"><strong>What to focus on:</strong> {guide.lessons[lesson.id]}</div>
            )}
            <div className="row">
              <button className={`btn ${state.done[lesson.id] ? '' : 'primary'}`} onClick={() => toggleDone(lesson.id)}>
                {state.done[lesson.id] ? 'Marked complete, undo' : 'Mark complete'}
              </button>
            </div>
            <div className="stack">
              <h3>Your notes</h3>
              <NotesEditor id={lesson.id} />
            </div>
            {relatedPapers.length > 0 && (
              <div className="panel stack">
                <div className="eyebrow">Read after this course</div>
                {relatedPapers.map((r) => <Link key={r.id} href="/papers">{r.title}</Link>)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
