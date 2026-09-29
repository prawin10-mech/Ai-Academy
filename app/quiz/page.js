'use client';
import { useRouter } from 'next/navigation';
import Quiz from '../../components/Quiz.js';
import { TOPICS, useAcademy } from '../../components/Providers.js';

export default function QuizPage() {
  const router = useRouter();
  const { quiz, startQuiz } = useAcademy();
  if (!quiz) {
    return (
      <div className="stack">
        <h1>Quiz</h1>
        <p className="lead">No quiz is running.</p>
        <div className="row">
          <button className="btn primary" onClick={() => startQuiz(Object.keys(TOPICS), 'daily')}>Start the Daily 5</button>
        </div>
      </div>
    );
  }
  return (
    <div className="stack">
      <div className="eyebrow">{quiz.mode === 'daily' ? 'Daily 5' : quiz.mode === 'placement' ? 'Skill check' : 'Quiz'}</div>
      <h1>{quiz.mode === 'daily' ? 'Daily 5 quiz' : quiz.mode === 'placement' ? 'Check your strongest skills' : 'Quiz'}</h1>
      {quiz.mode === 'placement' && <p className="lead">Three questions on each topic you rated yourself strongly in. Your score adjusts your path: it can confirm a skip or tell you to review.</p>}
      <Quiz onDone={() => router.push(quiz.mode === 'placement' ? '/roadmap' : '/')} />
    </div>
  );
}
