import fs from "node:fs";
import path from "node:path";

const files = {
  "src/app/api/bai-viet/[id]/luot-xem/route.ts": "aW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSAibmV4dC9zZXJ2ZXIiOwppbXBvcnQgeyB0YW9TdXBhYmFzZVF1YW5UcmkgfSBmcm9tICJAL2xpYi9zdXBhYmFzZS9xdWFuLXRyaSI7CgpleHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVCgKICBfeWV1Q2F1OiBSZXF1ZXN0LAogIHsgcGFyYW1zIH06IHsgcGFyYW1zOiBQcm9taXNlPHsgaWQ6IHN0cmluZyB9PiB9CikgewogIHRyeSB7CiAgICBjb25zdCB7IGlkIH0gPSBhd2FpdCBwYXJhbXM7CiAgICBjb25zdCBzdXBhYmFzZVF1YW5UcmkgPSB0YW9TdXBhYmFzZVF1YW5UcmkoKTsKCiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVF1YW5UcmkucnBjKAogICAgICAidGFuZ19sdW90X3hlbV9iYWlfdmlldCIsCiAgICAgIHsgYmFpX3ZpZXRfaWQ6IGlkIH0KICAgICk7CgogICAgaWYgKGVycm9yKSB7CiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbigKICAgICAgICB7IHRoYW5oX2Nvbmc6IGZhbHNlLCBsb2k6IGVycm9yLm1lc3NhZ2UgfSwKICAgICAgICB7IHN0YXR1czogNDAwIH0KICAgICAgKTsKICAgIH0KCiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oewogICAgICB0aGFuaF9jb25nOiB0cnVlLAogICAgICBsdW90X3hlbTogZGF0YSwKICAgIH0pOwogIH0gY2F0Y2ggewogICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKAogICAgICB7IHRoYW5oX2Nvbmc6IGZhbHNlLCBsb2k6ICJLaMO0bmcgdGjhu4MgY+G6rXAgbmjhuq10IGzGsOG7o3QgeGVtLiIgfSwKICAgICAgeyBzdGF0dXM6IDUwMCB9CiAgICApOwogIH0KfQo=",
  "src/components/bai-viet/bo-dem-luot-xem.tsx": "InVzZSBjbGllbnQiOwoKaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gInJlYWN0IjsKCnR5cGUgVGh1b2NUaW5oID0gewogIGJhaVZpZXRJZDogc3RyaW5nOwogIGx1b3RYZW1CYW5EYXU6IG51bWJlcjsKfTsKCmV4cG9ydCBmdW5jdGlvbiBCb0RlbUx1b3RYZW0oewogIGJhaVZpZXRJZCwKICBsdW90WGVtQmFuRGF1LAp9OiBUaHVvY1RpbmgpIHsKICBjb25zdCBbbHVvdFhlbSwgc2V0THVvdFhlbV0gPSB1c2VTdGF0ZShsdW90WGVtQmFuRGF1KTsKCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGNvbnN0IGtob2EgPSBgZGEteGVtLWJhaS12aWV0LSR7YmFpVmlldElkfWA7CgogICAgaWYgKHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5nZXRJdGVtKGtob2EpKSB7CiAgICAgIHJldHVybjsKICAgIH0KCiAgICB3aW5kb3cuc2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbShraG9hLCAiMSIpOwoKICAgIGZldGNoKGAvYXBpL2JhaS12aWV0LyR7YmFpVmlldElkfS9sdW90LXhlbWAsIHsKICAgICAgbWV0aG9kOiAiUE9TVCIsCiAgICB9KQogICAgICAudGhlbigocGhhbkhvaSkgPT4gcGhhbkhvaS5qc29uKCkpCiAgICAgIC50aGVuKChrZXRRdWEpID0+IHsKICAgICAgICBpZiAoa2V0UXVhLnRoYW5oX2NvbmcpIHsKICAgICAgICAgIHNldEx1b3RYZW0oTnVtYmVyKGtldFF1YS5sdW90X3hlbSkgfHwgbHVvdFhlbUJhbkRhdSk7CiAgICAgICAgfSBlbHNlIHsKICAgICAgICAgIHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGtob2EpOwogICAgICAgIH0KICAgICAgfSkKICAgICAgLmNhdGNoKCgpID0+IHsKICAgICAgICB3aW5kb3cuc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShraG9hKTsKICAgICAgfSk7CiAgfSwgW2JhaVZpZXRJZCwgbHVvdFhlbUJhbkRhdV0pOwoKICByZXR1cm4gPHNwYW4+e2x1b3RYZW19IGzGsOG7o3QgeGVtPC9zcGFuPjsKfQo="
};
const migrationBase64 = "Y3JlYXRlIG9yIHJlcGxhY2UgZnVuY3Rpb24gcHVibGljLnRhbmdfbHVvdF94ZW1fYmFpX3ZpZXQoCiAgYmFpX3ZpZXRfaWQgdXVpZAopCnJldHVybnMgYmlnaW50Cmxhbmd1YWdlIHBscGdzcWwKc2VjdXJpdHkgZGVmaW5lcgpzZXQgc2VhcmNoX3BhdGggPSBwdWJsaWMKYXMgJCQKZGVjbGFyZQogIGx1b3RfeGVtX21vaSBiaWdpbnQ7CmJlZ2luCiAgdXBkYXRlIHB1YmxpYy5iYWlfdmlldAogIHNldCBsdW90X3hlbSA9IGx1b3RfeGVtICsgMQogIHdoZXJlIGlkID0gYmFpX3ZpZXRfaWQKICAgIGFuZCB0cmFuZ190aGFpID0gJ2RhX2RhbmcnCiAgICBhbmQgbmdheV94b2EgaXMgbnVsbAogIHJldHVybmluZyBsdW90X3hlbSBpbnRvIGx1b3RfeGVtX21vaTsKCiAgaWYgbHVvdF94ZW1fbW9pIGlzIG51bGwgdGhlbgogICAgcmFpc2UgZXhjZXB0aW9uICdLaMO0bmcgdMOsbSB0aOG6pXkgYsOgaSB2aeG6v3QgxJFhbmcgxJHGsOG7o2MgxJHEg25nLic7CiAgZW5kIGlmOwoKICByZXR1cm4gbHVvdF94ZW1fbW9pOwplbmQ7CiQkOwoKcmV2b2tlIGFsbCBvbiBmdW5jdGlvbiBwdWJsaWMudGFuZ19sdW90X3hlbV9iYWlfdmlldCh1dWlkKSBmcm9tIHB1YmxpYzsKZ3JhbnQgZXhlY3V0ZSBvbiBmdW5jdGlvbiBwdWJsaWMudGFuZ19sdW90X3hlbV9iYWlfdmlldCh1dWlkKSB0byBhbm9uLCBhdXRoZW50aWNhdGVkLCBzZXJ2aWNlX3JvbGU7Cg==";

