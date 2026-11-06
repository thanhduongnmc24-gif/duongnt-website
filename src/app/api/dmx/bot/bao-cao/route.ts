import { NextResponse } from "next/server";
import {
  docLoaiBaoCaoBot,
  kiemTraBearer,
  taoBaoCaoBot,
  taoChuKyAnh,
} from "@/lib/dmx/bao-cao-bot";
import { taoUrlWebsite } from "@/lib/tien-ich/url-website";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!kiemTraBearer(request)) {
    return NextResponse.json({ loi: "Không có quyền truy cập báo cáo bot." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const loai = docLoaiBaoCaoBot(url.searchParams.get("loai"));
    const ngay = url.searchParams.get("ngay")?.trim() || undefined;
    const baoCao = await taoBaoCaoBot(loai, ngay);
    const hetHan = Math.floor(Date.now() / 1000) + 15 * 60;
    const chuKy = taoChuKyAnh(loai, baoCao.ngay, hetHan);
    const imageUrl = taoUrlWebsite("/api/dmx/bot/anh", request);
    imageUrl.searchParams.set("loai", loai);
    imageUrl.searchParams.set("ngay", baoCao.ngay);
    imageUrl.searchParams.set("exp", String(hetHan));
    imageUrl.searchParams.set("sig", chuKy);

    return NextResponse.json(
      {
        text: baoCao.noiDung,
        imageUrl: imageUrl.toString(),
        previewImageUrl: imageUrl.toString(),
        updatedAt: baoCao.capNhatLuc,
        date: baoCao.ngay,
        reportType: loai,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("GET /api/dmx/bot/bao-cao error", error);
    return NextResponse.json(
      { loi: error instanceof Error ? error.message : "Chưa tạo được báo cáo DMX." },
      { status: 500 }
    );
  }
}
