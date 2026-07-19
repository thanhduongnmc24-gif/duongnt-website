import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { TheBaiViet } from "@/components/bai-viet/the-bai-viet";

export const dynamic = "force-dynamic";

export default async function TrangChu() {
  const supabase = await taoSupabaseMayChu();

  const { data: cauHinh } = await supabase
    .from("cau_hinh_website")
    .select("ten_website, mo_ta_website, so_bai_moi_trang")
    .limit(1)
    .maybeSingle();

  const soBaiMoi = cauHinh?.so_bai_moi_trang || 12;

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
    .eq("trang_thai", "da_dang")
    .is("ngay_xoa", null)
    .order("ngay_dang", { ascending: false })
    .limit(soBaiMoi);

  return (
    <main className="min-h-[calc(100vh-64px)]">
      <section className="bg-gradient-to-r from-blue-700 to-indigo-700 px-4 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold uppercase tracking-wider text-blue-200">
            duongnt.io.vn
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            {cauHinh?.ten_website || "Chia sẻ kiến thức"}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-blue-100">
            {cauHinh?.mo_ta_website ||
              "Nơi chia sẻ bài viết, kiến thức và kinh nghiệm."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6">
          <p className="font-semibold text-blue-600">Nội dung mới</p>
          <h2 className="text-3xl font-bold text-slate-900">
            Bài viết mới nhất
          </h2>
        </div>

        {danhSachBaiViet && danhSachBaiViet.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {danhSachBaiViet.map((baiViet) => (
              <TheBaiViet key={baiViet.id} baiViet={baiViet} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Chưa có bài viết nào được đăng.
          </div>
        )}
      </section>
    </main>
  );
}
