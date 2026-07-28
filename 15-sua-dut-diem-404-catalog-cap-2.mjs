import fs from "node:fs";

const file = "src/app/de-muc/[duong_dan]/[duong_dan_con]/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`Khong tim thay: ${file}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, `${file}.bak-${stamp}`);

const content = `import { notFound } from "next/navigation";
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

export default async function TrangDeMucCapHai({
  params,
}: ThuocTinhTrang) {
  const { duong_dan, duong_dan_con } = await params;
  const db = taoSupabaseQuanTri();

  const { data: deMuc, error: loiDeMuc } = await db
    .from("de_muc")
    .select("id,ten_de_muc")
    .eq("duong_dan", duong_dan)
    .eq("dang_hien_thi", true)
    .maybeSingle();

  if (loiDeMuc) {
    console.error("Loi tai de muc cap 1:", loiDeMuc.message);
  }

  if (!deMuc) notFound();

  const { data: deMucCon, error: loiDeMucCon } = await db
    .from("de_muc_con")
    .select("id,ten_de_muc_con,mo_ta,de_muc_id,catalog_id")
    .eq("de_muc_id", deMuc.id)
    .eq("duong_dan", duong_dan_con)
    .eq("dang_hien_thi", true)
    .maybeSingle();

  if (loiDeMucCon) {
    console.error("Loi tai de muc cap 2:", loiDeMucCon.message);
  }

  if (!deMucCon) notFound();

  let catalog: any = null;

  if (deMucCon.catalog_id) {
    const ketQua = await db
      .from("catalog")
      .select("*")
      .eq("id", deMucCon.catalog_id)
      .is("ngay_xoa", null)
      .maybeSingle();

    if (ketQua.error) {
      console.error(
        "Loi tim Catalog bang catalog_id:",
        ketQua.error.message
      );
    }

    catalog = ketQua.data;
  }

  if (!catalog) {
    const ketQua = await db
      .from("catalog")
      .select("*")
      .eq("de_muc_con_id", deMucCon.id)
      .is("ngay_xoa", null)
      .order("ngay_cap_nhat", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ketQua.error) {
      console.error(
        "Loi tim Catalog bang de_muc_con_id:",
        ketQua.error.message
      );
    }

    catalog = ketQua.data;
  }

  if (!catalog && deMucCon.catalog_id) {
    const ketQua = await db
      .from("catalog")
      .select("*")
      .eq("id", deMucCon.catalog_id)
      .maybeSingle();

    catalog = ketQua.data;
  }

  if (catalog) {
    const [{ data: cot, error: loiCot }, { data: thietBi, error: loiThietBi }] =
      await Promise.all([
        db
          .from("catalog_cot")
          .select("*")
          .eq("catalog_id", catalog.id)
          .order("thu_tu"),
        db
          .from("catalog_thiet_bi")
          .select("*,catalog_gia_tri(cot_id,gia_tri)")
          .eq("catalog_id", catalog.id)
          .eq("dang_hien_thi", true)
          .is("ngay_xoa", null)
          .order("thu_tu"),
      ]);

    if (loiCot) {
      console.error("Loi tai cot Catalog:", loiCot.message);
    }

    if (loiThietBi) {
      console.error("Loi tai thiet bi Catalog:", loiThietBi.message);
    }

    return (
      <CatalogCongKhai
        catalog={catalog}
        cot={cot || []}
        thietBi={thietBi || []}
        duongDanChiTiet={\`/de-muc/\${duong_dan}/\${duong_dan_con}\`}
      />
    );
  }

  const { data: danhSachBaiViet, error: loiBaiViet } = await db
    .from("bai_viet")
    .select(
      "id,tieu_de,duong_dan,tom_tat,google_drive_anh_dai_dien_file_id,ngay_dang,luot_xem"
    )
    .eq("de_muc_con_id", deMucCon.id)
    .eq("trang_thai", "da_dang")
    .is("ngay_xoa", null)
    .order("ngay_dang", { ascending: false });

  if (loiBaiViet) {
    console.error("Loi tai bai viet de muc:", loiBaiViet.message);
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-10">
      <header className="mb-8 rounded-2xl bg-white p-7 shadow-sm">
        <p className="font-semibold text-blue-600">
          {deMuc.ten_de_muc}
        </p>
        <h1 className="mt-1 text-4xl font-black text-slate-900">
          {deMucCon.ten_de_muc_con}
        </h1>
        {deMucCon.mo_ta ? (
          <p className="mt-3 text-slate-600">
            {deMucCon.mo_ta}
          </p>
        ) : null}
      </header>

      {danhSachBaiViet?.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {danhSachBaiViet.map((baiViet) => (
            <TheBaiViet
              key={baiViet.id}
              baiViet={baiViet}
            />
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
`;

fs.writeFileSync(file, content, "utf8");

console.log("Da sua trang de muc cap 2 tim Catalog theo ca hai chieu.");
console.log("Khong con bat buoc Catalog phai co trang_thai da_dang de mo tu menu quan tri.");
console.log("Da them log loi ro rang tren terminal neu du lieu Supabase bi sai.");
