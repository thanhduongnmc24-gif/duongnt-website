import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const page = await readFile(new URL("../src/app/toanlop1/page.tsx", import.meta.url), "utf8");
const account = await readFile(new URL("../src/components/toan-lop-1/tai-khoan-toan.tsx", import.meta.url), "utf8");
const sql = await readFile(new URL("../supabase/migrations/20260925160000_toan_lop_1.sql", import.meta.url), "utf8");
test("đồng bộ tiến độ qua sự kiện", () => { assert.match(page, /toanlop1:progress/); assert.match(account, /upsert/); });
test("có tài khoản, phụ huynh, huy hiệu và chuỗi ngày", () => { for (const text of ["Đăng nhập", "Báo cáo phụ huynh", "Huy hiệu", "Chuỗi ngày"]) assert.match(account, new RegExp(text)); });
test("cơ sở dữ liệu bật RLS", () => { assert.match(sql, /enable row level security/g); assert.match(sql, /auth\.uid\(\) = user_id/); });
