'use client';
// "Byte", a small study buddy. Original character, drawn in SVG. It reacts to what the learner does:
// wiggles on correct answers, celebrates passed exercises and streaks, sleeps when the streak is at risk at night.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAcademy, todayLocal } from './Providers.js';
import { petMood } from '../lib/pet.js';

const readLS = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function counters(state) {
  let correct = 0;
  for (const a of state.attempts || []) for (const q of a.qs || []) if (q.ok) correct++;
  const passed = Object.values(state.practice || {}).filter((p) => p && p.passed).length;
  const done = Object.keys(state.done || {}).length;
  return { correct, passed, done };
}

const TIPS = [
  'Small steps count. One lesson step keeps the streak alive.',
  'Stuck? Try the hint before the solution. It counts more.',
  'Try the Daily 5 quiz. It finds what to study next.',
  'Building one small project beats watching ten videos.',
  'Rate your interview answers honestly. It shows real gaps.',
  'Take a short break. Your brain saves what you learned.',
];

export default function Pet() {
  const { state, streak, mode, user } = useAcademy();
  const [on, setOn] = useState(true);
  const [reaction, setReaction] = useState(null); // 'wiggle' | 'jump' | 'party'
  const [say, setSay] = useState('');
  const [tipIx, setTipIx] = useState(0);
  const prev = useRef(null);
  const timer = useRef(null);

  useEffect(() => { setOn(readLS('ai-academy-pet') !== 'off'); const f = () => setOn(readLS('ai-academy-pet') !== 'off'); window.addEventListener('academy:pet', f); return () => window.removeEventListener('academy:pet', f); }, []);

  const c = useMemo(() => counters(state), [state]);
  const speak = (text, reaction2, ms = 4500) => {
    clearTimeout(timer.current);
    setSay(text); setReaction(reaction2 || null);
    timer.current = setTimeout(() => { setSay(''); setReaction(null); }, ms);
  };

  useEffect(() => {
    if (!on) return;
    const p = prev.current;
    prev.current = c;
    if (!p) return; // first render: no reaction to old progress
    if (c.passed > p.passed) speak('You passed it! Tests are green. Nice work.', 'party');
    else if (c.correct > p.correct) speak('Correct!', 'wiggle', 2200);
    else if (c.done > p.done) speak('Step done. Keep going.', 'jump', 2800);
  }, [c]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayLocal();
  const hour = new Date().getHours();
  const mood = petMood({ streak, activeToday: !!(state.days && state.days[today]), hour });
  const name = 'Byte';

  useEffect(() => () => clearTimeout(timer.current), []);
  if (!on || mode === 'loading' || mode === 'anon') return null;

  const poke = () => {
    if (mood === 'sleepy') return speak('Zzz... it is late. See you tomorrow?', 'wiggle');
    const line = streak >= 2 && tipIx % 3 === 0 ? `${streak} day streak. I am proud of you.` : TIPS[tipIx % TIPS.length];
    setTipIx(tipIx + 1);
    speak(`${user && user.name ? `${user.name.split(' ')[0]}, ` : ''}${line}`, mood === 'proud' ? 'jump' : 'wiggle', 6000);
  };

  return (
    <div className={`pet mood-${mood}${reaction ? ` is-${reaction}` : ''}`}>
      {say && <div className="pet-say" role="status">{say}</div>}
      <button className="pet-btn" onClick={poke} aria-label={`${name}, your study buddy. Press to hear a tip.`}>
        <svg viewBox="0 0 120 120" width="84" height="84" aria-hidden="true">
          <ellipse className="pet-shadow" cx="60" cy="112" rx="28" ry="5" />
          <g className="pet-body-g">
            <path className="pet-antenna" d="M60 26 C58 14 64 10 68 6" fill="none" strokeWidth="4" strokeLinecap="round" />
            <circle className="pet-bulb" cx="69" cy="6" r="5" />
            <rect className="pet-body" x="20" y="24" width="80" height="76" rx="34" />
            <rect className="pet-belly" x="38" y="62" width="44" height="30" rx="16" />
            <ellipse className="pet-cheek" cx="34" cy="70" rx="7" ry="4.5" />
            <ellipse className="pet-cheek" cx="86" cy="70" rx="7" ry="4.5" />
            <g className="pet-eyes">
              <g className="pet-eye-open"><circle cx="46" cy="56" r="8" className="pet-eye" /><circle cx="74" cy="56" r="8" className="pet-eye" /><circle cx="48.5" cy="53.5" r="2.6" className="pet-glint" /><circle cx="76.5" cy="53.5" r="2.6" className="pet-glint" /></g>
              <g className="pet-eye-shut"><path d="M38 58 Q46 50 54 58" className="pet-lid" /><path d="M66 58 Q74 50 82 58" className="pet-lid" /></g>
            </g>
            <path className="pet-mouth pet-mouth-happy" d="M52 74 Q60 84 68 74" />
            <path className="pet-mouth pet-mouth-worried" d="M53 80 Q60 73 67 80" />
            <ellipse className="pet-mouth-o" cx="60" cy="78" rx="3.5" ry="2.5" />
            <rect className="pet-foot" x="34" y="96" width="18" height="10" rx="5" />
            <rect className="pet-foot" x="68" y="96" width="18" height="10" rx="5" />
            {/* theme accessories: shown by CSS depending on the active theme */}
            <g className="acc acc-spooky"><path d="M30 30 L60 -6 L90 30 Z" className="acc-hat" /><rect x="24" y="26" width="72" height="8" rx="4" className="acc-hat-band" /></g>
            <g className="acc acc-hero"><path d="M26 52 Q60 40 94 52 L94 62 Q60 54 26 62 Z" className="acc-mask" /></g>
            <g className="acc acc-neon"><rect x="30" y="47" width="26" height="18" rx="7" className="acc-glass" /><rect x="64" y="47" width="26" height="18" rx="7" className="acc-glass" /><path d="M56 55 H64" className="acc-glass-line" /></g>
            <g className="acc acc-sunrise"><circle cx="60" cy="14" r="9" className="acc-sun" /></g>
            <g className="acc acc-genz"><path d="M84 18 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" className="acc-genz-p" /></g>
            <g className="acc acc-alpha"><path d="M24 58 Q24 22 60 22 Q96 22 96 58" className="acc-head" /><rect x="16" y="50" width="12" height="22" rx="6" className="acc-cup" /><rect x="92" y="50" width="12" height="22" rx="6" className="acc-cup" /></g>
            <g className="acc acc-webg"><path d="M60 24 L60 100 M20 62 L100 62 M30 32 L90 92 M90 32 L30 92" className="acc-web" /><circle cx="60" cy="62" r="18" className="acc-web" /><circle cx="60" cy="62" r="34" className="acc-web" /></g>
            <g className="acc acc-crown"><path d="M42 26 L46 12 L54 22 L60 8 L66 22 L74 12 L78 26 Z" className="acc-crown-p" /></g>
          </g>
          <g className="pet-z"><text x="86" y="30">z</text><text x="96" y="18" className="z2">z</text></g>
          <g className="pet-spark"><path d="M14 30 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3z" /><path d="M104 44 l2.5 5 5 2.5 -5 2.5 -2.5 5 -2.5 -5 -5 -2.5 5 -2.5z" /></g>
        </svg>
      </button>
    </div>
  );
}

export function PetToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(readLS('ai-academy-pet') !== 'off'); }, []);
  const flip = () => { const next = !on; setOn(next); writeLS('ai-academy-pet', next ? 'on' : 'off'); window.dispatchEvent(new Event('academy:pet')); };
  return <label className="row"><input type="checkbox" checked={on} onChange={flip} /> Show Byte, my study buddy</label>;
}
