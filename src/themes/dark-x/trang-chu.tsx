import Link from "next/link";
import type { DuLieuTrangChuTheme } from "@/themes/types";
import { AnhBaiViet, LinkBaiViet } from "@/themes/dung-chung";

export function TrangChuDarkX({ duLieu }: { duLieu: DuLieuTrangChuTheme }) {
  const [noiBat, ...conLai] = duLieu.danhSachBaiViet;
  return <main className="min-h-screen overflow-hidden bg-[#090812] text-white">
    <section className="relative border-b border-purple-500/20 px-4 py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,70,239,.28),transparent_28%),radial-gradient(circle_at_80%_65%,rgba(79,70,229,.28),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <div><span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-4 py-2 text-sm font-bold text-fuchsia-300">NEXT GENERATION CONTENT</span><h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">{duLieu.tenWebsite}</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{duLieu.moTaWebsite}</p><div className="mt-8 flex gap-3"><Link href="/dang-bai" className="rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 font-bold">Khám phá nội dung</Link><a href="#bai-viet" className="rounded-full border border-white/20 px-6 py-3 font-bold">Xem bài mới</a></div></div>
        <div className="relative min-h-96 rounded-[32px] border border-purple-400/20 bg-white/5 p-4 shadow-[0_0_80px_rgba(139,92,246,.25)] backdrop-blur-xl">{noiBat?<LinkBaiViet baiViet={noiBat} className="block h-full"><AnhBaiViet baiViet={noiBat} className="h-64 w-full rounded-2xl object-cover"/><h2 className="mt-5 text-2xl font-black">{noiBat.tieu_de}</h2><p className="mt-2 line-clamp-2 text-slate-400">{noiBat.tom_tat}</p></LinkBaiViet>:<div className="flex h-full items-center justify-center text-slate-500">Chưa có bài viết</div>}</div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-10"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["250M+","Lượt tiếp cận"],["300K+","Nội dung"],["10M+","Lượt xem"],["24/7","Cập nhật"]].map(([so,ten])=><div key={ten} className="rounded-2xl border border-white/10 bg-whiteopter-[.04] bg-white/5 p-5"><p className="text-3xl font-black text-fuchsia-400">{so}</p><p className="mt-1 text-slate-400">{ten}</p></div>)}</div></section>
    <section id="bai-viet" className="mx-auto max-w-7xl px-4 py-12"><div className="mb-7 flex items-end justify-between"><div><p className="font-bold text-fuchsia-400">BLOG & RESOURCES</p><h2 className="text-3xl font-black">Bài viết mới nhất</h2></div></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{conLai.slice(0,9).map(b=><LinkBaiViet key={b.id} baiViet={b} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#12101d] transition hover:-translate-y-1 hover:border-fuchsia-400/50"><AnhBaiViet baiViet={b} className="h-48 w-full object-cover"/><div className="p-5"><h3 className="text-xl font-black group-hover:text-fuchsia-400">{b.tieu_de}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{b.tom_tat||"Bài viết mới"}</p></div></LinkBaiViet>)}</div></section>
  </main>;
}
