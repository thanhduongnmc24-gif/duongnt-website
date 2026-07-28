import fs from "node:fs";
import path from "node:path";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function backup(file) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.bak-${stamp}`);
  }
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  backup(file);
  fs.writeFileSync(file, content, "utf8");
  console.log(`Da cap nhat: ${file}`);
}

const detailFile =
  "src/app/de-muc/[duong_dan]/[duong_dan_con]/[thiet_bi]/page.tsx";

write(
  detailFile,
  `import Link from "next/link";
import { notFound } from "next/navigation";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export const dynamic = "force-dynamic";

type ThuocTinhTrang = {
  params: Promise<{
    duong_dan: string;
    duong_dan_con: string;
    thiet_bi: string;
  }>;
};

export default async function TrangChiTietThietBi({
  params,
}: ThuocTinhTrang) {
  const { duong_dan, duong_dan_con, thiet_bi } = await params;
  const db = taoSupabaseQuanTri();

  const { data: deMuc } = await db
    .from("de_muc")
    .select("id,ten_de_muc,duong_dan")
    .eq("duong_dan", duong_dan)
    .eq("dang_hien_thi", true)
    .maybeSingle();

  if (!deMuc) notFound();

  const { data: deMucCon } = await db
    .from("de_muc_con")
    .select("id,ten_de_muc_con,duong_dan,catalog_id")
    .eq("de_muc_id", deMuc.id)
    .eq("duong_dan", duong_dan_con)
    .eq("dang_hien_thi", true)
    .maybeSingle();

  if (!deMucCon) notFound();

  let catalog: any = null;

  if (deMucCon.catalog_id) {
    const ketQua = await db
      .from("catalog")
      .select("id,tieu_de")
      .eq("id", deMucCon.catalog_id)
      .is("ngay_xoa", null)
      .maybeSingle();

    catalog = ketQua.data;
  }

  if (!catalog) {
    const ketQua = await db
      .from("catalog")
      .select("id,tieu_de")
      .eq("de_muc_con_id", deMucCon.id)
      .is("ngay_xoa", null)
      .order("ngay_cap_nhat", { ascending: false })
      .limit(1)
      .maybeSingle();

    catalog = ketQua.data;
  }

  if (!catalog) notFound();

  const [{ data: thietBi }, { data: cot }] = await Promise.all([
    db
      .from("catalog_thiet_bi")
      .select("*,catalog_gia_tri(cot_id,gia_tri)")
      .eq("catalog_id", catalog.id)
      .eq("duong_dan", thiet_bi)
      .eq("dang_hien_thi", true)
      .is("ngay_xoa", null)
      .maybeSingle(),
    db
      .from("catalog_cot")
      .select("id,ten_cot,loai_du_lieu,thu_tu,hien_trong_chi_tiet")
      .eq("catalog_id", catalog.id)
      .eq("hien_trong_chi_tiet", true)
      .order("thu_tu", { ascending: true }),
  ]);

  if (!thietBi) notFound();

  const giaTri = Object.fromEntries(
    (thietBi.catalog_gia_tri || []).map(
      (item: { cot_id: string; gia_tri: string | null }) => [
        item.cot_id,
        item.gia_tri || "",
      ]
    )
  );

  const noiDung = (cot || []).filter(
    (item) => String(giaTri[item.id] || "").trim().length > 0
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:py-12">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-7 md:px-10 md:py-9">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href={\`/de-muc/\${duong_dan}\`} className="hover:text-blue-600">
              {deMuc.ten_de_muc}
            </Link>
            <span>/</span>
            <Link
              href={\`/de-muc/\${duong_dan}/\${duong_dan_con}\`}
              className="hover:text-blue-600"
            >
              {deMucCon.ten_de_muc_con}
            </Link>
          </nav>

          <h1 className="mt-4 text-4xl font-black leading-tight text-slate-950 md:text-5xl">
            {thietBi.ten_thiet_bi}
          </h1>
        </header>

        {thietBi.google_drive_anh_file_id ? (
          <div className="bg-slate-50 p-4 md:p-8">
            <a
              href={\`/api/catalog/anh/\${thietBi.google_drive_anh_file_id}\`}
              target="_blank"
              rel="noreferrer"
              title="Mở ảnh kích thước đầy đủ"
            >
              <img
                src={\`/api/catalog/anh/\${thietBi.google_drive_anh_file_id}\`}
                alt={thietBi.ten_thiet_bi}
                className="mx-auto max-h-[650px] w-full rounded-2xl object-contain"
              />
            </a>
          </div>
        ) : null}

        <div className="px-6 py-4 md:px-10 md:py-7">
          {noiDung.length ? (
            <div className="divide-y divide-slate-200">
              {noiDung.map((item, index) => {
                const value = String(giaTri[item.id] || "");

                return (
                  <section key={item.id} className="py-6 md:py-8">
                    <h2 className="text-xl font-black text-slate-950 md:text-2xl">
                      {index + 1}. {item.ten_cot}
                    </h2>

                    {item.loai_du_lieu === "lien_ket" ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex break-all rounded-xl bg-blue-50 px-4 py-3 font-semibold text-blue-700 underline"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap break-words text-lg leading-8 text-slate-700">
                        {value}
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-slate-500">
              Thiết bị này chưa có thông tin chi tiết.
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
`
);

const componentFile = "src/components/catalog/catalog-cong-khai.tsx";

if (!fs.existsSync(componentFile)) {
  console.error(`Khong tim thay: ${componentFile}`);
  process.exit(1);
}

backup(componentFile);
let component = fs.readFileSync(componentFile, "utf8");
let changes = 0;

component = component.replace(
  /<Link href=\{`\$\{duongDanChiTiet\}\/\$\{t\.duong_dan\}`\}>\{t\.google_drive_anh_file_id\?/g,
  () => {
    changes += 1;
    return '<Link href={`${duongDanChiTiet}/${t.duong_dan}`} title={`Xem chi tiết ${t.ten_thiet_bi}`}>{t.google_drive_anh_file_id?';
  }
);

component = component.replace(
  /<Link href=\{`\$\{duongDanChiTiet\}\/\$\{t\.duong_dan\}`\}>\{t\.ten_thiet_bi\}<\/Link>/g,
  () => {
    changes += 1;
    return '<Link href={`${duongDanChiTiet}/${t.duong_dan}`} title={`Xem chi tiết ${t.ten_thiet_bi}`} className="hover:text-blue-600 hover:underline">{t.ten_thiet_bi}</Link>';
  }
);

if (changes < 2) {
  fs.copyFileSync(`${componentFile}.bak-${stamp}`, componentFile);
  console.error(`Chi tim thay ${changes}/2 lien ket can nang cap.`);
  console.error("Da khoi phuc component cong khai.");
  process.exit(1);
}

fs.writeFileSync(componentFile, component, "utf8");
console.log(`Da cap nhat: ${componentFile}`);
console.log("Hoan thanh trang rieng chi tiet thiet bi.");
