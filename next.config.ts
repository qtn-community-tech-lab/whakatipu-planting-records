import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side (one dist dir each).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Reference images load directly in the browser (components use unoptimized).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      {
        protocol: "https",
        hostname: "thumb.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      {
        protocol: "https",
        hostname: "inaturalist-open-data.s3.amazonaws.com",
        pathname: "/photos/**",
      },
    ],
  },
  // The CSVs are read from disk at runtime; ship them with the server build.
  outputFileTracingIncludes: {
    "/**": ["./docs/planning/prototype/*.csv"],
  },
  allowedDevOrigins: ["http://localhost:3000", "127.0.0.1"],
};

export default nextConfig;
