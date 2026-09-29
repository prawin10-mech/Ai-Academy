'use client';
import { useState } from 'react';
import whatsnew from '../../data/whatsnew.json';
import { useAcademy } from '../../components/Providers.js';
import { VENDORS } from '../../lib/radar.js';

export default function Radar() {
  const { radar, feed } = useAcademy();
  const [vendor, setVendor] = useState('all');
  const vendors = VENDORS.map((v) => v[0]);
  const items = radar.filter((r) => vendor === 'all' || r.vendor === vendor);

  return (
    <>
      <div className="stack">
        <div className="eyebrow">Updated every day</div>
        <h1>AI radar</h1>
        <p className="lead">New models and tools from OpenAI (GPT), Google (Gemini), Meta (Llama), Anthropic (Claude), xAI (Grok), Groq, Mistral, DeepSeek and Qwen, plus what is trending on Hugging Face and Hacker News. Headlines come straight from the sources. Open them, then ask: does this change what an AI engineer must know?</p>
      </div>

      {whatsnew.items.length > 0 && (
        <section className="stack">
          <h2>What changed for your skills</h2>
          <p className="lead">Curated notes{whatsnew.updated ? `, last updated ${whatsnew.updated}` : ''}.</p>
          {whatsnew.items.map((w, i) => (
            <article className="panel stack" key={i}>
              <div className="row"><span className="pill accent">{w.vendor}</span><span className="pill">{w.date}</span></div>
              <h3>{w.name}</h3>
              <p>{w.what}</p>
              <p className="lead"><strong>Why it matters for a job:</strong> {w.why}</p>
              {w.url && <a href={w.url} target="_blank" rel="noopener noreferrer">Source</a>}
            </article>
          ))}
        </section>
      )}

      <section className="stack">
        <h2>Latest headlines</h2>
        <div className="filters" role="group" aria-label="Vendor">
          <button className="chip" aria-pressed={vendor === 'all'} onClick={() => setVendor('all')}>All</button>
          {vendors.map((v) => <button key={v} className="chip" aria-pressed={vendor === v} onClick={() => setVendor(v)}>{v}</button>)}
        </div>
        {!items.length ? (
          <div className="panel flat"><p className="lead">{radar.length ? 'Nothing from this vendor in the last few days.' : 'The radar fills after the next daily update.'}</p></div>
        ) : (
          <div className="panel stack">
            {items.map((r) => (
              <div key={r.id} className="row between">
                <span><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a>{r.date ? <span className="meta lead"> · {r.date}</span> : null}</span>
                <span className="row">{r.vendor && <span className="pill accent">{r.vendor}</span>}<span className="pill">{r.source}</span></span>
              </div>
            ))}
          </div>
        )}
      </section>

      {feed.length > 0 && (
        <section className="stack">
          <h2>New research papers</h2>
          <div className="panel stack">
            {feed.slice(0, 8).map((p) => <div key={p.id} className="row between"><a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a><span className="pill">{p.source}</span></div>)}
          </div>
        </section>
      )}
    </>
  );
}
