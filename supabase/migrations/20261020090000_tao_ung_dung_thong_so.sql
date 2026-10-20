create table if not exists public.thong_so_bang (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  tieu_de text not null default 'Bảng thông số mới',
  danh_sach_cot jsonb not null default '[]'::jsonb,
  danh_sach_hang jsonb not null default '[]'::jsonb,
  thu_tu integer not null default 0,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint thong_so_tieu_de_hop_le check (char_length(trim(tieu_de)) between 1 and 120),
  constraint thong_so_cot_la_mang check (jsonb_typeof(danh_sach_cot) = 'array'),
  constraint thong_so_hang_la_mang check (jsonb_typeof(danh_sach_hang) = 'array')
);

create table if not exists public.thong_so_anh (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  bang_id uuid not null references public.thong_so_bang(id) on delete cascade,
  hang_id text not null,
  cot_id text not null,
  google_drive_file_id text not null,
  ten_tep text not null,
  kieu_tep text not null,
  kich_thuoc bigint not null default 0,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint thong_so_anh_mot_o unique (bang_id, hang_id, cot_id),
  constraint thong_so_anh_kieu_hop_le check (kieu_tep in ('image/jpeg', 'image/png', 'image/webp')),
  constraint thong_so_anh_kich_thuoc_hop_le check (kich_thuoc between 0 and 10485760)
);

create index if not exists thong_so_bang_nguoi_dung
  on public.thong_so_bang (nguoi_dung_id, thu_tu, ngay_tao);
create index if not exists thong_so_anh_bang
  on public.thong_so_anh (bang_id, hang_id, cot_id);

alter table public.thong_so_bang enable row level security;
alter table public.thong_so_anh enable row level security;

drop policy if exists "thong so xem bang cua minh" on public.thong_so_bang;
create policy "thong so xem bang cua minh" on public.thong_so_bang
for select to authenticated using (nguoi_dung_id = auth.uid());
drop policy if exists "thong so tao bang cua minh" on public.thong_so_bang;
create policy "thong so tao bang cua minh" on public.thong_so_bang
for insert to authenticated with check (nguoi_dung_id = auth.uid());
drop policy if exists "thong so sua bang cua minh" on public.thong_so_bang;
create policy "thong so sua bang cua minh" on public.thong_so_bang
for update to authenticated using (nguoi_dung_id = auth.uid()) with check (nguoi_dung_id = auth.uid());
drop policy if exists "thong so xoa bang cua minh" on public.thong_so_bang;
create policy "thong so xoa bang cua minh" on public.thong_so_bang
for delete to authenticated using (nguoi_dung_id = auth.uid());

drop policy if exists "thong so xem anh cua minh" on public.thong_so_anh;
create policy "thong so xem anh cua minh" on public.thong_so_anh
for select to authenticated using (nguoi_dung_id = auth.uid());

grant select, insert, update, delete on public.thong_so_bang to authenticated;
grant select on public.thong_so_anh to authenticated;

notify pgrst, 'reload schema';
