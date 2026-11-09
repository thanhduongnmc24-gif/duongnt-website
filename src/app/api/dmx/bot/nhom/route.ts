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

async function laySieuThiDangChon(admin: ReturnType<typeof taoSupabaseQuanTri>, userId: string, request: Request) {
  const tuHeader = request.headers.get("x-dmx-store-id")?.trim() || "";
  if (tuHeader) {
    const { data } = await admin.from("dmx_sieu_thi").select("id").eq("id", tuHeader).eq("nguoi_dung_id", userId).maybeSingle();
    if (data?.id) return String(data.id);
  }
  const { data } = await admin.from("dmx_ho_so").select("sieu_thi_dang_chon").eq("nguoi_dung_id", userId).maybeSingle();
  if (!data?.sieu_thi_dang_chon) throw new Error("Tài khoản chưa chọn siêu thị.");
  return String(data.sieu_thi_dang_chon);
}

function layGioVietNam() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || "";
  const thuMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const gio = `${get("hour")}:${get("minute")}`;
  return { thu: thuMap[get("weekday")] || 1, gio, ngay: `${get("year")}-${get("month")}-${get("day")}` };
}

function ngayVietNam(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function soPhut(gio: string) {
  const [h, m] = gio.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

async function donAnhSupabaseDaGui(admin: ReturnType<typeof taoSupabaseQuanTri>) {
  const { data, error } = await admin.from("dmx_line_anh_bao_cao")
    .select("nguoi_dung_id,sieu_thi_id,loai,duong_dan_luu_tru")
    .eq("nha_cung_cap", "supabase")
    .not("xoa_sau", "is", null)
    .lte("xoa_sau", new Date().toISOString())
    .limit(100);
  if (error || !data?.length) return;

  const duongDan = data.map(item => String(item.duong_dan_luu_tru || "")).filter(Boolean);
  if (duongDan.length) await admin.storage.from("dmx-du-lieu").remove(duongDan);
  for (const item of data) {
    await admin.from("dmx_line_anh_bao_cao").delete()
      .eq("nguoi_dung_id", item.nguoi_dung_id)
      .eq("sieu_thi_id", item.sieu_thi_id)
      .eq("loai", item.loai)
      .eq("nha_cung_cap", "supabase");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const hanhDong = String(body.hanhDong || "").trim().toLowerCase();
    const admin = taoSupabaseQuanTri();

    if (["gan_nhom", "lich_den_han", "kiem_tra_lich", "da_gui", "anh_da_gui"].includes(hanhDong)) {
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
        }, { onConflict: "line_group_id,nguoi_dung_id" });
        if (error) throw error;
        await admin.from("dmx_line_ma_gan_nhom").delete().eq("ma_hash", bamMa(ma));
        return NextResponse.json({ ok: true, thongBao: "Đã gắn nhóm với tài khoản DMX." });
      }

      if (hanhDong === "lich_den_han") {
        await donAnhSupabaseDaGui(admin);
        const { thu, gio, ngay } = layGioVietNam();
        const { data, error } = await admin.from("dmx_line_lich_gui")
          .select("id,line_group_id,nguoi_dung_id,sieu_thi_id,gio,cac_thu,cac_noi_dung,kieu_gui,lan_gui_cuoi,dmx_line_nhom!inner(dang_hoat_dong)")
          .eq("dang_hoat_dong", true).eq("dmx_line_nhom.dang_hoat_dong", true)
          .contains("cac_thu", [thu]);
        if (error) throw error;
        // Cloudflare có thể kích hoạt Cron trễ vài phút. Không bắt buộc khớp đúng phút:
        // mọi lịch đã đến giờ và chưa gửi trong ngày sẽ được gửi bù ở nhịp kế tiếp.
        const phutHienTai = soPhut(gio);
        const denHan = (data || []).filter(item => {
          if (soPhut(String(item.gio || "00:00")) > phutHienTai) return false;
          return !item.lan_gui_cuoi || ngayVietNam(String(item.lan_gui_cuoi)) !== ngay;
        });
        // Gắn mã siêu thị vào từng loại báo cáo để cả Worker phiên bản cũ (chưa
        // gửi header X-DMX-Store-ID) vẫn lấy đúng dữ liệu của lịch.
        const lichTuongThich = denHan.map(item => ({
          ...item,
          cac_noi_dung: (item.cac_noi_dung || []).map((loai: string) => `${loai}~${item.sieu_thi_id}`),
        }));
        return NextResponse.json({ lich: lichTuongThich });
      }

      if (hanhDong === "kiem_tra_lich") {
        const id = String(body.id || "").trim();
        if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ conHieuLuc: false });
        const { data, error } = await admin.from("dmx_line_lich_gui")
          .select("id,dmx_line_nhom!inner(dang_hoat_dong)")
          .eq("id", id)
          .eq("dang_hoat_dong", true)
          .eq("dmx_line_nhom.dang_hoat_dong", true)
          .maybeSingle();
        if (error) throw error;
        return NextResponse.json({ conHieuLuc: Boolean(data?.id) });
      }

      if (hanhDong === "anh_da_gui") {
        const lineUserId = String(body.lineUserId || "").trim();
        const loai = String(body.loai || "").trim().toLowerCase();
        if (!(CAC_LOAI_LICH as readonly string[]).includes(loai) || !/^U[0-9a-f]{20,64}$/i.test(lineUserId)) {
          return NextResponse.json({ loi: "Thông tin ảnh vừa gửi không hợp lệ." }, { status: 400 });
        }
        // Giữ lại đúng một ảnh mới nhất cho mỗi loại để lần tra cứu/lịch sau không rơi về ảnh web khác mẫu.
        // Ảnh mới từ app luôn ghi đè cùng đường dẫn nên dung lượng không tăng theo lịch sử.
        return NextResponse.json({ ok: true });
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
      const sieuThiId = await laySieuThiDangChon(admin, user.id, request);
      const [{ data: nhom }, { data: lich }] = await Promise.all([
        admin.from("dmx_line_nhom").select("line_group_id,ten_nhom,dang_hoat_dong").eq("nguoi_dung_id", user.id).order("ngay_tao"),
        admin.from("dmx_line_lich_gui").select("id,line_group_id,sieu_thi_id,gio,cac_thu,cac_noi_dung,kieu_gui,dang_hoat_dong").eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId).order("gio"),
      ]);
      return NextResponse.json({ nhom: nhom || [], lich: lich || [], sieuThiId });
    }

    if (hanhDong === "luu_lich") {
      const sieuThiId = await laySieuThiDangChon(admin, user.id, request);
      const groupId = String(body.lineGroupId || "");
      const gio = String(body.gio || "");
      const cacThu = Array.isArray(body.cacThu) ? body.cacThu.map(Number).filter(v => v >= 1 && v <= 7) : [];
      const cacNoiDung = Array.isArray(body.cacNoiDung)
        ? body.cacNoiDung.map(String).filter(v => (CAC_LOAI_LICH as readonly string[]).includes(v)) : [];
      const kieuGui = body.kieuGui === "text" ? "text" : "anh";
      if (!gioHopLe(gio) || !cacThu.length || !cacNoiDung.length) {
        return NextResponse.json({ loi: "Hãy chọn giờ, ngày gửi và ít nhất một nội dung." }, { status: 400 });
      }
      const { data: nhom } = await admin.from("dmx_line_nhom").select("line_group_id")
        .eq("line_group_id", groupId).eq("nguoi_dung_id", user.id).maybeSingle();
      if (!nhom) return NextResponse.json({ loi: "Nhóm LINE không thuộc tài khoản này." }, { status: 403 });
      const id = String(body.id || "");
      const payload = { line_group_id: groupId, nguoi_dung_id: user.id, sieu_thi_id: sieuThiId, gio: `${gio}:00`, cac_thu: cacThu,
        cac_noi_dung: cacNoiDung, kieu_gui: kieuGui, dang_hoat_dong: body.dangHoatDong !== false, ngay_cap_nhat: new Date().toISOString() };
      const query = id ? admin.from("dmx_line_lich_gui").update(payload).eq("id", id).eq("nguoi_dung_id", user.id)
        : admin.from("dmx_line_lich_gui").insert(payload);
      const { data: lichDaLuu, error } = await query
        .select("id,line_group_id,sieu_thi_id,gio,cac_thu,cac_noi_dung,kieu_gui,dang_hoat_dong")
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, lich: lichDaLuu });
    }

    if (hanhDong === "xoa_lich") {
      const id = String(body.id || "");
      const { data: lichBiXoa, error: loiDoc } = await admin.from("dmx_line_lich_gui")
        .select("cac_noi_dung,sieu_thi_id").eq("id", id).eq("nguoi_dung_id", user.id).maybeSingle();
      if (loiDoc) throw loiDoc;
      if (!lichBiXoa) {
        return NextResponse.json({ loi: "Lịch này không còn tồn tại trên máy chủ." }, { status: 404 });
      }
      // Tắt trước rồi mới xóa: Cron đã lấy danh sách ở nhịp trước sẽ bị bước
      // kiểm tra ngay trước khi gửi chặn lại, kể cả lúc xóa trùng đúng phút gửi.
      const { error: loiTat } = await admin.from("dmx_line_lich_gui")
        .update({ dang_hoat_dong: false, ngay_cap_nhat: new Date().toISOString() })
        .eq("id", id).eq("nguoi_dung_id", user.id);
      if (loiTat) throw loiTat;
      const { error: loiXoa } = await admin.from("dmx_line_lich_gui")
        .delete().eq("id", id).eq("nguoi_dung_id", user.id);
      if (loiXoa) throw loiXoa;
      if (Array.isArray(lichBiXoa?.cac_noi_dung)) {
        for (const loai of lichBiXoa.cac_noi_dung) {
          const { count } = await admin.from("dmx_line_lich_gui")
            .select("id", { count: "exact", head: true })
            .eq("nguoi_dung_id", user.id).eq("dang_hoat_dong", true)
            .eq("sieu_thi_id", lichBiXoa.sieu_thi_id)
            .eq("kieu_gui", "anh")
            .contains("cac_noi_dung", [loai]);
          if ((count || 0) === 0) {
            await admin.from("dmx_line_anh_bao_cao")
              .update({ xoa_sau: new Date(Date.now() + 5 * 60_000).toISOString() })
              .eq("nguoi_dung_id", user.id).eq("sieu_thi_id", lichBiXoa.sieu_thi_id)
              .eq("loai", loai).eq("nha_cung_cap", "supabase");
          }
        }
      }
      return NextResponse.json({ ok: true, id });
    }

    return NextResponse.json({ loi: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/dmx/bot/nhom error", error);
    return NextResponse.json({ loi: "Chưa xử lý được cấu hình gửi báo cáo." }, { status: 500 });
  }
}
