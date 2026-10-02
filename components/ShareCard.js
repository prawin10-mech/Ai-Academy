'use client';
import { useState } from 'react';
import { COURSES, ROADMAP, todayLocal, useAcademy } from './Providers.js';
import { totals } from '../lib/scoring.js';
import { cardQuery } from '../lib/site.js';
import { SITE_NAME } from '../lib/site.js';

// Lets a learner share a picture of their progress. Name is off by default; only small numbers go into the link.
export default function ShareCard() {
  const { state, streak, user } = useAcademy();
  const [showName, setShowName] = useState(false);
  const [msg, setMsg] = useState('');
  const today = todayLocal();
  const days = state.startedAt ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${state.startedAt}T00:00:00Z`)) / 86400000) : 0;
  const week = Math.max(1, Math.min(ROADMAP.weeks.length, Math.floor(days / 7) + 1));
  const solved = Object.values(state.practice || {}).filter((p) => p && p.passed).length;
  const first = user && user.name ? String(user.name).trim().split(/\s+/)[0] : '';
  const q = cardQuery({ week, streak, lessons: totals(state, COURSES).done, solved, name: showName ? first : '' });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = `${origin}/s?${q}`;
  const text = `I'm on week ${week} of the ${SITE_NAME} roadmap: ${streak}-day streak, ${solved} exercises solved. Free path to AI engineering:`;

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: SITE_NAME, text, url: link }); return; }
      await navigator.clipboard.writeText(`${text} ${link}`);
      setMsg('Copied. Paste it anywhere.');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      setMsg('Could not share from here. Long-press the link below to copy it.');
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setMsg('Link copied.'); } catch { setMsg('Could not copy. Long-press the link below.'); }
  };

  return (
    <div className="panel stack">
      <h2>Share my progress</h2>
      <p className="lead">A picture card of your week, streak and counts. Anyone with the link can see it.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/card?${q}`} alt="Your progress card" width={1200} height={630} style={{ width: '100%', height: 'auto', borderRadius: 12 }} loading="lazy" />
      {first && <label className="row"><input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} /> Show my first name ({first}) on the card</label>}
      <div className="row"><button className="btn primary" onClick={share}>Share</button><button className="btn" onClick={copy}>Copy link</button></div>
      <p className="meta" style={{ wordBreak: 'break-all' }}>{link}</p>
      {msg && <p role="status" className="meta">{msg}</p>}
    </div>
  );
}
