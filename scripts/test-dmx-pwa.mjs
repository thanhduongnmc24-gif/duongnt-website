import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ĐMX PWA có đầy đủ chức năng: Đăng nhập Supabase, Nhân viên và Chia Target", async () => {
  const [page, modals, settingsModal, types, supabaseDmx] = await Promise.all([
    readFile(new URL("../src/app/dmx/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-modals.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-settings-modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-types.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/supabase/dmx.ts", import.meta.url), "utf8"),
  ]);

  // Đăng nhập / Tạo tài khoản & lưu trữ theo tài khoản trên Supabase
  assert.match(page, /dmx_ho_so/);
  assert.match(page, /dmx_du_lieu_ngay/);
  assert.match(page, /signInWithPassword/);
  assert.match(page, /\/api\/dmx\/dang-ky/);
  assert.match(page, /\/api\/dmx\/dong-bo/);
  assert.match(supabaseDmx, /@dmx\.internal\.duongnt\.io\.vn/);

  // Tab Nhân viên, huy chương vàng bạc đồng
  assert.match(page, /Nhân viên/);
  assert.match(types, /🥇/);
  assert.match(types, /🥈/);
  assert.match(types, /🥉/);

  // Bấm vào ngành hàng / nhân viên mở modal chi tiết
  assert.match(modals, /ModalChiTietNganhHang/);
  assert.match(modals, /ModalChiTietNhanVien/);

  // Cài đặt chia target & quản lý nhân viên
  assert.match(settingsModal, /CHIA TARGET MẶT HÀNG CHO NHÂN VIÊN/);
  assert.match(settingsModal, /DANH SÁCH NHÂN VIÊN QUẢN LÝ/);
});

test("Đọc ảnh bằng OCR trên thiết bị, không gọi Gemini hay máy chủ ngoài", async () => {
  const [page, ocr, settingsModal] = await Promise.all([
    readFile(new URL("../src/app/dmx/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-ocr.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-settings-modal.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /thucHienOCR/);
  assert.match(page, /phanTichThiDuaOffline/);
  assert.match(page, /phanTichThiDuaNhanVienOffline/);
  assert.match(page, /phanTichDoanhThuOffline/);
  assert.match(page, /phanTichDoanhThuNhanVienOffline/);
  assert.match(ocr, /Tesseract/);

  assert.doesNotMatch(page, /api\/dmx\/doc-anh/);
  assert.doesNotMatch(page, /Gemini/i);
  assert.doesNotMatch(settingsModal, /Gemini/i);
  await assert.rejects(access(new URL("../src/app/api/dmx/doc-anh/route.ts", import.meta.url)));
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
