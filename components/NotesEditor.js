'use client';
import { useEffect, useRef, useState } from 'react';
import { useAcademy } from './Providers.js';

// Local text state keeps typing instant; the shared state is updated on every change (saving is debounced upstream).
export default function NotesEditor({ id, placeholder, templates = true, rows = 8 }) {
  const { state, setNote, ready } = useAcademy();
  const [text, setText] = useState('');
  const loadedFor = useRef(null);

  useEffect(() => {
    if (ready && loadedFor.current !== id) {
      loadedFor.current = id;
      setText(state.notes[id] || '');
    }
  }, [ready, id, state.notes]);

  const change = (v) => { setText(v); setNote(id, v); };
  const add = (p) => change(text + (text && !text.endsWith('\n') ? '\n' : '') + p);

  return (
    <div className="stack">
      {templates && (
        <div className="row">
          <button type="button" className="btn small" onClick={() => add('Takeaway: ')}>+ Takeaway</button>
          <button type="button" className="btn small" onClick={() => add('Question: ')}>+ Question</button>
          <button type="button" className="btn small" onClick={() => add('Product idea: ')}>+ Product idea</button>
        </div>
      )}
      <textarea
        rows={rows}
        value={text}
        disabled={!ready}
        onChange={(e) => change(e.target.value)}
        placeholder={ready ? placeholder || 'Write what you learned in your own words.' : 'Loading your saved notes'}
        aria-label="Notes"
      />
    </div>
  );
}
