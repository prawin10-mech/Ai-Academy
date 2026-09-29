'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COURSES, TOPICS, useAcademy } from '../../components/Providers.js';
import { BACKGROUNDS, GOALS, SELF_CHECK, SKILL_LEVELS, TOPIC_ORDER, buildPath, defaultProfile, placementTopics } from '../../lib/path.js';

export default function Start() {
  const router = useRouter();
  const { state, setProfile, startQuiz } = useAcademy();
  const [p, setP] = useState(() => state.profile || defaultProfile('web'));
  const [step, setStep] = useState(1);

  const preview = buildPath({ ...state, profile: p }, COURSES, TOPICS);
  const pickBackground = (b) => setP({ ...defaultProfile(b), goal: p.goal, hoursPerWeek: p.hoursPerWeek });
  const rate = (t, v) => setP({ ...p, skills: { ...p.skills, [t]: v } });
  const finish = (check) => {
    setProfile(p);
    const topics = placementTopics(p);
    if (check && topics.length) { startQuiz(topics, 'placement', topics.length * 3); router.push('/quiz'); } else router.push('/roadmap');
  };

  return (
    <>
      <div className="stack">
        <div className="eyebrow">Step {step} of 3</div>
        <h1>Shape your path</h1>
        <p className="lead">Tell us what you already know. The academy skips or fast-tracks what you have and puts your time where it counts. You can change this any time.</p>
      </div>

      {step === 1 && (
        <div className="stack">
          <h2>Where are you starting from?</h2>
          <div className="grid">
            {Object.entries(BACKGROUNDS).map(([k, b]) => (
              <button key={k} className="card" aria-pressed={p.background === k} style={p.background === k ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined} onClick={() => pickBackground(k)}>
                <h3>{b.label}</h3>
              </button>
            ))}
          </div>
          <div className="row"><button className="btn primary" onClick={() => setStep(2)}>Next</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <h2>Rate yourself honestly</h2>
          <p className="lead">Use the question under each topic as a test. If unsure, pick the lower level. A short check later confirms your strongest claims.</p>
          <div className="panel stack">
            {TOPIC_ORDER.map((t) => (
              <div key={t} className="stack" style={{ gap: 6 }}>
                <strong>{TOPICS[t]}</strong>
                <span className="lead" style={{ fontSize: '0.9rem' }}>{SELF_CHECK[t]}</span>
                <div className="filters" role="group" aria-label={`Level for ${TOPICS[t]}`}>
                  {SKILL_LEVELS.map((l) => <button key={l.v} className="chip" aria-pressed={p.skills[t] === l.v} onClick={() => rate(t, l.v)}>{l.label}</button>)}
                </div>
              </div>
            ))}
          </div>
          <div className="row"><button className="btn" onClick={() => setStep(1)}>Back</button><button className="btn primary" onClick={() => setStep(3)}>Next</button></div>
        </div>
      )}

      {step === 3 && (
        <div className="stack">
          <h2>Your goal and time</h2>
          <div className="panel stack">
            <div className="stack" style={{ gap: 6 }}>
              <strong>Goal</strong>
              <div className="filters">
                {Object.entries(GOALS).map(([k, label]) => <button key={k} className="chip" aria-pressed={p.goal === k} onClick={() => setP({ ...p, goal: k })}>{label}</button>)}
              </div>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <strong>Hours per week</strong>
              <div className="filters">
                {[4, 6, 8, 10, 15, 20].map((h) => <button key={h} className="chip" aria-pressed={p.hoursPerWeek === h} onClick={() => setP({ ...p, hoursPerWeek: h })}>{h}</button>)}
              </div>
            </div>
          </div>
          <div className="panel stack">
            <div className="eyebrow">Your path</div>
            <p><strong>{preview.hoursLeft} hours</strong> of core learning, about <strong>{preview.weeksLeft} weeks</strong> at {p.hoursPerWeek} hours a week, before portfolio projects and interview practice.</p>
            <p className="lead">{preview.groups.find((g) => g.status === 'learn').items.length} courses to learn, {preview.groups.find((g) => g.status === 'review').items.length} to fast-track, {preview.groups.find((g) => g.status === 'skip').items.length} you can skip.</p>
          </div>
          <div className="row">
            <button className="btn" onClick={() => setStep(2)}>Back</button>
            {placementTopics(p).length > 0 && <button className="btn primary" onClick={() => finish(true)}>Save and check my strongest skills</button>}
            <button className="btn" onClick={() => finish(false)}>Save and see my roadmap</button>
          </div>
        </div>
      )}
    </>
  );
}
