import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Use relative path for deployment compatibility
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: {
    root: path.resolve(__dirname),
  },
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
