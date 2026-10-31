import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/dmx", name: "Tổng hợp số liệu ĐMX", short_name: "Số liệu ĐMX",
    description: "Đọc ảnh báo cáo ĐMX ngay trên thiết bị và tạo bảng số liệu.", lang: "vi-VN",
    start_url: "/dmx?source=pwa", scope: "/dmx", display: "standalone", orientation: "any",
    background_color: "#f3f7ff", theme_color: "#3159ea", categories: ["business", "productivity"],
    icons: [
      { src: "/dmx-assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/dmx-assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/dmx-assets/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
