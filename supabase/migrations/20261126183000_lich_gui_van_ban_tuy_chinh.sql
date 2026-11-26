alter table public.dmx_line_lich_gui
  drop constraint if exists dmx_line_lich_gui_noi_dung_hop_le;

alter table public.dmx_line_lich_gui
  add constraint dmx_line_lich_gui_noi_dung_hop_le check (
    cardinality(cac_noi_dung) >= 1
    and (
      (
        kieu_gui = 'anh'
        and cac_noi_dung <@ array[
          'luyke_du_kien','doanhthu_thidua_luyke','doanhthu_thidua_realtime',
          'xep_hang_nv_realtime','xep_hang_nv_luyke','bieu_do_realtime_thang',
          'bieu_do_suc_khoe_nv','chi_tiet_nhan_vien'
        ]::text[]
      )
      or (
        kieu_gui = 'text'
        and (
          cac_noi_dung <@ array[
            'luyke_du_kien','doanhthu_thidua_luyke','doanhthu_thidua_realtime',
            'xep_hang_nv_realtime','xep_hang_nv_luyke','bieu_do_realtime_thang',
            'bieu_do_suc_khoe_nv','chi_tiet_nhan_vien'
          ]::text[]
          or (
            cardinality(cac_noi_dung) = 1
            and left(cac_noi_dung[1], 12) = 'dmx_text_v1:'
            and char_length(btrim(substring(cac_noi_dung[1] from 13), E' \t\r\n')) >= 1
            and char_length(substring(cac_noi_dung[1] from 13)) <= 5000
          )
        )
      )
    )
  );

notify pgrst, 'reload schema';
