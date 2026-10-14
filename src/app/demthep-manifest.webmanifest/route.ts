import type { MetadataRoute } from "next";

export function GET() {
  const appPath = "/demthep";
  const manifest: MetadataRoute.Manifest = {
    id: appPath,
    name: "Đếm thép - Nguyễn Thanh Dương",
    short_name: "Đếm thép",
    description: "Ứng dụng đếm cây thép tự động qua Camera và Thư viện ảnh.",
    lang: "vi-VN",
    start_url: `${appPath}?source=pwa`,
    scope: appPath,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#0284c7",
    categories: ["productivity", "utilities", "business"],
    icons: [
      { src: "/demthep-assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/demthep-assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/demthep-assets/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
