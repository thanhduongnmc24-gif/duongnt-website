import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function executable(name: "yt-dlp" | "ffmpeg") {
  const configured = name === "yt-dlp" ? process.env.YTDLP_PATH : process.env.FFMPEG_PATH;
  if (configured) return configured;
  if (name === "yt-dlp" && process.platform === "win32") {
    return path.join(process.cwd(), ".ytdlp-venv", "Scripts", "yt-dlp.exe");
  }
  if (name === "yt-dlp" && process.platform === "linux") {
    return path.join(process.cwd(), ".yt-dlp-bin", "yt-dlp");
  }
  return name;
}

function stop(child: ChildProcess | undefined) {
  if (child && !child.killed) child.kill();
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!VIDEO_ID.test(id)) {
    return Response.json({ loi: "Mã video không hợp lệ." }, { status: 400 });
  }

  const sourceArgs = [
    "--no-playlist",
    "--no-progress",
    "--quiet",
    "-f",
    "bestaudio/best",
    "-o",
    "-",
  ];
  const cookies = process.env.YTDLP_COOKIES_FILE;
  if (cookies) sourceArgs.push("--cookies", cookies);
  sourceArgs.push(`https://www.youtube.com/watch?v=${id}`);

  const downloader = spawn(executable("yt-dlp"), sourceArgs, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const encoder = spawn(executable("ffmpeg"), [
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

  downloader.stdout.pipe(encoder.stdin);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    downloader.stdout.unpipe(encoder.stdin);
    stop(downloader);
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
      downloader.once("error", (error) => {
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
