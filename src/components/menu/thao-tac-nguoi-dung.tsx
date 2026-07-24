"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ThuocTinh = {
  tenHienThi: string;
  vaiTro: "quan_tri" | "nguoi_dung";
};

export function ThaoTacNguoiDung({ tenHienThi, vaiTro }: ThuocTinh) {
  const duongDan = usePathname();
  const dangTrongQuanTri = duongDan.startsWith("/quan-tri");
  const dangTrongDangBai = duongDan === "/dang-bai";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden max-w-40 truncate text-sm text-slate-600 xl:block">
        {tenHienThi}
      </span>

      {!dangTrongQuanTri && !dangTrongDangBai ? (
        <Link
          href="/dang-bai"
          className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
        >
          Đăng bài
        </Link>
      ) : null}

      {vaiTro === "quan_tri" && !dangTrongQuanTri ? (
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
    </div>
  );
}
