import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const runtime = "nodejs";

const BUCKET_NAME = "dmx-du-lieu";

type CloudPayload = {
  caiDat?: Record<string, unknown>;
  cacNgay?: Record<string, Record<string, unknown>>;
  capNhatLuc?: string;
};

let daKiemTraBucket = false;

async function damBaoBucket(admin: ReturnType<typeof taoSupabaseQuanTri>) {
  if (daKiemTraBucket) return;
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    const tonTai = (buckets || []).some(b => b.name === BUCKET_NAME);
    if (!tonTai) {
      await admin.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024,
      });
    }
    daKiemTraBucket = true;
  } catch {
    // Bỏ qua nếu bucket đã tồn tại
  }
}

async function docFileCloud(
  admin: ReturnType<typeof taoSupabaseQuanTri>,
  userId: string
): Promise<CloudPayload> {
  await damBaoBucket(admin);
  try {
    const { data, error } = await admin.storage.from(BUCKET_NAME).download(`${userId}.json`);
    if (error || !data) return {};
    const text = await data.text();
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as CloudPayload) : {};
  } catch {
    return {};
  }
}

async function ghiFileCloud(
  admin: ReturnType<typeof taoSupabaseQuanTri>,
  userId: string,
  payload: CloudPayload
) {
  await damBaoBucket(admin);
  const body = Buffer.from(JSON.stringify(payload), "utf-8");
  await admin.storage.from(BUCKET_NAME).upload(`${userId}.json`, body, {
    contentType: "application/json",
    upsert: true,
  });
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

export async function GET(request: Request) {
  try {
    const user = await layNguoiDung(request);

    if (!user || user.user_metadata?.ung_dung !== "dmx") {
      return NextResponse.json({ loi: "Chưa đăng nhập tài khoản ĐMX." }, { status: 401 });
    }

    const admin = taoSupabaseQuanTri();
    const cloud = await docFileCloud(admin, user.id);

    let caiDat = cloud.caiDat || null;
    const cacNgay: Record<string, Record<string, unknown>> = { ...(cloud.cacNgay || {}) };

    // Kết hợp thêm dữ liệu từ bảng SQL dmx_ho_so & dmx_du_lieu_ngay (nếu bảng đã được tạo)
    try {
      const { data: hoSo } = await admin
        .from("dmx_ho_so")
        .select("cai_dat")
        .eq("nguoi_dung_id", user.id)
        .maybeSingle();
      if (hoSo?.cai_dat && typeof hoSo.cai_dat === "object") {
        caiDat = hoSo.cai_dat as Record<string, unknown>;
      }

      const { data: ngayRows } = await admin
        .from("dmx_du_lieu_ngay")
        .select("ngay,du_lieu")
        .eq("nguoi_dung_id", user.id)
        .order("ngay", { ascending: false })
        .limit(62);
      if (Array.isArray(ngayRows)) {
        for (const r of ngayRows) {
          if (r.ngay && r.du_lieu && typeof r.du_lieu === "object") {
            cacNgay[String(r.ngay)] = r.du_lieu as Record<string, unknown>;
          }
        }
      }
    } catch {
      // Bỏ qua nếu bảng SQL chưa push, vẫn dùng dữ liệu từ Supabase Storage
    }

    return NextResponse.json({
      caiDat,
      cacNgay,
      capNhatLuc: cloud.capNhatLuc || new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/dmx/dong-bo error", error);
    return NextResponse.json({ loi: "Chưa tải được dữ liệu đồng bộ." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await layNguoiDung(request);

    if (!user || user.user_metadata?.ung_dung !== "dmx") {
      return NextResponse.json({ loi: "Chưa đăng nhập tài khoản ĐMX." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      caiDat?: Record<string, unknown>;
      ngay?: string;
      duLieuNgay?: Record<string, unknown>;
    };

    const admin = taoSupabaseQuanTri();
    const hienTai = await docFileCloud(admin, user.id);

    const tiepTheo: CloudPayload = {
      caiDat: body.caiDat !== undefined ? body.caiDat : hienTai.caiDat,
      cacNgay: { ...(hienTai.cacNgay || {}) },
      capNhatLuc: new Date().toISOString(),
    };

    if (body.ngay && body.duLieuNgay && typeof body.duLieuNgay === "object") {
      tiepTheo.cacNgay![body.ngay] = body.duLieuNgay;
    }

    // Giới hạn lưu tối đa 62 ngày gần nhất để file nhẹ và đồng bộ tức thì
    const danhSachKhoa = Object.keys(tiepTheo.cacNgay || {}).sort().reverse();
    if (danhSachKhoa.length > 62) {
      const rutGon: Record<string, Record<string, unknown>> = {};
      for (const k of danhSachKhoa.slice(0, 62)) {
        rutGon[k] = tiepTheo.cacNgay![k];
      }
      tiepTheo.cacNgay = rutGon;
    }

    await ghiFileCloud(admin, user.id, tiepTheo);

    // Đồng bộ song song vào bảng SQL dmx_ho_so & dmx_du_lieu_ngay (nếu đã tạo bảng)
    try {
      const tenDangNhap = String(
        user.user_metadata?.ten_dang_nhap || user.email?.split("@")[0] || "user"
      );
      if (body.caiDat !== undefined) {
        await admin.from("dmx_ho_so").upsert(
          {
            nguoi_dung_id: user.id,
            ten_dang_nhap: tenDangNhap,
            cai_dat: body.caiDat,
            ngay_cap_nhat: tiepTheo.capNhatLuc,
          },
          { onConflict: "nguoi_dung_id" }
        );
      }
      if (body.ngay && body.duLieuNgay) {
        await admin.from("dmx_du_lieu_ngay").upsert(
          {
            nguoi_dung_id: user.id,
            ngay: body.ngay,
            du_lieu: body.duLieuNgay,
            ngay_cap_nhat: tiepTheo.capNhatLuc,
          },
          { onConflict: "nguoi_dung_id,ngay" }
        );
      }
    } catch {
      // Bỏ qua nếu bảng SQL chưa tạo
    }

    return NextResponse.json({
      ok: true,
      capNhatLuc: tiepTheo.capNhatLuc,
    });
  } catch (error) {
    console.error("POST /api/dmx/dong-bo error", error);
    return NextResponse.json({ loi: "Chưa lưu được dữ liệu đồng bộ." }, { status: 500 });
  }
}
