/**
 * Google Apps Script nhận ảnh từ ứng dụng DMX và ghi đè ảnh cùng tên trong thư mục.
 * Trước khi Deploy, đổi KHOA_BI_MAT thành chuỗi riêng của bạn.
 */
const KHOA_BI_MAT = "HAY_DOI_THANH_KHOA_DAI_KHO_DOAN";

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!body.key || body.key !== KHOA_BI_MAT) {
      return traVe({ ok: false, error: "Sai khóa bí mật." });
    }
    if (!body.folderId || !body.fileName || !body.base64) {
      return traVe({ ok: false, error: "Thiếu folderId, fileName hoặc dữ liệu ảnh." });
    }

    const folder = DriveApp.getFolderById(String(body.folderId));
    const tenTep = String(body.fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const tepCu = folder.getFilesByName(tenTep);
    while (tepCu.hasNext()) tepCu.next().setTrashed(true);

    const bytes = Utilities.base64Decode(String(body.base64));
    const blob = Utilities.newBlob(bytes, body.mimeType || "image/jpeg", tenTep);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return traVe({
      ok: true,
      fileId: file.getId(),
      url: "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(file.getId())
    });
  } catch (error) {
    return traVe({ ok: false, error: String(error && error.message || error) });
  }
}

function traVe(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
