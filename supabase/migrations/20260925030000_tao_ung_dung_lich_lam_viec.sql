create table if not exists public.lich_lam_viec_ho_so (
  nguoi_dung_id uuid primary key references auth.users(id) on delete cascade,
  ten_dang_nhap text not null unique,
  ngay_bat_dau_chu_ky date not null default current_date,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint lich_lam_viec_ten_dang_nhap_hop_le
    check (ten_dang_nhap ~ '^[a-z0-9][a-z0-9._-]{2,39}$')
);

create table if not exists public.lich_lam_viec_nghi_luan_phien (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  ngay date not null,
  danh_sach_ten text[] not null default '{}',
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint lich_lam_viec_mot_ngay unique (nguoi_dung_id, ngay),
  constraint lich_lam_viec_toi_da_100_nguoi check (cardinality(danh_sach_ten) <= 100),
  constraint lich_lam_viec_ten_khong_rong check (array_position(danh_sach_ten, '') is null)
);

create index if not exists lich_lam_viec_nguoi_dung_thang
  on public.lich_lam_viec_nghi_luan_phien (nguoi_dung_id, ngay desc);

create or replace function public.tao_ho_so_lich_lam_viec()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'ung_dung', '') <> 'lich_lam_viec' then
    return new;
  end if;
  insert into public.lich_lam_viec_ho_so (nguoi_dung_id, ten_dang_nhap)
  values (new.id, lower(trim(new.raw_user_meta_data ->> 'ten_dang_nhap')))
  on conflict (nguoi_dung_id) do nothing;
  return new;
end;
$$;

drop trigger if exists tao_ho_so_lich_lam_viec_khi_dang_ky on auth.users;
create trigger tao_ho_so_lich_lam_viec_khi_dang_ky
after insert on auth.users
for each row execute function public.tao_ho_so_lich_lam_viec();

create or replace function public.tao_ho_so_cong_doan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'ung_dung', '') = 'lich_lam_viec' then
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

alter table public.lich_lam_viec_ho_so enable row level security;
alter table public.lich_lam_viec_nghi_luan_phien enable row level security;

create policy "lich lam viec xem ho so cua minh" on public.lich_lam_viec_ho_so
for select to authenticated using (nguoi_dung_id = auth.uid());
create policy "lich lam viec sua ho so cua minh" on public.lich_lam_viec_ho_so
for update to authenticated using (nguoi_dung_id = auth.uid()) with check (nguoi_dung_id = auth.uid());
create policy "lich lam viec xem du lieu cua minh" on public.lich_lam_viec_nghi_luan_phien
for select to authenticated using (nguoi_dung_id = auth.uid());
create policy "lich lam viec tao du lieu cua minh" on public.lich_lam_viec_nghi_luan_phien
for insert to authenticated with check (nguoi_dung_id = auth.uid());
create policy "lich lam viec sua du lieu cua minh" on public.lich_lam_viec_nghi_luan_phien
for update to authenticated using (nguoi_dung_id = auth.uid()) with check (nguoi_dung_id = auth.uid());
create policy "lich lam viec xoa du lieu cua minh" on public.lich_lam_viec_nghi_luan_phien
for delete to authenticated using (nguoi_dung_id = auth.uid());

grant select, update on public.lich_lam_viec_ho_so to authenticated;
grant select, insert, update, delete on public.lich_lam_viec_nghi_luan_phien to authenticated;
