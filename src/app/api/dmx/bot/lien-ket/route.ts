import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { kiemTraBearer } from "@/lib/dmx/bao-cao-bot";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THOI_HAN_MA_PHUT = 10;

function bamMa(ma: string): string {
  return createHash("sha256").update(ma.trim()).digest("hex");
}

function lineUserIdHopLe(value: unknown): value is string {
  return typeof value === "string" && /^U[0-9a-f]{20,64}$/i.test(value.trim());
}

async function layNguoiDung(request: Request): Promise<User | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data } = await client.auth.getUser(bearer);
    return data.user || null;
  }

  const supabase = await taoSupabaseMayChu();
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

async function tenDangNhapCua(userId: string): Promise<string> {
  const admin = taoSupabaseQuanTri();
  const { data } = await admin
    .from("dmx_ho_so")
    .select("ten_dang_nhap")
    .eq("nguoi_dung_id", userId)
    .maybeSingle();
  return String(data?.ten_dang_nhap || "Tài khoản DMX");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      hanhDong?: string;
      lineUserId?: string;
      ma?: string;
    };
    const hanhDong = body.hanhDong?.trim().toLowerCase();
    const admin = taoSupabaseQuanTri();

    if (hanhDong === "xac_nhan") {
      const user = await layNguoiDung(request);
      if (!user || user.user_metadata?.ung_dung !== "dmx") {
        return NextResponse.json({ loi: "Hãy đăng nhập tài khoản DMX trước khi liên kết LINE." }, { status: 401 });
      }

      const ma = body.ma?.replace(/\D/g, "") || "";
      if (ma.length !== 6) {
        return NextResponse.json({ loi: "Mã liên kết phải gồm đúng 6 chữ số." }, { status: 400 });
      }

      const { data: choXacNhan, error } = await admin
        .from("dmx_line_ma_lien_ket")
        .select("line_user_id,het_han")
        .eq("ma_hash", bamMa(ma))
        .gt("het_han", new Date().toISOString())
        .maybeSingle();
      if (error || !choXacNhan?.line_user_id) {
        return NextResponse.json({ loi: "Mã liên kết không đúng hoặc đã hết hạn. Hãy gõ /lienket để lấy mã mới." }, { status: 400 });
      }

      await admin.from("dmx_line_lien_ket").delete().eq("nguoi_dung_id", user.id);
      const { error: loiLuu } = await admin.from("dmx_line_lien_ket").upsert({
        line_user_id: choXacNhan.line_user_id,
        nguoi_dung_id: user.id,
        ngay_cap_nhat: new Date().toISOString(),
      }, { onConflict: "line_user_id" });
      if (loiLuu) throw loiLuu;
      await admin.from("dmx_line_ma_lien_ket").delete().eq("line_user_id", choXacNhan.line_user_id);

      return NextResponse.json({
        ok: true,
        tenDangNhap: await tenDangNhapCua(user.id),
        thongBao: "Đã liên kết LINE với tài khoản DMX.",
      });
    }

    if (!kiemTraBearer(request)) {
      return NextResponse.json({ loi: "Không có quyền quản lý liên kết LINE." }, { status: 401 });
    }
    if (!lineUserIdHopLe(body.lineUserId)) {
      return NextResponse.json({ loi: "Không đọc được mã người dùng LINE." }, { status: 400 });
    }
    const lineUserId = body.lineUserId.trim();

    if (hanhDong === "tao_ma") {
      const ma = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const hetHan = new Date(Date.now() + THOI_HAN_MA_PHUT * 60_000);
      await admin.from("dmx_line_ma_lien_ket").delete().eq("line_user_id", lineUserId);
      const { error } = await admin.from("dmx_line_ma_lien_ket").insert({
        ma_hash: bamMa(ma),
        line_user_id: lineUserId,
        het_han: hetHan.toISOString(),
      });
      if (error) throw error;
      return NextResponse.json({ ma, hetHan: hetHan.toISOString(), soPhut: THOI_HAN_MA_PHUT });
    }

    if (hanhDong === "trang_thai") {
      const { data } = await admin
        .from("dmx_line_lien_ket")
        .select("nguoi_dung_id")
        .eq("line_user_id", lineUserId)
        .maybeSingle();
      if (!data?.nguoi_dung_id) return NextResponse.json({ daLienKet: false });
      return NextResponse.json({
        daLienKet: true,
        tenDangNhap: await tenDangNhapCua(String(data.nguoi_dung_id)),
      });
    }

    if (hanhDong === "huy") {
      await Promise.all([
        admin.from("dmx_line_lien_ket").delete().eq("line_user_id", lineUserId),
        admin.from("dmx_line_ma_lien_ket").delete().eq("line_user_id", lineUserId),
      ]);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ loi: "Hành động liên kết không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/dmx/bot/lien-ket error", error);
    return NextResponse.json({ loi: "Chưa xử lý được liên kết LINE. Vui lòng thử lại." }, { status: 500 });
  }
}
