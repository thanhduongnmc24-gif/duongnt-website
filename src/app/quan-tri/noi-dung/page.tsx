import Link from "next/link";
import { redirect } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const dynamic = "force-dynamic";

export default async function TrangTongQuanNoiDung() {
  const supabase = await taoSupabaseMayChu();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");
  const { data: nguoiDung } = await supabase.from("nguoi_dung").select("vai_tro,dang_hoat_dong").eq("id", user.id).maybeSingle();
  if (!nguoiDung?.dang_hoat_dong) redirect("/dang-nhap");
  const admin = taoSupabaseQuanTri();
  let q = admin.from("bai_viet").select("trang_thai,ngay_xoa,nguoi_dang_id");
  if (nguoiDung.vai_tro !== "quan_tri") q = q.eq("nguoi_dang_id", user.id);
  const { data } = await q;
  const ds = data || [];
  const thongKe = {
    daDang: ds.filter((x) => !x.ngay_xoa && x.trang_thai === "da_dang").length,
    banNhap: ds.filter((x) => !x.ngay_xoa && x.trang_thai === "ban_nhap").length,
    daAn: ds.filter((x) => !x.ngay_xoa && x.trang_thai === "da_an").length,
    thungRac: ds.filter((x) => Boolean(x.ngay_xoa)).length,
  };
  return <main className="min-h-[calc(100vh-64px)] bg-slate-100 p-6"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black">Quản trị nội dung</h1><div className="mt-6 grid gap-4 md:grid-cols-4">{[["Đã đăng",thongKe.daDang],["Bản nháp",thongKe.banNhap],["Đã ẩn",thongKe.daAn],["Thùng rác",thongKe.thungRac]].map(([ten,so])=><div key={String(ten)} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-slate-500">{ten}</p><p className="mt-2 text-3xl font-black text-blue-600">{so}</p></div>)}</div><div className="mt-6 flex flex-wrap gap-3"><Link href="/quan-tri/bai-viet" className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Quản lý bài viết</Link><Link href="/quan-tri/thung-rac" className="rounded-xl bg-slate-800 px-5 py-3 font-bold text-white">Mở thùng rác</Link><Link href="/dang-bai" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold">Đăng bài mới</Link></div></div></main>;
}
