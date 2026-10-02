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

  if (!user || !user.admin) return <div className="panel stack"><h1>Owner stats</h1><p className="lead">This page is for the site owner. Sign in with the ADMIN_EMAIL account. <Link href="/">Back to Today</Link></p></div>;
  if (err) return <div className="panel"><p className="lead">{err}</p></div>;
  if (!data) return <div className="panel stack"><h1>Owner stats</h1><div className="skel" style={{ height: 80 }} /><div className="skel" style={{ height: 160 }} /></div>;
  const s = data.stats;
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
