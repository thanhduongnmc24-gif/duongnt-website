import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { taoEmailLichLamViec } from "@/lib/supabase/lich-lam-viec";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

type DuLieuDangKy = { ten_dang_nhap?: string; mat_khau?: string };
const luotDangKy = new Map<string, number[]>();

function vuotGioiHan(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (luotDangKy.get(ip) || []).filter(time => now - time < 10 * 60_000);
  if (recent.length >= 5) return true;
  recent.push(now);
  luotDangKy.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  if (vuotGioiHan(request)) {
    return NextResponse.json({ loi: "Bạn đã tạo quá nhiều tài khoản. Hãy thử lại sau 10 phút." }, { status: 429 });
  }

  let body: DuLieuDangKy;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ loi: "Dữ liệu đăng ký không hợp lệ." }, { status: 400 });
  }

  const rawUsername = String(body.ten_dang_nhap || "").trim().toLowerCase();
  const username = taoDuongDan(rawUsername);
  const password = String(body.mat_khau || "");
  if (username !== rawUsername || !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
    return NextResponse.json({ loi: "Tên đăng nhập gồm 3–40 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới." }, { status: 400 });
  }
  if (password.length < 6 || password.length > 72) {
    return NextResponse.json({ loi: "Mật khẩu cần từ 6 đến 72 ký tự." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ loi: "Máy chủ chưa được cấu hình Supabase." }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.signUp({
    email: taoEmailLichLamViec(username),
    password,
    options: { data: { ung_dung: "lich_lam_viec", ten_dang_nhap: username } },
  });
  if (error || !data.user) {
    const duplicate = error?.code === "user_already_exists" || /user already registered|email already exists/i.test(error?.message || "");
    return NextResponse.json(
      { loi: duplicate ? "Tên đăng nhập này đã được sử dụng." : "Chưa tạo được tài khoản. Hãy thử lại sau." },
      { status: duplicate ? 409 : 400 },
    );
  }
  if (!data.session) {
    return NextResponse.json({ loi: "Tài khoản cần được xác nhận nhưng địa chỉ đăng nhập nội bộ không nhận được email." }, { status: 503 });
  }

  return NextResponse.json({ thanh_cong: true }, { status: 201 });
}
