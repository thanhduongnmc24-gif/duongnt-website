export const dynamic = "force-static";

const code = `const CACHE="dmx-pwa-v2-local-ocr";const SHELL=["/dmx","/dmx-assets/icon-192.png","/dmx-assets/icon-512.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("dmx-pwa-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{const r=event.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin||u.pathname.startsWith("/api/"))return;if(r.mode==="navigate")event.respondWith(fetch(r).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(r,copy));return response}).catch(()=>caches.match(r).then(found=>found||caches.match("/dmx"))));else if(u.pathname.startsWith("/dmx-assets/"))event.respondWith(caches.match(r).then(found=>found||fetch(r)));});`;

export function GET() { return new Response(code, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/dmx" } }); }
