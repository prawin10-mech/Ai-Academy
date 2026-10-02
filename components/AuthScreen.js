'use client';
import Link from 'next/link';
import { useState } from 'react';

const POINTS = [
  ['A 26-week plan built for hiring', 'Agentic AI, RAG, evals and production first. Nothing that does not help you get hired.'],
  ['Shaped by what you already know', 'Tell us your background. Skills you have are skipped or fast-tracked.'],
  ['Practise and get checked', 'Code exercises run in your browser and are tested on the spot. Quizzes come back on what you miss.'],
  ['Portfolio and interview prep', 'Six projects with checklists, 68 interview questions, and a readiness score based on evidence.'],
  ['Stays current', 'A daily radar of new models and tools, and a digest on Telegram if you want it.'],
];

export default function AuthScreen({ onLogin, onRegister, onGuest }) {
  const [tab, setTab] = useState('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const r = tab === 'register' ? await onRegister(email, password, name, website) : await onLogin(email, password);
    if (r && r.error) { setError(r.error); setBusy(false); }
  };

  return (
    <div className="shell">
      <main className="landing">
        <div className="stack" style={{ gap: 16 }}>
          <div className="brand">AI Engineer <span>Academy</span></div>
          <h1>Become a hireable AI engineer in 6 months</h1>
          <p className="lead">A free, structured path for developers: agentic AI, RAG, evals and shipping to production, with practice you can run and check right here.</p>
          <ul className="points">
            {POINTS.map(([h, t]) => <li key={h}><strong>{h}</strong><span>{t}</span></li>)}
          </ul>
          <p className="lead">No course can promise a job. The academy shows you exactly what evidence you have and what is still missing.</p>
        </div>

        <div className="panel stack authbox">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'register'} onClick={() => { setTab('register'); setError(''); }}>Create account</button>
            <button role="tab" aria-selected={tab === 'login'} onClick={() => { setTab('login'); setError(''); }}>Sign in</button>
          </div>
          <form className="stack" onSubmit={submit}>
            {tab === 'register' && (
              <label className="stack" style={{ gap: 4 }}>Name (optional)
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} />
              </label>
            )}
            <label className="stack" style={{ gap: 4 }}>Email
              <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label className="stack" style={{ gap: 4 }}>Password
              <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'register' ? 'new-password' : 'current-password'} />
            </label>
            {tab === 'register' && <p className="lead" style={{ fontSize: '0.88rem' }}>At least 8 characters.</p>}
            <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            {error && <p role="alert" className="err">{error}</p>}
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'One moment' : tab === 'register' ? 'Create free account' : 'Sign in'}</button>
          </form>
          <div className="stack" style={{ gap: 8 }}>
            <button className="btn" type="button" onClick={() => { onGuest(); window.location.assign('/practice/ex-dot'); }}>Try a free coding exercise now</button>
            <button className="linkbtn" onClick={onGuest}>Or look around without an account</button>
            <span className="lead" style={{ fontSize: '0.88rem' }}>Guest progress stays in this browser only. Create an account any time to keep it and sync across devices.</span>
          </div>
          <p className="lead" style={{ fontSize: '0.85rem' }}>By continuing you agree to the <Link href="/privacy">privacy and terms</Link>. <Link href="/ai-engineer-roadmap">See the full 26-week roadmap</Link>.</p>
        </div>
      </main>
    </div>
  );
}
