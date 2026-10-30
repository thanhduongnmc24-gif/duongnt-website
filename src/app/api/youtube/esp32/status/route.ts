import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureYtDlp } from "@/lib/youtube/yt-dlp-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

async function version(name: "yt-dlp" | "ffmpeg") {
  try {
    const args = name === "yt-dlp" ? ["--version"] : ["-version"];
    const executable = name === "yt-dlp" ? await ensureYtDlp() : process.env.FFMPEG_PATH || "ffmpeg";
    const { stdout, stderr } = await execFileAsync(executable, args, {
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
  const [ytDlp, ffmpeg] = await Promise.all([version("yt-dlp"), version("ffmpeg")]);
  return Response.json({
    ready: ytDlp.installed && ffmpeg.installed,
    revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    ytDlp,
    ffmpeg,
  }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
