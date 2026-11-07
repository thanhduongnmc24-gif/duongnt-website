-- Một tài khoản DMX có thể quản lý nhiều siêu thị. Mọi dữ liệu, ảnh và lịch
-- đều mang sieu_thi_id để lịch cũ tiếp tục chạy độc lập khi người dùng đổi nơi làm việc.
create table if not exists public.dmx_sieu_thi (
  id uuid primary key default gen_random_uuid(),
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  ma_sieu_thi text not null,
  ten_sieu_thi text not null,
  cai_dat jsonb not null default '{}'::jsonb,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now(),
  unique (nguoi_dung_id, ma_sieu_thi),
  constraint dmx_sieu_thi_ma_hop_le check (ma_sieu_thi ~ '^[A-Za-z0-9._-]{1,30}$'),
  constraint dmx_sieu_thi_ten_hop_le check (char_length(trim(ten_sieu_thi)) between 1 and 120),
  constraint dmx_sieu_thi_cai_dat_object check (jsonb_typeof(cai_dat) = 'object')
);

alter table public.dmx_ho_so add column if not exists sieu_thi_dang_chon uuid;

insert into public.dmx_sieu_thi (nguoi_dung_id, ma_sieu_thi, ten_sieu_thi, cai_dat)
select h.nguoi_dung_id, 'MAC_DINH',
  coalesce(nullif((
    select d.du_lieu ->> 'thongTinDonVi'
    from public.dmx_du_lieu_ngay d
    where d.nguoi_dung_id = h.nguoi_dung_id
    order by d.ngay desc limit 1
  ), ''), 'Siêu thị mặc định'),
  h.cai_dat
from public.dmx_ho_so h
on conflict (nguoi_dung_id, ma_sieu_thi) do nothing;

update public.dmx_ho_so h set sieu_thi_dang_chon = s.id
from public.dmx_sieu_thi s
where s.nguoi_dung_id = h.nguoi_dung_id
  and s.ma_sieu_thi = 'MAC_DINH'
  and h.sieu_thi_dang_chon is null;

alter table public.dmx_ho_so drop constraint if exists dmx_ho_so_sieu_thi_dang_chon_fkey;
alter table public.dmx_ho_so add constraint dmx_ho_so_sieu_thi_dang_chon_fkey
  foreign key (sieu_thi_dang_chon) references public.dmx_sieu_thi(id) on delete set null;

alter table public.dmx_du_lieu_ngay add column if not exists sieu_thi_id uuid;
update public.dmx_du_lieu_ngay d set sieu_thi_id = h.sieu_thi_dang_chon
from public.dmx_ho_so h where h.nguoi_dung_id = d.nguoi_dung_id and d.sieu_thi_id is null;
alter table public.dmx_du_lieu_ngay alter column sieu_thi_id set not null;
alter table public.dmx_du_lieu_ngay drop constraint if exists dmx_du_lieu_mot_ngay;
alter table public.dmx_du_lieu_ngay add constraint dmx_du_lieu_mot_ngay
  unique (nguoi_dung_id, sieu_thi_id, ngay);
alter table public.dmx_du_lieu_ngay drop constraint if exists dmx_du_lieu_ngay_sieu_thi_id_fkey;
alter table public.dmx_du_lieu_ngay add constraint dmx_du_lieu_ngay_sieu_thi_id_fkey
  foreign key (sieu_thi_id) references public.dmx_sieu_thi(id) on delete cascade;

alter table public.dmx_line_lich_gui add column if not exists sieu_thi_id uuid;
update public.dmx_line_lich_gui l set sieu_thi_id = h.sieu_thi_dang_chon
from public.dmx_ho_so h where h.nguoi_dung_id = l.nguoi_dung_id and l.sieu_thi_id is null;
alter table public.dmx_line_lich_gui alter column sieu_thi_id set not null;
alter table public.dmx_line_lich_gui drop constraint if exists dmx_line_lich_gui_sieu_thi_id_fkey;
alter table public.dmx_line_lich_gui add constraint dmx_line_lich_gui_sieu_thi_id_fkey
  foreign key (sieu_thi_id) references public.dmx_sieu_thi(id) on delete cascade;

