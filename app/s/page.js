import Link from 'next/link';
import { SITE_NAME, cardParams, cardQuery } from '../../lib/site.js';

// Landing page for shared progress links. The preview image for chat apps and social sites comes from /api/card.
export function generateMetadata({ searchParams }) {
  const c = cardParams(searchParams);
  const img = `/api/card?${cardQuery(c)}`;
  const title = c.name ? `${c.name} is on week ${c.week} of 26 at ${SITE_NAME}` : `Week ${c.week} of 26 at ${SITE_NAME}`;
  const description = `${c.streak}-day streak, ${c.lessons} lessons done, ${c.solved} exercises solved. Join free and build your own AI engineer path.`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, images: [{ url: img, width: 1200, height: 630 }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [img] },
  };
}

export default function Shared({ searchParams }) {
  const c = cardParams(searchParams);
  return (
    <div className="stack" style={{ maxWidth: 720, margin: '0 auto', paddingBlock: 24 }}>
      <div className="brand">AI Engineer <span>Academy</span></div>
      <h1>{c.name ? `${c.name} is on week ${c.week} of 26` : `Week ${c.week} of 26`}</h1>
      <p className="lead">{c.streak}-day streak, {c.lessons} lessons done, {c.solved} exercises solved.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/card?${cardQuery(c)}`} alt="Progress card" width={1200} height={630} style={{ width: '100%', height: 'auto', borderRadius: 12 }} />
      <p className="lead">A free, job-focused path to AI engineering: agentic AI, RAG, evals and production, with Python and JavaScript practice in your browser.</p>
      <div className="row"><Link className="btn primary" href="/">Start free</Link><Link className="btn" href="/ai-engineer-roadmap">See the 26-week roadmap</Link></div>
    </div>
  );
}
