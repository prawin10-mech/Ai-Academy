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
      <div className="eyebrow">{quiz.mode === 'daily' ? 'Daily 5' : 'Quiz'}</div>
      <h1>{quiz.mode === 'daily' ? 'Daily 5 quiz' : 'Quiz'}</h1>
      <Quiz onDone={() => router.push('/')} />
    </div>
  );
}
