import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CAC_LOAI_BAO_CAO_BOT } from "@/lib/dmx/bao-cao-bot";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAC_LOAI_ANH = CAC_LOAI_BAO_CAO_BOT.filter(loai => loai !== "msnv");
// Giới hạn cứng để không một ảnh báo cáo nào chiếm quá nhiều dung lượng.
const GIOI_HAN_ANH = 3 * 1024 * 1024;

async function layNguoiDung(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!bearer || !url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return (await client.auth.getUser(bearer)).data.user || null;
}

function laHttps(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const user = await layNguoiDung(request);
    if (!user || user.user_metadata?.ung_dung !== "dmx") {
      return NextResponse.json({ loi: "Hãy đăng nhập tài khoản DMX." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const loai = String(body.loai || "").trim().toLowerCase();
    const ngay = String(body.ngay || "").trim();
    const nhaCungCap = String(body.nhaCungCap || "supabase").trim().toLowerCase();
    if (!(CAC_LOAI_ANH as readonly string[]).includes(loai) || !/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
      return NextResponse.json({ loi: "Loại báo cáo hoặc ngày báo cáo không hợp lệ." }, { status: 400 });
    }

    const admin = taoSupabaseQuanTri();
    let duongDanLuuTru: string | null = null;
    let urlBenNgoai: string | null = null;

    if (nhaCungCap === "google_drive") {
      urlBenNgoai = String(body.urlBenNgoai || "").trim();
      if (!laHttps(urlBenNgoai)) {
        return NextResponse.json({ loi: "Google Drive chưa trả về đường dẫn ảnh HTTPS hợp lệ." }, { status: 400 });
      }
    } else {
      const base64 = String(body.duLieuAnhBase64 || "").replace(/^data:image\/\w+;base64,/, "");
      if (!base64) return NextResponse.json({ loi: "Thiếu dữ liệu ảnh." }, { status: 400 });
      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length || buffer.length > GIOI_HAN_ANH) {
        return NextResponse.json({ loi: "Ảnh vượt quá giới hạn 3 MB." }, { status: 413 });
      }
      duongDanLuuTru = `bot-anh/${user.id}/${loai}.jpg`;
      const { error: loiTai } = await admin.storage.from("dmx-du-lieu").upload(duongDanLuuTru, buffer, {
        contentType: "image/jpeg",
        cacheControl: "60",
        upsert: true,
      });
      if (loiTai) throw loiTai;
    }

    const { error } = await admin.from("dmx_line_anh_bao_cao").upsert({
      nguoi_dung_id: user.id,
      loai,
      ngay,
      nha_cung_cap: nhaCungCap === "google_drive" ? "google_drive" : "supabase",
      duong_dan_luu_tru: duongDanLuuTru,
      url_ben_ngoai: urlBenNgoai,
      ngay_cap_nhat: new Date().toISOString(),
      xoa_sau: null,
    }, { onConflict: "nguoi_dung_id,loai" });
    if (error) throw error;

    return NextResponse.json({ ok: true, loai, ngay, nhaCungCap });
  } catch (error) {
    console.error("POST /api/dmx/bot/anh-cache error", error);
    return NextResponse.json({ loi: "Chưa lưu được ảnh báo cáo mới nhất." }, { status: 500 });
  }
}
