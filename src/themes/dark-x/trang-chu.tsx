import Link from "next/link";
import type { DuLieuTrangChuTheme } from "@/themes/types";
import { AnhBaiViet, LinkBaiViet } from "@/themes/dung-chung";

export function TrangChuDarkX({ duLieu }: { duLieu: DuLieuTrangChuTheme }) {
  const baiNoiBat =
    duLieu.danhSachBaiViet.find(
      (baiViet) => baiViet.google_drive_anh_dai_dien_file_id
    ) ?? duLieu.danhSachBaiViet[0];

  const baiConLai = duLieu.danhSachBaiViet.filter(
    (baiViet) => baiViet.id !== baiNoiBat?.id
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#090812] text-white">
      <section className="relative border-b border-purple-500/20 px-4 py-14 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(217,70,239,.22),transparent_28%),radial-gradient(circle_at_82%_65%,rgba(79,70,229,.20),transparent_34%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.95fr_1.05fr]">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-4 py-2 text-sm font-bold text-fuchsia-300">
              NỘI DUNG MỚI · TRI THỨC THỰC
            </span>

            <h1 className="mt-6 text-5xl font-black leading-[1.05] text-white md:text-7xl">
              {duLieu.tenWebsite}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              {duLieu.moTaWebsite}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#bai-viet"
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-7 py-3 font-bold text-white"
              >
                Khám phá nội dung
              </a>
              {baiNoiBat ? (
                <Link
                  href={`/bai-viet/${baiNoiBat.duong_dan}`}
                  className="rounded-full border border-white/20 px-7 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  Xem bài mới
                </Link>
              ) : null}
            </div>
          </div>

          {baiNoiBat ? (
            <LinkBaiViet
              baiViet={baiNoiBat}
              className="group overflow-hidden rounded-[30px] border border-purple-400/25 bg-[#151225] p-4 shadow-[0_0_70px_rgba(139,92,246,.22)]"
            >
              <AnhBaiViet
                baiViet={baiNoiBat}
                className="h-72 w-full rounded-2xl object-cover md:h-80"
              />
              <div className="px-2 pb-3 pt-5">
                <p className="text-sm font-bold text-fuchsia-400">
                  BÀI VIẾT NỔI BẬT
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white transition group-hover:text-fuchsia-300 md:text-3xl">
                  {baiNoiBat.tieu_de}
                </h2>
                <p className="mt-3 line-clamp-2 leading-7 text-slate-300">
                  {baiNoiBat.tom_tat || "Khám phá nội dung mới nhất trên website."}
                </p>
              </div>
            </LinkBaiViet>
          ) : (
            <div className="min-h-96 rounded-[30px] border border-purple-400/20 bg-gradient-to-br from-fuchsia-950/50 to-indigo-950/60" />
          )}
        </div>
      </section>

      <section id="bai-viet" className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-7">
          <p className="font-bold text-fuchsia-400">BLOG & TÀI NGUYÊN</p>
          <h2 className="mt-1 text-3xl font-black text-white">Bài viết mới nhất</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {baiConLai.slice(0, 9).map((baiViet) => (
            <LinkBaiViet
              key={baiViet.id}
              baiViet={baiViet}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-[#12101d] transition hover:-translate-y-1 hover:border-fuchsia-400/50"
            >
              <AnhBaiViet
                baiViet={baiViet}
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <h3 className="text-xl font-black text-white group-hover:text-fuchsia-400">
                  {baiViet.tieu_de}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                  {baiViet.tom_tat || "Bài viết mới"}
                </p>
              </div>
            </LinkBaiViet>
          ))}
        </div>
      </section>
    </main>
  );
}
