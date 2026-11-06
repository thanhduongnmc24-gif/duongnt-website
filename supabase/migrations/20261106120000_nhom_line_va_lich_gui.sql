create table if not exists public.dmx_line_ma_gan_nhom (
  ma_hash text primary key,
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  het_han timestamptz not null,
  ngay_tao timestamptz not null default now()
);

create table if not exists public.dmx_line_nhom (
  line_group_id text primary key,
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  ten_nhom text not null default 'Nhóm LINE',
  dang_hoat_dong boolean not null default true,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create table if not exists public.dmx_line_lich_gui (
  id uuid primary key default gen_random_uuid(),
  line_group_id text not null references public.dmx_line_nhom(line_group_id) on delete cascade,
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  gio time not null,
  cac_thu smallint[] not null default array[1,2,3,4,5,6,7]::smallint[],
  cac_noi_dung text[] not null default array['doanhthu']::text[],
  dang_hoat_dong boolean not null default true,
  lan_gui_cuoi timestamptz,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint dmx_line_lich_gui_thu_hop_le check (cac_thu <@ array[1,2,3,4,5,6,7]::smallint[]),
  constraint dmx_line_lich_gui_noi_dung_hop_le check (
    cac_noi_dung <@ array['tongquan','doanhthu','realtime','luyke','thidua','nhanvien','suckhoe']::text[]
  )
);

alter table public.dmx_line_ma_gan_nhom enable row level security;
alter table public.dmx_line_nhom enable row level security;
alter table public.dmx_line_lich_gui enable row level security;

revoke all on public.dmx_line_ma_gan_nhom from anon, authenticated;
revoke all on public.dmx_line_nhom from anon, authenticated;
revoke all on public.dmx_line_lich_gui from anon, authenticated;

create index if not exists dmx_line_ma_gan_nhom_het_han_idx on public.dmx_line_ma_gan_nhom (het_han);
create index if not exists dmx_line_nhom_nguoi_dung_idx on public.dmx_line_nhom (nguoi_dung_id);
create index if not exists dmx_line_lich_gui_nguoi_dung_idx on public.dmx_line_lich_gui (nguoi_dung_id);
create index if not exists dmx_line_lich_gui_den_han_idx on public.dmx_line_lich_gui (dang_hoat_dong, gio);

notify pgrst, 'reload schema';
