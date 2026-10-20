import { NextResponse } from "next/server";
import { taoGoogleDrive } from "@/lib/google-drive/ket-noi";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ loi: "Chưa đăng nhập." }, { status: 401 });
  const db = taoSupabaseQuanTri();
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user || auth.user.user_metadata?.ung_dung !== "lich_lam_viec") return NextResponse.json({ loi: "Phiên đăng nhập không hợp lệ." }, { status: 401 });
  const { id } = await params;
  const { data: anh } = await db.from("thong_so_anh").select("google_drive_file_id,kieu_tep").eq("id", id).eq("nguoi_dung_id", auth.user.id).maybeSingle();
  if (!anh) return NextResponse.json({ loi: "Không tìm thấy ảnh." }, { status: 404 });
  try {
    const { data } = await taoGoogleDrive().files.get({ fileId: anh.google_drive_file_id, alt: "media" }, { responseType: "arraybuffer" });
    return new NextResponse(Buffer.from(data as ArrayBuffer), { headers: { "Content-Type": anh.kieu_tep, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ loi: "Không thể đọc ảnh từ Google Drive." }, { status: 502 }); }
}
