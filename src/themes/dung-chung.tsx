import Link from "next/link";
import type { BaiVietTheme } from "@/themes/types";

export function AnhBaiViet({ baiViet, className = "" }: { baiViet: BaiVietTheme; className?: string }) {
  if (!baiViet.google_drive_anh_dai_dien_file_id) {
    return <div className={`flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 ${className}`}><span className="text-5xl font-black text-blue-300">D</span></div>;
  }
  return <img src={`/api/google-drive/tep/${baiViet.google_drive_anh_dai_dien_file_id}`} alt={baiViet.tieu_de} className={className} />;
}

export function LinkBaiViet({ baiViet, children, className = "" }: { baiViet: BaiVietTheme; children: React.ReactNode; className?: string }) {
  return <Link href={`/bai-viet/${baiViet.duong_dan}`} className={className}>{children}</Link>;
}
