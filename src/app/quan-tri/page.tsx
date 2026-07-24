import Link from "next/link";
import { redirect } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";

export const dynamic = "force-dynamic";

const nhomChucNang = [
  {
    ten: "Nội dung",
    moTa: "Quản lý toàn bộ nội dung hiển thị trên website.",
    chucNang: [
      { href: "/quan-tri/catalog", tieuDe: "Catalog thiết bị", moTa: "Quản lý danh mục thiết bị trong xưởng.", kyHieu: "CT", mau: "bg-teal-600" },
      {
        href: "/quan-tri/noi-dung",
        tieuDe: "Tổng quan nội dung",
        moTa: "Thống kê bài đăng, bản nháp, bài ẩn và thùng rác.",
        kyHieu: "TK",
        mau: "bg-blue-600",
      },
      {
        href: "/quan-tri/bai-viet",
        tieuDe: "Quản lý bài viết",
        moTa: "Sửa, ẩn, đăng lại và xóa bài viết.",
        kyHieu: "BV",
        mau: "bg-indigo-600",
      },
      {
        href: "/quan-tri/de-muc",
        tieuDe: "Quản lý đề mục",
        moTa: "Sắp xếp menu cấp 1 và menu cấp 2.",
        kyHieu: "DM",
        mau: "bg-cyan-600",
      },
      {
        href: "/quan-tri/thung-rac",
        tieuDe: "Thùng rác",
        moTa: "Khôi phục hoặc xóa vĩnh viễn bài viết.",
        kyHieu: "TR",
        mau: "bg-rose-600",
      },
    ],
  },
  {
    ten: "Hệ thống",
    moTa: "Quản lý tài khoản, giao diện và cấu hình website.",
    chucNang: [
      {
        href: "/quan-tri/tai-khoan",
        tieuDe: "Tài khoản",
        moTa: "Tạo, khóa và phân quyền người dùng.",
        kyHieu: "TK",
        mau: "bg-violet-600",
      },
      {
        href: "/quan-tri/giao-dien",
        tieuDe: "Giao diện",
        moTa: "Chọn theme và màu sắc của website.",
        kyHieu: "GD",
        mau: "bg-emerald-600",
      },
      {
        href: "/quan-tri/cau-hinh",
        tieuDe: "Cấu hình website",
        moTa: "Đổi tên, mô tả và số bài trên trang chủ.",
        kyHieu: "CH",
        mau: "bg-amber-600",
      },
    ],
  },
];

export default async function TrangQuanTri() {
  const supabase = await taoSupabaseMayChu();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dang-nhap");
  }

  const { data: nguoiDung } = await supabase
    .from("nguoi_dung")
    .select("ten_dang_nhap, ten_hien_thi, vai_tro, dang_hoat_dong")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !nguoiDung ||
    !nguoiDung.dang_hoat_dong ||
    nguoiDung.vai_tro !== "quan_tri"
  ) {
    redirect("/");
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 py-7 md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-blue-300">Bảng điều khiển</p>
              <h1 className="mt-1 text-3xl font-black md:text-4xl">
                Xin chào, {nguoiDung.ten_hien_thi}
              </h1>
              <p className="mt-2 text-slate-300">
                Quản lý nội dung và hệ thống tại một nơi.
              </p>
            </div>

            <Link
              href="/dang-bai"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-bold text-white transition hover:bg-blue-500"
            >
              Tạo bài viết mới
            </Link>
          </div>
        </header>

        <div className="mt-6 space-y-7">
          {nhomChucNang.map((nhom) => (
            <section key={nhom.ten}>
              <div className="mb-3">
                <h2 className="text-xl font-black text-slate-900">
                  {nhom.ten}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {nhom.moTa}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {nhom.chucNang.map((chucNang) => (
                  <Link
                    key={chucNang.href}
                    href={chucNang.href}
                    className="group flex min-h-32 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >
                    <span
                      className={`${chucNang.mau} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white`}
                    >
                      {chucNang.kyHieu}
                    </span>

                    <span className="min-w-0">
                      <span className="block font-black text-slate-900 transition group-hover:text-blue-600">
                        {chucNang.tieuDe}
                      </span>
                      <span className="mt-1.5 block text-sm leading-6 text-slate-500">
                        {chucNang.moTa}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
