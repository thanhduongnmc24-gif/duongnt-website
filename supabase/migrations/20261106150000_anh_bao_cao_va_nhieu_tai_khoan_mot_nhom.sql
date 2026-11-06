-- Một nhóm LINE có thể nhận báo cáo từ nhiều tài khoản DMX.
alter table public.dmx_line_lich_gui
  drop constraint if exists dmx_line_lich_gui_line_group_id_fkey;

alter table public.dmx_line_nhom
  drop constraint if exists dmx_line_nhom_pkey;

alter table public.dmx_line_nhom
  add constraint dmx_line_nhom_pkey primary key (line_group_id, nguoi_dung_id);

-- Khôi phục những liên kết từng bị tài khoản khác ghi đè: lịch cũ vẫn giữ đúng
-- nguoi_dung_id nên có thể tái tạo an toàn hàng nhóm tương ứng.
insert into public.dmx_line_nhom (
  line_group_id, nguoi_dung_id, ten_nhom, dang_hoat_dong, ngay_tao, ngay_cap_nhat
)
select distinct
  lich.line_group_id,
  lich.nguoi_dung_id,
  coalesce(nhom.ten_nhom, 'Nhóm LINE'),
  true,
  coalesce(nhom.ngay_tao, now()),
  now()
from public.dmx_line_lich_gui lich
left join public.dmx_line_nhom nhom
  on nhom.line_group_id = lich.line_group_id
where not exists (
  select 1
  from public.dmx_line_nhom da_co
  where da_co.line_group_id = lich.line_group_id
    and da_co.nguoi_dung_id = lich.nguoi_dung_id
)
on conflict (line_group_id, nguoi_dung_id) do nothing;

alter table public.dmx_line_lich_gui
  add constraint dmx_line_lich_gui_nhom_tai_khoan_fkey
  foreign key (line_group_id, nguoi_dung_id)
  references public.dmx_line_nhom(line_group_id, nguoi_dung_id)
  on delete cascade;

-- Chỉ giữ ảnh mới nhất của từng loại báo cáo, vì vậy dung lượng không tăng theo số lần quét.
create table if not exists public.dmx_line_anh_bao_cao (
  nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
  loai text not null,
  ngay date not null,
  nha_cung_cap text not null default 'supabase',
  duong_dan_luu_tru text,
  url_ben_ngoai text,
  ngay_cap_nhat timestamptz not null default now(),
  primary key (nguoi_dung_id, loai),
  constraint dmx_line_anh_loai_hop_le check (
    loai in ('tongquan','doanhthu','realtime','luyke','thidua','nhanvien','suckhoe')
  ),
  constraint dmx_line_anh_nha_cung_cap_hop_le check (
    nha_cung_cap in ('supabase','google_drive')
  )
);

alter table public.dmx_line_anh_bao_cao enable row level security;
revoke all on public.dmx_line_anh_bao_cao from anon, authenticated;

create index if not exists dmx_line_anh_bao_cao_cap_nhat_idx
  on public.dmx_line_anh_bao_cao (nguoi_dung_id, ngay_cap_nhat desc);

notify pgrst, 'reload schema';
