import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.MOOD_RATER_TARGET === 'static' ? 'export' : process.env.MOOD_RATER_TARGET === 'cloudflare' ? undefined : 'standalone',
  ...(process.env.MOOD_RATER_TARGET === 'static' ? {
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
