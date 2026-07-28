import fs from "node:fs";

const file = "src/app/quan-tri/catalog/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`Khong tim thay: ${file}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, `${file}.bak-${stamp}`);

const content = `"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Catalog = {
  id: string;
  tieu_de: string;
  trang_thai: string;
  ngay_cap_nhat: string;
};

export default function TrangQuanTriCatalog() {
  const router = useRouter();
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [khongCoCatalog, setKhongCoCatalog] = useState(false);

  useEffect(() => {
    let daHuy = false;

    async function moCatalogGanNhat() {
      try {
        const response = await fetch("/api/quan-tri/catalog", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.thanh_cong) {
          throw new Error(result.loi || "Không thể tải Catalog.");
        }

        const danhSach = (result.du_lieu || []) as Catalog[];

        if (!danhSach.length) {
          if (!daHuy) {
            setKhongCoCatalog(true);
            setDangTai(false);
          }
          return;
        }

        const catalogGanNhat = [...danhSach].sort(
          (a, b) =>
            new Date(b.ngay_cap_nhat).getTime() -
            new Date(a.ngay_cap_nhat).getTime()
        )[0];

        router.replace(\`/quan-tri/catalog/\${catalogGanNhat.id}\`);
      } catch (error) {
        if (!daHuy) {
          setLoi(
            error instanceof Error
              ? error.message
              : "Không thể mở Catalog."
          );
          setDangTai(false);
        }
      }
    }

    moCatalogGanNhat();

    return () => {
      daHuy = true;
    };
  }, [router]);

  if (dangTai) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="font-semibold text-slate-600">
            Đang mở bảng Catalog thiết bị...
          </p>
        </div>
      </main>
    );
  }

  if (loi) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            Không thể mở Catalog
          </h1>
          <p className="mt-3 rounded-xl bg-red-50 p-4 text-red-700">
            {loi}
          </p>
        </div>
      </main>
    );
  }

  if (khongCoCatalog) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-blue-600">QUẢN TRỊ</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Catalog thiết bị
          </h1>
          <p className="mt-3 text-slate-600">
            Chưa có Catalog nào. Hãy tạo Catalog đầu tiên để bắt đầu nhập thiết bị.
          </p>
          <Link
            href="/quan-tri/catalog/tao-moi"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold text-white"
          >
            Tạo Catalog đầu tiên
          </Link>
        </div>
      </main>
    );
  }

  return null;
}
`;

fs.writeFileSync(file, content, "utf8");

console.log("Da bo man hinh danh sach Catalog dang the.");
console.log("/quan-tri/catalog se mo thang bang cua Catalog cap nhat gan nhat.");
console.log("Neu chua co Catalog, he thong moi hien nut tao Catalog dau tien.");
