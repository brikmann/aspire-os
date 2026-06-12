import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    staleTimes: { dynamic: 0, static: 30 },
  },
  async headers() {
    return [
      {
        // All routes except Next.js static assets (which are content-addressed
        // and safe to cache forever by hash).
        source: '/((?!_next/static|_next/image|favicon\\.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
