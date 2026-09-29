// New-paper feed: arXiv (cs.CL, cs.LG, cs.AI) and Hugging Face daily papers. `fetchFn` is injectable for tests.
const ARXIV = 'https://export.arxiv.org/api/query?search_query=cat:cs.CL+OR+cat:cs.LG+OR+cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=40';
const HF = 'https://huggingface.co/api/daily_papers';
const KEYWORDS = /(language model|llm|transformer|attention|retrieval|rag\b|agent|reasoning|fine-?tun|instruction|alignment|diffusion|multimodal|scaling|tool use|in-context|preference|distillation|quantiz)/i;

function decode(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

export function parseArxivAtom(xml) {
  const out = [];
  const entries = String(xml).split('<entry>').slice(1);
  for (const e of entries) {
    const id = (e.match(/<id>\s*https?:\/\/arxiv\.org\/abs\/([^<\s]+?)(?:v\d+)?\s*<\/id>/) || [])[1];
    const title = decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const summary = decode((e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]);
    const published = ((e.match(/<published>([^<]+)<\/published>/) || [])[1] || '').slice(0, 10);
    const authors = [...e.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => decode(m[1]));
    if (id && title) out.push({ id, title, summary, published, authors: authors.slice(0, 4).join(', '), url: `https://arxiv.org/abs/${id}`, source: 'arXiv' });
  }
  return out;
}

export function parseHfDaily(json) {
  const arr = Array.isArray(json) ? json : [];
  const out = [];
  for (const it of arr) {
    const p = it && (it.paper || it);
    if (!p || !p.id || !p.title) continue;
    out.push({
      id: p.id,
      title: decode(p.title),
      summary: decode(p.summary || ''),
      published: String(p.publishedAt || it.publishedAt || '').slice(0, 10),
      authors: (p.authors || []).slice(0, 4).map((a) => a.name).filter(Boolean).join(', '),
      upvotes: p.upvotes || 0,
      url: `https://huggingface.co/papers/${p.id}`,
      source: 'Hugging Face',
    });
  }
  return out;
}

export function rankFeed(items, limit = 12) {
  const seen = new Set();
  const uniq = [];
  for (const it of items) {
    const key = it.id;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(it);
  }
  const score = (it) => (KEYWORDS.test(`${it.title} ${it.summary}`) ? 10 : 0) + Math.min(it.upvotes || 0, 50) / 5 + (it.source === 'Hugging Face' ? 3 : 0);
  return uniq.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

async function getText(fetchFn, url, ms = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetchFn(url, { signal: ctl.signal, headers: { 'user-agent': 'ai-academy/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

// Never throws: returns { items, errors } so one broken source does not stop the daily job.
export async function fetchFeed(fetchFn = fetch) {
  const errors = [];
  let all = [];
  try { all = all.concat(parseArxivAtom(await getText(fetchFn, ARXIV))); } catch (e) { errors.push(`arXiv: ${e.message}`); }
  try { all = all.concat(parseHfDaily(JSON.parse(await getText(fetchFn, HF)))); } catch (e) { errors.push(`Hugging Face: ${e.message}`); }
  return { items: rankFeed(all), errors };
}
