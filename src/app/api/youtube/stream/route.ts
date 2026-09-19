import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ loi: "Thiếu ID video" }, { status: 400 });

  try {
    // [Suy luận] Dùng Piped API public để bóc tách lấy thẳng link stream gốc thay vì iframe
    const r = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`);
    const data = await r.json();
    
    if (data.error) throw new Error(data.error);

    const audioStreams = data.audioStreams || [];
    if (audioStreams.length === 0) throw new Error("Không tìm thấy luồng âm thanh");
    
    // Ưu tiên lấy stream âm thanh đầu tiên để tải nhẹ và chạy nền mượt
    const streamUrl = audioStreams[0].url;

    return NextResponse.json({ url: streamUrl });
  } catch (error: any) {
    return NextResponse.json({ loi: error.message || "Lỗi khi lấy stream" }, { status: 500 });
  }
}