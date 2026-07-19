create extension if not exists pgcrypto;

create type public.vai_tro_nguoi_dung as enum (
  'quan_tri',
  'nguoi_dung'
);

create type public.trang_thai_bai_viet as enum (
  'ban_nhap',
  'da_dang',
  'da_an'
);

create type public.loai_noi_dung as enum (
  'trinh_soan_thao',
  'html'
);

create table public.nguoi_dung (
  id uuid primary key references auth.users(id) on delete cascade,
  ten_dang_nhap text not null unique,
  ten_hien_thi text not null,
  email text,
  vai_tro public.vai_tro_nguoi_dung not null default 'nguoi_dung',
  dang_hoat_dong boolean not null default true,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),

  constraint ten_dang_nhap_khong_rong
    check (char_length(trim(ten_dang_nhap)) >= 1),

  constraint ten_hien_thi_khong_rong
    check (char_length(trim(ten_hien_thi)) >= 1)
);

create table public.de_muc (
  id uuid primary key default gen_random_uuid(),
  ten_de_muc text not null,
  duong_dan text not null unique,
  mo_ta text,
  thu_tu integer not null default 0,
  dang_hien_thi boolean not null default true,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create table public.de_muc_con (
  id uuid primary key default gen_random_uuid(),
  de_muc_id uuid not null
    references public.de_muc(id) on delete cascade,
  ten_de_muc_con text not null,
  duong_dan text not null,
  mo_ta text,
  thu_tu integer not null default 0,
  dang_hien_thi boolean not null default true,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),

  constraint de_muc_con_duong_dan_duy_nhat
    unique (de_muc_id, duong_dan)
);

create table public.bai_viet (
  id uuid primary key default gen_random_uuid(),

  nguoi_dang_id uuid not null
    references public.nguoi_dung(id),

  de_muc_id uuid not null
    references public.de_muc(id),

  de_muc_con_id uuid not null
    references public.de_muc_con(id),

  tieu_de text not null,
  duong_dan text not null unique,
  tom_tat text,

  loai_noi_dung public.loai_noi_dung
    not null default 'trinh_soan_thao',

  noi_dung text not null,

  google_drive_noi_dung_file_id text,
  google_drive_anh_dai_dien_file_id text,
  ten_tep_anh_dai_dien text,
  kieu_tep_anh_dai_dien text,

  trang_thai public.trang_thai_bai_viet
    not null default 'ban_nhap',

  luot_xem bigint not null default 0,
  ngay_dang timestamptz,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  ngay_xoa timestamptz,

  constraint luot_xem_hop_le
    check (luot_xem >= 0)
);

create table public.anh_bai_viet (
  id uuid primary key default gen_random_uuid(),

  bai_viet_id uuid not null
    references public.bai_viet(id) on delete cascade,

  google_drive_file_id text not null unique,
  ten_tep text not null,
  kieu_tep text not null,

  loai_anh text not null
    check (loai_anh in ('anh_dai_dien', 'anh_noi_dung')),

  thu_tu integer not null default 0,
  ngay_tao timestamptz not null default now()
);

create table public.giao_dien (
  id uuid primary key default gen_random_uuid(),
  ma_giao_dien text not null unique,
  ten_giao_dien text not null,
  mo_ta text,

  tep_cau_hinh jsonb not null default '{}'::jsonb,

  dang_kich_hoat boolean not null default false,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create table public.cau_hinh_website (
  id uuid primary key default gen_random_uuid(),
  ten_website text not null default 'duongnt.io.vn',
  mo_ta_website text,
  logo_file_id text,

  giao_dien_id uuid
    references public.giao_dien(id),

  mau_chinh text not null default '#2563eb',
  mau_phu text not null default '#0f172a',
  mau_nen text not null default '#f8fafc',
  mau_chu text not null default '#0f172a',

  so_bai_moi_trang integer not null default 12,
  ngay_cap_nhat timestamptz not null default now(),

  constraint so_bai_moi_trang_hop_le
    check (so_bai_moi_trang between 1 and 100)
);

create table public.lich_su_quan_tri (
  id bigint generated always as identity primary key,

  nguoi_thuc_hien_id uuid
    references public.nguoi_dung(id),

  hanh_dong text not null,
  doi_tuong text not null,
  doi_tuong_id text,
  du_lieu_cu jsonb,
  du_lieu_moi jsonb,
  dia_chi_ip inet,
  ngay_thuc_hien timestamptz not null default now()
);

create index chi_muc_bai_viet_de_muc
  on public.bai_viet (
    de_muc_id,
    trang_thai,
    ngay_dang desc
  );

create index chi_muc_bai_viet_de_muc_con
  on public.bai_viet (
    de_muc_con_id,
    trang_thai,
    ngay_dang desc
  );

create index chi_muc_bai_viet_nguoi_dang
  on public.bai_viet (
    nguoi_dang_id,
    ngay_tao desc
  );

create index chi_muc_de_muc_thu_tu
  on public.de_muc (
    dang_hien_thi,
    thu_tu
  );

create index chi_muc_de_muc_con_thu_tu
  on public.de_muc_con (
    de_muc_id,
    dang_hien_thi,
    thu_tu
  );

insert into public.giao_dien (
  ma_giao_dien,
  ten_giao_dien,
  mo_ta,
  tep_cau_hinh,
  dang_kich_hoat
)
values
(
  'modern-blue',
  'Modern Blue',
  'Giao dien sang, hien dai, card bo tron.',
  '{"thu_muc":"modern-blue"}'::jsonb,
  true
),
(
  'dark-tech',
  'Dark Tech',
  'Giao dien nen toi phong cach cong nghe.',
  '{"thu_muc":"dark-tech"}'::jsonb,
  false
),
(
  'minimal-light',
  'Minimal Light',
  'Giao dien trang toi gian, tap trung noi dung.',
  '{"thu_muc":"minimal-light"}'::jsonb,
  false
);

insert into public.cau_hinh_website (
  ten_website,
  giao_dien_id
)
select
  'duongnt.io.vn',
  id
from public.giao_dien
where ma_giao_dien = 'modern-blue';
