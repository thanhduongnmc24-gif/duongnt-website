import "server-only";
import { layGoogleDriveFolderId, taoGoogleDrive } from "@/lib/google-drive/ket-noi";

function thoatQuery(value: string) { return value.replaceAll("'", "\\'"); }

async function timHoacTaoThuMuc(ten: string, parent: string) {
  const drive = taoGoogleDrive();
  const q = `'${parent}' in parents and name='${thoatQuery(ten)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const found = await drive.files.list({ q, fields: "files(id)", pageSize: 1 });
  if (found.data.files?.[0]?.id) return found.data.files[0].id;
  const created = await drive.files.create({ requestBody: { name: ten, mimeType: "application/vnd.google-apps.folder", parents: [parent] }, fields: "id" });
  if (!created.data.id) throw new Error("Không thể tạo thư mục ảnh Thông số cán.");
  return created.data.id;
}

export async function timHoacTaoThuMucThongSo(nguoiDungId: string) {
  const root = await timHoacTaoThuMuc("Thong-so-can", layGoogleDriveFolderId());
  return timHoacTaoThuMuc(nguoiDungId, root);
}
