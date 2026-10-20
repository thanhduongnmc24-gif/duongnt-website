drop policy if exists "thong so tao anh cua minh" on public.thong_so_anh;
create policy "thong so tao anh cua minh" on public.thong_so_anh
for insert to authenticated
with check (
  nguoi_dung_id = auth.uid()
  and exists (
    select 1 from public.thong_so_bang
    where thong_so_bang.id = thong_so_anh.bang_id
      and thong_so_bang.nguoi_dung_id = auth.uid()
  )
);

drop policy if exists "thong so sua anh cua minh" on public.thong_so_anh;
create policy "thong so sua anh cua minh" on public.thong_so_anh
for update to authenticated
using (nguoi_dung_id = auth.uid())
with check (
  nguoi_dung_id = auth.uid()
  and exists (
    select 1 from public.thong_so_bang
    where thong_so_bang.id = thong_so_anh.bang_id
      and thong_so_bang.nguoi_dung_id = auth.uid()
  )
);

drop policy if exists "thong so xoa anh cua minh" on public.thong_so_anh;
create policy "thong so xoa anh cua minh" on public.thong_so_anh
for delete to authenticated using (nguoi_dung_id = auth.uid());

grant select, insert, update, delete on public.thong_so_anh to authenticated;

notify pgrst, 'reload schema';
