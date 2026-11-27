import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.atherenergy.com",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "*.lvh.me:3000",
    "admin.lvh.me:3000",
    "admin.lvh.me",
    "*.lvh.me",
    "localhost",
  ],
  // The RMV registry moved under "Received Documents": keep the old address working.
  async redirects() {
    return [{ source: "/dashboard/customers/rmv", destination: "/dashboard/documents/rmv", permanent: true }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
