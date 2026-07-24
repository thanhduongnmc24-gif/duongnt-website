import fs from "node:fs";

const file = "src/app/api/dang-nhap/route.ts";

if (!fs.existsSync(file)) {
  console.error(`Khong tim thay: ${file}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(file, `${file}.bak-${stamp}`);

let source = fs.readFileSync(file, "utf8");

const oldCode = `return NextResponse.redirect(
      new URL(duongDanSauDangNhap, yeuCau.url),
      303
    );`;

const newCode = `return NextResponse.redirect(
      taoUrlWebsite(duongDanSauDangNhap, yeuCau),
      303
    );`;

if (!source.includes(oldCode)) {
  console.error("Khong tim thay doan chuyen huong cu trong API dang nhap.");
  console.error("File goc chua bi thay doi. Ban sao luu da duoc tao.");
  process.exit(1);
}

source = source.replace(oldCode, newCode);
fs.writeFileSync(file, source, "utf8");

console.log("Da sua dut diem chuyen huong sau dang nhap.");
console.log("Quan tri se chuyen den domain trong NEXT_PUBLIC_DIA_CHI_WEBSITE.");
