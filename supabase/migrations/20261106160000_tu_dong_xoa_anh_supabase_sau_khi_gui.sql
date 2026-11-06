alter table public.dmx_line_anh_bao_cao
  add column if not exists xoa_sau timestamptz;

create index if not exists dmx_line_anh_bao_cao_xoa_sau_idx
  on public.dmx_line_anh_bao_cao (xoa_sau)
  where xoa_sau is not null;

notify pgrst, 'reload schema';
