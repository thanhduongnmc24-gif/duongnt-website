alter table public.de_muc_con
  add column if not exists catalog_id uuid unique
  references public.catalog(id) on delete cascade;

create index if not exists chi_muc_de_muc_con_catalog
  on public.de_muc_con(catalog_id)
  where catalog_id is not null;

create or replace function public.dong_bo_catalog_thanh_de_muc_cap_2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  de_muc_con_catalog_id uuid;
  duong_dan_moi text;
  thu_tu_moi integer;
begin
  if new.ngay_xoa is not null then
    update public.de_muc_con
    set dang_hien_thi = false,
        ngay_cap_nhat = now()
    where catalog_id = new.id;
    return new;
  end if;

  duong_dan_moi := coalesce(nullif(new.duong_dan, ''), 'catalog-' || new.id::text);

  select id
  into de_muc_con_catalog_id
  from public.de_muc_con
  where catalog_id = new.id
  limit 1;

  if de_muc_con_catalog_id is null then
    select coalesce(max(thu_tu), -1) + 1
    into thu_tu_moi
    from public.de_muc_con
    where de_muc_id = new.de_muc_id;

    while exists (
      select 1
      from public.de_muc_con
      where de_muc_id = new.de_muc_id
        and duong_dan = duong_dan_moi
    ) loop
      duong_dan_moi := left(duong_dan_moi, 70) || '-' || substr(new.id::text, 1, 8);
    end loop;

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
      duong_dan_moi,
      new.tom_tat,
      thu_tu_moi,
      new.trang_thai = 'da_dang',
      new.id
    )
    returning id into de_muc_con_catalog_id;
  else
    if exists (
      select 1
      from public.de_muc_con
      where de_muc_id = new.de_muc_id
        and duong_dan = duong_dan_moi
        and id <> de_muc_con_catalog_id
    ) then
      duong_dan_moi := left(duong_dan_moi, 70) || '-' || substr(new.id::text, 1, 8);
    end if;

    update public.de_muc_con
    set de_muc_id = new.de_muc_id,
        ten_de_muc_con = new.tieu_de,
        duong_dan = duong_dan_moi,
        mo_ta = new.tom_tat,
        dang_hien_thi = new.trang_thai = 'da_dang',
        ngay_cap_nhat = now()
    where id = de_muc_con_catalog_id;
  end if;

  if new.de_muc_con_id is distinct from de_muc_con_catalog_id then
    update public.catalog
    set de_muc_con_id = de_muc_con_catalog_id,
        ngay_cap_nhat = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists dong_bo_catalog_de_muc_cap_2 on public.catalog;

create trigger dong_bo_catalog_de_muc_cap_2
after insert or update of tieu_de, duong_dan, tom_tat, de_muc_id, trang_thai, ngay_xoa
on public.catalog
for each row
execute function public.dong_bo_catalog_thanh_de_muc_cap_2();

-- Dong bo du lieu Catalog da ton tai.
do $$
declare
  item record;
  child_id uuid;
  child_slug text;
  child_order integer;
begin
  for item in
    select * from public.catalog where ngay_xoa is null order by ngay_tao
  loop
    select id into child_id
    from public.de_muc_con
    where catalog_id = item.id
    limit 1;

    if child_id is null then
      child_slug := coalesce(nullif(item.duong_dan, ''), 'catalog-' || item.id::text);
      if exists (
        select 1 from public.de_muc_con
        where de_muc_id = item.de_muc_id and duong_dan = child_slug
      ) then
        child_slug := left(child_slug, 70) || '-' || substr(item.id::text, 1, 8);
      end if;

      select coalesce(max(thu_tu), -1) + 1 into child_order
      from public.de_muc_con where de_muc_id = item.de_muc_id;

      insert into public.de_muc_con (
        de_muc_id, ten_de_muc_con, duong_dan, mo_ta,
        thu_tu, dang_hien_thi, catalog_id
      ) values (
        item.de_muc_id, item.tieu_de, child_slug, item.tom_tat,
        child_order, item.trang_thai = 'da_dang', item.id
      ) returning id into child_id;
    end if;

    update public.catalog
    set de_muc_con_id = child_id
    where id = item.id and de_muc_con_id is distinct from child_id;
  end loop;
end $$;
