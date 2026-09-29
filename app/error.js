'use client';

// Shown if a page crashes. The browser error handler in Providers also reports it to the owner.
export default function Error({ error, reset }) {
  return (
    <div className="shell"><main style={{ paddingBlock: 48 }}>
      <div className="stack">
        <h1>Something went wrong</h1>
        <p className="lead">Your progress is saved. Try again, and if it keeps happening use Settings, Report a problem.</p>
        <div className="row"><button className="btn primary" onClick={() => reset()}>Try again</button></div>
        {process.env.NODE_ENV !== 'production' && <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error && error.message)}</pre>}
      </div>
    </main></div>
  );
}
