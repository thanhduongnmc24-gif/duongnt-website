import type { MetadataRoute } from "next";

export function GET() {
  const appPath = "/congdoan";
  const manifest: MetadataRoute.Manifest = {
    id: appPath,
    name: "Công đoạn & sản lượng",
    short_name: "Công đoạn",
    description: "Ghi công đoạn, theo dõi sản lượng và phần trăm hoàn thành mỗi ngày.",
    lang: "vi-VN",
    start_url: `${appPath}?source=pwa`,
    scope: appPath,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f8fc",
    theme_color: "#f7f8fc",
    categories: ["productivity", "business", "utilities"],
    icons: [
      { src: "/congdoan-assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/congdoan-assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/congdoan-assets/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    prefer_related_applications: false,
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
