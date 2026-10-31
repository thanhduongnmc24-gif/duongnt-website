import type { NextConfig } from "next";

if (!process.env.NODE_OPTIONS?.includes("max-old-space-size")) {
  process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    "--max-old-space-size=4096",
  ]
    .filter(Boolean)
    .join(" ");
}

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  serverExternalPackages: [
    "googleapis",
    "@distube/ytdl-core",
    "isomorphic-dompurify",
    "jsdom",
  ],
  experimental: {
    cssChunking: "strict",
    webpackMemoryOptimizations: true,
    preloadEntriesOnStart: false,
  },
};

export default nextConfig;
