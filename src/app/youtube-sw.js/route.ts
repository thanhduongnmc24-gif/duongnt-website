export function GET(request: Request) {
  const host = (request.headers.get("host") || new URL(request.url).host).split(":")[0].toLowerCase();
  const isSubdomain = host === "youtube.duongnt.io.vn" || host === "youtube.localhost" || host.startsWith("youtube.localhost.");

  // Cache only the offline screen and app icons. Streaming responses, range
  // requests, API data and versioned Next.js chunks must go straight to network.
  const code = `
const APP_AT_ROOT = ${JSON.stringify(isSubdomain)};
const CACHE_PREFIX = "duongtube-pwa-" + (APP_AT_ROOT ? "root" : "preview") + "-";
const CACHE_NAME = CACHE_PREFIX + "v3";
const OFFLINE_URL = "/youtube-assets/offline.html";
const ASSETS = [OFFLINE_URL, "/youtube-assets/icon.svg", "/youtube-assets/icon-192.png", "/youtube-assets/icon-512.png", "/youtube-assets/icon-maskable-512.png", "/youtube-assets/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) =>
      (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) || /^duongtube-v[12]$/.test(key)
    ).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// An installed app applies updates when the user is ready, so playback is not
// interrupted by an automatic reload during a listening session.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.has("range") || url.pathname.startsWith("/api/")) return;

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) =>
      (await cache.match(url.pathname)) || fetch(request)
    ));
    return;
  }

  const isAppPage = APP_AT_ROOT || url.pathname === "/youtube" || url.pathname.startsWith("/youtube/");
  if (request.mode !== "navigate" || !isAppPage) return;
  event.respondWith(fetch(request).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(OFFLINE_URL)) || new Response("DuongTube đang ngoại tuyến. Hãy kết nối mạng và thử lại.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }));
});
`;

  return new Response(code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": isSubdomain ? "/" : "/youtube",
      "Vary": "Host",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; connect-src 'self'",
    },
  });
}
