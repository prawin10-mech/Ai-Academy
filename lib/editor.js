// Pure helpers for the practice code editor: tokenizer, highlighter, bracket checker, re-indenter. No DOM.
const KEYWORDS = new Set('const let var function return if else for while do break continue switch case default new typeof instanceof in of try catch finally throw class extends async await yield null undefined true false this delete void static super import export from'.split(' '));
const REGEX_PREV = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);

/** Splits code into tokens: {t: type, s: start, e: end, text}. Types: com str num kw fn id punct ws other */
export function tokenizeJs(code) {
  const out = [];
  const n = code.length;
  let i = 0;
  let lastSig = ''; // last significant char or keyword, to tell regex from division
  const push = (t, s, e) => { out.push({ t, s, e, text: code.slice(s, e) }); };
  while (i < n) {
    const c = code[i];
    if (c === '\n' || c === ' ' || c === '\t' || c === '\r') { let j = i + 1; while (j < n && /[ \t\r\n]/.test(code[j])) j++; push('ws', i, j); i = j; continue; }
    if (c === '/' && code[i + 1] === '/') { let j = i; while (j < n && code[j] !== '\n') j++; push('com', i, j); i = j; continue; }
    if (c === '/' && code[i + 1] === '*') { let j = code.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; push('com', i, j); i = j; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1; let closed = false;
      while (j < n && code[j] !== '\n') { if (code[j] === '\\') { j += 2; continue; } if (code[j] === c) { closed = true; j++; break; } j++; }
      if (j > n) j = n;
      out.push({ t: 'str', s: i, e: j, text: code.slice(i, j), open: !closed }); lastSig = 'x'; i = j; continue;
    }
    if (c === '`') {
      let j = i + 1; let closed = false;
      while (j < n) { if (code[j] === '\\') { j += 2; continue; } if (code[j] === '`') { closed = true; j++; break; } j++; }
      if (j > n) j = n;
      out.push({ t: 'str', s: i, e: j, text: code.slice(i, j), open: !closed }); lastSig = 'x'; i = j; continue;
    }
    if (c === '/' && (lastSig === '' || REGEX_PREV.has(lastSig) || lastSig === 'return' || lastSig === 'typeof')) {
      let j = i + 1; let cls = false; let ok = false;
      while (j < n && code[j] !== '\n') { const d = code[j]; if (d === '\\') { j += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) { ok = true; j++; break; } j++; }
      if (ok) { while (j < n && /[a-z]/i.test(code[j])) j++; push('str', i, j); lastSig = 'x'; i = j; continue; }
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) { let j = i + 1; while (j < n && /[0-9a-zA-Z_.]/.test(code[j])) j++; push('num', i, j); lastSig = 'x'; i = j; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1; while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const w = code.slice(i, j);
      let k = j; while (k < n && (code[k] === ' ' || code[k] === '\t')) k++;
      const t = KEYWORDS.has(w) ? 'kw' : code[k] === '(' ? 'fn' : 'id';
      push(t, i, j); lastSig = KEYWORDS.has(w) ? w : 'x'; i = j; continue;
    }
    if ('()[]{}'.includes(c)) { push('punct', i, i + 1); lastSig = c === ')' || c === ']' ? 'x' : c; i++; continue; }
    push('other', i, i + 1); lastSig = c; i++;
  }
  return out;
}

const PY_KW = new Set('def class return if elif else for while in not and or is None True False import from as with try except finally raise lambda pass break continue yield global nonlocal assert del async await'.split(' '));

/** Python tokens: # comments, ' " and triple-quoted strings (with r/b/f/u prefixes), numbers, keywords. */
export function tokenizePy(code) {
  const out = [];
  const n = code.length;
  let i = 0;
  const push = (t, s, e, extra) => { out.push({ t, s, e, text: code.slice(s, e), ...extra }); };
  while (i < n) {
    const c = code[i];
    if (c === '\n' || c === ' ' || c === '\t' || c === '\r') { let j = i + 1; while (j < n && /[ \t\r\n]/.test(code[j])) j++; push('ws', i, j); i = j; continue; }
    if (c === '#') { let j = i; while (j < n && code[j] !== '\n') j++; push('com', i, j); i = j; continue; }
    const pm = /^[rRbBuUfF]{1,2}(?=['"])/.exec(code.slice(i, i + 3));
    const qi = pm ? i + pm[0].length : i;
    const q = code[qi];
    if ((q === '"' || q === "'") && (pm || c === q)) {
      const triple = code.startsWith(q.repeat(3), qi);
      let j = qi + (triple ? 3 : 1); let closed = false;
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue; }
        if (triple) { if (code.startsWith(q.repeat(3), j)) { closed = true; j += 3; break; } }
        else { if (code[j] === '\n') break; if (code[j] === q) { closed = true; j++; break; } }
        j++;
      }
      if (j > n) j = n;
      push('str', i, j, { open: !closed, triple, quote: q }); i = j; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i + 1] || ''))) { let j = i + 1; while (j < n && /[0-9a-zA-Z_.]/.test(code[j])) j++; push('num', i, j); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(code[j])) j++;
      const w = code.slice(i, j);
      let k = j; while (k < n && (code[k] === ' ' || code[k] === '\t')) k++;
      push(PY_KW.has(w) ? 'kw' : code[k] === '(' ? 'fn' : 'id', i, j); i = j; continue;
    }
    if ('()[]{}'.includes(c)) { push('punct', i, i + 1); i++; continue; }
    push('other', i, i + 1); i++;
  }
  return out;
}

export const tokenize = (code, lang = 'javascript') => (lang === 'python' ? tokenizePy(code) : tokenizeJs(code));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CLASS = { com: 'tok-com', str: 'tok-str', num: 'tok-num', kw: 'tok-kw', fn: 'tok-fn' };

