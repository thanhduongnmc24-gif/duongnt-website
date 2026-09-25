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
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require, Response, Headers, URL });
  return exports;
}
const manifestRoute = await loadRoute("src/app/lichlamviec-manifest.webmanifest/route.ts");
const workerRoute = await loadRoute("src/app/lichlamviec-sw.js/route.ts");
const proxyRoute = await loadRoute("src/proxy.ts");

test("manifest cài ứng dụng trong /lichlamviec", async () => {
  const response = manifestRoute.GET(); const manifest = await response.json();
  assert.equal(manifest.scope, "/lichlamviec"); assert.equal(manifest.id, "/lichlamviec"); assert.equal(manifest.start_url, "/lichlamviec?source=pwa"); assert.equal(manifest.display, "standalone");
});

test("biểu tượng PNG có đúng kích thước", async () => {
  for (const [filename, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const bytes = await readFile(new URL(`../public/lichlamviec-assets/${filename}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG"); assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
  }
});

test("proxy chỉ đặt ngữ cảnh ứng dụng cho đúng đường dẫn", () => {
  const app = proxyRoute.proxy(new NextRequest("https://duongnt.io.vn/lichlamviec", { headers: { host: "duongnt.io.vn" } }));
  assert.equal(app.headers.get("x-middleware-request-x-lichlamviec-app"), "1");
  const main = proxyRoute.proxy(new NextRequest("https://duongnt.io.vn/", { headers: { host: "duongnt.io.vn", "x-lichlamviec-app": "1" } }));
  assert.equal(main.headers.get("x-middleware-request-x-lichlamviec-app"), null);
});

test("service worker chỉ quản lý trang lịch và có trang ngoại tuyến", async () => {
  const response = workerRoute.GET(); assert.equal(response.headers.get("service-worker-allowed"), "/lichlamviec");
  const code = await response.text(); assert.match(code, /lichlamviec-pwa-/); assert.match(code, /offline\.html/); assert.match(code, /url\.pathname\.startsWith\("\/api\/"\)/);
});
