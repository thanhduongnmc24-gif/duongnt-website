import { NextResponse } from "next/server";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

async function laQuanTri() {
  const supabase = await taoSupabaseMayChu();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("nguoi_dung")
    .select("vai_tro,dang_hoat_dong").eq("id", user.id).maybeSingle();
  return data?.dang_hoat_dong && data.vai_tro === "quan_tri" ? user : null;
}

export async function GET() {
  if (!await laQuanTri()) return NextResponse.json({ thanh_cong:false, loi:"Không có quyền quản trị." }, { status:403 });
  const admin = taoSupabaseQuanTri();
  const [{ data: ds }, { data: cauHinh }] = await Promise.all([
    admin.from("giao_dien").select("id,ma_giao_dien,ten_giao_dien,mo_ta,dang_kich_hoat").order("ngay_tao"),
    admin.from("cau_hinh_website").select("id,giao_dien_id,mau_chinh,mau_phu,mau_nen,mau_chu").limit(1).maybeSingle(),
  ]);
  return NextResponse.json({ thanh_cong:true, du_lieu:{ danh_sach:ds || [], cau_hinh:cauHinh } });
}

export async function PATCH(yeuCau: Request) {
  const user = await laQuanTri();
  if (!user) return NextResponse.json({ thanh_cong:false, loi:"Không có quyền quản trị." }, { status:403 });
  const body = await yeuCau.json();
  const admin = taoSupabaseQuanTri();
  const { data: cauHinh } = await admin.from("cau_hinh_website").select("id").limit(1).maybeSingle();
  if (!cauHinh) return NextResponse.json({ thanh_cong:false, loi:"Chưa có cấu hình website." }, { status:404 });
  const mauHopLe = (v: unknown, macDinh: string) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : macDinh;
  const capNhat = {
    giao_dien_id: String(body.giao_dien_id || ""),
    mau_chinh: mauHopLe(body.mau_chinh, "#2563eb"),
    mau_phu: mauHopLe(body.mau_phu, "#0f172a"),
    mau_nen: mauHopLe(body.mau_nen, "#f8fafc"),
    mau_chu: mauHopLe(body.mau_chu, "#0f172a"),
    ngay_cap_nhat: new Date().toISOString(),
  };
  const { error } = await admin.from("cau_hinh_website").update(capNhat).eq("id", cauHinh.id);
  if (error) return NextResponse.json({ thanh_cong:false, loi:error.message }, { status:400 });
  await admin.from("giao_dien").update({ dang_kich_hoat:false }).neq("id", capNhat.giao_dien_id);
  await admin.from("giao_dien").update({ dang_kich_hoat:true }).eq("id", capNhat.giao_dien_id);
  return NextResponse.json({ thanh_cong:true, thong_bao:"Đã áp dụng giao diện mới." });
}
