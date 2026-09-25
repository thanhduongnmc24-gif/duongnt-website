import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { taoEmailToanLop1 } from "@/lib/supabase/toan-lop-1";

type Body = { ten_dang_nhap?: string; ten_hien_thi?: string; mat_khau?: string; ma_phu_huynh?: string };
const requests = new Map<string, number[]>();

function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((time) => now - time < 10 * 60_000);
  if (recent.length >= 5) return true;
  recent.push(now); requests.set(ip, recent); return false;
}

export async function POST(request: Request) {
  if (limited(request)) return NextResponse.json({ loi: "Đã đăng ký quá nhiều lần. Hãy thử lại sau 10 phút." }, { status: 429 });
  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ loi: "Dữ liệu không hợp lệ." }, { status: 400 }); }
  const username = String(body.ten_dang_nhap || "").trim().toLowerCase();
  const displayName = String(body.ten_hien_thi || "").trim();
  const password = String(body.mat_khau || "");
  const parentPin = String(body.ma_phu_huynh || "");
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) return NextResponse.json({ loi: "Tên đăng nhập cần 3-30 ký tự chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới." }, { status: 400 });
  if (displayName.length < 2 || displayName.length > 40) return NextResponse.json({ loi: "Tên học sinh cần 2-40 ký tự." }, { status: 400 });
  if (password.length < 6 || password.length > 72) return NextResponse.json({ loi: "Mật khẩu cần 6-72 ký tự." }, { status: 400 });
  if (!/^\d{4}$/.test(parentPin)) return NextResponse.json({ loi: "Mã phụ huynh phải gồm đúng 4 chữ số." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ loi: "Máy chủ chưa cấu hình Supabase." }, { status: 500 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.signUp({
    email: taoEmailToanLop1(username), password,
    options: { data: { ung_dung: "toan_lop_1", ten_dang_nhap: username, ten_hien_thi: displayName, ma_phu_huynh: parentPin } },
  });
  if (error || !data.user) {
    const duplicate = error?.code === "user_already_exists" || /already/i.test(error?.message || "");
    return NextResponse.json({ loi: duplicate ? "Tên đăng nhập đã được sử dụng." : "Chưa tạo được tài khoản." }, { status: duplicate ? 409 : 400 });
  }
  if (!data.session) return NextResponse.json({ loi: "Supabase đang yêu cầu xác nhận email. Hãy tắt Confirm email cho tài khoản nội bộ." }, { status: 503 });
  return NextResponse.json({ thanh_cong: true }, { status: 201 });
}
