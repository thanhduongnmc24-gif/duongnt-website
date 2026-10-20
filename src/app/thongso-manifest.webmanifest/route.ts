import type { MetadataRoute } from "next";

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/thongso",
    name: "Xưởng cán - Thông số & Lịch làm việc",
    short_name: "Xưởng cán",
    description: "Lưu thông số thiết bị và quản lý lịch làm việc trong xưởng cán.",
    lang: "vi-VN",
    start_url: "/thongso?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f3f6f9",
    theme_color: "#f3f6f9",
    categories: ["productivity", "business", "utilities"],
    icons: [
      { src: "/lichlamviec-assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/lichlamviec-assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/lichlamviec-assets/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" } });
}
