import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CAC_LOAI_BAO_CAO_BOT } from "@/lib/dmx/bao-cao-bot";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAC_LOAI_ANH = CAC_LOAI_BAO_CAO_BOT.filter(loai => loai !== "msnv" && loai !== "sk");
// Giới hạn dung lượng mỗi ảnh và giới hạn số lượng ảnh báo cáo lưu cho mỗi siêu thị (đã nâng từ 10 lên 50).
const GIOI_HAN_ANH = 10 * 1024 * 1024;
const GIOI_HAN_ANH_MOI_TAI_KHOAN = 50;
const CAC_LOAI_ANH_CU = ["tongquan", "doanhthu", "realtime", "luyke", "thidua", "nhanvien", "suckhoe"];

function laLoaiAnhHopLe(loai: string): boolean {
  return (CAC_LOAI_ANH as readonly string[]).includes(loai) || /^sk_[a-z0-9_-]{1,32}$/i.test(loai);
}

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
    const hanhDong = String(body.hanhDong || "").trim().toLowerCase();
    if (!laLoaiAnhHopLe(loai) || !/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
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

    const laAnhSucKhoeNV = loai.startsWith("sk_");
    if (!laAnhSucKhoeNV) {
      const { data: anhCungLoai } = await admin.from("dmx_line_anh_bao_cao")
        .select("loai").eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId).eq("loai", loai).maybeSingle();
      if (!anhCungLoai) {
        const { count: countStore } = await admin.from("dmx_line_anh_bao_cao")
          .select("loai", { count: "exact", head: true }).eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId);
        if ((countStore || 0) >= GIOI_HAN_ANH_MOI_TAI_KHOAN) {
          return NextResponse.json({ loi: "Mỗi tài khoản chỉ được lưu tối đa 50 ảnh báo cáo mới nhất." }, { status: 409 });
        }
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

    if (!duongDanCu && laAnhSucKhoeNV) {
      const { data: metaCuBlob } = await admin.storage.from("dmx-du-lieu").download(`bot-anh/${user.id}/${sieuThiId}/meta-${loai}.json`);
      if (metaCuBlob) {
        try {
          const metaCu = JSON.parse(await metaCuBlob.text()) as { duongDanLuuTru?: string };
          if (typeof metaCu.duongDanLuuTru === "string" && metaCu.duongDanLuuTru) {
            duongDanCu = metaCu.duongDanLuuTru;
          }
        } catch { /* Bỏ qua nếu chưa có metadata cũ */ }
      }
    }

    if (hanhDong === "tao_url_tai_len") {
      const phienBan = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const duongDanMoi = `bot-anh/${user.id}/${sieuThiId}/${loai}-${phienBan}.jpg`;
      const { data: signed, error: signedError } = await admin.storage
        .from("dmx-du-lieu")
        .createSignedUploadUrl(duongDanMoi);
      if (signedError || !signed?.signedUrl) throw signedError || new Error("Không tạo được URL tải ảnh.");
      return NextResponse.json({
        ok: true,
        loai,
        ngay,
        nhaCungCap: "supabase",
        duongDanLuuTru: duongDanMoi,
        signedUrl: signed.signedUrl,
      });
    }

    if (hanhDong === "xac_nhan_tai_len") {
      const duongDanDaTai = String(body.duongDanLuuTru || "").trim();
      const tienToHopLe = `bot-anh/${user.id}/${sieuThiId}/${loai}-`;
      if (!duongDanDaTai.startsWith(tienToHopLe) || !duongDanDaTai.endsWith(".jpg")) {
        return NextResponse.json({ loi: "Đường dẫn ảnh tải lên không hợp lệ." }, { status: 400 });
      }
      const { data: thongTinTep, error: loiTep } = await admin.storage
        .from("dmx-du-lieu")
        .info(duongDanDaTai);
      const kichThuoc = Number(thongTinTep?.metadata?.size || thongTinTep?.size || 0);
      if (loiTep || !thongTinTep || kichThuoc <= 0 || kichThuoc > GIOI_HAN_ANH) {
        return NextResponse.json({ loi: "Ảnh tải trực tiếp chưa tồn tại hoặc vượt quá dung lượng cho phép." }, { status: 400 });
      }
      duongDanLuuTru = duongDanDaTai;
    } else if (nhaCungCap === "google_drive") {
      urlBenNgoai = String(body.urlBenNgoai || "").trim();
      if (!laHttps(urlBenNgoai)) {
        return NextResponse.json({ loi: "Kho ảnh ngoài chưa trả về đường dẫn HTTPS hợp lệ." }, { status: 400 });
      }
    } else {
      const base64 = String(body.duLieuAnhBase64 || "").replace(/^data:image\/\w+;base64,/, "");
      if (!base64) return NextResponse.json({ loi: "Thiếu dữ liệu ảnh." }, { status: 400 });
      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length || buffer.length > GIOI_HAN_ANH) {
        return NextResponse.json({ loi: "Ảnh vượt quá giới hạn dung lượng." }, { status: 413 });
      }
      const phienBan = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      duongDanLuuTru = `bot-anh/${user.id}/${sieuThiId}/${loai}-${phienBan}.jpg`;
      const { error: loiTai } = await admin.storage.from("dmx-du-lieu").upload(duongDanLuuTru, buffer, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
      if (loiTai) throw loiTai;
    }

    const ngayCapNhatMoi = new Date().toISOString();

    if (laAnhSucKhoeNV) {
      const metaPayload = JSON.stringify({
        loai,
        ngay,
        nhaCungCap: nhaCungCap === "google_drive" ? "google_drive" : "supabase",
        duongDanLuuTru,
        urlBenNgoai,
        ngayCapNhat: ngayCapNhatMoi,
      });
      await admin.storage.from("dmx-du-lieu").upload(
        `bot-anh/${user.id}/${sieuThiId}/meta-${loai}.json`,
        Buffer.from(metaPayload, "utf-8"),
        { contentType: "application/json", cacheControl: "0", upsert: true }
      );
    }

    const { error } = await admin.from("dmx_line_anh_bao_cao").upsert({
      nguoi_dung_id: user.id,
      sieu_thi_id: sieuThiId,
      loai,
      ngay,
      nha_cung_cap: nhaCungCap === "google_drive" ? "google_drive" : "supabase",
      duong_dan_luu_tru: duongDanLuuTru,
      url_ben_ngoai: urlBenNgoai,
      ngay_cap_nhat: ngayCapNhatMoi,
      xoa_sau: null,
    }, { onConflict: "nguoi_dung_id,sieu_thi_id,loai" });
    if (error && !laAnhSucKhoeNV) {
      if (duongDanLuuTru) await admin.storage.from("dmx-du-lieu").remove([duongDanLuuTru]);
      throw error;
    }

    if (duongDanCu && duongDanCu !== duongDanLuuTru) {
      await admin.storage.from("dmx-du-lieu").remove([duongDanCu]);
    }

    return NextResponse.json({
      ok: true,
      loai,
      ngay,
      nhaCungCap,
      ngayCapNhat: ngayCapNhatMoi,
    });
  } catch (error) {
    console.error("POST /api/dmx/bot/anh-cache error", error);
    return NextResponse.json({ loi: "Chưa lưu được ảnh báo cáo mới nhất." }, { status: 500 });
  }
}
