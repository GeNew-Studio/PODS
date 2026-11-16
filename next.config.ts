import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is served from /PODS on GitHub Pages,
// so the build sets PAGES_BASE_PATH=/PODS there. Local `npm run dev` leaves it empty.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
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
