import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = await readFile(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const proxy = await readFile(new URL("../src/proxy.ts", import.meta.url), "utf8");
const page = await readFile(new URL("../src/app/toanlop1/page.tsx", import.meta.url), "utf8");
test("Toán lớp 1 tách khỏi giao diện website chính",()=>{assert.match(proxy,/x-toanlop1-app/);assert.match(root,/laToanLop1/);assert.match(root,/const laUngDung = .*laToanLop1/);});
test("có nhận diện riêng và giao diện trẻ em",()=>{assert.match(root,/data-theme/);assert.match(page,/Vương quốc Toán/);assert.match(page,/Bản đồ phiêu lưu/);});
