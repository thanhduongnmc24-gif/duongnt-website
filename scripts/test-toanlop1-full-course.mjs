import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const data = await readFile(new URL("../src/data/toan-lop-1.ts", import.meta.url), "utf8");

test("có đủ 18 tuần từ hai quyển", () => {
  assert.match(data, /length: 18/);
  assert.match(data, /quyen = \(index < 9 \? 1 : 2\)/);
  assert.match(data, /toanlop1-workbook/);
  assert.match(data, /\.svg/);
});

test("mỗi tuần ánh xạ đúng năm trang nguyên bản", () => {
  assert.equal((data.match(/"Tiết 1"|"Tiết 2"|"Tiết 3"|"Phiếu tự luyện"|"Bài tập tham khảo"/g) || []).length, 5);
  assert.match(data, /3 \+ \(tuanTrongQuyen - 1\) \* 5/);
});
