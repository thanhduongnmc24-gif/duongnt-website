import { NextResponse } from "next/server";
import { taoGoogleDrive } from "@/lib/google-drive/ket-noi";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file_id: string }> }
) {
  try {
    const { file_id } = await params;
    const drive = taoGoogleDrive();
    const [meta, file] = await Promise.all([
      drive.files.get({ fileId: file_id, fields: "name,mimeType" }),
      drive.files.get({ fileId: file_id, alt: "media" }, { responseType: "arraybuffer" }),
    ]);
    return new NextResponse(file.data as ArrayBuffer, {
      headers: {
        "Content-Type": meta.data.mimeType || "image/jpeg",
        "Content-Disposition": `inline; filename="${encodeURIComponent(meta.data.name || "catalog-image")}"`,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
