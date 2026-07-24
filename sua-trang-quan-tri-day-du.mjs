import fs from "node:fs";
import path from "node:path";

const file = "src/app/quan-tri/page.tsx";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const content = `import Link from "next/link";
import { redirect } from "next/navigation";
import { taoSupabaseMayChu } from "@/lib/supabase/may-chu";

export const dynamic = "force-dynamic";

const danhSachChucNang = [
  {
    href: "/quan-tri/noi-dung",
    tieuDe: "Tổng quan nội dung",
    moTa: "Thống kê bài đã đăng, bản nháp, bài ẩn và thùng rác.",
    mau: "bg-blue-600",
  },
  {
    href: "/quan-tri/bai-viet",
    tieuDe: "Quản lý bài viết",
    moTa: "Sửa, ẩn, đăng lại và xóa bài viết.",
    mau: "bg-indigo-600",
  },
  {
    href: "/quan-tri/de-muc",
    tieuDe: "Quản lý đề mục",
    moTa: "Quản lý menu cấp 1 và menu cấp 2.",
    mau: "bg-cyan-600",
  },
  {
    href: "/quan-tri/tai-khoan",
    tieuDe: "Quản lý tài khoản",
    moTa: "Tạo, khóa và phân quyền người dùng.",
    mau: "bg-violet-600",
  },
  {
    href: "/quan-tri/giao-dien",
    tieuDe: "Quản lý giao diện",
    moTa: "Chọn theme và màu sắc của website.",
    mau: "bg-emerald-600",
  },
  {
    href: "/quan-tri/cau-hinh",
    tieuDe: "Cấu hình website",
    moTa: "Đổi tên, mô tả và số bài trên trang chủ.",
    mau: "bg-amber-600",
  },
  {
    href: "/quan-tri/thung-rac",
    tieuDe: "Thùng rác bài viết",
    moTa: "Khôi phục hoặc xóa vĩnh viễn bài viết.",
    mau: "bg-rose-600",
  },
  {
    href: "/dang-bai",
    tieuDe: "Đăng bài mới",
    moTa: "Tạo bài viết mới và tải ảnh lên Google Drive.",
    mau: "bg-slate-800",
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
    <main className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 py-8">
      <section className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-sm md:p-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-blue-600">Trang quản trị</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Xin chào, {nguoiDung.ten_hien_thi}
            </h1>
            <p className="mt-2 text-slate-600">
              Tài khoản: {nguoiDung.ten_dang_nhap}
            </p>
          </div>

          <form action="/api/dang-xuat" method="post">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-700"
            >
              Đăng xuất
            </button>
          </form>
        </header>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {danhSachChucNang.map((chucNang) => (
            <Link
              key={chucNang.href}
              href={chucNang.href}
              className="group flex min-h-44 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              <div className={\`h-2 w-full \${chucNang.mau}\`} />

              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-xl font-black text-slate-900 transition group-hover:text-blue-600">
                  {chucNang.tieuDe}
                </h2>

                <p className="mt-3 flex-1 leading-7 text-slate-600">
                  {chucNang.moTa}
                </p>

                <span className="mt-4 font-bold text-blue-600">
                  Mở chức năng →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
`;

fs.mkdirSync(path.dirname(file), { recursive: true });

if (fs.existsSync(file)) {
  fs.copyFileSync(file, `${file}.bak-${stamp}`);
}

fs.writeFileSync(file, content, "utf8");
console.log(`Da cap nhat: ${file}`);
console.log("Da them day du cac nut dieu huong quan tri.");
