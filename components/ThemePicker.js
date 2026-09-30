'use client';
import { SKINS, resolveSkin } from '../lib/skins.js';
import { useAcademy } from './Providers.js';
import { PetToggle } from './Pet.js';

export default function ThemePicker() {
  const { skinPref, setSkin } = useAcademy();
  const shown = resolveSkin(skinPref);
  const current = SKINS.find((s) => s.id === shown);
  return (
    <div className="panel stack">
      <h2>Theme</h2>
      <p className="lead">Pick a look, or let it change on its own. Right now you see <strong>{current ? current.label : 'Classic'}</strong>.</p>
      <div className="themepick" role="group" aria-label="Theme">
        {SKINS.map((s) => (
          <button key={s.id} aria-pressed={skinPref === s.id} onClick={() => setSkin(s.id)}>
            <strong>{s.swatch && <span className="swatches" aria-hidden="true">{s.swatch.map((c) => <i key={c} style={{ background: c }} />)}</span>}{s.label}</strong>
            <span className="meta">{s.note}</span>
          </button>
        ))}
      </div>
      <PetToggle />
    </div>
  );
}
