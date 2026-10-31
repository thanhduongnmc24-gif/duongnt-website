create table if not exists public.dmx_ho_so (
  nguoi_dung_id uuid primary key references auth.users(id) on delete cascade,
  ten_dang_nhap text not null unique,
  cai_dat jsonb not null default '{}'::jsonb,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint dmx_ten_dang_nhap_hop_le
    check (ten_dang_nhap ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
  constraint dmx_cai_dat_la_object
    check (jsonb_typeof(cai_dat) = 'object')
);

create table if not exists public.dmx_du_lieu_ngay (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  ngay date not null,
  du_lieu jsonb not null default '{}'::jsonb,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint dmx_du_lieu_mot_ngay unique (nguoi_dung_id, ngay),
  constraint dmx_du_lieu_la_object check (jsonb_typeof(du_lieu) = 'object')
);

create index if not exists dmx_du_lieu_nguoi_dung_ngay
  on public.dmx_du_lieu_ngay (nguoi_dung_id, ngay desc);

create or replace function public.tao_ho_so_dmx()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'ung_dung', '') <> 'dmx' then
    return new;
  end if;
  insert into public.dmx_ho_so (nguoi_dung_id, ten_dang_nhap)
  values (new.id, lower(trim(new.raw_user_meta_data ->> 'ten_dang_nhap')))
  on conflict (nguoi_dung_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tao_ho_so_dmx_khi_dang_ky on auth.users;
create trigger tao_ho_so_dmx_khi_dang_ky
after insert on auth.users
for each row execute function public.tao_ho_so_dmx();

create or replace function public.tao_ho_so_cong_doan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'ung_dung', '') in ('lich_lam_viec', 'toan_lop_1', 'dmx') then
    return new;
  end if;
  insert into public.cong_doan_ho_so (nguoi_dung_id, ten_hien_thi, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'ten_hien_thi'), ''), split_part(coalesce(new.email, 'Người dùng'), '@', 1)),
    new.email
  )
  on conflict (nguoi_dung_id) do nothing;
  return new;
end;
$$;

alter table public.dmx_ho_so enable row level security;
alter table public.dmx_du_lieu_ngay enable row level security;

drop policy if exists "dmx xem ho so cua minh" on public.dmx_ho_so;
create policy "dmx xem ho so cua minh" on public.dmx_ho_so
for select to authenticated using (nguoi_dung_id = auth.uid());

drop policy if exists "dmx tao ho so cua minh" on public.dmx_ho_so;
create policy "dmx tao ho so cua minh" on public.dmx_ho_so
for insert to authenticated with check (nguoi_dung_id = auth.uid());

drop policy if exists "dmx sua ho so cua minh" on public.dmx_ho_so;
create policy "dmx sua ho so cua minh" on public.dmx_ho_so
for update to authenticated using (nguoi_dung_id = auth.uid()) with check (nguoi_dung_id = auth.uid());

drop policy if exists "dmx xem du lieu ngay cua minh" on public.dmx_du_lieu_ngay;
create policy "dmx xem du lieu ngay cua minh" on public.dmx_du_lieu_ngay
for select to authenticated using (nguoi_dung_id = auth.uid());

drop policy if exists "dmx tao du lieu ngay cua minh" on public.dmx_du_lieu_ngay;
create policy "dmx tao du lieu ngay cua minh" on public.dmx_du_lieu_ngay
for insert to authenticated with check (nguoi_dung_id = auth.uid());

drop policy if exists "dmx sua du lieu ngay cua minh" on public.dmx_du_lieu_ngay;
create policy "dmx sua du lieu ngay cua minh" on public.dmx_du_lieu_ngay
for update to authenticated using (nguoi_dung_id = auth.uid()) with check (nguoi_dung_id = auth.uid());

drop policy if exists "dmx xoa du lieu ngay cua minh" on public.dmx_du_lieu_ngay;
create policy "dmx xoa du lieu ngay cua minh" on public.dmx_du_lieu_ngay
for delete to authenticated using (nguoi_dung_id = auth.uid());

grant select, insert, update on public.dmx_ho_so to authenticated;
grant select, insert, update, delete on public.dmx_du_lieu_ngay to authenticated;

notify pgrst, 'reload schema';
