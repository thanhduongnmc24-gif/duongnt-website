create table if not exists public.toan_lop_1_ho_so (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ten_dang_nhap text unique not null,
  ten_hien_thi text not null,
  ma_phu_huynh text not null check (ma_phu_huynh ~ '^\d{4}$'),
  tong_sao integer not null default 0,
  chuoi_ngay integer not null default 0,
  ngay_hoc_cuoi date,
  ngay_tao timestamptz not null default now()
);

create table if not exists public.toan_lop_1_tien_do (
  user_id uuid not null references auth.users(id) on delete cascade,
  bai_hoc_id text not null,
  so_cau_dung integer not null default 0 check (so_cau_dung >= 0),
  tong_so_cau integer not null default 5 check (tong_so_cau > 0),
  da_hoan_thanh boolean not null default false,
  ngay_cap_nhat timestamptz not null default now(),
  primary key (user_id, bai_hoc_id)
);

alter table public.toan_lop_1_ho_so enable row level security;
alter table public.toan_lop_1_tien_do enable row level security;

drop policy if exists "toan1 ho so ca nhan" on public.toan_lop_1_ho_so;
create policy "toan1 ho so ca nhan" on public.toan_lop_1_ho_so for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "toan1 tien do ca nhan" on public.toan_lop_1_tien_do;
create policy "toan1 tien do ca nhan" on public.toan_lop_1_tien_do for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.tao_ho_so_toan_lop_1() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ->> 'ung_dung' = 'toan_lop_1' then
    insert into public.toan_lop_1_ho_so(user_id, ten_dang_nhap, ten_hien_thi, ma_phu_huynh)
    values(new.id, new.raw_user_meta_data ->> 'ten_dang_nhap', new.raw_user_meta_data ->> 'ten_hien_thi', new.raw_user_meta_data ->> 'ma_phu_huynh')
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists tao_ho_so_toan_lop_1_trigger on auth.users;
create trigger tao_ho_so_toan_lop_1_trigger after insert on auth.users for each row execute function public.tao_ho_so_toan_lop_1();

create or replace function public.cap_nhat_thong_ke_toan_lop_1() returns trigger language plpgsql security definer set search_path = public as $$
declare
  last_day date;
  current_streak integer;
begin
  select ngay_hoc_cuoi, chuoi_ngay into last_day, current_streak from public.toan_lop_1_ho_so where user_id = new.user_id;
  update public.toan_lop_1_ho_so set
    tong_sao = (select coalesce(sum(so_cau_dung), 0) from public.toan_lop_1_tien_do where user_id = new.user_id),
    chuoi_ngay = case when last_day = current_date then current_streak when last_day = current_date - 1 then current_streak + 1 else 1 end,
    ngay_hoc_cuoi = current_date
  where user_id = new.user_id;
  return new;
end $$;

drop trigger if exists cap_nhat_thong_ke_toan_lop_1_trigger on public.toan_lop_1_tien_do;
create trigger cap_nhat_thong_ke_toan_lop_1_trigger after insert or update on public.toan_lop_1_tien_do for each row execute function public.cap_nhat_thong_ke_toan_lop_1();
