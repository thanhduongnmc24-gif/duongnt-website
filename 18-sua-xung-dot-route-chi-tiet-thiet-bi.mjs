import fs from "node:fs";
import path from "node:path";

const obsoleteFiles = [
  "src/app/de-muc/[duong_dan]/catalog/[catalog]/page.tsx",
  "src/app/de-muc/[duong_dan]/[duong_dan_con]/catalog/[catalog]/page.tsx",
];

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
let removed = 0;

for (const file of obsoleteFiles) {
  if (!fs.existsSync(file)) {
    console.log(`Bo qua, khong ton tai: ${file}`);
    continue;
  }

  const backup = `${file}.bak-${stamp}`;
  fs.copyFileSync(file, backup);
  fs.rmSync(file);
  removed += 1;
  console.log(`Da xoa route cu: ${file}`);
  console.log(`Ban sao luu: ${backup}`);
}

const requiredFiles = [
  "src/app/de-muc/[duong_dan]/[duong_dan_con]/page.tsx",
  "src/app/de-muc/[duong_dan]/[duong_dan_con]/[thiet_bi]/page.tsx",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Thieu route bat buoc: ${file}`);
    process.exit(1);
  }
}

function removeEmptyParents(file) {
  let directory = path.dirname(file);
  const root = path.resolve("src/app/de-muc");

  while (path.resolve(directory).startsWith(root) && path.resolve(directory) !== root) {
    if (!fs.existsSync(directory)) break;
    if (fs.readdirSync(directory).length > 0) break;
    fs.rmdirSync(directory);
    console.log(`Da xoa thu muc rong: ${directory}`);
    directory = path.dirname(directory);
  }
}

for (const file of obsoleteFiles) {
  removeEmptyParents(file);
}

console.log("");
console.log(`Da xoa ${removed} route Catalog cu gay xung dot.`);
console.log("Route danh sach moi:");
console.log("/de-muc/[duong_dan]/[duong_dan_con]");
console.log("Route chi tiet thiet bi moi:");
console.log("/de-muc/[duong_dan]/[duong_dan_con]/[thiet_bi]");
console.log("Hay xoa .next va build lai de Next.js cap nhat route manifest.");
