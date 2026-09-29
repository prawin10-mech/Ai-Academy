// Daily "AI radar": new model launches and tools, pulled from public sources. Fail-soft: one broken source never stops the rest.
const HN = (q, since) => `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&numericFilters=${encodeURIComponent(`points>80,created_at_i>${since}`)}&hitsPerPage=6`;
const HN_QUERIES = ['gpt', 'gemini', 'llama', 'claude', 'grok', 'groq', 'mistral', 'deepseek', 'qwen', 'openai', 'anthropic', 'llm agent', 'mcp'];
const HF_MODELS = 'https://huggingface.co/api/models?sort=trendingScore&limit=20';
const FEEDS = [
  { name: 'Hugging Face blog', url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'OpenAI news', url: 'https://openai.com/news/rss.xml' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml' },
];

export const VENDORS = [
  ['OpenAI', /\b(gpt[- ]?\d*\w*|chatgpt|openai|sora|codex|o[1-9](-mini)?)\b/i],
  ['Google', /\b(gemini|gemma|deepmind|veo|imagen|notebooklm)\b/i],
  ['Meta', /\b(llama|meta ai)\b/i],
  ['Anthropic', /\b(claude|anthropic)\b/i],
  ['xAI', /\b(grok|xai)\b/i],
  ['Groq', /\bgroq\b/i],
  ['Mistral', /\bmistral|mixtral\b/i],
  ['DeepSeek', /\bdeepseek\b/i],
  ['Qwen', /\b(qwen|alibaba)\b/i],
];

export function vendorOf(text) {
  for (const [name, re] of VENDORS) if (re.test(text)) return name;
  return null;
}

function decode(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export function parseRss(xml, source) {
  const out = [];
  const chunks = String(xml).split(/<item[ >]|<entry[ >]/).slice(1);
  for (const c of chunks) {
    const title = decode((c.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]);
    const link = decode((c.match(/<link[^>]*>([^<]+)<\/link>/) || [])[1]) || (c.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    const d = (c.match(/<pubDate>([^<]+)<\/pubDate>/) || c.match(/<published>([^<]+)<\/published>/) || c.match(/<updated>([^<]+)<\/updated>/) || [])[1];
    const t = d ? Date.parse(d) : NaN;
    if (title && link) out.push({ id: link, title, url: link, source, date: Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10), vendor: vendorOf(title) });
  }
  return out;
}

export function parseHn(json) {
  return ((json && json.hits) || []).filter((h) => h.title && (h.url || h.objectID)).map((h) => ({
    id: `hn:${h.objectID}`,
    title: decode(h.title),
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    source: 'Hacker News',
    date: String(h.created_at || '').slice(0, 10),
    points: h.points || 0,
    vendor: vendorOf(h.title),
  }));
}

export function parseHfModels(json) {
  return (Array.isArray(json) ? json : []).filter((m) => m && (m.id || m.modelId)).map((m) => {
    const id = m.id || m.modelId;
    return { id: `hf:${id}`, title: `${id}${m.pipeline_tag ? ` (${m.pipeline_tag})` : ''}`, url: `https://huggingface.co/${id}`, source: 'Hugging Face trending', date: String(m.createdAt || '').slice(0, 10), points: Math.min(m.likes || 0, 500), vendor: vendorOf(id), kind: 'model' };
  });
}

async function getText(fetchFn, url, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetchFn(url, { signal: ctl.signal, headers: { 'user-agent': 'ai-academy/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally { clearTimeout(t); }
}

export function rankRadar(items, now = Date.now(), limit = 30) {
  const seen = new Set();
  const uniq = [];
  for (const it of items) {
    const key = (it.url || it.id).replace(/[?#].*$/, '').replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(it);
  }
  const score = (it) => {
    const ageDays = it.date ? Math.max(0, (now - Date.parse(it.date)) / 86400000) : 7;
    return (it.vendor ? 40 : 0) + Math.min(it.points || 0, 600) / 10 + Math.max(0, 30 - ageDays * 6) + (it.source === 'OpenAI news' || it.source === 'Google DeepMind' ? 15 : 0);
  };
  return uniq.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export async function fetchRadar(fetchFn = fetch, now = Date.now()) {
  const errors = [];
  const since = Math.floor(now / 1000) - 3 * 86400;
  const jobs = [
    ...HN_QUERIES.map((q) => async () => parseHn(JSON.parse(await getText(fetchFn, HN(q, since))))),
    async () => parseHfModels(JSON.parse(await getText(fetchFn, HF_MODELS))).slice(0, 8),
    ...FEEDS.map((f) => async () => parseRss(await getText(fetchFn, f.url), f.name).slice(0, 8)),
  ];
  const names = [...HN_QUERIES.map((q) => `HN:${q}`), 'HF models', ...FEEDS.map((f) => f.name)];
  const results = await Promise.allSettled(jobs.map((j) => j()));
  let all = [];
  results.forEach((r, i) => { if (r.status === 'fulfilled') all = all.concat(r.value); else errors.push(`${names[i]}: ${r.reason && r.reason.message}`); });
  // Do not flood the owner with one error per query.
  const hnFails = errors.filter((e) => e.startsWith('HN:')).length;
  const summary = errors.filter((e) => !e.startsWith('HN:'));
  if (hnFails) summary.push(`Hacker News: ${hnFails} of ${HN_QUERIES.length} queries failed`);
  return { items: rankRadar(all, now), errors: summary };
}
