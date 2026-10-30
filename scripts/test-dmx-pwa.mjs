import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ĐMX có ba loại báo cáo đầu tiên", async () => {
  const page = await readFile(new URL("../src/app/dmx/page.tsx", import.meta.url), "utf8");
  assert.match(page, /doanh_thu_thuc/);
  assert.match(page, /doanh_thu_quy_doi/);
  assert.match(page, /thi_dua/);
  assert.match(page, /capture="environment"/);
  assert.match(page, /Đọc ảnh và tạo bảng/);
  assert.match(page, /exportCsv/);
});

test("Gemini nhận ảnh ở máy chủ và trả về bảng có cấu trúc", async () => {
  const route = await readFile(new URL("../src/app/api/dmx/doc-anh/route.ts", import.meta.url), "utf8");
  assert.match(route, /GEMINI_API_KEY/);
  assert.match(route, /generateContent/);
  assert.match(route, /inlineData/);
  assert.match(route, /responseSchema/);
  assert.match(route, /KetQuaSchema/);
  assert.match(route, /vuotGioiHan/);
});

test("PWA và subdomain ĐMX được cấu hình", async () => {
  const [proxy, manifest, worker] = await Promise.all([
    readFile(new URL("../src/proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx-manifest.webmanifest/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx-sw.js/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(proxy, /dmx\.duongnt\.io\.vn/);
  assert.match(proxy, /x-dmx-app/);
  assert.match(manifest, /start_url: "\/dmx\?source=pwa"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(worker, /dmx-pwa-v1/);
});
