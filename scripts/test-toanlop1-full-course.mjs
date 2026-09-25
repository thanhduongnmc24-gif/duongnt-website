import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const data = await readFile(new URL("../src/data/toan-lop-1.ts", import.meta.url), "utf8");
test("đủ nội dung tuần 1 đến tuần 9",()=>{for(let week=2;week<=9;week++){assert.match(data,new RegExp(`const tuan${week}: BaiHoc\\[\\]`));for(const lesson of ["tiet-1","tiet-2","tiet-3","tu-luyen","tham-khao"])assert.match(data,new RegExp(`tuan${week}-${lesson}`));}});
test("mọi tuần đều được mở khóa",()=>{assert.match(data,/moKhoa: true/);assert.doesNotMatch(data,/moKhoa: index === 0/);});
test("có 225 câu trong toàn khóa",()=>{const week1=(data.match(/id: "(?:t1|t2|t3|tl|tk)-\d"/g)||[]).length;const rest=(data.match(/q\("w[2-9]-/g)||[]).length;assert.equal(week1+rest,225);});
