import { redirect } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { FormDangBai } from "@/components/bai-viet/form-dang-bai";

export const dynamic = "force-dynamic";

export default async function TrangDangBai() {
  const supabase = await taoSupabaseMayChu();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/dang-nhap");

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("dang_hoat_dong")
    .eq("id", user.id)
    .maybeSingle();

  if (!nguoiDung?.dang_hoat_dong) redirect("/dang-nhap");

  const { data: danhSachDeMuc } = await supabase
    .from("de_muc")
    .select(`
      id,
      ten_de_muc,
      thu_tu,
      de_muc_con (
        id,
        ten_de_muc_con,
        thu_tu,
        dang_hien_thi
      )
    `)
    .eq("dang_hien_thi", true)
    .order("thu_tu", { ascending: true });

  const duLieu = (danhSachDeMuc ?? []).map((deMuc) => ({
    id: deMuc.id,
    ten_de_muc: deMuc.ten_de_muc,
    de_muc_con: [...(deMuc.de_muc_con ?? [])]
      .filter((deMucCon) => deMucCon.dang_hien_thi)
      .sort((a, b) => a.thu_tu - b.thu_tu)
      .map((deMucCon) => ({
        id: deMucCon.id,
        ten_de_muc_con: deMucCon.ten_de_muc_con,
      })),
  }));

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm md:p-8">
        <p className="font-semibold text-blue-600">Bài viết</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">
          Đăng bài mới
        </h1>
        <p className="mt-2 text-slate-600">
          Nhập nội dung, chọn đề mục và ảnh đại diện cho bài viết.
        </p>

        <div className="mt-7">
          <FormDangBai danhSachDeMuc={duLieu} />
        </div>
      </section>
    </main>
  );
}
