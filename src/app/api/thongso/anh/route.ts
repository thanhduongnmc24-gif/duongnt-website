import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { taoGoogleDrive } from "@/lib/google-drive/ket-noi";
import { timHoacTaoThuMucThongSo } from "@/lib/google-drive/thong-so";
import { taoSupabaseTheoToken } from "@/lib/supabase/theo-token";
import { taoDuongDan } from "@/lib/tien-ich/tao-duong-dan";

async function layNguoiDung(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const db = taoSupabaseTheoToken(token);
  const { data, error } = await db.auth.getUser();
  return !error && data.user?.user_metadata?.ung_dung === "lich_lam_viec" ? { user: data.user, db } : null;
}

export async function POST(request: Request) {
  const session = await layNguoiDung(request);
  if (!session) return NextResponse.json({ loi: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  const { user, db } = session;
  try {
    const form = await request.formData();
    const bangId = String(form.get("bang_id") || "");
    const hangId = String(form.get("hang_id") || "").slice(0, 80);
    const cotId = String(form.get("cot_id") || "").slice(0, 80);
    const image = form.get("anh");
    if (!bangId || !hangId || !cotId || !(image instanceof File) || image.size < 1) throw new Error("Thiếu vị trí hoặc tệp ảnh.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 10 * 1024 * 1024) throw new Error("Ảnh phải là JPG, PNG hoặc WebP và không quá 10 MB.");
    const { data: bang } = await db.from("thong_so_bang").select("id").eq("id", bangId).eq("nguoi_dung_id", user.id).maybeSingle();
    if (!bang) return NextResponse.json({ loi: "Không tìm thấy bảng thông số." }, { status: 404 });
    const { data: old } = await db.from("thong_so_anh").select("id,google_drive_file_id").eq("bang_id", bangId).eq("hang_id", hangId).eq("cot_id", cotId).maybeSingle();
    const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    const tenTep = `${taoDuongDan(image.name.replace(/\.[^.]+$/, "")) || "anh-thong-so"}-${Date.now()}.${ext}`;
    const folderId = await timHoacTaoThuMucThongSo(user.id);
    const upload = await taoGoogleDrive().files.create({
      requestBody: { name: tenTep, parents: [folderId] },
      media: { mimeType: image.type, body: Readable.from(Buffer.from(await image.arrayBuffer())) },
      fields: "id",
    });
    const fileId = upload.data.id;
    if (!fileId) throw new Error("Không thể tải ảnh lên Google Drive.");
    const { data, error } = await db.from("thong_so_anh").upsert({
      nguoi_dung_id: user.id, bang_id: bangId, hang_id: hangId, cot_id: cotId,
      google_drive_file_id: fileId, ten_tep: tenTep, kieu_tep: image.type, kich_thuoc: image.size, ngay_cap_nhat: new Date().toISOString(),
    }, { onConflict: "bang_id,hang_id,cot_id" }).select("id,bang_id,hang_id,cot_id,ten_tep,kieu_tep,ngay_cap_nhat").single();
    if (error || !data) { await taoGoogleDrive().files.delete({ fileId }).catch(() => undefined); throw new Error("Không thể lưu vị trí ảnh."); }
    if (old?.google_drive_file_id) await taoGoogleDrive().files.delete({ fileId: old.google_drive_file_id }).catch(() => undefined);
    return NextResponse.json({ thanh_cong: true, anh: data });
  } catch (error) {
    return NextResponse.json({ loi: error instanceof Error ? error.message : "Không thể tải ảnh." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await layNguoiDung(request);
  if (!session) return NextResponse.json({ loi: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  const { user, db } = session;
  const id = new URL(request.url).searchParams.get("id") || "";
  const { data } = await db.from("thong_so_anh").select("id,google_drive_file_id").eq("id", id).eq("nguoi_dung_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ loi: "Không tìm thấy ảnh." }, { status: 404 });
  const { error } = await db.from("thong_so_anh").delete().eq("id", id).eq("nguoi_dung_id", user.id);
  if (error) return NextResponse.json({ loi: "Chưa xóa được ảnh." }, { status: 400 });
  await taoGoogleDrive().files.delete({ fileId: data.google_drive_file_id }).catch(() => undefined);
  return NextResponse.json({ thanh_cong: true });
}
