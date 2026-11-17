import type { NextConfig } from "next";

// D21 (04): cacheComponents/partialPrefetching off — every page is per-user and dynamic.
const nextConfig: NextConfig = {
  // Toolkit uploads (AC4.1) are up to 10 MB of text. Vercel itself caps request bodies at
  // 4.5 MB, so the hosted prototype accepts about 4 MB (04 D29).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
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
