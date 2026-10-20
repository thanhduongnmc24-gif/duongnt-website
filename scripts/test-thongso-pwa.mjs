import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
async function loadRoute(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require, Response, Headers, URL });
  return exports;
}

const manifestRoute = await loadRoute("src/app/thongso-manifest.webmanifest/route.ts");
const workerRoute = await loadRoute("src/app/thongso-sw.js/route.ts");

test("PWA Xưởng cán mở mặc định trang Thông số", async () => {
  const manifest = await manifestRoute.GET().json();
  assert.equal(manifest.id, "/thongso");
  assert.equal(manifest.start_url, "/thongso?source=pwa");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
});

test("service worker quản lý cả Thông số và Lịch làm việc", async () => {
  const response = workerRoute.GET();
  assert.equal(response.headers.get("service-worker-allowed"), "/");
  const code = await response.text();
  assert.match(code, /url\.pathname === "\/thongso"/);
  assert.match(code, /url\.pathname === "\/lichlamviec"/);
  assert.match(code, /url\.pathname\.startsWith\("\/api\/"\)/);
});

test("ảnh Thông số chỉ đi qua API máy chủ có xác thực", async () => {
  const page = await readFile(new URL("../src/app/thongso/page.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/app/api/thongso/anh/route.ts", import.meta.url), "utf8");
  const imageApi = await readFile(new URL("../src/app/api/thongso/anh/[id]/route.ts", import.meta.url), "utf8");
  assert.match(page, /Authorization: `Bearer \$\{token\}`/);
  assert.match(page, /capture="environment"/);
  assert.match(api, /taoSupabaseTheoToken\(token\)/);
  assert.match(api, /db\.auth\.getUser\(\)/);
  assert.match(api, /timHoacTaoThuMucThongSo/);
  assert.match(api, /image\.size > 10 \* 1024 \* 1024/);
  assert.match(page, /\?che_do=thumb/);
  assert.match(page, /async function openFullImage/);
  assert.match(imageApi, /thumbnailLink/);
  assert.match(imageApi, /max-age=3600/);
});

test("mỗi bảng có tìm kiếm và khối giới thiệu cũ đã được bỏ", async () => {
  const page = await readFile(new URL("../src/app/thongso/page.tsx", import.meta.url), "utf8");
  assert.match(page, /searchByBoard/);
  assert.match(page, /Tìm trong bảng này/);
  assert.match(page, /visibleRows/);
  assert.doesNotMatch(page, /Hồ sơ kỹ thuật xưởng/i);
});

test("cột có thể đổi vị trí và ảnh hỗ trợ chụm hai ngón tay", async () => {
  const page = await readFile(new URL("../src/app/thongso/page.tsx", import.meta.url), "utf8");
  assert.match(page, /async function moveColumn/);
  assert.match(page, /draggable onDragStart/);
  assert.match(page, /Chuyển cột.*sang trái/);
  assert.match(page, /onTouchMove=/);
  assert.match(page, /pinchDistance/);
  assert.match(page, /Chụm để phóng to/);
});

test("ảnh được lưu trên thiết bị và có thể kéo sau khi zoom", async () => {
  const page = await readFile(new URL("../src/app/thongso/page.tsx", import.meta.url), "utf8");
  assert.match(page, /caches\.open\(BO_NHO_ANH\)/);
  assert.match(page, /ngay_cap_nhat/);
  assert.match(page, /async function taiAnhCoBoNho/);
  assert.match(page, /function movePan/);
  assert.match(page, /translate3d\(/);
  assert.match(page, /onDoubleClick=/);
  assert.match(page, /Kéo để xem xung quanh/);
});

test("hai trang có thanh chuyển khu vực dùng chung", async () => {
  const [thongSo, lich, nav] = await Promise.all([
    readFile(new URL("../src/app/thongso/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/lichlamviec/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/xuong-can/xuong-can-nav.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(thongSo, /<XuongCanNav \/>/);
  assert.match(lich, /<XuongCanNav \/>/);
  assert.match(nav, /href="\/thongso"/);
  assert.match(nav, /href="\/lichlamviec"/);
});
