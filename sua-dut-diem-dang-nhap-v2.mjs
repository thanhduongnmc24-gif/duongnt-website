import fs from "node:fs";

const file = "src/app/api/dang-nhap/route.ts";

if (!fs.existsSync(file)) {
  console.error(`Khong tim thay: ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = `${file}.bak-${stamp}`;

fs.copyFileSync(file, backup);

const pattern = /new\s+URL\s*\(\s*duongDanSauDangNhap\s*,\s*yeuCau\.url\s*\)/g;
const soLanKhop = source.match(pattern)?.length ?? 0;

if (soLanKhop === 0) {
  console.error("Khong tim thay new URL(duongDanSauDangNhap, yeuCau.url).");
  console.error("Kiem tra hien tai:");

  const dongLienQuan = source
    .split("\n")
    .map((dong, index) => ({ dong, soDong: index + 1 }))
    .filter(({ dong }) =>
      dong.includes("duongDanSauDangNhap") ||
      dong.includes("yeuCau.url") ||
      dong.includes("NextResponse.redirect")
    );

  for (const { dong, soDong } of dongLienQuan) {
    console.error(`${soDong}: ${dong}`);
  }

  console.error(`Ban sao luu: ${backup}`);
  process.exit(1);
}

const daSua = source.replace(
  pattern,
  "taoUrlWebsite(duongDanSauDangNhap, yeuCau)"
);

fs.writeFileSync(file, daSua, "utf8");

const kiemTra = fs.readFileSync(file, "utf8");

if (kiemTra.includes("new URL(duongDanSauDangNhap, yeuCau.url)")) {
  console.error("Van con chuyen huong cu. Da khoi phuc file sao luu.");
  fs.copyFileSync(backup, file);
  process.exit(1);
}

if (!kiemTra.includes("taoUrlWebsite(duongDanSauDangNhap, yeuCau)")) {
  console.error("Khong tim thay chuyen huong moi. Da khoi phuc file sao luu.");
  fs.copyFileSync(backup, file);
  process.exit(1);
}

console.log(`Da thay ${soLanKhop} vi tri chuyen huong.`);
console.log("Da sua thanh:");
console.log("taoUrlWebsite(duongDanSauDangNhap, yeuCau)");
console.log(`Ban sao luu: ${backup}`);
