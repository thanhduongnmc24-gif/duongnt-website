import fs from "node:fs";

const file = "src/app/quan-tri/catalog/[id]/page.tsx";

if (!fs.existsSync(file)) {
  console.error(`Khong tim thay: ${file}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = `${file}.bak-${stamp}`;
let source = fs.readFileSync(file, "utf8");

fs.copyFileSync(file, backup);

const replacements = [
  ["awaittai()", "await tai()"],
  ["mx-automax-w-7xl", "mx-auto max-w-7xl"],
  ["py-3font-bold", "py-3 font-bold"],
];

let count = 0;
for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.split(from).join(to);
    count += 1;
    console.log(`Da sua: ${from} -> ${to}`);
  }
}

if (source.includes("awaittai()")) {
  console.error("Van con awaittai(). Da khoi phuc file goc.");
  fs.copyFileSync(backup, file);
  process.exit(1);
}

if (!source.includes("formElement.reset();await tai()")) {
  console.error("Khong tim thay doan reset form hop le. Da khoi phuc file goc.");
  fs.copyFileSync(backup, file);
  process.exit(1);
}

fs.writeFileSync(file, source, "utf8");

console.log(`Da sua ${count} nhom loi trong Catalog.`);
console.log(`Ban sao luu: ${backup}`);
