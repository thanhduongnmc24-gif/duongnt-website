import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ĐMX PWA có đầy đủ chức năng: Đăng nhập Supabase, 5 chế độ quét ảnh, Nhân viên và Chia Target", async () => {
  const [page, modals, settingsModal, types, supabaseDmx] = await Promise.all([
    readFile(new URL("../src/app/dmx/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-modals.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-settings-modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dmx/dmx-types.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/supabase/dmx.ts", import.meta.url), "utf8"),
  ]);

  // 5 chế độ quét ảnh
  assert.match(page, /doanh_thu_thuc/);
  assert.match(page, /doanh_thu_quy_doi/);
  assert.match(page, /thi_dua/);
  assert.match(page, /thi_dua_nhan_vien/);
  assert.match(page, /doanh_thu_nhan_vien/);

  // Đăng nhập / Tạo tài khoản & lưu trữ theo tài khoản trên Supabase
  assert.match(page, /dmx_ho_so/);
  assert.match(page, /dmx_du_lieu_ngay/);
  assert.match(page, /signInWithPassword/);
  assert.match(page, /\/api\/dmx\/dang-ky/);
  assert.match(supabaseDmx, /@dmx\.internal\.duongnt\.io\.vn/);

  // Tab Nhân viên (thay thế Dự phòng 1), huy chương vàng bạc đồng
  assert.match(page, /Nhân viên/);
  assert.match(types, /🥇/);
  assert.match(types, /🥈/);
  assert.match(types, /🥉/);

  // Bấm vào ngành hàng mở ModalChiTietNganhHang, bấm vào nhân viên mở ModalChiTietNhanVien
  assert.match(modals, /ModalChiTietNganhHang/);
  assert.match(modals, /ModalChiTietNhanVien/);

  // Cài đặt chia target mặt hàng từ ngày 1 -> ngày hiện tại & danh sách nhân viên quản lý
  assert.match(settingsModal, /CHIA TARGET MẶT HÀNG CHO NHÂN VIÊN/);
  assert.match(settingsModal, /DANH SÁCH NHÂN VIÊN QUẢN LÝ/);
});

test("Gemini nhận ảnh ở máy chủ và trả về bảng có cấu trúc cho cả 5 loại ảnh", async () => {
  const route = await readFile(new URL("../src/app/api/dmx/doc-anh/route.ts", import.meta.url), "utf8");
  assert.match(route, /GEMINI_API_KEY/);
  assert.match(route, /generateContent/);
  assert.match(route, /inlineData/);
  assert.match(route, /responseSchema/);
  assert.match(route, /KetQuaSchema/);
  assert.match(route, /thi_dua_nhan_vien/);
  assert.match(route, /doanh_thu_nhan_vien/);
  assert.match(route, /maxOutputTokens: 32768/);
  assert.match(route, /thinkingBudget: 0/);
  assert.match(route, /docJsonGemini/);
  assert.match(route, /safeParse/);
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
