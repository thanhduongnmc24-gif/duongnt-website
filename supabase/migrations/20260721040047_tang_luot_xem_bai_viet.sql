create or replace function public.tang_luot_xem_bai_viet(
  bai_viet_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  luot_xem_moi bigint;
begin
  update public.bai_viet
  set luot_xem = luot_xem + 1
  where id = bai_viet_id
    and trang_thai = 'da_dang'
    and ngay_xoa is null
  returning luot_xem into luot_xem_moi;

  if luot_xem_moi is null then
    raise exception 'Không tìm thấy bài viết đang được đăng.';
  end if;

  return luot_xem_moi;
end;
$$;

revoke all on function public.tang_luot_xem_bai_viet(uuid) from public;
grant execute on function public.tang_luot_xem_bai_viet(uuid) to anon, authenticated, service_role;
