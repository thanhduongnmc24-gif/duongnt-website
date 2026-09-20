import { durationInSeconds, videoIdFromInput } from "@/lib/youtube/validation";

export const dynamic = "force-dynamic";

type Video = {
  id: string | { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
};
type YouTubeResponse = { items?: Video[]; nextPageToken?: string; error?: { errors?: { reason?: string }[] } };

function publicVideo(item: Video) {
  const snippet = item.snippet ?? {};
  return {
    id: typeof item.id === "string" ? item.id : item.id.videoId,
    title: snippet.title ?? "",
    channel: snippet.channelTitle ?? "",
    thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? "",
    publishedAt: snippet.publishedAt,
    duration: durationInSeconds(item.contentDetails?.duration),
    views: item.statistics?.viewCount ? Number(item.statistics.viewCount) : undefined,
    isLive: snippet.liveBroadcastContent === "live",
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const page = params.get("page") ?? "";
  if (q.length > 200 || page.length > 200) {
    return Response.json({ loi: "Từ khóa hoặc mã trang quá dài." }, { status: 400 });
  }
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return Response.json({ loi: "Dịch vụ tìm kiếm chưa được cấu hình. Vui lòng thử lại sau.", code: "SEARCH_UNAVAILABLE" }, { status: 503 });
  }
  const id = videoIdFromInput(q);
  const isSearch = Boolean(q && !id);
  const query = new URLSearchParams({
    part: isSearch ? "snippet" : "snippet,contentDetails,statistics",
    maxResults: "50",
    key,
    ...(id ? { id } : isSearch ? {
      type: "video", q, safeSearch: "moderate", relevanceLanguage: "vi",
    } : { chart: "mostPopular", regionCode: "VN" }),
    ...(page && !id ? { pageToken: page } : {}),
  });

  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/${isSearch ? "search" : "videos"}?${query}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
    });
    const data = await response.json() as YouTubeResponse;
    if (!response.ok) {
      const quota = data.error?.errors?.some((error) => ["quotaExceeded", "dailyLimitExceeded"].includes(error.reason ?? ""));
      return Response.json({
        loi: quota ? "Hạn mức tìm kiếm hôm nay đã hết. Vui lòng thử lại sau." : "YouTube chưa trả được kết quả. Vui lòng thử lại.",
        code: quota ? "SEARCH_QUOTA" : "SEARCH_UNAVAILABLE",
      }, { status: quota || response.status === 403 ? 503 : 502, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({
      items: (data.items ?? []).map(publicVideo).filter((video) => video.id),
      nextPageToken: data.nextPageToken,
    }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch {
    return Response.json({ loi: "Không kết nối được dịch vụ tìm kiếm. Vui lòng thử lại.", code: "SEARCH_UNAVAILABLE" }, {
      status: request.signal.aborted ? 499 : 504,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

