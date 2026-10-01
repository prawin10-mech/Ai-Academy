'use client';
// A small code editor: line numbers, colours, auto-indent, auto-closing brackets, Tab indent, comment toggle, Format, live syntax warnings.
import { useEffect, useMemo, useRef, useState } from 'react';
import { checkSyntax, highlight, indentAt, reindent } from '../lib/editor.js';

const OPEN = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const CLOSE = new Set([')', ']', '}', '"', "'", '`']);

export default function CodeEditor({ value, onChange, onRun, disabled, label = 'Code editor', language = 'javascript' }) {
  const py = language === 'python';
  const unit = py ? 4 : 2;
  const pad = ' '.repeat(unit);
  const ta = useRef(null);
  const pre = useRef(null);
  const gutter = useRef(null);
  const escaped = useRef(false);
  const [problems, setProblems] = useState([]);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const html = useMemo(() => highlight(value, language), [value, language]);
  const lineCount = value.split('\n').length;

  // Warnings appear a moment after you stop typing, so half-typed code does not flash red.
  useEffect(() => { const t = setTimeout(() => setProblems(checkSyntax(value, language)), 500); return () => clearTimeout(t); }, [value, language]);

  const sync = () => {
    const t = ta.current; if (!t) return;
    if (pre.current) { pre.current.scrollTop = t.scrollTop; pre.current.scrollLeft = t.scrollLeft; }
    if (gutter.current) gutter.current.scrollTop = t.scrollTop;
  };
  const where = () => {
    const t = ta.current; if (!t) return;
    const before = t.value.slice(0, t.selectionStart);
    setCursor({ line: before.split('\n').length, col: before.length - before.lastIndexOf('\n') });
  };

  // Edits go through execCommand so the browser's undo (Ctrl+Z) keeps working; falls back to a plain update.
  const edit = (from, to, text, selStart, selEnd) => {
    const t = ta.current;
    t.focus();
    t.setSelectionRange(from, to);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch { ok = false; }
    const s = selStart ?? from + text.length;
    const e = selEnd ?? s;
    if (ok) { t.setSelectionRange(s, e); where(); return; } // synchronous, so fast typing never races the caret
    onChange(t.value.slice(0, from) + text + t.value.slice(to)); // fallback when execCommand is unavailable
    requestAnimationFrame(() => { t.setSelectionRange(s, e); where(); });
  };

  const lineRange = (v, s, e) => ({ a: v.lastIndexOf('\n', s - 1) + 1, b: (() => { const i = v.indexOf('\n', e); return i < 0 ? v.length : i; })() });

  const onKeyDown = (ev) => {
    const t = ta.current; const v = t.value; const s = t.selectionStart; const e = t.selectionEnd;
    const mod = ev.ctrlKey || ev.metaKey;
    if (ev.key === 'Escape') { escaped.current = true; return; }
    if (ev.key === 'Enter' && mod) { ev.preventDefault(); if (onRun) onRun(); return; }
    if (ev.key === 'Tab') {
      if (escaped.current) { escaped.current = false; return; } // Esc then Tab leaves the editor (keyboard users)
      ev.preventDefault();
      if (s !== e && v.slice(s, e).includes('\n') || ev.shiftKey) {
        const { a, b } = lineRange(v, s, e);
        const block = v.slice(a, b).split('\n');
        const changed = ev.shiftKey ? block.map((l) => l.replace(py ? /^( {1,4}|\t)/ : /^( {1,2}|\t)/, '')) : block.map((l) => (l ? `${pad}${l}` : l));
        const text = changed.join('\n');
        edit(a, b, text, a, a + text.length);
      } else edit(s, e, pad);
      return;
    }
    escaped.current = false;
    if (ev.key === '/' && mod) {
      ev.preventDefault();
      const { a, b } = lineRange(v, s, e);
      const block = v.slice(a, b).split('\n');
      const mark = py ? '#' : '//';
      const re = py ? /^(\s*)# ?/ : /^(\s*)\/\/ ?/;
      const all = block.filter((l) => l.trim()).every((l) => re.test(l));
      const text = block.map((l) => (!l.trim() ? l : all ? l.replace(re, '$1') : l.replace(/^(\s*)/, `$1${mark} `))).join('\n');
      edit(a, b, text, a, a + text.length);
      return;
    }
    if (ev.key === 'f' && ev.altKey && ev.shiftKey) { ev.preventDefault(); format(); return; }
    if (mod || ev.altKey) return;
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const indent = indentAt(v, s);
      const prev = v[s - 1]; const next = v[e];
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const beforeText = v.slice(lineStart, s);
      const opens = prev === '{' || prev === '(' || prev === '[';
      if (opens && OPEN[prev] === next) {
        edit(s, e, `\n${indent}${pad}\n${indent}`, s + 1 + indent.length + unit);
      } else if (opens || (py && /:\s*(#.*)?$/.test(beforeText) && !/^\s*#/.test(beforeText))) edit(s, e, `\n${indent}${pad}`);
      else if (py && /^\s*(return|pass|break|continue|raise)\b/.test(beforeText) && indent.length >= unit) edit(s, e, `\n${indent.slice(0, indent.length - unit)}`);
      else edit(s, e, `\n${indent}`);
      return;
    }
    if (ev.key === 'Backspace' && s === e && s > 0) {
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const before = v.slice(ls, s);
      if (OPEN[v[s - 1]] && OPEN[v[s - 1]] === v[s]) { ev.preventDefault(); edit(s - 1, s + 1, ''); return; }
      if (before.length >= 2 && /^ +$/.test(before)) { ev.preventDefault(); const drop = before.length % unit || unit; edit(s - drop, s, ''); }
      return;
    }
    if (ev.key.length !== 1) return;
    const ch = ev.key;
    if (CLOSE.has(ch) && v[s] === ch && s === e) { ev.preventDefault(); t.setSelectionRange(s + 1, s + 1); where(); return; } // type over the closer
    if (OPEN[ch]) {
      const quote = ch === '"' || ch === "'" || ch === '`';
      if (s !== e) { ev.preventDefault(); const inner = v.slice(s, e); edit(s, e, `${ch}${inner}${OPEN[ch]}`, s + 1, s + 1 + inner.length); return; }
      if (quote && /[A-Za-z0-9_$]/.test(v[s - 1] || '')) return; // an apostrophe inside a word
      const after = v[s] || '';
      if (after && !/[\s)\]};,.]/.test(after)) return;
      ev.preventDefault();
      edit(s, e, ch + OPEN[ch], s + 1);
    }
  };

  const format = () => {
    const t = ta.current; const next = reindent(t.value, 2, language);
    if (next !== t.value) edit(0, t.value.length, next, Math.min(t.selectionStart, next.length));
  };

  const errLines = new Set(problems.map((p) => p.line));
  return (
    <div className={`editor${disabled ? ' is-disabled' : ''}`}>
      <div className="ed-bar">
        <span className="meta">{py ? 'Python' : 'JavaScript'} · Ln {cursor.line}, Col {cursor.col}</span>
        <span className="row" style={{ gap: 8 }}>
          <button type="button" className="btn small" onClick={format} disabled={disabled} title={py ? 'Tidy spaces (Alt+Shift+F)' : 'Fix indentation (Alt+Shift+F)'}>Format</button>
        </span>
      </div>
      <div className="ed-main">
        <div className="ed-gutter" ref={gutter} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => <div key={i} className={errLines.has(i + 1) ? 'bad' : cursor.line === i + 1 ? 'cur' : ''}>{i + 1}</div>)}
        </div>
        <div className="ed-body">
          <pre className="ed-pre" ref={pre} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
          <textarea
            ref={ta} className="ed-ta" value={value} disabled={disabled} aria-label={label}
            spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" wrap="off"
            onChange={(e) => { onChange(e.target.value); where(); }}
            onKeyDown={onKeyDown} onScroll={sync} onKeyUp={where} onClick={where} onSelect={where}
          />
        </div>
      </div>
      <div className="ed-foot" role="status">
        {problems.length ? problems.map((p, i) => <div key={i} className="bad">Line {p.line}: {p.message}</div>) : <span className="meta">Tab indents · Esc then Tab leaves the editor · Ctrl+Enter runs · Ctrl+/ comments</span>}
      </div>
    </div>
  );
}
