import Link from "next/link";
import { layThemeWebsite } from "@/lib/theme/theme";

export async function ChanTrang() {
  const theme = await layThemeWebsite();
  const toi = theme.ma === "dark-tech";
  const tinTuc = theme.ma === "minimal-light";
  return <footer className={`mt-0 border-t px-4 py-10 ${toi ? "border-purple-400/20 bg-[#090812] text-slate-400" : tinTuc ? "border-slate-200 bg-slate-900 text-slate-300" : "border-green-100 bg-[#17351f] text-green-100"}`}><div className="mx-auto grid max-w-7xl gap-7 md:grid-cols-3"><div><p className="text-xl font-black text-white">duongnt.io.vn</p><p className="mt-2 text-sm leading-6">Website chia sẻ nội dung, kiến thức và kinh nghiệm.</p></div><div><p className="font-bold text-white">Điều hướng</p><div className="mt-3 flex flex-col gap-2 text-sm"><Link href="/">Trang chủ</Link><Link href="/dang-bai">Đăng bài</Link></div></div><div><p className="font-bold text-white">Hệ thống</p><p className="mt-3 text-sm">Dữ liệu được quản lý bằng Supabase và Google Drive.</p></div></div><p className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-center text-xs">© {new Date().getFullYear()} duongnt.io.vn</p></footer>;
}
