import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="shell"><main style={{ paddingBlock: 48 }}>
      <div className="stack"><h1>Page not found</h1><p className="lead">That page does not exist.</p><Link className="btn primary" href="/" style={{ alignSelf: 'flex-start' }}>Back to Today</Link></div>
    </main></div>
  );
}
