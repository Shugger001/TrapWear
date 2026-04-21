import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trapwear/db", "@trapwear/ops"],
};

export default nextConfig;
