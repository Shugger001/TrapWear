import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trapwear/ui", "@trapwear/db", "@trapwear/core", "@trapwear/ops"],
};

export default nextConfig;
