export function GET() {
  const code = `
const CACHE_PREFIX = "demthep-pwa-path-";
const CACHE_NAME = CACHE_PREFIX + "v1";
const OFFLINE_URL = "/demthep-assets/offline.html";
const ASSETS = [
  OFFLINE_URL,
  "/demthep-assets/icon.svg",
  "/demthep-assets/icon-192.png",
  "/demthep-assets/icon-512.png",
  "/demthep-assets/icon-maskable-512.png",
  "/demthep-assets/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("range") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => (await cache.match(url.pathname)) || fetch(request))
    );
    return;
  }

  const isAppPage = url.pathname === "/demthep" || url.pathname.startsWith("/demthep/");
  if (request.mode !== "navigate" || !isAppPage) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (
        (await cache.match(OFFLINE_URL)) ||
        new Response("Ứng dụng đang ngoại tuyến. Hãy kết nối mạng và thử lại.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    })
  );
});
`;

  return new Response(code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": "/demthep",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; connect-src 'self'",
    },
  });
}
