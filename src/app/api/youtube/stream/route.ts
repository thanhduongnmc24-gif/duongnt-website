import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ loi: "Thiếu ID video" }, { status: 400 });

  try {
    // [Suy luận] Hệ thống Cobalt xử lý vượt tường lửa YouTube rất mạnh bằng cách giả lập các thông số client từ máy chủ của họ. Mình chỉ việc gửi URL và cấu hình yêu cầu lấy riêng luồng âm thanh để né 403.
    const res = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${id}`,
        isAudioOnly: true
      }),
      cache: "no-store"
    });

    const data = await res.json();

    // Cobalt trả về status là "error" nếu bị lỗi
    if (data.status === "error" || !data.url) {
      throw new Error(data.text || "Cobalt không thể bóc link video này.");
    }

    return NextResponse.json({ url: data.url });
  } catch (error: any) {
    console.error("Lỗi Cobalt API:", error.message);
    return NextResponse.json({ 
        loi: "Không thể bóc tách luồng âm thanh do giới hạn từ YouTube hoặc Cobalt." 
    }, { status: 500 });
  }
}