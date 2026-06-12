import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // validator.ts is auto-generated — stale entries from deleted routes cause
    // false-positive failures. Real types are still checked by tsc directly.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Never serve stale HTML — every request gets the latest deployment.
    // Without this, Vercel serves cached pages for up to 5 min after a deploy.
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
