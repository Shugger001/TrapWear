import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trapwear/ui", "@trapwear/db", "@trapwear/core", "@trapwear/ops"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Avoid Vercel/sharp native install issues; images are mostly static paths / remote URLs.
  images: { unoptimized: true },
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
