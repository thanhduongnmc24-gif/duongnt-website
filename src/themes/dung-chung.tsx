import Link from "next/link";
import type { BaiVietTheme } from "@/themes/types";

export function AnhBaiViet({
  baiViet,
  className = "",
}: {
  baiViet: BaiVietTheme;
  className?: string;
}) {
  if (!baiViet.google_drive_anh_dai_dien_file_id) {
    return (
      <div
        aria-label="Bài viết chưa có ảnh đại diện"
        className={`bg-gradient-to-br from-emerald-100 via-slate-100 to-sky-200 ${className}`}
      />
    );
  }

  return (
    <img
      src={`/api/google-drive/tep/${baiViet.google_drive_anh_dai_dien_file_id}`}
      alt={baiViet.tieu_de}
      className={className}
    />
  );
}

export function LinkBaiViet({
  baiViet,
  children,
  className = "",
}: {
  baiViet: BaiVietTheme;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={`/bai-viet/${baiViet.duong_dan}`}
      className={className}
    >
      {children}
    </Link>
  );
}
