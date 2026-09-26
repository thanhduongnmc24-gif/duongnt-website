import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../src/app/toanlop1/page.tsx", import.meta.url), "utf8");
const writer = await readFile(new URL("../src/components/toan-lop-1/trang-bai-viet.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../src/app/api/toanlop1/cham-bai/route.ts", import.meta.url), "utf8");

test("trang Toán lớp 1 tự lưu nét viết và có máy chấm bài", () => {
  assert.match(page, /TrangBaiViet/);
  assert.match(writer, /localStorage\.setItem/);
  assert.match(writer, /toanlop1:progress/);
  assert.match(route, /generateContent/);
});

test("phần chấm đọc bài vector có mực viết tay", () => {
  assert.match(route, /dựng bằng nét vector/);
  assert.match(route, /mực xanh/);
  assert.match(route, /image\/jpeg/);
  assert.match(route, /responseSchema/);
});
