import type { MetadataRoute } from "next";

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/lichlamviec",
    name: "Lịch làm việc & nghỉ luân phiên",
    short_name: "Lịch làm việc",
    description: "Theo dõi ca làm việc và ngày nghỉ luân phiên của nhân viên.",
    lang: "vi-VN",
    start_url: "/lichlamviec?source=pwa",
    scope: "/lichlamviec",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f5f7fb",
    theme_color: "#f5f7fb",
    categories: ["productivity", "business"],
    icons: [
      { src: "/lichlamviec-assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/lichlamviec-assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/lichlamviec-assets/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" } });
}
