// Visual themes. Every look here is original: colours and patterns only, no logos, names or characters from films or comics.
export const SKINS = [
  { id: 'auto', label: 'Automatic', note: 'Classic, with a special look in season (spooky in late October)' },
  { id: 'daily', label: 'Change every day', note: 'A different look each day of the week' },
  { id: 'classic', label: 'Classic', note: 'Calm blue and teal, follows your light or dark setting', swatch: ['#0a6c86', '#eef2f5', '#15222e'] },
  { id: 'hero', label: 'Hero comics', note: 'Bold red and blue with a comic-book dot pattern', swatch: ['#d62839', '#1f3fae', '#fff8ec'] },
  { id: 'spooky', label: 'Spooky night', note: 'Pumpkin orange and purple, made for Halloween', swatch: ['#ff8a1f', '#7c3aed', '#150d22'] },
  { id: 'neon', label: 'Neon night', note: 'Dark with electric cyan and pink', swatch: ['#22e6d0', '#ff3fa4', '#0b0f1e'] },
  { id: 'genz', label: 'Gen Z', note: 'Lavender, lime and hot pink with chunky sticker cards', swatch: ['#7c4dff', '#c6ff3d', '#ff4fa3'] },
  { id: 'genalpha', label: 'Gen Alpha', note: 'Game-night navy with electric yellow and green', swatch: ['#ffd400', '#2bff88', '#101a3d'] },
  { id: 'web', label: 'Web hero', note: 'Dark red and blue with a spider-web pattern', swatch: ['#e01e37', '#1b4bd8', '#0d1020'] },
  { id: 'cyber', label: 'Cyberpunk', note: 'Black with acid yellow, cyan and red, scan lines and glitch headings', swatch: ['#fcee0a', '#00f0ff', '#ff003c'] },
  { id: 'sunsetcity', label: 'Sunset city', note: 'Retro city at dusk: hot pink, orange and teal with a striped sun', swatch: ['#ff4d8d', '#ff9e40', '#2de2e6'] },
  { id: 'sunrise', label: 'Sunrise', note: 'Warm cream, coral and gold', swatch: ['#e4572e', '#f2b134', '#fff6e8'] },
];
// Google Fonts loaded only for the look in use. Headings and body text are chosen to stay easy to read.
export const FONTS = {
  classic: 'family=Familjen+Grotesk:wght@500;700&family=Source+Sans+3:wght@400;600',
  hero: 'family=Bangers&family=Nunito:wght@400;600;700',
  spooky: 'family=Grenze+Gotisch:wght@600;800&family=Alegreya+Sans:wght@400;500;700',
  neon: 'family=Rajdhani:wght@500;700&family=Exo+2:wght@400;500;600&family=Share+Tech+Mono',
  genz: 'family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Outfit:wght@400;500;600',
  genalpha: 'family=Lilita+One&family=Baloo+2:wght@400;500;600;700',
  web: 'family=Oswald:wght@500;700&family=Barlow:wght@400;500;600',
  cyber: 'family=Orbitron:wght@600;800&family=Chakra+Petch:wght@400;500;600',
  sunsetcity: 'family=Bungee&family=Poppins:wght@400;500;600',
  sunrise: 'family=Fraunces:opsz,wght@9..144,600;9..144,800&family=DM+Sans:wght@400;500;700',
};
export const SKIN_IDS = SKINS.map((s) => s.id);
const LOOKS = ['classic', 'hero', 'spooky', 'neon', 'sunrise', 'genz', 'genalpha', 'web', 'cyber', 'sunsetcity'];
const WEEK = ['sunsetcity', 'classic', 'genz', 'web', 'cyber', 'genalpha', 'hero']; // Sunday first

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
