import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function layNguoiDung(request: Request): Promise<User | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!bearer || !url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return (await client.auth.getUser(bearer)).data.user || null;
}

async function danhSach(userId: string) {
  const admin = taoSupabaseQuanTri();
  const [{ data: stores }, { data: profile }] = await Promise.all([
    admin.from("dmx_sieu_thi").select("id,ma_sieu_thi,ten_sieu_thi,ngay_tao").eq("nguoi_dung_id", userId).order("ngay_tao"),
    admin.from("dmx_ho_so").select("sieu_thi_dang_chon").eq("nguoi_dung_id", userId).maybeSingle(),
  ]);
  return { sieuThi: stores || [], sieuThiDangChon: profile?.sieu_thi_dang_chon || stores?.[0]?.id || null };
}

export async function GET(request: Request) {
  const user = await layNguoiDung(request);
  if (!user || user.user_metadata?.ung_dung !== "dmx") return NextResponse.json({ loi: "Hãy đăng nhập tài khoản DMX." }, { status: 401 });
  return NextResponse.json(await danhSach(user.id));
}

export async function POST(request: Request) {
  try {
    const user = await layNguoiDung(request);
    if (!user || user.user_metadata?.ung_dung !== "dmx") return NextResponse.json({ loi: "Hãy đăng nhập tài khoản DMX." }, { status: 401 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const hanhDong = String(body.hanhDong || "").trim().toLowerCase();
    const admin = taoSupabaseQuanTri();

    if (hanhDong === "them") {
      const ma = String(body.maSieuThi || "").trim().toUpperCase();
      const ten = String(body.tenSieuThi || "").trim();
      if (!/^[A-Z0-9._-]{1,30}$/.test(ma) || !ten || ten.length > 120) {
        return NextResponse.json({ loi: "Mã siêu thị chỉ gồm chữ, số, dấu chấm, gạch ngang; tên tối đa 120 ký tự." }, { status: 400 });
      }
      const { data, error } = await admin.from("dmx_sieu_thi").insert({
        nguoi_dung_id: user.id, ma_sieu_thi: ma, ten_sieu_thi: ten,
      }).select("id").single();
      if (error) throw error;
      await admin.from("dmx_ho_so").update({ sieu_thi_dang_chon: data.id }).eq("nguoi_dung_id", user.id);
    } else if (hanhDong === "chon") {
      const id = String(body.sieuThiId || "");
      const { data } = await admin.from("dmx_sieu_thi").select("id").eq("id", id).eq("nguoi_dung_id", user.id).maybeSingle();
      if (!data) return NextResponse.json({ loi: "Siêu thị không thuộc tài khoản này." }, { status: 403 });
      await admin.from("dmx_ho_so").update({ sieu_thi_dang_chon: id }).eq("nguoi_dung_id", user.id);
    } else if (hanhDong === "xoa") {
      const id = String(body.sieuThiId || "");
      const { count } = await admin.from("dmx_sieu_thi").select("id", { count: "exact", head: true }).eq("nguoi_dung_id", user.id);
      if ((count || 0) <= 1) return NextResponse.json({ loi: "Tài khoản phải còn ít nhất một siêu thị." }, { status: 409 });
      const { data: profile } = await admin.from("dmx_ho_so").select("sieu_thi_dang_chon").eq("nguoi_dung_id", user.id).maybeSingle();
      await admin.from("dmx_sieu_thi").delete().eq("id", id).eq("nguoi_dung_id", user.id);
      if (profile?.sieu_thi_dang_chon === id) {
        const { data: conLai } = await admin.from("dmx_sieu_thi").select("id").eq("nguoi_dung_id", user.id).order("ngay_tao").limit(1).maybeSingle();
        await admin.from("dmx_ho_so").update({ sieu_thi_dang_chon: conLai?.id || null }).eq("nguoi_dung_id", user.id);
      }
    } else {
      return NextResponse.json({ loi: "Hành động không hợp lệ." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await danhSach(user.id)) });
  } catch (error) {
    console.error("POST /api/dmx/sieu-thi error", error);
    return NextResponse.json({ loi: "Chưa cập nhật được danh sách siêu thị." }, { status: 500 });
  }
}
