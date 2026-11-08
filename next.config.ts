import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
  experimental: {
    authInterrupts: true,
  }
};

export default nextConfig;
