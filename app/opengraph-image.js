import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '../lib/site.js';

export const runtime = 'edge';
export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', fontSize: 34, color: '#a5b4fc', letterSpacing: 2 }}>{SITE_NAME.toUpperCase()}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, lineHeight: 1.08 }}>{SITE_TAGLINE}</div>
          <div style={{ display: 'flex', fontSize: 34, color: '#cbd5e1', marginTop: 28 }}>Agentic AI, RAG, evals and production. Free.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#94a3b8' }}>26-week roadmap · Python + JavaScript practice · Telegram daily plan</div>
      </div>
    ),
    size,
  );
}
