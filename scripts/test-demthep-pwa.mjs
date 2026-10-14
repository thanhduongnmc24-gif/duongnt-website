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

const manifestRoute = await loadRoute("src/app/demthep-manifest.webmanifest/route.ts");
const workerRoute = await loadRoute("src/app/demthep-sw.js/route.ts");
const proxyRoute = await loadRoute("src/proxy.ts");

function request(host, path = "/", extraHeaders = {}) {
  return new Request(`https://${host}${path}`, { headers: { host, ...extraHeaders } });
}

test("manifest luôn cài ứng dụng Đếm thép tại /demthep", async () => {
  for (const host of ["localhost:3000", "duongnt.io.vn", "duongnt-website.onrender.com"]) {
    const response = manifestRoute.GET(request(host));
    const manifest = await response.json();
    assert.equal(manifest.scope, "/demthep");
    assert.equal(manifest.id, "/demthep");
    assert.equal(manifest.start_url, "/demthep?source=pwa");
    assert.equal(manifest.display, "standalone");
    assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  }
});

test("các biểu tượng PNG của /demthep có đúng kích thước đã khai báo", async () => {
  for (const [filename, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
    ["apple-touch-icon.png", 180],
  ]) {
    const bytes = await readFile(new URL(`../public/demthep-assets/${filename}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});

test("proxy nhận diện đường dẫn /demthep và xóa ngữ cảnh giả mạo ở nơi khác", () => {
  const main = proxyRoute.proxy(
    new NextRequest("https://duongnt.io.vn/bai-viet", {
      headers: { host: "duongnt.io.vn", "x-demthep-app": "1" },
    })
  );
  assert.equal(main.headers.get("x-middleware-request-x-demthep-app"), null);

  const preview = proxyRoute.proxy(
    new NextRequest("https://duongnt.io.vn/demthep", {
      headers: { host: "duongnt.io.vn" },
    })
  );
  assert.equal(preview.headers.get("x-middleware-request-x-demthep-app"), "1");
  assert.equal(preview.headers.get("x-middleware-rewrite"), null);
});

test("service worker chỉ quản lý /demthep, có trang ngoại tuyến và không chặn API", async () => {
  const response = workerRoute.GET();
  assert.equal(response.headers.get("service-worker-allowed"), "/demthep");
  const code = await response.text();
  assert.match(code, /demthep-pwa-path-/);
  assert.match(code, /offline\.html/);
  assert.match(code, /url\.pathname\.startsWith\("\/api\/"\)/);
});

test("trang /demthep tách khỏi giao diện website chính và có đủ tính năng đếm thép", async () => {
  const root = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/app/demthep/page.tsx", import.meta.url), "utf8");
  assert.match(root, /laDemThep/);
  assert.match(root, /const laUngDung = .*laDemThep/);
  assert.match(page, /Nguyễn Thanh Dương - HPDQ01016/);
  assert.match(page, /https:\/\/byvn\.net\/demthep/);
  assert.match(page, /Lịch Sử Đếm Gần Đây/);
});
