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

const migration = `alter table public.de_muc_con
  add column if not exists catalog_id uuid unique
  references public.catalog(id) on delete cascade;

create index if not exists chi_muc_de_muc_con_catalog
  on public.de_muc_con(catalog_id)
  where catalog_id is not null;

create or replace function public.dong_bo_catalog_thanh_de_muc_cap_2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  de_muc_con_catalog_id uuid;
  duong_dan_moi text;
  thu_tu_moi integer;
begin
  if new.ngay_xoa is not null then
    update public.de_muc_con
    set dang_hien_thi = false,
        ngay_cap_nhat = now()
    where catalog_id = new.id;
    return new;
  end if;

  duong_dan_moi := coalesce(nullif(new.duong_dan, ''), 'catalog-' || new.id::text);

  select id
  into de_muc_con_catalog_id
  from public.de_muc_con
  where catalog_id = new.id
  limit 1;

  if de_muc_con_catalog_id is null then
    select coalesce(max(thu_tu), -1) + 1
    into thu_tu_moi
    from public.de_muc_con
    where de_muc_id = new.de_muc_id;

    while exists (
      select 1
      from public.de_muc_con
      where de_muc_id = new.de_muc_id
        and duong_dan = duong_dan_moi
    ) loop
      duong_dan_moi := left(duong_dan_moi, 70) || '-' || substr(new.id::text, 1, 8);
    end loop;

    insert into public.de_muc_con (
      de_muc_id,
      ten_de_muc_con,
      duong_dan,
      mo_ta,
      thu_tu,
      dang_hien_thi,
      catalog_id
    ) values (
      new.de_muc_id,
      new.tieu_de,
      duong_dan_moi,
      new.tom_tat,
      thu_tu_moi,
      new.trang_thai = 'da_dang',
      new.id
    )
    returning id into de_muc_con_catalog_id;
  else
    if exists (
      select 1
      from public.de_muc_con
      where de_muc_id = new.de_muc_id
        and duong_dan = duong_dan_moi
        and id <> de_muc_con_catalog_id
    ) then
      duong_dan_moi := left(duong_dan_moi, 70) || '-' || substr(new.id::text, 1, 8);
    end if;

    update public.de_muc_con
    set de_muc_id = new.de_muc_id,
        ten_de_muc_con = new.tieu_de,
        duong_dan = duong_dan_moi,
        mo_ta = new.tom_tat,
        dang_hien_thi = new.trang_thai = 'da_dang',
        ngay_cap_nhat = now()
    where id = de_muc_con_catalog_id;
  end if;

  if new.de_muc_con_id is distinct from de_muc_con_catalog_id then
    update public.catalog
    set de_muc_con_id = de_muc_con_catalog_id,
        ngay_cap_nhat = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists dong_bo_catalog_de_muc_cap_2 on public.catalog;

create trigger dong_bo_catalog_de_muc_cap_2
after insert or update of tieu_de, duong_dan, tom_tat, de_muc_id, trang_thai, ngay_xoa
on public.catalog
for each row
execute function public.dong_bo_catalog_thanh_de_muc_cap_2();

do $$
declare
  item public.catalog%rowtype;
begin
  for item in
    select * from public.catalog order by ngay_tao
  loop
    perform public.dong_bo_catalog_thanh_de_muc_cap_2_row(item.id);
  end loop;
exception
  when undefined_function then
    null;
end $$;

-- Dong bo du lieu Catalog da ton tai.
do $$
declare
  item record;
  child_id uuid;
  child_slug text;
  child_order integer;
begin
  for item in
    select * from public.catalog where ngay_xoa is null order by ngay_tao
  loop
    select id into child_id
    from public.de_muc_con
    where catalog_id = item.id
    limit 1;

    if child_id is null then
      child_slug := coalesce(nullif(item.duong_dan, ''), 'catalog-' || item.id::text);
      if exists (
        select 1 from public.de_muc_con
        where de_muc_id = item.de_muc_id and duong_dan = child_slug
      ) then
        child_slug := left(child_slug, 70) || '-' || substr(item.id::text, 1, 8);
      end if;

      select coalesce(max(thu_tu), -1) + 1 into child_order
      from public.de_muc_con where de_muc_id = item.de_muc_id;

      insert into public.de_muc_con (
        de_muc_id, ten_de_muc_con, duong_dan, mo_ta,
        thu_tu, dang_hien_thi, catalog_id
      ) values (
        item.de_muc_id, item.tieu_de, child_slug, item.tom_tat,
        child_order, item.trang_thai = 'da_dang', item.id
      ) returning id into child_id;
    end if;

    update public.catalog
    set de_muc_con_id = child_id
    where id = item.id and de_muc_con_id is distinct from child_id;
  end loop;
end $$;
`;

// Remove a harmless DO block that references a helper which intentionally does not exist.
const safeMigration = migration.replace(/do \$\$\ndeclare\n  item public\.catalog%rowtype;[\s\S]*?end \$\$;\n\n-- Dong bo/, "-- Dong bo");

fs.mkdirSync("supabase/migrations", { recursive: true });
const migrationFile = `supabase/migrations/${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}_catalog_thanh_de_muc_cap_2.sql`;
fs.writeFileSync(migrationFile, safeMigration, "utf8");
console.log(`Da tao: ${migrationFile}`);

