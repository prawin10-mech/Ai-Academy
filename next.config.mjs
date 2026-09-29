/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // mongodb is loaded with a dynamic import on the server only.
  experimental: { serverComponentsExternalPackages: ['mongodb'] },
};
export default nextConfig;
