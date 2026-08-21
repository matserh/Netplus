import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
  allowedDevOrigins: [
    '.space-z.ai',
    '.space.chatglm.site',
  ],
};

export default nextConfig;

// Cloudflare dev-only init (no-op on Vercel/other platforms)
if (process.env.CF_PAGES === '1' || process.env.OPENNEXT_CLOUDFLARE) {
  import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
}
