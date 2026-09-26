import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

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

const manifestRoute = await loadRoute("src/app/toanlop1-manifest.webmanifest/route.ts");
const workerRoute = await loadRoute("src/app/toanlop1-sw.js/route.ts");

test("manifest cài Toán lớp 1 như ứng dụng độc lập", async () => {
  const response = manifestRoute.GET();
  const manifest = await response.json();
  assert.equal(manifest.scope, "/toanlop1");
  assert.equal(manifest.id, "/toanlop1");
  assert.equal(manifest.display, "standalone");
  assert.match(manifest.start_url, /^\/toanlop1/);
});

test("biểu tượng Toán lớp 1 có đúng kích thước", async () => {
  for (const [filename, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const bytes = await readFile(new URL(`../public/toanlop1-assets/${filename}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});

test("service worker lưu trang vector để học ngoại tuyến", async () => {
  const response = workerRoute.GET();
  assert.equal(response.headers.get("service-worker-allowed"), "/toanlop1");
  const code = await response.text();
  assert.match(code, /toanlop1-workbook/);
  assert.match(code, /offline\.html/);
  assert.match(code, /url\.pathname\.startsWith\("\/api\/"\)/);
});
