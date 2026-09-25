import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../src/app/toanlop1/page.tsx", import.meta.url), "utf8");
const data = await readFile(new URL("../src/data/toan-lop-1.ts", import.meta.url), "utf8");

test("trang Toán lớp 1 có route, lưu tiến độ và chấm bài", () => {
  assert.match(page, /localStorage/);
  assert.match(page, /chuanHoa/);
  assert.match(page, /Kiểm tra/);
});

test("Tuần 1 có đủ năm nhóm bài và 25 câu", () => {
  for (const id of ["tiet-1", "tiet-2", "tiet-3", "tu-luyen", "tham-khao"]) assert.match(data, new RegExp(`id: "${id}"`));
  assert.equal((data.match(/id: "(?:t1|t2|t3|tl|tk)-\d"/g) || []).length, 25);
});
