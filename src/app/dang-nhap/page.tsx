import { redirect } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";

type ThuocTinhTrang = {
  searchParams: Promise<{
    loi?: string;
  }>;
};

function layThongBaoLoi(maLoi?: string): string {
  switch (maLoi) {
    case "thieu_thong_tin":
      return "Vui lòng nhập tên đăng nhập và mật khẩu.";

    case "sai_thong_tin":
      return "Tên đăng nhập hoặc mật khẩu không đúng.";

    case "tai_khoan_bi_khoa":
      return "Tài khoản đang bị khóa.";

    case "he_thong":
      return "Hệ thống đang gặp lỗi. Vui lòng thử lại.";

    default:
      return "";
  }
}

export default async function TrangDangNhap({
  searchParams,
}: ThuocTinhTrang) {
  const supabase = await taoSupabaseMayChu();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const thamSo = await searchParams;
  const thongBaoLoi = layThongBaoLoi(thamSo.loi);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
          duongnt.io.vn
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Đăng nhập
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Nhập tên đăng nhập và mật khẩu.
        </p>

        {thongBaoLoi ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {thongBaoLoi}
          </div>
        ) : null}

        <form action="/api/dang-nhap" method="post" className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="ten_dang_nhap"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Tên đăng nhập
            </label>

            <input
              id="ten_dang_nhap"
              name="ten_dang_nhap"
              type="text"
              autoComplete="username"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="mat_khau"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Mật khẩu
            </label>

            <input
              id="mat_khau"
              name="mat_khau"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Đăng nhập
          </button>
        </form>
      </section>
    </main>
  );
}