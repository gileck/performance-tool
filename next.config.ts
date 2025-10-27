import type { NextConfig } from "next";

type NextConfigWithTurbopack = NextConfig & { turbopack?: { root?: string } };

const nextConfig: NextConfigWithTurbopack = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    // Force correct project root to avoid parent workspace/lockfile confusion
    root: process.cwd(),
  },
};

export default nextConfig;
