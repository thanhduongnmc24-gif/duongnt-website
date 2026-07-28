import { notFound } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { TheBaiViet } from "@/components/bai-viet/the-bai-viet";
import { CatalogCongKhai } from "@/components/catalog/catalog-cong-khai";

export const dynamic = "force-dynamic";

type ThuocTinhTrang = {
  params: Promise<{
    duong_dan: string;
    duong_dan_con: string;
  }>;
};

export default async function TrangDeMucCapHai({ params }: ThuocTinhTrang) {
  const { duong_dan, duong_dan_con } = await params;
  const supabase = await taoSupabaseMayChu();

  const { data: deMuc } = await supabase
    .from("de_muc")
    .select("id,ten_de_muc")
    .eq("duong_dan", duong_dan)
    .eq("dang_hien_thi", true)
    .maybeSingle();

  if (!deMuc) notFound();

  const { data: deMucCon } = await supabase
    .from("de_muc_con")
    .select("id,ten_de_muc_con,mo_ta,de_muc_id,catalog_id")
    .eq("de_muc_id", deMuc.id)
    .eq("duong_dan", duong_dan_con)
    .eq("dang_hien_thi", true)
    .maybeSingle();

  if (!deMucCon) notFound();

  if (deMucCon.catalog_id) {
    const db = taoSupabaseQuanTri();
    const [{ data: catalog }, { data: cot }, { data: thietBi }] = await Promise.all([
      db
        .from("catalog")
        .select("*")
        .eq("id", deMucCon.catalog_id)
        .eq("trang_thai", "da_dang")
        .is("ngay_xoa", null)
        .maybeSingle(),
      db
        .from("catalog_cot")
        .select("*")
        .eq("catalog_id", deMucCon.catalog_id)
        .order("thu_tu"),
      db
        .from("catalog_thiet_bi")
        .select("*,catalog_gia_tri(cot_id,gia_tri)")
        .eq("catalog_id", deMucCon.catalog_id)
        .eq("dang_hien_thi", true)
        .is("ngay_xoa", null)
        .order("thu_tu"),
    ]);

    if (!catalog) notFound();

    return (
      <CatalogCongKhai
        catalog={catalog}
        cot={cot || []}
        thietBi={thietBi || []}
        duongDanChiTiet={`/de-muc/${duong_dan}/${duong_dan_con}`}
      />
    );
  }

  const { data: danhSachBaiViet } = await supabase
    .from("bai_viet")
    .select(
      "id,tieu_de,duong_dan,tom_tat,google_drive_anh_dai_dien_file_id,ngay_dang,luot_xem"
    )
    .eq("de_muc_con_id", deMucCon.id)
    .eq("trang_thai", "da_dang")
    .is("ngay_xoa", null)
    .order("ngay_dang", { ascending: false });

  return (
    <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-10">
      <header className="mb-8 rounded-2xl bg-white p-7 shadow-sm">
        <p className="font-semibold text-blue-600">{deMuc.ten_de_muc}</p>
        <h1 className="mt-1 text-4xl font-black text-slate-900">
          {deMucCon.ten_de_muc_con}
        </h1>
        {deMucCon.mo_ta ? (
          <p className="mt-3 text-slate-600">{deMucCon.mo_ta}</p>
        ) : null}
      </header>

      {danhSachBaiViet?.length ? (
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
