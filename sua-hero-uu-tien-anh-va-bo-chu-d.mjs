import fs from "node:fs";

const fileDungChung = "src/themes/dung-chung.tsx";
const fileOrganic = "src/themes/organic-green/trang-chu.tsx";

for (const file of [fileDungChung, fileOrganic]) {
  if (!fs.existsSync(file)) {
    console.error(`Khong tim thay: ${file}`);
    process.exit(1);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(fileDungChung, `${fileDungChung}.bak-${stamp}`);
fs.copyFileSync(fileOrganic, `${fileOrganic}.bak-${stamp}`);

const dungChung = `import Link from "next/link";
import type { BaiVietTheme } from "@/themes/types";

export function AnhBaiViet({
  baiViet,
  className = "",
}: {
  baiViet: BaiVietTheme;
  className?: string;
}) {
  if (!baiViet.google_drive_anh_dai_dien_file_id) {
    return (
      <div
        aria-label="Bài viết chưa có ảnh đại diện"
        className={\`bg-gradient-to-br from-emerald-100 via-slate-100 to-sky-200 \${className}\`}
      />
    );
  }

  return (
    <img
      src={\`/api/google-drive/tep/\${baiViet.google_drive_anh_dai_dien_file_id}\`}
      alt={baiViet.tieu_de}
      className={className}
    />
  );
}

export function LinkBaiViet({
  baiViet,
  children,
  className = "",
}: {
  baiViet: BaiVietTheme;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={\`/bai-viet/\${baiViet.duong_dan}\`}
      className={className}
    >
      {children}
    </Link>
  );
}
`;

fs.writeFileSync(fileDungChung, dungChung, "utf8");

let organic = fs.readFileSync(fileOrganic, "utf8");

organic = organic.replace(
  "const noiBat=duLieu.danhSachBaiViet[0];",
  `const noiBat =
    duLieu.danhSachBaiViet.find(
      (baiViet) => baiViet.google_drive_anh_dai_dien_file_id
    ) ?? duLieu.danhSachBaiViet[0];`
);

organic = organic.replace(
  /\{noiBat\?<AnhBaiViet baiViet=\{noiBat\} className="absolute inset-0 h-full w-full object-cover opacity-55"\/>:null\}/,
  `{noiBat?.google_drive_anh_dai_dien_file_id ? (
          <AnhBaiViet
            baiViet={noiBat}
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#17492f] via-[#47765f] to-[#9bb6b6]" />
        )}`
);

if (!organic.includes("danhSachBaiViet.find")) {
  console.error("Khong tim thay vi tri chon bai noi bat trong Organic Green.");
  process.exit(1);
}

fs.writeFileSync(fileOrganic, organic, "utf8");

console.log("Da uu tien bai viet co anh lam hero.");
console.log("Da bo chu D khoi anh giu cho tren toan website.");
console.log("Neu khong co bai nao co anh, hero se dung nen gradient sach.");
