create table if not exists public.dmx_line_cau_hinh_nhac (
  line_group_id text primary key,
  bat_nhac_phan_hoi boolean not null default false,
  so_phut_cho smallint not null default 30 check (so_phut_cho between 1 and 1440),
  ngay_cap_nhat timestamptz not null default now()
);

create table if not exists public.dmx_line_tin_nhac (
  id uuid primary key default gen_random_uuid(),
  line_group_id text not null,
  line_message_id text not null unique,
  quote_token text,
  nguoi_gui_id text not null,
  ten_nguoi_gui text not null default 'Người gửi',
  user_ids_duoc_tag text[] not null default '{}',
  ten_duoc_tag jsonb not null default '{}'::jsonb,
  user_ids_da_phan_hoi text[] not null default '{}',
  noi_dung_goc text,
  het_han timestamptz not null,
  da_nhac boolean not null default false,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create index if not exists dmx_line_tin_nhac_den_han_idx
  on public.dmx_line_tin_nhac (da_nhac, het_han);
create index if not exists dmx_line_tin_nhac_nhom_idx
  on public.dmx_line_tin_nhac (line_group_id, da_nhac);

create table if not exists public.dmx_line_anh_da_gui (
  line_group_id text not null,
  nguoi_dung_id uuid not null,
  sieu_thi_id uuid not null,
  loai text not null,
  phien_ban_anh text not null,
  ngay_gui timestamptz not null default now(),
  primary key (line_group_id, nguoi_dung_id, sieu_thi_id, loai)
);

alter table public.dmx_line_cau_hinh_nhac enable row level security;
alter table public.dmx_line_tin_nhac enable row level security;
alter table public.dmx_line_anh_da_gui enable row level security;

revoke all on public.dmx_line_cau_hinh_nhac from anon, authenticated;
revoke all on public.dmx_line_tin_nhac from anon, authenticated;
revoke all on public.dmx_line_anh_da_gui from anon, authenticated;

notify pgrst, 'reload schema';
