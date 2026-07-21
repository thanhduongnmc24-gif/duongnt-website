import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!clientId || !clientSecret || !refreshToken || !folderId) {
  console.error("Thiếu cấu hình Google Drive trong .env.local.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret
);

oauth2Client.setCredentials({
  refresh_token: refreshToken,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

try {
  const { data } = await drive.files.get({
    fileId: folderId,
    fields: "id,name,mimeType,capabilities(canAddChildren)",
  });

  if (data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID không phải là thư mục.");
  }

  if (!data.capabilities?.canAddChildren) {
    throw new Error("Tài khoản OAuth không có quyền ghi vào thư mục.");
  }

  console.log("Kết nối Google Drive thành công.");
  console.log(`Tên thư mục: ${data.name}`);
  console.log(`Folder ID: ${data.id}`);
  console.log("Quyền tải tệp lên: Có");
} catch (loi) {
  console.error(
    "Kiểm tra Google Drive thất bại:",
    loi instanceof Error ? loi.message : loi
  );
  process.exitCode = 1;
}
