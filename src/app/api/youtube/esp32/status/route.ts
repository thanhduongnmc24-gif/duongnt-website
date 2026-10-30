import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function ffmpegVersion() {
  try {
    const { stdout, stderr } = await execFileAsync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], {
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 64 * 1024,
    });
    const firstLine = `${stdout || stderr}`.split(/\r?\n/, 1)[0].trim();
    return { installed: true, version: firstLine };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { installed: false, version: null, error: message.slice(0, 300) };
  }
}

export async function GET() {
  const ffmpeg = await ffmpegVersion();
  const youtubeResolver = { installed: true, version: "@distube/ytdl-core 5.2.0" };
  return Response.json({
    ready: youtubeResolver.installed && ffmpeg.installed,
    revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    ytDlp: { installed: false, version: null, replacedBy: youtubeResolver.version },
    youtubeResolver,
    ffmpeg,
  }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
