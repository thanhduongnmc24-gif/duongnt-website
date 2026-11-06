import { NextResponse } from "next/server";
import {
  docLoaiBaoCaoBot,
  kiemTraBearer,
  layAnhBaoCaoDaTaoSan,
  layNguoiDungBot,
  layNguoiDungTheoLine,
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
    const maNV = url.searchParams.get("maNV")?.trim() || "";
    const lineUserId = request.headers.get("x-line-user-id")?.trim() || "";
    const userIdTinCay = request.headers.get("x-dmx-user-id")?.trim() || "";
    const userId = /^[0-9a-f-]{36}$/i.test(userIdTinCay)
      ? userIdTinCay
      : lineUserId ? await layNguoiDungTheoLine(lineUserId) : await layNguoiDungBot();
    const baoCao = await taoBaoCaoBot(loai, ngay, userId, maNV);
    const anhDaTao = maNV ? null : await layAnhBaoCaoDaTaoSan(userId, loai);
    const hetHan = Math.floor(Date.now() / 1000) + 15 * 60;
    const chuKy = taoChuKyAnh(loai, baoCao.ngay, userId, hetHan, maNV);
    const imageUrl = taoUrlWebsite("/api/dmx/bot/anh", request);
    imageUrl.searchParams.set("loai", loai);
    imageUrl.searchParams.set("ngay", baoCao.ngay);
    imageUrl.searchParams.set("uid", userId);
    imageUrl.searchParams.set("exp", String(hetHan));
    imageUrl.searchParams.set("sig", chuKy);
    if (maNV) imageUrl.searchParams.set("maNV", maNV);
    const urlAnhCuoi = anhDaTao?.url || imageUrl.toString();

    return NextResponse.json(
      {
        // LINE chỉ gửi một tiêu đề ngắn; toàn bộ số liệu nằm trong ảnh báo cáo.
        text: `${baoCao.tieuDe} ngày ${baoCao.ngayHienThi}`,
        imageUrl: urlAnhCuoi,
        previewImageUrl: urlAnhCuoi,
        updatedAt: anhDaTao?.ngayCapNhat || baoCao.capNhatLuc,
        date: anhDaTao?.ngay || baoCao.ngay,
        reportType: loai,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chưa tạo được báo cáo DMX.";
    const chuaLienKet = message.includes("chưa liên kết DMX");
    if (!chuaLienKet) console.error("GET /api/dmx/bot/bao-cao error", error);
    return NextResponse.json(
      { loi: message },
      { status: chuaLienKet ? 403 : 500 }
    );
  }
}
