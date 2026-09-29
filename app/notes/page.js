'use client';
import Link from 'next/link';
import { useState } from 'react';
import { LESSONS, PAPERS, useAcademy } from '../../components/Providers.js';

export default function Notes() {
  const { state } = useAcademy();
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const f = filter.toLowerCase();

  const lessonNotes = Object.keys(state.notes)
    .filter((id) => LESSONS[id] && state.notes[id].trim())
    .map((id) => ({ key: id, title: LESSONS[id].lesson.t, sub: LESSONS[id].course.title, href: `/courses/${LESSONS[id].course.id}`, text: state.notes[id] }));
  const paperNotes = Object.keys(state.papers || {})
    .filter((id) => state.papers[id].note && state.papers[id].note.trim())
    .map((id) => {
      const p = PAPERS.find((x) => x.id === id);
      return { key: `paper:${id}`, title: p ? p.title : id, sub: 'Paper', href: '/papers', text: state.papers[id].note };
    });
  const all = [...lessonNotes, ...paperNotes];
  const items = all.filter((n) => !f || `${n.text} ${n.title} ${n.sub}`.toLowerCase().includes(f));

  const copy = async () => {
    const text = all.map((n) => `## ${n.title} (${n.sub})\n${n.text}`).join('\n\n');
    try { await navigator.clipboard.writeText(text); setMsg('Copied.'); } catch { setMsg('Copy was blocked. Select the notes below and copy them.'); }
  };

  return (
    <>
      <div className="stack">
        <div className="eyebrow">{all.length} items with notes</div>
        <h1>Notes</h1>
        <input type="search" placeholder="Search notes" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search notes" />
      </div>
      {all.length > 0 && (
        <div className="row">
          <button className="btn" onClick={copy}>Copy all notes as text</button>
          <span className="lead">{msg}</span>
        </div>
      )}
      {!items.length ? (
        <div className="panel flat">
          <p className="lead">{all.length ? 'No notes match that search.' : 'Notes you write beside a lesson or a paper collect here.'}</p>
        </div>
      ) : (
        <div className="stack">
          {items.map((n) => (
            <div className="note-item" key={n.key}>
              <div className="row between">
                <strong>{n.title}</strong>
                <Link className="linkbtn" href={n.href}>Open</Link>
              </div>
              <span className="meta lead">{n.sub}</span>
              <pre>{n.text}</pre>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
