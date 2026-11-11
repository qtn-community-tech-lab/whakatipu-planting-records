import type { MetadataRoute } from "next";

/** Makes the app installable. Colours are Canopy's app background and primary green. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WRT restoration history",
    short_name: "WRT history",
    description: "Explore and record Whakatipu Reforestation Trust plantings by site, species, year and season.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f1ea",
    theme_color: "#1f4d34",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Record a planting", short_name: "Record", url: "/events/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Records", url: "/records", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Sites", url: "/sites", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
