import type { NextConfig } from "next";

// D21 (04): cacheComponents/partialPrefetching off — every page is per-user and dynamic.
const nextConfig: NextConfig = {
  // Toolkit uploads (AC4.1) are up to 10 MB of text. Vercel itself caps request bodies at
  // 4.5 MB, so the hosted prototype accepts about 4 MB (04 D29).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // The hidden browser that renders emails (04 D38) is a native binary: it is left out of the
  // bundle. Its files must be added to each route that renders (outputFileTracingIncludes);
  // the spike that proved this on Vercel is recorded in 04 D43.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/email-render": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
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
