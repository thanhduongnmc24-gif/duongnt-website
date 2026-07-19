create or replace function public.kiem_tra_quan_tri_cuoi_cung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  so_quan_tri_con_lai integer;
begin
  if old.vai_tro = 'quan_tri'
     and old.dang_hoat_dong = true
     and (
       new.vai_tro <> 'quan_tri'
       or new.dang_hoat_dong = false
     )
  then
    select count(*)
    into so_quan_tri_con_lai
    from public.nguoi_dung
    where vai_tro = 'quan_tri'
      and dang_hoat_dong = true
      and id <> old.id;

    if so_quan_tri_con_lai = 0 then
      raise exception 'Không thể khóa hoặc hạ quyền quản trị cuối cùng.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bao_ve_quan_tri_cuoi_cung
on public.nguoi_dung;

create trigger bao_ve_quan_tri_cuoi_cung
before update on public.nguoi_dung
for each row
execute function public.kiem_tra_quan_tri_cuoi_cung();
