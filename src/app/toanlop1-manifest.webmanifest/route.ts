export const dynamic = "force-static";

export function GET() {
  return Response.json({
    name: "Vở Toán lớp 1",
    short_name: "Toán lớp 1",
    description: "Vở bài tập Toán lớp 1 viết trực tiếp bằng Apple Pencil và chấm bài thông minh.",
    id: "/toanlop1",
    start_url: "/toanlop1?source=pwa",
    scope: "/toanlop1",
    display: "standalone",
    orientation: "any",
    background_color: "#fff8e8",
    theme_color: "#674fc1",
    lang: "vi",
    icons: [
      { src: "/toanlop1-assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/toanlop1-assets/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/toanlop1-assets/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } });
}
