create table if not exists public.catalog (
  id uuid primary key default gen_random_uuid(),
  tieu_de text not null,
  duong_dan text not null unique,
  tom_tat text,
  de_muc_id uuid not null references public.de_muc(id),
  de_muc_con_id uuid not null references public.de_muc_con(id),
  nguoi_tao_id uuid not null references public.nguoi_dung(id),
  trang_thai public.trang_thai_bai_viet not null default 'ban_nhap',
  google_drive_folder_id text,
  ngay_dang timestamptz,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  ngay_xoa timestamptz
);

create table if not exists public.catalog_cot (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalog(id) on delete cascade,
  ten_cot text not null,
  ma_cot text not null,
  loai_du_lieu text not null default 'van_ban_ngan'
    check (loai_du_lieu in ('anh','van_ban_ngan','van_ban_dai','so','ngay','lien_ket')),
  do_rong integer not null default 180 check (do_rong between 60 and 1000),
  thu_tu integer not null default 0,
  bat_buoc boolean not null default false,
  cho_tim_kiem boolean not null default true,
  hien_trong_danh_sach boolean not null default true,
  hien_trong_chi_tiet boolean not null default true,
  ngay_tao timestamptz not null default now(),
  unique(catalog_id, ma_cot)
);

create table if not exists public.catalog_thiet_bi (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalog(id) on delete cascade,
  ten_thiet_bi text not null,
  duong_dan text not null,
  google_drive_anh_file_id text,
  ten_tep_anh text,
  kieu_tep_anh text,
  thu_tu integer not null default 0,
  dang_hien_thi boolean not null default true,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  ngay_xoa timestamptz,
  unique(catalog_id, duong_dan)
);

create table if not exists public.catalog_gia_tri (
  id uuid primary key default gen_random_uuid(),
  thiet_bi_id uuid not null references public.catalog_thiet_bi(id) on delete cascade,
  cot_id uuid not null references public.catalog_cot(id) on delete cascade,
  gia_tri text,
  ngay_cap_nhat timestamptz not null default now(),
  unique(thiet_bi_id, cot_id)
);

create index if not exists idx_catalog_de_muc_con on public.catalog(de_muc_con_id, trang_thai, ngay_dang desc);
create index if not exists idx_catalog_cot_thu_tu on public.catalog_cot(catalog_id, thu_tu);
create index if not exists idx_catalog_thiet_bi_thu_tu on public.catalog_thiet_bi(catalog_id, thu_tu);
create index if not exists idx_catalog_gia_tri_thiet_bi on public.catalog_gia_tri(thiet_bi_id);

alter table public.catalog enable row level security;
alter table public.catalog_cot enable row level security;
alter table public.catalog_thiet_bi enable row level security;
alter table public.catalog_gia_tri enable row level security;

create policy "cong_khai_xem_catalog_da_dang" on public.catalog for select
using (trang_thai = 'da_dang' and ngay_xoa is null);

create policy "cong_khai_xem_cot_catalog_da_dang" on public.catalog_cot for select
using (exists(select 1 from public.catalog c where c.id = catalog_id and c.trang_thai = 'da_dang' and c.ngay_xoa is null));

create policy "cong_khai_xem_thiet_bi_catalog_da_dang" on public.catalog_thiet_bi for select
using (dang_hien_thi and ngay_xoa is null and exists(select 1 from public.catalog c where c.id = catalog_id and c.trang_thai = 'da_dang' and c.ngay_xoa is null));

create policy "cong_khai_xem_gia_tri_catalog_da_dang" on public.catalog_gia_tri for select
using (exists(select 1 from public.catalog_thiet_bi t join public.catalog c on c.id=t.catalog_id where t.id=thiet_bi_id and t.dang_hien_thi and t.ngay_xoa is null and c.trang_thai='da_dang' and c.ngay_xoa is null));
