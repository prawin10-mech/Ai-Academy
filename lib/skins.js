// Visual themes. Every look here is original: colours and patterns only, no logos, names or characters from films or comics.
export const SKINS = [
  { id: 'auto', label: 'Automatic', note: 'Classic, with a special look in season (spooky in late October)' },
  { id: 'daily', label: 'Change every day', note: 'A different look each day of the week' },
  { id: 'classic', label: 'Classic', note: 'Calm blue and teal, follows your light or dark setting', swatch: ['#0a6c86', '#eef2f5', '#15222e'] },
  { id: 'hero', label: 'Hero comics', note: 'Bold red and blue with a comic-book dot pattern', swatch: ['#d62839', '#1f3fae', '#fff8ec'] },
  { id: 'spooky', label: 'Spooky night', note: 'Pumpkin orange and purple, made for Halloween', swatch: ['#ff8a1f', '#7c3aed', '#150d22'] },
  { id: 'neon', label: 'Neon night', note: 'Dark with electric cyan and pink', swatch: ['#22e6d0', '#ff3fa4', '#0b0f1e'] },
  { id: 'sunrise', label: 'Sunrise', note: 'Warm cream, coral and gold', swatch: ['#e4572e', '#f2b134', '#fff6e8'] },
];
export const SKIN_IDS = SKINS.map((s) => s.id);
const LOOKS = ['classic', 'hero', 'spooky', 'neon', 'sunrise'];
const WEEK = ['sunrise', 'classic', 'hero', 'neon', 'classic', 'hero', 'neon']; // Sunday first

/** Special looks that apply on certain dates. */
export function seasonal(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 10 && d >= 15) || (m === 11 && d === 1)) return 'spooky';
  return null;
}

/** Turns the learner's choice into a concrete look for the given day. */
export function resolveSkin(pref, date = new Date()) {
  if (LOOKS.includes(pref)) return pref;
  const special = seasonal(date);
  if (special) return special;
  if (pref === 'daily') return WEEK[date.getDay()];
  return 'classic';
}
