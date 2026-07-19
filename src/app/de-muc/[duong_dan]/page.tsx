import { notFound } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { TheBaiViet } from "@/components/bai-viet/the-bai-viet";

export const dynamic = "force-dynamic";

type ThuocTinhTrang = {
  params: Promise<{ duong_dan: string }>;
};

export default async function TrangDeMucCapMot({ params }: ThuocTinhTrang) {
  const { duong_dan } = await params;
  const supabase = await taoSupabaseMayChu();

  const { data: deMuc } = await supabase
    .from("de_muc")
    .select("id, ten_de_muc, mo_ta")
    .eq("duong_dan", duong_dan)
    .eq("dang_hien_thi", true)
    .maybeSingle();

  if (!deMuc) notFound();

  const { data: danhSachBaiViet } = await supabase
    .from("bai_viet")
    .select(`
      id,
      tieu_de,
      duong_dan,
      tom_tat,
      google_drive_anh_dai_dien_file_id,
      ngay_dang,
      luot_xem
    `)
    .eq("de_muc_id", deMuc.id)
    .eq("trang_thai", "da_dang")
    .is("ngay_xoa", null)
    .order("ngay_dang", { ascending: false });

  return (
    <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-10">
      <header className="mb-8 rounded-2xl bg-white p-7 shadow-sm">
        <p className="font-semibold text-blue-600">Đề mục</p>
        <h1 className="mt-1 text-4xl font-black text-slate-900">
          {deMuc.ten_de_muc}
        </h1>
        {deMuc.mo_ta ? <p className="mt-3 text-slate-600">{deMuc.mo_ta}</p> : null}
      </header>

      {danhSachBaiViet && danhSachBaiViet.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {danhSachBaiViet.map((baiViet) => (
            <TheBaiViet key={baiViet.id} baiViet={baiViet} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">
          Đề mục này chưa có bài viết.
        </div>
      )}
    </main>
  );
}