alter table public.dmx_line_anh_bao_cao add column if not exists sieu_thi_id uuid;
update public.dmx_line_anh_bao_cao a set sieu_thi_id = h.sieu_thi_dang_chon
from public.dmx_ho_so h where h.nguoi_dung_id = a.nguoi_dung_id and a.sieu_thi_id is null;
alter table public.dmx_line_anh_bao_cao alter column sieu_thi_id set not null;
alter table public.dmx_line_anh_bao_cao drop constraint if exists dmx_line_anh_bao_cao_pkey;
alter table public.dmx_line_anh_bao_cao add constraint dmx_line_anh_bao_cao_pkey
  primary key (nguoi_dung_id, sieu_thi_id, loai);
alter table public.dmx_line_anh_bao_cao drop constraint if exists dmx_line_anh_bao_cao_sieu_thi_id_fkey;
alter table public.dmx_line_anh_bao_cao add constraint dmx_line_anh_bao_cao_sieu_thi_id_fkey
  foreign key (sieu_thi_id) references public.dmx_sieu_thi(id) on delete cascade;

create index if not exists dmx_sieu_thi_nguoi_dung_idx on public.dmx_sieu_thi (nguoi_dung_id, ngay_tao);
create index if not exists dmx_du_lieu_sieu_thi_ngay_idx on public.dmx_du_lieu_ngay (sieu_thi_id, ngay desc);
create index if not exists dmx_lich_sieu_thi_idx on public.dmx_line_lich_gui (sieu_thi_id, dang_hoat_dong, gio);
create index if not exists dmx_anh_sieu_thi_idx on public.dmx_line_anh_bao_cao (sieu_thi_id, ngay_cap_nhat desc);

alter table public.dmx_sieu_thi enable row level security;
drop policy if exists "dmx xem sieu thi cua minh" on public.dmx_sieu_thi;
create policy "dmx xem sieu thi cua minh" on public.dmx_sieu_thi for select to authenticated
  using (nguoi_dung_id = auth.uid());
drop policy if exists "dmx tao sieu thi cua minh" on public.dmx_sieu_thi;
create policy "dmx tao sieu thi cua minh" on public.dmx_sieu_thi for insert to authenticated
  with check (nguoi_dung_id = auth.uid());
drop policy if exists "dmx sua sieu thi cua minh" on public.dmx_sieu_thi;
create policy "dmx sua sieu thi cua minh" on public.dmx_sieu_thi for update to authenticated
  using (nguoi_dung_id = auth.uid()) with check (nguoi_dung_id = auth.uid());
drop policy if exists "dmx xoa sieu thi cua minh" on public.dmx_sieu_thi;
create policy "dmx xoa sieu thi cua minh" on public.dmx_sieu_thi for delete to authenticated
  using (nguoi_dung_id = auth.uid());
grant select, insert, update, delete on public.dmx_sieu_thi to authenticated;

create or replace function public.dmx_tao_sieu_thi_mac_dinh()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.dmx_sieu_thi (nguoi_dung_id, ma_sieu_thi, ten_sieu_thi, cai_dat)
  values (new.nguoi_dung_id, 'MAC_DINH', 'Siêu thị mặc định', new.cai_dat)
  on conflict (nguoi_dung_id, ma_sieu_thi) do update set ngay_cap_nhat = now()
  returning id into v_id;
  update public.dmx_ho_so set sieu_thi_dang_chon = v_id where nguoi_dung_id = new.nguoi_dung_id;
  return new;
end;
$$;
drop trigger if exists dmx_tao_sieu_thi_mac_dinh_khi_co_ho_so on public.dmx_ho_so;
create trigger dmx_tao_sieu_thi_mac_dinh_khi_co_ho_so
after insert on public.dmx_ho_so for each row execute function public.dmx_tao_sieu_thi_mac_dinh();

notify pgrst, 'reload schema';
