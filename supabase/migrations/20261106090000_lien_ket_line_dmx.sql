create table if not exists public.dmx_line_ma_lien_ket (
  ma_hash text primary key,
  line_user_id text not null unique,
  het_han timestamptz not null,
  ngay_tao timestamptz not null default now()
);

create table if not exists public.dmx_line_lien_ket (
  line_user_id text primary key,
  nguoi_dung_id uuid not null unique references auth.users(id) on delete cascade,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

alter table public.dmx_line_ma_lien_ket enable row level security;
alter table public.dmx_line_lien_ket enable row level security;

revoke all on public.dmx_line_ma_lien_ket from anon, authenticated;
revoke all on public.dmx_line_lien_ket from anon, authenticated;

create index if not exists dmx_line_ma_lien_ket_het_han_idx
  on public.dmx_line_ma_lien_ket (het_han);
create index if not exists dmx_line_lien_ket_nguoi_dung_idx
  on public.dmx_line_lien_ket (nguoi_dung_id);

notify pgrst, 'reload schema';
