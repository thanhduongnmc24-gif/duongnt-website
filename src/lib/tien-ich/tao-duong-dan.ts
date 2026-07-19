export function taoDuongDan(chuoi: string): string {
  return chuoi
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function taoEmailDangNhapNoiBo(
  tenDangNhap: string
): string {
  const tenDangNhapChuanHoa = taoDuongDan(tenDangNhap);

  return `${tenDangNhapChuanHoa}@internal.duongnt.io.vn`;
}