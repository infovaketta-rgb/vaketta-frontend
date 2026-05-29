import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Force Next.js Turbopack to treat this project directory as the root
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.vaketta.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      // Local dev: backend serves uploads at /uploads/...
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
