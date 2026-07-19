-- =========================================================
-- HAM KIEM TRA QUYEN QUAN TRI
-- =========================================================

create or replace function public.la_quan_tri()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.nguoi_dung
    where id = auth.uid()
      and vai_tro = 'quan_tri'
      and dang_hoat_dong = true
  );
$$;

revoke all
on function public.la_quan_tri()
from public;

grant execute
on function public.la_quan_tri()
to anon, authenticated;


-- =========================================================
-- POLICY CHO BANG NGUOI_DUNG
-- =========================================================

create policy "nguoi dung xem tai khoan cua minh"
on public.nguoi_dung
for select
to authenticated
using (
  id = auth.uid()
  or public.la_quan_tri()
);

create policy "quan tri tao nguoi dung"
on public.nguoi_dung
for insert
to authenticated
with check (
  public.la_quan_tri()
);

create policy "quan tri sua nguoi dung"
on public.nguoi_dung
for update
to authenticated
using (
  public.la_quan_tri()
)
with check (
  public.la_quan_tri()
);

create policy "quan tri xoa nguoi dung"
on public.nguoi_dung
for delete
to authenticated
using (
  public.la_quan_tri()
);


-- =========================================================
-- POLICY CHO BANG DE_MUC
-- =========================================================

create policy "cong khai xem de muc"
on public.de_muc
for select
to anon, authenticated
using (
  dang_hien_thi = true
  or public.la_quan_tri()
);

create policy "quan tri tao de muc"
on public.de_muc
for insert
to authenticated
with check (
  public.la_quan_tri()
);

create policy "quan tri sua de muc"
on public.de_muc
for update
to authenticated
using (
  public.la_quan_tri()
)
with check (
  public.la_quan_tri()
);

create policy "quan tri xoa de muc"
on public.de_muc
for delete
to authenticated
using (
  public.la_quan_tri()
);


-- =========================================================
-- POLICY CHO BANG DE_MUC_CON
-- =========================================================

create policy "cong khai xem de muc con"
on public.de_muc_con
for select
to anon, authenticated
using (
  dang_hien_thi = true
  or public.la_quan_tri()
);

create policy "quan tri tao de muc con"
on public.de_muc_con
for insert
to authenticated
with check (
  public.la_quan_tri()
);

create policy "quan tri sua de muc con"
on public.de_muc_con
for update
to authenticated
using (
  public.la_quan_tri()
)
with check (
  public.la_quan_tri()
);

create policy "quan tri xoa de muc con"
on public.de_muc_con
for delete
to authenticated
using (
  public.la_quan_tri()
);


-- =========================================================
-- POLICY CHO BANG BAI_VIET
-- =========================================================

create policy "cong khai xem bai da dang"
on public.bai_viet
for select
to anon, authenticated
using (
  trang_thai = 'da_dang'
  or nguoi_dang_id = auth.uid()
  or public.la_quan_tri()
);

create policy "nguoi dung tao bai cua minh"
on public.bai_viet
for insert
to authenticated
with check (
  nguoi_dang_id = auth.uid()
  and exists (
    select 1
    from public.nguoi_dung
    where id = auth.uid()
      and dang_hoat_dong = true
  )
);

create policy "nguoi dung sua bai cua minh"
on public.bai_viet
for update
to authenticated
using (
  nguoi_dang_id = auth.uid()
  or public.la_quan_tri()
)
with check (
  nguoi_dang_id = auth.uid()
  or public.la_quan_tri()
);

create policy "nguoi dung xoa bai cua minh"
on public.bai_viet
for delete
to authenticated
using (
  nguoi_dang_id = auth.uid()
  or public.la_quan_tri()
);


-- =========================================================
-- POLICY CHO BANG ANH_BAI_VIET
-- =========================================================

create policy "cong khai xem anh bai viet"
on public.anh_bai_viet
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.bai_viet
    where bai_viet.id = anh_bai_viet.bai_viet_id
      and (
        bai_viet.trang_thai = 'da_dang'
        or bai_viet.nguoi_dang_id = auth.uid()
        or public.la_quan_tri()
      )
  )
);

create policy "chu bai them anh"
on public.anh_bai_viet
for insert
to authenticated
with check (
  exists (
    select 1
    from public.bai_viet
    where bai_viet.id = anh_bai_viet.bai_viet_id
      and (
        bai_viet.nguoi_dang_id = auth.uid()
        or public.la_quan_tri()
      )
  )
);

create policy "chu bai sua anh"
on public.anh_bai_viet
for update
to authenticated
using (
  exists (
    select 1
    from public.bai_viet
    where bai_viet.id = anh_bai_viet.bai_viet_id
      and (
        bai_viet.nguoi_dang_id = auth.uid()
        or public.la_quan_tri()
      )
  )
)
with check (
  exists (
    select 1
    from public.bai_viet
    where bai_viet.id = anh_bai_viet.bai_viet_id
      and (
        bai_viet.nguoi_dang_id = auth.uid()
        or public.la_quan_tri()
      )
  )
);

create policy "chu bai xoa anh"
on public.anh_bai_viet
for delete
to authenticated
using (
  exists (
    select 1
    from public.bai_viet
    where bai_viet.id = anh_bai_viet.bai_viet_id
      and (
        bai_viet.nguoi_dang_id = auth.uid()
        or public.la_quan_tri()
      )
  )
);


-- =========================================================
-- POLICY CHO BANG GIAO_DIEN
-- =========================================================

create policy "cong khai xem giao dien"
on public.giao_dien
for select
to anon, authenticated
using (true);

create policy "quan tri tao giao dien"
on public.giao_dien
for insert
to authenticated
with check (
  public.la_quan_tri()
);

create policy "quan tri sua giao dien"
on public.giao_dien
for update
to authenticated
using (
  public.la_quan_tri()
)
with check (
  public.la_quan_tri()
);

create policy "quan tri xoa giao dien"
on public.giao_dien
for delete
to authenticated
using (
  public.la_quan_tri()
);


-- =========================================================
-- POLICY CHO BANG CAU_HINH_WEBSITE
-- =========================================================

create policy "cong khai xem cau hinh website"
on public.cau_hinh_website
for select
to anon, authenticated
using (true);

create policy "quan tri tao cau hinh website"
on public.cau_hinh_website
for insert
to authenticated
with check (
  public.la_quan_tri()
);

create policy "quan tri sua cau hinh website"
on public.cau_hinh_website
for update
to authenticated
using (
  public.la_quan_tri()
)
with check (
  public.la_quan_tri()
);

create policy "quan tri xoa cau hinh website"
on public.cau_hinh_website
for delete
to authenticated
using (
  public.la_quan_tri()
);


-- =========================================================
-- POLICY CHO BANG LICH_SU_QUAN_TRI
-- =========================================================

create policy "quan tri xem lich su"
on public.lich_su_quan_tri
for select
to authenticated
using (
  public.la_quan_tri()
);

create policy "quan tri ghi lich su"
on public.lich_su_quan_tri
for insert
to authenticated
with check (
  public.la_quan_tri()
);