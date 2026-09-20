import type { MetadataRoute } from "next";

export function GET(request: Request) {
  const host = (request.headers.get("host") || new URL(request.url).host).split(":")[0].toLowerCase();
  const isSubdomain = host === "youtube.duongnt.io.vn" || host === "youtube.localhost" || host.startsWith("youtube.localhost.");
  const appPath = isSubdomain ? "/" : "/youtube";

  const manifest: MetadataRoute.Manifest = {
    id: appPath,
    name: "DuongTube",
    short_name: "DuongTube",
    description: "Khám phá video, tạo hàng đợi và nghe nhạc cùng DuongTube.",
    lang: "vi-VN",
    start_url: `${appPath}?source=pwa`,
    scope: appPath,
    // Keep playback in the browser context. Chromium/WebView standalone mode
    // suspends the embedded YouTube player when the app is backgrounded.
    display: "browser",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/youtube-assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/youtube-assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/youtube-assets/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    prefer_related_applications: false,
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache",
      "Vary": "Host",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
