const isProd = process.env.NODE_ENV === 'production';

// Content Security Policy: our own scripts and API, YouTube (privacy mode) and arXiv frames, Google Fonts,
// and blob: workers for the practice lab. Next.js needs inline scripts, so 'unsafe-inline' stays for scripts.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  'frame-src https://www.youtube-nocookie.com https://arxiv.org',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // mongodb is loaded with a dynamic import on the server only.
  experimental: { serverComponentsExternalPackages: ['mongodb'] },
  async headers() {
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
    ];
    // The practice runner has its own policy (see app/api/runner/route.js), so it is left out here.
    return [{ source: '/((?!api/runner).*)', headers: isProd ? [...common, { key: 'Content-Security-Policy', value: csp }] : common }];
  },
};
export default nextConfig;
