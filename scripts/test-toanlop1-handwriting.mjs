import assert from "node:assert/strict";import{readFile,readdir}from"node:fs/promises";import test from"node:test";
const page=await readFile(new URL("../src/app/toanlop1/page.tsx",import.meta.url),"utf8");const pad=await readFile(new URL("../src/components/toan-lop-1/bang-viet-so.tsx",import.meta.url),"utf8");
test("dùng đúng 45 trang bài gốc",async()=>{const files=(await readdir(new URL("../public/toanlop1-pages",import.meta.url))).filter(x=>x.endsWith(".webp"));assert.equal(files.length,50);assert.match(page,/3 \+ \(tuan\.so - 1\) \* 5 \+ index/);});
test("có bảng viết bằng chuột hoặc bút và nhận dạng số",()=>{assert.match(pad,/onPointerDown/);assert.match(pad,/setPointerCapture/);assert.match(pad,/MAU_SO/);assert.match(pad,/Nhận dạng/);});
test("có chuyển tiết và khôi phục vị trí cuộn",()=>{assert.match(page,/Tiết trước/);assert.match(page,/Tiết sau/);assert.match(page,/toanlop1-scroll/);assert.match(page,/quayLaiDanhSach/);});
