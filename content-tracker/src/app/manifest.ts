import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pipeline",
    short_name: "pipeline",
    description: "a quiet place for content ideas in flight.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF7F2",
    theme_color: "#FBF7F2",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
