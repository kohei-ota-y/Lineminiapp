import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@luca/db", "@luca/types", "@luca/utils"],
};

export default nextConfig;
