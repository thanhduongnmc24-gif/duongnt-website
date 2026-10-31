import "server-only";
import { auth, drive } from "googleapis/build/src/apis/drive";

export function taoGoogleDrive() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Thiếu cấu hình OAuth Google Drive.");
  }

  const oauth2Client = new auth.OAuth2(
    clientId,
    clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return drive({
    version: "v3",
    auth: oauth2Client,
  });
}

export function layGoogleDriveFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("Thiếu GOOGLE_DRIVE_FOLDER_ID.");
  }

  return folderId;
}
