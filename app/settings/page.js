'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademy } from '../../components/Providers.js';
import ThemePicker from '../../components/ThemePicker.js';

export default function Settings() {
  const router = useRouter();
  const { mode, user, botUsername, api, refreshUser, logout, state } = useAcademy();
  const [name, setName] = useState((user && user.name) || '');
  const [tz, setTz] = useState((user && user.tz) || 'UTC');
  const [hour, setHour] = useState(user ? user.digestHour : 7);
  const [digest, setDigest] = useState(user ? user.digest : true);
  const [msg, setMsg] = useState('');
  const [link, setLink] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [del, setDel] = useState('');
  const [fb, setFb] = useState('');
  const [tg, setTg] = useState(null);

  // While a link is pending, check every 3 seconds so the page updates the moment you press Start in Telegram.
  const pending = !!link && !(user && user.telegramLinked);
  useEffect(() => {
    if (!pending) return undefined;
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      if (stop || Date.now() - started > 15 * 60 * 1000) return;
      try { const r = await api('/api/auth/me'); const d = await r.json(); if (d.user && d.user.telegramLinked) { refreshUser(d.user); setLink(null); setMsg('Telegram is linked. You should have a welcome message in the chat.'); return; } } catch { /* try again */ }
      setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 3000);
    return () => { stop = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  if (mode === 'guest') {
    return (
      <div className="stack">
        <h1>Settings</h1>
        <div className="panel stack">
          <p>You are using a guest session. Your progress is saved in this browser only, and Telegram digests, syncing and job-readiness history need an account.</p>
          <div className="row"><button className="btn primary" onClick={logout}>Create an account</button></div>
        </div>
        <ThemePicker />
      </div>
    );
  }

  const call = async (fn) => { setMsg(''); try { await fn(); } catch (e) { if (String(e.message) !== 'unauthorized') setMsg('Could not reach the server. Try again.'); } };

  const save = () => call(async () => {
    const r = await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ name, tz, digest, digestHour: Number(hour) }) });
    const d = await r.json();
    if (r.ok) { refreshUser(d.user); setMsg('Saved.'); } else setMsg(d.error || 'Could not save.');
  });
  const makeLink = () => call(async () => {
    const r = await api('/api/telegram/link', { method: 'POST' });
    const d = await r.json();
    if (r.ok) { setLink(d.url); if (d.warning) setMsg('Link ready, but the bot is not connected to the site yet: ' + d.warning); } else setMsg(d.error || 'Could not create a link.');
  });
  const unlink = () => call(async () => { const r = await api('/api/telegram/unlink', { method: 'POST' }); const d = await r.json(); if (r.ok) { refreshUser(d.user); setLink(null); setMsg('Telegram unlinked.'); } });
  const refresh = () => call(async () => { const r = await api('/api/auth/me'); const d = await r.json(); if (d.user) refreshUser(d.user); setMsg(d.user && d.user.telegramLinked ? 'Telegram is linked.' : 'Not linked yet. Open the link in Telegram and press Start.'); });
  const connectBot = () => call(async () => {
    const r = await api('/api/telegram/setup', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    setTg(d);
    setMsg(r.ok && d.diagnostics && !d.diagnostics.problems.length ? 'Bot connected. Now press Link Telegram and Start.' : (d.reason || d.error || 'Connected, but some problems remain. See below.'));
  });
  const sendTest = () => call(async () => { const r = await api('/api/telegram/test', { method: 'POST' }); const d = await r.json().catch(() => ({})); setMsg(r.ok ? 'Test message sent. Check Telegram.' : d.error || 'Could not send the test message.'); });
  const changePw = () => call(async () => { const r = await api('/api/auth/password', { method: 'POST', body: JSON.stringify(pw) }); const d = await r.json(); setMsg(r.ok ? 'Password changed. Other devices were signed out.' : d.error); if (r.ok) setPw({ current: '', next: '' }); });
  const sendFb = () => call(async () => { const r = await api('/api/feedback', { method: 'POST', body: JSON.stringify({ message: fb, page: 'settings' }) }); const d = await r.json(); setMsg(r.ok ? 'Thank you. Your report was sent.' : d.error); if (r.ok) setFb(''); });
  const remove = () => call(async () => {
    const r = await api('/api/account', { method: 'DELETE', body: JSON.stringify({ password: del }) });
    const d = await r.json();
    if (r.ok) { try { Object.keys(localStorage).filter((k) => k.startsWith('ai-academy')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } await logout(); router.push('/'); } else setMsg(d.error);
  });

  const zones = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return ['UTC', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'Asia/Kolkata']; } })();

  return (
    <>
      <div className="stack"><h1>Settings</h1><p className="lead">Signed in as {user && user.email}.</p></div>
      {msg && <p role="status" className="panel">{msg}</p>}

      <div className="panel stack">
        <h2>Profile and time</h2>
        <label className="stack" style={{ gap: 4 }}>Name<input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
        <label className="stack" style={{ gap: 4 }}>Time zone
          <select className="field" style={{ width: '100%' }} value={tz} onChange={(e) => setTz(e.target.value)}>{[...new Set([tz, ...zones])].map((z) => <option key={z} value={z}>{z}</option>)}</select>
        </label>
        <div className="row"><button className="btn primary" onClick={save}>Save</button></div>
      </div>

      <ThemePicker />

      <div className="panel stack">
        <h2>Daily digest on Telegram</h2>
        <p className="lead">Get your evaluation, today&apos;s plan, new models and papers on your phone each morning, plus a note when you finish a Daily 5 or hit a streak.</p>
        {user && user.telegramLinked ? (
          <>
            <p><span className="pill ok">Linked ✓</span> <span className="meta">Your messages arrive in Telegram.</span></p>
            <label className="row"><input type="checkbox" checked={digest} onChange={(e) => setDigest(e.target.checked)} /> Send me messages</label>
            <label className="stack" style={{ gap: 4 }}>Send my digest at
              <select className="field" value={hour} onChange={(e) => setHour(e.target.value)}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00 (your time zone)</option>)}</select>
            </label>
            <div className="row"><button className="btn primary" onClick={save}>Save schedule</button><button className="btn" onClick={sendTest}>Send a test message</button><button className="btn" onClick={unlink}>Unlink Telegram</button></div>
          </>
        ) : !botUsername ? (
          <p className="lead">Telegram is not set up on this site yet.</p>
        ) : (
          <>
            <p><span className="pill warn">Not linked</span> {pending && <span className="meta"><span className="spinner" aria-hidden="true" />Waiting for you to press Start in Telegram</span>}</p>
            <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>
              <li>Press &quot;Link Telegram&quot; to get a one-time link (valid 15 minutes).</li>
              <li>Open it in Telegram and press Start.</li>
              <li>This page notices the link on its own and shows a green Linked mark.</li>
            </ol>
            <div className="row">
              <button className="btn primary" onClick={makeLink}>Link Telegram</button>
              {link && <a className="btn" href={link} target="_blank" rel="noopener noreferrer">Open Telegram</a>}
              {link && <button className="btn" onClick={refresh}>Check link</button>}
            </div>
          </>
        )}
        {user && user.admin && (
          <div className="stack" style={{ borderTop: '1px solid var(--line, #8883)', paddingTop: 12 }}>
            <strong>Owner: bot connection</strong>
            <p className="lead" style={{ fontSize: '0.88rem' }}>If the bot does not answer /start, press this. It registers the site with Telegram and checks the setup.</p>
            <div className="row"><button className="btn primary" onClick={connectBot}>Connect bot now</button></div>
            {tg && tg.diagnostics && (
              <ul className="stack" style={{ margin: 0, paddingLeft: 20, fontSize: '0.9rem' }}>
                <li>Bot: {tg.diagnostics.botUsername ? `@${tg.diagnostics.botUsername}` : 'not reachable'}</li>
                <li>Webhook: {tg.diagnostics.webhookUrl || 'none'}</li>
                {tg.diagnostics.lastError && <li>Last delivery error: {tg.diagnostics.lastError}</li>}
                {tg.diagnostics.problems.map((p, i) => <li key={i}>⚠ {p}</li>)}
                {!tg.diagnostics.problems.length && <li>✓ Everything looks right.</li>}
              </ul>
            )}
          </div>
        )}
        <p className="lead" style={{ fontSize: '0.88rem' }}>Send /stop to the bot at any time to unlink. Your notes are never sent.</p>
      </div>

      <div className="panel stack">
        <h2>Your data</h2>
        <div className="row">
          <a className="btn" href="/api/account/export">Download my data (JSON)</a>
        </div>
        <p className="lead" style={{ fontSize: '0.88rem' }}>Includes your progress, notes, quiz history, plans and activity.</p>
      </div>

      <div className="panel stack">
        <h2>Change password</h2>
        <input className="field" type="password" placeholder="Current password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <input className="field" type="password" placeholder="New password (8+ characters)" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <div className="row"><button className="btn" onClick={changePw}>Change password</button></div>
      </div>

      <div className="panel stack">
        <h2>Report a problem</h2>
        <textarea rows={3} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="A broken link, a wrong explanation, something confusing" aria-label="Problem report" />
        <div className="row"><button className="btn" onClick={sendFb}>Send</button></div>
      </div>

      <div className="panel stack" style={{ borderColor: 'var(--bad)' }}>
        <h2>Delete account</h2>
        <p className="lead">Permanently removes your account, progress, notes and logs. This cannot be undone.</p>
        <input className="field" type="password" placeholder="Enter your password to confirm" autoComplete="current-password" value={del} onChange={(e) => setDel(e.target.value)} />
        <div className="row"><button className="btn" onClick={remove} disabled={!del}>Delete my account</button></div>
      </div>
      <p className="lead" style={{ fontSize: '0.85rem' }}>{Object.keys(state.notes).length} lessons with notes · signed in since {user && new Date(user.createdAt).toLocaleDateString()}</p>
    </>
  );
}
