import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ loi: "Thiếu ID video" }, { status: 400 });

  try {
    // [Suy luận] Dùng nhiều instance Piped dự phòng vì server công cộng rất hay bị quá tải hoặc sập
    const instances = [
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.tokhmi.xyz",
      "https://api.piped.projectsegfau.lt",
      "https://piped-api.garudalinux.org"
    ];
    
    let data = null;
    let success = false;

    for (const api of instances) {
      try {
        const r = await fetch(`${api}/streams/${id}`, { next: { revalidate: 0 } });
        const text = await r.text(); // Đọc dạng text trước để tránh lỗi Unexpected end of JSON
        
        if (!text) continue; 
        
        data = JSON.parse(text); 
        
        if (data && !data.error) {
          success = true;
          break; // Lấy được data chuẩn thì thoát vòng lặp ngay
        }
      } catch (e) {
        console.log(`Bỏ qua server lỗi: ${api}`);
      }
    }

    if (!success || !data) {
      throw new Error("Tất cả máy chủ trung gian đều đang quá tải, anh hai thử lại sau nhé.");
    }

    const audioStreams = data.audioStreams || [];
    if (audioStreams.length === 0) throw new Error("Không tìm thấy luồng âm thanh nào cho video này.");
    
    // Ưu tiên lấy stream âm thanh
    const streamUrl = audioStreams[0].url;

    return NextResponse.json({ url: streamUrl });
  } catch (error: any) {
    return NextResponse.json({ loi: error.message || "Lỗi khi lấy stream" }, { status: 500 });
  }
}