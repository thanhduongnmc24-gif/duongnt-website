import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { layThemeWebsite } from "@/lib/theme/theme";
import { TrangChuTheoTheme } from "@/themes/trang-chu-theme";

export const dynamic = "force-dynamic";

export default async function TrangChu() {
  const supabase = await taoSupabaseMayChu();
  const theme = await layThemeWebsite();
  const [{ data: cauHinh }, { data: baiViet }, { data: deMuc }] = await Promise.all([
    supabase.from("cau_hinh_website").select("ten_website,mo_ta_website,so_bai_moi_trang").limit(1).maybeSingle(),
    supabase.from("bai_viet").select("id,tieu_de,duong_dan,tom_tat,google_drive_anh_dai_dien_file_id,ngay_dang,luot_xem").eq("trang_thai","da_dang").is("ngay_xoa",null).order("ngay_dang",{ascending:false}).limit(20),
    supabase.from("de_muc").select("id,ten_de_muc,duong_dan").eq("dang_hien_thi",true).order("thu_tu",{ascending:true}),
  ]);
  return <TrangChuTheoTheme maTheme={theme.ma} duLieu={{tenWebsite:cauHinh?.ten_website||"duongnt.io.vn",moTaWebsite:cauHinh?.mo_ta_website||"Nơi chia sẻ kiến thức và kinh nghiệm.",danhSachBaiViet:baiViet||[],danhSachDeMuc:deMuc||[]}}/>;
}
