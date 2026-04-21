import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trapwear/ui", "@trapwear/db", "@trapwear/core", "@trapwear/ops"],
  // Avoid Vercel/sharp native install issues; images are mostly static paths / remote URLs.
  images: { unoptimized: true },
};

export default nextConfig;
