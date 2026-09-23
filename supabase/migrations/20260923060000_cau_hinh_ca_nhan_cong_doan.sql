-- Cau hinh mac dinh rieng cho tung tai khoan Cong doan
alter table public.cong_doan_ho_so
  add column if not exists phut_chuan_mac_dinh integer not null default 510,
  add column if not exists gio_vao_mac_dinh time not null default '07:30',
  add column if not exists gio_ve_mac_dinh time not null default '16:30';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cong_doan_ho_so_phut_chuan_mac_dinh_hop_le'
  ) then
    alter table public.cong_doan_ho_so
      add constraint cong_doan_ho_so_phut_chuan_mac_dinh_hop_le
      check (phut_chuan_mac_dinh between 1 and 1440);
  end if;
end $$;

grant select, update on public.cong_doan_ho_so to authenticated;
