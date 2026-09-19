import { VIDEO_ID } from "@/lib/youtube/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!VIDEO_ID.test(id)) {
    return Response.json({ loi: "ID video không hợp lệ.", code: "INVALID_VIDEO" }, { status: 400 });
  }
  return Response.json({ url: `/api/youtube/audio?id=${encodeURIComponent(id)}` }, {
    headers: { "Cache-Control": "no-store" },
  });
}

