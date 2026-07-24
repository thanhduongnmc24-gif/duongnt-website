import Link from "next/link";

type BaiViet = {
  id: string;
  tieu_de: string;
  duong_dan: string;
  tom_tat: string | null;
  google_drive_anh_dai_dien_file_id: string | null;
  ngay_dang: string | null;
  luot_xem: number;
};

export function TheBaiVietTheme({ baiViet, maTheme }: { baiViet: BaiViet; maTheme: string }) {
  const toi = maTheme === "dark-tech";
  const tinTuc = maTheme === "minimal-light";
  const lop = toi
    ? "border-white/10 bg-[#12101d] text-white hover:border-fuchsia-400/50"
    : tinTuc
      ? "border-slate-200 bg-white text-slate-900 hover:border-red-300"
      : "border-green-100 bg-white text-[#17351f] hover:border-green-400";

  return (
    <article className={`group overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${lop}`}>
      <Link href={`/bai-viet/${baiViet.duong_dan}`} className="block">
        <div className="aspect-video overflow-hidden bg-slate-100">
          {baiViet.google_drive_anh_dai_dien_file_id ? (
            <img
              src={`/api/google-drive/tep/${baiViet.google_drive_anh_dai_dien_file_id}`}
              alt={baiViet.tieu_de}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 text-5xl font-black text-blue-300">D</div>
          )}
        </div>
        <div className="p-5">
          <h2 className={`line-clamp-2 text-xl font-black ${toi ? "group-hover:text-fuchsia-400" : tinTuc ? "group-hover:text-red-600" : "group-hover:text-green-700"}`}>
            {baiViet.tieu_de}
          </h2>
          <p className={`mt-3 line-clamp-3 text-sm leading-6 ${toi ? "text-slate-400" : "text-slate-600"}`}>
            {baiViet.tom_tat || "Bài viết chưa có phần tóm tắt."}
          </p>
          <div className={`mt-5 flex justify-between border-t pt-4 text-xs ${toi ? "border-white/10 text-slate-500" : "border-slate-100 text-slate-500"}`}>
            <span>{baiViet.ngay_dang ? new Date(baiViet.ngay_dang).toLocaleDateString("vi-VN") : "Mới cập nhật"}</span>
            <span>{baiViet.luot_xem || 0} lượt xem</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
