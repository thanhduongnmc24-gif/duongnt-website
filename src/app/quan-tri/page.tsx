import { redirect } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";

export default async function TrangQuanTri() {
  const supabase = await taoSupabaseMayChu();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dang-nhap");
  }

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select(
      "ten_dang_nhap, ten_hien_thi, vai_tro, dang_hoat_dong"
    )
    .eq("id", user.id)
    .single();

  if (
    !nguoiDung ||
    !nguoiDung.dang_hoat_dong ||
    nguoiDung.vai_tro !== "quan_tri"
  ) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Trang quản trị
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Xin chào, {nguoiDung.ten_hien_thi}
            </h1>

            <p className="mt-2 text-slate-600">
              Tài khoản: {nguoiDung.ten_dang_nhap}
            </p>
          </div>

          <form action="/api/dang-xuat" method="post">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Đăng xuất
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border p-5">
            <h2 className="font-bold">Quản lý tài khoản</h2>
            <p className="mt-2 text-sm text-slate-600">
              Tạo và phân quyền người dùng.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-bold">Quản lý đề mục</h2>
            <p className="mt-2 text-sm text-slate-600">
              Quản lý menu cấp 1 và menu cấp 2.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-bold">Quản lý giao diện</h2>
            <p className="mt-2 text-sm text-slate-600">
              Chọn giao diện và màu sắc website.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}