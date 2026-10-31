import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { taoEmailDmx } from "@/lib/supabase/dmx";

type Body = {
  ten_dang_nhap?: string;
  mat_khau?: string;
  refresh_token?: string;
};

function taoClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Thiếu cấu hình Supabase.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const supabase = taoClient();
    const result = body.refresh_token
      ? await supabase.auth.refreshSession({ refresh_token: body.refresh_token })
      : await supabase.auth.signInWithPassword({
          email: taoEmailDmx(String(body.ten_dang_nhap || "").trim().toLowerCase()),
          password: String(body.mat_khau || ""),
        });

    const { data, error } = result;
    if (error || !data.session || data.user?.user_metadata?.ung_dung !== "dmx") {
      return NextResponse.json(
        { loi: body.refresh_token ? "Phiên đăng nhập đã hết hạn." : "Tên đăng nhập hoặc mật khẩu chưa đúng." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      ten_dang_nhap: String(data.user.user_metadata?.ten_dang_nhap || data.user.email?.split("@")[0] || ""),
    });
  } catch {
    return NextResponse.json({ loi: "Không thể kết nối tài khoản ĐMX." }, { status: 500 });
  }
}
