import { siteUrl } from '../lib/site.js';

export default function sitemap() {
  const base = siteUrl();
  const now = new Date();
  return ['', '/ai-engineer-roadmap', '/privacy'].map((path) => ({ url: `${base}${path}`, lastModified: now }));
}
