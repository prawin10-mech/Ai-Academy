'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAcademy } from '../../components/Providers.js';

const ago = (t) => {
  if (!t) return 'never';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

export default function Admin() {
  const { user, api } = useAcademy();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!user || !user.admin) return;
    let live = true;
    (async () => {
      try {
        const r = await api('/api/admin/stats');
        const d = await r.json();
        if (!live) return;
        if (r.ok) setData(d); else setErr(d.error || 'Could not load stats.');
      } catch { if (live) setErr('Could not load stats.'); }
    })();
    return () => { live = false; };
  }, [user, api]);

  const search = async (e) => {
    e.preventDefault(); setNote(''); setConfirm(null);
    try { const r = await api(`/api/admin/users?q=${encodeURIComponent(q)}`); const d = await r.json(); setFound(r.ok ? d.users : []); if (!r.ok) setNote(d.error || 'Search failed.'); } catch { setNote('Search failed.'); }
  };
  const act = async (id, action) => {
    try {
      const r = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ id, action }) });
      const d = await r.json().catch(() => ({}));
      setNote(r.ok ? (action === 'delete' ? 'Account deleted.' : 'Progress reset.') : d.error || 'Failed.');
      setConfirm(null);
      if (r.ok) { setFound((f) => (f || []).filter((u) => action !== 'delete' || u.id !== id)); }
    } catch { setNote('Failed.'); }
  };

  if (!user || !user.admin) return <div className="panel stack"><h1>Owner stats</h1><p className="lead">This page is for the site owner. Sign in with the ADMIN_EMAIL account. <Link href="/">Back to Today</Link></p></div>;
  if (err) return <div className="panel"><p className="lead">{err}</p></div>;
  if (!data) return <div className="panel stack"><h1>Owner stats</h1><div className="skel" style={{ height: 80 }} /><div className="skel" style={{ height: 160 }} /></div>;
  const s = data.stats;
  const h = data.health || {};
  const ret = (r) => (r.pct == null ? 'not enough data yet' : `${r.pct}% (${r.returned} of ${r.eligible})`);
  const max = Math.max(1, ...s.signupsPerDay.map((d) => d.count));
  const tiles = [
    ['Users', s.total], ['New today', s.newToday], ['New, 7 days', s.new7d], ['New, 30 days', s.new30d],
    ['Active, 24 h', s.active24h], ['Active, 7 days', s.active7d], ['Active, 30 days', s.active30d], ['Finished onboarding', s.onboarded],
    ['Telegram linked', s.telegramLinked], ['Digest on', s.digestOn], ['Lessons done', s.lessonsDone], ['Exercises passed', s.exercisesPassed],
  ];
  return (
    <div className="stack">
      <div className="panel stack">
        <h1>Owner stats</h1>
        <p className="lead">Storage: {data.storage}. &quot;Active&quot; means the user saved progress in that window. {data.capped && 'Showing the first 5000 users only.'}</p>
        <div className="grid">
          {tiles.map(([k, v]) => <div key={k} className="panel" style={{ margin: 0 }}><div className="meta">{k}</div><div style={{ fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</div></div>)}
        </div>
        <p className="meta">Average lessons done per user: {s.avgLessons}</p>
      </div>


      <div className="panel stack">
        <h2>Do people come back?</h2>
        <p className="meta">Of the users who signed up at least N days ago, the share who were active again N or more days later.</p>
        <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
          <li>After 1 day: {ret(s.retention.d1)}</li>
          <li>After 7 days: {ret(s.retention.d7)}</li>
          <li>After 30 days: {ret(s.retention.d30)}</li>
        </ul>
        <p className="meta">On a streak now: {s.streaks.onStreak} users. Best streak: {s.streaks.best} days. Average streak: {s.streaks.avg} days.</p>
      </div>

      <div className="panel stack">
        <h2>Where users drop off</h2>
        {s.funnel.map((f) => (
          <div key={f.label} className="stack" style={{ gap: 2 }}>
            <div className="row between"><span>{f.label}</span><span className="meta">{f.count} ({f.pct}%)</span></div>
            <div className="bar"><i style={{ width: `${f.pct}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="panel stack">
        <h2>Content that needs attention</h2>
        <h3>Hardest exercises (lowest pass rate, 3+ tries)</h3>
        {s.content.hardest.length ? <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>{s.content.hardest.map((e) => <li key={e.id}>{e.title}: {e.rate}% passed ({e.passed} of {e.tried})</li>)}</ul> : <p className="meta">Not enough attempts yet.</p>}
        <h3>Most tried exercises</h3>
        {s.content.popularExercises.length ? <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>{s.content.popularExercises.map((e) => <li key={e.id}>{e.title}: {e.tried} users</li>)}</ul> : <p className="meta">No attempts yet.</p>}
        <h3>Most started courses</h3>
        {s.content.topCourses.length ? <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>{s.content.topCourses.map((c) => <li key={c.id}>{c.title}: {c.starters} users, {c.avgPct}% finished on average</li>)}</ul> : <p className="meta">No lessons finished yet.</p>}
        <h3>Courses people leave unfinished (3+ starters)</h3>
        {s.content.leastFinished.length ? <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>{s.content.leastFinished.map((c) => <li key={c.id}>{c.title}: {c.avgPct}% finished on average ({c.starters} users)</li>)}</ul> : <p className="meta">Not enough data yet.</p>}
        <p className="meta">Practice language: {s.languages.python} users have written Python, {s.languages.js} have written JavaScript.</p>
      </div>

      <div className="panel stack">
        <h2>Site health</h2>
        <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
          <li>Storage: {h.storage}{h.storage === 'file' ? ' (not safe on Vercel, set MONGODB_URI)' : ''}</li>
          <li>Telegram bot: {h.botConfigured ? 'configured' : 'not configured'}; webhook secret {h.webhookSecretSet ? 'set' : 'MISSING'}</li>
          <li>Daily job secret (CRON_SECRET): {h.cronSecretSet ? 'set' : 'MISSING'}; APP_URL: {h.appUrlSet ? 'set' : 'MISSING'}</li>
          <li>Last daily update: {h.lastDailyFeed || 'never'}; last radar: {h.lastRadar || 'never'}</li>
        </ul>
        <p className="meta">For the Telegram webhook itself, use Connect bot now in Settings.</p>
      </div>

      <div className="panel stack">
        <h2>Find a user</h2>
        <form className="row" onSubmit={search}>
          <input className="field" style={{ flex: 1, minWidth: 0 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email or name (2+ letters)" aria-label="Search users" />
          <button className="btn primary" type="submit">Search</button>
        </form>
        {note && <p role="status" className="meta">{note}</p>}
        {found && !found.length && <p className="meta">No users found.</p>}
        {(found || []).map((u) => (
          <div key={u.id} className="panel stack" style={{ margin: 0, gap: 6 }}>
            <strong>{u.name || '(no name)'} <span className="meta">{u.email}</span></strong>
            <span className="meta">Joined {ago(u.joined)} · last active {ago(u.lastActive)} · {u.lessons} lessons · {u.solved} exercises · Telegram {u.telegram ? 'linked' : 'not linked'}{u.onboarded ? '' : ' · not onboarded'}{u.owner ? ' · owner' : ''}</span>
            {!u.owner && (confirm && confirm.id === u.id ? (
              <div className="row"><span>{confirm.action === 'delete' ? 'Delete this account for good?' : 'Reset all progress for this user?'}</span><button className="btn small" onClick={() => act(u.id, confirm.action)}>Yes, do it</button><button className="btn small" onClick={() => setConfirm(null)}>Cancel</button></div>
            ) : (
              <div className="row"><button className="btn small" onClick={() => setConfirm({ id: u.id, action: 'reset' })}>Reset progress</button><button className="btn small" onClick={() => setConfirm({ id: u.id, action: 'delete' })}>Delete account</button></div>
            ))}
          </div>
        ))}
        <p className="meta">Only the owner can see this. Notes and code are never shown.</p>
      </div>

      <div className="panel row between">
        <span>Download these numbers (no emails) as a spreadsheet.</span>
        <a className="btn" href="/api/admin/stats?format=csv">Download CSV</a>
      </div>

      <div className="panel stack">
        <h2>Sign-ups, last 14 days</h2>
        <div role="img" aria-label="Sign-ups per day for the last 14 days" style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
          {s.signupsPerDay.map((d) => (
            <div key={d.date} title={`${d.date}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', minWidth: 0 }}>
              <span className="meta" style={{ fontSize: 11 }}>{d.count || ''}</span>
              <div style={{ width: '100%', height: `${(d.count / max) * 80}%`, minHeight: d.count ? 3 : 1, background: 'var(--accent, #6c8cff)', borderRadius: 3, opacity: d.count ? 1 : 0.25 }} />
            </div>
          ))}
        </div>
        <div className="meta" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{s.signupsPerDay[0].date.slice(5)}</span><span>{s.signupsPerDay[s.signupsPerDay.length - 1].date.slice(5)}</span></div>
      </div>

      <div className="panel stack">
        <h2>Newest users</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead><tr style={{ textAlign: 'left' }}><th>Name</th><th>Email</th><th>Joined</th><th>Last active</th><th>Lessons</th><th>Solved</th><th>Telegram</th></tr></thead>
            <tbody>
              {s.recent.map((u, i) => (
                <tr key={i}><td>{u.name || '-'}</td><td>{u.email}</td><td>{ago(u.joined)}</td><td>{ago(u.lastActive)}</td><td>{u.lessons}</td><td>{u.solved}</td><td>{u.telegram ? 'Yes' : 'No'}</td></tr>
              ))}
              {!s.recent.length && <tr><td colSpan={7}>No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="meta">Emails are partly hidden on purpose. Only counts and progress are shown, never notes or passwords.</p>
      </div>
    </div>
  );
}
