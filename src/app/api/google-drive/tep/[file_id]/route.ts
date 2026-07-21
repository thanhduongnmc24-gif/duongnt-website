import { NextResponse } from "next/server";
import { taoSupabaseQuanTri } from "@/lib/supabase/quan-tri";
import { taoGoogleDrive } from "@/lib/google-drive/ket-noi";

export async function GET(
  _yeuCau: Request,
  { params }: { params: Promise<{ file_id: string }> }
) {
  try {
    const { file_id } = await params;
    const supabaseQuanTri = taoSupabaseQuanTri();

    const { data: baiViet } = await supabaseQuanTri
      .from("bai_viet")
      .select("id")
      .eq("google_drive_anh_dai_dien_file_id", file_id)
      .maybeSingle();

    if (!baiViet) {
      return NextResponse.json(
        { loi: "Không tìm thấy ảnh." },
        { status: 404 }
      );
    }

    const drive = taoGoogleDrive();
    const [{ data: thongTinTep }, { data: noiDungTep }] = await Promise.all([
      drive.files.get({
        fileId: file_id,
        fields: "mimeType",
      }),
      drive.files.get(
        {
          fileId: file_id,
          alt: "media",
        },
        {
          responseType: "arraybuffer",
        }
      ),
    ]);

    return new NextResponse(Buffer.from(noiDungTep as ArrayBuffer), {
      headers: {
        "Content-Type": thongTinTep.mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { loi: "Không thể tải ảnh từ Google Drive." },
      { status: 500 }
    );
  }
}
