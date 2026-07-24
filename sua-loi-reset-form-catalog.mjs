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

let soLanSua = 0;

source = source.replace(
  /async function themCot\(e:React\.FormEvent<HTMLFormElement>\)\{e\.preventDefault\(\);const f=new FormData\(e\.currentTarget\);/,
  () => {
    soLanSua += 1;
    return "async function themCot(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const formElement=e.currentTarget;const f=new FormData(formElement);";
  }
);

source = source.replace(
  /if\(k\.thanh_cong\)\{e\.currentTarget\.reset\(\);tai\(\)\}else alert\(k\.loi\)\}async function themTB/,
  () => {
    soLanSua += 1;
    return "if(k.thanh_cong){formElement.reset();await tai()}else alert(k.loi)}async function themTB";
  }
);

source = source.replace(
  /async function themTB\(e:React\.FormEvent<HTMLFormElement>\)\{e\.preventDefault\(\);const form=new FormData\(e\.currentTarget\);/,
  () => {
    soLanSua += 1;
    return "async function themTB(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const formElement=e.currentTarget;const form=new FormData(formElement);";
  }
);

source = source.replace(
  /if\(k\.thanh_cong\)\{setTb\("Đã thêm thiết bị"\);e\.currentTarget\.reset\(\);tai\(\)\}else alert\(k\.loi\)\}/,
  () => {
    soLanSua += 1;
    return 'if(k.thanh_cong){setTb("Đã thêm thiết bị");formElement.reset();await tai()}else alert(k.loi)}';
  }
);

if (soLanSua !== 4) {
  fs.copyFileSync(backup, file);
  console.error(`Chi tim thay ${soLanSua}/4 vi tri can sua.`);
  console.error("Da khoi phuc file goc de tranh sua do dang.");
  console.error(`Ban sao luu: ${backup}`);
  process.exit(1);
}

if (source.includes("e.currentTarget.reset()")) {
  fs.copyFileSync(backup, file);
  console.error("Van con e.currentTarget.reset(). Da khoi phuc file goc.");
  process.exit(1);
}

fs.writeFileSync(file, source, "utf8");

console.log("Da sua loi reset form Catalog.");
console.log("Form element duoc luu truoc khi await fetch.");
console.log("Da sua ca form them cot va form them thiet bi.");
console.log(`Ban sao luu: ${backup}`);
