'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAcademy } from './Providers.js';

const MAIN = [
  ['/', 'Today'],
  ['/roadmap', 'Roadmap'],
  ['/courses', 'Courses'],
  ['/practice', 'Practice'],
  ['/career', 'Career'],
  ['/radar', 'Radar'],
];
const MORE = [
  ['/papers', 'Papers'],
  ['/glossary', 'Glossary'],
  ['/notes', 'Notes'],
  ['/progress', 'Progress'],
  ['/logs', 'Activity'],
  ['/settings', 'Settings'],
];

export default function Shell({ children }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { sync, mode, user, logout } = useAcademy();
  const active = (href) => (href === '/' ? pathname === '/' || pathname === '/quiz' || pathname === '/start' : pathname.startsWith(href));
  return (
    <div className="shell">
      <header className="top">
        <div className="brand">AI Engineer <span>Academy</span></div>
        <nav className="nav" aria-label="Sections">
          {MAIN.map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}>{label}</Link>)}
        </nav>
        <span className="status" role="status">{mode === 'guest' ? `Guest · ${sync}` : sync}</span>
        <nav className="nav sub top2" aria-label="More">
          {MORE.map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}>{label}</Link>)}
          {mode === 'guest'
            ? <button className="linkbtn" onClick={async () => { await logout(); }}>Create account</button>
            : <button className="linkbtn" onClick={async () => { await logout(); router.push('/'); }}>Sign out{user && user.name ? ` (${user.name})` : ''}</button>}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="foot">
        <span>Learning resources link to their original providers. <Link href="/privacy">Privacy and terms</Link></span>
      </footer>
    </div>
  );
}
