import { notFound } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { TrangChuTheoTheme } from "@/themes/trang-chu-theme";
import { laMaGiaoDienHopLe } from "@/themes/cau-hinh";

export const dynamic = "force-dynamic";
export default async function XemTruoc({ params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  if (!laMaGiaoDienHopLe(ma)) notFound();
  const supabase = await taoSupabaseMayChu();
  const [{ data: cauHinh }, { data: baiViet }, { data: deMuc }] = await Promise.all([
    supabase.from("cau_hinh_website").select("ten_website,mo_ta_website").limit(1).maybeSingle(),
    supabase.from("bai_viet").select("id,tieu_de,duong_dan,tom_tat,google_drive_anh_dai_dien_file_id,ngay_dang,luot_xem").eq("trang_thai","da_dang").is("ngay_xoa",null).order("ngay_dang",{ascending:false}).limit(20),
    supabase.from("de_muc").select("id,ten_de_muc,duong_dan").eq("dang_hien_thi",true).order("thu_tu"),
  ]);
  return <TrangChuTheoTheme maTheme={ma} duLieu={{tenWebsite:cauHinh?.ten_website||"duongnt.io.vn",moTaWebsite:cauHinh?.mo_ta_website||"Chia sẻ kiến thức và kinh nghiệm.",danhSachBaiViet:baiViet||[],danhSachDeMuc:deMuc||[]}}/>;
}
