import { google } from "googleapis";
import { createInterface } from "node:readline/promises";
import {
  stdin as dauVao,
  stdout as dauRa,
} from "node:process";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret =
  process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Thiếu GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET trong .env.local."
  );

  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  "http://localhost"
);

const duongDanXacThuc =
  oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
  "https://www.googleapis.com/auth/drive",
],
  });

console.log("");
console.log("Mở đường dẫn sau trong trình duyệt:");
console.log("");
console.log(duongDanXacThuc);
console.log("");

const docDuLieu = createInterface({
  input: dauVao,
  output: dauRa,
});

try {
  const maXacThuc = (
    await docDuLieu.question(
      "Dán mã xác thực hoặc đường dẫn chuyển hướng: "
    )
  ).trim();

  let code = maXacThuc;

  if (maXacThuc.startsWith("http")) {
    const diaChi = new URL(maXacThuc);
    code = diaChi.searchParams.get("code") || "";
  }

  if (!code) {
    throw new Error("Không tìm thấy mã xác thực.");
  }

  const { tokens } =
    await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "Google không trả về Refresh Token. Hãy thu hồi quyền ứng dụng rồi chạy lại."
    );
  }

  console.log("");
  console.log("Refresh Token đã được tạo.");
  console.log("");
  console.log(tokens.refresh_token);
  console.log("");
  console.log(
    "Hãy lưu giá trị trên vào GOOGLE_REFRESH_TOKEN trong .env.local."
  );
} catch (loi) {
  console.error(
    loi instanceof Error
      ? loi.message
      : "Không thể tạo Refresh Token."
  );

  process.exitCode = 1;
} finally {
  docDuLieu.close();
}