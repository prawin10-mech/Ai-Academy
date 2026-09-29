'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAcademy } from './Providers.js';

const NAV = [
  ['/', 'Today'],
  ['/courses', 'Courses'],
  ['/papers', 'Papers'],
  ['/notes', 'Notes'],
  ['/progress', 'Progress'],
  ['/logs', 'Logs'],
];

export default function Shell({ children }) {
  const pathname = usePathname() || '/';
  const { sync } = useAcademy();
  const active = (href) => (href === '/' ? pathname === '/' || pathname === '/quiz' : pathname.startsWith(href));
  return (
    <div className="shell">
      <header className="top">
        <div className="brand">AI Engineer <span>Academy</span></div>
        <nav className="nav" aria-label="Sections">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
        <span className="status" role="status">{sync}</span>
      </header>
      <main>{children}</main>
    </div>
  );
}
