import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 🔥 importante para Docker
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),

  // ✔ manter seus ajustes
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;