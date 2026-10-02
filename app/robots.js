import { siteUrl } from '../lib/site.js';

export default function robots() {
  return { rules: [{ userAgent: '*', allow: ['/', '/ai-engineer-roadmap', '/privacy'], disallow: ['/api/', '/s'] }], sitemap: `${siteUrl()}/sitemap.xml` };
}
