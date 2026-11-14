alter table public.dmx_line_anh_bao_cao
  drop constraint if exists dmx_line_anh_loai_hop_le,
  add constraint dmx_line_anh_loai_hop_le check (
    loai in (
      'luyke_du_kien','doanhthu_thidua_luyke','doanhthu_thidua_realtime',
      'xep_hang_nv_realtime','xep_hang_nv_luyke','bieu_do_realtime_thang',
      'bieu_do_suc_khoe_nv','chi_tiet_nhan_vien',
      'tongquan','doanhthu','realtime','luyke','thidua','nhanvien','suckhoe','sk'
    )
    or loai ~ '^sk_[0-9a-zA-Z_-]{1,32}$'
  );

notify pgrst, 'reload schema';
