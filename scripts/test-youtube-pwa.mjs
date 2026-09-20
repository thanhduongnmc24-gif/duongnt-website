import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest } from "next/server.js";

const require = createRequire(import.meta.url);

async function loadRoute(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require, Response, Headers, URL });
  return exports;
}

const manifestRoute = await loadRoute("src/app/youtube-manifest.webmanifest/route.ts");
const workerRoute = await loadRoute("src/app/youtube-sw.js/route.ts");
const proxyRoute = await loadRoute("src/proxy.ts");

function request(host, path = "/") {
  return new Request(`https://${host}${path}`, { headers: { host } });
}

test("manifest installs the subdomain at root and keeps preview inside /youtube", async () => {
  for (const [host, scope] of [["youtube.duongnt.io.vn", "/"], ["youtube.localhost", "/"], ["localhost:3000", "/youtube"], ["duongnt.io.vn", "/youtube"]]) {
    const response = manifestRoute.GET(request(host));
    const manifest = await response.json();
    assert.equal(response.headers.get("content-type"), "application/manifest+json; charset=utf-8");
    assert.equal(manifest.scope, scope);
    assert.equal(manifest.id, scope);
    assert.equal(manifest.start_url, `${scope}?source=pwa`);
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
    assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  }
});

test("PNG install icons have their advertised physical dimensions", async () => {
  for (const [filename, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const bytes = await readFile(new URL(`../public/youtube-assets/${filename}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});

test("proxy isolates DuongTube while clearing spoofed app context on the main site", () => {
  const main = proxyRoute.proxy(new NextRequest("https://duongnt.io.vn/bai-viet", { headers: { host: "duongnt.io.vn", "x-duongtube-app": "1" } }));
  assert.equal(main.headers.get("x-middleware-request-x-duongtube-app"), null);
  const preview = proxyRoute.proxy(new NextRequest("http://localhost:3000/youtube", { headers: { host: "localhost:3000" } }));
  assert.equal(preview.headers.get("x-middleware-request-x-duongtube-app"), "1");
  assert.equal(preview.headers.get("x-middleware-rewrite"), null);
  const subdomain = proxyRoute.proxy(new NextRequest("https://youtube.duongnt.io.vn/?q=music", { headers: { host: "youtube.duongnt.io.vn" } }));
  assert.equal(new URL(subdomain.headers.get("x-middleware-rewrite")).pathname, "/youtube");
  assert.equal(new URL(subdomain.headers.get("x-middleware-rewrite")).search, "?q=music");
  for (const path of ["/_next/static/app.js", "/api/youtube/search", "/youtube-assets/icon-192.png", "/youtube-manifest.webmanifest", "/youtube-sw.js"]) {
    const response = proxyRoute.proxy(new NextRequest(`https://youtube.duongnt.io.vn${path}`, { headers: { host: "youtube.duongnt.io.vn" } }));
    assert.equal(response.headers.get("x-middleware-rewrite"), null, path);
  }
});

async function createWorker(host) {
  const listeners = {};
  const cacheData = new Map();
  const addedAssets = [];
  let claimed = 0;
  let skipped = 0;
  const caches = {
    async keys() { return [...cacheData.keys()]; },
    async delete(key) { return cacheData.delete(key); },
    async open(cacheName) {
      if (!cacheData.has(cacheName)) cacheData.set(cacheName, new Map());
      return {
        async addAll(assets) {
          addedAssets.push(...assets);
          for (const asset of assets) cacheData.get(cacheName).set(asset, new Response(asset === "/youtube-assets/offline.html" ? "offline screen" : "icon"));
        },
        async match(asset) { return cacheData.get(cacheName).get(asset)?.clone(); },
      };
    },
  };
  const response = workerRoute.GET(request(host));
  vm.runInNewContext(await response.text(), {
    URL, Response, caches,
    fetch: async () => { throw new TypeError("offline"); },
    self: {
      location: { origin: `https://${host}` },
      clients: { claim: async () => { claimed += 1; } },
      skipWaiting: () => { skipped += 1; },
      addEventListener: (name, callback) => { listeners[name] = callback; },
    },
  });
  async function dispatch(name, extra = {}) {
    let pending;
    listeners[name]({ ...extra, waitUntil: (promise) => { pending = promise; } });
    await pending;
  }
  async function fetchPage(path, options = {}) {
    let response;
    listeners.fetch({
      request: { url: `https://${host}${path}`, method: "GET", mode: "navigate", headers: new Headers(), ...options },
      respondWith: (promise) => { response = promise; },
    });
    return response ? await response : undefined;
  }
  return { response, listeners, dispatch, fetchPage, cacheData, addedAssets, counts: () => ({ claimed, skipped }) };
}

test("worker returns offline fallback without caching API or media and scopes preview safely", async () => {
  const worker = await createWorker("localhost:3000");
  assert.equal(worker.response.headers.get("service-worker-allowed"), "/youtube");
  await worker.dispatch("install");
  assert.ok(worker.addedAssets.every((path) => path.startsWith("/youtube-assets/")));
  assert.equal((await worker.fetchPage("/youtube")).status, 200);
  assert.equal(await (await worker.fetchPage("/youtube")).text(), "offline screen");
  assert.equal(await worker.fetchPage("/"), undefined);
  assert.equal(await worker.fetchPage("/youtube-other"), undefined);
  assert.equal(await worker.fetchPage("/api/youtube/search?q=music"), undefined);
  assert.equal(await worker.fetchPage("/youtube", { headers: new Headers({ range: "bytes=0-99" }) }), undefined);
  assert.equal(await worker.fetchPage("/youtube", { method: "POST" }), undefined);
  assert.equal(await worker.fetchPage("/youtube", { mode: "cors" }), undefined);
  assert.equal(await (await worker.fetchPage("/youtube-assets/icon-192.png")).text(), "icon");
});

test("worker handles root subdomain and applies updates only when requested", async () => {
  const worker = await createWorker("youtube.duongnt.io.vn");
  assert.equal(worker.response.headers.get("service-worker-allowed"), "/");
  await worker.dispatch("install");
  assert.equal(await (await worker.fetchPage("/")).text(), "offline screen");
  assert.equal(worker.counts().skipped, 0);
  worker.cacheData.set("duongtube-v2", new Map());
  worker.cacheData.set("duongtube-pwa-root-v1", new Map());
  worker.cacheData.set("another-app", new Map());
  await worker.dispatch("activate");
  assert.equal(worker.cacheData.has("duongtube-v2"), false);
  assert.equal(worker.cacheData.has("duongtube-pwa-root-v1"), false);
  assert.equal(worker.cacheData.has("another-app"), true);
  assert.equal(worker.counts().claimed, 1);
  await worker.dispatch("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(worker.counts().skipped, 1);
});
