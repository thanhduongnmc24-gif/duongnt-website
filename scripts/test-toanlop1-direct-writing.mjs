import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../src/app/toanlop1/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../src/components/toan-lop-1/trang-bai-viet.tsx", import.meta.url), "utf8");

test("hai quyển có đủ 90 trang vector, không dùng ảnh chụp", async () => {
  const files = (await readdir(new URL("../public/toanlop1-workbook", import.meta.url))).filter(name => name.endsWith(".svg"));
  assert.equal(files.filter(name => /^q1-page-/.test(name)).length, 45);
  assert.equal(files.filter(name => /^q2-page-/.test(name)).length, 45);
  assert.doesNotMatch(component, /toanlop1-pages|\.webp/);
  for (const name of files) {
    const svg = await readFile(new URL(`../public/toanlop1-workbook/${name}`, import.meta.url), "utf8");
    assert.match(svg, /<svg[^>]+width=/);
    assert.match(svg, /<path /);
    assert.doesNotMatch(svg, /<image\b|data:image\//);
  }
});

test("canvas phủ đúng lên trang và gửi cả trang để chấm", () => {
  assert.match(component, /tl1-paper/);
  assert.match(component, /drawImage\(anh/);
  assert.match(component, /anhBaiLam/);
  assert.match(page, /dựng lại bằng nét vector/);
});
