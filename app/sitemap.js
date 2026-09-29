export default function sitemap() {
  const base = process.env.APP_URL || '';
  return base ? [{ url: base, lastModified: new Date() }, { url: `${base}/privacy`, lastModified: new Date() }] : [];
}
