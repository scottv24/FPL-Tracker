import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FPL Tracker",
    short_name: "FPL Tracker",
    description: "Live FPL multi-entry charts and leaderboards",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#111827",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png",  sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512.png",  sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
};
}
