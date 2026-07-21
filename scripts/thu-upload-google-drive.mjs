import { google } from "googleapis";
import { Readable } from "node:stream";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!clientId || !clientSecret || !refreshToken || !folderId) {
  console.error("Thiếu cấu hình Google Drive.");
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

const noiDung = `
 Kiểm tra upload Google Drive.
Thời gian: ${new Date().toISOString()}
`;

try {
  const { data } = await drive.files.create({
    requestBody: {
      name: `test-upload-${Date.now()}.txt`,
      parents: [folderId],
    },
    media: {
      mimeType: "text/plain",
      body: Readable.from(noiDung),
    },
    fields: "id,name,mimeType,webViewLink",
  });

  console.log("Taải tệt lên Google Drive thành công.");
  console.log(`TC�n tệp: ${data.name}`);
  console.log(`File ID: ${data.id}`);
  console.log(`Liên kết: ${data.webViewLink || "Không có"}`);
} catch (loi) {
  console.error(
    "Taải tệt lên thất bại:",
    loi instanceof Error ? loi.message : loi
  );
  process.exitCode = 1;
}
