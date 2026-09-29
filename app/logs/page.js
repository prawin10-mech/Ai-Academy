'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAcademy } from '../../components/Providers.js';

const EVENTS = [
  ['daily_digest', 'Yes', 'Your morning summary: evaluation, plan, new models and papers, streak.'],
  ['quiz_daily_done', 'Yes', 'Score and weakest topic right after the Daily 5.'],
  ['streak_milestone', 'Yes', 'At 3, 7, 14, 30, 60 and 100 days.'],
  ['course_complete', 'Yes', 'Every step of a course is ticked.'],
  ['quiz_course_done', 'No', 'Stored only.'],
  ['lesson_complete', 'No', 'Stored only (includes passed exercises).'],
  ['paper_done', 'No', 'Stored only.'],
];

export default function Logs() {
  const { api, ready, mode, user } = useAcademy();
  const [logs, setLogs] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (!ready || mode !== 'user') return;
    api('/api/log').then((r) => r.json()).then((d) => setLogs(d.logs || [])).catch(() => setLogs([]));
    if (user && user.admin) api('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});
  }, [ready, mode, user, api]);

  if (mode === 'guest') return <div className="stack"><h1>Activity</h1><p className="lead">Activity history and Telegram messages need an account. Use Create account in the menu.</p></div>;

  return (
    <>
      <div className="stack">
        <div className="eyebrow">Your activity</div>
        <h1>Activity</h1>
        <p className="lead">What the academy recorded for you. Events marked Telegram are also sent to your phone when you have linked it in <Link href="/settings">Settings</Link>.</p>
      </div>

      {health && (
        <div className="panel stack">
          <h3>Site status (owner only)</h3>
          <div className="row">
            <span className={`pill ${health.store === 'mongodb' ? 'ok' : 'warn'}`}>Database: {health.store}</span>
            <span className="pill">{health.users} learners</span>
            <span className={`pill ${health.botConfigured ? 'ok' : 'warn'}`}>Bot: {health.botConfigured ? 'set' : 'missing'}</span>
            <span className={`pill ${health.botUsernameSet ? 'ok' : 'warn'}`}>Bot username: {health.botUsernameSet ? 'set' : 'missing'}</span>
            <span className={`pill ${health.webhookSecretSet ? 'ok' : 'warn'}`}>Webhook secret: {health.webhookSecretSet ? 'set' : 'missing'}</span>
            <span className={`pill ${health.adminChatConfigured ? 'ok' : 'warn'}`}>Owner chat: {health.adminChatConfigured ? 'set' : 'missing'}</span>
            <span className={`pill ${health.cronSecretSet ? 'ok' : 'warn'}`}>Cron secret: {health.cronSecretSet ? 'set' : 'missing'}</span>
            <span className={`pill ${health.sessionSecretSet ? 'ok' : 'bad'}`}>Session secret: {health.sessionSecretSet ? 'set' : 'missing'}</span>
          </div>
        </div>
      )}

      <section className="stack">
        <h2>Recent events</h2>
        {logs == null ? <p className="lead">Loading</p> : !logs.length ? (
          <div className="panel flat"><p className="lead">Nothing yet. Finish a lesson or a quiz.</p></div>
        ) : (
          <div className="panel">
            {logs.map((l, i) => (
              <div className="log" key={`${l.ts}:${i}`}>
                <span className="meta lead">{new Date(l.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <span><span className={`pill ${l.level === 'error' ? 'bad' : l.level === 'warn' ? 'warn' : ''}`}>{l.type}</span> {l.telegram && <span className="pill accent">Telegram</span>} {l.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="stack">
        <h2>What goes to Telegram</h2>
        <div className="panel tw">
          <table>
            <thead><tr><th>Event</th><th>Sent</th><th>What it is</th></tr></thead>
            <tbody>{EVENTS.map(([k, s, d]) => <tr key={k}><td>{k}</td><td>{s}</td><td style={{ whiteSpace: 'normal' }}>{d}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
