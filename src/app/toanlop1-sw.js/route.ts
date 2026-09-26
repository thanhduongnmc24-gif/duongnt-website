export const dynamic = "force-static";

const code = `const CACHE="toanlop1-pwa-v6";const SHELL=["/toanlop1","/toanlop1-assets/offline.html","/toanlop1-assets/icon-192.png","/toanlop1-assets/icon-512.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("toanlop1-pwa-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==location.origin||url.pathname.startsWith("/api/"))return;if(request.mode==="navigate"){event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match(request).then(found=>found||caches.match("/toanlop1-assets/offline.html"))));return}if(url.pathname.startsWith("/toanlop1-workbook/")||url.pathname.startsWith("/toanlop1-assets/")){event.respondWith(caches.match(request).then(found=>found||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response})));}});`;

export function GET() {
  return new Response(code, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/toanlop1" } });
}
