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

    if ([
      "gan_nhom", "lich_den_han", "kiem_tra_lich", "da_gui", "anh_da_gui",
      "kiem_tra_anh_moi", "danh_dau_anh_da_gui", "tao_theo_doi_tag",
      "ghi_nhan_phan_hoi", "nhac_den_han", "da_nhac_tag",
    ].includes(hanhDong)) {
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

      if (hanhDong === "kiem_tra_anh_moi" || hanhDong === "danh_dau_anh_da_gui") {
        const groupId = String(body.lineGroupId || "").trim();
        const nguoiDungId = String(body.nguoiDungId || "").trim();
        const sieuThiId = String(body.sieuThiId || "").trim();
        const loai = String(body.loai || "").split("~", 1)[0].trim().toLowerCase();
        const phienBanAnh = String(body.phienBanAnh || "").trim().slice(0, 1000);
        if (!groupId || !/^[0-9a-f-]{36}$/i.test(nguoiDungId) || !/^[0-9a-f-]{36}$/i.test(sieuThiId)
          || !(CAC_LOAI_LICH as readonly string[]).includes(loai) || !phienBanAnh) {
          return NextResponse.json({ loi: "Thông tin nhận diện ảnh không hợp lệ." }, { status: 400 });
        }
        if (hanhDong === "kiem_tra_anh_moi") {
          const { data, error } = await admin.from("dmx_line_anh_da_gui")
            .select("phien_ban_anh")
            .eq("line_group_id", groupId).eq("nguoi_dung_id", nguoiDungId)
            .eq("sieu_thi_id", sieuThiId).eq("loai", loai).maybeSingle();
          if (error) throw error;
          return NextResponse.json({ ok: true, canGui: data?.phien_ban_anh !== phienBanAnh });
        }
        const { error } = await admin.from("dmx_line_anh_da_gui").upsert({
          line_group_id: groupId, nguoi_dung_id: nguoiDungId, sieu_thi_id: sieuThiId,
          loai, phien_ban_anh: phienBanAnh, ngay_gui: new Date().toISOString(),
        }, { onConflict: "line_group_id,nguoi_dung_id,sieu_thi_id,loai" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }

      if (hanhDong === "tao_theo_doi_tag") {
        const groupId = String(body.lineGroupId || "").trim();
        const messageId = String(body.lineMessageId || "").trim();
        const nguoiGuiId = String(body.nguoiGuiId || "").trim();
        const dsTagGoc = Array.isArray(body.nguoiDuocTag) ? body.nguoiDuocTag : [];
        const dsTag = dsTagGoc.map(item => {
          const value = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return { userId: String(value.userId || "").trim(), ten: String(value.ten || "Người dùng").trim().slice(0, 120) };
        }).filter(item => /^U[0-9a-f]{20,64}$/i.test(item.userId) && item.userId !== nguoiGuiId).slice(0, 20);
        if (!groupId || !messageId || !nguoiGuiId || !dsTag.length) return NextResponse.json({ ok: true, daTheoDoi: false });
        const { data: cauHinh, error: loiCauHinh } = await admin.from("dmx_line_cau_hinh_nhac")
          .select("bat_nhac_phan_hoi,so_phut_cho").eq("line_group_id", groupId).maybeSingle();
        if (loiCauHinh) throw loiCauHinh;
        if (!cauHinh?.bat_nhac_phan_hoi) return NextResponse.json({ ok: true, daTheoDoi: false });
        const soPhutCho = Math.max(1, Number(cauHinh.so_phut_cho || 30));
        const nowMs = Date.now();
        const tenDuocTag = Object.fromEntries(dsTag.map(item => [item.userId, item.ten]));
        const { error } = await admin.from("dmx_line_tin_nhac").upsert({
          line_group_id: groupId, line_message_id: messageId,
          quote_token: String(body.quoteToken || "").trim() || null,
          nguoi_gui_id: nguoiGuiId,
          ten_nguoi_gui: String(body.tenNguoiGui || "Người gửi").trim().slice(0, 120),
          user_ids_duoc_tag: dsTag.map(item => item.userId), ten_duoc_tag: tenDuocTag,
          user_ids_da_phan_hoi: [], noi_dung_goc: String(body.noiDungGoc || "").slice(0, 2000),
          ngay_tao: new Date(nowMs).toISOString(),
          het_han: new Date(nowMs + soPhutCho * 60_000).toISOString(),
          da_nhac: false, ngay_cap_nhat: new Date(nowMs).toISOString(),
        }, { onConflict: "line_message_id" });
        if (error) throw error;
        return NextResponse.json({ ok: true, daTheoDoi: true, soPhutCho });
      }

      if (hanhDong === "ghi_nhan_phan_hoi") {
        const groupId = String(body.lineGroupId || "").trim();
        const userId = String(body.lineUserId || "").trim();
        if (!groupId || !userId) return NextResponse.json({ ok: true });
        const { data, error } = await admin.from("dmx_line_tin_nhac")
          .select("id,user_ids_duoc_tag,user_ids_da_phan_hoi")
          .eq("line_group_id", groupId).eq("da_nhac", false)
          .contains("user_ids_duoc_tag", [userId]).limit(50);
        if (error) throw error;
        for (const item of data || []) {
          const daPhanHoi = Array.from(new Set([...(item.user_ids_da_phan_hoi || []), userId]));
          const hoanTat = (item.user_ids_duoc_tag || []).every((id: string) => daPhanHoi.includes(id));
          const { error: loiCapNhat } = await admin.from("dmx_line_tin_nhac").update({
            user_ids_da_phan_hoi: daPhanHoi, da_nhac: hoanTat, ngay_cap_nhat: new Date().toISOString(),
          }).eq("id", item.id);
          if (loiCapNhat) throw loiCapNhat;
        }
        return NextResponse.json({ ok: true });
      }

      if (hanhDong === "nhac_den_han") {
        const { data, error } = await admin.from("dmx_line_tin_nhac")
          .select("id,line_group_id,quote_token,nguoi_gui_id,ten_nguoi_gui,user_ids_duoc_tag,ten_duoc_tag,user_ids_da_phan_hoi,noi_dung_goc,ngay_tao,het_han")
          .eq("da_nhac", false).lte("het_han", new Date().toISOString()).order("het_han").limit(50);
        if (error) throw error;
        const groupIds = Array.from(new Set((data || []).map(item => String(item.line_group_id || "")).filter(Boolean)));
        const [{ data: dsCauHinh }, { data: dsNhom }] = groupIds.length
          ? await Promise.all([
              admin.from("dmx_line_cau_hinh_nhac").select("line_group_id,so_phut_cho").in("line_group_id", groupIds),
              admin.from("dmx_line_nhom").select("line_group_id,nguoi_dung_id,ten_nhom,dang_hoat_dong").in("line_group_id", groupIds).eq("dang_hoat_dong", true),
            ])
          : [{ data: [] }, { data: [] }];
        const nguoiDungIds = Array.from(new Set((dsNhom || []).map(item => String(item.nguoi_dung_id || "")).filter(Boolean)));
        const { data: dsLienKet } = nguoiDungIds.length
          ? await admin.from("dmx_line_lien_ket").select("nguoi_dung_id,line_user_id").in("nguoi_dung_id", nguoiDungIds)
          : { data: [] };

        const soPhutTheoNhom = new Map((dsCauHinh || []).map(item => [String(item.line_group_id), Number(item.so_phut_cho || 30)]));
        const tenNhomTheoId = new Map<string, string>();
        const lineUsersTheoNhom = new Map<string, string[]>();
        const lineUserTheoNguoiDung = new Map<string, string[]>();
        for (const lk of dsLienKet || []) {
          const uid = String(lk.nguoi_dung_id || "");
          const lid = String(lk.line_user_id || "").trim();
          if (uid && /^U[0-9a-f]{20,64}$/i.test(lid)) {
            lineUserTheoNguoiDung.set(uid, [...(lineUserTheoNguoiDung.get(uid) || []), lid]);
          }
        }
        for (const nhom of dsNhom || []) {
          const gid = String(nhom.line_group_id || "");
          const ten = String(nhom.ten_nhom || "").trim();
          if (gid && ten && !tenNhomTheoId.has(gid)) tenNhomTheoId.set(gid, ten);
          const lids = lineUserTheoNguoiDung.get(String(nhom.nguoi_dung_id || "")) || [];
          if (gid && lids.length) {
            lineUsersTheoNhom.set(gid, Array.from(new Set([...(lineUsersTheoNhom.get(gid) || []), ...lids])));
          }
        }

        const nhac = (data || []).map(item => {
          const soPhutTuHan = item.het_han && item.ngay_tao
            ? Math.max(1, Math.round((new Date(String(item.het_han)).getTime() - new Date(String(item.ngay_tao)).getTime()) / 60_000))
            : 0;
          const soPhutCho = soPhutTuHan || soPhutTheoNhom.get(item.line_group_id) || 30;
          const lineUserIdsNhanRieng = Array.from(new Set([
            ...(/^U[0-9a-f]{20,64}$/i.test(String(item.nguoi_gui_id || "")) ? [String(item.nguoi_gui_id)] : []),
            ...(lineUsersTheoNhom.get(item.line_group_id) || []),
          ]));
          return {
            ...item,
            so_phut_cho: soPhutCho,
            ten_nhom: tenNhomTheoId.get(item.line_group_id) || "Nhóm LINE",
            line_user_ids_nhan_rieng: lineUserIdsNhanRieng,
            user_ids_chua_phan_hoi: (item.user_ids_duoc_tag || []).filter((id: string) => !(item.user_ids_da_phan_hoi || []).includes(id)),
          };
        }).filter(item => item.user_ids_chua_phan_hoi.length > 0);
        const idsDaDu = (data || []).filter(item => (item.user_ids_duoc_tag || []).every((id: string) => (item.user_ids_da_phan_hoi || []).includes(id))).map(item => item.id);
        if (idsDaDu.length) await admin.from("dmx_line_tin_nhac").update({ da_nhac: true, ngay_cap_nhat: new Date().toISOString() }).in("id", idsDaDu);
        return NextResponse.json({ nhac });
      }

      if (hanhDong === "da_nhac_tag") {
        const id = String(body.id || "").trim();
        if (/^[0-9a-f-]{36}$/i.test(id)) {
          const { error } = await admin.from("dmx_line_tin_nhac").update({ da_nhac: true, ngay_cap_nhat: new Date().toISOString() }).eq("id", id);
          if (error) throw error;
        }
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
      const [{ data: nhom }, { data: lich }, { data: cauHinhNhac }] = await Promise.all([
        admin.from("dmx_line_nhom").select("line_group_id,ten_nhom,dang_hoat_dong").eq("nguoi_dung_id", user.id).order("ngay_tao"),
        admin.from("dmx_line_lich_gui").select("id,line_group_id,sieu_thi_id,gio,cac_thu,cac_noi_dung,kieu_gui,dang_hoat_dong").eq("nguoi_dung_id", user.id).eq("sieu_thi_id", sieuThiId).order("gio"),
        admin.from("dmx_line_cau_hinh_nhac").select("line_group_id,bat_nhac_phan_hoi,so_phut_cho"),
      ]);
      const cauHinhTheoNhom = new Map((cauHinhNhac || []).map(item => [item.line_group_id, item]));
      const nhomDayDu = (nhom || []).map(item => ({
        ...item,
        bat_nhac_phan_hoi: cauHinhTheoNhom.get(item.line_group_id)?.bat_nhac_phan_hoi ?? false,
        so_phut_cho: cauHinhTheoNhom.get(item.line_group_id)?.so_phut_cho ?? 30,
      }));
      return NextResponse.json({ nhom: nhomDayDu, lich: lich || [], sieuThiId });
    }

    if (hanhDong === "luu_nhac_nhom") {
      const groupId = String(body.lineGroupId || "").trim();
      const soPhutCho = Math.max(1, Math.min(1440, Math.round(Number(body.soPhutCho || 30))));
      const { data: nhom } = await admin.from("dmx_line_nhom").select("line_group_id")
        .eq("line_group_id", groupId).eq("nguoi_dung_id", user.id).maybeSingle();
      if (!nhom) return NextResponse.json({ loi: "Nhóm LINE không thuộc tài khoản này." }, { status: 403 });
      const { error } = await admin.from("dmx_line_cau_hinh_nhac").upsert({
        line_group_id: groupId, bat_nhac_phan_hoi: body.batNhacPhanHoi === true,
        so_phut_cho: soPhutCho, ngay_cap_nhat: new Date().toISOString(),
      }, { onConflict: "line_group_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true, batNhacPhanHoi: body.batNhacPhanHoi === true, soPhutCho });
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
