import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: "/home/z/my-project",
  turbopack: {
    root: "/home/z/my-project",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
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
