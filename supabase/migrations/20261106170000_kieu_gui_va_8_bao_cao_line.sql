alter table public.dmx_line_lich_gui
  add column if not exists kieu_gui text not null default 'anh';

alter table public.dmx_line_lich_gui
  drop constraint if exists dmx_line_lich_gui_kieu_gui_hop_le,
  drop constraint if exists dmx_line_lich_gui_noi_dung_hop_le;

-- Đổi các lịch cũ sang 8 loại ảnh đúng với menu xuất ảnh trong ứng dụng.
update public.dmx_line_lich_gui lich
set cac_noi_dung = (
  select array_agg(distinct case noi_dung
    when 'tongquan' then 'luyke_du_kien'
    when 'doanhthu' then 'luyke_du_kien'
    when 'luyke' then 'doanhthu_thidua_luyke'
    when 'thidua' then 'doanhthu_thidua_luyke'
    when 'realtime' then 'doanhthu_thidua_realtime'
    when 'nhanvien' then 'xep_hang_nv_luyke'
    when 'suckhoe' then 'bieu_do_suc_khoe_nv'
    else noi_dung
  end)
  from unnest(lich.cac_noi_dung) noi_dung
);

alter table public.dmx_line_lich_gui
  alter column cac_noi_dung set default array['luyke_du_kien']::text[],
  add constraint dmx_line_lich_gui_kieu_gui_hop_le
    check (kieu_gui in ('anh', 'text')),
  add constraint dmx_line_lich_gui_noi_dung_hop_le check (
    cac_noi_dung <@ array[
      'luyke_du_kien','doanhthu_thidua_luyke','doanhthu_thidua_realtime',
      'xep_hang_nv_realtime','xep_hang_nv_luyke','bieu_do_realtime_thang',
      'bieu_do_suc_khoe_nv','chi_tiet_nhan_vien'
    ]::text[]
  );

alter table public.dmx_line_anh_bao_cao
  drop constraint if exists dmx_line_anh_loai_hop_le,
  add constraint dmx_line_anh_loai_hop_le check (
    loai in (
      'luyke_du_kien','doanhthu_thidua_luyke','doanhthu_thidua_realtime',
      'xep_hang_nv_realtime','xep_hang_nv_luyke','bieu_do_realtime_thang',
      'bieu_do_suc_khoe_nv','chi_tiet_nhan_vien',
      'tongquan','doanhthu','realtime','luyke','thidua','nhanvien','suckhoe'
    )
  );

notify pgrst, 'reload schema';
