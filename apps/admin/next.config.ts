import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trapwear/core", "@trapwear/db", "@trapwear/ops"],
  // Monorepo: include shared packages in serverless traces (Vercel / default Next output).
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
