import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { CAC_LOAI_BAO_CAO_BOT, kiemTraBearer } from "@/lib/dmx/bao-cao-bot";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const THOI_HAN_MA_PHUT = 10;
const CAC_LOAI_LICH = CAC_LOAI_BAO_CAO_BOT.filter(loai => loai !== "msnv");

function bamMa(ma: string) {
  return createHash("sha256").update(ma.trim()).digest("hex");
}

async function layNguoiDung(request: Request): Promise<User | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await client.auth.getUser(bearer);
    return data.user || null;
  }
  const supabase = await taoSupabaseMayChu();
  return (await supabase.auth.getUser()).data.user || null;
}

function gioHopLe(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function layGioVietNam() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || "";
  const thuMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { thu: thuMap[get("weekday")] || 1, gio: `${get("hour")}:${get("minute")}` };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const hanhDong = String(body.hanhDong || "").trim().toLowerCase();
    const admin = taoSupabaseQuanTri();

    if (["gan_nhom", "lich_den_han", "da_gui"].includes(hanhDong)) {
      if (!kiemTraBearer(request)) return NextResponse.json({ loi: "Không có quyền quản lý bot." }, { status: 401 });

      if (hanhDong === "gan_nhom") {
        const ma = String(body.ma || "").replace(/\D/g, "");
        const groupId = String(body.lineGroupId || "").trim();
        if (ma.length !== 6 || !/^C[0-9a-f]{20,64}$/i.test(groupId)) {
          return NextResponse.json({ loi: "Mã gắn nhóm hoặc mã nhóm LINE không hợp lệ." }, { status: 400 });
        }
        const { data: maGan } = await admin.from("dmx_line_ma_gan_nhom")
          .select("nguoi_dung_id").eq("ma_hash", bamMa(ma)).gt("het_han", new Date().toISOString()).maybeSingle();
        if (!maGan?.nguoi_dung_id) return NextResponse.json({ loi: "Mã gắn nhóm không đúng hoặc đã hết hạn." }, { status: 400 });
        const { error } = await admin.from("dmx_line_nhom").upsert({
          line_group_id: groupId, nguoi_dung_id: maGan.nguoi_dung_id,
          ten_nhom: String(body.tenNhom || "Nhóm LINE").slice(0, 120), dang_hoat_dong: true,
          ngay_cap_nhat: new Date().toISOString(),
        }, { onConflict: "line_group_id" });
        if (error) throw error;
        await admin.from("dmx_line_ma_gan_nhom").delete().eq("ma_hash", bamMa(ma));
        return NextResponse.json({ ok: true, thongBao: "Đã gắn nhóm với tài khoản DMX." });
      }

      if (hanhDong === "lich_den_han") {
        const { thu, gio } = layGioVietNam();
        const dauPhut = new Date(Date.now() - 55_000).toISOString();
        const { data, error } = await admin.from("dmx_line_lich_gui")
          .select("id,line_group_id,nguoi_dung_id,cac_noi_dung,lan_gui_cuoi,dmx_line_nhom!inner(dang_hoat_dong)")
          .eq("dang_hoat_dong", true).eq("dmx_line_nhom.dang_hoat_dong", true)
          .eq("gio", `${gio}:00`).contains("cac_thu", [thu]);
        if (error) throw error;
        const denHan = (data || []).filter(item => !item.lan_gui_cuoi || String(item.lan_gui_cuoi) < dauPhut);
        return NextResponse.json({ lich: denHan });
      }

      const id = String(body.id || "");
      await admin.from("dmx_line_lich_gui").update({ lan_gui_cuoi: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    const user = await layNguoiDung(request);
    if (!user || user.user_metadata?.ung_dung !== "dmx") {
      return NextResponse.json({ loi: "Hãy đăng nhập tài khoản DMX." }, { status: 401 });
    }

    if (hanhDong === "tao_ma") {
      const ma = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const hetHan = new Date(Date.now() + THOI_HAN_MA_PHUT * 60_000);
      await admin.from("dmx_line_ma_gan_nhom").delete().eq("nguoi_dung_id", user.id);
      const { error } = await admin.from("dmx_line_ma_gan_nhom").insert({
        ma_hash: bamMa(ma), nguoi_dung_id: user.id, het_han: hetHan.toISOString(),
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, ma, soPhut: THOI_HAN_MA_PHUT });
    }

    if (hanhDong === "danh_sach") {
      const [{ data: nhom }, { data: lich }] = await Promise.all([
        admin.from("dmx_line_nhom").select("line_group_id,ten_nhom,dang_hoat_dong").eq("nguoi_dung_id", user.id).order("ngay_tao"),
        admin.from("dmx_line_lich_gui").select("id,line_group_id,gio,cac_thu,cac_noi_dung,dang_hoat_dong").eq("nguoi_dung_id", user.id).order("gio"),
      ]);
      return NextResponse.json({ nhom: nhom || [], lich: lich || [] });
    }

    if (hanhDong === "luu_lich") {
      const groupId = String(body.lineGroupId || "");
      const gio = String(body.gio || "");
      const cacThu = Array.isArray(body.cacThu) ? body.cacThu.map(Number).filter(v => v >= 1 && v <= 7) : [];
      const cacNoiDung = Array.isArray(body.cacNoiDung)
        ? body.cacNoiDung.map(String).filter(v => (CAC_LOAI_LICH as readonly string[]).includes(v)) : [];
      if (!gioHopLe(gio) || !cacThu.length || !cacNoiDung.length) {
        return NextResponse.json({ loi: "Hãy chọn giờ, ngày gửi và ít nhất một nội dung." }, { status: 400 });
      }
      const { data: nhom } = await admin.from("dmx_line_nhom").select("line_group_id")
        .eq("line_group_id", groupId).eq("nguoi_dung_id", user.id).maybeSingle();
      if (!nhom) return NextResponse.json({ loi: "Nhóm LINE không thuộc tài khoản này." }, { status: 403 });
      const id = String(body.id || "");
      const payload = { line_group_id: groupId, nguoi_dung_id: user.id, gio: `${gio}:00`, cac_thu: cacThu,
        cac_noi_dung: cacNoiDung, dang_hoat_dong: body.dangHoatDong !== false, ngay_cap_nhat: new Date().toISOString() };
      const query = id ? admin.from("dmx_line_lich_gui").update(payload).eq("id", id).eq("nguoi_dung_id", user.id)
        : admin.from("dmx_line_lich_gui").insert(payload);
      const { error } = await query;
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (hanhDong === "xoa_lich") {
      await admin.from("dmx_line_lich_gui").delete().eq("id", String(body.id || "")).eq("nguoi_dung_id", user.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ loi: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/dmx/bot/nhom error", error);
    return NextResponse.json({ loi: "Chưa xử lý được cấu hình gửi báo cáo." }, { status: 500 });
  }
}
