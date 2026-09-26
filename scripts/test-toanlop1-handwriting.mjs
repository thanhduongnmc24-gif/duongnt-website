import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const writer = await readFile(new URL("../src/components/toan-lop-1/trang-bai-viet.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/app/toanlop1/toanlop1-workbook.css", import.meta.url), "utf8");

test("Apple Pencil và cảm ứng viết trực tiếp trên trang", () => {
  for (const event of ["onPointerDown", "onPointerMove", "onPointerUp", "setPointerCapture"]) assert.match(writer, new RegExp(event));
  assert.match(writer, /pressure/);
  assert.match(css, /touch-action:none/);
});

test("nét viết có hoàn tác, xóa và tự khôi phục", () => {
  assert.match(writer, /Hoàn tác/);
  assert.match(writer, /Xóa bài làm/);
  assert.match(writer, /remote-progress/);
});
