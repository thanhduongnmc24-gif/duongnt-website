import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CAC_LOAI_BAO_CAO_BOT } from "@/lib/dmx/bao-cao-bot";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAC_LOAI_ANH = CAC_LOAI_BAO_CAO_BOT.filter(loai => loai !== "msnv");
// Giới hạn cứng để không một ảnh báo cáo nào chiếm quá nhiều dung lượng.
const GIOI_HAN_ANH = 3 * 1024 * 1024;
const GIOI_HAN_ANH_MOI_TAI_KHOAN = 10;
const CAC_LOAI_ANH_CU = ["tongquan", "doanhthu", "realtime", "luyke", "thidua", "nhanvien", "suckhoe"];

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
    const storeHeader = request.headers.get("x-dmx-store-id")?.trim() || "";
    let sieuThiId = storeHeader;
    if (sieuThiId) {
      const { data } = await admin.from("dmx_sieu_thi").select("id").eq("id", sieuThiId).eq("nguoi_dung_id", user.id).maybeSingle();
      if (!data?.id) sieuThiId = "";
    }
    if (!sieuThiId) {
      const { data } = await admin.from("dmx_ho_so").select("sieu_thi_dang_chon").eq("nguoi_dung_id", user.id).maybeSingle();
      sieuThiId = String(data?.sieu_thi_dang_chon || "");
    }
    if (!sieuThiId) return NextResponse.json({ loi: "Tài khoản chưa chọn siêu thị." }, { status: 409 });
    // Dọn ảnh theo bộ mã cũ bằng Storage API để không để lại tệp mồ côi.
    const { data: anhCu } = await admin.from("dmx_line_anh_bao_cao")
      .select("duong_dan_luu_tru").eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId).in("loai", CAC_LOAI_ANH_CU);
    const tepCu = (anhCu || []).map(item => String(item.duong_dan_luu_tru || "")).filter(Boolean);
    if (tepCu.length) await admin.storage.from("dmx-du-lieu").remove(tepCu);
    if (anhCu?.length) await admin.from("dmx_line_anh_bao_cao")
      .delete().eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId).in("loai", CAC_LOAI_ANH_CU);

    const { data: anhCungLoai } = await admin.from("dmx_line_anh_bao_cao")
      .select("loai").eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId).eq("loai", loai).maybeSingle();
    if (!anhCungLoai) {
      const { count: countStore } = await admin.from("dmx_line_anh_bao_cao")
        .select("loai", { count: "exact", head: true }).eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId);
      if ((countStore || 0) >= GIOI_HAN_ANH_MOI_TAI_KHOAN) {
        return NextResponse.json({ loi: "Mỗi tài khoản chỉ được lưu tối đa 10 ảnh báo cáo mới nhất." }, { status: 409 });
      }
    }
    let duongDanLuuTru: string | null = null;
    let urlBenNgoai: string | null = null;
    let duongDanCu: string | null = null;

    const { data: banGhiCu } = await admin.from("dmx_line_anh_bao_cao")
      .select("duong_dan_luu_tru")
      .eq("nguoi_dung_id", user.id)
      .eq("sieu_thi_id", sieuThiId)
      .eq("loai", loai)
      .maybeSingle();
    duongDanCu = typeof banGhiCu?.duong_dan_luu_tru === "string"
      ? banGhiCu.duong_dan_luu_tru
      : null;

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
      // Mỗi lần tải tạo một đường dẫn mới. Nếu ghi đè cùng tên tệp, CDN của
      // Supabase có thể tiếp tục trả ảnh cũ dù bản ghi DB đã có thời gian mới.
      const phienBan = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      duongDanLuuTru = `bot-anh/${user.id}/${sieuThiId}/${loai}-${phienBan}.jpg`;
      const { error: loiTai } = await admin.storage.from("dmx-du-lieu").upload(duongDanLuuTru, buffer, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
      if (loiTai) throw loiTai;
    }

    const { error } = await admin.from("dmx_line_anh_bao_cao").upsert({
      nguoi_dung_id: user.id,
      sieu_thi_id: sieuThiId,
      loai,
      ngay,
      nha_cung_cap: nhaCungCap === "google_drive" ? "google_drive" : "supabase",
      duong_dan_luu_tru: duongDanLuuTru,
      url_ben_ngoai: urlBenNgoai,
      ngay_cap_nhat: new Date().toISOString(),
      xoa_sau: null,
    }, { onConflict: "nguoi_dung_id,sieu_thi_id,loai" });
    if (error) {
      // Không để lại tệp mồ côi nếu cập nhật bản ghi thất bại.
      if (duongDanLuuTru) await admin.storage.from("dmx-du-lieu").remove([duongDanLuuTru]);
      throw error;
    }

    // Chỉ xóa ảnh cũ sau khi bản ghi đã trỏ chắc chắn sang ảnh mới.
    if (duongDanCu && duongDanCu !== duongDanLuuTru) {
      await admin.storage.from("dmx-du-lieu").remove([duongDanCu]);
    }

    return NextResponse.json({
      ok: true,
      loai,
      ngay,
      nhaCungCap,
      ngayCapNhat: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/dmx/bot/anh-cache error", error);
    return NextResponse.json({ loi: "Chưa lưu được ảnh báo cáo mới nhất." }, { status: 500 });
  }
}
