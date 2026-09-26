alter table public.toan_lop_1_tien_do
  add column if not exists du_lieu_net_ve jsonb not null default '[]'::jsonb,
  add column if not exists diem numeric(4,1) not null default 0,
  add column if not exists quyen smallint,
  add column if not exists trang smallint;

alter table public.toan_lop_1_tien_do
  drop constraint if exists toan_lop_1_net_ve_la_mang,
  add constraint toan_lop_1_net_ve_la_mang check (jsonb_typeof(du_lieu_net_ve) = 'array'),
  drop constraint if exists toan_lop_1_diem_hop_le,
  add constraint toan_lop_1_diem_hop_le check (diem >= 0 and diem <= 10),
  drop constraint if exists toan_lop_1_quyen_hop_le,
  add constraint toan_lop_1_quyen_hop_le check (quyen is null or quyen in (1, 2)),
  drop constraint if exists toan_lop_1_trang_hop_le,
  add constraint toan_lop_1_trang_hop_le check (trang is null or trang between 3 and 47);

grant select, update on public.toan_lop_1_ho_so to authenticated;
grant select, insert, update, delete on public.toan_lop_1_tien_do to authenticated;
