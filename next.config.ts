import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Lets several dev servers run side by side (one dist dir each).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // No dev badge: on the full-screen map pages it sits on the Back button (bottom left). Errors still show.
  devIndicators: false,
  // Lets a phone load the dev server through an ngrok tunnel.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.dev"],
  // The planting event page's old playground address; the query (?site, &part) carries over.
  redirects: async () => [{ source: "/playground/create-planting-event", destination: "/events/new", permanent: false }],
  // Reference images load directly in the browser (components use unoptimized).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "thumb.wikimedia.org", pathname: "/wikipedia/commons/**" },
      { protocol: "https", hostname: "inaturalist-open-data.s3.amazonaws.com", pathname: "/photos/**" },
    ],
  },
  // Browsers must always fetch the latest service worker (see public/sw.js).
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
