export const danhSachMauGiaoDien = [
  {
    ma: "dark-tech",
    ten: "Dark X",
    moTa: "Giao diện công nghệ nền tối, ánh sáng tím và các khối nội dung hiện đại.",
  },
  {
    ma: "modern-blue",
    ten: "Organic Green",
    moTa: "Giao diện doanh nghiệp xanh với ảnh hero lớn và các khối giới thiệu rõ ràng.",
  },
  {
    ma: "minimal-light",
    ten: "News Portal",
    moTa: "Giao diện cổng thông tin với banner, bộ lọc và nhiều khu vực bài viết.",
  },
] as const;

export function laMaGiaoDienHopLe(ma: string) {
  return danhSachMauGiaoDien.some((giaoDien) => giaoDien.ma === ma);
}
