import fs from "node:fs";

const componentFile = "src/components/catalog/catalog-cong-khai.tsx";
const detailFile = "src/app/de-muc/[duong_dan]/[duong_dan_con]/[thiet_bi]/page.tsx";

for (const file of [componentFile, detailFile]) {
  if (!fs.existsSync(file)) {
    console.error(`Khong tim thay: ${file}`);
    process.exit(1);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(componentFile, `${componentFile}.bak-${stamp}`);
fs.copyFileSync(detailFile, `${detailFile}.bak-${stamp}`);

let component = fs.readFileSync(componentFile, "utf8");
let detail = fs.readFileSync(detailFile, "utf8");
let linkChanges = 0;

component = component.replace(
  /\$\{duongDanChiTiet\}\/\$\{t\.duong_dan\}/g,
  () => {
    linkChanges += 1;
    return "${duongDanChiTiet}/${t.id}";
  }
);

if (linkChanges < 2) {
  fs.copyFileSync(`${componentFile}.bak-${stamp}`, componentFile);
  fs.copyFileSync(`${detailFile}.bak-${stamp}`, detailFile);
  console.error(`Chi sua duoc ${linkChanges} lien ket. Can it nhat 2.`);
  console.error("Da khoi phuc file goc.");
  process.exit(1);
}

const oldQuery = `.eq("catalog_id", catalog.id)
      .eq("duong_dan", thiet_bi)
      .eq("dang_hien_thi", true)
      .is("ngay_xoa", null)
      .maybeSingle()`;

const newQuery = `.eq("catalog_id", catalog.id)
      .or(\`id.eq.\${thiet_bi},duong_dan.eq.\${thiet_bi}\`)
      .eq("dang_hien_thi", true)
      .is("ngay_xoa", null)
      .limit(1)
      .maybeSingle()`;

if (!detail.includes(oldQuery)) {
  fs.copyFileSync(`${componentFile}.bak-${stamp}`, componentFile);
  fs.copyFileSync(`${detailFile}.bak-${stamp}`, detailFile);
  console.error("Khong tim thay truy van chi tiet thiet bi cu.");
  console.error("Da khoi phuc file goc.");
  process.exit(1);
}

detail = detail.replace(oldQuery, newQuery);

fs.writeFileSync(componentFile, component, "utf8");
fs.writeFileSync(detailFile, detail, "utf8");

console.log(`Da doi ${linkChanges} lien ket sang UUID thiet bi.`);
console.log("Trang chi tiet chap nhan ca UUID moi va duong_dan cu.");
console.log("Khong thay doi ID trong Supabase hay Google Drive.");
console.log("Can xoa .next, build lai va Clear build cache tren Render.");
