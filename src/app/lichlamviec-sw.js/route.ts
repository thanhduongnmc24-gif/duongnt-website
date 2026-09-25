export function GET() {
  const code = `
const CACHE_PREFIX = "lichlamviec-pwa-";
const CACHE_NAME = CACHE_PREFIX + "v1";
const OFFLINE_URL = "/lichlamviec-assets/offline.html";
const ASSETS = [OFFLINE_URL, "/lichlamviec-assets/icon.svg", "/lichlamviec-assets/icon-192.png", "/lichlamviec-assets/icon-512.png", "/lichlamviec-assets/icon-maskable-512.png", "/lichlamviec-assets/apple-touch-icon.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))));
self.addEventListener("activate", event => event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))); await self.clients.claim(); })()));
self.addEventListener("message", event => { if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || request.headers.has("range") || url.pathname.startsWith("/api/")) return;
  if (ASSETS.includes(url.pathname)) { event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match(url.pathname)) || fetch(request))); return; }
  if (request.mode !== "navigate" || !(url.pathname === "/lichlamviec" || url.pathname.startsWith("/lichlamviec/"))) return;
  event.respondWith(fetch(request).catch(async () => (await (await caches.open(CACHE_NAME)).match(OFFLINE_URL)) || new Response("Ứng dụng đang ngoại tuyến.", { status: 503 })));
});`;
  return new Response(code, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store, no-cache, must-revalidate", "Service-Worker-Allowed": "/lichlamviec", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'self'; script-src 'self'; connect-src 'self'" } });
}
