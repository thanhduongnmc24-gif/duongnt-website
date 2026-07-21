import { redirect } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { QuanLyBaiViet } from "@/components/quan-tri/quan-ly-bai-viet";

export const dynamic = "force-dynamic";

export default async function TrangQuanLyBaiViet() {
  const supabase = await taoSupabaseMayChu();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/dang-nhap");

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("dang_hoat_dong")
    .eq("id", user.id)
    .maybeSingle();

  if (!nguoiDung?.dang_hoat_dong) redirect("/dang-nhap");

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="font-semibold text-blue-600">Trang quản trị</p>
          <h1 className="text-3xl font-black text-slate-900">Quản lý bài viết</h1>
          <p className="mt-2 text-slate-600">
            Quản trị viên xem mọi bài viết. Người dùng chỉ xem và sửa bài của mình.
          </p>
        </header>
        <QuanLyBaiViet />
      </div>
    </main>
  );
}
