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

const manifestRoute = await loadRoute("src/app/congdoan-manifest.webmanifest/route.ts");
const workerRoute = await loadRoute("src/app/congdoan-sw.js/route.ts");
const proxyRoute = await loadRoute("src/proxy.ts");

function request(host, path = "/", extraHeaders = {}) {
  return new Request(`https://${host}${path}`, { headers: { host, ...extraHeaders } });
}

test("manifest dùng gốc subdomain và giữ bản xem trước trong /congdoan", async () => {
  const cases = [
    ["congdoan.duongnt.io.vn", {}, "/"],
    ["congdoan.localhost", {}, "/"],
    ["duongnt-website.onrender.com", { "x-congdoan-proxy": "1" }, "/"],
    ["localhost:3000", {}, "/congdoan"],
    ["duongnt.io.vn", {}, "/congdoan"],
  ];
  for (const [host, headers, scope] of cases) {
    const response = manifestRoute.GET(request(host, "/", headers));
    const manifest = await response.json();
    assert.equal(manifest.scope, scope);
    assert.equal(manifest.id, scope);
    assert.equal(manifest.start_url, `${scope}?source=pwa`);
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"));
  }
});

test("các biểu tượng PNG có đúng kích thước đã khai báo", async () => {
  for (const [filename, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const bytes = await readFile(new URL(`../public/congdoan-assets/${filename}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});

test("proxy định tuyến subdomain và xóa ngữ cảnh giả mạo ở trang chính", () => {
  const main = proxyRoute.proxy(new NextRequest("https://duongnt.io.vn/bai-viet", {
    headers: { host: "duongnt.io.vn", "x-congdoan-app": "1" },
  }));
  assert.equal(main.headers.get("x-middleware-request-x-congdoan-app"), null);

  const preview = proxyRoute.proxy(new NextRequest("http://localhost:3000/congdoan", { headers: { host: "localhost:3000" } }));
  assert.equal(preview.headers.get("x-middleware-request-x-congdoan-app"), "1");
  assert.equal(preview.headers.get("x-middleware-rewrite"), null);

  const subdomain = proxyRoute.proxy(new NextRequest("https://congdoan.duongnt.io.vn/?source=pwa", {
    headers: { host: "congdoan.duongnt.io.vn" },
  }));
  assert.equal(new URL(subdomain.headers.get("x-middleware-rewrite")).pathname, "/congdoan");
  assert.equal(new URL(subdomain.headers.get("x-middleware-rewrite")).search, "?source=pwa");

  const cloudflare = proxyRoute.proxy(new NextRequest("https://duongnt-website.onrender.com/", {
    headers: { host: "duongnt-website.onrender.com", "x-congdoan-proxy": "1" },
  }));
  assert.equal(new URL(cloudflare.headers.get("x-middleware-rewrite")).pathname, "/congdoan");

  for (const path of ["/_next/static/app.js", "/congdoan-assets/icon-192.png", "/congdoan-manifest.webmanifest", "/congdoan-sw.js"]) {
    const response = proxyRoute.proxy(new NextRequest(`https://congdoan.duongnt.io.vn${path}`, {
      headers: { host: "congdoan.duongnt.io.vn" },
    }));
    assert.equal(response.headers.get("x-middleware-rewrite"), null, path);
  }
});

async function createWorker(host, headers = {}) {
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
          for (const asset of assets) cacheData.get(cacheName).set(asset, new Response(asset.endsWith("offline.html") ? "offline" : "asset"));
        },
        async match(asset) { return cacheData.get(cacheName).get(asset)?.clone(); },
      };
    },
  };
  const response = workerRoute.GET(request(host, "/", headers));
  vm.runInNewContext(await response.text(), {
    URL,
    Response,
    caches,
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
    listeners[name]({ ...extra, waitUntil: promise => { pending = promise; } });
    await pending;
  }
  async function fetchPage(path, options = {}) {
    let pending;
    listeners.fetch({
      request: { url: `https://${host}${path}`, method: "GET", mode: "navigate", headers: new Headers(), ...options },
      respondWith: promise => { pending = promise; },
    });
    return pending ? await pending : undefined;
  }
  return { response, cacheData, addedAssets, dispatch, fetchPage, counts: () => ({ claimed, skipped }) };
}

test("service worker dùng trang ngoại tuyến và không chặn API", async () => {
  const preview = await createWorker("localhost:3000");
  assert.equal(preview.response.headers.get("service-worker-allowed"), "/congdoan");
  await preview.dispatch("install");
  assert.ok(preview.addedAssets.every(path => path.startsWith("/congdoan-assets/")));
  assert.equal(await (await preview.fetchPage("/congdoan")).text(), "offline");
  assert.equal(await preview.fetchPage("/"), undefined);
  assert.equal(await preview.fetchPage("/api/data"), undefined);
  assert.equal(await preview.fetchPage("/congdoan", { method: "POST" }), undefined);

  const root = await createWorker("duongnt-website.onrender.com", { "x-congdoan-proxy": "1" });
  assert.equal(root.response.headers.get("service-worker-allowed"), "/");
  await root.dispatch("install");
  assert.equal(await (await root.fetchPage("/")).text(), "offline");
  root.cacheData.set("congdoan-pwa-root-old", new Map());
  root.cacheData.set("duongtube-pwa-root-v3", new Map());
  await root.dispatch("activate");
  assert.equal(root.cacheData.has("congdoan-pwa-root-old"), false);
  assert.equal(root.cacheData.has("duongtube-pwa-root-v3"), true);
  assert.equal(root.counts().claimed, 1);
});
