import Link from "next/link";
import type { DuLieuTrangChuTheme } from "@/themes/types";
import { AnhBaiViet, LinkBaiViet } from "@/themes/dung-chung";

export function TrangChuNewsPortal({ duLieu }: { duLieu: DuLieuTrangChuTheme }) {
  const baiNoiBat =
    duLieu.danhSachBaiViet.find(
      (baiViet) => baiViet.google_drive_anh_dai_dien_file_id
    ) ?? duLieu.danhSachBaiViet[0];

  const baiConLai = duLieu.danhSachBaiViet.filter(
    (baiViet) => baiViet.id !== baiNoiBat?.id
  );

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <section className="px-4 py-7">
        <div className="mx-auto grid max-w-7xl items-center gap-7 rounded-2xl bg-white p-6 shadow-sm lg:grid-cols-[.85fr_1.15fr] lg:p-9">
          <div>
            <p className="font-bold text-red-600">CỔNG NỘI DUNG</p>
            <h1 className="mt-3 text-5xl font-black leading-tight text-slate-950 md:text-6xl">
              {duLieu.tenWebsite}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {duLieu.moTaWebsite}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#bai-viet" className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white">
                Xem tin mới
              </a>
              {duLieu.danhSachDeMuc[0] ? (
                <Link
                  href={`/de-muc/${duLieu.danhSachDeMuc[0].duong_dan}`}
                  className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-800"
                >
                  Xem đề mục
                </Link>
              ) : null}
            </div>
          </div>

          {baiNoiBat ? (
            <LinkBaiViet baiViet={baiNoiBat} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
              <AnhBaiViet baiViet={baiNoiBat} className="h-72 w-full object-cover md:h-80" />
              <div className="p-5">
                <p className="text-sm font-bold text-red-600">BÀI VIẾT NỔI BẬT</p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 group-hover:text-red-600 md:text-3xl">
                  {baiNoiBat.tieu_de}
                </h2>
                <p className="mt-3 line-clamp-2 leading-7 text-slate-600">
                  {baiNoiBat.tom_tat || "Khám phá nội dung mới nhất trên website."}
                </p>
              </div>
            </LinkBaiViet>
          ) : (
            <div className="min-h-96 rounded-xl bg-gradient-to-br from-slate-100 to-red-100" />
          )}
        </div>
      </section>

      <section id="bai-viet" className="mx-auto max-w-7xl px-4 pb-12 pt-5">
        <div className="flex items-center justify-between border-b-2 border-red-600 pb-3">
          <h2 className="text-2xl font-black text-slate-950">Bài viết mới</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {baiConLai.slice(0, 12).map((baiViet) => (
            <LinkBaiViet
              key={baiViet.id}
              baiViet={baiViet}
              className="overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <AnhBaiViet baiViet={baiViet} className="h-40 w-full object-cover" />
              <div className="p-4">
                <h3 className="line-clamp-2 font-black text-slate-950">{baiViet.tieu_de}</h3>
                <p className="mt-2 text-xs text-slate-500">
                  {baiViet.ngay_dang
                    ? new Date(baiViet.ngay_dang).toLocaleDateString("vi-VN")
                    : "Mới cập nhật"}
                </p>
              </div>
            </LinkBaiViet>
          ))}
        </div>
      </section>
    </main>
  );
}
