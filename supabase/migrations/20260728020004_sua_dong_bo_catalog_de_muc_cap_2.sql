-- Sua quan he vong va dong bo Catalog thanh de muc cap 2 that.

alter table public.de_muc_con
  add column if not exists catalog_id uuid;

-- Xoa cac rang buoc cu de tao lai dung hanh vi xoa.
alter table public.catalog
  drop constraint if exists catalog_de_muc_con_id_fkey;

alter table public.de_muc_con
  drop constraint if exists de_muc_con_catalog_id_fkey;

alter table public.catalog
  add constraint catalog_de_muc_con_id_fkey
  foreign key (de_muc_con_id)
  references public.de_muc_con(id)
  on delete set null;

alter table public.de_muc_con
  add constraint de_muc_con_catalog_id_fkey
  foreign key (catalog_id)
  references public.catalog(id)
  on delete cascade;

create unique index if not exists de_muc_con_catalog_id_duy_nhat
  on public.de_muc_con(catalog_id)
  where catalog_id is not null;

create index if not exists de_muc_con_de_muc_catalog
  on public.de_muc_con(de_muc_id, catalog_id);

-- Gan Catalog hien co vao de muc cap 2 dang duoc tham chieu neu co.
update public.de_muc_con dmc
set catalog_id = c.id,
    ngay_cap_nhat = now()
from public.catalog c
where c.de_muc_con_id = dmc.id
  and dmc.catalog_id is null;

-- Tao de muc cap 2 cho Catalog chua co lien ket.
do $$
declare
  item record;
  child_id uuid;
  child_slug text;
  child_order integer;
begin
  for item in
    select *
    from public.catalog
    where ngay_xoa is null
    order by ngay_tao, id
  loop
    select id
    into child_id
    from public.de_muc_con
    where catalog_id = item.id
    limit 1;

    if child_id is null then
      child_slug := coalesce(nullif(item.duong_dan, ''), 'catalog-' || substr(item.id::text, 1, 8));

      if exists (
        select 1
        from public.de_muc_con
        where de_muc_id = item.de_muc_id
          and duong_dan = child_slug
      ) then
        child_slug := left(child_slug, 70) || '-' || substr(item.id::text, 1, 8);
      end if;

      select coalesce(max(thu_tu), -1) + 1
      into child_order
      from public.de_muc_con
      where de_muc_id = item.de_muc_id;

      insert into public.de_muc_con (
        de_muc_id,
        ten_de_muc_con,
        duong_dan,
        mo_ta,
        thu_tu,
        dang_hien_thi,
        catalog_id
      ) values (
        item.de_muc_id,
        item.tieu_de,
        child_slug,
        item.tom_tat,
        child_order,
        item.trang_thai = 'da_dang',
        item.id
      )
      returning id into child_id;
    end if;

    update public.catalog
    set de_muc_con_id = child_id,
        ngay_cap_nhat = now()
    where id = item.id
      and de_muc_con_id is distinct from child_id;
  end loop;
end $$;

create or replace function public.dong_bo_catalog_de_muc_cap_2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  child_id uuid;
  child_slug text;
  child_order integer;
begin
  select id
  into child_id
  from public.de_muc_con
  where catalog_id = new.id
  limit 1;

  if new.ngay_xoa is not null then
    if child_id is not null then
      update public.de_muc_con
      set dang_hien_thi = false,
          ngay_cap_nhat = now()
      where id = child_id;
    end if;
    return new;
  end if;

  child_slug := coalesce(nullif(new.duong_dan, ''), 'catalog-' || substr(new.id::text, 1, 8));

  if child_id is null then
    if exists (
      select 1 from public.de_muc_con
      where de_muc_id = new.de_muc_id
        and duong_dan = child_slug
    ) then
      child_slug := left(child_slug, 70) || '-' || substr(new.id::text, 1, 8);
    end if;

    select coalesce(max(thu_tu), -1) + 1
    into child_order
    from public.de_muc_con
    where de_muc_id = new.de_muc_id;

    insert into public.de_muc_con (
      de_muc_id,
      ten_de_muc_con,
      duong_dan,
      mo_ta,
      thu_tu,
      dang_hien_thi,
      catalog_id
    ) values (
      new.de_muc_id,
      new.tieu_de,
      child_slug,
      new.tom_tat,
      child_order,
      new.trang_thai = 'da_dang',
      new.id
    )
    returning id into child_id;
  else
    if exists (
      select 1 from public.de_muc_con
      where de_muc_id = new.de_muc_id
        and duong_dan = child_slug
        and id <> child_id
    ) then
      child_slug := left(child_slug, 70) || '-' || substr(new.id::text, 1, 8);
    end if;

    update public.de_muc_con
    set de_muc_id = new.de_muc_id,
        ten_de_muc_con = new.tieu_de,
        duong_dan = child_slug,
        mo_ta = new.tom_tat,
        dang_hien_thi = new.trang_thai = 'da_dang',
        ngay_cap_nhat = now()
    where id = child_id;
  end if;

  update public.catalog
  set de_muc_con_id = child_id
  where id = new.id
    and de_muc_con_id is distinct from child_id;

  return new;
end;
$$;

drop trigger if exists dong_bo_catalog_de_muc_cap_2 on public.catalog;
drop trigger if exists dong_bo_catalog_de_muc_cap_2_v2 on public.catalog;

create trigger dong_bo_catalog_de_muc_cap_2_v2
after insert or update of tieu_de, duong_dan, tom_tat, de_muc_id, trang_thai, ngay_xoa
on public.catalog
for each row
execute function public.dong_bo_catalog_de_muc_cap_2();

-- Bao PostgREST tai lai schema sau khi them quan he.
notify pgrst, 'reload schema';
