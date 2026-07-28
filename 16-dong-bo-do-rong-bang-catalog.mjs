import fs from "node:fs";

const publicFile = "src/components/catalog/catalog-cong-khai.tsx";
const adminFile = "src/app/quan-tri/catalog/[id]/page.tsx";

for (const file of [publicFile, adminFile]) {
  if (!fs.existsSync(file)) {
    console.error(`Khong tim thay: ${file}`);
    process.exit(1);
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(publicFile, `${publicFile}.bak-${stamp}`);
fs.copyFileSync(adminFile, `${adminFile}.bak-${stamp}`);

let publicSource = fs.readFileSync(publicFile, "utf8");
let adminSource = fs.readFileSync(adminFile, "utf8");

let publicChanges = 0;
let adminChanges = 0;

publicSource = publicSource.replace(
  'className="min-w-full"',
  () => {
    publicChanges += 1;
    return 'className="min-w-full table-fixed border-collapse"';
  }
);

publicSource = publicSource.replace(
  '<th className="p-3 text-left">Hình ảnh</th><th className="p-3 text-left">Tên thiết bị</th>',
  () => {
    publicChanges += 1;
    return '<th style={{ width: 128 }} className="w-32 p-3 text-left">Hình ảnh</th><th style={{ width: 224 }} className="w-56 p-3 text-left">Tên thiết bị</th>';
  }
);

publicSource = publicSource.replace(
  /style=\{\{width:c\.do_rong\}\}/g,
  () => {
    publicChanges += 1;
    return 'style={{ width: Number(c.do_rong) || 180 }}';
  }
);

publicSource = publicSource.replace(
  'className="p-3 align-top">{v[c.id]}</td>',
  () => {
    publicChanges += 1;
    return 'className="whitespace-pre-wrap break-words p-3 align-top">{v[c.id]}</td>';
  }
);

adminSource = adminSource.replace(
  '<th className="w-32 p-3 text-left">Hình ảnh</th><th className="w-56 p-3 text-left">Tên thiết bị</th>',
  () => {
    adminChanges += 1;
    return '<th style={{ width: 128 }} className="w-32 p-3 text-left">Hình ảnh</th><th style={{ width: 224 }} className="w-56 p-3 text-left">Tên thiết bị</th>';
  }
);

adminSource = adminSource.replace(
  /style=\{\{width:c\.do_rong\}\}/g,
  () => {
    adminChanges += 1;
    return 'style={{ width: Number(c.do_rong) || 180 }}';
  }
);

if (publicChanges < 4 || adminChanges < 2) {
  fs.copyFileSync(`${publicFile}.bak-${stamp}`, publicFile);
  fs.copyFileSync(`${adminFile}.bak-${stamp}`, adminFile);
  console.error(`Khong du vi tri can sua. Public: ${publicChanges}, Admin: ${adminChanges}`);
  console.error("Da khoi phuc file goc de tranh sua do dang.");
  process.exit(1);
}

fs.writeFileSync(publicFile, publicSource, "utf8");
fs.writeFileSync(adminFile, adminSource, "utf8");

console.log("Da dong bo do rong hai bang Catalog.");
console.log("Hinh anh: 128px; Ten thiet bi: 224px; cot dong doc cung do_rong trong database.");
console.log("Ca hai bang deu dung table-fixed va break-words.");
