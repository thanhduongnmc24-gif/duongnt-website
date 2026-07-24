import "server-only";
import { taoGoogleDrive, layGoogleDriveFolderId } from "@/lib/google-drive/ket-noi";

function thoatQuery(value: string) {
  return value.replaceAll("'", "\\'");
}

export async function timHoacTaoThuMucCatalog() {
  const drive = taoGoogleDrive();
  const root = layGoogleDriveFolderId();
  const q = `'${root}' in parents and name='Catalog' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const found = await drive.files.list({ q, fields: "files(id,name)", pageSize: 1 });
  if (found.data.files?.[0]?.id) return found.data.files[0].id;
  const created = await drive.files.create({ requestBody: { name: "Catalog", mimeType: "application/vnd.google-apps.folder", parents: [root] }, fields: "id" });
  if (!created.data.id) throw new Error("Không thể tạo thư mục Catalog trên Google Drive.");
  return created.data.id;
}

export async function timHoacTaoThuMucConCatalog(ten: string) {
  const drive = taoGoogleDrive();
  const parent = await timHoacTaoThuMucCatalog();
  const safe = thoatQuery(ten);
  const q = `'${parent}' in parents and name='${safe}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const found = await drive.files.list({ q, fields: "files(id,name)", pageSize: 1 });
  if (found.data.files?.[0]?.id) return found.data.files[0].id;
  const created = await drive.files.create({ requestBody: { name: ten, mimeType: "application/vnd.google-apps.folder", parents: [parent] }, fields: "id" });
  if (!created.data.id) throw new Error("Không thể tạo thư mục con Catalog.");
  return created.data.id;
}
