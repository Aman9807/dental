import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
