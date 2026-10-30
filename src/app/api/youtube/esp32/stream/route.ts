import { spawn, type ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";
import { Client, Quality, Ytdl } from "@distube/ytdl-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const youtube = new Ytdl({
  country: "VN",
  lang: "vi",
  timeoutMs: 30_000,
  // Keep this value in Render's secret environment settings, never in Git.
  cookie: process.env.YOUTUBE_COOKIE,
  // VisionOS supplies audio formats without downloading YouTube's changing web-player script.
  // This is more reliable from Render data-center IPs.
  clients: [Client.VisionOS],
});

function stop(child: ChildProcess | undefined) {
  if (child && !child.killed) child.kill();
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!VIDEO_ID.test(id)) {
    return Response.json({ loi: "Mã video không hợp lệ." }, { status: 400 });
  }

  let source: Readable;
  try {
    const info = await youtube.getInfo(`https://www.youtube.com/watch?v=${id}`, {
      signal: request.signal,
    });
    source = youtube.download(info, {
      quality: Quality.HighestAudio,
      filter: { hasAudio: true, hasVideo: false },
      signal: request.signal,
      highWaterMark: 512 * 1024,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown YouTube resolver error";
    return Response.json({
      loi: "YouTube chưa cung cấp được nguồn âm thanh.",
      detail: detail.slice(0, 500),
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  const encoder = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    "pipe:0",
    "-vn",
    "-map_metadata",
    "-1",
    "-ac",
    "1",
    "-ar",
    "48000",
    "-c:a",
    "libopus",
    "-b:a",
    "48k",
    "-application",
    "audio",
    "-f",
    "ogg",
    "pipe:1",
  ], {
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  source.pipe(encoder.stdin);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    source.unpipe(encoder.stdin);
    source.destroy();
    stop(encoder);
  };
  request.signal.addEventListener("abort", close, { once: true });

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      encoder.stdout.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      encoder.stdout.once("end", () => {
        if (!closed) controller.close();
        close();
      });
      encoder.stdout.once("error", (error) => {
        if (!closed) controller.error(error);
        close();
      });
      source.once("error", (error) => {
        if (!closed) controller.error(error);
        close();
      });
      encoder.once("error", (error) => {
        if (!closed) controller.error(error);
        close();
      });
    },
    cancel() {
      close();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "audio/ogg",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${id}.ogg"`,
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
