import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server blocks /_next assets for non-localhost hosts unless listed,
  // which is how phones on the LAN load the app during development.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
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
