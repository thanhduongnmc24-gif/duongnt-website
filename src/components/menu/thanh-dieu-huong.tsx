import Link from "next/link";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";

type DeMucCon = {
  id: string;
  ten_de_muc_con: string;
  duong_dan: string;
  thu_tu: number;
  dang_hien_thi: boolean;
};

type DeMuc = {
  id: string;
  ten_de_muc: string;
  duong_dan: string;
  thu_tu: number;
  dang_hien_thi: boolean;
  de_muc_con: DeMucCon[];
};

export async function ThanhDieuHuong() {
  const supabase = await taoSupabaseMayChu();

  const [ketQuaNguoiDung, ketQuaDeMuc] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("de_muc")
      .select(`
        id,
        ten_de_muc,
        duong_dan,
        thu_tu,
        dang_hien_thi,
        de_muc_con (
          id,
          ten_de_muc_con,
          duong_dan,
          thu_tu,
          dang_hien_thi
        )
      `)
      .eq("dang_hien_thi", true)
      .order("thu_tu", { ascending: true }),
  ]);

  const user = ketQuaNguoiDung.data.user;
  let vaiTro: "quan_tri" | "nguoi_dung" | null = null;
  let tenHienThi = "";

  if (user) {
    const { data: nguoiDung } = await supabase
      .from("nguoi_dung")
      .select("ten_hien_thi, vai_tro, dang_hoat_dong")
      .eq("id", user.id)
      .maybeSingle();

    if (nguoiDung?.dang_hoat_dong) {
      vaiTro = nguoiDung.vai_tro;
      tenHienThi = nguoiDung.ten_hien_thi;
    }
  }

  const duLieuDeMuc = (ketQuaDeMuc.data ?? []) as DeMuc[];
  const danhSachDeMuc: DeMuc[] = duLieuDeMuc.map((deMuc) => ({
    ...deMuc,
    de_muc_con: [...(deMuc.de_muc_con ?? [])]
      .filter((deMucCon) => deMucCon.dang_hien_thi)
      .sort((a, b) => a.thu_tu - b.thu_tu),
  }));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <nav className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 font-bold text-blue-600 transition hover:bg-blue-50"
        >
          Trang chủ
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-visible">   
          {danhSachDeMuc.map((deMuc) => (
            <div
  key={deMuc.id}
  className="group relative shrink-0"
>
              <Link
                href={`/de-muc/${deMuc.duong_dan}`}
                className="block whitespace-nowrap rounded-lg px-3 py-5 font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-600"
              >
                {deMuc.ten_de_muc}
              </Link>

              {deMuc.de_muc_con.length > 0 ? (
                <div className="invisible absolute left-0 top-full z-[100] min-w-56 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:opacity-100">
                  {deMuc.de_muc_con.map((deMucCon) => (
                    <Link
                      key={deMucCon.id}
                      href={`/de-muc/${deMuc.duong_dan}/${deMucCon.duong_dan}`}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      {deMucCon.ten_de_muc_con}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user && vaiTro ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-slate-600 xl:block">
                {tenHienThi}
              </span>

              <Link
                href="/dang-bai"
                className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Đăng bài
              </Link>

              {vaiTro === "quan_tri" ? (
                <Link
                  href="/quan-tri"
                  className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-700"
                >
                  Quản trị
                </Link>
              ) : null}

              <form action="/api/dang-xuat" method="post">
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/dang-nhap"
              className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
