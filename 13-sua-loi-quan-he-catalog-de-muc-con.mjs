import fs from "node:fs";

const file = "src/app/api/quan-tri/catalog/route.ts";

if (!fs.existsSync(file)) {
  console.error(`Khong tim thay: ${file}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = `${file}.bak-${stamp}`;
let source = fs.readFileSync(file, "utf8");

fs.copyFileSync(file, backup);

const oldSelect = 'select("id,tieu_de,duong_dan,trang_thai,ngay_cap_nhat,nguoi_tao_id,de_muc(ten_de_muc),de_muc_con(ten_de_muc_con)")';
const newSelect = 'select("id,tieu_de,duong_dan,trang_thai,ngay_cap_nhat,nguoi_tao_id,de_muc_id,de_muc_con_id")';

let replacements = 0;

if (source.includes(oldSelect)) {
  source = source.replaceAll(oldSelect, newSelect);
  replacements += 1;
}

source = source.replace(
  /\.select\(\s*["'`]id,tieu_de,duong_dan,trang_thai,ngay_cap_nhat,nguoi_tao_id,de_muc\(ten_de_muc\),de_muc_con\(ten_de_muc_con\)["'`]\s*\)/g,
  () => {
    replacements += 1;
    return '.select("id,tieu_de,duong_dan,trang_thai,ngay_cap_nhat,nguoi_tao_id,de_muc_id,de_muc_con_id")';
  }
);

if (replacements === 0) {
  console.error("Khong tim thay truy van embed de_muc_con gay loi.");
  console.error("File goc chua bi thay doi.");
  console.error(`Ban sao luu: ${backup}`);
  process.exit(1);
}

if (/de_muc_con\s*\(\s*ten_de_muc_con\s*\)/.test(source)) {
  console.error("Van con embed de_muc_con mo ho. Da khoi phuc file goc.");
  fs.copyFileSync(backup, file);
  process.exit(1);
}

fs.writeFileSync(file, source, "utf8");

console.log("Da sua loi quan he mo ho giua catalog va de_muc_con.");
console.log("API danh sach Catalog khong con embed quan he de_muc_con.");
console.log(`Ban sao luu: ${backup}`);
