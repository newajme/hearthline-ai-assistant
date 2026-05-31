import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Workmento — AI front desk for home services",
    short_name: "Workmento",
    description:
      "Phone, SMS, WhatsApp, email, chat — every customer touchpoint qualified, quoted, and dispatched without anyone picking up the phone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7FBF8",
    theme_color: "#00C95C",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/branding/workmento-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/workmento-mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