/** HTML for the colour layer. A trailing newline keeps its height equal to the textarea. */
export function highlight(code, lang = 'javascript') {
  let html = '';
  for (const tk of tokenize(code, lang)) html += CLASS[tk.t] ? `<span class="${CLASS[tk.t]}">${esc(tk.text)}</span>` : esc(tk.text);
  return `${html}\n`;
}

const PAIRS = { ')': '(', ']': '[', '}': '{' };
const lineOf = (code, offset) => { let n = 1; for (let i = 0; i < offset && i < code.length; i++) if (code[i] === '\n') n++; return n; };

/** Finds unbalanced brackets and unterminated strings. Returns [{line, message}]. */
export function checkSyntax(code, lang = 'javascript') {
  const problems = [];
  const stack = [];
  for (const tk of tokenize(code, lang)) {
    if (tk.t === 'str' && tk.open && tk.triple) problems.push({ line: lineOf(code, tk.s), message: 'This triple-quoted string is never closed.' });
    else if (tk.t === 'str' && tk.open) problems.push({ line: lineOf(code, tk.s), message: tk.text[0] === '`' ? 'This template string is never closed.' : `This ${tk.text[0] === '"' ? 'double' : 'single'}-quoted string is not closed.` });
    if (tk.t !== 'punct') continue;
    const c = tk.text;
    if ('([{'.includes(c)) stack.push({ c, s: tk.s });
    else {
      const top = stack.pop();
      if (!top) problems.push({ line: lineOf(code, tk.s), message: `Extra closing "${c}" with nothing to close.` });
      else if (top.c !== PAIRS[c]) { problems.push({ line: lineOf(code, tk.s), message: `"${c}" does not match the "${top.c}" opened on line ${lineOf(code, top.s)}.` }); }
    }
  }
  for (const o of stack) problems.push({ line: lineOf(code, o.s), message: `"${o.c}" is never closed.` });
  if (lang === 'python') problems.push(...pyColonProblems(code));
  return problems.sort((a, b) => a.line - b.line).slice(0, 5);
}

const PY_BLOCK = new Set(['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with']);
/** A line that opens a block (def, if, for ...) must end with a colon. */
function pyColonProblems(code) {
  const out = [];
  const toks = tokenizePy(code).filter((t) => t.t !== 'ws');
  let depth = 0; let first = null; let last = null; let colon = false; let line = 0; let cont = false;
  const flush = () => {
    if (first && first.t === 'kw' && PY_BLOCK.has(first.text) && depth === 0 && !cont && !colon && !(last && last.text === ':')) out.push({ line, message: `Line ${line} starts a block, so it must end with ":".` });
  };
  let curLine = 0;
  for (const tk of toks) {
    const ln = lineOf(code, tk.s);
    if (ln !== curLine) {
      if (curLine && depth === 0) { flush(); first = null; last = null; colon = false; }
      if (depth === 0) { first = tk; line = ln; colon = false; last = null; }
      cont = depth > 0 || (tk.s > 0 && /\\\s*$/.test(code.slice(0, tk.s).split('\n').slice(-2, -1)[0] || ''));
      curLine = ln;
    }
    if (tk.t === 'punct') { if ('([{'.includes(tk.text)) depth++; else depth = Math.max(0, depth - 1); }
    if (tk.t !== 'com') { last = tk; if (tk.text === ':' && depth === 0) colon = true; }
  }
  if (depth === 0) flush();
  return out;
}

/** Re-indents by bracket depth with two spaces, trims trailing spaces, ends with one newline. */
export function reindent(code, size = 2, lang = 'javascript') {
  if (lang === 'python') return `${code.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n').map((l) => l.replace(/[ ]+$/, '')).join('\n').replace(/\n+$/, '')}\n`; // Python indentation is meaning, so only tidy spaces
  const src = code.replace(/\r\n?/g, '\n');
  const tokens = tokenize(src);
  const lines = src.split('\n');
  const starts = []; let o = 0;
  for (const l of lines) { starts.push(o); o += l.length + 1; }
  const protectedStarts = new Set(); // lines that begin inside a multi-line string or comment
  for (const tk of tokens) {
    if (tk.t === 'str' || tk.t === 'com') for (let li = 0; li < lines.length; li++) if (starts[li] > tk.s && starts[li] < tk.e) protectedStarts.add(li);
  }
  const lineOfOffset = (off) => { let lo = 0; let hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; } return lo; };
  const delta = new Array(lines.length).fill(0);
  const leadClosers = new Array(lines.length).fill(0);
  const seenSig = new Array(lines.length).fill(false);
  for (const tk of tokens) {
    if (tk.t === 'ws') continue;
    const li = lineOfOffset(tk.s);
    if (tk.t === 'punct') {
      if (')]}'.includes(tk.text)) { delta[li]--; if (!seenSig[li]) leadClosers[li]++; else seenSig[li] = true; }
      else delta[li]++;
    }
    if (!(tk.t === 'punct' && ')]}'.includes(tk.text))) seenSig[li] = true;
  }
  let depth = 0; const out = [];
  for (let li = 0; li < lines.length; li++) {
    if (protectedStarts.has(li)) { out.push(lines[li]); depth = Math.max(0, depth + delta[li]); continue; }
    const text = lines[li].trim();
    if (!text) { out.push(''); continue; }
    const d = Math.max(0, depth - leadClosers[li]);
    out.push(`${' '.repeat(d * size)}${text}`);
    depth = Math.max(0, depth + delta[li]);
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

/** Leading spaces of the line that contains `pos`. */
export function indentAt(code, pos) {
  const ls = code.lastIndexOf('\n', pos - 1) + 1;
  return (/^[ \t]*/.exec(code.slice(ls, pos)) || [''])[0];
}
