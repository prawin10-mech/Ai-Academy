export default function robots() {
  const base = process.env.APP_URL || '';
  return { rules: [{ userAgent: '*', allow: ['/', '/privacy'], disallow: ['/api/'] }], ...(base ? { sitemap: `${base}/sitemap.xml` } : {}) };
}
