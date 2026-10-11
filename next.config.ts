import type { NextConfig } from "next";

// Pin Turbopack's root to this project folder. A package-lock.json also exists
// one level up in "c language", and without an explicit root Next would infer
// that parent folder as the workspace root (multiple-lockfile warning).
const projectRoot = typeof __dirname === "string" ? __dirname : process.cwd();

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
