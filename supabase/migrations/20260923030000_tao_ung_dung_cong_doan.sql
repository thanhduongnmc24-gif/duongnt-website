create table if not exists public.cong_doan_ho_so (
  nguoi_dung_id uuid primary key references auth.users(id) on delete cascade,
  ten_hien_thi text not null,
  email text,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint cong_doan_ten_hien_thi_khong_rong
    check (char_length(trim(ten_hien_thi)) between 1 and 100)
);

create table if not exists public.cong_doan_ngay (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  ngay date not null,
  gio_vao time not null default '07:30',
  gio_ve time not null default '16:30',
  nghi_lam boolean not null default false,
  phut_chuan integer not null default 510,
  cong_doan jsonb not null default '[]'::jsonb,
  tong_ket_qua numeric(14, 3) not null default 0,
  phan_tram numeric(8, 2) not null default 0,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  constraint cong_doan_ngay_mot_ban_ghi unique (nguoi_dung_id, ngay),
  constraint cong_doan_phut_chuan_hop_le check (phut_chuan between 1 and 1440),
  constraint cong_doan_danh_sach_hop_le check (jsonb_typeof(cong_doan) = 'array')
);

create index if not exists cong_doan_ngay_nguoi_dung_thang
  on public.cong_doan_ngay (nguoi_dung_id, ngay desc);

create or replace function public.tinh_ket_qua_cong_doan_ngay()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  muc jsonb;
  so_to numeric;
  he_so numeric;
  tong numeric := 0;
begin
  if new.nghi_lam then
    new.tong_ket_qua := 0;
    new.phan_tram := 0;
  else
    for muc in select value from jsonb_array_elements(new.cong_doan)
    loop
      so_to := case when jsonb_typeof(muc -> 'so_to') = 'number' then greatest((muc ->> 'so_to')::numeric, 0) else 0 end;
      he_so := case when jsonb_typeof(muc -> 'he_so') = 'number' then greatest((muc ->> 'he_so')::numeric, 0) else 0 end;
      tong := tong + (so_to * he_so);
    end loop;
    new.tong_ket_qua := round(tong, 3);
    new.phan_tram := round((tong * 100) / new.phut_chuan, 2);
  end if;
  new.ngay_cap_nhat := now();
  return new;
end;
$$;

drop trigger if exists tinh_cong_doan_ngay_truoc_khi_luu on public.cong_doan_ngay;
create trigger tinh_cong_doan_ngay_truoc_khi_luu
before insert or update on public.cong_doan_ngay
for each row execute function public.tinh_ket_qua_cong_doan_ngay();

create or replace function public.tao_ho_so_cong_doan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

drop trigger if exists tao_ho_so_cong_doan_khi_dang_ky on auth.users;
create trigger tao_ho_so_cong_doan_khi_dang_ky
after insert on auth.users
for each row execute function public.tao_ho_so_cong_doan();

insert into public.cong_doan_ho_so (nguoi_dung_id, ten_hien_thi, email)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'ten_hien_thi'), ''), split_part(coalesce(email, 'Người dùng'), '@', 1)),
  email
from auth.users
on conflict (nguoi_dung_id) do nothing;

alter table public.cong_doan_ho_so enable row level security;
alter table public.cong_doan_ngay enable row level security;

drop policy if exists "cong doan xem ho so cua minh" on public.cong_doan_ho_so;
create policy "cong doan xem ho so cua minh"
on public.cong_doan_ho_so for select to authenticated
using (nguoi_dung_id = auth.uid());

drop policy if exists "cong doan sua ho so cua minh" on public.cong_doan_ho_so;
create policy "cong doan sua ho so cua minh"
on public.cong_doan_ho_so for update to authenticated
using (nguoi_dung_id = auth.uid())
with check (nguoi_dung_id = auth.uid());

drop policy if exists "cong doan xem du lieu cua minh" on public.cong_doan_ngay;
create policy "cong doan xem du lieu cua minh"
on public.cong_doan_ngay for select to authenticated
using (nguoi_dung_id = auth.uid());

drop policy if exists "cong doan tao du lieu cua minh" on public.cong_doan_ngay;
create policy "cong doan tao du lieu cua minh"
on public.cong_doan_ngay for insert to authenticated
with check (nguoi_dung_id = auth.uid());

drop policy if exists "cong doan sua du lieu cua minh" on public.cong_doan_ngay;
create policy "cong doan sua du lieu cua minh"
on public.cong_doan_ngay for update to authenticated
using (nguoi_dung_id = auth.uid())
with check (nguoi_dung_id = auth.uid());

drop policy if exists "cong doan xoa du lieu cua minh" on public.cong_doan_ngay;
create policy "cong doan xoa du lieu cua minh"
on public.cong_doan_ngay for delete to authenticated
using (nguoi_dung_id = auth.uid());

grant select, update on public.cong_doan_ho_so to authenticated;
grant select, insert, update, delete on public.cong_doan_ngay to authenticated;
grant execute on function public.tinh_ket_qua_cong_doan_ngay() to authenticated;
