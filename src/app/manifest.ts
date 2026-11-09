import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FamilyVista",
    short_name: "FamilyVista",
    description: "Your family albums, beautifully organized.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/brand/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
