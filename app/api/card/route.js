import { ImageResponse } from 'next/og';
import { cardParams } from '../../../lib/site.js';

export const runtime = 'edge';

// Public progress card. Only small numbers and an optional first name, all clamped, so it is safe to share.
export async function GET(request) {
  const q = Object.fromEntries(new URL(request.url).searchParams);
  const c = cardParams(q);
  const stat = (value, label) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: '28px 40px', minWidth: 230 }}>
      <div style={{ display: 'flex', fontSize: 96, fontWeight: 700 }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 28, color: '#cbd5e1' }}>{label}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', fontSize: 32, color: '#a5b4fc', letterSpacing: 2 }}>AI ENGINEER ACADEMY</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 700 }}>{c.name ? `${c.name} is on week ${c.week} of 26` : `On week ${c.week} of 26`}</div>
          <div style={{ display: 'flex', fontSize: 30, color: '#cbd5e1', marginTop: 12 }}>Learning to become an AI engineer</div>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {stat(String(c.streak), c.streak === 1 ? 'day streak' : 'day streak')}
          {stat(String(c.lessons), 'lessons done')}
          {stat(String(c.solved), 'exercises solved')}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
