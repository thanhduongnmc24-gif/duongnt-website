import "server-only";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";

export type ThemeWebsite = {
  ma: string;
  mauChinh: string;
  mauPhu: string;
  mauNen: string;
  mauChu: string;
};

export const themeMacDinh: ThemeWebsite = {
  ma: "modern-blue",
  mauChinh: "#2563eb",
  mauPhu: "#0f172a",
  mauNen: "#f8fafc",
  mauChu: "#0f172a",
};

export async function layThemeWebsite(): Promise<ThemeWebsite> {
  const supabase = await taoSupabaseMayChu();
  const { data } = await supabase
    .from("cau_hinh_website")
    .select(`mau_chinh,mau_phu,mau_nen,mau_chu,giao_dien(ma_giao_dien)`)
    .limit(1)
    .maybeSingle();

  const giaoDien = Array.isArray(data?.giao_dien)
    ? data?.giao_dien[0]
    : data?.giao_dien;

  return {
    ma: giaoDien?.ma_giao_dien || themeMacDinh.ma,
    mauChinh: data?.mau_chinh || themeMacDinh.mauChinh,
    mauPhu: data?.mau_phu || themeMacDinh.mauPhu,
    mauNen: data?.mau_nen || themeMacDinh.mauNen,
    mauChu: data?.mau_chu || themeMacDinh.mauChu,
  };
}
