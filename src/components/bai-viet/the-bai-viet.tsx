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

type ThuocTinh = {
  baiViet: BaiViet;
};

export function TheBaiViet({ baiViet }: ThuocTinh) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/bai-viet/${baiViet.duong_dan}`} className="block">
        <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-blue-100 via-slate-100 to-indigo-100">
          {baiViet.google_drive_anh_dai_dien_file_id ? (
            <span className="px-4 text-center text-sm font-semibold text-slate-500">
              Ảnh đại diện sẽ hiển thị sau khi tích hợp Google Drive
            </span>
          ) : (
            <span className="text-5xl font-black text-blue-200">D</span>
          )}
        </div>

        <div className="p-5">
          <h2 className="line-clamp-2 text-xl font-bold text-slate-900 transition group-hover:text-blue-600">
            {baiViet.tieu_de}
          </h2>

          <p className="mt-3 line-clamp-3 min-h-18 text-sm leading-6 text-slate-600">
            {baiViet.tom_tat || "Bài viết chưa có phần tóm tắt."}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              {baiViet.ngay_dang
                ? new Date(baiViet.ngay_dang).toLocaleDateString("vi-VN")
                : "Chưa có ngày đăng"}
            </span>

            <span>{baiViet.luot_xem || 0} lượt xem</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
