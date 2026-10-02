import Link from 'next/link';
import roadmap from '../../data/roadmap.json';
import { SITE_NAME } from '../../lib/site.js';

export const metadata = {
  title: 'AI engineer roadmap for web developers: 26 weeks',
  description: 'A free, week-by-week roadmap from web developer to AI engineer: Python for AI, LLM apps, RAG, agents, evals and production. Practice in Python and JavaScript.',
  alternates: { canonical: '/ai-engineer-roadmap' },
  openGraph: { title: 'AI engineer roadmap for web developers: 26 weeks', description: 'Week-by-week plan: LLM apps, RAG, agents, evals and production.', type: 'article' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'AI engineer roadmap for web developers',
  description: 'A 26-week, job-focused learning path covering Python for AI, LLM applications, RAG, agents, evaluation and production.',
  provider: { '@type': 'Organization', name: SITE_NAME },
  isAccessibleForFree: true,
};

export default function RoadmapPublic() {
  const weeks = roadmap.weeks || [];
  return (
    <article className="stack" style={{ maxWidth: 760, margin: '0 auto', paddingBlock: 24 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="brand">AI Engineer <span>Academy</span></div>
      <h1>AI engineer roadmap for web developers</h1>
      <p className="lead">{weeks.length} weeks, about {roadmap.hoursPerWeek} hours a week. The order is built for hiring: Python and LLM apps first, then retrieval (RAG), agents, evaluation and shipping to production. Each week has an outcome you can check.</p>
      <div className="row"><Link className="btn primary" href="/">Start free</Link><span className="meta">No card, no ads. Try it as a guest first.</span></div>
      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {weeks.map((w) => (
          <li key={w.w} className="panel stack" style={{ gap: 4 }}>
            <div className="eyebrow">Week {w.w}{w.m ? ` · Month ${w.m}` : ''}</div>
            <h2 style={{ fontSize: '1.15rem' }}>{w.title}</h2>
            <p className="lead">{w.outcome}</p>
          </li>
        ))}
      </ol>
      <div className="panel stack">
        <h2>Ready to follow it?</h2>
        <p className="lead">Tell the academy what you already know and it skips what you have covered, then tracks your progress, streak and practice.</p>
        <div className="row"><Link className="btn primary" href="/">Create a free account</Link></div>
      </div>
    </article>
  );
}
