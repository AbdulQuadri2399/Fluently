import type { NextConfig } from "next";

// D21 (04): cacheComponents/partialPrefetching off — every page is per-user and dynamic.
const nextConfig: NextConfig = {
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