for (const [file, duLieu] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(duLieu, "base64"));
  console.log(`Đã tạo: ${file}`);
}

const thuMucMigration = "supabase/migrations";
fs.mkdirSync(thuMucMigration, { recursive: true });
const thoiGian = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);
const tepMigration = `${thuMucMigration}/${thoiGian}_tang_luot_xem_bai_viet.sql`;
fs.writeFileSync(tepMigration, Buffer.from(migrationBase64, "base64"));
console.log(`Đã tạo: ${tepMigration}`);

const tepChiTiet = "src/app/bai-viet/[duong_dan]/page.tsx";
let noiDung = fs.readFileSync(tepChiTiet, "utf8");

const dongImport = 'import { BoDemLuotXem } from "@/components/bai-viet/bo-dem-luot-xem";';
if (!noiDung.includes(dongImport)) {
  const viTriImport = noiDung.lastIndexOf("import ");
  const ketThucImport = noiDung.indexOf(";", viTriImport) + 1;
  noiDung = noiDung.slice(0, ketThucImport) + "\n" + dongImport + noiDung.slice(ketThucImport);
}

const mauCu = '<span>{baiViet.luot_xem || 0} lượt xem</span>';
const mauMoi = `<BoDemLuotXem
              baiVietId={baiViet.id}
              luotXemBanDau={baiViet.luot_xem || 0}
            />`;

if (noiDung.includes(mauCu)) {
  noiDung = noiDung.replace(mauCu, mauMoi);
} else if (!noiDung.includes("luotXemBanDau=")) {
  console.error("Không tìm thấy vị trí lượt xem trong trang chi tiết. File chưa bị thay đổi phần đó.");
  process.exitCode = 1;
}

fs.writeFileSync(tepChiTiet, noiDung, "utf8");
console.log(`Đã cập nhật: ${tepChiTiet}`);
console.log("Hoàn thành cài đặt đếm lượt xem.");