write("src/components/menu/thanh-dieu-huong.tsx", `import Link from "next/link";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { layThemeWebsite } from "@/lib/theme/theme";
import { ThaoTacNguoiDung } from "@/components/menu/thao-tac-nguoi-dung";

type DeMucCon = {
  id: string;
  ten_de_muc_con: string;
  duong_dan: string;
  thu_tu: number;
  dang_hien_thi: boolean;
};

type DeMuc = {
  id: string;
  ten_de_muc: string;
  duong_dan: string;
  thu_tu: number;
  dang_hien_thi: boolean;
  de_muc_con: DeMucCon[];
};

export async function ThanhDieuHuong() {
  const supabase = await taoSupabaseMayChu();
  const theme = await layThemeWebsite();

  const [ketQuaNguoiDung, ketQuaDeMuc] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("de_muc")
      .select(
        "id,ten_de_muc,duong_dan,thu_tu,dang_hien_thi,de_muc_con(id,ten_de_muc_con,duong_dan,thu_tu,dang_hien_thi)"
      )
      .eq("dang_hien_thi", true)
      .order("thu_tu", { ascending: true }),
  ]);

  const user = ketQuaNguoiDung.data.user;
  let vaiTro: "quan_tri" | "nguoi_dung" | null = null;
  let tenHienThi = "";

  if (user) {
    const { data } = await supabase
      .from("nguoi_dung")
      .select("ten_hien_thi,vai_tro,dang_hoat_dong")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.dang_hoat_dong) {
      vaiTro = data.vai_tro;
      tenHienThi = data.ten_hien_thi;
    }
  }

  const danhSach = ((ketQuaDeMuc.data || []) as DeMuc[]).map((deMuc) => ({
    ...deMuc,
    de_muc_con: [...(deMuc.de_muc_con || [])]
      .filter((deMucCon) => deMucCon.dang_hien_thi)
      .sort((a, b) => a.thu_tu - b.thu_tu),
  }));

  const toi = theme.ma === "dark-tech";
  const tinTuc = theme.ma === "minimal-light";
  const header = toi
    ? "border-purple-400/20 bg-[#0b0914]/95 text-white"
    : tinTuc
      ? "border-slate-200 bg-white text-slate-900"
      : "border-green-100 bg-[#fffdf6] text-[#17351f]";
  const active = toi
    ? "hover:bg-white/10 hover:text-fuchsia-400"
    : tinTuc
      ? "hover:bg-red-50 hover:text-red-600"
      : "hover:bg-green-50 hover:text-green-700";

  return (
    <header className={\`sticky top-0 z-50 border-b shadow-sm backdrop-blur \${header}\`}>
      <nav className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4">
        <Link
          href="/"
          className={\`shrink-0 rounded-lg px-3 py-2 font-black \${
            toi ? "text-fuchsia-400" : tinTuc ? "text-red-600" : "text-green-700"
          }\`}
        >
          Trang chủ
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-visible">
          {danhSach.map((deMuc) => (
            <div key={deMuc.id} className="group relative shrink-0">
              <Link
                href={\`/de-muc/\${deMuc.duong_dan}\`}
                className={\`block whitespace-nowrap rounded-lg px-3 py-5 font-semibold transition \${active}\`}
              >
                {deMuc.ten_de_muc}
              </Link>

              {deMuc.de_muc_con.length ? (
                <div
                  className={\`invisible absolute left-0 top-full z-[100] min-w-56 rounded-xl border p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 \${
                    toi ? "border-purple-400/20 bg-[#12101d]" : "border-slate-200 bg-white"
                  }\`}
                >
                  {deMuc.de_muc_con.map((deMucCon) => (
                    <Link
                      key={deMucCon.id}
                      href={\`/de-muc/\${deMuc.duong_dan}/\${deMucCon.duong_dan}\`}
                      className={\`block rounded-lg px-3 py-2 text-sm transition \${active}\`}
                    >
                      {deMucCon.ten_de_muc_con}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {user && vaiTro ? (
          <ThaoTacNguoiDung tenHienThi={tenHienThi} vaiTro={vaiTro} />
        ) : (
          <Link
            href="/dang-nhap"
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            Đăng nhập
          </Link>
        )}
      </nav>
    </header>
  );
}
`);

write("src/app/de-muc/[duong_dan]/[duong_dan_con]/page.tsx", `import { notFound } from "next/navigation";
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
        duongDanChiTiet={\`/de-muc/\${duong_dan}/\${duong_dan_con}\`}
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
`);

// Patch Catalog admin update endpoint so changing display name/location automatically
// updates the actual level-2 category through the database trigger.
const apiFile = "src/app/api/quan-tri/catalog-v2/route.ts";
if (fs.existsSync(apiFile)) {
  backup(apiFile);
  let api = fs.readFileSync(apiFile, "utf8");
  api = api.replace(
    /de_muc_con_id:\s*body\.de_muc_con_id\s*\|\|\s*null,\s*/g,
    ""
  );
  fs.writeFileSync(apiFile, api, "utf8");
  console.log(`Da cap nhat: ${apiFile}`);
}

console.log("Hoan thanh: Catalog da tro thanh de muc cap 2 that.");
