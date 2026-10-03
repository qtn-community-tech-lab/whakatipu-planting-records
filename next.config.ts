import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side (one dist dir each).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The CSVs are read from disk at runtime; ship them with the server build.
  outputFileTracingIncludes: {
    "/**": ["./docs/planning/prototype/*.csv"],
  },
};

export default nextConfig;
