import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Lets several dev servers run side by side (one dist dir each).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Reference images load directly in the browser (components use unoptimized).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "inaturalist-open-data.s3.amazonaws.com", pathname: "/photos/**" },
    ],
  },
};

export default nextConfig;
