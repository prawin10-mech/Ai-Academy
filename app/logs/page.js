'use client';
import { useEffect, useState } from 'react';
import { useAcademy } from '../../components/Providers.js';

const EVENTS = [
  ['daily_digest', 'Yes', 'Morning summary: evaluation, plan, new papers, streak.'],
  ['cron_error', 'Yes', 'The scheduled job failed or a paper source was unreachable.'],
  ['quiz_daily_done', 'Yes', 'Score and weakest topic right after the Daily 5.'],
  ['streak_milestone', 'Yes', 'At 3, 7, 14, 30, 60 and 100 days.'],
  ['course_complete', 'Yes', 'Every step of a course is ticked.'],
  ['client_error', 'Yes', 'Unhandled browser error, at most 3 per 10 minutes.'],
  ['quiz_course_done', 'No', 'Stored only.'],
  ['lesson_complete', 'No', 'Stored only.'],
  ['paper_done', 'No', 'Stored only.'],
  ['cron_ok', 'No', 'Stored only.'],
];

export default function Logs() {
  const { api, ready } = useAcademy();
  const [logs, setLogs] = useState(null);
  const [health, setHealth] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    api('/api/log').then((r) => r.json()).then((d) => setLogs(d.logs || [])).catch(() => setLogs([]));
    api('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});
  };
  useEffect(() => { if (ready) load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const test = async () => {
    setMsg('Sending');
    try {
      const d = await (await api('/api/health?telegram=1')).json();
      setMsg(`Telegram test: ${d.telegramTest || 'no result'}`);
      load();
    } catch { setMsg('Could not reach the server.'); }
  };

  return (
    <>
      <div className="stack">
        <div className="eyebrow">Activity and Telegram</div>
        <h1>Logs</h1>
        <p className="lead">Everything the app records is here. Events marked Telegram are also sent to your phone.</p>
      </div>

      <div className="panel stack">
        <div className="row between">
          <h3>Connection</h3>
          <button className="btn small" onClick={test}>Send Telegram test</button>
        </div>
        {health ? (
          <div className="row">
            <span className={`pill ${health.store === 'mongodb' ? 'ok' : 'warn'}`}>Database: {health.store || 'unknown'}</span>
            <span className={`pill ${health.telegramConfigured ? 'ok' : 'warn'}`}>Telegram: {health.telegramConfigured ? 'configured' : 'not configured'}</span>
            <span className={`pill ${health.cronSecretSet ? 'ok' : 'warn'}`}>Cron secret: {health.cronSecretSet ? 'set' : 'not set'}</span>
          </div>
        ) : <p className="lead">Checking</p>}
        {msg && <p role="status">{msg}</p>}
      </div>

      <section className="stack">
        <h2>Recent events</h2>
        {logs == null ? <p className="lead">Loading</p> : !logs.length ? (
          <div className="panel flat"><p className="lead">Nothing logged yet. Finish a lesson or a quiz, or run the daily job.</p></div>
        ) : (
          <div className="panel">
            {logs.map((l, i) => (
              <div className="log" key={`${l.ts}:${i}`}>
                <span className="meta lead">{new Date(l.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <span>
                  <span className={`pill ${l.level === 'error' ? 'bad' : l.level === 'warn' ? 'warn' : ''}`}>{l.type}</span>{' '}
                  {l.telegram && <span className="pill accent">Telegram</span>}{' '}
                  {l.message}
                </span>
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
            <tbody>
              {EVENTS.map(([k, s, d]) => <tr key={k}><td>{k}</td><td>{s}</td><td style={{ whiteSpace: 'normal' }}>{d}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
