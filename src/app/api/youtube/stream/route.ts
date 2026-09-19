import { NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ loi: "Thiếu ID video" }, { status: 400 });

  try {
    // [Suy luận] Server tự động gọi lên YouTube để lấy dữ liệu thô của video
    const info = await ytdl.getInfo(id);
    
    // Lọc ra luồng dữ liệu chỉ chứa âm thanh (nhẹ nhất, mượt nhất)
    const format = ytdl.chooseFormat(info.formats, { 
        quality: 'highestaudio', 
        filter: 'audioonly' 
    });
    
    if (!format || !format.url) {
      throw new Error("Không thể bóc tách luồng âm thanh cho video này.");
    }

    // Trả link gốc về cho giao diện phát nhạc
    return NextResponse.json({ url: format.url });
  } catch (error: any) {
    console.error("Lỗi ytdl-core:", error);
    return NextResponse.json({ 
        loi: "Tèo không thể bóc link video này. Có thể do giới hạn độ tuổi hoặc bản quyền của YouTube." 
    }, { status: 500 });
  }
}