import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.MOOD_RATER_TARGET === 'cloudflare' ? undefined : 'standalone',
};

export default nextConfig;
