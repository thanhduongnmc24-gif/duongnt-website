import Link from "next/link";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";
import { layThemeWebsite } from "@/lib/theme/theme";
import { ThaoTacNguoiDung } from "@/components/menu/thao-tac-nguoi-dung";

type DeMucCon = { id: string; ten_de_muc_con: string; duong_dan: string; thu_tu: number; dang_hien_thi: boolean };
type DeMuc = { id: string; ten_de_muc: string; duong_dan: string; thu_tu: number; dang_hien_thi: boolean; de_muc_con: DeMucCon[] };

export async function ThanhDieuHuong() {
  const supabase = await taoSupabaseMayChu();
  const theme = await layThemeWebsite();
  const [ketQuaNguoiDung, ketQuaDeMuc] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("de_muc").select(`id,ten_de_muc,duong_dan,thu_tu,dang_hien_thi,de_muc_con(id,ten_de_muc_con,duong_dan,thu_tu,dang_hien_thi)`).eq("dang_hien_thi", true).order("thu_tu", { ascending: true }),
  ]);

  const user = ketQuaNguoiDung.data.user;
  let vaiTro: "quan_tri" | "nguoi_dung" | null = null;
  let tenHienThi = "";
  if (user) {
    const { data } = await supabase.from("nguoi_dung").select("ten_hien_thi,vai_tro,dang_hoat_dong").eq("id", user.id).maybeSingle();
    if (data?.dang_hoat_dong) { vaiTro = data.vai_tro; tenHienThi = data.ten_hien_thi; }
  }

  const danhSach = ((ketQuaDeMuc.data || []) as DeMuc[]).map((d) => ({
    ...d,
    de_muc_con: [...(d.de_muc_con || [])].filter((c) => c.dang_hien_thi).sort((a,b) => a.thu_tu - b.thu_tu),
  }));
  const toi = theme.ma === "dark-tech";
  const tinTuc = theme.ma === "minimal-light";
  const header = toi ? "border-purple-400/20 bg-[#0b0914]/95 text-white" : tinTuc ? "border-slate-200 bg-white text-slate-900" : "border-green-100 bg-[#fffdf6] text-[#17351f]";
  const active = toi ? "hover:bg-white/10 hover:text-fuchsia-400" : tinTuc ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-green-50 hover:text-green-700";

  return (
    <header className={`sticky top-0 z-50 border-b shadow-sm backdrop-blur ${header}`}>
      <nav className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className={`shrink-0 rounded-lg px-3 py-2 font-black ${toi ? "text-fuchsia-400" : tinTuc ? "text-red-600" : "text-green-700"}`}>Trang chủ</Link>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-visible">
          {danhSach.map((d) => (
            <div key={d.id} className="group relative shrink-0">
              <Link href={`/de-muc/${d.duong_dan}`} className={`block whitespace-nowrap rounded-lg px-3 py-5 font-semibold transition ${active}`}>{d.ten_de_muc}</Link>
              {d.de_muc_con.length ? <div className={`invisible absolute left-0 top-full z-[100] min-w-56 rounded-xl border p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 ${toi ? "border-purple-400/20 bg-[#12101d]" : "border-slate-200 bg-white"}`}>{d.de_muc_con.map((c) => <Link key={c.id} href={`/de-muc/${d.duong_dan}/${c.duong_dan}`} className={`block rounded-lg px-3 py-2 text-sm transition ${active}`}>{c.ten_de_muc_con}</Link>)}</div> : null}
            </div>
          ))}
        </div>
        {user && vaiTro ? <ThaoTacNguoiDung tenHienThi={tenHienThi} vaiTro={vaiTro} /> : <Link href="/dang-nhap" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Đăng nhập</Link>}
      </nav>
    </header>
  );
}
