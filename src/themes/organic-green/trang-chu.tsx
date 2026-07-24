import Link from "next/link";
import type { DuLieuTrangChuTheme } from "@/themes/types";
import { AnhBaiViet, LinkBaiViet } from "@/themes/dung-chung";

export function TrangChuOrganicGreen({ duLieu }: { duLieu: DuLieuTrangChuTheme }) {
  const baiNoiBat =
    duLieu.danhSachBaiViet.find(
      (baiViet) => baiViet.google_drive_anh_dai_dien_file_id
    ) ?? duLieu.danhSachBaiViet[0];

  const baiConLai = duLieu.danhSachBaiViet.filter(
    (baiViet) => baiViet.id !== baiNoiBat?.id
  );

  return (
    <main className="min-h-screen bg-[#fffdf6] text-[#17351f]">
      <section className="px-4 py-7 md:py-10">
        <div className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#17492f] via-[#47765f] to-[#9bb6b6] p-7 shadow-xl md:p-12 lg:grid-cols-[.92fr_1.08fr]">
          <div className="relative z-10 max-w-2xl text-white">
            <p className="font-bold text-yellow-300">
              NỘI DUNG BỀN VỮNG · GIÁ TRỊ THỰC
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.05] text-white md:text-7xl">
              {duLieu.tenWebsite}
            </h1>
            <p className="mt-5 text-lg leading-8 text-green-50">
              {duLieu.moTaWebsite}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#noi-dung"
                className="rounded-full bg-yellow-300 px-7 py-3 font-black text-green-950"
              >
                Xem nội dung
              </a>
              {baiNoiBat ? (
                <Link
                  href={`/bai-viet/${baiNoiBat.duong_dan}`}
                  className="rounded-full border border-white/60 px-7 py-3 font-black text-white"
                >
                  Xem bài đầu tiên
                </Link>
              ) : null}
            </div>
          </div>

          {baiNoiBat ? (
            <LinkBaiViet
              baiViet={baiNoiBat}
              className="group overflow-hidden rounded-[28px] bg-white p-4 shadow-2xl"
            >
              <AnhBaiViet
                baiViet={baiNoiBat}
                className="h-72 w-full rounded-2xl object-cover md:h-80"
              />
              <div className="px-2 pb-3 pt-5">
                <p className="text-sm font-bold text-green-700">BÀI VIẾT NỔI BẬT</p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-[#17351f] group-hover:text-green-700 md:text-3xl">
                  {baiNoiBat.tieu_de}
                </h2>
                <p className="mt-3 line-clamp-2 leading-7 text-green-900/70">
                  {baiNoiBat.tom_tat || "Khám phá nội dung mới nhất trên website."}
                </p>
              </div>
            </LinkBaiViet>
          ) : (
            <div className="min-h-96 rounded-[28px] bg-white/15" />
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {duLieu.danhSachDeMuc.slice(0, 4).map((deMuc, viTri) => (
          <Link
            key={deMuc.id}
            href={`/de-muc/${deMuc.duong_dan}`}
            className="rounded-2xl p-5 text-center transition hover:bg-white hover:shadow-lg"
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
              {["🌱", "🌾", "🍃", "🚜"][viTri] || "🌿"}
            </span>
            <h3 className="mt-4 font-black text-[#17351f]">{deMuc.ten_de_muc}</h3>
            <p className="mt-2 text-sm leading-6 text-green-900/70">
              Khám phá nội dung trong đề mục này.
            </p>
          </Link>
        ))}
      </section>

      <section id="noi-dung" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-7">
          <p className="font-bold text-green-700">NỘI DUNG MỚI</p>
          <h2 className="mt-1 text-4xl font-black text-[#17351f]">
            Chia sẻ kiến thức có giá trị và ứng dụng thực tế
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {baiConLai.slice(0, 9).map((baiViet) => (
            <LinkBaiViet
              key={baiViet.id}
              baiViet={baiViet}
              className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <AnhBaiViet baiViet={baiViet} className="h-48 w-full object-cover" />
              <div className="p-5">
                <h3 className="text-xl font-black text-[#17351f]">{baiViet.tieu_de}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-green-900/70">
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
